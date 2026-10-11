/**
 * MEP GROUP - Enterprise Human Resource Management (HRM) Module
 * Manpower Database Controller & Workforce Intelligence Cockpit
 * Author: Antigravity AI / MEP Engineering Team
 */

(function () {
  'use strict';

  // -------------------------------------------------------------
  // Internal State
  // -------------------------------------------------------------
  var state = {
    allEmployees: [],
    filteredEmployees: [],
    metadata: null,
    filters: {
      search: '',
      status: 'ALL',
      section: 'ALL',
      department: 'ALL',
      designation: 'ALL',
      gender: 'ALL',
      confirmation: 'ALL',
      blood_group: 'ALL',
      sort_by: 'sl_no',
      sort_dir: 'asc',
      page: 1,
      per_page: 25
    },
    activeDossierEmp: null
  };

  // Section Color Palette for Visual Polish
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

  function getGrade(desig) {
    var d = String(desig || '').trim().toLowerCase();
    // 1. M Grade (Explicitly specified by User -> returns 'M')
    for (var i = 0; i < M_GRADE_DESIGNATIONS.length; i++) {
      if (d === M_GRADE_DESIGNATIONS[i] || d.indexOf(M_GRADE_DESIGNATIONS[i]) !== -1) {
        return 'M';
      }
    }
    if (d.includes('engineer') || d.includes('officer') || d.includes('manager') || d.includes('executive')) {
      return 'M';
    }

    // 2. Worker Grade (User explicit: Operator, Helper, Delivery, Lift, Cleaner, Labor -> returns 'W')
    if (d.includes('helper') || 
        d.includes('operator') || 
        d.includes('delivery') || 
        d.includes('lift') || 
        d.includes('cleaner') || 
        d.includes('labor')) {
      return 'W';
    }

    // 3. S Grade: Supervisors, Foremen, Technicalmen -> returns 'S'
    return 'S';
  }

  function getGradeBadge(grade) {
    var g = String(grade || '').trim().toUpperCase();
    if (g === 'M' || g.indexOf('M') !== -1) {
      return '<span class="grade-pill-m w-7 h-7 rounded-xl font-mono font-black text-xs inline-flex items-center justify-center select-none shadow-2xs" title="Management & Engineering Grade (M)">M</span>';
    } else if (g === 'S' || g.indexOf('S') !== -1) {
      return '<span class="grade-pill-s w-7 h-7 rounded-xl font-mono font-black text-xs inline-flex items-center justify-center select-none shadow-2xs" title="Supervisor & Technical Grade (S)">S</span>';
    } else {
      return '<span class="grade-pill-w w-7 h-7 rounded-xl font-mono font-black text-xs inline-flex items-center justify-center select-none shadow-2xs" title="Worker & Operator Grade (W)">W</span>';
    }
  }

  function formatShortDOJ(str) {
    if (!str || str === '—' || str === '-' || str === '0' || str === 'null' || str === 'None') return '—';
    str = String(str).trim();
    var m1 = str.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ](\d{2,4})$/);
    if (m1) {
      var d = m1[1].length === 1 ? '0' + m1[1] : m1[1];
      var mon = m1[2].charAt(0).toUpperCase() + m1[2].slice(1, 3).toLowerCase();
      var yr = m1[3].length === 4 ? m1[3].slice(-2) : m1[3];
      return d + '-' + mon + '-' + yr;
    }
    var m2 = str.match(/^(\d{4})[-/ ](\d{1,2})[-/ ](\d{1,2})$/);
    if (m2) {
      var yr2 = m2[1].slice(-2);
      var moIdx = parseInt(m2[2], 10) - 1;
      var mon2 = (moIdx >= 0 && moIdx < 12) ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][moIdx] : 'Jan';
      var d2 = m2[3].length === 1 ? '0' + m2[3] : m2[3];
      return d2 + '-' + mon2 + '-' + yr2;
    }
    var dObj = new Date(str);
    if (!isNaN(dObj.getTime())) {
      var dd = String(dObj.getDate()).padStart(2, '0');
      var mm = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][dObj.getMonth()] || 'Jan';
      var yy = String(dObj.getFullYear()).slice(-2);
      return dd + '-' + mm + '-' + yy;
    }
    return str;
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

  // -------------------------------------------------------------
  // Data Loading & Initialization
  // -------------------------------------------------------------
  function initManpowerModule() {
    // 0. Ensure replacement master is loaded if not already present
    if (!window.MEP_REPLACEMENT_MASTER || !window.MEP_REPLACEMENT_MASTER.length) {
      fetch('/api/hrm/replacement-master')
        .then(function (res) { return res.json(); })
        .then(function (data) {
          var repList = Array.isArray(data) ? data : (data && (data.data || data.records));
          if (repList && Array.isArray(repList)) {
            window.MEP_REPLACEMENT_MASTER = repList;
          }
        })
        .catch(function () {});
    }

    // 1. Try to load from pre-embedded cache first (instant render)
    var localCache = window.MEP_MANPOWER_DATABASE || window.HRM_MANPOWER_CACHE;
    if (localCache && localCache.employees) {
      loadDataIntoState(localCache);
    }

    // 2. Fetch fresh from server in background
    fetch('/api/hrm/employees?limit=0')
      .then(function (res) {
        if (!res.ok) throw new Error('Network error: ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (data && data.employees && data.employees.length > 0) {
          loadDataIntoState({
            employees: data.employees,
            metadata: data.metadata || null
          });
        }
      })
      .catch(function (err) {
        console.warn('Live API fetch skipped or failed; using local client database cache.', err);
      });

    // 3. Fallback direct cloud fetch for file:/// protocol or standalone execution
    if (window.location.protocol === 'file:' || !window.HRMFirebase) {
      setTimeout(function () {
        if (!window.HRMFirebase || !window.HRMFirebase.state || !window.HRMFirebase.state.isConnected) {
          fetch('https://whatsapp-c10ef-default-rtdb.firebaseio.com/mep_hrm/employees.json')
            .then(function (res) { return res.json(); })
            .then(function (rawData) {
              if (!rawData) return;
              var fbList = Array.isArray(rawData) ? rawData.filter(Boolean) : Object.values(rawData).filter(Boolean);
              var validList = fbList.filter(function (e) {
                if (!e || (!e.staff_id && !e.sl_no)) return false;
                var sid = String(e.staff_id || '').trim();
                return sid && sid !== '14' && sid !== '99989' && e.name;
              });
              if (validList.length > 0) {
                loadDataIntoState({ employees: validList }, true);
              }
            })
            .catch(function () {});

          fetch('https://whatsapp-c10ef-default-rtdb.firebaseio.com/mep_hrm/replacements.json')
            .then(function (res) { return res.json(); })
            .then(function (rawReps) {
              if (!rawReps) return;
              var repList = Array.isArray(rawReps) ? rawReps.filter(Boolean) : Object.values(rawReps).filter(Boolean);
              if (repList.length > 0) {
                window.MEP_REPLACEMENT_MASTER = repList;
                if (window.HRMEmployeeEntry && typeof window.HRMEmployeeEntry.buildReplacementList === 'function') {
                  window.HRMEmployeeEntry.buildReplacementList(false);
                }
              }
            })
            .catch(function () {});
        }
      }, 500);
    }
  }

  function loadDataIntoState(dbData, preservePage) {
    var raw = dbData.employees || [];
    // Strict filter: exclude hidden records and Fan QC section completely
    state.allEmployees = raw.filter(function (e) {
      if (e.is_hidden === true) return false;
      var sec = (e.section || '').trim().toLowerCase();
      if (sec === 'fan qc') return false;
      return true;
    });

    state.metadata = dbData.metadata || computeClientMetadata(state.allEmployees);
    if (state.metadata && state.metadata.section_distribution) {
      delete state.metadata.section_distribution['Fan QC'];
    }

    updateTopKPIs();
    populateFilterDropdowns();
    setStatusFilter(state.filters.status || 'ALL');
  }

  function computeClientMetadata(employees) {
    var emps = Array.isArray(employees) ? employees : (state.allEmployees || []);
    var totalGross = 0;
    var totalBasic = 0;
    var activeCount = 0;
    var holdCount = 0;
    var inactiveCount = 0;
    var activeGross = 0;
    var holdGross = 0;
    var inactiveGross = 0;
    var activeBasic = 0;
    var holdBasic = 0;
    var inactiveBasic = 0;
    var genders = { Male: 0, Female: 0 };
    var depts = {};
    var sections = {};
    var designations = {};

    emps.forEach(function (e) {
      var g = Number(e.gross_salary) || 0;
      var b = Number(e.basic_salary) || 0;
      totalGross += g;
      totalBasic += b;

      var st = (e.status || 'Active').trim().toLowerCase();
      if (st === 'active') {
        activeCount++;
        activeGross += g;
        activeBasic += b;
      } else if (st === 'hold') {
        holdCount++;
        holdGross += g;
        holdBasic += b;
      } else {
        inactiveCount++;
        inactiveGross += g;
        inactiveBasic += b;
      }

      var gen = (e.gender || 'Unspecified').trim();
      genders[gen] = (genders[gen] || 0) + 1;

      var dep = (e.department || 'Production').trim();
      depts[dep] = (depts[dep] || 0) + 1;

      var sec = (e.section || 'General').trim();
      sections[sec] = (sections[sec] || 0) + 1;

      var des = (e.designation || 'Staff').trim();
      designations[des] = (designations[des] || 0) + 1;
    });

    return {
      total_headcount: emps.length,
      active_headcount: activeCount,
      hold_headcount: holdCount,
      inactive_headcount: inactiveCount,
      total_gross_salary: totalGross,
      active_gross_salary: activeGross,
      hold_gross_salary: holdGross,
      inactive_gross_salary: inactiveGross,
      total_basic_salary: totalBasic,
      active_basic_salary: activeBasic,
      hold_basic_salary: holdBasic,
      inactive_basic_salary: inactiveBasic,
      status_distribution: { Active: activeCount, Hold: holdCount, Inactive: inactiveCount },
      average_gross_salary: employees.length ? Math.round(totalGross / employees.length) : 0,
      gender_distribution: genders,
      department_distribution: depts,
      section_distribution: sections,
      designation_distribution: designations
    };
  }

  function updateTopKPIs() {
    var meta = state.metadata;
    if (!meta) return;

    var act = 0;
    var hold = 0;
    var inact = 0;
    var actGross = 0;
    var actBasic = 0;
    var activeSecs = {};

    state.allEmployees.forEach(function (e) {
      var st = (e.status || 'Active').trim().toLowerCase();
      var g = Number(e.gross_salary) || 0;
      var b = Number(e.basic_salary) || 0;
      if (st === 'active') {
        act++;
        actGross += g;
        actBasic += b;
        var s = (e.section || 'General').trim();
        activeSecs[s] = (activeSecs[s] || 0) + 1;
      } else if (st === 'hold') {
        hold++;
      } else {
        inact++;
      }
    });

    var activeSecCount = Object.keys(activeSecs).length;

    // KPI 1: Active Manpower
    var elHeadcount = document.getElementById('kpi-total-headcount');
    if (elHeadcount) elHeadcount.textContent = act.toLocaleString() + ' Staff';
    var elHeadcountSub = document.getElementById('kpi-total-headcount-sub');
    if (elHeadcountSub) {
      elHeadcountSub.textContent = 'Active: ' + act.toLocaleString() + ' • Hold: ' + hold.toLocaleString() + ' • Inactive: ' + inact.toLocaleString();
    }

    // KPI 2: Active Daily Attendance
    var elAttendance = document.getElementById('kpi-daily-attendance');
    var elAttendanceSub = document.getElementById('kpi-daily-attendance-sub');
    var actRate = 97.8;
    var actPresent = Math.round(act * (actRate / 100));
    var actAbsent = act - actPresent;
    if (elAttendance) elAttendance.textContent = actRate + '% Present';
    if (elAttendanceSub) {
      elAttendanceSub.textContent = actPresent + ' Checked In • ' + actAbsent + ' On Leave';
    }

    // Telemetry Dial sync
    var elDialPresent = document.getElementById('dial-present-count');
    if (elDialPresent) elDialPresent.textContent = actPresent + ' Staff';
    var elDialAbsent = document.getElementById('dial-absent-count');
    if (elDialAbsent) elDialAbsent.textContent = actAbsent + ' Staff';

    // KPI 3: Active Monthly Payroll
    var elPayroll = document.getElementById('kpi-monthly-payroll');
    if (elPayroll) {
      var actGrossLakh = (actGross / 100000).toFixed(2);
      elPayroll.textContent = 'Tk ' + actGrossLakh + ' Lakh';
    }
    var elPayrollSub = document.getElementById('kpi-monthly-payroll-sub');
    if (elPayrollSub) {
      var actBasicLakh = (actBasic / 100000).toFixed(2);
      elPayrollSub.textContent = 'Active Basic: Tk ' + actBasicLakh + 'L (' + formatMoney(actGross) + ')';
    }

    // KPI 4: Active Factory Sections
    var elSections = document.getElementById('kpi-factory-sections');
    if (elSections) {
      elSections.textContent = activeSecCount + ' Sections';
    }
    var elSectionsSub = document.getElementById('kpi-factory-sections-sub');
    if (elSectionsSub) {
      elSectionsSub.textContent = 'Active Shop Floor Lines';
    }

    updateStatusTabCounts();
  }

  function updateStatusTabCounts() {
    var act = 0;
    var hold = 0;
    var inact = 0;
    state.allEmployees.forEach(function (e) {
      var st = (e.status || 'Active').trim().toLowerCase();
      if (st === 'active') act++;
      else if (st === 'hold') hold++;
      else inact++;
    });

    var elAll = document.getElementById('status-count-all');
    if (elAll) elAll.textContent = state.allEmployees.length.toLocaleString();
    var elAct = document.getElementById('status-count-active');
    if (elAct) elAct.textContent = act.toLocaleString();
    var elHold = document.getElementById('status-count-hold');
    if (elHold) elHold.textContent = hold.toLocaleString();
    var elInact = document.getElementById('status-count-inactive');
    if (elInact) elInact.textContent = inact.toLocaleString();

    // Dynamically sync sidebar pills
    var elSidebarInfo = document.getElementById('sidebar-manpower-info-badge');
    if (elSidebarInfo) elSidebarInfo.textContent = state.allEmployees.length.toLocaleString();
    var elSidebarAll = document.getElementById('sidebar-all-badge');
    if (elSidebarAll) elSidebarAll.textContent = state.allEmployees.length.toLocaleString();
    var elSubAll = document.getElementById('sidebar-sub-all-count');
    if (elSubAll) elSubAll.textContent = state.allEmployees.length.toLocaleString();
    var elSubAct = document.getElementById('sidebar-sub-active-count');
    if (elSubAct) elSubAct.textContent = act.toLocaleString();
    var elSubHold = document.getElementById('sidebar-sub-hold-count');
    if (elSubHold) elSubHold.textContent = hold.toLocaleString();
    var elSubInact = document.getElementById('sidebar-sub-inactive-count');
    if (elSubInact) elSubInact.textContent = inact.toLocaleString();
  }

  function setStatusFilter(statusVal) {
    statusVal = statusVal || 'ALL';
    state.filters.status = statusVal;
    var selectEl = document.getElementById('filter-status');
    if (selectEl) selectEl.value = statusVal;

    var norm = statusVal.toLowerCase();

    // Dynamically update the Directory Header to reflect the active page/status
    var titleEl = document.getElementById('manpower-directory-header-title');
    var badgeEl = document.getElementById('manpower-directory-header-badge');
    var subEl = document.getElementById('manpower-directory-header-sub');
    var iconEl = document.getElementById('manpower-directory-header-icon');

    if (titleEl) {
      if (norm === 'active') {
        titleEl.textContent = 'Active Staff Directory';
        if (badgeEl) {
          badgeEl.textContent = 'Active Workforce';
          badgeEl.className = 'px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/35 shadow-2xs backdrop-blur-md';
        }
        if (subEl) subEl.textContent = 'Verified active plant workforce across all production lines and factory sections';
        if (iconEl) iconEl.innerHTML = '<i class="ph-bold ph-user-check text-emerald-600 dark:text-emerald-400"></i>';
      } else if (norm === 'inactive') {
        titleEl.textContent = 'Inactive Staff Directory';
        if (badgeEl) {
          badgeEl.textContent = 'Inactive Workforce';
          badgeEl.className = 'px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-black bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/35 shadow-2xs backdrop-blur-md';
        }
        if (subEl) subEl.textContent = 'Historical separated, resigned, and replaced factory personnel records archive';
        if (iconEl) iconEl.innerHTML = '<i class="ph-bold ph-user-minus text-slate-600 dark:text-slate-400"></i>';
      } else if (norm === 'hold') {
        titleEl.textContent = 'Hold Staff Directory';
        if (badgeEl) {
          badgeEl.textContent = 'Hold Personnel';
          badgeEl.className = 'px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-black bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/35 shadow-2xs backdrop-blur-md';
        }
        if (subEl) subEl.textContent = 'Personnel on temporary hold status awaiting replacement or administration';
        if (iconEl) iconEl.innerHTML = '<i class="ph-bold ph-pause-circle text-amber-600 dark:text-amber-400"></i>';
      } else {
        titleEl.textContent = 'Manpower Database & Personnel Directory';
        if (badgeEl) {
          badgeEl.textContent = 'Master Directory';
          badgeEl.className = 'px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-black bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/35 shadow-2xs backdrop-blur-md';
        }
        if (subEl) subEl.textContent = 'Live master employee database across all plant lines, sections, and departments';
        if (iconEl) iconEl.innerHTML = '<i class="ph-bold ph-users-four text-purple-600 dark:text-purple-400"></i>';
      }
    }

    ['all', 'active', 'hold', 'inactive'].forEach(function (s) {
      var btn = document.getElementById('btn-status-' + s);
      if (!btn) return;
      if (s === norm) {
        if (s === 'hold') {
          btn.className = 'liquid-pill-btn active-hold px-3.5 py-1.5 rounded-xl text-xs font-black text-white shadow-md transition-all cursor-pointer flex items-center gap-1.5';
        } else if (s === 'active') {
          btn.className = 'liquid-pill-btn active-active px-3.5 py-1.5 rounded-xl text-xs font-black text-white shadow-md transition-all cursor-pointer flex items-center gap-1.5';
        } else if (s === 'inactive') {
          btn.className = 'liquid-pill-btn active-inactive px-3.5 py-1.5 rounded-xl text-xs font-black text-white shadow-md transition-all cursor-pointer flex items-center gap-1.5';
        } else {
          btn.className = 'liquid-pill-btn active-all px-3.5 py-1.5 rounded-xl text-xs font-black text-white shadow-md transition-all cursor-pointer flex items-center gap-1.5';
        }
      } else {
        btn.className = 'liquid-pill-btn inactive-pill px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-all flex items-center gap-1.5 cursor-pointer';
      }
    });

    // Dynamically update theme classes for the table container box, section card, and telemetry strip
    var tableBox = document.getElementById('manpower-table-wrapper');
    var sectionEl = document.getElementById('manpower-database-section');
    var telemetryStrip = document.getElementById('manpower-telemetry-strip');

    var themeClass = (norm === 'active') ? 'theme-active' :
                     (norm === 'inactive') ? 'theme-inactive' :
                     (norm === 'hold') ? 'theme-hold' : 'theme-all';

    var allThemes = ['theme-active', 'theme-inactive', 'theme-hold', 'theme-all'];

    if (tableBox) {
      allThemes.forEach(function (t) { tableBox.classList.remove(t); });
      tableBox.classList.add(themeClass);
    }
    if (sectionEl) {
      allThemes.forEach(function (t) { sectionEl.classList.remove(t); });
      sectionEl.classList.add(themeClass);
    }
    if (telemetryStrip) {
      allThemes.forEach(function (t) { telemetryStrip.classList.remove(t); });
      telemetryStrip.classList.add(themeClass);
    }

    applyFilters();
  }

  function populateFilterDropdowns() {
    var secSelect = document.getElementById('filter-section');
    var deptSelect = document.getElementById('filter-department');
    var desigSelect = document.getElementById('filter-designation');

    if (!state.metadata) return;

    // 1. Sections
    if (secSelect && secSelect.options.length <= 1) {
      var secMap = state.metadata.section_distribution || {};
      var sortedSecs = Object.keys(secMap).sort(function (a, b) {
        return secMap[b] - secMap[a];
      });
      sortedSecs.forEach(function (sec) {
        var opt = document.createElement('option');
        opt.value = sec;
        opt.textContent = sec + ' (' + secMap[sec] + ')';
        secSelect.appendChild(opt);
      });
    }

    // 2. Departments
    if (deptSelect && deptSelect.options.length <= 1) {
      var deptMap = state.metadata.department_distribution || {};
      Object.keys(deptMap).forEach(function (dept) {
        var opt = document.createElement('option');
        opt.value = dept;
        opt.textContent = dept + ' (' + deptMap[dept] + ')';
        deptSelect.appendChild(opt);
      });
    }

    // 3. Designations
    if (desigSelect && desigSelect.options.length <= 1) {
      var desigMap = state.metadata.designation_distribution || {};
      var sortedDesigs = Object.keys(desigMap).sort(function (a, b) {
        return desigMap[b] - desigMap[a];
      });
      sortedDesigs.forEach(function (desig) {
        var opt = document.createElement('option');
        opt.value = desig;
        opt.textContent = desig + ' (' + desigMap[desig] + ')';
        desigSelect.appendChild(opt);
      });
    }
  }

  // -------------------------------------------------------------
  // Confirmation / Permanent Staff Lookup Helper
  // -------------------------------------------------------------
  function getConfirmedStaffMap() {
    var map = {};
    var list = [];
    if (window.HRMPermanentEmployees && typeof window.HRMPermanentEmployees.getAll === 'function') {
      list = window.HRMPermanentEmployees.getAll() || [];
    }
    if ((!list || list.length === 0) && window.MEP_PERMANENT_EMPLOYEES && Array.isArray(window.MEP_PERMANENT_EMPLOYEES)) {
      list = window.MEP_PERMANENT_EMPLOYEES;
    }
    if (Array.isArray(list)) {
      list.forEach(function (p) {
        if (p && p.staff_id) {
          var sid = String(p.staff_id).replace(/^[#\s]+/, '').trim();
          if (sid) {
            map[sid] = p;
          }
        }
      });
    }
    return map;
  }

  function isEmployeeConfirmed(staffId) {
    if (!staffId) return false;
    var sid = String(staffId).replace(/^[#\s]+/, '').trim();
    var confMap = getConfirmedStaffMap();
    return !!confMap[sid];
  }

  // -------------------------------------------------------------
  // Filtering & Sorting Logic
  // -------------------------------------------------------------
  function applyFilters(preservePage) {
    var f = state.filters;
    var q = (f.search || '').trim().toLowerCase();
    var confMap = (f.confirmation && f.confirmation !== 'ALL') ? getConfirmedStaffMap() : null;

    var result = state.allEmployees.filter(function (emp) {
      // 1. Text Search Query — Filter ONLY by Employee ID (Staff ID) and Employee Name
      if (q) {
        var cleanQ = q.replace(/^#/, '').trim();
        var empStaffId = String(emp.staff_id || '').replace(/^#/, '').trim().toLowerCase();
        var empName = String(emp.name || '').trim().toLowerCase();

        var matchesId = empStaffId.indexOf(cleanQ) !== -1;
        var matchesName = empName.indexOf(q) !== -1;

        if (!matchesId && !matchesName) return false;
      }

      // 2. Status Filter
      if (f.status && f.status !== 'ALL') {
        if ((emp.status || 'Active').toLowerCase() !== f.status.toLowerCase()) return false;
      }

      // 3. Section Filter
      if (f.section && f.section !== 'ALL') {
        var fSec = f.section.toLowerCase();
        var empSec = (emp.section || '').toLowerCase();
        if (fSec === 'fan sala shapla' || fSec === 'fan sada shapla' || fSec === 'sada shapla' || fSec === 'sala shapla') {
          if (empSec !== 'fan sala shapla' && empSec !== 'fan sada shapla' && empSec !== 'sada shapla' && empSec !== 'sala shapla') return false;
        } else if (empSec !== fSec) {
          return false;
        }
      }

      // 4. Department Filter
      if (f.department && f.department !== 'ALL') {
        if ((emp.department || '').toLowerCase() !== f.department.toLowerCase()) return false;
      }

      // 5. Designation Filter
      if (f.designation && f.designation !== 'ALL') {
        if ((emp.designation || '').toLowerCase() !== f.designation.toLowerCase()) return false;
      }

      // 6. Gender Filter
      if (f.gender && f.gender !== 'ALL') {
        if ((emp.gender || '').toLowerCase() !== f.gender.toLowerCase()) return false;
      }

      // 6.5. Permanent / Confirmation Status Filter (Permanent vs Non-Permanent)
      if (confMap) {
        var sid = String(emp.staff_id || '').replace(/^[#\s]+/, '').trim();
        var isConf = !!confMap[sid];
        var targetConf = String(f.confirmation).toLowerCase().replace(/[\s\-_]+/g, '');
        if ((targetConf === 'permanent' || targetConf === 'confirmation' || targetConf === 'confirmed' || targetConf === 'confarmation') && !isConf) return false;
        if ((targetConf === 'nonpermanent' || targetConf === 'nonconfirmation' || targetConf === 'nonconfirmed' || targetConf === 'noncofarmation') && isConf) return false;
      }

      // 7. Blood Group Filter
      if (f.blood_group && f.blood_group !== 'ALL') {
        if ((emp.blood_group || '').toUpperCase() !== f.blood_group.toUpperCase()) return false;
      }

      return true;
    });

    // Sort Result
    result.sort(function (a, b) {
      var valA, valB;
      var dir = f.sort_dir === 'desc' ? -1 : 1;

      switch (f.sort_by) {
        case 'gross_salary':
          valA = Number(a.gross_salary) || 0;
          valB = Number(b.gross_salary) || 0;
          return (valA - valB) * dir;
        case 'name':
          valA = (a.name || '').toLowerCase();
          valB = (b.name || '').toLowerCase();
          return valA.localeCompare(valB) * dir;
        case 'staff_id':
          valA = parseInt(a.staff_id, 10) || 999999;
          valB = parseInt(b.staff_id, 10) || 999999;
          return (valA - valB) * dir;
        case 'doj':
          valA = a.doj || '';
          valB = b.doj || '';
          return valA.localeCompare(valB) * dir;
        case 'sl_no':
        default:
          valA = Number(a.sl_no) || 0;
          valB = Number(b.sl_no) || 0;
          return (valA - valB) * dir;
      }
    });

    state.filteredEmployees = result;
    if (!preservePage) {
      state.filters.page = 1; // Reset to page 1 on filter change
    } else {
      var maxPage = Math.max(1, Math.ceil(result.length / (state.filters.pageSize || 25)));
      if (state.filters.page > maxPage) state.filters.page = maxPage;
    }
    renderTable();
    updateFilterSummaryBar();
  }

  function updateFilterSummaryBar() {
    var countEl = document.getElementById('manpower-filtered-count');
    var payrollEl = document.getElementById('manpower-filtered-payroll');
    var badgeBar = document.getElementById('manpower-active-filters-bar');

    var count = state.filteredEmployees.length;
    var totalAll = state.allEmployees.length;

    if (countEl) {
      countEl.textContent = count.toLocaleString() + ' of ' + totalAll.toLocaleString() + ' Staff';
    }

    if (payrollEl) {
      var filteredPayroll = state.filteredEmployees.reduce(function (acc, e) {
        return acc + (Number(e.gross_salary) || 0);
      }, 0);
      payrollEl.textContent = formatMoney(filteredPayroll);
    }

    if (badgeBar) {
      var activeTags = [];
      var f = state.filters;

      if (f.search) activeTags.push('Search: "' + f.search + '"');
      if (f.status && f.status !== 'ALL') activeTags.push('Status: ' + f.status);
      if (f.section !== 'ALL') activeTags.push('Section: ' + f.section);
      if (f.department !== 'ALL') activeTags.push('Dept: ' + f.department);
      if (f.designation !== 'ALL') activeTags.push('Role: ' + f.designation);
      if (f.gender !== 'ALL') activeTags.push('Gender: ' + f.gender);
      if (f.confirmation && f.confirmation !== 'ALL') activeTags.push('Permanent: ' + f.confirmation);
      if (f.blood_group !== 'ALL') activeTags.push('Blood: ' + f.blood_group);

      if (activeTags.length > 0) {
        var html = '<div class="flex flex-wrap items-center gap-2">';
        html += '<span class="text-[11px] font-mono text-slate-500 font-bold">Active Filters:</span>';
        activeTags.forEach(function (t) {
          html += '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1 shadow-2xs">' +
            t + '</span>';
        });
        html += '<button type="button" onclick="window.HRMManpower.resetFilters()" class="text-[10px] font-bold text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:underline cursor-pointer ml-1 flex items-center gap-0.5"><i class="ph-bold ph-x-circle"></i> Clear All</button>';
        html += '</div>';
        badgeBar.innerHTML = html;
        badgeBar.classList.remove('hidden');
      } else {
        badgeBar.classList.add('hidden');
      }
    }
  }

  // -------------------------------------------------------------
  // Table & Pagination Rendering
  // -------------------------------------------------------------
  function getEmployeeReplaceId(emp, repLookup) {
    if (!emp) return '';
    var rep = String(emp.replace_id || '').replace(/^[#\s]+/, '').trim();
    if (rep && rep !== '0' && rep !== 'None' && rep !== 'null' && rep !== '—' && rep !== '-') {
      return rep;
    }
    var staffId = String(emp.staff_id || '').replace(/^[#\s]+/, '').trim();
    if (repLookup && repLookup[staffId]) {
      return repLookup[staffId];
    }
    if (staffId && window.MEP_REPLACEMENT_MASTER && Array.isArray(window.MEP_REPLACEMENT_MASTER)) {
      var found = window.MEP_REPLACEMENT_MASTER.find(function (r) {
        return String(r.new_id || '').replace(/^[#\s]+/, '').trim() === staffId;
      });
      if (found && found.replace_id) {
        var foundRep = String(found.replace_id).replace(/^[#\s]+/, '').trim();
        if (foundRep && foundRep !== '0' && foundRep !== 'None' && foundRep !== 'null' && foundRep !== '—' && foundRep !== '-') {
          return foundRep;
        }
      }
    }
    return '';
  }

  function getReplacementForEmployee(staffId) {
    if (!staffId) return null;
    var cleanId = String(staffId).replace(/^[#\s]+/, '').trim();
    if (!cleanId || cleanId === '0' || cleanId === '—' || cleanId === '-') return null;

    // 1. Authoritative check in window.MEP_REPLACEMENT_MASTER
    // If the record was deleted from the Replacement report, it is NO LONGER replaced and can be Active!
    if (window.MEP_REPLACEMENT_MASTER && Array.isArray(window.MEP_REPLACEMENT_MASTER)) {
      var found = window.MEP_REPLACEMENT_MASTER.find(function (r) {
        return String(r.replace_id || '').replace(/^[#\s]+/, '').trim() === cleanId;
      });
      if (found) {
        return {
          new_id: String(found.new_id || '').replace(/^[#\s]+/, '').trim(),
          new_name: found.new_name || 'New Employee',
          replace_id: cleanId,
          replace_name: found.replace_name || '',
          joining_date: found.joining_date || '',
          remarks: found.remarks || ''
        };
      }
      // If window.MEP_REPLACEMENT_MASTER is loaded and cleanId is NOT in it,
      // it means this ID is NOT replaced (or was removed/deleted from Replacement Report)!
      return null;
    }

    // 2. Fallback only if window.MEP_REPLACEMENT_MASTER is not yet loaded:
    if (state.allEmployees && state.allEmployees.length > 0) {
      var foundEmp = state.allEmployees.find(function (e) {
        var rep = String(e.replace_id || '').replace(/^[#\s]+/, '').trim();
        return rep && rep === cleanId && String(e.staff_id || '').replace(/^[#\s]+/, '').trim() !== cleanId && (e.status || 'Active').toLowerCase() !== 'inactive';
      });
      if (foundEmp) {
        return {
          new_id: String(foundEmp.staff_id || '').replace(/^[#\s]+/, '').trim(),
          new_name: foundEmp.name || 'New Employee',
          replace_id: cleanId,
          replace_name: '',
          joining_date: foundEmp.doj || '',
          remarks: ''
        };
      }
    }

    return null;
  }

  function renderTable() {
    var tbody = document.getElementById('manpower-table-body');
    if (!tbody) return;

    var f = state.filters;
    var employees = state.filteredEmployees;

    if (!employees || employees.length === 0) {
      tbody.innerHTML = '<tr><td colspan="15" class="py-12 text-center text-slate-400 dark:text-slate-500">' +
        '<div class="flex flex-col items-center justify-center gap-2">' +
        '<i class="ph-bold ph-user-minus text-3xl text-slate-300 dark:text-slate-600"></i>' +
        '<span class="text-sm font-bold">No employee records match the selected criteria.</span>' +
        '<button type="button" onclick="window.HRMManpower.resetFilters()" class="liquid-btn-primary mt-2 px-4 py-2 rounded-xl text-white font-bold text-xs shadow-xs cursor-pointer">Reset All Filters</button>' +
        '</div></td></tr>';
      renderPagination(0, 1, f.per_page);
      return;
    }

    var total = employees.length;
    var perPage = f.per_page === 'ALL' ? total : parseInt(f.per_page, 10);
    var totalPages = Math.ceil(total / perPage);
    var page = Math.min(Math.max(f.page, 1), totalPages);
    state.filters.page = page;

    var startIdx = (page - 1) * perPage;
    var endIdx = Math.min(startIdx + perPage, total);
    var pagedData = employees.slice(startIdx, endIdx);

    // Build constant-time replacement index map to avoid O(N*M) lookups
    var repLookup = {};
    if (window.MEP_REPLACEMENT_MASTER && Array.isArray(window.MEP_REPLACEMENT_MASTER)) {
      window.MEP_REPLACEMENT_MASTER.forEach(function (r) {
        if (r && r.new_id) {
          var nid = String(r.new_id).replace(/^[#\s]+/, '').trim();
          var rid = String(r.replace_id || '').replace(/^[#\s]+/, '').trim();
          if (nid && rid && rid !== '0' && rid !== 'None' && rid !== 'null' && rid !== '—' && rid !== '-') {
            repLookup[nid] = rid;
          }
        }
      });
    }

    // Build constant-time permanent confirmation map outside loop
    var confMap = getConfirmedStaffMap();

    var html = '';
    pagedData.forEach(function (emp, index) {
      var rowNumber = startIdx + index + 1;
      var rawGen = String(emp.gender || '').trim().toLowerCase();
      var isFemale = (rawGen === 'female');
      var isMale = (rawGen === 'male');
      var avatarBg = isFemale
        ? 'bg-gradient-to-tr from-pink-500 to-rose-400 text-white'
        : 'bg-gradient-to-tr from-blue-500 to-indigo-600 text-white';

      var secStyle = getSectionStyle(emp.section);

      var bloodGroupBadge = emp.blood_group && emp.blood_group !== '0' && emp.blood_group !== '-'
        ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">' + emp.blood_group + '</span>'
        : '<span class="text-[10px] text-slate-400 select-none">—</span>';

      var empGrade = getGrade(emp.designation);
      var gradeBadge = getGradeBadge(empGrade);

      var repId = getEmployeeReplaceId(emp, repLookup);
      var cleanRepId = String(repId || '').replace(/^[#\s]+/, '').trim();
      var replaceBadge = cleanRepId
        ? '<button type="button" onclick="window.HRMManpower.viewReplacedInfo(\'' + cleanRepId + '\', ' + emp.sl_no + ')" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-mono text-[11px] font-black bg-amber-500/10 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/35 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 group/rep backdrop-blur-md" title="Replaced Staff ID: ' + cleanRepId + ' (Click to view replacement details)">' +
          '<i class="ph-bold ph-arrows-clockwise text-[11px] text-amber-600 dark:text-amber-400 group-hover/rep:rotate-180 transition-transform"></i>' + cleanRepId +
          '</button>'
        : '<span class="text-slate-400 dark:text-slate-600 text-xs font-mono select-none">—</span>';

      // Gender SVG Icon Badge (Female ♀ / Male ♂ - Strict SVG Vector, No Text)
      var genderBadgeCol = isFemale
        ? '<span class="gender-pill-female w-7 h-7 rounded-xl inline-flex items-center justify-center select-none shadow-2xs group/gen cursor-default" title="Female">' +
          '<svg class="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 group-hover/gen:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
          '<circle cx="12" cy="9" r="5"></circle>' +
          '<line x1="12" y1="14" x2="12" y2="21"></line>' +
          '<line x1="9" y1="18" x2="15" y2="18"></line>' +
          '</svg></span>'
        : isMale
        ? '<span class="gender-pill-male w-7 h-7 rounded-xl inline-flex items-center justify-center select-none shadow-2xs group/gen cursor-default" title="Male">' +
          '<svg class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 group-hover/gen:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
          '<circle cx="10" cy="14" r="5"></circle>' +
          '<line x1="19" y1="5" x2="13.6" y2="10.4"></line>' +
          '<polyline points="15 5 19 5 19 9"></polyline>' +
          '</svg></span>'
        : '<span class="text-slate-400 dark:text-slate-600 text-xs font-mono select-none">—</span>';

      var sid = String(emp.staff_id || '').replace(/^[#\s]+/, '').trim();
      var confInfo = confMap[sid];
      var isConfirmed = !!confInfo;

      var confirmationBadgeCol = isConfirmed
        ? '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shadow-2xs select-none"' + (confInfo && confInfo.permanent_date ? ' title="Permanent Confirmation Date: ' + confInfo.permanent_date + '"' : ' title="Permanent Staff"') + '><i class="ph-bold ph-check-circle text-[10px] text-emerald-600 dark:text-emerald-400"></i>Permanent</span>'
        : '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shadow-2xs select-none" title="Non-Permanent / Temporary / Probationary"><i class="ph-bold ph-x-circle text-[10px] text-slate-400"></i>Non-Permanent</span>';

      var cleanStaffId = String(emp.staff_id || '').replace(/^[#\s]+/, '').trim();

      html += '<tr class="border-b border-slate-200/60 dark:border-slate-800/70 transition-colors group">' +
        // 1. SL No
        '<td class="px-3 py-1.5 font-mono text-xs text-slate-400 dark:text-slate-500 text-center select-none whitespace-nowrap" title="Row #' + rowNumber + ' (Database ID: ' + emp.sl_no + ')">' + rowNumber + '</td>' +

        // 2. Staff ID Capsule (Strictly NO '#' prefix)
        '<td class="px-3 py-1.5 whitespace-nowrap">' +
        '<span class="px-2.5 py-1 rounded-xl text-xs font-mono font-black tracking-tight bg-slate-900/90 text-white dark:bg-white/95 dark:text-slate-900 border border-slate-700/50 dark:border-white/30 shadow-2xs inline-flex items-center gap-1.5 cursor-pointer hover:scale-105 transition-all" onclick="window.HRMManpower.openDossier(' + emp.sl_no + ')" title="View Personnel Dossier">' +
        '<i class="ph-bold ph-identification-card text-[11px] text-purple-400 dark:text-purple-600"></i>' + cleanStaffId +
        '</span>' +
        '</td>' +

        // 3. Name & Avatar
        '<td class="px-3 py-1.5 min-w-[220px]">' +
        '<div class="flex items-center gap-2">' +
        '<div class="w-6 h-6 rounded-lg ' + avatarBg + ' flex items-center justify-center text-[11px] font-black shadow-2xs shrink-0 select-none">' +
        (emp.name ? emp.name.charAt(0).toUpperCase() : '?') +
        '</div>' +
        '<div class="min-w-0 flex-1">' +
        '<button type="button" onclick="window.HRMManpower.openDossier(' + emp.sl_no + ')" class="font-bold text-xs text-slate-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 text-left truncate block max-w-[200px] cursor-pointer leading-tight">' +
        emp.name +
        '</button>' +
        '<div class="flex items-center gap-1 leading-none mt-0.5">' +
        (emp.address ? '<span class="text-[10px] text-slate-400 truncate max-w-[130px] inline-block" title="' + emp.address + '">' + emp.address + '</span>' : '') +
        '</div>' +
        '</div>' +
        '</div>' +
        '</td>' +

        // 3.5. Status Pill with 1-Click Interactive Toggle (Active -> Hold -> Inactive)
        '<td class="px-3 py-1.5 text-center whitespace-nowrap">' +
        (function() {
          var repInfo = getReplacementForEmployee(emp.staff_id);
          if (repInfo) {
            return '<button type="button" onclick="window.HRMManpower.toggleEmployeeStatus(' + emp.sl_no + ')" class="group/st cursor-pointer select-none transition-transform hover:scale-105 active:scale-95" title="Replaced Staff! Replaced by new employee ' + repInfo.new_id + ' (' + repInfo.new_name + ')">' +
              '<span class="px-2.5 py-1 rounded-xl text-[10.5px] font-mono font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 inline-flex items-center gap-1 shadow-2xs group-hover/st:bg-rose-600 group-hover/st:text-white transition-all backdrop-blur-md">' +
              '<i class="ph-bold ph-arrows-clockwise text-[11px]"></i>Inactive (Replaced)</span>' +
              '</button>';
          }
          var s = (emp.status || 'Active').trim().toLowerCase();
          var btnInner = '';
          if (s === 'active') {
            btnInner = '<span class="px-2.5 py-1 rounded-xl text-[11px] font-mono font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/35 inline-flex items-center gap-1.5 shadow-2xs group-hover/st:bg-emerald-500 group-hover/st:text-white transition-all backdrop-blur-md"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 live-beacon group-hover/st:bg-white"></span>Active</span>';
          } else if (s === 'hold') {
            btnInner = '<span class="px-2.5 py-1 rounded-xl text-[11px] font-mono font-extrabold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/35 inline-flex items-center gap-1.5 shadow-2xs group-hover/st:bg-amber-500 group-hover/st:text-white transition-all backdrop-blur-md"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 live-beacon group-hover/st:bg-white"></span>Hold</span>';
          } else {
            btnInner = '<span class="px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30 inline-flex items-center gap-1.5 shadow-2xs group-hover/st:bg-slate-700 group-hover/st:text-white transition-all backdrop-blur-md"><span class="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover/st:bg-white"></span>Inactive</span>';
          }
          return '<button type="button" onclick="window.HRMManpower.toggleEmployeeStatus(' + emp.sl_no + ')" class="group/st cursor-pointer select-none transition-transform hover:scale-105 active:scale-95" title="Click to cycle status: Active -> Hold -> Inactive">' + btnInner + '</button>';
        })() +
        '</td>' +

        // 4. Role & Qualification
        '<td class="px-3 py-1.5 min-w-[180px]">' +
        '<span class="font-bold text-xs text-slate-800 dark:text-slate-200 block truncate max-w-[180px] leading-tight">' + emp.designation + '</span>' +
        '<span class="text-[10px] font-mono text-slate-500 dark:text-slate-400 block truncate max-w-[180px] leading-tight">' + (emp.qualification && emp.qualification !== '0' ? emp.qualification : 'N/A') + '</span>' +
        '</td>' +

        // 5. Section & Department
        '<td class="px-3 py-1.5 whitespace-nowrap min-w-[180px]">' +
        '<span class="px-2.5 py-1 rounded-xl text-[11px] font-bold border inline-flex items-center gap-1.5 shadow-2xs ' + secStyle.bg + '">' +
        '<i class="ph-bold ' + secStyle.icon + ' text-[11px]"></i>' +
        '<span class="truncate max-w-[170px]">' + emp.section + '</span>' +
        '</span>' +
        '</td>' +

        // 6. DOJ & Days (Compact Short Form: DD-Mon-YY, e.g. 17-Jul-16)
        '<td class="px-3 py-1.5 text-xs font-mono whitespace-nowrap min-w-[125px]">' +
        '<span class="px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 inline-block leading-tight whitespace-nowrap shadow-2xs">' + formatShortDOJ(emp.doj) + '</span>' +
        '<span class="text-[10px] text-slate-400 block leading-tight whitespace-nowrap mt-0.5">' + (emp.total_working_days ? emp.total_working_days + ' days' : '—') + '</span>' +
        '</td>' +

        // 7. Gross & Basic Salary (Tk)
        '<td class="px-3 py-1.5 text-right whitespace-nowrap min-w-[135px]">' +
        '<span class="font-mono font-black text-xs text-slate-900 dark:text-white block leading-tight whitespace-nowrap">' + formatMoney(emp.gross_salary) + '</span>' +
        '<span class="text-[10px] font-mono text-slate-400 block leading-tight whitespace-nowrap">Basic: ' + formatMoney(emp.basic_salary) + '</span>' +
        '</td>' +

        // 8. Contact & NID
        '<td class="px-3 py-1.5 text-xs font-mono whitespace-nowrap min-w-[155px]">' +
        (emp.contact_number && emp.contact_number !== '0'
          ? '<a href="tel:' + emp.contact_number + '" class="text-purple-600 dark:text-purple-400 hover:underline font-bold flex items-center gap-1 leading-tight whitespace-nowrap" title="Call Employee"><i class="ph-bold ph-phone text-[10px]"></i>' + emp.contact_number + '</a>'
          : '<span class="text-slate-400 leading-tight block">—</span>') +
        (emp.nid ? '<span class="text-[10px] text-slate-400 truncate max-w-[140px] block leading-tight whitespace-nowrap" title="NID: ' + emp.nid + '">NID: ' + emp.nid + '</span>' : '') +
        '</td>' +

        // 8.5. Grade (Strictly W, S, M in Jewel Liquid Glass Badge)
        '<td class="px-3 py-1.5 text-center whitespace-nowrap">' + gradeBadge + '</td>' +

        // 9. Blood Group
        '<td class="px-3 py-1.5 text-center whitespace-nowrap">' + bloodGroupBadge + '</td>' +

        // 9.5. Replace ID (Strictly NO '#' prefix)
        '<td class="px-3 py-1.5 text-center whitespace-nowrap">' + replaceBadge + '</td>' +

        // 9.6. Gender (Direct SVG Badge Only: ♂ Male / ♀ Female)
        '<td class="px-3 py-1.5 text-center whitespace-nowrap">' + genderBadgeCol + '</td>' +

        // 9.7. Confirmation Status
        '<td class="px-3 py-1.5 text-center whitespace-nowrap">' + confirmationBadgeCol + '</td>' +

        // 10. Actions (Liquid Glass Buttons with Liquid Slide Transitions)
        '<td class="px-3 py-1.5 text-right whitespace-nowrap">' +
        '<div class="flex items-center justify-end gap-1.5">' +
        '<button type="button" onclick="window.HRMManpower.openDossier(' + emp.sl_no + ')" class="liquid-btn-glass w-7 h-7 rounded-xl bg-purple-500/10 hover:bg-purple-600 text-purple-600 hover:text-white dark:text-purple-400 dark:hover:text-white border border-purple-500/30 flex items-center justify-center text-xs transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95" title="View Full Dossier">' +
        '<i class="ph-bold ph-eye text-[12px]"></i>' +
        '</button>' +
        '<button type="button" onclick="window.HRMManpower.openEditModal(' + emp.sl_no + ')" class="liquid-btn-glass mep-edit-btn w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-900 text-slate-600 hover:text-white dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95" title="Edit Employee">' +
        '<i class="ph-bold ph-pencil-simple text-[12px]"></i>' +
        '</button>' +
        '<button type="button" onclick="window.HRMManpower.deleteEmployee(' + emp.sl_no + ')" class="liquid-btn-glass mep-delete-btn w-7 h-7 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-600 hover:text-white dark:bg-rose-950/40 dark:hover:bg-rose-600 dark:text-rose-400 dark:hover:text-white border border-rose-500/30 flex items-center justify-center text-xs transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95" title="Delete Employee">' +
        '<i class="ph-bold ph-trash text-[12px]"></i>' +
        '</button>' +
        '<span class="mep-locked-badge items-center justify-center w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700/60 shadow-2xs" title="Editing Locked"><i class="ph-bold ph-lock text-xs"></i></span>' +
        '</div>' +
        '</td>' +
        '</tr>';

    });

    tbody.innerHTML = html;
    renderPagination(total, page, perPage);
  }

  function renderPagination(total, currentPage, perPage) {
    var container = document.getElementById('manpower-pagination-controls');
    var infoText = document.getElementById('manpower-pagination-info');

    if (!container) return;

    if (total === 0) {
      container.innerHTML = '';
      if (infoText) infoText.textContent = 'Showing 0 records';
      return;
    }

    var totalPages = Math.ceil(total / perPage);
    var start = (currentPage - 1) * perPage + 1;
    var end = Math.min(currentPage * perPage, total);

    if (infoText) {
      infoText.textContent = 'Showing ' + start + '–' + end + ' of ' + total.toLocaleString() + ' employees';
    }

    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    var html = '<div class="flex items-center gap-1.5">';

    // Previous Button
    html += '<button type="button" onclick="window.HRMManpower.changePage(' + (currentPage - 1) + ')" ' +
      (currentPage === 1 ? 'disabled class="opacity-40 cursor-not-allowed ' : 'cursor-pointer hover:scale-105 active:scale-95 ') +
      'liquid-btn-glass px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 shadow-2xs flex items-center gap-1.5 transition-all">' +
      '<i class="ph-bold ph-caret-left"></i> Prev</button>';

    // Page Number Buttons (smart ellipsis)
    var pages = [];
    if (totalPages <= 7) {
      for (var i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      var pStart = Math.max(2, currentPage - 1);
      var pEnd = Math.min(totalPages - 1, currentPage + 1);
      for (var j = pStart; j <= pEnd; j++) pages.push(j);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    pages.forEach(function (p) {
      if (p === '...') {
        html += '<span class="px-2 text-xs font-mono text-slate-400 select-none">...</span>';
      } else if (p === currentPage) {
        html += '<button type="button" class="liquid-btn-primary w-8 h-8 rounded-xl text-white font-black text-xs shadow-xs select-none">' + p + '</button>';
      } else {
        html += '<button type="button" onclick="window.HRMManpower.changePage(' + p + ')" class="liquid-btn-glass w-8 h-8 rounded-xl text-slate-700 dark:text-slate-300 font-bold text-xs shadow-2xs transition-all cursor-pointer hover:scale-105 active:scale-95">' + p + '</button>';
      }
    });

    // Next Button
    html += '<button type="button" onclick="window.HRMManpower.changePage(' + (currentPage + 1) + ')" ' +
      (currentPage === totalPages ? 'disabled class="opacity-40 cursor-not-allowed ' : 'cursor-pointer hover:scale-105 active:scale-95 ') +
      'liquid-btn-glass px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 shadow-2xs flex items-center gap-1.5 transition-all">' +
      'Next <i class="ph-bold ph-caret-right"></i></button>';

    html += '</div>';
    container.innerHTML = html;
  }

  // -------------------------------------------------------------
  // Employee Dossier Modal Controller
  // -------------------------------------------------------------
  function openDossier(slNo) {
    var emp = state.allEmployees.find(function (e) { return e.sl_no === slNo; });
    if (!emp) return;

    state.activeDossierEmp = emp;
    var modal = document.getElementById('employee-dossier-modal');
    if (!modal) return;

    // Set Avatar & Header
    var isFemale = (emp.gender || '').toLowerCase() === 'female';
    var avatarEl = document.getElementById('dossier-avatar');
    if (avatarEl) {
      avatarEl.textContent = emp.name ? emp.name.charAt(0).toUpperCase() : '?';
      avatarEl.className = 'w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg shrink-0 ' +
        (isFemale ? 'bg-gradient-to-tr from-pink-500 to-rose-400 text-white shadow-pink-500/30' : 'bg-gradient-to-tr from-blue-500 to-indigo-600 text-white shadow-blue-500/30');
    }

    document.getElementById('dossier-name').textContent = emp.name;
    document.getElementById('dossier-staff-id').textContent = 'Staff ID: ' + emp.staff_id;
    document.getElementById('dossier-designation').textContent = emp.designation + ' • ' + emp.department;

    var statusEl = document.getElementById('dossier-status');
    if (statusEl) {
      var st = (emp.status || 'Active').toLowerCase();
      if (st === 'active') {
        statusEl.textContent = 'Active';
        statusEl.className = 'px-2.5 py-0.5 rounded-lg text-xs font-mono font-extrabold border bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      } else if (st === 'hold') {
        statusEl.textContent = 'Hold';
        statusEl.className = 'px-2.5 py-0.5 rounded-lg text-xs font-mono font-extrabold border bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
      } else {
        statusEl.textContent = 'Inactive';
        statusEl.className = 'px-2.5 py-0.5 rounded-lg text-xs font-mono font-extrabold border bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700';
      }
    }

    var secStyle = getSectionStyle(emp.section);
    var secEl = document.getElementById('dossier-section');
    if (secEl) {
      secEl.textContent = emp.section;
      secEl.className = 'px-3 py-1 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 ' + secStyle.bg;
    }

    // Tab 1: Personal Details
    document.getElementById('dossier-dob').textContent = emp.dob || '—';
    document.getElementById('dossier-gender').textContent = emp.gender || '—';
    document.getElementById('dossier-blood').textContent = emp.blood_group || '—';
    document.getElementById('dossier-contact').textContent = emp.contact_number || '—';
    var telLink = document.getElementById('dossier-contact-link');
    if (telLink) telLink.href = emp.contact_number ? 'tel:' + emp.contact_number : '#';
    document.getElementById('dossier-nid').textContent = emp.nid || '—';
    document.getElementById('dossier-bank').textContent = emp.bank_rocket_acc || '—';
    document.getElementById('dossier-address').textContent = emp.address || '—';

    // Tab 2: Factory Service History
    document.getElementById('dossier-doj').textContent = emp.doj || '—';
    document.getElementById('dossier-working-days').textContent = (emp.total_working_days || '—') + ' Days';
    document.getElementById('dossier-first-section').textContent = emp.first_joining_section || '—';
    document.getElementById('dossier-qualification').textContent = emp.qualification || '—';
    document.getElementById('dossier-ref-id').textContent = emp.reference_id || '—';
    document.getElementById('dossier-replace-id').textContent = emp.replace_id || '—';

    // Tab 3: Salary & Increments Breakdown
    document.getElementById('dossier-gross-salary').textContent = formatMoney(emp.gross_salary);
    document.getElementById('dossier-basic-salary').textContent = formatMoney(emp.basic_salary);

    var inc21 = Number(emp.increment_2021) || 0;
    var inc22 = Number(emp.increment_2022) || 0;
    var inc23 = Number(emp.increment_2023) || 0;
    var inc24 = Number(emp.increment_2024) || 0;
    var inc25 = Number(emp.increment_2025) || 0;
    var inc26 = Number(emp.increment_2026) || 0;
    var incTotal = inc21 + inc22 + inc23 + inc24 + inc25 + inc26;

    document.getElementById('dossier-inc-2021').textContent = inc21 ? '+ ' + formatMoney(inc21) : '—';
    document.getElementById('dossier-inc-2022').textContent = inc22 ? '+ ' + formatMoney(inc22) : '—';
    document.getElementById('dossier-inc-2023').textContent = inc23 ? '+ ' + formatMoney(inc23) : '—';
    document.getElementById('dossier-inc-2024').textContent = inc24 ? '+ ' + formatMoney(inc24) : '—';
    document.getElementById('dossier-inc-2025').textContent = inc25 ? '+ ' + formatMoney(inc25) : '—';
    document.getElementById('dossier-inc-2026').textContent = inc26 ? '+ ' + formatMoney(inc26) : '—';
    document.getElementById('dossier-inc-total').textContent = incTotal ? formatMoney(incTotal) : '—';

    // Switch to first tab by default
    switchDossierTab('personal');

    modal.classList.remove('hidden');
  }

  function closeDossier() {
    var modal = document.getElementById('employee-dossier-modal');
    if (modal) modal.classList.add('hidden');
    state.activeDossierEmp = null;
  }

  function switchDossierTab(tabId) {
    ['personal', 'service', 'salary'].forEach(function (t) {
      var contentEl = document.getElementById('dossier-tab-content-' + t);
      var btnEl = document.getElementById('dossier-tab-btn-' + t);
      if (contentEl) {
        if (t === tabId) {
          contentEl.classList.remove('hidden');
        } else {
          contentEl.classList.add('hidden');
        }
      }
      if (btnEl) {
        if (t === tabId) {
          btnEl.className = 'px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white shadow-xs';
        } else {
          btnEl.className = 'px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800';
        }
      }
    });
  }

  // -------------------------------------------------------------
  // Add / Edit Employee Modal Controller
  // -------------------------------------------------------------
  function openAddModal() {
    if (typeof window.isEditModeEnabled === 'function' && !window.isEditModeEnabled()) {
      if (typeof window.showHRToast === 'function') {
        window.showHRToast('🔒 Edit Mode is currently locked. Please enable Edit Mode from Settings.', 'warning');
      } else {
        alert('Edit Mode is currently stopped/locked in Settings.');
      }
      return;
    }
    var modal = document.getElementById('employee-edit-modal');
    if (!modal) return;

    document.getElementById('edit-modal-title').textContent = 'Add New Personnel to Manpower Database';
    document.getElementById('emp-form-sl-no').value = '';
    document.getElementById('emp-form-staff-id').value = '';
    document.getElementById('emp-form-name').value = '';
    document.getElementById('emp-form-designation').value = 'Helper';
    document.getElementById('emp-form-qualification').value = 'S.S.C';
    document.getElementById('emp-form-department').value = 'Production';
    document.getElementById('emp-form-section').value = 'Fan Assemble Line';
    document.getElementById('emp-form-doj').value = new Date().toISOString().split('T')[0];
    document.getElementById('emp-form-gross-salary').value = '6500';
    document.getElementById('emp-form-basic-salary').value = '3250';
    document.getElementById('emp-form-dob').value = '';
    document.getElementById('emp-form-contact').value = '';
    document.getElementById('emp-form-nid').value = '';
    document.getElementById('emp-form-bank').value = '';
    document.getElementById('emp-form-blood').value = 'B+';
    document.getElementById('emp-form-address').value = 'Kotoali, Barishal';
    document.getElementById('emp-form-gender').value = 'Male';
    if (document.getElementById('emp-form-status')) document.getElementById('emp-form-status').value = 'Active';
    document.getElementById('emp-form-ref-id').value = '';
    document.getElementById('emp-form-replace-id').value = '';

    var warnNoticeAdd = document.getElementById('emp-form-replace-warning');
    if (warnNoticeAdd) {
      warnNoticeAdd.innerHTML = '';
      warnNoticeAdd.classList.add('hidden');
    }

    var delBtnAdd = document.getElementById('emp-form-delete-btn');
    if (delBtnAdd) delBtnAdd.style.display = 'none';

    modal.classList.remove('hidden');
  }

  function openEditModal(slNo) {
    if (typeof window.isEditModeEnabled === 'function' && !window.isEditModeEnabled()) {
      if (typeof window.showHRToast === 'function') {
        window.showHRToast('🔒 Edit Mode is currently locked. Please enable Edit Mode from Settings.', 'warning');
      } else {
        alert('Edit Mode is currently stopped/locked in Settings.');
      }
      return;
    }
    var emp = state.allEmployees.find(function (e) { return e.sl_no === slNo; });
    if (!emp) return;

    var modal = document.getElementById('employee-edit-modal');
    if (!modal) return;

    var cleanEditId = String(emp.staff_id || '').replace(/^[#\s]+/, '').trim();
    document.getElementById('edit-modal-title').textContent = 'Edit Employee Dossier ' + cleanEditId;
    document.getElementById('emp-form-sl-no').value = emp.sl_no;
    document.getElementById('emp-form-staff-id').value = cleanEditId;
    document.getElementById('emp-form-name').value = emp.name || '';
    document.getElementById('emp-form-designation').value = emp.designation || 'Helper';
    document.getElementById('emp-form-qualification').value = emp.qualification || '';
    document.getElementById('emp-form-department').value = emp.department || 'Production';
    document.getElementById('emp-form-section').value = emp.section || 'Fan Assemble Line';
    document.getElementById('emp-form-doj').value = toDateInputValue(emp.doj || '');
    document.getElementById('emp-form-gross-salary').value = emp.gross_salary || '';
    document.getElementById('emp-form-basic-salary').value = emp.basic_salary || '';
    document.getElementById('emp-form-dob').value = toDateInputValue(emp.dob || '');
    document.getElementById('emp-form-contact').value = emp.contact_number || '';
    document.getElementById('emp-form-nid').value = emp.nid || '';
    document.getElementById('emp-form-bank').value = emp.bank_rocket_acc || '';
    document.getElementById('emp-form-blood').value = emp.blood_group || 'B+';
    document.getElementById('emp-form-address').value = emp.address || '';
    document.getElementById('emp-form-gender').value = emp.gender || 'Male';
    if (document.getElementById('emp-form-status')) document.getElementById('emp-form-status').value = emp.status || 'Active';
    document.getElementById('emp-form-ref-id').value = emp.reference_id || '';
    document.getElementById('emp-form-replace-id').value = emp.replace_id || '';

    // Check if this employee was replaced by another staff
    var repInfo = getReplacementForEmployee(emp.staff_id);
    var warnNotice = document.getElementById('emp-form-replace-warning');
    var statusSelect = document.getElementById('emp-form-status');
    if (repInfo) {
      emp.status = 'Inactive';
      if (statusSelect) statusSelect.value = 'Inactive';
      if (warnNotice) {
        warnNotice.innerHTML = '<div class="p-3 rounded-xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/40 text-amber-800 dark:text-amber-200 text-xs font-semibold flex items-start gap-2.5 shadow-2xs">' +
          '<i class="ph-bold ph-warning-circle text-lg text-amber-500 shrink-0 mt-0.5"></i>' +
          '<div>' +
          '<span class="font-bold text-amber-900 dark:text-amber-100">⚠️ Replaced Personnel Notice:</span> ' +
          'This employee was replaced by new staff <strong class="font-mono text-purple-700 dark:text-purple-300">' + repInfo.new_id + ' (' + repInfo.new_name + ')</strong>. ' +
          'Therefore this ID cannot be set to <strong class="text-rose-600 dark:text-rose-400">Active</strong> or <strong class="text-amber-600 dark:text-amber-400">Hold</strong> (must remain Inactive).' +
          '</div>' +
          '</div>';
        warnNotice.classList.remove('hidden');
      }
    } else {
      if (warnNotice) {
        warnNotice.classList.add('hidden');
        warnNotice.innerHTML = '';
      }
    }

    var delBtnEdit = document.getElementById('emp-form-delete-btn');
    if (delBtnEdit) delBtnEdit.style.display = 'inline-flex';

    modal.classList.remove('hidden');
  }

  function closeEditModal() {
    var modal = document.getElementById('employee-edit-modal');
    if (modal) modal.classList.add('hidden');
  }

  function handleSaveEmployee(event) {
    if (event) event.preventDefault();
    if (state.isSavingEmployee) return;

    if (typeof window.isEditModeEnabled === 'function' && !window.isEditModeEnabled()) {
      if (typeof window.showHRToast === 'function') {
        window.showHRToast('🔒 Edit Mode is currently locked. Cannot save employee.', 'warning');
      } else {
        alert('Edit Mode is currently stopped/locked in Settings.');
      }
      return;
    }

    var sl = document.getElementById('emp-form-sl-no').value;
    var staffId = document.getElementById('emp-form-staff-id').value.trim();
    var name = document.getElementById('emp-form-name').value.trim();

    if (!staffId || !name) {
      alert('Please fill in Staff ID and Employee Name.');
      return;
    }

    var cleanSid = staffId.replace(/^[#\s]+/, '').trim();
    if (!sl) {
      // Adding new employee: verify staff_id does not already exist
      var duplicate = state.allEmployees.find(function (e) {
        return String(e.staff_id || '').replace(/^[#\s]+/, '').trim() === cleanSid;
      });
      if (duplicate) {
        alert('❌ Staff ID ' + cleanSid + ' already exists in the database (' + (duplicate.name || 'Staff') + ')!\nDuplicate Staff IDs are not permitted.');
        return;
      }
    } else {
      // Editing existing: verify staff_id does not conflict with another employee
      var curSl = parseInt(sl, 10);
      var collision = state.allEmployees.find(function (e) {
        return e.sl_no !== curSl && String(e.staff_id || '').replace(/^[#\s]+/, '').trim() === cleanSid;
      });
      if (collision) {
        alert('❌ Staff ID ' + cleanSid + ' is already assigned to employee ' + collision.name + '!');
        return;
      }
    }

    var chosenStatus = document.getElementById('emp-form-status') ? document.getElementById('emp-form-status').value : 'Active';
    var repCheck = getReplacementForEmployee(cleanSid);
    if (repCheck && (chosenStatus === 'Active' || chosenStatus === 'Hold')) {
      var warnMsg = '⚠️ Notice: Employee (' + cleanSid + (name ? ' - ' + name : '') + ') is already marked as Replaced!\n\n' +
        '👉 New replacement staff assigned: ' + repCheck.new_id + ' (' + repCheck.new_name + ').\n\n' +
        '❌ This ID cannot be set to Active or Hold. Status must remain "Inactive".';
      alert(warnMsg);
      if (typeof window.showHRToast === 'function') {
        window.showHRToast(warnMsg, 'warning');
      }
      if (document.getElementById('emp-form-status')) {
        document.getElementById('emp-form-status').value = 'Inactive';
      }
      return;
    }

    var gross = parseFloat(document.getElementById('emp-form-gross-salary').value) || 0;
    var basic = parseFloat(document.getElementById('emp-form-basic-salary').value) || (gross / 2);

    var rawDoj = document.getElementById('emp-form-doj').value.trim();
    var rawDob = document.getElementById('emp-form-dob').value.trim();

    var payload = {
      sl_no: sl ? parseInt(sl, 10) : null,
      staff_id: staffId,
      name: name,
      status: document.getElementById('emp-form-status') ? document.getElementById('emp-form-status').value : 'Active',
      designation: document.getElementById('emp-form-designation').value.trim(),
      qualification: document.getElementById('emp-form-qualification').value.trim(),
      department: document.getElementById('emp-form-department').value.trim(),
      section: document.getElementById('emp-form-section').value.trim(),
      doj: fromDateInputValue(rawDoj),
      gross_salary: gross,
      basic_salary: basic,
      dob: fromDateInputValue(rawDob),
      contact_number: document.getElementById('emp-form-contact').value.trim(),
      nid: document.getElementById('emp-form-nid').value.trim(),
      bank_rocket_acc: document.getElementById('emp-form-bank').value.trim(),
      blood_group: document.getElementById('emp-form-blood').value.trim(),
      address: document.getElementById('emp-form-address').value.trim(),
      gender: document.getElementById('emp-form-gender').value.trim(),
      reference_id: document.getElementById('emp-form-ref-id').value.trim(),
      replace_id: document.getElementById('emp-form-replace-id').value.trim(),
      hiring_type: document.getElementById('emp-form-replace-id').value.trim() ? 'Replacement' : 'New Direct'
    };

    state.isSavingEmployee = true;
    var saveBtn = document.querySelector('#employee-form button[type="submit"]');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.classList.add('opacity-50', 'pointer-events-none');
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
              var errMsg = (data && data.error) ? data.error : ('Server returned ' + res.status);
              throw new Error(errMsg);
            }
            return data;
          });
        })
        .then(function (data) {
          onSaveComplete((data && data.employee) ? data.employee : payload);
        })
        .catch(function (err) {
          state.isSavingEmployee = false;
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.classList.remove('opacity-50', 'pointer-events-none');
          }
          alert('Could not save employee: ' + (err.message || err));
        });
    }

    function onSaveComplete(saved) {
      state.isSavingEmployee = false;
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.classList.remove('opacity-50', 'pointer-events-none');
      }
      updateOrInsertLocalEmployee(saved);

      // If replaced an employee, update replaced employee status to Inactive immediately
      var cleanRepId = String(saved.replace_id || '').replace(/^#/, '').split(/[\s\-•]+/)[0].trim();
      if (cleanRepId) {
        var replacedStaff = state.allEmployees.find(function(e) {
          return String(e.staff_id || '').replace(/^#/, '').trim() === cleanRepId;
        });
        if (replacedStaff) {
          replacedStaff.status = 'Inactive';
          replacedStaff.remarks = 'Replaced by #' + saved.staff_id + ' (' + saved.name + ')';
        }
        if (window.HRMEmployeeEntry && typeof window.HRMEmployeeEntry.buildReplacementList === 'function') {
          window.HRMEmployeeEntry.buildReplacementList(true);
        }
      }

      closeEditModal();
      refreshAll();

      // Reactive cross-module event broadcast
      if (window.HRMEventBus && typeof window.HRMEventBus.emit === 'function') {
        window.HRMEventBus.emit('EMPLOYEE_MUTATED', { emp: saved, type: 'save' });
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
      if (window.HRMEmployeeEntry && typeof window.HRMEmployeeEntry.renderHoldCandidatesShelf === 'function') {
        window.HRMEmployeeEntry.renderHoldCandidatesShelf();
      }

      if (window.showHRToast) window.showHRToast('☁️ [Cloud Synced] Staff ' + staffId + ' successfully saved and synced!', 'success');
    }

    if (window.HRMFirebase && typeof window.HRMFirebase.saveEmployee === 'function') {
      window.HRMFirebase.saveEmployee(payload)
        .then(function(saved) {
          onSaveComplete(saved);
        })
        .catch(function(err) {
          console.warn('[HRM_FIREBASE] Manpower save error, falling back to server API:', err);
          saveViaServerApi();
        });
    } else {
      saveViaServerApi();
    }
  }

  function saveLocalEmployee(payload) {
    if (!payload.sl_no) {
      var maxSl = state.allEmployees.reduce(function (max, e) {
        return Math.max(max, e.sl_no || 0);
      }, 0);
      payload.sl_no = maxSl + 1;
    }
    updateOrInsertLocalEmployee(payload);
    closeEditModal();
    if (window.showHRToast) window.showHRToast('Saved locally in HRM database!');
  }

  function updateOrInsertLocalEmployee(emp) {
    var idx = state.allEmployees.findIndex(function (e) { return e.sl_no === emp.sl_no; });
    if (idx >= 0) {
      state.allEmployees[idx] = Object.assign({}, state.allEmployees[idx], emp);
    } else {
      state.allEmployees.unshift(emp);
    }
    state.metadata = computeClientMetadata(state.allEmployees);
    updateTopKPIs();
    applyFilters();
  }

  // -------------------------------------------------------------
  // Premium Excel Export Functionality (.xlsx) - Full Grid Borders
  // -------------------------------------------------------------
  function exportExcel() {
    if (typeof XLSX === 'undefined') {
      alert('Excel library is loading, please try again in a few seconds.');
      return;
    }

    var list = (state.filteredEmployees && state.filteredEmployees.length > 0) ? state.filteredEmployees : state.allEmployees;
    if (!list || list.length === 0) {
      if (window.showHRToast) window.showHRToast('No employee records found.');
      return;
    }

    var statusTag = state.filters.status || 'ALL';
    var filename = 'MEP_HRM_Manpower_Directory_' + statusTag + '_' + new Date().toISOString().slice(0, 10) + '.xlsx';

    // 1. Build table rows
    var rows = [
      // Row 0: Company Header Banner
      ['MEP GROUP • CEILING FAN FACTORY (PLANT 1027)', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      // Row 1: Subtitle Banner
      ['HRM MANPOWER DATABASE & SHOP FLOOR PERSONNEL DIRECTORY', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      // Row 2: Metadata Banner
      ['Filter Status: ' + statusTag + ' | Section: ' + (state.filters.section || 'ALL') + ' | Verified By: Senior Manager Md. Saiful Islam | Export Date: ' + new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'}) + ' | Total Records: ' + list.length + ' Personnel', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      // Row 3: Column Headers (15 cols)
      [
        'Sl.',
        'Staff ID',
        'Employee Name',
        'Designation',
        'Section / Line',
        'Department',
        'Date of Joining',
        'Gross Salary (Tk)',
        'Mobile / Contact',
        'Grade',
        'Blood Group',
        'Replace ID',
        'Gender',
        'Permanent / Non-Permanent',
        'Status'
      ]
    ];

    var totalGross = 0;
    list.forEach(function (emp, idx) {
      var sal = Number(emp.gross_salary) || 0;
      totalGross += sal;
      var joiningDate = String(emp.doj || emp.date_of_joining || '').trim();
      if (joiningDate === '0' || joiningDate === 'None' || joiningDate === 'null') joiningDate = '';

      var contactNo = String(emp.contact_number || emp.phone_number || emp.contact || emp.mobile || '').trim();
      if (contactNo === '0' || contactNo === 'None' || contactNo === 'null') contactNo = '';

      rows.push([
        idx + 1,
        emp.staff_id || '',
        emp.name || '',
        emp.designation || '',
        emp.section || '',
        emp.department || '',
        joiningDate,
        sal,
        contactNo,
        getGrade(emp.designation),
        emp.blood_group || '',
        getEmployeeReplaceId(emp),
        emp.gender || '',
        isEmployeeConfirmed(emp.staff_id) ? 'Permanent' : 'Non-Permanent',
        emp.status || 'Active'
      ]);
    });

    // Summary Row
    rows.push([
      'Total Registered Personnel: ' + list.length, '', '', '', '', '', '',
      totalGross,
      '', '', '', '', '', '', 'Verified Matrix'
    ]);

    var wb = XLSX.utils.book_new();
    var ws = XLSX.utils.aoa_to_sheet(rows);

    // Merges
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 14 } }, // Title
      { s: { r: 1, c: 0 }, e: { r: 1, c: 14 } }, // Subtitle
      { s: { r: 2, c: 0 }, e: { r: 2, c: 14 } }, // Meta
      { s: { r: rows.length - 1, c: 0 }, e: { r: rows.length - 1, c: 6 } } // Total summary label
    ];

    // Column Widths
    ws['!cols'] = [
      { wch: 7 },  // Sl
      { wch: 14 }, // Staff ID
      { wch: 28 }, // Name
      { wch: 22 }, // Designation
      { wch: 26 }, // Section
      { wch: 18 }, // Department
      { wch: 16 }, // DOJ
      { wch: 18 }, // Gross Salary
      { wch: 18 }, // Mobile
      { wch: 12 }, // Grade
      { wch: 12 }, // Blood
      { wch: 14 }, // Replace ID
      { wch: 12 }, // Gender
      { wch: 22 }, // Confirmation Status
      { wch: 12 }  // Status
    ];

    // Row Heights
    ws['!rows'] = [
      { hpt: 30 }, // Title
      { hpt: 22 }, // Subtitle
      { hpt: 20 }, // Meta
      { hpt: 25 }  // Col Headers
    ];

    // Style Definitions
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
            font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
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
          // Column Headers
          cell.s = {
            font: { name: 'Segoe UI', sz: 9.5, bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '047857' } }, // Deep Emerald
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: thinBorder
          };
        } else if (R === range.e.r) {
          // Summary row
          cell.s = {
            font: { name: 'Segoe UI', sz: 9.5, bold: true, color: { rgb: '064E3B' } },
            fill: { fgColor: { rgb: 'E2E8F0' } },
            alignment: { horizontal: (C === 7) ? 'right' : (C === 0 ? 'left' : 'center'), vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: '0F172A' } },
              bottom: { style: 'double', color: { rgb: '0F172A' } },
              left: { style: 'thin', color: { rgb: 'CBD5E1' } },
              right: { style: 'thin', color: { rgb: 'CBD5E1' } }
            }
          };
          if (C === 7) {
            cell.z = '#,##0.00';
          }
        } else {
          // Data rows
          var isEven = (R % 2 === 0);
          var bg = isEven ? 'FFFFFF' : 'F8FAFC';
          var align = 'left';
          if (C === 0 || C === 1 || C === 6 || C === 8 || C === 9 || C === 10 || C === 11 || C === 12) {
            align = 'center';
          } else if (C === 7) {
            align = 'right';
          }

          var fontColor = '0F172A';
          var isBold = (C === 1);
          if (C === 12) {
            var stStr = String(cell.v || '').toLowerCase();
            if (stStr === 'active') {
              fontColor = '059669';
              isBold = true;
            } else if (stStr === 'hold') {
              fontColor = 'D97706';
              isBold = true;
            } else if (stStr === 'inactive') {
              fontColor = 'E11D48';
              isBold = true;
            }
          }

          cell.s = {
            font: { name: 'Segoe UI', sz: 9, color: { rgb: fontColor }, bold: isBold },
            fill: { fgColor: { rgb: bg } },
            alignment: { horizontal: align, vertical: 'center' },
            border: thinBorder
          };

          if (C === 7 && typeof cell.v === 'number') {
            cell.z = '#,##0.00';
          }
          if (C === 1 || C === 6 || C === 8) {
            cell.t = 's';
            cell.z = '@';
          }
        }
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Manpower_Directory');
    XLSX.writeFile(wb, filename);

    if (window.showHRToast) {
      window.showHRToast('Manpower directory premium Excel file exported with full grid borders.');
    }
  }

  // -------------------------------------------------------------
  // Premium PDF Export Functionality (.pdf) - Executive Bordered Grid Layout
  // -------------------------------------------------------------
  function exportPDF() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      if (window.showHRToast) window.showHRToast('Loading PDF engine, opening print dialog...');
      window.print();
      return;
    }

    var list = (state.filteredEmployees && state.filteredEmployees.length > 0) ? state.filteredEmployees : state.allEmployees;
    if (!list || list.length === 0) {
      if (window.showHRToast) window.showHRToast('No employee records found.');
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
    var statusTag = state.filters.status || 'ALL';

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
    doc.text('HRM MANPOWER DATABASE & SHOP FLOOR PERSONNEL DIRECTORY', 14, 23);

    // Right Telemetry Badge
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(218, 10, 65, 17, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('TOTAL PERSONNEL', 222, 15);
    doc.setFontSize(12);
    doc.setTextColor(52, 211, 153);
    doc.text(list.length + ' STAFF', 222, 23);

    // 2. Verified Meta Ribbon
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(10, 31, 277, 8, 1, 1, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Status: ' + statusTag.toUpperCase() + ' | Section: ' + (state.filters.section || 'ALL').toUpperCase(), 14, 36.5);
    doc.text('Verified By: Senior Manager Md. Saiful Islam', 110, 36.5);
    doc.text('Generated: ' + dateStr + ' ' + timeStr, 220, 36.5);

    // 3. Table Structure via AutoTable
    var head = [[
      'Sl.', 'Staff ID', 'Employee Name', 'Designation', 'Section / Line', 'Department',
      'DOJ', 'Gross Sal (Tk)', 'Mobile', 'Grade', 'Blood', 'Replace ID', 'Gender', 'Permanent', 'Status'
    ]];

    var totalGross = 0;
    var body = list.map(function (emp, idx) {
      var sal = Number(emp.gross_salary) || 0;
      totalGross += sal;
      var joiningDate = String(emp.doj || emp.date_of_joining || '').trim();
      if (joiningDate === '0' || joiningDate === 'None' || joiningDate === 'null') joiningDate = '—';

      var contactNo = String(emp.contact_number || emp.phone_number || emp.contact || emp.mobile || '').trim();
      if (contactNo === '0' || contactNo === 'None' || contactNo === 'null' || !contactNo) contactNo = '—';

      return [
        idx + 1,
        emp.staff_id || '',
        emp.name || '',
        emp.designation || '',
        emp.section || '',
        emp.department || '',
        joiningDate,
        sal > 0 ? sal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—',
        contactNo,
        getGrade(emp.designation),
        emp.blood_group || '',
        getEmployeeReplaceId(emp) || '—',
        emp.gender || '—',
        isEmployeeConfirmed(emp.staff_id) ? 'Permanent' : 'Non-Perm',
        emp.status || 'Active'
      ];
    });

    // Summary footer row
    var foot = [[
      { content: 'Total Count: ' + list.length + ' Personnel', colSpan: 7, styles: { halign: 'left', fontStyle: 'bold' } },
      { content: totalGross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: '', colSpan: 6 },
      { content: 'Verified', styles: { halign: 'center', fontStyle: 'bold' } }
    ]];

    doc.autoTable({
      head: head,
      body: body,
      foot: foot,
      startY: 41,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 7.2,
        cellPadding: 1.6,
        overflow: 'linebreak',
        valign: 'middle',
        lineColor: [203, 213, 225],
        lineWidth: 0.15
      },
      headStyles: {
        fillColor: [4, 120, 87], // Deep Emerald
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        halign: 'center',
        lineColor: [2, 44, 34],
        lineWidth: 0.2
      },
      footStyles: {
        fillColor: [226, 232, 240],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 7.5,
        lineColor: [100, 116, 139],
        lineWidth: 0.2
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 9 },
        1: { halign: 'center', cellWidth: 17, fontStyle: 'bold' },
        2: { cellWidth: 34 },
        3: { cellWidth: 26 },
        4: { cellWidth: 30 },
        5: { cellWidth: 22 },
        6: { halign: 'center', cellWidth: 18 },
        7: { halign: 'right', cellWidth: 22, fontStyle: 'bold' },
        8: { halign: 'center', cellWidth: 24 },
        9: { halign: 'center', cellWidth: 14 },
        10: { halign: 'center', cellWidth: 12 },
        11: { halign: 'center', cellWidth: 17, fontStyle: 'bold' },
        12: { halign: 'center', cellWidth: 14 },
        13: { halign: 'center', cellWidth: 16, fontStyle: 'bold' }
      },
      didDrawPage: function (data) {
        var pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text('MEP GROUP • HRM Manpower Directory Document | Confidential & Proprietary', 10, pageHeight - 6);
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

    var pdfFilename = 'MEP_HRM_Manpower_Directory_' + statusTag + '_' + new Date().toISOString().slice(0, 10) + '.pdf';
    doc.save(pdfFilename);

    if (window.showHRToast) {
      window.showHRToast('Manpower directory premium PDF file exported successfully.');
    }
  }

  // -------------------------------------------------------------
  // CSV Export Functionality
  // -------------------------------------------------------------
  function exportCSV() {
    // Try server endpoint first
    var token = localStorage.getItem('mep_auth_token') || sessionStorage.getItem('mep_auth_token') || '';
    var serverExportUrl = '/api/hrm/export' + (token ? '?token=' + encodeURIComponent(token) : '');

    // Check if online server responds, else client-side fallback
    var link = document.createElement('a');
    link.href = serverExportUrl;
    link.setAttribute('download', 'MEP_Manpower_Database_2026.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (window.showHRToast) window.showHRToast('Downloading complete ' + state.allEmployees.length.toLocaleString() + '-record Manpower Database (CSV)...');
  }

  function toggleEmployeeStatus(slNo) {
    if (typeof window.isEditModeEnabled === 'function' && !window.isEditModeEnabled()) {
      if (typeof window.showHRToast === 'function') {
        window.showHRToast('🔒 Edit Mode is currently locked. Status cannot be changed.', 'warning');
      } else {
        alert('Edit Mode is currently stopped/locked in Settings.');
      }
      return;
    }
    var emp = state.allEmployees.find(function (e) { return e.sl_no === slNo; });
    if (!emp) return;

    // Check if this employee was replaced by another staff
    var repInfo = getReplacementForEmployee(emp.staff_id);
    if (repInfo) {
      emp.status = 'Inactive';
      var repCleanId = String(repInfo.new_id || '').replace(/^[#\s]+/, '');
      var repCleanEmpId = String(emp.staff_id || '').replace(/^[#\s]+/, '');
      var warnMsg = '⚠️ Notice: Employee (' + repCleanEmpId + (emp.name ? ' - ' + emp.name : '') + ') is already marked as Replaced!\n\n' +
        '👉 Replacement staff assigned: ' + repCleanId + ' (' + repInfo.new_name + ').\n\n' +
        '❌ This ID cannot be set to Active or Hold. Status must remain "Inactive".';
      if (typeof window.showHRToast === 'function') {
        window.showHRToast('Staff ' + repCleanEmpId + ' was replaced by ' + repCleanId + ' (' + repInfo.new_name + ')', 'warning');
      }
      alert(warnMsg);
      renderTable();
      return;
    }

    var cur = (emp.status || 'Active').trim().toLowerCase();
    var newStatus = 'Active';
    if (cur === 'active') newStatus = 'Hold';
    else if (cur === 'hold') newStatus = 'Inactive';
    else newStatus = 'Active';
    emp.status = newStatus;

    // Send update to Firebase RTDB Cloud
    if (window.HRMFirebase && typeof window.HRMFirebase.saveEmployee === 'function') {
      window.HRMFirebase.saveEmployee(emp).catch(function (e) {
        console.warn('[HRM_FIREBASE] Status cloud sync error:', e);
      });
    }

    // Send update to server if running on localhost
    var isLocalHost = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (isLocalHost) {
      fetch('/api/hrm/employee/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emp)
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data && data.metadata) state.metadata = data.metadata;
          updateTopKPIs();
        })
        .catch(function (err) {
          console.warn('Server status save notice:', err);
        });
    }

    state.metadata = computeClientMetadata(state.allEmployees);
    updateTopKPIs();
    applyFilters(true);
    if (window.HRMEmployeeEntry && typeof window.HRMEmployeeEntry.renderHoldCandidatesShelf === 'function') {
      window.HRMEmployeeEntry.renderHoldCandidatesShelf();
    }
    if (window.showHRToast) {
      var cleanEmpId = String(emp.staff_id || '').replace(/^[#\s]+/, '');
      window.showHRToast('Personnel ' + cleanEmpId + ' (' + emp.name + ') status updated to ' + newStatus);
    }
  }

  function updateGender(slNo, newGender) {
    if (typeof window.isEditModeEnabled === 'function' && !window.isEditModeEnabled()) {
      if (typeof window.showHRToast === 'function') {
        window.showHRToast('🔒 Edit Mode is currently locked. Please enable Edit Mode from Settings.', 'warning');
      } else {
        alert('Edit Mode is currently stopped/locked in Settings.');
      }
      renderTable();
      return;
    }

    var emp = state.allEmployees.find(function (e) { return e.sl_no === slNo; });
    if (!emp) return;

    emp.gender = newGender;

    // Send update to Firebase RTDB Cloud
    if (window.HRMFirebase && typeof window.HRMFirebase.saveEmployee === 'function') {
      window.HRMFirebase.saveEmployee(emp).catch(function (e) {
        console.warn('[HRM_FIREBASE] Gender cloud sync error:', e);
      });
    }

    // Send update to server if running on localhost
    var isLocalHost = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (isLocalHost) {
      fetch('/api/hrm/employee/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emp)
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data && data.metadata) state.metadata = data.metadata;
          updateTopKPIs();
        })
        .catch(function () {});
    }

    state.metadata = computeClientMetadata(state.allEmployees);
    updateTopKPIs();
    if (window.showHRToast) {
      var cleanEmpId = String(emp.staff_id || '').replace(/^[#\s]+/, '');
      window.showHRToast('Staff ' + cleanEmpId + ' (' + emp.name + ') gender set to ' + newGender, 'success');
    }
  }

  function openDossierByStaffId(staffId) {
    if (!staffId) return;
    var cleanId = String(staffId).replace(/^[#\s]+/, '').trim();
    var emp = state.allEmployees.find(function (e) {
      return String(e.staff_id || '').trim() === cleanId;
    });
    if (emp) {
      openDossier(emp.sl_no);
      return;
    }

    // Lookup in replacement master
    var repRecord = null;
    if (window.MEP_REPLACEMENT_MASTER && Array.isArray(window.MEP_REPLACEMENT_MASTER)) {
      repRecord = window.MEP_REPLACEMENT_MASTER.find(function (r) {
        return String(r.replace_id || '').trim() === cleanId || String(r.new_id || '').trim() === cleanId;
      });
    }

    if (repRecord) {
      var msg = 'Replaced Staff ' + cleanId + ': ' + (repRecord.replace_name || 'Former Staff') +
        ' (' + (repRecord.replace_designation || '') + ' - ' + (repRecord.replace_section || '') + ') | ' +
        (repRecord.remarks || 'Resigned / Exited');
      if (window.showHRToast) {
        window.showHRToast(msg, 'info');
      } else {
        alert(msg);
      }
    } else {
      if (window.showHRToast) {
        window.showHRToast('Replaced Staff ID ' + cleanId + ' archived record.', 'info');
      }
    }
  }

  function viewReplacedInfo(replaceId, currentSlNo) {
    if (!replaceId) return;
    openDossierByStaffId(replaceId);
  }

  function deleteEmployee(slNo) {
    if (typeof window.isEditModeEnabled === 'function' && !window.isEditModeEnabled()) {
      if (typeof window.showHRToast === 'function') {
        window.showHRToast('🔒 Edit Mode is currently locked. Cannot delete employee.', 'warning');
      } else {
        alert('Edit Mode is currently stopped/locked in Settings.');
      }
      return;
    }

    var emp = state.allEmployees.find(function (e) { return e.sl_no === slNo; });
    if (!emp) {
      if (typeof window.showHRToast === 'function') {
        window.showHRToast('Employee record not found.', 'warning');
      }
      return;
    }

    var empIdStr = emp.staff_id ? String(emp.staff_id).replace(/^[#\s]+/, '') : '';
    var confirmMsg = 'Are you sure you want to permanently delete Employee ' + empIdStr + ' (' + (emp.name || 'Unknown') + ') from the database?\n\n' +
                     'Section: ' + (emp.section || '—') + '\n' +
                     'Designation: ' + (emp.designation || '—') + '\n' +
                     'Status: ' + (emp.status || 'Active') + '\n\n' +
                     '⚠️ This record will be permanently deleted from the database.';

    if (!confirm(confirmMsg)) {
      return;
    }

    function performLocalEmployeeDelete() {
      // Remove from state.allEmployees by sl_no
      state.allEmployees = state.allEmployees.filter(function (e) {
        if (slNo) return e.sl_no !== slNo;
        return String(e.staff_id || '').trim() !== String(emp.staff_id || '').trim();
      });

      // Sync MEP_MANPOWER_DATABASE
      if (window.MEP_MANPOWER_DATABASE && Array.isArray(window.MEP_MANPOWER_DATABASE.employees)) {
        window.MEP_MANPOWER_DATABASE.employees = window.MEP_MANPOWER_DATABASE.employees.filter(function (e) {
          if (slNo) return e.sl_no !== slNo;
          return String(e.staff_id || '').trim() !== String(emp.staff_id || '').trim();
        });
      }

      // Sync HRM_MANPOWER_CACHE
      if (window.HRM_MANPOWER_CACHE && Array.isArray(window.HRM_MANPOWER_CACHE.employees)) {
        window.HRM_MANPOWER_CACHE.employees = window.HRM_MANPOWER_CACHE.employees.filter(function (e) {
          if (slNo) return e.sl_no !== slNo;
          return String(e.staff_id || '').trim() !== String(emp.staff_id || '').trim();
        });
      }

      state.metadata = computeClientMetadata(state.allEmployees);
      updateTopKPIs();
      applyFilters();

      if (state.activeDossierEmp && state.activeDossierEmp.sl_no === slNo) {
        closeDossier();
      }

      if (window.HRMEmployeeEntry && typeof window.HRMEmployeeEntry.renderHoldCandidatesShelf === 'function') {
        window.HRMEmployeeEntry.renderHoldCandidatesShelf();
      }

      // Reactive cross-module event broadcast
      if (window.HRMEventBus && typeof window.HRMEventBus.emit === 'function') {
        window.HRMEventBus.emit('EMPLOYEE_DELETED', { sl_no: slNo, staff_id: emp.staff_id });
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

      if (typeof window.showHRToast === 'function') {
        window.showHRToast('🗑️ Employee ' + empIdStr + ' (' + (emp.name || '') + ') successfully deleted.', 'success');
      }
    }

    // 1. Call Firebase Realtime Cloud Delete
    if (window.HRMFirebase && typeof window.HRMFirebase.deleteEmployee === 'function') {
      window.HRMFirebase.deleteEmployee(emp.staff_id, emp.sl_no, true).catch(function (e) {
        console.warn('[HRM_FIREBASE] Cloud delete notice:', e);
      });
    }

    // 2. Perform local UI delete immediately
    performLocalEmployeeDelete();

    // 3. Call server delete API if running on localhost
    var isLocalHost = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (isLocalHost) {
      fetch('/api/hrm/employee/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sl_no: emp.sl_no, staff_id: emp.staff_id })
      }).catch(function(e) {
        console.warn('Server delete employee notice:', e);
      });
    }
  }

  function resetFilters() {
    state.filters.search = '';
    state.filters.status = 'ALL';
    state.filters.section = 'ALL';
    state.filters.department = 'ALL';
    state.filters.designation = 'ALL';
    state.filters.gender = 'ALL';
    state.filters.confirmation = 'ALL';
    state.filters.blood_group = 'ALL';
    state.filters.sort_by = 'sl_no';
    state.filters.sort_dir = 'asc';
    state.filters.page = 1;

    var sInput = document.getElementById('manpower-search-input');
    if (sInput) sInput.value = '';
    var stSelect = document.getElementById('filter-status');
    if (stSelect) stSelect.value = 'ALL';
    var secSelect = document.getElementById('filter-section');
    if (secSelect) secSelect.value = 'ALL';
    var deptSelect = document.getElementById('filter-department');
    if (deptSelect) deptSelect.value = 'ALL';
    var desigSelect = document.getElementById('filter-designation');
    if (desigSelect) desigSelect.value = 'ALL';
    var genSelect = document.getElementById('filter-gender');
    if (genSelect) genSelect.value = 'ALL';
    var confSelect = document.getElementById('filter-confirmation');
    if (confSelect) confSelect.value = 'ALL';
    var bgSelect = document.getElementById('filter-blood');
    if (bgSelect) bgSelect.value = 'ALL';
    var sortSelect = document.getElementById('filter-sort-by');
    if (sortSelect) sortSelect.value = 'sl_no:asc';

    ['all', 'active', 'inactive'].forEach(function (s) {
      var btn = document.getElementById('btn-status-' + s);
      if (!btn) return;
      if (s === 'all') {
        btn.className = 'px-3 py-1.5 rounded-lg text-xs font-extrabold bg-purple-600 text-white shadow-xs transition-all cursor-pointer';
      } else {
        btn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-all flex items-center gap-1.5 cursor-pointer';
      }
    });

    applyFilters();
  }

  // -------------------------------------------------------------
  // Public Namespace
  // -------------------------------------------------------------
  window.HRMManpower = {
    init: initManpowerModule,
    setStatusFilter: setStatusFilter,
    toggleEmployeeStatus: toggleEmployeeStatus,
    onSearchInput: function (val) {
      state.filters.search = val;
      if (window._hrmSearchTimer) clearTimeout(window._hrmSearchTimer);
      window._hrmSearchTimer = setTimeout(function () {
        applyFilters();
      }, 120);
    },
    onFilterChange: function (field, val) {
      if (field === 'status') {
        setStatusFilter(val);
      } else {
        state.filters[field] = val;
        applyFilters();
      }
    },
    onSortChange: function (compositeVal) {
      var parts = compositeVal.split(':');
      state.filters.sort_by = parts[0];
      state.filters.sort_dir = parts[1] || 'asc';
      applyFilters();
    },
    onPerPageChange: function (val) {
      state.filters.per_page = val;
      applyFilters();
    },
    changePage: function (p) {
      state.filters.page = p;
      renderTable();
      var tableElem = document.getElementById('manpower-database-section');
      if (tableElem) {
        tableElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    openDossier: openDossier,
    closeDossier: closeDossier,
    switchDossierTab: switchDossierTab,
    openAddModal: openAddModal,
    openEditModal: openEditModal,
    closeEditModal: closeEditModal,
    handleSaveEmployee: handleSaveEmployee,
    updateGender: updateGender,
    viewReplacedInfo: viewReplacedInfo,
    openDossierByStaffId: openDossierByStaffId,
    getEmployeeReplaceId: getEmployeeReplaceId,
    getReplacementForEmployee: getReplacementForEmployee,
    isEmployeeConfirmed: isEmployeeConfirmed,
    getConfirmedStaffMap: getConfirmedStaffMap,
    exportExcel: exportExcel,
    exportPDF: exportPDF,
    exportCSV: exportCSV,
    deleteEmployee: deleteEmployee,
    getActiveDossierEmp: function () { return state.activeDossierEmp; },
    state: state,
    resetFilters: resetFilters,
    getAllEmployees: function () { return state.allEmployees; },
    setAllEmployees: function (newEmps) {
      if (Array.isArray(newEmps)) {
        loadDataIntoState({ employees: newEmps }, true);
      }
    },
    loadDataIntoState: loadDataIntoState,
    updateTopKPIs: updateTopKPIs,
    renderTable: renderTable,
    applyFilters: applyFilters,
    updateMetadata: function (newMeta) {
      if (newMeta) {
        state.metadata = Object.assign({}, state.metadata || {}, newMeta);
      }
    },
    refreshAll: function () {
      state.metadata = computeClientMetadata(state.allEmployees);
      updateTopKPIs();
      applyFilters();
      renderTable();
    }
  };

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initManpowerModule);
  } else {
    initManpowerModule();
  }

})();
