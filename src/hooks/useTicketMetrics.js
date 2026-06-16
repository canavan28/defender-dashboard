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
    timeEntries, resources, excludeResources,
    issueTypeMap, subIssueMap, companyMap
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

  if (selectedQuarterKey) {
    const { year, quarter } = parseQuarterKey(selectedQuarterKey);
    const { start, end } = getQuarterRange(year, quarter);
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

  // Flat count map (kept for backward compatibility with tech grading etc.)
  const byIssueType = {};
  Object.entries(byIssueTypeRaw).forEach(([label, data]) => {
    byIssueType[label] = data.count;
  });

  // Nested structure for UI drill-down (issue type -> sub-issues with counts)
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
  const EXCLUDE_ISSUE_TYPES_TIME = new Set(['27']);

  const filterTimeEntries = (entries) => entries.filter(te => {
    const ticket = ticketMap[te.ticketID];
    if (!ticket) return true;
    return !EXCLUDE_ISSUE_TYPES_TIME.has(String(ticket.issueType));
  });

  const teSource = filterTimeEntries(
    selectedQTimeEntries.length > 0
      ? selectedQTimeEntries
      : (timeEntries || [])
  );

  // Hours by tech
  const hoursByTech = {};
  const billableHoursByTech = {};
  const nonBillableHoursByTech = {};
  const entryCountByTech = {};

  teSource.forEach(te => {
    if (!resourceMap[te.resourceID]) return;
    const name = resourceMap[te.resourceID];
    const hours = te.hoursWorked || 0;
    hoursByTech[name] = (hoursByTech[name] || 0) + hours;
    entryCountByTech[name] = (entryCountByTech[name] || 0) + 1;
    if (te.isNonBillable) {
      nonBillableHoursByTech[name] = (nonBillableHoursByTech[name] || 0) + hours;
    } else {
      billableHoursByTech[name] = (billableHoursByTech[name] || 0) + hours;
    }
  });

  const hoursByTechList = Object.entries(hoursByTech)
    .map(([name, hours]) => ({
      name,
      hours: parseFloat(hours.toFixed(1)),
      billable: parseFloat((billableHoursByTech[name] || 0).toFixed(1)),
      nonBillable: parseFloat((nonBillableHoursByTech[name] || 0).toFixed(1)),
      entries: entryCountByTech[name] || 0,
      billablePct: hours > 0
        ? Math.round(((billableHoursByTech[name] || 0) / hours) * 100)
        : 0
    }))
    .sort((a, b) => b.hours - a.hours);

  // Total hours
  const totalHours = parseFloat(
    teSource.reduce((s, te) => s + (te.hoursWorked || 0), 0).toFixed(1)
  );
  const totalBillableHours = parseFloat(
    teSource.filter(te => !te.isNonBillable)
      .reduce((s, te) => s + (te.hoursWorked || 0), 0).toFixed(1)
  );
  const totalNonBillableHours = parseFloat(
    teSource.filter(te => te.isNonBillable)
      .reduce((s, te) => s + (te.hoursWorked || 0), 0).toFixed(1)
  );
  const overallBillablePct = totalHours > 0
    ? Math.round((totalBillableHours / totalHours) * 100)
    : 0;

  // Notes coverage
  const entriesWithNotes = teSource.filter(
    te => (te.summaryNotes && te.summaryNotes.trim().length > 0) ||
          (te.internalNotes && te.internalNotes.trim().length > 0)
  ).length;
  const notesCoverage = teSource.length > 0
    ? Math.round((entriesWithNotes / teSource.length) * 100)
    : 0;

  // Hours by issue type with sub issue breakdown
  const hoursByIssue = {};
  teSource.forEach(te => {
    const ticket = ticketMap[te.ticketID];
    if (!ticket) return;
    const hours = te.hoursWorked || 0;
    const issueKey = String(ticket.issueType || '');
    const subIssueKey = String(ticket.subIssueType || '');
    const issueLabel = issueTypeMap[issueKey] || 'Uncategorized';
    const subIssueLabel = subIssueMap[subIssueKey]?.label || null;

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
      hours: parseFloat(data.hours.toFixed(1)),
      subIssues: Object.entries(data.subIssues)
        .map(([subLabel, hours]) => ({
          label: subLabel,
          hours: parseFloat(hours.toFixed(1))
        }))
        .sort((a, b) => b.hours - a.hours)
    }))
    .sort((a, b) => b.hours - a.hours);

  // ── Hours by company (with issue type sub-rows) ───────────────────────────
  const hoursByCompanyRaw = {};
  teSource.forEach(te => {
    const ticket = ticketMap[te.ticketID];
    const company = (companyMap && ticket && companyMap[String(ticket.companyID)]) || 'Unknown';
    const hours = te.hoursWorked || 0;
    if (!hoursByCompanyRaw[company]) hoursByCompanyRaw[company] = { hours: 0, issueTypes: {} };
    hoursByCompanyRaw[company].hours += hours;
    if (ticket?.issueType) {
      const label = issueTypeMap[String(ticket.issueType)] || `Type ${ticket.issueType}`;
      hoursByCompanyRaw[company].issueTypes[label] =
        (hoursByCompanyRaw[company].issueTypes[label] || 0) + hours;
    }
  });

  const hoursByCompanyList = Object.entries(hoursByCompanyRaw)
    .map(([name, data]) => ({
      name,
      hours: parseFloat(data.hours.toFixed(1)),
      issueTypes: Object.entries(data.issueTypes)
        .map(([label, hours]) => ({ label, hours: parseFloat(hours.toFixed(1)) }))
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

  // ── Tech Grading (revised scoring model) ────────────────────────────────────
  // Weights: SLA 20, Response 20, Resolution 20, Escalation 15, Notes 15, FCR 10
  // Perfect score thresholds:
  //   SLA: 0 breaches | Response: ≤30min avg | Resolution: ≤30min avg hours logged
  //   Escalation: <5/quarter | Notes: 0 doc flags | FCR: ≥90% one-touch close
  const MIN_TICKETS = 30;
  const OUTLIER_THRESHOLD = 1.25; // 1.25x team avg = outlier
  const gradeTicketSource = selectedQTickets.length > 0 ? selectedQTickets : allTickets;
  const gradeTeSource = filterTimeEntries(
    selectedQTimeEntries.length > 0 ? selectedQTimeEntries : (timeEntries || [])
  );

  const gradeTechIds = Object.keys(resourceMap).map(Number);

  const TECH_TIERS_LOCAL = {
    29682924: 1, 29682927: 1,
    29682910: 2, 29682889: 2,
    29682904: 3, 29682899: 3
  };

  // Build per-tech raw data
  const techRaw = {};
  gradeTechIds.forEach(id => {
    techRaw[id] = {
      name: resourceMap[id], id,
      assignedTickets: [],
      responseTimes: [],        // hours from create to firstResponse
      slaBreaches: 0,           // tickets where firstResponse > firstResponseDue
      slaEligible: 0,           // tickets with firstResponseDueDateTime
      escalatedCount: 0,
      timeEntries: [],
      hoursPerCompletedTicket: [], // hours logged on completed tickets
      oneTouchCount: 0,         // Is One Touch Close = Yes
      oneTouchEligible: 0,      // tickets with the field present
      docFlaggedTickets: new Set(), // ticket numbers flagged for documentation
      // For issue type outlier analysis
      byIssueType: {}           // issueTypeLabel -> { responseTimes, hoursLogged, escalations, tickets }
    };
  });

  // Build ticket -> hours logged map from time entries
  const ticketHoursMap = {};
  gradeTeSource.forEach(te => {
    if (!te.ticketID) return;
    ticketHoursMap[te.ticketID] = (ticketHoursMap[te.ticketID] || 0) + (te.hoursWorked || 0);
  });

  // Process tickets
  gradeTicketSource.forEach(t => {
    const id = t.assignedResourceID;
    if (!id || !techRaw[id]) return;
    const tech = techRaw[id];
    tech.assignedTickets.push(t);

    const issueLabel = issueTypeMap[String(t.issueType)] || null;

    // Response time — exclude low priority (priority 4), internal (companyID 0), and NJC (companyID 344)
    // Also exclude Merged Tickets, InfoTank Internal Projects, Sales queues
    const EXCLUDE_RESPONSE_COMPANIES = new Set([0, 344]);
    const EXCLUDE_RESPONSE_QUEUES = new Set([29683479, 29683378, 29683480]);
    if (t.createDate && t.firstResponseDateTime && t.priority !== 4
      && !EXCLUDE_RESPONSE_COMPANIES.has(t.companyID)
      && !EXCLUDE_RESPONSE_QUEUES.has(t.queueID)) {
      const hrs = (new Date(t.firstResponseDateTime) - new Date(t.createDate)) / (1000 * 60 * 60);
      if (hrs >= 0 && hrs < 720) {
        tech.responseTimes.push(hrs);
        if (issueLabel) {
          if (!tech.byIssueType[issueLabel]) tech.byIssueType[issueLabel] = { responseTimes: [], hoursLogged: [], escalations: 0, tickets: 0 };
          tech.byIssueType[issueLabel].responseTimes.push(hrs);
          tech.byIssueType[issueLabel].tickets++;
        }
      }
    }

    // SLA breach
    if (t.firstResponseDueDateTime) {
      tech.slaEligible++;
      if (!t.firstResponseDateTime || new Date(t.firstResponseDateTime) > new Date(t.firstResponseDueDateTime)) {
        tech.slaBreaches++;
      }
    }

    // Resolution hours — hours logged on completed tickets
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

    // FCR — Is One Touch Close field
    const oneTouchField = t.userDefinedFields?.find(f => f.name === 'Is One Touch Close');
    if (oneTouchField) {
      tech.oneTouchEligible++;
      if (oneTouchField.value === 'Yes') tech.oneTouchCount++;
    }
  });

  // Collect time entries for notes quality
  gradeTeSource.forEach(te => {
    const id = te.resourceID;
    if (!id || !techRaw[id]) return;
    techRaw[id].timeEntries.push(te);
  });

  // Notes quality: use documentation flags from reviewed metadata if available
  const reviewedMeta = rawData.reviewedMeta || {};
  Object.entries(reviewedMeta).forEach(([ticketNum, meta]) => {
    if (meta?.flagType === 'documentation' && meta?.techId && techRaw[meta.techId]) {
      techRaw[meta.techId].docFlaggedTickets.add(ticketNum);
    }
  });

  // Team-wide averages for outlier comparison
  const allResponseTimes = Object.values(techRaw).flatMap(t => t.responseTimes);
  const allHoursPerTicket = Object.values(techRaw).flatMap(t => t.hoursPerCompletedTicket);
  const teamAvgResponseHrs = allResponseTimes.length
    ? allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length : null;
  const teamAvgHoursPerTicket = allHoursPerTicket.length
    ? allHoursPerTicket.reduce((a, b) => a + b, 0) / allHoursPerTicket.length : null;

  // Issue type team averages for outlier detection
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

    // 1. SLA Breach Rate (20pts) — ≤5 breaches = 20, each above 5 = -10% of 20
    const slaScore = t.slaEligible > 0
      ? Math.max(0, 20 * (1 - Math.max(0, t.slaBreaches - 5) * 0.1))
      : 20;

    // 2. Response Time (20pts) — ≤30min = 20, 2hrs = 0, linear between
    let responseScore = 0, avgResponseHrs = null;
    if (t.responseTimes.length >= 5) {
      avgResponseHrs = t.responseTimes.reduce((a, b) => a + b, 0) / t.responseTimes.length;
      const avgMins = avgResponseHrs * 60;
      const PERFECT_MINS = 30;
      const FAIL_MINS = 120;
      responseScore = Math.max(0, Math.min(20, 20 * (1 - (avgMins - PERFECT_MINS) / (FAIL_MINS - PERFECT_MINS))));
    }

    // 3. Resolution Time (20pts)
    let resolutionScore = 0, avgHoursPerTicket = null;
    if (t.hoursPerCompletedTicket.length >= 5) {
      avgHoursPerTicket = t.hoursPerCompletedTicket.reduce((a, b) => a + b, 0) / t.hoursPerCompletedTicket.length;
      const PERFECT_RESOLUTION = 0.5;
      const STEP = 0.0833;
      const stepsOver = Math.max(0, (avgHoursPerTicket - PERFECT_RESOLUTION) / STEP);
      resolutionScore = Math.max(0, 20 * (1 - stepsOver * 0.1));
    }

    // 4. Escalation (15pts)
    const escalationsOver = Math.max(0, t.escalatedCount - 5);
    const escalationScore = Math.max(0, 15 * (1 - escalationsOver * 0.05));

    // 5. Notes Quality (15pts)
    let notesScore = 0;
    let notesPct = 0;
    let notesMethod = 'entries';
    if (Object.keys(reviewedMeta).length > 0) {
      const reviewed = t.assignedTickets.filter(ticket => reviewedMeta[ticket.ticketNumber]);
      const docFlagged = reviewed.filter(ticket => reviewedMeta[ticket.ticketNumber]?.flagType === 'documentation').length;
      if (reviewed.length > 0) {
        notesPct = (reviewed.length - docFlagged) / reviewed.length;
        notesMethod = 'ai';
      }
    }
    if (notesMethod === 'entries') {
      const entriesWithNotes = t.timeEntries.filter(
        te => (te.summaryNotes?.trim().length > 0) || (te.internalNotes?.trim().length > 0)
      ).length;
      notesPct = t.timeEntries.length > 0 ? entriesWithNotes / t.timeEntries.length : 0;
    }
    notesScore = 15 * notesPct;

    // 6. FCR (10pts)
    let fcrScore = 0, fcrRate = null;
    if (t.oneTouchEligible >= 10) {
      fcrRate = t.oneTouchCount / t.oneTouchEligible;
      const PERFECT_FCR = 0.9;
      const stepsUnder = Math.max(0, (PERFECT_FCR - fcrRate) / 0.05);
      fcrScore = Math.max(0, 10 * (1 - stepsUnder * 0.1));
    }

    const totalScore = Math.min(100, Math.round(slaScore + responseScore + resolutionScore + escalationScore + notesScore + fcrScore));

    // Issue type outliers (1.25x team avg)
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
      metrics: {
        sla: {
          score: Math.round(slaScore), maxScore: 20,
          breaches: t.slaBreaches,
          eligible: t.slaEligible,
          breachRate: t.slaEligible > 0 ? Math.round((t.slaBreaches / t.slaEligible) * 100) : 0
        },
        responseTime: {
          score: Math.round(responseScore), maxScore: 20,
          avgHrs: avgResponseHrs != null ? parseFloat(avgResponseHrs.toFixed(2)) : null,
          avgMins: avgResponseHrs != null ? Math.round(avgResponseHrs * 60) : null,
          teamAvgMins: teamAvgResponseHrs != null ? Math.round(teamAvgResponseHrs * 60) : null
        },
        resolutionTime: {
          score: Math.round(resolutionScore), maxScore: 20,
          avgHrs: avgHoursPerTicket != null ? parseFloat(avgHoursPerTicket.toFixed(2)) : null,
          avgMins: avgHoursPerTicket != null ? Math.round(avgHoursPerTicket * 60) : null,
          teamAvgMins: teamAvgHoursPerTicket != null ? Math.round(teamAvgHoursPerTicket * 60) : null,
          completedTickets: t.hoursPerCompletedTicket.length
        },
        escalation: {
          score: Math.round(escalationScore), maxScore: 15,
          count: t.escalatedCount,
          totalTickets: t.assignedTickets.length
        },
        notes: {
          score: Math.round(notesScore), maxScore: 15,
          pct: Math.round(notesPct * 100),
          method: notesMethod
        },
        fcr: {
          score: Math.round(fcrScore), maxScore: 10,
          rate: fcrRate != null ? Math.round(fcrRate * 100) : null,
          oneTouchCount: t.oneTouchCount,
          eligible: t.oneTouchEligible
        }
      },
      issueOutliers
    };
  }).filter(Boolean).sort((a, b) => b.score - a.score);


  return {
    // YTD
    ytd: {
      current: ytdCurrent, prior: ytdPrior, change: parseInt(ytdChange),
      currentLabel: `${ytdStartLabel} – ${ytdEndLabel}`,
      priorLabel: `${priorYtdStartLabel} – ${priorYtdEndLabel}`
    },
    // Chart
    quarterlyTrend,
    selectedQLabel,
    selectedQTickets,
    selectedQTimeEntries,
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
    byIssueTypeDetailed,
    // Company breakdown (tickets)
    byCompanyList,
    // Time analytics
    timeAnalytics: {
      totalHours,
      totalBillableHours,
      totalNonBillableHours,
      overallBillablePct,
      notesCoverage,
      hoursByTechList,
      hoursByIssueList,
      hoursByCompanyList,
      entryCount: teSource.length
    },
    // Staffing
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