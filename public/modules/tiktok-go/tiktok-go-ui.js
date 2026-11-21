import { RestaurantProjectManager } from './tiktok-go-state.js';
import { CulinaryStoryteller } from './tiktok-go-storyteller.js';
import { BeatSyncAudioEngine } from './tiktok-go-audio.js';
import { TikTokGoVideoRenderer } from './tiktok-go-renderer.js';

export function initTikTokGoModule(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const projectManager = new RestaurantProjectManager();
  const audioEngine = new BeatSyncAudioEngine();
  let loadedImages = [];
  let loadedMenuCardImg = null;
  let previewAnimId = null;
  let lastRenderedVideoUrl = null;
  let lastRenderedBlob = null;
  let lastRenderedFileName = 'ch-ai-tiktok-go.mp4';
  let currentPeaks = [];

  container.innerHTML = `
    <div id="ttg-mobile-app" class="ttg-shell">
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
            <span class="ttg-chip">🧾 <b id="ttg-chip-menu">Menu SS</b></span>
            <span class="ttg-chip">🎵 <b id="ttg-chip-music">Musik</b></span>
          </div>
        </div>
        <button type="button" id="ttg-new-project-btn" class="ttg-next-proj-btn" title="Proyek Baru">+</button>
      </div>

      <div class="ttg-stepper">
        <div class="ttg-stepper-line"></div>
        <button type="button" class="ttg-step active" data-step="1">
          <span class="ttg-step-circle">1</span>
          <span class="ttg-step-label">Data &amp;<br>Menu SS</span>
        </button>
        <button type="button" class="ttg-step" data-step="2">
          <span class="ttg-step-circle">2</span>
          <span class="ttg-step-label">Upload<br>Foto</span>
        </button>
        <button type="button" class="ttg-step" data-step="3">
          <span class="ttg-step-circle">3</span>
          <span class="ttg-step-label">Musik &amp;<br>Potong</span>
        </button>
        <button type="button" class="ttg-step" data-step="4">
          <span class="ttg-step-circle">4</span>
          <span class="ttg-step-label">Preview<br>&amp; Render</span>
        </button>
        <button type="button" class="ttg-step" data-step="5">
          <span class="ttg-step-circle">5</span>
          <span class="ttg-step-label">Caption</span>
        </button>
      </div>

      <div class="ttg-stage">
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

          <!-- KARTU REFERENSI SCREENSHOT MENU TOKO -->
          <div class="ttg-glass-card">
            <div class="ttg-card-hdr">
              <span>🧾 Referensi Screenshot Menu Toko</span>
              <span id="ttg-menucard-status" class="ttg-badge-purple">Kartu Menu</span>
            </div>
            <input type="file" id="ttg-menucard-input" accept="image/*" style="display:none;" />
            <div class="ttg-menucard-row">
              <div id="ttg-menucard-preview-box" class="ttg-menucard-thumb">
                <span>🧾</span>
              </div>
              <div style="flex:1; display:flex; flex-direction:column; gap:5px;">
                <button type="button" id="ttg-pick-menucard-btn" class="ttg-upload-drop" style="margin:0; padding:6px;">
                  📸 Upload SS Menu / Harga Toko
                </button>
                <input id="ttg-promo-info" class="ttg-field" placeholder="Catatan promo singkat (opsional)" />
              </div>
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

        <div class="ttg-panel" data-panel="2">
          <div class="ttg-glass-card" style="flex:1; display:flex; flex-direction:column; min-height:0;">
            <div class="ttg-card-hdr">
              <span>📸 Galeri Restoran &amp; Makanan (5–20 Foto)</span>
              <span id="ttg-photo-count" class="ttg-badge-cyan">0 / 20</span>
            </div>
            <input type="file" id="ttg-photo-input" accept="image/*" multiple style="display:none;" />
            <button type="button" id="ttg-pick-photos-btn" class="ttg-upload-drop">
              + Pilih 5–20 Foto Makanan, Interior &amp; Suasana
            </button>
            <div id="ttg-photo-grid" class="ttg-photo-grid"></div>
          </div>
          <button type="button" class="ttg-primary-btn" data-goto="3">
            Lanjut Pilih &amp; Potong Musik →
          </button>
        </div>

        <div class="ttg-panel" data-panel="3">
          <div class="ttg-glass-card">
            <div class="ttg-card-hdr">
              <span>🎵 Musik Latar &amp; Potong Bagian (20 Detik)</span>
              <span id="ttg-beat-badge" class="ttg-badge-purple">0 Beat</span>
            </div>

            <div style="display:flex; gap:6px; align-items:center;">
              <input type="file" id="ttg-audio-input" accept="audio/*" style="display:none;" />
              <button type="button" id="ttg-pick-audio-btn" class="ttg-secondary-btn" style="flex:1;">
                📁 Upload Musik MP3 / WAV
              </button>
              <button type="button" id="ttg-play-audio-btn" class="ttg-audio-play-btn">
                ▶ Dengar Potongan
              </button>
            </div>

            <div class="ttg-trim-panel">
              <div id="ttg-waveform-bars" class="ttg-waveform"></div>
              <input type="range" id="ttg-audio-slider" min="0" max="60" value="0" step="1" class="ttg-range" disabled />
              <div class="ttg-trim-labels">
                <span id="ttg-trim-range-text">Potongan: 00:00 – 00:20</span>
                <span id="ttg-audio-filename" style="color:#00f0ff; max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">Belum ada lagu</span>
              </div>
            </div>
          </div>

          <div class="ttg-glass-card" style="flex:1; display:flex; flex-direction:column; min-height:0;">
            <div class="ttg-card-hdr">
              <span>✨ Satu Instruksi Storytelling AI</span>
              <select id="ttg-res-select" class="ttg-mini-select">
                <option value="720x1280">720×1280 (Cepat &amp; Ringan)</option>
                <option value="1080x1920">1080×1920 Full HD</option>
              </select>
            </div>
            <textarea id="ttg-prompt" rows="2" class="ttg-field" style="resize:none;"></textarea>
            <div id="ttg-scene-list" class="ttg-scene-scroll"></div>
          </div>

          <button type="button" id="ttg-generate-and-render-btn" class="ttg-primary-btn">
            ⚡ Generate Cerita &amp; Buka Preview Besar →
          </button>
        </div>

        <div class="ttg-panel" data-panel="4">
          <div class="ttg-glass-card ttg-big-video-card">
            <div class="ttg-card-hdr" style="margin-bottom:4px;">
              <span id="ttg-render-title" style="color:#00f0ff;">🎬 Preview Video Promosi (9:16)</span>
              <div style="display:flex; gap:6px; align-items:center;">
                <span id="ttg-progress-pill" class="ttg-bolt-pill">⚡ Siap</span>
                <button type="button" id="ttg-expand-btn" class="ttg-expand-btn">🔍 Perbesar</button>
              </div>
            </div>

            <div class="ttg-large-video-box" id="ttg-video-box-normal">
              <canvas id="ttg-preview-canvas" width="720" height="1280"></canvas>
              <span class="ttg-duration-badge">00:20 • KARTU MENU + SYNC</span>
            </div>

            <div class="ttg-video-controls">
              <button type="button" id="ttg-preview-btn" class="ttg-play-bar">
                ▶ Putar Preview + Musik
              </button>
              <div class="ttg-action-row">
                <button type="button" id="ttg-render-btn" class="ttg-act-btn cyan">
                  ⬇ Render &amp; Simpan MP4
                </button>
                <button type="button" class="ttg-act-btn purple" data-goto="5">
                  📄 Lihat Caption &amp; Tag →
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="ttg-panel" data-panel="5">
          <div class="ttg-glass-card" style="flex:1; display:flex; flex-direction:column; min-height:0;">
            <div class="ttg-card-hdr">
              <span>📄 Caption &amp; Hashtag TikTok</span>
              <button type="button" id="ttg-copy-caption-btn" class="ttg-copy-btn">📋 Salin Semua</button>
            </div>
            <textarea id="ttg-caption-output" class="ttg-caption-full" readonly></textarea>
            <div class="ttg-guide-box">
              <b>📌 Panduan Wajib Saat Posting di TikTok:</b><br>
              1. Upload file MP4 yang sudah disimpan di HP.<br>
              2. Klik <b>+ Tambah Tautan</b> → pilih <b>Lokasi (Maps)</b>: <b id="ttg-guide-maps" style="color:#00f0ff;">-</b>.<br>
              3. Tambahkan <b>Tag Promo TikTok</b>: <b id="ttg-guide-promo" style="color:#f472b6;">-</b>.<br>
              4. Tempel caption di atas agar selaras dengan ajakan di akhir video.
            </div>
          </div>
          <div class="ttg-action-row">
            <button type="button" class="ttg-act-btn dark" data-goto="4">← Kembali ke Video</button>
            <button type="button" id="ttg-download-again-btn" class="ttg-act-btn cyan">⬇ Simpan MP4 ke HP</button>
          </div>
        </div>
      </div>

      <div id="ttg-fullscreen-modal" class="ttg-modal" style="display:none;">
        <div class="ttg-modal-top">
          <span style="font-weight:800; color:#00f0ff; font-size:13px;">PREVIEW LAYAR PENUH (9:16)</span>
          <button type="button" id="ttg-close-modal-btn" class="ttg-close-modal">✕ Tutup</button>
        </div>
        <div id="ttg-modal-canvas-slot" class="ttg-modal-slot"></div>
        <div class="ttg-modal-bottom">
          <button type="button" id="ttg-modal-play-btn" class="ttg-play-bar" style="flex:1;">▶ Putar Preview</button>
          <button type="button" id="ttg-modal-download-btn" class="ttg-act-btn cyan" style="flex:1; padding:10px;">⬇ Simpan MP4</button>
        </div>
      </div>
    </div>

    <style>
      #page-affiliate-tiktok { padding-bottom: 68px !important; }
      .ttg-shell {
        display: flex; flex-direction: column; gap: 7px;
        height: calc(100dvh - 126px); max-height: calc(100dvh - 126px);
        overflow: hidden; padding: 4px 10px 6px;
        color: #f8fafc; font-family: 'Inter', system-ui, -apple-system, sans-serif;
      }
      .ttg-resto-banner {
        display: flex; align-items: center; gap: 9px;
        background: linear-gradient(135deg, rgba(24, 18, 48, 0.94), rgba(14, 12, 30, 0.96));
        border: 1px solid rgba(139, 92, 246, 0.45);
        border-radius: 13px; padding: 7px 9px; flex-shrink: 0;
      }
      .ttg-resto-thumb-wrap {
        width: 46px; height: 46px; border-radius: 9px; overflow: hidden;
        border: 1px solid rgba(0, 240, 255, 0.45); flex-shrink: 0;
      }
      .ttg-resto-thumb-wrap img { width: 100%; height: 100%; object-fit: cover; }
      .ttg-resto-meta { flex: 1; min-width: 0; }
      .ttg-resto-title-row { display: flex; align-items: center; gap: 5px; }
      .ttg-project-dropdown {
        background: transparent; color: #fff; font-weight: 800; font-size: 13.5px;
        border: none; outline: none; max-width: 175px;
      }
      .ttg-project-dropdown option { background: #121024; color: #fff; }
      .ttg-verified-dot {
        width: 15px; height: 15px; border-radius: 50%;
        background: #10b981; color: #04130d; font-size: 9px; font-weight: 900;
        display: inline-flex; align-items: center; justify-content: center;
      }
      .ttg-resto-addr { font-size: 10.5px; color: #cbd5e1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 1px 0 3px; }
      .ttg-resto-chips { display: flex; gap: 5px; }
      .ttg-chip {
        background: rgba(30, 27, 62, 0.9); border: 1px solid rgba(99, 102, 241, 0.35);
        border-radius: 6px; padding: 1px 6px; font-size: 9.5px; color: #e2e8f0;
      }
      .ttg-next-proj-btn {
        width: 28px; height: 28px; border-radius: 50%;
        border: 1px solid rgba(0, 240, 255, 0.5);
        background: rgba(30, 27, 65, 0.9);
        color: #00f0ff; font-size: 17px; font-weight: 700; cursor: pointer; flex-shrink: 0;
      }
      .ttg-stepper { position: relative; display: flex; justify-content: space-between; padding: 1px 4px; flex-shrink: 0; }
      .ttg-stepper-line {
        position: absolute; top: 10px; left: 22px; right: 22px; height: 2px;
        background: linear-gradient(90deg, #8e2de2, #00f0ff); opacity: 0.45;
      }
      .ttg-step {
        position: relative; z-index: 1; background: none; border: none;
        display: flex; flex-direction: column; align-items: center; gap: 2px; cursor: pointer; padding: 0;
      }
      .ttg-step-circle {
        width: 19px; height: 19px; border-radius: 50%;
        background: #1b1738; border: 1.5px solid #6366f1; color: #cbd5e1;
        font-size: 9.5px; font-weight: 800; display: flex; align-items: center; justify-content: center;
      }
      .ttg-step.active .ttg-step-circle {
        background: linear-gradient(135deg, #ec4899, #8b5cf6);
        border-color: #f472b6; color: #fff; box-shadow: 0 0 8px rgba(236, 72, 153, 0.7);
      }
      .ttg-step.done .ttg-step-circle { background: #7c3aed; border-color: #a78bfa; color: #fff; }
      .ttg-step-label { font-size: 9px; line-height: 1.1; color: #94a3b8; text-align: center; font-weight: 600; }
      .ttg-step.active .ttg-step-label { color: #f472b6; font-weight: 700; }
      .ttg-stage { flex: 1; min-height: 0; display: flex; flex-direction: column; }
      .ttg-panel { display: none; flex-direction: column; gap: 7px; height: 100%; min-height: 0; }
      .ttg-panel.active { display: flex; }
      .ttg-glass-card {
        background: linear-gradient(160deg, rgba(20, 17, 44, 0.94), rgba(11, 10, 26, 0.97));
        border: 1px solid rgba(99, 102, 241, 0.4);
        border-radius: 13px; padding: 8px 10px;
      }
      .ttg-card-hdr { display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 700; color: #e2e8f0; margin-bottom: 5px; }
      .ttg-badge-cyan { font-size: 9px; padding: 2px 7px; border-radius: 99px; background: rgba(0, 240, 255, 0.14); color: #00f0ff; border: 1px solid rgba(0, 240, 255, 0.35); }
      .ttg-badge-purple { font-size: 9px; padding: 2px 7px; border-radius: 99px; background: rgba(139, 92, 246, 0.18); color: #c4b5fd; border: 1px solid rgba(139, 92, 246, 0.35); }
      .ttg-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
      .ttg-field {
        width: 100%; box-sizing: border-box;
        background: rgba(11, 10, 24, 0.88);
        border: 1px solid rgba(79, 70, 229, 0.42);
        border-radius: 8px; padding: 6px 8px; color: #fff; font-size: 11px; outline: none;
      }
      .ttg-field:focus { border-color: #00f0ff; }
      .ttg-menucard-row { display: flex; gap: 8px; align-items: center; }
      .ttg-menucard-thumb {
        width: 52px; height: 64px; border-radius: 8px;
        background: rgba(11, 10, 24, 0.9); border: 1px dashed rgba(139, 92, 246, 0.6);
        display: flex; align-items: center; justify-content: center;
        overflow: hidden; flex-shrink: 0; font-size: 20px;
      }
      .ttg-menucard-thumb img { width: 100%; height: 100%; object-fit: cover; }
      .ttg-primary-btn {
        margin-top: auto; width: 100%; padding: 9px; border-radius: 11px; border: none;
        background: linear-gradient(90deg, #7c3aed, #2563eb, #00f0ff);
        color: #fff; font-weight: 800; font-size: 12px; cursor: pointer; flex-shrink: 0;
      }
      .ttg-upload-drop {
        width: 100%; padding: 8px; border-radius: 9px; border: 1px dashed #00f0ff;
        background: rgba(0, 240, 255, 0.07); color: #00f0ff; font-size: 11px; font-weight: 700; cursor: pointer; margin-bottom: 6px;
      }
      .ttg-photo-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; overflow-y: auto; flex: 1; min-height: 0; }
      .ttg-secondary-btn {
        background: rgba(30, 27, 65, 0.92); border: 1px solid #6366f1; color: #e2e8f0;
        border-radius: 8px; padding: 6px 8px; font-size: 11px; font-weight: 600; cursor: pointer;
      }
      .ttg-audio-play-btn {
        background: linear-gradient(135deg, #10b981, #059669); border: none; color: #fff;
        border-radius: 8px; padding: 6px 10px; font-size: 11px; font-weight: 700; cursor: pointer;
      }
      .ttg-trim-panel {
        margin-top: 7px; background: rgba(9, 8, 22, 0.9); border: 1px solid rgba(0, 240, 255, 0.25);
        border-radius: 9px; padding: 6px 8px;
      }
      .ttg-waveform { display: flex; align-items: flex-end; gap: 2px; height: 26px; margin-bottom: 4px; }
      .ttg-wave-bar { flex: 1; background: #3b336b; border-radius: 2px; transition: background 0.15s; }
      .ttg-wave-bar.in-window { background: #00f0ff; }
      .ttg-range { width: 100%; accent-color: #00f0ff; height: 14px; margin: 0; }
      .ttg-trim-labels { display: flex; justify-content: space-between; font-size: 10px; color: #cbd5e1; margin-top: 2px; }
      .ttg-mini-select { background: #171433; color: #00f0ff; border: 1px solid rgba(0, 240, 255, 0.35); border-radius: 6px; font-size: 10px; padding: 2px 5px; }
      .ttg-scene-scroll { margin-top: 5px; flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
      .ttg-big-video-card { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 7px; }
      .ttg-bolt-pill { background: linear-gradient(90deg, #4f46e5, #06b6d4); padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 800; }
      .ttg-expand-btn {
        background: rgba(0, 240, 255, 0.15); border: 1px solid #00f0ff; color: #00f0ff;
        border-radius: 7px; padding: 2px 8px; font-size: 10.5px; font-weight: 700; cursor: pointer;
      }
      .ttg-large-video-box {
        position: relative; flex: 1; min-height: 0; width: 100%;
        background: radial-gradient(circle at center, #151230 0%, #05040d 100%);
        border: 1.5px solid rgba(0, 240, 255, 0.45);
        border-radius: 14px; display: flex; justify-content: center; align-items: center; overflow: hidden;
      }
      #ttg-preview-canvas { height: 100%; width: auto; max-width: 100%; aspect-ratio: 9 / 16; object-fit: contain; border-radius: 8px; }
      .ttg-duration-badge {
        position: absolute; bottom: 8px; right: 8px; background: rgba(0, 0, 0, 0.78);
        border: 1px solid rgba(255,255,255,0.15); padding: 2px 7px; border-radius: 6px; font-size: 10px; font-weight: 700;
      }
      .ttg-video-controls { display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }
      .ttg-play-bar {
        width: 100%; padding: 8px; border-radius: 10px;
        border: 1px solid rgba(96, 165, 250, 0.5);
        background: linear-gradient(90deg, #4338ca, #2563eb);
        color: #fff; font-weight: 800; font-size: 12px; cursor: pointer;
      }
      .ttg-action-row { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
      .ttg-act-btn {
        padding: 9px 6px; border-radius: 10px; font-size: 11px; font-weight: 800;
        cursor: pointer; border: 1px solid rgba(255, 255, 255, 0.18); color: #fff;
      }
      .ttg-act-btn.cyan { background: linear-gradient(135deg, #0284c7, #06b6d4); }
      .ttg-act-btn.purple { background: linear-gradient(135deg, #6d28d9, #9333ea); }
      .ttg-act-btn.dark { background: rgba(30, 27, 62, 0.95); }
      .ttg-caption-full {
        width: 100%; box-sizing: border-box; flex: 1; min-height: 0;
        background: rgba(9, 8, 20, 0.9); border: 1px solid rgba(99, 102, 241, 0.35);
        border-radius: 9px; color: #f1f5f9; font-size: 11.5px; padding: 8px; resize: none;
      }
      .ttg-copy-btn { background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; color: #fff; font-size: 10.5px; font-weight: 700; padding: 4px 9px; border-radius: 7px; cursor: pointer; }
      .ttg-guide-box {
        margin-top: 7px; background: rgba(25, 22, 52, 0.9); border-left: 3px solid #00f0ff;
        padding: 7px 9px; border-radius: 7px; font-size: 10.5px; line-height: 1.35; color: #cbd5e1;
      }
      .ttg-modal {
        position: fixed; inset: 0; z-index: 99999; background: rgba(4, 3, 12, 0.96);
        display: flex; flex-direction: column; padding: 12px; gap: 10px;
      }
      .ttg-modal-top { display: flex; justify-content: space-between; align-items: center; }
      .ttg-close-modal { background: #ef4444; color: #fff; border: none; border-radius: 8px; padding: 5px 11px; font-weight: 700; font-size: 12px; cursor: pointer; }
      .ttg-modal-slot { flex: 1; min-height: 0; display: flex; justify-content: center; align-items: center; }
      .ttg-modal-bottom { display: flex; gap: 8px; }
    </style>
  `;

  const canvas = document.getElementById('ttg-preview-canvas');
  const renderer = new TikTokGoVideoRenderer(canvas);

  function fmtTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function renderWaveform(peaks = [], startSec = 0, totalSec = 60, clipDur = 20) {
    const wrap = document.getElementById('ttg-waveform-bars');
    const barCount = peaks.length || 60;
    const startRatio = totalSec > 0 ? startSec / totalSec : 0;
    const endRatio = totalSec > 0 ? (startSec + clipDur) / totalSec : 1;

    wrap.innerHTML = (peaks.length ? peaks : new Array(60).fill(0.25))
      .map((val, idx) => {
        const pos = idx / barCount;
        const active = pos >= startRatio && pos <= endRatio ? 'in-window' : '';
        const h = Math.round(val * 100);
        return `<div class="ttg-wave-bar ${active}" style="height:${h}%;"></div>`;
      })
      .join('');
  }

  renderWaveform();

  function goToStep(stepNum) {
    audioEngine.stopAudio();
    if (previewAnimId) cancelAnimationFrame(previewAnimId);

    container.querySelectorAll('.ttg-panel').forEach(p => {
      p.classList.toggle('active', Number(p.dataset.panel) === stepNum);
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
      .map(p => `<option value="${p.id}" ${p.id === proj.id ? 'selected' : ''}>${p.restaurantData.name || p.restaurantData.displayLabel}</option>`)
      .join('');

    document.getElementById('ttg-name').value = d.name;
    document.getElementById('ttg-menu').value = d.menuName;
    document.getElementById('ttg-location').value = d.location;
    document.getElementById('ttg-promo-info').value = d.promoInfo;
    document.getElementById('ttg-tag-maps').value = d.tiktokLocationTag;
    document.getElementById('ttg-tag-promo').value = d.tiktokPromoTag;
    document.getElementById('ttg-prompt').value = proj.promptInstruction;

    document.getElementById('ttg-banner-address').textContent = d.location ? `📍 ${d.location}` : '📍 Lengkapi alamat restoran';
    document.getElementById('ttg-chip-photos').textContent = `${proj.photos.length} Foto`;
    document.getElementById('ttg-chip-menu').textContent = d.menuCardDataUrl ? 'SS Siap' : 'Menu SS';
    document.getElementById('ttg-chip-music').textContent = proj.audioConfig.fileName ? 'Aktif' : 'Musik';

    const menuBox = document.getElementById('ttg-menucard-preview-box');
    if (d.menuCardDataUrl) {
      menuBox.innerHTML = `<img src="${d.menuCardDataUrl}" alt="Menu" />`;
      document.getElementById('ttg-menucard-status').textContent = '✓ Terpasang';
      const img = new Image();
      img.src = d.menuCardDataUrl;
      img.onload = () => { loadedMenuCardImg = img; };
    } else {
      menuBox.innerHTML = '<span>🧾</span>';
      document.getElementById('ttg-menucard-status').textContent = 'Kartu Menu';
      loadedMenuCardImg = null;
    }

    if (proj.photos.length > 0 && proj.photos[0].dataUrl) {
      document.getElementById('ttg-banner-thumb').src = proj.photos[0].dataUrl;
    }

    document.getElementById('ttg-caption-output').value = proj.generatedContent.caption
      ? `${proj.generatedContent.caption}\n\n${proj.generatedContent.hashtags}`
      : '';

    document.getElementById('ttg-guide-maps').textContent = d.tiktokLocationTag || d.name || '-';
    document.getElementById('ttg-guide-promo').textContent = d.tiktokPromoTag || d.menuName || '-';

    renderPhotoGrid(proj);
    renderSceneList(proj);
  }

  function renderPhotoGrid(proj) {
    const grid = document.getElementById('ttg-photo-grid');
    document.getElementById('ttg-photo-count').textContent = `${proj.photos.length} / 20`;
    document.getElementById('ttg-chip-photos').textContent = `${proj.photos.length} Foto`;

    grid.innerHTML = proj.photos
      .map((p, idx) => `
        <div style="position:relative; aspect-ratio:9/16; border-radius:7px; overflow:hidden; border:1px solid #4f46e5;">
          <img src="${p.dataUrl}" style="width:100%; height:100%; object-fit:cover;" />
          <span style="position:absolute; top:2px; left:2px; background:rgba(0,0,0,0.75); color:#00f0ff; font-size:9px; padding:1px 4px; border-radius:4px;">#${idx + 1}</span>
        </div>
      `)
      .join('');
  }

  function renderSceneList(proj) {
    const list = document.getElementById('ttg-scene-list');
    list.innerHTML = (proj.generatedContent.scenes || [])
      .map(s => `
        <div style="background:rgba(15,13,34,0.92); padding:5px 7px; border-radius:7px; border-left:2px solid #00f0ff; font-size:10.5px;">
          <b style="color:#00f0ff;">Scene ${s.frameIndex}:</b> ${s.text}
        </div>
      `)
      .join('');
  }

  const fieldMap = {
    'ttg-name': 'name',
    'ttg-menu': 'menuName',
    'ttg-location': 'location',
    'ttg-promo-info': 'promoInfo',
    'ttg-tag-maps': 'tiktokLocationTag',
    'ttg-tag-promo': 'tiktokPromoTag'
  };

  Object.entries(fieldMap).forEach(([elId, key]) => {
    document.getElementById(elId).addEventListener('input', e => {
      const proj = projectManager.updateRestaurantData({ [key]: e.target.value });
      if (key === 'name') {
        const opt = document.querySelector(`#ttg-project-select option[value="${proj.id}"]`);
        if (opt) opt.textContent = e.target.value.trim() || proj.restaurantData.displayLabel;
      }
      if (key === 'location') {
        document.getElementById('ttg-banner-address').textContent = e.target.value.trim() ? `📍 ${e.target.value.trim()}` : '📍 Lengkapi alamat restoran';
      }
    });
  });

  // UPLOAD SCREENSHOT REFERENSI MENU TOKO
  document.getElementById('ttg-pick-menucard-btn').onclick = () => document.getElementById('ttg-menucard-input').click();
  document.getElementById('ttg-menucard-input').onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    const dataUrl = await new Promise(res => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result);
      reader.readAsDataURL(file);
    });
    const img = new Image();
    img.src = dataUrl;
    await new Promise(res => (img.onload = res));
    loadedMenuCardImg = img;

    projectManager.updateRestaurantData({ menuCardDataUrl: dataUrl });
    syncUiFromProject();
  };

  document.getElementById('ttg-new-project-btn').onclick = () => {
    const nama = prompt('Nama restoran untuk proyek baru:', '');
    if (nama !== null) {
      loadedImages = [];
      loadedMenuCardImg = null;
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

  document.getElementById('ttg-pick-photos-btn').onclick = () => document.getElementById('ttg-photo-input').click();

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
        id: `photo_${i}_${Date.now()}`,
        name: files[i].name,
        order: i,
        dataUrl
      });
    }

    if (proj.photos[0]) document.getElementById('ttg-banner-thumb').src = proj.photos[0].dataUrl;
    projectManager.saveProjects();
    renderPhotoGrid(proj);
  };

  document.getElementById('ttg-pick-audio-btn').onclick = () => document.getElementById('ttg-audio-input').click();

  document.getElementById('ttg-audio-input').onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    const info = await audioEngine.loadAudioFile(file);
    currentPeaks = info.peaks;

    const proj = projectManager.getActiveProject();
    proj.audioConfig.fileName = file.name;
    proj.audioConfig.beatTimestamps = info.beats;
    proj.audioConfig.duration = info.clipDuration;

    const slider = document.getElementById('ttg-audio-slider');
    slider.disabled = false;
    slider.max = Math.max(0, Math.floor(info.totalDuration - info.clipDuration));
    slider.value = 0;

    document.getElementById('ttg-audio-filename').textContent = file.name;
    document.getElementById('ttg-beat-badge').textContent = `${info.beats.length} Beat`;
    document.getElementById('ttg-chip-music').textContent = 'Aktif';
    document.getElementById('ttg-trim-range-text').textContent = `Potongan: 00:00 – ${fmtTime(info.clipDuration)}`;
    renderWaveform(currentPeaks, 0, info.totalDuration, info.clipDuration);
  };

  document.getElementById('ttg-audio-slider').oninput = e => {
    const startSec = Number(e.target.value) || 0;
    audioEngine.setTrimWindow(startSec, 20);
    const proj = projectManager.getActiveProject();
    proj.audioConfig.startTime = startSec;
    proj.audioConfig.beatTimestamps = audioEngine.beats;

    const endSec = startSec + audioEngine.clipDuration;
    document.getElementById('ttg-trim-range-text').textContent = `Potongan: ${fmtTime(startSec)} – ${fmtTime(endSec)}`;
    document.getElementById('ttg-beat-badge').textContent = `${audioEngine.beats.length} Beat`;
    renderWaveform(currentPeaks, startSec, audioEngine.audioBuffer.duration, audioEngine.clipDuration);
  };

  document.getElementById('ttg-play-audio-btn').onclick = () => {
    const btn = document.getElementById('ttg-play-audio-btn');
    if (!audioEngine.audioBuffer) {
      alert('Upload lagu terlebih dahulu.');
      return;
    }
    if (audioEngine.isPlayingPreview) {
      audioEngine.stopAudio();
      btn.textContent = '▶ Dengar Potongan';
    } else {
      btn.textContent = '⏹ Stop Audio';
      audioEngine.playClip({
        captureForVideo: false,
        monitorSpeaker: true,
        onEnded: () => { btn.textContent = '▶ Dengar Potongan'; }
      });
    }
  };

  document.getElementById('ttg-generate-and-render-btn').onclick = () => {
    const proj = projectManager.getActiveProject();
    proj.promptInstruction = document.getElementById('ttg-prompt').value;

    try {
      const result = CulinaryStoryteller.generateStoryboard(proj);
      proj.generatedContent = result;
      projectManager.saveProjects();
      syncUiFromProject();
      goToStep(4);

      if (loadedImages.length > 0) {
        renderer.renderFrame({
          t: 0.1,
          totalDuration: audioEngine.clipDuration || 20,
          images: loadedImages,
          menuCardImage: loadedMenuCardImg,
          scenes: proj.generatedContent.scenes,
          beats: proj.audioConfig.beatTimestamps,
          restaurantData: proj.restaurantData
        });
      }
      document.getElementById('ttg-render-title').textContent = '🎬 Preview Siap Diputar & Dirender';
      document.getElementById('ttg-progress-pill').textContent = '⚡ Siap';
    } catch (err) {
      alert(err.message);
    }
  };

  function startLivePreview() {
    const proj = projectManager.getActiveProject();
    if (loadedImages.length < 5 || proj.generatedContent.scenes.length === 0) {
      alert('Pastikan minimal 5 foto terunggah dan cerita sudah dibuat.');
      return;
    }

    const oldVid = document.getElementById('ttg-final-video-player');
    if (oldVid) oldVid.remove();

    if (previewAnimId) cancelAnimationFrame(previewAnimId);
    audioEngine.stopAudio();

    const totalDuration = audioEngine.clipDuration || 20;
    const hasAudio = Boolean(audioEngine.audioBuffer);
    if (hasAudio) {
      audioEngine.playClip({ captureForVideo: false, monitorSpeaker: true });
    }

    const startPerf = performance.now();
    function loop(now) {
      const elapsed = hasAudio
        ? audioEngine.getElapsedPlaybackTime()
        : (now - startPerf) / 1000;

      if (elapsed < totalDuration && (!hasAudio || audioEngine.isPlayingPreview)) {
        renderer.renderFrame({
          t: elapsed,
          totalDuration,
          images: loadedImages,
          menuCardImage: loadedMenuCardImg,
          scenes: proj.generatedContent.scenes,
          beats: proj.audioConfig.beatTimestamps,
          restaurantData: proj.restaurantData
        });
        previewAnimId = requestAnimationFrame(loop);
      } else {
        renderer.renderFrame({
          t: totalDuration - 0.01,
          totalDuration,
          images: loadedImages,
          menuCardImage: loadedMenuCardImg,
          scenes: proj.generatedContent.scenes,
          beats: proj.audioConfig.beatTimestamps,
          restaurantData: proj.restaurantData
        });
        audioEngine.stopAudio();
      }
    }
    previewAnimId = requestAnimationFrame(loop);
  }

  document.getElementById('ttg-preview-btn').onclick = startLivePreview;
  document.getElementById('ttg-modal-play-btn').onclick = startLivePreview;

  function triggerMobileSave(blob, url, fileName) {
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 1500);

    const box = document.getElementById('ttg-video-box-normal');
    let vidEl = document.getElementById('ttg-final-video-player');
    if (!vidEl) {
      vidEl = document.createElement('video');
      vidEl.id = 'ttg-final-video-player';
      vidEl.controls = true;
      vidEl.playsInline = true;
      vidEl.style.cssText = 'position:absolute; inset:0; width:100%; height:100%; object-fit:contain; background:#000; border-radius:12px; z-index:5;';
      box.appendChild(vidEl);
    }
    vidEl.src = url;
    vidEl.load();
  }

  async function executeRenderAndDownload() {
    const proj = projectManager.getActiveProject();
    if (loadedImages.length < 5 || proj.generatedContent.scenes.length === 0) {
      alert('Upload minimal 5 foto dan generate cerita terlebih dahulu.');
      return;
    }

    if (previewAnimId) cancelAnimationFrame(previewAnimId);
    const oldVid = document.getElementById('ttg-final-video-player');
    if (oldVid) oldVid.remove();

    const resMode = document.getElementById('ttg-res-select').value;
    renderer.setResolution(resMode);

    const totalDuration = audioEngine.clipDuration || 20;
    const hasAudio = Boolean(audioEngine.audioBuffer);
    const audioStream = hasAudio
      ? audioEngine.playClip({ captureForVideo: true, monitorSpeaker: true })
      : null;

    document.getElementById('ttg-render-title').textContent = '⏳ Merender Video + Kartu Menu...';

    const startPerf = performance.now();
    const result = await renderer.exportVideo({
      totalDuration,
      fps: 30,
      audioStream,
      getCurrentTime: () => hasAudio ? audioEngine.getElapsedPlaybackTime() : (performance.now() - startPerf) / 1000,
      renderParams: {
        images: loadedImages,
        menuCardImage: loadedMenuCardImg,
        scenes: proj.generatedContent.scenes,
        beats: proj.audioConfig.beatTimestamps,
        restaurantData: proj.restaurantData
      },
      onProgress: pct => {
        document.getElementById('ttg-progress-pill').textContent = `⚡ ${pct}%`;
      },
      onStatus: msg => {
        document.getElementById('ttg-render-title').textContent = `⏳ ${msg}`;
      }
    });

    audioEngine.stopAudio();

    if (result && result.url) {
      lastRenderedBlob = result.blob;
      lastRenderedVideoUrl = result.url;
      const safeName = (proj.restaurantData.name || 'restoran').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      lastRenderedFileName = `ch-ai-tiktok-go-${safeName}.${result.ext}`;

      document.getElementById('ttg-render-title').textContent = '✅ Selesai! Tersimpan di HP';
      document.getElementById('ttg-progress-pill').textContent = '⚡ 100%';

      triggerMobileSave(lastRenderedBlob, lastRenderedVideoUrl, lastRenderedFileName);
    }
  }

  document.getElementById('ttg-render-btn').onclick = executeRenderAndDownload;
  document.getElementById('ttg-modal-download-btn').onclick = executeRenderAndDownload;
  document.getElementById('ttg-download-again-btn').onclick = () => {
    if (lastRenderedVideoUrl) {
      triggerMobileSave(lastRenderedBlob, lastRenderedVideoUrl, lastRenderedFileName);
    } else {
      executeRenderAndDownload();
    }
  };

  const modal = document.getElementById('ttg-fullscreen-modal');
  const modalSlot = document.getElementById('ttg-modal-canvas-slot');
  const normalBox = document.getElementById('ttg-video-box-normal');

  document.getElementById('ttg-expand-btn').onclick = () => {
    modalSlot.appendChild(canvas);
    modal.style.display = 'flex';
  };

  document.getElementById('ttg-close-modal-btn').onclick = () => {
    normalBox.insertBefore(canvas, normalBox.firstChild);
    modal.style.display = 'none';
  };

  document.getElementById('ttg-copy-caption-btn').onclick = () => {
    const text = document.getElementById('ttg-caption-output').value;
    navigator.clipboard.writeText(text);
    alert('Caption & Hashtag berhasil disalin!');
  };

  syncUiFromProject();
}
