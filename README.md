# 🏢 MEP GROUP — Enterprise Human Resource Management (HRM) Online Cloud Edition

**Standalone Realtime Cloud HRM System (Flat Single-Folder Edition)**

This folder contains the complete, self-contained **MEP HRM Module** ready for instant local access or 1-click deployment to **GitHub Pages**. All components, controllers, cache layers, styling engines, and Firebase Realtime Database connections are included with zero external server dependencies.

---

## ⚡ 1. Direct Local Access (Offline / Local Desktop)
Simply double-click **`index.html`** in this folder to open the HRM Cockpit immediately in your web browser.
- **Auto-Authentication:** You are automatically logged in as authorized executive (**Md. Saiful Islam**). No login screen or redirects.
- **Offline Reliability:** If internet connection is unavailable, all employee records, sections, and historical increments load instantly from high-speed local memory caches.
- **Cloud Connectivity:** When connected to the internet, it connects to Google Firebase Realtime Database with live bidirectional WebSocket synchronization.

---

## 🚀 2. GitHub Pages Deployment Guide (Step-by-Step, No Git Required)

You do not need Git, GitHub Desktop, or command lines. You can host this live on GitHub in under 2 minutes:

### Step 1: Create a New GitHub Repository
1. Log in to [github.com](https://github.com).
2. Click the **`+`** icon in the top right corner and choose **"New repository"**.
3. Name your repository (e.g., `mep-hrm` or `hrm-cloud`).
4. Select **Public** (free GitHub Pages hosting is enabled on Public repositories).
5. Click **"Create repository"**.

### Step 2: Upload Files via Drag-and-Drop
1. On the new repository page, click the link: **"uploading an existing file"**.
2. Open this folder (`MEP-HRM-ONLINE-FLAT`) on your computer.
3. Press **`Ctrl + A`** on your keyboard to select all files simultaneously.
4. Drag and drop all selected files into the GitHub browser upload box.
5. Scroll down and click the green **"Commit changes"** button.

### Step 3: Enable GitHub Pages (Instant Live Website)
1. Go to the **Settings** tab at the top of your GitHub repository.
2. In the left navigation menu, click **Pages**.
3. Under **Build and deployment**:
   - **Source:** Select `Deploy from a branch`
   - **Branch:** Select `main` (or `master`) and keep folder as `/ (root)`.
   - Click **Save**.
4. Wait 30–60 seconds and refresh the page. You will receive your official live website URL:
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
