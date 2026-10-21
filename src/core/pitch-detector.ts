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
 *
 * Steps:
 * 1. RMS Energy Gate (silence rejection)
 * 2. Difference Function d(tau)
 * 3. Cumulative Mean Normalized Difference Function d'(tau)
 * 4. Absolute Thresholding (tau selection without octave error)
 * 5. Parabolic Interpolation for sub-bin frequency accuracy
 */
export function detectPitchYin(
  buffer: Float32Array,
  sampleRate: number,
  threshold = 0.15
): { frequency: number; confidence: number } | null {
  const bufferSize = buffer.length;

  // 1. RMS Energy Gate
  let sumSquares = 0;
  for (let i = 0; i < bufferSize; i++) {
    sumSquares += buffer[i] * buffer[i];
  }
  const rms = Math.sqrt(sumSquares / bufferSize);
  if (rms < 0.015) {
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

  // 4. Absolute threshold search: find first tau below threshold
  let tauCandidate = -1;
  for (let tau = 2; tau < halfBufferSize; tau++) {
    if (yinBuffer[tau] < threshold) {
      while (tau + 1 < halfBufferSize && yinBuffer[tau + 1] < yinBuffer[tau]) {
        tau++;
      }
      tauCandidate = tau;
      break;
    }
  }

  // If no tau was below threshold, find global minimum as fallback
  if (tauCandidate === -1) {
    let minTau = 2;
    let minVal = yinBuffer[2];
    for (let tau = 3; tau < halfBufferSize; tau++) {
      if (yinBuffer[tau] < minVal) {
        minVal = yinBuffer[tau];
        minTau = tau;
      }
    }
    if (minVal < 0.5) {
      tauCandidate = minTau;
    } else {
      return null;
    }
  }

  // 5. Parabolic interpolation around tauCandidate
  let betterTau = tauCandidate;
  if (tauCandidate > 0 && tauCandidate < halfBufferSize - 1) {
    const s0 = yinBuffer[tauCandidate - 1];
    const s1 = yinBuffer[tauCandidate];
    const s2 = yinBuffer[tauCandidate + 1];
    const delta = (s2 - s0) / (2 * (2 * s1 - s2 - s0));
    if (Math.abs(delta) < 1) {
      betterTau += delta;
    }
  }

  const frequency = sampleRate / betterTau;
  if (frequency < 30 || frequency > 3000) {
    return null;
  }

  const confidence = Math.max(0, Math.min(1, 1 - yinBuffer[tauCandidate]));

  return { frequency, confidence };
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
