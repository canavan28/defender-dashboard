import { useState } from 'react';
import { QuarterSelector } from '../components/QuarterSelector';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';

const tooltipStyle = {
  background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)',
  borderRadius: 8, color: '#1a1b1e', fontSize: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
};

function MetricCard({ label, value, delta, deltaDir }) {
  const deltaColor =
    deltaDir === 'up-bad' ? 'text-red-600' :
    deltaDir === 'down-good' ? 'text-green-600' :
    'text-gray-400';
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
    }} className="rounded-xl p-5">
      <p style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}
        className="text-xs uppercase tracking-widest mb-3">{label}</p>
      <p className="text-3xl font-light mb-2" style={{ color: 'var(--text-primary)' }}>{value}</p>
      {delta && <p className={`text-xs font-medium ${deltaColor}`}>{delta}</p>}
    </div>
  );
}

function IssueRow({ issue, totalHours }) {
  const [expanded, setExpanded] = useState(false);
  const pct = totalHours > 0 ? ((issue.hours / totalHours) * 100).toFixed(1) : 0;
  const hasSubIssues = issue.subIssues.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-4 py-3 cursor-pointer hover:bg-gray-50 px-3 rounded-lg transition-colors"
        onClick={() => hasSubIssues && setExpanded(!expanded)}>
        <div className="w-4 flex-shrink-0 text-center">
          {hasSubIssues && (
            <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>
              {expanded ? '▼' : '▶'}
            </span>
          )}
        </div>
        <span className="text-sm font-medium flex-1" style={{ color: 'var(--text-primary)' }}>
          {issue.label}
        </span>
        <div className="w-32 mr-4">
          <div style={{ background: 'rgba(0,0,0,0.06)', height: 6, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              width: `${pct}%`, height: '100%',
              background: '#2563eb', borderRadius: 3
            }} />
          </div>
        </div>
        <span className="text-sm w-16 text-right flex-shrink-0"
          style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
          {issue.hours}h
        </span>
        <span className="text-xs w-12 text-right flex-shrink-0"
          style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
          {pct}%
        </span>
      </div>

      {expanded && issue.subIssues.map(sub => (
        <div key={sub.label} className="flex items-center gap-4 py-2 px-3 ml-6">
          <div className="w-4 flex-shrink-0">
            <span style={{ color: 'var(--text-secondary)' }}>└</span>
          </div>
          <span className="text-xs flex-1" style={{ color: 'var(--text-secondary)' }}>
            {sub.label}
          </span>
          <div className="w-32 mr-4">
            <div style={{ background: 'rgba(0,0,0,0.06)', height: 4, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                width: `${totalHours > 0 ? (sub.hours / totalHours * 100) : 0}%`,
                height: '100%', background: 'rgba(37,99,235,0.4)', borderRadius: 3
              }} />
            </div>
          </div>
          <span className="text-xs w-16 text-right flex-shrink-0"
            style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
            {sub.hours}h
          </span>
          <span className="text-xs w-12 text-right flex-shrink-0"
            style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
            {totalHours > 0 ? ((sub.hours / totalHours) * 100).toFixed(1) : 0}%
          </span>
        </div>
      ))}
    </div>
  );
}

export function TimeAnalytics({ metrics, selectedQuarterKey, onSelectQuarter }) {
  if (!metrics) return null;
  const { timeAnalytics, quarterlyTrend, selectedQLabel } = metrics;
  const {
    totalHours, totalBillableHours, totalNonBillableHours,
    overallBillablePct, notesCoverage, hoursByTechList, hoursByIssueList,
    entryCount
  } = timeAnalytics;

  const tickStyle = {
    fill: '#6b7280', fontSize: 11, fontFamily: 'DM Mono, monospace'
  };
  const maxTechHours = hoursByTechList[0]?.hours || 1;

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Total hours" value={`${totalHours}h`}
          delta={selectedQLabel || 'All available data'} deltaDir="neutral" />
        <MetricCard label="Billable hours" value={`${totalBillableHours}h`}
          delta={`${overallBillablePct}% of total`}
          deltaDir={overallBillablePct < 70 ? 'up-bad' : 'down-good'} />
        <MetricCard label="Non-billable hours" value={`${totalNonBillableHours}h`}
          delta={`${100 - overallBillablePct}% of total`} deltaDir="neutral" />
        <MetricCard label="Notes coverage" value={`${notesCoverage}%`}
          delta={`${entryCount} time entries`}
          deltaDir={notesCoverage < 80 ? 'up-bad' : 'down-good'} />
      </div>

      {/* Quarter selector */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        className="rounded-xl p-4 flex items-center gap-4">
        <p className="text-xs flex-shrink-0"
          style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
          Filter by quarter:
        </p>
        <QuarterSelector
          quarters={quarterlyTrend}
          selectedKey={selectedQuarterKey}
          onChange={onSelectQuarter}
        />
      </div>

      {/* Hours by tech */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        className="rounded-xl p-6">
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          Hours logged per technician
        </p>
        <p className="text-xs mb-6"
          style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
          {selectedQLabel || 'All available data'} · Billable vs non-billable
        </p>
        <ResponsiveContainer width="100%" height={Math.max(200, hoursByTechList.length * 52)}>
          <BarChart
            data={hoursByTechList}
            layout="vertical"
            margin={{ left: 100, right: 60 }}>
            <XAxis type="number" tick={tickStyle} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={tickStyle}
              axisLine={false} tickLine={false} width={95} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value, name) => [`${value}h`, name === 'billable' ? 'Billable' : 'Non-billable']}
            />
            <Bar dataKey="billable" name="billable" stackId="a"
              fill="#2563eb" radius={[0,0,0,0]} />
            <Bar dataKey="nonBillable" name="nonBillable" stackId="a"
              fill="rgba(37,99,235,0.25)" radius={[0,4,4,0]} />
          </BarChart>
        </ResponsiveContainer>

        {/* Billable % per tech */}
        <div className="mt-6 space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest mb-3"
            style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
            Billable %
          </p>
          {hoursByTechList.map(tech => (
            <div key={tech.name} className="flex items-center gap-4">
              <span className="text-xs w-32 flex-shrink-0"
                style={{ color: 'var(--text-secondary)' }}>{tech.name}</span>
              <div className="flex-1 rounded-full overflow-hidden"
                style={{ background: 'rgba(0,0,0,0.06)', height: 6 }}>
                <div className="h-full rounded-full"
                  style={{
                    width: `${tech.billablePct}%`,
                    background: tech.billablePct >= 70 ? 'var(--green)' :
                      tech.billablePct >= 50 ? 'var(--amber)' : 'var(--red)'
                  }} />
              </div>
              <span className="text-xs w-10 text-right flex-shrink-0"
                style={{ color: 'var(--text-primary)', fontFamily: 'DM Mono, monospace' }}>
                {tech.billablePct}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Hours by issue type */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        className="rounded-xl p-6">
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          Hours by issue type
        </p>
        <p className="text-xs mb-2"
          style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
          {selectedQLabel || 'All available data'} · Click to expand sub-issues
        </p>
        <div className="flex justify-end gap-6 mb-4 pr-3">
          <span className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
            Hours
          </span>
          <span className="text-xs w-12 text-right" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
            %
          </span>
        </div>
        <div>
          {hoursByIssueList.map(issue => (
            <IssueRow key={issue.label} issue={issue} totalHours={totalHours} />
          ))}
          {hoursByIssueList.length === 0 && (
            <p className="text-sm py-4" style={{ color: 'var(--text-secondary)' }}>
              No time entry data for this period
            </p>
          )}
        </div>
      </div>
    </div>
  );
}