// player.js — حركة المشي والنظر (كمبيوتر + موبايل)
import * as THREE from 'three';
import { walkHeight, isWalkable } from './world.js';

const EYE = 1.7;
const SPEED = 5.2;

export function createPlayer(camera, canvas) {
  const state = {
    pos: new THREE.Vector3(0, 0, 14),
    yaw: 0,                // مواجهًا للفريج (نحو -z)
    pitch: -0.05,
    enabled: false,
    onInteract: null,      // تُضبط من الخارج
  };
  state.pos.y = walkHeight(state.pos.x, state.pos.z) + EYE;

  const keys = new Set();
  const KEYMAP = {
    KeyW: 'f', ArrowUp: 'f',
    KeyS: 'b', ArrowDown: 'b',
    KeyA: 'l', ArrowLeft: 'l',
    KeyD: 'r', ArrowRight: 'r',
  };

  window.addEventListener('keydown', (e) => {
    if (!state.enabled) return;
    if (KEYMAP[e.code]) { keys.add(KEYMAP[e.code]); e.preventDefault(); }
    if ((e.code === 'KeyE' || e.code === 'Space') && state.onInteract) { state.onInteract(); e.preventDefault(); }
  });
  window.addEventListener('keyup', (e) => { if (KEYMAP[e.code]) keys.delete(KEYMAP[e.code]); });
  window.addEventListener('blur', () => keys.clear());

  // ── النظر بسحب الفأرة ──
  let dragging = false, lastX = 0, lastY = 0;
  canvas.addEventListener('mousedown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
  window.addEventListener('mouseup', () => { dragging = false; });
  window.addEventListener('mousemove', (e) => {
    if (!dragging || !state.enabled) return;
    state.yaw -= (e.clientX - lastX) * 0.0032;
    state.pitch = THREE.MathUtils.clamp(state.pitch - (e.clientY - lastY) * 0.0026, -0.65, 0.55);
    lastX = e.clientX; lastY = e.clientY;
  });

  // ── لمس: عصا يمين (RTL) للمشي + سحب باقي الشاشة للنظر ──
  const joy = { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
  const look = { id: null, x: 0, y: 0 };
  const joyBase = document.getElementById('joyBase');
  const joyStick = document.getElementById('joyStick');
  const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  if (isTouch && joyBase) joyBase.classList.remove('hidden');

  canvas.addEventListener('touchstart', (e) => {
    if (!state.enabled) return;
    for (const t of e.changedTouches) {
      const nearJoy = joyBase && !joyBase.classList.contains('hidden') &&
        Math.hypot(t.clientX - joyRect().cx, t.clientY - joyRect().cy) < 110;
      if (nearJoy && joy.id === null) {
        joy.id = t.identifier; joy.active = true;
        joy.ox = joyRect().cx; joy.oy = joyRect().cy;
      } else if (look.id === null) {
        look.id = t.identifier; look.x = t.clientX; look.y = t.clientY;
      }
    }
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === joy.id) {
        joy.dx = THREE.MathUtils.clamp((t.clientX - joy.ox) / 45, -1, 1);
        joy.dy = THREE.MathUtils.clamp((t.clientY - joy.oy) / 45, -1, 1);
        if (joyStick) joyStick.style.transform =
          `translate(calc(-50% + ${joy.dx * 26}px), calc(-50% + ${joy.dy * 26}px))`;
      } else if (t.identifier === look.id) {
        state.yaw -= (t.clientX - look.x) * 0.005;
        state.pitch = THREE.MathUtils.clamp(state.pitch - (t.clientY - look.y) * 0.004, -0.65, 0.55);
        look.x = t.clientX; look.y = t.clientY;
      }
    }
    e.preventDefault();
  }, { passive: false });

  const endTouch = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === joy.id) {
        joy.id = null; joy.active = false; joy.dx = joy.dy = 0;
        if (joyStick) joyStick.style.transform = 'translate(-50%, -50%)';
      }
      if (t.identifier === look.id) look.id = null;
    }
  };
  canvas.addEventListener('touchend', endTouch);
  canvas.addEventListener('touchcancel', endTouch);

  function joyRect() {
    const r = joyBase.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  }

  // ── التحديث كل إطار ──
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const move = new THREE.Vector3();

  function update(dt) {
    if (state.enabled) {
      // نفس اتجاه نظر الكاميرا (الكاميرا تنظر نحو -z محليًا)
      forward.set(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));
      right.set(-forward.z, 0, forward.x);
      move.set(0, 0, 0);
      if (keys.has('f')) move.add(forward);
      if (keys.has('b')) move.sub(forward);
      if (keys.has('l')) move.sub(right);
      if (keys.has('r')) move.add(right);
      if (joy.active) {
        move.addScaledVector(forward, -joy.dy);
        move.addScaledVector(right, -joy.dx);
      }
      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(SPEED * dt);
        const nx = state.pos.x + move.x, nz = state.pos.z + move.z;
        if (isWalkable(nx, nz)) { state.pos.x = nx; state.pos.z = nz; }
        else if (isWalkable(nx, state.pos.z)) state.pos.x = nx;
        else if (isWalkable(state.pos.x, nz)) state.pos.z = nz;
      }
      // التصاق ناعم بالأرض
      const targetY = walkHeight(state.pos.x, state.pos.z) + EYE;
      state.pos.y += (targetY - state.pos.y) * Math.min(1, dt * 10);
    }
    camera.position.copy(state.pos);
    camera.rotation.set(state.pitch, state.yaw, 0, 'YXZ');
  }

  return { state, update };
}
