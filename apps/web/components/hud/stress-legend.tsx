'use client';

const LEGEND_ITEMS = [
  { color: '#37d0b6', label: 'LOW' },
  { color: '#f7b955', label: 'MED' },
  { color: '#f97316', label: 'HIGH' },
  { color: '#f36f6f', label: 'CRIT' },
] as const;

export function StressLegend() {
  return (
    <div
      className="absolute bottom-3 left-3 z-20 flex items-center gap-2"
      style={{
        padding: '8px 12px',
        background: '#07111dcc',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 99,
        backdropFilter: 'blur(6px)',
      }}
    >
      <span className="font-mono" style={{ fontSize: 8, color: '#aac0dd', letterSpacing: '0.1em' }}>
        NODE STRESS
      </span>
      {LEGEND_ITEMS.map(({ color, label }) => (
        <div key={label} className="flex items-center gap-1">
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: 99,
              background: color,
              boxShadow: `0 0 4px ${color}`,
            }}
          />
          <span className="font-mono" style={{ fontSize: 7, color: '#f5f7fb', letterSpacing: '0.08em' }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
