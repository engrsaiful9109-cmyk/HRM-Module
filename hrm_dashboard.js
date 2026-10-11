/**
 * MEP GROUP - Enterprise Human Resource Management (HRM)
 * Executive HRM Intelligence Dashboard Controller
 * Feature: Active Gender Demographics, Permanent Seniority, and Grade-Wise Payroll Valuation (M Grade, S Grade, Worker)
 * Author: Antigravity AI / MEP Engineering Team
 */

(function () {
  'use strict';

  var M_GRADE_DESIGNATIONS = [
    'sr. production engineer',
    'production engineer',
    'asst. engineer',
    'sub-asst. engineer',
    'jr. engineer',
    'hr personnel',
    'jr. officer',
    'senior manager',
    'manager'
  ];

  function getGrade(desig) {
    var d = String(desig || '').trim().toLowerCase();
    for (var i = 0; i < M_GRADE_DESIGNATIONS.length; i++) {
      if (d === M_GRADE_DESIGNATIONS[i] || d.indexOf(M_GRADE_DESIGNATIONS[i]) !== -1) {
        return 'M Grade';
      }
    }
    if (d.includes('engineer') || d.includes('officer') || d.includes('manager') || d.includes('executive')) {
      return 'M Grade';
    }
    if (d.includes('helper') || 
        d.includes('operator') || 
        d.includes('delivery') || 
        d.includes('lift') || 
        d.includes('cleaner') || 
        d.includes('labor')) {
      return 'Worker';
    }
    return 'S Grade';
  }

  function resolveGender(emp) {
    var g = String(emp.gender || '').trim().toLowerCase();
    if (g === 'male') return 'Male';
    if (g === 'female') return 'Female';
    var name = String(emp.name || '').toLowerCase();
    var femaleKeywords = [
      'akter', 'begum', 'khatun', 'bibi', 'rani', 'das',
      'lamiya', 'sima', 'nupur', 'sultana', 'tania',
      'khukumoni', 'hamida', 'nazmin', 'lucky', 'bithi', 'nafija', 'rabeya'
    ];
    for (var i = 0; i < femaleKeywords.length; i++) {
      if (name.indexOf(femaleKeywords[i]) !== -1) return 'Female';
    }
    return 'Male';
  }

  function formatMoney(num) {
    var n = Math.round(Number(num) || 0);
    return 'Tk ' + n.toLocaleString('en-US');
  }

  function getActiveEmployees() {
    var list = [];
    if (window.MEP_MANPOWER_DATABASE && Array.isArray(window.MEP_MANPOWER_DATABASE.employees)) {
      list = window.MEP_MANPOWER_DATABASE.employees;
    } else if (window.HRMManpower && window.HRMManpower.getAllEmployees) {
      list = window.HRMManpower.getAllEmployees();
    }
    return list.filter(function (e) {
      return String(e.status || '').trim().toLowerCase() === 'active';
    });
  }

  function getPermanentEmployees() {
    if (window.HRMPermanentEmployees && typeof window.HRMPermanentEmployees.getAll === 'function') {
      var liveList = window.HRMPermanentEmployees.getAll();
      if (Array.isArray(liveList) && liveList.length > 0) return liveList;
    }
    if (Array.isArray(window.MEP_PERMANENT_EMPLOYEES)) {
      return window.MEP_PERMANENT_EMPLOYEES;
    }
    return [];
  }

  function computeMetrics() {
    var activeEmps = getActiveEmployees();
    var permEmps = getPermanentEmployees();

    var totalActive = activeEmps.length;
    var totalActivePayroll = 0;
    var totalBasicPayroll = 0;

    var maleCount = 0;
    var femaleCount = 0;
    var malePayroll = 0;
    var femalePayroll = 0;

    var grades = {
      'M Grade': { count: 0, gross: 0, basic: 0, male: 0, female: 0, employees: [] },
      'S Grade': { count: 0, gross: 0, basic: 0, male: 0, female: 0, employees: [] },
      'Worker':  { count: 0, gross: 0, basic: 0, male: 0, female: 0, employees: [] }
    };

    var sections = {};

    activeEmps.forEach(function (e) {
      var gross = Number(e.gross_salary || e.salary || 0);
      var basic = Number(e.basic_salary || 0);
      var gen = resolveGender(e);
      var gr = getGrade(e.designation);
      var sec = e.section || 'General / Unassigned';

      totalActivePayroll += gross;
      totalBasicPayroll += basic;

      if (gen === 'Male') {
        maleCount++;
        malePayroll += gross;
      } else {
        femaleCount++;
        femalePayroll += gross;
      }

      if (grades[gr]) {
        grades[gr].count++;
        grades[gr].gross += gross;
        grades[gr].basic += basic;
        grades[gr].employees.push(e);
        if (gen === 'Male') grades[gr].male++;
        else grades[gr].female++;
      }

      if (!sections[sec]) {
        sections[sec] = { total: 0, male: 0, female: 0, gross: 0, mGrade: 0, sGrade: 0, worker: 0 };
      }
      sections[sec].total++;
      sections[sec].gross += gross;
      if (gen === 'Male') sections[sec].male++;
      else sections[sec].female++;

      if (gr === 'M Grade') sections[sec].mGrade++;
      else if (gr === 'S Grade') sections[sec].sGrade++;
      else sections[sec].worker++;
    });

    var permCount = permEmps.length;
    var permPayroll = 0;
    var permTenureSum = 0;
    permEmps.forEach(function (p) {
      permPayroll += Number(p.salary || 0);
      permTenureSum += Number(p.job_years || 0);
    });
    var avgPermTenure = permCount > 0 ? (permTenureSum / permCount).toFixed(2) : '0.00';
    var avgPermSalary = permCount > 0 ? Math.round(permPayroll / permCount) : 0;

    return {
      totalActive: totalActive,
      totalActivePayroll: totalActivePayroll,
      totalBasicPayroll: totalBasicPayroll,
      avgGrossSalary: totalActive > 0 ? Math.round(totalActivePayroll / totalActive) : 0,
      gender: {
        male: maleCount,
        female: femaleCount,
        malePayroll: malePayroll,
        femalePayroll: femalePayroll,
        maleAvg: maleCount > 0 ? Math.round(malePayroll / maleCount) : 0,
        femaleAvg: femaleCount > 0 ? Math.round(femalePayroll / femaleCount) : 0,
        malePct: totalActive > 0 ? ((maleCount / totalActive) * 100).toFixed(1) : '0.0',
        femalePct: totalActive > 0 ? ((femaleCount / totalActive) * 100).toFixed(1) : '0.0'
      },
      permanent: {
        count: permCount,
        payroll: permPayroll,
        avgSalary: avgPermSalary,
        avgTenure: avgPermTenure,
        pctOfActive: totalActive > 0 ? ((permCount / totalActive) * 100).toFixed(1) : '0.0',
        generalActiveCount: Math.max(0, totalActive - permCount)
      },
      grades: grades,
      sections: sections
    };
  }

  function render() {
    var metrics = computeMetrics();

    // 1. Sidebar Badge
    var sbBadge = document.getElementById('sidebar-dashboard-badge');
    if (sbBadge) sbBadge.textContent = metrics.totalActive;

    // 2. Overview Banner Summary
    var elTotalActive = document.getElementById('dash-kpi-total-active');
    if (elTotalActive) elTotalActive.textContent = metrics.totalActive + ' Staff';

    var elTotalPayroll = document.getElementById('dash-kpi-total-payroll');
    if (elTotalPayroll) elTotalPayroll.textContent = formatMoney(metrics.totalActivePayroll);

    var elAvgSalary = document.getElementById('dash-kpi-avg-salary');
    if (elAvgSalary) elAvgSalary.textContent = formatMoney(metrics.avgGrossSalary);

    // 3. Gender Telemetry Cards (Male & Female)
    var elMaleCount = document.getElementById('dash-gender-male-count');
    if (elMaleCount) elMaleCount.textContent = metrics.gender.male + ' Staff';

    var elMalePct = document.getElementById('dash-gender-male-pct');
    if (elMalePct) elMalePct.textContent = metrics.gender.malePct + '% of Active';

    var elMalePayroll = document.getElementById('dash-gender-male-payroll');
    if (elMalePayroll) elMalePayroll.textContent = formatMoney(metrics.gender.malePayroll);

    var elMaleAvg = document.getElementById('dash-gender-male-avg');
    if (elMaleAvg) elMaleAvg.textContent = 'Avg: ' + formatMoney(metrics.gender.maleAvg);

    var elFemaleCount = document.getElementById('dash-gender-female-count');
    if (elFemaleCount) elFemaleCount.textContent = metrics.gender.female + ' Staff';

    var elFemalePct = document.getElementById('dash-gender-female-pct');
    if (elFemalePct) elFemalePct.textContent = metrics.gender.femalePct + '% of Active';

    var elFemalePayroll = document.getElementById('dash-gender-female-payroll');
    if (elFemalePayroll) elFemalePayroll.textContent = formatMoney(metrics.gender.femalePayroll);

    var elFemaleAvg = document.getElementById('dash-gender-female-avg');
    if (elFemaleAvg) elFemaleAvg.textContent = 'Avg: ' + formatMoney(metrics.gender.femaleAvg);

    var elMaleBar = document.getElementById('dash-gender-male-bar');
    if (elMaleBar) elMaleBar.style.width = metrics.gender.malePct + '%';

    var elFemaleBar = document.getElementById('dash-gender-female-bar');
    if (elFemaleBar) elFemaleBar.style.width = metrics.gender.femalePct + '%';

    // 4. Permanent Employee Quantity Card
    var elPermCount = document.getElementById('dash-perm-count');
    if (elPermCount) elPermCount.textContent = metrics.permanent.count + ' Staff';

    var elPermPct = document.getElementById('dash-perm-pct');
    if (elPermPct) elPermPct.textContent = metrics.permanent.pctOfActive + '% of Total Active';

    var elPermPayroll = document.getElementById('dash-perm-payroll');
    if (elPermPayroll) elPermPayroll.textContent = formatMoney(metrics.permanent.payroll);

    var elPermTenure = document.getElementById('dash-perm-tenure');
    if (elPermTenure) elPermTenure.textContent = metrics.permanent.avgTenure + ' Yrs Avg Tenure';

    var elGeneralCount = document.getElementById('dash-general-active-count');
    if (elGeneralCount) elGeneralCount.textContent = metrics.permanent.generalActiveCount + ' Staff';

    // 5. Grade Telemetry Cards (M Grade, S Grade, Worker)
    var mGrade = metrics.grades['M Grade'];
    var sGrade = metrics.grades['S Grade'];
    var workerGrade = metrics.grades['Worker'];

    // M Grade
    var elMCount = document.getElementById('dash-mgrade-count');
    if (elMCount) elMCount.textContent = mGrade.count + ' Staff';

    var elMGross = document.getElementById('dash-mgrade-gross');
    if (elMGross) elMGross.textContent = formatMoney(mGrade.gross);

    var elMBasic = document.getElementById('dash-mgrade-basic');
    if (elMBasic) elMBasic.textContent = 'Basic: ' + formatMoney(mGrade.basic);

    var elMAvg = document.getElementById('dash-mgrade-avg');
    if (elMAvg) elMAvg.textContent = 'Avg: ' + (mGrade.count > 0 ? formatMoney(Math.round(mGrade.gross / mGrade.count)) : 'Tk 0');

    var elMShare = document.getElementById('dash-mgrade-share');
    if (elMShare) elMShare.textContent = metrics.totalActivePayroll > 0 ? ((mGrade.gross / metrics.totalActivePayroll) * 100).toFixed(1) + '% Share' : '0%';

    var elMGender = document.getElementById('dash-mgrade-gender');
    if (elMGender) elMGender.textContent = '♂ ' + mGrade.male + ' Male • ♀ ' + mGrade.female + ' Female';

    // S Grade
    var elSCount = document.getElementById('dash-sgrade-count');
    if (elSCount) elSCount.textContent = sGrade.count + ' Staff';

    var elSGross = document.getElementById('dash-sgrade-gross');
    if (elSGross) elSGross.textContent = formatMoney(sGrade.gross);

    var elSBasic = document.getElementById('dash-sgrade-basic');
    if (elSBasic) elSBasic.textContent = 'Basic: ' + formatMoney(sGrade.basic);

    var elSAvg = document.getElementById('dash-sgrade-avg');
    if (elSAvg) elSAvg.textContent = 'Avg: ' + (sGrade.count > 0 ? formatMoney(Math.round(sGrade.gross / sGrade.count)) : 'Tk 0');

    var elSShare = document.getElementById('dash-sgrade-share');
    if (elSShare) elSShare.textContent = metrics.totalActivePayroll > 0 ? ((sGrade.gross / metrics.totalActivePayroll) * 100).toFixed(1) + '% Share' : '0%';

    var elSGender = document.getElementById('dash-sgrade-gender');
    if (elSGender) elSGender.textContent = '♂ ' + sGrade.male + ' Male • ♀ ' + sGrade.female + ' Female';

    // Worker Grade
    var elWCount = document.getElementById('dash-worker-count');
    if (elWCount) elWCount.textContent = workerGrade.count + ' Staff';

    var elWGross = document.getElementById('dash-worker-gross');
    if (elWGross) elWGross.textContent = formatMoney(workerGrade.gross);

    var elWBasic = document.getElementById('dash-worker-basic');
    if (elWBasic) elWBasic.textContent = 'Basic: ' + formatMoney(workerGrade.basic);

    var elWAvg = document.getElementById('dash-worker-avg');
    if (elWAvg) elWAvg.textContent = 'Avg: ' + (workerGrade.count > 0 ? formatMoney(Math.round(workerGrade.gross / workerGrade.count)) : 'Tk 0');

    var elWShare = document.getElementById('dash-worker-share');
    if (elWShare) elWShare.textContent = metrics.totalActivePayroll > 0 ? ((workerGrade.gross / metrics.totalActivePayroll) * 100).toFixed(1) + '% Share' : '0%';

    var elWGender = document.getElementById('dash-worker-gender');
    if (elWGender) elWGender.textContent = '♂ ' + workerGrade.male + ' Male • ♀ ' + workerGrade.female + ' Female';

    // 6. Section Demographics Matrix Table
    renderSectionTable(metrics.sections, metrics.totalActive);
  }

  function renderSectionTable(secMap, totalActive) {
    var tbody = document.getElementById('dash-section-matrix-tbody');
    if (!tbody) return;

    var secNames = Object.keys(secMap).sort(function (a, b) {
      return secMap[b].total - secMap[a].total;
    });

    var html = '';
    secNames.forEach(function (sec, idx) {
      var s = secMap[sec];
      var pct = totalActive > 0 ? ((s.total / totalActive) * 100).toFixed(1) : '0';
      var malePct = s.total > 0 ? Math.round((s.male / s.total) * 100) : 0;
      var femalePct = s.total > 0 ? Math.round((s.female / s.total) * 100) : 0;

      html += '<tr class="hover:bg-purple-50/40 dark:hover:bg-dark-800/60 transition-colors border-b border-slate-100 dark:border-slate-800/80">';
      html += '<td class="py-2.5 px-3 text-center font-mono font-bold text-xs text-slate-400">' + (idx + 1) + '</td>';
      html += '<td class="py-2.5 px-3 font-bold text-xs text-slate-900 dark:text-white whitespace-nowrap">' + sec + '</td>';
      html += '<td class="py-2.5 px-3 text-center font-mono font-black text-xs text-purple-600 dark:text-purple-400 whitespace-nowrap">' + s.total + ' <span class="text-[10px] text-slate-400 font-normal">(' + pct + '%)</span></td>';
      
      // Gender Mini Bar
      html += '<td class="py-2.5 px-3 whitespace-nowrap"><div class="flex items-center gap-2 min-w-[130px]"><span class="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400">♂ ' + s.male + '</span><div class="flex-1 h-2 rounded-full bg-slate-100 dark:bg-dark-900 overflow-hidden flex shadow-2xs"><div class="bg-indigo-500 h-full" style="width:' + malePct + '%" title="Male: ' + malePct + '%"></div><div class="bg-rose-500 h-full" style="width:' + femalePct + '%" title="Female: ' + femalePct + '%"></div></div><span class="font-mono text-[11px] font-bold text-rose-600 dark:text-rose-400">♀ ' + s.female + '</span></div></td>';
      
      // Grade Split
      html += '<td class="py-2.5 px-3 text-center whitespace-nowrap font-mono text-xs"><span class="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800/60">' + s.mGrade + '</span></td>';
      html += '<td class="py-2.5 px-3 text-center whitespace-nowrap font-mono text-xs"><span class="px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-bold border border-sky-200 dark:border-sky-800/60">' + s.sGrade + '</span></td>';
      html += '<td class="py-2.5 px-3 text-center whitespace-nowrap font-mono text-xs"><span class="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800/60">' + s.worker + '</span></td>';
      
      // Total Payroll
      html += '<td class="py-2.5 px-3 text-right font-mono font-extrabold text-xs text-slate-900 dark:text-white whitespace-nowrap">' + formatMoney(s.gross) + '</td>';
      html += '</tr>';
    });

    tbody.innerHTML = html;
  }

  function exportExcel() {
    if (typeof XLSX === 'undefined') {
      alert('Excel export engine is loading, please try again.');
      return;
    }

    var metrics = computeMetrics();
    var wb = XLSX.utils.book_new();

    // Sheet 1: Executive Summary
    var summaryRows = [
      ['MEP GROUP - FAN DIVISION HRM EXECUTIVE DASHBOARD REPORT'],
      ['Generated Date:', new Date().toLocaleString()],
      [],
      ['1. WORKFORCE & GENDER DEMOGRAPHICS'],
      ['Metric', 'Quantity', 'Percentage', 'Monthly Payroll (Gross)', 'Average Salary'],
      ['Total Active Workforce', metrics.totalActive, '100.0%', metrics.totalActivePayroll, metrics.avgGrossSalary],
      ['Present Active Male', metrics.gender.male, metrics.gender.malePct + '%', metrics.gender.malePayroll, metrics.gender.maleAvg],
      ['Present Active Female', metrics.gender.female, metrics.gender.femalePct + '%', metrics.gender.femalePayroll, metrics.gender.femaleAvg],
      [],
      ['2. SENIORITY & PERMANENT WORKFORCE'],
      ['Metric', 'Quantity', 'Percentage of Active', 'Monthly Payroll', 'Avg Tenure'],
      ['Permanent Employee List', metrics.permanent.count, metrics.permanent.pctOfActive + '%', metrics.permanent.payroll, metrics.permanent.avgTenure + ' Years'],
      ['General / Probationary Active', metrics.permanent.generalActiveCount, (100 - Number(metrics.permanent.pctOfActive)).toFixed(1) + '%', metrics.totalActivePayroll - metrics.permanent.payroll, 'N/A'],
      [],
      ['3. GRADE-WISE WORKFORCE & SALARY VALUATION'],
      ['Grade Classification', 'Quantity', 'Male', 'Female', 'Total Gross Salary', 'Total Basic Salary', 'Avg Gross Salary', 'Payroll Share'],
      ['M Grade (Management/Engineering/Officers)', metrics.grades['M Grade'].count, metrics.grades['M Grade'].male, metrics.grades['M Grade'].female, metrics.grades['M Grade'].gross, metrics.grades['M Grade'].basic, Math.round(metrics.grades['M Grade'].gross / (metrics.grades['M Grade'].count || 1)), ((metrics.grades['M Grade'].gross / metrics.totalActivePayroll) * 100).toFixed(1) + '%'],
      ['S Grade (Supervisors/Technicalmen)', metrics.grades['S Grade'].count, metrics.grades['S Grade'].male, metrics.grades['S Grade'].female, metrics.grades['S Grade'].gross, metrics.grades['S Grade'].basic, Math.round(metrics.grades['S Grade'].gross / (metrics.grades['S Grade'].count || 1)), ((metrics.grades['S Grade'].gross / metrics.totalActivePayroll) * 100).toFixed(1) + '%'],
      ['Worker Grade (Operators/Helpers)', metrics.grades['Worker'].count, metrics.grades['Worker'].male, metrics.grades['Worker'].female, metrics.grades['Worker'].gross, metrics.grades['Worker'].basic, Math.round(metrics.grades['Worker'].gross / (metrics.grades['Worker'].count || 1)), ((metrics.grades['Worker'].gross / metrics.totalActivePayroll) * 100).toFixed(1) + '%'],
      ['Total Active Workforce Payroll', metrics.totalActive, metrics.gender.male, metrics.gender.female, metrics.totalActivePayroll, metrics.totalBasicPayroll, metrics.avgGrossSalary, '100.0%']
    ];

    var ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, ws1, 'Executive Summary');

    // Sheet 2: Section Breakdown
    var secRows = [
      ['SL', 'Section / Line Name', 'Total Active', 'Male', 'Female', 'M Grade', 'S Grade', 'Worker', 'Monthly Gross Payroll']
    ];
    var secNames = Object.keys(metrics.sections).sort();
    secNames.forEach(function (sec, idx) {
      var s = metrics.sections[sec];
      secRows.push([
        idx + 1,
        sec,
        s.total,
        s.male,
        s.female,
        s.mGrade,
        s.sGrade,
        s.worker,
        s.gross
      ]);
    });
    var ws2 = XLSX.utils.aoa_to_sheet(secRows);
    XLSX.utils.book_append_sheet(wb, ws2, 'Section Breakdown');

    XLSX.writeFile(wb, 'MEP_HRM_Executive_Dashboard_' + new Date().toISOString().split('T')[0] + '.xlsx');

    if (window.showHRToast) {
      window.showHRToast('HRM Executive Dashboard Excel report downloaded successfully.');
    }
  }

  function exportPDF() {
    window.print();
  }

  function openGradeModal(gradeName) {
    var metrics = computeMetrics();
    var gr = metrics.grades[gradeName];
    if (!gr) return;

    var modal = document.getElementById('dash-grade-details-modal');
    var modalTitle = document.getElementById('dash-grade-modal-title');
    var modalSub = document.getElementById('dash-grade-modal-sub');
    var modalTbody = document.getElementById('dash-grade-modal-tbody');

    if (modalTitle) modalTitle.textContent = gradeName + ' — Detailed Personnel Register (' + gr.count + ' Staff)';
    if (modalSub) modalSub.textContent = 'Total Monthly Gross: ' + formatMoney(gr.gross) + ' • Total Basic: ' + formatMoney(gr.basic) + ' • Average Salary: ' + formatMoney(Math.round(gr.gross / (gr.count || 1)));

    if (modalTbody) {
      var html = '';
      gr.employees.forEach(function (e, idx) {
        var gen = resolveGender(e);
        var genBadge = gen === 'Male' ? '<span class="text-indigo-600 font-bold">♂ Male</span>' : '<span class="text-rose-600 font-bold">♀ Female</span>';
        html += '<tr class="hover:bg-slate-50 dark:hover:bg-dark-800/60 border-b border-slate-100 dark:border-slate-800">';
        html += '<td class="py-2 px-3 text-center font-mono text-xs text-slate-400">' + (idx + 1) + '</td>';
        html += '<td class="py-2 px-3 font-mono font-bold text-xs text-slate-900 dark:text-white">#' + (e.staff_id || e.id) + '</td>';
        html += '<td class="py-2 px-3 font-bold text-xs text-slate-900 dark:text-white">' + e.name + '</td>';
        html += '<td class="py-2 px-3 text-xs text-slate-700 dark:text-slate-300">' + e.designation + '</td>';
        html += '<td class="py-2 px-3 text-xs text-slate-600 dark:text-slate-400">' + (e.section || '—') + '</td>';
        html += '<td class="py-2 px-3 text-center text-xs whitespace-nowrap">' + genBadge + '</td>';
        html += '<td class="py-2 px-3 text-right font-mono font-bold text-xs text-slate-900 dark:text-white">' + formatMoney(e.gross_salary || e.salary) + '</td>';
        html += '<td class="py-2 px-3 text-right font-mono text-xs text-slate-500">' + formatMoney(e.basic_salary) + '</td>';
        html += '</tr>';
      });
      modalTbody.innerHTML = html;
    }

    if (modal) modal.classList.remove('hidden');
  }

  function closeGradeModal() {
    var modal = document.getElementById('dash-grade-details-modal');
    if (modal) modal.classList.add('hidden');
  }

  window.HRMDashboard = {
    init: render,
    render: render,
    computeMetrics: computeMetrics,
    exportExcel: exportExcel,
    exportPDF: exportPDF,
    openGradeModal: openGradeModal,
    closeGradeModal: closeGradeModal
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }

  // Reactive updates on data mutations, transfers & cloud synchronization
  function onDataChanged() {
    try {
      render();
    } catch (err) {
      console.warn('[HRMDashboard] Error re-rendering on data change:', err);
    }
  }

  window.addEventListener('hrm-employees-cloud-synced', onDataChanged);
  window.addEventListener('mep:data-updated', onDataChanged);

  if (window.HRMEventBus && typeof window.HRMEventBus.on === 'function') {
    ['EMPLOYEE_MUTATED', 'EMPLOYEE_DELETED', 'TRANSFER_EXECUTED', 'REPLACEMENT_CHANGED', 'CLOUD_SYNC_RECEIVED', 'SPECS_CHANGED'].forEach(function (evt) {
      window.HRMEventBus.on(evt, onDataChanged);
    });
  }
})();
