(() => {
  const SCENES = [
    {
      title: "Amdocs Mexico Hub",
      line: "make it amazing",
      sub: "The platform for every activity that puts Mexico on stage.",
      accent: "#008c45",
    },
    {
      title: "Browse & discover",
      line: "Hackathons · culture · talent · sports",
      sub: "Filter by city, category, and status across Mexico.",
      accent: "#e8a317",
    },
    {
      title: "Register your team",
      line: "Google · Gmail · GitHub",
      sub: "Invite codes optional. PPT & video optional.",
      accent: "#ce1126",
    },
    {
      title: "Share materials",
      line: "Drive upload or paste a link",
      sub: "Organizers review teams right on the activity page.",
      accent: "#008c45",
    },
    {
      title: "Organize with ease",
      line: "Invites · edit · open registration",
      sub: "Editors publish activities. Organizers manage invites.",
      accent: "#e8a317",
    },
    {
      title: "Ready to join?",
      line: "Browse activities now",
      sub: "sumitjindalmx.github.io/mexico-hub",
      accent: "#ce1126",
    },
  ];

  const SCENE_MS = 3200;
  const FADE_MS = 450;

  function $(id) {
    return document.getElementById(id);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function ease(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
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
    let lastBeepScene = -1;
    let recorder = null;
    let recordChunks = [];

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function size() {
      const w = root.clientWidth || 480;
      const h = Math.round(w * 0.5625);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function totalMs() {
      return SCENES.length * SCENE_MS;
    }

    function sceneAt(t) {
      const i = Math.min(SCENES.length - 1, Math.floor(t / SCENE_MS));
      const local = t - i * SCENE_MS;
      const fadeIn = Math.min(1, local / FADE_MS);
      const fadeOut = Math.min(1, (SCENE_MS - local) / FADE_MS);
      const alpha = Math.min(fadeIn, fadeOut);
      return { i, local, alpha: ease(alpha), scene: SCENES[i] };
    }

    function drawFrame(t) {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const { i, local, alpha, scene } = sceneAt(t);

      // background
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#fffaf3");
      g.addColorStop(0.45, "#ffe8c8");
      g.addColorStop(1, "#fff3e2");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // flag stripe
      const stripeH = 6;
      ctx.fillStyle = "#008c45";
      ctx.fillRect(0, 0, w / 3, stripeH);
      ctx.fillStyle = "#fff8ef";
      ctx.fillRect(w / 3, 0, w / 3, stripeH);
      ctx.fillStyle = "#ce1126";
      ctx.fillRect((2 * w) / 3, 0, w / 3 + 2, stripeH);

      // soft orbs
      const ox = w * (0.7 + 0.05 * Math.sin(t / 900));
      const oy = h * (0.35 + 0.04 * Math.cos(t / 1100));
      const orb = ctx.createRadialGradient(ox, oy, 10, ox, oy, h * 0.55);
      orb.addColorStop(0, `${scene.accent}66`);
      orb.addColorStop(1, "transparent");
      ctx.fillStyle = orb;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.globalAlpha = alpha;

      // MX mark
      ctx.fillStyle = "#1f2a24";
      ctx.font = `800 ${Math.round(h * 0.18)}px "Bricolage Grotesque", system-ui, sans-serif`;
      ctx.fillText("MX", w * 0.07, h * 0.32);
      ctx.fillStyle = scene.accent;
      ctx.fillText(".", w * 0.07 + ctx.measureText("MX").width * 0.92, h * 0.32);

      // title
      ctx.fillStyle = "#1f2a24";
      ctx.font = `700 ${Math.round(h * 0.085)}px "Bricolage Grotesque", system-ui, sans-serif`;
      wrapText(ctx, scene.title, w * 0.07, h * 0.48, w * 0.86, h * 0.1);

      // line
      ctx.fillStyle = scene.accent;
      ctx.font = `650 italic ${Math.round(h * 0.055)}px "Bricolage Grotesque", system-ui, sans-serif`;
      wrapText(ctx, scene.line, w * 0.07, h * 0.62, w * 0.86, h * 0.07);

      // sub
      ctx.fillStyle = "#4a5a52";
      ctx.font = `500 ${Math.round(h * 0.042)}px Figtree, system-ui, sans-serif`;
      wrapText(ctx, scene.sub, w * 0.07, h * 0.76, w * 0.86, h * 0.055);

      ctx.restore();

      // scene dots
      const dotY = h - 18;
      SCENES.forEach((_, idx) => {
        const x = w / 2 - ((SCENES.length - 1) * 14) / 2 + idx * 14;
        ctx.beginPath();
        ctx.arc(x, dotY, idx === i ? 4.5 : 3, 0, Math.PI * 2);
        ctx.fillStyle = idx === i ? scene.accent : "rgba(80,40,20,0.25)";
        ctx.fill();
      });

      if (progress) {
        progress.style.width = `${(t / totalMs()) * 100}%`;
      }
      if (label) {
        label.textContent = `${i + 1} / ${SCENES.length} · ${scene.title}`;
      }

      // soft beep on scene change (optional)
      if (!muted && i !== lastBeepScene) {
        lastBeepScene = i;
        beep(scene.accent);
      }
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

    function beep() {
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = "sine";
        o.frequency.value = 523;
        g.gain.value = 0.03;
        o.connect(g);
        g.connect(audioCtx.destination);
        o.start();
        g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12);
        o.stop(audioCtx.currentTime + 0.13);
      } catch {
        /* ignore */
      }
    }

    function tick(now) {
      if (!playing) return;
      const t = (now - startTs + pauseOffset) % totalMs();
      drawFrame(t);
      raf = requestAnimationFrame(tick);
    }

    function play() {
      if (playing) return;
      playing = true;
      startTs = performance.now();
      if (btnPlay) btnPlay.textContent = "Pause";
      root.classList.add("is-playing");
      raf = requestAnimationFrame(tick);
    }

    function pause() {
      if (!playing) return;
      playing = false;
      pauseOffset = (performance.now() - startTs + pauseOffset) % totalMs();
      cancelAnimationFrame(raf);
      if (btnPlay) btnPlay.textContent = "Play";
      root.classList.remove("is-playing");
      drawFrame(pauseOffset);
    }

    function toggle() {
      if (playing) pause();
      else play();
    }

    async function saveClip() {
      if (!canvas.captureStream || typeof MediaRecorder === "undefined") {
        alert("Saving a clip is not supported in this browser. The on-page promo still plays.");
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
      recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2500000 });
      recorder.ondataavailable = (e) => {
        if (e.data.size) recordChunks.push(e.data);
      };

      const done = new Promise((resolve) => {
        recorder.onstop = resolve;
      });

      recorder.start(200);
      const duration = totalMs();
      const recStart = performance.now();
      await new Promise((resolve) => {
        const step = (now) => {
          const t = now - recStart;
          if (t >= duration) {
            drawFrame(duration - 1);
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
      a.download = "amdocs-mexico-hub-promo.webm";
      a.click();
      URL.revokeObjectURL(a.href);

      if (btnSave) {
        btnSave.disabled = false;
        btnSave.textContent = "Save clip";
      }
      if (wasPlaying) play();
      else drawFrame(0);
    }

    btnPlay?.addEventListener("click", toggle);
    btnMute?.addEventListener("click", () => {
      muted = !muted;
      if (btnMute) btnMute.textContent = muted ? "Sound off" : "Sound on";
      if (!muted && audioCtx?.state === "suspended") audioCtx.resume();
    });
    btnSave?.addEventListener("click", () => {
      saveClip().catch((err) => {
        alert(err.message || "Could not save clip.");
        if (btnSave) {
          btnSave.disabled = false;
          btnSave.textContent = "Save clip";
        }
      });
    });

    size();
    window.addEventListener("resize", () => {
      size();
      drawFrame(playing ? (performance.now() - startTs + pauseOffset) % totalMs() : pauseOffset);
    });

    drawFrame(0);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      // Autoplay after a short beat so layout settles
      setTimeout(play, 600);
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
