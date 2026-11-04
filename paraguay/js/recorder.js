// Запись с микрофона → Float32Array 16 кГц моно (формат для Whisper) + уровень громкости для анимации.
export class Recorder {
  constructor({ onLevel, maxSeconds = 30 } = {}) {
    this.onLevel = onLevel;
    this.maxSeconds = maxSeconds;
    this.recording = false;
  }

  static supported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    this.chunks = [];
    this.mr = new MediaRecorder(this.stream);
    this.mr.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.mr.start();
    this.recording = true;

    // Индикатор громкости
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = this.ctx.createMediaStreamSource(this.stream);
      const an = this.ctx.createAnalyser();
      an.fftSize = 512;
      src.connect(an);
      const buf = new Uint8Array(an.fftSize);
      const tick = () => {
        if (!this.recording) return;
        an.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
        this.onLevel && this.onLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4));
        this.raf = requestAnimationFrame(tick);
      };
      tick();
    } catch { /* без индикатора */ }

    this.timer = setTimeout(() => this.recording && this.stop(), this.maxSeconds * 1000);
    this.done = new Promise((resolve, reject) => {
      this.mr.onstop = async () => {
        try {
          const blob = new Blob(this.chunks, { type: this.mr.mimeType || 'audio/webm' });
          resolve(await toPCM16k(blob));
        } catch (e) { reject(e); }
      };
    });
  }

  /** Останавливает запись и возвращает Float32Array (16 кГц). */
  async stop() {
    if (!this.recording) return this.done;
    this.recording = false;
    clearTimeout(this.timer);
    cancelAnimationFrame(this.raf);
    this.mr.stop();
    this.stream.getTracks().forEach((t) => t.stop());
    try { await this.ctx?.close(); } catch { /* ignore */ }
    this.onLevel && this.onLevel(0);
    return this.done;
  }

  cancel() {
    if (!this.recording) return;
    this.recording = false;
    clearTimeout(this.timer);
    cancelAnimationFrame(this.raf);
    try { this.mr.stop(); } catch { /* ignore */ }
    this.stream.getTracks().forEach((t) => t.stop());
    try { this.ctx?.close(); } catch { /* ignore */ }
    this.onLevel && this.onLevel(0);
  }
}

async function toPCM16k(blob) {
  const arr = await blob.arrayBuffer();
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  const decoded = await new Promise((res, rej) => ctx.decodeAudioData(arr, res, rej));
  try { await ctx.close(); } catch { /* ignore */ }
  const target = 16000;
  const length = Math.max(1, Math.ceil(decoded.duration * target));
  const off = new OfflineAudioContext(1, length, target);
  const src = off.createBufferSource();
  src.buffer = decoded;
  src.connect(off.destination);
  src.start();
  const rendered = await off.startRendering();
  return rendered.getChannelData(0);
}

// Онлайн-распознавание средствами браузера (запасной вариант, если офлайн-модель не скачана).
export function browserSpeechAvailable() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function browserRecognize(lang) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new SR();
  rec.lang = lang;
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  const promise = new Promise((resolve, reject) => {
    rec.onresult = (e) => resolve(e.results[0][0].transcript);
    rec.onerror = (e) => reject(new Error(e.error === 'not-allowed' ? 'Нет доступа к микрофону' : `Распознавание: ${e.error}`));
    rec.onend = () => resolve('');
  });
  rec.start();
  return { promise, stop: () => rec.stop() };
}
