import { MetricCard } from '../components/MetricCard';

export function TechCapacity({ data }) {
  if (!data) return null;
  const { open, resources } = data;

  const resourceMap = {};
  (resources.resources || []).forEach(r => { resourceMap[r.id] = r.name; });

  const techData = Object.entries(open.byTech)
    .map(([id, count]) => ({ id, name: resourceMap[id] || `Tech ${id}`, count }))
    .sort((a, b) => b.count - a.count);

  const maxCount = techData[0]?.count || 1;
  const avgPerTech = techData.length
    ? Math.round(techData.reduce((s, t) => s + t.count, 0) / techData.length)
    : 0;

  const barColor = (count) => {
    if (count >= maxCount * 0.85) return 'var(--red)';
    if (count >= maxCount * 0.65) return 'var(--amber)';
    return 'var(--green)';
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Active technicians" value={techData.length} delta="Assigned to open tickets" deltaDir="neutral" />
        <MetricCard label="Avg tickets / tech" value={avgPerTech}
          delta={avgPerTech > 60 ? 'Above healthy threshold' : 'Within healthy range'}
          deltaDir={avgPerTech > 60 ? 'up-bad' : 'down-good'} />
        <MetricCard label="Highest load" value={techData[0]?.count || 0}
          delta={techData[0]?.name || ''}
          deltaDir={techData[0]?.count > 80 ? 'up-bad' : 'neutral'} />
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        className="rounded-xl p-6">
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Open tickets per technician</p>
        <p className="text-xs mb-6" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
          Red = high load · Amber = moderate · Green = healthy
        </p>
        <div className="space-y-4">
          {techData.map(tech => (
            <div key={tech.id} className="flex items-center gap-4">
              <span className="text-sm w-32 truncate flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                {tech.name}
              </span>
              <div className="flex-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)', height: 8 }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(tech.count / maxCount) * 100}%`, background: barColor(tech.count) }} />
              </div>
              <span className="text-sm font-medium w-8 text-right flex-shrink-0"
                style={{ color: 'var(--text-primary)', fontFamily: 'DM Mono, monospace' }}>
                {tech.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
