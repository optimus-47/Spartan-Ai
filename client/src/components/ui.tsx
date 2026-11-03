import type { ReactNode } from "react";

export const chartTooltipStyle = {
  border: "1px solid var(--border)",
  borderRadius: 10,
  color: "var(--text)",
  background: "var(--surface)",
  fontSize: 12,
};

export const chartTick = { fill: "var(--muted)", fontSize: 11 };

interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  label?: ReactNode;
  sublabel?: ReactNode;
  tone?: "accent" | "warm" | "cool";
}

export function ProgressRing({
  value,
  max,
  size = 168,
  stroke = 12,
  label,
  sublabel,
  tone = "accent",
}: ProgressRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <div className={`ring ring-${tone}`} style={{ width: size, height: size }}>
      <svg aria-hidden="true" height={size} viewBox={`0 0 ${size} ${size}`} width={size}>
        <circle
          className="ring-track"
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          strokeWidth={stroke}
        />
        <circle
          className="ring-value"
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          strokeLinecap="round"
          strokeWidth={stroke}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-label">
        {label}
        {sublabel && <span>{sublabel}</span>}
      </div>
    </div>
  );
}

interface MacroBarProps {
  label: string;
  value: number;
  target: number;
  unit?: string;
  tone?: "protein" | "carbs" | "fat" | "accent";
}

export function MacroBar({ label, value, target, unit = "g", tone = "accent" }: MacroBarProps) {
  const ratio = target > 0 ? Math.min(value / target, 1) : 0;
  return (
    <div className={`macro macro-${tone}`}>
      <div className="macro-head">
        <span>{label}</span>
        <span>
          <strong>{Math.round(value)}</strong> / {Math.round(target)}
          {unit}
        </span>
      </div>
      <div className="macro-track-bar">
        <div className="macro-fill-bar" style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: string;
  trend?: { text: string; positive: boolean } | null;
}

export function StatCard({ label, value, hint, icon, trend }: StatCardProps) {
  return (
    <article className="stat-card">
      <div className="stat-card-top">
        <span className="stat-card-label">{label}</span>
        {icon && (
          <span aria-hidden="true" className="stat-card-icon">
            {icon}
          </span>
        )}
      </div>
      <strong className="stat-card-value">{value}</strong>
      <div className="stat-card-foot">
        {trend && (
          <span className={trend.positive ? "trend-up" : "trend-down"}>{trend.text}</span>
        )}
        {hint && <span>{hint}</span>}
      </div>
    </article>
  );
}

interface PageHeaderProps {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, lede, actions }: PageHeaderProps) {
  return (
    <section className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {lede && <p className="page-lede">{lede}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </section>
  );
}

interface PanelProps {
  eyebrow?: string;
  title?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Panel({ eyebrow, title, action, className = "", children }: PanelProps) {
  return (
    <article className={`panel ${className}`.trim()}>
      {(eyebrow || title || action) && (
        <div className="panel-heading">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {title && <h2>{title}</h2>}
          </div>
          {action}
        </div>
      )}
      {children}
    </article>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="app-page" aria-live="polite">
      <div className="skeleton-header" />
      <div className="skeleton-grid">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="skeleton-card" key={index} />
        ))}
      </div>
      <div className="skeleton-grid skeleton-grid-wide">
        <div className="skeleton-card skeleton-tall" />
        <div className="skeleton-card skeleton-tall" />
      </div>
      <span className="visually-hidden">{label}</span>
    </div>
  );
}

export function ErrorState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <section className="dashboard-state">
      <p className="eyebrow">SOMETHING WENT WRONG</p>
      <h1>{title}</h1>
      <p className="form-error" role="alert">
        {message}
      </p>
      <button className="button button-primary" onClick={onRetry} type="button">
        Try again
      </button>
    </section>
  );
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span aria-hidden="true" className="empty-state-icon">
        {icon}
      </span>
      <strong>{title}</strong>
      {children}
    </div>
  );
}
