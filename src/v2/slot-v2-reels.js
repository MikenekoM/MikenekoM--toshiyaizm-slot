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

  function findVisualLine(reelStops = []) {
    for (const line of getActiveLines()) {
      const symbols = line.rows.map((row, reel) => getVisibleSymbol(reel, reelStops[reel], row));
      if (symbols.every(Boolean) && symbols.every((symbol) => symbol === symbols[0])) {
        return { id: line.id, label: line.label, rows: line.rows.slice(), symbol: symbols[0] };
      }
    }
    return null;
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
      const matchedRow = [0, 1, 2].find((row) => getVisibleSymbol(0, reelStops[0], row) === "cherry");
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
    const success = Boolean(best) && best.misses.every((miss) => miss.distance <= successWindowCells);
    return {
      success,
      roleId: role.id,
      matchedLine: success && best?.line ? { id: best.line.id, label: best.line.label, rows: best.line.rows.slice() } : null,
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
      if (leftHasCherry(candidate) && !hasVisualLine(candidate)) return candidate;
    }
    return leftPattern.slice();
  }

  global.ToshiyaSlotV2Reels = {
    normalizeIndex,
    distanceCells,
    getStopPatterns,
    getActiveLines,
    getVisibleSymbol,
    leftHasCherry,
    findVisualLine,
    hasVisualLine,
    getLineStopPatterns,
    pickStopPattern,
    pickLineStopPattern,
    pickCherryStopPattern,
    getRequiredReels,
    evaluateStops,
    buildFailedStops,
    buildNonWinningStops,
  };
})(globalThis);
