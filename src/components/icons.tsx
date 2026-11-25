// Ícones de traço (24×24, stroke 1.6), no estilo da interface.
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };
const S = ({ size = 16, children, ...rest }: P & { children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...rest}>
    {children}
  </svg>
);

export const IconObverse = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M10 8.5c-1.2.8-1.6 2.2-1.6 3.5s.6 2.7 1.6 3.5M13 9.5c1.4.2 2.3 1.2 2.3 2.5" />
  </S>
);
export const IconReverse = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M8.5 14.5h7M12 7.5v7M9.5 10l2.5-2.5 2.5 2.5" />
  </S>
);
export const IconSpin = (p: P) => (
  <S {...p}>
    <path d="M20 12a8 8 0 1 1-2.3-5.6" />
    <path d="M20 4.5v4h-4" />
  </S>
);
export const IconCenter = (p: P) => (
  <S {...p}>
    <path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4" />
    <circle cx="12" cy="12" r="2.5" />
  </S>
);
export const IconFullscreen = (p: P) => (
  <S {...p}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </S>
);
export const IconLight = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="3.5" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
  </S>
);
export const IconRaking = (p: P) => (
  <S {...p}>
    <path d="M3 18h18" />
    <path d="M5 14.5c2-1.5 4-1.5 6 0s4 1.5 6 0" />
    <path d="M3 9l6 3M3 6l8 4" />
  </S>
);
export const IconDownload = (p: P) => (
  <S {...p}>
    <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" />
  </S>
);
export const IconUpload = (p: P) => (
  <S {...p}>
    <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 19.5h14" />
  </S>
);
export const IconPlus = (p: P) => (
  <S {...p}>
    <path d="M12 5v14M5 12h14" />
  </S>
);
export const IconTrash = (p: P) => (
  <S {...p}>
    <path d="M4.5 7h15M10 11v6M14 11v6M6 7l1 12a1.5 1.5 0 0 0 1.5 1.4h7A1.5 1.5 0 0 0 17 19l1-12M9 7V4.5h6V7" />
  </S>
);
export const IconEdit = (p: P) => (
  <S {...p}>
    <path d="M4 20h4L19 9a2.1 2.1 0 0 0-4-4L4 16v4Z" />
  </S>
);
export const IconCrop = (p: P) => (
  <S {...p}>
    <path d="M6 2v14a2 2 0 0 0 2 2h14" />
    <path d="M18 22V8a2 2 0 0 0-2-2H2" />
  </S>
);
export const IconSearch = (p: P) => (
  <S {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </S>
);
export const IconArrowLeft = (p: P) => (
  <S {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </S>
);
export const IconExternal = (p: P) => (
  <S {...p}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </S>
);
export const IconInfo = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5M12 8h.01" />
  </S>
);
export const IconRotate = (p: P) => (
  <S {...p}>
    <path d="M4 12a8 8 0 0 1 13.7-5.6L20 9M20 4v5h-5" />
  </S>
);
export const IconRotateCcw = (p: P) => (
  <S {...p}>
    <path d="M20 12A8 8 0 0 0 6.3 6.4L4 9M4 4v5h5" />
  </S>
);
export const IconMirror = (p: P) => (
  <S {...p}>
    <path d="M12 3v18" strokeDasharray="2 2" />
    <path d="M9 7 4 17h5V7ZM15 7l5 10h-5V7Z" />
  </S>
);
export const IconWand = (p: P) => (
  <S {...p}>
    <path d="m4 20 11-11M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2ZM19 11l.6 1.4L21 13l-1.4.6L19 15l-.6-1.4L17 13l1.4-.6L19 11Z" />
  </S>
);
export const IconCube = (p: P) => (
  <S {...p}>
    <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
    <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
  </S>
);
export const IconImage = (p: P) => (
  <S {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <circle cx="9" cy="10" r="1.8" />
    <path d="m4 18 5-5 4 4 3-3 4 4" />
  </S>
);
export const IconTable = (p: P) => (
  <S {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10" />
  </S>
);
export const IconCode = (p: P) => (
  <S {...p}>
    <path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" />
  </S>
);
export const IconCheck = (p: P) => (
  <S {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </S>
);
export const IconLayers = (p: P) => (
  <S {...p}>
    <path d="m12 4 8.5 4.5L12 13 3.5 8.5 12 4Z" />
    <path d="m3.5 12.5 8.5 4.5 8.5-4.5M3.5 16.5 12 21l8.5-4.5" />
  </S>
);
export const IconBook = (p: P) => (
  <S {...p}>
    <path d="M5 4.5h10a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3V4.5Z" />
    <path d="M5 17a3 3 0 0 1 3-3h10" />
  </S>
);
