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

  // ── Issue type breakdown ──────────────────────────────────────────────────
  const issueSource = selectedQTickets.length > 0 ? selectedQTickets : allTickets;
  const byIssueType = {};
  issueSource.forEach(t => {
    if (t.issueType) {
      const label = issueTypeMap[String(t.issueType)] || `Type ${t.issueType}`;
      byIssueType[label] = (byIssueType[label] || 0) + 1;
    }
  });

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

  // ── Tech Grading ─────────────────────────────────────────────────────────────
  const MIN_TICKETS = 30;
  const gradeTicketSource = selectedQTickets.length > 0 ? selectedQTickets : allTickets;
  const gradeTeSource = filterTimeEntries(
    selectedQTimeEntries.length > 0 ? selectedQTimeEntries : (timeEntries || [])
  );

  const gradeTechIds = Object.keys(resourceMap).map(Number);

  const techRaw = {};
  gradeTechIds.forEach(id => {
    techRaw[id] = {
      name: resourceMap[id], id,
      assignedTickets: [], completedTickets: [],
      responseTimes: [], resolutionDays: [],
      escalatedCount: 0, timeEntries: []
    };
  });

  const TECH_TIERS_LOCAL = {
    29682924: 1, 29682927: 1,
    29682910: 2, 29682889: 2,
    29682904: 3, 29682899: 3
  };

  gradeTicketSource.forEach(t => {
    const id = t.assignedResourceID;
    if (!id || !techRaw[id]) return;
    const tech = techRaw[id];
    tech.assignedTickets.push(t);

    if (t.createDate && t.firstResponseDateTime) {
      const hrs = (new Date(t.firstResponseDateTime) - new Date(t.createDate)) / (1000 * 60 * 60);
      if (hrs >= 0 && hrs < 720) tech.responseTimes.push(hrs);
    }

    if (t.createDate && t.completedDate) {
      const days = (new Date(t.completedDate) - new Date(t.createDate)) / (1000 * 60 * 60 * 24);
      if (days >= 0 && days < 365) {
        tech.resolutionDays.push(days);
        tech.completedTickets.push(t);
      }
    }

    const assignedTier = TECH_TIERS_LOCAL[id] || null;
    const completedById = t.completedByResourceID;
    if (completedById && completedById !== id && TECH_TIERS_LOCAL[completedById]) {
      if (assignedTier && TECH_TIERS_LOCAL[completedById] > assignedTier) {
        tech.escalatedCount++;
      }
    }
  });

  gradeTeSource.forEach(te => {
    const id = te.resourceID;
    if (!id || !techRaw[id]) return;
    techRaw[id].timeEntries.push(te);
  });

  const allResponseTimes = Object.values(techRaw).flatMap(t => t.responseTimes);
  const allGradeResolutionDays = Object.values(techRaw).flatMap(t => t.resolutionDays);
  const teamAvgResponseHrs = allResponseTimes.length
    ? allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length : null;
  const teamAvgGradeResolutionDays = allGradeResolutionDays.length
    ? allGradeResolutionDays.reduce((a, b) => a + b, 0) / allGradeResolutionDays.length : null;

  const techGrades = gradeTechIds.map(id => {
    const t = techRaw[id];
    if (t.assignedTickets.length < MIN_TICKETS) return null;

    let responseScore = 0, avgResponseHrs = null;
    if (t.responseTimes.length >= 5 && teamAvgResponseHrs) {
      avgResponseHrs = t.responseTimes.reduce((a, b) => a + b, 0) / t.responseTimes.length;
      const ratio = avgResponseHrs / teamAvgResponseHrs;
      responseScore = Math.max(0, Math.min(15, 15 * (1 - (ratio - 1) / 2)));
    }

    let resolutionScore = 0, avgResolutionDaysTech = null;
    if (t.resolutionDays.length >= 5 && teamAvgGradeResolutionDays) {
      avgResolutionDaysTech = t.resolutionDays.reduce((a, b) => a + b, 0) / t.resolutionDays.length;
      const ratio = avgResolutionDaysTech / teamAvgGradeResolutionDays;
      resolutionScore = Math.max(0, Math.min(25, 25 * (1 - (ratio - 1) / 2)));
    }

    const escalationRate = t.assignedTickets.length > 0
      ? t.escalatedCount / t.assignedTickets.length : 0;
    const escalationScore = Math.max(0, 20 * (1 - escalationRate / 0.4));

    const entriesWithNotes = t.timeEntries.filter(
      te => (te.summaryNotes?.trim().length > 0) || (te.internalNotes?.trim().length > 0)
    ).length;
    const notesPct = t.timeEntries.length > 0 ? entriesWithNotes / t.timeEntries.length : 0;
    const notesScore = 25 * notesPct;

    const fcrCount = t.assignedTickets.filter(ticket =>
      !ticket.completedByResourceID || ticket.completedByResourceID === ticket.assignedResourceID
    ).length;
    const fcrRate = t.assignedTickets.length > 0 ? fcrCount / t.assignedTickets.length : 0;
    const fcrScore = 15 * fcrRate;

    const totalScore = Math.min(100, Math.round(responseScore + resolutionScore + escalationScore + notesScore + fcrScore));

    return {
      id, name: t.name, score: totalScore,
      ticketCount: t.assignedTickets.length,
      metrics: {
        responseTime: {
          score: Math.round(responseScore), maxScore: 15,
          avgHrs: avgResponseHrs != null ? parseFloat(avgResponseHrs.toFixed(1)) : null,
          teamAvgHrs: teamAvgResponseHrs != null ? parseFloat(teamAvgResponseHrs.toFixed(1)) : null
        },
        resolutionTime: {
          score: Math.round(resolutionScore), maxScore: 25,
          avgDays: avgResolutionDaysTech != null ? parseFloat(avgResolutionDaysTech.toFixed(1)) : null,
          teamAvgDays: teamAvgGradeResolutionDays != null ? parseFloat(teamAvgGradeResolutionDays.toFixed(1)) : null
        },
        escalation: {
          score: Math.round(escalationScore), maxScore: 20,
          rate: Math.round(escalationRate * 100),
          escalatedCount: t.escalatedCount,
          totalTickets: t.assignedTickets.length
        },
        notes: {
          score: Math.round(notesScore), maxScore: 25,
          pct: Math.round(notesPct * 100),
          entriesWithNotes, totalEntries: t.timeEntries.length
        },
        fcr: {
          score: Math.round(fcrScore), maxScore: 15,
          rate: Math.round(fcrRate * 100),
          fcrCount, totalTickets: t.assignedTickets.length
        }
      }
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
