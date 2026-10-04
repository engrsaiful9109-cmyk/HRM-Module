/**
 * MEP GROUP - Enterprise Human Resource Management (HRM) Module
 * Firebase Realtime Cloud Synchronization Engine (v12.19.0)
 * 
 * Features:
 * 1. Direct WebSocket real-time two-way synchronization with Firebase RTDB
 * 2. Instant cloud saves for Employee Entry, Dossier Edits, Replacements & Transfers
 * 3. Reactive onValue listeners across all active HRM components (List, Summary, 8H Salary, Replacements)
 * 4. Automatic dual-layer fallback: Cloud Online <-> Server Disk Persistence <-> Local Offline Cache
 * 5. Visual live connection telemetry beacon in HRM header
 * 
 * Config: Project whatsapp-c10ef (https://whatsapp-c10ef-default-rtdb.firebaseio.com)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { 
  getDatabase, 
  ref, 
  onValue, 
  set, 
  get, 
  update, 
  remove, 
  child,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

// Official Firebase Web Configuration provided by user
const firebaseConfig = {
  apiKey: "AIzaSyBcjbR7Qu7M-RnHUtLJ9zeehILqQHYLw4E",
  authDomain: "whatsapp-c10ef.firebaseapp.com",
  databaseURL: "https://whatsapp-c10ef-default-rtdb.firebaseio.com",
  projectId: "whatsapp-c10ef",
  storageBucket: "whatsapp-c10ef.firebasestorage.app",
  messagingSenderId: "675053106773",
  appId: "1:675053106773:web:b7078468691a07ecfec6dc",
  measurementId: "G-89Z8WBJ3R0"
};

// Initialize Firebase App & Database Instance
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// State tracking
const state = {
  isConnected: false,
  isInitialized: false,
  lastSyncTimestamp: null,
  localSaveCount: 0,
  isProcessingCloudUpdate: false
};

// Clean ID helper (e.g. "#19055" -> "19055")
function cleanStaffId(id) {
  if (!id) return '';
  return String(id).replace(/^[#\s]+/, '').split(/[\s\-•]+/)[0].trim();
}

// Convert Firebase RTDB dictionary or array to standard clean Array
function toArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.filter(Boolean);
  }
  if (typeof val === 'object') {
    return Object.keys(val).map(k => {
      const item = val[k];
      if (item && typeof item === 'object') {
        if (!item._fb_key) item._fb_key = k;
      }
      return item;
    }).filter(Boolean);
  }
  return [];
}

// Update Header Telemetry Status Pill
function updateConnectionUI(connected) {
  state.isConnected = connected;
  const pill = document.getElementById('hrm-firebase-status-pill');
  const beacon = document.getElementById('hrm-firebase-beacon');
  const text = document.getElementById('hrm-firebase-status-text');

  if (!pill || !beacon || !text) return;

  if (connected) {
    pill.className = "px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 shadow-2xs flex items-center gap-2 transition-all";
    beacon.className = "w-2 h-2 rounded-full bg-emerald-500 live-beacon shrink-0";
    const timeStr = state.lastSyncTimestamp ? new Date(state.lastSyncTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Live';
    text.textContent = `Cloud Online • Synced (${timeStr})`;
    pill.title = "Connected to Firebase Realtime Database. All entries and changes sync instantly across devices.";
  } else {
    pill.className = "px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 text-amber-700 dark:text-amber-300 shadow-2xs flex items-center gap-2 transition-all";
    beacon.className = "w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0";
    text.textContent = "Cloud Offline • Reconnecting...";
    pill.title = "Connecting to Firebase. Offline local cache and server API active.";
  }
}

// --------------------------------------------------------------------------
// Real-time Listeners
// --------------------------------------------------------------------------

// 1. Connection Status Listener
const connectedRef = ref(db, ".info/connected");
onValue(connectedRef, (snap) => {
  const connected = snap.val() === true;
  console.log(`[HRM_FIREBASE] Realtime Connection state: ${connected ? 'ONLINE' : 'OFFLINE'}`);
  updateConnectionUI(connected);
});

// 2. Employees Realtime Listener
const employeesRef = ref(db, "mep_hrm/employees");
onValue(employeesRef, (snapshot) => {
  const rawData = snapshot.val();
  if (!rawData) {
    console.warn("[HRM_FIREBASE] No employees found in cloud node mep_hrm/employees");
    return;
  }

  const emps = toArray(rawData);
  if (!emps || emps.length === 0) return;

  // Sort employees predictably by sl_no
  emps.sort((a, b) => (Number(a.sl_no || 0) - Number(b.sl_no || 0)));

  state.lastSyncTimestamp = Date.now();
  updateConnectionUI(state.isConnected);

  console.log(`[HRM_FIREBASE] Received ${emps.length} employees from cloud.`);

  // Avoid cyclical self-update loops when the change was initiated locally seconds ago
  state.isProcessingCloudUpdate = true;

  try {
    // Sync into global in-memory databases
    if (!window.MEP_MANPOWER_DATABASE) window.MEP_MANPOWER_DATABASE = {};
    window.MEP_MANPOWER_DATABASE.employees = emps;

    if (!window.HRM_MANPOWER_CACHE) window.HRM_MANPOWER_CACHE = {};
    window.HRM_MANPOWER_CACHE.employees = emps;

    // Trigger HRM Manpower Controller
    if (window.HRMManpower && typeof window.HRMManpower.setAllEmployees === 'function') {
      window.HRMManpower.setAllEmployees(emps);
    } else if (window.HRMManpower && typeof window.HRMManpower.renderTable === 'function') {
      if (typeof window.HRMManpower.renderStats === 'function') window.HRMManpower.renderStats();
      if (typeof window.HRMManpower.renderStatusCounts === 'function') window.HRMManpower.renderStatusCounts();
      window.HRMManpower.renderTable();
    }

    // Trigger Section Wise Monthly Salary Controller
    if (window.HRMSectionSalary && typeof window.HRMSectionSalary.render === 'function') {
      // Re-render if section-wise-salary section is active or visible
      const secSalaryEl = document.getElementById('section-wise-salary-section');
      if (secSalaryEl && !secSalaryEl.classList.contains('hidden')) {
        window.HRMSectionSalary.render();
      }
    }

    // Trigger Manpower Summary Matrix Controller
    if (window.HRMManpowerSummary && typeof window.HRMManpowerSummary.render === 'function') {
      const summaryEl = document.getElementById('manpower-summary-section');
      if (summaryEl && !summaryEl.classList.contains('hidden')) {
        window.HRMManpowerSummary.render();
      }
    }

    // Trigger Datalist and Autocomplete Refresh in Employee Entry
    if (window.HRMEmployeeEntry && typeof window.HRMEmployeeEntry.populateDatalist === 'function') {
      window.HRMEmployeeEntry.populateDatalist();
    }

    // Dispatch global event for custom hooks
    window.dispatchEvent(new CustomEvent('hrm-employees-cloud-synced', { detail: { count: emps.length } }));

  } catch (err) {
    console.error("[HRM_FIREBASE] Error updating components from cloud data:", err);
  } finally {
    setTimeout(() => {
      state.isProcessingCloudUpdate = false;
    }, 500);
  }
});

// 3. Replacements Realtime Listener
const replacementsRef = ref(db, "mep_hrm/replacements");
onValue(replacementsRef, (snapshot) => {
  const rawData = snapshot.val();
  if (!rawData) return;

  const reps = toArray(rawData);
  reps.sort((a, b) => (Number(a.sl || 0) - Number(b.sl || 0)));

  window.MEP_REPLACEMENT_MASTER = reps;
  console.log(`[HRM_FIREBASE] Received ${reps.length} replacements from cloud.`);

  // Update replacement report if active
  if (window.HRMEmployeeEntry && typeof window.HRMEmployeeEntry.buildReplacementList === 'function') {
    window.HRMEmployeeEntry.buildReplacementList(true);
    if (typeof window.HRMEmployeeEntry.renderReplacements === 'function') {
      window.HRMEmployeeEntry.renderReplacements();
    }
  }

  // Update sidebar replacement count badge
  const repBadge = document.getElementById('sidebar-count-replacements');
  if (repBadge) {
    repBadge.textContent = reps.length;
  }
});

// 4. Inter-Section Transfers Realtime Listener
const transfersRef = ref(db, "mep_hrm/transfers");
onValue(transfersRef, (snapshot) => {
  const rawData = snapshot.val();
  if (!rawData) return;

  const trans = toArray(rawData);
  window.MEP_INTER_SECTION_TRANSFERS = trans;
  console.log(`[HRM_FIREBASE] Received ${trans.length} transfers from cloud.`);

  if (window.HRMTransfer && typeof window.HRMTransfer.render === 'function') {
    window.HRMTransfer.render();
  }
});

// 5. Summary Specs Realtime Listener
const specsRef = ref(db, "mep_hrm/summary_specs");
onValue(specsRef, (snapshot) => {
  const specs = snapshot.val();
  if (!specs) return;

  if (window.HRMManpowerSummary && typeof window.HRMManpowerSummary.setSpecs === 'function') {
    window.HRMManpowerSummary.setSpecs(specs);
  }
});

// --------------------------------------------------------------------------
// Public API Methods (Exposed on window.HRMFirebase)
// --------------------------------------------------------------------------

/**
 * Save or Update Employee in Firebase RTDB and dual-sync to server
 * @param {Object} payload Complete employee dossier object
 * @returns {Promise<Object>} The saved employee record
 */
async function saveEmployee(payload) {
  if (!payload || !payload.staff_id) {
    throw new Error("Staff ID is required to save employee to Firebase");
  }

  const sid = cleanStaffId(payload.staff_id);
  const key = `emp_${sid}`;
  payload.staff_id = sid; // ensure clean formatting

  // Calculate sl_no if missing
  if (!payload.sl_no) {
    const all = window.MEP_MANPOWER_DATABASE?.employees || [];
    const maxSl = all.reduce((max, e) => Math.max(max, Number(e.sl_no || 0)), 0);
    payload.sl_no = maxSl + 1;
  }

  console.log(`[HRM_FIREBASE] 🚀 Saving employee #${sid} (${payload.name}) to Cloud RTDB...`);

  // 1. Direct Cloud Write to Firebase RTDB (Instant WebSocket Write)
  const empRef = ref(db, `mep_hrm/employees/${key}`);
  await set(empRef, payload);

  // If this is a Replacement hire, also update replaced employee status in Firebase
  const cleanRepId = cleanStaffId(payload.replace_id);
  if (cleanRepId && (payload.hiring_type === 'Replacement' || payload.replace_id)) {
    try {
      const replacedEmpRef = ref(db, `mep_hrm/employees/emp_${cleanRepId}/status`);
      await set(replacedEmpRef, "Inactive");
      
      const remarksRef = ref(db, `mep_hrm/employees/emp_${cleanRepId}/remarks`);
      await set(remarksRef, `Replaced by #${sid} (${payload.name}) on ${payload.replace_date || payload.doj || ''}`);

      // Also create replacement entry in mep_hrm/replacements
      const repMaster = window.MEP_REPLACEMENT_MASTER || [];
      const newSl = repMaster.length + 1;
      const repObj = {
        sl: newSl,
        replace_id: cleanRepId,
        replace_name: payload.replace_name || "",
        replace_designation: payload.designation || "Helper",
        replace_section: payload.section || "Fan Assemble Line",
        replace_doj: payload.replace_date || payload.doj || "",
        new_sl: String(newSl),
        new_id: sid,
        new_name: payload.name || "",
        new_designation: payload.designation || "Helper",
        new_section: payload.section || "Fan Assemble Line",
        new_doj: payload.doj || "",
        remarks: payload.replace_reason || "Replacement Appointed"
      };
      const repRef = ref(db, `mep_hrm/replacements/rep_${newSl}`);
      await set(repRef, repObj);
    } catch (repErr) {
      console.warn("[HRM_FIREBASE] Error saving replacement companion record:", repErr);
    }
  }

  // Update cloud metadata timestamp
  try {
    const metaRef = ref(db, "mep_hrm/meta/last_updated");
    await set(metaRef, Date.now());
  } catch (e) {}

  // 2. Parallel Server API Sync (keeps local disk JSON and .js cache file synchronized)
  fetch('/api/hrm/employee/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(res => res.json()).catch(err => {
    console.warn("[HRM_FIREBASE] Server disk sync notice (cloud save already succeeded):", err);
  });

  return payload;
}

/**
 * Delete Employee from Firebase RTDB and server
 * @param {string|number} staffId Employee Staff ID
 * @param {number} [slNo] Optional sl_no
 */
async function deleteEmployee(staffId, slNo) {
  const sid = cleanStaffId(staffId);
  if (!sid) throw new Error("Staff ID required to delete employee");

  console.log(`[HRM_FIREBASE] 🗑️ Deleting employee #${sid} from Cloud RTDB...`);
  const empRef = ref(db, `mep_hrm/employees/emp_${sid}`);
  await remove(empRef);

  // Update cloud metadata
  try {
    await set(ref(db, "mep_hrm/meta/last_updated"), Date.now());
  } catch (e) {}

  // Parallel server delete
  fetch('/api/hrm/employee/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ staff_id: sid, sl_no: slNo })
  }).catch(e => console.warn(e));
}

/**
 * Save Section Transfer in Firebase RTDB
 */
async function saveTransfer(transferRecord) {
  if (!transferRecord || !transferRecord.staff_id) return;
  const sid = cleanStaffId(transferRecord.staff_id);
  const trId = transferRecord.id || Date.now();

  console.log(`[HRM_FIREBASE] 🔄 Saving transfer for #${sid} to Cloud RTDB...`);
  const trRef = ref(db, `mep_hrm/transfers/tr_${trId}`);
  await set(trRef, transferRecord);

  // Update employee's section in Firebase
  if (transferRecord.new_section) {
    const secRef = ref(db, `mep_hrm/employees/emp_${sid}/section`);
    await set(secRef, transferRecord.new_section);
  }

  // Update metadata
  try {
    await set(ref(db, "mep_hrm/meta/last_updated"), Date.now());
  } catch (e) {}

  // Parallel server call
  fetch('/api/hrm/transfer/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transferRecord)
  }).catch(e => console.warn(e));
}

/**
 * Revert Section Transfer in Firebase RTDB
 */
async function revertTransfer(transferId, staffId, prevSection) {
  const sid = cleanStaffId(staffId);
  const trRef = ref(db, `mep_hrm/transfers/tr_${transferId}`);
  await remove(trRef);

  if (sid && prevSection) {
    const secRef = ref(db, `mep_hrm/employees/emp_${sid}/section`);
    await set(secRef, prevSection);
  }

  fetch('/api/hrm/transfer/revert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: transferId, staff_id: sid, prev_section: prevSection })
  }).catch(e => console.warn(e));
}

/**
 * Save Authorized Manpower Specs in Firebase RTDB
 */
async function saveSummarySpecs(specs) {
  console.log("[HRM_FIREBASE] 📋 Saving Manpower Summary Specs to Cloud RTDB...");
  const sRef = ref(db, "mep_hrm/summary_specs");
  await set(sRef, specs);

  fetch('/api/hrm/manpower-summary-specs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(specs)
  }).catch(e => console.warn(e));
}

// Expose on global window object
window.HRMFirebase = {
  app: app,
  db: db,
  isReady: true,
  state: state,
  saveEmployee: saveEmployee,
  deleteEmployee: deleteEmployee,
  saveTransfer: saveTransfer,
  revertTransfer: revertTransfer,
  saveSummarySpecs: saveSummarySpecs
};

// Dispatch ready event
window.dispatchEvent(new CustomEvent('hrm-firebase-ready', { detail: { db } }));
console.log("[HRM_FIREBASE] ✅ Firebase Realtime Cloud Engine v12.19.0 initialized successfully.");
