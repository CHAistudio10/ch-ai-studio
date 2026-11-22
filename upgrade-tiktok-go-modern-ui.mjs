import fs from 'fs';
import path from 'path';

const targetDir = path.join(process.cwd(), 'public', 'modules', 'tiktok-go');
fs.mkdirSync(targetDir, { recursive: true });

// 1. Perbarui tiktok-go-state.js (hilangkan label default "Restoran Baru")
const stateCode = `const STORAGE_KEY = 'ch_ai_studio_tiktok_go_projects_v3';

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
            dataUrl: p.dataUrl
          }))
        };
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    } catch (e) {
      console.warn('[TikTok Go] Penyimpanan penuh, menyimpan di sesi memori.');
    }
  }

  createNewProject(customName = '') {
    const count = Object.keys(this.projects).length + 1;
    const defaultLabel = customName.trim() || \`Proyek Kuliner #\${count}\`;
    const id = \`resto_\${Date.now()}_\${Math.random().toString(36).substring(2, 6)}\`;

    const newProject = {
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      restaurantData: {
        name: customName.trim() || '',
        displayLabel: defaultLabel,
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
        beatTimestamps: []
      },
      generatedContent: {
        scenes: [],
        caption: '',
        hashtags: ''
      },
      renderStatus: {
        progress: 0,
        completed: false,
        videoUrl: null
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
    if (data.name !== undefined && data.name.trim()) {
      proj.restaurantData.displayLabel = data.name.trim();
    }
    proj.updatedAt = new Date().toISOString();
    this.saveProjects();
    return proj;
  }
}
`;

// 2. Perbarui tiktok-go-ui.js sesuai desain modern compact mobile (IMG_20261122_032946.png)
const uiCode = `import { RestaurantProjectManager } from './tiktok-go-state.js';
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
  let activeStep = 1; // 1: Data, 2: Foto, 3: Musik & Cerita, 4: Render, 5: Selesai

  container.innerHTML = \`
    <div id="ttg-mobile-app" class="ttg-shell">
      <!-- KARTU IDENTITAS PROYEK RESTORAN AKTIF -->
      <div class="ttg-resto-banner">
        <div class="ttg-resto-thumb-wrap">
          <img id="ttg-banner-thumb" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='%231b1636'/%3E%3Ctext x='50%25' y='54%25' dominant-baseline='middle' text-anchor='middle' fill='%2300f0ff' font-size='26'%3E🍽️%3C/text%3E%3C/svg%3E" alt="Resto" />
        </div>
        <div class="ttg-resto-meta">
          <div class="ttg-resto-title-row">
            <select id="ttg-project-select" class="ttg-project-dropdown"></select>
            <span class="ttg-verified-dot">✓</span>
          </div>
          <div id="ttg-banner-address" class="ttg-resto-addr">📍 Lengkapi alamat restoran</div>
          <div class="ttg-resto-chips">
            <span class="ttg-chip">📷 <b id="ttg-chip-photos">0 Foto</b></span>
            <span class="ttg-chip">⏱️ <b>20s</b></span>
            <span class="ttg-chip">🎵 <b id="ttg-chip-music">Musik</b></span>
          </div>
        </div>
        <button type="button" id="ttg-new-project-btn" class="ttg-next-proj-btn" title="Buat Proyek Restoran Baru">›</button>
      </div>

      <!-- 5-STEP PROGRESS STEPPER -->
      <div class="ttg-stepper">
        <div class="ttg-stepper-line"></div>
        <button type="button" class="ttg-step active" data-step="1">
          <span class="ttg-step-circle">✓</span>
          <span class="ttg-step-label">Data<br>Restoran</span>
        </button>
        <button type="button" class="ttg-step" data-step="2">
          <span class="ttg-step-circle">2</span>
          <span class="ttg-step-label">Upload<br>Foto</span>
        </button>
        <button type="button" class="ttg-step" data-step="3">
          <span class="ttg-step-circle">3</span>
          <span class="ttg-step-label">Musik &amp;<br>Beat Sync</span>
        </button>
        <button type="button" class="ttg-step" data-step="4">
          <span class="ttg-step-circle">4</span>
          <span class="ttg-step-label">Render<br>Video</span>
        </button>
        <button type="button" class="ttg-step" data-step="5">
          <span class="ttg-step-circle">5</span>
          <span class="ttg-step-label">Selesai</span>
        </button>
      </div>

      <!-- AREA KONTEN 1 LAYAR PENUH (NO PAGE SCROLL) -->
      <div class="ttg-stage">
        
        <!-- STEP 1: DATA RESTORAN (KARTU-KARTU COMPACT) -->
        <div class="ttg-panel active" data-panel="1">
          <div class="ttg-glass-card">
            <div class="ttg-card-hdr">
              <span>🏪 Identitas &amp; Lokasi</span>
              <span class="ttg-badge-cyan">Wajib</span>
            </div>
            <div class="ttg-grid-2">
              <input id="ttg-name" class="ttg-field" placeholder="Nama Restoran" />
              <input id="ttg-menu" class="ttg-field" placeholder="Menu / Paket Promo" />
            </div>
            <input id="ttg-location" class="ttg-field" placeholder="Alamat / Lokasi Restoran" style="margin-top:6px;" />
          </div>

          <div class="ttg-glass-card">
            <div class="ttg-card-hdr">
              <span>🏷️ Penawaran &amp; Keunggulan</span>
              <span class="ttg-badge-purple">Opsional</span>
            </div>
            <div class="ttg-grid-2">
              <input id="ttg-normal-price" class="ttg-field" placeholder="Harga Normal" />
              <input id="ttg-promo-price" class="ttg-field" placeholder="Harga Promo" />
            </div>
            <div class="ttg-grid-2" style="margin-top:6px;">
              <input id="ttg-promo-info" class="ttg-field" placeholder="Info Promo TikTok" />
              <input id="ttg-highlights" class="ttg-field" placeholder="Keunggulan Menu" />
            </div>
          </div>

          <div class="ttg-glass-card">
            <div class="ttg-card-hdr">
              <span>📍 Tag Maps &amp; Tag Promo TikTok</span>
            </div>
            <div class="ttg-grid-2">
              <input id="ttg-tag-maps" class="ttg-field" placeholder="Tag Lokasi Maps" />
              <input id="ttg-tag-promo" class="ttg-field" placeholder="Tag Promo TikTok" />
            </div>
          </div>

          <button type="button" class="ttg-primary-btn" data-goto="2">
            Simpan &amp; Lanjut Upload Foto →
          </button>
        </div>

        <!-- STEP 2: UPLOAD 5-20 FOTO RESTORAN & MAKANAN -->
        <div class="ttg-panel" data-panel="2">
          <div class="ttg-glass-card" style="flex:1; display:flex; flex-direction:column; min-height:0;">
            <div class="ttg-card-hdr">
              <span>📸 Galeri Restoran &amp; Menu (5–20 Foto)</span>
              <span id="ttg-photo-count" class="ttg-badge-cyan">0 / 20</span>
            </div>
            <input type="file" id="ttg-photo-input" accept="image/*" multiple style="display:none;" />
            <button type="button" id="ttg-pick-photos-btn" class="ttg-upload-drop">
              + Pilih 5–20 Foto Makanan, Interior &amp; Menu
            </button>
            <div id="ttg-photo-grid" class="ttg-photo-grid"></div>
          </div>
          <button type="button" class="ttg-primary-btn" data-goto="3">
            Lanjut Musik &amp; Storytelling →
          </button>
        </div>

        <!-- STEP 3: MUSIK BEAT SYNC & SATU INSTRUKSI STORYTELLING -->
        <div class="ttg-panel" data-panel="3">
          <div class="ttg-glass-card">
            <div class="ttg-card-hdr">
              <span>🎵 Musik Latar &amp; Beat Sync</span>
              <span class="ttg-badge-purple">Default 20s</span>
            </div>
            <div style="display:flex; gap:6px; align-items:center;">
              <input type="file" id="ttg-audio-input" accept="audio/*" style="display:none;" />
              <button type="button" id="ttg-pick-audio-btn" class="ttg-secondary-btn" style="flex:1;">
                📁 Pilih Lagu Perangkat
              </button>
              <div class="ttg-trim-box">
                <span>Mulai:</span>
                <input type="number" id="ttg-audio-start" value="0" min="0" step="1" />
                <span>dtk</span>
              </div>
            </div>
            <div id="ttg-beat-status" class="ttg-mini-status">Belum ada audio dipilih</div>
          </div>

          <div class="ttg-glass-card" style="flex:1; display:flex; flex-direction:column; min-height:0;">
            <div class="ttg-card-hdr">
              <span>✨ Satu Instruksi Storytelling AI</span>
              <select id="ttg-res-select" class="ttg-mini-select">
                <option value="1080x1920">1080×1920</option>
                <option value="720x1280">720×1280</option>
              </select>
            </div>
            <textarea id="ttg-prompt" rows="2" class="ttg-field" style="resize:none;"></textarea>
            <div id="ttg-scene-list" class="ttg-scene-scroll"></div>
          </div>

          <button type="button" id="ttg-generate-and-render-btn" class="ttg-primary-btn">
            ⚡ Generate Cerita &amp; Render Video
          </button>
        </div>

        <!-- STEP 4 & 5: RENDER SELESAI, PREVIEW, DOWNLOAD MP4 & CAPTION -->
        <div class="ttg-panel" data-panel="4">
          <div class="ttg-glass-card ttg-render-card">
            <div class="ttg-render-top">
              <div class="ttg-render-status-left">
                <span class="ttg-check-badge">✓</span>
                <div>
                  <div id="ttg-render-title" class="ttg-render-heading">Siap Render Video</div>
                  <div id="ttg-render-sub" class="ttg-render-sub">Klik tombol di bawah untuk mulai</div>
                </div>
              </div>
              <span id="ttg-progress-pill" class="ttg-bolt-pill">⚡ 0%</span>
            </div>

            <!-- VIDEO PREVIEW FRAME 9:16 -->
            <div class="ttg-canvas-stage">
              <canvas id="ttg-preview-canvas" width="720" height="1280"></canvas>
              <span class="ttg-duration-badge">00:20</span>
            </div>

            <button type="button" id="ttg-preview-btn" class="ttg-play-bar">
              ▶ Putar Preview
            </button>

            <div class="ttg-action-row">
              <button type="button" id="ttg-render-btn" class="ttg-act-btn cyan">
                ⬇ Download MP4
              </button>
              <button type="button" id="ttg-share-btn" class="ttg-act-btn purple">
                🔗 Bagikan Video
              </button>
              <button type="button" class="ttg-act-btn dark" data-goto="1">
                ✎ Edit Ulang
              </button>
            </div>
          </div>

          <!-- KARTU CAPTION TIKTOK & PANDUAN TAG -->
          <div class="ttg-glass-card ttg-caption-card">
            <div class="ttg-card-hdr">
              <span>📄 Caption TikTok</span>
              <div style="display:flex; gap:6px; align-items:center;">
                <span class="ttg-ready-pill">● Siap Disalin</span>
                <button type="button" id="ttg-copy-caption-btn" class="ttg-copy-btn">📋 Salin Caption</button>
              </div>
            </div>
            <textarea id="ttg-caption-output" class="ttg-caption-box" readonly></textarea>
            <div class="ttg-guide-strip">
              💡 Upload ke TikTok → klik <b>+ Tambah Tautan</b> → pasang <b>Lokasi Maps</b> (<span id="ttg-guide-maps">-</span>) &amp; <b>Promo TikTok</b> (<span id="ttg-guide-promo">-</span>).
            </div>
          </div>
        </div>

      </div>
    </div>

    <style>
      #page-affiliate-tiktok {
        padding-bottom: 72px !important;
      }
      .ttg-shell {
        display: flex;
        flex-direction: column;
        gap: 8px;
        height: calc(100dvh - 132px);
        max-height: calc(100dvh - 132px);
        overflow: hidden;
        padding: 4px 10px 6px;
        color: #f8fafc;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
      }
      .ttg-resto-banner {
        display: flex;
        align-items: center;
        gap: 10px;
        background: linear-gradient(135deg, rgba(24, 18, 48, 0.92), rgba(14, 12, 30, 0.95));
        border: 1px solid rgba(139, 92, 246, 0.45);
        box-shadow: 0 4px 20px rgba(0, 240, 255, 0.08);
        border-radius: 14px;
        padding: 8px 10px;
        flex-shrink: 0;
      }
      .ttg-resto-thumb-wrap {
        width: 52px;
        height: 52px;
        border-radius: 10px;
        overflow: hidden;
        border: 1px solid rgba(0, 240, 255, 0.4);
        flex-shrink: 0;
      }
      .ttg-resto-thumb-wrap img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .ttg-resto-meta {
        flex: 1;
        min-width: 0;
      }
      .ttg-resto-title-row {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .ttg-project-dropdown {
        background: transparent;
        color: #ffffff;
        font-weight: 800;
        font-size: 14px;
        border: none;
        outline: none;
        max-width: 170px;
        text-overflow: ellipsis;
      }
      .ttg-project-dropdown option {
        background: #121024;
        color: #fff;
      }
      .ttg-verified-dot {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #10b981;
        color: #04130d;
        font-size: 10px;
        font-weight: 900;
      }
      .ttg-resto-addr {
        font-size: 11px;
        color: #cbd5e1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin: 2px 0 4px;
      }
      .ttg-resto-chips {
        display: flex;
        gap: 6px;
        flex-wrap: nowrap;
      }
      .ttg-chip {
        background: rgba(30, 27, 62, 0.85);
        border: 1px solid rgba(99, 102, 241, 0.35);
        border-radius: 6px;
        padding: 2px 6px;
        font-size: 10px;
        color: #e2e8f0;
      }
      .ttg-next-proj-btn {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 1px solid rgba(0, 240, 255, 0.45);
        background: rgba(30, 27, 65, 0.9);
        color: #00f0ff;
        font-size: 18px;
        font-weight: 700;
        cursor: pointer;
        flex-shrink: 0;
      }
      .ttg-stepper {
        position: relative;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 2px 6px;
        flex-shrink: 0;
      }
      .ttg-stepper-line {
        position: absolute;
        top: 11px;
        left: 24px;
        right: 24px;
        height: 2px;
        background: linear-gradient(90deg, #8e2de2, #00f0ff);
        opacity: 0.45;
        z-index: 0;
      }
      .ttg-step {
        position: relative;
        z-index: 1;
        background: none;
        border: none;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        cursor: pointer;
        padding: 0;
      }
      .ttg-step-circle {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #1b1738;
        border: 1.5px solid #6366f1;
        color: #cbd5e1;
        font-size: 10px;
        font-weight: 800;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .ttg-step.active .ttg-step-circle {
        background: linear-gradient(135deg, #ec4899, #8b5cf6);
        border-color: #f472b6;
        color: #ffffff;
        box-shadow: 0 0 10px rgba(236, 72, 153, 0.65);
      }
      .ttg-step.done .ttg-step-circle {
        background: #7c3aed;
        border-color: #a78bfa;
        color: #ffffff;
      }
      .ttg-step-label {
        font-size: 9.5px;
        line-height: 1.15;
        color: #94a3b8;
        text-align: center;
        font-weight: 600;
      }
      .ttg-step.active .ttg-step-label {
        color: #f472b6;
        font-weight: 700;
      }
      .ttg-stage {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }
      .ttg-panel {
        display: none;
        flex-direction: column;
        gap: 8px;
        height: 100%;
        min-height: 0;
      }
      .ttg-panel.active {
        display: flex;
      }
      .ttg-glass-card {
        background: linear-gradient(160deg, rgba(20, 17, 44, 0.92), rgba(11, 10, 26, 0.96));
        border: 1px solid rgba(99, 102, 241, 0.38);
        border-radius: 14px;
        padding: 9px 11px;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
      }
      .ttg-card-hdr {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11.5px;
        font-weight: 700;
        color: #e2e8f0;
        margin-bottom: 6px;
      }
      .ttg-badge-cyan {
        font-size: 9.5px;
        padding: 2px 7px;
        border-radius: 99px;
        background: rgba(0, 240, 255, 0.14);
        color: #00f0ff;
        border: 1px solid rgba(0, 240, 255, 0.35);
      }
      .ttg-badge-purple {
        font-size: 9.5px;
        padding: 2px 7px;
        border-radius: 99px;
        background: rgba(139, 92, 246, 0.18);
        color: #c4b5fd;
        border: 1px solid rgba(139, 92, 246, 0.35);
      }
      .ttg-grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
      }
      .ttg-field {
        width: 100%;
        box-sizing: border-box;
        background: rgba(11, 10, 24, 0.85);
        border: 1px solid rgba(79, 70, 229, 0.4);
        border-radius: 9px;
        padding: 7px 9px;
        color: #ffffff;
        font-size: 11.5px;
        outline: none;
      }
      .ttg-field:focus {
        border-color: #00f0ff;
        box-shadow: 0 0 0 2px rgba(0, 240, 255, 0.15);
      }
      .ttg-primary-btn {
        margin-top: auto;
        width: 100%;
        padding: 10px;
        border-radius: 12px;
        border: none;
        background: linear-gradient(90deg, #7c3aed, #2563eb, #00f0ff);
        color: #ffffff;
        font-weight: 800;
        font-size: 12.5px;
        cursor: pointer;
        box-shadow: 0 4px 16px rgba(37, 99, 235, 0.4);
        flex-shrink: 0;
      }
      .ttg-upload-drop {
        width: 100%;
        padding: 9px;
        border-radius: 10px;
        border: 1px dashed #00f0ff;
        background: rgba(0, 240, 255, 0.06);
        color: #00f0ff;
        font-size: 11.5px;
        font-weight: 700;
        cursor: pointer;
        margin-bottom: 8px;
      }
      .ttg-photo-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 5px;
        overflow-y: auto;
        flex: 1;
        min-height: 0;
      }
      .ttg-secondary-btn {
        background: rgba(30, 27, 65, 0.9);
        border: 1px solid #6366f1;
        color: #e2e8f0;
        border-radius: 9px;
        padding: 7px 10px;
        font-size: 11.5px;
        font-weight: 600;
        cursor: pointer;
      }
      .ttg-trim-box {
        display: flex;
        align-items: center;
        gap: 4px;
        background: rgba(11, 10, 24, 0.85);
        border: 1px solid rgba(99, 102, 241, 0.4);
        border-radius: 9px;
        padding: 4px 8px;
        font-size: 11px;
      }
      .ttg-trim-box input {
        width: 36px;
        background: transparent;
        border: none;
        color: #00f0ff;
        font-weight: 700;
        text-align: center;
      }
      .ttg-mini-status {
        font-size: 10.5px;
        color: #34d399;
        margin-top: 5px;
      }
      .ttg-mini-select {
        background: #171433;
        color: #00f0ff;
        border: 1px solid rgba(0, 240, 255, 0.35);
        border-radius: 6px;
        font-size: 10.5px;
        padding: 2px 6px;
      }
      .ttg-scene-scroll {
        margin-top: 6px;
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .ttg-render-card {
        display: flex;
        flex-direction: column;
        gap: 7px;
        flex: 1;
        min-height: 0;
      }
      .ttg-render-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .ttg-render-status-left {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .ttg-check-badge {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #10b981;
        color: #051b11;
        font-weight: 900;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
      }
      .ttg-render-heading {
        font-size: 13px;
        font-weight: 800;
        color: #ffffff;
      }
      .ttg-render-sub {
        font-size: 10px;
        color: #94a3b8;
      }
      .ttg-bolt-pill {
        background: linear-gradient(90deg, #4f46e5, #06b6d4);
        padding: 3px 9px;
        border-radius: 99px;
        font-size: 10.5px;
        font-weight: 800;
      }
      .ttg-canvas-stage {
        position: relative;
        flex: 1;
        min-height: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        background: #060510;
        border-radius: 12px;
        border: 1px solid rgba(99, 102, 241, 0.35);
        overflow: hidden;
      }
      #ttg-preview-canvas {
        height: 100%;
        width: auto;
        aspect-ratio: 9 / 16;
        object-fit: contain;
      }
      .ttg-duration-badge {
        position: absolute;
        bottom: 6px;
        right: 8px;
        background: rgba(0, 0, 0, 0.75);
        padding: 2px 6px;
        border-radius: 5px;
        font-size: 10px;
        font-weight: 700;
      }
      .ttg-play-bar {
        width: 100%;
        padding: 7px;
        border-radius: 99px;
        border: 1px solid rgba(96, 165, 250, 0.5);
        background: linear-gradient(90deg, #4338ca, #2563eb);
        color: #ffffff;
        font-weight: 700;
        font-size: 11.5px;
        cursor: pointer;
      }
      .ttg-action-row {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 6px;
      }
      .ttg-act-btn {
        padding: 7px 4px;
        border-radius: 9px;
        font-size: 10.5px;
        font-weight: 700;
        cursor: pointer;
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #ffffff;
      }
      .ttg-act-btn.cyan {
        background: linear-gradient(135deg, #0284c7, #06b6d4);
      }
      .ttg-act-btn.purple {
        background: linear-gradient(135deg, #6d28d9, #9333ea);
      }
      .ttg-act-btn.dark {
        background: rgba(30, 27, 62, 0.9);
      }
      .ttg-caption-card {
        flex-shrink: 0;
      }
      .ttg-ready-pill {
        font-size: 9.5px;
        color: #34d399;
        background: rgba(16, 185, 129, 0.15);
        padding: 2px 7px;
        border-radius: 99px;
      }
      .ttg-copy-btn {
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        border: none;
        color: #fff;
        font-size: 10px;
        font-weight: 700;
        padding: 4px 8px;
        border-radius: 7px;
        cursor: pointer;
      }
      .ttg-caption-box {
        width: 100%;
        box-sizing: border-box;
        height: 54px;
        background: rgba(9, 8, 20, 0.85);
        border: 1px solid rgba(99, 102, 241, 0.3);
        border-radius: 8px;
        color: #e2e8f0;
        font-size: 10.5px;
        padding: 5px 7px;
        resize: none;
      }
      .ttg-guide-strip {
        margin-top: 4px;
        font-size: 9.5px;
        color: #a5b4fc;
        line-height: 1.3;
      }
    </style>
  \`;

  const canvas = document.getElementById('ttg-preview-canvas');
  const renderer = new TikTokGoVideoRenderer(canvas);

  function goToStep(stepNum) {
    activeStep = stepNum;
    const visualPanel = stepNum === 5 ? 4 : stepNum;

    container.querySelectorAll('.ttg-panel').forEach(p => {
      p.classList.toggle('active', Number(p.dataset.panel) === visualPanel);
    });

    container.querySelectorAll('.ttg-step').forEach(btn => {
      const s = Number(btn.dataset.step);
      btn.classList.toggle('active', s === stepNum);
      btn.classList.toggle('done', s < stepNum);
    });
  }

  container.querySelectorAll('[data-step]').forEach(btn => {
    btn.onclick = () => goToStep(Number(btn.dataset.step));
  });
  container.querySelectorAll('[data-goto]').forEach(btn => {
    btn.onclick = () => goToStep(Number(btn.dataset.goto));
  });

  function syncUiFromProject() {
    const proj = projectManager.getActiveProject();
    const d = proj.restaurantData;

    const select = document.getElementById('ttg-project-select');
    select.innerHTML = Object.values(projectManager.projects)
      .map(p => \`<option value="\${p.id}" \${p.id === proj.id ? 'selected' : ''}>\${p.restaurantData.name || p.restaurantData.displayLabel}</option>\`)
      .join('');

    document.getElementById('ttg-name').value = d.name;
    document.getElementById('ttg-menu').value = d.menuName;
    document.getElementById('ttg-location').value = d.location;
    document.getElementById('ttg-normal-price').value = d.normalPrice;
    document.getElementById('ttg-promo-price').value = d.promoPrice;
    document.getElementById('ttg-promo-info').value = d.promoInfo;
    document.getElementById('ttg-highlights').value = d.highlights;
    document.getElementById('ttg-tag-maps').value = d.tiktokLocationTag;
    document.getElementById('ttg-tag-promo').value = d.tiktokPromoTag;
    document.getElementById('ttg-prompt').value = proj.promptInstruction;

    document.getElementById('ttg-banner-address').textContent = d.location ? \`📍 \${d.location}\` : '📍 Lengkapi alamat restoran';
    document.getElementById('ttg-chip-photos').textContent = \`\${proj.photos.length} Foto\`;
    document.getElementById('ttg-chip-music').textContent = proj.audioConfig.fileName ? 'Aktif' : 'Musik';

    if (proj.photos.length > 0 && proj.photos[0].dataUrl) {
      document.getElementById('ttg-banner-thumb').src = proj.photos[0].dataUrl;
    }

    document.getElementById('ttg-caption-output').value = proj.generatedContent.caption
      ? \`\${proj.generatedContent.caption}\\n\${proj.generatedContent.hashtags}\`
      : '';

    document.getElementById('ttg-guide-maps').textContent = d.tiktokLocationTag || d.name || '-';
    document.getElementById('ttg-guide-promo').textContent = d.tiktokPromoTag || d.menuName || '-';

    renderPhotoGrid(proj);
    renderSceneList(proj);
  }

  function renderPhotoGrid(proj) {
    const grid = document.getElementById('ttg-photo-grid');
    document.getElementById('ttg-photo-count').textContent = \`\${proj.photos.length} / 20\`;
    document.getElementById('ttg-chip-photos').textContent = \`\${proj.photos.length} Foto\`;

    grid.innerHTML = proj.photos
      .map((p, idx) => \`
        <div style="position:relative; aspect-ratio:9/16; border-radius:7px; overflow:hidden; border:1px solid #4f46e5;">
          <img src="\${p.dataUrl}" style="width:100%; height:100%; object-fit:cover;" />
          <span style="position:absolute; top:2px; left:2px; background:rgba(0,0,0,0.75); color:#00f0ff; font-size:9px; padding:1px 4px; border-radius:4px;">#\${idx + 1}</span>
        </div>
      \`)
      .join('');
  }

  function renderSceneList(proj) {
    const list = document.getElementById('ttg-scene-list');
    list.innerHTML = (proj.generatedContent.scenes || [])
      .map(s => \`
        <div style="background:rgba(15,13,34,0.9); padding:5px 7px; border-radius:7px; border-left:2px solid #00f0ff; font-size:10.5px;">
          <b style="color:#00f0ff;">Scene \${s.frameIndex}:</b> \${s.text}
        </div>
      \`)
      .join('');
  }

  const fieldMap = {
    'ttg-name': 'name',
    'ttg-menu': 'menuName',
    'ttg-location': 'location',
    'ttg-normal-price': 'normalPrice',
    'ttg-promo-price': 'promoPrice',
    'ttg-promo-info': 'promoInfo',
    'ttg-highlights': 'highlights',
    'ttg-tag-maps': 'tiktokLocationTag',
    'ttg-tag-promo': 'tiktokPromoTag'
  };

  Object.entries(fieldMap).forEach(([elId, key]) => {
    document.getElementById(elId).addEventListener('input', e => {
      const proj = projectManager.updateRestaurantData({ [key]: e.target.value });
      if (key === 'name') {
        const opt = document.querySelector(\`#ttg-project-select option[value="\${proj.id}"]\`);
        if (opt) opt.textContent = e.target.value.trim() || proj.restaurantData.displayLabel;
      }
      if (key === 'location') {
        document.getElementById('ttg-banner-address').textContent = e.target.value.trim() ? \`📍 \${e.target.value.trim()}\` : '📍 Lengkapi alamat restoran';
      }
    });
  });

  document.getElementById('ttg-new-project-btn').onclick = () => {
    const nama = prompt('Nama restoran untuk proyek baru:', '');
    if (nama !== null) {
      loadedImages = [];
      projectManager.createNewProject(nama);
      syncUiFromProject();
      goToStep(1);
    }
  };

  document.getElementById('ttg-project-select').onchange = e => {
    loadedImages = [];
    projectManager.switchProject(e.target.value);
    syncUiFromProject();
  };

  document.getElementById('ttg-pick-photos-btn').onclick = () => {
    document.getElementById('ttg-photo-input').click();
  };

  document.getElementById('ttg-photo-input').onchange = async e => {
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

    if (proj.photos[0]) {
      document.getElementById('ttg-banner-thumb').src = proj.photos[0].dataUrl;
    }
    projectManager.saveProjects();
    renderPhotoGrid(proj);
  };

  document.getElementById('ttg-pick-audio-btn').onclick = () => {
    document.getElementById('ttg-audio-input').click();
  };

  document.getElementById('ttg-audio-input').onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    const info = await audioEngine.loadAudioFile(file);
    const proj = projectManager.getActiveProject();
    proj.audioConfig.fileName = file.name;
    proj.audioConfig.beatTimestamps = info.beats;
    document.getElementById('ttg-beat-status').textContent = \`✓ \${file.name} (\${info.beats.length} beat)\`;
    document.getElementById('ttg-chip-music').textContent = 'Aktif';
  };

  document.getElementById('ttg-audio-start').onchange = e => {
    const startSec = Number(e.target.value) || 0;
    audioEngine.setTrimWindow(startSec, 20);
    const proj = projectManager.getActiveProject();
    proj.audioConfig.startTime = startSec;
    proj.audioConfig.beatTimestamps = audioEngine.beats;
  };

  document.getElementById('ttg-generate-and-render-btn').onclick = async () => {
    const proj = projectManager.getActiveProject();
    proj.promptInstruction = document.getElementById('ttg-prompt').value;

    try {
      const result = CulinaryStoryteller.generateStoryboard(proj);
      proj.generatedContent = result;
      projectManager.saveProjects();
      syncUiFromProject();
      goToStep(4);

      // Render frame pembuka ke preview canvas
      if (loadedImages.length > 0) {
        renderer.renderFrame({
          t: 0.1,
          totalDuration: audioEngine.clipDuration || 20,
          images: loadedImages,
          scenes: proj.generatedContent.scenes,
          beats: proj.audioConfig.beatTimestamps,
          restaurantData: proj.restaurantData
        });
      }
      document.getElementById('ttg-render-title').textContent = 'Storytelling & Preview Siap!';
      document.getElementById('ttg-render-sub').textContent = 'Klik Download MP4 untuk ekspor video final';
      document.getElementById('ttg-progress-pill').textContent = '⚡ 100%';
    } catch (err) {
      alert(err.message);
    }
  };

  document.getElementById('ttg-preview-btn').onclick = () => {
    const proj = projectManager.getActiveProject();
    if (loadedImages.length < 5 || proj.generatedContent.scenes.length === 0) {
      alert('Pastikan minimal 5 foto terunggah dan storytelling sudah dibuat.');
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

  document.getElementById('ttg-render-btn').onclick = async () => {
    const proj = projectManager.getActiveProject();
    if (loadedImages.length < 5 || proj.generatedContent.scenes.length === 0) {
      alert('Upload minimal 5 foto dan generate cerita terlebih dahulu.');
      return;
    }

    const resMode = document.getElementById('ttg-res-select').value;
    renderer.setResolution(resMode);

    document.getElementById('ttg-render-title').textContent = 'Merender Video...';
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
        document.getElementById('ttg-progress-pill').textContent = \`⚡ \${pct}%\`;
      }
    });

    if (result && result.url) {
      proj.renderStatus = { progress: 100, completed: true, videoUrl: result.url };
      document.getElementById('ttg-render-title').textContent = 'Render Selesai!';
      document.getElementById('ttg-render-sub').textContent = 'Video promosi restoran Anda siap digunakan';
      goToStep(5);

      const a = document.createElement('a');
      const safeName = (proj.restaurantData.name || 'restoran').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      a.href = result.url;
      a.download = \`ch-ai-tiktok-go-\${safeName}.mp4\`;
      a.click();
    }
  };

  document.getElementById('ttg-share-btn').onclick = async () => {
    const text = document.getElementById('ttg-caption-output').value;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Promosi Restoran TikTok', text });
      } catch (e) {}
    } else {
      navigator.clipboard.writeText(text);
      alert('Caption siap dibagikan (disalin ke clipboard).');
    }
  };

  document.getElementById('ttg-copy-caption-btn').onclick = () => {
    const text = document.getElementById('ttg-caption-output').value;
    navigator.clipboard.writeText(text);
    alert('Caption & Hashtag berhasil disalin!');
  };

  syncUiFromProject();
}
`;

fs.writeFileSync(path.join(targetDir, 'tiktok-go-state.js'), stateCode, 'utf8');
fs.writeFileSync(path.join(targetDir, 'tiktok-go-ui.js'), uiCode, 'utf8');
console.log('✓ Tampilan modern mobile (IMG_20261122_032946.png) berhasil dipasang!');
