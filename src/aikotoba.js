(function () {
  "use strict";

  var CODE_CHARS = [
    "あ", "い", "う", "え",
    "お", "か", "き", "く",
    "け", "こ", "さ", "し",
    "す", "せ", "そ", "た"
  ];
  var DECORATION_WORDS = ["まあね", "としやいずむ", "おじさん"];
  var CODE_LOOKUP = CODE_CHARS.reduce(function (lookup, char, index) {
    lookup[char] = index;
    return lookup;
  }, {});

  function normalizeSaveData(saveData) {
    if (!saveData || typeof saveData !== "object") {
      throw new Error("invalid-data");
    }

    return {
      version: saveData.version,
      coins: saveData.coins,
      bet: saveData.bet,
      totalGames: saveData.totalGames,
      gamesSinceBonus: saveData.gamesSinceBonus,
      mode: saveData.mode,
      phase: saveData.phase,
      preBonusRemaining: saveData.preBonusRemaining,
      bonus: saveData.bonus && typeof saveData.bonus === "object"
        ? Object.assign({}, saveData.bonus)
        : saveData.bonus,
      lastBonusSummary: saveData.lastBonusSummary,
      ownedItems: Array.isArray(saveData.ownedItems)
        ? saveData.ownedItems.slice()
        : saveData.ownedItems
    };
  }

  function stringToBytes(text) {
    if (typeof TextEncoder !== "undefined") {
      return Array.prototype.slice.call(new TextEncoder().encode(text));
    }

    var utf8 = unescape(encodeURIComponent(text));
    var bytes = [];
    for (var i = 0; i < utf8.length; i += 1) {
      bytes.push(utf8.charCodeAt(i));
    }
    return bytes;
  }

  function bytesToString(bytes) {
    if (typeof TextDecoder !== "undefined") {
      return new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes));
    }

    var text = "";
    for (var i = 0; i < bytes.length; i += 1) {
      text += String.fromCharCode(bytes[i]);
    }
    return decodeURIComponent(escape(text));
  }

  function checksum(bytes) {
    var value = 0x4d3;
    for (var i = 0; i < bytes.length; i += 1) {
      value = ((value * 31) + bytes[i]) & 0xffff;
    }
    return value;
  }

  function bytesToCode(bytes) {
    var chars = [];
    for (var i = 0; i < bytes.length; i += 1) {
      chars.push(CODE_CHARS[(bytes[i] >> 4) & 0x0f]);
      chars.push(CODE_CHARS[bytes[i] & 0x0f]);
    }
    return chars.join("");
  }

  function codeToBytes(code) {
    if (code.length % 2 !== 0) {
      throw new Error("invalid-length");
    }

    var bytes = [];
    for (var i = 0; i < code.length; i += 2) {
      var high = CODE_LOOKUP[code[i]];
      var low = CODE_LOOKUP[code[i + 1]];
      if (high === undefined || low === undefined) {
        throw new Error("invalid-character");
      }
      bytes.push((high << 4) | low);
    }
    return bytes;
  }

  function addDecoration(code, byteLength) {
    var decorated = [];
    for (var i = 0; i < code.length; i += 8) {
      var chunkIndex = i / 8;
      decorated.push(code.slice(i, i + 8));
      decorated.push(DECORATION_WORDS[(chunkIndex + byteLength) % DECORATION_WORDS.length]);
    }
    return decorated.join("");
  }

  function removeDecoration(text) {
    var cleaned = String(text || "")
      .normalize("NFKC")
      .replace(/[^\u3041-\u3096]/g, "");

    DECORATION_WORDS.slice()
      .sort(function (a, b) { return b.length - a.length; })
      .forEach(function (word) {
        cleaned = cleaned.split(word).join("");
      });

    return cleaned;
  }

  function encodeSaveData(saveData) {
    var data = normalizeSaveData(saveData);
    var payloadBytes = stringToBytes(JSON.stringify(data));
    var check = checksum(payloadBytes);
    var packetBytes = payloadBytes.concat([(check >> 8) & 0xff, check & 0xff]);
    return addDecoration(bytesToCode(packetBytes), packetBytes.length);
  }

  function decodeAikotoba(text) {
    try {
      var code = removeDecoration(text);
      var packetBytes = codeToBytes(code);
      if (packetBytes.length < 3) {
        throw new Error("too-short");
      }

      var payloadBytes = packetBytes.slice(0, -2);
      var storedCheck = (packetBytes[packetBytes.length - 2] << 8) | packetBytes[packetBytes.length - 1];
      if (checksum(payloadBytes) !== storedCheck) {
        throw new Error("checksum-mismatch");
      }

      return {
        ok: true,
        data: JSON.parse(bytesToString(payloadBytes))
      };
    } catch (error) {
      return {
        ok: false,
        error: error && error.message ? error.message : "decode-failed"
      };
    }
  }

  window.ToshiyaAikotoba = {
    encodeSaveData: encodeSaveData,
    decodeAikotoba: decodeAikotoba
  };
}());
