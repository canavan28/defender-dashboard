/**
 * All metric calculations live here.
 * Takes raw ticket data + a selected quarter and returns derived metrics.
 */

export function getQuarterLabel(date) {
  const q = Math.floor(date.getMonth() / 3) + 1;
  return `Q${q} '${String(date.getFullYear()).slice(2)}`;
}

export function getQuarterKey(date) {
  const q = Math.floor(date.getMonth() / 3) + 1;
  return `${date.getFullYear()}-Q${q}`;
}

export function getQuarterRange(year, quarter) {
  const startMonth = (quarter - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0, 23, 59, 59);
  return { start, end };
}

export function parseQuarterKey(key) {
  const [year, q] = key.split('-Q');
  return { year: parseInt(year), quarter: parseInt(q) };
}

export function filterByDateRange(tickets, start, end, dateField = 'createDate') {
  return tickets.filter(t => {
    if (!t[dateField]) return false;
    const d = new Date(t[dateField]);
    return d >= start && d <= end;
  });
}

export function useTicketMetrics(rawData, selectedQuarterKey) {
  if (!rawData) return null;

  const {
    allTickets, completedTickets, openTickets,
    resources, excludeResources, issueTypeMap
  } = rawData;

  const now = new Date();

  // ── Resource map ────────────────────────────────────────────────────────────
  const resourceMap = {};
  (resources || [])
    .filter(r => r.licenseType !== 7 && !excludeResources.includes(r.id))
    .forEach(r => { resourceMap[r.id] = r.name; });

  // ── Build quarterly buckets ─────────────────────────────────────────────────
  const quarterMap = {};
  allTickets.forEach(t => {
    if (!t.createDate) return;
    const d = new Date(t.createDate);
    const key = getQuarterKey(d);
    if (!quarterMap[key]) quarterMap[key] = [];
    quarterMap[key].push(t);
  });

  const quarterlyTrend = Object.keys(quarterMap)
    .sort()
    .map(key => ({
      key,
      label: (() => {
        const { year, quarter } = parseQuarterKey(key);
        return `Q${quarter} '${String(year).slice(2)}`;
      })(),
      count: quarterMap[key].length,
      isSelected: key === selectedQuarterKey,
      isCurrentQuarter: key === getQuarterKey(now)
    }));

  // ── YTD ────────────────────────────────────────────────────────────────────
  const ytdStart = new Date(now.getFullYear(), 0, 1);
  const ytdEnd = now;
  const priorYtdStart = new Date(now.getFullYear() - 1, 0, 1);
  const priorYtdEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 23, 59, 59);

  const ytdCurrent = filterByDateRange(allTickets, ytdStart, ytdEnd).length;
  const ytdPrior = filterByDateRange(allTickets, priorYtdStart, priorYtdEnd).length;
  const ytdChange = ytdPrior ? (((ytdCurrent - ytdPrior) / ytdPrior) * 100).toFixed(0) : 0;

  const ytdStartLabel = `Jan 1 '${String(now.getFullYear()).slice(2)}`;
  const ytdEndLabel = `${now.toLocaleString('default', { month: 'short' })} ${now.getDate()} '${String(now.getFullYear()).slice(2)}`;
  const priorYtdStartLabel = `Jan 1 '${String(now.getFullYear() - 1).slice(2)}`;
  const priorYtdEndLabel = `${priorYtdEnd.toLocaleString('default', { month: 'short' })} ${priorYtdEnd.getDate()} '${String(priorYtdEnd.getFullYear()).slice(2)}`;

  // ── Current partial quarter ────────────────────────────────────────────────
  const currentQNum = Math.floor(now.getMonth() / 3) + 1;
  const currentQYear = now.getFullYear();
  const { start: cqStart, end: cqEnd } = getQuarterRange(currentQYear, currentQNum);
  const { start: priorCqStart, end: priorCqEnd } = getQuarterRange(currentQYear - 1, currentQNum);
  // Make prior quarter partial — same day cutoff
  const priorCqCutoff = new Date(currentQYear - 1, now.getMonth(), now.getDate(), 23, 59, 59);

  const currentQCount = filterByDateRange(allTickets, cqStart, now).length;
  const priorQCount = filterByDateRange(allTickets, priorCqStart, priorCqCutoff).length;
  const currentQChange = priorQCount ? (((currentQCount - priorQCount) / priorQCount) * 100).toFixed(0) : 0;
  const currentQLabel = `Q${currentQNum} ${currentQYear}`;
  const priorQLabel = `Q${currentQNum} ${currentQYear - 1}`;

  // ── Selected quarter metrics ───────────────────────────────────────────────
  let selectedQTickets = [];
  let selectedQCompleted = [];
  let selectedQLabel = '';

  if (selectedQuarterKey) {
    const { year, quarter } = parseQuarterKey(selectedQuarterKey);
    const { start, end } = getQuarterRange(year, quarter);
    selectedQLabel = `Q${quarter} ${year}`;
    selectedQTickets = filterByDateRange(allTickets, start, end);
    selectedQCompleted = filterByDateRange(completedTickets, start, end, 'completedDate');
  }

  // ── Closed tickets per tech for selected quarter ───────────────────────────
  const closedByTech = {};
  selectedQCompleted.forEach(t => {
    const id = t.assignedResourceID;
    if (id && resourceMap[id]) {
      closedByTech[id] = (closedByTech[id] || 0) + 1;
    }
  });

  const closedByTechList = Object.entries(closedByTech)
    .map(([id, count]) => ({ id: parseInt(id), name: resourceMap[id], count }))
    .sort((a, b) => b.count - a.count);

  // ── Current open tickets per tech ─────────────────────────────────────────
  const openByTech = {};
  (openTickets || [])
    .filter(t => t.assignedResourceID && !excludeResources.includes(t.assignedResourceID) && resourceMap[t.assignedResourceID])
    .forEach(t => {
      openByTech[t.assignedResourceID] = (openByTech[t.assignedResourceID] || 0) + 1;
    });

  const openByTechList = Object.entries(openByTech)
    .map(([id, count]) => ({ id: parseInt(id), name: resourceMap[id], count }))
    .sort((a, b) => b.count - a.count);

  // ── Avg open age ──────────────────────────────────────────────────────────
  const openAges = (openTickets || [])
    .filter(t => t.createDate && !excludeResources.includes(t.assignedResourceID))
    .map(t => (now - new Date(t.createDate)) / (1000 * 60 * 60 * 24));
  const avgOpenAge = openAges.length
    ? (openAges.reduce((s, d) => s + d, 0) / openAges.length).toFixed(1)
    : 0;

  // ── Avg resolution time ───────────────────────────────────────────────────
  const resolutionTimes = completedTickets
    .filter(t => t.completedDate && t.createDate)
    .map(t => (new Date(t.completedDate) - new Date(t.createDate)) / (1000 * 60 * 60 * 24))
    .filter(d => d >= 0 && d < 365);
  const avgResolutionDays = resolutionTimes.length
    ? (resolutionTimes.reduce((s, d) => s + d, 0) / resolutionTimes.length).toFixed(1)
    : 0;

  // ── SLA breach rate (selected quarter or all time) ────────────────────────
  const slaTickets = selectedQTickets.length > 0 ? selectedQTickets : allTickets;
  const slaEligible = slaTickets.filter(t => t.firstResponseDueDateTime);
  const slaBreach = slaEligible.filter(t => {
    if (!t.firstResponseDateTime) return true;
    return new Date(t.firstResponseDateTime) > new Date(t.firstResponseDueDateTime);
  });
  const slaBreachRate = slaEligible.length
    ? parseFloat(((slaBreach.length / slaEligible.length) * 100).toFixed(1))
    : 0;

  // ── Issue type breakdown (selected quarter or all) ────────────────────────
  const issueSource = selectedQTickets.length > 0 ? selectedQTickets : allTickets;
  const byIssueType = {};
  issueSource.forEach(t => {
    if (t.issueType) {
      const label = issueTypeMap[String(t.issueType)] || `Type ${t.issueType}`;
      byIssueType[label] = (byIssueType[label] || 0) + 1;
    }
  });

  // ── Staffing signals — trailing 12 vs prior 12 ───────────────────────────
  const trailing12Start = new Date();
  trailing12Start.setMonth(trailing12Start.getMonth() - 12);
  const prior12Start = new Date();
  prior12Start.setMonth(prior12Start.getMonth() - 24);
  const prior12End = new Date();
  prior12End.setMonth(prior12End.getMonth() - 12);

  const trailing12Count = filterByDateRange(allTickets, trailing12Start, now).length;
  const prior12Count = filterByDateRange(allTickets, prior12Start, prior12End).length;
  const trailing12Change = prior12Count
    ? (((trailing12Count - prior12Count) / prior12Count) * 100).toFixed(0)
    : 0;

  // Last complete quarter vs same quarter prior year
  const lastCompleteQNum = currentQNum === 1 ? 4 : currentQNum - 1;
  const lastCompleteQYear = currentQNum === 1 ? currentQYear - 1 : currentQYear;
  const { start: lcqStart, end: lcqEnd } = getQuarterRange(lastCompleteQYear, lastCompleteQNum);
  const { start: lcqPriorStart, end: lcqPriorEnd } = getQuarterRange(lastCompleteQYear - 1, lastCompleteQNum);

  const lastCompleteQCount = filterByDateRange(allTickets, lcqStart, lcqEnd).length;
  const lastCompleteQPriorCount = filterByDateRange(allTickets, lcqPriorStart, lcqPriorEnd).length;
  const lastCompleteQChange = lastCompleteQPriorCount
    ? (((lastCompleteQCount - lastCompleteQPriorCount) / lastCompleteQPriorCount) * 100).toFixed(0)
    : 0;

  return {
    // YTD
    ytd: {
      current: ytdCurrent, prior: ytdPrior, change: parseInt(ytdChange),
      currentLabel: `${ytdStartLabel} – ${ytdEndLabel}`,
      priorLabel: `${priorYtdStartLabel} – ${priorYtdEndLabel}`
    },
    // Current partial quarter
    currentQuarter: {
      current: currentQCount, prior: priorQCount, change: parseInt(currentQChange),
      currentLabel: currentQLabel, priorLabel: priorQLabel
    },
    // Chart data
    quarterlyTrend,
    selectedQLabel,
    selectedQTickets,
    // Tech data
    openByTechList,
    closedByTechList,
    avgOpenAge: parseFloat(avgOpenAge),
    avgResolutionDays: parseFloat(avgResolutionDays),
    // SLA
    slaBreachRate,
    slaEligibleCount: slaEligible.length,
    // Issue types
    byIssueType,
    // Staffing
    staffing: {
      trailing12: {
        current: trailing12Count, prior: prior12Count, change: parseInt(trailing12Change),
        currentLabel: `${trailing12Start.toLocaleString('default', { month: 'short' })} '${String(trailing12Start.getFullYear()).slice(2)} – Now`,
        priorLabel: `${prior12Start.toLocaleString('default', { month: 'short' })} '${String(prior12Start.getFullYear()).slice(2)} – ${prior12End.toLocaleString('default', { month: 'short' })} '${String(prior12End.getFullYear()).slice(2)}`
      },
      lastCompleteQuarter: {
        current: lastCompleteQCount, prior: lastCompleteQPriorCount, change: parseInt(lastCompleteQChange),
        currentLabel: `Q${lastCompleteQNum} ${lastCompleteQYear}`,
        priorLabel: `Q${lastCompleteQNum} ${lastCompleteQYear - 1}`
      }
    },
    resourceMap
  };
}