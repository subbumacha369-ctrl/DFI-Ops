"use client";

import * as React from "react";

/** Dual-line trend chart (created vs completed) rendered as inline SVG. */
export function TrendChart({
  data,
  height = 180,
}: {
  data: { date: string; created: number; completed: number }[];
  height?: number;
}) {
  const width = 640;
  const pad = 24;
  const max = Math.max(1, ...data.flatMap((d) => [d.created, d.completed]));
  const stepX = data.length > 1 ? (width - pad * 2) / (data.length - 1) : 0;
  const y = (v: number) => height - pad - (v / max) * (height - pad * 2);
  const path = (key: "created" | "completed") =>
    data.map((d, i) => `${i === 0 ? "M" : "L"} ${pad + i * stepX} ${y(d[key])}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Task trend">
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="hsl(var(--border))" />
      <path d={path("created")} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth={2} />
      <path d={path("completed")} fill="none" stroke="hsl(var(--primary))" strokeWidth={2.5} />
      {data.map((d, i) => (
        <circle key={i} cx={pad + i * stepX} cy={y(d.completed)} r={2.5} fill="hsl(var(--primary))" />
      ))}
    </svg>
  );
}

/** Horizontal labelled bar chart (used for workload + priority breakdowns). */
export function BarRows({
  data,
  color = "hsl(var(--primary))",
  onRowClick,
}: {
  data: { label: string; value: number; id?: string }[];
  color?: string;
  onRowClick?: (item: { label: string; value: number; id?: string }) => void;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2">
      {data.map((d) => {
        const row = (
          <>
            <span className="w-28 shrink-0 truncate text-xs text-muted-foreground">{d.label}</span>
            <div className="h-4 flex-1 overflow-hidden rounded bg-secondary">
              <div className="h-full rounded" style={{ width: `${(d.value / max) * 100}%`, backgroundColor: color }} />
            </div>
            <span className="w-8 text-right text-xs font-medium tabular-nums">{d.value}</span>
          </>
        );
        return onRowClick ? (
          <button key={d.label} onClick={() => onRowClick(d)} className="flex w-full items-center gap-3 rounded px-1 py-0.5 text-left hover:bg-muted">
            {row}
          </button>
        ) : (
          <div key={d.label} className="flex items-center gap-3 px-1">{row}</div>
        );
      })}
      {data.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
    </div>
  );
}

/** Donut showing completion rate. */
export function CompletionDonut({ rate }: { rate: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const dash = (rate / 100) * c;
  return (
    <div className="relative grid place-items-center">
      <svg viewBox="0 0 140 140" className="h-36 w-36 -rotate-90">
        <circle cx={70} cy={70} r={r} fill="none" stroke="hsl(var(--secondary))" strokeWidth={14} />
        <circle
          cx={70} cy={70} r={r} fill="none" stroke="hsl(var(--primary))" strokeWidth={14}
          strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-semibold">{rate}%</div>
        <div className="text-xs text-muted-foreground">complete</div>
      </div>
    </div>
  );
}

/** Department/assignee load heatmap — intensity grid. */
export function Heatmap({
  cells,
  onCellClick,
}: {
  cells: { label: string; value: number; id?: string }[];
  onCellClick?: (item: { label: string; value: number; id?: string }) => void;
}) {
  const max = Math.max(1, ...cells.map((c) => c.value));
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {cells.map((c) => {
        const intensity = c.value / max;
        const style = { backgroundColor: `hsla(168, 76%, 36%, ${0.08 + intensity * 0.55})` };
        const inner = (
          <>
            <div className="truncate font-medium">{c.label}</div>
            <div className="text-lg font-semibold tabular-nums">{c.value}</div>
          </>
        );
        return onCellClick ? (
          <button key={c.label} onClick={() => onCellClick(c)} className="rounded-md border p-3 text-left text-xs transition hover:ring-2 hover:ring-primary/40" style={style} title={`${c.label}: ${c.value}`}>
            {inner}
          </button>
        ) : (
          <div key={c.label} className="rounded-md border p-3 text-xs" style={style} title={`${c.label}: ${c.value}`}>{inner}</div>
        );
      })}
      {cells.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
    </div>
  );
}
