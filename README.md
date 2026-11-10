# 🏢 MEP GROUP — Enterprise Human Resource Management (HRM) Online Cloud Edition

**Standalone Realtime Cloud HRM System (Multi-Folder Structured Edition)**

This folder contains the complete, self-contained **MEP HRM Module** structured with dedicated `js/`, `data/`, and `assets/` subdirectories. It is ready for direct local execution or standard Git repository deployment to **GitHub Pages**.

---

## ⚡ 1. Direct Local Access (Offline / Local Desktop)
Simply double-click **`index.html`** in this folder to open the HRM Cockpit immediately in your web browser.
- **Auto-Authentication:** You are automatically logged in as authorized executive (**Md. Saiful Islam**). No login screen or redirects.
- **Offline Reliability:** All employee records, section distributions, and historical increments load instantly from local memory caches.
- **Cloud Connectivity:** When connected to the internet, it connects to Google Firebase Realtime Database with live bidirectional WebSocket synchronization.

---

## 🚀 2. GitHub Pages Deployment Guide (Step-by-Step)

### Step 1: Create a New GitHub Repository
1. Log in to [github.com](https://github.com).
2. Click the **`+`** icon in the top right corner and choose **"New repository"**.
3. Name your repository (e.g., `mep-hrm` or `hrm-cloud`).
4. Select **Public** and click **"Create repository"**.

### Step 2: Upload Files (Using Git CLI or GitHub Desktop or Web Upload)
- **Option A (GitHub Desktop / Git CLI):** Clone the repo, copy all files and folders (`index.html`, `js/`, `data/`, `assets/`, `README.md`) into your cloned folder, commit and push.
- **Option B (Browser Drag-and-Drop):** In Chrome/Edge, open the repository page on github.com, click "uploading an existing file", drag this entire folder's contents, and commit changes.

### Step 3: Enable GitHub Pages
1. Go to **Settings -> Pages**.
2. Under **Build and deployment**:
   - **Source:** Select `Deploy from a branch`
   - **Branch:** Select `main` (or `master`) and keep folder `/ (root)`.
   - Click **Save**.
3. Your live link will be ready in under 1 minute:
   👉 **`https://<your-username>.github.io/<repo-name>/`**

---

## 💎 Included HRM Features & Modules
1. **Executive HRM Intelligence Dashboard:** Active staff, male/female distribution, payroll valuation, M/S/Worker grade demographics.
2. **Manpower Summary Matrix:** Authorized vs Actual staffing quotas across all production lines with live Firebase spec editing.
3. **Section Wise Monthly Salary (8H & OT):** 09 Ceiling Fan lines + 02 Specialized lines, overtime calculations, drilldown roster modals.
4. **Personnel Directory (Active / Inactive / Hold):** $O(1)$ fast search, section filtering, instant status toggling, replacement predecessor tracking.
5. **Permanent Employee Register (100 Staff):** Service duration (Days, Years), joining & permanent dates, export to Excel/CSV/PDF.
6. **Yearly Increment Matrix (2021–2026):** Multi-year fiscal records, percentage of basic salary, styled Excel/PDF reports.
7. **Inter-Section Transfer Register:** 2-step interactive transfer wizard with 1-click revert capability and automatic live count updates.
8. **Employee Data Entry & Replacement Management:** New hire registration, predecessor replacement audit report, hold shelf.
9. **Attendance & ERP Reports Hub:** Daily attendance sheet, monthly sheet (20220522), leave information (611111), and 34 live ERP reports.
10. **Firebase Realtime WebSocket Engine:** Automatic live cloud synchronization across all devices and active sessions.
