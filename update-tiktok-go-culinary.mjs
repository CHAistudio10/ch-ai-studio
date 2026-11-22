import fs from 'fs';
import path from 'path';

const targetDir = path.join(process.cwd(), 'public', 'modules', 'tiktok-go');
fs.mkdirSync(targetDir, { recursive: true });

const files = {
  'tiktok-go-state.js': `const STORAGE_KEY = 'ch_ai_studio_tiktok_go_projects_v2';

export class RestaurantProjectManager {
  constructor() {
    this.projects = this.loadProjects();
    this.activeProjectId = null;
  }

  loadProjects() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.error('[TikTok Go] Gagal memuat proyek:', e);
      return {};
    }
  }

  saveProjects() {
    try {
      const serializable = {};
      for (const [id, proj] of Object.entries(this.projects)) {
        serializable[id] = {
          ...proj,
          photos: proj.photos.map(p => ({
            id: p.id,
            name: p.name,
            order: p.order,
            sceneText: p.sceneText,
            effect: p.effect,
            dataUrl: p.dataUrl
          }))
        };
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    } catch (e) {
      console.warn('[TikTok Go] Penyimpanan penuh, menyimpan ke sesi aktif.');
    }
  }

  createNewProject(initialName = 'Restoran Baru') {
    const id = \`resto_\${Date.now()}_\${Math.random().toString(36).substring(2, 7)}\`;
    const newProject = {
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      restaurantData: {
        name: initialName,
        menuName: '',
        location: '',
        normalPrice: '',
        promoPrice: '',
        promoInfo: '',
        highlights: '',
        tiktokLocationTag: '',
        tiktokPromoTag: ''
      },
      promptInstruction: 'Buat storytelling promosi restoran yang unik, lucu, bikin penasaran, dan membuat orang ingin datang.',
      photos: [],
      audioConfig: {
        fileName: null,
        startTime: 0,
        duration: 20,
        bpm: 120,
        beatTimestamps: []
      },
      generatedContent: {
        scenes: [],
        caption: '',
        hashtags: ''
      },
      renderSettings: {
        resolution: '1080x1920',
        fps: 30
      }
    };

    this.projects[id] = newProject;
    this.activeProjectId = id;
    this.saveProjects();
    return newProject;
  }

  getActiveProject() {
    if (!this.activeProjectId || !this.projects[this.activeProjectId]) {
      const ids = Object.keys(this.projects);
      if (ids.length > 0) {
        this.activeProjectId = ids[0];
      } else {
        return this.createNewProject();
      }
    }
    return this.projects[this.activeProjectId];
  }

  switchProject(projectId) {
    if (this.projects[projectId]) {
      this.activeProjectId = projectId;
      return this.projects[projectId];
    }
    return null;
  }

  updateRestaurantData(data) {
    const proj = this.getActiveProject();
    proj.restaurantData = { ...proj.restaurantData, ...data };
    proj.updatedAt = new Date().toISOString();
    this.saveProjects();
    return proj;
  }

  deleteProject(projectId) {
    delete this.projects[projectId];
    if (this.activeProjectId === projectId) {
      this.activeProjectId = null;
    }
    this.saveProjects();
  }
}
`,

  'tiktok-go-storyteller.js': `const HOOK_TEMPLATES = [
  "Jujur, awalnya gak nyangka di {location_short} ada tempat se-menarik ini...",
  "Tolong jangan skip kalau kamu lagi cari tempat makan di {location_short}!",
  "Plot twist kuliner hari ini: nemu {name} yang lagi ada penawaran khusus.",
  "Warga {location_short}, fix kalian wajib tahu tempat satu ini sebelum makin rame!",
  "Niatnya cuma lewat, eh malah salfok sama {menuName} di {name}."
];

const CURIOSITY_TEMPLATES = [
  "Dari luar kelihatan tenang, pas masuk suasananya bikin betah banget.",
  "Banyak yang belum ngeh kalau di sini ada {menuName} dengan konsep kayak gini.",
  "Lihat tampilan menunya aja udah bikin pengen langsung mampir sekarang juga.",
  "Tempatnya cocok banget buat agenda makan bareng atau sekadar mampir santai."
];

const CTA_MAPS_OPTIONS = [
  "Mau tahu tempatnya? Klik tag lokasi di video ini.",
  "Simpan tempatnya, klik tag Maps untuk melihat lokasi restorannya.",
  "Kalau mau mampir, langsung klik lokasi yang sudah ditandai."
];

const CTA_PROMO_OPTIONS = [
  "Penasaran sama promonya? Klik tag promo TikTok di video ini.",
  "Mau pesan paketnya? Klik promo TikTok, pembelian di sini.",
  "Jangan cuma lihat makanannya, cek promonya lewat tag TikTok."
];

export class CulinaryStoryteller {
  static generateStoryboard(project) {
    const { restaurantData, photos, promptInstruction } = project;
    const totalFrames = photos.length;

    if (totalFrames < 5) {
      throw new Error('Minimal upload 5 foto restoran/makanan untuk membuat alur cerita.');
    }

    const name = restaurantData.name.trim() || 'Restoran Ini';
    const menu = restaurantData.menuName.trim() || 'Menu Spesial';
    const location = restaurantData.location.trim() || 'lokasi ini';
    const locationShort = location.split(',')[0].trim();
    const highlights = restaurantData.highlights.trim();
    const promoInfo = restaurantData.promoInfo.trim();

    let priceText = '';
    if (restaurantData.normalPrice && restaurantData.promoPrice) {
      priceText = \`Dari Rp\${restaurantData.normalPrice} jadi Rp\${restaurantData.promoPrice}\`;
    } else if (restaurantData.promoPrice) {
      priceText = \`Promo mulai Rp\${restaurantData.promoPrice}\`;
    } else if (restaurantData.normalPrice) {
      priceText = \`Harga Rp\${restaurantData.normalPrice}\`;
    }

    const isFunny = /lucu|absurd|komedi|receh/i.test(promptInstruction);
    const narrativeBlocks = [];

    let hook = HOOK_TEMPLATES[Math.floor(Math.random() * HOOK_TEMPLATES.length)]
      .replace('{location_short}', locationShort)
      .replace('{name}', name)
      .replace('{menuName}', menu);
    if (isFunny) {
      hook = \`Dompet aman, perut senang? Cek dulu \${name} sebelum kalap!\`;
    }
    narrativeBlocks.push({ phase: 'HOOK', text: hook });

    const curiosity = CURIOSITY_TEMPLATES[Math.floor(Math.random() * CURIOSITY_TEMPLATES.length)]
      .replace('{menuName}', menu);
    narrativeBlocks.push({ phase: 'CURIOSITY', text: curiosity });

    narrativeBlocks.push({
      phase: 'INTRO_RESTO',
      text: \`Kenalin, ini \${name} yang berlokasi di \${location}.\`
    });

    const detailPool = [
      \`Salah satu andalannya ada \${menu}.\`,
      highlights ? \`Keunggulannya: \${highlights}.\` : \`Menu dan suasananya pas banget buat masuk wishlist kuliner kamu.\`,
      promoInfo ? \`Info spesial: \${promoInfo}.\` : \`Tersedia pilihan paket makan yang praktis buat dipesan.\`,
      priceText ? \`\${priceText} — cek detail lengkapnya di tag promo.\` : \`Cek penawaran paket makannya langsung lewat tag TikTok.\`,
      \`Cocok buat kamu yang lagi cari referensi tempat makan di sekitar \${locationShort}.\`,
      \`Dari tampilan hidangan sampai sudut tempatnya siap nemenin waktu makanmu.\`
    ];

    const middleSlots = Math.max(1, totalFrames - 5);
    for (let i = 0; i < middleSlots; i++) {
      const text = detailPool[i % detailPool.length];
      narrativeBlocks.push({ phase: 'SHOWCASE', text });
    }

    const ctaMaps = CTA_MAPS_OPTIONS[Math.floor(Math.random() * CTA_MAPS_OPTIONS.length)];
    narrativeBlocks.push({ phase: 'CTA_MAPS', text: ctaMaps });

    const ctaPromo = CTA_PROMO_OPTIONS[Math.floor(Math.random() * CTA_PROMO_OPTIONS.length)];
    narrativeBlocks.push({ phase: 'CTA_PROMO', text: ctaPromo });

    const mappedScenes = photos.map((photo, index) => {
      const block = narrativeBlocks[index] || {
        phase: 'EXTRA',
        text: \`\${name} — \${menu}. Cek lokasi & promonya sekarang!\`
      };
      return {
        photoId: photo.id,
        frameIndex: index + 1,
        phase: block.phase,
        text: block.text
      };
    });

    const captionData = this.generateCaptionAndHashtags(restaurantData, ctaMaps, ctaPromo);

    return {
      scenes: mappedScenes,
      caption: captionData.caption,
      hashtags: captionData.hashtags
    };
  }

  static generateCaptionAndHashtags(data, ctaMaps, ctaPromo) {
    const name = data.name.trim() || '[Nama Restoran]';
    const menu = data.menuName.trim() || '[Nama Menu/Paket Promo]';
    const location = data.location.trim();

    let priceLine = '';
    if (data.normalPrice && data.promoPrice) {
      priceLine = \`Harga normal Rp\${data.normalPrice}, sekarang promo Rp\${data.promoPrice}.\\n\`;
    } else if (data.promoPrice) {
      priceLine = \`Penawaran promo mulai Rp\${data.promoPrice}.\\n\`;
    } else if (data.normalPrice) {
      priceLine = \`Harga mulai Rp\${data.normalPrice}.\\n\`;
    }

    const promoDetailLine = data.promoInfo ? \`Info promo: \${data.promoInfo}.\\n\` : '';
    const locationLine = location ? \`Lokasi: \${location}.\\n\` : '';

    const caption = [
      \`Lagi cari tempat makan yang menarik buat dikunjungi? Coba cek \${name}.\`,
      \`Ada \${menu} yang bisa kamu cek penawarannya.\`,
      priceLine.trim(),
      promoDetailLine.trim(),
      locationLine.trim(),
      \`\`,
      \`📍 \${ctaMaps}\`,
      \`🎟️ \${ctaPromo}\`
    ]
      .filter((line, idx, arr) => !(line === '' && arr[idx - 1] === ''))
      .join('\\n');

    const cleanTag = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

    const tags = new Set([
      '#kuliner',
      '#rekomendasimakanan',
      '#tiktokfood',
      '#promomakanan',
      '#tempatmakan',
      name !== '[Nama Restoran]' ? \`#\${cleanTag(name)}\` : null,
      menu !== '[Nama Menu/Paket Promo]' ? \`#\${cleanTag(menu)}\` : null,
      location ? \`#kuliner\${cleanTag(location.split(',')[0])}\` : null
    ]);

    return {
      caption,
      hashtags: Array.from(tags).filter(Boolean).join(' ')
    };
  }
}
`,

  'tiktok-go-audio.js': `export class BeatSyncAudioEngine {
  constructor() {
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.audioBuffer = null;
    this.startTime = 0;
    this.clipDuration = 20;
    this.beats = [];
  }

  async loadAudioFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
    this.startTime = 0;
    this.clipDuration = Math.min(20, this.audioBuffer.duration);
    this.analyzeBeats();
    return {
      totalDuration: this.audioBuffer.duration,
      clipDuration: this.clipDuration,
      beats: this.beats
    };
  }

  setTrimWindow(startTimeSeconds, durationSeconds = 20) {
    if (!this.audioBuffer) return;
    const maxStart = Math.max(0, this.audioBuffer.duration - 1);
    this.startTime = Math.min(Math.max(0, startTimeSeconds), maxStart);
    this.clipDuration = Math.min(durationSeconds, this.audioBuffer.duration - this.startTime);
    this.analyzeBeats();
  }

  analyzeBeats() {
    if (!this.audioBuffer) return [];

    const sampleRate = this.audioBuffer.sampleRate;
    const startSample = Math.floor(this.startTime * sampleRate);
    const endSample = Math.floor((this.startTime + this.clipDuration) * sampleRate);
    const channelData = this.audioBuffer.getChannelData(0);

    const windowSize = Math.floor(sampleRate * 0.05);
    const energies = [];

    for (let i = startSample; i < endSample; i += windowSize) {
      let sum = 0;
      for (let j = 0; j < windowSize && i + j < endSample; j++) {
        sum += channelData[i + j] * channelData[i + j];
      }
      energies.push({
        time: (i - startSample) / sampleRate,
        energy: Math.sqrt(sum / windowSize)
      });
    }

    const avgEnergy = energies.reduce((acc, e) => acc + e.energy, 0) / (energies.length || 1);
    const threshold = avgEnergy * 1.35;

    const detectedBeats = [];
    let lastBeatTime = -0.35;

    for (const item of energies) {
      if (item.energy > threshold && item.time - lastBeatTime >= 0.35) {
        detectedBeats.push(Number(item.time.toFixed(2)));
        lastBeatTime = item.time;
      }
    }

    this.beats = detectedBeats;
    return detectedBeats;
  }
}
`,

  'tiktok-go-renderer.js': `export class TikTokGoVideoRenderer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.isRendering = false;
  }

  setResolution(mode = '1080x1920') {
    if (mode === '720x1280') {
      this.canvas.width = 720;
      this.canvas.height = 1280;
    } else {
      this.canvas.width = 1080;
      this.canvas.height = 1920;
    }
  }

  renderFrame({ t, totalDuration, images, scenes, beats, restaurantData }) {
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    ctx.fillStyle = '#07070D';
    ctx.fillRect(0, 0, width, height);

    const numScenes = scenes.length;
    if (numScenes === 0 || images.length === 0) return;

    const sceneDuration = totalDuration / numScenes;
    const sceneIndex = Math.min(numScenes - 1, Math.floor(t / sceneDuration));
    const sceneLocalTime = t - sceneIndex * sceneDuration;
    const sceneProgress = sceneLocalTime / sceneDuration;

    const currentImg = images[sceneIndex % images.length];
    const currentScene = scenes[sceneIndex];
    const isOnBeat = beats.some(b => Math.abs(b - t) < 0.08);

    ctx.save();

    const baseZoom = 1.0 + sceneProgress * 0.12;
    const beatPulse = isOnBeat ? 0.04 : 0;
    const scale = baseZoom + beatPulse;

    let offsetX = 0;
    let offsetY = 0;
    if (isOnBeat) {
      offsetX = (Math.random() - 0.5) * 14;
      offsetY = (Math.random() - 0.5) * 14;
    }

    ctx.translate(width / 2 + offsetX, height / 2 + offsetY);
    ctx.scale(scale, scale);

    if (currentImg && currentImg.complete) {
      const imgRatio = currentImg.width / currentImg.height;
      const canvasRatio = width / height;
      let drawW, drawH;

      if (imgRatio > canvasRatio) {
        drawH = height;
        drawW = height * imgRatio;
      } else {
        drawW = width;
        drawH = width / imgRatio;
      }
      ctx.drawImage(currentImg, -drawW / 2, -drawH / 2, drawW, drawH);
    }

    ctx.restore();

    if (isOnBeat) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.fillRect(0, 0, width, height);
    }

    const topGrad = ctx.createLinearGradient(0, 0, 0, height * 0.22);
    topGrad.addColorStop(0, 'rgba(5, 5, 12, 0.8)');
    topGrad.addColorStop(1, 'rgba(5, 5, 12, 0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, width, height * 0.22);

    const botGrad = ctx.createLinearGradient(0, height * 0.58, 0, height);
    botGrad.addColorStop(0, 'rgba(5, 5, 12, 0)');
    botGrad.addColorStop(1, 'rgba(5, 5, 12, 0.92)');
    ctx.fillStyle = botGrad;
    ctx.fillRect(0, height * 0.58, width, height * 0.42);

    this.drawTopBadge(ctx, width, restaurantData);
    this.drawStoryText(ctx, width, height, currentScene, sceneLocalTime);

    if (currentScene.phase === 'CTA_MAPS' || currentScene.phase === 'CTA_PROMO') {
      this.drawCtaOverlay(ctx, width, height, currentScene.phase, restaurantData);
    }
  }

  drawTopBadge(ctx, width, data) {
    const pad = width * 0.05;
    ctx.save();
    ctx.fillStyle = 'rgba(18, 18, 30, 0.78)';
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 2;

    const boxW = width * 0.65;
    const boxH = width * 0.085;
    ctx.beginPath();
    ctx.roundRect(pad, pad * 1.4, boxW, boxH, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = \`bold \${Math.round(width * 0.032)}px Inter, sans-serif\`;
    ctx.fillText(\`📍 \${data.name || 'Nama Restoran'}\`, pad + 20, pad * 1.4 + boxH * 0.62);
    ctx.restore();
  }

  drawStoryText(ctx, width, height, scene, localTime) {
    const alpha = Math.min(1, localTime * 4);
    ctx.save();
    ctx.globalAlpha = alpha;

    const fontSize = Math.round(width * 0.044);
    ctx.font = \`800 \${fontSize}px Inter, sans-serif\`;
    ctx.textAlign = 'center';

    const maxTextWidth = width * 0.84;
    const words = scene.text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? \`\${currentLine} \${word}\` : word;
      if (ctx.measureText(testLine).width > maxTextWidth) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    const startY = height * 0.72;
    const lineHeight = fontSize * 1.32;

    lines.forEach((line, idx) => {
      const y = startY + idx * lineHeight;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = Math.round(fontSize * 0.22);
      ctx.strokeText(line, width / 2, y);

      ctx.fillStyle = idx === 0 && scene.phase === 'HOOK' ? '#00F0FF' : '#FFFFFF';
      ctx.fillText(line, width / 2, y);
    });

    ctx.restore();
  }

  drawCtaOverlay(ctx, width, height, phase, data) {
    ctx.save();
    const boxW = width * 0.82;
    const boxH = width * 0.13;
    const x = (width - boxW) / 2;
    const y = height * 0.52;

    const grad = ctx.createLinearGradient(x, y, x + boxW, y + boxH);
    if (phase === 'CTA_MAPS') {
      grad.addColorStop(0, '#00B4DB');
      grad.addColorStop(1, '#0083B0');
    } else {
      grad.addColorStop(0, '#8E2DE2');
      grad.addColorStop(1, '#4A00E0');
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, boxW, boxH, 24);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.font = \`bold \${Math.round(width * 0.036)}px Inter, sans-serif\`;

    const title = phase === 'CTA_MAPS'
      ? \`🗺️ KLIK TAG MAPS: \${data.tiktokLocationTag || data.name || 'Lokasi Restoran'}\`
      : \`🎟️ KLIK PROMO TIKTOK: \${data.tiktokPromoTag || data.menuName || 'Paket Promo'}\`;

    ctx.fillText(title, width / 2, y + boxH * 0.6);
    ctx.restore();
  }

  async exportVideo({ totalDuration, fps = 30, renderParams, audioStream = null, onProgress }) {
    if (this.isRendering) return null;
    this.isRendering = true;

    const canvasStream = this.canvas.captureStream(fps);
    if (audioStream) {
      audioStream.getAudioTracks().forEach(track => canvasStream.addTrack(track));
    }

    const mimeTypes = [
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm'
    ];
    const selectedMime = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || '';

    const recorder = new MediaRecorder(canvasStream, {
      mimeType: selectedMime,
      videoBitsPerSecond: this.canvas.width === 1080 ? 8_000_000 : 4_500_000
    });

    const chunks = [];
    recorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    return new Promise((resolve) => {
      recorder.onstop = () => {
        this.isRendering = false;
        const blob = new Blob(chunks, { type: selectedMime || 'video/mp4' });
        const url = URL.createObjectURL(blob);
        resolve({ blob, url, mimeType: selectedMime });
      };

      recorder.start();

      const totalFrames = Math.ceil(totalDuration * fps);
      let currentFrame = 0;
      const frameIntervalMs = 1000 / fps;

      const timer = setInterval(() => {
        const t = currentFrame / fps;
        this.renderFrame({ ...renderParams, t, totalDuration });

        if (onProgress) {
          onProgress(Math.min(100, Math.round((currentFrame / totalFrames) * 100)));
        }

        currentFrame++;
        if (currentFrame > totalFrames) {
          clearInterval(timer);
          recorder.stop();
        }
      }, frameIntervalMs);
    });
  }
}
`,

  'tiktok-go-ui.js': `import { RestaurantProjectManager } from './tiktok-go-state.js';
import { CulinaryStoryteller } from './tiktok-go-storyteller.js';
import { BeatSyncAudioEngine } from './tiktok-go-audio.js';
import { TikTokGoVideoRenderer } from './tiktok-go-renderer.js';

export function initTikTokGoModule(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const projectManager = new RestaurantProjectManager();
  const audioEngine = new BeatSyncAudioEngine();
  let loadedImages = [];
  let previewAnimId = null;

  container.innerHTML = \`
    <div class="ch-tiktok-go-wrapper" style="background:#0B0B14; color:#F3F4F6; border:1px solid #2A244D; border-radius:16px; padding:20px; font-family:Inter,sans-serif;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; border-bottom:1px solid #1F1B38; padding-bottom:16px; margin-bottom:20px;">
        <div>
          <span style="background:linear-gradient(90deg,#8E2DE2,#00F0FF); -webkit-background-clip:text; -webkit-text-fill-color:transparent; font-weight:800; font-size:12px; letter-spacing:1px;">
            CH AI STUDIO • CULINARY & MAPS EDITION
          </span>
          <h2 style="margin:4px 0 0; font-size:20px; color:#FFFFFF;">CH AI AFFILIATE TIKTOK GO</h2>
        </div>

        <div style="display:flex; gap:8px; align-items:center;">
          <select id="tg-project-select" style="background:#141324; color:#FFF; border:1px solid #3B336B; padding:8px 12px; border-radius:8px;"></select>
          <button id="tg-new-project-btn" style="background:linear-gradient(135deg,#7B2CBF,#00B4D8); color:#FFF; border:none; padding:8px 14px; border-radius:8px; font-weight:600; cursor:pointer;">
            + Proyek Restoran Baru
          </button>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1.2fr 0.8fr; gap:24px;">
        <div style="display:flex; flex-direction:column; gap:18px;">
          <section style="background:#121122; padding:16px; border-radius:12px; border:1px solid #252042;">
            <h3 style="margin:0 0 12px; font-size:15px; color:#00F0FF;">1. Data Restoran & Promo (Terisolasi per Proyek)</h3>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <input id="tg-name" placeholder="Nama Restoran *" class="tg-input" />
              <input id="tg-menu" placeholder="Nama Menu / Paket Promo *" class="tg-input" />
              <input id="tg-location" placeholder="Lokasi / Alamat Restoran *" class="tg-input" style="grid-column:span 2;" />
              <input id="tg-normal-price" placeholder="Harga Normal (Opsional, mis: 45.000)" class="tg-input" />
              <input id="tg-promo-price" placeholder="Harga Promo (Opsional, mis: 29.000)" class="tg-input" />
              <input id="tg-promo-info" placeholder="Informasi Promo (mis: Paket Berdua / Voucher TikTok)" class="tg-input" style="grid-column:span 2;" />
              <textarea id="tg-highlights" rows="2" placeholder="Keunggulan / Deskripsi Makanan (sesuai fakta)" class="tg-input" style="grid-column:span 2;"></textarea>
              <input id="tg-tag-maps" placeholder="Nama Tag Lokasi TikTok Maps" class="tg-input" />
              <input id="tg-tag-promo" placeholder="Nama Tag Promo / Produk TikTok" class="tg-input" />
            </div>
          </section>

          <section style="background:#121122; padding:16px; border-radius:12px; border:1px solid #252042;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <h3 style="margin:0; font-size:15px; color:#00F0FF;">2. Foto Restoran & Makanan (5–20 Foto)</h3>
              <span id="tg-photo-count" style="font-size:12px; color:#A78BFA;">0 / 20 Foto</span>
            </div>
            <input type="file" id="tg-photo-input" accept="image/*" multiple style="margin-bottom:12px; color:#CBD5E1;" />
            <div id="tg-photo-grid" style="display:grid; grid-template-columns:repeat(5, 1fr); gap:8px;"></div>
          </section>

          <section style="background:#121122; padding:16px; border-radius:12px; border:1px solid #252042;">
            <h3 style="margin:0 0 8px; font-size:15px; color:#00F0FF;">3. Satu Instruksi Storytelling Otomatis</h3>
            <textarea id="tg-prompt" rows="2" class="tg-input" style="width:100%;"></textarea>
            <button id="tg-generate-story-btn" style="margin-top:10px; width:100%; background:#8E2DE2; color:#FFF; border:none; padding:10px; border-radius:8px; font-weight:700; cursor:pointer;">
              ✨ Generate Storytelling, Teks Tiap Frame & Caption
            </button>
          </section>

          <section style="background:#121122; padding:16px; border-radius:12px; border:1px solid #252042;">
            <h3 style="margin:0 0 10px; font-size:15px; color:#00F0FF;">4. Musik Latar & Beat Sync (Default 20 Detik)</h3>
            <input type="file" id="tg-audio-input" accept="audio/*" style="margin-bottom:10px; color:#CBD5E1;" />
            <div style="display:flex; gap:12px; align-items:center; font-size:13px;">
              <label>Mulai Detik ke-: <input type="number" id="tg-audio-start" value="0" min="0" step="1" style="width:65px; background:#1B1933; color:#FFF; border:1px solid #3B336B; padding:4px; border-radius:6px;" /></label>
              <span id="tg-beat-status" style="color:#34D399;">Belum ada audio</span>
            </div>
          </section>

          <section style="background:#121122; padding:16px; border-radius:12px; border:1px solid #252042;">
            <h3 style="margin:0 0 8px; font-size:15px; color:#00F0FF;">5. Caption, Hashtag & Panduan Tag TikTok</h3>
            <textarea id="tg-caption-output" rows="6" class="tg-input" style="width:100%; font-size:13px;"></textarea>
            <div style="display:flex; gap:8px; margin-top:8px;">
              <button id="tg-copy-caption-btn" style="background:#1E293B; color:#00F0FF; border:1px solid #00F0FF; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:12px;">
                📋 Salin Caption & Hashtag
              </button>
            </div>

            <div style="margin-top:14px; background:#191630; border-left:3px solid #00F0FF; padding:10px 12px; border-radius:6px; font-size:12px; line-height:1.5; color:#D1D5DB;">
              <strong style="color:#00F0FF;">Panduan Upload ke TikTok (Wajib Agar Konversi Maksimal):</strong>
              <ol style="margin:6px 0 0 16px; padding:0;">
                <li>Unggah file MP4 hasil render dari CH AI Studio ke aplikasi TikTok.</li>
                <li>Pada halaman posting TikTok, klik <strong>"+ Tambah Tautan / Add Link"</strong>.</li>
                <li>Pilih <strong>Lokasi (Maps)</strong> dan cari: <span id="tg-guide-maps" style="color:#A78BFA; font-weight:600;">-</span>.</li>
                <li>Tambahkan tautan <strong>Promo / Produk TikTok</strong> restoran: <span id="tg-guide-promo" style="color:#A78BFA; font-weight:600;">-</span>.</li>
                <li>Tempel caption & hashtag di atas agar selaras dengan CTA di akhir video.</li>
              </ol>
            </div>
          </section>
        </div>

        <div style="display:flex; flex-direction:column; align-items:center; background:#121122; padding:16px; border-radius:12px; border:1px solid #252042;">
          <div style="width:100%; display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <span style="font-size:13px; font-weight:700; color:#A78BFA;">PREVIEW 9:16 (30 FPS)</span>
            <select id="tg-res-select" style="background:#1B1933; color:#FFF; border:1px solid #3B336B; padding:4px 8px; border-radius:6px; font-size:12px;">
              <option value="1080x1920">1080 × 1920 (Full HD)</option>
              <option value="720x1280">720 × 1280 (Mode Ringan)</option>
            </select>
          </div>

          <canvas id="tg-preview-canvas" width="720" height="1280" style="width:100%; max-width:320px; aspect-ratio:9/16; background:#05050A; border-radius:14px; border:1px solid #3B336B;"></canvas>

          <div style="width:100%; display:flex; flex-direction:column; gap:8px; margin-top:14px;">
            <button id="tg-preview-btn" style="background:#1E1B4B; color:#00F0FF; border:1px solid #00F0FF; padding:10px; border-radius:8px; font-weight:600; cursor:pointer;">
              ▶️ Putar Preview Video
            </button>
            <button id="tg-render-btn" style="background:linear-gradient(90deg,#8E2DE2,#00F0FF); color:#05050A; border:none; padding:12px; border-radius:8px; font-weight:800; cursor:pointer;">
              ⬇️ Render & Download Video MP4
            </button>
            <div id="tg-render-progress" style="font-size:12px; text-align:center; color:#A78BFA;"></div>
          </div>

          <div style="width:100%; margin-top:16px;">
            <h4 style="margin:0 0 8px; font-size:13px; color:#00F0FF;">Teks Otomatis per Scene Foto:</h4>
            <div id="tg-scene-list" style="max-height:240px; overflow-y:auto; display:flex; flex-direction:column; gap:6px; font-size:12px;"></div>
          </div>
        </div>
      </div>
    </div>
    <style>
      .tg-input { background:#19182E; color:#FFF; border:1px solid #322B5C; padding:9px 11px; border-radius:8px; font-size:13px; outline:none; }
      .tg-input:focus { border-color:#00F0FF; }
    </style>
  \`;

  const canvas = document.getElementById('tg-preview-canvas');
  const renderer = new TikTokGoVideoRenderer(canvas);

  function syncUiFromProject() {
    const proj = projectManager.getActiveProject();
    const d = proj.restaurantData;

    const select = document.getElementById('tg-project-select');
    select.innerHTML = Object.values(projectManager.projects)
      .map(p => \`<option value="\${p.id}" \${p.id === proj.id ? 'selected' : ''}>\${p.restaurantData.name || 'Restoran Baru'}</option>\`)
      .join('');

    document.getElementById('tg-name').value = d.name;
    document.getElementById('tg-menu').value = d.menuName;
    document.getElementById('tg-location').value = d.location;
    document.getElementById('tg-normal-price').value = d.normalPrice;
    document.getElementById('tg-promo-price').value = d.promoPrice;
    document.getElementById('tg-promo-info').value = d.promoInfo;
    document.getElementById('tg-highlights').value = d.highlights;
    document.getElementById('tg-tag-maps').value = d.tiktokLocationTag;
    document.getElementById('tg-tag-promo').value = d.tiktokPromoTag;
    document.getElementById('tg-prompt').value = proj.promptInstruction;
    document.getElementById('tg-caption-output').value = proj.generatedContent.caption
      ? \`\${proj.generatedContent.caption}\\n\\n\${proj.generatedContent.hashtags}\`
      : '';

    document.getElementById('tg-guide-maps').textContent = d.tiktokLocationTag || d.name || '(Isi nama/tag lokasi)';
    document.getElementById('tg-guide-promo').textContent = d.tiktokPromoTag || d.menuName || '(Isi nama tag promo)';

    renderPhotoGrid(proj);
    renderSceneList(proj);
  }

  function renderPhotoGrid(proj) {
    const grid = document.getElementById('tg-photo-grid');
    document.getElementById('tg-photo-count').textContent = \`\${proj.photos.length} / 20 Foto\`;

    grid.innerHTML = proj.photos
      .map((p, idx) => \`
        <div style="position:relative; aspect-ratio:9/16; border-radius:6px; overflow:hidden; border:1px solid #3B336B;">
          <img src="\${p.dataUrl}" style="width:100%; height:100%; object-fit:cover;" />
          <span style="position:absolute; top:4px; left:4px; background:rgba(0,0,0,0.75); color:#00F0FF; font-size:10px; padding:2px 5px; border-radius:4px;">#\${idx + 1}</span>
          <div style="position:absolute; bottom:2px; right:2px; display:flex; gap:2px;">
            \${idx > 0 ? \`<button data-move="-1" data-idx="\${idx}" style="background:#000; color:#FFF; border:none; font-size:10px; cursor:pointer;">◀</button>\` : ''}
            \${idx < proj.photos.length - 1 ? \`<button data-move="1" data-idx="\${idx}" style="background:#000; color:#FFF; border:none; font-size:10px; cursor:pointer;">▶</button>\` : ''}
          </div>
        </div>
      \`)
      .join('');

    grid.querySelectorAll('button[data-move]').forEach(btn => {
      btn.onclick = () => {
        const idx = Number(btn.dataset.idx);
        const dir = Number(btn.dataset.move);
        const arr = proj.photos;
        [arr[idx], arr[idx + dir]] = [arr[idx + dir], arr[idx]];
        [loadedImages[idx], loadedImages[idx + dir]] = [loadedImages[idx + dir], loadedImages[idx]];
        projectManager.saveProjects();
        renderPhotoGrid(proj);
      };
    });
  }

  function renderSceneList(proj) {
    const list = document.getElementById('tg-scene-list');
    list.innerHTML = (proj.generatedContent.scenes || [])
      .map(s => \`
        <div style="background:#19182E; padding:8px; border-radius:6px; border-left:2px solid #8E2DE2;">
          <strong style="color:#00F0FF;">Frame \${s.frameIndex} (\${s.phase}):</strong>
          <div style="color:#E5E7EB; margin-top:2px;">\${s.text}</div>
        </div>
      \`)
      .join('');
  }

  const fieldMap = {
    'tg-name': 'name',
    'tg-menu': 'menuName',
    'tg-location': 'location',
    'tg-normal-price': 'normalPrice',
    'tg-promo-price': 'promoPrice',
    'tg-promo-info': 'promoInfo',
    'tg-highlights': 'highlights',
    'tg-tag-maps': 'tiktokLocationTag',
    'tg-tag-promo': 'tiktokPromoTag'
  };

  Object.entries(fieldMap).forEach(([elId, key]) => {
    document.getElementById(elId).addEventListener('input', e => {
      projectManager.updateRestaurantData({ [key]: e.target.value });
      if (key === 'name' || key === 'tiktokLocationTag' || key === 'tiktokPromoTag' || key === 'menuName') {
        const proj = projectManager.getActiveProject();
        document.getElementById('tg-guide-maps').textContent = proj.restaurantData.tiktokLocationTag || proj.restaurantData.name || '-';
        document.getElementById('tg-guide-promo').textContent = proj.restaurantData.tiktokPromoTag || proj.restaurantData.menuName || '-';
      }
    });
  });

  document.getElementById('tg-new-project-btn').onclick = () => {
    const nama = prompt('Masukkan nama restoran baru:', 'Restoran Baru');
    if (nama !== null) {
      loadedImages = [];
      projectManager.createNewProject(nama.trim() || 'Restoran Baru');
      syncUiFromProject();
    }
  };

  document.getElementById('tg-project-select').onchange = e => {
    loadedImages = [];
    projectManager.switchProject(e.target.value);
    syncUiFromProject();
  };

  document.getElementById('tg-photo-input').onchange = async e => {
    const files = Array.from(e.target.files).slice(0, 20);
    const proj = projectManager.getActiveProject();
    proj.photos = [];
    loadedImages = [];

    for (let i = 0; i < files.length; i++) {
      const dataUrl = await new Promise(res => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result);
        reader.readAsDataURL(files[i]);
      });

      const img = new Image();
      img.src = dataUrl;
      await new Promise(res => (img.onload = res));
      loadedImages.push(img);

      proj.photos.push({
        id: \`photo_\${i}_\${Date.now()}\`,
        name: files[i].name,
        order: i,
        dataUrl
      });
    }

    projectManager.saveProjects();
    renderPhotoGrid(proj);
  };

  document.getElementById('tg-generate-story-btn').onclick = () => {
    const proj = projectManager.getActiveProject();
    proj.promptInstruction = document.getElementById('tg-prompt').value;

    try {
      const result = CulinaryStoryteller.generateStoryboard(proj);
      proj.generatedContent = result;
      projectManager.saveProjects();
      syncUiFromProject();
    } catch (err) {
      alert(err.message);
    }
  };

  document.getElementById('tg-audio-input').onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    const info = await audioEngine.loadAudioFile(file);
    const proj = projectManager.getActiveProject();
    proj.audioConfig.fileName = file.name;
    proj.audioConfig.beatTimestamps = info.beats;
    document.getElementById('tg-beat-status').textContent = \`✓ \${file.name} (\${info.beats.length} beat terdeteksi • 20s)\`;
  };

  document.getElementById('tg-audio-start').onchange = e => {
    const startSec = Number(e.target.value) || 0;
    audioEngine.setTrimWindow(startSec, 20);
    const proj = projectManager.getActiveProject();
    proj.audioConfig.startTime = startSec;
    proj.audioConfig.beatTimestamps = audioEngine.beats;
    document.getElementById('tg-beat-status').textContent = \`✓ Trim \${startSec}s–\${startSec + 20}s (\${audioEngine.beats.length} beat)\`;
  };

  document.getElementById('tg-copy-caption-btn').onclick = () => {
    const text = document.getElementById('tg-caption-output').value;
    navigator.clipboard.writeText(text);
    alert('Caption & Hashtag berhasil disalin!');
  };

  document.getElementById('tg-preview-btn').onclick = () => {
    const proj = projectManager.getActiveProject();
    if (loadedImages.length < 5 || proj.generatedContent.scenes.length === 0) {
      alert('Upload minimal 5 foto dan klik Generate Storytelling terlebih dahulu.');
      return;
    }

    if (previewAnimId) cancelAnimationFrame(previewAnimId);
    const startPerf = performance.now();
    const totalDuration = audioEngine.clipDuration || 20;

    function loop(now) {
      const elapsed = (now - startPerf) / 1000;
      if (elapsed <= totalDuration) {
        renderer.renderFrame({
          t: elapsed,
          totalDuration,
          images: loadedImages,
          scenes: proj.generatedContent.scenes,
          beats: proj.audioConfig.beatTimestamps,
          restaurantData: proj.restaurantData
        });
        previewAnimId = requestAnimationFrame(loop);
      }
    }
    previewAnimId = requestAnimationFrame(loop);
  };

  document.getElementById('tg-render-btn').onclick = async () => {
    const proj = projectManager.getActiveProject();
    if (loadedImages.length < 5 || proj.generatedContent.scenes.length === 0) {
      alert('Pastikan minimal 5 foto terunggah dan storytelling sudah dibuat.');
      return;
    }

    const resMode = document.getElementById('tg-res-select').value;
    renderer.setResolution(resMode);

    const progressEl = document.getElementById('tg-render-progress');
    progressEl.textContent = 'Memulai render video 30 FPS...';

    const result = await renderer.exportVideo({
      totalDuration: audioEngine.clipDuration || 20,
      fps: 30,
      renderParams: {
        images: loadedImages,
        scenes: proj.generatedContent.scenes,
        beats: proj.audioConfig.beatTimestamps,
        restaurantData: proj.restaurantData
      },
      onProgress: pct => {
        progressEl.textContent = \`Merender video: \${pct}%\`;
      }
    });

    if (result && result.url) {
      const a = document.createElement('a');
      const safeName = (proj.restaurantData.name || 'restoran').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      a.href = result.url;
      a.download = \`ch-ai-tiktok-go-\${safeName}.mp4\`;
      a.click();
      progressEl.textContent = '✓ Selesai! File video berhasil diunduh.';
    }
  };

  syncUiFromProject();
}
`
};

for (const [filename, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(targetDir, filename), content, 'utf8');
  console.log('✓ Berhasil menulis:', filename);
}
console.log('\\nSemua 5 file modul CH AI AFFILIATE TIKTOK GO siap digunakan!');
