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
      if (!evaluateStops(role, candidate).success) return candidate;
    }
    return [0, 5, 9];
  }

  global.ToshiyaSlotV2Reels = {
    normalizeIndex,
    distanceCells,
    getStopPatterns,
    getActiveLines,
    getLineStopPatterns,
    pickStopPattern,
    pickLineStopPattern,
    getRequiredReels,
    evaluateStops,
    buildFailedStops,
  };
})(globalThis);
