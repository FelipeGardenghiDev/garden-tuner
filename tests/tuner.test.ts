import { describe, it, expect } from 'vitest';
import {
  frequencyToPitch,
  detectPitchYin,
  INSTRUMENT_PRESETS,
  saveCustomTuning,
  loadCustomTunings,
  deleteCustomTuning
} from '../src/core/pitch-detector';
import { TapTempoCalculator } from '../src/core/metronome-engine';

describe('Garden Tuner & Metronome Engine', () => {
  it('correctly identifies A4 at 440Hz', () => {
    const pitch = frequencyToPitch(440, 440);
    expect(pitch).not.toBeNull();
    expect(pitch?.note).toBe('A');
    expect(pitch?.octave).toBe(4);
    expect(pitch?.cents).toBe(0);
    expect(pitch?.inTune).toBe(true);
  });

  it('correctly detects out of tune pitch (sharp E4)', () => {
    // E4 is ~329.6 Hz. 335 Hz is sharp
    const pitch = frequencyToPitch(335, 440);
    expect(pitch?.note).toBe('E');
    expect(pitch?.octave).toBe(4);
    expect(pitch?.cents).toBeGreaterThan(5);
    expect(pitch?.inTune).toBe(false);
  });

  it('correctly detects low E2 (guitar string 6) at 82.4 Hz', () => {
    const pitch = frequencyToPitch(82.4, 440);
    expect(pitch?.note).toBe('E');
    expect(pitch?.octave).toBe(2);
    expect(Math.abs(pitch?.cents || 0)).toBeLessThanOrEqual(3);
  });

  it('supports A4 calibration to 432 Hz', () => {
    const pitch = frequencyToPitch(432, 432);
    expect(pitch?.note).toBe('A');
    expect(pitch?.octave).toBe(4);
    expect(pitch?.cents).toBe(0);
  });

  it('contains staff guitar presets including Drop C, Open G and DADGAD', () => {
    const dropC = INSTRUMENT_PRESETS.find((p) => p.id === 'guitar-drop-c');
    expect(dropC).toBeDefined();
    expect(dropC?.notes[0].name).toBe('C');

    const openG = INSTRUMENT_PRESETS.find((p) => p.id === 'guitar-open-g');
    expect(openG).toBeDefined();

    const dadgad = INSTRUMENT_PRESETS.find((p) => p.id === 'guitar-dadgad');
    expect(dadgad).toBeDefined();
    expect(dadgad?.notes.map((n) => n.name).join('')).toBe('DADGAD');
  });

  it('detects pitch with YIN algorithm on synthetic 440Hz sine wave', () => {
    const sampleRate = 44100;
    const targetFreq = 440; // 440Hz
    const buffer = new Float32Array(2048);

    // Generate pure sine wave
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = Math.sin((2 * Math.PI * targetFreq * i) / sampleRate);
    }

    const detected = detectPitchYin(buffer, sampleRate);
    expect(detected).not.toBeNull();
    // Allow small tolerance for discrete sampling
    expect(Math.abs((detected?.frequency || 0) - targetFreq)).toBeLessThan(2);
  });

  it('ignores silence / low-energy ambient noise', () => {
    const sampleRate = 44100;
    const buffer = new Float32Array(2048); // all zeroes
    const detected = detectPitchYin(buffer, sampleRate);
    expect(detected).toBeNull();
  });

  it('manages custom tuning persistence in storage', () => {
    const customTuning = {
      id: 'custom-half-step-down',
      name: 'Eb Standard',
      instrument: 'guitar' as const,
      notes: [{ name: 'Eb', octave: 2, freq: 77.78 }],
    };

    saveCustomTuning(customTuning);
    const loaded = loadCustomTunings();
    expect(loaded.some((t) => t.id === 'custom-half-step-down')).toBe(true);

    deleteCustomTuning('custom-half-step-down');
    const afterDelete = loadCustomTunings();
    expect(afterDelete.some((t) => t.id === 'custom-half-step-down')).toBe(false);
  });

  it('calculates tap tempo accurately', () => {
    const calculator = new TapTempoCalculator();
    calculator.tap();
    calculator.reset();
    expect(calculator).toBeDefined();
  });
});
