/**
 * MEP GROUP - Enterprise Human Resource Management (HRM) Module
 * Yearly Increment Intelligence & Multi-Year Growth Controller (2021–2026)
 * Author: Antigravity AI / MEP Engineering Team
 */

(function () {
  'use strict';

  var YEARS = ['2021', '2022', '2023', '2024', '2025', '2026'];

  var state = {
    allEmployees: [],
    filteredEmployees: [],
    selectedYear: 'ALL', // 'ALL' or '2026', '2025', etc.
    filters: {
      search: '',
      section: 'ALL',
      status: 'ALL', // 'ALL', 'Active', 'Inactive'
      beneficiariesOnly: true, // Default: show employees with increment
      sortBy: 'total_increment',
      sortDir: 'desc',
      page: 1,
      perPage: 25
    },
    stats: {
      totalDisbursedAll: 0,
      totalBeneficiaries: 0,
      yearlyTotals: {},
      yearlyCounts: {}
    }
  };

  // Section Color Palette for Consistency
  var SECTION_COLORS = {
    'Fan Assemble Line': { bg: 'bg-indigo-500/10 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-500/25', icon: 'ph-arrows-merge' },
    'Fan Auto Powder Coating': { bg: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-500/25', icon: 'ph-paint-roller' },
    'Fan Armature Winding': { bg: 'bg-purple-500/10 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-500/25', icon: 'ph-spiral' },
    'Fan Lathe': { bg: 'bg-blue-500/10 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-500/25', icon: 'ph-gear-six' },
    'Fan Power Press & Stamping': { bg: 'bg-rose-500/10 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-500/25', icon: 'ph-hammer' },
    'Fan Dhalai & Die Casting': { bg: 'bg-amber-500/10 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-500/25', icon: 'ph-fire' },
    'Fan Blade & Dimmer': { bg: 'bg-cyan-500/10 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300 border-cyan-500/25', icon: 'ph-fan' },
    'Fan Rojonigondha': { bg: 'bg-fuchsia-500/10 text-fuchsia-700 dark:bg-fuchsia-950/50 dark:text-fuchsia-300 border-fuchsia-500/25', icon: 'ph-flower-lotus' },
    'Fan Sala Shapla': { bg: 'bg-sky-500/10 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-500/25', icon: 'ph-flower' },
    'Sada Shapla': { bg: 'bg-sky-500/10 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-500/25', icon: 'ph-flower' },
    'Fan Replace': { bg: 'bg-violet-500/10 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border-violet-500/25', icon: 'ph-arrows-clockwise' },
    'Fan Admin': { bg: 'bg-slate-500/10 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-500/25', icon: 'ph-briefcase' }
  };

  function getSectionStyle(secName) {
    if (!secName) return { bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300', icon: 'ph-factory' };
    return SECTION_COLORS[secName] || { bg: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-500/25', icon: 'ph-factory' };
  }

  function formatMoney(num) {
    if (num === null || num === undefined || isNaN(num)) return '৳ 0';
    return '৳ ' + Math.round(num).toLocaleString('en-IN');
  }

  function formatNum(num) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return Math.round(num).toLocaleString('en-IN');
  }

  // -------------------------------------------------------------
  // Data Extraction & KPI Computation
  // -------------------------------------------------------------
  function getEmployeeIncrements(emp) {
    var incs = {};
    var total = 0;
    YEARS.forEach(function (y) {
      var val = Number(emp['increment_' + y]) || 0;
      incs[y] = val;
      total += val;
    });
    return { yearly: incs, total: total };
  }

  // Back-calculate Gross Salary, Basic Salary, and Increment for any given year
  function getEmployeeSalaryForYear(emp, targetYear) {
    var g26 = Number(emp.gross_salary) || 0;
    var b26 = Number(emp.basic_salary) || 0;

    if (!targetYear || targetYear === 'ALL' || targetYear === '2026') {
      return {
        gross: g26,
        basic: b26,
        increment: Number(emp.increment_2026) || 0
      };
    }

    var targetYearNum = parseInt(targetYear, 10);
    var futureIncs = 0;
    YEARS.forEach(function (y) {
      var yNum = parseInt(y, 10);
      if (yNum > targetYearNum) {
        futureIncs += (Number(emp['increment_' + y]) || 0);
      }
    });

    var yearGross = Math.max(0, g26 - futureIncs);
    var yearBasic = 0;
    if (b26 > 0 && g26 > 0) {
      yearBasic = Math.round(yearGross * (b26 / g26));
    } else if (yearGross > 0) {
      yearBasic = Math.round(yearGross / 2);
    }

    var yearInc = Number(emp['increment_' + targetYear]) || 0;

    return {
      gross: yearGross,
      basic: yearBasic,
      increment: yearInc
    };
  }

  function computeGlobalStats(employees) {
    var yearlyTotals = { '2021': 0, '2022': 0, '2023': 0, '2024': 0, '2025': 0, '2026': 0 };
    var yearlyCounts = { '2021': 0, '2022': 0, '2023': 0, '2024': 0, '2025': 0, '2026': 0 };
    var yearlyGross = { '2021': 0, '2022': 0, '2023': 0, '2024': 0, '2025': 0, '2026': 0 };
    var yearlyBasic = { '2021': 0, '2022': 0, '2023': 0, '2024': 0, '2025': 0, '2026': 0 };
    var totalDisbursed = 0;
    var beneficiaryCount = 0;

    employees.forEach(function (emp) {
      var incInfo = getEmployeeIncrements(emp);
      if (incInfo.total > 0) {
        beneficiaryCount++;
        totalDisbursed += incInfo.total;
      }
      YEARS.forEach(function (y) {
        if (incInfo.yearly[y] > 0) {
          yearlyTotals[y] += incInfo.yearly[y];
          yearlyCounts[y]++;
          var sal = getEmployeeSalaryForYear(emp, y);
          yearlyGross[y] += sal.gross;
          yearlyBasic[y] += sal.basic;
        }
      });
    });

    state.stats = {
      totalDisbursedAll: totalDisbursed,
      totalBeneficiaries: beneficiaryCount,
      yearlyTotals: yearlyTotals,
      yearlyCounts: yearlyCounts,
      yearlyGross: yearlyGross,
      yearlyBasic: yearlyBasic
    };
  }

  function initData() {
    var raw = [];
    if (window.MEP_MANPOWER_DATABASE && window.MEP_MANPOWER_DATABASE.employees) {
      raw = window.MEP_MANPOWER_DATABASE.employees;
    } else if (window.HRM_MANPOWER_CACHE && window.HRM_MANPOWER_CACHE.employees) {
      raw = window.HRM_MANPOWER_CACHE.employees;
    }

    // Filter out hidden and Fan QC
    state.allEmployees = raw.filter(function (e) {
      if (e.is_hidden === true) return false;
      var sec = (e.section || '').trim().toLowerCase();
      if (sec === 'fan qc') return false;
      return true;
    });

    computeGlobalStats(state.allEmployees);
    populateSectionFilter();

    try {
      var h = window.location.hash || '';
      YEARS.forEach(function (y) {
        if (h.indexOf(y) !== -1) {
          state.selectedYear = y;
        }
      });
    } catch (e) {}

    applyFilters();
  }


  function populateSectionFilter() {
    var select = document.getElementById('inc-filter-section');
    if (!select) return;

    var sections = {};
    state.allEmployees.forEach(function (e) {
      if (e.section) {
        sections[e.section] = (sections[e.section] || 0) + 1;
      }
    });

    var html = '<option value="ALL">All Sections (' + state.allEmployees.length + ' Staff)</option>';
    Object.keys(sections).sort().forEach(function (sec) {
      html += '<option value="' + sec + '">' + sec + ' (' + sections[sec] + ')</option>';
    });
    select.innerHTML = html;
  }

  // -------------------------------------------------------------
  // Filter & Search Engine
  // -------------------------------------------------------------
  function applyFilters() {
    var f = state.filters;
    var q = (f.search || '').trim().toLowerCase();
    var selYear = state.selectedYear;

    var result = state.allEmployees.filter(function (emp) {
      // 1. Beneficiary Filter
      var incInfo = getEmployeeIncrements(emp);
      if (f.beneficiariesOnly) {
        if (selYear === 'ALL') {
          if (incInfo.total <= 0) return false;
        } else {
          if ((incInfo.yearly[selYear] || 0) <= 0) return false;
        }
      }

      // 2. Status Filter
      if (f.status !== 'ALL') {
        var st = (emp.status || 'Active').toLowerCase();
        if (st !== f.status.toLowerCase()) return false;
      }

      // 3. Section Filter
      if (f.section !== 'ALL') {
        if ((emp.section || '') !== f.section) return false;
      }

      // 4. Text Search
      if (q) {
        var textCorpus = [
          emp.name || '',
          emp.staff_id || '',
          emp.designation || '',
          emp.section || '',
          emp.contact_number || '',
          emp.nid || ''
        ].join(' ').toLowerCase();

        if (textCorpus.indexOf(q) === -1) return false;
      }

      return true;
    });

    // Sorting
    result.sort(function (a, b) {
      var incA = getEmployeeIncrements(a);
      var incB = getEmployeeIncrements(b);
      var valA = 0, valB = 0;

      if (f.sortBy === 'total_increment') {
        valA = incA.total;
        valB = incB.total;
      } else if (f.sortBy === 'increment_selected') {
        valA = selYear === 'ALL' ? incA.total : (incA.yearly[selYear] || 0);
        valB = selYear === 'ALL' ? incB.total : (incB.yearly[selYear] || 0);
      } else if (f.sortBy === 'gross_salary') {
        if (selYear === 'ALL') {
          valA = Number(a.gross_salary) || 0;
          valB = Number(b.gross_salary) || 0;
        } else {
          valA = getEmployeeSalaryForYear(a, selYear).gross;
          valB = getEmployeeSalaryForYear(b, selYear).gross;
        }
      } else if (f.sortBy === 'staff_id') {
        valA = Number(a.staff_id) || 0;
        valB = Number(b.staff_id) || 0;
      } else if (f.sortBy === 'name') {
        valA = (a.name || '').toLowerCase();
        valB = (b.name || '').toLowerCase();
        return f.sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else if (f.sortBy === 'doj') {
        valA = a.doj || '';
        valB = b.doj || '';
        return f.sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      return f.sortDir === 'asc' ? (valA - valB) : (valB - valA);
    });

    state.filteredEmployees = result;
    state.filters.page = 1;
    renderAll();
  }

  // -------------------------------------------------------------
  // Rendering Controller
  // -------------------------------------------------------------
  function renderAll() {
    renderKPIs();
    renderYearTabs();
    renderTable();
    updateExportButtonBadge();
  }

  function renderKPIs() {
    var s = state.stats;
    var elTotal = document.getElementById('inc-kpi-total-disbursed');
    var elBen = document.getElementById('inc-kpi-total-beneficiaries');
    var el26 = document.getElementById('inc-kpi-2026-pool');
    var el25 = document.getElementById('inc-kpi-2025-pool');
    var elHist = document.getElementById('inc-kpi-historical-pool');

    if (elTotal) elTotal.textContent = formatMoney(s.totalDisbursedAll);
    if (elBen) elBen.textContent = s.totalBeneficiaries + ' Personnel';
    if (el26) el26.textContent = formatMoney(s.yearlyTotals['2026'] || 0) + ' (' + (s.yearlyCounts['2026'] || 0) + ' Staff)';
    if (el25) el25.textContent = formatMoney(s.yearlyTotals['2025'] || 0) + ' (' + (s.yearlyCounts['2025'] || 0) + ' Staff)';

    var histTotal = (s.yearlyTotals['2021'] || 0) + (s.yearlyTotals['2022'] || 0) + (s.yearlyTotals['2023'] || 0) + (s.yearlyTotals['2024'] || 0);
    if (elHist) elHist.textContent = formatMoney(histTotal);

    // Mini Year Badges Bar
    YEARS.forEach(function (y) {
      var badgeVal = document.getElementById('inc-badge-val-' + y);
      var badgeCount = document.getElementById('inc-badge-count-' + y);
      if (badgeVal) badgeVal.textContent = '৳ ' + Math.round(s.yearlyTotals[y] || 0).toLocaleString();
      if (badgeCount) badgeCount.textContent = (s.yearlyCounts[y] || 0) + ' staff';
    });
  }

  function renderYearTabs() {
    var container = document.getElementById('inc-year-tabs-container');
    if (!container) return;

    var s = state.stats;
    var selYear = state.selectedYear;
    var isAll = selYear === 'ALL';

    var tabs = [];
    YEARS.slice().reverse().forEach(function (y) {
      tabs.push({
        id: y,
        label: y + ' Increment',
        count: s.yearlyCounts[y] || 0,
        amount: s.yearlyTotals[y] || 0
      });
    });
    tabs.push({
      id: 'ALL',
      label: 'All Years Matrix (2021–2026)',
      count: s.totalBeneficiaries,
      amount: s.totalDisbursedAll
    });

    // Build Breakdown HTML for the selected year ("pase year onujiye breakdown")
    var breakdownHtml = '';
    if (isAll) {
      breakdownHtml = 
        '<div class="flex flex-wrap items-center gap-2">' +
          '<div class="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 shadow-2xs">' +
            '<i class="ph-bold ph-coins text-emerald-600 dark:text-emerald-400"></i>' +
            '<span class="text-[10px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400">Total:</span>' +
            '<span class="text-xs font-mono font-black">' + formatMoney(s.totalDisbursedAll) + '</span>' +
          '</div>' +
          '<div class="px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-300 flex items-center gap-1.5 shadow-2xs">' +
            '<i class="ph-bold ph-users-three text-blue-600 dark:text-blue-400"></i>' +
            '<span class="text-[10px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400">Staff:</span>' +
            '<span class="text-xs font-mono font-black">' + s.totalBeneficiaries + ' Personnel</span>' +
          '</div>' +
          '<div class="flex items-center gap-1 overflow-x-auto custom-scrollbar py-0.5">';

      YEARS.forEach(function (y) {
        var cnt = s.yearlyCounts[y] || 0;
        var amt = s.yearlyTotals[y] || 0;
        breakdownHtml += 
          '<button type="button" onclick="window.HRMIncrement.setYear(\'' + y + '\')" class="px-2 py-1 rounded-lg text-[11px] font-mono font-bold bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 flex items-center gap-1 cursor-pointer transition-all hover:scale-105 shadow-2xs" title="Switch to ' + y + ' Increment">' +
            '<span class="text-purple-600 dark:text-purple-400 font-bold">' + y + ':</span>' +
            '<span class="text-slate-800 dark:text-slate-200 font-extrabold">৳' + Math.round(amt).toLocaleString() + '</span>' +
            '<span class="text-[10px] text-slate-400">(' + cnt + ')</span>' +
          '</button>';
      });

      breakdownHtml += '</div></div>';
    } else {
      var yAmt = s.yearlyTotals[selYear] || 0;
      var yCnt = s.yearlyCounts[selYear] || 0;
      var yGross = (s.yearlyGross && s.yearlyGross[selYear]) || 0;
      var yBasic = (s.yearlyBasic && s.yearlyBasic[selYear]) || 0;
      var yAvg = yCnt > 0 ? Math.round(yAmt / yCnt) : 0;
      var yPct = yBasic > 0 ? ((yAmt / yBasic) * 100).toFixed(1) + '%' : '—';

      breakdownHtml = 
        '<div class="flex flex-wrap items-center gap-2">' +
          // Disbursed
          '<div class="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 shadow-2xs">' +
            '<i class="ph-bold ph-trend-up text-emerald-600 dark:text-emerald-400"></i>' +
            '<span class="text-[10px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400">Disbursed:</span>' +
            '<span class="text-xs font-mono font-black">৳' + Math.round(yAmt).toLocaleString() + '</span>' +
          '</div>' +
          // Staff
          '<div class="px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-300 flex items-center gap-1.5 shadow-2xs">' +
            '<i class="ph-bold ph-users text-blue-600 dark:text-blue-400"></i>' +
            '<span class="text-[10px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400">Staff:</span>' +
            '<span class="text-xs font-mono font-black">' + yCnt + ' Beneficiaries</span>' +
          '</div>' +
          // Gross Pool
          '<div class="px-2.5 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-800 dark:text-purple-300 flex items-center gap-1.5 shadow-2xs" title="' + selYear + ' Gross Salary Pool (Back-calculated)">' +
            '<i class="ph-bold ph-wallet text-purple-600 dark:text-purple-400"></i>' +
            '<span class="text-[10px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400">' + selYear + ' Gross:</span>' +
            '<span class="text-xs font-mono font-black">৳' + Math.round(yGross).toLocaleString() + '</span>' +
          '</div>' +
          // Basic Pool
          '<div class="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 flex items-center gap-1.5 shadow-2xs" title="' + selYear + ' Basic Salary Pool">' +
            '<i class="ph-bold ph-coins text-amber-600 dark:text-amber-400"></i>' +
            '<span class="text-[10px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400">' + selYear + ' Basic:</span>' +
            '<span class="text-xs font-mono font-black">৳' + Math.round(yBasic).toLocaleString() + '</span>' +
          '</div>' +
          // Avg & %
          '<div class="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-dark-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-1.5 shadow-2xs">' +
            '<i class="ph-bold ph-calculator text-emerald-500"></i>' +
            '<span class="text-[10px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400">Avg Inc:</span>' +
            '<span class="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">৳' + yAvg.toLocaleString() + '</span>' +
            '<span class="text-[10px] font-mono font-bold text-slate-400">(' + yPct + ')</span>' +
          '</div>' +
          // Quick other years cycle buttons
          '<div class="flex items-center gap-1 overflow-x-auto custom-scrollbar py-0.5 ml-1">';

      YEARS.forEach(function (y) {
        var isThis = y === selYear;
        var btnCls = isThis
          ? 'bg-emerald-600 text-white font-black border-emerald-600 shadow-xs ring-2 ring-emerald-400/40'
          : 'bg-white dark:bg-dark-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500 font-bold';
        breakdownHtml += 
          '<button type="button" onclick="window.HRMIncrement.setYear(\'' + y + '\')" class="px-2 py-0.5 rounded-lg text-[11px] font-mono border flex items-center gap-1 cursor-pointer transition-all ' + btnCls + '" title="Switch to ' + y + ' Increment">' +
            y +
          '</button>';
      });

      breakdownHtml += 
          '<button type="button" onclick="window.HRMIncrement.setYear(\'ALL\')" class="px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer transition-all" title="View All Years Matrix">' +
            'All' +
          '</button>' +
        '</div></div>';
    }

    var html = 
      '<div class="w-full p-3 px-4 rounded-2xl bg-white/95 dark:bg-dark-800/95 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3.5">' +
        // Left: Dropdown Menu Control
        '<div class="flex items-center gap-3 min-w-[280px] xl:max-w-md shrink-0">' +
          '<div class="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl font-black shadow-xs shrink-0">' +
            '<i class="ph-bold ph-calendar-check"></i>' +
          '</div>' +
          '<div class="flex-1">' +
            '<div class="flex items-center justify-between gap-2 mb-1">' +
              '<label for="inc-year-dropdown-select" class="text-[11px] font-mono font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">' +
                '<i class="ph-bold ph-funnel text-emerald-600 dark:text-emerald-400"></i>' +
                '<span>Select Increment Year:</span>' +
              '</label>' +
              '<span class="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">' +
                (isAll ? 'Multi-Year Audit Roster' : selYear + ' Fiscal Disbursement') +
              '</span>' +
            '</div>' +
            '<div class="relative">' +
              '<select id="inc-year-dropdown-select" onchange="window.HRMIncrement.setYear(this.value)" class="w-full pl-3.5 pr-9 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-dark-900 border-2 border-emerald-500/40 hover:border-emerald-500 focus:border-emerald-600 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer appearance-none shadow-2xs transition-all font-mono">';

    tabs.forEach(function (tab) {
      var isSel = selYear === tab.id;
      var amtStr = tab.amount > 0 ? ' • ৳ ' + Math.round(tab.amount).toLocaleString('en-IN') : '';
      html += '<option value="' + tab.id + '"' + (isSel ? ' selected' : '') + '>' +
        tab.label + ' (' + tab.count + ' Staff' + amtStr + ')' +
        '</option>';
    });

    html += 
              '</select>' +
              '<div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-emerald-600 dark:text-emerald-400">' +
                '<i class="ph-bold ph-caret-down text-sm"></i>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // Right: Dynamic Breakdown according to selected year ("pase year onujiye breakdown")
        '<div class="flex-1 flex flex-wrap items-center xl:justify-end gap-2 pt-2 xl:pt-0 border-t xl:border-t-0 border-slate-100 dark:border-slate-800/80">' +
          '<div class="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] font-mono font-black uppercase tracking-wider shrink-0 mr-1">' +
            '<i class="ph-bold ph-chart-pie-slice text-emerald-500 text-sm"></i>' +
            '<span>' + (isAll ? 'Year Breakdown:' : selYear + ' Breakdown:') + '</span>' +
          '</div>' +
          breakdownHtml +
        '</div>' +
      '</div>';

    container.innerHTML = html;
  }

  function renderTable() {
    var thead = document.getElementById('inc-table-head');
    var tbody = document.getElementById('inc-table-body');
    var tfoot = document.getElementById('inc-table-foot');
    if (!tbody) return;

    var isAll = state.selectedYear === 'ALL';
    var employees = state.filteredEmployees;
    var f = state.filters;

    // 1. Table Headers
    if (thead) {
      if (isAll) {
        thead.innerHTML = '<tr class="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-md text-slate-600 dark:text-slate-300 text-[10px] font-mono font-extrabold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 select-none shadow-xs">' +
          '<th class="px-3 py-2 text-center w-12 min-w-[48px] bg-slate-100/95 dark:bg-slate-800/95">#</th>' +
          '<th class="px-3 py-2 w-24 min-w-[90px] whitespace-nowrap bg-slate-100/95 dark:bg-slate-800/95">Staff ID</th>' +
          '<th class="px-3 py-2 min-w-[200px] bg-slate-100/95 dark:bg-slate-800/95">Employee Name</th>' +
          '<th class="px-3 py-2 min-w-[170px] bg-slate-100/95 dark:bg-slate-800/95">Designation</th>' +
          '<th class="px-3 py-2 min-w-[180px] bg-slate-100/95 dark:bg-slate-800/95">Section / Line</th>' +
          '<th class="px-3 py-2 text-center min-w-[110px] whitespace-nowrap bg-slate-100/95 dark:bg-slate-800/95">DOJ</th>' +
          '<th class="px-3 py-2 text-right min-w-[125px] whitespace-nowrap bg-slate-100/95 dark:bg-slate-800/95">Present Gross</th>' +
          '<th class="px-2.5 py-2 text-right min-w-[95px] whitespace-nowrap text-purple-700 dark:text-purple-300 bg-slate-100/95 dark:bg-slate-800/95">2021</th>' +
          '<th class="px-2.5 py-2 text-right min-w-[95px] whitespace-nowrap text-purple-700 dark:text-purple-300 bg-slate-100/95 dark:bg-slate-800/95">2022</th>' +
          '<th class="px-2.5 py-2 text-right min-w-[95px] whitespace-nowrap text-purple-700 dark:text-purple-300 bg-slate-100/95 dark:bg-slate-800/95">2023</th>' +
          '<th class="px-2.5 py-2 text-right min-w-[95px] whitespace-nowrap text-purple-700 dark:text-purple-300 bg-slate-100/95 dark:bg-slate-800/95">2024</th>' +
          '<th class="px-2.5 py-2 text-right min-w-[95px] whitespace-nowrap text-emerald-700 dark:text-emerald-400 font-black bg-slate-100/95 dark:bg-slate-800/95">2025</th>' +
          '<th class="px-2.5 py-2 text-right min-w-[95px] whitespace-nowrap text-emerald-700 dark:text-emerald-400 font-black bg-slate-100/95 dark:bg-slate-800/95">2026</th>' +
          '<th class="px-3 py-2 text-right min-w-[130px] whitespace-nowrap bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-black">Total Increment</th>' +
          '<th class="px-3 py-2 text-center w-20 min-w-[80px] whitespace-nowrap bg-slate-100/95 dark:bg-slate-800/95">Status</th>' +
          '<th class="px-3 py-2 text-center w-16 min-w-[65px] whitespace-nowrap bg-slate-100/95 dark:bg-slate-800/95">Action</th>' +
          '</tr>';
      } else {
        var yearLabel = state.selectedYear;
        var grossTitle = yearLabel === '2026' ? '2026 Gross Salary' : yearLabel + ' Gross Salary';
        var basicTitle = yearLabel === '2026' ? '2026 Basic Salary' : yearLabel + ' Basic Salary';
        thead.innerHTML = '<tr class="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-md text-slate-600 dark:text-slate-300 text-[10px] font-mono font-extrabold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 select-none shadow-xs">' +
          '<th class="px-3 py-2 text-center w-12 min-w-[48px] bg-slate-100/95 dark:bg-slate-800/95">#</th>' +
          '<th class="px-3 py-2 w-24 min-w-[90px] whitespace-nowrap bg-slate-100/95 dark:bg-slate-800/95">Staff ID</th>' +
          '<th class="px-3 py-2 min-w-[220px] bg-slate-100/95 dark:bg-slate-800/95">Employee Name</th>' +
          '<th class="px-3 py-2 min-w-[180px] bg-slate-100/95 dark:bg-slate-800/95">Designation</th>' +
          '<th class="px-3 py-2 min-w-[180px] bg-slate-100/95 dark:bg-slate-800/95">Section / Line</th>' +
          '<th class="px-3 py-2 text-center min-w-[110px] whitespace-nowrap bg-slate-100/95 dark:bg-slate-800/95">DOJ</th>' +
          '<th class="px-3 py-2 text-right min-w-[135px] whitespace-nowrap text-slate-900 dark:text-white font-black bg-slate-100/95 dark:bg-slate-800/95">' + grossTitle + '</th>' +
          '<th class="px-3 py-2 text-right min-w-[130px] whitespace-nowrap bg-slate-100/95 dark:bg-slate-800/95">' + basicTitle + '</th>' +
          '<th class="px-3 py-2 text-right min-w-[140px] whitespace-nowrap bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-black">' + yearLabel + ' Increment (৳)</th>' +
          '<th class="px-3 py-2 text-center min-w-[95px] whitespace-nowrap bg-slate-100/95 dark:bg-slate-800/95">% of Basic</th>' +
          '<th class="px-3 py-2 text-center w-20 min-w-[80px] whitespace-nowrap bg-slate-100/95 dark:bg-slate-800/95">Status</th>' +
          '<th class="px-3 py-2 text-center w-16 min-w-[65px] whitespace-nowrap bg-slate-100/95 dark:bg-slate-800/95">Action</th>' +
          '</tr>';
      }
    }

    // 2. Empty State Check
    if (employees.length === 0) {
      var colSpan = isAll ? 16 : 12;
      tbody.innerHTML = '<tr><td colspan="' + colSpan + '" class="py-12 text-center text-slate-400 dark:text-slate-500">' +
        '<div class="flex flex-col items-center justify-center gap-2">' +
        '<i class="ph-bold ph-chart-line-down text-3xl text-slate-300 dark:text-slate-600"></i>' +
        '<span class="text-sm font-bold">No employee increment records match the selected filters.</span>' +
        '<button type="button" onclick="window.HRMIncrement.resetFilters()" class="mt-2 px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 shadow-xs cursor-pointer">Reset All Filters</button>' +
        '</div></td></tr>';
      if (tfoot) tfoot.innerHTML = '';
      var pSize = (f.perPage || f.per_page || 25);
      renderPagination(0, 1, pSize);
      return;
    }

    // 3. Pagination Slicing
    var total = employees.length;
    var perPageVal = f.perPage || f.per_page || 25;
    var perPage = perPageVal === 'ALL' ? total : parseInt(perPageVal, 10);
    var totalPages = Math.ceil(total / perPage);
    var page = Math.min(Math.max(f.page, 1), totalPages);
    state.filters.page = page;


    var startIdx = (page - 1) * perPage;
    var endIdx = Math.min(startIdx + perPage, total);
    var pagedData = employees.slice(startIdx, endIdx);

    // 4. Render Rows
    var html = '';
    pagedData.forEach(function (emp, index) {
      var rowNumber = startIdx + index + 1;
      var incInfo = getEmployeeIncrements(emp);
      var secStyle = getSectionStyle(emp.section);

      var st = (emp.status || 'Active').toLowerCase();
      var statusBadge = (st === 'active')
        ? '<span class="px-2 py-0.5 rounded-lg text-[10px] font-mono font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">Active</span>'
        : (st === 'hold')
          ? '<span class="px-2 py-0.5 rounded-lg text-[10px] font-mono font-extrabold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">Hold</span>'
          : '<span class="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">Inactive</span>';

      var dossierBtn = '<button type="button" onclick="window.HRMManpower.openDossier(' + emp.sl_no + ')" class="w-6 h-6 rounded-md bg-purple-500/10 hover:bg-purple-600 text-purple-600 hover:text-white dark:text-purple-400 dark:hover:text-white border border-purple-500/20 flex items-center justify-center text-xs transition-colors cursor-pointer shadow-2xs" title="View Full Dossier">' +
        '<i class="ph-bold ph-eye"></i>' +
        '</button>';

      var staffIdCapsule = '<span class="px-2 py-0.5 rounded-lg text-xs font-mono font-black bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs inline-flex items-center gap-1 cursor-pointer" onclick="window.HRMManpower.openDossier(' + emp.sl_no + ')" title="View Dossier">' +
        '<i class="ph-bold ph-identification-card text-[10px] text-emerald-400 dark:text-emerald-600"></i>' + emp.staff_id +
        '</span>';

      html += '<tr class="border-b border-slate-200/70 dark:border-slate-800/80 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors group">' +
        '<td class="px-3 py-1.5 font-mono text-xs text-slate-400 dark:text-slate-500 text-center select-none whitespace-nowrap">' + rowNumber + '</td>' +
        '<td class="px-3 py-1.5 whitespace-nowrap">' + staffIdCapsule + '</td>' +
        '<td class="px-3 py-1.5 min-w-[200px]">' +
        '<button type="button" onclick="window.HRMManpower.openDossier(' + emp.sl_no + ')" class="font-bold text-xs text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 text-left truncate block max-w-[190px] cursor-pointer leading-tight">' +
        (emp.name || '—') +
        '</button>' +
        '</td>' +
        '<td class="px-3 py-1.5 min-w-[170px]">' +
        '<span class="font-bold text-xs text-slate-800 dark:text-slate-200 block truncate max-w-[170px] leading-tight">' + (emp.designation || '—') + '</span>' +
        '</td>' +
        '<td class="px-3 py-1.5 whitespace-nowrap min-w-[180px]">' +
        '<span class="px-2 py-0.5 rounded-lg text-[11px] font-bold border inline-flex items-center gap-1 shadow-2xs ' + secStyle.bg + '">' +
        '<i class="ph-bold ' + secStyle.icon + ' text-[11px]"></i>' +
        '<span class="truncate max-w-[160px]">' + (emp.section || '—') + '</span>' +
        '</span>' +
        '</td>' +
        '<td class="px-3 py-1.5 text-center text-xs font-mono whitespace-nowrap text-slate-700 dark:text-slate-300">' + (emp.doj || '—') + '</td>';

      if (isAll) {
        html += '<td class="px-3 py-1.5 text-right font-mono font-bold text-xs whitespace-nowrap text-slate-900 dark:text-white">' + formatMoney(emp.gross_salary) + '</td>';
        YEARS.forEach(function (y) {
          var amt = incInfo.yearly[y];
          if (amt > 0) {
            var colorClass = (y === '2026' || y === '2025')
              ? 'font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/5'
              : 'font-bold text-slate-700 dark:text-slate-300';
            html += '<td class="px-2.5 py-1.5 text-right font-mono text-xs whitespace-nowrap ' + colorClass + '">৳' + Math.round(amt).toLocaleString() + '</td>';
          } else {
            html += '<td class="px-2.5 py-1.5 text-right text-xs text-slate-300 dark:text-slate-600 select-none">—</td>';
          }
        });

        // Total Increment Pill
        var totalClass = incInfo.total > 0
          ? 'font-mono font-black text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-l border-r border-emerald-500/20'
          : 'text-xs text-slate-400';
        html += '<td class="px-3 py-1.5 text-right whitespace-nowrap ' + totalClass + '">' + (incInfo.total > 0 ? formatMoney(incInfo.total) : '—') + '</td>';
      } else {
        var sal = getEmployeeSalaryForYear(emp, state.selectedYear);
        var selectedInc = sal.increment;
        var pct = sal.basic > 0 && selectedInc > 0 ? ((selectedInc / sal.basic) * 100).toFixed(1) + '%' : '—';

        html += '<td class="px-3 py-1.5 text-right font-mono font-bold text-xs whitespace-nowrap text-slate-900 dark:text-white">' + formatMoney(sal.gross) + '</td>' +
          '<td class="px-3 py-1.5 text-right font-mono text-xs whitespace-nowrap text-slate-600 dark:text-slate-400">' + formatMoney(sal.basic) + '</td>' +
          '<td class="px-3 py-1.5 text-right font-mono font-black text-xs whitespace-nowrap bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">' +
          (selectedInc > 0 ? '+৳' + Math.round(selectedInc).toLocaleString() : '—') +
          '</td>' +
          '<td class="px-3 py-1.5 text-center font-mono text-xs whitespace-nowrap text-emerald-600 dark:text-emerald-400 font-bold">' + pct + '</td>';
      }

      html += '<td class="px-3 py-1.5 text-center whitespace-nowrap">' + statusBadge + '</td>' +
        '<td class="px-3 py-1.5 text-center whitespace-nowrap">' + dossierBtn + '</td>' +
        '</tr>';
    });

    tbody.innerHTML = html;

    // 5. Render Totals Footer
    renderTotalsFooter(tfoot, isAll, employees);
    renderPagination(total, page, perPage);
  }

  function renderTotalsFooter(tfoot, isAll, employees) {
    if (!tfoot) return;

    var sumGross = 0;
    var sumBasic = 0;
    var sumYears = { '2021': 0, '2022': 0, '2023': 0, '2024': 0, '2025': 0, '2026': 0 };
    var sumGrand = 0;

    employees.forEach(function (emp) {
      if (isAll) {
        sumGross += Number(emp.gross_salary) || 0;
        sumBasic += Number(emp.basic_salary) || 0;
      } else {
        var sal = getEmployeeSalaryForYear(emp, state.selectedYear);
        sumGross += sal.gross;
        sumBasic += sal.basic;
      }
      var incInfo = getEmployeeIncrements(emp);
      sumGrand += incInfo.total;
      YEARS.forEach(function (y) {
        sumYears[y] += incInfo.yearly[y];
      });
    });

    // Make tfoot sticky bottom with freeze down styling
    tfoot.className = 'sticky bottom-0 z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.12)]';

    var cellBg = 'bg-emerald-100/95 dark:bg-[#062c21]/95 backdrop-blur-md sticky bottom-0 z-20';

    var fHtml = '<tr class="sticky bottom-0 z-20 font-mono text-xs border-t-2 border-emerald-500 text-slate-900 dark:text-white select-none font-bold">' +
      '<td colspan="6" class="px-3 py-2 text-center font-black uppercase text-[11px] text-emerald-800 dark:text-emerald-300 ' + cellBg + '">TOTAL (' + employees.length + ' EMPLOYEES)</td>' +
      '<td class="px-3 py-2 text-right font-black whitespace-nowrap ' + cellBg + '">' + formatMoney(sumGross) + '</td>';

    if (isAll) {
      YEARS.forEach(function (y) {
        fHtml += '<td class="px-2.5 py-2 text-right font-black whitespace-nowrap text-purple-700 dark:text-purple-300 ' + cellBg + '">৳' + Math.round(sumYears[y]).toLocaleString() + '</td>';
      });
      fHtml += '<td class="px-3 py-2 text-right font-black whitespace-nowrap text-emerald-700 dark:text-emerald-300 bg-emerald-500/20 text-sm ' + cellBg + '">' + formatMoney(sumGrand) + '</td>' +
        '<td colspan="2" class="px-3 py-2 ' + cellBg + '"></td>';
    } else {
      var selInc = sumYears[state.selectedYear] || 0;
      var avgPct = sumBasic > 0 && selInc > 0 ? ((selInc / sumBasic) * 100).toFixed(1) + '%' : '—';
      fHtml += '<td class="px-3 py-2 text-right font-bold whitespace-nowrap text-slate-700 dark:text-slate-300 ' + cellBg + '">' + formatMoney(sumBasic) + '</td>' +
        '<td class="px-3 py-2 text-right font-black whitespace-nowrap text-emerald-700 dark:text-emerald-300 bg-emerald-500/25 text-sm ' + cellBg + '">৳' + Math.round(selInc).toLocaleString() + '</td>' +
        '<td class="px-3 py-2 text-center font-black text-emerald-600 dark:text-emerald-400 ' + cellBg + '">' + avgPct + '</td>' +
        '<td colspan="2" class="px-3 py-2 ' + cellBg + '"></td>';
    }

    fHtml += '</tr>';
    tfoot.innerHTML = fHtml;
  }

  function renderPagination(total, currentPage, perPage) {
    var container = document.getElementById('inc-pagination-controls');
    var infoText = document.getElementById('inc-pagination-info');
    if (!container) return;

    if (total === 0) {
      if (infoText) infoText.textContent = 'Showing 0 of 0 employees';
      container.innerHTML = '';
      return;
    }

    var pPage = perPage === 'ALL' ? total : parseInt(perPage, 10);
    var totalPages = Math.ceil(total / pPage);
    var startIdx = (currentPage - 1) * pPage + 1;
    var endIdx = Math.min(startIdx + pPage - 1, total);

    if (infoText) {
      infoText.textContent = 'Showing ' + startIdx + '–' + endIdx + ' of ' + total + ' employees';
    }

    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    var html = '<div class="flex items-center gap-1 select-none">';

    // Previous Button
    html += '<button type="button" onclick="window.HRMIncrement.setPage(' + (currentPage - 1) + ')" ' +
      (currentPage === 1 ? 'disabled class="opacity-40 cursor-not-allowed ' : 'class="hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer ') +
      'px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors">' +
      '<i class="ph-bold ph-caret-left"></i></button>';

    // Page numbers with ellipsis
    var startP = Math.max(1, currentPage - 2);
    var endP = Math.min(totalPages, currentPage + 2);

    if (startP > 1) {
      html += '<button type="button" onclick="window.HRMIncrement.setPage(1)" class="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer">1</button>';
      if (startP > 2) html += '<span class="px-1 text-slate-400">…</span>';
    }

    for (var p = startP; p <= endP; p++) {
      var isCur = p === currentPage;
      html += '<button type="button" onclick="window.HRMIncrement.setPage(' + p + ')" class="px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ' +
        (isCur ? 'bg-emerald-600 text-white shadow-xs' : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700') + '">' + p + '</button>';
    }

    if (endP < totalPages) {
      if (endP < totalPages - 1) html += '<span class="px-1 text-slate-400">…</span>';
      html += '<button type="button" onclick="window.HRMIncrement.setPage(' + totalPages + ')" class="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer">' + totalPages + '</button>';
    }

    // Next Button
    html += '<button type="button" onclick="window.HRMIncrement.setPage(' + (currentPage + 1) + ')" ' +
      (currentPage === totalPages ? 'disabled class="opacity-40 cursor-not-allowed ' : 'class="hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer ') +
      'px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors">' +
      '<i class="ph-bold ph-caret-right"></i></button>';

    html += '</div>';
    container.innerHTML = html;
  }

  function updateExportButtonBadge() {
    var badge = document.getElementById('inc-excel-count-badge');
    if (badge) {
      badge.textContent = state.filteredEmployees.length;
    }
  }

  // -------------------------------------------------------------
  // Excel Export Engine (With Full Grid Borders)
  // -------------------------------------------------------------
  function exportIncrementExcel() {
    var items = state.filteredEmployees;
    if (!items || items.length === 0) {
      if (window.showHRToast) window.showHRToast('No employee increment records to export.');
      return;
    }

    var btn = document.getElementById('btn-export-increment-excel');
    var originalHTML = btn ? btn.innerHTML : '';
    if (btn) {
      btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin text-sm"></i> Generating Excel...';
      btn.disabled = true;
    }

    var payload = {
      items: items,
      selected_year: state.selectedYear,
      filter_title: 'Year: ' + state.selectedYear + ' | Section: ' + state.filters.section + ' | Status: ' + state.filters.status,
      search_term: state.filters.search || ''
    };

    fetch('/api/export/hrm-increment-excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Server export returned status ' + res.status);
        return res.blob();
      })
      .then(function (blob) {
        var url = window.URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        var dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        a.download = 'MEP_HRM_Yearly_Increment_' + state.selectedYear + '_' + dateStr + '.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        if (window.showHRToast) window.showHRToast('Excel report downloaded with full cell borders!');
      })
      .catch(function (err) {
        console.warn('Backend excel export failed, falling back to client-side bordered export:', err);
        exportIncrementExcelFallback(items);
      })
      .finally(function () {
        if (btn) {
          btn.innerHTML = originalHTML;
          btn.disabled = false;
        }
      });
  }

  function exportIncrementExcelFallback(items) {
    var isAll = state.selectedYear === 'ALL';
    var title = 'MEP FAN LTD - EMPLOYEE YEARLY INCREMENT REGISTER (' + state.selectedYear + ')';
    var genTime = new Date().toLocaleString();

    if (typeof XLSX !== 'undefined') {
      var headers = isAll
        ? ['SL', 'Staff ID', 'Employee Name', 'Designation', 'Section / Line', 'DOJ', 'Present Gross (Tk)', '2021 Inc (Tk)', '2022 Inc (Tk)', '2023 Inc (Tk)', '2024 Inc (Tk)', '2025 Inc (Tk)', '2026 Inc (Tk)', 'Total Inc (Tk)', 'Status']
        : ['SL', 'Staff ID', 'Employee Name', 'Designation', 'Section / Line', 'DOJ', state.selectedYear + ' Gross (Tk)', state.selectedYear + ' Basic (Tk)', state.selectedYear + ' Increment (Tk)', 'Status'];

      var rows = [
        ['MEP GROUP • CEILING FAN FACTORY (PLANT 1027)'],
        ['HUMAN RESOURCE MANAGEMENT • YEARLY INCREMENT REGISTER (' + state.selectedYear + ')'],
        ['Filter: Section ' + state.filters.section + ' | Status ' + state.filters.status + ' | Verified By: Senior Manager Md. Saiful Islam | Records: ' + items.length],
        headers
      ];

      var sumGross = 0;
      var sumBasic = 0;
      var sumGrand = 0;
      var sumYears = { '2021': 0, '2022': 0, '2023': 0, '2024': 0, '2025': 0, '2026': 0 };

      items.forEach(function (emp, idx) {
        var inc = getEmployeeIncrements(emp);
        var g = 0, b = 0;
        if (isAll) {
          g = Number(emp.gross_salary) || 0;
          b = Number(emp.basic_salary) || 0;
        } else {
          var sal = getEmployeeSalaryForYear(emp, state.selectedYear);
          g = sal.gross;
          b = sal.basic;
        }
        sumGross += g;
        sumBasic += b;
        sumGrand += inc.total;
        YEARS.forEach(function (y) { sumYears[y] += inc.yearly[y]; });

        if (isAll) {
          rows.push([
            idx + 1,
            emp.staff_id || '',
            emp.name || '',
            emp.designation || '',
            emp.section || '',
            emp.doj || '',
            g,
            inc.yearly['2021'] || 0,
            inc.yearly['2022'] || 0,
            inc.yearly['2023'] || 0,
            inc.yearly['2024'] || 0,
            inc.yearly['2025'] || 0,
            inc.yearly['2026'] || 0,
            inc.total || 0,
            emp.status || 'Active'
          ]);
        } else {
          rows.push([
            idx + 1,
            emp.staff_id || '',
            emp.name || '',
            emp.designation || '',
            emp.section || '',
            emp.doj || '',
            g,
            b,
            inc.yearly[state.selectedYear] || 0,
            emp.status || 'Active'
          ]);
        }
      });

      // Total row
      if (isAll) {
        rows.push([
          'TOTAL (' + items.length + ' EMPLOYEES)', '', '', '', '', '',
          sumGross,
          sumYears['2021'], sumYears['2022'], sumYears['2023'], sumYears['2024'], sumYears['2025'], sumYears['2026'],
          sumGrand, 'Verified'
        ]);
      } else {
        rows.push([
          'TOTAL (' + items.length + ' EMPLOYEES)', '', '', '', '', '',
          sumGross, sumBasic, sumYears[state.selectedYear] || 0, 'Verified'
        ]);
      }

      var wb = XLSX.utils.book_new();
      var ws = XLSX.utils.aoa_to_sheet(rows);
      var lastCol = headers.length - 1;

      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: lastCol } },
        { s: { r: rows.length - 1, c: 0 }, e: { r: rows.length - 1, c: 5 } }
      ];

      var thinBorder = {
        top: { style: 'thin', color: { rgb: 'CBD5E1' } },
        bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
        left: { style: 'thin', color: { rgb: 'CBD5E1' } },
        right: { style: 'thin', color: { rgb: 'CBD5E1' } }
      };

      var range = XLSX.utils.decode_range(ws['!ref']);
      for (var R = range.s.r; R <= range.e.r; ++R) {
        for (var C = range.s.c; C <= range.e.c; ++C) {
          var cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellRef]) ws[cellRef] = { v: '', t: 's' };
          var cell = ws[cellRef];

          if (R === 0) {
            cell.s = {
              font: { name: 'Segoe UI', sz: 13, bold: true, color: { rgb: 'FFFFFF' } },
              fill: { fgColor: { rgb: '1E1B4B' } },
              alignment: { horizontal: 'center', vertical: 'center' },
              border: thinBorder
            };
          } else if (R === 1) {
            cell.s = {
              font: { name: 'Segoe UI', sz: 10.5, bold: true, color: { rgb: 'FFFFFF' } },
              fill: { fgColor: { rgb: '334155' } },
              alignment: { horizontal: 'center', vertical: 'center' },
              border: thinBorder
            };
          } else if (R === 2) {
            cell.s = {
              font: { name: 'Segoe UI', sz: 9, bold: true, color: { rgb: '1E293B' }, italic: true },
              fill: { fgColor: { rgb: 'F1F5F9' } },
              alignment: { horizontal: 'center', vertical: 'center' },
              border: thinBorder
            };
          } else if (R === 3) {
            cell.s = {
              font: { name: 'Segoe UI', sz: 9.5, bold: true, color: { rgb: 'FFFFFF' } },
              fill: { fgColor: { rgb: '047857' } },
              alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
              border: thinBorder
            };
          } else if (R === range.e.r) {
            cell.s = {
              font: { name: 'Segoe UI', sz: 9.5, bold: true, color: { rgb: '064E3B' } },
              fill: { fgColor: { rgb: 'E2E8F0' } },
              alignment: { horizontal: (C >= 6 && C < lastCol) ? 'right' : 'center', vertical: 'center' },
              border: {
                top: { style: 'thin', color: { rgb: '0F172A' } },
                bottom: { style: 'double', color: { rgb: '0F172A' } },
                left: { style: 'thin', color: { rgb: 'CBD5E1' } },
                right: { style: 'thin', color: { rgb: 'CBD5E1' } }
              }
            };
            if (C >= 6 && C < lastCol) cell.z = '#,##0.00';
          } else {
            var isEven = (R % 2 === 0);
            var bg = isEven ? 'FFFFFF' : 'F8FAFC';
            var align = 'left';
            if (C === 0 || C === 1 || C === 5 || C === lastCol) align = 'center';
            else if (C >= 6) align = 'right';

            cell.s = {
              font: { name: 'Segoe UI', sz: 9, color: { rgb: '0F172A' }, bold: (C === 1 || (isAll && C === 13) || (!isAll && C === 8)) },
              fill: { fgColor: { rgb: bg } },
              alignment: { horizontal: align, vertical: 'center' },
              border: thinBorder
            };
            if (C >= 6 && typeof cell.v === 'number') cell.z = '#,##0.00';
          }
        }
      }

      var xlsxFilename = 'MEP_HRM_Yearly_Increment_' + state.selectedYear + '_' + new Date().toISOString().slice(0, 10) + '.xlsx';
      XLSX.utils.book_append_sheet(wb, ws, 'Increment_' + state.selectedYear);
      XLSX.writeFile(wb, xlsxFilename);
      if (window.showHRToast) window.showHRToast('ইনক্রিমেন্ট রেজিস্টার প্রিমিয়াম Excel ফাইল সম্পূর্ণ বর্ডার সহ ডাউনলোড হয়েছে!');
      return;
    }

    var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">' +
      '<head><meta charset="utf-8"/><style>' +
      'table { border-collapse: collapse; font-family: "Segoe UI", Arial, sans-serif; }' +
      'th, td { border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 11px; }' +
      'th { background-color: #064e3b; color: #ffffff; font-weight: bold; text-align: center; border: 1px solid #0f172a; }' +
      '.total-row td { background-color: #ecfdf5; font-weight: bold; border-top: 1px solid #0f172a; border-bottom: 3px double #0f172a; color: #064e3b; }' +
      '.text-left { text-align: left; } .text-right { text-align: right; } .text-center { text-align: center; }' +
      '.num-col { mso-number-format:"\\#,\\#\\#0\\.00"; }' +
      '</style></head><body>' +
      '<h3>' + title + '</h3>' +
      '<p>Exported: ' + genTime + ' | Total Records: ' + items.length + '</p>' +
      '<table><thead><tr>';

    if (isAll) {
      html += '<th>SL</th><th>Staff ID</th><th>Employee Name</th><th>Designation</th><th>Section</th><th>DOJ</th><th>Present Gross</th>' +
        '<th>2021 Inc</th><th>2022 Inc</th><th>2023 Inc</th><th>2024 Inc</th><th>2025 Inc</th><th>2026 Inc</th><th>Total Inc</th><th>Status</th>';
    } else {
      html += '<th>SL</th><th>Staff ID</th><th>Employee Name</th><th>Designation</th><th>Section</th><th>DOJ</th><th>' + state.selectedYear + ' Gross</th>' +
        '<th>' + state.selectedYear + ' Basic</th><th>' + state.selectedYear + ' Increment</th><th>Status</th>';
    }
    html += '</tr></thead><tbody>';

    var sumGross = 0;
    var sumBasic = 0;
    var sumGrand = 0;
    var sumYears = { '2021': 0, '2022': 0, '2023': 0, '2024': 0, '2025': 0, '2026': 0 };

    items.forEach(function (emp, idx) {
      var inc = getEmployeeIncrements(emp);
      var g = 0, b = 0;
      if (isAll) {
        g = Number(emp.gross_salary) || 0;
        b = Number(emp.basic_salary) || 0;
      } else {
        var sal = getEmployeeSalaryForYear(emp, state.selectedYear);
        g = sal.gross;
        b = sal.basic;
      }
      sumGross += g;
      sumBasic += b;
      sumGrand += inc.total;
      YEARS.forEach(function (y) { sumYears[y] += inc.yearly[y]; });

      html += '<tr>' +
        '<td class="text-center">' + (idx + 1) + '</td>' +
        '<td class="text-center">' + (emp.staff_id || '') + '</td>' +
        '<td class="text-left">' + (emp.name || '') + '</td>' +
        '<td class="text-left">' + (emp.designation || '') + '</td>' +
        '<td class="text-left">' + (emp.section || '') + '</td>' +
        '<td class="text-center">' + (emp.doj || '') + '</td>' +
        '<td class="text-right num-col">' + g.toFixed(2) + '</td>';

      if (isAll) {
        YEARS.forEach(function (y) {
          html += '<td class="text-right num-col">' + (inc.yearly[y] > 0 ? inc.yearly[y].toFixed(2) : '-') + '</td>';
        });
        html += '<td class="text-right num-col" style="font-weight:bold; color:#059669;">' + (inc.total > 0 ? inc.total.toFixed(2) : '-') + '</td>';
      } else {
        html += '<td class="text-right num-col">' + b.toFixed(2) + '</td>' +
          '<td class="text-right num-col" style="font-weight:bold; color:#059669;">' + (inc.yearly[state.selectedYear] > 0 ? inc.yearly[state.selectedYear].toFixed(2) : '-') + '</td>';
      }

      html += '<td class="text-center">' + (emp.status || 'Active') + '</td></tr>';
    });

    html += '<tr class="total-row">' +
      '<td colspan="6" class="text-center">TOTAL (' + items.length + ' EMPLOYEES)</td>' +
      '<td class="text-right num-col">' + sumGross.toFixed(2) + '</td>';

    if (isAll) {
      YEARS.forEach(function (y) {
        html += '<td class="text-right num-col">' + sumYears[y].toFixed(2) + '</td>';
      });
      html += '<td class="text-right num-col">' + sumGrand.toFixed(2) + '</td><td></td>';
    } else {
      html += '<td class="text-right num-col">' + sumBasic.toFixed(2) + '</td>' +
        '<td class="text-right num-col">' + (sumYears[state.selectedYear] || 0).toFixed(2) + '</td><td></td>';
    }

    html += '</tr></tbody></table></body></html>';

    var blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'MEP_HRM_Increment_' + state.selectedYear + '_' + new Date().toISOString().slice(0, 10) + '.xls';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (window.showHRToast) window.showHRToast('Client-side bordered Excel report downloaded!');
  }

  // -------------------------------------------------------------
  // Premium PDF Export Functionality (.pdf) - Executive Grid Layout
  // -------------------------------------------------------------
  function exportIncrementPDF() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      if (window.showHRToast) window.showHRToast('PDF লাইব্রেরি লোড হচ্ছে, প্রিন্ট ডায়ালগ ওপেন করা হচ্ছে...');
      window.print();
      return;
    }

    var items = state.filteredEmployees;
    if (!items || items.length === 0) {
      if (window.showHRToast) window.showHRToast('কোনো ইনক্রিমেন্ট তথ্য পাওয়া যায়নি।');
      return;
    }

    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    var isAll = state.selectedYear === 'ALL';
    var dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    var timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // 1. Executive Top Banner
    doc.setFillColor(30, 27, 75); // #1E1B4B
    doc.rect(10, 8, 277, 21, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('MEP GROUP — CEILING FAN FACTORY (PLANT 1027)', 14, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(209, 213, 219);
    doc.text('HRM YEARLY EMPLOYEE INCREMENT REGISTER (' + state.selectedYear + ')', 14, 23);

    // Right Telemetry Badge
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(218, 10, 65, 17, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('TOTAL PERSONNEL', 222, 15);
    doc.setFontSize(12);
    doc.setTextColor(52, 211, 153);
    doc.text(items.length + ' STAFF', 222, 23);

    // 2. Verified Meta Ribbon
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(10, 31, 277, 8, 1, 1, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Year: ' + state.selectedYear + ' | Section: ' + (state.filters.section || 'ALL').toUpperCase() + ' | Status: ' + (state.filters.status || 'ALL').toUpperCase(), 14, 36.5);
    doc.text('Verified By: Senior Manager Md. Saiful Islam', 125, 36.5);
    doc.text('Generated: ' + dateStr + ' ' + timeStr, 220, 36.5);

    // 3. Table Structure via AutoTable
    var head, colStyles;
    var sumGross = 0;
    var sumBasic = 0;
    var sumGrand = 0;
    var sumYears = { '2021': 0, '2022': 0, '2023': 0, '2024': 0, '2025': 0, '2026': 0 };

    if (isAll) {
      head = [[
        'SL', 'Staff ID', 'Employee Name', 'Designation', 'Section', 'DOJ',
        'Present Gross', '2021', '2022', '2023', '2024', '2025', '2026', 'Total Inc', 'Status'
      ]];
      colStyles = {
        0: { halign: 'center', cellWidth: 8 },
        1: { halign: 'center', cellWidth: 16, fontStyle: 'bold' },
        2: { cellWidth: 32 },
        3: { cellWidth: 24 },
        4: { cellWidth: 28 },
        5: { halign: 'center', cellWidth: 16 },
        6: { halign: 'right', cellWidth: 20, fontStyle: 'bold' },
        7: { halign: 'right', cellWidth: 13 },
        8: { halign: 'right', cellWidth: 13 },
        9: { halign: 'right', cellWidth: 13 },
        10: { halign: 'right', cellWidth: 13 },
        11: { halign: 'right', cellWidth: 13 },
        12: { halign: 'right', cellWidth: 13 },
        13: { halign: 'right', cellWidth: 18, fontStyle: 'bold', textColor: [5, 150, 105] },
        14: { halign: 'center', cellWidth: 15 }
      };
    } else {
      head = [[
        'SL', 'Staff ID', 'Employee Name', 'Designation', 'Section / Line', 'DOJ',
        state.selectedYear + ' Gross (Tk)', state.selectedYear + ' Basic (Tk)', state.selectedYear + ' Increment (Tk)', 'Status'
      ]];
      colStyles = {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
        2: { cellWidth: 42 },
        3: { cellWidth: 34 },
        4: { cellWidth: 38 },
        5: { halign: 'center', cellWidth: 20 },
        6: { halign: 'right', cellWidth: 30, fontStyle: 'bold' },
        7: { halign: 'right', cellWidth: 28 },
        8: { halign: 'right', cellWidth: 32, fontStyle: 'bold', textColor: [5, 150, 105] },
        9: { halign: 'center', cellWidth: 20 }
      };
    }

    var body = items.map(function (emp, idx) {
      var inc = getEmployeeIncrements(emp);
      var g = 0, b = 0;
      if (isAll) {
        g = Number(emp.gross_salary) || 0;
        b = Number(emp.basic_salary) || 0;
      } else {
        var sal = getEmployeeSalaryForYear(emp, state.selectedYear);
        g = sal.gross;
        b = sal.basic;
      }
      sumGross += g;
      sumBasic += b;
      sumGrand += inc.total;
      YEARS.forEach(function (y) { sumYears[y] += inc.yearly[y]; });

      if (isAll) {
        return [
          idx + 1,
          emp.staff_id || '',
          emp.name || '',
          emp.designation || '',
          emp.section || '',
          emp.doj || '',
          g > 0 ? g.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—',
          inc.yearly['2021'] > 0 ? inc.yearly['2021'].toLocaleString('en-US') : '—',
          inc.yearly['2022'] > 0 ? inc.yearly['2022'].toLocaleString('en-US') : '—',
          inc.yearly['2023'] > 0 ? inc.yearly['2023'].toLocaleString('en-US') : '—',
          inc.yearly['2024'] > 0 ? inc.yearly['2024'].toLocaleString('en-US') : '—',
          inc.yearly['2025'] > 0 ? inc.yearly['2025'].toLocaleString('en-US') : '—',
          inc.yearly['2026'] > 0 ? inc.yearly['2026'].toLocaleString('en-US') : '—',
          inc.total > 0 ? inc.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—',
          emp.status || 'Active'
        ];
      } else {
        return [
          idx + 1,
          emp.staff_id || '',
          emp.name || '',
          emp.designation || '',
          emp.section || '',
          emp.doj || '',
          g > 0 ? g.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—',
          b > 0 ? b.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—',
          (inc.yearly[state.selectedYear] > 0) ? inc.yearly[state.selectedYear].toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—',
          emp.status || 'Active'
        ];
      }
    });

    // Summary footer row
    var foot;
    if (isAll) {
      foot = [[
        { content: 'TOTAL (' + items.length + ' EMPLOYEES)', colSpan: 6, styles: { halign: 'left', fontStyle: 'bold' } },
        { content: sumGross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold' } },
        { content: sumYears['2021'].toLocaleString('en-US'), styles: { halign: 'right' } },
        { content: sumYears['2022'].toLocaleString('en-US'), styles: { halign: 'right' } },
        { content: sumYears['2023'].toLocaleString('en-US'), styles: { halign: 'right' } },
        { content: sumYears['2024'].toLocaleString('en-US'), styles: { halign: 'right' } },
        { content: sumYears['2025'].toLocaleString('en-US'), styles: { halign: 'right' } },
        { content: sumYears['2026'].toLocaleString('en-US'), styles: { halign: 'right' } },
        { content: sumGrand.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold' } },
        { content: 'Verified', styles: { halign: 'center' } }
      ]];
    } else {
      foot = [[
        { content: 'TOTAL (' + items.length + ' EMPLOYEES)', colSpan: 6, styles: { halign: 'left', fontStyle: 'bold' } },
        { content: sumGross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold' } },
        { content: sumBasic.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold' } },
        { content: (sumYears[state.selectedYear] || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold' } },
        { content: 'Verified', styles: { halign: 'center' } }
      ]];
    }

    doc.autoTable({
      head: head,
      body: body,
      foot: foot,
      startY: 41,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 7,
        cellPadding: 1.5,
        overflow: 'linebreak',
        valign: 'middle',
        lineColor: [203, 213, 225],
        lineWidth: 0.15
      },
      headStyles: {
        fillColor: [4, 120, 87], // Deep Emerald
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.2,
        halign: 'center',
        lineColor: [2, 44, 34],
        lineWidth: 0.2
      },
      footStyles: {
        fillColor: [226, 232, 240],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 7.2,
        lineColor: [100, 116, 139],
        lineWidth: 0.2
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: colStyles,
      didDrawPage: function (data) {
        var pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text('MEP GROUP • HRM Increment Register Document | Confidential & Proprietary', 10, pageHeight - 6);
        doc.text('Page ' + data.pageNumber, 280, pageHeight - 6, { align: 'right' });
      }
    });

    // 4. Verification Sign-Off Blocks on last page
    var finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 12 : 180;
    var pageHeight = doc.internal.pageSize.height;
    if (finalY + 18 < pageHeight) {
      doc.setDrawColor(203, 213, 225);
      doc.line(14, finalY + 8, 64, finalY + 8);
      doc.line(114, finalY + 8, 174, finalY + 8);
      doc.line(220, finalY + 8, 275, finalY + 8);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Prepared By (HR Executive)', 18, finalY + 13);
      doc.text('Verified By: Md. Saiful Islam (Senior Manager)', 116, finalY + 13);
      doc.text('Approved By (Factory In-Charge)', 224, finalY + 13);
    }

    var pdfFilename = 'MEP_HRM_Yearly_Increment_' + state.selectedYear + '_' + new Date().toISOString().slice(0, 10) + '.pdf';
    doc.save(pdfFilename);

    if (window.showHRToast) {
      window.showHRToast('ইনক্রিমেন্ট রেজিস্টার প্রিমিয়াম PDF সম্পূর্ণ বর্ডার সহ ডাউনলোড হয়েছে!');
    }
  }

  function exportIncrementCSV() {
    var items = state.filteredEmployees;
    if (!items || items.length === 0) return;

    var isAll = state.selectedYear === 'ALL';
    var headers = isAll
      ? ["SL", "Staff ID", "Employee Name", "Designation", "Section", "DOJ", "Present Gross", "2021 Inc", "2022 Inc", "2023 Inc", "2024 Inc", "2025 Inc", "2026 Inc", "Total Inc", "Status"]
      : ["SL", "Staff ID", "Employee Name", "Designation", "Section", "DOJ", state.selectedYear + " Gross", state.selectedYear + " Basic", state.selectedYear + " Increment", "Status"];

    var rows = [headers];

    items.forEach(function (emp, idx) {
      var inc = getEmployeeIncrements(emp);
      if (isAll) {
        rows.push([
          idx + 1,
          emp.staff_id || '',
          '"' + (emp.name || '').replace(/"/g, '""') + '"',
          '"' + (emp.designation || '').replace(/"/g, '""') + '"',
          '"' + (emp.section || '').replace(/"/g, '""') + '"',
          emp.doj || '',
          emp.gross_salary || 0,
          inc.yearly['2021'] || 0,
          inc.yearly['2022'] || 0,
          inc.yearly['2023'] || 0,
          inc.yearly['2024'] || 0,
          inc.yearly['2025'] || 0,
          inc.yearly['2026'] || 0,
          inc.total,
          emp.status || 'Active'
        ]);
      } else {
        var sal = getEmployeeSalaryForYear(emp, state.selectedYear);
        rows.push([
          idx + 1,
          emp.staff_id || '',
          '"' + (emp.name || '').replace(/"/g, '""') + '"',
          '"' + (emp.designation || '').replace(/"/g, '""') + '"',
          '"' + (emp.section || '').replace(/"/g, '""') + '"',
          emp.doj || '',
          sal.gross,
          sal.basic,
          sal.increment,
          emp.status || 'Active'
        ]);
      }
    });

    var csvContent = '\uFEFF' + rows.map(function (e) { return e.join(','); }).join('\n');
    var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'MEP_HRM_Increment_' + state.selectedYear + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // -------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------
  window.HRMIncrement = {
    init: initData,
    render: function () {
      if (state.allEmployees.length === 0) {
        initData();
      } else {
        renderAll();
      }
    },
    setYear: function (year) {
      state.selectedYear = year;
      applyFilters();
    },
    onSearchInput: function (val) {
      state.filters.search = val;
      applyFilters();
    },
    onSectionChange: function (val) {
      state.filters.section = val;
      applyFilters();
    },
    onStatusChange: function (val) {
      state.filters.status = val;
      applyFilters();
    },
    toggleBeneficiariesOnly: function (checked) {
      state.filters.beneficiariesOnly = checked;
      applyFilters();
    },
    onSortChange: function (val) {
      state.filters.sortBy = val;
      applyFilters();
    },
    setPerPage: function (val) {
      state.filters.perPage = val;
      applyFilters();
    },
    setPage: function (page) {
      state.filters.page = page;
      renderTable();
      var table = document.getElementById('yearly-increment-table-card');
      if (table) table.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    resetFilters: function () {
      state.selectedYear = 'ALL';
      state.filters.search = '';
      state.filters.section = 'ALL';
      state.filters.status = 'ALL';
      state.filters.beneficiariesOnly = true;
      state.filters.sortBy = 'total_increment';
      state.filters.sortDir = 'desc';
      state.filters.page = 1;

      var searchEl = document.getElementById('inc-search-input');
      if (searchEl) searchEl.value = '';
      var secEl = document.getElementById('inc-filter-section');
      if (secEl) secEl.value = 'ALL';
      var stEl = document.getElementById('inc-filter-status');
      if (stEl) stEl.value = 'ALL';
      var chkEl = document.getElementById('inc-filter-beneficiary-toggle');
      if (chkEl) chkEl.checked = true;

      applyFilters();
      if (window.showHRToast) window.showHRToast('Increment filters reset.');
    },
    exportExcel: exportIncrementExcel,
    exportPDF: exportIncrementPDF,
    exportCSV: exportIncrementCSV
  };

  // Auto-init on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(initData, 200);
  });

})();
