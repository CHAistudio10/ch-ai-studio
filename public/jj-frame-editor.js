/* ==========================================================================
   CH AI JEDAG JEDUG — FRAME-BY-FRAME PRO EDITOR ENGINE
   - Independent per-frame Transitions (12 types + 5 params)
   - Independent per-frame Animations (12 types + 6 params)
   - Visual Timeline (Select, Duplicate, Delete, Move, Add)
   - Undo / Redo, Copy / Paste Frame Settings, Apply to All Frames
   - Audio Beat Sync & Waveform Integration
   - Real Canvas-to-Video Export (720p/1080p, 30/60 FPS, 9:16/16:9/1:1)
   ========================================================================== */
(() => {
  const page = document.getElementById("page-jedagjedug");
  if (!page || page.dataset.fbfMounted === "1") return;
  page.dataset.fbfMounted = "1";

  const TRANSITIONS = [
    { id: "cut", label: "Cut" },
    { id: "fade", label: "Fade" },
    { id: "flash", label: "Flash" },
    { id: "zoom-in", label: "Zoom In" },
    { id: "zoom-out", label: "Zoom Out" },
    { id: "blur", label: "Blur" },
    { id: "glitch", label: "Glitch" },
    { id: "shake", label: "Shake" },
    { id: "slide", label: "Slide" },
    { id: "spin", label: "Spin" },
    { id: "rgb-split", label: "RGB Split" },
    { id: "whip-pan", label: "Whip Pan" }
  ];

  const ANIMATIONS = [
    { id: "zoom-pulse", label: "Zoom Pulse" },
    { id: "bounce", label: "Bounce" },
    { id: "rotate", label: "Rotate" },
    { id: "shake", label: "Shake" },
    { id: "pan-left", label: "Pan Left" },
    { id: "pan-right", label: "Pan Right" },
    { id: "pan-up", label: "Pan Up" },
    { id: "pan-down", label: "Pan Down" },
    { id: "3d-flip", label: "3D Flip" },
    { id: "wobble", label: "Wobble" },
    { id: "rgb-split", label: "RGB Split" },
    { id: "beat-sync", label: "Beat Sync" }
  ];

  const DIRECTIONS = [
    { id: "left", label: "Kiri" },
    { id: "right", label: "Kanan" },
    { id: "up", label: "Atas" },
    { id: "down", label: "Bawah" },
    { id: "in", label: "Masuk" },
    { id: "out", label: "Keluar" }
  ];

  function createDefaultFrameConfig(index) {
    return {
      frameDuration: 2.0,
      transition: {
        type: index === 0 ? "zoom-in" : "whip-pan",
        duration: 0.45,
        intensity: 75,
        direction: index % 2 === 0 ? "left" : "right",
        speed: 1.0
      },
      animation: {
        type: index % 2 === 0 ? "beat-sync" : "zoom-pulse",
        duration: 1.5,
        speed: 1.0,
        intensity: 65,
        direction: "in",
        scale: 108,
        rotation: 0
      }
    };
  }

  function cloneConfig(cfg) {
    return JSON.parse(JSON.stringify(cfg));
  }

  const editorState = {
    frames: [], // { id, name, file, url, isVideo, element, config }
    selectedIndex: 0,
    clipboard: null,
    undoStack: [],
    redoStack: [],
    isPlaying: false,
    currentTime: 0,
    lastRafTime: 0,
    beatSyncEnabled: true,
    beatIntensity: 80,
    detectedBpm: 128,
    beatTimestamps: [],
    exportResolution: "720p",
    exportFps: 30,
    exportRatio: "9:16"
  };

  // Mount UI container at top of #page-jedagjedug (preserving legacy controls below)
  const subBar = page.querySelector(".v6-subpage-bar");
  const root = document.createElement("div");
  root.id = "jj-fbf-root";
  root.innerHTML = `
    <!-- 1. PREVIEW & TRANSPORT -->
    <div class="jj-fbf-card">
      <div class="jj-fbf-head">
        <h3 class="jj-fbf-title">Preview Frame-by-Frame</h3>
        <span id="jj-fbf-active-badge" class="jj-fbf-badge">Belum ada frame</span>
      </div>
      <div class="jj-fbf-stage-wrap">
        <canvas id="jj-fbf-canvas" width="540" height="960"></canvas>
      </div>
      <div class="jj-fbf-transport">
        <button type="button" id="jj-fbf-play-btn" class="jj-fbf-btn jj-fbf-btn-primary">▶ Play</button>
        <input type="range" id="jj-fbf-scrubber" class="jj-fbf-scrubber" min="0" max="100" step="0.01" value="0">
        <span id="jj-fbf-time-label" class="jj-fbf-time">00.0s / 00.0s</span>
      </div>
      <div class="jj-fbf-toolbar">
        <button type="button" id="jj-fbf-undo-btn" class="jj-fbf-btn" disabled>↶ Undo</button>
        <button type="button" id="jj-fbf-redo-btn" class="jj-fbf-btn" disabled>↷ Redo</button>
        <button type="button" id="jj-fbf-copy-btn" class="jj-fbf-btn">⧉ Copy Frame</button>
        <button type="button" id="jj-fbf-paste-btn" class="jj-fbf-btn" disabled>📋 Paste Frame</button>
        <button type="button" id="jj-fbf-apply-all-btn" class="jj-fbf-btn">✦ Terapkan ke Semua</button>
      </div>
    </div>

    <!-- 2. TIMELINE VISUAL & MANAJEMEN FRAME -->
    <div class="jj-fbf-card">
      <div class="jj-fbf-head">
        <h3 class="jj-fbf-title">Timeline Frame Individual</h3>
        <button type="button" id="jj-fbf-add-media-btn" class="jj-fbf-btn jj-fbf-btn-primary">＋ Tambah Frame</button>
      </div>
      <input type="file" id="jj-fbf-file-input" accept="image/*,video/*" multiple style="display:none;">
      <div id="jj-fbf-timeline" class="jj-fbf-timeline-strip">
        <div style="font-size:0.74rem;color:rgba(243,232,255,0.65);padding:10px 4px;">
          Ketuk <b>＋ Tambah Frame</b> atau pilih media di bawah untuk mulai mengedit setiap frame secara individual.
        </div>
      </div>
      <div class="jj-fbf-frame-actions">
        <button type="button" id="jj-fbf-move-left" class="jj-fbf-btn">← Geser</button>
        <button type="button" id="jj-fbf-move-right" class="jj-fbf-btn">Geser →</button>
        <button type="button" id="jj-fbf-dup-btn" class="jj-fbf-btn">⧉ Duplikasi</button>
        <button type="button" id="jj-fbf-del-btn" class="jj-fbf-btn jj-fbf-btn-danger">🗑 Hapus</button>
      </div>
    </div>

    <!-- 3. PANEL PENGATURAN FRAME TERPILIH -->
    <div class="jj-fbf-card" id="jj-fbf-inspector">
      <div class="jj-fbf-head">
        <h3 class="jj-fbf-title" id="jj-fbf-inspector-title">Pengaturan Frame #1</h3>
        <span class="jj-fbf-badge" style="color:#67E8F9;border-color:rgba(34,211,238,0.45);">Individual</span>
      </div>

      <div class="jj-fbf-field" style="margin-bottom:10px;">
        <div class="jj-fbf-field-top">
          <span>Durasi Tampil Frame Ini</span>
          <span id="jj-fbf-frame-dur-val" class="jj-fbf-field-val">2.0 dtk</span>
        </div>
        <input type="range" id="jj-fbf-frame-dur" min="0.5" max="8.0" step="0.1" value="2.0">
      </div>

      <!-- TRANSISI INDIVIDUAL (Frame Ini -> Frame Berikutnya) -->
      <div style="margin-bottom:10px;">
        <div class="jj-fbf-field-top" style="margin-bottom:6px;">
          <span>Transisi (Frame Ini → Frame Berikutnya)</span>
          <span id="jj-fbf-trans-active-name" class="jj-fbf-field-val">Zoom In</span>
        </div>
        <div id="jj-fbf-trans-pills" class="jj-fbf-pill-row" style="margin-bottom:8px;"></div>
        <div class="jj-fbf-grid-2">
          <div class="jj-fbf-field">
            <div class="jj-fbf-field-top"><span>Durasi Transisi</span><span id="jj-fbf-tr-dur-val" class="jj-fbf-field-val">0.45s</span></div>
            <input type="range" id="jj-fbf-tr-dur" min="0.1" max="1.5" step="0.05" value="0.45">
          </div>
          <div class="jj-fbf-field">
            <div class="jj-fbf-field-top"><span>Intensitas</span><span id="jj-fbf-tr-int-val" class="jj-fbf-field-val">75%</span></div>
            <input type="range" id="jj-fbf-tr-int" min="10" max="100" step="5" value="75">
          </div>
          <div class="jj-fbf-field">
            <div class="jj-fbf-field-top"><span>Arah Transisi</span></div>
            <select id="jj-fbf-tr-dir"></select>
          </div>
          <div class="jj-fbf-field">
            <div class="jj-fbf-field-top"><span>Kecepatan</span><span id="jj-fbf-tr-spd-val" class="jj-fbf-field-val">1.0x</span></div>
            <input type="range" id="jj-fbf-tr-spd" min="0.5" max="2.5" step="0.1" value="1.0">
          </div>
        </div>
      </div>

      <!-- ANIMASI INDIVIDUAL -->
      <div>
        <div class="jj-fbf-field-top" style="margin-bottom:6px;">
          <span>Animasi Frame Ini</span>
          <span id="jj-fbf-anim-active-name" class="jj-fbf-field-val">Beat Sync</span>
        </div>
        <div id="jj-fbf-anim-pills" class="jj-fbf-pill-row" style="margin-bottom:8px;"></div>
        <div class="jj-fbf-grid-2">
          <div class="jj-fbf-field">
            <div class="jj-fbf-field-top"><span>Durasi Animasi</span><span id="jj-fbf-an-dur-val" class="jj-fbf-field-val">1.5s</span></div>
            <input type="range" id="jj-fbf-an-dur" min="0.3" max="5.0" step="0.1" value="1.5">
          </div>
          <div class="jj-fbf-field">
            <div class="jj-fbf-field-top"><span>Kecepatan</span><span id="jj-fbf-an-spd-val" class="jj-fbf-field-val">1.0x</span></div>
            <input type="range" id="jj-fbf-an-spd" min="0.5" max="3.0" step="0.1" value="1.0">
          </div>
          <div class="jj-fbf-field">
            <div class="jj-fbf-field-top"><span>Intensitas</span><span id="jj-fbf-an-int-val" class="jj-fbf-field-val">65%</span></div>
            <input type="range" id="jj-fbf-an-int" min="0" max="100" step="5" value="65">
          </div>
          <div class="jj-fbf-field">
            <div class="jj-fbf-field-top"><span>Arah Animasi</span></div>
            <select id="jj-fbf-an-dir"></select>
          </div>
          <div class="jj-fbf-field">
            <div class="jj-fbf-field-top"><span>Scale</span><span id="jj-fbf-an-scl-val" class="jj-fbf-field-val">108%</span></div>
            <input type="range" id="jj-fbf-an-scl" min="80" max="160" step="2" value="108">
          </div>
          <div class="jj-fbf-field">
            <div class="jj-fbf-field-top"><span>Rotation</span><span id="jj-fbf-an-rot-val" class="jj-fbf-field-val">0°</span></div>
            <input type="range" id="jj-fbf-an-rot" min="-45" max="45" step="1" value="0">
          </div>
        </div>
      </div>
    </div>

    <!-- 4. AUDIO BEAT SYNC & EXPORT PRO -->
    <div class="jj-fbf-card">
      <div class="jj-fbf-head">
        <h3 class="jj-fbf-title">Audio Beat Sync & Export Video</h3>
        <span id="jj-fbf-bpm-badge" class="jj-fbf-badge">128 BPM</span>
      </div>
      <div class="jj-fbf-grid-2" style="margin-bottom:10px;">
        <div class="jj-fbf-field">
          <div class="jj-fbf-field-top">
            <span>Sinkron Beat Audio</span>
            <input type="checkbox" id="jj-fbf-beatsync-toggle" checked style="accent-color:#E879F9;width:16px;height:16px;">
          </div>
          <button type="button" id="jj-fbf-pick-audio-btn" class="jj-fbf-btn" style="margin-top:3px;">🎵 Pilih / Ganti Musik</button>
        </div>
        <div class="jj-fbf-field">
          <div class="jj-fbf-field-top">
            <span>Intensitas Beat</span>
            <span id="jj-fbf-beat-int-val" class="jj-fbf-field-val">80%</span>
          </div>
          <input type="range" id="jj-fbf-beat-int" min="0" max="100" step="5" value="80">
        </div>
      </div>

      <div class="jj-fbf-grid-2" style="margin-bottom:10px;">
        <div class="jj-fbf-field">
          <div class="jj-fbf-field-top"><span>Resolusi Export</span></div>
          <select id="jj-fbf-res">
            <option value="720p" selected>720p HD</option>
            <option value="1080p">1080p Full HD</option>
          </select>
        </div>
        <div class="jj-fbf-field">
          <div class="jj-fbf-field-top"><span>Frame Rate (FPS)</span></div>
          <select id="jj-fbf-fps">
            <option value="30" selected>30 FPS</option>
            <option value="60">60 FPS</option>
          </select>
        </div>
      </div>

      <div class="jj-fbf-field" style="margin-bottom:10px;">
        <div class="jj-fbf-field-top"><span>Rasio Video</span></div>
        <select id="jj-fbf-ratio">
          <option value="9:16" selected>9:16 (TikTok / Reels / Shorts)</option>
          <option value="16:9">16:9 (YouTube / Landscape)</option>
          <option value="1:1">1:1 (Square Feed)</option>
        </select>
      </div>

      <button type="button" id="jj-fbf-export-btn" class="jj-fbf-export-btn">✦ Export Video Frame-by-Frame</button>
      <p id="jj-fbf-export-status" style="margin:8px 0 0;font-size:0.72rem;color:#CBD5E1;text-align:center;">
        Siap merender seluruh transisi dan animasi individual setiap frame.
      </p>
      <video id="jj-fbf-result-video" controls playsinline style="display:none;width:100%;margin-top:10px;border-radius:14px;border:1px solid rgba(232,121,249,0.4);"></video>
      <a id="jj-fbf-download-link" class="jj-fbf-btn jj-fbf-btn-primary" style="display:none;width:100%;margin-top:8px;min-height:42px;text-decoration:none;" download="CH-Jedag-Jedug-Pro.mp4">⬇ Unduh Hasil Video</a>
    </div>
  `;

  if (subBar && subBar.nextSibling) {
    page.insertBefore(root, subBar.nextSibling);
  } else {
    page.prepend(root);
  }

  // DOM refs
  const canvas = document.getElementById("jj-fbf-canvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const playBtn = document.getElementById("jj-fbf-play-btn");
  const scrubber = document.getElementById("jj-fbf-scrubber");
  const timeLabel = document.getElementById("jj-fbf-time-label");
  const activeBadge = document.getElementById("jj-fbf-active-badge");
  const timelineEl = document.getElementById("jj-fbf-timeline");
  const fileInput = document.getElementById("jj-fbf-file-input");

  // Populate direction selects
  ["jj-fbf-tr-dir", "jj-fbf-an-dir"].forEach((id) => {
    const sel = document.getElementById(id);
    DIRECTIONS.forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = d.label;
      sel.appendChild(opt);
    });
  });

  // Populate transition & animation pills
  const transPillsWrap = document.getElementById("jj-fbf-trans-pills");
  TRANSITIONS.forEach((tr) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "jj-fbf-pill";
    btn.dataset.val = tr.id;
    btn.textContent = tr.label;
    btn.addEventListener("click", () => {
      const f = getSelectedFrame();
      if (!f) return;
      pushUndo();
      f.config.transition.type = tr.id;
      syncInspectorFromFrame();
      renderTimeline();
      drawAtTime(editorState.currentTime);
    });
    transPillsWrap.appendChild(btn);
  });

  const animPillsWrap = document.getElementById("jj-fbf-anim-pills");
  ANIMATIONS.forEach((an) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "jj-fbf-pill";
    btn.dataset.val = an.id;
    btn.textContent = an.label;
    btn.addEventListener("click", () => {
      const f = getSelectedFrame();
      if (!f) return;
      pushUndo();
      f.config.animation.type = an.id;
      syncInspectorFromFrame();
      renderTimeline();
      drawAtTime(editorState.currentTime);
    });
    animPillsWrap.appendChild(btn);
  });

  function getSelectedFrame() {
    return editorState.frames[editorState.selectedIndex] || null;
  }

  function pushUndo() {
    const snapshot = editorState.frames.map((f) => ({
      id: f.id,
      config: cloneConfig(f.config)
    }));
    editorState.undoStack.push({
      order: snapshot,
      selectedIndex: editorState.selectedIndex
    });
    if (editorState.undoStack.length > 30) editorState.undoStack.shift();
    editorState.redoStack = [];
    updateHistoryButtons();
  }

  function updateHistoryButtons() {
    document.getElementById("jj-fbf-undo-btn").disabled = editorState.undoStack.length === 0;
    document.getElementById("jj-fbf-redo-btn").disabled = editorState.redoStack.length === 0;
    document.getElementById("jj-fbf-paste-btn").disabled = !editorState.clipboard;
  }

  function applySnapshot(snap) {
    const map = new Map(editorState.frames.map((f) => [f.id, f]));
    const restored = [];
    snap.order.forEach((item) => {
      const existing = map.get(item.id);
      if (existing) {
        existing.config = cloneConfig(item.config);
        restored.push(existing);
      }
    });
    if (restored.length) {
      editorState.frames = restored;
      editorState.selectedIndex = Math.min(snap.selectedIndex, restored.length - 1);
    }
    renderTimeline();
    syncInspectorFromFrame();
    drawAtTime(editorState.currentTime);
    updateHistoryButtons();
  }

  document.getElementById("jj-fbf-undo-btn").addEventListener("click", () => {
    if (!editorState.undoStack.length) return;
    const currentSnap = {
      order: editorState.frames.map((f) => ({ id: f.id, config: cloneConfig(f.config) })),
      selectedIndex: editorState.selectedIndex
    };
    editorState.redoStack.push(currentSnap);
    const prev = editorState.undoStack.pop();
    applySnapshot(prev);
  });

  document.getElementById("jj-fbf-redo-btn").addEventListener("click", () => {
    if (!editorState.redoStack.length) return;
    const currentSnap = {
      order: editorState.frames.map((f) => ({ id: f.id, config: cloneConfig(f.config) })),
      selectedIndex: editorState.selectedIndex
    };
    editorState.undoStack.push(currentSnap);
    const next = editorState.redoStack.pop();
    applySnapshot(next);
  });

  document.getElementById("jj-fbf-copy-btn").addEventListener("click", () => {
    const f = getSelectedFrame();
    if (!f) return;
    editorState.clipboard = cloneConfig(f.config);
    updateHistoryButtons();
  });

  document.getElementById("jj-fbf-paste-btn").addEventListener("click", () => {
    const f = getSelectedFrame();
    if (!f || !editorState.clipboard) return;
    pushUndo();
    f.config = cloneConfig(editorState.clipboard);
    syncInspectorFromFrame();
    renderTimeline();
    drawAtTime(editorState.currentTime);
  });

  document.getElementById("jj-fbf-apply-all-btn").addEventListener("click", () => {
    const f = getSelectedFrame();
    if (!f || editorState.frames.length < 2) return;
    pushUndo();
    const template = cloneConfig(f.config);
    editorState.frames.forEach((item) => {
      item.config = cloneConfig(template);
    });
    renderTimeline();
    drawAtTime(editorState.currentTime);
  });

  // Load image/video file into frame item
  function loadMediaItem(file, index) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith("video/");
      if (isVideo) {
        const video = document.createElement("video");
        video.src = url;
        video.muted = true;
        video.playsInline = true;
        video.loop = true;
        video.preload = "auto";
        video.onloadedmetadata = () => {
          resolve({
            id: "frm_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
            name: file.name,
            file,
            url,
            isVideo: true,
            element: video,
            config: createDefaultFrameConfig(index)
          });
        };
        video.onerror = () => reject(new Error("Gagal memuat video: " + file.name));
      } else {
        const img = new Image();
        img.onload = () => {
          resolve({
            id: "frm_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
            name: file.name,
            file,
            url,
            isVideo: false,
            element: img,
            config: createDefaultFrameConfig(index)
          });
        };
        img.onerror = () => reject(new Error("Gagal memuat gambar: " + file.name));
        img.src = url;
      }
    });
  }

  async function addFiles(fileList) {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
    if (!files.length) return;
    pushUndo();
    for (const file of files) {
      try {
        const item = await loadMediaItem(file, editorState.frames.length);
        editorState.frames.push(item);
      } catch (err) {
        console.warn(err.message);
      }
    }
    editorState.selectedIndex = Math.max(0, editorState.frames.length - 1);
    updateTimelineMetrics();
    renderTimeline();
    syncInspectorFromFrame();
    jumpToFrameStart(editorState.selectedIndex);
  }

  document.getElementById("jj-fbf-add-media-btn").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async (e) => {
    await addFiles(e.target.files);
    e.target.value = "";
  });

  // Also sync when legacy #jj-media-input selects files
  const legacyMediaInput = document.getElementById("jj-media-input");
  if (legacyMediaInput) {
    legacyMediaInput.addEventListener("change", async (e) => {
      if (e.target.files && e.target.files.length) {
        await addFiles(e.target.files);
      }
    });
  }

  // Duplicate, Delete, Move Left, Move Right
  document.getElementById("jj-fbf-dup-btn").addEventListener("click", async () => {
    const f = getSelectedFrame();
    if (!f) return;
    pushUndo();
    const copy = await loadMediaItem(f.file, editorState.selectedIndex + 1);
    copy.config = cloneConfig(f.config);
    editorState.frames.splice(editorState.selectedIndex + 1, 0, copy);
    editorState.selectedIndex += 1;
    updateTimelineMetrics();
    renderTimeline();
    syncInspectorFromFrame();
    jumpToFrameStart(editorState.selectedIndex);
  });

  document.getElementById("jj-fbf-del-btn").addEventListener("click", () => {
    if (!editorState.frames.length) return;
    pushUndo();
    const removed = editorState.frames.splice(editorState.selectedIndex, 1)[0];
    if (removed && removed.url) URL.revokeObjectURL(removed.url);
    editorState.selectedIndex = Math.max(0, Math.min(editorState.selectedIndex, editorState.frames.length - 1));
    updateTimelineMetrics();
    renderTimeline();
    syncInspectorFromFrame();
    drawAtTime(editorState.currentTime);
  });

  document.getElementById("jj-fbf-move-left").addEventListener("click", () => {
    const idx = editorState.selectedIndex;
    if (idx <= 0) return;
    pushUndo();
    const tmp = editorState.frames[idx - 1];
    editorState.frames[idx - 1] = editorState.frames[idx];
    editorState.frames[idx] = tmp;
    editorState.selectedIndex = idx - 1;
    renderTimeline();
    syncInspectorFromFrame();
    jumpToFrameStart(editorState.selectedIndex);
  });

  document.getElementById("jj-fbf-move-right").addEventListener("click", () => {
    const idx = editorState.selectedIndex;
    if (idx >= editorState.frames.length - 1) return;
    pushUndo();
    const tmp = editorState.frames[idx + 1];
    editorState.frames[idx + 1] = editorState.frames[idx];
    editorState.frames[idx] = tmp;
    editorState.selectedIndex = idx + 1;
    renderTimeline();
    syncInspectorFromFrame();
    jumpToFrameStart(editorState.selectedIndex);
  });

  function getTotalDuration() {
    return editorState.frames.reduce((acc, f) => acc + (Number(f.config.frameDuration) || 2), 0);
  }

  function updateTimelineMetrics() {
    const total = getTotalDuration();
    scrubber.max = String(Math.max(0.1, total));
    if (editorState.currentTime > total) editorState.currentTime = 0;
    timeLabel.textContent = `${editorState.currentTime.toFixed(1)}s / ${total.toFixed(1)}s`;
  }

  function jumpToFrameStart(idx) {
    let t = 0;
    for (let i = 0; i < idx && i < editorState.frames.length; i++) {
      t += Number(editorState.frames[i].config.frameDuration) || 2;
    }
    editorState.currentTime = t + 0.01;
    scrubber.value = String(editorState.currentTime);
    updateTimelineMetrics();
    drawAtTime(editorState.currentTime);
  }

  function renderTimeline() {
    if (!editorState.frames.length) {
      timelineEl.innerHTML = `<div style="font-size:0.74rem;color:rgba(243,232,255,0.65);padding:10px 4px;">Ketuk <b>＋ Tambah Frame</b> untuk menambahkan foto/video ke timeline.</div>`;
      activeBadge.textContent = "Belum ada frame";
      return;
    }

    activeBadge.textContent = `Frame #${editorState.selectedIndex + 1} / ${editorState.frames.length}`;
    timelineEl.innerHTML = editorState.frames.map((f, idx) => {
      const isSel = idx === editorState.selectedIndex;
      const trLabel = TRANSITIONS.find((t) => t.id === f.config.transition.type)?.label || f.config.transition.type;
      const anLabel = ANIMATIONS.find((a) => a.id === f.config.animation.type)?.label || f.config.animation.type;
      return `
        <div class="jj-fbf-frame-card ${isSel ? "is-selected" : ""}" data-frm-idx="${idx}">
          ${f.isVideo
            ? `<video src="${f.url}" class="jj-fbf-frame-thumb" muted playsinline></video>`
            : `<img src="${f.url}" class="jj-fbf-frame-thumb" alt="Frame ${idx + 1}">`}
          <div class="jj-fbf-frame-meta">
            <span>#${idx + 1}</span>
            <span>${Number(f.config.frameDuration).toFixed(1)}s</span>
          </div>
          <div class="jj-fbf-frame-tags">${anLabel} • ${trLabel}</div>
        </div>
      `;
    }).join("");

    timelineEl.querySelectorAll(".jj-fbf-frame-card").forEach((card) => {
      card.addEventListener("click", () => {
        editorState.selectedIndex = Number(card.dataset.frmIdx);
        renderTimeline();
        syncInspectorFromFrame();
        jumpToFrameStart(editorState.selectedIndex);
      });
    });
  }

  function syncInspectorFromFrame() {
    const f = getSelectedFrame();
    const titleEl = document.getElementById("jj-fbf-inspector-title");
    if (!f) {
      titleEl.textContent = "Pengaturan Frame (Pilih frame terlebih dahulu)";
      return;
    }

    titleEl.textContent = `Pengaturan Frame #${editorState.selectedIndex + 1} (${f.name.slice(0, 18)})`;
    const cfg = f.config;

    document.getElementById("jj-fbf-frame-dur").value = cfg.frameDuration;
    document.getElementById("jj-fbf-frame-dur-val").textContent = Number(cfg.frameDuration).toFixed(1) + " dtk";

    // Transition controls
    const trObj = TRANSITIONS.find((t) => t.id === cfg.transition.type);
    document.getElementById("jj-fbf-trans-active-name").textContent = trObj ? trObj.label : cfg.transition.type;
    transPillsWrap.querySelectorAll(".jj-fbf-pill").forEach((b) => {
      b.classList.toggle("is-active", b.dataset.val === cfg.transition.type);
    });
    document.getElementById("jj-fbf-tr-dur").value = cfg.transition.duration;
    document.getElementById("jj-fbf-tr-dur-val").textContent = Number(cfg.transition.duration).toFixed(2) + "s";
    document.getElementById("jj-fbf-tr-int").value = cfg.transition.intensity;
    document.getElementById("jj-fbf-tr-int-val").textContent = cfg.transition.intensity + "%";
    document.getElementById("jj-fbf-tr-dir").value = cfg.transition.direction;
    document.getElementById("jj-fbf-tr-spd").value = cfg.transition.speed;
    document.getElementById("jj-fbf-tr-spd-val").textContent = Number(cfg.transition.speed).toFixed(1) + "x";

    // Animation controls
    const anObj = ANIMATIONS.find((a) => a.id === cfg.animation.type);
    document.getElementById("jj-fbf-anim-active-name").textContent = anObj ? anObj.label : cfg.animation.type;
    animPillsWrap.querySelectorAll(".jj-fbf-pill").forEach((b) => {
      b.classList.toggle("is-active", b.dataset.val === cfg.animation.type);
    });
    document.getElementById("jj-fbf-an-dur").value = cfg.animation.duration;
    document.getElementById("jj-fbf-an-dur-val").textContent = Number(cfg.animation.duration).toFixed(1) + "s";
    document.getElementById("jj-fbf-an-spd").value = cfg.animation.speed;
    document.getElementById("jj-fbf-an-spd-val").textContent = Number(cfg.animation.speed).toFixed(1) + "x";
    document.getElementById("jj-fbf-an-int").value = cfg.animation.intensity;
    document.getElementById("jj-fbf-an-int-val").textContent = cfg.animation.intensity + "%";
    document.getElementById("jj-fbf-an-dir").value = cfg.animation.direction;
    document.getElementById("jj-fbf-an-scl").value = cfg.animation.scale;
    document.getElementById("jj-fbf-an-scl-val").textContent = cfg.animation.scale + "%";
    document.getElementById("jj-fbf-an-rot").value = cfg.animation.rotation;
    document.getElementById("jj-fbf-an-rot-val").textContent = cfg.animation.rotation + "°";
  }

  // Bind inspector inputs strictly to selected frame ONLY
  function bindInput(id, onChange) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("change", () => {
      if (getSelectedFrame()) pushUndo();
    });
    el.addEventListener("input", () => {
      const f = getSelectedFrame();
      if (!f) return;
      onChange(f, el.value);
      syncInspectorFromFrame();
      updateTimelineMetrics();
      renderTimeline();
      drawAtTime(editorState.currentTime);
    });
  }

  bindInput("jj-fbf-frame-dur", (f, v) => { f.config.frameDuration = Number(v); });
  bindInput("jj-fbf-tr-dur", (f, v) => { f.config.transition.duration = Number(v); });
  bindInput("jj-fbf-tr-int", (f, v) => { f.config.transition.intensity = Number(v); });
  bindInput("jj-fbf-tr-dir", (f, v) => { f.config.transition.direction = v; });
  bindInput("jj-fbf-tr-spd", (f, v) => { f.config.transition.speed = Number(v); });

  bindInput("jj-fbf-an-dur", (f, v) => { f.config.animation.duration = Number(v); });
  bindInput("jj-fbf-an-spd", (f, v) => { f.config.animation.speed = Number(v); });
  bindInput("jj-fbf-an-int", (f, v) => { f.config.animation.intensity = Number(v); });
  bindInput("jj-fbf-an-dir", (f, v) => { f.config.animation.direction = v; });
  bindInput("jj-fbf-an-scl", (f, v) => { f.config.animation.scale = Number(v); });
  bindInput("jj-fbf-an-rot", (f, v) => { f.config.animation.rotation = Number(v); });

  // Audio Beat Sync & Export Controls
  document.getElementById("jj-fbf-beatsync-toggle").addEventListener("change", (e) => {
    editorState.beatSyncEnabled = e.target.checked;
    drawAtTime(editorState.currentTime);
  });

  document.getElementById("jj-fbf-beat-int").addEventListener("input", (e) => {
    editorState.beatIntensity = Number(e.target.value);
    document.getElementById("jj-fbf-beat-int-val").textContent = editorState.beatIntensity + "%";
    drawAtTime(editorState.currentTime);
  });

  document.getElementById("jj-fbf-pick-audio-btn").addEventListener("click", () => {
    document.getElementById("jj-audio-input")?.click();
  });

  // Detect beats when user imports audio via #jj-audio-input
  const legacyAudioInput = document.getElementById("jj-audio-input");
  if (legacyAudioInput) {
    legacyAudioInput.addEventListener("change", async (e) => {
      const audioFile = e.target.files?.[0];
      if (!audioFile) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        const ac = new AC();
        const buf = await audioFile.arrayBuffer();
        const decoded = await ac.decodeAudioData(buf);
        const ch = decoded.getChannelData(0);
        const sr = decoded.sampleRate;
        const step = Math.floor(sr * 0.05);
        const peaks = [];
        let maxE = 0;
        const energies = [];
        for (let i = 0; i < ch.length; i += step) {
          let sum = 0;
          for (let j = 0; j < step && i + j < ch.length; j++) sum += ch[i + j] * ch[i + j];
          const rms = Math.sqrt(sum / step);
          energies.push(rms);
          if (rms > maxE) maxE = rms;
        }
        const thresh = maxE * 0.62;
        let lastBeatT = -1;
        energies.forEach((en, idx) => {
          const t = idx * 0.05;
          if (en > thresh && t - lastBeatT >= 0.28) {
            peaks.push(t);
            lastBeatT = t;
          }
        });
        if (peaks.length >= 2) {
          const intervals = [];
          for (let i = 1; i < Math.min(peaks.length, 40); i++) intervals.push(peaks[i] - peaks[i - 1]);
          intervals.sort((a, b) => a - b);
          const med = intervals[Math.floor(intervals.length / 2)] || 0.468;
          editorState.detectedBpm = Math.max(70, Math.min(185, Math.round(60 / med)));
          editorState.beatTimestamps = peaks;
          document.getElementById("jj-fbf-bpm-badge").textContent = editorState.detectedBpm + " BPM";
        }
        await ac.close();
      } catch (err) {
        console.warn("Beat detect fallback:", err);
      }
    });
  }

  function getCanvasDimensions(res, ratio) {
    const is1080 = res === "1080p";
    if (ratio === "16:9") return is1080 ? { w: 1920, h: 1080 } : { w: 1280, h: 720 };
    if (ratio === "1:1") return is1080 ? { w: 1080, h: 1080 } : { w: 720, h: 720 };
    return is1080 ? { w: 1080, h: 1920 } : { w: 720, h: 1280 };
  }

  document.getElementById("jj-fbf-res").addEventListener("change", (e) => {
    editorState.exportResolution = e.target.value;
  });
  document.getElementById("jj-fbf-fps").addEventListener("change", (e) => {
    editorState.exportFps = Number(e.target.value);
  });
  document.getElementById("jj-fbf-ratio").addEventListener("change", (e) => {
    editorState.exportRatio = e.target.value;
    const previewDims = editorState.exportRatio === "16:9"
      ? { w: 640, h: 360 }
      : editorState.exportRatio === "1:1"
        ? { w: 480, h: 480 }
        : { w: 360, h: 640 };
    canvas.width = previewDims.w;
    canvas.height = previewDims.h;
    drawAtTime(editorState.currentTime);
  });

  // Compute beat pulse (0..1) at timestamp t
  function getBeatPulse(t) {
    if (!editorState.beatSyncEnabled) return 0;
    const strength = editorState.beatIntensity / 100;
    if (editorState.beatTimestamps.length) {
      let nearest = 99;
      for (let i = 0; i < editorState.beatTimestamps.length; i++) {
        const d = t - editorState.beatTimestamps[i];
        if (d >= 0 && d < nearest) nearest = d;
        if (editorState.beatTimestamps[i] > t) break;
      }
      if (nearest < 0.22) return (1 - nearest / 0.22) * strength;
    }
    const beatPeriod = 60 / (editorState.detectedBpm || 128);
    const phase = (t % beatPeriod) / beatPeriod;
    return Math.pow(Math.max(0, 1 - phase * 2.6), 2) * strength;
  }

  // Draw a single frame with its individual animation parameters
  function drawAnimatedFrame(targetCtx, frame, w, h, localTime, globalTime, pulse) {
    const an = frame.config.animation;
    const dur = Math.max(0.2, Number(an.duration) || 1.5);
    const spd = Number(an.speed) || 1.0;
    const inten = (Number(an.intensity) || 65) / 100;
    const baseScale = (Number(an.scale) || 100) / 100;
    const baseRot = ((Number(an.rotation) || 0) * Math.PI) / 180;
    const phase = ((localTime * spd) % dur) / dur;
    const wave = Math.sin(phase * Math.PI * 2);

    let scale = baseScale;
    let rot = baseRot;
    let tx = 0;
    let ty = 0;
    let scaleX = 1;
    let rgbOffset = 0;

    const dirSign = (an.direction === "left" || an.direction === "up" || an.direction === "out") ? -1 : 1;

    switch (an.type) {
      case "zoom-pulse":
        scale += Math.abs(wave) * 0.16 * inten;
        break;
      case "bounce":
        ty = -Math.abs(Math.sin(phase * Math.PI * 2)) * h * 0.06 * inten;
        scale += Math.abs(wave) * 0.06 * inten;
        break;
      case "rotate":
        rot += wave * 0.18 * inten * dirSign;
        break;
      case "shake":
        tx = Math.sin(localTime * 42 * spd) * w * 0.03 * inten;
        ty = Math.cos(localTime * 37 * spd) * h * 0.03 * inten;
        break;
      case "pan-left":
        tx = -phase * w * 0.12 * inten;
        scale = Math.max(scale, 1.12);
        break;
      case "pan-right":
        tx = phase * w * 0.12 * inten;
        scale = Math.max(scale, 1.12);
        break;
      case "pan-up":
        ty = -phase * h * 0.12 * inten;
        scale = Math.max(scale, 1.12);
        break;
      case "pan-down":
        ty = phase * h * 0.12 * inten;
        scale = Math.max(scale, 1.12);
        break;
      case "3d-flip":
        scaleX = Math.max(0.15, Math.abs(Math.cos(phase * Math.PI * dirSign)));
        break;
      case "wobble":
        rot += Math.sin(phase * Math.PI * 4) * 0.12 * inten;
        tx += Math.cos(phase * Math.PI * 4) * w * 0.02 * inten;
        break;
      case "rgb-split":
        rgbOffset = (6 + Math.abs(wave) * 18) * inten;
        break;
      case "beat-sync":
      default:
        scale += pulse * 0.18 * inten;
        rot += (pulse > 0.45 ? (Math.sin(globalTime * 30) * 0.04 * inten) : 0);
        rgbOffset = pulse * 14 * inten;
        break;
    }

    if (editorState.beatSyncEnabled && an.type !== "beat-sync") {
      scale += pulse * 0.08;
    }

    const el = frame.element;
    const srcW = frame.isVideo ? (el.videoWidth || w) : (el.naturalWidth || w);
    const srcH = frame.isVideo ? (el.videoHeight || h) : (el.naturalHeight || h);
    const coverRatio = Math.max(w / srcW, h / srcH);
    const drawW = srcW * coverRatio;
    const drawH = srcH * coverRatio;

    targetCtx.save();
    targetCtx.translate(w / 2 + tx, h / 2 + ty);
    targetCtx.rotate(rot);
    targetCtx.scale(scale * scaleX, scale);

    if (rgbOffset > 0.5) {
      targetCtx.globalAlpha = 0.55;
      targetCtx.drawImage(el, -drawW / 2 - rgbOffset, -drawH / 2, drawW, drawH);
      targetCtx.drawImage(el, -drawW / 2 + rgbOffset, -drawH / 2, drawW, drawH);
      targetCtx.globalAlpha = 0.85;
    }

    targetCtx.drawImage(el, -drawW / 2, -drawH / 2, drawW, drawH);
    targetCtx.restore();
  }

  // Render transition from frameA -> frameB using frameA's individual transition config
  function drawFrameTransition(targetCtx, frameA, frameB, w, h, progress, localA, localB, globalTime, pulse) {
    const tr = frameA.config.transition;
    const inten = (Number(tr.intensity) || 75) / 100;
    const spd = Number(tr.speed) || 1.0;
    const p = Math.min(1, Math.max(0, Math.pow(progress, 1 / Math.max(0.4, spd))));
    const dir = tr.direction || "left";

    if (tr.type === "cut") {
      drawAnimatedFrame(targetCtx, p < 0.5 ? frameA : frameB, w, h, p < 0.5 ? localA : localB, globalTime, pulse);
      return;
    }

    targetCtx.save();
    switch (tr.type) {
      case "fade":
        drawAnimatedFrame(targetCtx, frameA, w, h, localA, globalTime, pulse);
        targetCtx.globalAlpha = p;
        drawAnimatedFrame(targetCtx, frameB, w, h, localB, globalTime, pulse);
        break;

      case "flash":
        drawAnimatedFrame(targetCtx, p < 0.5 ? frameA : frameB, w, h, p < 0.5 ? localA : localB, globalTime, pulse);
        targetCtx.fillStyle = `rgba(255,255,255,${Math.sin(p * Math.PI) * 0.92 * inten})`;
        targetCtx.fillRect(0, 0, w, h);
        break;

      case "zoom-in":
        drawAnimatedFrame(targetCtx, frameA, w, h, localA, globalTime, pulse);
        targetCtx.globalAlpha = p;
        targetCtx.translate(w / 2, h / 2);
        const zIn = 1 + (1 - p) * 0.55 * inten;
        targetCtx.scale(zIn, zIn);
        targetCtx.translate(-w / 2, -h / 2);
        drawAnimatedFrame(targetCtx, frameB, w, h, localB, globalTime, pulse);
        break;

      case "zoom-out":
        drawAnimatedFrame(targetCtx, frameA, w, h, localA, globalTime, pulse);
        targetCtx.globalAlpha = p;
        targetCtx.translate(w / 2, h / 2);
        const zOut = 1 - (1 - p) * 0.42 * inten;
        targetCtx.scale(zOut, zOut);
        targetCtx.translate(-w / 2, -h / 2);
        drawAnimatedFrame(targetCtx, frameB, w, h, localB, globalTime, pulse);
        break;

      case "blur":
        if ("filter" in targetCtx) {
          targetCtx.filter = `blur(${Math.sin(p * Math.PI) * 18 * inten}px)`;
        }
        drawAnimatedFrame(targetCtx, p < 0.5 ? frameA : frameB, w, h, p < 0.5 ? localA : localB, globalTime, pulse);
        if ("filter" in targetCtx) targetCtx.filter = "none";
        break;

      case "glitch":
        drawAnimatedFrame(targetCtx, p < 0.5 ? frameA : frameB, w, h, p < 0.5 ? localA : localB, globalTime, pulse);
        const sliceCount = 6;
        for (let i = 0; i < sliceCount; i++) {
          const sy = (h / sliceCount) * i;
          const sh = h / sliceCount;
          const shift = Math.sin(p * 35 + i * 3) * w * 0.08 * inten * Math.sin(p * Math.PI);
          targetCtx.drawImage(targetCtx.canvas, 0, sy, w, sh, shift, sy, w, sh);
        }
        break;

      case "shake":
        const shk = Math.sin(p * Math.PI) * 28 * inten;
        targetCtx.translate(Math.sin(p * 45) * shk, Math.cos(p * 38) * shk);
        drawAnimatedFrame(targetCtx, p < 0.5 ? frameA : frameB, w, h, p < 0.5 ? localA : localB, globalTime, pulse);
        break;

      case "slide":
      case "whip-pan": {
        const mult = tr.type === "whip-pan" ? 1.15 : 1.0;
        let dx = 0;
        let dy = 0;
        if (dir === "right") dx = (1 - p) * -w * mult;
        else if (dir === "up") dy = (1 - p) * h * mult;
        else if (dir === "down") dy = (1 - p) * -h * mult;
        else dx = (1 - p) * w * mult;

        targetCtx.save();
        targetCtx.translate(dx - (dir === "right" ? -w : dir === "left" ? w : 0), dy - (dir === "down" ? -h : dir === "up" ? h : 0));
        drawAnimatedFrame(targetCtx, frameA, w, h, localA, globalTime, pulse);
        targetCtx.restore();

        targetCtx.translate(dx, dy);
        drawAnimatedFrame(targetCtx, frameB, w, h, localB, globalTime, pulse);
        break;
      }

      case "spin": {
        const spinSign = dir === "left" ? -1 : 1;
        drawAnimatedFrame(targetCtx, frameA, w, h, localA, globalTime, pulse);
        targetCtx.globalAlpha = p;
        targetCtx.translate(w / 2, h / 2);
        targetCtx.rotate((1 - p) * Math.PI * 1.5 * inten * spinSign);
        const sScale = 0.4 + 0.6 * p;
        targetCtx.scale(sScale, sScale);
        targetCtx.translate(-w / 2, -h / 2);
        drawAnimatedFrame(targetCtx, frameB, w, h, localB, globalTime, pulse);
        break;
      }

      case "rgb-split": {
        const split = Math.sin(p * Math.PI) * 26 * inten;
        drawAnimatedFrame(targetCtx, p < 0.5 ? frameA : frameB, w, h, p < 0.5 ? localA : localB, globalTime, pulse);
        targetCtx.globalAlpha = 0.4;
        targetCtx.drawImage(targetCtx.canvas, -split, 0);
        targetCtx.drawImage(targetCtx.canvas, split, 0);
        break;
      }

      default:
        drawAnimatedFrame(targetCtx, frameB, w, h, localB, globalTime, pulse);
    }
    targetCtx.restore();
  }

  // Master frame renderer at timestamp t
  function renderFrameAt(targetCtx, w, h, t) {
    targetCtx.fillStyle = "#06040D";
    targetCtx.fillRect(0, 0, w, h);

    if (!editorState.frames.length) {
      targetCtx.fillStyle = "rgba(233,213,255,0.75)";
      targetCtx.font = "600 16px sans-serif";
      targetCtx.textAlign = "center";
      targetCtx.fillText("Tambahkan frame untuk pratinjau", w / 2, h / 2);
      return;
    }

    const pulse = getBeatPulse(t);
    let cursor = 0;

    for (let i = 0; i < editorState.frames.length; i++) {
      const f = editorState.frames[i];
      const dur = Math.max(0.5, Number(f.config.frameDuration) || 2.0);
      const end = cursor + dur;

      if (t <= end || i === editorState.frames.length - 1) {
        const localT = Math.max(0, t - cursor);
        const nextFrame = editorState.frames[i + 1];
        const trDur = nextFrame ? Math.min(dur * 0.48, Number(f.config.transition.duration) || 0.45) : 0;

        if (nextFrame && trDur > 0 && localT >= dur - trDur) {
          const progress = (localT - (dur - trDur)) / trDur;
          drawFrameTransition(targetCtx, f, nextFrame, w, h, progress, localT, localT - (dur - trDur), t, pulse);
        } else {
          drawAnimatedFrame(targetCtx, f, w, h, localT, t, pulse);
        }
        break;
      }
      cursor = end;
    }
  }

  function drawAtTime(t) {
    renderFrameAt(ctx, canvas.width, canvas.height, t);
  }

  // Play / Pause Preview Loop
  function tickPlayback(now) {
    if (!editorState.isPlaying) return;
    const total = getTotalDuration();
    if (total <= 0) {
      editorState.isPlaying = false;
      playBtn.textContent = "▶ Play";
      return;
    }
    const dt = Math.min(0.1, (now - editorState.lastRafTime) / 1000);
    editorState.lastRafTime = now;
    editorState.currentTime += dt;
    if (editorState.currentTime >= total) {
      editorState.currentTime = 0;
    }
    scrubber.value = String(editorState.currentTime);
    timeLabel.textContent = `${editorState.currentTime.toFixed(1)}s / ${total.toFixed(1)}s`;
    drawAtTime(editorState.currentTime);
    requestAnimationFrame(tickPlayback);
  }

  playBtn.addEventListener("click", () => {
    if (!editorState.frames.length) return;
    editorState.isPlaying = !editorState.isPlaying;
    playBtn.textContent = editorState.isPlaying ? "⏸ Pause" : "▶ Play";
    const audioEl = document.getElementById("jj-audio-preview");
    if (editorState.isPlaying) {
      editorState.lastRafTime = performance.now();
      editorState.frames.forEach((f) => { if (f.isVideo) f.element.play().catch(() => {}); });
      if (audioEl && audioEl.src) {
        audioEl.currentTime = editorState.currentTime % Math.max(1, audioEl.duration || 30);
        audioEl.play().catch(() => {});
      }
      requestAnimationFrame(tickPlayback);
    } else {
      editorState.frames.forEach((f) => { if (f.isVideo) f.element.pause(); });
      if (audioEl) audioEl.pause();
    }
  });

  scrubber.addEventListener("input", () => {
    editorState.currentTime = Number(scrubber.value);
    updateTimelineMetrics();
    drawAtTime(editorState.currentTime);
  });

  // Export Real Video (720p/1080p, 30/60 FPS, MP4/WebM with all per-frame animations & transitions)
  const exportBtn = document.getElementById("jj-fbf-export-btn");
  const exportStatus = document.getElementById("jj-fbf-export-status");
  const resultVideo = document.getElementById("jj-fbf-result-video");
  const downloadLink = document.getElementById("jj-fbf-download-link");

  exportBtn.addEventListener("click", async () => {
    if (!editorState.frames.length) {
      exportStatus.textContent = "Tambahkan minimal 1 frame terlebih dahulu sebelum export.";
      return;
    }

    editorState.isPlaying = false;
    playBtn.textContent = "▶ Play";
    exportBtn.disabled = true;
    resultVideo.style.display = "none";
    downloadLink.style.display = "none";

    const dims = getCanvasDimensions(editorState.exportResolution, editorState.exportRatio);
    const fps = editorState.exportFps;
    const totalDuration = getTotalDuration();

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = dims.w;
    exportCanvas.height = dims.h;
    const exportCtx = exportCanvas.getContext("2d", { alpha: false });

    const mimeCandidates = [
      "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
      "video/mp4",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm"
    ];
    const supportedMime = mimeCandidates.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || "";

    if (!supportedMime) {
      exportStatus.textContent = "Browser perangkat ini tidak mendukung perekaman video.";
      exportBtn.disabled = false;
      return;
    }

    let audioCtx = null;
    let audioEl = null;
    let audioUrl = null;

    try {
      const tracks = [...exportCanvas.captureStream(fps).getVideoTracks()];
      const musicFile = document.getElementById("jj-audio-input")?.files?.[0];

      if (musicFile) {
        const AC = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AC();
        await audioCtx.resume();
        audioEl = document.createElement("audio");
        audioUrl = URL.createObjectURL(musicFile);
        audioEl.src = audioUrl;
        audioEl.loop = true;
        await new Promise((res) => { audioEl.oncanplay = res; audioEl.load(); });
        const srcNode = audioCtx.createMediaElementSource(audioEl);
        const destNode = audioCtx.createMediaStreamDestination();
        srcNode.connect(destNode);
        tracks.push(...destNode.stream.getAudioTracks());
      }

      const stream = new MediaStream(tracks);
      const chunks = [];
      const recorder = new MediaRecorder(stream, {
        mimeType: supportedMime,
        videoBitsPerSecond: editorState.exportResolution === "1080p" ? 8000000 : 4500000
      });

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };

      const stoppedPromise = new Promise((resolve) => {
        recorder.onstop = resolve;
      });

      editorState.frames.forEach((f) => { if (f.isVideo) { f.element.currentTime = 0; f.element.play().catch(() => {}); } });
      if (audioEl) await audioEl.play().catch(() => {});

      recorder.start(250);
      const startPerf = performance.now();

      await new Promise((resolve) => {
        function renderStep(now) {
          const elapsed = (now - startPerf) / 1000;
          if (elapsed >= totalDuration) {
            renderFrameAt(exportCtx, dims.w, dims.h, totalDuration);
            resolve();
            return;
          }
          renderFrameAt(exportCtx, dims.w, dims.h, elapsed);
          const pct = Math.min(99, Math.round((elapsed / totalDuration) * 100));
          exportStatus.textContent = `Merender ${editorState.exportResolution} ${fps}FPS (${editorState.exportRatio}) • ${pct}%`;
          requestAnimationFrame(renderStep);
        }
        requestAnimationFrame(renderStep);
      });

      recorder.stop();
      await stoppedPromise;

      const isMp4 = supportedMime.includes("mp4");
      const ext = isMp4 ? "mp4" : "webm";
      const blob = new Blob(chunks, { type: supportedMime });
      const outUrl = URL.createObjectURL(blob);

      resultVideo.src = outUrl;
      resultVideo.style.display = "block";
      downloadLink.href = outUrl;
      downloadLink.download = `CH-Jedag-Jedug-${editorState.exportResolution}-${fps}fps.${ext}`;
      downloadLink.style.display = "inline-flex";
      exportStatus.textContent = `Selesai! Video ${dims.w}x${dims.h} (${fps} FPS, ${ext.toUpperCase()}) siap diunduh.`;
    } catch (err) {
      console.error("FBF Export Error:", err);
      exportStatus.textContent = "Gagal export video: " + (err?.message || "Kesalahan encoder");
    } finally {
      editorState.frames.forEach((f) => { if (f.isVideo) f.element.pause(); });
      if (audioEl) audioEl.pause();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (audioCtx) audioCtx.close().catch(() => {});
      exportBtn.disabled = false;
    }
  });

  // Initial draw
  drawAtTime(0);
})();
