export class TikTokGoVideoRenderer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d', { alpha: false });
    this.isRendering = false;
    this.ffmpeg = null;
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

  renderFrame({ t, totalDuration, images, menuCardImage = null, scenes, beats, restaurantData }) {
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

    // Zoom halus agar subjek foto tetap utuh dan tidak terpotong berlebihan
    const baseZoom = 1.0 + sceneProgress * 0.08;
    const beatPulse = isOnBeat ? 0.03 : 0;
    const scale = baseZoom + beatPulse;

    let offsetX = 0;
    let offsetY = 0;
    if (isOnBeat) {
      offsetX = (Math.random() - 0.5) * 10;
      offsetY = (Math.random() - 0.5) * 10;
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
      ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
      ctx.fillRect(0, 0, width, height);
    }

    // Gradasi tipis hanya di tepi atas & tepi bawah agar bagian tengah foto terbuka bersih
    const topGrad = ctx.createLinearGradient(0, 0, 0, height * 0.16);
    topGrad.addColorStop(0, 'rgba(5, 5, 12, 0.72)');
    topGrad.addColorStop(1, 'rgba(5, 5, 12, 0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, width, height * 0.16);

    const botGrad = ctx.createLinearGradient(0, height * 0.72, 0, height);
    botGrad.addColorStop(0, 'rgba(5, 5, 12, 0)');
    botGrad.addColorStop(1, 'rgba(5, 5, 12, 0.88)');
    ctx.fillStyle = botGrad;
    ctx.fillRect(0, height * 0.72, width, height * 0.28);

    // 1. Badge Nama Restoran Ringkas di Kiri Atas
    this.drawTopBadge(ctx, width, restaurantData);

    // 2. Kartu Referensi Screenshot Menu Toko selalu tampil rapi di pojok kanan atas
    if (menuCardImage && menuCardImage.naturalWidth > 0) {
      this.drawFloatingMenuCard(ctx, width, height, menuCardImage, sceneLocalTime);
    }

    // 3. Teks Storytelling di Posisi Bawah Rapi (tidak menutupi objek utama di tengah)
    this.drawStoryText(ctx, width, height, currentScene, sceneLocalTime);

    // 4. Pill CTA Maps & Promo Ringkas di atas teks bawah pada 2 scene terakhir
    if (currentScene.phase === 'CTA_MAPS' || currentScene.phase === 'CTA_PROMO') {
      this.drawCtaOverlay(ctx, width, height, currentScene.phase, restaurantData);
    }
  }

  drawTopBadge(ctx, width, data) {
    const pad = width * 0.04;
    ctx.save();
    ctx.fillStyle = 'rgba(14, 14, 26, 0.78)';
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 2;

    const boxW = width * 0.54;
    const boxH = width * 0.072;
    ctx.beginPath();
    ctx.roundRect(pad, pad * 1.2, boxW, boxH, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.round(width * 0.028)}px Inter, sans-serif`;
    ctx.fillText(`📍 ${data.name || 'Restoran'}`, pad + 14, pad * 1.2 + boxH * 0.64);
    ctx.restore();
  }

  drawFloatingMenuCard(ctx, width, height, menuImg, localTime) {
    ctx.save();
    const slideIn = Math.min(1, localTime * 4);
    const pad = width * 0.04;
    const cardW = width * 0.34;
    const aspect = menuImg.naturalHeight / menuImg.naturalWidth;
    const cardH = Math.min(height * 0.28, cardW * aspect);

    const x = width - cardW - pad + (1 - slideIn) * 40;
    const y = pad * 1.2;

    ctx.globalAlpha = slideIn;

    // Bingkai kartu menu melayang dengan shadow & border neon
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#0F0D22';
    ctx.strokeStyle = '#8E2DE2';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.roundRect(x - 4, y - 4, cardW + 8, cardH + 28, 14);
    ctx.fill();
    ctx.stroke();

    // Clip & gambar screenshot menu
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, cardW, cardH, 10);
    ctx.clip();
    ctx.drawImage(menuImg, x, y, cardW, cardH);
    ctx.restore();

    // Label kecil di bawah kartu menu
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#00F0FF';
    ctx.font = `bold ${Math.round(width * 0.022)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('🧾 KARTU MENU TOKO', x + cardW / 2, y + cardH + 17);

    ctx.restore();
  }

  drawStoryText(ctx, width, height, scene, localTime) {
    const alpha = Math.min(1, localTime * 4);
    ctx.save();
    ctx.globalAlpha = alpha;

    // Ukuran font proporsional & ditempatkan di area bawah (height * 0.80) agar tengah foto bersih
    const fontSize = Math.round(width * 0.036);
    ctx.font = `800 ${fontSize}px Inter, sans-serif`;
    ctx.textAlign = 'center';

    const maxTextWidth = width * 0.86;
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

    const startY = height * 0.81;
    const lineHeight = fontSize * 1.28;

    lines.forEach((line, idx) => {
      const y = startY + idx * lineHeight;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.92)';
      ctx.lineWidth = Math.round(fontSize * 0.24);
      ctx.strokeText(line, width / 2, y);

      ctx.fillStyle = idx === 0 && scene.phase === 'HOOK' ? '#00F0FF' : '#FFFFFF';
      ctx.fillText(line, width / 2, y);
    });

    ctx.restore();
  }

  drawCtaOverlay(ctx, width, height, phase, data) {
    ctx.save();
    const boxW = width * 0.78;
    const boxH = width * 0.085;
    const x = (width - boxW) / 2;
    const y = height * 0.69;

    const grad = ctx.createLinearGradient(x, y, x + boxW, y + boxH);
    if (phase === 'CTA_MAPS') {
      grad.addColorStop(0, 'rgba(0, 180, 219, 0.92)');
      grad.addColorStop(1, 'rgba(0, 131, 176, 0.92)');
    } else {
      grad.addColorStop(0, 'rgba(142, 45, 226, 0.92)');
      grad.addColorStop(1, 'rgba(74, 0, 224, 0.92)');
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, boxW, boxH, 18);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.font = `bold ${Math.round(width * 0.030)}px Inter, sans-serif`;

    const title = phase === 'CTA_MAPS'
      ? `🗺️ KLIK TAG MAPS: ${data.tiktokLocationTag || data.name || 'Lokasi Restoran'}`
      : `🎟️ KLIK PROMO TIKTOK: ${data.tiktokPromoTag || data.menuName || 'Paket Promo'}`;

    ctx.fillText(title, width / 2, y + boxH * 0.62);
    ctx.restore();
  }

  async convertToGallerySafeMp4(rawBlob, onStatus) {
    try {
      if (onStatus) onStatus('Mengemas MP4 Galeri...');
      if (!this.ffmpeg) {
        const { FFmpeg } = await import('https://esm.sh/@ffmpeg/ffmpeg@0.12.10');
        const { toBlobURL } = await import('https://esm.sh/@ffmpeg/util@0.12.1');
        const ff = new FFmpeg();
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
        await ff.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
        });
        this.ffmpeg = ff;
      }

      const inputBytes = new Uint8Array(await rawBlob.arrayBuffer());
      await this.ffmpeg.writeFile('raw_input.webm', inputBytes);

      await this.ffmpeg.exec([
        '-i', 'raw_input.webm',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '24',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        'output_gallery.mp4'
      ]);

      const mp4Data = await this.ffmpeg.readFile('output_gallery.mp4');
      await this.ffmpeg.deleteFile('raw_input.webm');
      await this.ffmpeg.deleteFile('output_gallery.mp4');

      const mp4Blob = new Blob([mp4Data.buffer], { type: 'video/mp4' });
      return {
        blob: mp4Blob,
        url: URL.createObjectURL(mp4Blob),
        mimeType: 'video/mp4',
        ext: 'mp4'
      };
    } catch (err) {
      console.warn('[TikTok Go] Fallback ke raw stream:', err);
      return null;
    }
  }

  async exportVideo({ totalDuration, fps = 30, renderParams, audioStream = null, getCurrentTime = null, onProgress, onStatus }) {
    if (this.isRendering) return null;
    this.isRendering = true;

    this.renderFrame({ ...renderParams, t: 0, totalDuration });

    const canvasStream = this.canvas.captureStream(fps);
    const videoTrack = canvasStream.getVideoTracks()[0];

    const combinedStream = new MediaStream();
    if (videoTrack) combinedStream.addTrack(videoTrack);
    if (audioStream) {
      audioStream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
    }

    const candidates = [
      { mime: 'video/webm;codecs=vp8,opus', ext: 'webm' },
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

    const rawResult = await new Promise((resolve) => {
      recorder.onstop = () => {
        const finalMime = chosen.mime || recorder.mimeType || 'video/webm';
        const blob = new Blob(chunks, { type: finalMime });
        resolve({ blob, url: URL.createObjectURL(blob), mimeType: finalMime, ext: chosen.ext });
      };

      recorder.start(500);

      const startPerf = performance.now();
      let stopped = false;
      const frameMs = Math.round(1000 / fps);

      const intervalId = setInterval(() => {
        if (stopped) return;
        const elapsed = getCurrentTime ? getCurrentTime() : (performance.now() - startPerf) / 1000;

        if (elapsed >= totalDuration) {
          stopped = true;
          clearInterval(intervalId);
          this.renderFrame({ ...renderParams, t: totalDuration - 0.01, totalDuration });
          if (videoTrack && typeof videoTrack.requestFrame === 'function') videoTrack.requestFrame();
          if (onProgress) onProgress(95);

          try {
            if (recorder.state === 'recording') recorder.requestData();
          } catch (e) {}

          setTimeout(() => {
            if (recorder.state !== 'inactive') recorder.stop();
          }, 300);
          return;
        }

        this.renderFrame({ ...renderParams, t: elapsed, totalDuration });
        if (videoTrack && typeof videoTrack.requestFrame === 'function') videoTrack.requestFrame();
        if (onProgress) {
          onProgress(Math.min(90, Math.round((elapsed / totalDuration) * 90)));
        }
      }, frameMs);
    });

    const safeMp4 = await this.convertToGallerySafeMp4(rawResult.blob, onStatus);
    this.isRendering = false;
    if (onProgress) onProgress(100);

    return safeMp4 || rawResult;
  }
}
