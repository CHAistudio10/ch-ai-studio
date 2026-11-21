export class TikTokGoVideoRenderer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d', { alpha: false });
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
    ctx.font = `bold ${Math.round(width * 0.032)}px Inter, sans-serif`;
    ctx.fillText(`📍 ${data.name || 'Nama Restoran'}`, pad + 20, pad * 1.4 + boxH * 0.62);
    ctx.restore();
  }

  drawStoryText(ctx, width, height, scene, localTime) {
    const alpha = Math.min(1, localTime * 4);
    ctx.save();
    ctx.globalAlpha = alpha;

    const fontSize = Math.round(width * 0.044);
    ctx.font = `800 ${fontSize}px Inter, sans-serif`;
    ctx.textAlign = 'center';

    const maxTextWidth = width * 0.84;
    const words = scene.text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
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
    ctx.font = `bold ${Math.round(width * 0.036)}px Inter, sans-serif`;

    const title = phase === 'CTA_MAPS'
      ? `🗺️ KLIK TAG MAPS: ${data.tiktokLocationTag || data.name || 'Lokasi Restoran'}`
      : `🎟️ KLIK PROMO TIKTOK: ${data.tiktokPromoTag || data.menuName || 'Paket Promo'}`;

    ctx.fillText(title, width / 2, y + boxH * 0.6);
    ctx.restore();
  }

  /**
   * Merekam canvas + audio dengan format valid untuk Galeri Android & TikTok (bebas bug 00:00)
   */
  async exportVideo({ totalDuration, fps = 30, renderParams, audioStream = null, getCurrentTime = null, onProgress }) {
    if (this.isRendering) return null;
    this.isRendering = true;

    // Gambar frame awal terlebih dahulu sebelum captureStream agar track video langsung aktif
    this.renderFrame({ ...renderParams, t: 0, totalDuration });

    const canvasStream = this.canvas.captureStream(fps);
    const videoTrack = canvasStream.getVideoTracks()[0];

    const combinedStream = new MediaStream();
    if (videoTrack) combinedStream.addTrack(videoTrack);
    if (audioStream) {
      audioStream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
    }

    // Hindari bug fragmented MP4 Chrome Android yang menghasilkan durasi 00:00 di Galeri;
    // gunakan WebM VP8/VP9 yang diputar sempurna di Android Gallery & TikTok, atau MP4 khusus iOS/Safari
    const isApple = /iPad|iPhone|iPod|Safari/i.test(navigator.userAgent) && !/Chrome|Android/i.test(navigator.userAgent);
    const candidates = isApple
      ? [
          { mime: 'video/mp4', ext: 'mp4' },
          { mime: 'video/webm', ext: 'webm' }
        ]
      : [
          { mime: 'video/webm;codecs=vp8,opus', ext: 'webm' },
          { mime: 'video/webm;codecs=vp9,opus', ext: 'webm' },
          { mime: 'video/webm', ext: 'webm' },
          { mime: 'video/mp4', ext: 'mp4' }
        ];

    const chosen = candidates.find(c => MediaRecorder.isTypeSupported(c.mime)) || { mime: '', ext: 'webm' };

    const recorder = new MediaRecorder(combinedStream, {
      ...(chosen.mime ? { mimeType: chosen.mime } : {}),
      videoBitsPerSecond: this.canvas.width === 1080 ? 5_500_000 : 3_200_000
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

      // Timeslice 500ms memaksa MediaRecorder menulis cluster frame secara rutin ke buffer
      recorder.start(500);

      const startPerf = performance.now();
      let stopped = false;
      const frameMs = Math.round(1000 / fps);

      // Gunakan timer stabil 30fps agar frame tetap ditulis walau layar HP sedikit terbebani
      const intervalId = setInterval(() => {
        if (stopped) return;
        const elapsed = getCurrentTime ? getCurrentTime() : (performance.now() - startPerf) / 1000;

        if (elapsed >= totalDuration) {
          stopped = true;
          clearInterval(intervalId);
          this.renderFrame({ ...renderParams, t: totalDuration - 0.01, totalDuration });
          if (videoTrack && typeof videoTrack.requestFrame === 'function') {
            videoTrack.requestFrame();
          }
          if (onProgress) onProgress(100);

          try {
            if (recorder.state === 'recording') recorder.requestData();
          } catch (e) {}

          setTimeout(() => {
            if (recorder.state !== 'inactive') recorder.stop();
          }, 300);
          return;
        }

        this.renderFrame({ ...renderParams, t: elapsed, totalDuration });
        if (videoTrack && typeof videoTrack.requestFrame === 'function') {
          videoTrack.requestFrame();
        }
        if (onProgress) {
          onProgress(Math.min(99, Math.round((elapsed / totalDuration) * 100)));
        }
      }, frameMs);
    });
  }
}
