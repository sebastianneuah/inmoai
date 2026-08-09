/**
 * Iconografía propia de la app (SVG de trazo, no emojis): se ve consistente
 * en Android e iOS y hereda el color del texto.
 */

type Props = { className?: string; relleno?: boolean };

const base = "h-6 w-6";

export function IconoInicio({ className = base, relleno }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill={relleno ? "currentColor" : "none"}>
      <path
        d="M3 10.5 12 3l9 7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M5.5 9.5V20h13V9.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill={relleno ? "currentColor" : "none"}
      />
    </svg>
  );
}

export function IconoBuscar({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconoPedido({ className = base, relleno }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none">
      <path
        d="M6 8h12l-1 12H7L6 8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill={relleno ? "currentColor" : "none"}
      />
      <path d="M9.5 8V6.5a2.5 2.5 0 0 1 5 0V8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconoBeneficios({ className = base, relleno }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none">
      <rect
        x="3.5" y="9" width="17" height="11" rx="2"
        stroke="currentColor" strokeWidth="1.8"
        fill={relleno ? "currentColor" : "none"}
      />
      <path d="M3.5 13h17M12 9v11" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 9S10.5 5 8.4 5a2 2 0 1 0 0 4H12Zm0 0s1.5-4 3.6-4a2 2 0 1 1 0 4H12Z"
        stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconoCuenta({ className = base, relleno }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none">
      <circle
        cx="12" cy="8.5" r="3.5"
        stroke="currentColor" strokeWidth="1.8"
        fill={relleno ? "currentColor" : "none"}
      />
      <path
        d="M4.5 20c.8-3.8 3.9-5.8 7.5-5.8s6.7 2 7.5 5.8"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function IconoCorazon({ className = "h-5 w-5", relleno }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill={relleno ? "currentColor" : "none"}>
      <path
        d="M12 20s-7.5-4.6-7.5-9.4A4.1 4.1 0 0 1 12 7.8a4.1 4.1 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z"
        stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconoFlecha({ className = "h-5 w-5" }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none">
      <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconoChevron({ className = "h-4 w-4" }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none">
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconoCampana({ className = "h-6 w-6" }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none">
      <path
        d="M18 15.5V11a6 6 0 1 0-12 0v4.5L4.5 18h15L18 15.5Z"
        stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"
      />
      <path d="M10 20.5a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
