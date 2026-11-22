import fs from 'fs';
import path from 'path';

const targetDir = path.join(process.cwd(), 'public', 'modules', 'tiktok-go');

// 1. UPDATE AUDIO ENGINE: Expose exact hardware audio clock untuk sinkronisasi 1:1
const audioCode = `export class BeatSyncAudioEngine {
  constructor() {
    this.audioCtx = null;
    this.audioBuffer = null;
    this.startTime = 0;
    this.clipDuration = 20;
    this.beats = [];
    this.activeSource = null;
    this.isPlayingPreview = false;
    this.playbackStartedAt = 0;
  }

  ensureContext() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  async loadAudioFile(file) {
    this.ensureContext();
    this.stopAudio();
    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
    this.startTime = 0;
    this.clipDuration = Math.min(20, this.audioBuffer.duration);
    this.analyzeBeats();
    return {
      totalDuration: this.audioBuffer.duration,
      clipDuration: this.clipDuration,
      beats: this.beats,
      peaks: this.getWaveformPeaks(60)
    };
  }

  setTrimWindow(startTimeSeconds, durationSeconds = 20) {
    if (!this.audioBuffer) return;
    const maxStart = Math.max(0, this.audioBuffer.duration - 1);
    this.startTime = Math.min(Math.max(0, startTimeSeconds), maxStart);
    this.clipDuration = Math.min(durationSeconds, this.audioBuffer.duration - this.startTime);
    this.analyzeBeats();
  }

  getWaveformPeaks(bars = 60) {
    if (!this.audioBuffer) return new Array(bars).fill(0.2);
    const data = this.audioBuffer.getChannelData(0);
    const step = Math.floor(data.length / bars) || 1;
    const peaks = [];
    for (let i = 0; i < bars; i++) {
      let max = 0;
      for (let j = 0; j < step; j++) {
        const val = Math.abs(data[i * step + j] || 0);
        if (val > max) max = val;
      }
      peaks.push(Math.max(0.12, max));
    }
    return peaks;
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
    const threshold = avgEnergy * 1.32;

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

  /**
   * Mengembalikan waktu berjalan presisi (detik) berbasis hardware audio clock
   */
  getElapsedPlaybackTime() {
    if (!this.audioCtx || !this.isPlayingPreview) return 0;
    return Math.max(0, this.audioCtx.currentTime - this.playbackStartedAt);
  }

  playClip({ captureForVideo = false, monitorSpeaker = true, onEnded = null } = {}) {
    if (!this.audioBuffer) return null;
    this.ensureContext();
    this.stopAudio();

    const source = this.audioCtx.createBufferSource();
    source.buffer = this.audioBuffer;

    if (monitorSpeaker) {
      source.connect(this.audioCtx.destination);
    }

    let mediaStream = null;
    if (captureForVideo) {
      const dest = this.audioCtx.createMediaStreamDestination();
      source.connect(dest);
      mediaStream = dest.stream;
    }

    source.onended = () => {
      this.isPlayingPreview = false;
      this.activeSource = null;
      if (onEnded) onEnded();
    };

    this.playbackStartedAt = this.audioCtx.currentTime;
    source.start(0, this.startTime, this.clipDuration);
    this.activeSource = source;
    this.isPlayingPreview = true;
    return mediaStream;
  }

  stopAudio() {
    if (this.activeSource) {
      try {
        this.activeSource.onended = null;
        this.activeSource.stop();
        this.activeSource.disconnect();
      } catch (e) {}
      this.activeSource = null;
    }
    this.isPlayingPreview = false;
  }
}
`;

// 2. UPDATE RENDERER: Gunakan real-time clock (bukan frame counter yang bisa molor) agar pas 100% dengan lagu
const rendererCode = `export class TikTokGoVideoRenderer {
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

    // Kunci t agar tidak pernah melewati totalDuration
    const clampedT = Math.min(Math.max(0, t), Math.max(0.01, totalDuration - 0.001));
    const sceneDuration = totalDuration / numScenes;
    const sceneIndex = Math.min(numScenes - 1, Math.floor(clampedT / sceneDuration));
    const sceneLocalTime = clampedT - sceneIndex * sceneDuration;
    const sceneProgress = sceneLocalTime / sceneDuration;

    const currentImg = images[sceneIndex % images.length];
    const currentScene = scenes[sceneIndex];
    const isOnBeat = beats.some(b => Math.abs(b - clampedT) < 0.08);

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

  /**
   * Export video menggunakan real-time clock (getCurrentTime) sehingga video & lagu berhenti di detik yang sama persis
   */
  async exportVideo({ totalDuration, fps = 30, renderParams, audioStream = null, getCurrentTime = null, onProgress }) {
    if (this.isRendering) return null;
    this.isRendering = true;

    const canvasStream = this.canvas.captureStream(fps);
    if (audioStream) {
      audioStream.getAudioTracks().forEach(track => canvasStream.addTrack(track));
    }

    // Prioritaskan MP4 H.264 jika didukung Android Chrome, fallback ke WebM VP8/VP9 yang valid
    const candidates = [
      { mime: 'video/mp4;codecs=avc1,mp4a.40.2', ext: 'mp4' },
      { mime: 'video/mp4', ext: 'mp4' },
      { mime: 'video/webm;codecs=vp8,opus', ext: 'webm' },
      { mime: 'video/webm;codecs=vp9,opus', ext: 'webm' },
      { mime: 'video/webm', ext: 'webm' }
    ];
    const chosen = candidates.find(c => MediaRecorder.isTypeSupported(c.mime)) || { mime: '', ext: 'webm' };

    const recorder = new MediaRecorder(canvasStream, {
      ...(chosen.mime ? { mimeType: chosen.mime } : {}),
      videoBitsPerSecond: this.canvas.width === 1080 ? 6_500_000 : 3_800_000
    });

    const chunks = [];
    recorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    return new Promise((resolve) => {
      recorder.onstop = () => {
        this.isRendering = false;
        const finalMime = chosen.mime || recorder.mimeType || 'video/webm';
        const blob = new Blob(chunks, { type: finalMime });
        const url = URL.createObjectURL(blob);
        resolve({ blob, url, mimeType: finalMime, ext: chosen.ext });
      };

      // Gambar frame 0 dulu sebelum mulai merekam
      this.renderFrame({ ...renderParams, t: 0, totalDuration });
      recorder.start(250);

      const startPerf = performance.now();
      let stopped = false;

      const step = () => {
        if (stopped) return;
        const elapsed = getCurrentTime ? getCurrentTime() : (performance.now() - startPerf) / 1000;

        if (elapsed >= totalDuration) {
          stopped = true;
          this.renderFrame({ ...renderParams, t: totalDuration - 0.01, totalDuration });
          if (onProgress) onProgress(100);
          setTimeout(() => {
            if (recorder.state !== 'inactive') recorder.stop();
          }, 120);
          return;
        }

        this.renderFrame({ ...renderParams, t: elapsed, totalDuration });
        if (onProgress) {
          onProgress(Math.min(99, Math.round((elapsed / totalDuration) * 100)));
        }
        requestAnimationFrame(step);
      };

      requestAnimationFrame(step);
    });
  }
}
`;

// 3. UPDATE UI: Sinkronisasi jam audio 1:1 + Pemutar hasil video <video> + Simpan ke HP Android
const uiPath = path.join(targetDir, 'tiktok-go-ui.js');
let uiCode = fs.readFileSync(uiPath, 'utf8');

// Perbarui startLivePreview agar mengunci ke audioEngine.getElapsedPlaybackTime()
const oldPreviewFn = /function startLivePreview\(\) \{[\s\S]*?previewAnimId = requestAnimationFrame\(loop\);\s*\}/;
const newPreviewFn = `function startLivePreview() {
    const proj = projectManager.getActiveProject();
    if (loadedImages.length < 5 || proj.generatedContent.scenes.length === 0) {
      alert('Pastikan minimal 5 foto terunggah dan cerita sudah dibuat.');
      return;
    }

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
          scenes: proj.generatedContent.scenes,
          beats: proj.audioConfig.beatTimestamps,
          restaurantData: proj.restaurantData
        });
        audioEngine.stopAudio();
      }
    }
    previewAnimId = requestAnimationFrame(loop);
  }`;

uiCode = uiCode.replace(oldPreviewFn, newPreviewFn);

// Perbarui executeRenderAndDownload agar menyimpan dengan ekstensi tepat + tombol Simpan HP + <video> player
const oldRenderFn = /async function executeRenderAndDownload\(\) \{[\s\S]*?a\.click\(\);\s*\}\s*\}/;
const newRenderFn = `let lastRenderedBlob = null;

  function triggerMobileSave(blob, url, fileName) {
    // 1. Trigger anchor download standar
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 1500);

    // 2. Tampilkan pemutar <video> native di kotak preview agar di HP Android bisa juga ditekan tahan -> Download Video
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
    // Hapus player video lama jika render ulang
    const oldVid = document.getElementById('ttg-final-video-player');
    if (oldVid) oldVid.remove();

    const resMode = document.getElementById('ttg-res-select').value;
    renderer.setResolution(resMode);

    const totalDuration = audioEngine.clipDuration || 20;
    const hasAudio = Boolean(audioEngine.audioBuffer);
    const audioStream = hasAudio
      ? audioEngine.playClip({ captureForVideo: true, monitorSpeaker: true })
      : null;

    document.getElementById('ttg-render-title').textContent = '⏳ Merender Video + Musik...';

    const startPerf = performance.now();
    const result = await renderer.exportVideo({
      totalDuration,
      fps: 30,
      audioStream,
      getCurrentTime: () => hasAudio ? audioEngine.getElapsedPlaybackTime() : (performance.now() - startPerf) / 1000,
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

    audioEngine.stopAudio();

    if (result && result.url) {
      lastRenderedBlob = result.blob;
      lastRenderedVideoUrl = result.url;
      const safeName = (proj.restaurantData.name || 'restoran').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      lastRenderedFileName = \`ch-ai-tiktok-go-\${safeName}.\${result.ext}\`;

      document.getElementById('ttg-render-title').textContent = '✅ Selesai! Tersimpan di HP';
      document.getElementById('ttg-progress-pill').textContent = '⚡ 100%';

      triggerMobileSave(lastRenderedBlob, lastRenderedVideoUrl, lastRenderedFileName);
    }
  }`;

uiCode = uiCode.replace(oldRenderFn, newRenderFn);

fs.writeFileSync(path.join(targetDir, 'tiktok-go-audio.js'), audioCode, 'utf8');
fs.writeFileSync(path.join(targetDir, 'tiktok-go-renderer.js'), rendererCode, 'utf8');
fs.writeFileSync(uiPath, uiCode, 'utf8');
console.log('✓ Sinkronisasi 1:1 lagu-gambar & penyimpanan video di HP berhasil diperbarui!');
