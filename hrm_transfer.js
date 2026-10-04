/**
 * MEP GROUP - Enterprise Human Resource Management (HRM) Module
 * Inter Section Transfer Controller & Audit Log Register
 * Author: Antigravity AI / MEP Engineering Team
 */

(function () {
  'use strict';

  var state = {
    transfers: [],
    selectedEmployee: null,
    searchQuery: '',
    tableSearch: '',
    page: 1,
    perPage: 10
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
    'Fan Sala Shapla': 'bg-sky-500/10 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-500/25',
    'Fan Replace': 'bg-violet-500/10 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border-violet-500/25',
    'Fan Admin': 'bg-slate-500/10 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-500/25'
  };

  function getSectionBadge(secName) {
    if (!secName) return '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">Unassigned</span>';
    var colorClass = SECTION_COLORS[secName] || 'bg-indigo-500/10 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-500/25';
    return '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold border ' + colorClass + '">' + secName + '</span>';
  }

  function getAllEmployees() {
    if (window.MEP_MANPOWER_DATABASE && Array.isArray(window.MEP_MANPOWER_DATABASE.employees)) {
      return window.MEP_MANPOWER_DATABASE.employees;
    }
    return [];
  }

  function init() {
    // 1. Load cache from global window object
    if (Array.isArray(window.MEP_INTER_SECTION_TRANSFERS)) {
      state.transfers = window.MEP_INTER_SECTION_TRANSFERS.slice();
    }

    // 2. Fetch fresh transfers from server
    fetch('/api/hrm/transfers')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.success && Array.isArray(data.transfers)) {
          state.transfers = data.transfers;
          window.MEP_INTER_SECTION_TRANSFERS = data.transfers;
        }
        updateKPIs();
        renderTable();
      })
      .catch(function () {
        updateKPIs();
        renderTable();
      });

    // 3. Set default transfer date to today
    var dateInput = document.getElementById('transfer-date');
    if (dateInput && !dateInput.value) {
      var today = new Date().toISOString().split('T')[0];
      dateInput.value = today;
    }

    // 4. Close suggestions on click outside
    document.addEventListener('click', function (e) {
      var box = document.getElementById('transfer-suggestions-box');
      var input = document.getElementById('transfer-emp-search');
      if (box && input && !box.contains(e.target) && e.target !== input) {
        box.classList.add('hidden');
      }
    });

    updateKPIs();
    renderTable();
  }

  function render() {
    updateKPIs();
    renderTable();
  }

  function updateKPIs() {
    var totalCount = state.transfers.length;
    var badge = document.getElementById('sidebar-sub-transfer-count');
    if (badge) badge.textContent = totalCount;

    var kpiTotal = document.getElementById('transfer-kpi-total');
    if (kpiTotal) kpiTotal.textContent = totalCount;

    var tableCount = document.getElementById('transfer-table-count');
    if (tableCount) tableCount.textContent = totalCount + ' Transfers';

    // Count this month
    var now = new Date();
    var curMonthPrefix = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    var monthCount = 0;
    var sectionsInvolved = {};

    state.transfers.forEach(function (t) {
      if (t.transfer_date && t.transfer_date.indexOf(curMonthPrefix) === 0) {
        monthCount++;
      }
      if (t.from_section) sectionsInvolved[t.from_section] = true;
      if (t.to_section) sectionsInvolved[t.to_section] = true;
    });

    var kpiMonth = document.getElementById('transfer-kpi-month');
    if (kpiMonth) kpiMonth.textContent = monthCount;

    var kpiSections = document.getElementById('transfer-kpi-sections');
    if (kpiSections) {
      var numSecs = Object.keys(sectionsInvolved).length;
      kpiSections.textContent = numSecs > 0 ? numSecs : 11;
    }
  }

  function onSearchInput(val) {
    state.searchQuery = (val || '').trim();
    var clearBtn = document.getElementById('transfer-search-clear-btn');
    if (clearBtn) {
      if (state.searchQuery) {
        clearBtn.classList.remove('hidden');
      } else {
        clearBtn.classList.add('hidden');
      }
    }
    showSuggestions();
  }

  function showSuggestions() {
    var box = document.getElementById('transfer-suggestions-box');
    if (!box) return;

    var q = (state.searchQuery || '').toLowerCase();
    var all = getAllEmployees();

    // Filter active employees matching id or name
    var matches = all.filter(function (emp) {
      if (emp.is_hidden) return false;
      if (!q) return true; // Show top recent if empty
      var idStr = String(emp.staff_id || emp.id || '').replace(/^#/, '').toLowerCase();
      var nameStr = (emp.name || '').toLowerCase();
      return idStr.indexOf(q) !== -1 || nameStr.indexOf(q) !== -1;
    }).slice(0, 15);

    if (matches.length === 0) {
      box.innerHTML = '<div class="p-3 text-center text-xs text-slate-500 font-bold">No active employees found matching query</div>';
      box.classList.remove('hidden');
      return;
    }

    var html = '<div class="divide-y divide-slate-100 dark:divide-slate-800">';
    matches.forEach(function (emp) {
      var staffId = emp.staff_id || emp.id || '';
      var name = emp.name || 'Unnamed';
      var sec = emp.section || 'Unassigned';
      var desig = emp.designation || 'Worker';
      var status = emp.status || 'Active';
      var statusBadge = status.toLowerCase() === 'active' 
        ? '<span class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Active</span>'
        : '<span class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-100 text-slate-600 dark:bg-dark-800 dark:text-slate-400">' + status + '</span>';

      html += '<div class="p-2.5 hover:bg-indigo-50/80 dark:hover:bg-dark-800 cursor-pointer flex items-center justify-between transition-colors" onclick="window.HRMTransfer.selectEmployeeById(\'' + staffId + '\')">';
      html += '  <div class="flex items-center gap-2.5 min-w-0">';
      html += '    <div class="w-7 h-7 rounded-lg bg-indigo-600/10 text-indigo-700 dark:text-indigo-400 font-mono font-black flex items-center justify-center text-xs shrink-0">' + (name.charAt(0) || 'E') + '</div>';
      html += '    <div class="min-w-0">';
      html += '      <div class="flex items-center gap-1.5">';
      html += '        <span class="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">#' + staffId + '</span>';
      html += '        <span class="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">' + name + '</span>';
      html += '      </div>';
      html += '      <div class="text-[10px] text-slate-500 truncate">' + desig + ' • ' + sec + '</div>';
      html += '    </div>';
      html += '  </div>';
      html += '  <div class="shrink-0 pl-2">' + statusBadge + '</div>';
      html += '</div>';
    });
    html += '</div>';

    box.innerHTML = html;
    box.classList.remove('hidden');
  }

  function selectEmployeeById(staffId) {
    var all = getAllEmployees();
    var emp = null;
    for (var i = 0; i < all.length; i++) {
      if (String(all[i].staff_id || all[i].id).replace(/^#/, '').trim() === String(staffId).replace(/^#/, '').trim()) {
        emp = all[i];
        break;
      }
    }
    if (emp) {
      selectEmployee(emp);
    }
  }

  function selectEmployee(emp) {
    state.selectedEmployee = emp;

    var box = document.getElementById('transfer-suggestions-box');
    if (box) box.classList.add('hidden');

    var sInput = document.getElementById('transfer-emp-search');
    if (sInput) sInput.value = '#' + (emp.staff_id || emp.id) + ' — ' + (emp.name || '');

    var clearBtn = document.getElementById('transfer-search-clear-btn');
    if (clearBtn) clearBtn.classList.remove('hidden');

    var hiddenId = document.getElementById('transfer-hidden-staff-id');
    if (hiddenId) hiddenId.value = emp.staff_id || emp.id || '';

    var hiddenFrom = document.getElementById('transfer-hidden-from-sec');
    if (hiddenFrom) hiddenFrom.value = emp.section || '';

    // Show Preview Card
    var card = document.getElementById('transfer-emp-card');
    if (card) {
      var pId = document.getElementById('transfer-preview-id');
      var pName = document.getElementById('transfer-preview-name');
      var pDesig = document.getElementById('transfer-preview-desig');
      var pCurSec = document.getElementById('transfer-preview-current-sec');
      var pDoj = document.getElementById('transfer-preview-doj');
      var pStatus = document.getElementById('transfer-preview-status');
      var pAvatar = document.getElementById('transfer-preview-avatar');

      if (pId) pId.textContent = '#' + (emp.staff_id || emp.id);
      if (pName) pName.textContent = emp.name || 'Unnamed';
      if (pDesig) pDesig.textContent = (emp.designation || 'Worker') + ' • ' + (emp.department || 'Production');
      if (pCurSec) pCurSec.textContent = emp.section || 'Unassigned';
      if (pDoj) pDoj.textContent = emp.doj || 'N/A';
      if (pStatus) {
        pStatus.textContent = emp.status || 'Active';
        pStatus.className = (emp.status || 'Active').toLowerCase() === 'active'
          ? 'px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shrink-0'
          : 'px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-dark-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 shrink-0';
      }
      if (pAvatar) {
        pAvatar.textContent = (emp.name || 'E').substring(0, 2).toUpperCase();
      }

      card.classList.remove('hidden');
    }

    // Target section dropdown handling: disable current section
    var targetSelect = document.getElementById('transfer-target-section');
    if (targetSelect) {
      for (var j = 0; j < targetSelect.options.length; j++) {
        var opt = targetSelect.options[j];
        if (opt.value && opt.value.toLowerCase() === (emp.section || '').toLowerCase()) {
          opt.disabled = true;
          opt.textContent = opt.value + ' (Current Section)';
        } else {
          opt.disabled = false;
          opt.textContent = opt.value;
        }
      }
      // If currently selected is invalid, reset value
      if (targetSelect.value && targetSelect.value.toLowerCase() === (emp.section || '').toLowerCase()) {
        targetSelect.value = '';
      }
    }
  }

  function clearSearch() {
    state.selectedEmployee = null;
    var sInput = document.getElementById('transfer-emp-search');
    if (sInput) sInput.value = '';

    var clearBtn = document.getElementById('transfer-search-clear-btn');
    if (clearBtn) clearBtn.classList.add('hidden');

    var card = document.getElementById('transfer-emp-card');
    if (card) card.classList.add('hidden');

    var hiddenId = document.getElementById('transfer-hidden-staff-id');
    if (hiddenId) hiddenId.value = '';

    var hiddenFrom = document.getElementById('transfer-hidden-from-sec');
    if (hiddenFrom) hiddenFrom.value = '';

    var targetSelect = document.getElementById('transfer-target-section');
    if (targetSelect) {
      for (var j = 0; j < targetSelect.options.length; j++) {
        var opt = targetSelect.options[j];
        opt.disabled = false;
        opt.textContent = opt.value;
      }
    }
  }

  function resetForm() {
    clearSearch();
    var form = document.getElementById('transfer-execution-form');
    if (form) form.reset();

    var dateInput = document.getElementById('transfer-date');
    if (dateInput) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }
  }

  function submitTransfer() {
    var hiddenId = document.getElementById('transfer-hidden-staff-id');
    var staffId = hiddenId ? hiddenId.value.trim() : '';

    if (!staffId || !state.selectedEmployee) {
      if (typeof window.showHRToast === 'function') {
        window.showHRToast('অনুগ্রহ করে কর্মী নির্বাচন করুন (Step 1 Search & Select)', 'error');
      } else {
        alert('Please search and select an employee first.');
      }
      return;
    }

    var targetSelect = document.getElementById('transfer-target-section');
    var targetSection = targetSelect ? targetSelect.value.trim() : '';
    if (!targetSection) {
      if (typeof window.showHRToast === 'function') {
        window.showHRToast('অনুগ্রহ করে গন্তব্য সেকশন নির্বাচন করুন (Target Section)', 'error');
      } else {
        alert('Please select a target destination section.');
      }
      return;
    }

    var fromSection = state.selectedEmployee.section || '';
    if (fromSection.toLowerCase() === targetSection.toLowerCase()) {
      if (typeof window.showHRToast === 'function') {
        window.showHRToast('কর্মীটি ইতিমধ্যে এই সেকশনে আছেন। ভিন্ন সেকশন নির্বাচন করুন।', 'warning');
      } else {
        alert('Employee is already in this section. Please choose a different destination.');
      }
      return;
    }

    var transferDate = (document.getElementById('transfer-date') || {}).value || '';
    var memoNo = (document.getElementById('transfer-memo-no') || {}).value || '';
    var reason = (document.getElementById('transfer-reason') || {}).value || 'Line Balancing';
    var remarks = (document.getElementById('transfer-remarks') || {}).value || '';

    var submitBtn = document.getElementById('transfer-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="ph-bold ph-spinner animate-spin text-base"></i> Processing Transfer...';
    }

    var payload = {
      staff_id: staffId,
      target_section: targetSection,
      transfer_date: transferDate,
      reason: reason,
      memo_no: memoNo,
      remarks: remarks
    };

    fetch('/api/hrm/transfer/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="ph-bold ph-arrows-left-right text-base"></i> <span>Confirm &amp; Execute Transfer (বদলি নিশ্চিত করুন)</span>';
        }

        if (!data || !data.success) {
          throw new Error((data && data.error) || 'Transfer operation failed');
        }

        // 1. Prepend transfer record to local state
        if (data.transfer) {
          state.transfers.unshift(data.transfer);
          window.MEP_INTER_SECTION_TRANSFERS = state.transfers;

          // Sync to Firebase Cloud
          if (window.HRMFirebase && typeof window.HRMFirebase.saveTransfer === 'function') {
            window.HRMFirebase.saveTransfer(data.transfer);
          }
        }

        // 2. Update employee's section in memory database
        var all = getAllEmployees();
        for (var i = 0; i < all.length; i++) {
          if (String(all[i].staff_id || all[i].id).replace(/^#/, '').trim() === String(staffId).replace(/^#/, '').trim()) {
            all[i].section = targetSection;
            if (!Array.isArray(all[i].transfer_history)) {
              all[i].transfer_history = [];
            }
            if (data.transfer) {
              all[i].transfer_history.push(data.transfer);
            }
            break;
          }
        }

        // 3. Trigger Manpower Module refresh to sync section rosters & badges
        if (window.HRMManpower && typeof window.HRMManpower.init === 'function') {
          window.HRMManpower.init();
        }

        // 4. Update Manpower Summary if loaded
        if (window.HRMManpowerSummary && typeof window.HRMManpowerSummary.render === 'function') {
          window.HRMManpowerSummary.render();
        }

        if (typeof window.showHRToast === 'function') {
          window.showHRToast('কর্মী #' + staffId + ' (' + (state.selectedEmployee.name || '') + ') সফলভাবে ' + targetSection + ' এ বদলি সম্পন্ন হয়েছে!', 'success');
        }

        resetForm();
        updateKPIs();
        renderTable();
      })
      .catch(function (err) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="ph-bold ph-arrows-left-right text-base"></i> <span>Confirm &amp; Execute Transfer (বদলি নিশ্চিত করুন)</span>';
        }
        console.error('Transfer error:', err);
        if (typeof window.showHRToast === 'function') {
          window.showHRToast('বদলি ব্যর্থ হয়েছে: ' + err.message, 'error');
        } else {
          alert('Transfer failed: ' + err.message);
        }
      });
  }

  function revertTransfer(transferId) {
    if (!confirm('আপনি কি নিশ্চিত যে এই বদলিটি বাতিল করে কর্মীকে আগের সেকশনে ফেরত পাঠাতে চান?')) {
      return;
    }

    fetch('/api/hrm/transfer/revert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transfer_id: transferId })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data || !data.success) {
          throw new Error((data && data.error) || 'Revert failed');
        }

        // Find transfer record to determine previous section
        var targetT = null;
        for (var i = 0; i < state.transfers.length; i++) {
          if (state.transfers[i].id === transferId) {
            targetT = state.transfers[i];
            break;
          }
        }

        if (targetT) {
          var all = getAllEmployees();
          for (var j = 0; j < all.length; j++) {
            if (String(all[j].staff_id || all[j].id).replace(/^#/, '').trim() === String(targetT.staff_id).replace(/^#/, '').trim()) {
              all[j].section = targetT.from_section;
              break;
            }
          }
        }

        state.transfers = state.transfers.filter(function (t) { return t.id !== transferId; });
        window.MEP_INTER_SECTION_TRANSFERS = state.transfers;

        // Sync Revert to Firebase Cloud
        if (window.HRMFirebase && typeof window.HRMFirebase.revertTransfer === 'function') {
          window.HRMFirebase.revertTransfer(transferId, targetT ? targetT.staff_id : null, targetT ? targetT.from_section : null);
        }

        if (window.HRMManpower && typeof window.HRMManpower.init === 'function') {
          window.HRMManpower.init();
        }

        if (typeof window.showHRToast === 'function') {
          window.showHRToast(data.message || 'বদলি আদেশ সফলভাবে বাতিল ও কর্মী পুনর্বহাল করা হয়েছে।', 'success');
        }

        updateKPIs();
        renderTable();
      })
      .catch(function (err) {
        console.error('Revert error:', err);
        if (typeof window.showHRToast === 'function') {
          window.showHRToast('বাতিলকরণ ব্যর্থ: ' + err.message, 'error');
        } else {
          alert('Revert failed: ' + err.message);
        }
      });
  }

  function onTableSearch(val) {
    state.tableSearch = (val || '').trim().toLowerCase();
    state.page = 1;
    renderTable();
  }

  function renderTable() {
    var tbody = document.getElementById('transfer-table-tbody');
    if (!tbody) return;

    var filtered = state.transfers.filter(function (t) {
      if (!state.tableSearch) return true;
      var q = state.tableSearch;
      var corpus = [
        t.staff_id,
        t.name,
        t.from_section,
        t.to_section,
        t.reason,
        t.memo_no,
        t.transfer_date
      ].join(' ').toLowerCase();
      return corpus.indexOf(q) !== -1;
    });

    var total = filtered.length;
    var perPage = state.perPage;
    var totalPages = Math.ceil(total / perPage) || 1;
    if (state.page > totalPages) state.page = totalPages;
    if (state.page < 1) state.page = 1;

    var startIdx = (state.page - 1) * perPage;
    var paged = filtered.slice(startIdx, startIdx + perPage);

    var infoEl = document.getElementById('transfer-pagination-info');
    if (infoEl) {
      if (total === 0) {
        infoEl.textContent = 'Showing 0 of 0 records';
      } else {
        var endIdx = Math.min(startIdx + perPage, total);
        infoEl.textContent = 'Showing ' + (startIdx + 1) + ' to ' + endIdx + ' of ' + total + ' records';
      }
    }

    // Pagination buttons
    var btnsEl = document.getElementById('transfer-pagination-btns');
    if (btnsEl) {
      var btnsHtml = '';
      if (totalPages > 1) {
        btnsHtml += '<button type="button" onclick="window.HRMTransfer.setPage(' + (state.page - 1) + ')" ' + (state.page <= 1 ? 'disabled class="px-2 py-1 rounded text-xs text-slate-400 bg-slate-100 dark:bg-dark-800 cursor-not-allowed"' : 'class="px-2 py-1 rounded text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-dark-700 hover:bg-indigo-600 hover:text-white cursor-pointer"') + '>&larr; Prev</button>';
        btnsHtml += '<span class="px-2 text-xs font-mono font-bold text-slate-600 dark:text-slate-300">Page ' + state.page + ' of ' + totalPages + '</span>';
        btnsHtml += '<button type="button" onclick="window.HRMTransfer.setPage(' + (state.page + 1) + ')" ' + (state.page >= totalPages ? 'disabled class="px-2 py-1 rounded text-xs text-slate-400 bg-slate-100 dark:bg-dark-800 cursor-not-allowed"' : 'class="px-2 py-1 rounded text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-dark-700 hover:bg-indigo-600 hover:text-white cursor-pointer"') + '>Next &rarr;</button>';
      }
      btnsEl.innerHTML = btnsHtml;
    }

    if (paged.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-slate-400 text-xs font-bold">No transfer records found. Transfer employees using the form on the left.</td></tr>';
      return;
    }

    var html = '';
    paged.forEach(function (t, idx) {
      var sl = startIdx + idx + 1;
      var dateStr = t.transfer_date || 'N/A';
      var staffId = t.staff_id || '';
      var name = t.name || 'Unnamed';
      var desig = t.designation || '';
      var fromSecBadge = getSectionBadge(t.from_section);
      var toSecBadge = getSectionBadge(t.to_section);
      var reason = t.reason || 'Reallocation';
      var memo = t.memo_no ? '<span class="font-mono text-[10px] text-slate-400 block mt-0.5">Memo: ' + t.memo_no + '</span>' : '';

      html += '<tr class="hover:bg-slate-50 dark:hover:bg-dark-800/60 transition-colors">';
      html += '  <td class="py-2.5 px-3 text-center font-mono text-slate-400">' + sl + '</td>';
      html += '  <td class="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">' + dateStr + '</td>';
      html += '  <td class="py-2.5 px-3 min-w-[160px]">';
      html += '    <div class="flex items-center gap-1.5">';
      html += '      <span class="font-mono font-bold text-indigo-600 dark:text-indigo-400">#' + staffId + '</span>';
      html += '      <span class="font-black text-slate-900 dark:text-white">' + name + '</span>';
      html += '    </div>';
      if (desig) {
        html += '    <span class="text-[10px] text-slate-400 block">' + desig + '</span>';
      }
      html += '  </td>';
      html += '  <td class="py-2.5 px-3 text-center whitespace-nowrap">';
      html += '    <div class="flex items-center justify-center gap-1.5">';
      html += '      ' + fromSecBadge;
      html += '      <i class="ph-bold ph-arrow-right text-indigo-500 text-xs"></i>';
      html += '      ' + toSecBadge;
      html += '    </div>';
      html += '  </td>';
      html += '  <td class="py-2.5 px-3 min-w-[140px]">';
      html += '    <span class="font-bold text-slate-700 dark:text-slate-300">' + reason + '</span>';
      html += '    ' + memo;
      html += '  </td>';
      html += '  <td class="py-2.5 px-3 text-center whitespace-nowrap">';
      html += '    <button type="button" onclick="window.HRMTransfer.revertTransfer(\'' + t.id + '\')" class="px-2 py-1 rounded-md text-[10px] font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-300 dark:border-rose-800 transition cursor-pointer" title="Revert this transfer and restore employee to original section">';
      html += '      <i class="ph-bold ph-arrow-u-up-left"></i> Revert';
      html += '    </button>';
      html += '  </td>';
      html += '</tr>';
    });

    tbody.innerHTML = html;
  }

  function setPage(p) {
    state.page = p;
    renderTable();
  }

  function exportExcel() {
    if (typeof XLSX === 'undefined') {
      alert('XLSX library not loaded. Please try again.');
      return;
    }

    var headers = ['SL', 'Transfer ID', 'Transfer Date', 'Staff ID', 'Employee Name', 'Designation', 'Department', 'From Section', 'To Section', 'Reason', 'Memo No', 'Remarks', 'Status'];
    var rows = [headers];

    state.transfers.forEach(function (t, idx) {
      rows.push([
        idx + 1,
        t.id || '',
        t.transfer_date || '',
        t.staff_id || '',
        t.name || '',
        t.designation || '',
        t.department || '',
        t.from_section || '',
        t.to_section || '',
        t.reason || '',
        t.memo_no || '',
        t.remarks || '',
        t.status || 'Completed'
      ]);
    });

    var ws = XLSX.utils.aoa_to_sheet(rows);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'InterSectionTransfers');

    var fileName = 'MEP_Inter_Section_Transfers_' + new Date().toISOString().split('T')[0] + '.xlsx';
    XLSX.writeFile(wb, fileName);
  }

  function exportCSV() {
    var headers = ['SL', 'Transfer ID', 'Transfer Date', 'Staff ID', 'Employee Name', 'Designation', 'From Section', 'To Section', 'Reason', 'Memo No'];
    var lines = [headers.join(',')];

    state.transfers.forEach(function (t, idx) {
      lines.push([
        idx + 1,
        '"' + (t.id || '') + '"',
        '"' + (t.transfer_date || '') + '"',
        '"' + (t.staff_id || '') + '"',
        '"' + (t.name || '') + '"',
        '"' + (t.designation || '') + '"',
        '"' + (t.from_section || '') + '"',
        '"' + (t.to_section || '') + '"',
        '"' + (t.reason || '') + '"',
        '"' + (t.memo_no || '') + '"'
      ].join(','));
    });

    var blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'MEP_Inter_Section_Transfers_' + new Date().toISOString().split('T')[0] + '.csv';
    link.click();
  }

  function printRegister() {
    var printWindow = window.open('', '_blank');
    if (!printWindow) return;

    var rowsHtml = '';
    state.transfers.forEach(function (t, idx) {
      rowsHtml += '<tr>';
      rowsHtml += '<td style="border:1px solid #999;padding:6px;text-align:center;">' + (idx + 1) + '</td>';
      rowsHtml += '<td style="border:1px solid #999;padding:6px;text-align:center;">' + (t.transfer_date || '') + '</td>';
      rowsHtml += '<td style="border:1px solid #999;padding:6px;text-align:center;">#' + (t.staff_id || '') + '</td>';
      rowsHtml += '<td style="border:1px solid #999;padding:6px;">' + (t.name || '') + '</td>';
      rowsHtml += '<td style="border:1px solid #999;padding:6px;">' + (t.designation || '') + '</td>';
      rowsHtml += '<td style="border:1px solid #999;padding:6px;font-weight:bold;">' + (t.from_section || '') + '</td>';
      rowsHtml += '<td style="border:1px solid #999;padding:6px;font-weight:bold;color:#4f46e5;">' + (t.to_section || '') + '</td>';
      rowsHtml += '<td style="border:1px solid #999;padding:6px;">' + (t.reason || '') + '</td>';
      rowsHtml += '<td style="border:1px solid #999;padding:6px;text-align:center;">' + (t.memo_no || '-') + '</td>';
      rowsHtml += '</tr>';
    });

    var html = '<!DOCTYPE html><html><head><title>MEP Inter Section Transfer Register</title><style>body{font-family:sans-serif;padding:20px;} table{width:100%;border-collapse:collapse;margin-top:15px;font-size:11px;} th{border:1px solid #666;padding:8px;background:#f3f4f6;} h2,h4{margin:4px 0;text-align:center;}</style></head><body>';
    html += '<h2>MEP GROUP — FAN DIVISION (PLANT 1027)</h2>';
    html += '<h4>INTER SECTION PERSONNEL TRANSFER REGISTER (কর্মীবদলি রেজিস্টার)</h4>';
    html += '<p style="font-size:10px;text-align:center;color:#666;">Generated on: ' + new Date().toLocaleString() + ' | Total Transfers: ' + state.transfers.length + '</p>';
    html += '<table><thead><tr><th>SL</th><th>Date</th><th>Staff ID</th><th>Name</th><th>Designation</th><th>From Section</th><th>To Section</th><th>Reason</th><th>Memo No</th></tr></thead><tbody>' + rowsHtml + '</tbody></table>';
    html += '</body></html>';

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(function () { printWindow.print(); }, 250);
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose to window
  window.HRMTransfer = {
    init: init,
    render: render,
    onSearchInput: onSearchInput,
    showSuggestions: showSuggestions,
    selectEmployeeById: selectEmployeeById,
    selectEmployee: selectEmployee,
    clearSearch: clearSearch,
    resetForm: resetForm,
    submitTransfer: submitTransfer,
    revertTransfer: revertTransfer,
    onTableSearch: onTableSearch,
    setPage: setPage,
    exportExcel: exportExcel,
    exportCSV: exportCSV,
    printRegister: printRegister
  };

})();
