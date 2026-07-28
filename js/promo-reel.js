(() => {
  /** Continuous cinematic journey — no hard slide cuts. Duration loops. */
  const DURATION_MS = 48000;

  const CHAPTERS = [
    {
      t0: 0,
      t1: 8000,
      kicker: "AMDOCS MEXICO",
      title: "make it amazing",
      line: "A journey of people, craft, and community.",
      hue: [0, 140, 69],
    },
    {
      t0: 7000,
      t1: 16000,
      kicker: "WHERE WE STAND",
      title: "Guadalajara · CDMX · Mexico",
      line: "Talent and energy across every city we call home.",
      hue: [232, 163, 23],
    },
    {
      t0: 15000,
      t1: 24000,
      kicker: "INNOVATION",
      title: "Hackathons that move the needle",
      line: "Ideas on stage. Teams shipping what matters.",
      hue: [206, 17, 38],
    },
    {
      t0: 23000,
      t1: 32000,
      kicker: "CULTURE · TALENT · SPORT",
      title: "More than work — a living brand",
      line: "Ambassadors, arts, and the energy that unites us.",
      hue: [0, 140, 69],
    },
    {
      t0: 31000,
      t1: 40000,
      kicker: "ONE PLATFORM",
      title: "Mexico Hub",
      line: "Browse. Register. Share. Organize — in one place.",
      hue: [232, 163, 23],
    },
    {
      t0: 39000,
      t1: 48000,
      kicker: "YOUR MOVE",
      title: "Join the journey",
      line: "Every activity that puts Mexico on stage.",
      hue: [206, 17, 38],
    },
  ];

  const PARTICLES = Array.from({ length: 48 }, (_, i) => ({
    seed: i * 17.13,
    speed: 0.012 + (i % 7) * 0.004,
    size: 1.2 + (i % 5) * 0.7,
    lane: (i % 9) / 9,
  }));

  function $(id) {
    return document.getElementById(id);
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function rgb(c, a = 1) {
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  }

  function mixRgb(a, b, t) {
    return [
      Math.round(lerp(a[0], b[0], t)),
      Math.round(lerp(a[1], b[1], t)),
      Math.round(lerp(a[2], b[2], t)),
    ];
  }

  function chapterWeight(ch, t) {
    const fade = 1400;
    const inn = smoothstep(ch.t0, ch.t0 + fade, t);
    const out = 1 - smoothstep(ch.t1 - fade, ch.t1, t);
    return Math.max(0, Math.min(inn, out));
  }

  function accentAt(t) {
    let best = CHAPTERS[0].hue;
    let wBest = 0;
    for (const ch of CHAPTERS) {
      const w = chapterWeight(ch, t);
      if (w > wBest) {
        wBest = w;
        best = ch.hue;
      }
    }
    // Soft blend with neighbors for continuous color drift
    const idx = CHAPTERS.findIndex((c) => t >= c.t0 && t < c.t1);
    if (idx < 0) return best;
    const cur = CHAPTERS[idx];
    const next = CHAPTERS[Math.min(CHAPTERS.length - 1, idx + 1)];
    const mid = (cur.t0 + cur.t1) / 2;
    const blend = smoothstep(mid, cur.t1, t);
    return mixRgb(cur.hue, next.hue, blend * 0.85);
  }

  function createPlayer(root) {
    const canvas = root.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    const btnPlay = root.querySelector("[data-promo-play]");
    const btnMute = root.querySelector("[data-promo-mute]");
    const btnSave = root.querySelector("[data-promo-save]");
    const progress = root.querySelector("[data-promo-progress]");
    const label = root.querySelector("[data-promo-label]");

    let playing = false;
    let muted = true;
    let startTs = 0;
    let pauseOffset = 0;
    let raf = 0;
    let audioCtx = null;
    let ambientNodes = null;
    let recorder = null;
    let recordChunks = [];

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function size() {
      const w = root.clientWidth || 960;
      const h = Math.round(w * (9 / 16));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawBackground(w, h, t, accent) {
      const camX = Math.sin(t / 9000) * w * 0.04;
      const camY = Math.cos(t / 11000) * h * 0.03;
      const zoom = 1.08 + Math.sin(t / 14000) * 0.03;

      ctx.save();
      ctx.translate(w / 2 + camX, h / 2 + camY);
      ctx.scale(zoom, zoom);
      ctx.translate(-w / 2, -h / 2);

      // Deep cinematic base
      const base = ctx.createLinearGradient(0, 0, w, h);
      base.addColorStop(0, "#0a1210");
      base.addColorStop(0.45, "#101a16");
      base.addColorStop(1, "#140c0e");
      ctx.fillStyle = base;
      ctx.fillRect(-40, -40, w + 80, h + 80);

      // Moving light wells
      const wells = [
        { x: 0.22 + Math.sin(t / 5000) * 0.08, y: 0.3, r: 0.55, c: [0, 140, 69] },
        { x: 0.78 + Math.cos(t / 6200) * 0.06, y: 0.55, r: 0.5, c: [206, 17, 38] },
        { x: 0.5 + Math.sin(t / 7800) * 0.1, y: 0.75, r: 0.42, c: [232, 163, 23] },
      ];
      for (const well of wells) {
        const gx = well.x * w;
        const gy = well.y * h;
        const rad = well.r * Math.max(w, h);
        const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, rad);
        g.addColorStop(0, rgb(well.c, 0.28));
        g.addColorStop(0.45, rgb(well.c, 0.08));
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.fillRect(-40, -40, w + 80, h + 80);
      }

      // Accent bloom tied to chapter
      const ax = w * (0.65 + Math.sin(t / 4200) * 0.08);
      const ay = h * (0.32 + Math.cos(t / 5100) * 0.06);
      const bloom = ctx.createRadialGradient(ax, ay, 0, ax, ay, h * 0.7);
      bloom.addColorStop(0, rgb(accent, 0.35));
      bloom.addColorStop(0.5, rgb(accent, 0.08));
      bloom.addColorStop(1, "transparent");
      ctx.fillStyle = bloom;
      ctx.fillRect(-40, -40, w + 80, h + 80);

      // Flowing flag ribbons (continuous)
      drawRibbons(w, h, t);

      // Soft grid that drifts
      ctx.save();
      ctx.globalAlpha = 0.07;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      const grid = 48;
      const ox = ((t / 40) % grid) - grid;
      const oy = ((t / 55) % grid) - grid;
      ctx.beginPath();
      for (let x = ox; x < w + grid; x += grid) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = oy; y < h + grid; y += grid) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();
      ctx.restore();

      // Particles drifting continuously
      for (const p of PARTICLES) {
        const px = ((p.lane * w + t * p.speed * 40 + p.seed * 11) % (w + 40)) - 20;
        const py =
          ((Math.sin(t / 1800 + p.seed) * 0.35 + 0.5) * h +
            Math.cos(t / 2400 + p.seed) * 18) %
          h;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = rgb(accent, 0.35 + (p.seed % 1) * 0.25);
        ctx.fill();
      }

      ctx.restore();

      // Vignette
      const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.85);
      vig.addColorStop(0, "transparent");
      vig.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

      // Top flag bar
      const bh = Math.max(4, Math.round(h * 0.012));
      ctx.fillStyle = "#008c45";
      ctx.fillRect(0, 0, w / 3, bh);
      ctx.fillStyle = "#f5f5f5";
      ctx.fillRect(w / 3, 0, w / 3, bh);
      ctx.fillStyle = "#ce1126";
      ctx.fillRect((2 * w) / 3, 0, w / 3 + 2, bh);
    }

    function drawRibbons(w, h, t) {
      const colors = [
        [0, 140, 69],
        [245, 245, 245],
        [206, 17, 38],
      ];
      colors.forEach((c, i) => {
        ctx.beginPath();
        const baseY = h * (0.55 + i * 0.08);
        ctx.moveTo(-20, baseY);
        for (let x = 0; x <= w + 20; x += 12) {
          const y =
            baseY +
            Math.sin(x / 90 + t / 900 + i * 1.2) * (18 + i * 6) +
            Math.sin(x / 40 + t / 1400) * 8;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w + 20, h + 40);
        ctx.lineTo(-20, h + 40);
        ctx.closePath();
        ctx.fillStyle = rgb(c, i === 1 ? 0.05 : 0.09);
        ctx.fill();
      });
    }

    function drawMXMark(w, h, t, accent) {
      const pulse = 1 + Math.sin(t / 1600) * 0.015;
      ctx.save();
      ctx.translate(w * 0.08, h * 0.18);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.font = `800 ${Math.round(h * 0.14)}px "Bricolage Grotesque", system-ui, sans-serif`;
      ctx.fillText("MX", 0, 0);
      const mw = ctx.measureText("MX").width;
      ctx.fillStyle = rgb(accent, 1);
      ctx.fillText(".", mw * 0.92, 0);
      ctx.restore();
    }

    function drawChapters(w, h, t) {
      for (const ch of CHAPTERS) {
        const a = chapterWeight(ch, t);
        if (a < 0.01) continue;

        const local = (t - ch.t0) / Math.max(1, ch.t1 - ch.t0);
        const slide = (1 - easeInOut(clamp(local * 1.4, 0, 1))) * 28;
        const rise = (1 - a) * 16;

        ctx.save();
        ctx.globalAlpha = a;

        // Kicker
        ctx.fillStyle = rgb(ch.hue, 0.95);
        ctx.font = `650 ${Math.round(h * 0.032)}px Figtree, system-ui, sans-serif`;
        ctx.fillText(ch.kicker, w * 0.08 - slide, h * 0.42 + rise);

        // Title
        ctx.fillStyle = "#ffffff";
        ctx.font = `700 ${Math.round(h * 0.078)}px "Bricolage Grotesque", system-ui, sans-serif`;
        wrapText(ctx, ch.title, w * 0.08 - slide * 0.6, h * 0.54 + rise, w * 0.82, h * 0.09);

        // Line
        ctx.fillStyle = "rgba(255,255,255,0.72)";
        ctx.font = `500 ${Math.round(h * 0.038)}px Figtree, system-ui, sans-serif`;
        wrapText(ctx, ch.line, w * 0.08 - slide * 0.3, h * 0.7 + rise, w * 0.78, h * 0.05);

        ctx.restore();
      }
    }

    function drawLowerThird(w, h, t, accent) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0, h - h * 0.11, w, h * 0.11);
      ctx.fillStyle = rgb(accent, 1);
      ctx.fillRect(0, h - h * 0.11, 4, h * 0.11);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = `600 ${Math.round(h * 0.028)}px Figtree, system-ui, sans-serif`;
      ctx.fillText("Amdocs Mexico Hub  ·  make it amazing", w * 0.04, h - h * 0.045);
      ctx.restore();
    }

    function wrapText(context, text, x, y, maxWidth, lineHeight) {
      const words = String(text).split(" ");
      let line = "";
      let yy = y;
      for (let n = 0; n < words.length; n++) {
        const test = line + words[n] + " ";
        if (context.measureText(test).width > maxWidth && n > 0) {
          context.fillText(line.trim(), x, yy);
          line = words[n] + " ";
          yy += lineHeight;
        } else {
          line = test;
        }
      }
      context.fillText(line.trim(), x, yy);
    }

    function activeTitle(t) {
      let best = CHAPTERS[0];
      let wBest = 0;
      for (const ch of CHAPTERS) {
        const w = chapterWeight(ch, t);
        if (w >= wBest) {
          wBest = w;
          best = ch;
        }
      }
      return best;
    }

    function drawFrame(t) {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const accent = accentAt(t);

      drawBackground(w, h, t, accent);
      drawMXMark(w, h, t, accent);
      drawChapters(w, h, t);
      drawLowerThird(w, h, t, accent);

      // Film grain (subtle, continuous)
      ctx.save();
      ctx.globalAlpha = 0.04;
      for (let i = 0; i < 40; i++) {
        const gx = (Math.sin(t * 0.01 + i * 9.1) * 0.5 + 0.5) * w;
        const gy = (Math.cos(t * 0.013 + i * 4.7) * 0.5 + 0.5) * h;
        ctx.fillStyle = i % 2 ? "#fff" : "#000";
        ctx.fillRect(gx, gy, 2, 2);
      }
      ctx.restore();

      if (progress) {
        progress.style.width = `${(t / DURATION_MS) * 100}%`;
      }
      if (label) {
        const ch = activeTitle(t);
        label.textContent = ch.kicker;
      }

      updateAmbient(t);
    }

    function ensureAudio() {
      if (audioCtx) return;
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const master = audioCtx.createGain();
        master.gain.value = 0;
        master.connect(audioCtx.destination);

        const makePad = (freq, type) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = type;
          o.frequency.value = freq;
          g.gain.value = 0.04;
          o.connect(g);
          g.connect(master);
          o.start();
          return { o, g };
        };

        ambientNodes = {
          master,
          pads: [makePad(110, "sine"), makePad(164.81, "sine"), makePad(220, "triangle")],
        };
      } catch {
        ambientNodes = null;
      }
    }

    function updateAmbient(t) {
      if (muted || !ambientNodes || !audioCtx) return;
      const target = playing ? 0.12 : 0;
      const now = audioCtx.currentTime;
      ambientNodes.master.gain.setTargetAtTime(target, now, 0.4);
      // Gentle pitch drift with chapters
      const accent = accentAt(t);
      const drift = 1 + ((accent[0] + accent[1]) % 40) / 800;
      ambientNodes.pads.forEach((p, i) => {
        const base = [110, 164.81, 196][i];
        p.o.frequency.setTargetAtTime(base * drift, now, 1.2);
      });
    }

    function tick(now) {
      if (!playing) return;
      const t = (now - startTs + pauseOffset) % DURATION_MS;
      drawFrame(t);
      raf = requestAnimationFrame(tick);
    }

    function play() {
      if (playing) return;
      playing = true;
      startTs = performance.now();
      if (btnPlay) btnPlay.textContent = "Pause";
      root.classList.add("is-playing");
      ensureAudio();
      if (audioCtx?.state === "suspended") audioCtx.resume();
      raf = requestAnimationFrame(tick);
    }

    function pause() {
      if (!playing) return;
      playing = false;
      pauseOffset = (performance.now() - startTs + pauseOffset) % DURATION_MS;
      cancelAnimationFrame(raf);
      if (btnPlay) btnPlay.textContent = "Play";
      root.classList.remove("is-playing");
      if (ambientNodes && audioCtx) {
        ambientNodes.master.gain.setTargetAtTime(0, audioCtx.currentTime, 0.2);
      }
      drawFrame(pauseOffset);
    }

    function toggle() {
      if (playing) pause();
      else play();
    }

    async function saveClip() {
      if (!canvas.captureStream || typeof MediaRecorder === "undefined") {
        alert("Saving a film is not supported in this browser. The on-page film still plays.");
        return;
      }
      if (btnSave) {
        btnSave.disabled = true;
        btnSave.textContent = "Recording…";
      }
      const wasPlaying = playing;
      pauseOffset = 0;
      pause();
      size();

      const stream = canvas.captureStream(30);
      recordChunks = [];
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
      recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4500000 });
      recorder.ondataavailable = (e) => {
        if (e.data.size) recordChunks.push(e.data);
      };

      const done = new Promise((resolve) => {
        recorder.onstop = resolve;
      });

      recorder.start(200);
      const recStart = performance.now();
      await new Promise((resolve) => {
        const step = (now) => {
          const t = now - recStart;
          if (t >= DURATION_MS) {
            drawFrame(DURATION_MS - 1);
            resolve();
            return;
          }
          drawFrame(t);
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
      recorder.stop();
      await done;

      const blob = new Blob(recordChunks, { type: mime });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "amdocs-mexico-journey.webm";
      a.click();
      URL.revokeObjectURL(a.href);

      if (btnSave) {
        btnSave.disabled = false;
        btnSave.textContent = "Save film";
      }
      if (wasPlaying) play();
      else drawFrame(0);
    }

    btnPlay?.addEventListener("click", toggle);
    btnMute?.addEventListener("click", () => {
      muted = !muted;
      if (btnMute) btnMute.textContent = muted ? "Sound off" : "Sound on";
      ensureAudio();
      if (!muted && audioCtx?.state === "suspended") audioCtx.resume();
      if (muted && ambientNodes && audioCtx) {
        ambientNodes.master.gain.setTargetAtTime(0, audioCtx.currentTime, 0.15);
      }
    });
    btnSave?.addEventListener("click", () => {
      saveClip().catch((err) => {
        alert(err.message || "Could not save film.");
        if (btnSave) {
          btnSave.disabled = false;
          btnSave.textContent = "Save film";
        }
      });
    });

    size();
    window.addEventListener("resize", () => {
      size();
      const t = playing
        ? (performance.now() - startTs + pauseOffset) % DURATION_MS
        : pauseOffset;
      drawFrame(t);
    });

    drawFrame(0);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      // Start when section enters view — keeps first viewport clean
      const section = document.getElementById("promo");
      if (section && "IntersectionObserver" in window) {
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((e) => {
              if (e.isIntersecting) play();
              else if (playing) pause();
            });
          },
          { threshold: 0.35 }
        );
        io.observe(section);
      } else {
        setTimeout(play, 400);
      }
    }

    return { play, pause, toggle };
  }

  function init() {
    const root = $("promo-reel");
    if (!root) return;
    createPlayer(root);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
