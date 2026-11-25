"use client";
// Disco de luz: arraste o ponto para mudar a direção da luz.
// Centro = luz de frente (zênite); borda = luz rasante. Ângulo = de onde a luz vem.
import { useRef } from "react";

export function LightDial({
  az,
  el,
  onChange,
  size = 112,
}: {
  az: number;
  el: number;
  onChange: (v: { az: number; el: number }) => void;
  size?: number;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const R = size / 2 - 8;
  const rr = (1 - el / 90) * R;
  const x = size / 2 + Math.cos((az * Math.PI) / 180) * rr;
  const y = size / 2 - Math.sin((az * Math.PI) / 180) * rr;

  const set = (e: React.PointerEvent) => {
    const b = ref.current!.getBoundingClientRect();
    const dx = e.clientX - b.left - size / 2,
      dy = -(e.clientY - b.top - size / 2);
    const r = Math.min(R, Math.hypot(dx, dy));
    let a = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (a < 0) a += 360;
    onChange({ az: Math.round(a), el: Math.max(3, Math.round((1 - r / R) * 90)) });
  };

  return (
    <svg
      ref={ref}
      width={size}
      height={size}
      className="cursor-crosshair touch-none select-none"
      onPointerDown={(e) => {
        (e.target as Element).setPointerCapture(e.pointerId);
        set(e);
      }}
      onPointerMove={(e) => e.buttons && set(e)}
      role="slider"
      aria-label="Direção da luz"
      aria-valuetext={`azimute ${az}°, elevação ${el}°`}
    >
      <defs>
        <radialGradient id="ld-g" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#3a342c" />
          <stop offset="1" stopColor="#1a1816" />
        </radialGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={R} fill="url(#ld-g)" stroke="#3b3631" />
      <circle cx={size / 2} cy={size / 2} r={R * (1 - 20 / 90)} fill="none" stroke="#d4ae64" strokeOpacity=".22" strokeDasharray="2 3" />
      <circle cx={size / 2} cy={size / 2} r={R * 0.5} fill="none" stroke="#ffffff" strokeOpacity=".06" />
      <path d={`M${size / 2} ${8}V${size - 8}M8 ${size / 2}H${size - 8}`} stroke="#ffffff" strokeOpacity=".06" />
      <line x1={size / 2} y1={size / 2} x2={x} y2={y} stroke="#d4ae64" strokeOpacity=".5" />
      <circle cx={x} cy={y} r={7} fill="#f6e7c4" stroke="#d4ae64" strokeWidth="2" />
      <circle cx={x} cy={y} r={13} fill="#d4ae64" fillOpacity=".15" />
    </svg>
  );
}
