/**
 * MEP GROUP - Enterprise Human Resource Management (HRM)
 * Manpower Summary Controller (ম্যানপাওয়ার সামারি)
 * Authorized Manpower Matrix vs Live Existing Active Deployment
 * Features:
 *   - 11 Standard Production Sections & Subtotals
 *   - 11 Dynamic Columns: SM No | Section Name | Authorize M | Existing M | Authorize S | Existing S | Authorize Worker | Existing Worker | Total Authorize Manpower | Total Existing Manpower | Due Manpower
 *   - In-place Edit Mode for Authorized Specifications with Real-Time Recalculation
 *   - LocalStorage and Server API Persistence (/api/hrm/manpower-summary-specs)
 *   - Full-Grid Bordered Excel (.xlsx) and Landscape PDF (.pdf) Exports
 * Author: Md. Saiful Islam / Antigravity AI
 */

(function () {
  'use strict';

  // Factory Standard Default Specifications (Target: 272 Personnel)
  var DEFAULT_SECTION_CONFIG = [
    { sm: 1, name: 'Fan Administation', authM: 3, authS: 0, authW: 0, group: 'ceiling' },
    { sm: 2, name: 'Fan Assemble Line', authM: 1, authS: 2, authW: 40, group: 'ceiling' },
    { sm: 3, name: 'Fan Dimmer & Blade', authM: 1, authS: 0, authW: 17, group: 'ceiling' },
    { sm: 4, name: 'Fan Armature Winding', authM: 1, authS: 1, authW: 32, group: 'ceiling' },
    { sm: 5, name: 'Fan Replace', authM: 1, authS: 1, authW: 7, group: 'ceiling' },
    { sm: 6, name: 'Fan Power Press & Stamping', authM: 3, authS: 3, authW: 24, group: 'ceiling' },
    { sm: 7, name: 'Fan Dhalai & Die Casting', authM: 1, authS: 0, authW: 24, group: 'ceiling' },
    { sm: 8, name: 'Fan Lathe', authM: 1, authS: 1, authW: 28, group: 'ceiling' },
    { sm: 9, name: 'Fan Auto Powder Coating', authM: 2, authS: 3, authW: 45, group: 'ceiling' },
    { sm: 10, name: 'Fan Rojonigondha', authM: 1, authS: 1, authW: 0, group: 'other' },
    { sm: 11, name: 'Fan Sada Shapla', authM: 1, authS: 1, authW: 26, group: 'other' }
  ];

  // Active Specifications in memory
  var SECTION_CONFIG = JSON.parse(JSON.stringify(DEFAULT_SECTION_CONFIG));

  // Edit Mode state
  var isEditMode = false;
  var specsWorkingCopy = [];

  // Storage Key
  var STORAGE_KEY = 'mep_hrm_manpower_summary_specs';

  // Initialize and load saved specs
  function loadSavedSpecs() {
    try {
      var local = localStorage.getItem(STORAGE_KEY);
      if (local) {
        var parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length === DEFAULT_SECTION_CONFIG.length) {
          SECTION_CONFIG = parsed;
        }
      }
    } catch (e) {
      console.warn('[HRM_SUMMARY] Local storage load warning:', e);
    }

    // Try server sync asynchronously
    if (typeof fetch === 'function') {
      fetch('/api/hrm/manpower-summary-specs')
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data && data.success && Array.isArray(data.specs) && data.specs.length === DEFAULT_SECTION_CONFIG.length) {
            SECTION_CONFIG = data.specs;
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(SECTION_CONFIG));
            } catch (ex) {}
            if (!isEditMode) {
              render();
            }
          }
        })
        .catch(function (err) {
          // offline or server not ready, use local/defaults
        });
    }
  }

  // Canonical Section Normalizer
  function canonicalSection(secName) {
    var s = String(secName || '').trim().toLowerCase();
    if (s.includes('admin')) return 'Fan Administation';
    if (s.includes('assemble')) return 'Fan Assemble Line';
    if (s.includes('dimmer') || s.includes('blade')) return 'Fan Dimmer & Blade';
    if (s.includes('armature') || s.includes('winding')) return 'Fan Armature Winding';
    if (s.includes('replace')) return 'Fan Replace';
    if (s.includes('power press') || s.includes('stamping')) return 'Fan Power Press & Stamping';
    if (s.includes('dhalai') || s.includes('die casting') || s.includes('casting')) return 'Fan Dhalai & Die Casting';
    if (s.includes('lathe')) return 'Fan Lathe';
    if (s.includes('powder') || s.includes('coating')) return 'Fan Auto Powder Coating';
    if (s.includes('rojonigondha')) return 'Fan Rojonigondha';
    if (s.includes('shapla')) return 'Fan Sada Shapla';
    return secName;
  }

  // Exact M Grade Designations specified by User:
  // Sr. Production Engineer, Production Engineer, Asst. Engineer, Sub-Asst. Engineer, Jr. Engineer, HR Personnel, Jr. Officer (+ Senior Manager)
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

  // Grade Classifier (M Grade / S Grade / Worker)
  function classifyGrade(desig) {
    var d = String(desig || '').trim().toLowerCase();

    // 1. M Grade (Explicitly specified by User)
    for (var i = 0; i < M_GRADE_DESIGNATIONS.length; i++) {
      if (d === M_GRADE_DESIGNATIONS[i] || d.indexOf(M_GRADE_DESIGNATIONS[i]) !== -1) {
        return 'M';
      }
    }
    if (d.includes('engineer') || d.includes('officer') || d.includes('manager') || d.includes('executive')) {
      return 'M';
    }

    // 2. Worker Grade (User explicit: Operator, Sr. Operator, Asst. Operator, Helper, Delivery Asst, etc.)
    if (d.includes('helper') || 
        d.includes('operator') || 
        d.includes('delivery') || 
        d.includes('lift') || 
        d.includes('cleaner') || 
        d.includes('labor')) {
      return 'Worker';
    }

    // 3. S Grade: Supervisors, Foremen, Technicalmen
    return 'S';
  }

  // Helper to get active employees
  function getActiveEmployees() {
    var emps = [];
    if (window.HRMManpower && typeof window.HRMManpower.getAllEmployees === 'function') {
      emps = window.HRMManpower.getAllEmployees();
    } else if (window.MEP_MANPOWER_DATABASE && Array.isArray(window.MEP_MANPOWER_DATABASE)) {
      emps = window.MEP_MANPOWER_DATABASE;
    }
    return emps.filter(function (e) {
      return String(e.status || '').trim().toLowerCase() === 'active';
    });
  }

  // Compute live summary statistics based on active config or working copy
  function computeSummary() {
    var currentSpecs = isEditMode ? specsWorkingCopy : SECTION_CONFIG;
    var activeEmps = getActiveEmployees();

    var counts = {};
    currentSpecs.forEach(function (sec) {
      counts[sec.name] = { M: 0, S: 0, Worker: 0, total: 0 };
    });

    activeEmps.forEach(function (emp) {
      var canon = canonicalSection(emp.section);
      if (!counts[canon]) {
        counts[canon] = { M: 0, S: 0, Worker: 0, total: 0 };
      }
      var grade = classifyGrade(emp.designation);
      if (grade === 'M') counts[canon].M++;
      else if (grade === 'S') counts[canon].S++;
      else counts[canon].Worker++;
      counts[canon].total++;
    });

    // Subtotal Ceiling Fan (SM 1 to 9)
    var cfAuthM = 0, cfAuthS = 0, cfAuthW = 0, cfAuthTot = 0;
    var cfExistM = 0, cfExistS = 0, cfExistW = 0, cfExistTot = 0;
    var cfShortage = 0;

    currentSpecs.slice(0, 9).forEach(function (sec) {
      var rowAuth = (Number(sec.authM) || 0) + (Number(sec.authS) || 0) + (Number(sec.authW) || 0);
      cfAuthM += (Number(sec.authM) || 0);
      cfAuthS += (Number(sec.authS) || 0);
      cfAuthW += (Number(sec.authW) || 0);
      cfAuthTot += rowAuth;

      var c = counts[sec.name] || { M: 0, S: 0, Worker: 0, total: 0 };
      var rowExist = c.M + c.S + c.Worker;
      cfExistM += c.M;
      cfExistS += c.S;
      cfExistW += c.Worker;
      cfExistTot += rowExist;

      if (rowAuth > rowExist) {
        cfShortage += (rowAuth - rowExist);
      }
    });

    // Subtotal Specialized Lines (SM 10 & 11)
    var othAuthM = 0, othAuthS = 0, othAuthW = 0, othAuthTot = 0;
    var othExistM = 0, othExistS = 0, othExistW = 0, othExistTot = 0;
    var othShortage = 0;

    currentSpecs.slice(9).forEach(function (sec) {
      var rowAuth = (Number(sec.authM) || 0) + (Number(sec.authS) || 0) + (Number(sec.authW) || 0);
      othAuthM += (Number(sec.authM) || 0);
      othAuthS += (Number(sec.authS) || 0);
      othAuthW += (Number(sec.authW) || 0);
      othAuthTot += rowAuth;

      var c = counts[sec.name] || { M: 0, S: 0, Worker: 0, total: 0 };
      var rowExist = c.M + c.S + c.Worker;
      othExistM += c.M;
      othExistS += c.S;
      othExistW += c.Worker;
      othExistTot += rowExist;

      if (rowAuth > rowExist) {
        othShortage += (rowAuth - rowExist);
      }
    });

    // Grand Totals
    var totAuthM = cfAuthM + othAuthM;
    var totAuthS = cfAuthS + othAuthS;
    var totAuthW = cfAuthW + othAuthW;
    var totAuthAll = cfAuthTot + othAuthTot;

    var totExistM = cfExistM + othExistM;
    var totExistS = cfExistS + othExistS;
    var totExistW = cfExistW + othExistW;
    var totExistAll = cfExistTot + othExistTot;

    var totShortage = cfShortage + othShortage;

    return {
      activeCount: activeEmps.length,
      counts: counts,
      specs: currentSpecs,
      cf: {
        authM: cfAuthM, authS: cfAuthS, authW: cfAuthW, authTotal: cfAuthTot,
        existM: cfExistM, existS: cfExistS, existW: cfExistW, existTotal: cfExistTot,
        shortage: cfShortage,
        netDiff: cfAuthTot - cfExistTot
      },
      other: {
        authM: othAuthM, authS: othAuthS, authW: othAuthW, authTotal: othAuthTot,
        existM: othExistM, existS: othExistS, existW: othExistW, existTotal: othExistTot,
        shortage: othShortage,
        netDiff: othAuthTot - othExistTot
      },
      total: {
        authM: totAuthM, authS: totAuthS, authW: totAuthW, authTotal: totAuthAll,
        existM: totExistM, existS: totExistS, existW: totExistW, existTotal: totExistAll,
        shortage: totShortage,
        netDiff: totAuthAll - totExistAll
      }
    };
  }

  // Update Toolbar buttons based on isEditMode
  function renderActionToolbar() {
    var container = document.getElementById('summary-action-btn-group');
    if (!container) return;

    if (!isEditMode) {
      container.innerHTML = 
        '<button ' +
          'type="button" ' +
          'id="btn-edit-summary" ' +
          'onclick="window.HRMManpowerSummary.toggleEditMode()" ' +
          'class="mep-edit-btn px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer border border-amber-600/30" ' +
          'title="অনুমোদিত জনবল কাঠামো এডিট করুন (Edit Authorized Manpower Specs)"' +
        '>' +
          '<i class="ph-bold ph-pencil-simple text-sm"></i>' +
          '<span>Edit Specs</span>' +
        '</button>';
    } else {
      container.innerHTML = 
        '<div class="flex items-center gap-1.5 p-0.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30">' +
          '<button ' +
            'type="button" ' +
            'onclick="window.HRMManpowerSummary.saveEditMode()" ' +
            'class="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black shadow-xs flex items-center gap-1 cursor-pointer transition-all" ' +
            'title="পরিবর্তনসমূহ সংরক্ষণ করুন (Save Specs)"' +
          '>' +
            '<i class="ph-bold ph-floppy-disk text-sm"></i>' +
            '<span>Save Specs</span>' +
          '</button>' +
          '<button ' +
            'type="button" ' +
            'onclick="window.HRMManpowerSummary.cancelEditMode()" ' +
            'class="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 active:scale-95 text-slate-800 dark:text-slate-100 text-xs font-bold transition-all cursor-pointer" ' +
            'title="বাতিল করুন (Cancel)"' +
          '>' +
            '<i class="ph-bold ph-x text-sm"></i>' +
            '<span>Cancel</span>' +
          '</button>' +
          '<button ' +
            'type="button" ' +
            'onclick="window.HRMManpowerSummary.resetDefaultSpecs()" ' +
            'class="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-300 dark:border-rose-800 transition-all cursor-pointer" ' +
            'title="ফ্যাক্টরি স্ট্যান্ডার্ড 272 এ রিসেট করুন (Reset to 272)"' +
          '>' +
            '<i class="ph-bold ph-arrow-counter-clockwise text-xs"></i>' +
            '<span>Reset 272</span>' +
          '</button>' +
        '</div>';
    }
  }

  // Render a Single Data Row (View vs Edit Mode)
  function renderRow(sec, c) {
    var authM = Number(sec.authM) || 0;
    var authS = Number(sec.authS) || 0;
    var authW = Number(sec.authW) || 0;
    var rowAuthTotal = authM + authS + authW;

    var existM = c.M || 0;
    var existS = c.S || 0;
    var existW = c.Worker || 0;
    var rowExistTotal = existM + existS + existW;

    var rowDue = rowAuthTotal - rowExistTotal;

    var html = '<tr class="hover:bg-purple-500/5 dark:hover:bg-purple-950/20 transition-colors">';
    html += '<td class="py-2 px-2 text-center font-bold text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">' + sec.sm + '</td>';
    html += '<td class="py-2 px-3 text-left font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 whitespace-nowrap">' + sec.name + '</td>';

    // Col 3: Authorize Manpower (M Grade)
    if (isEditMode) {
      html += '<td class="p-1 text-center border border-slate-300 dark:border-slate-700 bg-amber-50/30 dark:bg-amber-950/20">' +
        '<input type="number" min="0" value="' + authM + '" ' +
        'class="w-14 px-1 py-1 text-center font-black text-slate-900 dark:text-white bg-white dark:bg-slate-800 border-2 border-amber-400 dark:border-amber-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner" ' +
        'oninput="window.HRMManpowerSummary.onAuthChange(' + sec.sm + ', \'authM\', this.value)" />' +
        '</td>';
    } else {
      html += '<td class="py-2 px-2 text-center font-bold text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">' + authM + '</td>';
    }

    // Col 4: Existing Manpower (M Grade)
    html += '<td class="py-2 px-2 text-center font-black text-purple-700 dark:text-purple-300 bg-purple-50/40 dark:bg-purple-950/20 border border-slate-300 dark:border-slate-700">' + (existM || '') + '</td>';

    // Col 5: Authorize Manpower (S Grade)
    if (isEditMode) {
      html += '<td class="p-1 text-center border border-slate-300 dark:border-slate-700 bg-amber-50/30 dark:bg-amber-950/20">' +
        '<input type="number" min="0" value="' + authS + '" ' +
        'class="w-14 px-1 py-1 text-center font-black text-slate-900 dark:text-white bg-white dark:bg-slate-800 border-2 border-amber-400 dark:border-amber-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner" ' +
        'oninput="window.HRMManpowerSummary.onAuthChange(' + sec.sm + ', \'authS\', this.value)" />' +
        '</td>';
    } else {
      html += '<td class="py-2 px-2 text-center font-bold text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">' + authS + '</td>';
    }

    // Col 6: Existing Manpower (S Grade)
    html += '<td class="py-2 px-2 text-center font-black text-sky-700 dark:text-sky-300 bg-sky-50/40 dark:bg-sky-950/20 border border-slate-300 dark:border-slate-700">' + (existS || '') + '</td>';

    // Col 7: Authorize Manpower (Worker)
    if (isEditMode) {
      html += '<td class="p-1 text-center border border-slate-300 dark:border-slate-700 bg-amber-50/30 dark:bg-amber-950/20">' +
        '<input type="number" min="0" value="' + authW + '" ' +
        'class="w-14 px-1 py-1 text-center font-black text-slate-900 dark:text-white bg-white dark:bg-slate-800 border-2 border-amber-400 dark:border-amber-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner" ' +
        'oninput="window.HRMManpowerSummary.onAuthChange(' + sec.sm + ', \'authW\', this.value)" />' +
        '</td>';
    } else {
      html += '<td class="py-2 px-2 text-center font-bold text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">' + authW + '</td>';
    }

    // Col 8: Existing Manpower (Worker)
    html += '<td class="py-2 px-2 text-center font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20 border border-slate-300 dark:border-slate-700">' + (existW || '') + '</td>';

    // Col 9: Total Authorize Manpower (Need / লক্ষ্যমাত্রা)
    html += '<td class="py-2 px-2 text-center font-black text-slate-900 dark:text-white bg-purple-50/50 dark:bg-purple-950/30 border border-slate-300 dark:border-slate-700 font-mono">' + rowAuthTotal + '</td>';

    // Col 10: Total Existing Manpower (কর্মরত মোট)
    html += '<td class="py-2 px-2 text-center font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30 border border-slate-300 dark:border-slate-700 font-mono">' + (rowExistTotal || '') + '</td>';

    // Col 11: Due Manpower (ঘাটতি / বাকি)
    if (rowDue > 0) {
      html += '<td class="py-2 px-2 text-center font-black border border-slate-300 dark:border-slate-700 bg-rose-50/50 dark:bg-rose-950/30">' +
        '<span class="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-200 border border-rose-300 dark:border-rose-700 shadow-2xs">' +
          rowDue + ' Due' +
        '</span>' +
      '</td>';
    } else if (rowDue === 0) {
      html += '<td class="py-2 px-2 text-center font-bold text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-700 font-mono">0</td>';
    } else {
      var surplus = Math.abs(rowDue);
      html += '<td class="py-2 px-2 text-center font-bold border border-slate-300 dark:border-slate-700 text-emerald-700 dark:text-emerald-300 bg-emerald-50/30 dark:bg-emerald-950/10 whitespace-nowrap">' +
        '<span class="font-bold">0</span> <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">(+' + surplus + ' Ex)</span>' +
      '</td>';
    }

    html += '</tr>';
    return html;
  }

  // Render the table matching media_1790872622289.png & media_1790874432072.png
  function render() {
    var tbody = document.getElementById('manpower-summary-table-body');
    if (!tbody) return;

    renderActionToolbar();

    var summary = computeSummary();
    var counts = summary.counts;
    var specs = summary.specs;

    var html = '';

    // Render Ceiling Fan Rows (1 to 9)
    specs.slice(0, 9).forEach(function (sec) {
      var c = counts[sec.name] || { M: 0, S: 0, Worker: 0, total: 0 };
      html += renderRow(sec, c);
    });

    // Subtotal Row: Total Ceiling Fan (light blue #CCE7F5 background as in screenshot)
    html += '<tr class="bg-[#CCE7F5] dark:bg-sky-950/80 font-black text-slate-900 dark:text-sky-100 border-2 border-slate-400 dark:border-slate-600 shadow-2xs">';
    html += '<td class="py-2 px-2 text-center border border-slate-400 dark:border-slate-600"></td>';
    html += '<td class="py-2 px-3 text-center uppercase tracking-wider border border-slate-400 dark:border-slate-600 font-black">Total Ceiling Fan</td>';
    html += '<td class="py-2 px-2 text-center border border-slate-400 dark:border-slate-600">' + summary.cf.authM + '</td>';
    html += '<td class="py-2 px-2 text-center border border-slate-400 dark:border-slate-600 text-purple-900 dark:text-purple-200">' + (summary.cf.existM || '') + '</td>';
    html += '<td class="py-2 px-2 text-center border border-slate-400 dark:border-slate-600">' + summary.cf.authS + '</td>';
    html += '<td class="py-2 px-2 text-center border border-slate-400 dark:border-slate-600 text-sky-900 dark:text-sky-200">' + (summary.cf.existS || '') + '</td>';
    html += '<td class="py-2 px-2 text-center border border-slate-400 dark:border-slate-600">' + summary.cf.authW + '</td>';
    html += '<td class="py-2 px-2 text-center border border-slate-400 dark:border-slate-600 text-emerald-900 dark:text-emerald-200">' + (summary.cf.existW || '') + '</td>';
    // Col 9: Total Authorize
    html += '<td class="py-2 px-2 text-center border border-slate-400 dark:border-slate-600 font-black">' + summary.cf.authTotal + '</td>';
    // Col 10: Total Existing
    html += '<td class="py-2 px-2 text-center border border-slate-400 dark:border-slate-600 text-emerald-900 dark:text-emerald-200 font-black">' + (summary.cf.existTotal || '') + '</td>';
    // Col 11: Due Manpower
    html += '<td class="py-2 px-2 text-center border border-slate-400 dark:border-slate-600 font-black whitespace-nowrap">' +
      (summary.cf.shortage > 0 
        ? '<span class="px-2 py-0.5 rounded-md text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">' + summary.cf.shortage + ' Due</span> <span class="text-[10px] text-slate-600 block font-semibold">(Net: +' + Math.abs(summary.cf.netDiff) + ' Ex)</span>'
        : '0') +
    '</td>';
    html += '</tr>';

    // Render Special Lines (10 & 11)
    specs.slice(9).forEach(function (sec) {
      var c = counts[sec.name] || { M: 0, S: 0, Worker: 0, total: 0 };
      html += renderRow(sec, c);
    });

    // Subtotal Row: Rechargeable/Exhaust/Capacitor (light blue #CCE7F5 background as in screenshot)
    html += '<tr class="bg-[#CCE7F5] dark:bg-sky-950/80 font-black text-slate-900 dark:text-sky-100 border-2 border-slate-400 dark:border-slate-600 shadow-2xs">';
    html += '<td class="py-2 px-2 text-center border border-slate-400 dark:border-slate-600"></td>';
    html += '<td class="py-2 px-3 text-center uppercase tracking-wider border border-slate-400 dark:border-slate-600 font-black">Rechargeable/Exhaust/Capacitor</td>';
    html += '<td class="py-2 px-2 text-center border border-slate-400 dark:border-slate-600">' + summary.other.authM + '</td>';
    html += '<td class="py-2 px-2 text-center border border-slate-400 dark:border-slate-600 text-purple-900 dark:text-purple-200">' + (summary.other.existM || '') + '</td>';
    html += '<td class="py-2 px-2 text-center border border-slate-400 dark:border-slate-600">' + summary.other.authS + '</td>';
    html += '<td class="py-2 px-2 text-center border border-slate-400 dark:border-slate-600 text-sky-900 dark:text-sky-200">' + (summary.other.existS || '') + '</td>';
    html += '<td class="py-2 px-2 text-center border border-slate-400 dark:border-slate-600">' + summary.other.authW + '</td>';
    html += '<td class="py-2 px-2 text-center border border-slate-400 dark:border-slate-600 text-emerald-900 dark:text-emerald-200">' + (summary.other.existW || '') + '</td>';
    // Col 9: Total Authorize
    html += '<td class="py-2 px-2 text-center border border-slate-400 dark:border-slate-600 font-black">' + summary.other.authTotal + '</td>';
    // Col 10: Total Existing
    html += '<td class="py-2 px-2 text-center border border-slate-400 dark:border-slate-600 text-emerald-900 dark:text-emerald-200 font-black">' + (summary.other.existTotal || '') + '</td>';
    // Col 11: Due Manpower
    html += '<td class="py-2 px-2 text-center border border-slate-400 dark:border-slate-600 font-black whitespace-nowrap">' +
      (summary.other.shortage > 0 
        ? '<span class="px-2 py-0.5 rounded-md text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">' + summary.other.shortage + ' Due</span> <span class="text-[10px] text-slate-600 block font-semibold">(Net: 0)</span>'
        : '0') +
    '</td>';
    html += '</tr>';

    // Grand Total Row: Total Manpower (pink #F8D7DA background as in screenshot)
    html += '<tr class="bg-[#F8D7DA] dark:bg-pink-950/80 font-black text-slate-950 dark:text-pink-100 border-t-2 border-b-2 border-slate-500 dark:border-slate-400 shadow-xs text-sm">';
    html += '<td class="py-2.5 px-2 text-center border border-slate-400 dark:border-slate-600"></td>';
    html += '<td class="py-2.5 px-3 text-center uppercase tracking-wider border border-slate-400 dark:border-slate-600 font-black">Total Manpower</td>';
    html += '<td class="py-2.5 px-2 text-center border border-slate-400 dark:border-slate-600 font-black">' + summary.total.authM + '</td>';
    html += '<td class="py-2.5 px-2 text-center border border-slate-400 dark:border-slate-600 text-purple-950 dark:text-purple-200 font-black">' + (summary.total.existM || '') + '</td>';
    html += '<td class="py-2.5 px-2 text-center border border-slate-400 dark:border-slate-600 font-black">' + summary.total.authS + '</td>';
    html += '<td class="py-2.5 px-2 text-center border border-slate-400 dark:border-slate-600 text-sky-950 dark:text-sky-200 font-black">' + (summary.total.existS || '') + '</td>';
    html += '<td class="py-2.5 px-2 text-center border border-slate-400 dark:border-slate-600 font-black">' + summary.total.authW + '</td>';
    html += '<td class="py-2.5 px-2 text-center border border-slate-400 dark:border-slate-600 text-emerald-950 dark:text-emerald-200 font-black">' + (summary.total.existW || '') + '</td>';
    // Col 9: Grand Total Authorize
    html += '<td class="py-2.5 px-2 text-center border border-slate-400 dark:border-slate-600 font-black">' + summary.total.authTotal + '</td>';
    // Col 10: Grand Total Existing
    html += '<td class="py-2.5 px-2 text-center border border-slate-400 dark:border-slate-600 text-emerald-950 dark:text-emerald-200 font-black">' + (summary.total.existTotal || '') + '</td>';
    // Col 11: Grand Total Due
    html += '<td class="py-2.5 px-2 text-center border border-slate-400 dark:border-slate-600 font-black whitespace-nowrap">' +
      '<span class="px-2.5 py-1 rounded-lg text-xs font-black bg-rose-500/20 text-rose-800 dark:text-rose-200 border border-rose-500/40 shadow-xs">' +
        summary.total.shortage + ' Due' +
      '</span> ' +
      '<span class="text-[10px] text-slate-600 dark:text-slate-400 block font-semibold">(Net: +' + Math.abs(summary.total.netDiff) + ' Ex)</span>' +
    '</td>';
    html += '</tr>';

    tbody.innerHTML = html;

    // Update KPI badges
    var kpiAuth = document.getElementById('summary-kpi-auth-total');
    if (kpiAuth) kpiAuth.textContent = summary.total.authTotal + ' Staff';

    var kpiExist = document.getElementById('summary-kpi-exist-total');
    if (kpiExist) kpiExist.textContent = summary.total.existTotal + ' Staff';

    var kpiCeiling = document.getElementById('summary-kpi-ceiling');
    if (kpiCeiling) kpiCeiling.textContent = summary.cf.existTotal + ' / ' + summary.cf.authTotal;

    var kpiOther = document.getElementById('summary-kpi-other');
    if (kpiOther) kpiOther.textContent = summary.other.existTotal + ' / ' + summary.other.authTotal;

    var badge = document.getElementById('sidebar-summary-badge');
    if (badge) badge.textContent = summary.total.authTotal;
  }

  // Edit Mode Actions
  function toggleEditMode() {
    if (typeof window.isEditModeEnabled === 'function' && !window.isEditModeEnabled()) {
      if (window.showHRToast) {
        window.showHRToast('🔒 Edit Mode বন্ধ রয়েছে। Specs এডিট মোড পরিবর্তন করা যাবে না।', 'warning');
      } else {
        alert('Edit Mode is currently stopped/locked in Settings.');
      }
      return;
    }
    isEditMode = true;
    specsWorkingCopy = JSON.parse(JSON.stringify(SECTION_CONFIG));
    render();
    if (window.showHRToast) {
      window.showHRToast('অনুমোদিত কাঠামো সম্পাদনা মোড সক্রিয় হয়েছে। সংখ্যা পরিবর্তন করে Save Specs এ ক্লিক করুন।');
    }
  }

  function onAuthChange(sm, field, val) {
    if (!isEditMode) return;
    var num = Math.max(0, parseInt(val, 10) || 0);
    for (var i = 0; i < specsWorkingCopy.length; i++) {
      if (specsWorkingCopy[i].sm === Number(sm)) {
        specsWorkingCopy[i][field] = num;
        break;
      }
    }
    // Update KPI and summary cards on the fly
    var summary = computeSummary();
    var kpiAuth = document.getElementById('summary-kpi-auth-total');
    if (kpiAuth) kpiAuth.textContent = summary.total.authTotal + ' Staff';

    var badge = document.getElementById('sidebar-summary-badge');
    if (badge) badge.textContent = summary.total.authTotal;

    // Re-render table body without losing input focus if active
    var activeId = document.activeElement ? document.activeElement : null;
    var activeSelStart = activeId && activeId.selectionStart ? activeId.selectionStart : null;
    render();
  }

  function saveEditMode() {
    if (!isEditMode) return;
    SECTION_CONFIG = JSON.parse(JSON.stringify(specsWorkingCopy));
    isEditMode = false;

    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SECTION_CONFIG));
    } catch (e) {}

    // Save to Server & Firebase Cloud
    if (window.HRMFirebase && typeof window.HRMFirebase.saveSummarySpecs === 'function') {
      window.HRMFirebase.saveSummarySpecs(SECTION_CONFIG);
    } else if (typeof fetch === 'function') {
      fetch('/api/hrm/manpower-summary-specs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(SECTION_CONFIG)
      }).catch(function (e) {
        console.warn('[HRM_SUMMARY] Server save error:', e);
      });
    }

    render();
    if (window.showHRToast) {
      window.showHRToast('ম্যানপাওয়ার সামারি অনুমোদিত কাঠামো সফলভাবে সংরক্ষিত হয়েছে!');
    }
  }

  function cancelEditMode() {
    isEditMode = false;
    specsWorkingCopy = [];
    render();
    if (window.showHRToast) {
      window.showHRToast('সম্পাদনা বাতিল করা হয়েছে। পূর্ববর্তী ডেটা অপরিবর্তিত রয়েছে।');
    }
  }

  function resetDefaultSpecs() {
    if (confirm('আপনি কি ফ্যাক্টরি স্ট্যান্ডার্ড 272 কাঠামোর ডিফল্ট সংখ্যায় রিসেট করতে চান?')) {
      SECTION_CONFIG = JSON.parse(JSON.stringify(DEFAULT_SECTION_CONFIG));
      specsWorkingCopy = JSON.parse(JSON.stringify(DEFAULT_SECTION_CONFIG));
      isEditMode = false;

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(SECTION_CONFIG));
      } catch (e) {}

      if (typeof fetch === 'function') {
        fetch('/api/hrm/manpower-summary-specs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(SECTION_CONFIG)
        }).catch(function () {});
      }

      render();
      if (window.showHRToast) {
        window.showHRToast('অনুমোদিত কাঠামো ডিফল্ট 272 এ রিসেট ও সংরক্ষিত হয়েছে!');
      }
    }
  }

  // Export to Premium Excel (.xlsx) with all 11 columns and full grid borders
  function exportExcel() {
    if (!window.XLSX) {
      if (window.showHRToast) window.showHRToast('Excel ইঞ্জিন পাওয়া যায়নি। প্রিন্ট বিকল্প ব্যবহার করুন।');
      return;
    }

    var summary = computeSummary();
    var counts = summary.counts;
    var specs = summary.specs;

    var headers = [
      'SM No',
      'Section Name',
      'Authorize Manpower (M Grade)',
      'Existing Manpower (M Grade)',
      'Authorize Manpower (S Grade)',
      'Existing Manpower (S Grade)',
      'Authorize Manpower (Worker)',
      'Existing Manpower (Worker)',
      'Total Authorize Manpower',
      'Total Existing Manpower',
      'Due Manpower'
    ];

    var rows = [headers];

    // Ceiling Fan Rows (1 to 9)
    specs.slice(0, 9).forEach(function (sec) {
      var c = counts[sec.name] || { M: 0, S: 0, Worker: 0 };
      var authM = Number(sec.authM) || 0;
      var authS = Number(sec.authS) || 0;
      var authW = Number(sec.authW) || 0;
      var authTot = authM + authS + authW;
      var existTot = (c.M || 0) + (c.S || 0) + (c.Worker || 0);
      var due = authTot - existTot;

      rows.push([
        sec.sm,
        sec.name,
        authM,
        c.M || 0,
        authS,
        c.S || 0,
        authW,
        c.Worker || 0,
        authTot,
        existTot,
        due > 0 ? (due + ' Due') : (due < 0 ? ('0 (+' + Math.abs(due) + ' Ex)') : 0)
      ]);
    });

    // Subtotal Ceiling Fan
    rows.push([
      '',
      'Total Ceiling Fan',
      summary.cf.authM,
      summary.cf.existM,
      summary.cf.authS,
      summary.cf.existS,
      summary.cf.authW,
      summary.cf.existW,
      summary.cf.authTotal,
      summary.cf.existTotal,
      summary.cf.shortage + ' Due'
    ]);

    // Special Lines (10 & 11)
    specs.slice(9).forEach(function (sec) {
      var c = counts[sec.name] || { M: 0, S: 0, Worker: 0 };
      var authM = Number(sec.authM) || 0;
      var authS = Number(sec.authS) || 0;
      var authW = Number(sec.authW) || 0;
      var authTot = authM + authS + authW;
      var existTot = (c.M || 0) + (c.S || 0) + (c.Worker || 0);
      var due = authTot - existTot;

      rows.push([
        sec.sm,
        sec.name,
        authM,
        c.M || 0,
        authS,
        c.S || 0,
        authW,
        c.Worker || 0,
        authTot,
        existTot,
        due > 0 ? (due + ' Due') : (due < 0 ? ('0 (+' + Math.abs(due) + ' Ex)') : 0)
      ]);
    });

    // Subtotal Rechargeable/Exhaust/Capacitor
    rows.push([
      '',
      'Rechargeable/Exhaust/Capacitor',
      summary.other.authM,
      summary.other.existM,
      summary.other.authS,
      summary.other.existS,
      summary.other.authW,
      summary.other.existW,
      summary.other.authTotal,
      summary.other.existTotal,
      summary.other.shortage + ' Due'
    ]);

    // Grand Total Manpower
    rows.push([
      '',
      'Total Manpower',
      summary.total.authM,
      summary.total.existM,
      summary.total.authS,
      summary.total.existS,
      summary.total.authW,
      summary.total.existW,
      summary.total.authTotal,
      summary.total.existTotal,
      summary.total.shortage + ' Due'
    ]);

    var wb = XLSX.utils.book_new();
    var ws = XLSX.utils.aoa_to_sheet(rows);

    // Column Widths
    ws['!cols'] = [
      { wch: 8 },   // SM No
      { wch: 32 },  // Section Name
      { wch: 26 },  // Auth M
      { wch: 24 },  // Exist M
      { wch: 26 },  // Auth S
      { wch: 24 },  // Exist S
      { wch: 26 },  // Auth Worker
      { wch: 24 },  // Exist Worker
      { wch: 24 },  // Total Auth
      { wch: 24 },  // Total Exist
      { wch: 18 }   // Due Manpower
    ];

    // Styling & Borders
    var thinBorder = {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } }
    };

    var range = XLSX.utils.decode_range(ws['!ref']);
    for (var R = range.s.r; R <= range.e.r; ++R) {
      for (var C = range.s.c; C <= range.e.c; ++C) {
        var cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
        var cell = ws[cellRef];

        var isHeader = (R === 0);
        var isCeilingTotal = (R === 10);
        var isOtherTotal = (R === 13);
        var isGrandTotal = (R === 14);

        var bg = 'FFFFFF';
        var fontColor = '000000';
        var isBold = false;
        var align = (C === 1 && !isCeilingTotal && !isOtherTotal && !isGrandTotal) ? 'left' : 'center';

        if (isHeader) {
          bg = 'F8D7DA'; // Pink/Mauve header matching screenshot
          fontColor = '000000';
          isBold = true;
          align = 'center';
        } else if (isCeilingTotal || isOtherTotal) {
          bg = 'CCE7F5'; // Light cyan/blue subtotal matching screenshot
          fontColor = '000000';
          isBold = true;
        } else if (isGrandTotal) {
          bg = 'F8D7DA'; // Pink grand total matching screenshot
          fontColor = '000000';
          isBold = true;
        } else {
          if (R % 2 === 0) bg = 'FDFDFD';
          if (C === 3 || C === 5 || C === 7 || C === 8 || C === 9 || C === 10) isBold = true;
        }

        cell.s = {
          font: { name: 'Segoe UI', sz: isHeader ? 10 : 9.5, color: { rgb: fontColor }, bold: isBold },
          fill: { fgColor: { rgb: bg } },
          alignment: { horizontal: align, vertical: 'center', wrapText: true },
          border: thinBorder
        };
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Manpower_Summary');
    var filename = 'MEP_Manpower_Summary_Report_Plant1027_' + new Date().toISOString().slice(0, 10) + '.xlsx';
    XLSX.writeFile(wb, filename);

    if (window.showHRToast) {
      window.showHRToast('ম্যানপাওয়ার সামারি প্রিমিয়াম Excel ফাইল ১১টি কলাম ও সম্পূর্ণ বর্ডার সহ ডাউনলোড হয়েছে!');
    }
  }

  // Export to Premium Landscape PDF (.pdf) with all 11 columns and full grid borders
  function exportPDF() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      if (window.showHRToast) window.showHRToast('PDF লাইব্রেরি লোড হচ্ছে, প্রিন্ট অপশন ওপেন করা হচ্ছে...');
      window.print();
      return;
    }

    var summary = computeSummary();
    var counts = summary.counts;
    var specs = summary.specs;

    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    var dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    // Header banner
    doc.setFillColor(30, 27, 75); // Dark Purple #1E1B4B
    doc.rect(10, 8, 277, 20, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('MEP GROUP — CEILING FAN FACTORY (PLANT 1027)', 14, 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(209, 213, 219);
    doc.text('MANPOWER SUMMARY REPORT — AUTHORIZED SPECIFICATION VS. EXISTING ACTIVE DEPLOYMENT', 14, 22);

    // Telemetry Box
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(210, 10, 73, 16, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('AUTH / EXIST / DUE', 213, 14.5);
    doc.setFontSize(10);
    doc.setTextColor(56, 189, 248);
    doc.text(summary.total.authTotal + ' / ' + summary.total.existTotal + ' (' + summary.total.shortage + ' Due)', 213, 21);

    var columns = [
      { header: 'SM No', dataKey: 'sm' },
      { header: 'Section Name', dataKey: 'name' },
      { header: 'Authorize\n(M Grade)', dataKey: 'authM' },
      { header: 'Existing\n(M Grade)', dataKey: 'existM' },
      { header: 'Authorize\n(S Grade)', dataKey: 'authS' },
      { header: 'Existing\n(S Grade)', dataKey: 'existS' },
      { header: 'Authorize\n(Worker)', dataKey: 'authW' },
      { header: 'Existing\n(Worker)', dataKey: 'existW' },
      { header: 'Total Auth\n(Need)', dataKey: 'authTot' },
      { header: 'Total\nExisting', dataKey: 'existTot' },
      { header: 'Due\nManpower', dataKey: 'due' }
    ];

    var bodyData = [];

    // Ceiling Fan Rows 1-9
    specs.slice(0, 9).forEach(function (sec) {
      var c = counts[sec.name] || { M: 0, S: 0, Worker: 0 };
      var authM = Number(sec.authM) || 0;
      var authS = Number(sec.authS) || 0;
      var authW = Number(sec.authW) || 0;
      var authTot = authM + authS + authW;
      var existTot = (c.M || 0) + (c.S || 0) + (c.Worker || 0);
      var due = authTot - existTot;

      bodyData.push({
        sm: sec.sm,
        name: sec.name,
        authM: authM,
        existM: c.M || 0,
        authS: authS,
        existS: c.S || 0,
        authW: authW,
        existW: c.Worker || 0,
        authTot: authTot,
        existTot: existTot,
        due: due > 0 ? (due + ' Due') : (due < 0 ? ('0 (+' + Math.abs(due) + ')') : '0'),
        _type: 'normal'
      });
    });

    // Subtotal Ceiling Fan
    bodyData.push({
      sm: '',
      name: 'Total Ceiling Fan',
      authM: summary.cf.authM,
      existM: summary.cf.existM,
      authS: summary.cf.authS,
      existS: summary.cf.existS,
      authW: summary.cf.authW,
      existW: summary.cf.existW,
      authTot: summary.cf.authTotal,
      existTot: summary.cf.existTotal,
      due: summary.cf.shortage + ' Due',
      _type: 'subtotal'
    });

    // Special Lines 10 & 11
    specs.slice(9).forEach(function (sec) {
      var c = counts[sec.name] || { M: 0, S: 0, Worker: 0 };
      var authM = Number(sec.authM) || 0;
      var authS = Number(sec.authS) || 0;
      var authW = Number(sec.authW) || 0;
      var authTot = authM + authS + authW;
      var existTot = (c.M || 0) + (c.S || 0) + (c.Worker || 0);
      var due = authTot - existTot;

      bodyData.push({
        sm: sec.sm,
        name: sec.name,
        authM: authM,
        existM: c.M || 0,
        authS: authS,
        existS: c.S || 0,
        authW: authW,
        existW: c.Worker || 0,
        authTot: authTot,
        existTot: existTot,
        due: due > 0 ? (due + ' Due') : (due < 0 ? ('0 (+' + Math.abs(due) + ')') : '0'),
        _type: 'normal'
      });
    });

    // Subtotal Rechargeable/Exhaust/Capacitor
    bodyData.push({
      sm: '',
      name: 'Rechargeable/Exhaust/Capacitor',
      authM: summary.other.authM,
      existM: summary.other.existM,
      authS: summary.other.authS,
      existS: summary.other.existS,
      authW: summary.other.authW,
      existW: summary.other.existW,
      authTot: summary.other.authTotal,
      existTot: summary.other.existTotal,
      due: summary.other.shortage + ' Due',
      _type: 'subtotal'
    });

    // Grand Total Manpower
    bodyData.push({
      sm: '',
      name: 'Total Manpower',
      authM: summary.total.authM,
      existM: summary.total.existM,
      authS: summary.total.authS,
      existS: summary.total.existS,
      authW: summary.total.authW,
      existW: summary.total.existW,
      authTot: summary.total.authTotal,
      existTot: summary.total.existTotal,
      due: summary.total.shortage + ' Due',
      _type: 'grandtotal'
    });

    doc.autoTable({
      columns: columns,
      body: bodyData,
      startY: 32,
      margin: { left: 10, right: 10 },
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 2,
        lineColor: [50, 50, 50],
        lineWidth: 0.25,
        valign: 'middle',
        halign: 'center',
        textColor: [20, 20, 20]
      },
      headStyles: {
        fillColor: [248, 215, 218], // Pink #F8D7DA
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
        lineColor: [0, 0, 0],
        lineWidth: 0.3
      },
      columnStyles: {
        sm: { cellWidth: 10, halign: 'center' },
        name: { cellWidth: 46, halign: 'left', fontStyle: 'bold' },
        authM: { cellWidth: 20, halign: 'center' },
        existM: { cellWidth: 20, halign: 'center', fontStyle: 'bold', textColor: [126, 34, 206] },
        authS: { cellWidth: 20, halign: 'center' },
        existS: { cellWidth: 20, halign: 'center', fontStyle: 'bold', textColor: [3, 105, 161] },
        authW: { cellWidth: 20, halign: 'center' },
        existW: { cellWidth: 20, halign: 'center', fontStyle: 'bold', textColor: [4, 120, 87] },
        authTot: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
        existTot: { cellWidth: 22, halign: 'center', fontStyle: 'bold', textColor: [4, 120, 87] },
        due: { cellWidth: 22, halign: 'center', fontStyle: 'bold', textColor: [190, 18, 60] }
      },
      didParseCell: function (data) {
        var raw = data.row.raw;
        if (!raw) return;
        if (raw._type === 'subtotal') {
          data.cell.styles.fillColor = [204, 231, 245]; // Light blue #CCE7F5
          data.cell.styles.textColor = [0, 0, 0];
          data.cell.styles.fontStyle = 'bold';
          if (data.column.dataKey === 'name') data.cell.styles.halign = 'center';
        } else if (raw._type === 'grandtotal') {
          data.cell.styles.fillColor = [248, 215, 218]; // Pink #F8D7DA
          data.cell.styles.textColor = [0, 0, 0];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 8.5;
          if (data.column.dataKey === 'name') data.cell.styles.halign = 'center';
        }
      }
    });

    var pageCount = doc.internal.getNumberOfPages();
    for (var i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('MEP Group — Human Resource Management (Plant 1027) | Date: ' + dateStr, 14, 202);
      doc.text('Page ' + i + ' of ' + pageCount, 265, 202, { align: 'right' });
    }

    doc.save('MEP_Manpower_Summary_Report_Plant1027_' + new Date().toISOString().slice(0, 10) + '.pdf');

    if (window.showHRToast) {
      window.showHRToast('ম্যানপাওয়ার সামারি প্রিমিয়াম PDF সম্পূর্ণ ১১টি কলাম ও বর্ডার সহ ডাউনলোড হয়েছে!');
    }
  }

  // Public API
  window.HRMManpowerSummary = {
    render: render,
    computeSummary: computeSummary,
    toggleEditMode: toggleEditMode,
    onAuthChange: onAuthChange,
    saveEditMode: saveEditMode,
    cancelEditMode: cancelEditMode,
    resetDefaultSpecs: resetDefaultSpecs,
    exportExcel: exportExcel,
    exportPDF: exportPDF
  };

  // Initialize
  loadSavedSpecs();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(render, 300);
    });
  } else {
    setTimeout(render, 300);
  }

})();
