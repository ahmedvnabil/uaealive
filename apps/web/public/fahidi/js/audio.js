// audio.js — صوت محيطي مولّد بالكامل: رياح + ماء + نغمات على مقام الحجاز
export function createAmbience() {
  let ctx = null;
  let master = null;
  let muted = false;
  let pluckTimer = null;

  // مقام الحجاز على ري: ري، مي♭، فا#، صول، لا، سي♭، دو
  const HIJAZ = [293.66, 311.13, 369.99, 392.0, 440.0, 466.16, 523.25];

  function noiseBuffer(seconds) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      // ضوضاء بنية (أنعم من البيضاء)
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    return buf;
  }

  function loopNoise(buffer, filterType, freq, q, gainValue, lfoFreq, lfoDepth) {
    const src = ctx.createBufferSource();
    src.buffer = buffer; src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType; filter.frequency.value = freq; filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.value = gainValue;
    // تنفّس بطيء في مستوى الصوت
    const lfo = ctx.createOscillator();
    lfo.frequency.value = lfoFreq;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = lfoDepth;
    lfo.connect(lfoGain).connect(gain.gain);
    src.connect(filter).connect(gain).connect(master);
    src.start(); lfo.start();
  }

  function pad() {
    // بساط هارموني خافت: ري + لا (خامسة هادئة)
    for (const [f, g] of [[146.83, 0.016], [220.0, 0.011]]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine'; osc.frequency.value = f;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(g, ctx.currentTime + 8);
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.06 + Math.random() * 0.04;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = g * 0.4;
      lfo.connect(lfoGain).connect(gain.gain);
      osc.connect(gain).connect(master);
      osc.start(); lfo.start();
    }
  }

  function pluck() {
    // نغمة عود بعيدة: مثلثية باضمحلال + صدى
    const note = HIJAZ[Math.floor(Math.random() * HIJAZ.length)] / (Math.random() > 0.6 ? 1 : 2);
    const osc = ctx.createOscillator();
    osc.type = 'triangle'; osc.frequency.value = note;
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.05, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);
    const delay = ctx.createDelay(1.2);
    delay.delayTime.value = 0.42;
    const fb = ctx.createGain(); fb.gain.value = 0.3;
    delay.connect(fb).connect(delay);
    osc.connect(gain);
    gain.connect(master);
    gain.connect(delay).connect(master);
    osc.start(now); osc.stop(now + 3);
    pluckTimer = setTimeout(pluck, 5000 + Math.random() * 9000);
  }

  function start() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
    const buf = noiseBuffer(3);
    loopNoise(buf, 'lowpass', 320, 0.6, 0.05, 0.07, 0.02);   // رياح
    loopNoise(buf, 'bandpass', 850, 0.8, 0.028, 0.22, 0.012); // ماء الخور
    pad();
    pluckTimer = setTimeout(pluck, 3500);
  }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.linearRampToValueAtTime(muted ? 0 : 1, ctx.currentTime + 0.4);
    return muted;
  }

  return { start, toggleMute, get muted() { return muted; } };
}
