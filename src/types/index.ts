export interface DetectedPitch {
  frequency: number;
  note: string;
  octave: number;
  cents: number;
  targetFrequency: number;
  inTune: boolean;
  confidence: number;
}

export interface InstrumentPreset {
  id: string;
  name: string;
  instrument: 'guitar' | 'bass' | 'ukulele' | 'chromatic';
  notes: { name: string; octave: number; freq: number }[];
}

export interface MetronomeState {
  bpm: number;
  beatsPerBar: number;
  currentBeat: number;
  isPlaying: boolean;
  soundEnabled: boolean;
  flashEnabled: boolean;
  accentFirstBeat: boolean;
}
