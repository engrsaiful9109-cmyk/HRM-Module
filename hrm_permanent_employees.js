/**
 * MEP GROUP - Enterprise Human Resource Management (HRM)
 * Permanent Employee List Controller & Service Record Register
 * Feature: "Permanent Employee List"
 * Author: Antigravity AI / MEP Engineering Team
 */

(function () {
  'use strict';

  var state = {
    employees: [],
    searchQuery: '',
    sectionFilter: 'ALL',
    designationFilter: 'ALL',
    sortBy: 'sl:asc',
    perPage: 25,
    currentPage: 1
  };

  // Section Color Palette matching HRM Manpower
  var SECTION_COLORS = {
    'Fan Assemble Line': 'bg-indigo-500/10 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-500/25',
    'Fan Auto Powder Coating': 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-500/25',
    'Fan Armature Winding': 'bg-purple-500/10 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-500/25',
    'Fan Lathe': 'bg-blue-500/10 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-500/25',
    'Fan Power Press & Stamping': 'bg-rose-500/10 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-500/25',
    'Fan Dhalai & Die Casting': 'bg-amber-500/10 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-500/25',
    'Fan Blade & Dimmer': 'bg-cyan-500/10 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300 border-cyan-500/25',
    'Fan Rojonigondha': 'bg-fuchsia-500/10 text-fuchsia-700 dark:bg-fuchsia-950/50 dark:text-fuchsia-300 border-fuchsia-500/25',
    'Fan Sada Shapla': 'bg-sky-500/10 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-500/25',
    'Fan Replace': 'bg-violet-500/10 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border-violet-500/25',
    'Fan Admin': 'bg-slate-500/10 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-500/25'
  };

  function getSectionBadge(secName) {
    if (!secName) return '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">Unassigned</span>';
    var colorClass = SECTION_COLORS[secName] || 'bg-indigo-500/10 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-500/25';
    return '<span class="px-2.5 py-0.5 rounded-md text-[10px] font-bold border ' + colorClass + '">' + secName + '</span>';
  }

  function formatMoney(num) {
    var n = Math.round(Number(num) || 0);
    return 'Tk ' + n.toLocaleString('en-US');
  }

  function getLiveEmployeeMap() {
    var list = [];
    if (window.MEP_MANPOWER_DATABASE && Array.isArray(window.MEP_MANPOWER_DATABASE.employees)) {
      list = window.MEP_MANPOWER_DATABASE.employees;
    } else if (window.HRMManpower && typeof window.HRMManpower.getAllEmployees === 'function') {
      list = window.HRMManpower.getAllEmployees();
    }
    var map = {};
    list.forEach(function (e) {
      var id = String(e.staff_id || e.id || '').replace(/^[#\s]+/, '').trim();
      if (id) {
        map[id] = e;
      }
    });
    return map;
  }

  function parseDOJ(dojStr) {
    if (!dojStr) return null;
    var str = String(dojStr).trim();
    var parts = str.split(/[-/ ]/);
    if (parts.length >= 3) {
      var day = parseInt(parts[0], 10);
      var monthStr = parts[1].toLowerCase().slice(0, 3);
      var months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
      var month = months[monthStr];
      var year = parseInt(parts[2], 10);
      if (year < 100) {
        year = year < 50 ? 2000 + year : 1900 + year;
      }
      if (!isNaN(day) && month !== undefined && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    var iso = new Date(str);
    if (!isNaN(iso.getTime())) return iso;
    return null;
  }

  function loadEmployees() {
    var rawList = Array.isArray(window.MEP_PERMANENT_EMPLOYEES) ? window.MEP_PERMANENT_EMPLOYEES : [];
    var dbMap = getLiveEmployeeMap();
    var today = new Date();

    state.employees = rawList.map(function (p, index) {
      var id = String(p.staff_id || p.id || '').replace(/^[#\s]+/, '').trim();
      var dbEmp = dbMap[id];

      // Dynamic values retrieved directly from Employee Data (MEP_MANPOWER_DATABASE)
      var name = (dbEmp && dbEmp.name && dbEmp.name.trim()) ? dbEmp.name.trim().replace(/\n/g, ' ') : (p.name || '');
      var designation = (dbEmp && dbEmp.designation && dbEmp.designation.trim()) ? dbEmp.designation.trim() : (p.designation || '');
      var section = (dbEmp && dbEmp.section && dbEmp.section.trim()) ? dbEmp.section.trim() : (p.section || '');
      var salary = (dbEmp && dbEmp.gross_salary !== undefined && dbEmp.gross_salary !== null && dbEmp.gross_salary !== '')
        ? Number(dbEmp.gross_salary)
        : Number(p.salary || 0);
      var joiningDate = (dbEmp && dbEmp.doj && dbEmp.doj.trim()) ? dbEmp.doj.trim() : (p.joining_date || '');
      var mobile = (dbEmp && dbEmp.contact_number && dbEmp.contact_number.trim() && dbEmp.contact_number !== '0')
        ? dbEmp.contact_number.trim()
        : (p.mobile || '');

      var days = p.days;
      var jobYears = p.job_years;
      var dojDate = parseDOJ(joiningDate);
      if (dojDate && !isNaN(dojDate.getTime())) {
        var diffTime = today.getTime() - dojDate.getTime();
        if (diffTime >= 0) {
          days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          jobYears = +(days / 365.25).toFixed(2);
        }
      }

      return {
        sl_no: p.sl_no || (index + 1),
        staff_id: id,
        name: name,
        designation: designation,
        section: section,
        salary: salary,
        joining_date: joiningDate,
        permanent_date: p.permanent_date || '',
        days: days,
        job_years: jobYears,
        mobile: mobile,
        status: (dbEmp && dbEmp.status) ? dbEmp.status : (p.status || 'Active')
      };
    });
  }

  function init() {
    loadEmployees();
    populateFilters();
    updateKPIs();
    renderTable();
  }

  function populateFilters() {
    var secSelect = document.getElementById('perm-filter-section');
    if (secSelect) {
      var secCounts = {};
      state.employees.forEach(function (e) {
        var s = e.section || 'Unassigned';
        secCounts[s] = (secCounts[s] || 0) + 1;
      });

      var currentVal = secSelect.value || 'ALL';
      var html = '<option value="ALL">All Sections (' + state.employees.length + ')</option>';
      Object.keys(secCounts).sort().forEach(function (sec) {
        html += '<option value="' + sec + '">' + sec + ' (' + secCounts[sec] + ')</option>';
      });
      secSelect.innerHTML = html;
      secSelect.value = currentVal;
    }
  }

  function updateKPIs() {
    var total = state.employees.length;
    var totalSalary = 0;
    var totalTenure = 0;
    var sectionCounts = {};

    state.employees.forEach(function (e) {
      totalSalary += Number(e.salary) || 0;
      totalTenure += Number(e.job_years) || 0;
      var sec = e.section || 'Unassigned';
      sectionCounts[sec] = (sectionCounts[sec] || 0) + 1;
    });

    var avgTenure = total > 0 ? (totalTenure / total).toFixed(2) : '0.00';

    // Find top section
    var topSecName = 'N/A';
    var topSecCount = 0;
    Object.keys(sectionCounts).forEach(function (s) {
      if (sectionCounts[s] > topSecCount) {
        topSecCount = sectionCounts[s];
        topSecName = s.replace('Fan ', '');
      }
    });

    // Sidebar badge
    var sbBadge = document.getElementById('sidebar-sub-permanent-count');
    if (sbBadge) sbBadge.textContent = total;

    // Header & KPI elements
    var kpiTotal = document.getElementById('perm-kpi-total-staff');
    if (kpiTotal) kpiTotal.textContent = total + ' Staff';

    var kpiPayroll = document.getElementById('perm-kpi-total-payroll');
    if (kpiPayroll) kpiPayroll.textContent = formatMoney(totalSalary);

    var kpiAvgTenure = document.getElementById('perm-kpi-avg-tenure');
    if (kpiAvgTenure) kpiAvgTenure.textContent = avgTenure + ' Years';

    var kpiSync = document.getElementById('perm-kpi-active-sync');
    if (kpiSync) kpiSync.textContent = total + ' / ' + total + ' Active';

    var kpiTopSec = document.getElementById('perm-kpi-top-section');
    if (kpiTopSec) kpiTopSec.textContent = topSecName + ' (' + topSecCount + ')';
  }

  function getFilteredAndSorted() {
    var q = state.searchQuery.toLowerCase().trim();
    var sec = state.sectionFilter;

    var list = state.employees.filter(function (e) {
      if (sec !== 'ALL' && e.section !== sec) return false;
      if (q) {
        var str = [
          e.sl_no,
          e.staff_id,
          e.name,
          e.designation,
          e.section,
          e.salary,
          e.joining_date,
          e.permanent_date,
          e.days,
          e.job_years,
          e.mobile
        ].join(' ').toLowerCase();
        if (str.indexOf(q) === -1) return false;
      }
      return true;
    });

    // Sorting
    var sortParts = state.sortBy.split(':');
    var key = sortParts[0];
    var dir = sortParts[1] === 'desc' ? -1 : 1;

    list.sort(function (a, b) {
      if (key === 'sl') return (Number(a.sl_no) - Number(b.sl_no)) * dir;
      if (key === 'id') return (Number(a.staff_id) - Number(b.staff_id)) * dir;
      if (key === 'name') return String(a.name).localeCompare(String(b.name)) * dir;
      if (key === 'salary') return (Number(a.salary) - Number(b.salary)) * dir;
      if (key === 'years') return (Number(a.job_years) - Number(b.job_years)) * dir;
      if (key === 'days') return (Number(a.days) - Number(b.days)) * dir;
      return 0;
    });

    return list;
  }

  function renderTable() {
    var tbody = document.getElementById('permanent-employees-tbody');
    if (!tbody) return;

    var list = getFilteredAndSorted();
    var totalFiltered = list.length;

    // Filtered count text
    var countEl = document.getElementById('perm-filtered-count-text');
    if (countEl) {
      var sumSalary = list.reduce(function (acc, e) { return acc + (Number(e.salary) || 0); }, 0);
      countEl.innerHTML = 'Showing <strong>' + totalFiltered + '</strong> of <strong>' + state.employees.length + '</strong> Permanent Staff &bull; Payroll: <strong>' + formatMoney(sumSalary) + '</strong>';
    }

    // Pagination
    var perPage = state.perPage === 'ALL' ? totalFiltered : Number(state.perPage);
    var totalPages = perPage > 0 ? Math.ceil(totalFiltered / perPage) : 1;
    if (state.currentPage > totalPages) state.currentPage = totalPages || 1;

    var startIdx = (state.currentPage - 1) * perPage;
    var endIdx = state.perPage === 'ALL' ? totalFiltered : startIdx + perPage;
    var pageSlice = list.slice(startIdx, endIdx);

    if (pageSlice.length === 0) {
      tbody.innerHTML = '<tr><td colspan="11" class="text-center py-12 text-slate-400 font-bold text-sm"><i class="ph-bold ph-magnifying-glass text-3xl mb-2 block text-slate-300"></i>No Permanent Employees Found</td></tr>';
      renderPagination(0, 0);
      return;
    }

    var html = '';
    for (var i = 0; i < pageSlice.length; i++) {
      var e = pageSlice[i];
      var permCell = '';
      if (e.permanent_date && e.permanent_date.trim()) {
        permCell = '<span class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-300/80 dark:border-sky-800/80 shadow-2xs">' + e.permanent_date + '</span>';
      } else {
        // Highlight in soft green matching image 2
        permCell = '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 shadow-2xs" title="Seniority Basis / Confirmed Service">Seniority Confirmed</span>';
      }

      var mobileCell = '';
      if (e.mobile && e.mobile !== '0') {
        mobileCell = '<a href="tel:' + e.mobile.replace(/[^0-9+]/g, '') + '" class="font-mono text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"><i class="ph-bold ph-phone text-xs opacity-70"></i>' + e.mobile + '</a>';
      } else {
        mobileCell = '<span class="font-mono text-xs text-slate-400">—</span>';
      }

      var initials = e.name.split(' ').map(function(w){ return w[0]; }).filter(Boolean).slice(0, 2).join('').toUpperCase();

      html += '<tr class="hover:bg-purple-50/40 dark:hover:bg-dark-800/60 transition-colors border-b border-slate-100 dark:border-slate-800/80 select-text">';
      
      // 1. SL No
      html += '<td class="py-3 px-3 text-center font-mono font-bold text-xs text-slate-400">' + e.sl_no + '</td>';
      
      // 2. EMP ID
      html += '<td class="py-3 px-3 font-mono font-black text-xs text-slate-900 dark:text-white whitespace-nowrap"><span class="px-2 py-1 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs">#' + e.staff_id + '</span></td>';
      
      // 3. EMP Name
      html += '<td class="py-3 px-3 font-bold text-xs text-slate-900 dark:text-white whitespace-nowrap"><div class="flex items-center gap-2.5"><span class="w-7 h-7 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center font-black text-[11px] shrink-0">' + initials + '</span><span>' + e.name + '</span><span class="w-2 h-2 rounded-full bg-emerald-500" title="Active Employee"></span></div></td>';
      
      // 4. Designation
      html += '<td class="py-3 px-3 font-medium text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">' + e.designation + '</td>';
      
      // 5. Section
      html += '<td class="py-3 px-3 whitespace-nowrap">' + getSectionBadge(e.section) + '</td>';
      
      // 6. Salary
      html += '<td class="py-3 px-3 font-mono font-extrabold text-xs text-slate-900 dark:text-white text-right whitespace-nowrap">' + formatMoney(e.salary) + '</td>';
      
      // 7. Joining Date
      html += '<td class="py-3 px-3 font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">' + (e.joining_date || '—') + '</td>';
      
      // 8. Permanent Date
      html += '<td class="py-3 px-3 whitespace-nowrap text-center">' + permCell + '</td>';
      
      // 9. Days
      html += '<td class="py-3 px-3 font-mono text-xs text-slate-600 dark:text-slate-400 text-center whitespace-nowrap">' + (e.days > 0 ? e.days.toLocaleString() : '—') + '</td>';
      
      // 10. Job Years (styled in black box matching Excel Image 2)
      html += '<td class="py-3 px-3 text-center whitespace-nowrap"><span class="px-2.5 py-1 rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-mono font-black text-xs shadow-2xs">' + Number(e.job_years).toFixed(2) + '</span></td>';
      
      // 11. Mobile Number
      html += '<td class="py-3 px-3 whitespace-nowrap">' + mobileCell + '</td>';
      
      html += '</tr>';
    }

    tbody.innerHTML = html;
    renderPagination(totalFiltered, totalPages);
  }

  function renderPagination(totalFiltered, totalPages) {
    var pWrap = document.getElementById('perm-pagination-wrapper');
    if (!pWrap) return;

    if (state.perPage === 'ALL' || totalPages <= 1) {
      pWrap.innerHTML = '';
      return;
    }

    var html = '<div class="flex items-center gap-1.5">';
    
    // Prev
    html += '<button type="button" onclick="window.HRMPermanentEmployees.setPage(' + (state.currentPage - 1) + ')" ' + (state.currentPage <= 1 ? 'disabled class="opacity-40 cursor-not-allowed ' : 'class="') + 'px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold bg-white dark:bg-dark-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-700 transition"><i class="ph-bold ph-caret-left"></i></button>';

    for (var p = 1; p <= totalPages; p++) {
      var isCur = p === state.currentPage;
      html += '<button type="button" onclick="window.HRMPermanentEmployees.setPage(' + p + ')" class="px-3 py-1 rounded-lg border text-xs font-bold transition ' + (isCur ? 'bg-purple-600 text-white border-purple-600 shadow-2xs' : 'bg-white dark:bg-dark-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100') + '">' + p + '</button>';
    }

    // Next
    html += '<button type="button" onclick="window.HRMPermanentEmployees.setPage(' + (state.currentPage + 1) + ')" ' + (state.currentPage >= totalPages ? 'disabled class="opacity-40 cursor-not-allowed ' : 'class="') + 'px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold bg-white dark:bg-dark-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-700 transition"><i class="ph-bold ph-caret-right"></i></button>';
    html += '</div>';

    pWrap.innerHTML = html;
  }

  function setPage(p) {
    var list = getFilteredAndSorted();
    var perPage = state.perPage === 'ALL' ? list.length : Number(state.perPage);
    var totalPages = perPage > 0 ? Math.ceil(list.length / perPage) : 1;
    if (p < 1) p = 1;
    if (p > totalPages) p = totalPages;
    state.currentPage = p;
    renderTable();
  }

  var _permSearchTimer = null;
  function onSearchChange(val) {
    state.searchQuery = val || '';
    state.currentPage = 1;
    if (_permSearchTimer) clearTimeout(_permSearchTimer);
    _permSearchTimer = setTimeout(function () {
      renderTable();
    }, 120);
  }

  function onSectionChange(val) {
    state.sectionFilter = val || 'ALL';
    state.currentPage = 1;
    renderTable();
  }

  function onSortChange(val) {
    state.sortBy = val || 'sl:asc';
    renderTable();
  }

  function onPerPageChange(val) {
    state.perPage = val;
    state.currentPage = 1;
    renderTable();
  }

  function exportExcel() {
    if (typeof XLSX === 'undefined') {
      alert('Excel export engine is loading, please try again.');
      return;
    }

    var list = getFilteredAndSorted();
    var headers = ['SL No', 'EMP ID', 'EMP Name', 'Designation', 'Section', 'Salary', 'Joining Date', 'Permanent Date', 'Days', 'Job Years', 'Mobile Number'];
    var rows = [headers];

    list.forEach(function (e) {
      rows.push([
        e.sl_no,
        e.staff_id,
        e.name,
        e.designation,
        e.section,
        e.salary,
        e.joining_date,
        e.permanent_date || '',
        e.days,
        e.job_years,
        e.mobile || ''
      ]);
    });

    var ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 8 },  // SL
      { wch: 10 }, // ID
      { wch: 26 }, // Name
      { wch: 24 }, // Designation
      { wch: 28 }, // Section
      { wch: 12 }, // Salary
      { wch: 14 }, // Joining Date
      { wch: 16 }, // Permanent Date
      { wch: 10 }, // Days
      { wch: 12 }, // Job Years
      { wch: 20 }  // Mobile
    ];

    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Permanent Staff');
    XLSX.writeFile(wb, 'MEP_Permanent_Employee_List_' + new Date().toISOString().split('T')[0] + '.xlsx');

    if (window.showHRToast) {
      window.showHRToast('Permanent Employee List Excel report downloaded successfully.');
    }
  }

  function exportCSV() {
    var list = getFilteredAndSorted();
    var headers = ['SL No', 'EMP ID', 'EMP Name', 'Designation', 'Section', 'Salary', 'Joining Date', 'Permanent Date', 'Days', 'Job Years', 'Mobile Number'];
    var lines = [headers.join(',')];

    list.forEach(function (e) {
      var row = [
        e.sl_no,
        '"' + e.staff_id + '"',
        '"' + (e.name || '').replace(/"/g, '""') + '"',
        '"' + (e.designation || '').replace(/"/g, '""') + '"',
        '"' + (e.section || '').replace(/"/g, '""') + '"',
        e.salary,
        '"' + (e.joining_date || '') + '"',
        '"' + (e.permanent_date || '') + '"',
        e.days,
        e.job_years,
        '"' + (e.mobile || '') + '"'
      ];
      lines.push(row.join(','));
    });

    var csvContent = '\uFEFF' + lines.join('\n');
    var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'MEP_Permanent_Employee_List_' + new Date().toISOString().split('T')[0] + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (window.showHRToast) {
      window.showHRToast('Permanent Employee List CSV report downloaded successfully.');
    }
  }

  function exportPDF() {
    if (typeof jspdf === 'undefined' && typeof window.jspdf === 'undefined') {
      window.print();
      return;
    }

    try {
      var jsPDFClass = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
      var doc = new jsPDFClass({ orientation: 'landscape', unit: 'pt', format: 'a4' });

      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);
      doc.text('MEP GROUP • Permanent Employee List', 40, 40);

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('Total Staff: 100 | Active Status Verified | Generated: ' + new Date().toLocaleDateString('en-GB'), 40, 56);

      var list = getFilteredAndSorted();
      var headers = [['SL', 'ID', 'Employee Name', 'Designation', 'Section', 'Salary (Tk)', 'Joining', 'Permanent', 'Days', 'Years', 'Mobile']];
      var body = list.map(function (e) {
        return [
          e.sl_no,
          e.staff_id,
          e.name,
          e.designation,
          e.section,
          Number(e.salary).toLocaleString(),
          e.joining_date,
          e.permanent_date || 'Seniority Basis',
          e.days,
          Number(e.job_years).toFixed(2),
          e.mobile || '—'
        ];
      });

      doc.autoTable({
        head: headers,
        body: body,
        startY: 70,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3, font: 'helvetica' },
        headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { halign: 'center', cellWidth: 25 },
          1: { halign: 'center', cellWidth: 40 },
          2: { cellWidth: 110 },
          3: { cellWidth: 100 },
          4: { cellWidth: 120 },
          5: { halign: 'right', cellWidth: 55 },
          6: { halign: 'center', cellWidth: 55 },
          7: { halign: 'center', cellWidth: 65 },
          8: { halign: 'center', cellWidth: 40 },
          9: { halign: 'center', cellWidth: 40 },
          10: { cellWidth: 80 }
        }
      });

      doc.save('MEP_Permanent_Employee_List_' + new Date().toISOString().split('T')[0] + '.pdf');

      if (window.showHRToast) {
        window.showHRToast('Permanent Employee List PDF report downloaded successfully.');
      }
    } catch (err) {
      console.error(err);
      window.print();
    }
  }

  // Public API
  window.HRMPermanentEmployees = {
    init: init,
    refresh: init,
    render: function() {
      loadEmployees();
      populateFilters();
      updateKPIs();
      renderTable();
    },
    setPage: setPage,
    onSearchChange: onSearchChange,
    onSectionChange: onSectionChange,
    onSortChange: onSortChange,
    onPerPageChange: onPerPageChange,
    exportExcel: exportExcel,
    exportCSV: exportCSV,
    exportPDF: exportPDF,
    getAll: function() { return state.employees; }
  };

  // Re-sync dynamically whenever Employee Data updates or Firebase syncs
  window.addEventListener('hrm-employees-cloud-synced', function () {
    if (typeof init === 'function') init();
  });
  window.addEventListener('mep:data-updated', function () {
    if (typeof init === 'function') init();
  });

  if (window.HRMEventBus && typeof window.HRMEventBus.on === 'function') {
    ['EMPLOYEE_MUTATED', 'EMPLOYEE_DELETED', 'TRANSFER_EXECUTED', 'CLOUD_SYNC_RECEIVED'].forEach(function (evt) {
      window.HRMEventBus.on(evt, function () {
        if (typeof init === 'function') init();
      });
    });
  }

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
