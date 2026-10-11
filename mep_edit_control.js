/**
 * MEP FAN LTD — Universal System Settings & Scoped Edit Lock Controller
 * 
 * Provides UNIQUE, INDEPENDENT Edit Mode ON / OFF for every individual module and page:
 * - When OFF (Stopped): All Edit, Delete, and Add buttons in that module are locked & hidden.
 * - When ON (Active): Full editing permissions for that module are restored.
 * - Password verification required to change settings or toggle edit mode!
 * - Each module's state is persisted independently in localStorage ('mep_edit_mode_<scope>').
 * - Dynamic O(1) synchronization on tab/hash change with zero UI lag.
 * - Global Settings Modal allows managing each module independently or bulk toggling.
 */

(function () {
  'use strict';

  // ================= MODULE SCOPE REGISTRY =================
  const MODULE_CATEGORIES = {
    erp: { title: 'ERP Production Reports', bn: 'ইআরপি উৎপাদন রিপোর্ট', icon: 'ph-chart-bar' },
    physical: { title: 'Physical Plant Production', bn: 'ফিজিক্যাল ফ্যান উৎপাদন', icon: 'ph-fan' },
    shop: { title: 'Factory Shop Floor', bn: 'ফ্যাক্টরি শপ ফ্লোর', icon: 'ph-factory' },
    bom: { title: 'BOM & Technical Specs', bn: 'বিল অব মেটেরিয়ালস ও রেসিপি', icon: 'ph-blueprint' },
    warehouse: { title: 'Warehouse & Materials Hub', bn: 'ওয়্যারহাউস ও কাঁচামাল', icon: 'ph-warehouse' },
    admin: { title: 'HRM, Quality & Commercial', bn: 'এইচআরএম, কোয়ালিটি ও সেলস', icon: 'ph-shield-check' }
  };

  const MODULE_SCOPES = [
    // 1. ERP Production Group
    { id: 'erp_daywise', name: 'ERP Day-Wise Production', bn: 'ইআরপি দৈনিক উৎপাদন (৩১ দিন)', category: 'erp', icon: 'ph-calendar-blank', url: 'app_dashboard.html#erp_daywise' },
    { id: 'erp_monthwise', name: 'ERP Month-Wise Matrix', bn: 'ইআরপি মাসিক উৎপাদন ম্যাট্রিক্স', category: 'erp', icon: 'ph-chart-bar', url: 'app_dashboard.html#erp_monthwise' },
    { id: 'erp_yearwise', name: 'ERP Multi-Year Production', bn: 'ইআরপি বাৎসরিক উৎপাদন ট্রেন্ড', category: 'erp', icon: 'ph-trend-up', url: 'app_dashboard.html#erp_yearwise' },

    // 2. Physical Plant Production Group
    { id: 'physical_daywise', name: 'Physical Day-Wise Output', bn: 'ফিজিক্যাল দৈনিক উৎপাদন (৩১ দিন)', category: 'physical', icon: 'ph-fan', url: 'app_dashboard.html#physical_daywise' },
    { id: 'physical_daily_entry', name: 'Physical Daily Entry Sheet', bn: 'ফিজিক্যাল দৈনিক আউটপুট এন্ট্রি', category: 'physical', icon: 'ph-note-pencil', url: 'app_dashboard.html#physical_daily_entry' },
    { id: 'physical_monthwise', name: 'Physical Month-Wise Output', bn: 'ফিজিক্যাল মাসিক উৎপাদন ও অ্যাচিভমেন্ট', category: 'physical', icon: 'ph-chart-line-up', url: 'app_dashboard.html#physical_monthwise' },
    { id: 'physical_yearly', name: 'Physical Multi-Year Output', bn: 'ফিজিক্যাল বাৎসরিক উৎপাদন ট্রেন্ড', category: 'physical', icon: 'ph-chart-pie', url: 'app_dashboard.html#physical_yearly' },

    // 3. Factory Shop Floor Group
    { id: 'die_casting_production', name: 'Die Casting Production', bn: 'ডাই কাস্টিং উৎপাদন ও ট্র্যাকিং', category: 'shop', icon: 'ph-fire', url: 'die_casting_production.html' },
    { id: 'stamping_production', name: 'Stamping Production', bn: 'স্ট্যাম্পিং প্রেস উৎপাদন রিপোর্ট', category: 'shop', icon: 'ph-gear', url: 'stamping_production.html' },
    { id: 'stamping_die', name: 'Stamping Die & Tooling', bn: 'স্ট্যাম্পিং ডাই ও টুলস রক্ষণাবেক্ষণ', category: 'shop', icon: 'ph-wrench', url: 'stamping_die.html' },
    { id: 'crucible_consumption', name: 'Crucible Consumption', bn: 'ক্রুসিবল লাইফ ও মেটাল গলানো', category: 'shop', icon: 'ph-drop', url: 'crucible_consumption.html' },

    // 4. Technical BOM Group
    { id: 'bom', name: 'BOM Master Registry', bn: 'বিল অব মেটেরিয়ালস মাস্টার রেজিস্ট্রি', category: 'bom', icon: 'ph-tree-structure', url: 'app_dashboard.html#bom' },
    { id: 'manual_fg_bom', name: 'Manual FG BOM Spec', bn: 'ম্যানুয়াল ফিনিশড গুডস বিওএম', category: 'bom', icon: 'ph-blueprint', url: 'app_dashboard.html#manual_fg_bom' },

    // 5. Warehouse & Materials Hub
    { id: 'warehouse', name: 'Warehouse Closing Stock', bn: 'ওয়্যারহাউস সমাপনী মজুদ (৯১২২৩)', category: 'warehouse', icon: 'ph-warehouse', url: 'warehouse.html' },
    { id: 'material_list', name: 'Raw Material Master', bn: 'কাঁচামাল মাস্টার রেজিস্ট্রি', category: 'warehouse', icon: 'ph-list-bullets', url: 'app_dashboard.html#material_list' },
    { id: 'fg_sfg_list', name: 'FG & SFG Master Catalog', bn: 'এফজি ও এসএফজি মাস্টার ক্যাটালগ', category: 'warehouse', icon: 'ph-package', url: 'app_dashboard.html#fg_sfg_list' },
    { id: 'materials_received', name: 'Materials Received & Demand', bn: 'ম্যাটেরিয়াল রিসিভ ও সেকশন ডিমান্ড', category: 'warehouse', icon: 'ph-truck', url: 'app_dashboard.html#materials_received' },
    { id: 'production_possible', name: 'Production Feasibility (61)', bn: 'উৎপাদন সম্ভাব্যতা বিশ্লেষণ (৬১ আইটেম)', category: 'warehouse', icon: 'ph-lightning', url: 'app_dashboard.html#production_possible' },
    { id: 'rm_valuation', name: 'RM Stock Valuation & Cost', bn: 'কাঁচামাল ইনভেন্টরি ভ্যালুয়েশন', category: 'warehouse', icon: 'ph-currency-circle-dollar', url: 'app_dashboard.html#rm_valuation' },
    { id: 'spare_parts', name: 'Spare Parts Inventory', bn: 'মেশিন স্পেয়ার পার্টস স্টক ও ডেলিভারি', category: 'warehouse', icon: 'ph-nut', url: 'spare_parts.html' },

    // 6. HRM, QA, Commercial & Overview
    { id: 'hrm', name: 'HRM & Manpower Database', bn: 'এইচআরএম কর্মকর্তা ও কর্মচারী ডাটাবেস', category: 'admin', icon: 'ph-users-three', url: 'hrm.html' },
    { id: 'rejection', name: 'Rejection & QA Records', bn: 'ফ্যান রিজেকশন ও মান নিয়ন্ত্রণ রিপোর্ট', category: 'admin', icon: 'ph-shield-warning', url: 'rejection.html' },
    { id: 'sales', name: 'Sales & Delivery Master', bn: 'সেলস অর্ডার বনাম ডেলিভারি রিপোর্ট', category: 'admin', icon: 'ph-shopping-cart', url: 'sales.html' },
    { id: 'market_return', name: 'Market Return & Warranty', bn: 'মার্কেট রিটার্ন ও ওয়ারেন্টি ট্র্যাকিং', category: 'admin', icon: 'ph-arrow-u-down-left', url: 'market_return.html' },
    { id: 'inter_sales_report', name: 'Inter-Company Challan', bn: 'আন্তঃকোম্পানি চালান ও ডেলিভারি রিপোর্ট', category: 'admin', icon: 'ph-receipt', url: 'app_dashboard.html#inter_sales_report' },
    { id: 'dynamic_summary', name: 'Requisition Studio', bn: 'ডাইনামিক রিকুইজিশন স্টুডিও ও চার্ট', category: 'admin', icon: 'ph-sliders-horizontal', url: 'app_dashboard.html#dynamic_summary' },
    { id: 'dashboard', name: 'Executive Overview', bn: 'এক্সিকিউটিভ প্রোডাকশন ড্যাশবোর্ড', category: 'admin', icon: 'ph-squares-four', url: 'app_dashboard.html#dashboard' }
  ];

  window.MEP_MODULE_SCOPES = MODULE_SCOPES;
  window.MEP_MODULE_CATEGORIES = MODULE_CATEGORIES;

  function getScopeMeta(scopeId) {
    if (!scopeId) return null;
    return MODULE_SCOPES.find(m => m.id === scopeId) || {
      id: scopeId,
      name: scopeId.replace(/_/g, ' ').toUpperCase(),
      bn: scopeId,
      category: 'erp',
      icon: 'ph-app-window'
    };
  }

  // ================= INJECT GLOBAL STYLES =================
  const styleEl = document.createElement('style');
  styleEl.id = 'mep-edit-control-styles';
  styleEl.textContent = `
    /* Universal selectors hidden when edit mode is locked */
    html.edit-mode-off .mep-edit-btn,
    html.edit-mode-off .mep-delete-btn,
    html.edit-mode-off .mep-add-btn,
    html.edit-mode-off #btn-add-monthly-production,
    html.edit-mode-off #btn-edit-monthly-production,
    html.edit-mode-off #btn-cru-edit-entry,
    html.edit-mode-off [data-mep-edit="true"],
    html.edit-mode-off [data-mep-add="true"],
    html.edit-mode-off [data-mep-delete="true"],
    html.edit-mode-off [onclick*="openAddMonthlyProductionModal"],
    html.edit-mode-off [onclick*="openAddCrucibleModal"],
    html.edit-mode-off [onclick*="openAddReturnModal"],
    html.edit-mode-off [onclick*="openEditSalesVsReturnModal"],
    html.edit-mode-off [onclick*="openEmployeeModal"],
    html.edit-mode-off [onclick*="openAddEmployeeModal"],
    html.edit-mode-off [onclick*="openAddSpareModal"],
    html.edit-mode-off [onclick*="editCrucibleRecord"],
    html.edit-mode-off [onclick*="deleteCrucibleRecord"],
    html.edit-mode-off [onclick*="editEmployee"],
    html.edit-mode-off [onclick*="deleteEmployee"],
    html.edit-mode-off [onclick*="editSparePart"],
    html.edit-mode-off [onclick*="deleteSparePart"],
    html.edit-mode-off [onclick*="editProduction"],
    html.edit-mode-off [onclick*="deleteProduction"],
    html.edit-mode-off #entry-submit-btn,
    html.edit-mode-off [onclick*="openAddMaterialModal"],
    html.edit-mode-off [onclick*="openAddFgSfgModal"],
    html.edit-mode-off [onclick*="openEditMaterialModal"],
    html.edit-mode-off [onclick*="openEditFgSfgModal"],
    html.edit-mode-off [onclick*="openSectionReceiveModal"],
    html.edit-mode-off [onclick*="openAddEntryModal"],
    html.edit-mode-off [onclick*="deleteEntryLog"],
    html.edit-mode-off [onclick*="openDateRangeManagementModal"],
    html.edit-mode-off [onclick*="openEditBomItemModal"],
    html.edit-mode-off [onclick*="deleteBomItem"],
    html.edit-mode-off [onclick*="deleteManualBomItem"],
    html.edit-mode-off [onclick*="openAddFGItemModal"],
    html.edit-mode-off [onclick*="openEditFGItemModal"],
    html.edit-mode-off [onclick*="deleteProductionCatalogItem"],
    html.edit-mode-off #daywiseEditToggleBtn,
    html.edit-mode-off #monthwiseEditToggleBtn,
    html.edit-mode-off [onclick*="toggleDaywiseEditMode"],
    html.edit-mode-off [onclick*="toggleMonthwiseEditMode"],
    html.edit-mode-off [onclick*="promptQuickCellEdit"],
    html.edit-mode-off [onclick*="promptQuickMonthwiseCellEdit"],
    html.edit-mode-off [onclick*="resetDaywiseProductionData"],
    html.edit-mode-off [onclick*="resetMonthwiseUserOverrides"],
    html.edit-mode-off [onclick*="openManageFGItemsModal"],
    html.edit-mode-off [onclick*="openSalesSyncModal"],
    html.edit-mode-off #btn-edit-summary,
    html.edit-mode-off [onclick*="HRMManpower.openAddModal"],
    html.edit-mode-off [onclick*="HRMManpower.openEditModal"],
    html.edit-mode-off [onclick*="HRMManpowerSummary.toggleEditMode"],
    html.edit-mode-off [onclick*="openDossier"] + button,
    html.edit-mode-off #employee-edit-modal,
    html.edit-mode-off #modal-sd-record,
    html.edit-mode-off [onclick*="openAddRecordModal"],
    html.edit-mode-off [onclick*="openEditRecordModal"],
    html.edit-mode-off [onclick*="promptDeleteRecord"],
    [data-edit-mode="off"] .mep-edit-btn,
    [data-edit-mode="off"] .mep-delete-btn,
    [data-edit-mode="off"] .mep-add-btn,
    [data-edit-mode="off"] [data-mep-edit="true"],
    [data-edit-mode="off"] [data-mep-add="true"],
    [data-edit-mode="off"] [data-mep-delete="true"] {
      display: none !important;
    }

    html.edit-mode-off [onclick*="toggleEmployeeStatus"],
    html.edit-mode-off [onclick*="quickCycleStatus"],
    html.edit-mode-off select.mep-gender-select,
    html.edit-mode-off .mep-gender-select {
      pointer-events: none !important;
      cursor: not-allowed !important;
      opacity: 0.65 !important;
    }

    .mep-locked-badge {
      display: none !important;
    }
    html.edit-mode-off .mep-locked-badge,
    [data-edit-mode="off"] .mep-locked-badge {
      display: inline-flex !important;
    }

    .edit-mode-banner {
      display: none;
    }
    html.edit-mode-off .edit-mode-banner {
      display: flex !important;
    }

    /* Modal shake for invalid password */
    @keyframes mepModalShake {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-6px); }
      40%, 80% { transform: translateX(6px); }
    }
    .mep-shake {
      animation: mepModalShake 0.4s ease-in-out;
    }

    /* Custom scrollbar for settings module matrix */
    #settings-modules-list-container::-webkit-scrollbar {
      width: 5px;
    }
    #settings-modules-list-container::-webkit-scrollbar-track {
      background: rgba(0,0,0,0.03);
    }
    #settings-modules-list-container::-webkit-scrollbar-thumb {
      background: rgba(148, 163, 184, 0.4);
      border-radius: 9999px;
    }
  `;
  document.head.appendChild(styleEl);

  // ================= SCOPE DETECTION =================
  function normalizeTabToScope(tab) {
    if (!tab) return 'erp_daywise';
    const t = String(tab).trim().toLowerCase();
    if (t === 'erp_daywise' || t === 'erp_daywise_monthly') return 'erp_daywise';
    if (t === 'erp_monthwise' || t === 'erp_monthwise_yearly' || t === 'erp_production') return 'erp_monthwise';
    if (t === 'erp_yearwise' || t === 'erp_yearly') return 'erp_yearwise';
    if (t === 'physical_daywise' || t === 'physical_production' || t === 'physical_cf_body' || t === 'physical_cf_blade') return 'physical_daywise';
    if (t === 'physical_daily_entry' || t === 'physical_entry_sheet') return 'physical_daily_entry';
    if (t === 'physical_monthwise' || t === 'achievement' || t === 'physical_achievement') return 'physical_monthwise';
    if (t === 'physical_yearly') return 'physical_yearly';
    if (t === 'bom' || t === 'registry') return 'bom';
    if (t === 'manual_fg_bom') return 'manual_fg_bom';
    if (t === 'sfg_bom' || t === 'fg_bom_picture' || t === 'all_sfg_picture') return 'bom';
    if (t === 'inventory') return 'warehouse';
    if (t === 'material_list') return 'material_list';
    if (t === 'fg_sfg_list') return 'fg_sfg_list';
    if (t === 'production_possible') return 'production_possible';
    if (t === 'rm_valuation') return 'rm_valuation';
    if (t === 'materials_received' || t === 'receive_entry' || t === 'receive_vs_demand') return 'materials_received';
    if (t === 'inter_sales_report' || t === 'calan' || t === 'inter_company') return 'inter_sales_report';
    if (t === 'dynamic_summary' || t === 'requisition_analytics') return 'dynamic_summary';
    if (t === 'dashboard') return 'dashboard';
    return t;
  }

  window.getCurrentEditScope = function () {
    // 1. Explicit data attribute on html or body
    const explicit = document.documentElement.dataset.editScope || (document.body && document.body.dataset.editScope);
    if (explicit) return explicit;

    // 2. Standalone HTML file path detection
    const path = (window.location.pathname || '').toLowerCase();
    const hash = (window.location.hash || '').replace('#', '').toLowerCase();

    if (path.includes('crucible_consumption')) return 'crucible_consumption';
    if (path.includes('die_casting_production')) return 'die_casting_production';
    if (path.includes('stamping_production')) return 'stamping_production';
    if (path.includes('stamping_die')) return 'stamping_die';
    if (path.includes('spare_parts')) return 'spare_parts';
    if (path.includes('market_return')) return 'market_return';
    if (path.includes('rejection')) return 'rejection';
    if (path.includes('sales')) return 'sales';
    if (path.includes('hrm') || path.includes('manpower')) return 'hrm';
    if (path.includes('warehouse')) {
      if (hash === 'material_list') return 'material_list';
      if (hash === 'fg_sfg_list') return 'fg_sfg_list';
      if (hash === 'rm_valuation') return 'rm_valuation';
      return 'warehouse';
    }

    // 3. Cockpit app_dashboard.html (or index.html) tabs
    if (window.currentTab) {
      return normalizeTabToScope(window.currentTab);
    }
    if (hash) {
      return normalizeTabToScope(hash);
    }
    try {
      const savedTab = localStorage.getItem('mep_active_tab');
      if (savedTab) return normalizeTabToScope(savedTab);
    } catch (e) {}

    return 'erp_daywise';
  };

  // ================= READ / WRITE SCOPED EDIT STATE =================
  window.isEditModeEnabled = function (scope) {
    const targetScope = scope || window.getCurrentEditScope();
    try {
      // 1. Check module-specific setting
      const scopedVal = localStorage.getItem('mep_edit_mode_' + targetScope);
      if (scopedVal !== null) {
        return scopedVal === 'true';
      }
      // 2. Fallback to global setting if present, otherwise default to true (active)
      const globalVal = localStorage.getItem('mep_global_edit_mode');
      if (globalVal !== null) {
        return globalVal === 'true';
      }
      return true;
    } catch (e) {
      return true;
    }
  };

  // Get map of all modules and their edit status
  window.getAllModuleEditStates = function () {
    const states = {};
    MODULE_SCOPES.forEach(m => {
      states[m.id] = window.isEditModeEnabled(m.id);
    });
    return states;
  };

  // State tracker for pending change while password prompt is open
  let pendingTargetEditState = null;
  let pendingTargetScope = null;

  // Master credentials validator
  function isValidAdminPassword(input) {
    if (!input) return false;
    const trimmed = String(input).trim();
    const customPass = localStorage.getItem('mep_admin_edit_password');
    if (customPass && trimmed === customPass.trim()) return true;

    // Default authorized passwords for MEP ERP
    const validList = [
      'Saiful@3746',
      'saiful@3746',
      '3746',
      'Saiful',
      'saiful',
      'mep2026',
      'MEP2026',
      'admin'
    ];
    return validList.includes(trimmed);
  }

  // ================= TOGGLE SYSTEM EDIT MODE (SCOPED) =================
  window.toggleSystemEditMode = function (enable, bypassPassword, targetScope) {
    const scope = targetScope || window.getCurrentEditScope();
    const currentEnabled = window.isEditModeEnabled(scope);
    const targetEnabled = enable !== undefined ? Boolean(enable) : !currentEnabled;

    // If trying to set to the exact same state without bypass, sync UI and return
    if (targetEnabled === currentEnabled && bypassPassword !== true) {
      applyEditModeUI(window.getCurrentEditScope());
      return;
    }

    // Require password if not bypassed!
    if (bypassPassword !== true) {
      // Revert checkboxes on page back to currentEnabled until password verified
      updateAllTogglesForScope(scope, currentEnabled);

      // Prompt for password
      pendingTargetScope = scope;
      pendingTargetEditState = targetEnabled;
      openPasswordPromptModal(targetEnabled, scope);
      return;
    }

    // Password verified: commit change to specific module key
    try {
      localStorage.setItem('mep_edit_mode_' + scope, targetEnabled ? 'true' : 'false');
    } catch (e) {}

    // Apply UI state for current view
    applyEditModeUI(window.getCurrentEditScope());

    // Dispatch scoped event for reactive UI
    window.dispatchEvent(new CustomEvent('mep:edit-mode-changed', {
      detail: { scope: scope, enabled: targetEnabled }
    }));

    // Show feedback toast with specific module name
    const meta = getScopeMeta(scope);
    const scopeLabel = meta ? meta.name : scope;

    if (typeof showToast === 'function') {
      if (targetEnabled) {
        showToast(`🔓 [${scopeLabel}] Edit Mode ON: Editing permissions active.`, true);
      } else {
        showToast(`🔒 [${scopeLabel}] Edit Mode STOPPED: Editing is locked.`, true);
      }
    } else if (typeof showNotificationToast === 'function') {
      if (targetEnabled) {
        showNotificationToast(`🔓 [${scopeLabel}] Edit Mode ON`);
      } else {
        showNotificationToast(`🔒 [${scopeLabel}] Edit Mode STOPPED`);
      }
    }
  };

  // Toggle ALL modules in bulk with password protection
  window.toggleAllModulesEditMode = function (enable, bypassPassword) {
    const targetEnabled = Boolean(enable);

    if (bypassPassword !== true) {
      pendingTargetScope = '__all__';
      pendingTargetEditState = targetEnabled;
      openPasswordPromptModal(targetEnabled, '__all__');
      return;
    }

    // Verified: Set all scopes
    try {
      MODULE_SCOPES.forEach(m => {
        localStorage.setItem('mep_edit_mode_' + m.id, targetEnabled ? 'true' : 'false');
      });
      localStorage.setItem('mep_global_edit_mode', targetEnabled ? 'true' : 'false');
    } catch (e) {}

    applyEditModeUI(window.getCurrentEditScope());
    updateModalUI();

    window.dispatchEvent(new CustomEvent('mep:edit-mode-changed', {
      detail: { scope: '__all__', enabled: targetEnabled }
    }));

    const msg = targetEnabled 
      ? '🔓 All Modules: Edit Mode is now ACTIVE across all 27 pages.' 
      : '🔒 All Modules: Edit Mode is STOPPED & LOCKED across all 27 pages.';
    if (typeof showToast === 'function') showToast(msg, true);
    else if (typeof showNotificationToast === 'function') showNotificationToast(msg);
  };

  // Helper to revert toggle switches if password canceled
  function updateAllTogglesForScope(scope, enabled) {
    const currentScope = window.getCurrentEditScope();
    if (scope === currentScope) {
      document.querySelectorAll('.sidebar-edit-toggle-input').forEach(inp => {
        inp.checked = enabled;
      });
    }
    const modalSwitch = document.getElementById(`modal-switch-${scope}`);
    if (modalSwitch) modalSwitch.checked = enabled;

    const currentModalSwitch = document.getElementById('modal-settings-current-toggle');
    if (currentModalSwitch && scope === currentScope) currentModalSwitch.checked = enabled;
  }

  // ================= APPLY EDIT MODE UI =================
  function applyEditModeUI(currentScope) {
    const scope = currentScope || window.getCurrentEditScope();
    const isEnabled = window.isEditModeEnabled(scope);
    const scopeMeta = getScopeMeta(scope);

    // 1. Toggle class on document root and body
    if (isEnabled) {
      document.documentElement.classList.remove('edit-mode-off');
      document.body && document.body.classList.remove('edit-mode-off');
    } else {
      document.documentElement.classList.add('edit-mode-off');
      document.body && document.body.classList.add('edit-mode-off');
    }

    // 2. Set scoped data attributes on tab containers if present in app_dashboard.html
    const containerId = 'view-' + scope.replace(/_/g, '-');
    const container = document.getElementById(containerId);
    if (container) {
      container.setAttribute('data-edit-mode', isEnabled ? 'on' : 'off');
    }

    // 3. Update all sidebar toggles on the page
    document.querySelectorAll('.sidebar-edit-toggle-input').forEach(input => {
      input.checked = isEnabled;
      input.title = `Toggle Edit Mode for ${scopeMeta.name} (Current: ${isEnabled ? 'Active' : 'Stopped'})`;
    });

    // 4. Update status icons and text
    document.querySelectorAll('.sidebar-edit-status-icon').forEach(icon => {
      if (isEnabled) {
        icon.className = 'sidebar-edit-status-icon ph-bold ph-lock-key-open text-xs text-emerald-600 dark:text-emerald-400';
      } else {
        icon.className = 'sidebar-edit-status-icon ph-bold ph-lock-key text-xs text-rose-600 dark:text-rose-400';
      }
    });

    document.querySelectorAll('.sidebar-edit-status-text').forEach(el => {
      el.textContent = isEnabled ? 'Edit: Active' : 'Edit: Stopped';
      if (isEnabled) {
        el.className = 'sidebar-edit-status-text text-[10.5px] font-bold text-emerald-700 dark:text-emerald-400';
      } else {
        el.className = 'sidebar-edit-status-text text-[10.5px] font-bold text-rose-700 dark:text-rose-400';
      }
    });

    // 5. Update or inject dynamic module scope tag in sidebar settings card
    document.querySelectorAll('.sidebar-edit-scope-tag, .sidebar-scope-tag').forEach(tag => {
      tag.innerHTML = `<span class="truncate max-w-[130px] font-semibold text-slate-700 dark:text-slate-200" title="${scopeMeta.name}">${scopeMeta.name}</span>`;
    });

    // If tag element does not exist in sidebar settings card, inject it seamlessly
    const settingsHeaders = document.querySelectorAll('.sidebar-edit-status-icon');
    settingsHeaders.forEach(iconEl => {
      const parentRow = iconEl.closest('.flex');
      const card = parentRow ? parentRow.parentElement : null;
      if (card && !card.querySelector('.sidebar-scope-tag')) {
        const tagDiv = document.createElement('div');
        tagDiv.className = 'sidebar-scope-tag flex items-center justify-between text-[9.5px] text-slate-500 dark:text-slate-400 pb-0.5 border-b border-slate-200/50 dark:border-slate-700/50';
        tagDiv.innerHTML = `
          <span class="truncate max-w-[140px] font-bold text-slate-700 dark:text-slate-300" title="${scopeMeta.name}">
            <i class="ph-bold ${scopeMeta.icon} text-[10px] text-sky-600 dark:text-sky-400 mr-1"></i>${scopeMeta.name}
          </span>
          <span class="text-[8.5px] font-mono px-1 py-0.2 rounded ${isEnabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'} font-bold">
            ${isEnabled ? 'ON' : 'OFF'}
          </span>
        `;
        card.insertBefore(tagDiv, parentRow);
      } else if (card) {
        const existingTag = card.querySelector('.sidebar-scope-tag');
        if (existingTag) {
          existingTag.innerHTML = `
            <span class="truncate max-w-[140px] font-bold text-slate-700 dark:text-slate-300" title="${scopeMeta.name}">
              <i class="ph-bold ${scopeMeta.icon} text-[10px] text-sky-600 dark:text-sky-400 mr-1"></i>${scopeMeta.name}
            </span>
            <span class="text-[8.5px] font-mono px-1 py-0.2 rounded ${isEnabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'} font-bold">
              ${isEnabled ? 'ON' : 'OFF'}
            </span>
          `;
        }
      }
    });

    // 6. Update Settings Modal if open
    updateModalUI();

    // 7. Re-render tables if active view functions exist
    if (typeof renderCrucibleTable === 'function') renderCrucibleTable();
    else if (typeof window.renderCrucibleConsumptionView === 'function') window.renderCrucibleConsumptionView();
    if (typeof window.renderDieCastingProductionView === 'function') window.renderDieCastingProductionView();
    if (typeof window.renderStampingProductionView === 'function') window.renderStampingProductionView();
    if (typeof window.renderPhysicalDayWiseView === 'function' && (scope === 'physical_daywise' || scope === '__all__')) window.renderPhysicalDayWiseView();
    if (typeof window.renderPhysicalMonthWiseView === 'function' && (scope === 'physical_monthwise' || scope === '__all__')) window.renderPhysicalMonthWiseView();
    if (typeof window.renderPhysicalDailyEntryView === 'function' && (scope === 'physical_daily_entry' || scope === '__all__')) window.renderPhysicalDailyEntryView();
  }

  // Global refresh method called on tab switches
  window.refreshSystemEditModeUI = function () {
    applyEditModeUI(window.getCurrentEditScope());
  };

  // ================= PASSWORD PROMPT MODAL =================
  function ensurePasswordModalInDOM() {
    if (document.getElementById('modal-mep-password-auth')) return;

    const modalHtml = `
      <div id="modal-mep-password-auth" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 hidden">
        <div id="modal-mep-password-card" class="bg-white dark:bg-dark-850 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-sm overflow-hidden animate-scaleIn">
          <!-- Header -->
          <div class="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-sky-500/10 dark:from-dark-800 dark:to-dark-750">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 text-white flex items-center justify-center shadow-2xs">
                <i class="ph-bold ph-shield-check text-base"></i>
              </div>
              <div>
                <h3 class="font-extrabold text-sm text-slate-900 dark:text-white">Security Verification</h3>
                <p class="text-[10px] text-slate-500 font-medium">মডিউল এডিট পারমিশন পরিবর্তনের পাসওয়ার্ড দিন</p>
              </div>
            </div>
            <button type="button" onclick="cancelPasswordPromptModal()" class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-700 cursor-pointer">
              <i class="ph-bold ph-x text-base"></i>
            </button>
          </div>

          <!-- Form Body -->
          <form id="mep-password-auth-form" onsubmit="submitPasswordPromptModal(event)" class="p-5 space-y-4">
            <div class="p-3 rounded-xl bg-slate-100/80 dark:bg-dark-800 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-slate-500 font-medium">Target Module:</span>
                <span id="mep-password-target-scope-name" class="font-extrabold text-sky-600 dark:text-sky-400">All Modules</span>
              </div>
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-slate-500 font-medium">Requested Action:</span>
                <span id="mep-password-target-action" class="font-bold text-slate-800 dark:text-slate-200">Toggle Edit Mode</span>
              </div>
              <p class="text-[10.5px] text-slate-500 dark:text-slate-400 pt-1">
                অননুমোদিত পরিবর্তন ঠেকাতে সিকিউরিটি পাসওয়ার্ড দিয়ে কনফার্ম করুন।
              </p>
            </div>

            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Admin Password (পাসওয়ার্ড):
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <i class="ph-bold ph-key text-sm"></i>
                </div>
                <input 
                  type="password" 
                  id="mep-auth-password-input" 
                  autocomplete="current-password"
                  placeholder="Enter admin password (e.g. Saiful@3746)" 
                  class="w-full pl-9 pr-10 py-2 rounded-xl text-xs bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono tracking-wider transition text-slate-900 dark:text-white"
                  required
                />
                <button 
                  type="button" 
                  onclick="togglePasswordVisibility()" 
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title="Toggle password visibility"
                >
                  <i id="mep-auth-password-eye" class="ph-bold ph-eye text-sm"></i>
                </button>
              </div>
              <p id="mep-auth-password-error" class="text-[11px] text-rose-600 dark:text-rose-400 font-bold hidden flex items-center gap-1 mt-1">
                <i class="ph-bold ph-warning-circle"></i>
                <span>ভুল পাসওয়ার্ড! সঠিক অ্যাডমিন পাসওয়ার্ড দিন।</span>
              </p>
            </div>

            <!-- Footer Buttons -->
            <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button 
                type="button" 
                onclick="cancelPasswordPromptModal()" 
                class="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800 transition cursor-pointer"
              >
                Cancel (বাতিল)
              </button>
              <button 
                type="submit" 
                id="btn-mep-verify-password"
                class="px-4 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white shadow-sm flex items-center gap-1.5 transition cursor-pointer"
              >
                <i class="ph-bold ph-check text-xs"></i>
                <span>Verify &amp; Apply</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  function openPasswordPromptModal(targetState, targetScope) {
    ensurePasswordModalInDOM();
    const modal = document.getElementById('modal-mep-password-auth');
    const input = document.getElementById('mep-auth-password-input');
    const err = document.getElementById('mep-auth-password-error');
    const actionEl = document.getElementById('mep-password-target-action');
    const scopeEl = document.getElementById('mep-password-target-scope-name');

    if (!modal) return;

    if (scopeEl) {
      if (targetScope === '__all__') {
        scopeEl.textContent = 'All 27 Modules (সকল মডিউল)';
      } else {
        const meta = getScopeMeta(targetScope);
        scopeEl.textContent = meta ? meta.name : targetScope;
      }
    }

    if (actionEl) {
      if (targetState) {
        actionEl.innerHTML = '<span class="text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><i class="ph-bold ph-lock-key-open"></i> Enable Edit Mode (এডিট চালু)</span>';
      } else {
        actionEl.innerHTML = '<span class="text-rose-600 dark:text-rose-400 flex items-center gap-1"><i class="ph-bold ph-lock-key"></i> Stop Edit Mode (এডিট বন্ধ/লক)</span>';
      }
    }

    if (err) err.classList.add('hidden');
    if (input) {
      input.value = '';
      input.type = 'password';
      const eye = document.getElementById('mep-auth-password-eye');
      if (eye) eye.className = 'ph-bold ph-eye text-sm';
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    setTimeout(() => {
      if (input) input.focus();
    }, 50);
  }

  window.cancelPasswordPromptModal = function () {
    const modal = document.getElementById('modal-mep-password-auth');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    // Revert checkboxes to current stored state
    applyEditModeUI(window.getCurrentEditScope());
    pendingTargetEditState = null;
    pendingTargetScope = null;
  };

  window.submitPasswordPromptModal = function (event) {
    if (event) event.preventDefault();
    const input = document.getElementById('mep-auth-password-input');
    const err = document.getElementById('mep-auth-password-error');
    const card = document.getElementById('modal-mep-password-card');

    const enteredPass = input ? input.value : '';

    if (!isValidAdminPassword(enteredPass)) {
      if (err) err.classList.remove('hidden');
      if (card) {
        card.classList.remove('mep-shake');
        void card.offsetWidth; // trigger reflow
        card.classList.add('mep-shake');
      }
      if (input) {
        input.select();
        input.focus();
      }
      return;
    }

    // Password is VALID!
    const targetState = pendingTargetEditState !== null ? pendingTargetEditState : true;
    const targetScope = pendingTargetScope || window.getCurrentEditScope();
    pendingTargetEditState = null;
    pendingTargetScope = null;

    // Close password modal
    const modal = document.getElementById('modal-mep-password-auth');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }

    // Execute edit toggle with bypassPassword = true
    if (targetScope === '__all__') {
      window.toggleAllModulesEditMode(targetState, true);
    } else {
      window.toggleSystemEditMode(targetState, true, targetScope);
    }
  };

  window.togglePasswordVisibility = function () {
    const input = document.getElementById('mep-auth-password-input');
    const eye = document.getElementById('mep-auth-password-eye');
    if (!input || !eye) return;

    if (input.type === 'password') {
      input.type = 'text';
      eye.className = 'ph-bold ph-eye-slash text-sm text-sky-600 dark:text-sky-400';
    } else {
      input.type = 'password';
      eye.className = 'ph-bold ph-eye text-sm';
    }
  };

  // ================= SYSTEM SETTINGS CONFIG MODAL =================
  function ensureSettingsModalInDOM() {
    if (document.getElementById('modal-mep-system-settings')) return;

    const modalHtml = `
      <div id="modal-mep-system-settings" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 hidden">
        <div class="bg-white dark:bg-dark-850 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scaleIn">
          <!-- Header -->
          <div class="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-50 via-slate-100 to-sky-50/50 dark:from-dark-800 dark:via-dark-800 dark:to-dark-750 shrink-0">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-600 text-white flex items-center justify-center shadow-2xs">
                <i class="ph-bold ph-shield-check text-lg"></i>
              </div>
              <div>
                <h3 class="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Module Security &amp; Edit Lock System</span>
                  <span class="text-[9px] font-mono px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 font-bold uppercase tracking-wider">Unique Scopes</span>
                </h3>
                <p class="text-[11px] text-slate-500 font-medium">প্রতিটি মডিউল ও পেজের জন্য স্বতন্ত্র এডিট অন/অফ নিয়ন্ত্রণ</p>
              </div>
            </div>
            <button type="button" onclick="closeSystemSettingsModal()" class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-700 cursor-pointer">
              <i class="ph-bold ph-x text-base"></i>
            </button>
          </div>

          <!-- Quick Action Bar -->
          <div class="px-5 py-3 bg-slate-50/70 dark:bg-dark-800/60 border-b border-slate-200/80 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-2.5 shrink-0 select-none">
            <!-- Search Module -->
            <div class="relative flex-1 min-w-[200px] max-w-xs">
              <i class="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none"></i>
              <input 
                type="text" 
                id="settings-module-search-input" 
                placeholder="Search modules (মডিউল খুঁজুন)..." 
                oninput="filterSettingsModules(this.value)"
                class="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white"
              />
            </div>

            <!-- Bulk Lock / Unlock Buttons -->
            <div class="flex items-center gap-2">
              <button 
                type="button" 
                onclick="window.toggleAllModulesEditMode(true)" 
                class="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 transition cursor-pointer"
                title="Unlock editing across all modules"
              >
                <i class="ph-bold ph-lock-key-open text-xs"></i>
                <span>Unlock All (সব চালু)</span>
              </button>
              <button 
                type="button" 
                onclick="window.toggleAllModulesEditMode(false)" 
                class="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1 transition cursor-pointer"
                title="Lock editing across all modules"
              >
                <i class="ph-bold ph-lock-key text-xs"></i>
                <span>Lock All (সব লক)</span>
              </button>
            </div>
          </div>

          <!-- Modal Scrollable Content -->
          <div id="settings-modules-list-container" class="flex-1 overflow-y-auto p-5 space-y-4 select-none">
            <!-- Active Viewing Module Banner Card -->
            <div id="modal-active-scope-banner" class="p-3.5 rounded-2xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-transparent dark:from-sky-950/40 dark:via-indigo-950/30 border border-sky-200 dark:border-sky-800/60 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div id="modal-active-scope-icon-box" class="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center text-lg shadow-sm">
                  <i class="ph-bold ph-calendar-blank"></i>
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">Current Active Page</span>
                    <span id="modal-active-scope-status-pill" class="text-[9px] font-mono px-1.5 py-0.2 rounded font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">ACTIVE</span>
                  </div>
                  <h4 id="modal-active-scope-name" class="text-xs font-black text-slate-800 dark:text-white">ERP Day-Wise Production</h4>
                  <p id="modal-active-scope-bn" class="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">ইআরপি দৈনিক উৎপাদন (৩১ দিন)</p>
                </div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer shrink-0" title="Toggle current active module edit mode">
                <input type="checkbox" id="modal-settings-current-toggle" class="sr-only peer" onchange="window.toggleSystemEditMode(this.checked);">
                <div class="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <!-- Dynamic Category-wise Module Matrix -->
            <div id="settings-modules-matrix" class="space-y-4">
              <!-- Rendered via JS -->
            </div>

            <!-- Security Notice Box -->
            <div class="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200/70 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
              <p class="font-bold flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300">
                <i class="ph-bold ph-shield-check text-amber-600 dark:text-amber-400"></i> স্বতন্ত্র এডিট লক নিয়মাবলী:
              </p>
              <ul class="list-disc pl-4 space-y-0.5 text-[10.5px] text-slate-600 dark:text-slate-300">
                <li>প্রত্যেকটি মডিউলের জন্য এডিট মোড সম্পূর্ণ <strong>স্বতন্ত্র (Unique)</strong>। একটি মডিউল লক করলে অন্য মডিউলের ডাটা প্রভাবিত হবে না।</li>
                <li>যে কোনো মডিউলের এডিট চালু বা বন্ধ করতে অ্যাডমিন পাসওয়ার্ড আবশ্যক।</li>
                <li>এডিট বন্ধ থাকা অবস্থায় সংশ্লিষ্ট পেজের সকল Add, Edit ও Delete অপশন সম্পূর্ণ লক ও লুকায়িত থাকে।</li>
              </ul>
            </div>
          </div>

          <!-- Footer -->
          <div class="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-dark-800/60 shrink-0">
            <div class="flex items-center gap-2 text-[11px] text-slate-500">
              <i class="ph-bold ph-user-check text-slate-400"></i>
              <span>Authorized Manager: <strong class="text-slate-700 dark:text-slate-300">Md Saiful Islam</strong></span>
            </div>
            <button type="button" onclick="closeSystemSettingsModal()" class="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-sky-600 dark:hover:bg-sky-500 shadow-2xs transition cursor-pointer">
              Done / ঠিক আছে
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  // Render the grouped modules inside the Settings Modal
  function renderSettingsModulesMatrix(filterQuery = '') {
    const container = document.getElementById('settings-modules-matrix');
    if (!container) return;

    const query = (filterQuery || '').trim().toLowerCase();
    const currentScope = window.getCurrentEditScope();

    // Group modules by category
    const grouped = {};
    Object.keys(MODULE_CATEGORIES).forEach(cat => {
      grouped[cat] = [];
    });

    MODULE_SCOPES.forEach(mod => {
      const match = !query || 
        mod.name.toLowerCase().includes(query) || 
        mod.bn.toLowerCase().includes(query) || 
        mod.id.toLowerCase().includes(query);
      if (match) {
        if (!grouped[mod.category]) grouped[mod.category] = [];
        grouped[mod.category].push(mod);
      }
    });

    let html = '';
    let totalRendered = 0;

    Object.keys(grouped).forEach(catKey => {
      const items = grouped[catKey];
      if (!items || items.length === 0) return;

      const catMeta = MODULE_CATEGORIES[catKey] || { title: catKey, bn: '', icon: 'ph-folder' };
      totalRendered += items.length;

      html += `
        <div class="p-3 rounded-2xl bg-slate-50/80 dark:bg-dark-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
          <!-- Category Header -->
          <div class="flex items-center justify-between pb-1.5 border-b border-slate-200/60 dark:border-slate-700/60">
            <div class="flex items-center gap-2">
              <i class="ph-bold ${catMeta.icon} text-sky-600 dark:text-sky-400 text-sm"></i>
              <span class="text-xs font-extrabold text-slate-800 dark:text-white">${catMeta.title}</span>
              <span class="text-[10px] text-slate-400">(${catMeta.bn})</span>
            </div>
            <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-dark-700 text-slate-600 dark:text-slate-300 font-bold">
              ${items.length} Modules
            </span>
          </div>

          <!-- Modules Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
      `;

      items.forEach(mod => {
        const isEnabled = window.isEditModeEnabled(mod.id);
        const isCurrent = mod.id === currentScope;

        html += `
          <div class="p-2.5 rounded-xl transition-all ${isCurrent ? 'bg-sky-50/90 dark:bg-sky-950/40 border border-sky-300 dark:border-sky-700 shadow-2xs' : 'bg-white dark:bg-dark-850 border border-slate-200/70 dark:border-slate-700/60 hover:border-slate-300'} flex items-center justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-8 h-8 rounded-lg ${isEnabled ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'} flex items-center justify-center shrink-0">
                <i class="ph-bold ${mod.icon} text-sm"></i>
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5">
                  <span class="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate">${mod.name}</span>
                  ${isCurrent ? '<span class="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-sky-500 text-white shrink-0">Current</span>' : ''}
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="text-[9.5px] text-slate-400 truncate">${mod.bn}</span>
                  <span class="text-[8px] font-mono font-bold ${isEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} shrink-0">
                    • ${isEnabled ? 'ACTIVE' : 'LOCKED'}
                  </span>
                </div>
              </div>
            </div>

            <!-- Toggle Switch -->
            <label class="relative inline-flex items-center cursor-pointer shrink-0" title="Toggle edit mode for ${mod.name}">
              <input 
                type="checkbox" 
                id="modal-switch-${mod.id}" 
                class="sr-only peer" 
                ${isEnabled ? 'checked' : ''} 
                onchange="window.toggleSystemEditMode(this.checked, false, '${mod.id}');"
              />
              <div class="w-8 h-4 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    if (totalRendered === 0) {
      html = `
        <div class="p-8 text-center space-y-2">
          <div class="w-12 h-12 rounded-full bg-slate-100 dark:bg-dark-800 text-slate-400 flex items-center justify-center mx-auto text-xl">
            <i class="ph-bold ph-magnifying-glass"></i>
          </div>
          <p class="text-xs font-bold text-slate-600 dark:text-slate-300">কোনো মডিউল পাওয়া যায়নি!</p>
          <p class="text-[11px] text-slate-400">অন্য কোনো নাম দিয়ে সার্চ করুন।</p>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  window.filterSettingsModules = function (query) {
    renderSettingsModulesMatrix(query);
  };

  window.openSystemSettingsModal = function () {
    ensureSettingsModalInDOM();
    const modal = document.getElementById('modal-mep-system-settings');
    if (!modal) return;

    updateModalUI();
    const searchInp = document.getElementById('settings-module-search-input');
    if (searchInp) searchInp.value = '';

    renderSettingsModulesMatrix('');

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  };

  window.closeSystemSettingsModal = function () {
    const modal = document.getElementById('modal-mep-system-settings');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  };

  function updateModalUI() {
    const currentScope = window.getCurrentEditScope();
    const meta = getScopeMeta(currentScope);
    const isEnabled = window.isEditModeEnabled(currentScope);

    // Active Banner
    const activeToggle = document.getElementById('modal-settings-current-toggle');
    if (activeToggle) activeToggle.checked = isEnabled;

    const nameEl = document.getElementById('modal-active-scope-name');
    if (nameEl) nameEl.textContent = meta.name;

    const bnEl = document.getElementById('modal-active-scope-bn');
    if (bnEl) bnEl.textContent = meta.bn;

    const iconBox = document.getElementById('modal-active-scope-icon-box');
    if (iconBox) iconBox.innerHTML = `<i class="ph-bold ${meta.icon}"></i>`;

    const statusPill = document.getElementById('modal-active-scope-status-pill');
    if (statusPill) {
      statusPill.textContent = isEnabled ? 'EDIT: ACTIVE' : 'EDIT: STOPPED';
      statusPill.className = `text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${isEnabled ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`;
    }

    // Update individual switch if rendered
    MODULE_SCOPES.forEach(mod => {
      const sw = document.getElementById(`modal-switch-${mod.id}`);
      if (sw) sw.checked = window.isEditModeEnabled(mod.id);
    });
  }

  // ================= REACTIVE HOOKS & EVENT LISTENERS =================
  // React immediately to URL hash change
  window.addEventListener('hashchange', () => {
    applyEditModeUI(window.getCurrentEditScope());
  });

  // React to popstate
  window.addEventListener('popstate', () => {
    applyEditModeUI(window.getCurrentEditScope());
  });

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    applyEditModeUI(window.getCurrentEditScope());
  });

  // Also apply immediately if body is already loaded
  if (document.body) {
    applyEditModeUI(window.getCurrentEditScope());
  }

})();
