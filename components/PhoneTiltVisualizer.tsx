'use client';

import { useEffect, useState } from 'react';

type Props = {
  beta?: number;
  gamma?: number;
  alpha?: number;
};

export default function PhoneTiltVisualizer({ beta = 0, gamma = 0, alpha = 0 }: Props) {
  // Inverted signs + clamping for natural feel
  const safeBeta = Math.max(-88, Math.min(88, -(beta || 0)));
  const safeGamma = Math.max(-88, Math.min(88, -(gamma || 0)));

  return (
    <div className="flex flex-col items-center gap-6">
      {/* 3D Phone Container */}
      <div
        className="relative mx-auto"
        style={{
          perspective: "1600px",
          width: "170px",
          height: "340px",
        }}
      >
        <div
          className="absolute left-1/2 top-1/2 transition-transform duration-75 ease-out shadow-2xl"
          style={{
            transform: `translate(-50%, -50%) rotateX(${safeBeta}deg) rotateY(${safeGamma}deg)`,
            transformStyle: "preserve-3d",
          }}
        >
          {/* Phone SVG */}
          <svg
            width="170"
            height="340"
            viewBox="0 0 170 340"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-[0_30px_30px_rgba(0,0,0,0.7)]"
          >
            {/* Phone body */}
            <rect
              x="12"
              y="12"
              width="146"
              height="316"
              rx="28"
              ry="28"
              fill="#111827"
              stroke="#1e2937"
              strokeWidth="20"
            />
            {/* Screen */}
            <rect
              x="28"
              y="38"
              width="114"
              height="264"
              rx="14"
              ry="14"
              fill="#0f172a"
            />
            {/* Camera */}
            <rect x="66" y="54" width="38" height="11" rx="5.5" fill="#1e2937" />
            <circle cx="85" cy="59.5" r="3.8" fill="#64748b" />
            {/* Speaker */}
            <rect x="62" y="82" width="46" height="5" rx="2.5" fill="#64748b" />
            {/* Home indicator */}
            <rect x="72" y="290" width="26" height="3.5" rx="1.75" fill="#64748b" />
          </svg>
        </div>
      </div>

      {/* Live Values */}
      <div className="text-center font-mono bg-gray-900 border border-gray-700 rounded-3xl px-8 py-5 shadow-inner w-full max-w-[260px]">
        <div className="grid grid-cols-3 gap-6 text-sm">
          <div>
            <div className="text-gray-400 text-xs">BETA (↑↓)</div>
            <div className="text-3xl font-bold text-emerald-400">{beta?.toFixed(1) || "—"}°</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs">GAMMA (←→)</div>
            <div className="text-3xl font-bold text-sky-400">{gamma?.toFixed(1) || "—"}°</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs">ALPHA (Compass)</div>
            <div className="text-3xl font-bold text-amber-400">{alpha?.toFixed(0) || "—"}°</div>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500 text-center max-w-[280px]">
        Tilt your phone naturally — the icon now matches real-world movement
      </p>
    </div>
  );
}