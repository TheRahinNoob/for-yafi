'use client';

import { useEffect, useState } from 'react';

type Props = {
  beta?: number;     // front/back
  gamma?: number;    // left/right
  alpha?: number;    // compass
  invertBeta?: boolean;   // ← change these if direction feels wrong
  invertGamma?: boolean;
};

export default function PhoneTiltVisualizer({
  beta = 0,
  gamma = 0,
  alpha = 0,
  invertBeta = true,      // ← tuned for Samsung Android
  invertGamma = false,    // ← tuned for Samsung Android
}: Props) {
  const safeBeta = Math.max(-88, Math.min(88, invertBeta ? -(beta || 0) : (beta || 0)));
  const safeGamma = Math.max(-88, Math.min(88, invertGamma ? -(gamma || 0) : (gamma || 0)));

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Compact 3D Phone with real thickness */}
      <div
        className="relative mx-auto"
        style={{
          perspective: "1800px",
          width: "130px",
          height: "260px",
        }}
      >
        <div
          className="absolute left-1/2 top-1/2 transition-transform duration-100 ease-out"
          style={{
            transform: `translate(-50%, -50%) rotateX(${safeBeta}deg) rotateY(${safeGamma}deg)`,
            transformStyle: "preserve-3d",
          }}
        >
          <svg
            width="130"
            height="260"
            viewBox="0 0 130 260"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-2xl"
          >
            {/* Back of phone (gives thickness) */}
            <rect
              x="8"
              y="8"
              width="114"
              height="244"
              rx="22"
              ry="22"
              fill="#1f2937"
              stroke="#111827"
              strokeWidth="12"
            />
            {/* Main phone body */}
            <rect
              x="8"
              y="8"
              width="114"
              height="244"
              rx="22"
              ry="22"
              fill="#111827"
              stroke="#1e2937"
              strokeWidth="18"
            />
            {/* Screen */}
            <rect
              x="22"
              y="32"
              width="86"
              height="196"
              rx="12"
              ry="12"
              fill="#0f172a"
            />
            {/* Camera */}
            <rect x="48" y="48" width="34" height="10" rx="5" fill="#1e2937" />
            <circle cx="65" cy="53" r="3" fill="#64748b" />
            {/* Speaker */}
            <rect x="46" y="74" width="38" height="4" rx="2" fill="#64748b" />
            {/* Home indicator */}
            <rect x="54" y="222" width="22" height="3" rx="1.5" fill="#64748b" />
          </svg>
        </div>
      </div>

      {/* Live values (compact) */}
      <div className="text-center font-mono text-xs bg-gray-900 border border-gray-700 rounded-2xl px-5 py-3 w-full max-w-[240px]">
        <div className="flex justify-between">
          <div>
            Beta <span className="text-emerald-400 font-bold">{beta?.toFixed(1) || "—"}°</span>
          </div>
          <div>
            Gamma <span className="text-sky-400 font-bold">{gamma?.toFixed(1) || "—"}°</span>
          </div>
          <div>
            Alpha <span className="text-amber-400 font-bold">{alpha?.toFixed(0) || "—"}°</span>
          </div>
        </div>
      </div>
    </div>
  );
}