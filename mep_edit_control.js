/**
 * MEP FAN LTD — Universal System Settings & Edit Lock Controller
 * Allows toggling Global Edit Mode ON / OFF across all modules:
 * - When OFF (Stopped): All Edit, Delete, and Add buttons are locked & hidden.
 * - When ON (Active): Full editing permissions are restored.
 * - Password verification required to change settings or toggle edit mode!
 * Persists setting in localStorage ('mep_global_edit_mode').
 */

(function () {
  'use strict';

  // Inject Global CSS for Edit Lock & Animations
  const styleEl = document.createElement('style');
  styleEl.id = 'mep-edit-control-styles';
  styleEl.textContent = `
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
    html.edit-mode-off [onclick*="promptDeleteRecord"] {
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
    html.edit-mode-off .mep-locked-badge {
      display: inline-flex !important;
    }

    .edit-mode-banner {
      display: none;
    }
    html.edit-mode-off .edit-mode-banner {
      display: flex !important;
    }

    @keyframes mepModalShake {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-6px); }
      40%, 80% { transform: translateX(6px); }
    }
    .mep-shake {
      animation: mepModalShake 0.4s ease-in-out;
    }
  `;
  document.head.appendChild(styleEl);

  // Read saved state (default is true = editing allowed)
  window.isEditModeEnabled = function () {
    try {
      const saved = localStorage.getItem('mep_global_edit_mode');
      if (saved === null) return true;
      return saved === 'true';
    } catch (e) {
      return true;
    }
  };

  // State tracker for pending change while password prompt is open
  let pendingTargetEditState = null;

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

  // Toggle Edit Mode ON / OFF with Password Guard
  window.toggleSystemEditMode = function (enable, bypassPassword) {
    const currentEnabled = window.isEditModeEnabled();
    const targetEnabled = enable !== undefined ? Boolean(enable) : !currentEnabled;

    // If trying to set to the exact same state without bypass, sync UI and return
    if (targetEnabled === currentEnabled && bypassPassword !== true) {
      applyEditModeUI(currentEnabled);
      return;
    }

    // Require password if not bypassed!
    if (bypassPassword !== true) {
      // Revert checkboxes on page back to currentEnabled until password verified
      document.querySelectorAll('.sidebar-edit-toggle-input, #modal-settings-edit-toggle').forEach(inp => {
        inp.checked = currentEnabled;
      });

      // Prompt for password
      pendingTargetEditState = targetEnabled;
      openPasswordPromptModal(targetEnabled);
      return;
    }

    // Password verified: commit change
    try {
      localStorage.setItem('mep_global_edit_mode', targetEnabled ? 'true' : 'false');
    } catch (e) {}

    applyEditModeUI(targetEnabled);

    // Notify other components
    window.dispatchEvent(new CustomEvent('mep:edit-mode-changed', { detail: { enabled: targetEnabled } }));

    // Show feedback toast
    if (typeof showToast === 'function') {
      if (targetEnabled) {
        showToast('🔓 Edit Mode ON: Full editing & modification options are now active.', true);
      } else {
        showToast('🔒 Edit Mode STOPPED: All editing & delete options are now locked.', true);
      }
    } else if (typeof showNotificationToast === 'function') {
      if (targetEnabled) {
        showNotificationToast('🔓 Edit Mode ON: Full editing options active.');
      } else {
        showNotificationToast('🔒 Edit Mode STOPPED: All edit options locked.');
      }
    }
  };

  // Apply UI state across DOM
  function applyEditModeUI(isEnabled) {
    if (isEnabled) {
      document.documentElement.classList.remove('edit-mode-off');
      document.body && document.body.classList.remove('edit-mode-off');
    } else {
      document.documentElement.classList.add('edit-mode-off');
      document.body && document.body.classList.add('edit-mode-off');
    }

    // Update all sidebar toggles on the page
    document.querySelectorAll('.sidebar-edit-toggle-input').forEach(input => {
      input.checked = isEnabled;
    });

    // Update status icons and text
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

    // Re-render table if module functions exist
    if (typeof renderCrucibleTable === 'function') renderCrucibleTable();
    else if (typeof window.renderCrucibleConsumptionView === 'function') window.renderCrucibleConsumptionView();
    if (typeof window.renderDieCastingProductionView === 'function') window.renderDieCastingProductionView();
    if (typeof window.renderStampingProductionView === 'function') window.renderStampingProductionView();
  }

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
                <p class="text-[10px] text-slate-500 font-medium">সেটিংস পরিবর্তনের জন্য পাসওয়ার্ড দিন</p>
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
                <span class="text-slate-500 font-medium">Requested Action:</span>
                <span id="mep-password-target-action" class="font-bold text-slate-800 dark:text-slate-200">Toggle Edit Mode</span>
              </div>
              <p class="text-[10.5px] text-slate-500 dark:text-slate-400">
                Unauthorized access prevent করার জন্য পাসওয়ার্ড দিয়ে নিশ্চিত করুন।
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
                  placeholder="Enter password (e.g. Saiful@3746)" 
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

  function openPasswordPromptModal(targetState) {
    ensurePasswordModalInDOM();
    const modal = document.getElementById('modal-mep-password-auth');
    const input = document.getElementById('mep-auth-password-input');
    const err = document.getElementById('mep-auth-password-error');
    const actionEl = document.getElementById('mep-password-target-action');

    if (!modal) return;

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
    applyEditModeUI(window.isEditModeEnabled());
    updateModalUI();
    pendingTargetEditState = null;
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
    const targetState = pendingTargetEditState !== null ? pendingTargetEditState : !window.isEditModeEnabled();
    pendingTargetEditState = null;

    // Close password modal
    const modal = document.getElementById('modal-mep-password-auth');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }

    // Execute edit toggle with bypassPassword = true
    window.toggleSystemEditMode(targetState, true);
    updateModalUI();
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

  // ================= SETTINGS CONFIG MODAL =================
  function ensureSettingsModalInDOM() {
    if (document.getElementById('modal-mep-system-settings')) return;

    const modalHtml = `
      <div id="modal-mep-system-settings" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 hidden">
        <div class="bg-white dark:bg-dark-850 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn">
          <div class="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-50 to-slate-100 dark:from-dark-800 dark:to-dark-750">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center shadow-2xs">
                <i class="ph-bold ph-gear-six text-base"></i>
              </div>
              <div>
                <h3 class="font-extrabold text-sm text-slate-900 dark:text-white">Module Security & Settings</h3>
                <p class="text-[10.5px] text-slate-500 font-medium">Configure editing permissions and report locks</p>
              </div>
            </div>
            <button type="button" onclick="closeSystemSettingsModal()" class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-700 cursor-pointer">
              <i class="ph-bold ph-x text-base"></i>
            </button>
          </div>

          <div class="p-5 space-y-4 select-none">
            <!-- Master Edit Control -->
            <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 space-y-2">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <i class="ph-bold ph-pencil-slash text-sm"></i>
                  </div>
                  <div>
                    <h4 class="text-xs font-bold text-slate-800 dark:text-slate-100">Global Data Editing</h4>
                    <p class="text-[10px] text-slate-500">পাসওয়ার্ড যাচাই করে এডিট অন বা অফ করুন</p>
                  </div>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" id="modal-settings-edit-toggle" class="sr-only peer" onchange="window.toggleSystemEditMode(this.checked);">
                  <div class="w-10 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
              <div id="modal-edit-status-banner" class="text-[11px] p-2 rounded-lg font-medium"></div>
            </div>

            <!-- Lock Options Explained -->
            <div class="p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-900/40 text-[11px] text-sky-900 dark:text-sky-200 space-y-1">
              <p class="font-bold flex items-center gap-1.5">
                <i class="ph-bold ph-info text-sky-600 dark:text-sky-400"></i> Security & Edit Lock Rules:
              </p>
              <ul class="list-disc pl-4 space-y-0.5 text-[10.5px] text-slate-600 dark:text-slate-300">
                <li><strong>পাসওয়ার্ড সুরক্ষা:</strong> যে কোনো সময় এডিট মোড পরিবর্তন করতে অ্যাডমিন পাসওয়ার্ড প্রয়োজন।</li>
                <li><strong>ON (চালু):</strong> নতুন ডাটা যুক্ত করা, রো এডিট করা ও ডিলিট করার পূর্ণ অনুমতি।</li>
                <li><strong>OFF (লক / বন্ধ):</strong> সকল এডিট ও ডিলিট বাটন সম্পূর্ণ লক এবং লুকায়িত থাকে।</li>
              </ul>
            </div>

            <!-- Operator info -->
            <div class="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-1">
              <span>Authorized Operator:</span>
              <span class="font-bold text-slate-700 dark:text-slate-300">Md Saiful Islam</span>
            </div>
          </div>

          <div class="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 bg-slate-50/60 dark:bg-dark-800/60">
            <button type="button" onclick="closeSystemSettingsModal()" class="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-sky-600 dark:hover:bg-sky-500 shadow-2xs transition cursor-pointer">
              Done / ঠিক আছে
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  window.openSystemSettingsModal = function () {
    ensureSettingsModalInDOM();
    const modal = document.getElementById('modal-mep-system-settings');
    if (!modal) return;

    updateModalUI();
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
    const isEnabled = window.isEditModeEnabled();
    const toggle = document.getElementById('modal-settings-edit-toggle');
    if (toggle) toggle.checked = isEnabled;

    const banner = document.getElementById('modal-edit-status-banner');
    if (banner) {
      if (isEnabled) {
        banner.className = 'text-[11px] p-2 rounded-lg font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5';
        banner.innerHTML = '<i class="ph-bold ph-check-circle text-emerald-600"></i> Editing is currently ACTIVE (সকল প্রকার সম্পাদনা চালু আছে)';
      } else {
        banner.className = 'text-[11px] p-2 rounded-lg font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1.5';
        banner.innerHTML = '<i class="ph-bold ph-lock text-rose-600"></i> Editing is STOPPED & LOCKED (সকল প্রকার সম্পাদনা বন্ধ রাখা হয়েছে)';
      }
    }
  }

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    applyEditModeUI(window.isEditModeEnabled());
  });

  // Also apply immediately if body is already loaded
  if (document.body) {
    applyEditModeUI(window.isEditModeEnabled());
  }

})();
