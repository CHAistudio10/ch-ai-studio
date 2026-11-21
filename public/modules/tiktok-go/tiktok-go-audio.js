export class BeatSyncAudioEngine {
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
