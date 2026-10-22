import React, { useState, useEffect, useRef } from 'react';
import {
  frequencyToPitch,
  detectPitchYin,
  INSTRUMENT_PRESETS,
  playReferenceTone,
  loadCustomTunings,
} from './core/pitch-detector';
import { DetectedPitch, InstrumentPreset } from './types';
import { StrobeMeter } from './components/StrobeMeter';
import { MetronomeView } from './components/MetronomeView';
import {
  Mic,
  MicOff,
  Sliders,
  Sparkles,
  Volume2,
} from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tuner' | 'metronome' | 'both'>('both');
  const [a4Calibration, setA4Calibration] = useState<number>(440);
  const [customTunings] = useState<InstrumentPreset[]>(() => loadCustomTunings());
  const allPresets = [...INSTRUMENT_PRESETS, ...customTunings];
  const [selectedPreset, setSelectedPreset] = useState<InstrumentPreset>(INSTRUMENT_PRESETS[1]); // Guitar Standard
  const [isListening, setIsListening] = useState(false);
  const [detectedPitch, setDetectedPitch] = useState<DetectedPitch | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [isPlayingRefTone, setIsPlayingRefTone] = useState(false);
  const stopToneRef = useRef<(() => void) | null>(null);

  // Stage flash state
  const [flashType, setFlashType] = useState<'accent' | 'beat' | null>(null);

  // Web Audio resources
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  const startListening = async () => {
    try {
      setMicError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression: false,
        },
      });

      mediaStreamRef.current = stream;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsListening(true);
      processAudio();
    } catch (err: any) {
      console.warn('Microphone access denied or unavailable. Fallback to demo mode:', err);
      setMicError('Permissão de microfone negada. Clique em "Modo Simulação" para testar o strobe.');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsListening(false);
    setDetectedPitch(null);
  };

  const processAudio = () => {
    if (!analyserRef.current || !audioContextRef.current) return;

    const analyser = analyserRef.current;
    const buffer = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buffer);

    const pitchResult = detectPitchYin(buffer, audioContextRef.current.sampleRate);
    if (pitchResult) {
      const pitch = frequencyToPitch(pitchResult.frequency, a4Calibration);
      setDetectedPitch(pitch);
    } else {
      // Keep pitch for a few ms to avoid blinking, or clear
    }

    animFrameIdRef.current = requestAnimationFrame(processAudio);
  };

  // Play acoustic reference tone synthesized with warm overtones
  const handlePlayReferenceTone = (freq: number) => {
    if (stopToneRef.current) {
      stopToneRef.current();
      stopToneRef.current = null;
      setIsPlayingRefTone(false);
    }
    stopToneRef.current = playReferenceTone(freq, 2.5, true);
    setIsPlayingRefTone(true);
    setTimeout(() => setIsPlayingRefTone(false), 2500);
  };

  // Simulated note generator for quick testing without mic
  const triggerSimulationNote = (freq: number) => {
    const pitch = frequencyToPitch(freq, a4Calibration);
    setDetectedPitch(pitch);
  };

  const handleFlashTrigger = (isAccent: boolean) => {
    setFlashType(isAccent ? 'accent' : 'beat');
    setTimeout(() => {
      setFlashType(null);
    }, 150);
  };

  return (
    <div
      className={`min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans transition-colors duration-100 ${
        flashType === 'accent'
          ? 'bg-rose-950/40'
          : flashType === 'beat'
          ? 'bg-emerald-950/30'
          : ''
      }`}
    >
      {/* Top Header */}
      <header className="h-16 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur px-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎸</span>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-base tracking-tight text-zinc-100">Garden Tuner</h1>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              DSP Strobe + Metronome
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
          <button
            onClick={() => setActiveTab('tuner')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'tuner'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Afinador Strobe
          </button>
          <button
            onClick={() => setActiveTab('metronome')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'metronome'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Metrônomo de Palco
          </button>
          <button
            onClick={() => setActiveTab('both')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'both'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Modo Dual (Palco)
          </button>
        </div>

        {/* Calibration & Mic Toggle */}
        <div className="flex items-center gap-3">
          {/* A4 Pitch Calibration */}
          <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1 text-xs">
            <Sliders className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-400">A4:</span>
            <select
              value={a4Calibration}
              onChange={(e) => setA4Calibration(Number(e.target.value))}
              className="bg-transparent text-emerald-400 font-mono font-bold cursor-pointer focus:outline-none"
            >
              <option value="440" className="bg-zinc-900">
                440 Hz (Padrão)
              </option>
              <option value="432" className="bg-zinc-900">
                432 Hz (Verdi)
              </option>
              <option value="442" className="bg-zinc-900">
                442 Hz (Orquestra)
              </option>
              <option value="444" className="bg-zinc-900">
                444 Hz (Brilho)
              </option>
            </select>
          </div>

          {/* Microphone On/Off */}
          <button
            onClick={isListening ? stopListening : startListening}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs tracking-wide transition shadow-lg ${
              isListening
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4" /> PARAR MIC
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" /> ATIVAR MIC
              </>
            )}
          </button>
        </div>
      </header>

      {/* Mic Warning if needed */}
      {micError && (
        <div className="bg-amber-950/50 border-b border-amber-800/60 px-6 py-2 flex items-center justify-between text-xs text-amber-200">
          <span>{micError}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => triggerSimulationNote(82.4)} // E2
              className="px-2 py-0.5 rounded bg-amber-600 text-white hover:bg-amber-500"
            >
              Simular E2 (82.4Hz)
            </button>
            <button
              onClick={() => triggerSimulationNote(440.0)} // A4
              className="px-2 py-0.5 rounded bg-amber-600 text-white hover:bg-amber-500"
            >
              Simular A4 (440Hz)
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center p-6 gap-8 overflow-y-auto">
        {/* Tuner Panel */}
        {(activeTab === 'tuner' || activeTab === 'both') && (
          <div className="flex flex-col items-center gap-4 w-full max-w-md">
            {/* Instrument preset selection pills */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 w-full">
              {allPresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                    selectedPreset.id === preset.id
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {preset.name.split(' (')[0]}
                </button>
              ))}
            </div>

            {/* Strobe Meter */}
            <StrobeMeter pitch={detectedPitch} a4={a4Calibration} />

            {/* String target buttons if preset has notes */}
            {selectedPreset.notes.length > 0 && (
              <div className="flex items-center justify-center gap-2 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-2.5 w-full">
                <div className="flex items-center gap-1 text-xs text-zinc-500 font-mono mr-1">
                  <Volume2 className={`w-3.5 h-3.5 ${isPlayingRefTone ? 'text-emerald-400 animate-pulse' : 'text-zinc-500'}`} />
                  <span>Tom:</span>
                </div>
                {selectedPreset.notes.map((n, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      handlePlayReferenceTone(n.freq);
                      triggerSimulationNote(n.freq);
                    }}
                    className={`flex flex-col items-center px-3 py-1.5 rounded-xl border text-xs font-mono transition group ${
                      detectedPitch?.note === n.name && detectedPitch?.octave === n.octave
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold scale-105'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                    title="Clique para ouvir o tom acústico de referência com harmônicos e afinar de ouvido"
                  >
                    <span className="text-sm font-bold">
                      {n.name}
                      <sub className="text-[10px]">{n.octave}</sub>
                    </span>
                    <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300">
                      {n.freq.toFixed(0)}Hz
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Metronome Panel */}
        {(activeTab === 'metronome' || activeTab === 'both') && (
          <div className="flex flex-col items-center gap-4 w-full max-w-md">
            <MetronomeView onFlashTrigger={handleFlashTrigger} />
          </div>
        )}
      </main>

      {/* Stage Bottom Bar */}
      <footer className="h-10 border-t border-zinc-800/80 bg-zinc-900/40 px-6 flex items-center justify-between text-xs text-zinc-500 font-mono">
        <span>Garden Tuner & Metronome</span>
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          YIN Autocorrelation DSP Engine • 100% Client-Side
        </span>
      </footer>
    </div>
  );
};

export default App;
