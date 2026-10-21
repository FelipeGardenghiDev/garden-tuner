export type BeatCallback = (beat: number, isAccent: boolean) => void;

/**
 * High-precision Web Audio lookahead metronome scheduler.
 * Eliminates JavaScript timer drift on stage or during long rehearsal sessions.
 */
export class MetronomeEngine {
  private audioCtx: AudioContext | null = null;
  private isRunning: boolean = false;
  private bpm: number = 120;
  private beatsPerBar: number = 4;
  private currentBeat: number = 0;
  private nextNoteTime: number = 0;
  private lookaheadMs: number = 25.0; // how often to check
  private scheduleAheadSec: number = 0.1; // how far ahead to schedule
  private timerId: any = null;
  private onBeat: BeatCallback | null = null;
  private soundEnabled: boolean = true;

  constructor(bpm = 120, beatsPerBar = 4) {
    this.bpm = bpm;
    this.beatsPerBar = beatsPerBar;
  }

  public setCallback(cb: BeatCallback) {
    this.onBeat = cb;
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  public setBpm(bpm: number) {
    this.bpm = Math.max(30, Math.min(300, bpm));
  }

  public getBpm(): number {
    return this.bpm;
  }

  public setBeatsPerBar(beats: number) {
    this.beatsPerBar = Math.max(1, Math.min(12, beats));
  }

  private initAudio() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  private nextNote() {
    const secondsPerBeat = 60.0 / this.bpm;
    this.nextNoteTime += secondsPerBeat;
    this.currentBeat = (this.currentBeat + 1) % this.beatsPerBar;
  }

  private scheduleNote(beatNumber: number, time: number) {
    const isAccent = beatNumber === 0;

    // Trigger visual callback via setTimeout synchronized with audio time
    if (this.audioCtx && this.onBeat) {
      const delayMs = Math.max(0, (time - this.audioCtx.currentTime) * 1000);
      setTimeout(() => {
        if (this.isRunning && this.onBeat) {
          this.onBeat(beatNumber, isAccent);
        }
      }, delayMs);
    }

    if (!this.soundEnabled || !this.audioCtx) return;

    // Synthesize woodblock/beep click with zero latency
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'triangle';
    // Beat 1 accent: 1200Hz, regular beat: 800Hz
    osc.frequency.setValueAtTime(isAccent ? 1200 : 800, time);

    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + (isAccent ? 0.08 : 0.05));

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(time);
    osc.stop(time + 0.1);
  }

  private scheduler = () => {
    if (!this.audioCtx) return;

    while (this.nextNoteTime < this.audioCtx.currentTime + this.scheduleAheadSec) {
      this.scheduleNote(this.currentBeat, this.nextNoteTime);
      this.nextNote();
    }

    if (this.isRunning) {
      this.timerId = setTimeout(this.scheduler, this.lookaheadMs);
    }
  };

  public start() {
    if (this.isRunning) return;
    this.initAudio();
    if (!this.audioCtx) return;

    this.isRunning = true;
    this.currentBeat = 0;
    this.nextNoteTime = this.audioCtx.currentTime + 0.05;
    this.scheduler();
  }

  public stop() {
    this.isRunning = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.currentBeat = 0;
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }
}

/**
 * Calculates BPM based on interval between consecutive taps.
 */
export class TapTempoCalculator {
  private taps: number[] = [];

  public tap(): number | null {
    const now = performance.now();
    // Reset if last tap was more than 2 seconds ago
    if (this.taps.length > 0 && now - this.taps[this.taps.length - 1] > 2000) {
      this.taps = [];
    }

    this.taps.push(now);
    if (this.taps.length > 5) {
      this.taps.shift();
    }

    if (this.taps.length < 2) {
      return null;
    }

    let totalInterval = 0;
    for (let i = 1; i < this.taps.length; i++) {
      totalInterval += this.taps[i] - this.taps[i - 1];
    }
    const avgInterval = totalInterval / (this.taps.length - 1);
    const bpm = Math.round(60000 / avgInterval);

    return Math.max(30, Math.min(300, bpm));
  }

  public reset() {
    this.taps = [];
  }
}
