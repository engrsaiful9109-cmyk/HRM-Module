/**
 * MEP GROUP - Enterprise Human Resource Management (HRM) Module
 * Employee Data Entry & Replacement Management Controller
 * Handles: New Employee Entry, Replaced Staff Tracking, and Replacement Master Report
 * Author: Antigravity AI / MEP Engineering Team
 */

(function () {
  'use strict';

  var state = {
    activeTab: 'replacement-report', // 'entry-form' | 'replacement-report'
    hiringType: 'replacement',        // 'replacement' | 'new'
    selectedReplacedEmp: null,
    searchReplacedQuery: '',
    replacementList: [],
    filteredReplacements: [],
    filters: {
      search: '',
      section: 'ALL',
      department: 'ALL',
      status: 'ALL',
      reason: 'ALL',
      sort_by: 'doj',
      sort_dir: 'desc',
      page: 1,
      per_page: 25
    }
  };

  // Section Color Palette matching hrm_manpower.js
  var SECTION_COLORS = {
    'Fan Assemble Line': { bg: 'bg-indigo-500/10 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-500/25', icon: 'ph-arrows-merge' },
    'Fan Auto Powder Coating': { bg: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-500/25', icon: 'ph-paint-roller' },
    'Fan Armature Winding': { bg: 'bg-purple-500/10 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-500/25', icon: 'ph-spiral' },
    'Fan Lathe': { bg: 'bg-blue-500/10 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-500/25', icon: 'ph-gear-six' },
    'Fan Power Press & Stamping': { bg: 'bg-rose-500/10 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-500/25', icon: 'ph-hammer' },
    'Fan Dhalai & Die Casting': { bg: 'bg-amber-500/10 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-500/25', icon: 'ph-fire' },
    'Fan Blade & Dimmer': { bg: 'bg-cyan-500/10 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300 border-cyan-500/25', icon: 'ph-fan' },
    'Fan Rojonigondha': { bg: 'bg-fuchsia-500/10 text-fuchsia-700 dark:bg-fuchsia-950/50 dark:text-fuchsia-300 border-fuchsia-500/25', icon: 'ph-flower-lotus' },
    'Fan Sada Shapla': { bg: 'bg-sky-500/10 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-500/25', icon: 'ph-flower' },
    'Fan Sala Shapla': { bg: 'bg-sky-500/10 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-500/25', icon: 'ph-flower' },
    'Sada Shapla': { bg: 'bg-sky-500/10 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-500/25', icon: 'ph-flower' },
    'Fan Replace': { bg: 'bg-violet-500/10 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border-violet-500/25', icon: 'ph-arrows-clockwise' },
    'Fan Admin': { bg: 'bg-slate-500/10 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-500/25', icon: 'ph-briefcase' }
  };

  function getSectionStyle(secName) {
    if (!secName) return { bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300', icon: 'ph-factory' };
    return SECTION_COLORS[secName] || { bg: 'bg-purple-500/10 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-500/25', icon: 'ph-factory' };
  }

  function formatMoney(num) {
    if (num === null || num === undefined || isNaN(num)) return 'Tk 0';
    return 'Tk ' + Math.round(num).toLocaleString('en-IN');
  }

  var MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTH_MAP = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };

  function toDateInputValue(str) {
    if (!str) return '';
    str = String(str).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    var m = str.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ](\d{4})$/);
    if (m) {
      var d = m[1].length === 1 ? '0' + m[1] : m[1];
      var mo = MONTH_MAP[m[2].toLowerCase()] || '01';
      var y = m[3];
      return y + '-' + mo + '-' + d;
    }
    var dObj = new Date(str);
    if (!isNaN(dObj.getTime())) {
      var yy = dObj.getFullYear();
      var mm = String(dObj.getMonth() + 1).padStart(2, '0');
      var dd = String(dObj.getDate()).padStart(2, '0');
      return yy + '-' + mm + '-' + dd;
    }
    return '';
  }

  function fromDateInputValue(val) {
    if (!val) return '';
    val = String(val).trim();
    var m = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      var y = m[1];
      var moIdx = parseInt(m[2], 10) - 1;
      var mo = (moIdx >= 0 && moIdx < 12) ? MONTH_NAMES[moIdx] : 'Jan';
      var d = m[3];
      return d + '-' + mo + '-' + y;
    }
    return val;
  }

  function formatCompactDOJ(val) {
    if (!val || val === 'Blank' || val === '0-Jan-00' || val === '00-00-0000') return '—';
    var str = String(val).trim();
    // 1. DD-Mmm-YYYY or DD-Mmm-YY (e.g. 29-Nov-2025 -> 29-Nov-25)
    var m1 = str.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ](\d{2,4})$/);
    if (m1) {
      var d = m1[1].length === 1 ? '0' + m1[1] : m1[1];
      var mo = m1[2].charAt(0).toUpperCase() + m1[2].slice(1, 3).toLowerCase();
      var y = m1[3].length === 4 ? m1[3].slice(-2) : m1[3];
      return d + '-' + mo + '-' + y;
    }
    // 2. YYYY-MM-DD
    var m2 = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m2) {
      var y2 = m2[1].slice(-2);
      var moIdx = parseInt(m2[2], 10) - 1;
      var mo2 = (moIdx >= 0 && moIdx < 12) ? MONTH_NAMES[moIdx] : 'Jan';
      var d2 = m2[3].length === 1 ? '0' + m2[3] : m2[3];
      return d2 + '-' + mo2 + '-' + y2;
    }
    if (str.length <= 9) return str;
    var dObj = new Date(str);
    if (!isNaN(dObj.getTime())) {
      var d3 = String(dObj.getDate()).padStart(2, '0');
      var mo3 = MONTH_NAMES[dObj.getMonth()];
      var y3 = String(dObj.getFullYear()).slice(-2);
      return d3 + '-' + mo3 + '-' + y3;
    }
    return str;
  }

  function formatGlossyRemark(rawRemarks, isNumericNewId, cleanNewId) {
    var clean = (rawRemarks || '').toString()
      .replace(/\s*\/\s*[\u0980-\u09FF\s]+/g, '')
      .replace(/[\u0980-\u09FF]/g, '')
      .trim();

    if (!clean && isNumericNewId) {
      return '<span class="rep-remark-emerald inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold shadow-2xs whitespace-nowrap">' +
             '  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span><span>Joined Active</span>' +
             '</span>';
    }

    if (!clean && !isNumericNewId && cleanNewId && cleanNewId !== 'Blank') {
      return '<span class="rep-remark-amber inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold shadow-2xs whitespace-nowrap">' +
             '  <i class="ph-bold ph-hourglass text-xs"></i><span>' + cleanNewId + '</span>' +
             '</span>';
    }

    if (!clean) {
      return '<span class="text-slate-400 text-xs">—</span>';
    }

    var lower = clean.toLowerCase();

    if (lower.indexOf('resign') !== -1) {
      return '<span class="rep-remark-amber inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold shadow-2xs whitespace-nowrap">' +
             '  <i class="ph-bold ph-sign-out text-xs"></i><span>' + clean + '</span>' +
             '</span>';
    }

    if (lower.indexOf('notice') !== -1 || lower.indexOf('left') !== -1) {
      return '<span class="rep-remark-rose inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold shadow-2xs whitespace-nowrap">' +
             '  <i class="ph-bold ph-warning-octagon text-xs"></i><span>' + clean + '</span>' +
             '</span>';
    }

    if (lower.indexOf('terminat') !== -1) {
      return '<span class="rep-remark-rose inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold shadow-2xs whitespace-nowrap">' +
             '  <i class="ph-bold ph-x-circle text-xs"></i><span>' + clean + '</span>' +
             '</span>';
    }

    if (lower.indexOf('transfer') !== -1) {
      return '<span class="rep-remark-sky inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold shadow-2xs whitespace-nowrap">' +
             '  <i class="ph-bold ph-arrows-left-right text-xs"></i><span>' + clean + '</span>' +
             '</span>';
    }

    if (lower.indexOf('medic') !== -1 || lower.indexOf('health') !== -1) {
      return '<span class="rep-remark-amber inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold shadow-2xs whitespace-nowrap">' +
             '  <i class="ph-bold ph-first-aid text-xs"></i><span>' + clean + '</span>' +
             '</span>';
    }

    if (lower.indexOf('join') !== -1) {
      return '<span class="rep-remark-emerald inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold shadow-2xs whitespace-nowrap">' +
             '  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span><span>' + clean + '</span>' +
             '</span>';
    }

    return '<span class="rep-remark-slate inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10.5px] font-semibold shadow-2xs whitespace-nowrap">' +
           '  <span>' + clean + '</span>' +
           '</span>';
  }

  function getAllEmployees() {
    if (window.HRMManpower && typeof window.HRMManpower.getAllEmployees === 'function') {
      return window.HRMManpower.getAllEmployees();
    }
    var localCache = window.MEP_MANPOWER_DATABASE || window.HRM_MANPOWER_CACHE;
    if (localCache && localCache.employees) {
      return localCache.employees;
    }
    return [];
  }

  // -------------------------------------------------------------
  // Initialization & Data Loading
  // -------------------------------------------------------------
  function updateDynamicMonthBadges() {
    var now = new Date();
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var currentMonthName = months[now.getMonth()];
    var currentYear = now.getFullYear();
    var badge = document.getElementById('hrm-payroll-verified-badge');
    if (badge) {
      badge.textContent = currentMonthName + ' ' + currentYear + ' Payroll Verified';
    }
  }

  function initEmployeeEntryModule() {
    updateDynamicMonthBadges();
    buildReplacementList();
    renderReplacementKPIs();
    renderReplacementTable();
    populateDropdowns();
    resetEntryForm();
    renderHoldCandidatesShelf();
  }

  // Deduplicate helper: Enforces that an ID can only be replaced once and can only replace once
  function deduplicateReplacementRecords(list) {
    if (!Array.isArray(list)) return [];
    var seenPairs = {};
    var seenNewIds = {};
    var clean = [];
    list.forEach(function (r) {
      if (!r) return;
      var rid = String(r.replace_id || '').replace(/^[#\s]+/, '').trim();
      var nid = String(r.new_id || '').replace(/^[#\s]+/, '').trim();
      if (!rid && !nid) return;
      var pairKey = rid + '___' + nid;
      if (seenPairs[pairKey]) return; // Discard exact duplicate pair
      if (nid && nid !== 'Blank' && nid !== '-' && nid !== '') {
        if (seenNewIds[nid]) return; // Discard duplicate new replacement hire
        seenNewIds[nid] = true;
      }
      seenPairs[pairKey] = true;
      clean.push(r);
    });
    return clean;
  }

  function getReplacedStaffRecord(staffId) {
    if (!staffId) return null;
    var clean = String(staffId).replace(/^[#\s]+/, '').trim();
    var repMaster = window.MEP_REPLACEMENT_MASTER || [];
    return repMaster.find(function (r) {
      var rId = String(r.replace_id || '').replace(/^[#\s]+/, '').trim();
      var nId = String(r.new_id || '').replace(/^[#\s]+/, '').trim();
      return rId === clean && nId && nId !== 'Blank' && nId !== '-' && nId !== '';
    }) || null;
  }

  function getAppointedReplacementRecord(staffId) {
    if (!staffId) return null;
    var clean = String(staffId).replace(/^[#\s]+/, '').trim();
    var repMaster = window.MEP_REPLACEMENT_MASTER || [];
    return repMaster.find(function (r) {
      var nId = String(r.new_id || '').replace(/^[#\s]+/, '').trim();
      return nId === clean;
    }) || null;
  }

  function updateReplacementValidationWarning(repId) {
    var warnBox = document.getElementById('replacement-duplicate-warning');
    var warnText = document.getElementById('replacement-duplicate-warning-text');
    var submitBtn = document.getElementById('entry-submit-btn');
    if (!warnBox || !warnText) return;

    if (!repId || state.hiringType !== 'replacement') {
      warnBox.classList.add('hidden');
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    var clean = String(repId).replace(/^[#\s]+/, '').trim();
    var alreadyRep = getReplacedStaffRecord(clean);
    if (alreadyRep) {
      var nId = String(alreadyRep.new_id || '').replace(/^[#\s]+/, '').trim();
      var nName = alreadyRep.new_name || 'Staff';
      warnText.innerHTML = 'Employee <b>' + clean + '</b> (' + (alreadyRep.replace_name || '') + ') has already been replaced by Employee <b>' + nId + ' (' + nName + ')</b>! <u>An ID can only be replaced once.</u>';
      warnBox.classList.remove('hidden');
      if (submitBtn) submitBtn.disabled = true;
    } else {
      warnBox.classList.add('hidden');
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  function buildReplacementList(forceFetch) {
    if (!forceFetch && window.MEP_REPLACEMENT_MASTER && Array.isArray(window.MEP_REPLACEMENT_MASTER) && window.MEP_REPLACEMENT_MASTER.length > 0) {
      window.MEP_REPLACEMENT_MASTER = deduplicateReplacementRecords(window.MEP_REPLACEMENT_MASTER);
      state.replacementList = window.MEP_REPLACEMENT_MASTER.slice();
      applyReplacementFilters();
      renderReplacementKPIs();
      renderReplacementTable();
      updateBadges(state.replacementList.length);
      populateReplacementSectionDropdown();
      return;
    }

    var isFlat = window.location.pathname.indexOf('FLAT') !== -1 || window.location.href.indexOf('FLAT') !== -1;
    var flatOrNested = isFlat ? 'replacement_master_420.json' : 'data/replacement_master_420.json';

    fetch('/api/hrm/replacement-master?_t=' + Date.now())
      .then(function (res) { return res.json(); })
      .then(function (res) {
        var repList = Array.isArray(res) ? res : (res && (res.data || res.records));
        if (repList && Array.isArray(repList)) {
          if (window.MEP_REPLACEMENT_MASTER && window.MEP_REPLACEMENT_MASTER.length > repList.length) {
            repList = window.MEP_REPLACEMENT_MASTER;
          }
          repList = deduplicateReplacementRecords(repList);
          window.MEP_REPLACEMENT_MASTER = repList;
          state.replacementList = repList.slice();
          applyReplacementFilters();
          renderReplacementKPIs();
          renderReplacementTable();
          updateBadges(state.replacementList.length);
          populateReplacementSectionDropdown();
        }
      })
      .catch(function () {
        fetch(flatOrNested + '?_t=' + Date.now())
          .then(function (r) { return r.json(); })
          .then(function (data) {
            var repList = Array.isArray(data) ? data : (data && (data.records || data.data));
            if (repList && Array.isArray(repList)) {
              if (window.MEP_REPLACEMENT_MASTER && window.MEP_REPLACEMENT_MASTER.length > repList.length) {
                repList = window.MEP_REPLACEMENT_MASTER;
              }
              repList = deduplicateReplacementRecords(repList);
              window.MEP_REPLACEMENT_MASTER = repList;
              state.replacementList = repList.slice();
              applyReplacementFilters();
              renderReplacementKPIs();
              renderReplacementTable();
              updateBadges(state.replacementList.length);
              populateReplacementSectionDropdown();
            }
          });
      });
  }

  function populateReplacementSectionDropdown() {
    var secSelect = document.getElementById('rep-filter-section');
    if (!secSelect) return;
    var currentVal = secSelect.value || 'ALL';
    var sectionsSet = {};
    (state.replacementList || []).forEach(function (item) {
      if (item.replace_section && item.replace_section !== 'Blank') sectionsSet[item.replace_section] = true;
      if (item.new_section && item.new_section !== 'Blank') sectionsSet[item.new_section] = true;
    });
    var sections = Object.keys(sectionsSet).sort();
    var opts = '<option value="ALL">All Sections</option>';
    sections.forEach(function (s) {
      opts += '<option value="' + s + '" ' + (currentVal === s ? 'selected' : '') + '>' + s + '</option>';
    });
    secSelect.innerHTML = opts;
  }

  function updateBadges(count) {
    var b1 = document.getElementById('sidebar-replacement-badge');
    if (b1) b1.textContent = count + ' Repl';
    var b2 = document.getElementById('sidebar-sub-replacement-count');
    if (b2) b2.textContent = count;
    var b3 = document.getElementById('entry-tab-report-badge');
    if (b3) b3.textContent = count;
    var allOpt = document.getElementById('rep-per-page-all-opt');
    if (allOpt) allOpt.textContent = 'All (' + count + ')';
  }

  // -------------------------------------------------------------
  // Tab Switcher inside Employee Data Entry View
  // -------------------------------------------------------------
  function switchTab(tabName) {
    state.activeTab = tabName;
    var btnForm = document.getElementById('btn-tab-entry-form');
    var btnReport = document.getElementById('btn-tab-replacement-report');
    var secForm = document.getElementById('view-entry-form');
    var secReport = document.getElementById('view-replacement-report');

    if (tabName === 'entry-form') {
      if (secForm) secForm.classList.remove('hidden');
      if (secReport) secReport.classList.add('hidden');
      if (btnForm) {
        btnForm.className = 'rep-btn-glass-emerald px-4 py-2 rounded-xl text-xs font-black text-white flex items-center gap-2 cursor-pointer transition-all shadow-md';
      }
      if (btnReport) {
        btnReport.className = 'px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60 flex items-center gap-2 cursor-pointer transition-all';
      }
      suggestNextStaffId();
      renderHoldCandidatesShelf();
    } else {
      // Default to replacement report
      if (secForm) secForm.classList.add('hidden');
      if (secReport) secReport.classList.remove('hidden');
      if (btnReport) {
        btnReport.className = 'rep-btn-glass-primary px-4 py-2 rounded-xl text-xs font-black text-white flex items-center gap-2 cursor-pointer transition-all shadow-md';
      }
      if (btnForm) {
        btnForm.className = 'px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60 flex items-center gap-2 cursor-pointer transition-all';
      }
      buildReplacementList();
      renderReplacementKPIs();
      renderReplacementTable();
    }
  }

  // -------------------------------------------------------------
  // Hiring Type Toggle (New vs Replacement)
  // -------------------------------------------------------------
  function setHiringType(type) {
    state.hiringType = type;
    var btnNew = document.getElementById('btn-hiring-new');
    var btnRep = document.getElementById('btn-hiring-replacement');
    var repBox = document.getElementById('replacement-selection-box');
    var badgeType = document.getElementById('entry-hiring-type-indicator');

    if (type === 'replacement') {
      if (btnRep) {
        btnRep.className = 'flex-1 py-2.5 px-4 rounded-xl text-xs font-black bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer ring-2 ring-purple-400/50 border border-white/30';
      }
      if (btnNew) {
        btnNew.className = 'flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800/80 bg-white/40 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/10 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs';
      }
      if (repBox) repBox.classList.remove('hidden');
      if (badgeType) {
        badgeType.innerHTML = '<span class="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span><span class="text-purple-700 dark:text-purple-300 font-extrabold">Replacement Hire</span>';
      }
      renderHoldCandidatesShelf();
    } else {
      if (btnNew) {
        btnNew.className = 'flex-1 py-2.5 px-4 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer ring-2 ring-emerald-400/50 border border-white/30';
      }
      if (btnRep) {
        btnRep.className = 'flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800/80 bg-white/40 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/10 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs';
      }
      if (repBox) repBox.classList.add('hidden');
      if (badgeType) {
        badgeType.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500"></span><span class="text-emerald-700 dark:text-emerald-300 font-extrabold">New Direct Recruitment</span>';
      }
      clearReplacedEmployee();
    }
  }

  // -------------------------------------------------------------
  // Hold Candidates Shelf & Search Replaced Employee
  // -------------------------------------------------------------
  function renderHoldCandidatesShelf() {
    var panel = document.getElementById('hold-candidates-panel');
    var listEl = document.getElementById('hold-candidates-list');
    var countBadge = document.getElementById('hold-candidates-count-badge');
    if (!listEl) return;

    var all = getAllEmployees();
    var holdEmployees = all.filter(function (e) {
      return String(e.status || '').trim().toLowerCase() === 'hold' && !getReplacedStaffRecord(e.staff_id);
    });

    if (countBadge) {
      countBadge.textContent = holdEmployees.length + ' Pending';
    }

    if (holdEmployees.length === 0) {
      listEl.innerHTML = '<span class="text-[11px] text-slate-500 dark:text-slate-400 italic">💡 No employees currently waiting on Hold. Set employee status to Hold from Manpower List or search by ID/name below.</span>';
      return;
    }

    var html = holdEmployees.map(function (e) {
      var cleanHoldId = String(e.staff_id || '—').replace(/^[#\s]+/, '');
      return '<button type="button" onclick="window.HRMEmployeeEntry.selectReplacedEmployee(' + e.sl_no + ')" ' +
             'class="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-500/40 hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-left transition-all shadow-2xs cursor-pointer flex items-center gap-2 group/h" ' +
             'title="Click to select this Hold staff for replacement">' +
             '  <span class="font-mono font-black text-xs text-amber-700 dark:text-amber-300 group-hover/h:scale-105 transition-transform">' + cleanHoldId + '</span>' +
             '  <span class="font-bold text-xs text-slate-800 dark:text-slate-200">' + (e.name || '—') + '</span>' +
             '  <span class="text-[10px] text-slate-500 dark:text-slate-400">(' + (e.section || 'General') + ')</span>' +
             '  <span class="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-black bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">Hold</span>' +
             '</button>';
    }).join('');

    listEl.innerHTML = html;
  }

  function onSearchReplacedEmployee(query) {
    var raw = (query || '').trim();
    if (!raw) {
      clearTimeout(state.searchReplacedTimer);
      executeSearchReplacedEmployee(query);
    } else {
      clearTimeout(state.searchReplacedTimer);
      state.searchReplacedTimer = setTimeout(function () {
        executeSearchReplacedEmployee(query);
      }, 120);
    }
  }

  function executeSearchReplacedEmployee(query) {
    var raw = (query || '').trim();
    state.searchReplacedQuery = raw.toLowerCase();

    var cleanId = raw.replace(/^#/, '').split(/[\s\-•]+/)[0].trim();
    var repIdInput = document.getElementById('entry-replace-id');
    var repNameInput = document.getElementById('entry-replace-name');

    var resultsBox = document.getElementById('replaced-search-results');
    if (!resultsBox) return;

    var all = getAllEmployees();
    // Exclude employees that are already replaced: an ID can only be replaced once!
    var holdEmployees = all.filter(function (e) {
      var isHold = String(e.status || '').trim().toLowerCase() === 'hold';
      return isHold && !getReplacedStaffRecord(e.staff_id);
    });
    var activeEmployees = all.filter(function (e) {
      var isActive = String(e.status || '').trim().toLowerCase() === 'active';
      return isActive && !getReplacedStaffRecord(e.staff_id);
    });

    // When query is empty (e.g. user focused or clicked inside search input):
    // Show eligible Hold employees immediately so the user can easily select!
    if (!raw) {
      if (holdEmployees.length > 0) {
        var headerHtml = '<div class="p-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 flex items-center justify-between text-[11px] font-bold text-amber-800 dark:text-amber-300">' +
          '<span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 live-beacon"></span>Candidates Pending Replacement (Hold Personnel - ' + holdEmployees.length + '):</span>' +
          '<span class="text-[10px] font-normal text-amber-700 dark:text-amber-400">Click to select</span>' +
          '</div>';

        var holdListHtml = holdEmployees.map(function (e) {
          var cleanHoldEmpId = String(e.staff_id || '—').replace(/^[#\s]+/, '');
          return '<div onclick="window.HRMEmployeeEntry.selectReplacedEmployee(' + e.sl_no + ')" ' +
                 'class="p-2.5 hover:bg-amber-500/10 dark:hover:bg-amber-900/30 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer transition-colors">' +
                 '  <div class="flex items-center gap-2.5 min-w-0">' +
                 '    <span class="font-mono font-bold text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">' + cleanHoldEmpId + '</span>' +
                 '    <div class="truncate">' +
                 '      <p class="font-bold text-slate-900 dark:text-white text-xs truncate">' + (e.name || '—') + '</p>' +
                 '      <p class="text-[10px] text-slate-500 dark:text-slate-400 truncate">' + (e.designation || 'Helper') + ' • ' + (e.section || 'General') + '</p>' +
                 '    </div>' +
                 '  </div>' +
                 '  <div class="flex items-center gap-2 shrink-0">' +
                 '    <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">Hold</span>' +
                 '    <span class="text-[11px] font-mono text-slate-400">' + formatMoney(e.gross_salary) + '</span>' +
                 '  </div>' +
                 '</div>';
        }).join('');

        resultsBox.innerHTML = headerHtml + holdListHtml;
        resultsBox.classList.remove('hidden');
      } else {
        resultsBox.classList.add('hidden');
      }
      return;
    }

    // Check if the searched ID has ALREADY been replaced!
    var alreadyRepStaff = getReplacedStaffRecord(cleanId) || (raw ? (window.MEP_REPLACEMENT_MASTER || []).find(function (r) {
      return String(r.replace_name || '').toLowerCase().indexOf(raw) !== -1;
    }) : null);

    if (alreadyRepStaff) {
      var rStaffId = String(alreadyRepStaff.replace_id || cleanId).replace(/^[#\s]+/, '');
      var rStaffName = alreadyRepStaff.replace_name || '';
      var rNewStaffId = String(alreadyRepStaff.new_id || 'Staff').replace(/^[#\s]+/, '');
      var rNewStaffName = alreadyRepStaff.new_name || '';
      resultsBox.innerHTML = '<div class="p-3.5 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 text-center font-bold rounded-2xl m-1 border-2 border-rose-300 dark:border-rose-800 shadow-md">' +
        '<i class="ph-bold ph-prohibit text-xl mb-1 block"></i>' +
        '<span>Employee ID: <b class="font-mono text-rose-700 dark:text-rose-300">' + rStaffId + '</b> (' + rStaffName + ') has already been replaced by Employee <b class="font-mono text-purple-700 dark:text-purple-300">' + rNewStaffId + '</b> (' + rNewStaffName + ')!</span>' +
        '<p class="text-[11px] text-rose-500 mt-1.5 font-bold">❌ An ID can only be replaced once. Cannot replace again.</p>' +
        '</div>';
      resultsBox.classList.remove('hidden');
      updateReplacementValidationWarning(rStaffId);
      return;
    }

    // Eligible candidates for replacement: ONLY Hold employees who haven't been replaced
    var eligibleEmployees = holdEmployees;

    // Check if user typed an exact staff_id match
    var exactStaff = eligibleEmployees.find(function (e) {
      return String(e.staff_id).trim() === cleanId;
    });
    if (exactStaff) {
      if (repIdInput) repIdInput.value = exactStaff.staff_id;
      if (repNameInput) repNameInput.value = exactStaff.name;
    }
    updateReplacementValidationWarning(cleanId);

    var q = state.searchReplacedQuery;
    var matches = eligibleEmployees.filter(function (e) {
      var id = String(e.staff_id || '').toLowerCase();
      var name = String(e.name || '').toLowerCase();
      var sec = String(e.section || '').toLowerCase();
      var desig = String(e.designation || '').toLowerCase();
      return id.indexOf(q) !== -1 || name.indexOf(q) !== -1 || sec.indexOf(q) !== -1 || desig.indexOf(q) !== -1;
    });

    var sliced = matches.slice(0, 12);

    if (sliced.length === 0) {
      // Check if user searched a non-Hold employee (Active or Inactive)
      var nonHoldMatch = all.find(function (e) {
        return (String(e.staff_id).trim() === cleanId || (raw && String(e.name || '').trim().toLowerCase() === raw));
      });
      if (nonHoldMatch) {
        var cleanNonHoldId = String(nonHoldMatch.staff_id || '').replace(/^[#\s]+/, '');
        var nonHoldStatus = nonHoldMatch.status || 'Active';
        resultsBox.innerHTML = '<div class="p-3 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 text-center font-bold rounded-xl m-1 border border-amber-300 dark:border-amber-800">' +
          '<i class="ph-bold ph-warning text-base mb-1 block"></i>' +
          '<span>Employee ID: <b class="font-mono">' + cleanNonHoldId + '</b> (' + nonHoldMatch.name + ') is currently <b>' + nonHoldStatus + '</b>.<br>⚠️ Only <b>Hold</b> staff are eligible for replacement.</span>' +
          '</div>';
        resultsBox.classList.remove('hidden');
        return;
      }

      resultsBox.innerHTML = '<div class="p-3 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 text-center font-medium rounded-xl m-1 border border-amber-300 dark:border-amber-800">' +
        '<i class="ph-bold ph-warning text-base mb-1 block"></i>' +
        '<span>Employee ID: <b class="font-mono">' + cleanId + '</b> not found in Hold list. Only Hold staff can be selected for replacement.</span>' +
        '</div>';
      resultsBox.classList.remove('hidden');
      return;
    }

    var html = sliced.map(function (e) {
      var cleanItemStaffId = String(e.staff_id || '—').replace(/^[#\s]+/, '');

      return '<div onclick="window.HRMEmployeeEntry.selectReplacedEmployee(' + e.sl_no + ')" ' +
             'class="p-2.5 hover:bg-amber-500/10 dark:hover:bg-amber-900/30 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer transition-colors">' +
             '  <div class="flex items-center gap-2.5 min-w-0">' +
             '    <span class="font-mono font-bold text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">' + cleanItemStaffId + '</span>' +
             '    <div class="truncate">' +
             '      <p class="font-bold text-slate-900 dark:text-white text-xs truncate">' + (e.name || '—') + '</p>' +
             '      <p class="text-[10px] text-slate-500 dark:text-slate-400 truncate">' + (e.designation || 'Helper') + ' • ' + (e.section || 'General') + '</p>' +
             '    </div>' +
             '  </div>' +
             '  <div class="flex items-center gap-2 shrink-0">' +
             '    <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">Hold</span>' +
             '    <span class="text-[11px] font-mono text-slate-400">' + formatMoney(e.gross_salary) + '</span>' +
             '  </div>' +
             '</div>';
    }).join('');

    resultsBox.innerHTML = html;
    resultsBox.classList.remove('hidden');
  }

  function onSearchBlur(val) {
    setTimeout(function() {
      var resultsBox = document.getElementById('replaced-search-results');
      if (resultsBox) resultsBox.classList.add('hidden');

      var clean = (val || '').trim();
      if (!clean) return;
      var cleanId = clean.replace(/^#/, '').split(/[\s\-•]+/)[0].trim();
      var all = getAllEmployees();

      // Check if already replaced
      var alreadyRepStaff = getReplacedStaffRecord(cleanId);
      if (alreadyRepStaff) {
        clearReplacedEmployee();
        var searchInput = document.getElementById('entry-search-replaced-input');
        if (searchInput) searchInput.value = '';
        updateReplacementValidationWarning(cleanId);
        if (window.showHRToast) {
          window.showHRToast('❌ Employee ' + cleanId + ' has already been replaced! An ID can only be replaced once.');
        }
        return;
      }

      // Check if matches an inactive employee
      // Check if matches a non-hold employee (active or inactive)
      var nonHoldCheck = all.find(function(e) {
        var st = String(e.status || '').toLowerCase();
        return st !== 'hold' &&
               (String(e.staff_id).trim() === cleanId || String(e.name || '').trim().toLowerCase() === clean.toLowerCase());
      });
      if (nonHoldCheck) {
        clearReplacedEmployee();
        var searchInput = document.getElementById('entry-search-replaced-input');
        if (searchInput) searchInput.value = '';
        var cleanNonHoldId = String(nonHoldCheck.staff_id || '').replace(/^[#\s]+/, '');
        var stLabel = nonHoldCheck.status || 'Active';
        if (window.showToast) {
          window.showToast('⚠️ Employee ' + cleanNonHoldId + ' is ' + stLabel + '. Only Hold staff can be selected for replacement.', 'warning');
        } else if (window.showHRToast) {
          window.showHRToast('⚠️ Employee ' + cleanNonHoldId + ' is ' + stLabel + '. Only Hold staff can be selected for replacement.');
        }
        return;
      }

      var eligibleEmployees = all.filter(function(e) {
        var st = String(e.status || '').toLowerCase();
        return st === 'hold' && !getReplacedStaffRecord(e.staff_id);
      });

      var matched = eligibleEmployees.find(function(e) {
        return String(e.staff_id).trim() === cleanId || String(e.staff_id).trim() === clean;
      }) || eligibleEmployees.find(function(e) {
        return String(e.name).trim().toLowerCase() === clean.toLowerCase();
      });

      if (matched) {
        selectReplacedEmployee(matched.sl_no);
      } else {
        // Did not match any eligible staff: do NOT set partial or bogus replace_id!
        clearReplacedEmployee();
        var repIdInput = document.getElementById('entry-replace-id');
        if (repIdInput) repIdInput.value = '';
        var repNameInput = document.getElementById('entry-replace-name');
        if (repNameInput) repNameInput.value = '';
        updateReplacementValidationWarning(cleanId);
      }
    }, 250);
  }

  function selectReplacedEmployee(slNo) {
    var all = getAllEmployees();
    var emp = all.find(function (e) { return e.sl_no === slNo || String(e.staff_id) === String(slNo); });
    if (!emp) return;

    // Strict validation: Only Hold employees can be selected for replacement!
    var empStatus = String(emp.status || '').toLowerCase();
    if (empStatus !== 'hold') {
      alert('⚠️ Only Hold staff can be selected for replacement.\n\nEmployee ' + (emp.staff_id || '') + ' (' + (emp.name || '') + ') is currently ' + (emp.status || 'Active') + '.\nPlease select an eligible employee from the Hold list.');
      clearReplacedEmployee();
      return;
    }

    // Strict validation: An ID can only be replaced once!
    var alreadyRep = getReplacedStaffRecord(emp.staff_id);
    if (alreadyRep) {
      var cleanEmpStaffId = String(emp.staff_id).replace(/^[#\s]+/, '');
      var cleanAlreadyNewId = String(alreadyRep.new_id).replace(/^[#\s]+/, '');
      alert('❌ Employee ' + cleanEmpStaffId + ' (' + emp.name + ') has already been replaced by Employee ' + cleanAlreadyNewId + ' (' + (alreadyRep.new_name || '') + ')!\n\nAn ID can only be replaced once.');
      clearReplacedEmployee();
      return;
    }

    state.selectedReplacedEmp = emp;
    var resultsBox = document.getElementById('replaced-search-results');
    if (resultsBox) resultsBox.classList.add('hidden');

    var cleanEmpId = String(emp.staff_id || '').replace(/^[#\s]+/, '');
    var searchInput = document.getElementById('entry-search-replaced-input');
    if (searchInput) searchInput.value = cleanEmpId + ' - ' + emp.name;

    // Show Selected Card
    var card = document.getElementById('selected-replaced-card');
    if (card) {
      card.classList.remove('hidden');
      document.getElementById('sel-rep-id').textContent = cleanEmpId || '—';
      document.getElementById('sel-rep-name').textContent = emp.name || '—';
      document.getElementById('sel-rep-desig').textContent = emp.designation || 'Helper';
      document.getElementById('sel-rep-section').textContent = emp.section || 'General';
      document.getElementById('sel-rep-dept').textContent = emp.department || 'Production';
      document.getElementById('sel-rep-salary').textContent = formatMoney(emp.gross_salary);
      document.getElementById('sel-rep-doj').textContent = emp.doj || '—';
      var statusEl = document.getElementById('sel-rep-status');
      if (statusEl) statusEl.textContent = emp.status || 'Active';

      var badgeEl = document.getElementById('sel-rep-status-badge');
      if (badgeEl) {
        var st = String(emp.status || 'Active').toLowerCase();
        if (st === 'hold') {
          badgeEl.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40';
          badgeEl.textContent = 'Hold (Pending Replacement)';
        } else if (st === 'active') {
          badgeEl.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30';
          badgeEl.textContent = 'Active';
        } else {
          badgeEl.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600';
          badgeEl.textContent = 'Inactive';
        }
      }
    }

    // Set hidden fields
    var repIdInput = document.getElementById('entry-replace-id');
    if (repIdInput) repIdInput.value = emp.staff_id || '';
    var repNameInput = document.getElementById('entry-replace-name');
    if (repNameInput) repNameInput.value = emp.name || '';
    updateReplacementValidationWarning('');

    // Auto-populate new employee defaults to match the replaced post
    var desigInput = document.getElementById('entry-designation');
    if (desigInput && emp.designation) {
      var found = false;
      for (var i = 0; i < desigInput.options.length; i++) {
        if (desigInput.options[i].value.toLowerCase() === emp.designation.toLowerCase()) {
          desigInput.selectedIndex = i;
          found = true;
          break;
        }
      }
      if (!found) {
        var newOpt = document.createElement('option');
        newOpt.value = emp.designation;
        newOpt.textContent = emp.designation;
        desigInput.appendChild(newOpt);
        desigInput.value = emp.designation;
      }
    }

    var secSelect = document.getElementById('entry-section');
    if (secSelect && emp.section) secSelect.value = emp.section;

    var qualSelect = document.getElementById('entry-qualification');
    if (qualSelect && emp.qualification) {
      var normQual = emp.qualification.replace(/\./g, '').trim().toLowerCase();
      var foundQual = false;
      for (var q = 0; q < qualSelect.options.length; q++) {
        var optNorm = qualSelect.options[q].value.replace(/\./g, '').trim().toLowerCase();
        if (optNorm === normQual) {
          qualSelect.selectedIndex = q;
          foundQual = true;
          break;
        }
      }
      if (!foundQual) {
        var newQualOpt = document.createElement('option');
        newQualOpt.value = emp.qualification;
        newQualOpt.textContent = emp.qualification;
        qualSelect.appendChild(newQualOpt);
        qualSelect.value = emp.qualification;
      }
    }

    var deptSelect = document.getElementById('entry-department');
    if (deptSelect && emp.department) deptSelect.value = emp.department;

    var grossInput = document.getElementById('entry-gross-salary');
    if (grossInput && (!grossInput.value || grossInput.value === '0')) {
      grossInput.value = emp.gross_salary || 6500;
      onGrossSalaryChange(emp.gross_salary || 6500);
    }

    if (window.showHRToast) {
      window.showHRToast('Predecessor Employee ' + cleanEmpId + ' (' + emp.name + ') selected for replacement!');
    }
  }

  function clearReplacedEmployee() {
    state.selectedReplacedEmp = null;
    var card = document.getElementById('selected-replaced-card');
    if (card) card.classList.add('hidden');

    var searchInput = document.getElementById('entry-search-replaced-input');
    if (searchInput) searchInput.value = '';

    var repIdInput = document.getElementById('entry-replace-id');
    if (repIdInput) repIdInput.value = '';
    var repNameInput = document.getElementById('entry-replace-name');
    if (repNameInput) repNameInput.value = '';

    var resultsBox = document.getElementById('replaced-search-results');
    if (resultsBox) resultsBox.classList.add('hidden');

    updateReplacementValidationWarning('');
  }

  function onGrossSalaryChange(val) {
    var gross = parseFloat(val);
    var basicInput = document.getElementById('entry-basic-salary');
    if (basicInput) {
      // Standard MEP rule: Basic is 50% of Gross
      basicInput.value = (!val || isNaN(gross) || gross <= 0) ? '' : Math.round(gross / 2);
    }
  }

  function suggestNextStaffId() {
    var idInput = document.getElementById('entry-staff-id');
    if (!idInput) return;

    var all = getAllEmployees();
    var maxId = 0;
    all.forEach(function (e) {
      var num = parseInt(e.staff_id, 10);
      if (!isNaN(num) && num > maxId) maxId = num;
    });

    var nextId = maxId > 0 ? (maxId + 1) : 18251;
    idInput.placeholder = 'Employee ID (e.g. ' + nextId + ')';
    // User requested fields to stay completely blank initially and after refresh/save
  }

  // -------------------------------------------------------------
  // Handle Form Submission (Save New Employee & Replacement Record)
  // -------------------------------------------------------------
  function handleFormSubmit(event) {
    if (event) event.preventDefault();
    if (typeof window.isEditModeEnabled === 'function' && !window.isEditModeEnabled()) {
      if (typeof window.showHRToast === 'function') {
        window.showHRToast('🔒 Edit Mode is disabled. Cannot enter new employee data.', 'warning');
      } else {
        alert('Edit Mode is currently stopped/locked in Settings.');
      }
      return;
    }

    var staffId = (document.getElementById('entry-staff-id').value || '').trim();
    var name = (document.getElementById('entry-name').value || '').trim();

    if (!staffId || !name) {
      alert('Please enter both Staff ID and Full Name!');
      return;
    }

    if (state.isSubmitting) {
      console.warn('Form submission already in progress, ignoring duplicate trigger');
      return;
    }

    // Check for duplicate Staff ID before submitting!
    var cleanStaffId = staffId.replace(/^[#\s]+/, '').trim();
    var allEmps = getAllEmployees();
    var duplicateStaff = allEmps.find(function (e) {
      return String(e.staff_id || '').replace(/^[#\s]+/, '').trim() === cleanStaffId;
    });
    if (duplicateStaff) {
      alert('❌ Staff ID (' + cleanStaffId + ') already exists in the database!\n\n' +
            'Employee Name: ' + (duplicateStaff.name || 'Unknown') + '\n' +
            'Designation: ' + (duplicateStaff.designation || '—') + '\n' +
            'Section: ' + (duplicateStaff.section || '—') + '\n' +
            'Current Status: ' + (duplicateStaff.status || 'Active') + '\n\n' +
            'Duplicate Staff IDs are not permitted. Please use a unique Staff ID.');
      var sidInput = document.getElementById('entry-staff-id');
      if (sidInput) {
        sidInput.focus();
        sidInput.select();
      }
      return;
    }

    // Check if entered Staff ID is in the Replace ID list (already replaced staff)
    var repRecord = null;
    if (window.MEP_REPLACEMENT_MASTER && Array.isArray(window.MEP_REPLACEMENT_MASTER)) {
      repRecord = window.MEP_REPLACEMENT_MASTER.find(function (r) {
        return String(r.replace_id || '').replace(/^[#\s]+/, '').trim() === cleanStaffId;
      });
    }
    var entryStatus = document.getElementById('entry-status') ? document.getElementById('entry-status').value : 'Active';
    if (repRecord && (entryStatus === 'Active' || entryStatus === 'Hold')) {
      var newId = String(repRecord.new_id || '').replace(/^[#\s]+/, '').trim();
      var newName = repRecord.new_name || 'New Personnel';
      alert('⚠️ Staff ID (' + cleanStaffId + ') has already been replaced!\n\n' +
            '👉 Replacement appointee ' + newId + ' (' + newName + ') is currently registered.\n\n' +
            'This ID cannot be added under Active or Hold status.');
      var sidInputRep = document.getElementById('entry-staff-id');
      if (sidInputRep) {
        sidInputRep.focus();
        sidInputRep.select();
      }
      return;
    }

    var isReplacement = state.hiringType === 'replacement';
    var rawReplaceId = (document.getElementById('entry-replace-id').value || '').trim();
    var replaceName = (document.getElementById('entry-replace-name').value || '').trim();
    var replaceReason = document.getElementById('entry-replace-reason') ? document.getElementById('entry-replace-reason').value : '';
    var replaceDate = document.getElementById('entry-replace-date') ? document.getElementById('entry-replace-date').value : '';
    var searchInput = document.getElementById('entry-search-replaced-input');
    var searchVal = searchInput ? searchInput.value.trim() : '';

    var replaceId = rawReplaceId;
    if (isReplacement) {
      var all = getAllEmployees();
      var targetSearch = (replaceId || searchVal || '').replace(/^[#\s]+/, '').split(/[\s\-•]+/)[0].trim();
      var matched = null;
      if (targetSearch) {
        matched = all.find(function (e) {
          return String(e.staff_id).replace(/^[#\s]+/, '').trim() === targetSearch;
        }) || all.find(function (e) {
          return String(e.name).trim().toLowerCase() === searchVal.toLowerCase();
        });
      }

      if (!matched) {
        alert('❌ To register a replacement, please select an existing staff member in the database.\n\nNo matching record found for "' + (targetSearch || searchVal || 'None') + '".');
        if (searchInput) {
          searchInput.focus();
          searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          searchInput.classList.add('ring-4', 'ring-rose-500/50', 'border-rose-500');
          setTimeout(function () {
            searchInput.classList.remove('ring-4', 'ring-rose-500/50', 'border-rose-500');
          }, 3000);
        }
        return;
      }

      if (String(matched.status || '').toLowerCase() !== 'hold') {
        alert('❌ Only Hold staff can be selected for replacement.\n\nEmployee ' + (matched.staff_id || '') + ' (' + matched.name + ') is currently ' + (matched.status || 'Active') + '.\nPlease select an eligible employee from the Hold list.');
        if (searchInput) {
          searchInput.focus();
          searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      // Enforce guaranteed canonical staff ID and full employee name
      replaceId = String(matched.staff_id).replace(/^[#\s]+/, '').trim();
      replaceName = String(matched.name).trim();
      if (document.getElementById('entry-replace-id')) {
        document.getElementById('entry-replace-id').value = replaceId;
      }
      if (document.getElementById('entry-replace-name')) {
        document.getElementById('entry-replace-name').value = replaceName;
      }
    }

    // Strict validation: An ID can only be replaced once, and an ID can only replace once!
    if (isReplacement && replaceId) {
      var cleanRep = String(replaceId).replace(/^[#\s]+/, '').trim();
      var alreadyReplaced = getReplacedStaffRecord(cleanRep);
      var isSameNew = alreadyReplaced && String(alreadyReplaced.new_id || '').replace(/^[#\s]+/, '').trim() === cleanStaffId;
      if (alreadyReplaced && !isSameNew) {
        var prevNewId = String(alreadyReplaced.new_id || '').replace(/^[#\s]+/, '').trim();
        var prevNewName = alreadyReplaced.new_name || 'Appointed Personnel';
        alert('❌ Staff ID ' + cleanRep + ' has already been replaced!\n\n' +
              '👉 Replacement appointee ' + prevNewId + ' (' + prevNewName + ') is already in place.\n\n' +
              'Each personnel ID may only be replaced once.');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }
    }

    if (isReplacement && cleanStaffId) {
      var alreadyAppointed = getAppointedReplacementRecord(cleanStaffId);
      var isSameRep = alreadyAppointed && String(alreadyAppointed.replace_id || '').replace(/^[#\s]+/, '').trim() === replaceId;
      if (alreadyAppointed && !isSameRep) {
        var prevRepId = String(alreadyAppointed.replace_id || '').replace(/^[#\s]+/, '').trim();
        var prevRepName = alreadyAppointed.replace_name || '';
        alert('❌ New Staff ID ' + cleanStaffId + ' is already assigned as replacement for another staff member!\n\n' +
              '👉 This ID is already replacing staff ' + prevRepId + (prevRepName ? ' (' + prevRepName + ')' : '') + '.\n\n' +
              'A new ID cannot be assigned as a replacement for multiple staff.');
        var sidInputApp = document.getElementById('entry-staff-id');
        if (sidInputApp) {
          sidInputApp.focus();
          sidInputApp.select();
        }
        return;
      }
    }

    var desigVal = (document.getElementById('entry-designation').value || '').trim();
    if (!desigVal) {
      alert('Please select a Designation!');
      var desigEl = document.getElementById('entry-designation');
      if (desigEl) desigEl.focus();
      return;
    }

    var secVal = (document.getElementById('entry-section').value || '').trim();
    if (!secVal) {
      alert('Please select a Section / Factory Line!');
      var secEl = document.getElementById('entry-section');
      if (secEl) secEl.focus();
      return;
    }

    var grossVal = (document.getElementById('entry-gross-salary').value || '').trim();
    var gross = parseFloat(grossVal) || 0;
    if (!grossVal || gross <= 0) {
      alert('Please enter a valid Gross Salary!');
      var grossEl = document.getElementById('entry-gross-salary');
      if (grossEl) grossEl.focus();
      return;
    }

    var basic = parseFloat(document.getElementById('entry-basic-salary').value) || (gross / 2);

    var rawDoj = (document.getElementById('entry-doj') ? document.getElementById('entry-doj').value : '') || new Date().toISOString().split('T')[0];
    var rawDob = document.getElementById('entry-dob') ? document.getElementById('entry-dob').value : '';
    var rawRepDate = document.getElementById('entry-replace-date') ? document.getElementById('entry-replace-date').value : '';

    var payload = {
      sl_no: null,
      staff_id: staffId,
      name: name,
      status: document.getElementById('entry-status') ? document.getElementById('entry-status').value : 'Active',
      designation: desigVal,
      qualification: (document.getElementById('entry-qualification').value || '').trim(),
      department: (document.getElementById('entry-department').value || 'Production').trim(),
      section: secVal,
      doj: fromDateInputValue(rawDoj),
      gross_salary: gross,
      basic_salary: basic,
      dob: fromDateInputValue(rawDob),
      contact_number: (document.getElementById('entry-contact').value || '').trim(),
      nid: (document.getElementById('entry-nid').value || '').trim(),
      bank_rocket_acc: (document.getElementById('entry-bank').value || '').trim(),
      blood_group: (document.getElementById('entry-blood').value || '').trim(),
      address: (document.getElementById('entry-address').value || '').trim(),
      gender: (document.getElementById('entry-gender').value || '').trim(),
      reference_id: (document.getElementById('entry-ref-id').value || '').trim(),
      replace_id: isReplacement ? replaceId : '',
      replace_name: isReplacement ? replaceName : '',
      replace_reason: isReplacement ? replaceReason : '',
      replace_date: isReplacement ? fromDateInputValue(rawRepDate) : '',
      hiring_type: isReplacement ? 'Replacement' : 'New Direct'
    };

    state.isSubmitting = true;
    var btnSubmit = document.getElementById('entry-submit-btn');
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.classList.add('opacity-50', 'pointer-events-none');
      btnSubmit.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Saving online...';
    }

    function saveViaServerApi() {
      fetch('/api/hrm/employee/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok || (data && data.success === false)) {
              var errMsg = (data && data.error) ? data.error : ('Server error: Status ' + res.status);
              throw new Error(errMsg);
            }
            return data;
          });
        })
        .then(function (data) {
          var savedEmp = (data && data.employee) ? data.employee : payload;
          handlePostSaveSuccess(savedEmp, isReplacement, data);
        })
        .catch(function (err) {
          console.warn('API error saving employee:', err);
          state.isSubmitting = false;
          if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.classList.remove('opacity-50', 'pointer-events-none');
            btnSubmit.innerHTML = '<i class="ph-bold ph-floppy-disk text-base"></i> <span>Save Personnel</span>';
          }
          alert('Could not save personnel:\n\n' + (err.message || err));
        });
    }

    // Direct Cloud Realtime Write with Firebase
    if (window.HRMFirebase && typeof window.HRMFirebase.saveEmployee === 'function') {
      window.HRMFirebase.saveEmployee(payload)
        .then(function (savedEmp) {
          state.isSubmitting = false;
          handlePostSaveSuccess(savedEmp, isReplacement, { success: true, employee: savedEmp });
          if (typeof window.showHRToast === 'function') {
            window.showHRToast('☁️ [Firebase Cloud] Employee ID ' + savedEmp.staff_id + ' successfully saved and synced online!', 'success');
          }
        })
        .catch(function (fbErr) {
          console.warn('[HRM_FIREBASE] Cloud save error, falling back to server API:', fbErr);
          saveViaServerApi();
        });
    } else {
      saveViaServerApi();
    }
  }

  function handlePostSaveSuccess(savedEmp, isReplacement, responseData) {
    try {
      // 1. Update in-memory database across ALL active caches
      var all = getAllEmployees();
      if (!savedEmp.sl_no) {
        var maxSl = all.reduce(function (max, e) { return Math.max(max, e.sl_no || 0); }, 0);
        savedEmp.sl_no = maxSl + 1;
      }

      var allSources = [all];
      if (window.HRMManpower && typeof window.HRMManpower.getAllEmployees === 'function') {
        allSources.push(window.HRMManpower.getAllEmployees());
      }
      if (window.MEP_MANPOWER_DATABASE && Array.isArray(window.MEP_MANPOWER_DATABASE.employees)) {
        allSources.push(window.MEP_MANPOWER_DATABASE.employees);
      }
      if (window.HRM_MANPOWER_CACHE && Array.isArray(window.HRM_MANPOWER_CACHE.employees)) {
        allSources.push(window.HRM_MANPOWER_CACHE.employees);
      }

      var cleanSavedSid = String(savedEmp.staff_id || '').replace(/^[#\s]+/, '').trim();
      allSources.forEach(function (list) {
        if (!Array.isArray(list)) return;
        var existingIdx = list.findIndex(function (e) {
          return String(e.staff_id || '').replace(/^[#\s]+/, '').trim() === cleanSavedSid;
        });
        if (existingIdx >= 0) {
          list[existingIdx] = Object.assign({}, list[existingIdx], savedEmp);
        } else {
          list.unshift(savedEmp);
        }
      });

      if (responseData && responseData.metadata) {
        if (window.MEP_MANPOWER_DATABASE) window.MEP_MANPOWER_DATABASE.metadata = responseData.metadata;
        if (window.HRM_MANPOWER_CACHE) window.HRM_MANPOWER_CACHE.metadata = responseData.metadata;
      }

      // If replacement was made, also update the replaced employee to Inactive (automatically goes to Inactive list)
      var cleanRepId = String(savedEmp.replace_id || '').replace(/^#/, '').split(/[\s\-•]+/)[0].trim();
      var repName = savedEmp.replace_name || '';
      if (isReplacement && cleanRepId) {
        var sources = [all];
        if (window.HRMManpower && typeof window.HRMManpower.getAllEmployees === 'function') {
          sources.push(window.HRMManpower.getAllEmployees());
        }
        if (window.MEP_MANPOWER_DATABASE && Array.isArray(window.MEP_MANPOWER_DATABASE.employees)) {
          sources.push(window.MEP_MANPOWER_DATABASE.employees);
        }
        if (window.HRM_MANPOWER_CACHE && Array.isArray(window.HRM_MANPOWER_CACHE.employees)) {
          sources.push(window.HRM_MANPOWER_CACHE.employees);
        }

        sources.forEach(function (list) {
          if (!Array.isArray(list)) return;
          var found = list.find(function (e) {
            return String(e.staff_id || '').replace(/^#/, '').trim() === cleanRepId;
          });
          if (!found && repName) {
            found = list.find(function (e) {
              return String(e.name || '').trim().toLowerCase() === repName.trim().toLowerCase();
            });
          }
          if (found) {
            found.status = 'Inactive';
            found.replace_id = String(savedEmp.staff_id || '').replace(/^#/, '').trim();
            found.remarks = 'Replaced by #' + savedEmp.staff_id + ' (' + savedEmp.name + ') on ' + (savedEmp.replace_date || savedEmp.doj || '');
          }
        });

        // Add or update window.MEP_REPLACEMENT_MASTER immediately
        if (!window.MEP_REPLACEMENT_MASTER) window.MEP_REPLACEMENT_MASTER = [];
        var alreadyInMaster = window.MEP_REPLACEMENT_MASTER.some(function (r) {
          var rId = String(r.replace_id || '').replace(/^[#\s]+/, '').trim();
          var nId = String(r.new_id || '').replace(/^[#\s]+/, '').trim();
          return (rId && rId === cleanRepId) || (nId && nId === String(savedEmp.staff_id || '').replace(/^[#\s]+/, '').trim());
        });
        if (!alreadyInMaster) {
          var repItem = {
            sl: window.MEP_REPLACEMENT_MASTER.length + 1,
            replace_id: cleanRepId,
            replace_name: repName || ('Former Staff #' + cleanRepId),
            replace_designation: savedEmp.designation || 'Helper',
            replace_section: savedEmp.section || 'Fan Assemble Line',
            replace_doj: savedEmp.replace_date || savedEmp.doj || '',
            new_sl: String(window.MEP_REPLACEMENT_MASTER.length + 1),
            new_id: String(savedEmp.staff_id || ''),
            new_name: savedEmp.name || '',
            new_designation: savedEmp.designation || 'Helper',
            new_section: savedEmp.section || 'Fan Assemble Line',
            new_doj: savedEmp.doj || '',
            remarks: savedEmp.replace_reason || 'Replacement Appointed'
          };
          window.MEP_REPLACEMENT_MASTER.unshift(repItem);
        }
        window.MEP_REPLACEMENT_MASTER = deduplicateReplacementRecords(window.MEP_REPLACEMENT_MASTER);
        renderHoldCandidatesShelf();
      }
    } catch (e1) {
      console.warn('Error updating local employee state:', e1);
    }

    // 2. Re-sync with HRMManpower (recalculates Active, Hold, Inactive counts and updates table)
    try {
      if (window.HRMManpower) {
        if (responseData && responseData.metadata && typeof window.HRMManpower.updateMetadata === 'function') {
          window.HRMManpower.updateMetadata(responseData.metadata);
        }
        if (typeof window.HRMManpower.refreshAll === 'function') {
          window.HRMManpower.refreshAll();
        } else {
          if (typeof window.HRMManpower.updateTopKPIs === 'function') window.HRMManpower.updateTopKPIs();
          if (typeof window.HRMManpower.renderTable === 'function') window.HRMManpower.renderTable();
        }
      }
    } catch (e2) {
      console.warn('Error refreshing HRMManpower:', e2);
    }

    // 3. Re-render Hold candidates shelf
    try {
      renderHoldCandidatesShelf();
    } catch (e3) {
      console.warn('Error rendering hold shelf:', e3);
    }

    // 4. Update replacement list from fresh state
    try {
      buildReplacementList(false);
    } catch (e4) {
      console.warn('Error rebuilding replacement list:', e4);
    }

        // Cross-module reactive event propagation (Zero-refresh synchronization)
    try {
      if (window.HRMEventBus && typeof window.HRMEventBus.emit === 'function') {
        window.HRMEventBus.emit('EMPLOYEE_MUTATED', { emp: savedEmp, isReplacement: isReplacement, type: 'new_entry' });
      }
      if (window.HRMDashboard && typeof window.HRMDashboard.render === 'function') {
        window.HRMDashboard.render();
      }
      if (window.HRMManpowerSummary && typeof window.HRMManpowerSummary.render === 'function') {
        window.HRMManpowerSummary.render();
      }
      if (window.HRMPermanentEmployees && typeof window.HRMPermanentEmployees.init === 'function') {
        window.HRMPermanentEmployees.init();
      }
      if (window.HRMSectionSalary && typeof window.HRMSectionSalary.render === 'function') {
        window.HRMSectionSalary.render();
      }
      if (window.HRMIncrement && typeof window.HRMIncrement.init === 'function') {
        window.HRMIncrement.init();
      }
      if (window.HRMTransfer && typeof window.HRMTransfer.render === 'function') {
        window.HRMTransfer.render();
      }
    } catch (eCross) {
      console.warn('Error broadcasting cross-module updates:', eCross);
    }

// 5. Toast notification
    var msg = 'Employee ID ' + savedEmp.staff_id + ' (' + savedEmp.name + ') successfully registered in database!';
    if (isReplacement && cleanRepId) {
      msg = '✅ Replacement successful! New staff ' + savedEmp.staff_id + ' (' + savedEmp.name + ') registered, and predecessor ' + cleanRepId + (repName ? ' (' + repName + ')' : '') + ' automatically moved to Inactive status.';
    }
    if (window.showHRToast) window.showHRToast(msg);

    // 6. Reset form for next entry (becomes completely blank)
    resetEntryForm();

    // Stay on the entry form and set focus on Staff ID for seamless next entry
    var sidInput = document.getElementById('entry-staff-id');
    if (sidInput) {
      sidInput.focus();
    }
  }

  function resetEntryForm() {
    state.isSubmitting = false;
    var btnSubmit = document.getElementById('entry-submit-btn');
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.classList.remove('opacity-50', 'pointer-events-none');
      btnSubmit.innerHTML = '<i class="ph-bold ph-floppy-disk text-base"></i> <span>Save Personnel</span>';
    }
    var form = document.getElementById('employee-entry-form');
    if (form) form.reset();
    clearReplacedEmployee();

    // Blank out all text inputs, date pickers, number fields and reset dropdowns to index 0
    var idsToBlank = [
      'entry-staff-id', 'entry-name', 'entry-designation', 'entry-qualification',
      'entry-department', 'entry-section', 'entry-doj', 'entry-gross-salary',
      'entry-basic-salary', 'entry-gender', 'entry-blood', 'entry-dob',
      'entry-contact', 'entry-nid', 'entry-bank', 'entry-address', 'entry-ref-id',
      'entry-replace-id', 'entry-replace-name', 'entry-replace-date', 'entry-replace-reason'
    ];
    idsToBlank.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.value = '';
        if (el.tagName === 'SELECT') {
          el.selectedIndex = 0;
        }
      }
    });

    var statusEl = document.getElementById('entry-status');
    if (statusEl) statusEl.value = 'Active';

    suggestNextStaffId();
    renderHoldCandidatesShelf();
  }

  // -------------------------------------------------------------
  // Replacement Report KPIs & Rendering
  // -------------------------------------------------------------
  function renderReplacementKPIs() {
    var list = state.replacementList || [];
    var total = list.length;
    var appointedCount = 0;
    var pendingCount = 0;
    var sectionCounts = {};

    list.forEach(function (r) {
      var isNumericNew = r.new_id && !isNaN(parseInt(r.new_id, 10)) && parseInt(r.new_id, 10) > 0;
      if (isNumericNew) {
        appointedCount++;
      } else {
        pendingCount++;
      }

      var sec = (r.replace_section && r.replace_section !== 'Blank') ? r.replace_section : ((r.new_section && r.new_section !== 'Blank') ? r.new_section : 'General');
      sectionCounts[sec] = (sectionCounts[sec] || 0) + 1;
    });

    var topSec = 'Fan Assemble Line';
    var topSecCount = 0;
    Object.keys(sectionCounts).forEach(function (sec) {
      if (sectionCounts[sec] > topSecCount) {
        topSecCount = sectionCounts[sec];
        topSec = sec;
      }
    });

    var kpiTotal = document.getElementById('rep-kpi-total');
    if (kpiTotal) kpiTotal.textContent = total;

    var kpiActive = document.getElementById('rep-kpi-active');
    if (kpiActive) kpiActive.textContent = appointedCount;

    var kpiInactive = document.getElementById('rep-kpi-inactive');
    if (kpiInactive) kpiInactive.textContent = pendingCount;

    var kpiSalary = document.getElementById('rep-kpi-salary');
    if (kpiSalary) kpiSalary.textContent = appointedCount + ' / ' + total + ' Staff';

    var kpiTopSec = document.getElementById('rep-kpi-top-section');
    if (kpiTopSec) kpiTopSec.textContent = topSec.replace('Fan ', '') + ' (' + topSecCount + ')';
  }

  function parseDojToTimestamp(dojStr) {
    if (!dojStr || dojStr === 'Blank' || dojStr === '0-Jan-00' || dojStr === '—' || dojStr === '-') return -1;
    var str = String(dojStr).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      var d = new Date(str + 'T00:00:00');
      return isNaN(d.getTime()) ? -1 : d.getTime();
    }
    var m = str.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ](\d{2,4})$/);
    if (m) {
      var day = parseInt(m[1], 10);
      var monthStr = m[2].toLowerCase();
      var year = parseInt(m[3], 10);
      if (year < 100) {
        year = year >= 50 ? (1900 + year) : (2000 + year);
      }
      var months = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
      };
      var month = months[monthStr];
      if (month !== undefined) {
        return new Date(year, month, day).getTime();
      }
    }
    var t = Date.parse(str);
    return isNaN(t) ? -1 : t;
  }

  function parseNumericId(idStr) {
    if (!idStr) return -1;
    var clean = String(idStr).replace(/[^0-9]/g, '');
    var n = parseInt(clean, 10);
    return isNaN(n) ? -1 : n;
  }

  function applyReplacementFilters() {
    var list = state.replacementList || [];
    var q = (state.filters.search || '').trim().toLowerCase();
    var fSec = state.filters.section;
    var fStatus = state.filters.status;
    var fReason = state.filters.reason;

    var filtered = list.filter(function (r) {
      if (q) {
        var matchRepId = String(r.replace_id || '').toLowerCase().indexOf(q) !== -1;
        var matchRepName = String(r.replace_name || '').toLowerCase().indexOf(q) !== -1;
        var matchNewId = String(r.new_id || '').toLowerCase().indexOf(q) !== -1;
        var matchNewName = String(r.new_name || '').toLowerCase().indexOf(q) !== -1;
        var matchRepSec = String(r.replace_section || '').toLowerCase().indexOf(q) !== -1;
        var matchNewSec = String(r.new_section || '').toLowerCase().indexOf(q) !== -1;
        var matchRepDesig = String(r.replace_designation || '').toLowerCase().indexOf(q) !== -1;
        var matchNewDesig = String(r.new_designation || '').toLowerCase().indexOf(q) !== -1;
        var matchRemarks = String(r.remarks || '').toLowerCase().indexOf(q) !== -1;

        if (!matchRepId && !matchRepName && !matchNewId && !matchNewName && !matchRepSec && !matchNewSec && !matchRepDesig && !matchNewDesig && !matchRemarks) {
          return false;
        }
      }

      if (fSec !== 'ALL') {
        var sec1 = String(r.replace_section || '').toLowerCase();
        var sec2 = String(r.new_section || '').toLowerCase();
        var targetSec = fSec.toLowerCase();
        if (sec1 !== targetSec && sec2 !== targetSec) return false;
      }

      if (fStatus !== 'ALL') {
        var isNumericNew = r.new_id && !isNaN(parseInt(r.new_id, 10)) && parseInt(r.new_id, 10) > 0;
        var rStatus = String(r.status || '').toLowerCase();
        if (fStatus === 'Active') {
          if (!isNumericNew || rStatus === 'hold') return false;
        } else if (fStatus === 'Hold') {
          if (rStatus !== 'hold') {
            var allEmps = getAllEmployees();
            var repStaff = allEmps.find(function(e) {
              return String(e.staff_id) === String(r.replace_id) || String(e.staff_id) === String(r.new_id);
            });
            if (!repStaff || String(repStaff.status || '').toLowerCase() !== 'hold') return false;
          }
        } else if (fStatus === 'Inactive') {
          if (isNumericNew && rStatus !== 'inactive') return false;
        }
      }

      if (fReason !== 'ALL') {
        var reasonText = (String(r.remarks || '') + ' ' + String(r.new_id || '')).toLowerCase();
        if (reasonText.indexOf(fReason.toLowerCase()) === -1) return false;
      }

      return true;
    });

    // User Requirement: akane sobses joining ID and joining hisaba aling hoba, sob ses ta uopra thakba
    // Sort descending: Latest joining date (new_doj) & highest ID (new_id) at top
    filtered.sort(function (a, b) {
      var tA = parseDojToTimestamp(a.new_doj);
      var tB = parseDojToTimestamp(b.new_doj);
      if (tA !== tB) {
        return tB - tA;
      }
      var idA = parseNumericId(a.new_id);
      var idB = parseNumericId(b.new_id);
      if (idA !== idB) {
        return idB - idA;
      }
      var rA = parseDojToTimestamp(a.replace_doj);
      var rB = parseDojToTimestamp(b.replace_doj);
      if (rA !== rB) {
        return rB - rA;
      }
      var ridA = parseNumericId(a.replace_id);
      var ridB = parseNumericId(b.replace_id);
      return ridB - ridA;
    });

    state.filteredReplacements = filtered;
    state.filters.page = 1;
  }

  function renderReplacementTable() {
    var tbody = document.getElementById('replacement-table-body');
    if (!tbody) return;

    var filtered = state.filteredReplacements || [];
    var totalFiltered = filtered.length;

    var countBadge = document.getElementById('rep-table-filtered-count');
    if (countBadge) countBadge.textContent = totalFiltered + ' of ' + (state.replacementList ? state.replacementList.length : 0) + ' Records';

    if (totalFiltered === 0) {
      tbody.innerHTML = '<tr><td colspan="14" class="py-12 text-center text-slate-400 font-medium text-xs">' +
                        '<div class="flex flex-col items-center justify-center gap-2">' +
                        '  <i class="ph-bold ph-magnifying-glass text-2xl text-slate-300"></i>' +
                        '  <span>No replacement records match the filter criteria</span>' +
                        '</div></td></tr>';
      renderPagination(0);
      return;
    }

    var perPage = state.filters.per_page;
    var page = state.filters.page;
    var startIdx = (perPage >= 999999) ? 0 : (page - 1) * perPage;
    var pageItems = (perPage >= 999999) ? filtered : filtered.slice(startIdx, startIdx + perPage);

    var html = pageItems.map(function (item, idx) {
      var slDisplay = startIdx + idx + 1;
      var newSlDisplay = startIdx + idx + 1;

      // REPLACED EMPLOYEE DATA (No '#' prefix)
      var rawRepId = (item.replace_id || '').trim();
      var cleanRepId = rawRepId.replace(/^[#\s]+/, '').trim();
      var repName = (item.replace_name || '').trim();
      var repDesig = (item.replace_designation || '').trim();
      var repSec = (item.replace_section || '').trim();
      var repDoj = (item.replace_doj || '').trim();

      var repSecStyle = getSectionStyle(repSec);

      var repIdHtml = (cleanRepId && cleanRepId !== 'Blank')
        ? '<span class="rep-id-glass inline-flex items-center justify-center font-mono font-black text-[11px] px-2.5 py-1 rounded-lg text-purple-700 dark:text-purple-300 cursor-pointer shadow-2xs" onclick="window.HRMEmployeeEntry.viewReplacedDossier(\'' + cleanRepId + '\')" title="Click to view staff dossier">' + cleanRepId + '</span>'
        : '<span class="text-slate-400 font-mono text-xs">—</span>';

      var repNameHtml = (repName && repName !== 'Blank')
        ? '<span class="font-bold text-xs text-slate-900 dark:text-slate-100 truncate block max-w-[180px]" title="' + repName + '">' + repName + '</span>'
        : '<span class="text-slate-400 italic text-xs">—</span>';

      var repDesigHtml = (repDesig && repDesig !== 'Blank')
        ? '<span class="font-medium text-xs text-purple-900/80 dark:text-purple-200/80 truncate block max-w-[140px]" title="' + repDesig + '">' + repDesig + '</span>'
        : '<span class="text-slate-400 text-xs">—</span>';

      var repSecHtml = (repSec && repSec !== 'Blank')
        ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ' + repSecStyle.bg + ' truncate max-w-[155px]"><i class="ph-bold ' + repSecStyle.icon + ' text-xs shrink-0"></i><span class="truncate">' + repSec + '</span></span>'
        : '<span class="text-slate-400 text-xs">—</span>';

      var repDojCompact = formatCompactDOJ(repDoj);
      var repDojHtml = (repDojCompact && repDojCompact !== '—')
        ? '<span class="rep-doj-replaced shadow-2xs" title="Joining Date: ' + repDoj + '">' + repDojCompact + '</span>'
        : '<span class="text-slate-400 text-xs font-mono">—</span>';

      // NEW EMPLOYEE DATA (No '#' prefix)
      var rawNewId = (item.new_id || '').trim();
      var cleanNewId = rawNewId.replace(/^[#\s]+/, '').trim();
      var newName = (item.new_name || '').trim();
      var newDesig = (item.new_designation || '').trim();
      var newSec = (item.new_section || '').trim();
      var newDoj = (item.new_doj || '').trim();
      var rawRemarks = (item.remarks || '').trim();

      var isNumericNewId = cleanNewId && !isNaN(parseInt(cleanNewId, 10)) && parseInt(cleanNewId, 10) > 0;
      var newSecStyle = getSectionStyle(newSec);

      var newIdHtml = '';
      if (isNumericNewId) {
        newIdHtml = '<span class="new-id-glass inline-flex items-center justify-center font-mono font-black text-[11px] px-2.5 py-1 rounded-lg text-emerald-700 dark:text-emerald-300 cursor-pointer shadow-2xs" onclick="window.HRMEmployeeEntry.viewReplacedDossier(\'' + cleanNewId + '\')" title="Click to view new employee dossier">' + cleanNewId + '</span>';
      } else if (cleanNewId && cleanNewId !== 'Blank') {
        newIdHtml = '<span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 whitespace-nowrap">' + cleanNewId + '</span>';
      } else {
        newIdHtml = '<span class="text-slate-400 font-mono text-xs">—</span>';
      }

      var newNameHtml = '';
      if (newName && newName !== 'Blank') {
        newNameHtml = '<span class="font-bold text-xs text-slate-900 dark:text-white truncate block max-w-[180px]" title="' + newName + '">' + newName + '</span>';
      } else if (isNumericNewId) {
        newNameHtml = '<span class="text-emerald-700 dark:text-emerald-400 text-xs font-semibold">New Appointee</span>';
      } else {
        newNameHtml = '<span class="text-slate-400 italic text-[11px]">Open Vacancy</span>';
      }

      var newDesigHtml = (newDesig && newDesig !== 'Blank')
        ? '<span class="font-medium text-xs text-emerald-900/80 dark:text-emerald-200/80 truncate block max-w-[140px]" title="' + newDesig + '">' + newDesig + '</span>'
        : '<span class="text-slate-400 text-xs">—</span>';

      var newSecHtml = (newSec && newSec !== 'Blank')
        ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ' + newSecStyle.bg + ' truncate max-w-[155px]"><i class="ph-bold ' + newSecStyle.icon + ' text-xs shrink-0"></i><span class="truncate">' + newSec + '</span></span>'
        : '<span class="text-slate-400 text-xs">—</span>';

      var newDojCompact = formatCompactDOJ(newDoj);
      var newDojHtml = (newDojCompact && newDojCompact !== '—')
        ? '<span class="rep-doj-new shadow-2xs" title="Joining Date: ' + newDoj + '">' + newDojCompact + '</span>'
        : '<span class="text-slate-400 text-xs font-mono">—</span>';

      // Glossy remarks formatting
      var remarksHtml = formatGlossyRemark(rawRemarks, isNumericNewId, cleanNewId);

      return '<tr class="rep-table-row transition-colors divide-x divide-slate-100/80 dark:divide-slate-800/60">' +
             '  <!-- Group 1: Replaced Employee (Royal Amethyst Category - 6 columns) -->' +
             '  <td class="px-2 py-2 text-center font-mono text-[11px] text-purple-700/70 dark:text-purple-300/70 rep-cell-replaced">' + slDisplay + '</td>' +
             '  <td class="px-2.5 py-2 text-center rep-cell-replaced">' + repIdHtml + '</td>' +
             '  <td class="px-3 py-2 rep-cell-replaced">' + repNameHtml + '</td>' +
             '  <td class="px-2.5 py-2 rep-cell-replaced">' + repDesigHtml + '</td>' +
             '  <td class="px-2.5 py-2 rep-cell-replaced">' + repSecHtml + '</td>' +
             '  <td class="px-2.5 py-2 text-center rep-cell-replaced border-r-2 border-purple-500/50 dark:border-purple-400/50">' + repDojHtml + '</td>' +

             '  <!-- Group 2: New Employee (Emerald Jade Category - 7 columns) -->' +
             '  <td class="px-2 py-2 text-center font-mono text-[11px] text-emerald-700/70 dark:text-emerald-300/70 rep-cell-new">' + newSlDisplay + '</td>' +
             '  <td class="px-2.5 py-2 text-center rep-cell-new">' + newIdHtml + '</td>' +
             '  <td class="px-3 py-2 rep-cell-new">' + newNameHtml + '</td>' +
             '  <td class="px-2.5 py-2 rep-cell-new">' + newDesigHtml + '</td>' +
             '  <td class="px-2.5 py-2 rep-cell-new">' + newSecHtml + '</td>' +
             '  <td class="px-2.5 py-2 text-center rep-cell-new">' + newDojHtml + '</td>' +
             '  <td class="px-3 py-2 rep-cell-new">' + remarksHtml + '</td>' +

             '  <!-- Action / Delete Column: Premium Glowing Red Liquid Glass Icon Button -->' +
             '  <td class="px-2 py-2 text-center bg-slate-50/50 dark:bg-slate-900/50 border-l border-slate-200/60 dark:border-slate-800/60">' +
             '    <button type="button" onclick="window.HRMEmployeeEntry.deleteReplacementRecord(' + (item.sl || 0) + ', \'' + cleanRepId + '\', \'' + cleanNewId + '\')" class="mep-delete-btn rep-delete-glass-btn inline-flex items-center justify-center w-8 h-8 rounded-xl transition-all cursor-pointer group shadow-xs" title="Delete Replacement Record">' +
             '      <i class="ph-bold ph-trash text-sm group-hover:scale-115 transition-transform duration-200"></i>' +
             '    </button>' +
             '  </td>' +
             '</tr>';
    }).join('');

    tbody.innerHTML = html;
    renderPagination(totalFiltered);
  }

  function deleteReplacementRecord(sl, repId, newId) {
    if (typeof window.isEditModeEnabled === 'function' && !window.isEditModeEnabled()) {
      if (typeof window.showHRToast === 'function') {
        window.showHRToast('🔒 Edit Mode is disabled. Enable Edit Mode in Settings to delete replacement records.', 'warning');
      } else {
        alert('Edit Mode is currently disabled in Settings.');
      }
      return;
    }

    var cleanRepId = String(repId || '').replace(/^[#\s]+/, '').trim();
    var cleanNewId = String(newId || '').replace(/^[#\s]+/, '').trim();

    var confirmMsg = '⚠️ Are you sure you want to delete this replacement record?\n\n' +
      '• Replaced Staff ID: ' + (cleanRepId || '—') + '\n' +
      '• New Appointee ID: ' + (cleanNewId || '—') + '\n\n' +
      'This will remove the replacement record and restore employee ID ' + cleanRepId + ' to Active status.';

    if (!confirm(confirmMsg)) return;

    function performLocalReplacementDelete() {
      state.replacementList = state.replacementList.filter(function (r) {
        if (sl && r.sl === sl) return false;
        if (cleanRepId && cleanNewId && String(r.replace_id).replace(/^#/, '').trim() === cleanRepId &&
            String(r.new_id).replace(/^#/, '').trim() === cleanNewId) return false;
        return true;
      });
      window.MEP_REPLACEMENT_MASTER = state.replacementList.slice();

      applyReplacementFilters();
      renderReplacementKPIs();
      renderReplacementTable();
      updateBadges(state.replacementList.length);

      // Synchronize in-memory employee states across ALL active caches
      var delSources = [];
      if (window.HRMManpower && window.HRMManpower.state && Array.isArray(window.HRMManpower.state.allEmployees)) {
        delSources.push(window.HRMManpower.state.allEmployees);
      }
      if (window.MEP_MANPOWER_DATABASE && Array.isArray(window.MEP_MANPOWER_DATABASE.employees)) {
        delSources.push(window.MEP_MANPOWER_DATABASE.employees);
      }
      if (window.HRM_MANPOWER_CACHE && Array.isArray(window.HRM_MANPOWER_CACHE.employees)) {
        delSources.push(window.HRM_MANPOWER_CACHE.employees);
      }

      var stillReplaced = window.MEP_REPLACEMENT_MASTER.some(function (r) {
        return String(r.replace_id || '').replace(/^[#\s]+/, '').trim() === cleanRepId;
      });

      delSources.forEach(function (sourceList) {
        if (!stillReplaced && cleanRepId) {
          var repEmp = sourceList.find(function (e) {
            return String(e.staff_id || '').replace(/^[#\s]+/, '').trim() === cleanRepId;
          });
          if (repEmp) {
            repEmp.status = 'Active';
            if (repEmp.remarks && repEmp.remarks.indexOf('Replaced by') !== -1) {
              repEmp.remarks = '';
            }
          }
        }

        if (cleanNewId) {
          var newEmp = sourceList.find(function (e) {
            return String(e.staff_id || '').replace(/^[#\s]+/, '').trim() === cleanNewId;
          });
          if (newEmp && String(newEmp.replace_id || '').replace(/^[#\s]+/, '').trim() === cleanRepId) {
            newEmp.replace_id = '';
            newEmp.replace_name = '';
            if (newEmp.hiring_type === 'Replacement') newEmp.hiring_type = '';
          }
        }
      });

      if (window.HRMManpower && typeof window.HRMManpower.refreshAll === 'function') {
        window.HRMManpower.refreshAll();
      }

      // Cross-module reactive event broadcast
      try {
        if (window.HRMEventBus && typeof window.HRMEventBus.emit === 'function') {
          window.HRMEventBus.emit('REPLACEMENT_CHANGED', { type: 'delete', replace_id: cleanRepId, new_id: cleanNewId });
        }
        if (window.HRMDashboard && typeof window.HRMDashboard.render === 'function') {
          window.HRMDashboard.render();
        }
        if (window.HRMManpowerSummary && typeof window.HRMManpowerSummary.render === 'function') {
          window.HRMManpowerSummary.render();
        }
        if (window.HRMPermanentEmployees && typeof window.HRMPermanentEmployees.init === 'function') {
          window.HRMPermanentEmployees.init();
        }
        if (window.HRMSectionSalary && typeof window.HRMSectionSalary.render === 'function') {
          window.HRMSectionSalary.render();
        }
        if (window.HRMIncrement && typeof window.HRMIncrement.init === 'function') {
          window.HRMIncrement.init();
        }
        if (window.HRMTransfer && typeof window.HRMTransfer.render === 'function') {
          window.HRMTransfer.render();
        }
      } catch (eDel) {}

      if (typeof window.showHRToast === 'function') {
        window.showHRToast('🗑️ Replacement record removed & staff ' + cleanRepId + ' restored to Active!', 'success');
      }
    }

    // 1. Direct Firebase Cloud Delete
    if (window.HRMFirebase && typeof window.HRMFirebase.deleteReplacement === 'function') {
      window.HRMFirebase.deleteReplacement(sl, cleanRepId, cleanNewId).catch(function(e) {
        console.warn('[HRM_FIREBASE] Cloud replacement delete notice:', e);
      });
    }

    // 2. Perform Local UI update immediately
    performLocalReplacementDelete();

    // 3. Optional local server sync if running on local server
    var isLocalHost = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (isLocalHost) {
      fetch('/api/hrm/replacement/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sl: sl, replace_id: cleanRepId, new_id: cleanNewId })
      }).catch(function(err) {
        console.warn('Server replacement delete notice:', err);
      });
    }
  }

  function renderPagination(total) {
    var container = document.getElementById('rep-pagination-container');
    if (!container) return;

    var perPage = state.filters.per_page;
    if (perPage >= 999999) {
      container.innerHTML = '<span class="text-[11px] font-mono text-slate-400">Showing all ' + total + ' records</span>';
      return;
    }

    var totalPages = Math.ceil(total / perPage);
    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    var curr = state.filters.page;
    var btns = [];

    btns.push('<button onclick="window.HRMEmployeeEntry.changePage(' + (curr - 1) + ')" ' + (curr === 1 ? 'disabled' : '') +
              ' class="rep-input-glass px-2.5 py-1 rounded-lg text-xs font-bold disabled:opacity-40 cursor-pointer">Prev</button>');

    for (var p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || (p >= curr - 1 && p <= curr + 1)) {
        var activeClass = p === curr ? 'rep-btn-glass-purple text-white font-black shadow-sm' : 'rep-input-glass text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold';
        btns.push('<button onclick="window.HRMEmployeeEntry.changePage(' + p + ')" class="px-2.5 py-1 rounded-lg text-xs ' + activeClass + ' cursor-pointer">' + p + '</button>');
      } else if (p === curr - 2 || p === curr + 2) {
        btns.push('<span class="px-1 text-slate-400">...</span>');
      }
    }

    btns.push('<button onclick="window.HRMEmployeeEntry.changePage(' + (curr + 1) + ')" ' + (curr === totalPages ? 'disabled' : '') +
              ' class="rep-input-glass px-2.5 py-1 rounded-lg text-xs font-bold disabled:opacity-40 cursor-pointer">Next</button>');

    container.innerHTML = '<div class="flex items-center gap-1.5">' + btns.join('') + '</div>';
  }

  function changePage(p) {
    var perPage = state.filters.per_page;
    if (perPage >= 999999) return;
    var totalPages = Math.ceil(state.filteredReplacements.length / perPage);
    if (p < 1 || p > totalPages) return;
    state.filters.page = p;
    renderReplacementTable();
  }

  function onPerPageChange(val) {
    if (val === 'ALL') {
      state.filters.per_page = 999999;
    } else {
      state.filters.per_page = parseInt(val, 10) || 25;
    }
    state.filters.page = 1;

    var footerLabel = document.getElementById('rep-footer-per-page-label');
    if (footerLabel) {
      var displayVal = (val === 'ALL') ? ('All (' + (state.filteredReplacements ? state.filteredReplacements.length : state.replacementList.length) + ')') : val;
      footerLabel.textContent = 'Rows per page: ' + displayVal;
    }

    var filterSelect = document.getElementById('rep-filter-per-page');
    if (filterSelect && filterSelect.value !== val) {
      filterSelect.value = val;
    }

    renderReplacementTable();
  }

  function onFilterChange(key, value) {
    if (key === 'per_page') {
      onPerPageChange(value);
      return;
    }
    state.filters[key] = value;
    if (key === 'search') {
      clearTimeout(state.filterSearchTimer);
      state.filterSearchTimer = setTimeout(function () {
        applyReplacementFilters();
        renderReplacementTable();
      }, 120);
    } else {
      applyReplacementFilters();
      renderReplacementTable();
    }
  }

  function viewReplacedDossier(staffId) {
    if (!staffId) return;
    var cleanId = String(staffId).replace(/^[#\s]+/, '').trim();
    var all = getAllEmployees();
    var emp = all.find(function (e) { return String(e.staff_id).replace(/^[#\s]+/, '').trim() === cleanId; });
    if (emp && window.HRMManpower && typeof window.HRMManpower.openDossier === 'function') {
      window.HRMManpower.openDossier(emp);
    } else {
      alert('Employee ID ' + cleanId + ' not found in current database view.');
    }
  }

  function openEditModal(staffId) {
    if (!staffId) return;
    var all = getAllEmployees();
    var emp = all.find(function (e) { return String(e.staff_id) === String(staffId); });
    if (emp && window.HRMManpower && typeof window.HRMManpower.openEditModal === 'function') {
      window.HRMManpower.openEditModal(emp);
    }
  }

  function populateDropdowns() {
    var secSelect = document.getElementById('entry-section');
    var filterSec = document.getElementById('rep-filter-section');

    var all = getAllEmployees();
    var sections = {};
    all.forEach(function (e) {
      if (e.section) sections[e.section] = true;
    });

    var secList = Object.keys(sections).sort();

    if (secSelect && secSelect.options.length <= 1) {
      secList.forEach(function (s) {
        var opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        secSelect.appendChild(opt);
      });
    }

    if (filterSec && filterSec.options.length <= 1) {
      secList.forEach(function (s) {
        var opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        filterSec.appendChild(opt);
      });
    }
  }

  // -------------------------------------------------------------
  // Excel Export Functionality (.xlsx) - 13 Column Layout
  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // Excel Export Functionality (.xlsx) - Styled with Full Cell Borders
  // -------------------------------------------------------------
  function exportReplacementExcel() {
    if (typeof XLSX === 'undefined') {
      alert('Excel library is still loading, please try again in a few moments.');
      return;
    }

    var list = state.filteredReplacements || [];
    if (list.length === 0) {
      if (window.showHRToast) window.showHRToast('No replacement data found to export.', 'warning');
      return;
    }

    var filename = 'MEP_HRM_Replacement_Master_Report_' + new Date().toISOString().slice(0, 10) + '.xlsx';

    // 1. Build rows data
    var rows = [
      // Row 0: Company Header Banner
      ['MEP GROUP • CEILING FAN FACTORY (PLANT 1027)', '', '', '', '', '', '', '', '', '', '', '', ''],
      // Row 1: Subtitle Banner
      ['HUMAN RESOURCE MANAGEMENT • EMPLOYEE REPLACEMENT MASTER REGISTER', '', '', '', '', '', '', '', '', '', '', '', ''],
      // Row 2: Metadata Banner
      ['Verified: Senior Manager Md. Saiful Islam | Export Date: ' + new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'}) + ' | Total Records: ' + list.length + ' Personnel', '', '', '', '', '', '', '', '', '', '', '', ''],
      // Row 3: Dual Category Banner
      ['◀ REPLACED / FORMER EMPLOYEE DETAILS ▶', '', '', '', '', '', '◀ NEW APPOINTED REPLACEMENT DETAILS ▶', '', '', '', '', '', ''],
      // Row 4: Column Headers (13 cols)
      [
        'Sl.',
        'Replace EMP Id',
        'Replace Employee Name',
        'Designation',
        'Section',
        'Date of joining',
        'Sl.',
        'New EMP Id',
        'New Employee Name',
        'Designation',
        'Section',
        'Date of joining',
        'Remarks'
      ]
    ];

    list.forEach(function (item, idx) {
      var cRepId = String(item.replace_id || '').replace(/^[#\s]+/, '').trim();
      var cNewId = String(item.new_id || '').replace(/^[#\s]+/, '').trim();
      var cRemarks = String(item.remarks || '').replace(/\s*\/\s*[\u0980-\u09FF\s]+/g, '').replace(/[\u0980-\u09FF]/g, '').trim();

      rows.push([
        idx + 1,
        cRepId,
        (item.replace_name && item.replace_name !== 'Blank') ? item.replace_name : '',
        (item.replace_designation && item.replace_designation !== 'Blank') ? item.replace_designation : '',
        (item.replace_section && item.replace_section !== 'Blank') ? item.replace_section : '',
        (item.replace_doj && item.replace_doj !== 'Blank' && item.replace_doj !== '0-Jan-00') ? formatCompactDOJ(item.replace_doj) : '',
        idx + 1,
        (cNewId && cNewId !== 'Blank') ? cNewId : '',
        (item.new_name && item.new_name !== 'Blank') ? item.new_name : '',
        (item.new_designation && item.new_designation !== 'Blank') ? item.new_designation : '',
        (item.new_section && item.new_section !== 'Blank') ? item.new_section : '',
        (item.new_doj && item.new_doj !== 'Blank' && item.new_doj !== '0-Jan-00') ? formatCompactDOJ(item.new_doj) : '',
        cRemarks
      ]);
    });

    // Summary Row
    rows.push([
      'Total Verified Replacement Records: ' + list.length, '', '', '', '', '',
      'Status: Active Factory Manning Matrix', '', '', '', '', '', ''
    ]);

    var wb = XLSX.utils.book_new();
    var ws = XLSX.utils.aoa_to_sheet(rows);

    // Merges
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } }, // Title
      { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } }, // Subtitle
      { s: { r: 2, c: 0 }, e: { r: 2, c: 12 } }, // Meta
      { s: { r: 3, c: 0 }, e: { r: 3, c: 5 } },  // Replaced category
      { s: { r: 3, c: 6 }, e: { r: 3, c: 12 } }, // New category
      { s: { r: rows.length - 1, c: 0 }, e: { r: rows.length - 1, c: 5 } }, // Total summary 1
      { s: { r: rows.length - 1, c: 6 }, e: { r: rows.length - 1, c: 12 } } // Total summary 2
    ];

    // Column Widths
    ws['!cols'] = [
      { wch: 7 },  // Sl
      { wch: 17 }, // Replace EMP Id
      { wch: 28 }, // Replace Employee Name
      { wch: 22 }, // Designation
      { wch: 28 }, // Section
      { wch: 16 }, // Date of joining
      { wch: 7 },  // Sl
      { wch: 17 }, // New EMP Id
      { wch: 28 }, // New Employee Name
      { wch: 22 }, // Designation
      { wch: 28 }, // Section
      { wch: 16 }, // Date of joining
      { wch: 24 }  // Remarks
    ];

    // Row Heights
    ws['!rows'] = [
      { hpt: 30 }, // Title
      { hpt: 22 }, // Subtitle
      { hpt: 20 }, // Meta
      { hpt: 24 }, // Category
      { hpt: 26 }  // Col Headers
    ];

    // Style Definitions
    var thinBorder = {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    };

    var dividerBorder = {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'medium', color: { rgb: '475569' } } // Separator line
    };

    var range = XLSX.utils.decode_range(ws['!ref']);
    for (var R = range.s.r; R <= range.e.r; ++R) {
      for (var C = range.s.c; C <= range.e.c; ++C) {
        var cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellRef]) ws[cellRef] = { v: '', t: 's' };
        var cell = ws[cellRef];

        if (R === 0) {
          // Company Title Banner
          cell.s = {
            font: { name: 'Segoe UI', sz: 13, bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '1E1B4B' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: thinBorder
          };
        } else if (R === 1) {
          // Subtitle
          cell.s = {
            font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '334155' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: thinBorder
          };
        } else if (R === 2) {
          // Metadata
          cell.s = {
            font: { name: 'Segoe UI', sz: 9, bold: true, color: { rgb: '1E293B' }, italic: true },
            fill: { fgColor: { rgb: 'F1F5F9' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: thinBorder
          };
        } else if (R === 3) {
          // Category Banner
          if (C <= 5) {
            cell.s = {
              font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
              fill: { fgColor: { rgb: '6D28D9' } }, // Purple
              alignment: { horizontal: 'center', vertical: 'center' },
              border: (C === 5) ? dividerBorder : thinBorder
            };
          } else {
            cell.s = {
              font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
              fill: { fgColor: { rgb: '059669' } }, // Emerald
              alignment: { horizontal: 'center', vertical: 'center' },
              border: thinBorder
            };
          }
        } else if (R === 4) {
          // Column Headers
          if (C <= 5) {
            cell.s = {
              font: { name: 'Segoe UI', sz: 9.5, bold: true, color: { rgb: 'FFFFFF' } },
              fill: { fgColor: { rgb: '5B21B6' } }, // Deep Purple
              alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
              border: (C === 5) ? dividerBorder : thinBorder
            };
          } else {
            cell.s = {
              font: { name: 'Segoe UI', sz: 9.5, bold: true, color: { rgb: 'FFFFFF' } },
              fill: { fgColor: { rgb: '047857' } }, // Deep Emerald
              alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
              border: thinBorder
            };
          }
        } else if (R === range.e.r) {
          // Summary Row at Bottom
          cell.s = {
            font: { name: 'Segoe UI', sz: 9.5, bold: true, color: { rgb: '064E3B' } },
            fill: { fgColor: { rgb: 'E2E8F0' } },
            alignment: { horizontal: (C === 0 || C === 6) ? 'left' : 'center', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: '0F172A' } },
              bottom: { style: 'double', color: { rgb: '0F172A' } },
              left: { style: 'thin', color: { rgb: 'CBD5E1' } },
              right: (C === 5) ? { style: 'medium', color: { rgb: '475569' } } : { style: 'thin', color: { rgb: 'CBD5E1' } }
            }
          };
        } else {
          // Data Rows
          var isEven = (R % 2 === 0);
          var bg = isEven ? 'FFFFFF' : 'F8FAFC';
          var bStyle = (C === 5) ? dividerBorder : thinBorder;
          var align = 'left';
          if (C === 0 || C === 1 || C === 5 || C === 6 || C === 7 || C === 11) {
            align = 'center';
          }

          cell.s = {
            font: { name: 'Segoe UI', sz: 9, color: { rgb: '0F172A' }, bold: (C === 1 || C === 7) },
            fill: { fgColor: { rgb: bg } },
            alignment: { horizontal: align, vertical: 'center', wrapText: false },
            border: bStyle
          };
        }
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Replacement_Master');
    XLSX.writeFile(wb, filename);

    if (window.showHRToast) {
      window.showHRToast('Replacement Master Report Excel file downloaded successfully with formatted borders!');
    }
  }

  // -------------------------------------------------------------
  // PDF Export Functionality (.pdf) - Executive Bordered Grid Layout
  // -------------------------------------------------------------
  function exportReplacementPDF() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      if (window.showHRToast) window.showHRToast('PDF library loading, opening print dialog...');
      window.print();
      return;
    }

    var list = state.filteredReplacements || [];
    if (list.length === 0) {
      if (window.showHRToast) window.showHRToast('No replacement data found to export.');
      return;
    }

    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

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
    doc.text('HUMAN RESOURCE MANAGEMENT • EMPLOYEE REPLACEMENT MASTER REGISTER', 14, 23);

    // Right Telemetry Badge
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(218, 10, 65, 17, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('TOTAL REPLACEMENTS', 222, 15);
    doc.setFontSize(12);
    doc.setTextColor(52, 211, 153);
    doc.text(list.length + ' PERSONNEL', 222, 23);

    // 2. Verified Meta Ribbon
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(10, 31, 277, 8, 1, 1, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Verified By: Senior Manager Md. Saiful Islam', 14, 36.5);
    doc.text('Generation Time: ' + dateStr + ' ' + timeStr, 110, 36.5);
    doc.text('Status: Active Verified Registry', 220, 36.5);

    // 3. Two-Tier Header Definition
    var head = [
      [
        { content: 'REPLACED / FORMER EMPLOYEE DETAILS', colSpan: 6, styles: { halign: 'center', fillColor: [109, 40, 217], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 } },
        { content: 'NEW APPOINTED REPLACEMENT EMPLOYEE DETAILS', colSpan: 7, styles: { halign: 'center', fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 } }
      ],
      [
        'Sl.', 'Replace ID', 'Replace Name', 'Designation', 'Section', 'DOJ',
        'Sl.', 'New ID', 'New Name', 'Designation', 'Section', 'DOJ', 'Remarks'
      ]
    ];

    var body = list.map(function (item, idx) {
      var rId = (item.replace_id || '').toString().replace(/^[#\s]+/, '').trim();
      var nId = (item.new_id && item.new_id !== 'Blank') ? item.new_id.toString().replace(/^[#\s]+/, '').trim() : '';
      var rem = (item.remarks || '').toString().replace(/\s*\/\s*[\u0980-\u09FF\s]+/g, '').replace(/[\u0980-\u09FF]/g, '').trim();

      return [
        idx + 1,
        rId,
        (item.replace_name && item.replace_name !== 'Blank') ? item.replace_name : '',
        (item.replace_designation && item.replace_designation !== 'Blank') ? item.replace_designation : '',
        (item.replace_section && item.replace_section !== 'Blank') ? item.replace_section : '',
        (item.replace_doj && item.replace_doj !== 'Blank' && item.replace_doj !== '0-Jan-00') ? formatCompactDOJ(item.replace_doj) : '',
        idx + 1,
        nId,
        (item.new_name && item.new_name !== 'Blank') ? item.new_name : '',
        (item.new_designation && item.new_designation !== 'Blank') ? item.new_designation : '',
        (item.new_section && item.new_section !== 'Blank') ? item.new_section : '',
        (item.new_doj && item.new_doj !== 'Blank' && item.new_doj !== '0-Jan-00') ? formatCompactDOJ(item.new_doj) : '',
        rem
      ];
    });

    doc.autoTable({
      head: head,
      body: body,
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
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.2,
        halign: 'center',
        lineColor: [15, 23, 42],
        lineWidth: 0.2
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { halign: 'center', cellWidth: 17, fontStyle: 'bold' },
        2: { cellWidth: 32 },
        3: { cellWidth: 24 },
        4: { cellWidth: 32 },
        5: { halign: 'center', cellWidth: 16 },
        6: { halign: 'center', cellWidth: 8 },
        7: { halign: 'center', cellWidth: 17, fontStyle: 'bold' },
        8: { cellWidth: 32 },
        9: { cellWidth: 24 },
        10: { cellWidth: 32 },
        11: { halign: 'center', cellWidth: 16 },
        12: { cellWidth: 19 }
      },
      didDrawPage: function (data) {
        var pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text('MEP GROUP • HRM Replacement Master Document | Confidential & Proprietary', 10, pageHeight - 6);
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

    var pdfFilename = 'MEP_HRM_Replacement_Master_Report_' + new Date().toISOString().slice(0, 10) + '.pdf';
    doc.save(pdfFilename);

    if (window.showHRToast) {
      window.showHRToast('Replacement Master Report PDF downloaded successfully with formatted borders!');
    }
  }

  function exportReplacementCSV() {
    var list = state.filteredReplacements || [];
    if (list.length === 0) return;

    var csvRows = [
      ['Sl.', 'Replace EMP Id', 'Replace Employee Name', 'Designation', 'Section', 'Date of joining', 'Sl.', 'New EMP Id', 'New Employee Name', 'Designation', 'Section', 'Date of joining', 'Remarks']
    ];

    list.forEach(function (item, idx) {
      var rId = (item.replace_id || '').toString().replace(/^[#\s]+/, '').trim();
      var nId = (item.new_id && item.new_id !== 'Blank') ? item.new_id.toString().replace(/^[#\s]+/, '').trim() : '';
      var rem = (item.remarks || '').toString().replace(/\s*\/\s*[\u0980-\u09FF\s]+/g, '').replace(/[\u0980-\u09FF]/g, '').trim();

      csvRows.push([
        idx + 1,
        '"' + rId + '"',
        '"' + ((item.replace_name && item.replace_name !== 'Blank') ? item.replace_name : '') + '"',
        '"' + ((item.replace_designation && item.replace_designation !== 'Blank') ? item.replace_designation : '') + '"',
        '"' + ((item.replace_section && item.replace_section !== 'Blank') ? item.replace_section : '') + '"',
        '"' + ((item.replace_doj && item.replace_doj !== 'Blank' && item.replace_doj !== '0-Jan-00') ? formatCompactDOJ(item.replace_doj) : '') + '"',
        idx + 1,
        '"' + nId + '"',
        '"' + ((item.new_name && item.new_name !== 'Blank') ? item.new_name : '') + '"',
        '"' + ((item.new_designation && item.new_designation !== 'Blank') ? item.new_designation : '') + '"',
        '"' + ((item.new_section && item.new_section !== 'Blank') ? item.new_section : '') + '"',
        '"' + ((item.new_doj && item.new_doj !== 'Blank' && item.new_doj !== '0-Jan-00') ? formatCompactDOJ(item.new_doj) : '') + '"',
        '"' + rem + '"'
      ]);
    });

    var csvContent = '\uFEFF' + csvRows.map(function (e) { return e.join(','); }).join('\n');
    var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'MEP_HRM_Replacement_Master_Report_' + new Date().toISOString().slice(0, 10) + '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function printReplacementReport() {
    window.print();
  }

  // -------------------------------------------------------------
  // Public Interface
  // -------------------------------------------------------------
  window.HRMEmployeeEntry = {
    init: initEmployeeEntryModule,
    switchTab: switchTab,
    setHiringType: setHiringType,
    onSearchReplacedEmployee: onSearchReplacedEmployee,
    onSearchBlur: onSearchBlur,
    selectReplacedEmployee: selectReplacedEmployee,
    clearReplacedEmployee: clearReplacedEmployee,
    onGrossSalaryChange: onGrossSalaryChange,
    handleFormSubmit: handleFormSubmit,
    resetEntryForm: resetEntryForm,
    onFilterChange: onFilterChange,
    onPerPageChange: onPerPageChange,
    changePage: changePage,
    viewReplacedDossier: viewReplacedDossier,
    openEditModal: openEditModal,
    exportReplacementExcel: exportReplacementExcel,
    exportReplacementPDF: exportReplacementPDF,
    exportReplacementCSV: exportReplacementCSV,
    printReplacementReport: printReplacementReport,
    buildReplacementList: buildReplacementList,
    renderHoldCandidatesShelf: renderHoldCandidatesShelf,
    deleteReplacementRecord: deleteReplacementRecord
  };

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEmployeeEntryModule);
  } else {
    initEmployeeEntryModule();
  }

})();
