// main.js — نقطة البداية: يربط العالم واللاعب والأماكن والصوت والواجهة
import * as THREE from 'three';
import { createWorld } from './world.js';
import { buildVillage } from './village.js';
import { createPlaces } from './places.js';
import { createPlayer } from './player.js';
import { createAmbience } from './audio.js';
import { createUI } from './ui.js';

const ui = createUI();
const canvas = document.getElementById('scene');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
} catch (err) {
  ui.showNoWebgl();
  throw err;
}
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;

const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 900);

const world = createWorld();
buildVillage(world);
const places = createPlaces(world);
const player = createPlayer(camera, canvas);
const ambience = createAmbience();

let paused = false;
let nearInfo = { canRead: false, showName: false, marker: null };
let currentMarker = null;

// ── ربط الواجهة ──
ui.on('start', () => {
  player.state.enabled = true;
  ambience.start();
});
ui.on('toggleMute', () => ambience.toggleMute());
ui.on('paused', () => { paused = true; player.state.enabled = false; });
ui.on('resumed', () => { paused = false; player.state.enabled = true; });
ui.on('interact', () => tryRead());
ui.on('messageClosed', () => {
  player.state.enabled = true;
  if (ui.collectedCount === 4) setTimeout(() => ui.showEnding(), 900);
});
ui.on('endingClosed', () => { player.state.enabled = true; });
player.state.onInteract = () => tryRead();

function tryRead() {
  if (paused) return;
  // حساب طازج وقت الضغط — لا نعتمد على آخر إطار من الحلقة
  const info = places.nearest(player.state.pos);
  if (!info.canRead || !info.marker) return;
  currentMarker = info.marker;
  places.collect(currentMarker);
  player.state.enabled = false;
  ui.showMessage(currentMarker.place);
}

// ── حلقة الرسم ──
window.__debug = { camera, player, world, places, nearInfo: () => nearInfo };

const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  if (!paused) {
    world.update(t, dt);
    player.update(dt);
    nearInfo = places.nearest(player.state.pos);
    ui.setProximity(nearInfo);
  }
  renderer.render(world.scene, camera);
}
loop();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
