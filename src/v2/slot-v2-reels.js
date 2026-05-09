(function registerSlotV2Reels(global) {
  const rules = global.ToshiyaSlotV2Rules;

  function normalizeIndex(index) {
    const count = rules.reel.symbolCount;
    return ((Math.round(Number(index) || 0) % count) + count) % count;
  }

  function distanceCells(actual, target) {
    const count = rules.reel.symbolCount;
    const diff = Math.abs(normalizeIndex(actual) - normalizeIndex(target));
    return Math.min(diff, count - diff);
  }

  function slipCellsFromPress(pressedIndex, targetIndex) {
    const count = rules.reel.symbolCount;
    return (normalizeIndex(pressedIndex) - normalizeIndex(targetIndex) + count) % count;
  }

  function isSlipAllowed(pressedIndex, targetIndex, maxSlipCells) {
    return slipCellsFromPress(pressedIndex, targetIndex) <= Math.max(0, Number(maxSlipCells) || 0);
  }

  function getStopPatterns(roleOrId) {
    const id = typeof roleOrId === "string" ? roleOrId : roleOrId?.id;
    return rules.reel.stopPatterns[id] || rules.reel.stopPatterns.blank;
  }

  function pickStopPattern(roleOrId, rng = Math.random) {
    const patterns = getStopPatterns(roleOrId);
    return patterns[Math.floor(rng() * patterns.length) % patterns.length].slice();
  }

  function getRequiredReels(roleOrId) {
    const id = typeof roleOrId === "string" ? roleOrId : roleOrId?.id;
    return rules.reel.requiredReels[id] || [0, 1, 2];
  }

  function getRoleSymbol(roleOrId) {
    const id = typeof roleOrId === "string" ? roleOrId : roleOrId?.id;
    return rules.reel.roleSymbols?.[id] || id || "";
  }

  function getDecorativeSymbols() {
    return Array.isArray(rules.reel.decorativeSymbols) ? rules.reel.decorativeSymbols : [];
  }

  function getNormalForbiddenLineSymbols() {
    return Array.isArray(rules.reel.normalForbiddenLineSymbols) ? rules.reel.normalForbiddenLineSymbols : [];
  }

  function isDecorativeSymbol(symbol) {
    return Boolean(symbol) && getDecorativeSymbols().includes(symbol);
  }

  function getActiveLines() {
    return Array.isArray(rules.reel.activeLines) && rules.reel.activeLines.length
      ? rules.reel.activeLines
      : [{ id: "middle", label: "中段", rows: [1, 1, 1] }];
  }

  function getReelStrip(reel) {
    return Array.isArray(rules.reel.symbolStrips?.[reel])
      ? rules.reel.symbolStrips[reel]
      : [];
  }

  function getVisibleSymbol(reel, stopIndex, row = 1) {
    const strip = getReelStrip(reel);
    if (!strip.length) return "";
    return strip[normalizeIndex(Number(stopIndex) + Number(row || 0))] || "";
  }

  function leftHasCherry(reelStops = []) {
    return [0, 1, 2].some((row) => getVisibleSymbol(0, reelStops[0], row) === "cherry");
  }

  function getCherryRows(roleOrId = null) {
    const id = typeof roleOrId === "string" ? roleOrId : roleOrId?.id;
    if (id === "strongCherry") return [1];
    if (id === "weakCherry") return [0, 2];
    return [0, 1, 2];
  }

  function leftHasRoleCherry(roleOrId, reelStops = []) {
    const rows = getCherryRows(roleOrId);
    return rows.some((row) => getVisibleSymbol(0, reelStops[0], row) === "cherry");
  }

  function getLeftCherryStops(roleOrId = null) {
    const rows = getCherryRows(roleOrId);
    return Array.from({ length: rules.reel.symbolCount }, (_, index) => index)
      .filter((index) => rows.some((row) => getVisibleSymbol(0, index, row) === "cherry"));
  }

  function findWrongCherryStop(roleOrId, stopIndex) {
    if (!isCherryRole(roleOrId)) return null;
    const allowedRows = new Set(getCherryRows(roleOrId));
    const rows = [0, 1, 2].filter((row) => (
      getVisibleSymbol(0, stopIndex, row) === "cherry" && !allowedRows.has(row)
    ));
    return rows.length
      ? { id: "wrong-left-cherry", label: "別行チェリー", rows, symbol: "cherry" }
      : null;
  }

  function avoidWrongCherryStop(roleOrId, reelIndex, stopIndex, existingStops = [], options = {}) {
    const base = normalizeIndex(stopIndex);
    if (Number(reelIndex) !== 0 || !isCherryRole(roleOrId)) {
      return { stopIndex: base, adjusted: false, wrongCherry: null };
    }
    const baseWrong = findWrongCherryStop(roleOrId, base, existingStops);
    if (!baseWrong) return { stopIndex: base, adjusted: false, wrongCherry: null };
    const maxNudgeCells = Math.max(0, Number(options.maxNudgeCells ?? 2));
    for (let distance = 1; distance <= maxNudgeCells; distance += 1) {
      const candidate = normalizeIndex(base - distance);
      if (
        !findWrongCherryStop(roleOrId, candidate) &&
        (!options.avoidRoleCherry || !leftHasRoleCherry(roleOrId, [candidate, null, null]))
      ) {
        return {
          stopIndex: candidate,
          adjusted: true,
          wrongCherry: baseWrong,
          nudgeCells: -distance,
          slipCells: distance,
          directionAllowed: true,
        };
      }
    }
    return { stopIndex: base, adjusted: false, wrongCherry: baseWrong };
  }

  function findVisualLine(reelStops = []) {
    for (const line of getActiveLines()) {
      const symbols = line.rows.map((row, reel) => getVisibleSymbol(reel, reelStops[reel], row));
      if (symbols.every(Boolean) && symbols.every((symbol) => symbol === symbols[0])) {
        return { id: line.id, label: line.label, rows: line.rows.slice(), symbol: symbols[0] };
      }
    }
    return null;
  }

  function findLineBySymbols(reelStops = [], symbols = []) {
    const blocked = new Set((Array.isArray(symbols) ? symbols : []).filter(Boolean));
    if (!blocked.size) return null;
    for (const line of getActiveLines()) {
      const lineSymbols = line.rows.map((row, reel) => getVisibleSymbol(reel, reelStops[reel], row));
      if (
        lineSymbols.every(Boolean) &&
        lineSymbols.every((symbol) => symbol === lineSymbols[0]) &&
        blocked.has(lineSymbols[0])
      ) {
        return { id: line.id, label: line.label, rows: line.rows.slice(), symbol: lineSymbols[0] };
      }
    }
    return null;
  }

  function findRoleLine(roleOrId, reelStops = []) {
    const expectedSymbol = getRoleSymbol(roleOrId);
    if (!expectedSymbol) return null;
    for (const line of getActiveLines()) {
      const symbols = line.rows.map((row, reel) => getVisibleSymbol(reel, reelStops[reel], row));
      if (symbols.every((symbol) => symbol === expectedSymbol)) {
        return { id: line.id, label: line.label, rows: line.rows.slice(), symbol: expectedSymbol };
      }
    }
    return null;
  }

  function findDecorativeLine(reelStops = []) {
    return findLineBySymbols(reelStops, getDecorativeSymbols());
  }

  function findNormalForbiddenLine(reelStops = []) {
    return findLineBySymbols(reelStops, getNormalForbiddenLineSymbols());
  }

  function wouldCompleteLineBySymbols(reelIndex, stopIndex, existingStops = [], symbols = []) {
    const candidate = [0, 1, 2].map((index) => {
      if (index === reelIndex) return normalizeIndex(stopIndex);
      const value = existingStops[index];
      return value === null || value === undefined ? null : normalizeIndex(value);
    });
    if (candidate.some((value) => value === null || value === undefined)) return null;
    return findLineBySymbols(candidate, symbols);
  }

  function wouldCompleteDecorativeLine(reelIndex, stopIndex, existingStops = []) {
    return wouldCompleteLineBySymbols(reelIndex, stopIndex, existingStops, getDecorativeSymbols());
  }

  function avoidLineBySymbolsStop(reelIndex, stopIndex, existingStops = [], symbols = [], options = {}) {
    const base = normalizeIndex(stopIndex);
    const blockedSymbols = Array.isArray(symbols) ? symbols : [];
    const baseLine = wouldCompleteLineBySymbols(reelIndex, base, existingStops, blockedSymbols);
    if (!baseLine) return { stopIndex: base, adjusted: false, blockedLine: null };
    const maxNudgeCells = Math.max(0, Number(options.maxNudgeCells ?? 2));
    for (let distance = 1; distance <= maxNudgeCells; distance += 1) {
      const candidate = normalizeIndex(base - distance);
      if (!wouldCompleteLineBySymbols(reelIndex, candidate, existingStops, blockedSymbols)) {
        return {
          stopIndex: candidate,
          adjusted: true,
          blockedLine: baseLine,
          nudgeCells: -distance,
          slipCells: distance,
          directionAllowed: true,
        };
      }
    }
    return { stopIndex: base, adjusted: false, blockedLine: baseLine };
  }

  function avoidDecorativeLineStop(reelIndex, stopIndex, existingStops = [], options = {}) {
    const result = avoidLineBySymbolsStop(reelIndex, stopIndex, existingStops, getDecorativeSymbols(), options);
    return { ...result, decorativeLine: result.blockedLine || null };
  }

  function avoidNormalForbiddenLineStop(reelIndex, stopIndex, existingStops = [], options = {}) {
    return avoidLineBySymbolsStop(reelIndex, stopIndex, existingStops, getNormalForbiddenLineSymbols(), options);
  }

  function hasVisualLine(reelStops = []) {
    return Boolean(findVisualLine(reelStops));
  }

  function centerPatternToLinePattern(pattern, line) {
    const rows = line?.rows || [1, 1, 1];
    return pattern.map((centerStop, reel) => normalizeIndex(Number(centerStop) + 1 - Number(rows[reel] ?? 1)));
  }

  function shouldEvaluateActiveLines(roleOrId) {
    return getRequiredReels(roleOrId).length >= 3;
  }

  function getLineStopPatterns(roleOrId, lineId = null) {
    const patterns = getStopPatterns(roleOrId);
    if (!shouldEvaluateActiveLines(roleOrId)) return patterns.map((pattern) => pattern.slice());
    const lines = getActiveLines().filter((line) => !lineId || line.id === lineId);
    return patterns.flatMap((pattern) => lines.map((line) => centerPatternToLinePattern(pattern, line)));
  }

  function pickLineStopPattern(roleOrId, rng = Math.random) {
    const patterns = getLineStopPatterns(roleOrId);
    return patterns[Math.floor(rng() * patterns.length) % patterns.length].slice();
  }

  function isCherryRole(roleOrId) {
    const id = typeof roleOrId === "string" ? roleOrId : roleOrId?.id;
    return id === "weakCherry" || id === "strongCherry";
  }

  function findSlipStop(roleOrId, reelIndex, pressedIndex, existingStops = [], options = {}) {
    const reel = Number(reelIndex);
    const actual = normalizeIndex(pressedIndex);
    const maxSlipCells = Math.max(0, Number(options.maxSlipCells ?? rules.reel.meoshiSlipCells ?? 2));
    if (!Number.isFinite(reel) || reel < 0 || reel > 2) return null;
    if (isCherryRole(roleOrId)) {
      if (reel !== 0) return null;
      const candidates = getLeftCherryStops(roleOrId).map((stopIndex) => {
        const slipCells = slipCellsFromPress(actual, stopIndex);
        return {
          stopIndex,
          slipCells,
          distance: slipCells,
          line: { id: "left-cherry", label: "左チェリー", rows: [null, null, null], symbol: "cherry" },
          pattern: [stopIndex, null, null],
        };
      });
      const best = candidates.sort((a, b) => a.slipCells - b.slipCells)[0];
      return best && best.slipCells <= maxSlipCells
        ? {
          ...best,
          pressedIndex: actual,
          assisted: best.stopIndex !== actual,
          directionAllowed: true,
          blockedByDirection: false,
        }
        : null;
    }

    const existing = Array.isArray(existingStops) ? existingStops : [];
    const forbiddenLineSymbols = Array.isArray(options.forbiddenLineSymbols) ? options.forbiddenLineSymbols : [];
    const candidates = getLineStopPatterns(roleOrId).filter((pattern) => existing.every((value, index) => {
      if (index === reel || value === null || value === undefined) return true;
      return normalizeIndex(value) === normalizeIndex(pattern[index]);
    })).filter((pattern) => !findLineBySymbols(pattern, forbiddenLineSymbols)).map((pattern) => {
      const stopIndex = normalizeIndex(pattern[reel]);
      const slipCells = slipCellsFromPress(actual, stopIndex);
      return {
        stopIndex,
        slipCells,
        distance: slipCells,
        line: findRoleLine(roleOrId, pattern),
        pattern: pattern.map(normalizeIndex),
      };
    });
    const best = candidates.sort((a, b) => a.slipCells - b.slipCells)[0];
    return best && best.slipCells <= maxSlipCells && best.line
      ? {
        ...best,
        pressedIndex: actual,
        assisted: best.stopIndex !== actual,
        directionAllowed: true,
        blockedByDirection: false,
      }
      : null;
  }

  function evaluateStops(role, reelStops = [], options = {}) {
    const successWindowCells = Number(options.successWindowCells ?? rules.reel.successWindowCells);
    const requiredReels = getRequiredReels(role);
    if (!role?.targetable) {
      return {
        success: false,
        roleId: role?.id || "blank",
        matchedLine: null,
        matchedPattern: null,
        misses: requiredReels.map((reel) => ({ reel, distance: Infinity })),
      };
    }
    if (isCherryRole(role)) {
      const matchedRow = getCherryRows(role).find((row) => getVisibleSymbol(0, reelStops[0], row) === "cherry");
      const success = Number.isFinite(matchedRow);
      const basePatterns = getStopPatterns(role);
      return {
        success,
        roleId: role.id,
        matchedLine: success ? { id: `left-${matchedRow}`, label: `左${matchedRow + 1}段`, rows: [matchedRow, null, null] } : null,
        basePattern: basePatterns[0]?.slice() || null,
        matchedPattern: reelStops.map(normalizeIndex),
        stopIndexes: reelStops.map(normalizeIndex),
        misses: [{
          reel: 0,
          actual: normalizeIndex(reelStops[0]),
          target: success ? normalizeIndex(reelStops[0]) : normalizeIndex(basePatterns[0]?.[0] || 0),
          distance: success ? 0 : Infinity,
        }],
        totalDistance: success ? 0 : Infinity,
      };
    }
    const basePatterns = getStopPatterns(role);
    const patternEntries = shouldEvaluateActiveLines(role)
      ? basePatterns.flatMap((basePattern) => getActiveLines().map((line) => ({
        basePattern,
        line,
        pattern: centerPatternToLinePattern(basePattern, line),
      })))
      : basePatterns.map((pattern) => ({
        basePattern: pattern,
        line: null,
        pattern,
      }));
    let best = null;
    for (const entry of patternEntries) {
      const pattern = entry.pattern;
      const misses = requiredReels.map((reel) => ({
        reel,
        actual: normalizeIndex(reelStops[reel]),
        target: normalizeIndex(pattern[reel]),
        distance: distanceCells(reelStops[reel], pattern[reel]),
      }));
      const totalDistance = misses.reduce((sum, miss) => sum + miss.distance, 0);
      if (!best || totalDistance < best.totalDistance) {
        best = { ...entry, misses, totalDistance };
      }
    }
    const lineSuccess = shouldEvaluateActiveLines(role) ? findRoleLine(role, reelStops) : null;
    const timingSuccess = Boolean(best) && best.misses.every((miss) => miss.distance <= successWindowCells);
    const success = shouldEvaluateActiveLines(role) ? Boolean(lineSuccess) : timingSuccess;
    return {
      success,
      roleId: role.id,
      matchedLine: success && lineSuccess
        ? lineSuccess
        : success && best?.line ? { id: best.line.id, label: best.line.label, rows: best.line.rows.slice() } : null,
      basePattern: best?.basePattern?.slice() || null,
      matchedPattern: best?.pattern?.slice() || null,
      stopIndexes: reelStops.map(normalizeIndex),
      misses: best?.misses || [],
      totalDistance: best?.totalDistance ?? Infinity,
    };
  }

  function buildFailedStops(role, rng = Math.random) {
    for (let attempt = 0; attempt < 48; attempt += 1) {
      const pattern = pickStopPattern("blank", rng);
      const target = pickLineStopPattern(role, rng);
      const required = new Set(getRequiredReels(role));
      const candidate = pattern.map((value, index) => {
        if (!required.has(index)) return value;
        return normalizeIndex((target[index] || 0) + 3 + Math.floor(rng() * 4));
      });
      if (!evaluateStops(role, candidate).success && !leftHasCherry(candidate) && !hasVisualLine(candidate)) return candidate;
    }
    return buildNonWinningStops(rng);
  }

  function buildNonWinningStops(rng = Math.random, options = {}) {
    const allowLeftCherry = Boolean(options.allowLeftCherry);
    for (let attempt = 0; attempt < 160; attempt += 1) {
      const candidate = [0, 1, 2].map(() => normalizeIndex(Math.floor(rng() * rules.reel.symbolCount)));
      if (!allowLeftCherry && leftHasCherry(candidate)) continue;
      if (!hasVisualLine(candidate)) return candidate;
    }
    return [0, 6, 10];
  }

  function pickCherryStopPattern(roleOrId, rng = Math.random) {
    const leftPattern = pickStopPattern(roleOrId, rng);
    for (let attempt = 0; attempt < 96; attempt += 1) {
      const rest = buildNonWinningStops(rng, { allowLeftCherry: true });
      const candidate = [leftPattern[0], rest[1], rest[2]].map(normalizeIndex);
      if (leftHasRoleCherry(roleOrId, candidate) && !findWrongCherryStop(roleOrId, candidate[0]) && !hasVisualLine(candidate)) return candidate;
    }
    return leftPattern.slice();
  }

  global.ToshiyaSlotV2Reels = {
    normalizeIndex,
    distanceCells,
    slipCellsFromPress,
    isSlipAllowed,
    getStopPatterns,
    getActiveLines,
    getVisibleSymbol,
    getRoleSymbol,
    getDecorativeSymbols,
    getNormalForbiddenLineSymbols,
    isDecorativeSymbol,
    leftHasCherry,
    leftHasRoleCherry,
    getCherryRows,
    getLeftCherryStops,
    findWrongCherryStop,
    avoidWrongCherryStop,
    findVisualLine,
    findLineBySymbols,
    findRoleLine,
    findDecorativeLine,
    findNormalForbiddenLine,
    wouldCompleteLineBySymbols,
    wouldCompleteDecorativeLine,
    avoidLineBySymbolsStop,
    avoidDecorativeLineStop,
    avoidNormalForbiddenLineStop,
    hasVisualLine,
    getLineStopPatterns,
    pickStopPattern,
    pickLineStopPattern,
    pickCherryStopPattern,
    getRequiredReels,
    findSlipStop,
    evaluateStops,
    buildFailedStops,
    buildNonWinningStops,
  };
})(globalThis);
