// ===== Âm thanh: hiệu ứng (tự tổng hợp), nhạc nền (file mp3), giọng bình luận (giọng đọc của máy) =====
// Hiệu ứng tự tổng hợp bằng Web Audio, không dùng file. Nhạc nền: Kevin MacLeod (incompetech.com), CC BY 4.0.
// Trình duyệt chỉ cho phát âm sau khi người chơi bấm/chạm, nên nhạc bắt đầu từ lần chạm đầu tiên.

// ----- Cài đặt (lưu trên máy) -----
const AUDIO_CFG = (() => {
  const KEY = 'hanhtrinh_cktg_audio';
  const def = { sfx: true, music: true, voice: true, sv: 0.8, mv: 0.45 };
  let c = { ...def };
  try {
    const old = localStorage.getItem('hanhtrinh_cktg_sfx'); // bản trước chỉ có bật/tắt hiệu ứng
    if (old === '0') c.sfx = false;
    Object.assign(c, JSON.parse(localStorage.getItem(KEY) || '{}'));
  } catch (e) { }
  c.save = () => { try { const { save, ...o } = c; localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { } };
  return c;
})();

const SFX = (() => {
  let ac = null, master = null, musicBus = null, noiseBuf = null;

  function ctx(force) {
    if (!AUDIO_CFG.sfx && !force) return null;
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      const comp = ac.createDynamicsCompressor();
      comp.connect(ac.destination);
      master = ac.createGain(); master.gain.value = AUDIO_CFG.sv * 0.75; master.connect(comp);
      musicBus = ac.createGain(); musicBus.gain.value = 1; musicBus.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  const at = t => ac.currentTime + t;
  const NOTE = n => 440 * Math.pow(2, (n - 69) / 12); // số MIDI → Hz
  function env(g, s, a, peak, d) {
    g.gain.setValueAtTime(0.0001, s);
    g.gain.exponentialRampToValueAtTime(peak, s + a);
    g.gain.exponentialRampToValueAtTime(0.0001, s + a + d);
  }
  // một nốt: tần số f, có thể trượt tới "to", rung (vib Hz / vibAmt Hz), lọc thấp lp
  function tone(f, { t = 0, dur = 0.3, type = 'sine', vol = 0.3, a = 0.005, to = null, lp = null, vib = 0, vibAmt = 0 } = {}) {
    if (!ctx()) return;
    const s = at(t), o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, s);
    if (to) o.frequency.exponentialRampToValueAtTime(to, s + a + dur);
    if (vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = vib; lg.gain.value = vibAmt; l.connect(lg); lg.connect(o.frequency); l.start(s); l.stop(s + a + dur + 0.05); }
    env(g, s, a, vol, dur);
    let node = o;
    if (lp) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); node = fl; }
    node.connect(g); g.connect(master);
    o.start(s); o.stop(s + a + dur + 0.05);
  }
  // tiếng ồn có lọc: gió, va chạm, nổ, đám đông
  function noise({ t = 0, dur = 0.3, vol = 0.3, type = 'bandpass', f = 1000, to = null, q = 1, a = 0.005 } = {}) {
    if (!ctx()) return;
    const s = at(t), n = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    n.buffer = noiseBuf; n.loop = true; n.loopStart = Math.random() * 0.5;
    fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, s);
    if (to) fl.frequency.exponentialRampToValueAtTime(to, s + a + dur);
    env(g, s, a, vol, dur);
    n.connect(fl); fl.connect(g); g.connect(master);
    n.start(s, Math.random() * 0.5); n.stop(s + a + dur + 0.05);
  }
  const chord = (notes, o) => notes.forEach(n => tone(NOTE(n), o));
  const arp = (notes, step, o) => notes.forEach((n, i) => tone(NOTE(n), { ...o, t: (o.t || 0) + i * step }));
  const R = (a, b) => a + Math.random() * (b - a);

  // hợp âm theo bậc thẻ: bậc càng cao càng sáng và nhiều nốt
  const TIER_CHORD = [[60, 64, 67], [62, 66, 69], [63, 67, 70, 74], [65, 69, 72, 76], [67, 71, 74, 79, 83], [69, 73, 76, 81, 85, 88]];

  // ----- khối âm dùng lại -----
  const blade = (t = 0, v = 1) => { // vung kiếm + chém trúng
    noise({ t, dur: 0.13, vol: 0.22 * v, type: 'bandpass', f: 1200, to: 6000, q: 2, a: 0.03 });
    const f0 = R(900, 1300);
    [[1, 0.12], [2.4, 0.06], [3.9, 0.04]].forEach(([r, vv]) => tone(f0 * r, { t: t + 0.12, dur: 0.22, vol: vv * v }));
    noise({ t: t + 0.12, dur: 0.06, vol: 0.2 * v, type: 'highpass', f: 3000 });
    tone(140, { t: t + 0.12, dur: 0.12, vol: 0.28 * v, to: 60 });
  };
  const zap = (t = 0, v = 1) => { // phép thuật
    tone(R(900, 1600), { t, dur: 0.22, type: 'sawtooth', vol: 0.05 * v, to: R(150, 300), lp: 3000 });
    noise({ t, dur: 0.2, vol: 0.1 * v, type: 'bandpass', f: 2500, to: 500, q: 3 });
  };
  const boom = (t = 0, v = 1, len = 1) => { // nổ
    tone(75, { t, dur: 0.6 * len, vol: 0.5 * v, to: 30 });
    noise({ t, dur: 0.9 * len, vol: 0.45 * v, type: 'lowpass', f: 1400, to: 90, a: 0.01 });
    noise({ t, dur: 0.12, vol: 0.25 * v, type: 'highpass', f: 2000 });
  };
  const debris = (t = 0, n = 6, v = 1) => { for (let i = 0; i < n; i++) noise({ t: t + R(0.1, 0.9), dur: R(0.03, 0.08), vol: R(0.06, 0.14) * v, type: 'bandpass', f: R(600, 2500), q: 2 }); };
  const crowd = (t = 0, dur = 1.6, v = 1) => { // khán giả reo hò
    noise({ t, dur, vol: 0.13 * v, type: 'bandpass', f: 900, q: 0.6, a: 0.25 });
    noise({ t, dur: dur * 0.9, vol: 0.08 * v, type: 'bandpass', f: 2200, q: 0.8, a: 0.3 });
    for (let i = 0; i < 6; i++) tone(R(500, 900), { t: t + R(0.1, dur * 0.6), dur: R(0.2, 0.45), type: 'triangle', vol: 0.012 * v, to: R(700, 1200), vib: 7, vibAmt: 25 });
  };
  const roar = (t = 0, f = 120, len = 1.2, v = 1) => { // quái vật gầm
    tone(f, { t, dur: len, type: 'sawtooth', vol: 0.16 * v, to: f * 0.6, a: 0.12, lp: 700, vib: 13, vibAmt: f * 0.12 });
    tone(f * 1.51, { t, dur: len * 0.9, type: 'sawtooth', vol: 0.07 * v, to: f * 0.85, a: 0.15, lp: 900, vib: 11, vibAmt: f * 0.1 });
    noise({ t, dur: len, vol: 0.2 * v, type: 'bandpass', f: 420, to: 220, q: 1.5, a: 0.12 });
  };

  const api = {
    get on() { return AUDIO_CFG.sfx; },
    ctx,
    get context() { return ac; },
    get musicBus() { ctx(true); return musicBus; },
    setVolume(v) { AUDIO_CFG.sv = v; if (master) master.gain.value = v * 0.75; },
    toggle() { AUDIO_CFG.sfx = !AUDIO_CFG.sfx; AUDIO_CFG.save(); if (AUDIO_CFG.sfx) ctx(); return AUDIO_CFG.sfx; },

    // ----- Mở gói -----
    packShake() {
      noise({ dur: 0.8, vol: 0.28, type: 'lowpass', f: 180, to: 600, a: 0.3 });
      tone(55, { dur: 0.75, vol: 0.3, to: 90, a: 0.25 });
      [0.15, 0.35, 0.5, 0.62, 0.72].forEach((t, i) => noise({ t, dur: 0.05, vol: 0.12 + i * 0.03, type: 'bandpass', f: 900 + i * 200, q: 3 }));
    },
    whoosh() { noise({ dur: 0.35, vol: 0.3, type: 'bandpass', f: 350, to: 2800, q: 1.4, a: 0.12 }); },
    tick(i = 0) {
      tone(NOTE(74 + i * 2), { dur: 0.09, type: 'triangle', vol: 0.22 });
      tone(NOTE(86 + i * 2), { dur: 0.05, type: 'sine', vol: 0.08 });
      noise({ dur: 0.03, vol: 0.08, type: 'highpass', f: 5000 });
    },
    glow(ti = 0) {
      const notes = TIER_CHORD[ti] || TIER_CHORD[0];
      chord(notes, { dur: 0.9 + ti * 0.15, type: 'triangle', vol: 0.09, a: 0.18 });
      chord(notes.map(n => n + 12), { dur: 0.8 + ti * 0.15, type: 'sine', vol: 0.05, a: 0.25 });
      noise({ dur: 0.8, vol: 0.06 + ti * 0.02, type: 'highpass', f: 3000, to: 9000, a: 0.3 });
      if (ti >= 4) { tone(65, { dur: 1.2, vol: 0.4, to: 38, a: 0.02 }); noise({ dur: 0.9, vol: 0.25, type: 'lowpass', f: 400, to: 120 }); }
    },
    reveal(ti = 0) {
      tone(170, { dur: 0.35, vol: 0.45, to: 45 });
      noise({ dur: 0.22, vol: 0.3, type: 'lowpass', f: 1600, to: 300 });
      const notes = TIER_CHORD[ti] || TIER_CHORD[0];
      arp(notes.concat(notes[0] + 12, notes[1] + 12).slice(0, 3 + ti), 0.055, { t: 0.05, dur: 0.35, type: 'triangle', vol: 0.12 });
      noise({ t: 0.05, dur: 0.6, vol: 0.05 + ti * 0.015, type: 'highpass', f: 6000 });
      if (ti >= 3) {
        chord(notes.slice(0, 4).map(n => n - 12), { t: 0.12, dur: 1 + (ti - 3) * 0.4, type: 'sawtooth', vol: 0.045, a: 0.04, lp: 2200 });
        chord(notes.slice(0, 3), { t: 0.12, dur: 1.1 + (ti - 3) * 0.4, type: 'square', vol: 0.025, a: 0.04, lp: 3000 });
      }
      if (ti >= 5) arp([93, 96, 100, 105], 0.07, { t: 0.4, dur: 0.5, type: 'sine', vol: 0.08 });
    },
    flipQuick() { tone(NOTE(79), { dur: 0.07, type: 'triangle', vol: 0.15 }); noise({ dur: 0.06, vol: 0.08, type: 'bandpass', f: 2500 }); },

    // ----- Nâng cấp (đập thẻ) -----
    place(t = 0) { tone(190, { t, dur: 0.14, vol: 0.35, to: 85 }); noise({ t, dur: 0.07, vol: 0.22, type: 'lowpass', f: 900 }); },
    charge(dur = 2.4) {
      if (!ctx()) return;
      const s = at(0), o = ac.createOscillator(), o2 = ac.createOscillator(), fl = ac.createBiquadFilter(), g = ac.createGain();
      o.type = 'sawtooth'; o2.type = 'sawtooth';
      o.frequency.setValueAtTime(90, s); o.frequency.exponentialRampToValueAtTime(420, s + dur);
      o2.frequency.setValueAtTime(91.5, s); o2.frequency.exponentialRampToValueAtTime(428, s + dur);
      fl.type = 'lowpass'; fl.Q.value = 6; fl.frequency.setValueAtTime(250, s); fl.frequency.exponentialRampToValueAtTime(3200, s + dur);
      g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.09, s + dur * 0.9); g.gain.exponentialRampToValueAtTime(0.0001, s + dur + 0.08);
      o.connect(fl); o2.connect(fl); fl.connect(g); g.connect(master);
      o.start(s); o2.start(s); o.stop(s + dur + 0.1); o2.stop(s + dur + 0.1);
    },
    clang(i = 0) {
      const f0 = NOTE(52 + i * 3);
      [[1, 0.22], [2.76, 0.12], [5.4, 0.07], [8.93, 0.04]].forEach(([r, v]) => tone(f0 * r, { dur: 0.55, vol: v, type: 'sine' }));
      tone(130, { dur: 0.16, vol: 0.4, to: 55 });
      noise({ dur: 0.05, vol: 0.3, type: 'highpass', f: 2500 });
    },
    success(lv = 1) {
      const big = lv >= 5;
      tone(110, { dur: 0.5, vol: 0.5, to: 40 });
      noise({ dur: 0.5, vol: 0.3, type: 'lowpass', f: 2500, to: 200 });
      arp([72, 76, 79, 84, 88], 0.07, { t: 0.05, dur: 0.4, type: 'triangle', vol: 0.15 });
      chord([60, 64, 67, 72], { t: 0.4, dur: big ? 1.8 : 1.1, type: 'sawtooth', vol: 0.04, a: 0.05, lp: 2500 });
      chord([72, 76, 79], { t: 0.4, dur: big ? 1.8 : 1.1, type: 'triangle', vol: 0.08, a: 0.05 });
      noise({ t: 0.35, dur: 1.2, vol: 0.06, type: 'highpass', f: 7000 });
      if (big) arp([84, 88, 91, 96, 100], 0.06, { t: 0.75, dur: 0.5, type: 'sine', vol: 0.09 });
    },
    fail() {
      noise({ dur: 0.3, vol: 0.38, type: 'bandpass', f: 2600, to: 900, q: 0.8 });
      [0.04, 0.09, 0.15].forEach(t => noise({ t, dur: 0.05, vol: 0.15, type: 'highpass', f: 4000 }));
      tone(330, { t: 0.05, dur: 0.6, type: 'triangle', vol: 0.22, to: 110 });
      tone(247, { t: 0.25, dur: 0.8, type: 'triangle', vol: 0.18, to: 70 });
      tone(80, { t: 0.05, dur: 0.5, vol: 0.35, to: 40 });
    },

    // ----- Trận đấu -----
    gameStart() { // kèn mở trận + trống
      chord([48, 55, 60], { dur: 1.6, type: 'sawtooth', vol: 0.05, a: 0.35, lp: 1800 });
      chord([60, 67], { t: 0.5, dur: 1.2, type: 'square', vol: 0.025, a: 0.2, lp: 2400 });
      [0, 0.5, 1.0].forEach((t, i) => { tone(70, { t, dur: 0.35, vol: 0.4 + i * 0.05, to: 40 }); noise({ t, dur: 0.15, vol: 0.12, type: 'lowpass', f: 600 }); });
    },
    kill(big) { blade(0, big ? 1.2 : 0.9); if (big) { tone(NOTE(45), { t: 0.15, dur: 1.4, vol: 0.18, type: 'sine' }); tone(NOTE(57), { t: 0.15, dur: 1.2, vol: 0.08, type: 'triangle' }); crowd(0.25, 1.3, 0.8); } },
    fight(n = 3) { // giao tranh: chém + phép + nổ liên tục
      const k = 3 + n;
      for (let i = 0; i < k; i++) {
        const t = i * R(0.12, 0.2);
        const r = Math.random();
        if (r < 0.45) blade(t, R(0.6, 0.9)); else if (r < 0.8) zap(t, R(0.7, 1)); else boom(t, 0.35, 0.5);
      }
      crowd(0.5, 1.6, 0.9);
    },
    ace() {
      tone(NOTE(33), { dur: 2, vol: 0.3, to: NOTE(31) });
      chord([57, 60, 64, 69], { t: 0.1, dur: 1.6, type: 'sawtooth', vol: 0.04, a: 0.3, lp: 2000 });
      arp([69, 72, 76, 81], 0.09, { t: 0.1, dur: 0.5, type: 'triangle', vol: 0.1 });
      crowd(0.2, 2.2, 1.2);
    },
    tower(inhib) { // trụ sụp / nhà lính vỡ
      boom(0, inhib ? 1.1 : 0.9, inhib ? 1.3 : 1);
      debris(0.15, inhib ? 10 : 7);
      if (inhib) for (let i = 0; i < 7; i++) tone(R(1800, 4200), { t: 0.08 + i * 0.05, dur: 0.25, vol: 0.05, type: 'sine', to: R(900, 1500) });
    },
    dragon(stolen) {
      roar(0, 150, 1.1, 0.9);
      arp([67, 71, 74, 79], 0.08, { t: 0.9, dur: 0.45, type: 'triangle', vol: 0.1 });
      if (stolen) crowd(0.3, 1.8, 1.1);
    },
    soul() {
      chord([64, 68, 71, 76], { dur: 1.6, type: 'triangle', vol: 0.07, a: 0.3 });
      noise({ dur: 1.4, vol: 0.08, type: 'highpass', f: 4000, to: 10000, a: 0.4 });
      arp([76, 80, 83, 88, 92], 0.07, { t: 0.4, dur: 0.5, type: 'sine', vol: 0.08 });
    },
    herald() { noise({ dur: 0.5, vol: 0.25, type: 'bandpass', f: 400, to: 1800, q: 1, a: 0.15 }); [0.45, 0.75].forEach(t => boom(t, 0.4, 0.5)); },
    baron(steal) {
      roar(0, 85, 1.8, 1.2);
      chord([45, 48, 52, 57], { t: 0.6, dur: 1.6, type: 'sawtooth', vol: 0.045, a: 0.2, lp: 1600 });
      tone(NOTE(33), { t: 0.6, dur: 1.6, vol: 0.25 });
      crowd(0.5, steal ? 2.6 : 1.6, steal ? 1.4 : 0.8);
    },
    elder() {
      roar(0, 110, 1.6, 1.1);
      noise({ t: 0.5, dur: 1, vol: 0.3, type: 'bandpass', f: 300, to: 3000, q: 0.8, a: 0.2 }); // lửa
      chord([50, 53, 57, 62], { t: 0.7, dur: 1.4, type: 'sawtooth', vol: 0.04, a: 0.2, lp: 1800 });
      crowd(0.8, 1.5, 0.9);
    },
    nexus() { boom(0, 1.4, 2); boom(0.35, 1, 1.5); debris(0.2, 14, 1.2); crowd(0.4, 3, 1.4); },
    victory() {
      arp([60, 64, 67, 72], 0.12, { dur: 0.5, type: 'triangle', vol: 0.15 });
      chord([60, 64, 67, 72, 76], { t: 0.5, dur: 1.8, type: 'sawtooth', vol: 0.04, a: 0.05, lp: 2600 });
      chord([72, 76, 79], { t: 0.5, dur: 1.8, type: 'triangle', vol: 0.1, a: 0.05 });
      tone(NOTE(36), { t: 0.5, dur: 1.6, vol: 0.3 });
    },
    defeat() {
      arp([67, 63, 60, 55], 0.22, { dur: 0.7, type: 'triangle', vol: 0.13 });
      chord([48, 51, 55], { t: 0.8, dur: 1.8, type: 'sawtooth', vol: 0.035, a: 0.2, lp: 1200 });
      tone(NOTE(36), { t: 0.8, dur: 1.8, vol: 0.25 });
    },
    banner() { noise({ dur: 0.3, vol: 0.14, type: 'bandpass', f: 600, to: 3500, q: 1.2, a: 0.1 }); },
  };
  return api;
})();

// ----- Nhạc nền: 2 bản, chuyển mượt khi vào / ra trận -----
const MUSIC = (() => {
  const TRACKS = { menu: 'audio/menu-heroic-age.mp3', match: 'audio/match-five-armies.mp3' };
  const els = {}, gains = {};
  let cur = 'menu', unlocked = false, duck = 1;
  const vol = () => (AUDIO_CFG.music ? AUDIO_CFG.mv * duck : 0);
  function el(name) {
    if (els[name]) return els[name];
    const a = new Audio(TRACKS[name]);
    a.loop = true; a.preload = 'none'; a.crossOrigin = 'anonymous';
    els[name] = a;
    // đi qua Web Audio để chỉnh âm lượng được cả trên iPhone
    try {
      const c = SFX.context || (SFX.ctx(true), SFX.context);
      const src = c.createMediaElementSource(a), g = c.createGain();
      g.gain.value = 0; src.connect(g); g.connect(SFX.musicBus); gains[name] = g;
    } catch (e) { a.volume = 0; }
    return a;
  }
  function fadeTo(name, v, sec = 1.2) {
    const g = gains[name];
    if (g) { const c = SFX.context; g.gain.cancelScheduledValues(c.currentTime); g.gain.setTargetAtTime(v, c.currentTime, sec / 4); }
    else if (els[name]) els[name].volume = Math.min(1, v);
  }
  function apply() {
    if (!unlocked) return;
    Object.keys(TRACKS).forEach(n => {
      const want = n === cur && AUDIO_CFG.music && !document.hidden;
      if (want) { const a = el(n); if (a.paused) a.play().catch(() => { }); fadeTo(n, vol()); }
      else if (els[n] && !els[n].paused) {
        fadeTo(n, 0, 0.8);
        const a = els[n];
        setTimeout(() => { if (!(cur === n && AUDIO_CFG.music && !document.hidden)) a.pause(); }, 900);
      }
    });
  }
  const unlock = () => { if (unlocked) return; unlocked = true; SFX.ctx(true); apply(); };
  ['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, unlock, { once: false, passive: true }));
  document.addEventListener('visibilitychange', apply);
  return {
    play(name) { if (cur === name) return; cur = name; apply(); },
    refresh: apply,
    setVolume(v) { AUDIO_CFG.mv = v; apply(); },
    duck(on) { duck = on ? 0.35 : 1; if (unlocked && AUDIO_CFG.music && els[cur]) fadeTo(cur, vol(), 0.4); },
  };
})();

// ----- Giọng bình luận viên: giọng đọc tiếng Việt có sẵn trên máy (Web Speech) -----
const VOICE = (() => {
  const syn = window.speechSynthesis;
  let voice = null, busyPrio = -1, pending = null;
  function pickVoice() {
    if (!syn) return null;
    const vs = syn.getVoices().filter(v => /^vi/i.test(v.lang));
    voice = vs.find(v => /NamMinh/i.test(v.name)) || vs.find(v => /Natural|Online/i.test(v.name)) || vs.find(v => /Google/i.test(v.name)) || vs[0] || null;
    return voice;
  }
  if (syn) { pickVoice(); syn.onvoiceschanged = pickVoice; }
  // đọc cho tự nhiên: bỏ biểu tượng, chữ IN HOA thành thường, phiên âm vài thuật ngữ
  const SAY = [[/FIRST BLOOD/gi, 'Phớt Blớt'], [/SOLO KILL/gi, 'sô lô kiu'], [/\bACE\b/g, 'Ây'], [/Baron Nashor/gi, 'Ba rôn'], [/\bBARON\b/gi, 'Ba rôn'],
    [/\bgank\b/gi, 'găng'], [/\bfarm\b/gi, 'pham'], [/\bcombat\b/gi, 'com bát'], [/BLV:/g, ''], [/(\d)-(\d)/g, '$1 đổi $2'], [/(\d+(?:\.\d)?)k vàng/g, '$1 nghìn vàng']];
  function clean(t) {
    t = String(t).replace(/[\p{Extended_Pictographic}‍️]/gu, '').replace(/[#"“”()]/g, ' ');
    SAY.forEach(([re, s]) => { t = t.replace(re, s); });
    // chữ IN HOA (CHIẾN THẮNG, PHÁ HỦY…) đọc như chữ thường; giữ mã đội 3 chữ không dấu (SKT, GEN…)
    t = t.replace(/(?<![\p{L}\p{N}])\p{Lu}{3,}(?![\p{L}\p{N}])/gu, w => (w.length >= 4 || /[^A-Z]/.test(w) ? w.toLowerCase() : w));
    return t.replace(/\s+/g, ' ').trim();
  }
  function speak(text, prio, rate) {
    const u = new SpeechSynthesisUtterance(clean(text));
    u.lang = 'vi-VN'; if (voice) u.voice = voice;
    u.rate = rate; u.pitch = 1.05; u.volume = 1;
    busyPrio = prio;
    u.onstart = () => MUSIC.duck(true);
    u.onend = u.onerror = () => {
      busyPrio = -1; MUSIC.duck(false);
      if (pending) { const p = pending; pending = null; speak(p.text, p.prio, p.rate); }
    };
    syn.speak(u);
  }
  return {
    get supported() { return !!syn; },
    get available() { return !!(syn && (voice || pickVoice())); },
    get voiceName() { return voice ? voice.name : ''; },
    // prio cao hơn câu đang đọc thì cắt ngang; thấp hơn thì chờ (chỉ giữ 1 câu chờ)
    say(text, prio = 1, rate = 1.1) {
      if (!AUDIO_CFG.voice || !syn || !text || !(voice || pickVoice())) return;
      if (busyPrio < 0 && !syn.speaking) return speak(text, prio, rate);
      if (prio > busyPrio + 1) { pending = null; busyPrio = -1; syn.cancel(); return setTimeout(() => speak(text, prio, rate), 60); }
      if (!pending || prio >= pending.prio) pending = { text, prio, rate };
    },
    stop() { pending = null; busyPrio = -1; if (syn) syn.cancel(); MUSIC.duck(false); },
  };
})();

// ----- Âm thanh cho diễn biến trận đấu -----
const MatchAudio = (() => {
  const lastAt = {};
  const gate = (k, ms) => { const n = performance.now(); if (lastAt[k] && n - lastAt[k] < ms) return false; lastAt[k] = n; return true; };
  function prioOf(e) {
    if (e.type === 'end') return 5;
    if (e.type === 'ace' || (e.type === 'obj' && ['baron', 'elder', 'soul'].includes(e.obj))) return 4;
    if (e.type === 'fight' || (e.type === 'kill' && e.big) || e.banner) return 3;
    if (e.type === 'obj' || e.type === 'tower') return 2;
    if (e.type === 'kill') return 1;
    return 0;
  }
  return {
    start(gameNo, teams) {
      MUSIC.play('match');
      if (gate('start', 500)) SFX.gameStart();
      VOICE.stop();
      VOICE.say(`Ván ${gameNo}. ${teams[0].name} gặp ${teams[1].name}. Trận đấu bắt đầu!`, 3, 1.1);
    },
    event(e, speed) {
      // hiệu ứng
      const sp = Math.max(1, speed || 1);
      if (e.type === 'kill') { if (gate('kill', 200 * sp)) SFX.kill(e.big); }
      else if (e.type === 'fight') { if (gate('fight', 400)) SFX.fight((e.dead || []).length); }
      else if (e.type === 'ace') SFX.ace();
      else if (e.type === 'tower') { if (gate('tower', 300)) SFX.tower(/Nhà Lính/.test(e.text)); }
      else if (e.type === 'end') SFX.nexus();
      else if (e.type === 'obj') {
        if (e.obj === 'dragon') SFX.dragon(/CƯỚP/.test(e.text));
        else if (e.obj === 'soul') SFX.soul();
        else if (e.obj === 'herald') SFX.herald();
        else if (e.obj === 'baron') SFX.baron(/CƯỚP/.test(e.text));
        else if (e.obj === 'elder') SFX.elder();
      }
      if (e.banner && gate('banner', 300)) SFX.banner();
      // giọng đọc: tua nhanh thì chỉ đọc diễn biến lớn
      const p = prioOf(e), min = sp >= 4 ? 3 : sp >= 2 ? 2 : 0;
      if (p >= min) VOICE.say(e.text, p, Math.min(1.45, 1.05 + (sp - 1) * 0.12));
    },
    result(win) { setTimeout(() => (win ? SFX.victory() : SFX.defeat()), 600); },
    skip() { VOICE.stop(); },
    end() { VOICE.stop(); MUSIC.play('menu'); },
  };
})();
