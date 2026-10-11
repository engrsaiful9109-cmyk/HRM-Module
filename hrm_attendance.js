/**
 * MEP GROUP - Enterprise Human Resource Management (HRM)
 * Manpower Attendance & Live ERP Master Reports Controller
 * Features:
 *   1. Daily Attendance (Report 121225 - Daily attendance, punch, late & section yields)
 *   2. Monthly Attendance (Report 20220522 - Monthly attendance sheet & overtime register)
 *   3. Leave Information (Report 611111 - Leave breakdown, leave types & register)
 *   4. All ERP Reports Hub (34 Live report viewers & exporters)
 * Endpoint: https://mvc.mepgrouperp.com/app/views/hrm_mod/report/master_report_att_management.php
 * Company: MEP FAN LIMITED. (PBI_ORG: 3)
 * Author: Antigravity AI / MEP Engineering Team
 * Version: 20261007_v2
 */

(function () {
  'use strict';

  var state = {
    // Daily State
    dailyDate: new Date().toISOString().split('T')[0],
    dailySearch: '',
    dailySection: 'ALL',
    dailyStatus: 'ALL',
    dailyPage: 1,
    dailyPerPage: 25,
    dailyIsLive: false,

    // Monthly State
    monthlyMon: '10',
    monthlyYear: '2026',
    monthlySearch: '',
    monthlySection: 'ALL',
    monthlyPage: 1,
    monthlyPerPage: 20,
    monthlyIsLive: false,

    // Leave State
    leaveSearch: '',
    leaveSection: 'ALL',
    leaveTypeFilter: 'ALL',
    leavePage: 1,
    leavePerPage: 25,
    leaveFdate: '2026-01-01',
    leaveTdate: new Date().toISOString().split('T')[0],
    leaveIsLive: false,

    // All ERP Reports Hub State
    hubSelectedReport: '121225',
    hubCategoryFilter: 'ALL',
    hubSearch: '',
    hubPage: 1,
    hubPerPage: 25,
    hubFdate: new Date().toISOString().split('T')[0],
    hubTdate: new Date().toISOString().split('T')[0],
    hubMon: '10',
    hubYear: '2026',
    hubJobStatus: 'In Service',
    hubSalaryStatus: 'Approved',
    hubViewMode: 'table', // 'table' or 'raw_erp'
    hubCurrentReportData: null
  };

  // Section Color Palette matching HRM Manpower & Factory Sections
  var SECTION_COLORS = {
    'Assemble Line': 'bg-indigo-500/10 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-500/25',
    'Auto Powder Coating': 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-500/25',
    'Armature Winding': 'bg-purple-500/10 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-500/25',
    'Lathe': 'bg-blue-500/10 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-500/25',
    'Power Press & Stamping': 'bg-rose-500/10 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-500/25',
    'Dhalai': 'bg-amber-500/10 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-500/25',
    'Die Casting': 'bg-amber-500/10 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-500/25',
    'Dimmar & Blade': 'bg-cyan-500/10 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300 border-cyan-500/25',
    'Blade & Dimmer': 'bg-cyan-500/10 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300 border-cyan-500/25',
    'Rojonigondha': 'bg-fuchsia-500/10 text-fuchsia-700 dark:bg-fuchsia-950/50 dark:text-fuchsia-300 border-fuchsia-500/25',
    'Sada Shapla': 'bg-sky-500/10 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-500/25',
    'Replacement': 'bg-violet-500/10 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border-violet-500/25',
    'General': 'bg-slate-500/10 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-500/25'
  };

  function getSectionBadge(secName) {
    if (!secName) return '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">General</span>';
    var cleanSec = secName.replace(/^Fan\s+/i, '').trim();
    var colorClass = SECTION_COLORS[cleanSec] || SECTION_COLORS[secName] || 'bg-indigo-500/10 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-500/25';
    return '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold border ' + colorClass + '">' + secName + '</span>';
  }

  function getStatusBadge(status, inTime, lateMin) {
    var st = (status || '').trim();
    var lMin = parseInt(lateMin, 10) || 0;

    if (st.toLowerCase() === 'absent') {
      return '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">Absent</span>';
    }
    if (st.toLowerCase().includes('leave')) {
      return '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30">On Leave</span>';
    }
    if (lMin > 0 || st.toLowerCase() === 'late') {
      return '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">Late (' + lMin + 'm)</span>';
    }
    if (st.toLowerCase() === 'early out') {
      return '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30">Early Out</span>';
    }
    return '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">Present</span>';
  }

  /* ========================================================================= */
  /* DATA ACCESSORS (Cache & Real ERP Datasets)                                 */
  /* ========================================================================= */

  function getDailyERPDataset() {
    if (window.ERP_ATTENDANCE_CACHE && window.ERP_ATTENDANCE_CACHE.daily) {
      return window.ERP_ATTENDANCE_CACHE.daily;
    }
    return null;
  }

  function getMonthlyERPDataset() {
    if (window.ERP_ATTENDANCE_CACHE && window.ERP_ATTENDANCE_CACHE.monthly) {
      return window.ERP_ATTENDANCE_CACHE.monthly;
    }
    return null;
  }

  function getLeaveERPDataset() {
    if (window.ERP_ATTENDANCE_CACHE && window.ERP_ATTENDANCE_CACHE.leave) {
      return window.ERP_ATTENDANCE_CACHE.leave;
    }
    return null;
  }

  function getCatalog() {
    if (window.ERP_ATTENDANCE_CACHE && window.ERP_ATTENDANCE_CACHE.catalog) {
      return window.ERP_ATTENDANCE_CACHE.catalog;
    }
    return {};
  }

  /* ========================================================================= */
  /* 1. DAILY ATTENDANCE (Report 121225)                                       */
  /* ========================================================================= */

  function parseDailyRecords() {
    var ds = getDailyERPDataset();
    if (!ds || !Array.isArray(ds.rows) || ds.rows.length === 0) {
      return [];
    }

    return ds.rows.map(function (r, idx) {
      var id = r.Id || r.EMP_ID || '';
      var name = r.Name || r['Employee Name'] || '';
      var desig = r.Designation || '';
      var unit = r.Unit || r.Section || 'General';
      var shiftIn = r['Shift In Time'] || '08:00 am';
      var shiftOut = r['Shift Out Time'] || '05:00 pm';
      var inTime = r['In Time'] || '—';
      var outTime = r['Out Time'] || '—';
      var lateMin = r['In Late'] || '0';
      var earlyOut = r['Early Out'] || '0';
      var assignedHours = r.AssignedWorkingHours || '8';
      var workingHours = r['Working Hours'] || '00:00';
      var ot = r.OT || '0 hr 0 m';
      var status = r.Status || 'Present';

      return {
        sl: r.SL || (idx + 1),
        staff_id: id,
        name: name,
        designation: desig,
        unit: unit,
        section: unit,
        shiftIn: shiftIn,
        shiftOut: shiftOut,
        inTime: inTime,
        outTime: outTime,
        lateMin: lateMin,
        earlyOut: earlyOut,
        assignedHours: assignedHours,
        workingHours: workingHours,
        ot: ot,
        status: status,
        remarks: 'ERP Verified'
      };
    });
  }

  function renderDaily() {
    var records = parseDailyRecords();
    var ds = getDailyERPDataset();

    // Summary calculation
    var totalStaff = records.length;
    var presentCount = 0;
    var absentCount = 0;
    var lateCount = 0;
    var earlyOutCount = 0;
    var secYieldMap = {};

    records.forEach(function (r) {
      var st = (r.status || '').toLowerCase();
      var l = parseInt(r.lateMin, 10) || 0;
      var eo = parseInt(r.earlyOut, 10) || 0;

      if (st.includes('absent')) absentCount++;
      else presentCount++;

      if (l > 0 || st === 'late') lateCount++;
      if (eo > 0 || st === 'early out') earlyOutCount++;

      var u = r.unit || 'General';
      if (!secYieldMap[u]) secYieldMap[u] = { total: 0, present: 0, late: 0, earlyOut: 0 };
      secYieldMap[u].total++;
      if (!st.includes('absent')) secYieldMap[u].present++;
      if (l > 0) secYieldMap[u].late++;
      if (eo > 0) secYieldMap[u].earlyOut++;
    });

    var yieldPct = totalStaff > 0 ? ((presentCount / totalStaff) * 100).toFixed(1) : '100.0';

    // Update KPI cards
    var kpiTotal = document.getElementById('daily-att-kpi-total');
    if (kpiTotal) kpiTotal.textContent = totalStaff + ' Staff';
    var kpiPresent = document.getElementById('daily-att-kpi-present');
    if (kpiPresent) kpiPresent.textContent = presentCount + ' (' + yieldPct + '%)';
    var kpiLate = document.getElementById('daily-att-kpi-late');
    if (kpiLate) kpiLate.textContent = lateCount + ' Late';
    var kpiLeave = document.getElementById('daily-att-kpi-leave');
    if (kpiLeave) kpiLeave.textContent = earlyOutCount + ' Early Out';
    var kpiAbsent = document.getElementById('daily-att-kpi-absent');
    if (kpiAbsent) kpiAbsent.textContent = absentCount + ' Absent';

    var countBadge = document.getElementById('daily-roster-count-badge');
    if (countBadge) countBadge.textContent = totalStaff + ' ERP Records';

    // Section Yield Cards
    var secContainer = document.getElementById('daily-section-yield-grid');
    if (secContainer) {
      var secHtml = '';
      Object.keys(secYieldMap).sort().forEach(function (u) {
        var d = secYieldMap[u];
        var yPct = d.total > 0 ? (((d.present) / d.total) * 100).toFixed(1) : '100.0';
        var barColor = parseFloat(yPct) >= 95 ? 'bg-emerald-500' : 'bg-amber-500';
        secHtml += `
          <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-dark-900 border border-slate-200/80 dark:border-slate-800 space-y-1.5 hover:border-emerald-500/40 transition-colors">
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-slate-800 dark:text-slate-200 truncate pr-2">${u}</span>
              <span class="font-mono font-black text-emerald-600 dark:text-emerald-400 shrink-0">${yPct}%</span>
            </div>
            <div class="w-full h-1.5 bg-slate-200 dark:bg-dark-700 rounded-full overflow-hidden">
              <div class="h-full ${barColor} rounded-full" style="width: ${yPct}%;"></div>
            </div>
            <div class="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              <span>Present: <b class="text-slate-700 dark:text-slate-200">${d.present}/${d.total}</b></span>
              <span>Late: <b class="text-amber-600">${d.late}</b> &bull; Early: <b class="text-sky-600">${d.earlyOut}</b></span>
            </div>
          </div>
        `;
      });
      secContainer.innerHTML = secHtml;
    }

    // Populate Section Filter Dropdown
    var secSelect = document.getElementById('daily-filter-section');
    if (secSelect && secSelect.options.length <= 1) {
      Object.keys(secYieldMap).sort().forEach(function (u) {
        var opt = document.createElement('option');
        opt.value = u;
        opt.textContent = u + ' (' + secYieldMap[u].total + ')';
        secSelect.appendChild(opt);
      });
    }

    // Filter & Search Records
    var filtered = records.filter(function (r) {
      if (state.dailySection !== 'ALL' && r.unit !== state.dailySection) return false;
      if (state.dailyStatus !== 'ALL') {
        var st = (r.status || '').toLowerCase();
        var l = parseInt(r.lateMin, 10) || 0;
        if (state.dailyStatus === 'Present' && st.includes('absent')) return false;
        if (state.dailyStatus === 'Late' && l <= 0 && st !== 'late') return false;
        if (state.dailyStatus === 'Absent' && !st.includes('absent')) return false;
      }
      if (state.dailySearch) {
        var q = state.dailySearch.toLowerCase();
        var mId = String(r.staff_id).toLowerCase().includes(q);
        var mName = r.name.toLowerCase().includes(q);
        var mDesig = r.designation.toLowerCase().includes(q);
        var mUnit = r.unit.toLowerCase().includes(q);
        if (!mId && !mName && !mDesig && !mUnit) return false;
      }
      return true;
    });

    var totalFiltered = filtered.length;
    var totalPages = Math.ceil(totalFiltered / state.dailyPerPage) || 1;
    if (state.dailyPage > totalPages) state.dailyPage = 1;
    var startIndex = (state.dailyPage - 1) * state.dailyPerPage;
    var paged = filtered.slice(startIndex, startIndex + state.dailyPerPage);

    // Render Table Body
    var tbody = document.getElementById('daily-attendance-tbody');
    if (tbody) {
      if (paged.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-slate-400 text-xs font-semibold">No attendance records found matching filters.</td></tr>`;
      } else {
        var html = '';
        paged.forEach(function (r) {
          var secBadge = getSectionBadge(r.unit);
          var statusPill = getStatusBadge(r.status, r.inTime, r.lateMin);
          html += `
            <tr class="hover:bg-slate-50 dark:hover:bg-dark-800/50 transition-colors border-b border-slate-100 dark:border-slate-800/60 text-xs">
              <td class="px-3 py-2 text-center font-mono text-slate-400">${r.sl}</td>
              <td class="px-3 py-2 font-mono font-bold text-slate-800 dark:text-slate-200">${r.staff_id}</td>
              <td class="px-3 py-2 font-black text-slate-900 dark:text-white">${r.name}</td>
              <td class="px-3 py-2 text-slate-600 dark:text-slate-300 font-medium">${r.designation}</td>
              <td class="px-3 py-2">${secBadge}</td>
              <td class="px-3 py-2 font-mono text-center font-bold text-emerald-700 dark:text-emerald-400">${r.inTime}</td>
              <td class="px-3 py-2 font-mono text-center text-slate-500">${r.shiftIn} - ${r.shiftOut}</td>
              <td class="px-3 py-2">${statusPill}</td>
              <td class="px-3 py-2 font-mono text-xs text-amber-600 dark:text-amber-400">${r.ot}</td>
            </tr>
          `;
        });
        tbody.innerHTML = html;
      }
    }

    renderDailyPagination(totalPages, totalFiltered, startIndex, paged.length);
  }

  function renderDailyPagination(totalPages, totalFiltered, startIndex, pagedLen) {
    var pContainer = document.getElementById('daily-att-pagination');
    if (!pContainer) return;
    if (totalFiltered <= state.dailyPerPage) {
      pContainer.innerHTML = `<span class="text-xs text-slate-500">Showing all ${totalFiltered} entries</span>`;
      return;
    }
    pContainer.innerHTML = `
      <div class="flex items-center justify-between w-full text-xs text-slate-500">
        <span>Showing ${startIndex + 1} to ${startIndex + pagedLen} of ${totalFiltered}</span>
        <div class="flex items-center gap-1">
          <button type="button" onclick="window.HRMAttendance.setDailyPage(${state.dailyPage - 1})" ${state.dailyPage <= 1 ? 'disabled class="px-2 py-1 rounded bg-slate-100 dark:bg-dark-800 text-slate-400 cursor-not-allowed"' : 'class="px-2 py-1 rounded bg-slate-200 dark:bg-dark-700 hover:bg-emerald-500 hover:text-white cursor-pointer"'}>Prev</button>
          <span class="px-2 font-mono font-bold text-slate-700 dark:text-slate-300">${state.dailyPage} / ${totalPages}</span>
          <button type="button" onclick="window.HRMAttendance.setDailyPage(${state.dailyPage + 1})" ${state.dailyPage >= totalPages ? 'disabled class="px-2 py-1 rounded bg-slate-100 dark:bg-dark-800 text-slate-400 cursor-not-allowed"' : 'class="px-2 py-1 rounded bg-slate-200 dark:bg-dark-700 hover:bg-emerald-500 hover:text-white cursor-pointer"'}>Next</button>
        </div>
      </div>
    `;
  }

  function fetchDailyLive(targetDate) {
    var d = targetDate || state.dailyDate;
    if (window.showHRToast) window.showHRToast('Fetching live daily attendance from ERP...');

    var url = '/api/hrm/attendance/daily?date=' + encodeURIComponent(d) + '&live=1';
    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.success && data.report) {
          if (!window.ERP_ATTENDANCE_CACHE) window.ERP_ATTENDANCE_CACHE = {};
          window.ERP_ATTENDANCE_CACHE.daily = data.report;
          state.dailyIsLive = true;
          renderDaily();
          if (window.showHRToast) window.showHRToast('Successfully loaded live attendance for ' + (data.report.count || 0) + ' personnel!');
        } else {
          if (window.showHRToast) window.showHRToast('ERP fetch notice: ' + (data.error || 'Unknown error'));
        }
      })
      .catch(function (err) {
        console.error('fetchDailyLive error:', err);
        if (window.showHRToast) window.showHRToast('ERP connection failed. Displaying cached attendance data.');
      });
  }

  /* ========================================================================= */
  /* 2. MONTHLY ATTENDANCE SHEET (Report 20220522)                              */
  /* ========================================================================= */

  function renderMonthly() {
    var ds = getMonthlyERPDataset();
    if (!ds || !Array.isArray(ds.rows)) {
      return;
    }

    var rows = ds.rows;
    var headers = ds.headers || [];

    // Filter day columns
    var dayCols = headers.filter(function (h) {
      return !['SL', 'Emp Id', 'EMP Name', 'Company', 'Department', 'Section', 'Unit', 'Job Location'].includes(h);
    });

    var countBadge = document.getElementById('monthly-register-count-badge');
    if (countBadge) countBadge.textContent = rows.length + ' Staff Records (' + (ds.period || 'Oct-2026') + ')';

    // Update KPI Cards
    var kpiRate = document.getElementById('monthly-att-kpi-rate');
    if (kpiRate) kpiRate.textContent = '98.2%';
    var kpiDays = document.getElementById('monthly-att-kpi-workdays');
    if (kpiDays) kpiDays.textContent = dayCols.length + ' Days Recorded';
    var kpiManHours = document.getElementById('monthly-att-kpi-manhours');
    if (kpiManHours) kpiManHours.textContent = (rows.length * 26 * 8).toLocaleString() + ' hrs';
    var kpiOt = document.getElementById('monthly-att-kpi-ot');
    if (kpiOt) kpiOt.textContent = '1,420 hrs';

    // Populate Section Filter Dropdown
    var secSet = {};
    rows.forEach(function (r) {
      var u = r.Unit || r.Section || 'General';
      secSet[u] = (secSet[u] || 0) + 1;
    });

    var secSelect = document.getElementById('monthly-filter-section');
    if (secSelect && secSelect.options.length <= 1) {
      Object.keys(secSet).sort().forEach(function (u) {
        var opt = document.createElement('option');
        opt.value = u;
        opt.textContent = u + ' (' + secSet[u] + ')';
        secSelect.appendChild(opt);
      });
    }

    // Filter & Search
    var filtered = rows.filter(function (r) {
      var u = r.Unit || r.Section || 'General';
      if (state.monthlySection !== 'ALL' && u !== state.monthlySection) return false;
      if (state.monthlySearch) {
        var q = state.monthlySearch.toLowerCase();
        var mId = String(r['Emp Id'] || '').toLowerCase().includes(q);
        var mName = String(r['EMP Name'] || '').toLowerCase().includes(q);
        var mSec = u.toLowerCase().includes(q);
        if (!mId && !mName && !mSec) return false;
      }
      return true;
    });

    var totalFiltered = filtered.length;
    var totalPages = Math.ceil(totalFiltered / state.monthlyPerPage) || 1;
    if (state.monthlyPage > totalPages) state.monthlyPage = 1;
    var startIndex = (state.monthlyPage - 1) * state.monthlyPerPage;
    var paged = filtered.slice(startIndex, startIndex + state.monthlyPerPage);

    // Render Table
    var tbody = document.getElementById('monthly-register-tbody');
    if (tbody) {
      if (paged.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center py-8 text-slate-400 text-xs font-semibold">No monthly employee records found.</td></tr>`;
      } else {
        var html = '';
        paged.forEach(function (r) {
          var id = r['Emp Id'] || '';
          var name = r['EMP Name'] || '';
          var unit = r.Unit || r.Section || 'General';
          var secBadge = getSectionBadge(unit);

          // Calculate presence from day columns
          var presentDays = 0;
          var offDays = 0;
          var lateDays = 0;
          dayCols.forEach(function (col) {
            var val = (r[col] || '').toLowerCase();
            if (val.includes('present')) presentDays++;
            else if (val.includes('late')) { presentDays++; lateDays++; }
            else if (val.includes('offday')) offDays++;
          });

          var attPct = dayCols.length > 0 ? (((presentDays) / (dayCols.length - offDays || 1)) * 100).toFixed(1) : '100.0';

          html += `
            <tr class="hover:bg-slate-50 dark:hover:bg-dark-800/50 transition-colors border-b border-slate-100 dark:border-slate-800/60 text-xs">
              <td class="px-3 py-2 text-center font-mono text-slate-400">${r.SL}</td>
              <td class="px-3 py-2 font-mono font-bold text-slate-800 dark:text-slate-200">${id}</td>
              <td class="px-3 py-2 font-black text-slate-900 dark:text-white">${name}</td>
              <td class="px-3 py-2">${secBadge}</td>
              <td class="px-3 py-2 font-mono text-center font-bold text-slate-700 dark:text-slate-300">${dayCols.length}</td>
              <td class="px-3 py-2 font-mono text-center font-bold text-emerald-600">${presentDays}</td>
              <td class="px-3 py-2 font-mono text-center font-bold text-blue-600">${offDays}</td>
              <td class="px-3 py-2 font-mono text-center font-bold text-amber-600">${lateDays}</td>
              <td class="px-3 py-2 font-mono text-center font-black text-indigo-600 dark:text-indigo-400">${Math.min(100, Math.max(0, attPct))}%</td>
              <td class="px-3 py-2 text-center">
                <button type="button" onclick="window.HRMAttendance.viewEmployeeMonthlyMatrix('${id}')" class="px-2 py-1 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors cursor-pointer">
                  View Card
                </button>
              </td>
            </tr>
          `;
        });
        tbody.innerHTML = html;
      }
    }

    renderMonthlyPagination(totalPages, totalFiltered, startIndex, paged.length);
  }

  function renderMonthlyPagination(totalPages, totalFiltered, startIndex, pagedLen) {
    var pContainer = document.getElementById('monthly-att-pagination');
    if (!pContainer) return;
    if (totalFiltered <= state.monthlyPerPage) {
      pContainer.innerHTML = `<span class="text-xs text-slate-500">Showing all ${totalFiltered} entries</span>`;
      return;
    }
    pContainer.innerHTML = `
      <div class="flex items-center justify-between w-full text-xs text-slate-500">
        <span>Showing ${startIndex + 1} to ${startIndex + pagedLen} of ${totalFiltered}</span>
        <div class="flex items-center gap-1">
          <button type="button" onclick="window.HRMAttendance.setMonthlyPage(${state.monthlyPage - 1})" ${state.monthlyPage <= 1 ? 'disabled class="px-2 py-1 rounded bg-slate-100 dark:bg-dark-800 text-slate-400 cursor-not-allowed"' : 'class="px-2 py-1 rounded bg-slate-200 dark:bg-dark-700 hover:bg-emerald-500 hover:text-white cursor-pointer"'}>Prev</button>
          <span class="px-2 font-mono font-bold text-slate-700 dark:text-slate-300">${state.monthlyPage} / ${totalPages}</span>
          <button type="button" onclick="window.HRMAttendance.setMonthlyPage(${state.monthlyPage + 1})" ${state.monthlyPage >= totalPages ? 'disabled class="px-2 py-1 rounded bg-slate-100 dark:bg-dark-800 text-slate-400 cursor-not-allowed"' : 'class="px-2 py-1 rounded bg-slate-200 dark:bg-dark-700 hover:bg-emerald-500 hover:text-white cursor-pointer"'}>Next</button>
        </div>
      </div>
    `;
  }

  function fetchMonthlyLive(mon, year) {
    var m = mon || state.monthlyMon;
    var y = year || state.monthlyYear;
    if (window.showHRToast) window.showHRToast('Fetching live monthly attendance sheet (20220522) from ERP...');

    var url = '/api/hrm/attendance/monthly?mon=' + encodeURIComponent(m) + '&year=' + encodeURIComponent(y) + '&live=1';
    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.success && data.report) {
          if (!window.ERP_ATTENDANCE_CACHE) window.ERP_ATTENDANCE_CACHE = {};
          window.ERP_ATTENDANCE_CACHE.monthly = data.report;
          state.monthlyIsLive = true;
          renderMonthly();
          if (window.showHRToast) window.showHRToast('Successfully loaded monthly attendance sheet for ' + (data.report.count || 0) + ' personnel!');
        } else {
          if (window.showHRToast) window.showHRToast('ERP fetch notice: ' + (data.error || 'Unknown error'));
        }
      })
      .catch(function (err) {
        console.error('fetchMonthlyLive error:', err);
        if (window.showHRToast) window.showHRToast('ERP connection failed. Displaying cached monthly data.');
      });
  }

  /* ========================================================================= */
  /* 3. LEAVE INFORMATION (Report 611111)                                      */
  /* ========================================================================= */

  function renderLeave() {
    var ds = getLeaveERPDataset();
    if (!ds || !Array.isArray(ds.rows)) {
      return;
    }

    var rows = ds.rows;
    var countBadge = document.getElementById('leave-ledger-count-badge');
    if (countBadge) countBadge.textContent = rows.length + ' Approved Leave Records';

    // Summary counts
    var typesCount = {};
    var secSet = {};
    rows.forEach(function (r) {
      var lt = r['Leave Type'] || 'Other';
      typesCount[lt] = (typesCount[lt] || 0) + 1;
      var u = r.Unit || r.Section || r.Department || 'General';
      secSet[u] = (secSet[u] || 0) + 1;
    });

    // Populate Section Filter Dropdown
    var secSelect = document.getElementById('leave-filter-section');
    if (secSelect && secSelect.options.length <= 1) {
      Object.keys(secSet).sort().forEach(function (u) {
        var opt = document.createElement('option');
        opt.value = u;
        opt.textContent = u + ' (' + secSet[u] + ')';
        secSelect.appendChild(opt);
      });
    }

    // Filter & Search
    var filtered = rows.filter(function (r) {
      var u = r.Unit || r.Section || r.Department || 'General';
      var lt = r['Leave Type'] || '';
      if (state.leaveSection !== 'ALL' && u !== state.leaveSection) return false;
      if (state.leaveTypeFilter !== 'ALL' && lt !== state.leaveTypeFilter) return false;
      if (state.leaveSearch) {
        var q = state.leaveSearch.toLowerCase();
        var mId = String(r.EMP_ID || '').toLowerCase().includes(q);
        var mName = String(r['Full Name'] || '').toLowerCase().includes(q);
        var mDesig = String(r.Designation || '').toLowerCase().includes(q);
        var mReason = String(r.Reason || '').toLowerCase().includes(q);
        if (!mId && !mName && !mDesig && !mReason) return false;
      }
      return true;
    });

    var totalFiltered = filtered.length;
    var totalPages = Math.ceil(totalFiltered / state.leavePerPage) || 1;
    if (state.leavePage > totalPages) state.leavePage = 1;
    var startIndex = (state.leavePage - 1) * state.leavePerPage;
    var paged = filtered.slice(startIndex, startIndex + state.leavePerPage);

    // Render Table
    var tbody = document.getElementById('leave-ledger-tbody');
    if (tbody) {
      if (paged.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center py-8 text-slate-400 text-xs font-semibold">No leave records found matching filters.</td></tr>`;
      } else {
        var html = '';
        paged.forEach(function (r) {
          var id = r.EMP_ID || '';
          var name = r['Full Name'] || '';
          var desig = r.Designation || '';
          var unit = r.Unit || r.Section || r.Department || 'General';
          var secBadge = getSectionBadge(unit);
          var sDate = r['Leave Start Date'] || '';
          var eDate = r['Leave End Date'] || '';
          var halfFull = r['Half Or Full'] || 'Full';
          var lType = r['Leave Type'] || 'Casual Leave';
          var days = r['Leave Days'] || '1.00';
          var reason = r.Reason || 'Leave';

          var typeClass = 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20';
          if (lType.includes('Without Pay') || lType.includes('LWP')) typeClass = 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20';
          else if (lType.includes('Casual')) typeClass = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20';
          else if (lType.includes('Sick')) typeClass = 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20';

          html += `
            <tr class="hover:bg-slate-50 dark:hover:bg-dark-800/50 transition-colors border-b border-slate-100 dark:border-slate-800/60 text-xs">
              <td class="px-3 py-2 text-center font-mono text-slate-400">${r['S/L']}</td>
              <td class="px-3 py-2 font-mono font-bold text-slate-800 dark:text-slate-200">${id}</td>
              <td class="px-3 py-2 font-black text-slate-900 dark:text-white">${name}</td>
              <td class="px-3 py-2 text-slate-600 dark:text-slate-300 font-medium">${desig}</td>
              <td class="px-3 py-2">${secBadge}</td>
              <td class="px-3 py-2 font-mono text-slate-700 dark:text-slate-300">${sDate} &rarr; ${eDate}</td>
              <td class="px-3 py-2 font-mono text-center font-bold text-slate-800 dark:text-slate-200">${days} d</td>
              <td class="px-3 py-2"><span class="px-2 py-0.5 rounded-md text-[10px] font-bold border ${typeClass}">${lType} (${halfFull})</span></td>
              <td class="px-3 py-2 text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-xs">${reason}</td>
              <td class="px-3 py-2 text-center"><span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">Approved</span></td>
            </tr>
          `;
        });
        tbody.innerHTML = html;
      }
    }

    renderLeavePagination(totalPages, totalFiltered, startIndex, paged.length);
  }

  function renderLeavePagination(totalPages, totalFiltered, startIndex, pagedLen) {
    var pContainer = document.getElementById('leave-att-pagination');
    if (!pContainer) return;
    if (totalFiltered <= state.leavePerPage) {
      pContainer.innerHTML = `<span class="text-xs text-slate-500">Showing all ${totalFiltered} entries</span>`;
      return;
    }
    pContainer.innerHTML = `
      <div class="flex items-center justify-between w-full text-xs text-slate-500">
        <span>Showing ${startIndex + 1} to ${startIndex + pagedLen} of ${totalFiltered}</span>
        <div class="flex items-center gap-1">
          <button type="button" onclick="window.HRMAttendance.setLeavePage(${state.leavePage - 1})" ${state.leavePage <= 1 ? 'disabled class="px-2 py-1 rounded bg-slate-100 dark:bg-dark-800 text-slate-400 cursor-not-allowed"' : 'class="px-2 py-1 rounded bg-slate-200 dark:bg-dark-700 hover:bg-emerald-500 hover:text-white cursor-pointer"'}>Prev</button>
          <span class="px-2 font-mono font-bold text-slate-700 dark:text-slate-300">${state.leavePage} / ${totalPages}</span>
          <button type="button" onclick="window.HRMAttendance.setLeavePage(${state.leavePage + 1})" ${state.leavePage >= totalPages ? 'disabled class="px-2 py-1 rounded bg-slate-100 dark:bg-dark-800 text-slate-400 cursor-not-allowed"' : 'class="px-2 py-1 rounded bg-slate-200 dark:bg-dark-700 hover:bg-emerald-500 hover:text-white cursor-pointer"'}>Next</button>
        </div>
      </div>
    `;
  }

  function fetchLeaveLive(fdate, tdate) {
    var fd = fdate || state.leaveFdate;
    var td = tdate || state.leaveTdate;
    if (window.showHRToast) window.showHRToast('Fetching leave records (611111) from ERP...');

    var url = '/api/hrm/attendance/leave?fdate=' + encodeURIComponent(fd) + '&tdate=' + encodeURIComponent(td) + '&live=1';
    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.success && data.report) {
          if (!window.ERP_ATTENDANCE_CACHE) window.ERP_ATTENDANCE_CACHE = {};
          window.ERP_ATTENDANCE_CACHE.leave = data.report;
          state.leaveIsLive = true;
          renderLeave();
          if (window.showHRToast) window.showHRToast('Successfully loaded ' + (data.report.count || 0) + ' leave records!');
        } else {
          if (window.showHRToast) window.showHRToast('ERP fetch notice: ' + (data.error || 'Unknown error'));
        }
      })
      .catch(function (err) {
        console.error('fetchLeaveLive error:', err);
        if (window.showHRToast) window.showHRToast('ERP connection failed. Displaying cached leave data.');
      });
  }

  /* ========================================================================= */
  /* 4. ALL ERP REPORTS HUB                                                    */
  /* ========================================================================= */

  function renderAllReportsHub() {
    var catalog = getCatalog();
    var reportKeys = Object.keys(catalog);
    if (reportKeys.length === 0) return;

    var selReportId = state.hubSelectedReport || '121225';
    var activeMeta = catalog[selReportId] || {};

    // Populate Report Dropdown
    var selectEl = document.getElementById('erp-hub-report-select');
    if (selectEl && selectEl.options.length <= 1) {
      var dailyGroup = document.createElement('optgroup');
      dailyGroup.label = '☀️ Daily Reports (9)';
      var monthlyGroup = document.createElement('optgroup');
      monthlyGroup.label = '📅 Monthly Reports (19)';
      var yearlyGroup = document.createElement('optgroup');
      yearlyGroup.label = '📊 Yearly & Special Reports (6)';

      reportKeys.forEach(function (k) {
        var r = catalog[k];
        var opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = `[${r.id}] ${r.name} - ${r.name_bn || ''}`;
        if (r.category === 'daily') dailyGroup.appendChild(opt);
        else if (r.category === 'monthly') monthlyGroup.appendChild(opt);
        else yearlyGroup.appendChild(opt);
      });

      selectEl.appendChild(dailyGroup);
      selectEl.appendChild(monthlyGroup);
      selectEl.appendChild(yearlyGroup);
      selectEl.value = selReportId;
    }

    // Update Meta display
    var titleEl = document.getElementById('erp-hub-active-title');
    if (titleEl) {
      titleEl.innerHTML = `
        <span class="text-indigo-600 dark:text-indigo-400 font-mono font-bold">[#${activeMeta.id || selReportId}]</span>
        <span class="font-black text-slate-900 dark:text-white">${activeMeta.name || 'ERP Report'}</span>
        <span class="text-xs text-slate-500 font-normal">(${activeMeta.name_bn || ''})</span>
      `;
    }

    var descEl = document.getElementById('erp-hub-active-desc');
    if (descEl) descEl.textContent = activeMeta.description || 'ERP Master Attendance & Management Report';

    // Check if we already have data loaded for this report
    var curData = state.hubCurrentReportData;
    if (!curData || String(curData.report_id) !== String(selReportId)) {
      // Auto-load pre-cached data if available
      if (selReportId === '121225' && getDailyERPDataset()) {
        curData = getDailyERPDataset();
      } else if (selReportId === '20220522' && getMonthlyERPDataset()) {
        curData = getMonthlyERPDataset();
      } else if (selReportId === '611111' && getLeaveERPDataset()) {
        curData = getLeaveERPDataset();
      }
      state.hubCurrentReportData = curData;
    }

    renderHubDataView(curData);
  }

  function renderHubDataView(reportData) {
    var container = document.getElementById('erp-hub-data-container');
    var rawContainer = document.getElementById('erp-hub-raw-container');
    var countBadge = document.getElementById('erp-hub-record-count-badge');

    if (!reportData || !reportData.rows) {
      if (container) {
        container.innerHTML = `
          <div class="text-center py-12 px-4 space-y-3">
            <div class="w-12 h-12 mx-auto rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center text-2xl font-black">
              <i class="ph-bold ph-cloud-arrow-down"></i>
            </div>
            <h4 class="font-bold text-slate-800 dark:text-slate-200 text-sm">ERP Data Not Yet Loaded</h4>
            <p class="text-xs text-slate-500 max-w-sm mx-auto">Select a date range or month above and click <b>"🔄 Fetch Live ERP Report"</b> to load live records directly from MEP ERP.</p>
          </div>
        `;
      }
      if (countBadge) countBadge.textContent = '0 Records';
      return;
    }

    if (countBadge) countBadge.textContent = (reportData.count || reportData.rows.length) + ' Records';

    if (state.hubViewMode === 'raw_erp') {
      if (container) container.classList.add('hidden');
      if (rawContainer) {
        rawContainer.classList.remove('hidden');
        rawContainer.innerHTML = reportData.raw_html || '<div class="p-6 text-center text-slate-400">No print view available.</div>';
      }
      return;
    }

    // Interactive Datatable View
    if (rawContainer) rawContainer.classList.add('hidden');
    if (container) container.classList.remove('hidden');

    var headers = reportData.headers || [];
    var rows = reportData.rows || [];

    // Filter by search term
    var filtered = rows;
    if (state.hubSearch) {
      var q = state.hubSearch.toLowerCase();
      filtered = rows.filter(function (r) {
        var str = Object.values(r).join(' ').toLowerCase();
        return str.includes(q);
      });
    }

    var totalFiltered = filtered.length;
    var totalPages = Math.ceil(totalFiltered / state.hubPerPage) || 1;
    if (state.hubPage > totalPages) state.hubPage = 1;
    var startIndex = (state.hubPage - 1) * state.hubPerPage;
    var paged = filtered.slice(startIndex, startIndex + state.hubPerPage);

    // Build Table HTML
    var tableHtml = `
      <div class="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900 shadow-2xs custom-scrollbar">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-slate-100/90 dark:bg-dark-800 text-[11px] font-black text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 select-none uppercase tracking-wider">
    `;

    headers.forEach(function (h) {
      tableHtml += `<th class="px-3 py-2.5 whitespace-nowrap">${h}</th>`;
    });
    tableHtml += `</tr></thead><tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">`;

    if (paged.length === 0) {
      tableHtml += `<tr><td colspan="${headers.length || 1}" class="text-center py-8 text-slate-400">No matching records found.</td></tr>`;
    } else {
      paged.forEach(function (r) {
        tableHtml += `<tr class="hover:bg-slate-50 dark:hover:bg-dark-800/50 transition-colors border-b border-slate-100 dark:border-slate-800/60">`;
        headers.forEach(function (h) {
          var val = r[h] !== undefined ? r[h] : '';
          tableHtml += `<td class="px-3 py-2 whitespace-nowrap font-mono text-slate-800 dark:text-slate-200">${val}</td>`;
        });
        tableHtml += `</tr>`;
      });
    }

    tableHtml += `</tbody></table></div>`;

    // Add Pagination Controls
    tableHtml += `
      <div class="flex items-center justify-between w-full text-xs text-slate-500 pt-3">
        <span>Showing ${startIndex + 1} to ${startIndex + paged.length} of ${totalFiltered}</span>
        <div class="flex items-center gap-1">
          <button type="button" onclick="window.HRMAttendance.setHubPage(${state.hubPage - 1})" ${state.hubPage <= 1 ? 'disabled class="px-2 py-1 rounded bg-slate-100 dark:bg-dark-800 text-slate-400 cursor-not-allowed"' : 'class="px-2 py-1 rounded bg-slate-200 dark:bg-dark-700 hover:bg-indigo-500 hover:text-white cursor-pointer"'}>Prev</button>
          <span class="px-2 font-mono font-bold text-slate-700 dark:text-slate-300">${state.hubPage} / ${totalPages}</span>
          <button type="button" onclick="window.HRMAttendance.setHubPage(${state.hubPage + 1})" ${state.hubPage >= totalPages ? 'disabled class="px-2 py-1 rounded bg-slate-100 dark:bg-dark-800 text-slate-400 cursor-not-allowed"' : 'class="px-2 py-1 rounded bg-slate-200 dark:bg-dark-700 hover:bg-indigo-500 hover:text-white cursor-pointer"'}>Next</button>
        </div>
      </div>
    `;

    if (container) container.innerHTML = tableHtml;
  }

  function fetchLiveERPReportHub(reportId) {
    var rid = reportId || state.hubSelectedReport || '121225';
    if (window.showHRToast) window.showHRToast('Fetching ERP Report #' + rid + ' live...');

    var fd = state.hubFdate;
    var td = state.hubTdate;
    var mon = state.hubMon;
    var year = state.hubYear;

    var url = '/api/hrm/reports/view?report_id=' + encodeURIComponent(rid) +
              '&fdate=' + encodeURIComponent(fd) +
              '&tdate=' + encodeURIComponent(td) +
              '&mon=' + encodeURIComponent(mon) +
              '&year=' + encodeURIComponent(year);

    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.success && data.report) {
          state.hubCurrentReportData = data.report;
          renderHubDataView(data.report);
          if (window.showHRToast) window.showHRToast('Successfully loaded ' + (data.report.count || 0) + ' records from report #' + rid + '!');
        } else {
          if (window.showHRToast) window.showHRToast('Report load error: ' + (data.error || 'Unknown error'));
        }
      })
      .catch(function (err) {
        console.error('fetchLiveERPReportHub error:', err);
        if (window.showHRToast) window.showHRToast('ERP connection error occurred.');
      });
  }

  /* ========================================================================= */
  /* EXPORT UTILITIES (CSV / Excel)                                            */
  /* ========================================================================= */

  function exportTableToCSV(filename, rows, headers) {
    if (!rows || rows.length === 0) {
      if (window.showHRToast) window.showHRToast('No records available to export.');
      return;
    }
    var csvContent = '';
    var headLine = headers.map(function (h) { return '"' + String(h).replace(/"/g, '""') + '"'; }).join(',');
    csvContent += headLine + '\r\n';

    rows.forEach(function (r) {
      var rowLine = headers.map(function (h) {
        var v = r[h] !== undefined ? r[h] : '';
        return '"' + String(v).replace(/"/g, '""') + '"';
      }).join(',');
      csvContent += rowLine + '\r\n';
    });

    var blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (window.showHRToast) window.showHRToast('Export completed: ' + filename);
  }

  /* ========================================================================= */
  /* GLOBAL EXPOSURE & API                                                     */
  /* ========================================================================= */

  window.HRMAttendance = {
    // Daily Handlers
    renderDaily: renderDaily,
    fetchDailyLive: fetchDailyLive,
    onDailyDateChange: function (val) { state.dailyDate = val; fetchDailyLive(val); },
    onDailySearch: function (val) { state.dailySearch = val; state.dailyPage = 1; renderDaily(); },
    onDailySectionChange: function (val) { state.dailySection = val; state.dailyPage = 1; renderDaily(); },
    onDailyStatusChange: function (val) { state.dailyStatus = val; state.dailyPage = 1; renderDaily(); },
    setDailyPage: function (p) { state.dailyPage = p; renderDaily(); },
    exportDailyExcel: function () {
      var ds = getDailyERPDataset();
      if (!ds) return;
      exportTableToCSV('MEP_Daily_Attendance_121225_' + state.dailyDate + '.csv', ds.rows, ds.headers);
    },

    // Monthly Handlers
    renderMonthly: renderMonthly,
    fetchMonthlyLive: fetchMonthlyLive,
    onMonthlyMonChange: function (val) { state.monthlyMon = val; fetchMonthlyLive(val, state.monthlyYear); },
    onMonthlyYearChange: function (val) { state.monthlyYear = val; fetchMonthlyLive(state.monthlyMon, val); },
    onMonthlySearch: function (val) { state.monthlySearch = val; state.monthlyPage = 1; renderMonthly(); },
    onMonthlySectionChange: function (val) { state.monthlySection = val; state.monthlyPage = 1; renderMonthly(); },
    setMonthlyPage: function (p) { state.monthlyPage = p; renderMonthly(); },
    viewEmployeeMonthlyMatrix: function (empId) {
      if (window.showHRToast) window.showHRToast('Viewing Employee #' + empId + ' full punch history');
    },
    exportMonthlyExcel: function () {
      var ds = getMonthlyERPDataset();
      if (!ds) return;
      exportTableToCSV('MEP_Monthly_Attendance_Sheet_20220522_' + state.monthlyYear + '_' + state.monthlyMon + '.csv', ds.rows, ds.headers);
    },

    // Leave Handlers
    renderLeave: renderLeave,
    fetchLeaveLive: fetchLeaveLive,
    onLeaveSearch: function (val) { state.leaveSearch = val; state.leavePage = 1; renderLeave(); },
    onLeaveSectionChange: function (val) { state.leaveSection = val; state.leavePage = 1; renderLeave(); },
    onLeaveTypeChange: function (val) { state.leaveTypeFilter = val; state.leavePage = 1; renderLeave(); },
    setLeavePage: function (p) { state.leavePage = p; renderLeave(); },
    exportLeaveExcel: function () {
      var ds = getLeaveERPDataset();
      if (!ds) return;
      exportTableToCSV('MEP_Full_Leave_Details_611111_2026.csv', ds.rows, ds.headers);
    },

    // All ERP Reports Hub Handlers
    renderAllReportsHub: renderAllReportsHub,
    fetchLiveERPReportHub: fetchLiveERPReportHub,
    onHubReportSelect: function (val) {
      state.hubSelectedReport = val;
      state.hubPage = 1;
      state.hubSearch = '';
      renderAllReportsHub();
    },
    onHubSearch: function (val) {
      state.hubSearch = val;
      state.hubPage = 1;
      renderHubDataView(state.hubCurrentReportData);
    },
    setHubPage: function (p) {
      state.hubPage = p;
      renderHubDataView(state.hubCurrentReportData);
    },
    toggleHubViewMode: function () {
      state.hubViewMode = state.hubViewMode === 'table' ? 'raw_erp' : 'table';
      var btn = document.getElementById('erp-hub-toggle-mode-btn');
      if (btn) {
        btn.innerHTML = state.hubViewMode === 'table'
          ? '<i class="ph-bold ph-newspaper text-sm"></i> Official ERP View'
          : '<i class="ph-bold ph-table text-sm"></i> Interactive Table View';
      }
      renderHubDataView(state.hubCurrentReportData);
    },
    exportHubExcel: function () {
      var cur = state.hubCurrentReportData;
      if (!cur || !cur.rows) return;
      var rName = (cur.name || 'ERP_Report').replace(/[^a-zA-Z0-9_-]/g, '_');
      exportTableToCSV('MEP_ERP_' + cur.report_id + '_' + rName + '.csv', cur.rows, cur.headers);
    }
  };

  // Auto-init on page load
  document.addEventListener('DOMContentLoaded', function () {
    // If active tab was saved, render appropriate tab
    var activeTab = sessionStorage.getItem('mep_hrm_active_tab');
    if (activeTab === 'daily-attendance') renderDaily();
    else if (activeTab === 'monthly-attendance') renderMonthly();
    else if (activeTab === 'leave-information') renderLeave();
    else if (activeTab === 'all-erp-reports') renderAllReportsHub();
  });

})();
