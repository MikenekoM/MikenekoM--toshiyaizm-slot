import fs from "node:fs";
import path from "node:path";
import "../src/v2/slot-v2-rules.js";
import "../src/v2/slot-v2-engine.js";
import "../src/v2/slot-v2-scenes.js";
import "../src/v2/slot-v2-scene-player.js";

const root = path.resolve("E:/Codex_CLI/toshiyaizm-slot");
const scenes = globalThis.ToshiyaSlotV2Scenes;
const engine = globalThis.ToshiyaSlotV2Engine;
const failed = [];

for (const scene of Object.values(scenes.catalog)) {
  for (const key of ["scene_id", "scene_type", "duration", "asset_type", "asset_path", "audio_path", "can_skip", "transition_type", "next_scene", "timeline"]) {
    if (!(key in scene)) failed.push(`${scene.scene_id} missing ${key}`);
  }
  const fullPath = path.join(root, scene.asset_path);
  if (!fs.existsSync(fullPath)) failed.push(`${scene.scene_id} asset missing: ${scene.asset_path}`);
  let lastAt = -1;
  for (const step of scene.timeline) {
    if (Number(step.at) < lastAt) failed.push(`${scene.scene_id} timeline out of order`);
    lastAt = Number(step.at);
  }
}

function sampleStage(stage, seed) {
  const rng = engine.createSeededRng(seed);
  const counts = {};
  for (let index = 0; index < 5000; index += 1) {
    const scene = scenes.pickNormalScene({ internalState: "normal", normalStage: stage }, rng);
    counts[scene.scene_id] = (counts[scene.scene_id] || 0) + 1;
  }
  return counts;
}

const street = sampleStage("street", 21);
const heat = sampleStage("heat", 22);
const deep = sampleStage("deep", 23);
const streetDeepCount = Object.entries(street).filter(([id]) => id.includes("deep")).reduce((sum, [, count]) => sum + count, 0);
const deepDeepCount = Object.entries(deep).filter(([id]) => id.includes("deep")).reduce((sum, [, count]) => sum + count, 0);
const streetHeatCount = Object.entries(street).filter(([id]) => id.includes("heat")).reduce((sum, [, count]) => sum + count, 0);
const heatHeatCount = Object.entries(heat).filter(([id]) => id.includes("heat")).reduce((sum, [, count]) => sum + count, 0);

if (deepDeepCount <= streetDeepCount * 5) failed.push("deep stage does not strongly favor deep scenes");
if (heatHeatCount <= streetHeatCount * 3) failed.push("heat stage does not favor heat scenes");

const noDomScene = globalThis.ToshiyaSlotV2ScenePlayer.playScene("normal_deep_hot");
if (noDomScene.scene_id !== "normal_deep_hot") failed.push("ScenePlayer no-DOM playScene failed");

console.log(JSON.stringify({ failed, street, heat, deep }, null, 2));
if (failed.length) process.exitCode = 1;
