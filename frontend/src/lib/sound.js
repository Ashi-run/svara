let ctx = null;
function getCtx() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    ctx = new AudioCtx();
  }
  return ctx;
}

function tone(freq, startTime, duration, gainPeak = 0.08) {
  const audioCtx = getCtx();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

export function playSaveChime() {
  try {
    const audioCtx = getCtx();
    const now = audioCtx.currentTime;
    tone(880, now, 0.12);
    tone(1320, now + 0.09, 0.16);
  } catch {
    /* no-op if Web Audio unavailable */
  }
}

export function playErrorTone() {
  try {
    const audioCtx = getCtx();
    tone(220, audioCtx.currentTime, 0.25, 0.06);
  } catch {
    /* no-op */
  }
}
