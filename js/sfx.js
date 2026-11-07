// ===== Âm thanh hiệu ứng =====
// Tự tổng hợp bằng Web Audio (không dùng file âm thanh nào): nhẹ, không tốn băng thông, không vướng bản quyền.
// Trình duyệt chỉ cho phát âm sau khi người chơi bấm/chạm, nên mọi âm đều được gọi từ một thao tác bấm.
const SFX = (() => {
  const KEY = 'hanhtrinh_cktg_sfx';
  let ac = null, master = null, noiseBuf = null;
  let on = true;
  try { on = localStorage.getItem(KEY) !== '0'; } catch (e) { }

  function ctx() {
    if (!on) return null;
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      master = ac.createGain(); master.gain.value = 0.6;
      const comp = ac.createDynamicsCompressor();
      master.connect(comp); comp.connect(ac.destination);
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
  // một nốt đơn: tần số f, có thể trượt tới "to"
  function tone(f, { t = 0, dur = 0.3, type = 'sine', vol = 0.3, a = 0.005, to = null, lp = null } = {}) {
    if (!ctx()) return;
    const s = at(t), o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, s);
    if (to) o.frequency.exponentialRampToValueAtTime(to, s + a + dur);
    env(g, s, a, vol, dur);
    let node = o;
    if (lp) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); node = fl; }
    node.connect(g); g.connect(master);
    o.start(s); o.stop(s + a + dur + 0.05);
  }
  // tiếng ồn có lọc: gió, va chạm, lấp lánh
  function noise({ t = 0, dur = 0.3, vol = 0.3, type = 'bandpass', f = 1000, to = null, q = 1, a = 0.005 } = {}) {
    if (!ctx()) return;
    const s = at(t), n = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    n.buffer = noiseBuf; n.loop = true;
    fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, s);
    if (to) fl.frequency.exponentialRampToValueAtTime(to, s + a + dur);
    env(g, s, a, vol, dur);
    n.connect(fl); fl.connect(g); g.connect(master);
    n.start(s); n.stop(s + a + dur + 0.05);
  }
  const chord = (notes, o) => notes.forEach(n => tone(NOTE(n), o));
  const arp = (notes, step, o) => notes.forEach((n, i) => tone(NOTE(n), { ...o, t: (o.t || 0) + i * step }));

  // hợp âm theo bậc thẻ: bậc càng cao càng sáng và nhiều nốt
  const TIER_CHORD = [[60, 64, 67], [62, 66, 69], [63, 67, 70, 74], [65, 69, 72, 76], [67, 71, 74, 79, 83], [69, 73, 76, 81, 85, 88]];

  const api = {
    get on() { return on; },
    ctx,
    toggle() {
      on = !on;
      try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) { }
      if (!on && ac) ac.suspend(); else ctx();
      return on;
    },

    // ----- Mở gói -----
    packShake() { // gói rung: tiếng ầm thấp dồn lên
      noise({ dur: 0.8, vol: 0.28, type: 'lowpass', f: 180, to: 600, a: 0.3 });
      tone(55, { dur: 0.75, vol: 0.3, to: 90, a: 0.25 });
      [0.15, 0.35, 0.5, 0.62, 0.72].forEach((t, i) => noise({ t, dur: 0.05, vol: 0.12 + i * 0.03, type: 'bandpass', f: 900 + i * 200, q: 3 }));
    },
    whoosh() { // thẻ bay ra
      noise({ dur: 0.35, vol: 0.3, type: 'bandpass', f: 350, to: 2800, q: 1.4, a: 0.12 });
    },
    tick(i = 0) { // mỗi lần nhấp nháy: cao dần
      tone(NOTE(74 + i * 2), { dur: 0.09, type: 'triangle', vol: 0.22 });
      tone(NOTE(86 + i * 2), { dur: 0.05, type: 'sine', vol: 0.08 });
      noise({ dur: 0.03, vol: 0.08, type: 'highpass', f: 5000 });
    },
    glow(ti = 0) { // ánh sáng màu bậc thẻ
      const notes = TIER_CHORD[ti] || TIER_CHORD[0];
      chord(notes, { dur: 0.9 + ti * 0.15, type: 'triangle', vol: 0.09, a: 0.18 });
      chord(notes.map(n => n + 12), { dur: 0.8 + ti * 0.15, type: 'sine', vol: 0.05, a: 0.25 });
      noise({ dur: 0.8, vol: 0.06 + ti * 0.02, type: 'highpass', f: 3000, to: 9000, a: 0.3 });
      if (ti >= 4) { tone(65, { dur: 1.2, vol: 0.4, to: 38, a: 0.02 }); noise({ dur: 0.9, vol: 0.25, type: 'lowpass', f: 400, to: 120 }); }
    },
    reveal(ti = 0) { // lật thẻ: va chạm + chuỗi nốt lấp lánh, bậc cao có kèn
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
    place(t = 0) { // đặt thẻ xuống bàn
      tone(190, { t, dur: 0.14, vol: 0.35, to: 85 });
      noise({ t, dur: 0.07, vol: 0.22, type: 'lowpass', f: 900 });
    },
    charge(dur = 2.4) { // nạp năng lượng: tiếng rít dâng cao
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
    clang(i = 0) { // nhát búa đập: kim loại, mỗi nhát cao hơn
      const f0 = NOTE(52 + i * 3);
      [[1, 0.22], [2.76, 0.12], [5.4, 0.07], [8.93, 0.04]].forEach(([r, v]) => tone(f0 * r, { dur: 0.55, vol: v, type: 'sine' }));
      tone(130, { dur: 0.16, vol: 0.4, to: 55 });
      noise({ dur: 0.05, vol: 0.3, type: 'highpass', f: 2500 });
    },
    success(lv = 1) { // thành công: bùng nổ + kèn đi lên
      const big = lv >= 5;
      tone(110, { dur: 0.5, vol: 0.5, to: 40 });
      noise({ dur: 0.5, vol: 0.3, type: 'lowpass', f: 2500, to: 200 });
      arp([72, 76, 79, 84, 88], 0.07, { t: 0.05, dur: 0.4, type: 'triangle', vol: 0.15 });
      chord([60, 64, 67, 72], { t: 0.4, dur: big ? 1.8 : 1.1, type: 'sawtooth', vol: 0.04, a: 0.05, lp: 2500 });
      chord([72, 76, 79], { t: 0.4, dur: big ? 1.8 : 1.1, type: 'triangle', vol: 0.08, a: 0.05 });
      noise({ t: 0.35, dur: 1.2, vol: 0.06, type: 'highpass', f: 7000 });
      if (big) arp([84, 88, 91, 96, 100], 0.06, { t: 0.75, dur: 0.5, type: 'sine', vol: 0.09 });
    },
    fail() { // thất bại: vỡ + rơi xuống
      noise({ dur: 0.3, vol: 0.38, type: 'bandpass', f: 2600, to: 900, q: 0.8 });
      [0.04, 0.09, 0.15].forEach(t => noise({ t, dur: 0.05, vol: 0.15, type: 'highpass', f: 4000 }));
      tone(330, { t: 0.05, dur: 0.6, type: 'triangle', vol: 0.22, to: 110 });
      tone(247, { t: 0.25, dur: 0.8, type: 'triangle', vol: 0.18, to: 70 });
      tone(80, { t: 0.05, dur: 0.5, vol: 0.35, to: 40 });
    },
  };
  return api;
})();
