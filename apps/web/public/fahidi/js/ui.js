// ui.js — إدارة الواجهة: الشاشات، العدّاد، التلميحات
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤'];

const el = (id) => document.getElementById(id);

export function createUI() {
  const intro = el('intro'), hud = el('hud'), hint = el('hint'), placeName = el('placeName');
  const overlay = el('messageOverlay'), ending = el('ending'), pause = el('pause');
  const counter = el('counter');

  let collectedCount = 0;
  const listeners = {};
  const on = (name, fn) => { listeners[name] = fn; };
  const emit = (name, arg) => listeners[name] && listeners[name](arg);

  // ── الأزرار ──
  el('startBtn').addEventListener('click', () => {
    intro.classList.add('opacity-0', 'pointer-events-none', 'transition-opacity', 'duration-1000');
    setTimeout(() => intro.classList.add('hidden'), 1100);
    hud.classList.remove('hidden');
    emit('start');
  });
  el('closeMsg').addEventListener('click', () => {
    overlay.classList.add('hidden'); overlay.classList.remove('flex');
    emit('messageClosed');
  });
  el('readBtn').addEventListener('click', () => emit('interact'));
  el('continueBtn').addEventListener('click', () => {
    ending.classList.add('hidden'); ending.classList.remove('flex');
    emit('endingClosed');
  });
  el('resumeBtn').addEventListener('click', () => hidePause());
  el('muteBtn').addEventListener('click', () => {
    const muted = emit('toggleMute');
    el('muteBtn').textContent = muted ? 'الصوت: مكتوم' : 'الصوت: يعمل';
  });
  el('fsBtn').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      if (!overlay.classList.contains('hidden')) {
        overlay.classList.add('hidden'); overlay.classList.remove('flex');
        emit('messageClosed');
      } else if (pause.classList.contains('hidden')) showPause();
      else hidePause();
    }
  });

  function showPause() {
    // شاشة البداية تُعدّ منتهية بمجرد بدء تلاشيها (pointer-events-none)
    const introActive = !intro.classList.contains('hidden') && !intro.classList.contains('pointer-events-none');
    if (introActive) return;
    pause.classList.remove('hidden'); pause.classList.add('flex');
    emit('paused');
  }
  function hidePause() {
    pause.classList.add('hidden'); pause.classList.remove('flex');
    emit('resumed');
  }

  // ── تُستدعى كل إطار من main ──
  function setProximity({ canRead, showName, marker }) {
    hint.classList.toggle('hidden', !canRead);
    hint.classList.toggle('flex', canRead);
    if (showName && marker) {
      placeName.textContent = marker.collected ? `${marker.place.name} — قُرئت رسالته` : marker.place.name;
      placeName.style.opacity = '1';
    } else {
      placeName.style.opacity = '0';
    }
  }

  // ── عرض رسالة ──
  function showMessage(place) {
    el('msgPlace').textContent = place.name;
    el('msgTitle').textContent = place.title;
    el('msgBody').textContent = place.body;
    el('msgSign').textContent = place.sign;
    el('msgLink').href = place.link;
    overlay.classList.remove('hidden'); overlay.classList.add('flex');
    collectedCount++;
    counter.textContent = `${ARABIC_DIGITS[collectedCount]} / ٤`;
  }

  function showEnding() {
    ending.classList.remove('hidden'); ending.classList.add('flex');
  }

  function showNoWebgl() {
    el('noWebgl').classList.remove('hidden');
    el('noWebgl').classList.add('flex');
    intro.classList.add('hidden');
  }

  return { on, setProximity, showMessage, showEnding, showNoWebgl, get collectedCount() { return collectedCount; } };
}
