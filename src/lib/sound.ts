/**
 * Web Audio API 기반 효과음
 * 가벼운 합성음으로 외부 파일 불필요
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

/** AudioContext 재개 (브라우저 정책 — 사용자 인터랙션 후 필요) */
export function resumeAudio() {
  if (audioCtx?.state === 'suspended') {
    audioCtx.resume();
  }
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // AudioContext 미지원 시 무시
  }
}

function playNoise(duration: number, volume = 0.05) {
  try {
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2000, ctx.currentTime);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime);
  } catch {
    // 무시
  }
}

/** 패 놓는 소리 (탁!) */
export function playTilePlace() {
  playNoise(0.08, 0.12);
  playTone(200, 0.06, 'square', 0.08);
}

/** 패 뽑는 소리 */
export function playTileDraw() {
  playTone(600, 0.08, 'sine', 0.06);
}

/** 치/펑/깡 콜 소리 */
export function playCall() {
  playTone(523, 0.1, 'triangle', 0.12);
  setTimeout(() => playTone(659, 0.15, 'triangle', 0.1), 80);
}

/** 화료 팡파레 */
export function playWin() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.3, 'triangle', 0.12), i * 120);
  });
}

/** 유국 소리 */
export function playDraw() {
  playTone(330, 0.4, 'sine', 0.08);
  setTimeout(() => playTone(262, 0.5, 'sine', 0.06), 200);
}

/** 턴 전환 딩 */
export function playTurnChange() {
  playTone(880, 0.05, 'sine', 0.04);
}

/** 버튼 클릭 */
export function playClick() {
  playTone(440, 0.04, 'sine', 0.05);
}
