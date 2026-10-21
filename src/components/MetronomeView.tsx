import React, { useState, useEffect, useRef } from 'react';
import { MetronomeEngine, TapTempoCalculator } from '../core/metronome-engine';
import { Play, Pause, Volume2, VolumeX, Eye, Plus, Minus } from 'lucide-react';

interface MetronomeViewProps {
  onFlashTrigger?: (isAccent: boolean) => void;
}

export const MetronomeView: React.FC<MetronomeViewProps> = ({ onFlashTrigger }) => {
  const [bpm, setBpm] = useState(120);
  const [beatsPerBar, setBeatsPerBar] = useState(4);
  const [isPlaying, setIsPlaying] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [flashEnabled, setFlashEnabled] = useState(true);
  const [currentBeat, setCurrentBeat] = useState(0);

  const engineRef = useRef<MetronomeEngine | null>(null);
  const tapCalculatorRef = useRef<TapTempoCalculator>(new TapTempoCalculator());

  useEffect(() => {
    const engine = new MetronomeEngine(bpm, beatsPerBar);
    engine.setSoundEnabled(soundEnabled);
    engine.setCallback((beat, isAccent) => {
      setCurrentBeat(beat);
      if (flashEnabled && onFlashTrigger) {
        onFlashTrigger(isAccent);
      }
    });

    engineRef.current = engine;

    return () => {
      engine.stop();
    };
  }, []);

  // Update engine properties
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setBpm(bpm);
    }
  }, [bpm]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setBeatsPerBar(beatsPerBar);
    }
  }, [beatsPerBar]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setSoundEnabled(soundEnabled);
    }
  }, [soundEnabled]);

  const togglePlay = () => {
    if (!engineRef.current) return;
    if (isPlaying) {
      engineRef.current.stop();
      setIsPlaying(false);
      setCurrentBeat(0);
    } else {
      engineRef.current.start();
      setIsPlaying(true);
    }
  };

  const handleTap = () => {
    const calculatedBpm = tapCalculatorRef.current.tap();
    if (calculatedBpm) {
      setBpm(calculatedBpm);
    }
  };

  const adjustBpm = (delta: number) => {
    setBpm((prev) => Math.max(30, Math.min(300, prev + delta)));
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-zinc-900/60 border border-zinc-800 rounded-3xl backdrop-blur shadow-2xl w-full max-w-md">
      {/* Beat indicators */}
      <div className="flex items-center gap-3 mb-6">
        {Array.from({ length: beatsPerBar }).map((_, i) => (
          <div
            key={i}
            className={`w-6 h-6 rounded-full transition-all duration-75 flex items-center justify-center font-mono text-xs font-bold ${
              isPlaying && currentBeat === i
                ? i === 0
                  ? 'bg-rose-500 text-white scale-125 shadow-lg shadow-rose-500/50'
                  : 'bg-emerald-400 text-zinc-950 scale-110 shadow-lg shadow-emerald-400/50'
                : 'bg-zinc-800 text-zinc-500'
            }`}
          >
            {i + 1}
          </div>
        ))}
      </div>

      {/* BPM Numerical Display */}
      <div className="flex flex-col items-center my-2">
        <div className="text-7xl font-black font-mono tracking-tighter text-zinc-100 flex items-baseline">
          {bpm}
          <span className="text-sm font-sans font-semibold text-zinc-500 ml-2">BPM</span>
        </div>
        <div className="text-xs font-mono text-zinc-400 mt-1 uppercase tracking-wider">
          {bpm < 60
            ? 'Largo'
            : bpm < 76
            ? 'Adagio'
            : bpm < 108
            ? 'Andante'
            : bpm < 120
            ? 'Moderato'
            : bpm < 168
            ? 'Allegro'
            : 'Presto'}
        </div>
      </div>

      {/* BPM Controls: Steppers */}
      <div className="flex items-center gap-2 my-4">
        <button
          onClick={() => adjustBpm(-5)}
          className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300 transition"
        >
          -5
        </button>
        <button
          onClick={() => adjustBpm(-1)}
          className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
        >
          <Minus className="w-4 h-4" />
        </button>

        {/* BPM Slider */}
        <input
          type="range"
          min={30}
          max={300}
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          className="w-32 accent-emerald-500 cursor-pointer mx-2"
        />

        <button
          onClick={() => adjustBpm(+1)}
          className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => adjustBpm(+5)}
          className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300 transition"
        >
          +5
        </button>
      </div>

      {/* Tap Tempo & Play/Stop */}
      <div className="flex items-center gap-4 my-4 w-full">
        <button
          onClick={handleTap}
          className="flex-1 py-3 px-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 font-bold text-sm tracking-wide transition border border-zinc-700/50 shadow-md"
        >
          👆 TAP TEMPO
        </button>

        <button
          onClick={togglePlay}
          className={`flex-1 py-3 px-4 rounded-2xl font-bold text-sm tracking-wide transition shadow-lg flex items-center justify-center gap-2 ${
            isPlaying
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
          }`}
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4" /> PARAR
            </>
          ) : (
            <>
              <Play className="w-4 h-4" /> INICIAR
            </>
          )}
        </button>
      </div>

      {/* Time Signatures & Toggles */}
      <div className="flex items-center justify-between w-full pt-4 mt-2 border-t border-zinc-800/60 text-xs">
        {/* Signatures */}
        <div className="flex items-center gap-1">
          {[2, 3, 4, 6].map((ts) => (
            <button
              key={ts}
              onClick={() => setBeatsPerBar(ts)}
              className={`px-2.5 py-1 rounded-md font-mono text-xs transition ${
                beatsPerBar === ts
                  ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {ts}/4
            </button>
          ))}
        </div>

        {/* Audio click & Visual Flash toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg transition ${
              soundEnabled
                ? 'bg-zinc-800 text-emerald-400'
                : 'bg-zinc-950 text-zinc-600 border border-zinc-800'
            }`}
            title={soundEnabled ? 'Som Ativo' : 'Mudo (Somente Visual)'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setFlashEnabled(!flashEnabled)}
            className={`p-2 rounded-lg transition ${
              flashEnabled
                ? 'bg-zinc-800 text-amber-400'
                : 'bg-zinc-950 text-zinc-600 border border-zinc-800'
            }`}
            title={flashEnabled ? 'Flash de Palco Ativo' : 'Flash Desativado'}
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
