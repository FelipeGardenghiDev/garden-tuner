import { DetectedPitch, InstrumentPreset } from '../types';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Converts a frequency in Hz to musical note name, octave, and cents deviation from pitch.
 * a4 calibration defaults to 440 Hz (supports 432 Hz - 445 Hz).
 */
export function frequencyToPitch(freq: number, a4: number = 440): DetectedPitch | null {
  if (freq < 20 || freq > 4200 || isNaN(freq)) {
    return null;
  }

  // MIDI note number where A4 (440Hz) is 69
  const midi = 12 * (Math.log(freq / a4) / Math.log(2)) + 69;
  const roundedMidi = Math.round(midi);

  // Exact target frequency for this closest MIDI semitone
  const targetFrequency = a4 * Math.pow(2, (roundedMidi - 69) / 12);

  // Deviation in cents (-50 to +50)
  const cents = Math.round(1200 * (Math.log(freq / targetFrequency) / Math.log(2)));

  const noteIndex = ((roundedMidi % 12) + 12) % 12;
  const note = NOTE_NAMES[noteIndex];
  const octave = Math.floor(roundedMidi / 12) - 1;

  return {
    frequency: Math.round(freq * 10) / 10,
    targetFrequency: Math.round(targetFrequency * 10) / 10,
    note,
    octave,
    cents,
    inTune: Math.abs(cents) <= 3,
    confidence: 1.0,
  };
}

/**
 * Canonical YIN Pitch Detection Algorithm
 * (Alain de Cheveigné & Hideki Kawahara, 2002)
 */
export function detectPitchYin(
  buffer: Float32Array,
  sampleRate: number,
  threshold = 0.15,
  minRms = 0.005
): { frequency: number; confidence: number } | null {
  const bufferSize = buffer.length;

  // 1. RMS Energy Gate (lowered to 0.005 for acoustic instruments, humming, and singing)
  let sumSquares = 0;
  for (let i = 0; i < bufferSize; i++) {
    sumSquares += buffer[i] * buffer[i];
  }
  const rms = Math.sqrt(sumSquares / bufferSize);
  if (rms < minRms) {
    return null;
  }

  const halfBufferSize = Math.floor(bufferSize / 2);
  const yinBuffer = new Float32Array(halfBufferSize);

  // 2. Difference function
  for (let tau = 0; tau < halfBufferSize; tau++) {
    let diff = 0;
    for (let i = 0; i < halfBufferSize; i++) {
      const delta = buffer[i] - buffer[i + tau];
      diff += delta * delta;
    }
    yinBuffer[tau] = diff;
  }

  // 3. Cumulative mean normalized difference function
  yinBuffer[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < halfBufferSize; tau++) {
    runningSum += yinBuffer[tau];
    yinBuffer[tau] = (yinBuffer[tau] * tau) / runningSum;
  }

  // 4. Absolute thresholding
  let tauEstimate = -1;
  for (let tau = 2; tau < halfBufferSize; tau++) {
    if (yinBuffer[tau] < threshold) {
      while (tau + 1 < halfBufferSize && yinBuffer[tau + 1] < yinBuffer[tau]) {
        tau++;
      }
      tauEstimate = tau;
      break;
    }
  }

  // Fallback to global minimum if below threshold not found
  if (tauEstimate === -1) {
    let minVal = 1000;
    for (let tau = 2; tau < halfBufferSize; tau++) {
      if (yinBuffer[tau] < minVal) {
        minVal = yinBuffer[tau];
        tauEstimate = tau;
      }
    }
    if (minVal > 0.45) {
      return null;
    }
  }

  // 5. Parabolic interpolation
  let betterTau: number;
  const x0 = tauEstimate < 1 ? tauEstimate : tauEstimate - 1;
  const x2 = tauEstimate + 1 < halfBufferSize ? tauEstimate + 1 : tauEstimate;

  if (x0 === tauEstimate) {
    betterTau = yinBuffer[tauEstimate] <= yinBuffer[x2] ? tauEstimate : x2;
  } else if (x2 === tauEstimate) {
    betterTau = yinBuffer[tauEstimate] <= yinBuffer[x0] ? tauEstimate : x0;
  } else {
    const s0 = yinBuffer[x0];
    const s1 = yinBuffer[tauEstimate];
    const s2 = yinBuffer[x2];
    betterTau = tauEstimate + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
  }

  const pitch = sampleRate / betterTau;
  const confidence = 1 - Math.min(1, yinBuffer[tauEstimate]);

  return {
    frequency: pitch,
    confidence,
  };
}

export const INSTRUMENT_PRESETS: InstrumentPreset[] = [
  {
    id: 'chromatic',
    name: 'Cromático (Geral)',
    instrument: 'chromatic',
    notes: [],
  },
  {
    id: 'guitar-standard',
    name: 'Guitarra / Violão (Standard EADGBE)',
    instrument: 'guitar',
    notes: [
      { name: 'E', octave: 2, freq: 82.4 },
      { name: 'A', octave: 2, freq: 110.0 },
      { name: 'D', octave: 3, freq: 146.8 },
      { name: 'G', octave: 3, freq: 196.0 },
      { name: 'B', octave: 3, freq: 246.9 },
      { name: 'E', octave: 4, freq: 329.6 },
    ],
  },
  {
    id: 'guitar-drop-d',
    name: 'Guitarra (Drop D - DADGBE)',
    instrument: 'guitar',
    notes: [
      { name: 'D', octave: 2, freq: 73.4 },
      { name: 'A', octave: 2, freq: 110.0 },
      { name: 'D', octave: 3, freq: 146.8 },
      { name: 'G', octave: 3, freq: 196.0 },
      { name: 'B', octave: 3, freq: 246.9 },
      { name: 'E', octave: 4, freq: 329.6 },
    ],
  },
  {
    id: 'guitar-drop-c',
    name: 'Guitarra (Drop C - CGCFAD)',
    instrument: 'guitar',
    notes: [
      { name: 'C', octave: 2, freq: 65.4 },
      { name: 'G', octave: 2, freq: 98.0 },
      { name: 'C', octave: 3, freq: 130.8 },
      { name: 'F', octave: 3, freq: 174.6 },
      { name: 'A', octave: 3, freq: 220.0 },
      { name: 'D', octave: 4, freq: 293.7 },
    ],
  },
  {
    id: 'guitar-open-g',
    name: 'Guitarra (Open G - DGDGBD)',
    instrument: 'guitar',
    notes: [
      { name: 'D', octave: 2, freq: 73.4 },
      { name: 'G', octave: 2, freq: 98.0 },
      { name: 'D', octave: 3, freq: 146.8 },
      { name: 'G', octave: 3, freq: 196.0 },
      { name: 'B', octave: 3, freq: 246.9 },
      { name: 'D', octave: 4, freq: 293.7 },
    ],
  },
  {
    id: 'guitar-dadgad',
    name: 'Guitarra (DADGAD Folk / Celta)',
    instrument: 'guitar',
    notes: [
      { name: 'D', octave: 2, freq: 73.4 },
      { name: 'A', octave: 2, freq: 110.0 },
      { name: 'D', octave: 3, freq: 146.8 },
      { name: 'G', octave: 3, freq: 196.0 },
      { name: 'A', octave: 3, freq: 220.0 },
      { name: 'D', octave: 4, freq: 293.7 },
    ],
  },
  {
    id: 'bass-4',
    name: 'Baixo 4 Cordas (EADG)',
    instrument: 'bass',
    notes: [
      { name: 'E', octave: 1, freq: 41.2 },
      { name: 'A', octave: 1, freq: 55.0 },
      { name: 'D', octave: 2, freq: 73.4 },
      { name: 'G', octave: 2, freq: 98.0 },
    ],
  },
  {
    id: 'bass-5',
    name: 'Baixo 5 Cordas (BEADG)',
    instrument: 'bass',
    notes: [
      { name: 'B', octave: 0, freq: 30.9 },
      { name: 'E', octave: 1, freq: 41.2 },
      { name: 'A', octave: 1, freq: 55.0 },
      { name: 'D', octave: 2, freq: 73.4 },
      { name: 'G', octave: 2, freq: 98.0 },
    ],
  },
  {
    id: 'ukulele',
    name: 'Ukulele Soprano (GCEA)',
    instrument: 'ukulele',
    notes: [
      { name: 'G', octave: 4, freq: 392.0 },
      { name: 'C', octave: 4, freq: 261.6 },
      { name: 'E', octave: 4, freq: 329.6 },
      { name: 'A', octave: 4, freq: 440.0 },
    ],
  },
];

const CUSTOM_TUNINGS_KEY = 'garden_tuner_custom_tunings_v1';
let memoryTunings: InstrumentPreset[] = [];

export function loadCustomTunings(): InstrumentPreset[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(CUSTOM_TUNINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {}
  return memoryTunings;
}

export function saveCustomTuning(tuning: InstrumentPreset): void {
  const current = loadCustomTunings().filter((t) => t.id !== tuning.id);
  current.push(tuning);
  memoryTunings = [...current];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CUSTOM_TUNINGS_KEY, JSON.stringify(current));
    }
  } catch {}
}

export function deleteCustomTuning(id: string): void {
  const current = loadCustomTunings().filter((t) => t.id !== id);
  memoryTunings = [...current];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CUSTOM_TUNINGS_KEY, JSON.stringify(current));
    }
  } catch {}
}

let activeToneStop: (() => void) | null = null;

/**
 * Generates an acoustic reference tone with natural harmonic overtone warmth.
 */
export function playReferenceTone(
  freq: number,
  durationSec: number = 3.5,
  includeHarmonics: boolean = true
): () => void {
  if (activeToneStop) {
    activeToneStop();
  }

  const AudioCtxClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtxClass();

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
  masterGain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.05);
  masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);
  masterGain.connect(ctx.destination);

  // Fundamental oscillator
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(freq, ctx.currentTime);
  osc1.connect(masterGain);
  osc1.start();
  osc1.stop(ctx.currentTime + durationSec);

  // Warm 2nd harmonic
  if (includeHarmonics) {
    const harmGain = ctx.createGain();
    harmGain.gain.value = 0.3;
    harmGain.connect(masterGain);

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, ctx.currentTime);
    osc2.connect(harmGain);
    osc2.start();
    osc2.stop(ctx.currentTime + durationSec);
  }

  const stop = () => {
    try {
      masterGain.gain.cancelScheduledValues(ctx.currentTime);
      masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);
      setTimeout(() => {
        ctx.close().catch(() => {});
        activeToneStop = null;
      }, 50);
    } catch {}
  };

  activeToneStop = stop;
  setTimeout(() => {
    if (activeToneStop === stop) {
      activeToneStop = null;
    }
  }, durationSec * 1000);

  return stop;
}
