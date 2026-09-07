import "./StatCard.css";

export default function StatCard({ label, value, accent }) {
  return (
    <div className="stat-card" style={accent ? { "--card-accent": accent } : undefined}>
      <p className="stat-card__value mono">{value}</p>
      <p className="stat-card__label">{label}</p>
    </div>
  );
}

export function BreakdownCard({ title, entries }) {
  const list = Object.entries(entries || {});
  const total = list.reduce((sum, [, v]) => sum + (Number(v) || 0), 0) || 1;

  return (
    <div className="breakdown-card">
      <h3 className="breakdown-card__title">{title}</h3>
      {list.length === 0 && <p className="breakdown-card__empty">No data yet.</p>}
      {list.map(([key, value]) => (
        <div className="breakdown-card__row" key={key}>
          <span className="breakdown-card__key">{key}</span>
          <div className="breakdown-card__bar-track">
            <div
              className="breakdown-card__bar-fill"
              style={{ width: `${(Number(value) / total) * 100}%` }}
            />
          </div>
          <span className="breakdown-card__value mono">{value}</span>
        </div>
      ))}
    </div>
  );
}
