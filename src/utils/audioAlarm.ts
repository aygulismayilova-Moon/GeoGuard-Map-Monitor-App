// Web Audio API Alarm Sound Synthesizer for GeoGuard Incident Control

let audioCtx: AudioContext | null = null;
let alarmInterval: any = null;

export function playAlarmBeep() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
    osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.3); // Sweep down to A4

    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } catch (err) {
    console.warn('Audio Context not allowed or failed:', err);
  }
}

export function startAlarmLoop() {
  stopAlarmLoop();
  playAlarmBeep();
  alarmInterval = setInterval(() => {
    playAlarmBeep();
  }, 600);
}

export function stopAlarmLoop() {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
}
