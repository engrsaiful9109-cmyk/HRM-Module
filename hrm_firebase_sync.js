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
function toArray(val, filterFn) {
  if (!val) return [];
  var list = [];
  if (Array.isArray(val)) {
    list = val.filter(Boolean);
  } else if (typeof val === 'object') {
    list = Object.keys(val).map(k => {
      const item = val[k];
      if (item && typeof item === 'object') {
        if (!item._fb_key) item._fb_key = k;
      }
      return item;
    }).filter(Boolean);
  }
  if (typeof filterFn === 'function') {
    return list.filter(filterFn);
  }
  return list;
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

// Auto-persist Firebase updates to local disk when running on local server
let diskSyncDebounceTimer = null;
function scheduleDiskSyncSnapshot() {
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') return;
  if (diskSyncDebounceTimer) clearTimeout(diskSyncDebounceTimer);
  diskSyncDebounceTimer = setTimeout(() => {
    const emps = (window.MEP_MANPOWER_DATABASE && window.MEP_MANPOWER_DATABASE.employees) || [];
    const reps = window.MEP_REPLACEMENT_MASTER || [];
    if (!emps || emps.length < 100) return;
    fetch('/api/hrm/sync_disk_snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employees: emps, replacements: reps })
    }).then(res => res.json()).then(res => {
      console.log(`[HRM_FIREBASE] 💾 Local disk snapshot synced (${res.saved_employees} emps, ${res.saved_replacements} reps).`);
    }).catch(err => {
      console.warn('[HRM_FIREBASE] Local disk sync snapshot notice:', err);
    });
  }, 1500);
}

// 2. Employees Realtime Listener
const employeesRef = ref(db, "mep_hrm/employees");
onValue(employeesRef, (snapshot) => {
  const rawData = snapshot.val();
  if (!rawData) {
    console.warn("[HRM_FIREBASE] No employees found in cloud node mep_hrm/employees");
    return;
  }

  const emps = toArray(rawData, e => {
    if (!e || (!e.staff_id && !e.sl_no)) return false;
    var sid = String(e.staff_id || '').trim();
    if (!sid || sid === '14' || sid === '99989' || !e.name) return false;
    return true;
  });
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
    if (window.HRMManpower) {
      if (typeof window.HRMManpower.setAllEmployees === 'function') {
        window.HRMManpower.setAllEmployees(emps);
      } else if (typeof window.HRMManpower.loadDataIntoState === 'function') {
        window.HRMManpower.loadDataIntoState({ employees: emps }, true);
      } else if (typeof window.HRMManpower.refreshAll === 'function') {
        window.HRMManpower.refreshAll();
      } else if (typeof window.HRMManpower.renderTable === 'function') {
        if (typeof window.HRMManpower.renderStats === 'function') window.HRMManpower.renderStats();
        if (typeof window.HRMManpower.renderStatusCounts === 'function') window.HRMManpower.renderStatusCounts();
        window.HRMManpower.renderTable();
      }
    }

    // Trigger Executive Dashboard
    if (window.HRMDashboard && typeof window.HRMDashboard.render === 'function') {
      window.HRMDashboard.render();
    }

    // Trigger Permanent Employees Controller
    if (window.HRMPermanentEmployees && typeof window.HRMPermanentEmployees.init === 'function') {
      window.HRMPermanentEmployees.init();
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

    // Trigger Hold Candidates Shelf & Datalist Refresh in Employee Entry
    if (window.HRMEmployeeEntry) {
      if (typeof window.HRMEmployeeEntry.renderHoldCandidatesShelf === 'function') {
        window.HRMEmployeeEntry.renderHoldCandidatesShelf();
      }
      if (typeof window.HRMEmployeeEntry.populateDatalist === 'function') {
        window.HRMEmployeeEntry.populateDatalist();
      }
    }

    // Emit event on HRMEventBus if available
    if (window.HRMEventBus && typeof window.HRMEventBus.emit === 'function') {
      window.HRMEventBus.emit('CLOUD_SYNC_RECEIVED', { count: emps.length });
    }

    // Dispatch global event for custom hooks
    window.dispatchEvent(new CustomEvent('hrm-employees-cloud-synced', { detail: { count: emps.length } }));

    // Automatically synchronize snapshot to local disk cache
    scheduleDiskSyncSnapshot();

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

  const reps = toArray(rawData, e => e && (e.replace_id || e.new_id || e.sl));
  reps.sort((a, b) => (Number(a.sl || 0) - Number(b.sl || 0)));

  // Deduplicate: An ID can only be replaced once and can only replace once!
  const seenPairs = new Set();
  const seenNewIds = new Set();
  const cleanReps = [];
  reps.forEach(r => {
    if (!r) return;
    const rid = String(r.replace_id || '').replace(/^[#\s]+/, '').trim();
    const nid = String(r.new_id || '').replace(/^[#\s]+/, '').trim();
    if (!rid && !nid) return;
    const pair = `${rid}___${nid}`;
    if (seenPairs.has(pair)) return;
    if (nid && nid !== 'Blank' && nid !== '-' && nid !== '') {
      if (seenNewIds.has(nid)) return;
      seenNewIds.add(nid);
    }
    seenPairs.add(pair);
    cleanReps.push(r);
  });

  window.MEP_REPLACEMENT_MASTER = cleanReps;
  console.log(`[HRM_FIREBASE] Received ${cleanReps.length} verified replacements from cloud.`);

  // Update replacement report if active (false uses in-memory window.MEP_REPLACEMENT_MASTER without server re-fetch)
  if (window.HRMEmployeeEntry && typeof window.HRMEmployeeEntry.buildReplacementList === 'function') {
    window.HRMEmployeeEntry.buildReplacementList(false);
  }

  // Update sidebar replacement count badges
  const repBadge = document.getElementById('sidebar-replacement-badge');
  if (repBadge) repBadge.textContent = reps.length + ' Repl';
  const subRepBadge = document.getElementById('sidebar-sub-replacement-count');
  if (subRepBadge) subRepBadge.textContent = reps.length;
  const tabBadge = document.getElementById('entry-tab-report-badge');
  if (tabBadge) tabBadge.textContent = reps.length;
  const allOpt = document.getElementById('rep-per-page-all-opt');
  if (allOpt) allOpt.textContent = 'All (' + reps.length + ')';

  // Automatically synchronize snapshot to local disk cache
  scheduleDiskSyncSnapshot();
});

// 4. Inter-Section Transfers Realtime Listener
const transfersRef = ref(db, "mep_hrm/transfers");
onValue(transfersRef, (snapshot) => {
  const rawData = snapshot.val();
  if (!rawData) return;

  const trans = toArray(rawData, e => e && (e.staff_id || e.id));
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

// 6. Permanent Employees Realtime Listener
const permanentEmployeesRef = ref(db, "mep_hrm/permanent_employees");
onValue(permanentEmployeesRef, (snapshot) => {
  const rawData = snapshot.val();
  if (!rawData) return;

  const perms = toArray(rawData, e => e && (e.staff_id || e.id || e.sl));
  window.MEP_PERMANENT_EMPLOYEES = perms;
  console.log(`[HRM_FIREBASE] Received ${perms.length} permanent employees from cloud.`);

  if (window.HRMPermanentEmployees && typeof window.HRMPermanentEmployees.init === 'function') {
    window.HRMPermanentEmployees.init();
  }
  if (window.HRMDashboard && typeof window.HRMDashboard.render === 'function') {
    window.HRMDashboard.render();
  }
  if (window.HRMEventBus && typeof window.HRMEventBus.emit === 'function') {
    window.HRMEventBus.emit('CLOUD_SYNC_RECEIVED', { count: perms.length, node: 'permanent_employees' });
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
  if (!sid || sid === '14' || sid.length < 3) {
    throw new Error(`Invalid or truncated Staff ID: "${sid}". Minimum 3 characters required.`);
  }
  const key = `emp_${sid}`;
  payload.staff_id = sid; // ensure clean formatting

  // Retrieve current in-memory employee list
  const allEmployeesList = (window.MEP_MANPOWER_DATABASE && window.MEP_MANPOWER_DATABASE.employees) ||
                          (window.HRM_MANPOWER_CACHE && window.HRM_MANPOWER_CACHE.employees) ||
                          (window.HRMManpower && typeof window.HRMManpower.getAllEmployees === 'function' ? window.HRMManpower.getAllEmployees() : []) ||
                          [];

  // Calculate sl_no if missing
  if (!payload.sl_no) {
    const maxSl = allEmployeesList.reduce((max, e) => Math.max(max, Number(e.sl_no || 0)), 0);
    payload.sl_no = (maxSl > 0 ? maxSl : 1295) + 1;
  }

  console.log(`[HRM_FIREBASE] 🚀 Saving employee #${sid} (${payload.name}) to Cloud RTDB...`);

  // 1. Direct Cloud Write to Firebase RTDB (Instant WebSocket Write)
  const empRef = ref(db, `mep_hrm/employees/${key}`);
  await set(empRef, payload);

  // If this is a Replacement hire, also update replaced employee status in Firebase
  const cleanRepId = cleanStaffId(payload.replace_id);
  if (cleanRepId && cleanRepId !== '14' && cleanRepId.length >= 3 && (payload.hiring_type === 'Replacement' || payload.replace_id)) {
    try {
      const repEmp = allEmployeesList.find(e => cleanStaffId(e.staff_id) === cleanRepId);
      if (repEmp) {
        const replacedEmpRef = ref(db, `mep_hrm/employees/emp_${cleanRepId}`);
        const updatedRepEmp = Object.assign({}, repEmp, {
          status: "Inactive",
          replace_id: sid,
          replace_name: payload.name || '',
          remarks: `Replaced by #${sid} (${payload.name}) on ${payload.replace_date || payload.doj || ''}`
        });
        await set(replacedEmpRef, updatedRepEmp);
      } else {
        console.warn(`[HRM_FIREBASE] Replaced employee #${cleanRepId} not found in database. Will not create phantom employee record.`);
      }

      // Also create replacement entry in mep_hrm/replacements (if not already existing)
      const repMaster = window.MEP_REPLACEMENT_MASTER || [];
      const existingRep = repMaster.find(r => {
        const rId = String(r.replace_id || '').replace(/^[#\s]+/, '').trim();
        const nId = String(r.new_id || '').replace(/^[#\s]+/, '').trim();
        return (rId && rId === cleanRepId) || (nId && nId === sid);
      });

      if (existingRep) {
        // Update existing node instead of adding duplicate
        const targetSl = existingRep.sl || 1;
        const repObj = Object.assign({}, existingRep, {
          replace_id: cleanRepId,
          replace_name: payload.replace_name || (repEmp ? repEmp.name : existingRep.replace_name),
          replace_designation: payload.designation || (repEmp ? repEmp.designation : existingRep.replace_designation),
          replace_section: payload.section || (repEmp ? repEmp.section : existingRep.replace_section),
          replace_doj: payload.replace_date || payload.doj || existingRep.replace_doj,
          new_id: sid,
          new_name: payload.name || existingRep.new_name,
          new_designation: payload.designation || existingRep.new_designation,
          new_section: payload.section || existingRep.new_section,
          new_doj: payload.doj || existingRep.new_doj,
          remarks: payload.replace_reason || existingRep.remarks
        });
        const repRef = ref(db, `mep_hrm/replacements/rep_${targetSl}`);
        await set(repRef, repObj);
      } else {
        const newSl = repMaster.length + 1;
        const repObj = {
          sl: newSl,
          replace_id: cleanRepId,
          replace_name: payload.replace_name || (repEmp ? repEmp.name : ""),
          replace_designation: payload.designation || (repEmp ? repEmp.designation : "Helper"),
          replace_section: payload.section || (repEmp ? repEmp.section : "Fan Assemble Line"),
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
      }
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
async function deleteEmployee(staffId, slNo, skipServerCall = false) {
  const sid = cleanStaffId(staffId);
  if (!sid) throw new Error("Staff ID required to delete employee");

  console.log(`[HRM_FIREBASE] 🗑️ Deleting employee #${sid} from Cloud RTDB...`);
  const empRef = ref(db, `mep_hrm/employees/emp_${sid}`);
  await remove(empRef);

  // Update cloud metadata
  try {
    await set(ref(db, "mep_hrm/meta/last_updated"), Date.now());
  } catch (e) {}

  // Parallel server delete if not already performed by caller
  if (!skipServerCall) {
    fetch('/api/hrm/employee/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff_id: sid, sl_no: slNo })
    }).catch(e => console.warn(e));
  }
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
  const targetSec = transferRecord.to_section || transferRecord.target_section || transferRecord.new_section;
  if (targetSec) {
    const secRef = ref(db, `mep_hrm/employees/emp_${sid}/section`);
    await set(secRef, targetSec);
  }

  // Update metadata
  try {
    await set(ref(db, "mep_hrm/meta/last_updated"), Date.now());
  } catch (e) {}

  // Avoid redundant server call if transfer already created on server
  if (!transferRecord.id) {
    fetch('/api/hrm/transfer/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transferRecord)
    }).catch(e => console.warn(e));
  }
}

/**
 * Revert Section Transfer in Firebase RTDB
 */
async function revertTransfer(transferId, staffId, prevSection, skipServerCall = false) {
  const sid = cleanStaffId(staffId);
  const trRef = ref(db, `mep_hrm/transfers/tr_${transferId}`);
  await remove(trRef);

  if (sid && prevSection) {
    const secRef = ref(db, `mep_hrm/employees/emp_${sid}/section`);
    await set(secRef, prevSection);
  }

  if (!skipServerCall) {
    fetch('/api/hrm/transfer/revert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transfer_id: transferId, id: transferId, staff_id: sid, prev_section: prevSection })
    }).catch(e => console.warn(e));
  }
}

/**
 * Delete Replacement record from Firebase RTDB and restore replaced employee status
 */
async function deleteReplacement(sl, repId, newId) {
  if (sl) {
    console.log(`[HRM_FIREBASE] 🗑️ Deleting replacement record rep_${sl} from Cloud RTDB...`);
    const repRef = ref(db, `mep_hrm/replacements/rep_${sl}`);
    await remove(repRef).catch(e => console.warn(e));
  }

  const cleanRep = cleanStaffId(repId);
  if (cleanRep) {
    console.log(`[HRM_FIREBASE] 🔄 Restoring employee #${cleanRep} status to Active in Cloud RTDB...`);
    const stRef = ref(db, `mep_hrm/employees/emp_${cleanRep}/status`);
    await set(stRef, 'Active').catch(e => console.warn(e));
    const remRef = ref(db, `mep_hrm/employees/emp_${cleanRep}/remarks`);
    await set(remRef, '').catch(e => console.warn(e));
    const rIdRef = ref(db, `mep_hrm/employees/emp_${cleanRep}/replace_id`);
    await set(rIdRef, '').catch(e => console.warn(e));
  }

  const cleanNew = cleanStaffId(newId);
  if (cleanNew) {
    const rIdRef = ref(db, `mep_hrm/employees/emp_${cleanNew}/replace_id`);
    await set(rIdRef, '').catch(e => console.warn(e));
    const rNameRef = ref(db, `mep_hrm/employees/emp_${cleanNew}/replace_name`);
    await set(rNameRef, '').catch(e => console.warn(e));
    const htRef = ref(db, `mep_hrm/employees/emp_${cleanNew}/hiring_type`);
    await set(htRef, '').catch(e => console.warn(e));
  }

  try {
    await set(ref(db, "mep_hrm/meta/last_updated"), Date.now());
  } catch (e) {}
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

/**
 * Save Permanent Employees in Firebase RTDB
 */
async function savePermanentEmployees(permanentList) {
  if (!Array.isArray(permanentList)) return;
  console.log(`[HRM_FIREBASE] 📋 Saving ${permanentList.length} permanent employees to Cloud RTDB...`);
  const permRef = ref(db, "mep_hrm/permanent_employees");
  await set(permRef, permanentList);

  fetch('/api/hrm/permanent-employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(permanentList)
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
  deleteReplacement: deleteReplacement,
  saveTransfer: saveTransfer,
  revertTransfer: revertTransfer,
  saveSummarySpecs: saveSummarySpecs,
  savePermanentEmployees: savePermanentEmployees
};

// Dispatch ready event
window.dispatchEvent(new CustomEvent('hrm-firebase-ready', { detail: { db } }));
console.log("[HRM_FIREBASE] ✅ Firebase Realtime Cloud Engine v12.19.0 initialized successfully.");
