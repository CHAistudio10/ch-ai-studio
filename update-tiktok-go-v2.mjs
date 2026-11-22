import fs from "fs";
import path from "path";

const cwd = process.cwd();
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const backupDir = path.join(cwd, "backups", `pre-tiktok-go-v2-${stamp}`);

// 1. Backup wajib sebelum mengubah file
fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(path.join(cwd, "public/index.html"), path.join(backupDir, "index.html"));
if (fs.existsSync(path.join(cwd, "public/affiliate-tiktok/tiktok-go.js"))) {
  fs.copyFileSync(path.join(cwd, "public/affiliate-tiktok/tiktok-go.js"), path.join(backupDir, "tiktok-go.js"));
}
if (fs.existsSync(path.join(cwd, "public/affiliate-tiktok/tiktok-go.css"))) {
  fs.copyFileSync(path.join(cwd, "public/affiliate-tiktok/tiktok-go.css"), path.join(backupDir, "tiktok-go.css"));
}
console.log("✅ Backup aman tersimpan di:", backupDir);

// 2. Tulis CSS Mobile-First Premium (Hitam & Biru Gelap, Aksen Ungu & Pink)
const cssCode = `/* CH AI AFFILIATE TIKTOK GO v2 - 100% Local Browser Engine */
#page-affiliate-tiktok {
  padding-bottom: 105px;
}
.ttg-hero {
  background: linear-gradient(135deg, rgba(13, 18, 38, 0.96), rgba(30, 16, 53, 0.92));
  border: 1px solid rgba(168, 85, 247, 0.38);
  border-radius: 18px;
  padding: 14px 16px;
  margin-bottom: 14px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
}
.ttg-pill-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #f472b6;
  background: rgba(236, 72, 153, 0.14);
  border: 1px solid rgba(236, 72, 153, 0.35);
  padding: 3px 10px;
  border-radius: 999px;
  margin-bottom: 6px;
}
.ttg-card {
  background: #0b0e1a;
  border: 1px solid rgba(99, 102, 241, 0.22);
  border-radius: 18px;
  padding: 15px;
  margin-bottom: 14px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}
.ttg-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.ttg-card-title {
  font-size: 0.9rem;
  font-weight: 800;
  color: #f8fafc;
}
.ttg-upload-btn {
  width: 100%;
  padding: 14px;
  border-radius: 14px;
  border: 1.5px dashed rgba(236, 72, 153, 0.55);
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(236, 72, 153, 0.12));
  color: #f5d0fe;
  font-weight: 700;
  font-size: 0.84rem;
  cursor: pointer;
}
.ttg-photo-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 7px;
  margin-top: 12px;
}
.ttg-photo-card {
  position: relative;
  aspect-ratio: 9 / 16;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: #04060d;
}
.ttg-photo-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.ttg-photo-num {
  position: absolute;
  top: 4px;
  left: 4px;
  background: rgba(5, 8, 20, 0.82);
  color: #38bdf8;
  font-size: 0.62rem;
  font-weight: 800;
  padding: 2px 5px;
  border-radius: 5px;
}
.ttg-photo-bar {
  position: absolute;
  bottom: 3px;
  left: 3px;
  right: 3px;
  display: flex;
  justify-content: space-between;
  background: rgba(5, 8, 20, 0.85);
  border-radius: 6px;
  padding: 2px;
}
.ttg-photo-bar button {
  background: none;
  border: none;
  color: #e2e8f0;
  font-size: 0.68rem;
  padding: 2px 4px;
  cursor: pointer;
}
.ttg-textarea, .ttg-select, .ttg-input {
  width: 100%;
  background: #050711;
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 12px;
  color: #f8fafc;
  padding: 10px 12px;
  font-size: 0.83rem;
  box-sizing: border-box;
}
.ttg-textarea:focus, .ttg-select:focus, .ttg-input:focus {
  outline: none;
  border-color: #ec4899;
}
.ttg-label {
  display: block;
  font-size: 0.74rem;
  color: #94a3b8;
  margin-bottom: 5px;
  font-weight: 600;
}
.ttg-dur-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-top: 8px;
}
.ttg-dur-pill {
  padding: 9px 4px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: #050711;
  color: #94a3b8;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
}
.ttg-dur-pill.active {
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  color: #fff;
  border-color: transparent;
}
.ttg-wave-wrap {
  position: relative;
  width: 100%;
  height: 68px;
  background: #050711;
  border: 1px solid rgba(56, 189, 248, 0.25);
  border-radius: 12px;
  overflow: hidden;
  margin-top: 10px;
}
#ttg-waveform-canvas {
  width: 100%;
  height: 100%;
  display: block;
}
.ttg-metrics-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}
.ttg-metric-chip {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 4px 9px;
  border-radius: 8px;
  background: rgba(56, 189, 248, 0.12);
  color: #7dd3fc;
  border: 1px solid rgba(56, 189, 248, 0.25);
}
.ttg-generate-btn {
  width: 100%;
  padding: 15px;
  border: none;
  border-radius: 15px;
  background: linear-gradient(135deg, #7c3aed, #db2777);
  color: #fff;
  font-size: 0.92rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  cursor: pointer;
  box-shadow: 0 10px 26px rgba(219, 39, 119, 0.35);
}
.ttg-generate-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.ttg-progress-box {
  margin-top: 12px;
  background: #050711;
  border: 1px solid rgba(168, 85, 247, 0.35);
  border-radius: 12px;
  padding: 10px 12px;
  display: none;
}
.ttg-progress-bar-bg {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  overflow: hidden;
  margin-top: 6px;
}
.ttg-progress-bar-fill {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, #38bdf8, #a855f7, #ec4899);
  transition: width 0.2s ease;
}
.ttg-timeline-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 290px;
  overflow-y: auto;
  margin-top: 10px;
}
.ttg-tl-item {
  display: flex;
  gap: 10px;
  align-items: center;
  background: #050711;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 8px;
}
.ttg-tl-thumb {
  width: 42px;
  height: 68px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}
.ttg-tl-body {
  flex: 1;
  min-width: 0;
}
.ttg-tl-meta {
  font-size: 0.68rem;
  color: #f472b6;
  font-weight: 700;
  margin-bottom: 3px;
}
.ttg-tl-input {
  width: 100%;
  background: #0d1224;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: #fff;
  padding: 5px 8px;
  font-size: 0.76rem;
  box-sizing: border-box;
}
.ttg-alert {
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 0.78rem;
  margin-bottom: 12px;
  display: none;
}
.ttg-alert.error {
  display: block;
  background: rgba(239, 68, 68, 0.16);
  border: 1px solid rgba(239, 68, 68, 0.45);
  color: #fecaca;
}
.ttg-alert.success {
  display: block;
  background: rgba(16, 185, 129, 0.16);
  border: 1px solid rgba(16, 185, 129, 0.45);
  color: #a7f3d0;
}
`;
fs.writeFileSync(path.join(cwd, "public/affiliate-tiktok/tiktok-go.css"), cssCode);

// 3. Tulis JavaScript Local Browser Engine (Rule-based Copywriting + Web Audio Beat Sync + Canvas 30fps Renderer)
const jsCode = `(() => {
  const CTA_TEXT = "Klik promo TikTok, pembelian di sini.";

  const VISUAL_EFFECTS = [
    "zoom-in",
    "zoom-out",
    "ken-burns",
    "motion-zoom",
    "flash",
    "shake",
    "glitch"
  ];

  const TRANSITIONS = [
    "fade",
    "slide",
    "blur",
    "flash",
    "zoom-cut"
  ];

  const TEXT_ANIMATIONS = [
    "pop-up",
    "fade-in",
    "slide-up",
    "typewriter",
    "bounce",
    "zoom-text",
    "shake-text",
    "highlight-text"
  ];

  // Template kategori berbasis aturan (tanpa mengarang harga, diskon, atau klaim palsu)
  const CATEGORY_SCRIPTS = {
    "Storytelling": [
      "Awalnya sempat ragu sebelum coba langsung...",
      "Ternyata detail aslinya sebagus ini pas dipakai!",
      "Perhatikan bagian produk yang paling sering dicari.",
      "Praktis banget buat nemenin aktivitas harian kamu.",
      "Gak heran banyak yang langsung checkout hari ini.",
      "Lihat sendiri tampilan dan detail produknya dari dekat.",
      "Pilihan tepat kalau kamu cari yang simpel & fungsional.",
      CTA_TEXT
    ],
    "Review produk": [
      "Jujurly, ini dia tampilan asli produknya!",
      "Lihat detail bagian ini, rapi dan nyaman dilihat.",
      "Dipakai harian juga tetap pas dan gak ribet.",
      "Ini alasan kenapa produk ini layak masuk wishlist.",
      "Tampilan dari sudut lain biar kamu makin yakin.",
      "Cocok banget buat dipakai sendiri atau hadiah.",
      "Detail kecilnya beneran diperhatikan dengan baik.",
      CTA_TEXT
    ],
    "Problem dan solution": [
      "Sering bingung cari produk yang pas & sesuai ekspektasi?",
      "Jangan asal pilih kalau belum lihat detail aslinya.",
      "Ini dia solusi praktis yang bisa langsung kamu andalkan.",
      "Desain dan tampilannya bikin pemakaian jadi lebih nyaman.",
      "Lihat perbandingan detailnya dari berbagai sisi.",
      "Bikin kebutuhan harian kamu terasa jauh lebih mudah.",
      "Sudah saatnya beralih ke pilihan yang lebih tepat.",
      CTA_TEXT
    ],
    "Soft selling": [
      "Lagi cari referensi produk yang estetik & fungsional?",
      "Coba perhatikan detail produk yang satu ini.",
      "Tampilannya simpel tapi tetap kelihatan berkelas.",
      "Enak banget dipadukan untuk berbagai suasana.",
      "Detailnya rapi dari depan sampai bagian samping.",
      "Bikin penampilan dan aktivitasmu makin percaya diri.",
      "Simpan dulu atau langsung cek ketersediaannya.",
      CTA_TEXT
    ],
    "Hard selling": [
      "STOP SCROLL! Cek produk incaran yang satu ini!",
      "Lihat langsung kualitas tampilan aslinya di sini!",
      "Detailnya solid, rapi, dan siap langsung dipakai.",
      "Jangan sampai kehabisan sebelum kamu cek sekarang!",
      "Tampilan lengkap dari berbagai sudut produk.",
      "Pilihan favorit yang paling sering dicari penonton.",
      "Amankan pilihanmu sekarang juga lewat TikTok!",
      CTA_TEXT
    ],
    "Fakta menarik": [
      "Tahu gak? Detail kecil ini yang bikin beda!",
      "Banyak yang belum sadar pentingnya bagian ini.",
      "Lihat lebih dekat tekstur dan bentuk aslinya.",
      "Dirancang biar tetap nyaman dipakai setiap hari.",
      "Sudut pandang lain yang jarang diperhatikan orang.",
      "Simpel, fungsional, dan enak dipandang.",
      "Sekarang kamu sudah lihat sendiri detail aslinya.",
      CTA_TEXT
    ],
    "Hook viral": [
      "Pantesan banyak yang nyari produk ini di FYP!",
      "Tunggu sampai akhir buat lihat detail lengkapnya!",
      "Baru lihat tampilannya aja udah bikin penasaran.",
      "Cek bagian detailnya, beneran se-rapi ini!",
      "Gak nyangka hasilnya bakal se-estetik ini.",
      "Wajib masuk daftar incaran kamu bulan ini.",
      "Mumpung masih tampil di beranda kamu sekarang!",
      CTA_TEXT
    ],
    "Promosi produk": [
      "Kenalan dulu sama produk pilihan hari ini!",
      "Tampilan detail produk yang siap melengkapi harimu.",
      "Lihat setiap sisinya dengan jelas sebelum memilih.",
      "Praktis digunakan kapan saja sesuai kebutuhanmu.",
      "Kualitas tampilan yang bikin makin yakin.",
      "Cek langsung detail lengkapnya di tautan TikTok.",
      "Jangan lewatkan kesempatan untuk memilikinya.",
      CTA_TEXT
    ]
  };

  const state = {
    photos: [], // { id, name, dataUrl, imgElement }
    duration: 20,
    resolution: "1080x1920", // atau "720x1280"
    audioFile: null,
    audioBuffer: null,
    audioDuration: 0,
    audioStartSec: 0,
    bpm: 120,
    beats: [],
    timeline: [], // [{ photoIndex, startTime, duration, text, effect, transition, textAnim, textPos }]
    renderedBlobUrl: null,
    renderedExt: "mp4"
  };

  function setAlert(msg, type = "error") {
    const el = document.getElementById("ttg-alert");
    if (!el) return;
    if (!msg) {
      el.className = "ttg-alert";
      el.textContent = "";
      return;
    }
    el.className = "ttg-alert " + type;
    el.textContent = msg;
  }

  function setProgress(visible, label = "", pct = 0) {
    const box = document.getElementById("ttg-progress-box");
    const txt = document.getElementById("ttg-progress-text");
    const bar = document.getElementById("ttg-progress-fill");
    if (!box) return;
    box.style.display = visible ? "block" : "none";
    if (txt) txt.textContent = label;
    if (bar) bar.style.width = Math.min(100, Math.max(0, pct)) + "%";
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  // Load file gambar menjadi HTMLImageElement tanpa memotong objek utama
  function loadPhotoItem(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          resolve({
            id: "img_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
            name: file.name,
            dataUrl: reader.result,
            imgElement: img
          });
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function renderPhotoGrid() {
    const grid = document.getElementById("ttg-photo-grid");
    const badge = document.getElementById("ttg-photo-count");
    if (badge) badge.textContent = state.photos.length + "/20 Foto";
    if (!grid) return;

    grid.innerHTML = state.photos.map((p, idx) => \`
      <div class="ttg-photo-card">
        <img src="\${p.dataUrl}" alt="Foto \${idx + 1}">
        <span class="ttg-photo-num">#\${idx + 1}</span>
        <div class="ttg-photo-bar">
          <button type="button" onclick="window.ttgMovePhoto(\${idx}, -1)" title="Geser Kiri">◀</button>
          <button type="button" onclick="window.ttgMovePhoto(\${idx}, 1)" title="Geser Kanan">▶</button>
          <button type="button" style="color:#f472b6;" onclick="window.ttgRemovePhoto('\${p.id}')" title="Hapus">✕</button>
        </div>
      </div>
    \`).join("");
  }

  window.ttgMovePhoto = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= state.photos.length) return;
    const temp = state.photos[idx];
    state.photos[idx] = state.photos[target];
    state.photos[target] = temp;
    renderPhotoGrid();
  };

  window.ttgRemovePhoto = (id) => {
    state.photos = state.photos.filter(p => p.id !== id);
    renderPhotoGrid();
  };

  window.ttgSelectDuration = (sec) => {
    state.duration = sec;
    document.querySelectorAll(".ttg-dur-pill").forEach(btn => {
      btn.classList.toggle("active", Number(btn.dataset.dur) === sec);
    });
    updateAudioTrimInfo();
    if (state.audioBuffer) analyzeAudioAndDrawWaveform();
  };

  function updateAudioTrimInfo() {
    const infoEl = document.getElementById("ttg-trim-info");
    const slider = document.getElementById("ttg-audio-start");
    if (!state.audioBuffer || !infoEl || !slider) return;
    const maxStart = Math.max(0, Math.floor(state.audioDuration - state.duration));
    slider.max = String(maxStart);
    if (state.audioStartSec > maxStart) {
      state.audioStartSec = maxStart;
      slider.value = String(maxStart);
    }
    const endSec = Math.min(state.audioDuration, state.audioStartSec + state.duration);
    infoEl.textContent = \`Potongan: \${formatTime(state.audioStartSec)} – \${formatTime(endSec)} (\${state.duration} detik)\`;
  }

  // Analisis sinyal audio nyata: Energi RMS, perkiraan BPM, daftar beat, dan gambar waveform
  function analyzeAudioAndDrawWaveform() {
    if (!state.audioBuffer) return;
    const sr = state.audioBuffer.sampleRate;
    const data = state.audioBuffer.getChannelData(0);
    const startSample = Math.floor(state.audioStartSec * sr);
    const endSample = Math.min(data.length, Math.floor((state.audioStartSec + state.duration) * sr));
    const segmentLen = Math.max(1, endSample - startSample);

    // 1. Hitung energi per 50ms untuk deteksi beat / puncak amplitudo
    const windowSize = Math.floor(sr * 0.05);
    const energyWindows = [];
    for (let i = startSample; i < endSample; i += windowSize) {
      let sum = 0;
      const limit = Math.min(i + windowSize, endSample);
      for (let j = i; j < limit; j++) sum += data[j] * data[j];
      energyWindows.push({
        time: (i - startSample) / sr,
        rms: Math.sqrt(sum / Math.max(1, limit - i))
      });
    }

    const detectedBeats = [];
    let lastBeatTime = -1;
    for (let i = 3; i < energyWindows.length - 3; i++) {
      const localSlice = energyWindows.slice(i - 3, i + 3);
      const localAvg = localSlice.reduce((a, b) => a + b.rms, 0) / localSlice.length;
      if (energyWindows[i].rms > localAvg * 1.28 && energyWindows[i].rms > 0.04) {
        if (energyWindows[i].time - lastBeatTime >= 0.42) {
          detectedBeats.push(Number(energyWindows[i].time.toFixed(2)));
          lastBeatTime = energyWindows[i].time;
        }
      }
    }

    // Hitung perkiraan BPM dari interval antar beat
    let estimatedBpm = 120;
    if (detectedBeats.length >= 4) {
      const intervals = [];
      for (let i = 1; i < detectedBeats.length; i++) {
        const diff = detectedBeats[i] - detectedBeats[i - 1];
        if (diff >= 0.3 && diff <= 1.2) intervals.push(diff);
      }
      if (intervals.length > 0) {
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        estimatedBpm = Math.round(60 / avgInterval);
        while (estimatedBpm < 75) estimatedBpm *= 2;
        while (estimatedBpm > 175) estimatedBpm = Math.round(estimatedBpm / 2);
      }
    }

    state.bpm = estimatedBpm;
    state.beats = detectedBeats;

    const bpmChip = document.getElementById("ttg-bpm-chip");
    const beatChip = document.getElementById("ttg-beat-chip");
    if (bpmChip) bpmChip.textContent = \`BPM: ~\${estimatedBpm}\`;
    if (beatChip) beatChip.textContent = \`Beat Terdeteksi: \${detectedBeats.length} titik\`;

    // 2. Gambar waveform audio & penanda titik beat di Canvas
    const canvas = document.getElementById("ttg-waveform-canvas");
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = (rect.width || 320) * dpr;
    canvas.height = (rect.height || 68) * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const w = rect.width || 320;
    const h = rect.height || 68;
    ctx.clearRect(0, 0, w, h);

    const bars = 80;
    const step = Math.floor(segmentLen / bars);
    for (let i = 0; i < bars; i++) {
      let peak = 0;
      const offset = startSample + i * step;
      for (let j = 0; j < step && offset + j < endSample; j += 8) {
        const v = Math.abs(data[offset + j]);
        if (v > peak) peak = v;
      }
      const barH = Math.max(4, peak * (h - 14));
      const x = (i / bars) * w;
      const y = (h - barH) / 2;
      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      grad.addColorStop(0, "#38bdf8");
      grad.addColorStop(0.5, "#a855f7");
      grad.addColorStop(1, "#ec4899");
      ctx.fillStyle = grad;
      ctx.fillRect(x + 1, y, Math.max(2, w / bars - 2), barH);
    }

    // Garis vertikal tipis untuk titik beat
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    detectedBeats.forEach(bTime => {
      const bx = (bTime / state.duration) * w;
      ctx.fillRect(bx, 0, 1.5, h);
    });
  }

  // Ekstrak kata kunci aman dari instruksi pengguna tanpa mengarang harga/diskon
  function extractSafeTopicFromPrompt(promptStr) {
    const clean = String(promptStr || "")
      .replace(/buat(kan)?\s+video\s+(affiliate|promosi|tiktok)?/gi, "")
      .replace(/yang\s+menarik|storytelling|bikin\s+penasaran|mengarahkan\s+penonton\s+untuk\s+membeli\s+produk/gi, "")
      .replace(/[.,!?]+/g, " ")
      .trim();
    const words = clean.split(/\s+/).filter(w => w.length > 2 && !/^(rp|diskon|promo|gratis|murah|\d+%?)$/i.test(w));
    return words.slice(0, 5).join(" ");
  }

  // Penyusunan Timeline Otomatis + Beat Sync
  function buildAutomaticTimeline() {
    const count = state.photos.length;
    const totalDur = state.duration;
    const category = document.getElementById("ttg-category")?.value || "Storytelling";
    const userPrompt = document.getElementById("ttg-prompt")?.value || "";
    const topicHint = extractSafeTopicFromPrompt(userPrompt);
    const pool = CATEGORY_SCRIPTS[category] || CATEGORY_SCRIPTS["Storytelling"];

    // Tentukan titik potong waktu setiap frame (disinkronkan dengan beat musik terdekat)
    const rawStep = totalDur / count;
    const cutPoints = [0];
    for (let i = 1; i < count; i++) {
      const idealTime = i * rawStep;
      let chosenTime = idealTime;
      if (state.beats.length > 0) {
        // Cari beat terdekat dalam jendela ±0.6 detik
        let closest = idealTime;
        let minDiff = 0.6;
        for (const b of state.beats) {
          const diff = Math.abs(b - idealTime);
          if (diff < minDiff && b > cutPoints[i - 1] + 0.7 && b < totalDur - 0.7) {
            minDiff = diff;
            closest = b;
          }
        }
        chosenTime = closest;
      }
      cutPoints.push(Number(chosenTime.toFixed(2)));
    }
    cutPoints.push(totalDur);

    const positions = ["bottom", "top", "bottom", "bottom", "top"];
    const timeline = [];

    for (let i = 0; i < count; i++) {
      const startTime = cutPoints[i];
      const dur = Number((cutPoints[i + 1] - startTime).toFixed(2));
      let frameText = "";

      if (i === count - 1) {
        frameText = CTA_TEXT;
      } else if (i === 0 && topicHint) {
        frameText = \`Cek \${topicHint} ini, wajib lihat sampai habis!\`;
      } else {
        const scriptIdx = i % (pool.length - 1);
        frameText = pool[scriptIdx];
      }

      timeline.push({
        photoIndex: i,
        startTime,
        duration: dur,
        text: frameText,
        effect: VISUAL_EFFECTS[i % VISUAL_EFFECTS.length],
        transition: TRANSITIONS[i % TRANSITIONS.length],
        textAnim: TEXT_ANIMATIONS[i % TEXT_ANIMATIONS.length],
        textPos: i === count - 1 ? "bottom" : positions[i % positions.length]
      });
    }

    state.timeline = timeline;
    renderTimelineList();
  }

  function renderTimelineList() {
    const wrap = document.getElementById("ttg-timeline-card");
    const list = document.getElementById("ttg-timeline-list");
    if (!wrap || !list) return;
    if (!state.timeline.length) {
      wrap.style.display = "none";
      return;
    }
    wrap.style.display = "block";
    list.innerHTML = state.timeline.map((item, idx) => {
      const photo = state.photos[item.photoIndex];
      return \`
        <div class="ttg-tl-item">
          <img src="\${photo?.dataUrl || ""}" class="ttg-tl-thumb" alt="">
          <div class="ttg-tl-body">
            <div class="ttg-tl-meta">Frame \${idx + 1} • \${item.duration}s • \${item.effect} • \${item.textAnim}</div>
            <input type="text" class="ttg-tl-input" value="\${item.text.replace(/"/g, "&quot;")}" onchange="window.ttgEditFrameText(\${idx}, this.value)">
          </div>
        </div>
      \`;
    }).join("");
  }

  window.ttgEditFrameText = (idx, val) => {
    if (state.timeline[idx]) {
      state.timeline[idx].text = val;
    }
  };

  // Menggambar gambar 9:16 secara proporsional (Blurred background + Full product foreground agar produk tidak terpotong)
  function drawProductFrame(ctx, img, w, h, scale, offsetX, offsetY) {
    // 1. Latar belakang blur mengisi 9:16
    ctx.save();
    ctx.filter = "blur(22px) brightness(0.48)";
    const coverScale = Math.max(w / img.width, h / img.height) * 1.12;
    const cw = img.width * coverScale;
    const ch = img.height * coverScale;
    ctx.drawImage(img, (w - cw) / 2, (h - ch) / 2, cw, ch);
    ctx.restore();

    // 2. Foto produk utama utuh (aspect fit + sedikit zoom motion aman agar produk tidak terpotong)
    ctx.save();
    const fitScale = Math.min(w / img.width, (h * 0.84) / img.height) * scale;
    const fw = img.width * fitScale;
    const fh = img.height * fitScale;
    const fx = (w - fw) / 2 + offsetX;
    const fy = (h - fh) / 2 + offsetY;

    ctx.shadowColor = "rgba(0,0,0,0.65)";
    ctx.shadowBlur = 28;
    ctx.drawImage(img, fx, fy, fw, fh);
    ctx.restore();
  }

  // Menggambar teks otomatis dengan wrapping rapi & animasi sesuai beat
  function drawAnimatedCaption(ctx, text, w, h, frameProgress, animType, posType, isBeatPulse, isLastFrame) {
    if (!text) return;
    ctx.save();

    let displayText = text;
    let alpha = 1;
    let scale = 1;
    let shiftY = 0;
    let shiftX = 0;

    const enterT = Math.min(1, frameProgress / 0.25);

    switch (animType) {
      case "pop-up":
        scale = 0.7 + 0.3 * Math.sin((enterT * Math.PI) / 2);
        alpha = enterT;
        break;
      case "fade-in":
        alpha = enterT;
        break;
      case "slide-up":
        alpha = enterT;
        shiftY = (1 - enterT) * 45;
        break;
      case "typewriter": {
        const charCount = Math.max(1, Math.floor(text.length * Math.min(1, frameProgress / 0.55)));
        displayText = text.slice(0, charCount);
        break;
      }
      case "bounce":
        shiftY = -Math.abs(Math.sin(frameProgress * Math.PI * 3)) * 16 * (1 - frameProgress);
        break;
      case "zoom-text":
        scale = 0.88 + 0.16 * enterT;
        break;
      case "shake-text":
        if (isBeatPulse) shiftX = (Math.random() - 0.5) * 14;
        break;
      case "highlight-text":
      default:
        if (isBeatPulse) scale = 1.05;
        break;
    }

    const fontSize = Math.round(w * 0.044);
    ctx.font = \`800 \${fontSize}px system-ui, -apple-system, sans-serif\`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Word wrap agar tidak pernah keluar layar HP
    const maxTextWidth = w * 0.82;
    const words = displayText.split(" ");
    const lines = [];
    let currentLine = "";
    for (const word of words) {
      const testLine = currentLine ? currentLine + " " + word : word;
      if (ctx.measureText(testLine).width > maxTextWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    const lineHeight = fontSize * 1.32;
    const boxHeight = lines.length * lineHeight + 28;
    const boxWidth = Math.min(w * 0.9, Math.max(...lines.map(l => ctx.measureText(l).width)) + 44);

    // Posisi aman agar tidak menutupi tengah produk
    const baseY = posType === "top" ? h * 0.14 : h * 0.81;

    ctx.globalAlpha = alpha;
    ctx.translate(w / 2 + shiftX, baseY + shiftY);
    ctx.scale(scale, scale);

    // Kotak kontras tinggi
    ctx.fillStyle = isLastFrame ? "rgba(219, 39, 119, 0.92)" : "rgba(8, 11, 24, 0.84)";
    ctx.strokeStyle = isLastFrame ? "#38bdf8" : "rgba(168, 85, 247, 0.75)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#FFFFFF";
    lines.forEach((line, idx) => {
      const ly = (idx - (lines.length - 1) / 2) * lineHeight;
      ctx.fillText(line, 0, ly);
    });

    // Indikator panah ke keranjang TikTok pada frame terakhir
    if (isLastFrame) {
      ctx.font = \`800 \${Math.round(w * 0.034)}px system-ui, sans-serif\`;
      ctx.fillStyle = "#38bdf8";
      ctx.fillText("↙ Cek Keranjang Kuning di Pojok Kiri Bawah", 0, boxHeight / 2 + 28);
    }

    ctx.restore();
  }

  // Render Video 30 FPS + Audio Potongan (Fade-in & Fade-out) langsung di Browser
  window.ttgGenerateAndRender = async () => {
    setAlert("");
    if (state.photos.length < 5 || state.photos.length > 20) {
      return setAlert("Unggah minimal 5 foto dan maksimal 20 foto terlebih dahulu.", "error");
    }

    const genBtn = document.getElementById("ttg-generate-btn");
    genBtn.disabled = true;

    try {
      setProgress(true, "Menyusun teks otomatis & sinkronisasi beat...", 5);
      buildAutomaticTimeline();

      const resVal = document.getElementById("ttg-resolution")?.value || "1080x1920";
      const [width, height] = resVal === "720x1280" ? [720, 1280] : [1080, 1920];
      const fps = 30;
      const totalFrames = Math.ceil(state.duration * fps);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      // Siapkan stream video dari Canvas 30 FPS
      const canvasStream = canvas.captureStream(fps);
      const combinedTracks = [...canvasStream.getVideoTracks()];

      // Siapkan stream audio yang dipotong + fade-in/fade-out jika user mengunggah musik
      let audioCtx = null;
      let audioSource = null;
      if (state.audioBuffer) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioCtx();
        const dest = audioCtx.createMediaStreamDestination();
        const gainNode = audioCtx.createGain();

        // Fade-in 0.8s & Fade-out 1.2s
        const now = audioCtx.currentTime;
        gainNode.gain.setValueAtTime(0.01, now);
        gainNode.gain.linearRampToValueAtTime(0.9, now + 0.8);
        gainNode.gain.setValueAtTime(0.9, now + Math.max(0.9, state.duration - 1.2));
        gainNode.gain.linearRampToValueAtTime(0.01, now + state.duration);

        audioSource = audioCtx.createBufferSource();
        audioSource.buffer = state.audioBuffer;
        audioSource.connect(gainNode);
        gainNode.connect(dest);

        dest.stream.getAudioTracks().forEach(t => combinedTracks.push(t));
      }

      const finalStream = new MediaStream(combinedTracks);

      // Pilih codec MP4 (H.264/AAC) jika didukung browser Android, atau fallback WebM VP9/Opus
      const mimeCandidates = [
        "video/mp4;codecs=avc1,mp4a.40.2",
        "video/mp4",
        "video/webm;codecs=vp9,opus",
        "video/webm"
      ];
      const chosenMime = mimeCandidates.find(m => MediaRecorder.isTypeSupported(m)) || "";
      state.renderedExt = chosenMime.includes("mp4") ? "mp4" : "webm";

      const chunks = [];
      const recorder = new MediaRecorder(finalStream, {
        mimeType: chosenMime || undefined,
        videoBitsPerSecond: width === 1080 ? 5500000 : 3000000
      });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const recordingDone = new Promise((resolve) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: chosenMime || "video/mp4" });
          resolve(blob);
        };
      });

      recorder.start(250);
      if (audioSource) {
        audioSource.start(0, state.audioStartSec, state.duration);
      }

      const startPerf = performance.now();

      for (let f = 0; f < totalFrames; f++) {
        const currentTime = f / fps;

        // Cari frame timeline yang aktif pada detik currentTime
        let activeIdx = state.timeline.findIndex(
          (item) => currentTime >= item.startTime && currentTime < item.startTime + item.duration
        );
        if (activeIdx === -1) activeIdx = state.timeline.length - 1;

        const item = state.timeline[activeIdx];
        const prevItem = activeIdx > 0 ? state.timeline[activeIdx - 1] : null;
        const localTime = Math.max(0, currentTime - item.startTime);
        const progress = Math.min(1, localTime / Math.max(0.1, item.duration));

        // Cek apakah detik ini berdekatan dengan titik beat musik
        const isBeatPulse = state.beats.some(b => Math.abs(b - currentTime) < 0.08);

        ctx.fillStyle = "#050711";
        ctx.fillRect(0, 0, width, height);

        // Hitung transformasi gerak berdasarkan efek visual
        let scale = 1.0;
        let offX = 0;
        let offY = 0;

        switch (item.effect) {
          case "zoom-in":
            scale = 1.0 + progress * 0.14;
            break;
          case "zoom-out":
            scale = 1.14 - progress * 0.14;
            break;
          case "ken-burns":
            scale = 1.04 + progress * 0.1;
            offX = (progress - 0.5) * 32;
            offY = (progress - 0.5) * -20;
            break;
          case "motion-zoom":
            scale = 1.02 + Math.sin(progress * Math.PI) * 0.1 + (isBeatPulse ? 0.04 : 0);
            break;
          case "shake":
            scale = 1.06;
            if (isBeatPulse) {
              offX = (Math.random() - 0.5) * 24;
              offY = (Math.random() - 0.5) * 24;
            }
            break;
          case "glitch":
            scale = 1.04;
            if (isBeatPulse) offX = (f % 2 === 0 ? 18 : -18);
            break;
          case "flash":
          default:
            scale = 1.02 + progress * 0.08;
            break;
        }

        const imgObj = state.photos[item.photoIndex]?.imgElement;
        if (imgObj) {
          // Efek transisi di 0.35 detik awal frame
          const transDur = 0.35;
          if (prevItem && localTime < transDur) {
            const tRatio = localTime / transDur;
            const prevImg = state.photos[prevItem.photoIndex]?.imgElement;
            if (prevImg) {
              drawProductFrame(ctx, prevImg, width, height, 1.05, 0, 0);
            }
            ctx.save();
            if (item.transition === "fade") {
              ctx.globalAlpha = tRatio;
            } else if (item.transition === "slide") {
              ctx.translate((1 - tRatio) * width, 0);
            } else if (item.transition === "blur") {
              ctx.globalAlpha = tRatio;
              ctx.filter = \`blur(\${Math.round((1 - tRatio) * 14)}px)\`;
            }
            drawProductFrame(ctx, imgObj, width, height, scale, offX, offY);
            ctx.restore();

            if (item.transition === "flash" || item.effect === "flash") {
              ctx.fillStyle = \`rgba(255, 255, 255, \${(1 - tRatio) * 0.65})\`;
              ctx.fillRect(0, 0, width, height);
            }
          } else {
            drawProductFrame(ctx, imgObj, width, height, scale, offX, offY);
            if (item.effect === "flash" && isBeatPulse) {
              ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
              ctx.fillRect(0, 0, width, height);
            }
          }
        }

        // Gambar teks promosi otomatis
        drawAnimatedCaption(
          ctx,
          item.text,
          width,
          height,
          progress,
          item.textAnim,
          item.textPos,
          isBeatPulse,
          activeIdx === state.timeline.length - 1
        );

        // Sinkronisasi waktu real-time 30 FPS agar durasi video & audio persis
        const targetElapsed = ((f + 1) / fps) * 1000;
        const actualElapsed = performance.now() - startPerf;
        const waitMs = Math.max(1, targetElapsed - actualElapsed);

        if (f % 10 === 0) {
          const pct = Math.round(((f + 1) / totalFrames) * 100);
          setProgress(true, \`Merender Video \${width}×\${height} (30 FPS)... \${pct}%\`, pct);
        }

        await new Promise(r => setTimeout(r, waitMs));
      }

      if (audioSource) {
        try { audioSource.stop(); } catch {}
      }
      recorder.stop();
      const videoBlob = await recordingDone;
      if (audioCtx) {
        try { await audioCtx.close(); } catch {}
      }

      if (state.renderedBlobUrl) URL.revokeObjectURL(state.renderedBlobUrl);
      state.renderedBlobUrl = URL.createObjectURL(videoBlob);

      const previewBox = document.getElementById("ttg-preview-card");
      const videoEl = document.getElementById("ttg-final-video");
      const dlBtn = document.getElementById("ttg-download-btn");

      videoEl.src = state.renderedBlobUrl;
      dlBtn.href = state.renderedBlobUrl;
      dlBtn.download = \`CH-AI-Affiliate-TikTok-\${Date.now()}.\${state.renderedExt}\`;
      previewBox.style.display = "block";
      previewBox.scrollIntoView({ behavior: "smooth" });

      setProgress(false);
      setAlert(\`Video vertikal \${width}×\${height} (\${state.duration}s) selesai dirender! Siap diputar & diunduh.\`, "success");
    } catch (err) {
      console.error("Render error:", err);
      setProgress(false);
      setAlert("Gagal merender video: " + (err?.message || "Perangkat tidak mendukung encoding."), "error");
    } finally {
      genBtn.disabled = false;
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    const photoInput = document.getElementById("ttg-photo-input");
    if (photoInput) {
      photoInput.addEventListener("change", async (e) => {
        setAlert("");
        const files = Array.from(e.target.files || []);
        const remaining = 20 - state.photos.length;
        for (const f of files.slice(0, remaining)) {
          const item = await loadPhotoItem(f);
          state.photos.push(item);
        }
        renderPhotoGrid();
        photoInput.value = "";
      });
    }

    const audioInput = document.getElementById("ttg-audio-input");
    if (audioInput) {
      audioInput.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAlert("");
        state.audioFile = file;
        document.getElementById("ttg-audio-name").textContent = "🎵 " + file.name;
        document.getElementById("ttg-audio-panel").style.display = "block";

        const previewAudio = document.getElementById("ttg-audio-player");
        previewAudio.src = URL.createObjectURL(file);

        try {
          const arrBuf = await file.arrayBuffer();
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          const ctx = new AudioCtx();
          state.audioBuffer = await ctx.decodeAudioData(arrBuf);
          state.audioDuration = state.audioBuffer.duration;
          state.audioStartSec = 0;
          document.getElementById("ttg-audio-start").value = "0";
          updateAudioTrimInfo();
          analyzeAudioAndDrawWaveform();
          await ctx.close();
        } catch {
          setAlert("Format audio tidak dapat didekode oleh browser ini. Gunakan MP3 atau WAV.", "error");
        }
      });
    }

    const startSlider = document.getElementById("ttg-audio-start");
    if (startSlider) {
      startSlider.addEventListener("input", (e) => {
        state.audioStartSec = Number(e.target.value) || 0;
        updateAudioTrimInfo();
        analyzeAudioAndDrawWaveform();
      });
    }
  });
})();
`;
fs.writeFileSync(path.join(cwd, "public/affiliate-tiktok/tiktok-go.js"), jsCode);

// 4. Perbarui hanya bagian #page-affiliate-tiktok di public/index.html (tanpa menyentuh bagian lain)
let html = fs.readFileSync(path.join(cwd, "public/index.html"), "utf8");
const newSectionHtml = `<section id="page-affiliate-tiktok" class="page">
      <div class="v6-subpage-bar">
        <div class="v6-back-title">
          <button type="button" class="v6-back-btn" onclick="go('home')">←</button>
          <h2>CH AI AFFILIATE TIKTOK GO</h2>
        </div>
      </div>

      <div class="ttg-hero">
        <span class="ttg-pill-badge">AUTOMATIC AFFILIATE VIDEO MAKER • 9:16</span>
        <div style="font-size:0.8rem;color:#cbd5e1;line-height:1.45;">
          Upload 5–20 foto produk, tulis 1 instruksi, pilih musik &amp; potong bagian terbaiknya. Sistem otomatis menyusun teks, beat sync, efek visual &amp; video MP4 vertikal.
        </div>
      </div>

      <div id="ttg-alert" class="ttg-alert"></div>

      <!-- 1. UPLOAD FOTO PRODUK (5-20) -->
      <div class="ttg-card">
        <div class="ttg-card-head">
          <span class="ttg-card-title">1. Foto Produk (5–20 Gambar)</span>
          <span id="ttg-photo-count" style="font-size:0.75rem;color:#f472b6;font-weight:800;">0/20 Foto</span>
        </div>
        <input type="file" id="ttg-photo-input" accept="image/jpeg,image/jpg,image/png,image/webp" multiple style="display:none;">
        <button type="button" class="ttg-upload-btn" onclick="document.getElementById('ttg-photo-input').click()">
          + Pilih Foto Produk dari Galeri (Min. 5, Maks. 20)
        </button>
        <div id="ttg-photo-grid" class="ttg-photo-grid"></div>
      </div>

      <!-- 2. SATU PROMPT & KATEGORI KONTEN -->
      <div class="ttg-card">
        <div class="ttg-card-head">
          <span class="ttg-card-title">2. Instruksi &amp; Kategori Konten</span>
        </div>
        <label class="ttg-label">Kategori Video Affiliate</label>
        <select id="ttg-category" class="ttg-select" style="margin-bottom:10px;">
          <option value="Storytelling">Storytelling</option>
          <option value="Review produk">Review produk</option>
          <option value="Problem dan solution">Problem dan solution</option>
          <option value="Soft selling">Soft selling</option>
          <option value="Hard selling">Hard selling</option>
          <option value="Fakta menarik">Fakta menarik</option>
          <option value="Hook viral">Hook viral</option>
          <option value="Promosi produk">Promosi produk</option>
        </select>

        <label class="ttg-label">Satu Instruksi Utama (Otomatis untuk Semua Frame)</label>
        <textarea id="ttg-prompt" class="ttg-textarea" rows="3" placeholder="Contoh: Buat video affiliate yang menarik, storytelling, bikin penasaran, dan mengarahkan penonton untuk membeli produk."></textarea>
      </div>

      <!-- 3. UPLOAD & POTONG MUSIK + AUTOMATIC BEAT SYNC -->
      <div class="ttg-card">
        <div class="ttg-card-head">
          <span class="ttg-card-title">3. Musik &amp; Automatic Beat Sync</span>
        </div>
        <input type="file" id="ttg-audio-input" accept="audio/mp3,audio/wav,audio/*" class="ttg-input">

        <div id="ttg-audio-panel" style="display:none;margin-top:10px;">
          <div id="ttg-audio-name" style="font-size:0.78rem;font-weight:700;color:#38bdf8;margin-bottom:6px;"></div>
          <audio id="ttg-audio-player" controls style="width:100%;height:34px;"></audio>

          <div class="ttg-wave-wrap">
            <canvas id="ttg-waveform-canvas"></canvas>
          </div>

          <div class="ttg-metrics-row">
            <span id="ttg-bpm-chip" class="ttg-metric-chip">BPM: --</span>
            <span id="ttg-beat-chip" class="ttg-metric-chip">Beat Terdeteksi: 0</span>
            <span id="ttg-trim-info" class="ttg-metric-chip" style="color:#f472b6;border-color:rgba(244,114,182,0.35);">Potongan: 00:00 – 00:20</span>
          </div>

          <div style="margin-top:10px;">
            <label class="ttg-label">Geser Titik Awal Lagu:</label>
            <input type="range" id="ttg-audio-start" min="0" max="60" value="0" style="width:100%;accent-color:#ec4899;">
          </div>
        </div>

        <div style="margin-top:10px;">
          <label class="ttg-label">Durasi Video &amp; Potongan Musik</label>
          <div class="ttg-dur-grid">
            <button type="button" class="ttg-dur-pill" data-dur="15" onclick="window.ttgSelectDuration(15)">15 Detik</button>
            <button type="button" class="ttg-dur-pill active" data-dur="20" onclick="window.ttgSelectDuration(20)">20 Detik</button>
            <button type="button" class="ttg-dur-pill" data-dur="30" onclick="window.ttgSelectDuration(30)">30 Detik</button>
            <button type="button" class="ttg-dur-pill" data-dur="60" onclick="window.ttgSelectDuration(60)">60 Detik</button>
          </div>
        </div>

        <div style="margin-top:10px;">
          <label class="ttg-label">Kualitas Render Vertikal (9:16 • 30 FPS)</label>
          <select id="ttg-resolution" class="ttg-select">
            <option value="1080x1920">Full HD 1080 × 1920 (Rekomendasi TikTok)</option>
            <option value="720x1280">Mode Ringan 720 × 1280 (HP RAM Kecil)</option>
          </select>
        </div>

        <button type="button" id="ttg-generate-btn" class="ttg-generate-btn" style="margin-top:14px;" onclick="window.ttgGenerateAndRender()">
          🎬 GENERATE VIDEO OTOMATIS
        </button>

        <div id="ttg-progress-box" class="ttg-progress-box">
          <div id="ttg-progress-text" style="font-size:0.75rem;color:#e9d5ff;font-weight:700;">Memproses...</div>
          <div class="ttg-progress-bar-bg">
            <div id="ttg-progress-fill" class="ttg-progress-bar-fill"></div>
          </div>
        </div>
      </div>

      <!-- 4. TIMELINE OTOMATIS (OPSIONAL EDIT) -->
      <div id="ttg-timeline-card" class="ttg-card" style="display:none;">
        <div class="ttg-card-head">
          <span class="ttg-card-title">4. Timeline &amp; Teks Otomatis Per-Frame</span>
          <span style="font-size:0.7rem;color:#94a3b8;">Opsional Edit</span>
        </div>
        <div id="ttg-timeline-list" class="ttg-timeline-list"></div>
      </div>

      <!-- 5. PREVIEW & DOWNLOAD VIDEO -->
      <div id="ttg-preview-card" class="ttg-card" style="display:none;border-color:rgba(16,185,129,0.55);">
        <div class="ttg-card-head">
          <span class="ttg-card-title" style="color:#34d399;">✅ Hasil Video Affiliate TikTok 9:16</span>
        </div>
        <video id="ttg-final-video" controls playsinline style="width:100%;aspect-ratio:9/16;border-radius:14px;background:#000;"></video>
        <a id="ttg-download-btn" class="ttg-generate-btn" style="display:block;text-align:center;text-decoration:none;margin-top:12px;background:linear-gradient(135deg,#10b981,#06b6d4);color:#041318;">
          ⬇️ DOWNLOAD MP4 TIKTOK
        </a>
      </div>
    </section>`;

const sectionRegex = /<section id="page-affiliate-tiktok" class="page">[\s\S]*?<\/section>/;
if (sectionRegex.test(html)) {
  html = html.replace(sectionRegex, newSectionHtml);
  html = html.replace("affiliate-tiktok/tiktok-go.css?v=1", "affiliate-tiktok/tiktok-go.css?v=2");
  html = html.replace("affiliate-tiktok/tiktok-go.js?v=1", "affiliate-tiktok/tiktok-go.js?v=2");
  fs.writeFileSync(path.join(cwd, "public/index.html"), html);
  console.log("✅ public/index.html berhasil diperbarui ke v2!");
} else {
  console.error("⚠️ Section #page-affiliate-tiktok tidak ditemukan di public/index.html");
}
