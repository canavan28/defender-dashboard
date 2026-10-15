import { useMemo } from 'react';

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

// ── Business hours calculator ─────────────────────────────────────────────────
// Mon-Fri 8am-5pm Eastern Time, federal holidays excluded
// Used for response time scoring — avoids penalizing techs for overnight/weekend wait

function _getETOffset(utcMs) {
  // Returns minutes ET is behind UTC (e.g. EDT=240, EST=300)
  const d = new Date(utcMs);
  const etHour = parseInt(d.toLocaleString('en-US', {
    timeZone: 'America/New_York', hour: '2-digit', hour12: false
  }));
  const utcHour = d.getUTCHours();
  let diff = utcHour - (etHour === 24 ? 0 : etHour);
  if (diff < 0) diff += 24;
  return diff * 60;
}

function _getFederalHolidays(year) {
  const h = new Set();
  function obs(y, m, d) {
    const dt = new Date(y, m - 1, d);
    const dow = dt.getDay();
    if (dow === 6) dt.setDate(d - 1);
    else if (dow === 0) dt.setDate(d + 1);
    h.add(`${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}`);
  }
  function nth(y, m, weekday, n) {
    let count = 0;
    for (let d = 1; d <= 31; d++) {
      const dt = new Date(y, m - 1, d);
      if (dt.getMonth() !== m - 1) break;
      if (dt.getDay() === weekday && ++count === n) return d;
    }
    return 1;
  }
  function lastMon(y, m) {
    let r = 1;
    for (let d = 1; d <= 31; d++) {
      const dt = new Date(y, m - 1, d);
      if (dt.getMonth() !== m - 1) break;
      if (dt.getDay() === 1) r = d;
    }
    return r;
  }
  obs(year, 1, 1); obs(year, 1, nth(year, 1, 1, 3)); obs(year, 2, nth(year, 2, 1, 3));
  obs(year, 5, lastMon(year, 5)); obs(year, 6, 19); obs(year, 7, 4);
  obs(year, 9, nth(year, 9, 1, 1)); obs(year, 10, nth(year, 10, 1, 2)); obs(year, 11, 11);
  const tg = nth(year, 11, 4, 4);
  h.add(`${year}-11-${tg}`); h.add(`${year}-11-${tg + 1}`);
  obs(year, 12, 25);
  return h;
}

const _bizHolCache = {};
function _isHoliday(y, m, d) {
  if (!_bizHolCache[y]) _bizHolCache[y] = _getFederalHolidays(y);
  return _bizHolCache[y].has(`${y}-${m}-${d}`);
}

function businessMinutesBetween(startMs, endMs) {
  if (endMs <= startMs) return 0;
  const cap = Math.min(endMs, startMs + 21 * 24 * 60 * 60 * 1000);

  let total = 0;
  const startDate = new Date(startMs);
  const etStartStr = startDate.toLocaleDateString('en-US', { timeZone: 'America/New_York' });
  const [sm, sd, sy] = etStartStr.split('/').map(Number);
  const curDate = new Date(sy, sm - 1, sd);

  for (let i = 0; i < 22; i++) {
    const y = curDate.getFullYear();
    const m = curDate.getMonth() + 1;
    const d = curDate.getDate();
    const dow = curDate.getDay();

    if (dow !== 0 && dow !== 6 && !_isHoliday(y, m, d)) {
      const refMs = new Date(y, m - 1, d, 12, 0, 0).getTime();
      const offsetMins = _getETOffset(refMs);
      const bizStartUTC = new Date(y, m - 1, d, 8,  0, 0).getTime() + offsetMins * 60 * 1000;
      const bizEndUTC   = new Date(y, m - 1, d, 17, 0, 0).getTime() + offsetMins * 60 * 1000;
      const overlapStart = Math.max(startMs, bizStartUTC);
      const overlapEnd   = Math.min(cap, bizEndUTC);
      if (overlapEnd > overlapStart) {
        total += (overlapEnd - overlapStart) / 60000;
      }
    }

    curDate.setDate(curDate.getDate() + 1);
    if (curDate.getTime() > cap) break;
  }

  return Math.round(total);
}

// ── Workday capacity (8h per workday) ────────────────────────────────────────
// Workdays = Mon–Fri minus InfoTank's actual days off (confirmed by Matt):
// the federal holidays EXCEPT Columbus Day and Veterans Day (InfoTank works
// both), PLUS the day after Thanksgiving (InfoTank is closed).
// Holidays that fall on a weekend use the observed weekday.
// Note: the business-hours calendar above (response-time scoring) still uses
// its original list, which treats Columbus Day and Veterans Day as days off.
const HOURS_PER_WORKDAY = 8;
const _companyHolCache = {};
function _companyHolidays(year) {
  if (_companyHolCache[year]) return _companyHolCache[year];
  // Starts from the business-hours list (federal holidays + day after Thanksgiving)
  const set = new Set(_getFederalHolidays(year));

  // Remove Columbus Day (2nd Monday of October)
  let mondays = 0;
  for (let d = 1; d <= 31; d++) {
    if (new Date(year, 9, d).getDay() === 1 && ++mondays === 2) {
      set.delete(`${year}-10-${d}`);
      break;
    }
  }

  // Remove Veterans Day (Nov 11, or its observed Friday/Monday)
  const vd = new Date(year, 10, 11);
  if (vd.getDay() === 6) vd.setDate(10);
  else if (vd.getDay() === 0) vd.setDate(12);
  set.delete(`${year}-11-${vd.getDate()}`);

  _companyHolCache[year] = set;
  return set;
}

function _isCompanyHoliday(dt) {
  const key = `${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}`;
  // A holiday's observed date can land in the neighbouring year
  // (e.g. Jan 1 on a Saturday is observed Dec 31), so check both sides.
  const y = dt.getFullYear();
  return _companyHolidays(y).has(key) ||
         _companyHolidays(y + 1).has(key) ||
         _companyHolidays(y - 1).has(key);
}

// Counts workdays from start to end, both dates included
export function countWorkdays(start, end) {
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  let n = 0;
  while (cur <= last) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6 && !_isCompanyHoliday(cur)) n++;
    cur.setDate(cur.getDate() + 1);
  }
  return n;
}

// ── Small helpers ─────────────────────────────────────────────────────────────
const round1 = (n) => parseFloat((n || 0).toFixed(1));

// Each time entry is 'ticket', 'project' (real project task) or 'internal'
// (Admin Time, Internal Meeting, Training, Research, Sales/Quoting, Drill).
// The backend labels this; the fallback covers an older payload.
const entryKind = (te) => {
  if (te.entryKind) return te.entryKind;
  if (te.ticketID) return 'ticket';
  if (te.taskID) return te.projectID != null ? 'project' : 'internal';
  return 'ticket';
};
const isProjectEntry = (te) => entryKind(te) === 'project';
const isInternalEntry = (te) => entryKind(te) === 'internal';

// Internal time (~26% of all hours) IS counted everywhere on Time Analytics:
// total hours, billable %, notes coverage, the issue view (its own "Internal
// Time" row), the company view (under InfoTank (Internal)) and the
// year-over-year comparison. Decided by Matt. Tech grading is unaffected —
// it uses ticket time only. Set to false to show internal time only in the
// engineer drill-down and leave it out of every total.
const INCLUDE_INTERNAL_IN_TOTALS = true;
const countsInTotals = (te) => INCLUDE_INTERNAL_IN_TOTALS || !isInternalEntry(te);

// Backend now sends a hasNotes flag instead of the note text. Falls back to
// the old fields in case an older payload is ever received.
const entryHasNotes = (te) => {
  if (te.hasNotes != null) return !!te.hasNotes;
  return !!((te.summaryNotes && te.summaryNotes.trim().length > 0) ||
            (te.internalNotes && te.internalNotes.trim().length > 0));
};

// ── The actual computation, wrapped in useMemo below ───────────────────────
// FIX: this entire calculation used to run on every single render of App.jsx
// (any re-render, even one unrelated to ticket data, reran the full
// business-hours loop, tech grading, and quarterly bucketing from scratch).
// With DevTools attached, the instrumentation overhead of that repeated
// heavy work compounds and shows up as near-100% CPU while the tab is
// open — this was reported as "dashboard eats all my RAM/CPU, only when
// DevTools is open" and is the leading suspect. Wrapping in useMemo means
// it only recomputes when rawData or selectedQuarterKey actually change.
function computeTicketMetrics(rawData, selectedQuarterKey) {
  if (!rawData) return null;

  const {
    allTickets, completedTickets, openTickets,
    timeEntries, resources, excludeResources,
    issueTypeMap, subIssueMap, companyMap,
    billingCodeMap, cacheInfo
  } = rawData;

  const now = new Date();

  // ── Resource map ────────────────────────────────────────────────────────────
  const resourceMap = {};
  (resources || [])
    .filter(r => r.licenseType !== 7 && !excludeResources.includes(r.id))
    .forEach(r => { resourceMap[r.id] = r.name; });

  // ── Ticket lookup map (id -> ticket) ────────────────────────────────────────
  const ticketMap = {};
  allTickets.forEach(t => { ticketMap[t.id] = t; });

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
  const priorYtdEnd = new Date(
    now.getFullYear() - 1, now.getMonth(),
    now.getDate(), 23, 59, 59
  );

  const ytdCurrent = filterByDateRange(allTickets, ytdStart, ytdEnd).length;
  const ytdPrior = filterByDateRange(allTickets, priorYtdStart, priorYtdEnd).length;
  const ytdChange = ytdPrior
    ? (((ytdCurrent - ytdPrior) / ytdPrior) * 100).toFixed(0)
    : 0;

  const ytdStartLabel = `Jan 1 '${String(now.getFullYear()).slice(2)}`;
  const ytdEndLabel = `${now.toLocaleString('default', { month: 'short' })} ${now.getDate()} '${String(now.getFullYear()).slice(2)}`;
  const priorYtdStartLabel = `Jan 1 '${String(now.getFullYear() - 1).slice(2)}`;
  const priorYtdEndLabel = `${priorYtdEnd.toLocaleString('default', { month: 'short' })} ${priorYtdEnd.getDate()} '${String(priorYtdEnd.getFullYear()).slice(2)}`;

  // ── Selected quarter metrics ───────────────────────────────────────────────
  let selectedQTickets = [];
  let selectedQCompleted = [];
  let selectedQTimeEntries = [];
  let selectedQLabel = '';
  let selectedQStart = null;
  let selectedQEnd = null;

  if (selectedQuarterKey) {
    const { year, quarter } = parseQuarterKey(selectedQuarterKey);
    const { start, end } = getQuarterRange(year, quarter);
    selectedQStart = start;
    selectedQEnd = end;
    selectedQLabel = `Q${quarter} ${year}`;
    selectedQTickets = filterByDateRange(allTickets, start, end);
    selectedQCompleted = filterByDateRange(completedTickets, start, end, 'completedDate');
    selectedQTimeEntries = (timeEntries || []).filter(t => {
      if (!t.dateWorked) return false;
      const d = new Date(t.dateWorked);
      return d >= start && d <= end;
    });
  }

  // ── Avg resolution time — uses selected quarter completed tickets ──────────
  const resolutionSource = selectedQCompleted.length > 0
    ? selectedQCompleted
    : completedTickets;
  const resolutionTimes = resolutionSource
    .filter(t => t.completedDate && t.createDate)
    .map(t => (new Date(t.completedDate) - new Date(t.createDate)) / (1000 * 60 * 60 * 24))
    .filter(d => d >= 0 && d < 365);
  const avgResolutionDays = resolutionTimes.length
    ? (resolutionTimes.reduce((s, d) => s + d, 0) / resolutionTimes.length).toFixed(1)
    : 0;

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
    .filter(t => t.assignedResourceID &&
      !excludeResources.includes(t.assignedResourceID) &&
      resourceMap[t.assignedResourceID])
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

  // ── SLA breach rate ───────────────────────────────────────────────────────
  const slaTickets = selectedQTickets.length > 0 ? selectedQTickets : allTickets;
  const slaEligible = slaTickets.filter(t => t.firstResponseDueDateTime);
  const slaBreach = slaEligible.filter(t => {
    if (!t.firstResponseDateTime) return true;
    return new Date(t.firstResponseDateTime) > new Date(t.firstResponseDueDateTime);
  });
  const slaBreachRate = slaEligible.length
    ? parseFloat(((slaBreach.length / slaEligible.length) * 100).toFixed(1))
    : 0;

  // ── Issue type breakdown (with sub-issue nested counts) ───────────────────
  const issueSource = selectedQTickets.length > 0 ? selectedQTickets : allTickets;
  const byIssueTypeRaw = {};
  issueSource.forEach(t => {
    if (t.issueType) {
      const label = issueTypeMap[String(t.issueType)] || `Type ${t.issueType}`;
      if (!byIssueTypeRaw[label]) byIssueTypeRaw[label] = { count: 0, subIssues: {} };
      byIssueTypeRaw[label].count += 1;

      const subKey = String(t.subIssueType || '');
      const subLabel = subIssueMap?.[subKey]?.label || null;
      if (subLabel) {
        byIssueTypeRaw[label].subIssues[subLabel] = (byIssueTypeRaw[label].subIssues[subLabel] || 0) + 1;
      }
    }
  });

  const byIssueType = {};
  Object.entries(byIssueTypeRaw).forEach(([label, data]) => {
    byIssueType[label] = data.count;
  });

  const byIssueTypeDetailed = Object.entries(byIssueTypeRaw)
    .map(([label, data]) => ({
      label,
      count: data.count,
      subIssues: Object.entries(data.subIssues)
        .map(([subLabel, count]) => ({ label: subLabel, count }))
        .sort((a, b) => b.count - a.count)
    }))
    .sort((a, b) => b.count - a.count);

  // ── Tickets by company (with issue type sub-rows) ─────────────────────────
  const byCompanyRaw = {};
  issueSource.forEach(t => {
    const company = (companyMap && companyMap[String(t.companyID)]) || 'Unknown';
    if (!byCompanyRaw[company]) byCompanyRaw[company] = { count: 0, issueTypes: {} };
    byCompanyRaw[company].count += 1;
    if (t.issueType) {
      const label = issueTypeMap[String(t.issueType)] || `Type ${t.issueType}`;
      byCompanyRaw[company].issueTypes[label] = (byCompanyRaw[company].issueTypes[label] || 0) + 1;
    }
  });

  const byCompanyList = Object.entries(byCompanyRaw)
    .map(([name, data]) => ({
      name,
      count: data.count,
      issueTypes: Object.entries(data.issueTypes)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count)
    }))
    .sort((a, b) => b.count - a.count);

  // ── Time entry analytics ──────────────────────────────────────────────────
  // Includes ticket time and project (task) time; internal time only where
  // noted (see INCLUDE_INTERNAL_IN_TOTALS). Non-ticket entries have no ticket,
  // so the HSCC Daily Onsite exclusion below never removes them.
  const EXCLUDE_ISSUE_TYPES_TIME = new Set(['27']);

  const filterTimeEntries = (entries) => entries.filter(te => {
    const ticket = ticketMap[te.ticketID];
    if (!ticket) return true;
    return !EXCLUDE_ISSUE_TYPES_TIME.has(String(ticket.issueType));
  });

  const workTypeLabel = (id) => {
    if (id == null || id === '') return 'No work type';
    return (billingCodeMap && billingCodeMap[String(id)]) || `Work type ${id}`;
  };

  const inRange = (te, start, end) => {
    if (!te.dateWorked) return false;
    const d = new Date(te.dateWorked);
    return d >= start && d <= end;
  };

  // FIX: previously, if the selected quarter had zero time entries (e.g. it
  // was older than the time entry window), this silently fell back to ALL
  // time entries while still labelling the result with the quarter's name.
  // Now a selected quarter always uses only its own entries — if it has none,
  // the tab shows zeros plus a coverage warning instead of misleading totals.
  const periodEntriesAll = filterTimeEntries(
    selectedQuarterKey ? selectedQTimeEntries : (timeEntries || [])
  );
  const teSource = periodEntriesAll.filter(countsInTotals);
  const totalInternalHours = round1(
    periodEntriesAll.filter(isInternalEntry).reduce((s, te) => s + (te.hoursWorked || 0), 0)
  );

  // ── Time data coverage ────────────────────────────────────────────────────
  // Earliest date time entries are complete from. Comes from the backend; if
  // missing (older payload), fall back to the earliest entry we actually have.
  let coverageStart = cacheInfo?.timeEntriesSince ? new Date(cacheInfo.timeEntriesSince) : null;
  if (!coverageStart && (timeEntries || []).length) {
    let minMs = Infinity;
    timeEntries.forEach(te => {
      if (!te.dateWorked) return;
      const ms = new Date(te.dateWorked).getTime();
      if (ms < minMs) minMs = ms;
    });
    if (minMs < Infinity) coverageStart = new Date(minMs);
  }

  let selectedQCoverage = 'full'; // 'full' | 'partial' | 'none'
  if (selectedQStart && coverageStart && selectedQStart < coverageStart) {
    selectedQCoverage = selectedQEnd < coverageStart ? 'none' : 'partial';
  }

  // ── Same quarter, prior year ──────────────────────────────────────────────
  // For a completed quarter: the full same quarter last year.
  // For the current, in-progress quarter: last year's quarter only up to
  // today's date last year, so it's a fair quarter-to-date comparison.
  // Only shown when time data fully covers last year's quarter — a partial
  // prior-year number would make every change look artificially large.
  let priorYear = null;
  const isCurrentQuarter = selectedQuarterKey === getQuarterKey(now);

  if (selectedQuarterKey) {
    const { year, quarter } = parseQuarterKey(selectedQuarterKey);
    const { start: pStart, end: pFullEnd } = getQuarterRange(year - 1, quarter);
    let pEnd = pFullEnd;
    let label = `Q${quarter} ${year - 1}`;
    if (isCurrentQuarter) {
      const sameDayLastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 23, 59, 59);
      if (sameDayLastYear < pEnd) {
        pEnd = sameDayLastYear;
        label += ` through ${sameDayLastYear.toLocaleString('en-US', { month: 'short' })} ${sameDayLastYear.getDate()}`;
      }
    }

    const available = !coverageStart || pStart >= coverageStart;

    if (available) {
      const priorEntries = filterTimeEntries((timeEntries || []).filter(te => inRange(te, pStart, pEnd)))
        .filter(countsInTotals);
      let total = 0, bill = 0, non = 0;
      const byTech = {};
      priorEntries.forEach(te => {
        const h = te.hoursWorked || 0;
        total += h;
        if (te.isNonBillable) non += h; else bill += h;
        const name = resourceMap[te.resourceID];
        if (!name) return;
        if (!byTech[name]) byTech[name] = { hours: 0, billable: 0, nonBillable: 0 };
        byTech[name].hours += h;
        if (te.isNonBillable) byTech[name].nonBillable += h;
        else byTech[name].billable += h;
      });
      Object.values(byTech).forEach(t => {
        t.hours = round1(t.hours);
        t.billable = round1(t.billable);
        t.nonBillable = round1(t.nonBillable);
      });
      priorYear = {
        available: true,
        label,
        totalHours: round1(total),
        totalBillableHours: round1(bill),
        totalNonBillableHours: round1(non),
        byTech
      };
    } else {
      priorYear = { available: false, label, byTech: {} };
    }
  }

  // ── Capacity marker: 8h × workdays in the selected quarter ───────────────
  // For the current, in-progress quarter it counts workdays through today,
  // so the marker shows where a full-time engineer should be by now.
  let capacity = null;
  if (selectedQStart && selectedQEnd) {
    const through = isCurrentQuarter && now < selectedQEnd ? now : selectedQEnd;
    const workdays = countWorkdays(selectedQStart, through);
    capacity = {
      workdays,
      hours: workdays * HOURS_PER_WORKDAY,
      hoursPerDay: HOURS_PER_WORKDAY,
      isQTD: isCurrentQuarter && now < selectedQEnd,
      throughLabel: `${through.toLocaleString('en-US', { month: 'short' })} ${through.getDate()}`
    };
  }

  // Hours by tech. The bar/hours/billable % use counted time only; the
  // drill-down (workTypes) shows ALL of the engineer's time, internal included.
  const hoursByTech = {};
  const billableHoursByTech = {};
  const nonBillableHoursByTech = {};
  const projectHoursByTech = {};
  const internalHoursByTech = {};
  const entryCountByTech = {};
  const workTypesByTech = {};

  periodEntriesAll.forEach(te => {
    if (!resourceMap[te.resourceID]) return;
    const name = resourceMap[te.resourceID];
    const hours = te.hoursWorked || 0;
    const internal = isInternalEntry(te);

    if (internal) {
      internalHoursByTech[name] = (internalHoursByTech[name] || 0) + hours;
    }

    const wt = workTypeLabel(te.billingCodeID);
    if (!workTypesByTech[name]) workTypesByTech[name] = {};
    if (!workTypesByTech[name][wt]) {
      workTypesByTech[name][wt] = { hours: 0, billable: 0, nonBillable: 0, internalHours: 0 };
    }
    const w = workTypesByTech[name][wt];
    w.hours += hours;
    if (te.isNonBillable) w.nonBillable += hours; else w.billable += hours;
    if (internal) w.internalHours += hours;

    if (!countsInTotals(te)) return;

    hoursByTech[name] = (hoursByTech[name] || 0) + hours;
    entryCountByTech[name] = (entryCountByTech[name] || 0) + 1;
    if (te.isNonBillable) {
      nonBillableHoursByTech[name] = (nonBillableHoursByTech[name] || 0) + hours;
    } else {
      billableHoursByTech[name] = (billableHoursByTech[name] || 0) + hours;
    }
    if (isProjectEntry(te)) {
      projectHoursByTech[name] = (projectHoursByTech[name] || 0) + hours;
    }
  });

  const techNames = new Set([...Object.keys(hoursByTech), ...Object.keys(internalHoursByTech)]);

  const hoursByTechList = [...techNames]
    .map(name => {
      const hours = hoursByTech[name] || 0;
      const projectHours = projectHoursByTech[name] || 0;
      const internalHours = internalHoursByTech[name] || 0;
      const countedInternal = INCLUDE_INTERNAL_IN_TOTALS ? internalHours : 0;
      const workTypes = Object.entries(workTypesByTech[name] || {})
        .map(([label, d]) => ({
          label,
          hours: round1(d.hours),
          billable: round1(d.billable),
          nonBillable: round1(d.nonBillable),
          // true when this work type is internal time (all or mostly)
          internal: d.internalHours > d.hours / 2
        }))
        .sort((a, b) => b.hours - a.hours);
      return {
        name,
        hours: round1(hours),
        billable: round1(billableHoursByTech[name] || 0),
        nonBillable: round1(nonBillableHoursByTech[name] || 0),
        projectHours: round1(projectHours),
        ticketHours: round1(hours - projectHours - countedInternal),
        internalHours: round1(internalHours),
        allHours: round1(hours + (INCLUDE_INTERNAL_IN_TOTALS ? 0 : internalHours)),
        entries: entryCountByTech[name] || 0,
        billablePct: hours > 0
          ? Math.round(((billableHoursByTech[name] || 0) / hours) * 100)
          : 0,
        // null = no prior-year comparison possible; 0 = had no hours last year
        priorHours: priorYear?.available ? (priorYear.byTech[name]?.hours ?? 0) : null,
        workTypes
      };
    })
    .sort((a, b) => b.hours - a.hours);

  const totalHours = round1(teSource.reduce((s, te) => s + (te.hoursWorked || 0), 0));
  const totalBillableHours = round1(
    teSource.filter(te => !te.isNonBillable).reduce((s, te) => s + (te.hoursWorked || 0), 0)
  );
  const totalNonBillableHours = round1(
    teSource.filter(te => te.isNonBillable).reduce((s, te) => s + (te.hoursWorked || 0), 0)
  );
  const totalProjectHours = round1(
    teSource.filter(isProjectEntry).reduce((s, te) => s + (te.hoursWorked || 0), 0)
  );
  const overallBillablePct = totalHours > 0
    ? Math.round((totalBillableHours / totalHours) * 100)
    : 0;

  const entriesWithNotes = teSource.filter(entryHasNotes).length;
  const notesCoverage = teSource.length > 0
    ? Math.round((entriesWithNotes / teSource.length) * 100)
    : 0;

  // Hours by issue type — project time gets its own "Project Work" row with
  // one sub-row per project, so this list adds up to the total hours.
  const PROJECT_LABEL = 'Project Work';
  const hoursByIssue = {};
  teSource.forEach(te => {
    const hours = te.hoursWorked || 0;
    let issueLabel, subIssueLabel;

    if (isInternalEntry(te)) {
      issueLabel = 'Internal Time';
      subIssueLabel = workTypeLabel(te.billingCodeID);
    } else if (isProjectEntry(te)) {
      issueLabel = PROJECT_LABEL;
      subIssueLabel = te.projectName || 'Unknown project';
    } else {
      const ticket = ticketMap[te.ticketID];
      if (!ticket) return;
      const issueKey = String(ticket.issueType || '');
      const subIssueKey = String(ticket.subIssueType || '');
      issueLabel = issueTypeMap[issueKey] || 'Uncategorized';
      subIssueLabel = subIssueMap[subIssueKey]?.label || null;
    }

    if (!hoursByIssue[issueLabel]) {
      hoursByIssue[issueLabel] = { hours: 0, subIssues: {} };
    }
    hoursByIssue[issueLabel].hours += hours;

    if (subIssueLabel) {
      if (!hoursByIssue[issueLabel].subIssues[subIssueLabel]) {
        hoursByIssue[issueLabel].subIssues[subIssueLabel] = 0;
      }
      hoursByIssue[issueLabel].subIssues[subIssueLabel] += hours;
    }
  });

  const hoursByIssueList = Object.entries(hoursByIssue)
    .map(([label, data]) => ({
      label,
      hours: round1(data.hours),
      subIssues: Object.entries(data.subIssues)
        .map(([subLabel, hours]) => ({
          label: subLabel,
          hours: round1(hours)
        }))
        .sort((a, b) => b.hours - a.hours)
    }))
    .sort((a, b) => b.hours - a.hours);

  const hoursByCompanyRaw = {};
  teSource.forEach(te => {
    const hours = te.hoursWorked || 0;
    let company, subLabel = null;

    if (isInternalEntry(te)) {
      company = (companyMap && companyMap['0']) || 'InfoTank (Internal)';
      subLabel = 'Internal Time';
    } else if (isProjectEntry(te)) {
      company = (companyMap && te.projectCompanyID != null && companyMap[String(te.projectCompanyID)]) || 'Unknown';
      subLabel = PROJECT_LABEL;
    } else {
      const ticket = ticketMap[te.ticketID];
      company = (companyMap && ticket && companyMap[String(ticket.companyID)]) || 'Unknown';
      if (ticket?.issueType) {
        subLabel = issueTypeMap[String(ticket.issueType)] || `Type ${ticket.issueType}`;
      }
    }

    if (!hoursByCompanyRaw[company]) hoursByCompanyRaw[company] = { hours: 0, issueTypes: {} };
    hoursByCompanyRaw[company].hours += hours;
    if (subLabel) {
      hoursByCompanyRaw[company].issueTypes[subLabel] =
        (hoursByCompanyRaw[company].issueTypes[subLabel] || 0) + hours;
    }
  });

  const hoursByCompanyList = Object.entries(hoursByCompanyRaw)
    .map(([name, data]) => ({
      name,
      hours: round1(data.hours),
      issueTypes: Object.entries(data.issueTypes)
        .map(([label, hours]) => ({ label, hours: round1(hours) }))
        .sort((a, b) => b.hours - a.hours)
    }))
    .sort((a, b) => b.hours - a.hours);

  // ── Staffing signals ──────────────────────────────────────────────────────
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

  const currentQNum = Math.floor(now.getMonth() / 3) + 1;
  const currentQYear = now.getFullYear();
  const lastCompleteQNum = currentQNum === 1 ? 4 : currentQNum - 1;
  const lastCompleteQYear = currentQNum === 1 ? currentQYear - 1 : currentQYear;
  const { start: lcqStart, end: lcqEnd } = getQuarterRange(lastCompleteQYear, lastCompleteQNum);
  const { start: lcqPriorStart, end: lcqPriorEnd } = getQuarterRange(
    lastCompleteQYear - 1, lastCompleteQNum
  );

  const lastCompleteQCount = filterByDateRange(allTickets, lcqStart, lcqEnd).length;
  const lastCompleteQPriorCount = filterByDateRange(
    allTickets, lcqPriorStart, lcqPriorEnd
  ).length;
  const lastCompleteQChange = lastCompleteQPriorCount
    ? (((lastCompleteQCount - lastCompleteQPriorCount) / lastCompleteQPriorCount) * 100).toFixed(0)
    : 0;

  // ── Tech Grading ──────────────────────────────────────────────────────────
  // Tier 1 weights: SLA=20, Response=20, Resolution=20, Escalation=15, Notes=15, FCR=10
  // Tier 2/3 weights: SLA=22, Response=22, Resolution=22, Escalation=17, Notes=17, FCR=N/A
  // (T2/T3 are escalation points — FCR is not meaningful for them)
  //
  // Response time: uses earliest time entry dateWorked per ticket, NOT firstResponseDateTime
  // (firstResponseDateTime is unreliable in AutoTask — set on close, not on first touch)
  //
  // SLA: scored as a breach percentage (slaBreaches/slaEligible*100)
  // Perfect = ≤1%, score = 0 at 2%, linear between

  const MIN_TICKETS = 30;
  const OUTLIER_THRESHOLD = 1.25;

  // Tier 2/3 tech IDs — FCR excluded for these
  // 29682899 = Chris McDaniel (former T3, kept so his historical tickets still grade correctly)
  // 29682944 = Robert Adams (T3, took over Chris McDaniel's role)
  const TIER2_3_IDS = new Set([29682910, 29682889, 29682904, 29682899, 29682944]);

  const gradeTicketSource = selectedQTickets.length > 0 ? selectedQTickets : allTickets;
  // Grading is about ticket work only — project and internal time are
  // excluded so adding them to the Time Analytics tab doesn't change grades.
  const gradeTeSource = filterTimeEntries(
    selectedQuarterKey ? selectedQTimeEntries : (timeEntries || [])
  ).filter(te => entryKind(te) === 'ticket');

  const gradeTechIds = Object.keys(resourceMap).map(Number);

  const TECH_TIERS_LOCAL = {
    29682924: 1, 29682927: 1,
    29682910: 2, 29682889: 2,
    29682904: 3, 29682899: 3,
    29682944: 3
  };

  // Build ticket -> total hours logged map from time entries
  const ticketHoursMap = {};
  gradeTeSource.forEach(te => {
    if (!te.ticketID) return;
    ticketHoursMap[te.ticketID] = (ticketHoursMap[te.ticketID] || 0) + (te.hoursWorked || 0);
  });

  // Build per-tech raw data
  const techRaw = {};
  gradeTechIds.forEach(id => {
    techRaw[id] = {
      name: resourceMap[id], id,
      assignedTickets: [],
      responseTimes: [],        // hours from createDate to first time entry
      slaBreaches: 0,
      slaEligible: 0,
      escalatedCount: 0,
      timeEntries: [],
      hoursPerCompletedTicket: [],
      oneTouchCount: 0,
      oneTouchEligible: 0,
      byIssueType: {}
    };
  });

  const EXCLUDE_RESPONSE_COMPANIES = new Set([0, 344]);
  const EXCLUDE_RESPONSE_QUEUES = new Set([29683479, 29683378, 29683480]);

  gradeTicketSource.forEach(t => {
    const id = t.assignedResourceID;
    if (!id || !techRaw[id]) return;
    const tech = techRaw[id];
    tech.assignedTickets.push(t);

    const issueLabel = issueTypeMap[String(t.issueType)] || null;

    // Response time — uses firstResponseDateTime (reliable in AutoTask)
    // Business minutes only: Mon-Fri 8am-5pm ET, excluding federal holidays
    // This removes overnight/weekend wait from the calculation
    if (t.createDate && t.firstResponseDateTime
      && t.priority !== 4
      && !EXCLUDE_RESPONSE_COMPANIES.has(t.companyID)
      && !EXCLUDE_RESPONSE_QUEUES.has(t.queueID)) {
      const bizMins = businessMinutesBetween(
        new Date(t.createDate).getTime(),
        new Date(t.firstResponseDateTime).getTime()
      );
      // Only include if response happened within 15 business days (filters out abandoned tickets)
      if (bizMins >= 0 && bizMins <= 15 * 9 * 60) {
        const bizHrs = bizMins / 60;
        tech.responseTimes.push(bizHrs);
        if (issueLabel) {
          if (!tech.byIssueType[issueLabel]) tech.byIssueType[issueLabel] = { responseTimes: [], hoursLogged: [], escalations: 0, tickets: 0 };
          tech.byIssueType[issueLabel].responseTimes.push(bizHrs);
          tech.byIssueType[issueLabel].tickets++;
        }
      }
    }

    // SLA breach (still uses firstResponseDueDateTime vs firstResponseDateTime for SLA contract compliance)
    if (t.firstResponseDueDateTime) {
      tech.slaEligible++;
      if (!t.firstResponseDateTime || new Date(t.firstResponseDateTime) > new Date(t.firstResponseDueDateTime)) {
        tech.slaBreaches++;
      }
    }

    // Resolution hours
    if (t.completedDate && ticketHoursMap[t.id] != null) {
      const hrs = ticketHoursMap[t.id];
      tech.hoursPerCompletedTicket.push(hrs);
      if (issueLabel) {
        if (!tech.byIssueType[issueLabel]) tech.byIssueType[issueLabel] = { responseTimes: [], hoursLogged: [], escalations: 0, tickets: 0 };
        tech.byIssueType[issueLabel].hoursLogged.push(hrs);
      }
    }

    // Escalation
    const assignedTier = TECH_TIERS_LOCAL[id] || null;
    const completedById = t.completedByResourceID;
    if (completedById && completedById !== id && TECH_TIERS_LOCAL[completedById]) {
      if (assignedTier && TECH_TIERS_LOCAL[completedById] > assignedTier) {
        tech.escalatedCount++;
        if (issueLabel && tech.byIssueType[issueLabel]) {
          tech.byIssueType[issueLabel].escalations++;
        }
      }
    }

    // FCR
    const oneTouchField = t.userDefinedFields?.find(f => f.name === 'Is One Touch Close');
    if (oneTouchField) {
      tech.oneTouchEligible++;
      if (oneTouchField.value === 'Yes') tech.oneTouchCount++;
    }
  });

  gradeTeSource.forEach(te => {
    const id = te.resourceID;
    if (!id || !techRaw[id]) return;
    techRaw[id].timeEntries.push(te);
  });

  // Notes quality: use AI review doc flags if available
  const reviewedMeta = rawData.reviewedMeta || {};

  // Team-wide averages
  const allResponseTimes = Object.values(techRaw).flatMap(t => t.responseTimes);
  const allHoursPerTicket = Object.values(techRaw).flatMap(t => t.hoursPerCompletedTicket);
  const teamAvgResponseHrs = allResponseTimes.length
    ? allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length : null;
  const teamAvgHoursPerTicket = allHoursPerTicket.length
    ? allHoursPerTicket.reduce((a, b) => a + b, 0) / allHoursPerTicket.length : null;

  // Issue type team averages
  const issueTypeTeamAvg = {};
  const allIssueTypes = new Set(Object.values(techRaw).flatMap(t => Object.keys(t.byIssueType)));
  allIssueTypes.forEach(issue => {
    const allRT = Object.values(techRaw).flatMap(t => t.byIssueType[issue]?.responseTimes || []);
    const allHL = Object.values(techRaw).flatMap(t => t.byIssueType[issue]?.hoursLogged || []);
    const allEsc = Object.values(techRaw).reduce((s, t) => s + (t.byIssueType[issue]?.escalations || 0), 0);
    const allTix = Object.values(techRaw).reduce((s, t) => s + (t.byIssueType[issue]?.tickets || 0), 0);
    issueTypeTeamAvg[issue] = {
      avgResponseHrs: allRT.length ? allRT.reduce((a, b) => a + b, 0) / allRT.length : null,
      avgHoursLogged: allHL.length ? allHL.reduce((a, b) => a + b, 0) / allHL.length : null,
      escalationRate: allTix > 0 ? allEsc / allTix : null
    };
  });

  // Score each tech
  const techGrades = gradeTechIds.map(id => {
    const t = techRaw[id];
    if (t.assignedTickets.length < MIN_TICKETS) return null;

    const isTier2or3 = TIER2_3_IDS.has(id);

    // Weights depend on tier
    const W = isTier2or3
      ? { sla: 22, response: 22, resolution: 22, escalation: 17, notes: 17, fcr: 0 }
      : { sla: 20, response: 20, resolution: 20, escalation: 15, notes: 15, fcr: 10 };

    // 1. SLA Breach Rate — scored as percentage
    // Perfect = ≤1% breach rate, score = 0 at ≥2%, linear between
    const slaBreachPct = t.slaEligible > 0 ? (t.slaBreaches / t.slaEligible) * 100 : 0;
    const PERFECT_SLA = 1.0;  // 1%
    const FAIL_SLA = 2.0;     // 2%
    const slaScore = t.slaEligible > 0
      ? Math.max(0, Math.min(W.sla, W.sla * (1 - (slaBreachPct - PERFECT_SLA) / (FAIL_SLA - PERFECT_SLA))))
      : W.sla; // no SLA tickets = not penalized

    // 2. Response Time — uses earliest time entry per ticket
    // ≤30min = perfect, 0 at 2hrs, linear
    let responseScore = 0, avgResponseHrs = null;
    if (t.responseTimes.length >= 5) {
      avgResponseHrs = t.responseTimes.reduce((a, b) => a + b, 0) / t.responseTimes.length;
      const avgMins = avgResponseHrs * 60;
      const PERFECT_MINS = 30;
      const FAIL_MINS = 120;
      responseScore = Math.max(0, Math.min(W.response,
        W.response * (1 - (avgMins - PERFECT_MINS) / (FAIL_MINS - PERFECT_MINS))
      ));
    }

    // 3. Resolution Time — avg hours logged on completed tickets
    let resolutionScore = 0, avgHoursPerTicket = null;
    if (t.hoursPerCompletedTicket.length >= 5) {
      avgHoursPerTicket = t.hoursPerCompletedTicket.reduce((a, b) => a + b, 0) / t.hoursPerCompletedTicket.length;
      const PERFECT_RESOLUTION = 0.5; // 30 min
      const STEP = 0.0833;            // 5 min
      const stepsOver = Math.max(0, (avgHoursPerTicket - PERFECT_RESOLUTION) / STEP);
      resolutionScore = Math.max(0, W.resolution * (1 - stepsOver * 0.1));
    }

    // 4. Escalation
    const escalationsOver = Math.max(0, t.escalatedCount - 5);
    const escalationScore = Math.max(0, W.escalation * (1 - escalationsOver * 0.05));

    // 5. Notes Quality — AI doc flags if available, else time entry coverage fallback
    let notesScore = 0, notesPct = 0, notesMethod = 'entries';
    if (Object.keys(reviewedMeta).length > 0) {
      const reviewed = t.assignedTickets.filter(ticket => reviewedMeta[ticket.ticketNumber]);
      const docFlagged = reviewed.filter(ticket =>
        reviewedMeta[ticket.ticketNumber]?.flagType === 'documentation'
      ).length;
      if (reviewed.length > 0) {
        notesPct = (reviewed.length - docFlagged) / reviewed.length;
        notesMethod = 'ai';
      }
    }
    if (notesMethod === 'entries') {
      const entriesWithNotesTech = t.timeEntries.filter(entryHasNotes).length;
      notesPct = t.timeEntries.length > 0 ? entriesWithNotesTech / t.timeEntries.length : 0;
    }
    notesScore = W.notes * notesPct;

    // 6. FCR — T2/T3 skipped entirely
    let fcrScore = 0, fcrRate = null;
    if (!isTier2or3 && t.oneTouchEligible >= 10) {
      fcrRate = t.oneTouchCount / t.oneTouchEligible;
      const PERFECT_FCR = 0.9;
      const stepsUnder = Math.max(0, (PERFECT_FCR - fcrRate) / 0.05);
      fcrScore = Math.max(0, W.fcr * (1 - stepsUnder * 0.1));
    }

    const totalScore = Math.min(100, Math.round(
      slaScore + responseScore + resolutionScore + escalationScore + notesScore + fcrScore
    ));

    // Issue type outliers
    const issueOutliers = [];
    Object.entries(t.byIssueType).forEach(([issue, data]) => {
      const teamAvg = issueTypeTeamAvg[issue];
      if (!teamAvg) return;
      const outlier = { issue, flags: [] };

      if (data.responseTimes.length >= 3 && teamAvg.avgResponseHrs) {
        const techAvgRT = data.responseTimes.reduce((a, b) => a + b, 0) / data.responseTimes.length;
        if (techAvgRT > teamAvg.avgResponseHrs * OUTLIER_THRESHOLD) {
          outlier.flags.push({
            type: 'response',
            techAvg: parseFloat(techAvgRT.toFixed(2)),
            teamAvg: parseFloat(teamAvg.avgResponseHrs.toFixed(2)),
            ratio: parseFloat((techAvgRT / teamAvg.avgResponseHrs).toFixed(2))
          });
        }
      }

      if (data.hoursLogged.length >= 3 && teamAvg.avgHoursLogged) {
        const techAvgHL = data.hoursLogged.reduce((a, b) => a + b, 0) / data.hoursLogged.length;
        if (techAvgHL > teamAvg.avgHoursLogged * OUTLIER_THRESHOLD) {
          outlier.flags.push({
            type: 'resolution',
            techAvg: parseFloat(techAvgHL.toFixed(2)),
            teamAvg: parseFloat(teamAvg.avgHoursLogged.toFixed(2)),
            ratio: parseFloat((techAvgHL / teamAvg.avgHoursLogged).toFixed(2))
          });
        }
      }

      if (data.tickets >= 5 && teamAvg.escalationRate != null) {
        const techEscRate = data.escalations / data.tickets;
        if (techEscRate > teamAvg.escalationRate * OUTLIER_THRESHOLD && techEscRate > 0.05) {
          outlier.flags.push({
            type: 'escalation',
            techRate: Math.round(techEscRate * 100),
            teamRate: Math.round(teamAvg.escalationRate * 100),
            ratio: parseFloat((techEscRate / Math.max(teamAvg.escalationRate, 0.01)).toFixed(2))
          });
        }
      }

      if (outlier.flags.length > 0) issueOutliers.push(outlier);
    });

    issueOutliers.sort((a, b) => b.flags.length - a.flags.length);

    return {
      id, name: t.name, score: totalScore,
      ticketCount: t.assignedTickets.length,
      isTier2or3,
      metrics: {
        sla: {
          score: Math.round(slaScore), maxScore: W.sla,
          breaches: t.slaBreaches,
          eligible: t.slaEligible,
          breachPct: parseFloat(slaBreachPct.toFixed(2))
        },
        responseTime: {
          score: Math.round(responseScore), maxScore: W.response,
          avgHrs: avgResponseHrs != null ? parseFloat(avgResponseHrs.toFixed(2)) : null,
          avgMins: avgResponseHrs != null ? Math.round(avgResponseHrs * 60) : null,
          teamAvgMins: teamAvgResponseHrs != null ? Math.round(teamAvgResponseHrs * 60) : null,
          sampleSize: t.responseTimes.length
        },
        resolutionTime: {
          score: Math.round(resolutionScore), maxScore: W.resolution,
          avgHrs: avgHoursPerTicket != null ? parseFloat(avgHoursPerTicket.toFixed(2)) : null,
          avgMins: avgHoursPerTicket != null ? Math.round(avgHoursPerTicket * 60) : null,
          teamAvgMins: teamAvgHoursPerTicket != null ? Math.round(teamAvgHoursPerTicket * 60) : null,
          completedTickets: t.hoursPerCompletedTicket.length
        },
        escalation: {
          score: Math.round(escalationScore), maxScore: W.escalation,
          count: t.escalatedCount,
          totalTickets: t.assignedTickets.length
        },
        notes: {
          score: Math.round(notesScore), maxScore: W.notes,
          pct: Math.round(notesPct * 100),
          method: notesMethod
        },
        fcr: {
          score: Math.round(fcrScore), maxScore: W.fcr,
          rate: fcrRate != null ? Math.round(fcrRate * 100) : null,
          oneTouchCount: t.oneTouchCount,
          eligible: t.oneTouchEligible,
          notApplicable: isTier2or3
        }
      },
      issueOutliers
    };
  }).filter(Boolean).sort((a, b) => b.score - a.score);

  return {
    ytd: {
      current: ytdCurrent, prior: ytdPrior, change: parseInt(ytdChange),
      currentLabel: `${ytdStartLabel} – ${ytdEndLabel}`,
      priorLabel: `${priorYtdStartLabel} – ${priorYtdEndLabel}`
    },
    quarterlyTrend,
    selectedQLabel,
    selectedQTickets,
    selectedQTimeEntries,
    openByTechList,
    closedByTechList,
    avgOpenAge: parseFloat(avgOpenAge),
    avgResolutionDays: parseFloat(avgResolutionDays),
    slaBreachRate,
    slaEligibleCount: slaEligible.length,
    byIssueType,
    byIssueTypeDetailed,
    byCompanyList,
    timeAnalytics: {
      totalHours,
      totalBillableHours,
      totalNonBillableHours,
      totalProjectHours,
      totalInternalHours,
      internalCountedInTotals: INCLUDE_INTERNAL_IN_TOTALS,
      capacity,
      overallBillablePct,
      notesCoverage,
      hoursByTechList,
      hoursByIssueList,
      hoursByCompanyList,
      entryCount: teSource.length,
      priorYear,
      isCurrentQuarter,
      selectedQCoverage,
      coverageStart: coverageStart ? coverageStart.toISOString() : null,
      projectTimeError: cacheInfo?.projectTimeError || null
    },
    staffing: {
      trailing12: {
        current: trailing12Count,
        prior: prior12Count,
        change: parseInt(trailing12Change),
        currentLabel: `${trailing12Start.toLocaleString('default', { month: 'short' })} '${String(trailing12Start.getFullYear()).slice(2)} – Now`,
        priorLabel: `${prior12Start.toLocaleString('default', { month: 'short' })} '${String(prior12Start.getFullYear()).slice(2)} – ${prior12End.toLocaleString('default', { month: 'short' })} '${String(prior12End.getFullYear()).slice(2)}`
      },
      lastCompleteQuarter: {
        current: lastCompleteQCount,
        prior: lastCompleteQPriorCount,
        change: parseInt(lastCompleteQChange),
        currentLabel: `Q${lastCompleteQNum} ${lastCompleteQYear}`,
        priorLabel: `Q${lastCompleteQNum} ${lastCompleteQYear - 1}`
      }
    },
    resourceMap,
    issueTypeMap: rawData.issueTypeMap,
    subIssueMap: rawData.subIssueMap,
    techGrades
  };
}

export function useTicketMetrics(rawData, selectedQuarterKey) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(
    () => computeTicketMetrics(rawData, selectedQuarterKey),
    [rawData, selectedQuarterKey]
  );
}