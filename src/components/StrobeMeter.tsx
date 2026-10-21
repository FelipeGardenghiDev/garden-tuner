import React, { useEffect, useRef } from 'react';
import { DetectedPitch } from '../types';

interface StrobeMeterProps {
  pitch: DetectedPitch | null;
  a4: number;
}

export const StrobeMeter: React.FC<StrobeMeterProps> = ({ pitch, a4 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef<number>(0);

  // Strobe canvas animation
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = canvas.width / 2 - 12;

      // Rotation speed depends on cents deviation
      if (pitch) {
        // Cents: -50 to +50
        // Speed proportional to deviation
        const speed = (pitch.cents / 50) * 0.08;
        rotationRef.current += speed;
      }

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotationRef.current);

      // Draw Strobe pattern wheel
      const segments = 24;
      const segmentAngle = (2 * Math.PI) / segments;

      for (let i = 0; i < segments; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, radius, i * segmentAngle, (i + 0.5) * segmentAngle);
        ctx.arc(0, 0, radius - 20, (i + 0.5) * segmentAngle, i * segmentAngle, true);
        ctx.closePath();

        if (pitch && pitch.inTune) {
          ctx.fillStyle = i % 2 === 0 ? '#10b981' : 'transparent';
        } else if (pitch) {
          ctx.fillStyle = i % 2 === 0 ? '#f59e0b' : 'transparent';
        } else {
          ctx.fillStyle = i % 2 === 0 ? '#3f3f46' : 'transparent';
        }
        ctx.fill();
      }

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [pitch]);

  const cents = pitch ? pitch.cents : 0;
  const inTune = pitch ? pitch.inTune : false;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-zinc-900/60 border border-zinc-800 rounded-3xl backdrop-blur shadow-2xl w-full max-w-md">
      {/* Reference calibration */}
      <div className="text-xs font-mono text-zinc-400 mb-2">
        CALIBRAÇÃO A4 = <span className="text-emerald-400 font-bold">{a4} Hz</span>
      </div>

      {/* Circular Strobe Canvas */}
      <div className="relative flex items-center justify-center my-4">
        <canvas
          ref={canvasRef}
          width={240}
          height={240}
          className="rounded-full shadow-inner"
        />

        {/* Central Note & Octave Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {pitch ? (
            <>
              <div className="flex items-baseline">
                <span
                  className={`text-6xl font-black tracking-tight font-mono ${
                    inTune
                      ? 'text-emerald-400 drop-shadow-[0_0_25px_rgba(16,185,129,0.8)]'
                      : 'text-zinc-100'
                  }`}
                >
                  {pitch.note}
                </span>
                <span className="text-2xl font-bold text-zinc-400 ml-1 font-mono">
                  {pitch.octave}
                </span>
              </div>
              <span
                className={`text-xs font-mono font-bold mt-1 px-2.5 py-0.5 rounded-full ${
                  inTune
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {pitch.frequency.toFixed(1)} Hz
              </span>
            </>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-4xl text-zinc-600 font-mono font-bold">--</span>
              <span className="text-[11px] text-zinc-500 font-mono mt-1">Toque uma corda</span>
            </div>
          )}
        </div>
      </div>

      {/* Cents Meter Needle Bar */}
      <div className="w-full mt-4 flex flex-col gap-2">
        <div className="flex justify-between text-[11px] font-mono text-zinc-500">
          <span>-50 Cents (Bemol)</span>
          <span className={inTune ? 'text-emerald-400 font-bold' : 'text-zinc-400'}>
            {pitch ? (cents > 0 ? `+${cents}` : cents) : '0'} Cents
          </span>
          <span>+50 Cents (Sustenido)</span>
        </div>

        {/* Cent Needle Meter */}
        <div className="relative h-4 bg-zinc-950 rounded-full border border-zinc-800 overflow-hidden flex items-center">
          {/* Sweet Spot Center Marker (±3 cents) */}
          <div className="absolute left-1/2 -translate-x-1/2 w-4 h-full bg-emerald-500/30 border-x border-emerald-500/50"></div>
          <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-full bg-zinc-600"></div>

          {/* Dynamic Needle */}
          {pitch && (
            <div
              className={`absolute top-0 bottom-0 w-2 rounded-full transition-all duration-75 shadow-lg ${
                inTune
                  ? 'bg-emerald-400 shadow-emerald-500/50'
                  : cents < 0
                  ? 'bg-amber-400 shadow-amber-500/50'
                  : 'bg-red-400 shadow-red-500/50'
              }`}
              style={{
                left: `calc(${50 + cents}% - 4px)`,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
