"use client";
// Componentes de interface do IANVS. Discretos, densos e consistentes.
import { forwardRef, useEffect, useId, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md"; icon?: ReactNode }
>(function Button({ variant = "secondary", size = "md", icon, className, children, ...rest }, ref) {
  return (
    <button
      ref={ref}
      {...rest}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors select-none disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap",
        size === "sm" ? "h-7 px-2.5 text-[12px]" : "h-9 px-3.5 text-[13px]",
        variant === "primary" && "bg-gold text-[#1a1510] hover:bg-[#e2be78]",
        variant === "secondary" && "bg-raised text-ink border border-line hover:border-line-2 hover:bg-[#262320]",
        variant === "ghost" && "text-ink-2 hover:text-ink hover:bg-white/5",
        variant === "danger" && "text-danger border border-danger/30 hover:bg-danger/10",
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
});

export function IconButton({
  label,
  active,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return (
    <button
      {...rest}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cx(
        "inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-full px-2.5 text-[12.5px] transition-colors",
        active ? "bg-gold-soft text-gold" : "text-ink-2 hover:text-ink hover:bg-white/6",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  format,
  unit,
  hint,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  unit?: string;
  hint?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const pct = ((value - min) / (max - min)) * 100;
  const shown = format ? format(value) : String(+value.toFixed(3));
  return (
    <div className={cx("group py-1.5", disabled && "opacity-40 pointer-events-none")}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-[12px] text-ink-2" title={hint}>
          {label}
        </label>
        <div className="flex items-baseline gap-1">
          <input
            aria-label={`${label} (valor)`}
            className="w-14 bg-transparent text-right text-[12px] tabular-nums text-ink outline-none focus:text-gold"
            value={draft ?? shown}
            onFocus={(e) => {
              setDraft(shown);
              requestAnimationFrame(() => e.target.select());
            }}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              const n = parseFloat((draft ?? "").replace(",", "."));
              if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
              setDraft(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
          {unit && <span className="text-[11px] text-faint">{unit}</span>}
        </div>
      </div>
      <input
        id={id}
        type="range"
        className="slider"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ ["--pct" as string]: `${Math.max(0, Math.min(100, pct))}%` }}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onDoubleClick={() => undefined}
      />
    </div>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5" title={hint}>
      <span className="text-[12px] text-ink-2">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx("relative h-[18px] w-8 rounded-full transition-colors", checked ? "bg-gold" : "bg-[#3a3632]")}
      >
        <span className={cx("absolute top-[2px] h-[14px] w-[14px] rounded-full bg-[#f6efe2] shadow transition-all", checked ? "left-[16px]" : "left-[2px]")} />
      </button>
    </label>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = "md",
  className,
}: {
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div className={cx("flex rounded-lg bg-bg-2 p-0.5 border border-line", className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          title={o.title}
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "flex-1 rounded-md transition-colors whitespace-nowrap",
            size === "sm" ? "px-2 py-1 text-[11.5px]" : "px-3 py-1.5 text-[12.5px]",
            value === o.value ? "bg-raised text-ink shadow-sm" : "text-muted hover:text-ink-2",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Section({ title, children, aside, className }: { title?: string; children: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <section className={cx("border-b border-line px-5 py-4 last:border-b-0", className)}>
      {title && (
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-gold">{title}</h3>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label?: string; suffix?: string }>(
  function TextInput({ label, suffix, className, ...rest }, ref) {
    const id = useId();
    return (
      <div className={cx("flex flex-col gap-1", className)}>
        {label && (
          <label htmlFor={id} className="text-[11.5px] text-muted">
            {label}
          </label>
        )}
        <div className="flex items-center rounded-lg border border-line bg-bg-2 focus-within:border-gold/60">
          <input ref={ref} id={id} {...rest} className="h-9 w-full min-w-0 bg-transparent px-3 text-[13px] text-ink outline-none placeholder:text-faint" />
          {suffix && <span className="pr-3 text-[11.5px] text-faint">{suffix}</span>}
        </div>
      </div>
    );
  },
);

export function TextArea({ label, className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  const id = useId();
  return (
    <div className={cx("flex flex-col gap-1", className)}>
      {label && (
        <label htmlFor={id} className="text-[11.5px] text-muted">
          {label}
        </label>
      )}
      <textarea
        id={id}
        {...rest}
        className="min-h-[84px] resize-y rounded-lg border border-line bg-bg-2 px-3 py-2 text-[13px] leading-relaxed text-ink outline-none placeholder:text-faint focus:border-gold/60"
      />
    </div>
  );
}

export function Select({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cx("flex flex-col gap-1", className)}>
      {label && (
        <label htmlFor={id} className="text-[11.5px] text-muted">
          {label}
        </label>
      )}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-lg border border-line bg-bg-2 px-2.5 text-[13px] text-ink outline-none focus:border-gold/60"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal
        className={cx("fade-up flex max-h-[94vh] w-full flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl", wide ? "max-w-[1180px]" : "max-w-lg")}
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-[14px] font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted hover:bg-white/5 hover:text-ink" aria-label="Fechar">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
        {footer && <footer className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "gold" | "ok" | "danger" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        tone === "neutral" && "bg-white/6 text-ink-2",
        tone === "gold" && "bg-gold-soft text-gold",
        tone === "ok" && "bg-ok/12 text-ok",
        tone === "danger" && "bg-danger/12 text-danger",
      )}
    >
      {children}
    </span>
  );
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cx("h-1.5 w-full overflow-hidden rounded-full bg-[#2c2926]", className)}>
      <div className="h-full rounded-full bg-gold transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Dropzone({
  onFiles,
  accept = "image/*",
  multiple,
  children,
  className,
  directory,
}: {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  children: ReactNode;
  className?: string;
  directory?: boolean;
}) {
  const [over, setOver] = useState(false);
  const id = useId();
  return (
    <label
      htmlFor={id}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const fs = [...e.dataTransfer.files];
        if (fs.length) onFiles(multiple ? fs : fs.slice(0, 1));
      }}
      className={cx("block cursor-pointer transition-colors", over && "ring-2 ring-gold/70", className)}
    >
      <input
        id={id}
        type="file"
        hidden
        accept={accept}
        multiple={multiple}
        {...(directory ? { webkitdirectory: "", directory: "" } : {})}
        onChange={(e) => {
          const fs = [...(e.target.files ?? [])];
          if (fs.length) onFiles(fs);
          e.target.value = "";
        }}
      />
      {children}
    </label>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cx("inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent", className)} />;
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cx("flex items-center gap-2.5", className)}>
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
        <defs>
          <radialGradient id="lg" cx="35%" cy="30%" r="75%">
            <stop offset="0" stopColor="#f0d49a" />
            <stop offset="1" stopColor="#9c7638" />
          </radialGradient>
        </defs>
        <circle cx="16" cy="16" r="14.5" fill="url(#lg)" />
        <circle cx="16" cy="16" r="11.5" fill="none" stroke="#6e5022" strokeOpacity=".55" strokeDasharray="1.2 1.6" />
        <path d="M11.5 9.5c-2 1.6-2.6 4-2.6 6.5s.8 4.9 2.6 6.5M20.5 9.5c2 1.6 2.6 4 2.6 6.5s-.8 4.9-2.6 6.5M16 8.5v15" stroke="#5a3f16" strokeWidth="1.7" fill="none" strokeLinecap="round" />
      </svg>
      <span className="font-serif text-[22px] font-semibold tracking-[0.22em] text-gold">IANVS</span>
    </span>
  );
}
