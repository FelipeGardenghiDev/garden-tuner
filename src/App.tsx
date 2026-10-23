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
  RotateCcw,
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
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      // Attempt high-fidelity constraints first, fallback to basic audio
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            autoGainControl: false,
            noiseSuppression: false,
          },
        });
      } catch (constraintErr) {
        console.warn('Advanced audio constraints not supported, falling back to basic audio', constraintErr);
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      mediaStreamRef.current = stream;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();

      // Mobile Chrome / Android WebView requires explicit resume on user interaction
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsListening(true);
      processAudio();
    } catch (err: any) {
      console.warn('Microphone access denied or unavailable:', err);
      setMicError('Acesso ao microfone negado ou não autorizado pelo sistema. Verifique a permissão nas configurações do app.');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
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
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    } else {
      // Clear pitch after 350ms of silence so strobe stops gracefully
      if (!silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          setDetectedPitch(null);
          silenceTimerRef.current = null;
        }, 350);
      }
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
      className={`min-h-screen min-h-[100dvh] bg-zinc-950 text-zinc-100 flex flex-col font-sans transition-colors duration-100 ${
        flashType === 'accent'
          ? 'bg-rose-950/40'
          : flashType === 'beat'
          ? 'bg-emerald-950/30'
          : ''
      }`}
    >
      {/* Top Header with Safe Area Insets */}
      <header className="safe-header border-b border-zinc-800 bg-zinc-900/90 backdrop-blur z-20 flex flex-col md:flex-row items-center justify-between gap-3 pb-3 md:pb-0 md:h-16">
        <div className="flex items-center justify-between w-full md:w-auto gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl select-none">🎸</span>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-sm sm:text-base tracking-tight text-zinc-100">Garden Tuner</h1>
                <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  DSP Strobe
                </span>
              </div>
            </div>
          </div>

          {/* Quick controls on mobile top bar */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={isListening ? stopListening : startListening}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs tracking-wide transition shadow-lg ${
                isListening
                  ? 'bg-rose-600 active:bg-rose-700 text-white shadow-rose-600/30'
                  : 'bg-emerald-600 active:bg-emerald-700 text-white shadow-emerald-600/30'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-3.5 h-3.5" /> PARAR
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5" /> OUVIR
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs w-full md:w-auto justify-center">
          <button
            onClick={() => setActiveTab('tuner')}
            className={`flex-1 md:flex-initial px-3 py-1.5 rounded-lg font-medium transition text-center ${
              activeTab === 'tuner'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Afinador
          </button>
          <button
            onClick={() => setActiveTab('metronome')}
            className={`flex-1 md:flex-initial px-3 py-1.5 rounded-lg font-medium transition text-center ${
              activeTab === 'metronome'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Metrônomo
          </button>
          <button
            onClick={() => setActiveTab('both')}
            className={`flex-1 md:flex-initial px-3 py-1.5 rounded-lg font-medium transition text-center ${
              activeTab === 'both'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Modo Dual
          </button>
        </div>

        {/* Calibration & Mic Toggle (Desktop / Tablet) */}
        <div className="hidden md:flex items-center gap-3">
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

      {/* Mobile Calibration Row */}
      <div className="md:hidden flex items-center justify-between px-4 py-1.5 bg-zinc-900/60 border-b border-zinc-800/80 text-xs">
        <div className="flex items-center gap-1.5 font-mono text-zinc-400">
          <Sliders className="w-3.5 h-3.5 text-zinc-400" />
          <span>A4:</span>
          <select
            value={a4Calibration}
            onChange={(e) => setA4Calibration(Number(e.target.value))}
            className="bg-transparent text-emerald-400 font-bold cursor-pointer focus:outline-none"
          >
            <option value="440" className="bg-zinc-900">440 Hz</option>
            <option value="432" className="bg-zinc-900">432 Hz</option>
            <option value="442" className="bg-zinc-900">442 Hz</option>
            <option value="444" className="bg-zinc-900">444 Hz</option>
          </select>
        </div>
        <div className="text-[11px] text-zinc-500 font-mono">
          {isListening ? (
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              Captando áudio
            </span>
          ) : (
            <span>Mic inativo</span>
          )}
        </div>
      </div>

      {/* Mic Warning & Simulation banner */}
      {micError && (
        <div className="bg-amber-950/60 border-b border-amber-800/80 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-amber-200">
          <span className="text-center sm:text-left">{micError}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={startListening}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white font-medium hover:bg-emerald-500 shadow"
            >
              <RotateCcw className="w-3 h-3" /> Tentar Novamente
            </button>
            <button
              onClick={() => triggerSimulationNote(82.4)}
              className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 hover:bg-zinc-700"
            >
              Simular E2
            </button>
            <button
              onClick={() => triggerSimulationNote(440.0)}
              className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 hover:bg-zinc-700"
            >
              Simular A4
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area with generous bottom clearance for Android Nav Bar */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-start lg:justify-center px-4 py-6 pb-28 gap-6 lg:gap-8 overflow-y-auto">
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
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-2.5 w-full overflow-x-auto">
                <div className="flex items-center gap-1 text-xs text-zinc-500 font-mono mr-1">
                  <Volume2 className={`w-3.5 h-3.5 ${isPlayingRefTone ? 'text-emerald-400 animate-pulse' : 'text-zinc-500'}`} />
                  <span className="hidden sm:inline">Tom:</span>
                </div>
                {selectedPreset.notes.map((n, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      handlePlayReferenceTone(n.freq);
                      triggerSimulationNote(n.freq);
                    }}
                    className={`flex flex-col items-center px-2.5 py-1.5 rounded-xl border text-xs font-mono transition group ${
                      detectedPitch?.note === n.name && detectedPitch?.octave === n.octave
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold scale-105'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                    title="Clique para ouvir o tom acústico de referência com harmônicos e afinar de ouvido"
                  >
                    <span className="text-xs sm:text-sm font-bold">
                      {n.name}
                      <sub className="text-[9px] sm:text-[10px]">{n.octave}</sub>
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-zinc-500 group-hover:text-zinc-300">
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

      {/* Stage Bottom Bar with Safe Area Inset Protection */}
      <footer className="safe-footer border-t border-zinc-800/80 bg-zinc-900/80 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 font-mono gap-1.5 text-center">
        <div className="flex items-center gap-2 justify-center sm:justify-start">
          <span className="font-semibold text-zinc-400">Garden Tuner</span>
          <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-emerald-400 border border-zinc-700 font-mono">
            v0.2.1
          </span>
        </div>
        <span className="flex items-center gap-1.5 justify-center sm:justify-end">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          YIN Autocorrelation Engine • Client-Side DSP
        </span>
      </footer>
    </div>
  );
};

export default App;
