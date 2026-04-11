'use client';

import { useEffect, useState } from 'react';

type Props = {
  beta?: number;   // front/back tilt (-90° to 90°)
  gamma?: number;  // left/right tilt (-90° to 90°)
  alpha?: number;  // compass heading (optional)
};

export default function PhoneTiltVisualizer({ beta = 0, gamma = 0, alpha = 0 }: Props) {
  // Clamp values for realistic visual limits
  const safeBeta = Math.max(-85, Math.min(85, beta || 0));
  const safeGamma = Math.max(-85, Math.min(85, gamma || 0));

  return (
    <div className="flex flex-col items-center gap-8">
      {/* 3D Phone Container */}
      <div
        className="relative mx-auto"
        style={{
          perspective: '1400px',
          width: '160px',
          height: '320px',
        }}
      >
        <div
          className="absolute left-1/2 top-1/2 transition-transform duration-100 ease-out shadow-2xl"
          style={{
            transform: `translate(-50%, -50%) rotateX(${safeBeta}deg) rotateY(${safeGamma}deg)`,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Phone SVG */}
          <svg
            width="160"
            height="320"
            viewBox="0 0 160 320"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-[0_25px_25px_rgba(0,0,0,0.6)]"
          >
            {/* Phone frame */}
            <rect
              x="12"
              y="12"
              width="136"
              height="296"
              rx="26"
              ry="26"
              fill="#111827"
              stroke="#1e2937"
              strokeWidth="18"
            />
            {/* Screen */}
            <rect
              x="26"
              y="36"
              width="108"
              height="248"
              rx="12"
              ry="12"
              fill="#0f172a"
            />
            {/* Camera cutout */}
            <rect x="62" y="52" width="36" height="10" rx="5" fill="#1e2937" />
            <circle cx="80" cy="57" r="3.5" fill="#64748b" />
            {/* Speaker grill */}
            <rect x="58" y="78" width="44" height="5" rx="2.5" fill="#64748b" />
            {/* Home indicator (for realism) */}
            <rect x="68" y="272" width="24" height="3" rx="1.5" fill="#64748b" />
          </svg>
        </div>
      </div>

      {/* Live Angle Display */}
      <div className="text-center font-mono bg-gray-900 border border-gray-700 rounded-3xl px-8 py-5 shadow-inner">
        <div className="grid grid-cols-3 gap-6 text-sm">
          <div>
            <div className="text-gray-400 text-xs">BETA (↑↓)</div>
            <div className="text-3xl font-bold text-emerald-400">{safeBeta.toFixed(1)}°</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs">GAMMA (←→)</div>
            <div className="text-3xl font-bold text-sky-400">{safeGamma.toFixed(1)}°</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs">ALPHA (Compass)</div>
            <div className="text-3xl font-bold text-amber-400">{(alpha || 0).toFixed(0)}°</div>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500 text-center max-w-[260px]">
        Tilt your phone in any direction — the 3D icon follows in real time
      </p>
    </div>
  );
}