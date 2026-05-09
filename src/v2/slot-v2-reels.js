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

  function evaluateStops(role, reelStops = [], options = {}) {
    const successWindowCells = Number(options.successWindowCells ?? rules.reel.successWindowCells);
    if (!role?.targetable) {
      return {
        success: false,
        roleId: role?.id || "blank",
        matchedPattern: null,
        misses: getRequiredReels(role).map((reel) => ({ reel, distance: Infinity })),
      };
    }
    const requiredReels = getRequiredReels(role);
    const patterns = getStopPatterns(role);
    let best = null;
    for (const pattern of patterns) {
      const misses = requiredReels.map((reel) => ({
        reel,
        actual: normalizeIndex(reelStops[reel]),
        target: normalizeIndex(pattern[reel]),
        distance: distanceCells(reelStops[reel], pattern[reel]),
      }));
      const totalDistance = misses.reduce((sum, miss) => sum + miss.distance, 0);
      if (!best || totalDistance < best.totalDistance) {
        best = { pattern, misses, totalDistance };
      }
    }
    const success = Boolean(best) && best.misses.every((miss) => miss.distance <= successWindowCells);
    return {
      success,
      roleId: role.id,
      matchedPattern: best?.pattern?.slice() || null,
      stopIndexes: reelStops.map(normalizeIndex),
      misses: best?.misses || [],
      totalDistance: best?.totalDistance ?? Infinity,
    };
  }

  function buildFailedStops(role, rng = Math.random) {
    const pattern = pickStopPattern("blank", rng);
    const target = pickStopPattern(role, rng);
    const required = new Set(getRequiredReels(role));
    return pattern.map((value, index) => {
      if (!required.has(index)) return value;
      return normalizeIndex((target[index] || 0) + 3 + Math.floor(rng() * 4));
    });
  }

  global.ToshiyaSlotV2Reels = {
    normalizeIndex,
    distanceCells,
    getStopPatterns,
    pickStopPattern,
    getRequiredReels,
    evaluateStops,
    buildFailedStops,
  };
})(globalThis);
