/**
 * MEP GROUP - Enterprise Human Resource Management (HRM)
 * Section Wise Monthly Salary & Overtime Analytics Module
 * Feature: "Section Wise Monthly Salary 8H"
 * Columns:
 *   - SL No
 *   - Section Name
 *   - Total Staff (Active Headcount)
 *   - 8 Hour as Salary (Monthly Gross Base)
 *   - 3 Hour OT (Standard 26 Days x 3H = 78h Overtime at Double Basic Rate)
 *   - Total Salary & OT (Base Gross + Overtime Payout)
 *   - Avg Cost / Head
 *   - % Share of Total Payroll
 *   - Action (Staff Roster Drill-Down Modal)
 * 
 * Standard Calculation (Bangladesh Labor Act 2006, Sec 108):
 *   - Monthly Normal Hours = 26 Working Days * 8 Hours = 208 Hours
 *   - Hourly Basic Rate = Basic Salary / 208
 *   - Overtime Rate (Double Basic) = (Basic Salary / 208) * 2 = Basic Salary / 104
 *   - Monthly Overtime = (Basic Salary / 104) * Monthly OT Hours (78h Default)
 * 
 * Author: Md. Saiful Islam / Antigravity AI
 */

(function () {
  'use strict';

  // Factory 11 Standard Production Sections & Grouping
  var SECTION_DEFINITIONS = [
    // --- Ceiling Fan Division (9 Sections) ---
    { sl: 1, name: 'Fan Administation', group: 'ceiling', groupLabel: 'Ceiling Fan Division', aliases: ['admin', 'administation', 'administration'] },
    { sl: 2, name: 'Fan Assemble Line', group: 'ceiling', groupLabel: 'Ceiling Fan Division', aliases: ['assemble'] },
    { sl: 3, name: 'Fan Blade & Dimmer', group: 'ceiling', groupLabel: 'Ceiling Fan Division', aliases: ['blade', 'dimmer'] },
    { sl: 4, name: 'Fan Armature Winding', group: 'ceiling', groupLabel: 'Ceiling Fan Division', aliases: ['armature', 'winding'] },
    { sl: 5, name: 'Fan Replace', group: 'ceiling', groupLabel: 'Ceiling Fan Division', aliases: ['replace'] },
    { sl: 6, name: 'Fan Power Press & Stamping', group: 'ceiling', groupLabel: 'Ceiling Fan Division', aliases: ['power press', 'stamping', 'press'] },
    { sl: 7, name: 'Fan Dhalai & Die Casting', group: 'ceiling', groupLabel: 'Ceiling Fan Division', aliases: ['dhalai', 'die casting', 'casting'] },
    { sl: 8, name: 'Fan Lathe', group: 'ceiling', groupLabel: 'Ceiling Fan Division', aliases: ['lathe'] },
    { sl: 9, name: 'Fan Auto Powder Coating', group: 'ceiling', groupLabel: 'Ceiling Fan Division', aliases: ['powder', 'coating'] },

    // --- Specialized Lines: Rechargeable & Exhaust Division (2 Sections) ---
    { sl: 10, name: 'Fan Rojonigondha', group: 'other', groupLabel: 'Rechargeable Fan Division', aliases: ['rojonigondha', 'rechargeable'] },
    { sl: 11, name: 'Fan Sada Shapla', group: 'other', groupLabel: 'Exhaust Fan Division', aliases: ['shapla', 'sada shapla', 'sala shapla', 'exhaust'] }
  ];

  // Configurable Parameters State
  var state = {
    workingDays: 26,
    dailyOtHours: 3.0,
    activeSectionStaff: null,
    activeSectionName: ''
  };

  // Helper: Retrieve all employees from cache or database
  function getAllEmployees() {
    if (window.MEP_MANPOWER_DATABASE && Array.isArray(window.MEP_MANPOWER_DATABASE.employees)) {
      return window.MEP_MANPOWER_DATABASE.employees;
    }
    if (window.HRMManpower && typeof window.HRMManpower.getAllEmployees === 'function') {
      return window.HRMManpower.getAllEmployees();
    }
    if (Array.isArray(window.MEP_MANPOWER_DATABASE)) {
      return window.MEP_MANPOWER_DATABASE;
    }
    return [];
  }

  // Helper: Retrieve active staff (excluding hold/inactive/hidden/qc)
  function getActiveEmployees() {
    var all = getAllEmployees();
    return all.filter(function (e) {
      if (!e) return false;
      if (e.is_hidden) return false;
      var sec = String(e.section || '').trim().toLowerCase();
      if (sec === 'fan qc') return false;
      var status = String(e.status || 'Active').trim().toLowerCase();
      return status === 'active';
    });
  }

  // Canonical Section Matcher
  function matchCanonicalSection(secName) {
    var s = String(secName || '').trim().toLowerCase();
    for (var i = 0; i < SECTION_DEFINITIONS.length; i++) {
      var def = SECTION_DEFINITIONS[i];
      for (var j = 0; j < def.aliases.length; j++) {
        if (s.indexOf(def.aliases[j]) !== -1) {
          return def.name;
        }
      }
    }
    return 'Other / Unassigned';
  }

  // Currency Formatter
  function formatMoney(num) {
    var n = Math.round(Number(num) || 0);
    return '৳ ' + n.toLocaleString('en-US');
  }

  // Pure Number Formatter
  function formatNumber(num) {
    var n = Math.round(Number(num) || 0);
    return n.toLocaleString('en-US');
  }

  // Calculate Overtime for single employee
  function calcEmpOvertime(emp, totalOtHours) {
    var gross = parseFloat(emp.gross_salary || 0);
    var basic = parseFloat(emp.basic_salary || (gross / 2));
    if (basic <= 0 && gross > 0) basic = gross / 2;
    // BLA 2006: (basic / 208) * 2 * totalOtHours
    var ot = (basic / 208.0) * 2.0 * totalOtHours;
    return {
      gross: gross,
      basic: basic,
      ot: ot,
      total: gross + ot
    };
  }

  // Compute Aggregations for all 11 sections
  function computeData() {
    var activeEmps = getActiveEmployees();
    var monthlyOtHours = state.workingDays * state.dailyOtHours;

    var secMap = {};
    SECTION_DEFINITIONS.forEach(function (def) {
      secMap[def.name] = {
        sl: def.sl,
        name: def.name,
        group: def.group,
        groupLabel: def.groupLabel,
        staff: 0,
        gross: 0.0,
        basic: 0.0,
        ot: 0.0,
        total: 0.0,
        employees: []
      };
    });

    activeEmps.forEach(function (emp) {
      var canon = matchCanonicalSection(emp.section);
      if (!secMap[canon]) {
        // Fallback to assemble line if unexpected
        canon = 'Fan Assemble Line';
      }
      var calc = calcEmpOvertime(emp, monthlyOtHours);
      var row = secMap[canon];
      row.staff += 1;
      row.gross += calc.gross;
      row.basic += calc.basic;
      row.ot += calc.ot;
      row.total += calc.total;
      row.employees.push({
        raw: emp,
        gross: calc.gross,
        basic: calc.basic,
        ot: calc.ot,
        total: calc.total
      });
    });

    // Subtotals
    var cfSub = { staff: 0, gross: 0.0, basic: 0.0, ot: 0.0, total: 0.0 };
    var othSub = { staff: 0, gross: 0.0, basic: 0.0, ot: 0.0, total: 0.0 };

    SECTION_DEFINITIONS.forEach(function (def) {
      var row = secMap[def.name];
      if (def.group === 'ceiling') {
        cfSub.staff += row.staff;
        cfSub.gross += row.gross;
        cfSub.basic += row.basic;
        cfSub.ot += row.ot;
        cfSub.total += row.total;
      } else {
        othSub.staff += row.staff;
        othSub.gross += row.gross;
        othSub.basic += row.basic;
        othSub.ot += row.ot;
        othSub.total += row.total;
      }
    });

    var grandTotal = {
      staff: cfSub.staff + othSub.staff,
      gross: cfSub.gross + othSub.gross,
      basic: cfSub.basic + othSub.basic,
      ot: cfSub.ot + othSub.ot,
      total: cfSub.total + othSub.total
    };

    return {
      monthlyOtHours: monthlyOtHours,
      secMap: secMap,
      cfSub: cfSub,
      othSub: othSub,
      grandTotal: grandTotal
    };
  }

  // Update Parameters from UI inputs
  function updateParams() {
    var wInput = document.getElementById('sec-salary-working-days');
    var oInput = document.getElementById('sec-salary-ot-hours');
    if (wInput) {
      var valW = parseInt(wInput.value, 10);
      if (!isNaN(valW) && valW >= 1 && valW <= 31) {
        state.workingDays = valW;
      } else {
        wInput.value = state.workingDays;
      }
    }
    if (oInput) {
      var valO = parseFloat(oInput.value);
      if (!isNaN(valO) && valO >= 0 && valO <= 12) {
        state.dailyOtHours = valO;
      } else {
        oInput.value = state.dailyOtHours;
      }
    }

    var totalHrs = state.workingDays * state.dailyOtHours;
    var badge = document.getElementById('sec-salary-param-total-hrs');
    if (badge) badge.textContent = totalHrs.toFixed(0);

    render();
  }

  // Render Table & KPI Cards
  function render() {
    var data = computeData();
    var monthlyOtHours = data.monthlyOtHours;
    var secMap = data.secMap;
    var cfSub = data.cfSub;
    var othSub = data.othSub;
    var grand = data.grandTotal;

    // 1. Update KPI Summary Cards
    var grossCard = document.getElementById('salary-kpi-gross-total');
    var otCard = document.getElementById('salary-kpi-ot-total');
    var grandCard = document.getElementById('salary-kpi-grand-total');
    var staffCard = document.getElementById('salary-kpi-staff-total');
    var subtext = document.getElementById('salary-kpi-subtext');

    if (grossCard) grossCard.textContent = formatMoney(grand.gross);
    if (otCard) otCard.textContent = formatMoney(grand.ot);
    if (grandCard) grandCard.textContent = formatMoney(grand.total);
    if (staffCard) staffCard.textContent = grand.staff + ' Staff';
    if (subtext) subtext.textContent = 'Ceiling Fan: ' + cfSub.staff + ' | Specialized: ' + othSub.staff;

    // Update Sidebar badge if present
    var sidebarBadge = document.getElementById('sidebar-salary-badge');
    if (sidebarBadge) {
      sidebarBadge.textContent = grand.staff + ' Active';
    }

    // 2. Build Table Rows
    var tbody = document.getElementById('section-wise-salary-table-body');
    if (!tbody) return;

    var html = '';

    // Group 1: Ceiling Fan Division Header
    html += '<tr class="bg-gradient-to-r from-slate-200 via-indigo-50 to-slate-100 dark:from-dark-850 dark:via-indigo-950/40 dark:to-dark-800 text-slate-900 dark:text-slate-100 font-black border-y-2 border-slate-400 dark:border-slate-600">' +
              '<td colspan="9" class="py-2.5 px-4 text-left tracking-wide">' +
                '<div class="flex items-center justify-between w-full">' +
                  '<div class="flex items-center gap-2.5 text-xs sm:text-sm font-black text-indigo-950 dark:text-indigo-200">' +
                    '<span class="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs shadow-xs"><i class="ph-bold ph-fan"></i></span>' +
                    '<span>1. CEILING FAN PRODUCTION LINES (সিলিং ফ্যান বিভাগ - ০৯ টি সেকশন)</span>' +
                  '</div>' +
                  '<span class="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-white/90 dark:bg-dark-800 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800/80 shadow-2xs">' +
                    '০৯ টি সেকশন • ' + cfSub.staff + ' জন সক্রিয় কর্মী' +
                  '</span>' +
                '</div>' +
              '</td>' +
            '</tr>';

    // 9 Ceiling Fan Sections
    SECTION_DEFINITIONS.slice(0, 9).forEach(function (def) {
      var row = secMap[def.name];
      var avgCost = row.staff > 0 ? (row.total / row.staff) : 0;
      var share = grand.total > 0 ? ((row.total / grand.total) * 100) : 0;

      html += '<tr class="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-dark-750/50 transition-colors">' +
                '<td class="py-2.5 px-2 border-r border-slate-300 dark:border-slate-700 text-center font-bold text-slate-500">' + def.sl + '</td>' +
                '<td class="py-2.5 px-3 border-r border-slate-300 dark:border-slate-700 text-left font-black text-slate-900 dark:text-white">' +
                  '<div class="flex items-center justify-between">' +
                    '<span>' + def.name + '</span>' +
                    '<span class="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 dark:bg-dark-800 px-1.5 py-0.5 rounded">' + row.staff + ' Staff</span>' +
                  '</div>' +
                '</td>' +
                '<td class="py-2.5 px-2 border-r border-slate-300 dark:border-slate-700 text-center font-black text-slate-800 dark:text-slate-100">' + row.staff + '</td>' +
                '<td class="py-2.5 px-3 border-r border-slate-300 dark:border-slate-700 text-right font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50/30 dark:bg-indigo-950/20">' + formatMoney(row.gross) + '</td>' +
                '<td class="py-2.5 px-3 border-r border-slate-300 dark:border-slate-700 text-right font-black text-amber-700 dark:text-amber-300 bg-amber-50/30 dark:bg-amber-950/20">' + formatMoney(row.ot) + '</td>' +
                '<td class="py-2.5 px-3 border-r border-slate-300 dark:border-slate-700 text-right font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/30">' + formatMoney(row.total) + '</td>' +
                '<td class="py-2.5 px-2.5 border-r border-slate-300 dark:border-slate-700 text-right font-bold text-slate-600 dark:text-slate-300">' + formatMoney(avgCost) + '</td>' +
                '<td class="py-2.5 px-2 border-r border-slate-300 dark:border-slate-700 text-center font-bold text-slate-600 dark:text-slate-300">' + share.toFixed(1) + '%</td>' +
                '<td class="py-2.5 px-2 text-center">' +
                  '<button type="button" onclick="window.HRMSectionSalary.openModal(\'' + def.name + '\')" class="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-2xs flex items-center gap-1 mx-auto cursor-pointer" title="View Staff Roster">' +
                    '<i class="ph-bold ph-list-magnifying-glass"></i>' +
                    '<span>View</span>' +
                  '</button>' +
                '</td>' +
              '</tr>';
    });

    // Subtotal: Ceiling Fan
    var cfAvgCost = cfSub.staff > 0 ? (cfSub.total / cfSub.staff) : 0;
    var cfShare = grand.total > 0 ? ((cfSub.total / grand.total) * 100) : 0;

    html += '<tr class="bg-[#D9E1F2] dark:bg-blue-950/70 text-slate-950 dark:text-blue-100 font-black border-y-2 border-slate-400 dark:border-slate-600 text-xs">' +
              '<td class="py-2.5 px-2 border-r border-slate-400 text-center">★</td>' +
              '<td class="py-2.5 px-3 border-r border-slate-400 text-left font-black tracking-tight">' +
                '<span>TOTAL CEILING FAN (সিলিং ফ্যান মোট)</span>' +
              '</td>' +
              '<td class="py-2.5 px-2 border-r border-slate-400 text-center text-sm">' + cfSub.staff + '</td>' +
              '<td class="py-2.5 px-3 border-r border-slate-400 text-right text-indigo-950 dark:text-indigo-200">' + formatMoney(cfSub.gross) + '</td>' +
              '<td class="py-2.5 px-3 border-r border-slate-400 text-right text-amber-950 dark:text-amber-200">' + formatMoney(cfSub.ot) + '</td>' +
              '<td class="py-2.5 px-3 border-r border-slate-400 text-right text-emerald-950 dark:text-emerald-200 text-sm">' + formatMoney(cfSub.total) + '</td>' +
              '<td class="py-2.5 px-2.5 border-r border-slate-400 text-right">' + formatMoney(cfAvgCost) + '</td>' +
              '<td class="py-2.5 px-2 border-r border-slate-400 text-center">' + cfShare.toFixed(1) + '%</td>' +
              '<td class="py-2.5 px-2 text-center text-[11px] text-slate-600 dark:text-blue-200 font-bold">Subtotal</td>' +
            '</tr>';

    // Group 2: Rechargeable & Exhaust Division Header
    html += '<tr class="bg-gradient-to-r from-slate-200 via-emerald-50 to-slate-100 dark:from-dark-850 dark:via-emerald-950/40 dark:to-dark-800 text-slate-900 dark:text-slate-100 font-black border-y-2 border-slate-400 dark:border-slate-600">' +
              '<td colspan="9" class="py-2.5 px-4 text-left tracking-wide">' +
                '<div class="flex items-center justify-between w-full">' +
                  '<div class="flex items-center gap-2.5 text-xs sm:text-sm font-black text-emerald-950 dark:text-emerald-200">' +
                    '<span class="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs shadow-xs"><i class="ph-bold ph-battery-charging"></i></span>' +
                    '<span>2. RECHARGEABLE, EXHAUST & SPECIALIZED LINES (রিচার্জেবল ও এগজস্ট ফ্যান - ০২ টি সেকশন)</span>' +
                  '</div>' +
                  '<span class="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-white/90 dark:bg-dark-800 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/80 shadow-2xs">' +
                    '০২ টি সেকশন • ' + othSub.staff + ' জন সক্রিয় কর্মী' +
                  '</span>' +
                '</div>' +
              '</td>' +
            '</tr>';

    // 2 Specialized Sections
    SECTION_DEFINITIONS.slice(9).forEach(function (def) {
      var row = secMap[def.name];
      var avgCost = row.staff > 0 ? (row.total / row.staff) : 0;
      var share = grand.total > 0 ? ((row.total / grand.total) * 100) : 0;

      html += '<tr class="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-dark-750/50 transition-colors">' +
                '<td class="py-2.5 px-2 border-r border-slate-300 dark:border-slate-700 text-center font-bold text-slate-500">' + def.sl + '</td>' +
                '<td class="py-2.5 px-3 border-r border-slate-300 dark:border-slate-700 text-left font-black text-slate-900 dark:text-white">' +
                  '<div class="flex items-center justify-between">' +
                    '<span>' + def.name + '</span>' +
                    '<span class="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 dark:bg-dark-800 px-1.5 py-0.5 rounded">' + row.staff + ' Staff</span>' +
                  '</div>' +
                '</td>' +
                '<td class="py-2.5 px-2 border-r border-slate-300 dark:border-slate-700 text-center font-black text-slate-800 dark:text-slate-100">' + row.staff + '</td>' +
                '<td class="py-2.5 px-3 border-r border-slate-300 dark:border-slate-700 text-right font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50/30 dark:bg-indigo-950/20">' + formatMoney(row.gross) + '</td>' +
                '<td class="py-2.5 px-3 border-r border-slate-300 dark:border-slate-700 text-right font-black text-amber-700 dark:text-amber-300 bg-amber-50/30 dark:bg-amber-950/20">' + formatMoney(row.ot) + '</td>' +
                '<td class="py-2.5 px-3 border-r border-slate-300 dark:border-slate-700 text-right font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/30">' + formatMoney(row.total) + '</td>' +
                '<td class="py-2.5 px-2.5 border-r border-slate-300 dark:border-slate-700 text-right font-bold text-slate-600 dark:text-slate-300">' + formatMoney(avgCost) + '</td>' +
                '<td class="py-2.5 px-2 border-r border-slate-300 dark:border-slate-700 text-center font-bold text-slate-600 dark:text-slate-300">' + share.toFixed(1) + '%</td>' +
                '<td class="py-2.5 px-2 text-center">' +
                  '<button type="button" onclick="window.HRMSectionSalary.openModal(\'' + def.name + '\')" class="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-2xs flex items-center gap-1 mx-auto cursor-pointer" title="View Staff Roster">' +
                    '<i class="ph-bold ph-list-magnifying-glass"></i>' +
                    '<span>View</span>' +
                  '</button>' +
                '</td>' +
              '</tr>';
    });

    // Subtotal: Specialized / Rechargeable
    var othAvgCost = othSub.staff > 0 ? (othSub.total / othSub.staff) : 0;
    var othShare = grand.total > 0 ? ((othSub.total / grand.total) * 100) : 0;

    html += '<tr class="bg-[#E2EFDA] dark:bg-emerald-950/70 text-slate-950 dark:text-emerald-100 font-black border-y-2 border-slate-400 dark:border-slate-600 text-xs">' +
              '<td class="py-2.5 px-2 border-r border-slate-400 text-center">★</td>' +
              '<td class="py-2.5 px-3 border-r border-slate-400 text-left font-black tracking-tight">' +
                '<span>RECHARGEABLE / EXHAUST / CAPACITOR (রিচার্জেবল ও এগজস্ট মোট)</span>' +
              '</td>' +
              '<td class="py-2.5 px-2 border-r border-slate-400 text-center text-sm">' + othSub.staff + '</td>' +
              '<td class="py-2.5 px-3 border-r border-slate-400 text-right text-indigo-950 dark:text-indigo-200">' + formatMoney(othSub.gross) + '</td>' +
              '<td class="py-2.5 px-3 border-r border-slate-400 text-right text-amber-950 dark:text-amber-200">' + formatMoney(othSub.ot) + '</td>' +
              '<td class="py-2.5 px-3 border-r border-slate-400 text-right text-emerald-950 dark:text-emerald-200 text-sm">' + formatMoney(othSub.total) + '</td>' +
              '<td class="py-2.5 px-2.5 border-r border-slate-400 text-right">' + formatMoney(othAvgCost) + '</td>' +
              '<td class="py-2.5 px-2 border-r border-slate-400 text-center">' + othShare.toFixed(1) + '%</td>' +
              '<td class="py-2.5 px-2 text-center text-[11px] text-slate-600 dark:text-emerald-200 font-bold">Subtotal</td>' +
            '</tr>';

    // Grand Total Factory Payroll
    var grandAvgCost = grand.staff > 0 ? (grand.total / grand.staff) : 0;

    html += '<tr class="bg-[#FCE4D6] dark:bg-amber-950/80 text-slate-950 dark:text-amber-100 font-black border-t-2 border-b-4 border-slate-500 dark:border-slate-500 text-sm">' +
              '<td class="py-3 px-2 border-r border-slate-400 text-center text-base">✪</td>' +
              '<td class="py-3 px-3 border-r border-slate-400 text-left font-black tracking-tight">' +
                '<span>GRAND TOTAL FACTORY PAYROLL (সর্বমোট ফ্যাক্টরি পে-রোল)</span>' +
              '</td>' +
              '<td class="py-3 px-2 border-r border-slate-400 text-center text-base font-black">' + grand.staff + '</td>' +
              '<td class="py-3 px-3 border-r border-slate-400 text-right text-indigo-950 dark:text-indigo-100 font-black">' + formatMoney(grand.gross) + '</td>' +
              '<td class="py-3 px-3 border-r border-slate-400 text-right text-amber-950 dark:text-amber-100 font-black">' + formatMoney(grand.ot) + '</td>' +
              '<td class="py-3 px-3 border-r border-slate-400 text-right text-emerald-950 dark:text-emerald-100 font-black text-base">' + formatMoney(grand.total) + '</td>' +
              '<td class="py-3 px-2.5 border-r border-slate-400 text-right font-black">' + formatMoney(grandAvgCost) + '</td>' +
              '<td class="py-3 px-2 border-r border-slate-400 text-center font-black">100.0%</td>' +
              '<td class="py-3 px-2 text-center text-xs font-bold text-slate-700 dark:text-amber-200">Grand Total</td>' +
            '</tr>';

    tbody.innerHTML = html;
  }

  // Drilldown Modal: Open section roster
  function openModal(sectionName) {
    state.activeSectionName = sectionName;
    var data = computeData();
    var row = data.secMap[sectionName];
    if (!row) return;

    state.activeSectionStaff = row.employees;

    var modal = document.getElementById('section-salary-staff-modal');
    var titleEl = document.getElementById('salary-modal-section-title');
    var subEl = document.getElementById('salary-modal-section-sub');
    var tbody = document.getElementById('salary-modal-staff-tbody');
    var tfoot = document.getElementById('salary-modal-staff-tfoot');

    if (titleEl) titleEl.textContent = sectionName + ' — Active Personnel Roster (' + row.staff + ' Staff)';
    if (subEl) subEl.textContent = 'Standard: ' + state.workingDays + ' Working Days • ' + state.dailyOtHours + 'H Daily OT (' + data.monthlyOtHours + ' Hours/month)';

    if (tbody) {
      if (!row.employees || row.employees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="py-6 text-center text-slate-400">No active personnel found in this section.</td></tr>';
      } else {
        var rowsHtml = '';
        row.employees.forEach(function (item, idx) {
          var e = item.raw;
          rowsHtml += '<tr class="hover:bg-slate-50 dark:hover:bg-dark-800 transition-colors">' +
                        '<td class="py-2 px-2.5 text-center text-slate-500">' + (idx + 1) + '</td>' +
                        '<td class="py-2 px-2.5 text-center font-black text-slate-900 dark:text-white">#' + (e.staff_id || e.id || '') + '</td>' +
                        '<td class="py-2 px-3 font-bold text-slate-800 dark:text-slate-200">' + (e.name || '') + '</td>' +
                        '<td class="py-2 px-3 text-slate-600 dark:text-slate-400">' + (e.designation || '') + '</td>' +
                        '<td class="py-2 px-3 text-right font-black text-indigo-600 dark:text-indigo-400">' + formatMoney(item.gross) + '</td>' +
                        '<td class="py-2 px-3 text-right text-slate-600 dark:text-slate-400">' + formatMoney(item.basic) + '</td>' +
                        '<td class="py-2 px-3 text-right font-black text-amber-600 dark:text-amber-400">' + formatMoney(item.ot) + '</td>' +
                        '<td class="py-2 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">' + formatMoney(item.total) + '</td>' +
                        '<td class="py-2 px-2.5 text-center text-slate-500 text-[11px]">' + (e.doj || e.joining_date || 'N/A') + '</td>' +
                      '</tr>';
        });
        tbody.innerHTML = rowsHtml;
      }
    }

    if (tfoot) {
      tfoot.innerHTML = '<tr>' +
                          '<td colspan="4" class="py-2.5 px-3 text-left font-black text-slate-900 dark:text-white">Section Total (' + row.staff + ' Personnel)</td>' +
                          '<td class="py-2.5 px-3 text-right font-black text-indigo-700 dark:text-indigo-300">' + formatMoney(row.gross) + '</td>' +
                          '<td class="py-2.5 px-3 text-right font-black text-slate-700 dark:text-slate-300">' + formatMoney(row.basic) + '</td>' +
                          '<td class="py-2.5 px-3 text-right font-black text-amber-700 dark:text-amber-300">' + formatMoney(row.ot) + '</td>' +
                          '<td class="py-2.5 px-3 text-right font-black text-emerald-700 dark:text-emerald-300 text-sm">' + formatMoney(row.total) + '</td>' +
                          '<td class="py-2.5 px-2.5 text-center text-[10px] text-slate-500">Total Payout</td>' +
                        '</tr>';
    }

    if (modal) modal.classList.remove('hidden');
  }

  // Close drilldown modal
  function closeModal() {
    var modal = document.getElementById('section-salary-staff-modal');
    if (modal) modal.classList.add('hidden');
  }

  // Export Section Staff Modal to CSV
  function exportModalCSV() {
    if (!state.activeSectionStaff || state.activeSectionStaff.length === 0) return;
    var filename = 'MEP_Section_Staff_' + state.activeSectionName.replace(/[^a-zA-Z0-9]/g, '_') + '.csv';
    var lines = [];
    lines.push('SL,Staff ID,Employee Name,Designation,8H Gross Salary,Basic Salary,3H OT Amount,Total Salary and OT,Join Date');
    state.activeSectionStaff.forEach(function (item, idx) {
      var e = item.raw;
      var cleanName = '"' + String(e.name || '').replace(/"/g, '""') + '"';
      var cleanDesig = '"' + String(e.designation || '').replace(/"/g, '""') + '"';
      lines.push([
        idx + 1,
        '"#' + (e.staff_id || e.id || '') + '"',
        cleanName,
        cleanDesig,
        Math.round(item.gross),
        Math.round(item.basic),
        Math.round(item.ot),
        Math.round(item.total),
        '"' + (e.doj || e.joining_date || '') + '"'
      ].join(','));
    });

    var blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Full Bordered Excel Export (.xlsx)
  function exportExcel() {
    if (typeof XLSX === 'undefined') {
      exportCSV();
      return;
    }

    var data = computeData();
    var secMap = data.secMap;
    var cfSub = data.cfSub;
    var othSub = data.othSub;
    var grand = data.grandTotal;

    var today = new Date().toISOString().split('T')[0];
    var title = 'MEP GROUP - FAN DIVISION';
    var subtitle = 'SECTION WISE MONTHLY SALARY (8H BASE & 3H OVERTIME ANALYTICS)';
    var notes = 'Calculation Basis: ' + state.workingDays + ' Working Days | ' + state.dailyOtHours + 'H Daily OT (' + data.monthlyOtHours + ' Monthly Hours @ Double Basic) | Generated: ' + today;

    var rows = [
      [title],
      [subtitle],
      [notes],
      [], // blank
      ['SL No', 'Section Name', 'Total Staff', '8 Hour as Salary (BDT)', '3 Hour OT (BDT)', 'Total Salary & OT (BDT)', 'Avg Cost / Head (BDT)', 'Share (%)']
    ];

    // Ceiling Fan lines
    SECTION_DEFINITIONS.slice(0, 9).forEach(function (def) {
      var row = secMap[def.name];
      var avgCost = row.staff > 0 ? Math.round(row.total / row.staff) : 0;
      var share = grand.total > 0 ? Number(((row.total / grand.total) * 100).toFixed(1)) : 0;
      rows.push([
        def.sl,
        def.name,
        row.staff,
        Math.round(row.gross),
        Math.round(row.ot),
        Math.round(row.total),
        avgCost,
        share + '%'
      ]);
    });

    // Subtotal Ceiling Fan
    var cfAvg = cfSub.staff > 0 ? Math.round(cfSub.total / cfSub.staff) : 0;
    var cfPct = grand.total > 0 ? Number(((cfSub.total / grand.total) * 100).toFixed(1)) : 0;
    rows.push([
      '',
      'TOTAL CEILING FAN',
      cfSub.staff,
      Math.round(cfSub.gross),
      Math.round(cfSub.ot),
      Math.round(cfSub.total),
      cfAvg,
      cfPct + '%'
    ]);

    // Specialized lines
    SECTION_DEFINITIONS.slice(9).forEach(function (def) {
      var row = secMap[def.name];
      var avgCost = row.staff > 0 ? Math.round(row.total / row.staff) : 0;
      var share = grand.total > 0 ? Number(((row.total / grand.total) * 100).toFixed(1)) : 0;
      rows.push([
        def.sl,
        def.name,
        row.staff,
        Math.round(row.gross),
        Math.round(row.ot),
        Math.round(row.total),
        avgCost,
        share + '%'
      ]);
    });

    // Subtotal Specialized
    var othAvg = othSub.staff > 0 ? Math.round(othSub.total / othSub.staff) : 0;
    var othPct = grand.total > 0 ? Number(((othSub.total / grand.total) * 100).toFixed(1)) : 0;
    rows.push([
      '',
      'RECHARGEABLE / EXHAUST / CAPACITOR',
      othSub.staff,
      Math.round(othSub.gross),
      Math.round(othSub.ot),
      Math.round(othSub.total),
      othAvg,
      othPct + '%'
    ]);

    // Grand Total
    var grandAvg = grand.staff > 0 ? Math.round(grand.total / grand.staff) : 0;
    rows.push([
      '',
      'GRAND TOTAL FACTORY PAYROLL',
      grand.staff,
      Math.round(grand.gross),
      Math.round(grand.ot),
      Math.round(grand.total),
      grandAvg,
      '100.0%'
    ]);

    var wb = XLSX.utils.book_new();
    var ws = XLSX.utils.aoa_to_sheet(rows);

    // Set Column Widths
    ws['!cols'] = [
      { wch: 8 },   // SL No
      { wch: 34 },  // Section Name
      { wch: 14 },  // Staff
      { wch: 24 },  // 8H Salary
      { wch: 20 },  // 3H OT
      { wch: 24 },  // Total Salary & OT
      { wch: 22 },  // Avg Cost
      { wch: 14 }   // Share %
    ];

    // Merge Header Rows
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } }
    ];

    // Write file
    var fname = 'MEP_Section_Wise_Monthly_Salary_8H_OT_' + today.replace(/-/g, '') + '.xlsx';
    XLSX.writeFile(wb, fname);
  }

  // Export CSV
  function exportCSV() {
    var data = computeData();
    var secMap = data.secMap;
    var cfSub = data.cfSub;
    var othSub = data.othSub;
    var grand = data.grandTotal;

    var lines = [];
    lines.push('"MEP GROUP - FAN DIVISION - SECTION WISE MONTHLY SALARY 8H & 3H OT"');
    lines.push('"Standard: ' + state.workingDays + ' Working Days | ' + state.dailyOtHours + 'H Daily OT (' + data.monthlyOtHours + ' Monthly Hours)"');
    lines.push('');
    lines.push('SL No,Section Name,Total Staff,8 Hour as Salary,3 Hour OT,Total Salary & OT,Avg Cost / Head,Share (%)');

    SECTION_DEFINITIONS.slice(0, 9).forEach(function (def) {
      var row = secMap[def.name];
      var avg = row.staff > 0 ? Math.round(row.total / row.staff) : 0;
      var sh = grand.total > 0 ? ((row.total / grand.total) * 100).toFixed(1) : 0;
      lines.push([
        def.sl,
        '"' + def.name + '"',
        row.staff,
        Math.round(row.gross),
        Math.round(row.ot),
        Math.round(row.total),
        avg,
        sh + '%'
      ].join(','));
    });

    // Subtotal CF
    var cfAvg = cfSub.staff > 0 ? Math.round(cfSub.total / cfSub.staff) : 0;
    var cfSh = grand.total > 0 ? ((cfSub.total / grand.total) * 100).toFixed(1) : 0;
    lines.push(['', '"TOTAL CEILING FAN"', cfSub.staff, Math.round(cfSub.gross), Math.round(cfSub.ot), Math.round(cfSub.total), cfAvg, cfSh + '%'].join(','));

    SECTION_DEFINITIONS.slice(9).forEach(function (def) {
      var row = secMap[def.name];
      var avg = row.staff > 0 ? Math.round(row.total / row.staff) : 0;
      var sh = grand.total > 0 ? ((row.total / grand.total) * 100).toFixed(1) : 0;
      lines.push([
        def.sl,
        '"' + def.name + '"',
        row.staff,
        Math.round(row.gross),
        Math.round(row.ot),
        Math.round(row.total),
        avg,
        sh + '%'
      ].join(','));
    });

    // Subtotal Oth
    var othAvg = othSub.staff > 0 ? Math.round(othSub.total / othSub.staff) : 0;
    var othSh = grand.total > 0 ? ((othSub.total / grand.total) * 100).toFixed(1) : 0;
    lines.push(['', '"RECHARGEABLE / EXHAUST / CAPACITOR"', othSub.staff, Math.round(othSub.gross), Math.round(othSub.ot), Math.round(othSub.total), othAvg, othSh + '%'].join(','));

    // Grand
    var gAvg = grand.staff > 0 ? Math.round(grand.total / grand.staff) : 0;
    lines.push(['', '"GRAND TOTAL FACTORY PAYROLL"', grand.staff, Math.round(grand.gross), Math.round(grand.ot), Math.round(grand.total), gAvg, '100.0%'].join(','));

    var blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'MEP_Section_Wise_Monthly_Salary_8H_OT.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Print Sheet
  function printSheet() {
    window.print();
  }

  // Public Interface
  window.HRMSectionSalary = {
    render: render,
    updateParams: updateParams,
    openModal: openModal,
    closeModal: closeModal,
    exportModalCSV: exportModalCSV,
    exportExcel: exportExcel,
    exportCSV: exportCSV,
    printSheet: printSheet,
    computeData: computeData
  };

  function autoInit() {
    var sec = document.getElementById('section-wise-salary-section');
    if (sec && !sec.classList.contains('hidden')) {
      render();
    }
  }

  // Auto-init on DOMContentLoaded or immediate if loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    setTimeout(autoInit, 50);
  }
})();
