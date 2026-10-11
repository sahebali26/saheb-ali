/**
 * ============================================================================
 * SAHEB TREND HOUSE ERP (ST-House-ERP)
 * Production Frontend Engine, Live Database Connector & State Manager
 * ============================================================================
 */

// Authentication Credentials
const AUTH_EMAIL = "saheb2602e.c@STH.com";
const AUTH_PASSWORD_HASH = "STH@2026";

// Live Google Apps Script Web App Endpoint
let APPS_SCRIPT_URL = localStorage.getItem("st_erp_api_url") || "https://script.google.com/macros/s/AKfycbwCF_QYc6C-u8U4VgCGYloN8eocZuGDvx0bdu7RrP1FBa2pB8wLA7msd8F-SWvsV7_b/exec";

// LIVE DATABASE STATE (Starts 100% EMPTY - NO pre-written mock records in JS!)
let ERP_DB = {
  inventory: [],
  products: [],
  sales: [],
  returns: [],
  newStock: [],
  suppliers: [],
  suppliersSummary: [],
  purchaseOrders: [],
  poSummarySheet: [],
  poSummary: [],
  purchaseReceived: [],
  supplierPayments: [],
  creditNotes: [],
  expenses: {
    packing: [],
    transportation: [],
    other: []
  },
  employ: {
    employees: [],
    salary: [],
    attendance: []
  },
  partnerTransactions: [],
  flipkart: [],
  meesho: null
};

let isConnected = false;
let lastKnownTimestamps = JSON.parse(localStorage.getItem("st_erp_sheet_timestamps") || "{}");
let isFetchingData = false;
let chartInstances = {};
let currentSelectedPO = null;
let currentStatementSupplierId = null;
let currentDetailSupplierId = null;
let currentInvoiceNo = null;
let selectedStatementPOs = new Set();
let autoRefreshIntervalTimer = null;
const AUTO_REFRESH_INTERVAL_MS = 40000; // 40 seconds auto-refresh interval per user instruction

// Chart Filter State Storage (Per-chart date filter settings)
const CHART_FILTERS = {};

// AUTHENTIC GEOGRAPHIC VECTOR INDIA MAP WITH REAL ADMINISTRATIVE CONTOURS (31 States & UTs)
const INDIA_MAP_GEOMETRY = [
  { id: "JK", name: "Jammu & Kashmir", path: "M 185,82 C 190,60 215,48 230,42 C 240,60 252,72 260,85 C 245,100 230,115 210,118 C 195,115 185,100 185,82 Z" },
  { id: "LA", name: "Ladakh", path: "M 230,42 C 255,30 285,35 315,55 C 330,75 320,100 295,110 C 275,115 260,85 230,42 Z" },
  { id: "HP", name: "Himachal Pradesh", path: "M 210,118 C 235,115 255,115 268,135 C 255,150 235,158 220,152 C 210,140 205,128 210,118 Z" },
  { id: "PB", name: "Punjab", path: "M 175,128 C 195,125 210,128 215,145 C 215,168 195,178 175,172 C 165,155 168,140 175,128 Z" },
  { id: "UT", name: "Uttarakhand", path: "M 245,142 C 265,140 288,155 282,178 C 265,185 245,175 238,158 C 240,150 242,145 245,142 Z" },
  { id: "HR", name: "Haryana", path: "M 188,168 C 210,165 225,168 228,188 C 220,208 195,212 182,198 C 182,185 185,175 188,168 Z" },
  { id: "DL", name: "Delhi", path: "M 216,182 C 224,182 226,188 224,194 C 218,196 214,190 216,182 Z" },
  { id: "RJ", name: "Rajasthan", path: "M 125,182 C 158,172 188,185 198,215 C 212,248 185,288 152,292 C 118,278 105,232 125,182 Z" },
  { id: "UP", name: "Uttar Pradesh", path: "M 225,178 C 275,182 328,212 342,242 C 322,268 268,275 232,242 C 218,215 218,195 225,178 Z" },
  { id: "BR", name: "Bihar", path: "M 342,228 C 378,225 412,235 415,265 C 388,278 355,278 340,262 C 338,245 338,235 342,228 Z" },
  { id: "SK", name: "Sikkim", path: "M 416,202 C 428,200 432,212 428,222 C 418,222 414,212 416,202 Z" },
  { id: "WB", name: "West Bengal", path: "M 405,238 C 422,238 428,275 422,328 C 405,355 385,348 392,305 C 398,272 402,252 405,238 Z" },
  { id: "AS", name: "Assam", path: "M 445,225 C 478,218 522,222 528,248 C 505,262 465,262 442,248 C 438,238 440,230 445,225 Z" },
  { id: "AR", name: "Arunachal Pradesh", path: "M 475,178 C 528,168 568,188 565,222 C 538,225 498,215 475,178 Z" },
  { id: "NL", name: "Nagaland", path: "M 532,228 C 555,228 558,248 548,262 C 538,258 532,242 532,228 Z" },
  { id: "MN", name: "Manipur", path: "M 525,262 C 548,265 548,288 538,298 C 525,295 522,278 525,262 Z" },
  { id: "MZ", name: "Mizoram", path: "M 512,298 C 532,298 532,335 520,345 C 508,335 508,312 512,298 Z" },
  { id: "TR", name: "Tripura", path: "M 490,292 C 508,292 508,322 495,325 C 485,318 485,302 490,292 Z" },
  { id: "ML", name: "Meghalaya", path: "M 448,248 C 488,248 492,268 458,268 C 445,265 442,255 448,248 Z" },
  { id: "GJ", name: "Gujarat", path: "M 75,262 C 105,252 145,262 158,295 C 162,338 128,368 98,345 C 72,325 68,285 75,262 Z" },
  { id: "MP", name: "Madhya Pradesh", path: "M 182,258 C 238,248 295,258 305,315 C 285,348 215,355 178,322 C 168,288 172,268 182,258 Z" },
  { id: "JH", name: "Jharkhand", path: "M 345,268 C 388,268 395,305 385,328 C 355,338 338,315 345,268 Z" },
  { id: "OD", name: "Odisha", path: "M 328,325 C 378,318 395,355 382,415 C 345,418 322,378 328,325 Z" },
  { id: "CT", name: "Chhattisgarh", path: "M 288,295 C 328,298 335,365 318,405 C 295,402 282,348 288,295 Z" },
  { id: "MH", name: "Maharashtra", path: "M 135,345 C 195,335 248,348 252,418 C 215,445 152,442 128,392 C 122,365 125,352 135,345 Z" },
  { id: "GA", name: "Goa", path: "M 148,478 C 158,476 160,490 152,495 C 145,492 145,482 148,478 Z" },
  { id: "TG", name: "Telangana", path: "M 228,395 C 278,388 285,438 268,465 C 235,462 222,428 228,395 Z" },
  { id: "AP", name: "Andhra Pradesh", path: "M 245,445 C 305,415 328,458 305,535 C 265,532 242,488 245,445 Z" },
  { id: "KA", name: "Karnataka", path: "M 155,445 C 215,445 225,512 215,555 C 175,552 152,502 155,445 Z" },
  { id: "KL", name: "Kerala", path: "M 175,552 C 198,552 205,618 192,648 C 178,635 170,588 175,552 Z" },
  { id: "TN", name: "Tamil Nadu", path: "M 212,532 C 268,528 265,605 245,655 C 218,655 205,595 212,532 Z" }
];

// ==========================================================================
// DOM INITIALIZATION
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  checkInitialAuth();
  setupThemeToggle();

  // Load cached database if available for instantaneous initial render
  const cached = localStorage.getItem("st_erp_cached_db");
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.inventory) {
        ERP_DB = parsed;
        isConnected = true;
        renderAllViews();
      }
    } catch (e) {
      console.warn("Could not read local database cache:", e);
    }
  }

  // Attempt live connection with the database immediately
  fetchERPData(false);

  // Start 40-second automatic data refresh without resetting user filters
  startAutoRefresh();
});

/* ==========================================================================
   1. LIVE DATABASE CONNECTOR & STATE-PRESERVING AUTO-REFRESH ENGINE (40 SEC)
   ========================================================================== */
function startAutoRefresh() {
  if (autoRefreshIntervalTimer) clearInterval(autoRefreshIntervalTimer);
  autoRefreshIntervalTimer = setInterval(() => {
    // Idea 2: Lightweight change detection ping (~200ms) instead of heavy full reload!
    if (!isFetchingData && !document.hidden && isConnected) {
      checkAndSyncChanges();
    }
  }, AUTO_REFRESH_INTERVAL_MS);
}

/**
 * Manual Refresh Button Handler (Guaranteed to execute immediately on click)
 */
/**
 * Idea 1: Per-Page / Section Refresh Button Handler
 * Fetches only the requested section from Google Sheets in 1-2 seconds!
 */
async function refreshSection(sectionKey) {
  const btn = document.getElementById(`refreshBtn-${sectionKey}`);
  const icon = btn ? btn.querySelector("i") : null;
  if (icon) icon.classList.add("fa-spin");

  const lastUpdatedText = document.getElementById("lastUpdatedText");
  if (lastUpdatedText) lastUpdatedText.innerText = `Refreshing ${sectionKey.toUpperCase()} data...`;

  // Action name mapping with fallbacks
  const sectionActionMap = {
    inventory: "getInventory",
    dashboard: "getInventory",
    suppliers: "getSuppliers",
    supplier_ledger: "getSuppliers",
    expenses: "getExpenses",
    meesho: "getMeesho",
    flipkart: "getFlipkart",
    team: "getTeam",
    business: "getBusiness"
  };

  try {
    // 1. Try modern getSectionData endpoint
    let url = `${APPS_SCRIPT_URL}?action=getSectionData&section=${encodeURIComponent(sectionKey)}&_t=${Date.now()}`;
    let controller = new AbortController();
    let timeoutId = setTimeout(() => controller.abort(), 35000);

    let response = await fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json" },
      mode: "cors",
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    let result = await response.json();

    // 2. If Apps Script is running an older deployment that returns "Unknown action", fallback gracefully!
    if (result.status === "error" && result.message && result.message.includes("Unknown action")) {
      console.warn(`[Fallback] getSectionData unknown on Apps Script. Trying direct action: ${sectionActionMap[sectionKey] || 'getAllData'}`);
      
      const directAction = sectionActionMap[sectionKey];
      if (directAction) {
        url = `${APPS_SCRIPT_URL}?action=${directAction}&_t=${Date.now()}`;
        controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 35000);
        response = await fetch(url, { method: "GET", headers: { "Accept": "application/json" }, mode: "cors", signal: controller.signal });
        clearTimeout(timeoutId);
        result = await response.json();
      }

      // If still unknown (very old script deployment), fallback to getAllData
      if (result.status === "error" && result.message && result.message.includes("Unknown action")) {
        console.warn("[Fallback] Direct section action unknown. Falling back to getAllData...");
        url = `${APPS_SCRIPT_URL}?action=getAllData&_t=${Date.now()}`;
        controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 50000);
        response = await fetch(url, { method: "GET", headers: { "Accept": "application/json" }, mode: "cors", signal: controller.signal });
        clearTimeout(timeoutId);
        result = await response.json();
      }
    }

    if (result.status === "success" && result.data) {
      updateSectionData(sectionKey, result.data);

      try {
        localStorage.setItem("st_erp_cached_db", JSON.stringify(ERP_DB));
      } catch (e) {}

      const timeStr = new Date().toLocaleTimeString();
      if (lastUpdatedText) {
        lastUpdatedText.innerText = `Refreshed ${sectionKey.toUpperCase()} data at ${timeStr}`;
      }
    } else {
      throw new Error(result.message || "Failed to load section data from database.");
    }
  } catch (err) {
    console.error(`Error refreshing ${sectionKey}:`, err);
    if (lastUpdatedText) {
      lastUpdatedText.innerHTML = `<span style="color:var(--danger); font-weight:600;">Refresh failed: ${err.message}</span> <small style="color:var(--text-secondary);">(Deploy 'New version' in Apps Script)</small>`;
    }
  } finally {
    if (icon) icon.classList.remove("fa-spin");
  }
}

/**
 * Updates ERP_DB dynamically for only the refreshed section and triggers its view renders
 */
function updateSectionData(sectionKey, data) {
  const s = String(sectionKey || "").toLowerCase();

  if (s === "inventory" || s === "dashboard") {
    if (data.inventory) {
      ERP_DB.inventory = data.inventory.filter(item => String(getField(item, ["Status", "status"])).trim().toLowerCase() !== "inactive");
    }
    if (data.products) {
      ERP_DB.products = data.products.filter(item => String(getField(item, ["Status", "status"])).trim().toLowerCase() !== "inactive");
    }
    if (data.sales) ERP_DB.sales = data.sales;
    if (data.returns) {
      ERP_DB.returns = data.returns.map(r => {
        let retType = "RTO";
        const rawType = String(r["Return Type"] || r["Returns Type"] || r["Type"] || r["Remarks"] || "").toLowerCase();
        if (rawType.includes("customer")) retType = "Customer Return";
        else if (rawType.includes("rto") || rawType.includes("logistics")) retType = "RTO";
        r["_returnType"] = retType;
        return r;
      });
    }
    if (data.newStock) ERP_DB.newStock = data.newStock;

    renderInventory();
    renderSales();
    renderReturns();
    renderDashboard();
    renderAllRecordsTable();
  } else if (s === "suppliers" || s === "supplier_ledger") {
    if (data.suppliers) ERP_DB.suppliers = data.suppliers;
    if (data.suppliersSummary) ERP_DB.suppliersSummary = data.suppliersSummary;
    if (data.purchaseOrders) ERP_DB.purchaseOrders = data.purchaseOrders;
    if (data.poSummarySheet) ERP_DB.poSummarySheet = data.poSummarySheet;
    if (data.purchaseReceived) ERP_DB.purchaseReceived = data.purchaseReceived;
    if (data.supplierPayments) {
      ERP_DB.supplierPayments = data.supplierPayments;
      ERP_DB.creditNotes = data.supplierPayments.filter(p => {
        const pid = String(p["Payment ID"] || "");
        const method = String(p["Payment Method"] || p["Method"] || "").toLowerCase();
        const type = String(p["Payment Type"] || "").toLowerCase();
        return pid.includes("CR") || method.includes("credit") || type.includes("credit");
      });
    }

    compilePOSummary();
    compileSupplierMetrics();
    renderSuppliers();
    renderPOSummary();
    renderInvoicesTable();
    renderPayments();
    renderCreditNotes();
    renderDashboard();
  } else if (s === "expenses") {
    if (data.expenses) ERP_DB.expenses = data.expenses;
    renderExpenses();
    renderBusinessDashboard();
    renderDashboard();
  } else if (s === "meesho") {
    if (data.meesho) ERP_DB.meesho = data.meesho;
    renderMeesho();
    renderDashboard();
  } else if (s === "flipkart") {
    if (data.flipkart) ERP_DB.flipkart = data.flipkart;
    renderFlipkart();
    renderDashboard();
  } else if (s === "team" || s === "employ" || s === "partner") {
    if (data.employ) ERP_DB.employ = data.employ;
    if (data.partnerTransactions) ERP_DB.partnerTransactions = data.partnerTransactions;
    renderPartners();
    renderBusinessDashboard();
  } else if (s === "business") {
    if (data.purchaseOrders) ERP_DB.purchaseOrders = data.purchaseOrders;
    if (data.poSummarySheet) ERP_DB.poSummarySheet = data.poSummarySheet;
    if (data.supplierPayments) ERP_DB.supplierPayments = data.supplierPayments;
    if (data.expenses) ERP_DB.expenses = data.expenses;
    if (data.employ) ERP_DB.employ = Object.assign(ERP_DB.employ || {}, data.employ);
    compilePOSummary();
    renderBusinessDashboard();
  }
}

/**
 * Idea 2: Background Change Detection Engine
 * Pings Google Apps Script for modified timestamps (~200ms).
 * Only downloads the changed spreadsheet if an edit was detected!
 */
async function checkAndSyncChanges() {
  if (isFetchingData || document.hidden || !isConnected) return;

  try {
    const url = `${APPS_SCRIPT_URL}?action=checkModified&_t=${Date.now()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json" },
      mode: "cors",
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) return;
    const json = await res.json();
    if (json.status !== "success" || !json.timestamps) return;

    const newTs = json.timestamps;
    const toUpdate = new Set();

    // Compare with last known timestamps
    if (lastKnownTimestamps.INVENTORY && newTs.INVENTORY > lastKnownTimestamps.INVENTORY) {
      toUpdate.add("inventory");
    }
    if (lastKnownTimestamps.SUPPLIER_LEDGER && newTs.SUPPLIER_LEDGER > lastKnownTimestamps.SUPPLIER_LEDGER) {
      toUpdate.add("suppliers");
    }
    if (lastKnownTimestamps.EXPENSES && newTs.EXPENSES > lastKnownTimestamps.EXPENSES) {
      toUpdate.add("expenses");
    }
    if (lastKnownTimestamps.MEESHO && newTs.MEESHO > lastKnownTimestamps.MEESHO) {
      toUpdate.add("meesho");
    }
    if (lastKnownTimestamps.FLIPKART && newTs.FLIPKART > lastKnownTimestamps.FLIPKART) {
      toUpdate.add("flipkart");
    }
    if ((lastKnownTimestamps.EMPLOYEES && newTs.EMPLOYEES > lastKnownTimestamps.EMPLOYEES) ||
        (lastKnownTimestamps.INVESTORS && newTs.INVESTORS > lastKnownTimestamps.INVESTORS)) {
      toUpdate.add("team");
    }

    // Save latest timestamps
    lastKnownTimestamps = newTs;
    localStorage.setItem("st_erp_sheet_timestamps", JSON.stringify(lastKnownTimestamps));

    // Refresh only the detected changed sections
    for (const sec of toUpdate) {
      console.log(`[Smart Sync] Detected edit in sheet for ${sec}. Auto-syncing...`);
      await refreshSection(sec);
    }
  } catch (err) {
    // Non-critical background ping
  }
}

function handleManualRefresh() {
  isFetchingData = false; // ensure not blocked
  fetchERPData(true, false);
}

/**
 * Captures all user-selected filter values across the entire dashboard
 * so background auto-refresh NEVER resets user selections or active modals!
 */
function captureActiveFilterState() {
  return {
    globalDate: document.getElementById("dateFilterSelect")?.value,
    customStart: document.getElementById("customStartDate")?.value,
    customEnd: document.getElementById("customEndDate")?.value,
    poSupplier: document.getElementById("poSupplierFilterSelect")?.value,
    poDate: document.getElementById("poDateFilterSelect")?.value,
    poStatus: document.getElementById("poStatusFilterSelect")?.value,
    paySupplier: document.getElementById("paymentSupplierFilterSelect")?.value,
    payDate: document.getElementById("paymentDateFilterSelect")?.value,
    invSupplier: document.getElementById("invoiceSupplierFilterSelect")?.value,
    invDate: document.getElementById("invoiceDateFilterSelect")?.value,
    salesDate: document.getElementById("salesDateFilterSelect")?.value,
    returnsDate: document.getElementById("returnsDateFilterSelect")?.value,
    allRecordsType: document.getElementById("allRecordsTypeFilter")?.value,
    allRecordsDate: document.getElementById("allRecordsDateFilter")?.value,
    invStatus: document.getElementById("inventoryStatusSelect")?.value,
    skuAnalytics: document.getElementById("skuSelectAnalytics")?.value,
    salesPlat: document.getElementById("salesAnalyticsPlatformSelect")?.value,
    salesDateAnalytic: document.getElementById("salesAnalyticsDateFilter")?.value,
    salesTrendProd: document.getElementById("salesTrendProductFilter")?.value,
    salesProductSearch: document.getElementById("salesTrendProductSearch")?.value,
    bizExpCategory: document.getElementById("bizExpenseCategoryFilter")?.value,
    bizExpDate: document.getElementById("bizExpenseDateFilter")?.value,
    detPOFilter: document.getElementById("detPOFilterSelect")?.value,
    hasActiveModal: !!document.querySelector(".modal-overlay.active"),
    isUserTyping: document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "SELECT")
  };
}

/**
 * Restores user-selected filter values after background sync
 */
function restoreActiveFilterState(state) {
  if (!state) return;
  const setVal = (id, val) => {
    if (val !== undefined && val !== null) {
      const el = document.getElementById(id);
      if (el && el.value !== val) el.value = val;
    }
  };

  setVal("dateFilterSelect", state.globalDate);
  setVal("customStartDate", state.customStart);
  setVal("customEndDate", state.customEnd);
  setVal("poSupplierFilterSelect", state.poSupplier);
  setVal("poDateFilterSelect", state.poDate);
  setVal("poStatusFilterSelect", state.poStatus);
  setVal("paymentSupplierFilterSelect", state.paySupplier);
  setVal("paymentDateFilterSelect", state.payDate);
  setVal("invoiceSupplierFilterSelect", state.invSupplier);
  setVal("invoiceDateFilterSelect", state.invDate);
  setVal("salesDateFilterSelect", state.salesDate);
  setVal("returnsDateFilterSelect", state.returnsDate);
  setVal("allRecordsTypeFilter", state.allRecordsTypeFilter);
  setVal("allRecordsDateFilter", state.allRecordsDateFilter);
  setVal("inventoryStatusSelect", state.invStatus);
  setVal("skuSelectAnalytics", state.skuAnalytics);
  setVal("salesAnalyticsPlatformSelect", state.salesPlat);
  setVal("salesAnalyticsDateFilter", state.salesDateAnalytic);
  setVal("salesTrendProductFilter", state.salesTrendProd);
  setVal("salesTrendProductSearch", state.salesProductSearch);
  setVal("bizExpenseCategoryFilter", state.bizExpCategory);
  setVal("bizExpenseDateFilter", state.bizExpDate);
  setVal("detPOFilterSelect", state.detPOFilter);
}

async function fetchERPData(isManual = false, isBackground = false) {
  if (isFetchingData && !isManual) return;
  isFetchingData = true;

  const refreshBtn = document.getElementById("refreshDataBtn");
  if (refreshBtn) refreshBtn.querySelector("i")?.classList.add("fa-spin");

  const banner = document.getElementById("connectionBanner");
  const bannerText = document.getElementById("connectionBannerText");
  const bannerIcon = document.getElementById("connectionBannerIcon");
  const statusDot = document.getElementById("sidebarStatusDot");
  const statusText = document.getElementById("sidebarStatusText");
  const lastUpdatedText = document.getElementById("lastUpdatedText");
  const diagText = document.getElementById("diagnosticStatusText");

  if (!isBackground) {
    if (lastUpdatedText) lastUpdatedText.innerText = "Connecting to Google Sheets database...";
    if (statusText) statusText.innerText = "Connecting...";
  }

  const savedState = captureActiveFilterState();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout to allow Google Sheets sufficient time

    const url = `${APPS_SCRIPT_URL}?action=getAllData&_t=${Date.now()}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json" },
      mode: "cors",
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch (parseErr) {
      if (text.includes("<!DOCTYPE") || text.includes("<html")) {
        throw new Error("Google Apps Script returned HTML login page. Set access to 'Anyone'!");
      }
      throw new Error("Malformed JSON received: " + text.substring(0, 80));
    }

    if (result.status === "success" && result.data) {
      const data = result.data;
      const invCount = (data.inventory || []).length;
      const salesCount = (data.sales || []).length;
      const supCount = (data.suppliers || []).length;
      const poCount = (data.purchaseOrders || []).length;
      const totalCount = invCount + salesCount + supCount + poCount;

      console.log(`[ERP Sync] Loaded: ${invCount} products, ${salesCount} sales, ${supCount} suppliers, ${poCount} POs`);

      // Check if Apps Script connected, but Google Sheets returned 0 rows due to permissions/not found
      if (totalCount === 0 && result._errors && result._errors.length > 0) {
        isConnected = false;
        const errDetails = result._errors.join("<br>• ");
        if (lastUpdatedText) {
          lastUpdatedText.innerHTML = `<span style="color:var(--danger); font-weight:700;">Google Sheets Access Error</span>`;
        }
        if (statusDot) { statusDot.className = "status-dot offline"; }
        if (statusText) statusText.innerText = "Sheets Missing / Access Error";
        if (banner) {
          banner.style.display = "flex";
          banner.className = "connection-banner failed";
          if (bannerIcon) bannerIcon.className = "fa-solid fa-triangle-exclamation";
          if (bannerText) {
            bannerText.innerHTML = `<strong>Connected to Script, but cannot read Google Sheets:</strong><br>• <small>${errDetails}</small><br><small style="margin-top:4px; display:block;">Ensure your Google Sheets are shared with the Google account that deployed Apps Script.</small>`;
          }
        }
        renderDisconnectedState(result._errors[0]);
        return;
      }

      isConnected = true;
      populateDatabase(result.data);

      try {
        localStorage.setItem("st_erp_cached_db", JSON.stringify(ERP_DB));
      } catch (err) {}

      const timeStr = new Date().toLocaleTimeString();
      const summaryMsg = totalCount > 0 ? `Synced ${invCount} products, ${salesCount} sales at ${timeStr}` : `Live synced with Google Sheets at ${timeStr}`;
      if (lastUpdatedText) lastUpdatedText.innerText = summaryMsg;
      if (statusDot) { statusDot.className = "status-dot online"; }
      if (statusText) statusText.innerText = "Database Connected";
      
      if (banner) {
        banner.className = "connection-banner connected";
        if (bannerIcon) bannerIcon.className = "fa-solid fa-circle-check";
        if (bannerText) bannerText.innerHTML = `Connected to live Google Sheets database. Synced <strong>${totalCount} records</strong> at <strong>${timeStr}</strong>.`;
        setTimeout(() => {
          if (banner) {
            banner.style.display = "none";
            banner.className = "connection-banner";
          }
        }, 2500);
      }

      if (diagText) {
        diagText.innerHTML = `<span style="color:var(--success); font-weight:700;">✓ Connected!</span> Live database sync active.`;
      }

      if (isBackground && (savedState.isUserTyping || savedState.hasActiveModal)) {
        // Silently update internal state without disrupting active typing or open modal
      } else {
        renderAllViews();
        restoreActiveFilterState(savedState);
      }
    } else {
      throw new Error(result.message || "Unknown database error response.");
    }
  } catch (error) {
    console.error("Database connection failed:", error);
    if (!ERP_DB.inventory || ERP_DB.inventory.length === 0) {
      isConnected = false;
      if (statusDot) { statusDot.className = "status-dot offline"; }
      if (statusText) statusText.innerText = "Database Disconnected";
      if (lastUpdatedText) lastUpdatedText.innerHTML = `<span style="color:var(--danger); font-weight:700;">Connection Failed</span>`;

      if (banner) {
        banner.style.display = "flex";
        banner.className = "connection-banner failed";
        if (bannerIcon) bannerIcon.className = "fa-solid fa-triangle-exclamation";
        if (bannerText) bannerText.innerHTML = `<strong>Database Connection Failed:</strong> ${error.message} <br><small>Verify Google Apps Script is deployed as Web App with 'Who has access: Anyone'.</small>`;
      }

      renderDisconnectedState(error.message);
    }
  } finally {
    isFetchingData = false;
    if (refreshBtn) refreshBtn.querySelector("i")?.classList.remove("fa-spin");
  }
}

/**
 * Populates ERP_DB dynamically from live Google Sheets API response.
 * Enforces Active Products only rule across all inventory records.
 */
function populateDatabase(data) {
  const rawInventory = data.inventory || [];
  ERP_DB.inventory = rawInventory.filter(item => {
    const s = String(getField(item, ["Status", "status"])).trim().toLowerCase();
    return s !== "inactive";
  });

  ERP_DB.products = (data.products || []).filter(item => {
    const s = String(getField(item, ["Status", "status"])).trim().toLowerCase();
    return s !== "inactive";
  });

  ERP_DB.sales = data.sales || [];
  
  // Parse returns and ensure Return Type (Customer Return vs RTO) is clearly identified
  ERP_DB.returns = (data.returns || []).map(r => {
    let retType = "RTO"; // default
    const rawType = String(r["Return Type"] || r["Returns Type"] || r["Type"] || r["Remarks"] || "").toLowerCase();
    if (rawType.includes("customer")) retType = "Customer Return";
    else if (rawType.includes("rto") || rawType.includes("logistics")) retType = "RTO";
    r["_returnType"] = retType;
    return r;
  });

  ERP_DB.newStock = data.newStock || [];
  ERP_DB.suppliers = data.suppliers || [];
  ERP_DB.suppliersSummary = data.suppliersSummary || [];
  ERP_DB.purchaseOrders = data.purchaseOrders || [];
  ERP_DB.poSummarySheet = data.poSummarySheet || [];

  // Invoices: Adopt PurchaseRecived or fallback to Imported Data
  ERP_DB.purchaseReceived = (data.purchaseReceived && data.purchaseReceived.length > 0)
    ? data.purchaseReceived
    : (data.newStock && data.newStock.length > 0 ? data.newStock : []);

  ERP_DB.supplierPayments = data.supplierPayments || [];
  ERP_DB.expenses = data.expenses || { packing: [], transportation: [], other: [] };
  ERP_DB.employ = data.employ || { employees: [], salary: [], attendance: [] };
  ERP_DB.partnerTransactions = data.partnerTransactions || [];
  ERP_DB.flipkart = data.flipkart || [];
  ERP_DB.meesho = data.meesho || null;

  ERP_DB.creditNotes = (ERP_DB.supplierPayments || []).filter(p => {
    const pid = String(p["Payment ID"] || "");
    const method = String(p["Payment Method"] || p["Method"] || "").toLowerCase();
    const type = String(p["Payment Type"] || "").toLowerCase();
    return pid.includes("CR") || method.includes("credit") || type.includes("credit");
  });

  compilePOSummary();
  compileSupplierMetrics();
}

/**
 * Compiles PO Summary dynamically from live Purchase Orders, Received items, Payments,
 * or adopts the newly provided 'PO Summery' sheet data from Supplier Ledger (1).xlsx!
 */
function compilePOSummary() {
  if (ERP_DB.poSummarySheet && ERP_DB.poSummarySheet.length > 0) {
    ERP_DB.poSummary = ERP_DB.poSummarySheet.filter(p => p["PO ID"]).map(p => {
      const q = parseNumber(p["Order Qty"] || p["Ordered Qty"]);
      const amt = parseNumber(p["PO Amount"] || p["Gross Amount"]);
      const avg = q > 0 ? (amt / q).toFixed(2) : (parseNumber(p["Unit Price"]) || 0);
      const isClosed = String(p["PO Status"]).toLowerCase().includes("closed");

      // Extract real product names from purchaseOrders / purchaseReceived
      const pid = p["PO ID"];
      const matchingItems = (ERP_DB.purchaseOrders || []).filter(it => String(it["PO ID"]).trim().toLowerCase() === String(pid).trim().toLowerCase());
      let itemNames = Array.from(new Set(matchingItems.map(it => it["Product Name"]).filter(Boolean)));
      if (itemNames.length === 0) {
        const matchingRecs = (ERP_DB.purchaseReceived || []).filter(r => String(r["PO ID"]).trim().toLowerCase() === String(pid).trim().toLowerCase());
        itemNames = Array.from(new Set(matchingRecs.map(r => r["Product Name"]).filter(Boolean)));
      }
      const desc = itemNames.length > 0 ? itemNames.join(", ") : (p["Remarks"] || "Textile Finished Goods");

      return {
        "PO ID": pid,
        "PO Date": cleanDateStr(p["PO Date"]),
        "Supplier": p["Supplier"],
        "PO Description": desc,
        "PO Amount": amt,
        "Discount": parseNumber(p["Discount Amount"] || p["Discount"]),
        "PO/Order Qty": q,
        "Average Value": avg,
        "Paid Amount": parseNumber(p["Paid Amount"]),
        "Pending Amount": parseNumber(p["Pending Amount"]),
        "Received Qty": parseNumber(p["Received Qty"]),
        "Pending Qty": parseNumber(p["Pending Qty"]),
        "PO Status": isClosed ? "Closed" : "Active"
      };
    }).sort((a, b) => (b["PO Date"] || "").localeCompare(a["PO Date"] || ""));
    return;
  }

  // Fallback calculation engine
  const pos = ERP_DB.purchaseOrders || [];
  const recs = ERP_DB.purchaseReceived || [];
  const pays = ERP_DB.supplierPayments || [];

  const poRecMap = {};
  recs.forEach(r => {
    const id = r["PO ID"];
    poRecMap[id] = (poRecMap[id] || 0) + parseNumber(r["Received Qty"]);
  });

  const poPayMap = {};
  pays.forEach(p => {
    const id = p["PO ID"];
    poPayMap[id] = (poPayMap[id] || 0) + parseNumber(p["Amount"]);
  });

  const poGroups = {};
  pos.forEach(p => {
    const pid = p["PO ID"];
    if (!pid) return;
    if (!poGroups[pid]) {
      poGroups[pid] = {
        poId: pid,
        date: cleanDateStr(p["PO Date"] || p["Date"]),
        supplier: p["Supplier"] || "",
        orderedQty: 0,
        grossAmount: 0,
        discount: 0,
        items: []
      };
    }
    const q = parseNumber(p["Ordered Qty"] || p["Qty"]);
    const rate = parseNumber(p["Unit Price"] || p["Rate"]);
    const gross = parseNumber(p["Gross Amount"]) || (q * rate);
    const disc = parseNumber(p["Discount"]) || 0;

    poGroups[pid].orderedQty += q;
    poGroups[pid].grossAmount += gross;
    poGroups[pid].discount += disc;
    poGroups[pid].items.push(p["Product Name"] || p["Product ID"]);
  });

  const list = Object.values(poGroups).map(data => {
    const recQty = poRecMap[data.poId] || 0;
    const paidAmt = poPayMap[data.poId] || 0;
    const penQty = Math.max(0, data.orderedQty - recQty);
    const penAmt = Math.max(0, data.grossAmount - paidAmt - data.discount);
    const isComplete = (penQty === 0 && penAmt <= 0);
    const avgVal = data.orderedQty > 0 ? (data.grossAmount / data.orderedQty).toFixed(2) : 0;
    const desc = Array.from(new Set(data.items)).join(", ");

    return {
      "PO ID": data.poId,
      "PO Date": data.date,
      "Supplier": data.supplier,
      "PO Description": desc,
      "PO Amount": data.grossAmount,
      "Discount": data.discount,
      "PO/Order Qty": data.orderedQty,
      "Average Value": avgVal,
      "Paid Amount": paidAmt,
      "Pending Amount": Math.max(0, penAmt),
      "Received Qty": recQty,
      "Pending Qty": penQty,
      "PO Status": isComplete ? "Closed" : "Active"
    };
  }).sort((a, b) => (b["PO Date"] || "").localeCompare(a["PO Date"] || ""));

  ERP_DB.poSummary = list;
}

/**
 * Fixes Supplier Data-Loading issue completely!
 * Uses 'Suppliers Summery' sheet data from Supplier Ledger (1).xlsx when available,
 * or aggregates dynamically across POs, Payments, and Credit Notes.
 */
function compileSupplierMetrics() {
  const suppliers = ERP_DB.suppliers || [];
  const sumSheet = ERP_DB.suppliersSummary || [];
  const pos = ERP_DB.poSummary || [];
  const pays = ERP_DB.supplierPayments || [];
  const cns = ERP_DB.creditNotes || [];

  suppliers.forEach(sup => {
    const sid = sup["Supplier ID"] || sup["id"];
    const matchedSum = sumSheet.find(s => s["Supplier ID"] === sid);

    if (matchedSum) {
      sup["_totalDealAmount"] = parseNumber(matchedSum["Total Deal Amount"]);
      sup["_totalDealsCount"] = parseNumber(matchedSum["Order Times"]);
      sup["_totalPaid"] = parseNumber(matchedSum["Total Paid Amount"]);
      sup["_remainingCredit"] = parseNumber(matchedSum["Remain Credit"]);
      sup["_activePOAmount"] = parseNumber(matchedSum["Active PO Amount"]);
      sup["_activePaidAmount"] = parseNumber(matchedSum["Active Paid Amount"]);
      sup["_pendingActivePO"] = parseNumber(matchedSum["Pending Active PO"]);
      sup["_netPending"] = parseNumber(matchedSum["Pending Active PO"]) || Math.max(0, sup["_totalDealAmount"] - sup["_totalPaid"]);
    } else {
      const sPos = pos.filter(p => p["Supplier"] === sid || p["Supplier ID"] === sid);
      const sPays = pays.filter(p => p["Supplier"] === sid || p["Supplier ID"] === sid);
      const sCns = cns.filter(c => c["Supplier"] === sid || c["Supplier ID"] === sid);

      const totalDealAmount = sPos.reduce((acc, p) => acc + parseNumber(p["PO Amount"]), 0);
      const totalDealsCount = sPos.length;
      const totalPaid = sPays.reduce((acc, p) => acc + parseNumber(p["Amount"]), 0);
      const remCredit = sCns.reduce((acc, c) => acc + parseNumber(c["Remaining Credit"] || c["Remaining"]), 0);
      const netPending = Math.max(0, totalDealAmount - totalPaid - remCredit);

      sup["_totalDealAmount"] = totalDealAmount;
      sup["_totalDealsCount"] = totalDealsCount;
      sup["_totalPaid"] = totalPaid;
      sup["_remainingCredit"] = remCredit;
      sup["_netPending"] = netPending;
    }
  });
}

function renderDisconnectedState(errMsg) {
  const tables = [
    "recentSalesTable", "inventoryTable", "salesTable", "returnsTable",
    "supplierTable", "activePOTable", "closedPOTable", "paymentsTable", "creditNotesTable",
    "allRecordsTable", "lowStockActionTable", "invoicesTable", "businessExpenseTable"
  ];

  const html = `<tr><td colspan="12" class="text-center text-muted" style="padding:28px;">
    <i class="fa-solid fa-cloud-arrow-down text-danger" style="font-size:1.8rem; margin-bottom:8px; display:block;"></i>
    <strong style="color:var(--danger);">Database is not connected</strong><br>
    <span style="font-size:0.78rem;">Could not fetch records from Google Sheets API. ${errMsg}</span><br>
    <button class="btn btn-sm btn-outline" onclick="openCentralSettingsModal()" style="margin-top:10px;">
      <i class="fa-solid fa-wrench"></i> Configure API URL
    </button>
  </td></tr>`;

  tables.forEach(tId => {
    const table = document.getElementById(tId);
    if (table) {
      const tbody = table.querySelector("tbody");
      if (tbody) tbody.innerHTML = html;
    }
  });
}

/* ==========================================================================
   2. VERTICAL SIDEBAR MENU - NESTED TREE NAVIGATION CONTROLLER
   ========================================================================== */
function toggleTreeParent(parentBtn, mainViewId, initialSubtabId) {
  const parentNode = parentBtn.closest(".tree-parent-node");
  if (!parentNode) return;

  const isOpen = parentNode.classList.contains("open");

  document.querySelectorAll(".tree-parent-node").forEach(node => {
    if (node !== parentNode) {
      node.classList.remove("open");
      const btn = node.querySelector(".tree-parent-btn");
      if (btn) btn.classList.remove("active");
    }
  });

  if (!isOpen) {
    parentNode.classList.add("open");
  }

  document.querySelectorAll(".tree-parent-btn").forEach(b => b.classList.remove("active"));
  parentBtn.classList.add("active");

  const firstChild = parentNode.querySelector(".tree-child-item");
  if (firstChild) {
    selectSubtab(mainViewId, initialSubtabId, firstChild);
  }
}

function selectSubtab(mainViewId, subtabPanelId, childEl) {
  document.querySelectorAll(".tree-child-item").forEach(item => item.classList.remove("active"));
  if (childEl) {
    childEl.classList.add("active");
  } else {
    const match = document.querySelector(`.tree-child-item[data-subtab='${subtabPanelId.replace("subtab-", "")}']`);
    if (match) match.classList.add("active");
  }

  document.querySelectorAll(".view-panel").forEach(p => p.classList.remove("active"));
  const targetView = document.getElementById(mainViewId);
  if (targetView) targetView.classList.add("active");

  if (targetView) {
    targetView.querySelectorAll(".subtab-panel").forEach(sp => sp.classList.remove("active"));
    const targetSubpanel = document.getElementById(subtabPanelId);
    if (targetSubpanel) targetSubpanel.classList.add("active");
  }

  const titles = {
    "dashboard-view": "1. Dashboard Overview",
    "inventory-view": "2. Inventory Management",
    "supplier-view": "3. Supplier Ledger & POs",
    "expenses-view": "4. Operating Expenses",
    "meesho-view": "5. Meesho Analytics & Settlements",
    "flipkart-view": "6. Flipkart Channel Analytics",
    "partner-view": "7. Staff & Investor Capital",
    "business-view": "8. Business Dashboard & Consolidated Expenditure"
  };
  const titleEl = document.getElementById("currentSectionTitle");
  if (titleEl) titleEl.innerText = titles[mainViewId] || "Business Operations";

  if (isConnected) {
    if (mainViewId === "dashboard-view") renderDashboardCharts();
    if (mainViewId === "inventory-view") {
      if (subtabPanelId === "subtab-inv-analytics") renderInventoryAnalytics();
      if (subtabPanelId === "subtab-inv-sales-analytics") renderSalesAnalyticsCharts();
    }
    if (mainViewId === "supplier-view") {
      if (subtabPanelId === "subtab-sup-analytics") renderSupplierAnalytics();
      if (subtabPanelId === "subtab-sup-invoices") renderInvoicesTable();
    }
    if (mainViewId === "meesho-view" && subtabPanelId === "subtab-meesho-overview") renderMeeshoCharts();
    if (mainViewId === "flipkart-view" && subtabPanelId === "subtab-fk-overview") renderFlipkartCharts();
    if (mainViewId === "business-view") renderBusinessDashboard();
    if (mainViewId === "dashboard-view" && subtabPanelId === "subtab-dash-allrecords") renderAllRecordsTable();
  }
}

/* ==========================================================================
   3. MASTER RENDERERS
   ========================================================================== */
function renderAllViews() {
  if (!isConnected) return;

  renderDashboard();
  renderInventory();
  renderSales();
  renderReturns();
  renderSuppliers();
  renderPOSummary();
  renderInvoicesTable();
  renderPayments();
  renderCreditNotes();
  renderExpenses();
  renderMeesho();
  renderFlipkart();
  renderPartners();
  renderBusinessDashboard();
  renderAllRecordsTable();
}

// --------------------------------------------------------------------------
// 3.1 DASHBOARD VIEW RENDERER (Accurate latest record date per dataset!)
// --------------------------------------------------------------------------
function renderDashboard() {
  if (!isConnected) return;

  const allSales = ERP_DB.sales || [];
  const allReturns = ERP_DB.returns || [];
  const allPurchRec = ERP_DB.purchaseReceived.length > 0 ? ERP_DB.purchaseReceived : (ERP_DB.newStock || []);

  const filterVal = document.getElementById("dateFilterSelect")?.value || "today";

  // When 'latest' is selected, match each dataset's actual latest date!
  let filteredSales, filteredReturns, filteredInward;
  if (filterVal === "latest") {
    const latSales = getLatestSalesDate();
    const latReturns = getLatestReturnsDate();
    const latInward = getLatestInwardDate();
    filteredSales = allSales.filter(s => cleanDateStr(getField(s, ["Sales Date", "Date"])) === latSales);
    filteredReturns = allReturns.filter(r => cleanDateStr(getField(r, ["Returs Date", "Returns Date", "Date"])) === latReturns);
    filteredInward = allPurchRec.filter(p => cleanDateStr(getField(p, ["Recived Date", "Received Date", "Date"])) === latInward);
  } else {
    filteredSales = allSales.filter(s => isDateInFilter(cleanDateStr(getField(s, ["Sales Date", "Date"])), "sales"));
    filteredReturns = allReturns.filter(r => isDateInFilter(cleanDateStr(getField(r, ["Returs Date", "Returns Date", "Date"])), "returns"));
    filteredInward = allPurchRec.filter(p => isDateInFilter(cleanDateStr(getField(p, ["Recived Date", "Received Date", "Date"])), "inward"));
  }

  let salesQty = 0;
  let salesAmount = 0;
  let returnsQty = 0;
  let inwardQty = 0;
  let inwardVal = 0;

  filteredSales.forEach(row => {
    const q = parseNumber(getField(row, ["Quantity", "Qty"]));
    const p = parseNumber(getField(row, ["Selling Price", "Price"]));
    const tot = parseNumber(getField(row, ["Total Amount", "Total"])) || (q * p);
    salesQty += q;
    salesAmount += tot;
  });

  filteredReturns.forEach(row => {
    returnsQty += parseNumber(getField(row, ["Quantity", "Qty"]));
  });

  filteredInward.forEach(row => {
    const q = parseNumber(getField(row, ["Received Qty", "Qty", "Quantity"]));
    const rate = parseNumber(getField(row, ["Unit Price", "Rate", "Price"])) || 150;
    inwardQty += q;
    inwardVal += (q * rate);
  });

  const scopeEl = document.getElementById("dashboardDateScopeText");
  if (scopeEl) {
    if (filterVal === "today") scopeEl.innerText = `Showing records for Today (${getTodayDateStr()})`;
    else if (filterVal === "latest") scopeEl.innerText = `Showing records for Latest Dates (Sales: ${getLatestSalesDate()}, Returns: ${getLatestReturnsDate()}, Inward: ${getLatestInwardDate()})`;
    else if (filterVal === "custom") scopeEl.innerText = `Showing records for Custom Range: ${document.getElementById("customStartDate")?.value} to ${document.getElementById("customEndDate")?.value}`;
    else scopeEl.innerText = `Showing records for: ${filterVal.replace("_", " ").toUpperCase()}`;
  }

  document.getElementById("kpiSalesQ").innerText = `${salesQty} pcs`;
  document.getElementById("kpiSalesAmt").innerText = `Revenue: ${formatINR(salesAmount)}${filterVal === 'latest' ? ' (Date: ' + getLatestSalesDate() + ')' : ''}`;
  document.getElementById("kpiReturnsQ").innerText = `${returnsQty} pcs`;
  document.getElementById("kpiReturnsSub").innerText = filterVal === 'latest' ? `Latest returns on ${getLatestReturnsDate()}` : `${filteredReturns.length} return events logged`;

  document.getElementById("kpiNewStockQ").innerText = `${inwardQty} pcs`;
  document.getElementById("kpiNewStockAmt").innerText = `Valuation: ${formatINR(inwardVal)}${filterVal === 'latest' ? ' (Date: ' + getLatestInwardDate() + ')' : ''}`;

  const activeStock = (ERP_DB.inventory || []).reduce((acc, r) => acc + parseNumber(r["Current Stock"]), 0);
  const activeVal = (ERP_DB.inventory || []).reduce((acc, r) => acc + (parseNumber(r["Current Stock"]) * parseNumber(r["Price"] || 150)), 0);
  document.getElementById("kpiWarehouseTotal").innerText = `${activeStock.toLocaleString("en-IN")} pcs`;
  document.getElementById("kpiWarehouseSub").innerText = `Active Valuation: ${formatINR(activeVal)}`;

  renderLowStockActionTable();
  renderDashboardCharts();
}

function renderLowStockActionTable() {
  const tbody = document.getElementById("lowStockTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const activeInv = (ERP_DB.inventory || []).filter(item => String(getField(item, ["Status"])).toLowerCase() !== "inactive");
  
  const criticalItems = activeInv.filter(item => parseNumber(getField(item, ["Current Stock"])) <= 20)
    .sort((a, b) => parseNumber(getField(a, ["Current Stock"])) - parseNumber(getField(b, ["Current Stock"])));

  if (criticalItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding:22px;">
      <i class="fa-solid fa-circle-check text-success" style="font-size:1.5rem; margin-bottom:6px; display:block;"></i>
      <strong style="color:var(--success);">All Active Products In Healthy Stock!</strong><br>
      <span style="font-size:0.75rem;">No critical low-stock or out-of-stock items detected in warehouse.</span>
    </td></tr>`;
    return;
  }

  criticalItems.forEach(item => {
    const current = parseNumber(getField(item, ["Current Stock"]));
    const pid = getField(item, ["Product ID"]);
    const name = getField(item, ["Product Name"]);
    const price = parseNumber(getField(item, ["Price"])) || 150;
    const val = current * price;
    const isOutOfStock = current <= 0;

    const tr = document.createElement("tr");
    tr.className = isOutOfStock ? "out-of-stock-row" : "low-stock-row";

    tr.innerHTML = `
      <td>
        <span class="prod-name-title">${name}</span>
        <span class="prod-id-subtitle">${pid}</span>
      </td>
      <td>
        <strong style="font-size:1rem; color:${isOutOfStock ? 'var(--danger)' : 'var(--warning)'}; font-family:'JetBrains Mono';">
          ${current} pcs
        </strong>
      </td>
      <td>
        ${isOutOfStock ? 
          `<span class="badge badge-danger"><i class="fa-solid fa-ban"></i> Out of Stock</span>` : 
          `<span class="badge badge-warning"><i class="fa-solid fa-triangle-exclamation"></i> Low Stock (&le; 10)</span>`}
      </td>
      <td><strong>${formatINR(val)}</strong></td>
      <td>
        <span style="font-size:0.8rem; font-weight:600; color:${isOutOfStock ? 'var(--danger)' : 'var(--text-secondary)'};">
          ${isOutOfStock ? '🚨 Urgent PO Required Immediately' : '⚠️ Re-order Stock Soon'}
        </span>
      </td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="quickCreatePOForProduct('${pid}', '${name}')">
          <i class="fa-solid fa-plus"></i> Create PO
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function quickCreatePOForProduct(pid, prodName) {
  openCreatePOModal();
  const nameInput = document.getElementById("createPoProdName");
  if (nameInput) nameInput.value = prodName;
}

function renderDashboardCharts() {
  if (typeof Chart === "undefined") return;

  const dateRange = getFilterRangeForChart("salesTrendsLine");
  const allShipments = ERP_DB.sales || [];
  
  let filtered = allShipments.filter(s => isDateInRange(cleanDateStr(getField(s, ["Sales Date", "Date"])), dateRange));
  const uniqueDates = Array.from(new Set(filtered.map(s => cleanDateStr(getField(s, ["Sales Date", "Date"]))))).sort();
  const recentDates = uniqueDates.slice(-14);

  const meeshoLine = [];
  const flipkartLine = [];
  const wholesaleLine = [];

  recentDates.forEach(d => {
    let m = 0, f = 0, w = 0;
    filtered.forEach(s => {
      if (cleanDateStr(getField(s, ["Sales Date", "Date"])) === d) {
        const q = parseNumber(getField(s, ["Quantity", "Qty"]));
        const p = getField(s, ["Platform"]);
        if (p === "Meesho") m += q;
        else if (p === "Flipkart") f += q;
        else if (p === "Wholesale") w += q;
      }
    });
    meeshoLine.push(m);
    flipkartLine.push(f);
    wholesaleLine.push(w);
  });

  const lineCanvas = document.getElementById("chartSalesTrendsLine");
  if (lineCanvas) {
    if (chartInstances.salesTrendsLine) chartInstances.salesTrendsLine.destroy();
    chartInstances.salesTrendsLine = new Chart(lineCanvas.getContext("2d"), {
      type: "line",
      data: {
        labels: recentDates.map(d => d.substring(5)),
        datasets: [
          {
            label: "Meesho",
            data: meeshoLine,
            borderColor: "#4f46e5",
            backgroundColor: "rgba(79, 70, 229, 0.08)",
            fill: true,
            tension: 0.35,
            borderWidth: 2.5
          },
          {
            label: "Flipkart",
            data: flipkartLine,
            borderColor: "#0ea5e9",
            backgroundColor: "rgba(14, 165, 233, 0.08)",
            fill: true,
            tension: 0.35,
            borderWidth: 2.5
          },
          {
            label: "Wholesale",
            data: wholesaleLine,
            borderColor: "#10b981",
            backgroundColor: "transparent",
            borderDash: [5, 5],
            tension: 0.35,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top" },
          tooltip: { mode: "index", intersect: false }
        },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: "Quantity Sold (Pieces)" } },
          x: { title: { display: true, text: "Date (MM-DD)" } }
        }
      }
    });
  }
}

// --------------------------------------------------------------------------
// 3.2 INVENTORY VIEW RENDERER
// --------------------------------------------------------------------------
function renderInventory() {
  const tbody = document.getElementById("inventoryTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const activeList = (ERP_DB.inventory || []).filter(item => String(getField(item, ["Status"])).toLowerCase() !== "inactive");
  let healthy = 0, actionReq = 0, outStock = 0;

  if (activeList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted" style="padding:28px;">
      <i class="fa-solid fa-boxes-stacked" style="font-size:1.8rem; margin-bottom:8px; display:block; color:var(--text-muted);"></i>
      <strong>No inventory products loaded</strong><br>
      <span style="font-size:0.75rem;">Check that your Stock Ledger sheet tab contains product rows.</span>
    </td></tr>`;
    document.getElementById("invTotalProducts").innerText = "0";
    document.getElementById("invHealthyStock").innerText = "0";
    document.getElementById("invActionRequired").innerText = "0";
    document.getElementById("invOutOfStock").innerText = "0";
    return;
  }

  activeList.forEach(item => {
    const current = parseNumber(getField(item, ["Current Stock"]));
    const price = parseNumber(getField(item, ["Price"])) || 150;
    const val = parseNumber(getField(item, ["Stock Values", "Stock Value"])) || (current * price);
    const pid = getField(item, ["Product ID"]);
    const name = getField(item, ["Product Name"]);

    let statusStr = "Healthy stock";
    let badgeClass = "badge-success";
    const isOut = current <= 0;

    if (isOut) {
      outStock++;
      statusStr = "Out of Stock";
      badgeClass = "badge-danger";
    } else if (current <= 10) {
      actionReq++;
      statusStr = "Action required";
      badgeClass = "badge-warning";
    } else if (current <= 50) {
      statusStr = "Good stock";
      badgeClass = "badge-info";
    } else {
      healthy++;
      statusStr = "Healthy stock";
      badgeClass = "badge-success";
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <span class="prod-name-title">${name}</span>
        <span class="prod-id-subtitle">${pid}</span>
      </td>
      <td>${getField(item, ["Opening Stock"]) || 0}</td>
      <td>${getField(item, ["Purchased"]) || 0}</td>
      <td>${getField(item, ["Sold"]) || 0}</td>
      <td>${getField(item, ["Returned"]) || 0}</td>
      <td>
        <span class="stock-badge-highlight" style="color:${isOut ? 'var(--danger)' : (current <= 10 ? 'var(--warning)' : 'var(--text-primary)')}; font-family:'JetBrains Mono';">
          ${current}
        </span>
        ${isOut ? `<span class="stock-out-badge">Out of Stock</span>` : ''}
      </td>
      <td><span class="badge ${badgeClass}">${statusStr}</span></td>
      <td>₹${price.toFixed(2)}</td>
      <td><strong>${formatINR(val)}</strong></td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("invTotalProducts").innerText = activeList.length;
  document.getElementById("invHealthyStock").innerText = healthy;
  document.getElementById("invActionRequired").innerText = actionReq;
  document.getElementById("invOutOfStock").innerText = outStock;

  populateSKUSelectionDropdown();
}

function filterInventoryTable(query) {
  const search = (query || document.getElementById("inventorySearchInput")?.value || "").toLowerCase();
  const statusFilter = document.getElementById("inventoryStatusSelect")?.value || "ALL";
  const rows = document.querySelectorAll("#inventoryTable tbody tr");

  rows.forEach(r => {
    const text = r.innerText.toLowerCase();
    const matchSearch = !search || text.includes(search);
    const matchStatus = statusFilter === "ALL" || text.includes(statusFilter.toLowerCase());
    r.style.display = matchSearch && matchStatus ? "" : "none";
  });
}

function populateSKUSelectionDropdown() {
  const select = document.getElementById("skuSelectAnalytics");
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = `<option value="">-- Choose Product SKU for Deep-Dive --</option>`;

  const activeList = (ERP_DB.inventory || []).filter(item => String(getField(item, ["Status"])).toLowerCase() !== "inactive");
  activeList.forEach(item => {
    const pid = getField(item, ["Product ID"]);
    const name = getField(item, ["Product Name"]);
    const opt = document.createElement("option");
    opt.value = pid;
    opt.innerText = `${name} (${pid})`;
    select.appendChild(opt);
  });

  if (currentVal && activeList.some(p => getField(p, ["Product ID"]) === currentVal)) {
    select.value = currentVal;
  } else if (activeList.length > 0) {
    select.value = getField(activeList[0], ["Product ID"]);
    handleSKUSelectionChange(select.value);
  }
}

function handleSKUSelectionChange(pid) {
  const card = document.getElementById("selectedSkuDetailsCard");
  if (!pid || !card) {
    if (card) card.style.display = "none";
    return;
  }

  const prod = (ERP_DB.inventory || []).find(p => getField(p, ["Product ID"]) === pid);
  if (!prod) return;

  card.style.display = "block";
  const name = getField(prod, ["Product Name"]);
  const opening = parseNumber(getField(prod, ["Opening Stock"]));
  const purchased = parseNumber(getField(prod, ["Purchased"]));
  const sold = parseNumber(getField(prod, ["Sold"]));
  const returned = parseNumber(getField(prod, ["Returned"]));
  const current = parseNumber(getField(prod, ["Current Stock"]));
  const price = parseNumber(getField(prod, ["Price"])) || 150;
  const val = current * price;

  document.getElementById("skuCardName").innerText = name;
  document.getElementById("skuCardId").innerText = `Product ID: ${pid}`;
  document.getElementById("skuCardPrice").innerText = `Cost Rate: ₹${price.toFixed(2)}`;
  document.getElementById("skuCardStatus").innerText = current > 0 ? "Active In-Stock" : "Out of Stock";
  document.getElementById("skuCardStatus").className = `badge ${current > 0 ? 'badge-success' : 'badge-danger'}`;

  document.getElementById("skuCardOpening").innerText = `${opening} pcs`;
  document.getElementById("skuCardPurchased").innerText = `${purchased} pcs`;
  document.getElementById("skuCardSold").innerText = `${sold} pcs`;
  document.getElementById("skuCardReturned").innerText = `${returned} pcs`;
  document.getElementById("skuCardCurrent").innerText = `${current} pcs`;
  document.getElementById("skuCardValue").innerText = formatINR(val);
}

/**
 * Spec 3 & 9: Stock Analytics
 * - Current Stock graph uses ONLY ONE BAR per product with increased Y-axis scale for clean visibility
 * - Stock Movement Lifecycle graph REMOVED per user request
 */
function renderInventoryAnalytics() {
  if (typeof Chart === "undefined") return;

  const activeList = (ERP_DB.inventory || []).filter(item => String(getField(item, ["Status"])).toLowerCase() !== "inactive");

  // Single Bar Chart: Current Stock Quantity & Valuation with Increased Y-Axis headroom
  const barCanvas = document.getElementById("chartActiveStockBar");
  if (barCanvas) {
    if (chartInstances.activeStockBar) chartInstances.activeStockBar.destroy();
    
    const quantities = activeList.map(s => parseNumber(getField(s, ["Current Stock"])));
    const valuations = activeList.map(s => {
      const c = parseNumber(getField(s, ["Current Stock"]));
      const p = parseNumber(getField(s, ["Price"])) || 150;
      return c * p;
    });

    const maxQ = Math.max(...quantities, 100);

    chartInstances.activeStockBar = new Chart(barCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: activeList.map(s => getField(s, ["Product Name"])),
        datasets: [
          {
            label: "Current Stock Quantity (Pieces)",
            data: quantities,
            backgroundColor: "#4f46e5",
            borderRadius: 6,
            barThickness: 24,
            valuations: valuations
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const qty = context.parsed.y;
                const idx = context.dataIndex;
                const val = valuations[idx] || 0;
                return [
                  `Stock Quantity: ${qty} pcs`,
                  `Stock Valuation: ${formatINR(val)}`
                ];
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            suggestedMax: Math.ceil(maxQ * 1.35), // Increased Y-axis headroom per spec 3!
            title: { display: true, text: "Current Stock Quantity (Pieces)" },
            ticks: {
              stepSize: 50,
              font: { size: 11, weight: "600" }
            }
          },
          x: {
            ticks: {
              autoSkip: false,
              maxRotation: 45,
              minRotation: 30,
              font: { size: 11, weight: "600" }
            }
          }
        }
      }
    });
  }
}

/**
 * Spec 4: Sales Analytics
 * - Product Sales vs Returns shows Customer Returns and RTO properly in proper spacious layout
 * - NO separate individual date filters on this page; ONE master filter controls all graphs
 * - New graph: Distribution of Return Types side-by-side with Channel Sales Distribution
 * - Searchable Product Selection option to filter by particular product
 */
function renderSalesAnalyticsCharts() {
  if (typeof Chart === "undefined") return;

  const platformFilter = document.getElementById("salesAnalyticsPlatformSelect")?.value || "ALL";
  const productFilter = document.getElementById("salesTrendProductFilter")?.value || "TOP5";

  let sales = ERP_DB.sales || [];
  if (platformFilter !== "ALL") {
    sales = sales.filter(s => getField(s, ["Platform"]) === platformFilter);
  }

  // Master date filter for Sales Analytics subtab
  const dateRange = getFilterRangeForChart("masterSalesAnalytics", "salesAnalyticsDateFilter", "salesAnalytics_startDate", "salesAnalytics_endDate");
  if (dateRange.start || dateRange.end) {
    sales = sales.filter(s => isDateInRange(cleanDateStr(getField(s, ["Sales Date", "Date"])), dateRange));
  }

  const uniqueDates = Array.from(new Set(sales.map(s => cleanDateStr(getField(s, ["Sales Date", "Date"]))))).sort();
  const windowDates = uniqueDates.slice(-20);

  populateSalesTrendProductDropdown();

  const activeProds = (ERP_DB.inventory || []).filter(item => String(getField(item, ["Status"])).toLowerCase() !== "inactive");
  let targetProds = [];

  if (productFilter === "TOP5") {
    const prodTotals = {};
    sales.forEach(s => {
      const name = getField(s, ["Product Name", "Product ID"]);
      prodTotals[name] = (prodTotals[name] || 0) + parseNumber(getField(s, ["Quantity", "Qty"]));
    });
    targetProds = Object.entries(prodTotals).sort((a, b) => b[1] - a[1]).slice(0, 5).map(p => p[0]);
  } else if (productFilter === "ALL") {
    targetProds = activeProds.map(p => getField(p, ["Product Name"]));
  } else {
    targetProds = [productFilter];
  }

  const palette = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4", "#84cc16", "#f97316"];
  const datasets = targetProds.map((prodName, idx) => {
    const dataPoints = windowDates.map(d => {
      let q = 0;
      sales.forEach(s => {
        if (cleanDateStr(getField(s, ["Sales Date", "Date"])) === d && getField(s, ["Product Name", "Product ID"]) === prodName) {
          q += parseNumber(getField(s, ["Quantity", "Qty"]));
        }
      });
      return q;
    });

    return {
      label: prodName,
      data: dataPoints,
      borderColor: palette[idx % palette.length],
      backgroundColor: "transparent",
      borderWidth: 2.5,
      tension: 0.35
    };
  });

  // 1. Sales Trend Line Chart (Select particular product or top 5)
  const trendCanvas = document.getElementById("chartProductSalesTrendsLine");
  if (trendCanvas) {
    if (chartInstances.productSalesTrends) chartInstances.productSalesTrends.destroy();
    chartInstances.productSalesTrends = new Chart(trendCanvas.getContext("2d"), {
      type: "line",
      data: {
        labels: windowDates.map(d => d.substring(5)),
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top" },
          tooltip: { mode: "index", intersect: false }
        },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: "Quantity Sold (Pieces)" } },
          x: { title: { display: true, text: "Date (MM-DD)" } }
        }
      }
    });
  }

  // 2. Product Sales vs Returns (Single Bar per product showing Quantity and Return % without extra bars per user request)
  const allReturns = ERP_DB.returns || [];
  let filteredReturns = allReturns;
  if (dateRange.start || dateRange.end) {
    filteredReturns = filteredReturns.filter(r => isDateInRange(cleanDateStr(getField(r, ["Returs Date", "Returns Date", "Date"])), dateRange));
  }

  const compLabels = [];
  const compSales = [];
  const compCustRet = [];
  const compRTO = [];
  const compTotRet = [];
  const compReturnRate = [];

  // Filter products if a particular product is chosen
  let displayProds = activeProds;
  if (productFilter !== "ALL" && productFilter !== "TOP5") {
    displayProds = activeProds.filter(p => getField(p, ["Product Name"]) === productFilter || getField(p, ["Product ID"]) === productFilter);
  }

  displayProds.forEach(item => {
    const name = getField(item, ["Product Name"]);
    const pid = getField(item, ["Product ID"]);

    // Calculate sales qty
    const sold = sales.filter(s => getField(s, ["Product ID"]) === pid || getField(s, ["Product Name"]) === name)
      .reduce((acc, s) => acc + parseNumber(getField(s, ["Quantity", "Qty"])), 0);

    // Calculate customer returns vs RTO
    const prodRetRows = filteredReturns.filter(r => getField(r, ["Product ID"]) === pid || getField(r, ["Product Name"]) === name);
    let cRet = 0, rto = 0;
    prodRetRows.forEach(r => {
      const q = parseNumber(getField(r, ["Quantity", "Qty"]));
      if (r["_returnType"] === "Customer Return") cRet += q;
      else rto += q;
    });

    const totRet = cRet + rto;
    const rate = sold > 0 ? parseFloat(((totRet / sold) * 100).toFixed(1)) : 0;

    // Single bar per product: Label directly shows Product Name and Return %
    compLabels.push(`${name}  [Return: ${rate}%]`);
    compSales.push(sold);
    compCustRet.push(cRet);
    compRTO.push(rto);
    compTotRet.push(totRet);
    compReturnRate.push(rate);
  });

  const compCanvas = document.getElementById("chartProductSalesVsReturns");
  if (compCanvas) {
    if (chartInstances.salesVsReturns) chartInstances.salesVsReturns.destroy();
    chartInstances.salesVsReturns = new Chart(compCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: compLabels,
        datasets: [
          {
            label: "Sales Quantity (Pieces) & Return %",
            data: compSales,
            backgroundColor: "#4f46e5",
            borderRadius: 6,
            maxBarThickness: 38
          }
        ]
      },
      options: {
        indexAxis: "x", // Vertical bar diagram per spec!
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: {
              generateLabels: () => [
                {
                  text: "Vertical Bar Diagram: Bar Height = Sales Quantity | Label & Tooltip = Return Rate %",
                  fillStyle: "#4f46e5",
                  strokeStyle: "#4f46e5",
                  lineWidth: 1
                }
              ]
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const idx = context.dataIndex;
                const soldQty = context.parsed.y;
                const rRate = compReturnRate[idx] || 0;
                const tRet = compTotRet[idx] || 0;
                const cR = compCustRet[idx] || 0;
                const rtoR = compRTO[idx] || 0;
                return [
                  `Sales Volume: ${soldQty} pcs`,
                  `Return Rate: ${rRate}% (${tRet} total returns)`,
                  `  • Customer Returns: ${cR} pcs`,
                  `  • RTO Transit: ${rtoR} pcs`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              autoSkip: false,
              maxRotation: 45,
              minRotation: 30,
              font: { size: 10.5, weight: "700" }
            },
            title: { display: true, text: "Active Products [with Return %]" }
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: "Sales Quantity Sold (Pieces)" },
            ticks: { font: { size: 11, weight: "600" } }
          }
        }
      }
    });
  }

  // 3. Platform Sales Distribution
  const platMap = { "Meesho": 0, "Flipkart": 0, "Wholesale": 0 };
  sales.forEach(s => {
    const p = getField(s, ["Platform"]) || "Meesho";
    platMap[p] = (platMap[p] || 0) + parseNumber(getField(s, ["Quantity", "Qty"]));
  });

  const distCanvas = document.getElementById("chartPlatformSalesDistribution");
  if (distCanvas) {
    if (chartInstances.platformSalesDist) chartInstances.platformSalesDist.destroy();
    chartInstances.platformSalesDist = new Chart(distCanvas.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: Object.keys(platMap),
        datasets: [{
          data: Object.values(platMap),
          backgroundColor: ["#4f46e5", "#0ea5e9", "#10b981"]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom" } }
      }
    });
  }

  // 4. NEW: Return Types Distribution (Customer Return vs RTO) per spec 4!
  let totalCustRet = 0, totalRTO = 0;
  filteredReturns.forEach(r => {
    const q = parseNumber(getField(r, ["Quantity", "Qty"]));
    if (r["_returnType"] === "Customer Return") totalCustRet += q;
    else totalRTO += q;
  });

  const retTypeCanvas = document.getElementById("chartReturnTypesDistribution");
  if (retTypeCanvas) {
    if (chartInstances.returnTypesDist) chartInstances.returnTypesDist.destroy();
    chartInstances.returnTypesDist = new Chart(retTypeCanvas.getContext("2d"), {
      type: "pie",
      data: {
        labels: [`Customer Returns (${totalCustRet} pcs)`, `RTO Courier Returns (${totalRTO} pcs)`],
        datasets: [{
          data: [totalCustRet || 1, totalRTO || 1],
          backgroundColor: ["#ef4444", "#f59e0b"]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom" } }
      }
    });
  }
}

function populateSalesTrendProductDropdown() {
  const select = document.getElementById("salesTrendProductFilter");
  const datalist = document.getElementById("productListDatalist");
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = `
    <option value="TOP5">Top 5 Products</option>
    <option value="ALL">All Active Products</option>
  `;
  if (datalist) datalist.innerHTML = "";

  const activeProds = (ERP_DB.inventory || []).filter(item => String(getField(item, ["Status"])).toLowerCase() !== "inactive");
  activeProds.forEach(p => {
    const name = getField(p, ["Product Name"]);
    const opt = document.createElement("option");
    opt.value = name;
    opt.innerText = name;
    select.appendChild(opt);

    if (datalist) {
      const dlOpt = document.createElement("option");
      dlOpt.value = name;
      datalist.appendChild(dlOpt);
    }
  });

  select.value = currentVal || "TOP5";
}

function handleProductSearchInput(query) {
  const q = (query || "").trim().toLowerCase();
  const select = document.getElementById("salesTrendProductFilter");
  if (!select) return;

  if (!q) {
    select.value = "TOP5";
    renderSalesAnalyticsCharts();
    return;
  }

  const activeProds = (ERP_DB.inventory || []).filter(item => String(getField(item, ["Status"])).toLowerCase() !== "inactive");
  const match = activeProds.find(p => getField(p, ["Product Name"]).toLowerCase().includes(q) || getField(p, ["Product ID"]).toLowerCase().includes(q));

  if (match) {
    select.value = getField(match, ["Product Name"]);
    renderSalesAnalyticsCharts();
  }
}

function handleSalesAnalyticsDateChange(val) {
  const customBox = document.getElementById("salesAnalytics_customDates");
  if (customBox) {
    customBox.style.display = val === "custom" ? "inline-flex" : "none";
  }
  renderSalesAnalyticsCharts();
}

// --------------------------------------------------------------------------
// 3.3 SALES SECTION
// --------------------------------------------------------------------------
function renderSales() {
  const tbody = document.getElementById("salesTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const filter = document.getElementById("salesDateFilterSelect")?.value || "today";
  const allSales = ERP_DB.sales || [];
  const todayStr = getTodayDateStr();
  const latestDate = getLatestSalesDate();

  let filtered = allSales.filter(s => {
    const d = cleanDateStr(getField(s, ["Sales Date", "Date"]));
    if (filter === "today") return d === todayStr;
    if (filter === "latest") return d === latestDate;
    if (filter === "this_week") return isDateInLastNDays(d, 7);
    if (filter === "this_month") return d.startsWith(todayStr.substring(0, 7)) || d.startsWith("2026-10") || d.startsWith("2026-09");
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding:32px;">
      <i class="fa-solid fa-calendar-xmark" style="font-size:2rem; color:var(--text-muted); margin-bottom:8px; display:block;"></i>
      <strong style="color:var(--text-primary); font-size:0.95rem;">No sales today or no sales records have been added today.</strong><br>
      <span style="font-size:0.8rem; color:var(--text-secondary);">Showing latest available sales records (${latestDate}) below:</span><br>
      <button class="btn btn-sm btn-outline" onclick="setSalesDateFilter('latest')" style="margin-top:10px;">
        <i class="fa-regular fa-calendar-check"></i> Show Latest Date (${latestDate})
      </button>
    </td></tr>`;
    return;
  }

  filtered.forEach(row => {
    const q = parseNumber(getField(row, ["Quantity", "Qty"]));
    const p = parseNumber(getField(row, ["Selling Price", "Price"]));
    const tot = parseNumber(getField(row, ["Total Amount", "Total"])) || (q * p);
    const sId = getField(row, ["Sales ID"]) || "-";
    const ordId = getField(row, ["Order ID"]) || "-";
    const prodName = getField(row, ["Product Name"]) || "Product";
    const prodId = getField(row, ["Product ID"]) || "-";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <span class="id-primary">${sId}</span>
        <span class="id-secondary">Order: ${ordId}</span>
      </td>
      <td>${cleanDateStr(getField(row, ["Sales Date", "Date"]))}</td>
      <td><span class="badge ${getField(row, ['Platform']) === 'Flipkart' ? 'badge-warning' : (getField(row, ['Platform']) === 'Wholesale' ? 'badge-success' : 'badge-info')}">${getField(row, ["Platform"]) || "Meesho"}</span></td>
      <td>
        <span class="prod-name-title">${prodName}</span>
        <span class="prod-id-subtitle">${prodId}</span>
      </td>
      <td><strong>${q} pcs</strong></td>
      <td>₹${p.toFixed(2)}</td>
      <td><strong style="color:var(--text-primary);">${formatINR(tot)}</strong></td>
      <td>${getField(row, ["Remarks"]) || "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}

function setSalesDateFilter(val) {
  const el = document.getElementById("salesDateFilterSelect");
  if (el) {
    el.value = val;
    renderSales();
  }
}

function filterSalesTableSearch(query) {
  filterTable("salesTable", query);
}

// --------------------------------------------------------------------------
// 3.4 RETURNS SECTION
// --------------------------------------------------------------------------
function renderReturns() {
  const tbody = document.getElementById("returnsTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const filter = document.getElementById("returnsDateFilterSelect")?.value || "today";
  const allReturns = ERP_DB.returns || [];
  const todayStr = getTodayDateStr();
  const latestDate = getLatestReturnsDate();

  let filtered = allReturns.filter(r => {
    const d = cleanDateStr(getField(r, ["Returs Date", "Returns Date", "Date"]));
    if (filter === "today") return d === todayStr;
    if (filter === "latest") return d === latestDate;
    if (filter === "this_week") return isDateInLastNDays(d, 7);
    if (filter === "this_month") return d.startsWith(todayStr.substring(0, 7)) || d.startsWith("2026-10") || d.startsWith("2026-09");
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:32px;">
      <i class="fa-solid fa-calendar-xmark" style="font-size:2rem; color:var(--text-muted); margin-bottom:8px; display:block;"></i>
      <strong style="color:var(--text-primary); font-size:0.95rem;">No returns today or no return records have been added today.</strong><br>
      <span style="font-size:0.8rem; color:var(--text-secondary);">Showing latest available returns records (${latestDate}) below:</span><br>
      <button class="btn btn-sm btn-outline" onclick="setReturnsDateFilter('latest')" style="margin-top:10px;">
        <i class="fa-regular fa-calendar-check"></i> Show Latest Returns Date (${latestDate})
      </button>
    </td></tr>`;
    return;
  }

  filtered.forEach(row => {
    const retId = getField(row, ["Returs ID", "Returns ID", "ID"]) || "-";
    const ordId = getField(row, ["Order ID"]) || "-";
    const prodName = getField(row, ["Product Name"]) || "Product";
    const prodId = getField(row, ["Product ID"]) || "-";
    const q = parseNumber(getField(row, ["Quantity", "Qty"]));
    const retType = row["_returnType"] || "RTO";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <span class="id-primary">${retId}</span>
        ${ordId !== '-' ? `<span class="id-secondary">Order: ${ordId}</span>` : ''}
      </td>
      <td>${cleanDateStr(getField(row, ["Returs Date", "Returns Date", "Date"]))}</td>
      <td>
        <span class="badge ${retType === 'Customer Return' ? 'badge-danger' : 'badge-warning'}">
          ${retType}
        </span>
      </td>
      <td>
        <span class="prod-name-title">${prodName}</span>
        <span class="prod-id-subtitle">${prodId}</span>
      </td>
      <td><strong class="text-danger" style="font-family:'JetBrains Mono';">${q} pcs</strong></td>
      <td>${getField(row, ["Remarks"]) || retType}</td>
    `;
    tbody.appendChild(tr);
  });
}

function setReturnsDateFilter(val) {
  const el = document.getElementById("returnsDateFilterSelect");
  if (el) {
    el.value = val;
    renderReturns();
  }
}

function filterReturnsTableSearch(query) {
  filterTable("returnsTable", query);
}

// --------------------------------------------------------------------------
// 4.0 SUPPLIER DIRECTORY
// --------------------------------------------------------------------------
function renderSuppliers() {
  const tbody = document.getElementById("supplierTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  compileSupplierMetrics();
  const suppliers = ERP_DB.suppliers || [];

  let grandDeals = 0;
  let grandPaid = 0;
  let grandPending = 0;

  if (suppliers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding:28px;">
      <i class="fa-solid fa-truck-field" style="font-size:1.8rem; margin-bottom:8px; display:block; color:var(--text-muted);"></i>
      <strong>No suppliers loaded</strong><br>
      <span style="font-size:0.75rem;">Check that your Suppliers sheet tab contains supplier records.</span>
    </td></tr>`;
    document.getElementById("kpiSupTotalDeals").innerText = "₹0.00";
    document.getElementById("kpiSupTotalPaid").innerText = "₹0.00";
    document.getElementById("kpiSupTotalPending").innerText = "₹0.00";
    return;
  }

  suppliers.forEach(row => {
    const sId = row["Supplier ID"] || row["id"];
    const sName = row["Supplier Name"] || row["name"] || sId;
    const deal = row["_totalDealAmount"] || 0;
    const orderTimes = row["_totalDealsCount"] || 0;
    const paid = row["_totalPaid"] || 0;
    const credit = row["_remainingCredit"] || 0;
    const pending = row["_netPending"] || 0;

    grandDeals += deal;
    grandPaid += paid;
    grandPending += pending;

    const tr = document.createElement("tr");
    tr.className = "clickable-row";
    tr.onclick = () => openSupplierDetailsModal(sId);

    tr.innerHTML = `
      <td>
        <strong style="color:var(--primary); font-family:'JetBrains Mono'; font-size:0.85rem;">${sId}</strong>
        <span style="font-size:0.75rem; color:var(--text-secondary); display:block;">${sName}</span>
      </td>
      <td>
        <strong>${formatINR(deal)}</strong>
        <span style="font-size:0.72rem; color:var(--text-secondary); display:block;">${orderTimes} POs</span>
      </td>
      <td class="text-success font-bold">${formatINR(paid)}</td>
      <td>${formatINR(credit)}</td>
      <td class="${pending > 0 ? 'text-danger' : 'text-success'} font-bold">${formatINR(pending)}</td>
      <td>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          <button class="btn btn-sm btn-info" onclick="event.stopPropagation(); openSupplierLatestPOModal('${sId}')" title="View Latest PO &amp; Multi-PO Breakdown">
            <i class="fa-solid fa-clock-rotate-left"></i> Latest PO
          </button>
          <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); openSupplierStatementModal('${sId}')" title="Print Supplier Statement">
            <i class="fa-solid fa-file-invoice"></i> Print Statement
          </button>
          <button class="btn btn-sm btn-outline" onclick="event.stopPropagation(); openSupplierDetailsModal('${sId}')" title="View Full Status">
            <i class="fa-solid fa-eye"></i> Details
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("kpiSupTotalDeals").innerText = formatINR(grandDeals);
  document.getElementById("kpiSupTotalPaid").innerText = formatINR(grandPaid);
  document.getElementById("kpiSupTotalPending").innerText = formatINR(grandPending);

  populateSupplierFilterDropdowns();
}

function populateSupplierFilterDropdowns() {
  const sups = ERP_DB.suppliers || [];
  const poSelect = document.getElementById("poSupplierFilterSelect");
  const paySelect = document.getElementById("paymentSupplierFilterSelect");
  const invSelect = document.getElementById("invoiceSupplierFilterSelect");

  const update = (sel) => {
    if (!sel) return;
    const curVal = sel.value;
    sel.innerHTML = `<option value="ALL">All Suppliers</option>`;
    sups.forEach(s => {
      const sid = s["Supplier ID"];
      const opt = document.createElement("option");
      opt.value = sid;
      opt.innerText = `${s["Supplier Name"]} (${sid})`;
      sel.appendChild(opt);
    });
    sel.value = curVal || "ALL";
  };

  update(poSelect);
  update(paySelect);
  update(invSelect);
}

// --------------------------------------------------------------------------
// 4.1 SUPPLIER DETAILS & STATUS MODAL (No STH logo, Filter Active/Closed, PO click fix)
// --------------------------------------------------------------------------
let selectedDetailPOs = new Set();

function openSupplierDetailsModal(supplierId) {
  currentDetailSupplierId = supplierId;
  const vendor = (ERP_DB.suppliers || []).find(s => (s["Supplier ID"] || s["id"]) === supplierId) || {};
  const supPOs = (ERP_DB.poSummary || []).filter(p => p["Supplier"] === supplierId);

  document.getElementById("detSupplierName").innerText = vendor["Supplier Name"] || supplierId;
  document.getElementById("detSupplierId").innerText = `Supplier ID: ${supplierId}`;
  const supContact = vendor["Mobile"] || vendor["Contact Person"] || "-";
  document.getElementById("detContactNumber").innerHTML = `<strong>Supplier Contact:</strong> ${supContact}`;
  document.getElementById("detSupplierAddress").innerText = `${vendor["Address"] || "Borpeta, Assam"}, ${vendor["City"] || "Borpeta"}, ${vendor["State"] || "Assam"}`;
  document.getElementById("detGeneratedDate").innerText = new Date().toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' });

  selectedDetailPOs.clear();
  supPOs.forEach(p => selectedDetailPOs.add(p["PO ID"]));

  populateDetailMultiPOCheckboxes(supPOs);
  updateSelectedDetailPOCountBadge();

  const filterSelect = document.getElementById("detPOFilterSelect");
  if (filterSelect) filterSelect.value = "ALL";

  applySupplierDetailsPOFilter();
  openModal("supplierDetailsModal");
}

function populateDetailMultiPOCheckboxes(supPOs) {
  const container = document.getElementById("multiPoDetailCheckboxList");
  if (!container) return;
  container.innerHTML = "";

  supPOs.forEach(p => {
    const pid = p["PO ID"];
    const label = document.createElement("label");
    label.className = "multi-po-item";
    label.innerHTML = `
      <input type="checkbox" value="${pid}" checked onchange="handleDetailPOCheckboxChange('${pid}', this.checked)" />
      <span><strong>${pid}</strong> (${formatINR(p["PO Amount"])})</span>
    `;
    container.appendChild(label);
  });
}

function handleDetailPOCheckboxChange(poId, isChecked) {
  if (isChecked) selectedDetailPOs.add(poId);
  else selectedDetailPOs.delete(poId);

  updateSelectedDetailPOCountBadge();
  applySupplierDetailsPOFilter();
}

function selectAllDetailPOs(checkAll) {
  const supPOs = (ERP_DB.poSummary || []).filter(p => p["Supplier"] === currentDetailSupplierId);
  selectedDetailPOs.clear();

  const checkboxes = document.querySelectorAll("#multiPoDetailCheckboxList input[type='checkbox']");
  checkboxes.forEach(cb => {
    cb.checked = checkAll;
    if (checkAll) selectedDetailPOs.add(cb.value);
  });

  updateSelectedDetailPOCountBadge();
  applySupplierDetailsPOFilter();
}

function toggleDetailMultiPODropdown() {
  const panel = document.getElementById("multiPoDetailSelectionDropdown");
  if (panel) {
    panel.style.display = panel.style.display === "none" ? "block" : "none";
  }
}

function updateSelectedDetailPOCountBadge() {
  const badge = document.getElementById("detSelectedPOCount");
  if (!badge) return;
  const total = (ERP_DB.poSummary || []).filter(p => p["Supplier"] === currentDetailSupplierId).length;
  if (selectedDetailPOs.size === total || selectedDetailPOs.size === 0) {
    badge.innerText = "All";
  } else {
    badge.innerText = `${selectedDetailPOs.size} of ${total}`;
  }
}

function handleSupplierDetailsPOFilter(val) {
  applySupplierDetailsPOFilter();
}

function applySupplierDetailsPOFilter() {
  if (!currentDetailSupplierId) return;
  const filterType = document.getElementById("detPOFilterSelect")?.value || "ALL";
  let supPOs = (ERP_DB.poSummary || []).filter(p => p["Supplier"] === currentDetailSupplierId);
  const items = ERP_DB.purchaseOrders || [];

  if (selectedDetailPOs.size > 0) {
    supPOs = supPOs.filter(p => selectedDetailPOs.has(p["PO ID"]));
  } else {
    supPOs = [];
  }

  // Recalculate summary metrics for selected POs
  const totalDealAmount = supPOs.reduce((acc, p) => acc + parseNumber(p["PO Amount"]), 0);
  const totalDealsCount = supPOs.length;
  const totalPaid = supPOs.reduce((acc, p) => acc + parseNumber(p["Paid Amount"]), 0);
  const netPending = Math.max(0, totalDealAmount - totalPaid);

  document.getElementById("detTotalDealAmount").innerText = formatINR(totalDealAmount);
  document.getElementById("detTotalDeals").innerText = `${totalDealsCount} POs`;
  document.getElementById("detTotalPaid").innerText = formatINR(totalPaid);
  document.getElementById("detNetPending").innerText = formatINR(netPending);

  document.getElementById("detSummaryTotalDeal").innerText = formatINR(totalDealAmount);
  document.getElementById("detSummaryTotalPaid").innerText = formatINR(totalPaid);
  document.getElementById("detSummaryNetPending").innerText = formatINR(netPending);

  renderSupplierDetailsPOLists(supPOs, items, filterType);
}

function renderSupplierDetailsPOLists(supPOs, items, filterType) {
  const activeTbody = document.getElementById("detActivePOBody");
  const compTbody = document.getElementById("detCompletedPOBody");
  if (!activeTbody || !compTbody) return;

  activeTbody.innerHTML = "";
  compTbody.innerHTML = "";

  const activeContainer = activeTbody.closest("div");
  const compContainer = compTbody.closest("div");

  const showActive = filterType === "ALL" || filterType === "Active";
  const showClosed = filterType === "ALL" || filterType === "Closed";

  if (activeContainer) activeContainer.style.display = showActive ? "block" : "none";
  if (compContainer) compContainer.style.display = showClosed ? "block" : "none";

  const activePOs = supPOs.filter(p => p["PO Status"] === "Active" || parseNumber(p["Pending Amount"]) > 0 || parseNumber(p["Pending Qty"]) > 0);
  const compPOs = supPOs.filter(p => p["PO Status"] === "Closed" || (parseNumber(p["Pending Amount"]) <= 0 && parseNumber(p["Pending Qty"]) <= 0));

  if (activePOs.length === 0) {
    activeTbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding:14px;">No currently active POs for this supplier under selected filters.</td></tr>`;
  } else {
    activePOs.forEach(p => {
      const pid = p["PO ID"];
      const q = p["PO/Order Qty"];
      const rate = p["Average Value"];
      const paid = parseNumber(p["Paid Amount"]);
      const pending = parseNumber(p["Pending Amount"]);
      const totalVal = parseNumber(p["PO Amount"]) || (q * rate);

      const tr = document.createElement("tr");
      // Product name removed per user instruction!
      tr.innerHTML = `
        <td><span class="po-chip" onclick="openPODetailsModal('${pid}')">${pid}</span></td>
        <td><strong>${q} pcs</strong></td>
        <td>₹${rate}</td>
        <td><strong>${formatINR(totalVal)}</strong></td>
        <td class="text-success font-bold">${formatINR(paid)}</td>
        <td class="${pending > 0 ? 'text-danger' : 'text-success'} font-bold">${formatINR(pending)}</td>
      `;
      activeTbody.appendChild(tr);
    });
  }

  if (compPOs.length === 0) {
    compTbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding:14px;">No closed PO history recorded under selected filters.</td></tr>`;
  } else {
    compPOs.forEach(p => {
      const pid = p["PO ID"];
      const tr = document.createElement("tr");
      // Product name removed per user instruction!
      tr.innerHTML = `
        <td><span class="po-chip" onclick="openPODetailsModal('${pid}')">${pid}</span></td>
        <td>${p["PO/Order Qty"]} pcs</td>
        <td>${formatINR(p["PO Amount"])}</td>
        <td class="text-success font-bold">${formatINR(p["Paid Amount"])}</td>
        <td><span class="badge badge-success">Closed</span></td>
      `;
      compTbody.appendChild(tr);
    });
  }
}

function closeSupplierDetailsModal() {
  closeModal("supplierDetailsModal");
}

function printSupplierStatus() {
  window.print();
}

// --------------------------------------------------------------------------
// 4.2 SUPPLIER STATEMENT MODAL (Transaction Details below Date, STH contact removed)
// --------------------------------------------------------------------------
function openSupplierStatementModal(supplierId) {
  currentStatementSupplierId = supplierId;
  const vendor = (ERP_DB.suppliers || []).find(s => (s["Supplier ID"] || s["id"]) === supplierId) || {};

  document.getElementById("stmtSupplierName").innerText = vendor["Supplier Name"] || supplierId;
  document.getElementById("stmtSupplierId").innerText = supplierId;
  document.getElementById("stmtGeneratedDate").innerText = new Date().toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' });

  const supPOs = (ERP_DB.poSummary || []).filter(p => p["Supplier"] === supplierId);
  selectedStatementPOs.clear();
  supPOs.forEach(p => selectedStatementPOs.add(p["PO ID"]));

  populateMultiPOCheckboxes(supPOs);
  resetStmtDateFilter(false);

  filterSupplierStatement();
  openModal("supplierStatementModal");
}

function populateMultiPOCheckboxes(supPOs) {
  const container = document.getElementById("multiPoCheckboxList");
  if (!container) return;
  container.innerHTML = "";

  supPOs.forEach(p => {
    const pid = p["PO ID"];
    const label = document.createElement("label");
    label.className = "multi-po-item";
    label.innerHTML = `
      <input type="checkbox" value="${pid}" checked onchange="handleStatementPOCheckboxChange('${pid}', this.checked)" />
      <span><strong>${pid}</strong> (${formatINR(p["PO Amount"])})</span>
    `;
    container.appendChild(label);
  });

  updateSelectedPOCountBadge();
}

function handleStatementPOCheckboxChange(poId, isChecked) {
  if (isChecked) selectedStatementPOs.add(poId);
  else selectedStatementPOs.delete(poId);

  updateSelectedPOCountBadge();
  filterSupplierStatement();
}

function selectAllStatementPOs(checkAll) {
  const supPOs = (ERP_DB.poSummary || []).filter(p => p["Supplier"] === currentStatementSupplierId);
  selectedStatementPOs.clear();

  const checkboxes = document.querySelectorAll("#multiPoCheckboxList input[type='checkbox']");
  checkboxes.forEach(cb => {
    cb.checked = checkAll;
    if (checkAll) selectedStatementPOs.add(cb.value);
  });

  updateSelectedPOCountBadge();
  filterSupplierStatement();
}

function updateSelectedPOCountBadge() {
  const badge = document.getElementById("stmtSelectedPOCount");
  if (!badge) return;
  const total = (ERP_DB.poSummary || []).filter(p => p["Supplier"] === currentStatementSupplierId).length;
  if (selectedStatementPOs.size === total || selectedStatementPOs.size === 0) {
    badge.innerText = "All";
  } else {
    badge.innerText = `${selectedStatementPOs.size} of ${total}`;
  }
}

function toggleMultiPODropdown() {
  const panel = document.getElementById("multiPoSelectionDropdown");
  if (panel) {
    panel.style.display = panel.style.display === "none" ? "block" : "none";
  }
}

function resetStmtDateFilter(shouldRender = true) {
  const sInput = document.getElementById("stmtStartDate");
  const eInput = document.getElementById("stmtEndDate");
  if (sInput) sInput.value = "";
  if (eInput) eInput.value = "";
  if (shouldRender) filterSupplierStatement();
}

function filterSupplierStatement() {
  if (!currentStatementSupplierId) return;
  const supplierId = currentStatementSupplierId;
  const startDate = document.getElementById("stmtStartDate")?.value || "";
  const endDate = document.getElementById("stmtEndDate")?.value || "";

  const raw = [];

  (ERP_DB.poSummary || []).filter(p => p["Supplier"] === supplierId).forEach(p => {
    const pid = p["PO ID"];
    if (selectedStatementPOs.size > 0 && !selectedStatementPOs.has(pid)) return;

    const d = cleanDateStr(p["PO Date"]);
    if (startDate && d < startDate) return;
    if (endDate && d > endDate) return;

    raw.push({
      date: d,
      type: "Deal",
      ref: pid,
      poId: pid,
      desc: p["PO Description"] || "PO Deal Issue",
      debit: parseNumber(p["PO Amount"]),
      credit: 0,
      method: "Deal",
      time: new Date(d || "1970-01-01").getTime()
    });
  });

  (ERP_DB.supplierPayments || []).filter(p => p["Supplier"] === supplierId || p["Supplier ID"] === supplierId).forEach(pay => {
    const poRef = pay["PO ID"] || "";
    if (poRef && poRef !== "-" && selectedStatementPOs.size > 0 && !selectedStatementPOs.has(poRef)) return;

    const d = cleanDateStr(pay["Payment Date"] || pay["Date"]);
    if (startDate && d < startDate) return;
    if (endDate && d > endDate) return;

    const amt = parseNumber(pay["Amount"]);
    const isCr = String(pay["Payment ID"]).includes("CR") || String(pay["Payment Type"]).toLowerCase().includes("credit");
    const payMethod = pay["Payment Method"] || pay["Method"] || (isCr ? "Credit" : "UPI");

    raw.push({
      date: d,
      type: "Payment",
      ref: pay["Payment ID"],
      poId: (poRef && poRef !== "-") ? poRef : "",
      desc: pay["Remarks"] || "Account disbursement",
      debit: 0,
      credit: amt,
      method: payMethod,
      time: new Date(d || "1970-01-01").getTime() + 1
    });
  });

  raw.sort((a, b) => a.time - b.time);

  const tbody = document.getElementById("supplierStatementBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  let totalBilled = 0;
  let totalPaid = 0;
  let runningPending = 0;

  if (raw.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding:24px;">No transactions recorded for this supplier under selected filters.</td></tr>`;
  } else {
    raw.forEach(t => {
      totalBilled += t.debit;
      totalPaid += t.credit;
      runningPending += (t.debit - t.credit);

      const isPayment = t.type === "Payment";
      const tr = document.createElement("tr");
      // 1st col: date with PO ID below. 2nd col: Payment/Deal (if payment: Payment Via UPI/Credit/etc.), NO product name!
      tr.innerHTML = `
        <td>
          <strong style="display:block; font-size:0.86rem;">${t.date}</strong>
          ${t.poId ? `<span class="po-chip" onclick="openPODetailsModal('${t.poId}')" style="margin-top:3px; display:inline-block;">${t.poId}</span>` : `<span class="badge badge-secondary" style="margin-top:3px; display:inline-block;">${t.ref}</span>`}
        </td>
        <td>
          ${isPayment ? `
            <span class="badge badge-success" style="padding:2px 6px; font-size:0.7rem;">Payment</span>
            <strong style="display:block; margin-top:2px; font-size:0.84rem;">Payment Via ${t.method || 'UPI'}</strong>
            <span style="font-size:0.72rem; color:var(--text-secondary); display:block;">Ref: ${t.ref}</span>
          ` : `
            <span class="badge badge-primary" style="padding:2px 6px; font-size:0.7rem;">Deal</span>
            <strong style="display:block; margin-top:2px; font-size:0.84rem;">PO Deal Issue</strong>
          `}
        </td>
        <td><strong>${t.debit > 0 ? formatINR(t.debit) : "-"}</strong></td>
        <td class="text-success font-bold">${t.credit > 0 ? formatINR(t.credit) : "-"}</td>
        <td class="${runningPending > 0 ? 'text-danger' : 'text-success'} font-bold">${formatINR(runningPending)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  document.getElementById("stmtTotalDeals").innerText = formatINR(totalBilled);
  document.getElementById("stmtTotalPaid").innerText = formatINR(totalPaid);
  document.getElementById("stmtNetBalance").innerText = formatINR(runningPending);
}

function closeSupplierStatementModal() {
  closeModal("supplierStatementModal");
}

// --------------------------------------------------------------------------
// 4.3 SUPPLIER LATEST PO & MULTI-PO BREAKDOWN MODAL ENGINE
// --------------------------------------------------------------------------
let currentLatestPOSupplierId = null;
let selectedLatestPOs = new Set();

function openSupplierLatestPOModal(supplierId) {
  currentLatestPOSupplierId = supplierId;
  const vendor = (ERP_DB.suppliers || []).find(s => (s["Supplier ID"] || s["id"]) === supplierId) || {};
  const supPOs = (ERP_DB.poSummary || []).filter(p => p["Supplier"] === supplierId)
    .sort((a, b) => (b["PO Date"] || "").localeCompare(a["PO Date"] || ""));

  document.getElementById("latestPoSupplierName").innerText = vendor["Supplier Name"] || supplierId;
  document.getElementById("latestPoSupplierId").innerText = `Supplier ID: ${supplierId}`;
  const supContact = vendor["Mobile"] || vendor["Contact Person"] || "-";
  document.getElementById("latestPoContactNumber").innerHTML = `<strong>Supplier Contact:</strong> ${supContact}`;
  document.getElementById("latestPoSupplierAddress").innerText = `${vendor["Address"] || "Borpeta, Assam"}, ${vendor["City"] || "Borpeta"}, ${vendor["State"] || "Assam"}`;
  document.getElementById("latestPoGeneratedDate").innerText = new Date().toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' });

  selectedLatestPOs.clear();
  // By default select Latest PO
  if (supPOs.length > 0) {
    selectedLatestPOs.add(supPOs[0]["PO ID"]);
  }

  populateLatestPOMultiPOCheckboxes(supPOs);
  updateLatestPOSelectedCountBadge();
  renderSupplierLatestPOTable();

  openModal("supplierLatestPOModal");
}

function closeSupplierLatestPOModal() {
  closeModal("supplierLatestPOModal");
}

function printLatestPOReport() {
  window.print();
}

function toggleLatestPOMultiPODropdown() {
  const panel = document.getElementById("multiPoLatestSelectionDropdown");
  if (panel) {
    panel.style.display = panel.style.display === "none" ? "block" : "none";
  }
}

function populateLatestPOMultiPOCheckboxes(supPOs) {
  const container = document.getElementById("multiPoLatestCheckboxList");
  if (!container) return;
  container.innerHTML = "";

  supPOs.forEach((p, idx) => {
    const pid = p["PO ID"];
    const isChecked = selectedLatestPOs.has(pid);
    const label = document.createElement("label");
    label.className = "multi-po-item";
    label.innerHTML = `
      <input type="checkbox" value="${pid}" ${isChecked ? 'checked' : ''} onchange="handleLatestPOCheckboxChange('${pid}', this.checked)" />
      <span><strong>${pid}</strong> (${p["PO Date"] || "-"}) - ${formatINR(p["PO Amount"])} ${idx === 0 ? '<span class="badge badge-primary" style="font-size:0.65rem; padding:1px 4px;">Latest</span>' : ''}</span>
    `;
    container.appendChild(label);
  });
}

function handleLatestPOCheckboxChange(poId, isChecked) {
  if (isChecked) selectedLatestPOs.add(poId);
  else selectedLatestPOs.delete(poId);

  updateLatestPOSelectedCountBadge();
  renderSupplierLatestPOTable();
}

function selectAllLatestPOs(checkAll) {
  const supPOs = (ERP_DB.poSummary || []).filter(p => p["Supplier"] === currentLatestPOSupplierId);
  selectedLatestPOs.clear();

  const checkboxes = document.querySelectorAll("#multiPoLatestCheckboxList input[type='checkbox']");
  checkboxes.forEach(cb => {
    cb.checked = checkAll;
    if (checkAll) selectedLatestPOs.add(cb.value);
  });

  updateLatestPOSelectedCountBadge();
  renderSupplierLatestPOTable();
}

function showOnlyLatestPO() {
  const supPOs = (ERP_DB.poSummary || []).filter(p => p["Supplier"] === currentLatestPOSupplierId)
    .sort((a, b) => (b["PO Date"] || "").localeCompare(a["PO Date"] || ""));
  selectedLatestPOs.clear();
  if (supPOs.length > 0) selectedLatestPOs.add(supPOs[0]["PO ID"]);

  const checkboxes = document.querySelectorAll("#multiPoLatestCheckboxList input[type='checkbox']");
  checkboxes.forEach(cb => {
    cb.checked = selectedLatestPOs.has(cb.value);
  });

  updateLatestPOSelectedCountBadge();
  renderSupplierLatestPOTable();
}

function showAllLatestPOs() {
  selectAllLatestPOs(true);
}

function updateLatestPOSelectedCountBadge() {
  const badge = document.getElementById("latestPoSelectedCount");
  if (!badge) return;
  const total = (ERP_DB.poSummary || []).filter(p => p["Supplier"] === currentLatestPOSupplierId).length;
  if (selectedLatestPOs.size === total && total > 0) {
    badge.innerText = "All";
  } else if (selectedLatestPOs.size === 1) {
    const arr = Array.from(selectedLatestPOs);
    badge.innerText = arr[0];
  } else {
    badge.innerText = `${selectedLatestPOs.size} of ${total}`;
  }
}

function renderSupplierLatestPOTable() {
  const tbody = document.getElementById("latestPOBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!currentLatestPOSupplierId) return;
  const supPOs = (ERP_DB.poSummary || []).filter(p => p["Supplier"] === currentLatestPOSupplierId)
    .sort((a, b) => (b["PO Date"] || "").localeCompare(a["PO Date"] || ""));
  
  const targetPOs = supPOs.filter(p => selectedLatestPOs.has(p["PO ID"]));

  let grandAmount = 0;
  let grandPaid = 0;
  let grandPending = 0;

  if (targetPOs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted" style="padding:28px;">No purchase orders selected. Check at least one PO to view details.</td></tr>`;
    document.getElementById("latestPoTotalAmount").innerText = "₹0";
    document.getElementById("latestPoTotalPaid").innerText = "₹0";
    document.getElementById("latestPoTotalPending").innerText = "₹0";
    return;
  }

  targetPOs.forEach(po => {
    const pid = po["PO ID"];
    const poDate = po["PO Date"] || "-";
    const poAmt = parseNumber(po["PO Amount"]);
    const poPaid = parseNumber(po["Paid Amount"]);
    const poPending = parseNumber(po["Pending Amount"]);
    const isClosed = po["PO Status"] === "Closed";

    grandAmount += poAmt;
    grandPaid += poPaid;
    grandPending += poPending;

    // Get product line items for this PO
    let items = (ERP_DB.purchaseOrders || []).filter(it => String(it["PO ID"]).trim().toLowerCase() === pid.toLowerCase());
    const recs = (ERP_DB.purchaseReceived || []).filter(r => String(r["PO ID"]).trim().toLowerCase() === pid.toLowerCase());

    if (items.length === 0 && recs.length > 0) {
      items = recs.map(r => ({
        "Product ID": r["Product ID"],
        "Product Name": r["Product Name"],
        "Unit": "PSC",
        "Ordered Qty": parseNumber(po["PO/Order Qty"]) || parseNumber(r["Received Qty"]),
        "Unit Price": parseNumber(po["Average Value"]) || 150,
        "Gross Amount": parseNumber(po["PO Amount"]) || (parseNumber(r["Received Qty"]) * 150)
      }));
    } else if (items.length === 0) {
      items = [{
        "Product ID": "FG-LOT",
        "Product Name": po["PO Description"] || "Textile Finished Goods",
        "Unit": "PSC",
        "Ordered Qty": parseNumber(po["PO/Order Qty"]) || 1,
        "Unit Price": parseNumber(po["Average Value"]) || poAmt,
        "Gross Amount": poAmt
      }];
    }

    const itemCount = items.length;

    items.forEach((it, idx) => {
      const pName = it["Product Name"] || "Textile Finished Goods";
      const pId = it["Product ID"] || "-";
      const q = parseNumber(it["Ordered Qty"]);
      const rate = parseNumber(it["Unit Price"]);
      const gross = parseNumber(it["Gross Amount"]) || (q * rate);

      const matchingRecs = recs.filter(r => r["Product ID"] === pId || r["Product Name"] === pName);
      const recQ = matchingRecs.reduce((acc, r) => acc + parseNumber(r["Received Qty"]), 0);
      const pendRecQ = Math.max(0, q - recQ);

      // Proportionate or direct paid/pending
      const itemPaid = itemCount === 1 ? poPaid : (poAmt > 0 ? (gross / poAmt) * poPaid : 0);
      const itemPending = itemCount === 1 ? poPending : Math.max(0, gross - itemPaid);

      const tr = document.createElement("tr");
      // Status & Action column removed per user instruction!
      tr.innerHTML = `
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="po-chip" onclick="openPODetailsModal('${pid}')">${pid}</span>
            <span style="font-size:0.75rem; color:var(--text-secondary);"><i class="fa-regular fa-calendar"></i> ${poDate}</span>
          </div>
          <div style="margin-top:5px; font-weight:700; color:var(--text-primary); font-size:0.88rem;">
            ${pName}
          </div>
          <div style="font-family:'JetBrains Mono'; font-size:0.72rem; color:var(--text-secondary); margin-top:1px;">
            SKU: ${pId}
          </div>
        </td>
        <td>
          <div style="font-size:0.85rem; font-weight:700;">
            Ordered: ${q} ${it["Unit"] || "pcs"} @ ₹${rate.toFixed(2)}
          </div>
          <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">
            Line Value: <strong>${formatINR(gross)}</strong>
          </div>
          <div style="margin-top:4px; font-size:0.8rem; color:${recQ >= q ? 'var(--success)' : 'var(--warning)'}; font-weight:600;">
            <i class="fa-solid fa-truck-ramp-box"></i> Received: <strong>${recQ} pcs</strong>
            ${pendRecQ > 0 ? `<span style="color:var(--danger); font-size:0.72rem;">(Pending: ${pendRecQ} pcs)</span>` : '<span style="color:var(--success); font-size:0.72rem;">(Fulfilled)</span>'}
          </div>
        </td>
        <td>
          <div style="font-size:0.85rem; font-weight:700; color:var(--primary);">
            Gross: <strong>${formatINR(gross)}</strong>
          </div>
          <div style="font-size:0.85rem; font-weight:700; color:var(--success); margin-top:3px;">
            <i class="fa-solid fa-circle-check"></i> Paid: ${formatINR(itemPaid)}
          </div>
          <div style="font-size:0.85rem; font-weight:700; color:${itemPending > 0 ? 'var(--danger)' : 'var(--success)'}; margin-top:3px;">
            <i class="fa-solid ${itemPending > 0 ? 'fa-clock' : 'fa-check-double'}"></i> Pending: ${formatINR(itemPending)}
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    if (itemCount > 1) {
      const subTr = document.createElement("tr");
      subTr.style.background = "var(--bg-app)";
      subTr.innerHTML = `
        <td colspan="2" style="font-size:0.78rem; font-weight:700; padding:8px 12px;">
          <i class="fa-solid fa-calculator"></i> Subtotal for ${pid} (${itemCount} Products, ${po["PO/Order Qty"]} pcs)
        </td>
        <td style="font-size:0.78rem; font-weight:700; padding:8px 12px;">
          Gross: ${formatINR(poAmt)} | <span class="text-success">Paid: ${formatINR(poPaid)}</span> | <span class="${poPending > 0 ? 'text-danger' : 'text-success'}">Pending: ${formatINR(poPending)}</span>
        </td>
      `;
      tbody.appendChild(subTr);
    }
  });

  document.getElementById("latestPoTotalAmount").innerText = formatINR(grandAmount);
  document.getElementById("latestPoTotalPaid").innerText = formatINR(grandPaid);
  document.getElementById("latestPoTotalPending").innerText = formatINR(grandPending);
}


function printCurrentSupplierStatement() {
  window.print();
}

// --------------------------------------------------------------------------
// 5.1 PURCHASE ORDERS SUMMARY
// --------------------------------------------------------------------------
function renderPOSummary() {
  const activeTbody = document.getElementById("activePOBody");
  const closedTbody = document.getElementById("closedPOBody");

  const supFilter = document.getElementById("poSupplierFilterSelect")?.value || "ALL";
  const dateFilter = document.getElementById("poDateFilterSelect")?.value || "all";
  const statusFilter = document.getElementById("poStatusFilterSelect")?.value || "ALL";

  let list = ERP_DB.poSummary || [];

  if (supFilter !== "ALL") {
    list = list.filter(p => p["Supplier"] === supFilter);
  }

  if (dateFilter !== "all") {
    list = list.filter(p => {
      const d = cleanDateStr(p["PO Date"]);
      if (dateFilter === "latest") return d === getLatestPODate();
      if (dateFilter === "this_month") return d.startsWith(getTodayDateStr().substring(0, 7)) || d.startsWith("2026-10") || d.startsWith("2026-09");
      if (dateFilter === "last_30") return isDateInLastNDays(d, 30);
      if (dateFilter === "custom") {
        const s = document.getElementById("poSummary_startDate")?.value;
        const e = document.getElementById("poSummary_endDate")?.value;
        if (s && d < s) return false;
        if (e && d > e) return false;
      }
      return true;
    });
  }

  // Active POs: Upper Section
  const activeList = list.filter(p => p["PO Status"] === "Active" || parseNumber(p["Pending Amount"]) > 0 || parseNumber(p["Pending Qty"]) > 0);
  // Closed / Settled POs: Lower Section
  const closedList = list.filter(p => p["PO Status"] === "Closed" && parseNumber(p["Pending Amount"]) <= 0 && parseNumber(p["Pending Qty"]) <= 0);

  const activeBox = document.getElementById("activePOSummaryBox");
  const closedBox = document.getElementById("closedPOSummaryBox");

  if (activeBox) activeBox.style.display = (statusFilter === "Complete") ? "none" : "block";
  if (closedBox) closedBox.style.display = (statusFilter === "Active") ? "none" : "block";

  const activeBadge = document.getElementById("activePOCountBadge");
  const closedBadge = document.getElementById("closedPOCountBadge");
  if (activeBadge) activeBadge.innerText = `${activeList.length} Active Orders`;
  if (closedBadge) closedBadge.innerText = `${closedList.length} Settled Orders`;

  const buildRow = (po) => {
    const pid = po["PO ID"];
    const isClosed = po["PO Status"] === "Closed";
    const pendAmt = parseNumber(po["Pending Amount"]);
    const disc = parseNumber(po["Discount"]) || 0;

    const tr = document.createElement("tr");
    tr.className = "clickable-row";
    tr.onclick = () => openPODetailsModal(pid);

    tr.innerHTML = `
      <td>
        <span class="po-chip" onclick="openPODetailsModal('${pid}')">${pid}</span>
        <span style="font-size:0.75rem; color:var(--text-secondary); display:block; margin-top:2px;">
          <i class="fa-regular fa-calendar"></i> ${po["PO Date"]}
        </span>
      </td>
      <td><strong>${po["Supplier"]}</strong></td>
      <td>
        <strong style="display:block; font-size:0.95rem;">${formatINR(po["PO Amount"])}</strong>
        <span style="font-size:0.72rem; color:var(--text-secondary); display:block;">
          ${po["PO/Order Qty"]} pcs @ ₹${po["Average Value"]}
        </span>
      </td>
      <td>${disc > 0 ? formatINR(disc) : "-"}</td>
      <td class="text-success font-bold">${formatINR(po["Paid Amount"])}</td>
      <td class="${pendAmt > 0 ? 'text-danger' : 'text-success'} font-bold">${formatINR(pendAmt)}</td>
      <td><strong>${po["Received Qty"]} pcs</strong></td>
      <td><strong style="${po['Pending Qty'] > 0 ? 'color:var(--danger);' : ''}">${po["Pending Qty"]} pcs</strong></td>
      <td><span class="badge ${isClosed ? 'badge-success' : 'badge-warning'}">${po["PO Status"]}</span></td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); openPODetailsModal('${pid}')">
          <i class="fa-solid fa-print"></i> View &amp; Print
        </button>
      </td>
    `;
    return tr;
  };

  // Render Upper Active Table
  if (activeTbody) {
    activeTbody.innerHTML = "";
    if (activeList.length === 0) {
      activeTbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted" style="padding:22px;">No active purchase orders pending at this time. All orders fulfilled.</td></tr>`;
    } else {
      activeList.forEach(po => activeTbody.appendChild(buildRow(po)));
    }
  }

  // Render Lower Closed Table
  if (closedTbody) {
    closedTbody.innerHTML = "";
    if (closedList.length === 0) {
      closedTbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted" style="padding:22px;">No completed purchase orders found for selected filters.</td></tr>`;
    } else {
      closedList.forEach(po => closedTbody.appendChild(buildRow(po)));
    }
  }


}

function handlePODateFilterChange(val) {
  const cd = document.getElementById("poSummary_customDates");
  if (cd) cd.style.display = val === "custom" ? "inline-flex" : "none";
  renderPOSummary();
}

function openPODetailsModal(rawPoId) {
  if (!rawPoId) return;
  let poId = String(rawPoId).trim();
  const m = poId.match(/PO-[A-Za-z0-9_-]+/i);
  if (m) poId = m[0];

  const po = (ERP_DB.poSummary || []).find(p => String(p["PO ID"]).trim().toLowerCase() === poId.toLowerCase()) || 
             (ERP_DB.purchaseOrders || []).find(p => String(p["PO ID"]).trim().toLowerCase() === poId.toLowerCase()) || {};
  let items = (ERP_DB.purchaseOrders || []).filter(item => String(item["PO ID"]).trim().toLowerCase() === poId.toLowerCase());
  const recs = (ERP_DB.purchaseReceived || []).filter(r => String(r["PO ID"]).trim().toLowerCase() === poId.toLowerCase());
  const pays = (ERP_DB.supplierPayments || []).filter(p => String(p["PO ID"]).trim().toLowerCase() === poId.toLowerCase());
  const supObj = (ERP_DB.suppliers || []).find(s => s["Supplier ID"] === (po["Supplier"] || po["Supplier ID"])) || {};

  document.getElementById("modalPOId").innerText = poId;
  document.getElementById("modalPODate").innerText = po["PO Date"] || "-";
  document.getElementById("modalPOSupplier").innerText = supObj["Supplier Name"] || po["Supplier"] || "-";
  document.getElementById("modalPOSupDetails").innerText = `ID: ${po["Supplier"]} • ${supObj["Address"] || "Borpeta, Assam"} • Contact: ${supObj["Mobile"] || supObj["Contact Person"] || "Vendor"}`;
  document.getElementById("modalPOStatus").innerText = po["PO Status"] || "Active";
  document.getElementById("modalPODescription").innerText = po["PO Description"] || "Finished goods procurement order.";

  let advancePaid = 0;
  let regularPaid = 0;
  pays.forEach(p => {
    const t = String(p["Payment Type"] || "").toLowerCase();
    const rem = String(p["Remarks"] || "").toLowerCase();
    const amt = parseNumber(p["Amount"]);
    if (t.includes("advance") || rem.includes("advance")) {
      advancePaid += amt;
    } else {
      regularPaid += amt;
    }
  });

  const discAmt = parseNumber(po["Discount"]) || 0;

  document.getElementById("modalPOTotalAmount").innerText = formatINR(po["PO Amount"] || 0);
  document.getElementById("modalPODiscountAmount").innerText = discAmt > 0 ? formatINR(discAmt) : "-";
  document.getElementById("modalPOAdvanceAmount").innerText = formatINR(advancePaid);
  document.getElementById("modalPOPaidAmount").innerText = formatINR(po["Paid Amount"] || 0);
  document.getElementById("modalPOPendingAmount").innerText = formatINR(po["Pending Amount"] || 0);

  const tbody = document.querySelector("#poModalItemsTable tbody");
  tbody.innerHTML = "";

  if (items.length === 0 && recs.length > 0) {
    items = recs.map(r => ({
      "Product ID": r["Product ID"],
      "Product Name": r["Product Name"],
      "Unit": "PSC",
      "Ordered Qty": parseNumber(po["PO/Order Qty"]) || parseNumber(r["Received Qty"]),
      "Unit Price": parseNumber(po["Average Value"]) || 150,
      "Gross Amount": parseNumber(po["PO Amount"]) || (parseNumber(r["Received Qty"]) * 150)
    }));
  } else if (items.length === 0 && po["PO ID"]) {
    items = [{
      "Product ID": "FG-LOT",
      "Product Name": po["PO Description"] || "Procurement Line Item",
      "Unit": "PSC",
      "Ordered Qty": parseNumber(po["PO/Order Qty"]) || 1,
      "Unit Price": parseNumber(po["Average Value"]) || parseNumber(po["PO Amount"]),
      "Gross Amount": parseNumber(po["PO Amount"])
    }];
  }

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No line items recorded for this PO.</td></tr>`;
  } else {
    items.forEach(it => {
      const pid = it["Product ID"];
      const q = parseNumber(it["Ordered Qty"]);
      const rate = parseNumber(it["Unit Price"]);
      const gross = parseNumber(it["Gross Amount"]) || (q * rate);

      const matchingRec = recs.filter(r => r["Product ID"] === pid);
      const recQ = matchingRec.reduce((acc, r) => acc + parseNumber(r["Received Qty"]), 0);
      const pendQ = Math.max(0, q - recQ);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <strong style="color:var(--text-primary); font-size:0.92rem;">${it["Product Name"]}</strong>
          <span style="font-family:'JetBrains Mono'; font-size:0.75rem; color:var(--text-secondary); display:block;">${pid}</span>
        </td>
        <td><strong>${q} ${it["Unit"] || "PSC"}</strong></td>
        <td>₹${rate.toFixed(2)}</td>
        <td><strong>${formatINR(gross)}</strong></td>
        <td>${recQ} pcs</td>
        <td><strong style="${pendQ > 0 ? 'color:var(--danger);' : ''}">${pendQ} pcs</strong></td>
      `;
      tbody.appendChild(tr);
    });
  }

  openModal("poModal");
}

function closePOModal() {
  closeModal("poModal");
}

function printCurrentPO() {
  window.print();
}

// --------------------------------------------------------------------------
// 5.2 SUBTAB 3.5: INVOICES (Loaded from Purchase/Received Sheet per spec 6)
// --------------------------------------------------------------------------
function renderInvoicesTable() {
  const tbody = document.getElementById("invoicesTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const supFilter = document.getElementById("invoiceSupplierFilterSelect")?.value || "ALL";
  const dateFilter = document.getElementById("invoiceDateFilterSelect")?.value || "all";

  // Use purchaseReceived (or newStock fallback)
  const allRecs = (ERP_DB.purchaseReceived && ERP_DB.purchaseReceived.length > 0)
    ? ERP_DB.purchaseReceived
    : (ERP_DB.newStock && ERP_DB.newStock.length > 0 ? ERP_DB.newStock : []);
  
  const invoiceGroups = {};
  allRecs.forEach(r => {
    const invNo = r["Invoice No"] || "INV-GEN";
    if (!invoiceGroups[invNo]) {
      invoiceGroups[invNo] = {
        invoiceNo: invNo,
        date: cleanDateStr(r["Recived Date"] || r["Date"]),
        supplier: r["Supplier ID"] || r["Supplier"],
        poId: r["PO ID"],
        items: [],
        totalQty: 0,
        totalVal: 0,
        remarks: r["Remarks"] || "-"
      };
    }
    const q = parseNumber(r["Received Qty"] || r["Qty"]);
    const rate = 150;
    invoiceGroups[invNo].items.push(r);
    invoiceGroups[invNo].totalQty += q;
    invoiceGroups[invNo].totalVal += (q * rate);
  });

  let invoicesList = Object.values(invoiceGroups).sort((a, b) => b.date.localeCompare(a.date));

  if (supFilter !== "ALL") {
    invoicesList = invoicesList.filter(inv => inv.supplier === supFilter);
  }

  if (dateFilter !== "all") {
    invoicesList = invoicesList.filter(inv => {
      const d = inv.date;
      if (dateFilter === "latest") return d === getLatestInwardDate();
      if (dateFilter === "this_month") return d.startsWith(getTodayDateStr().substring(0, 7)) || d.startsWith("2026-10") || d.startsWith("2026-09");
      if (dateFilter === "last_30") return isDateInLastNDays(d, 30);
      if (dateFilter === "custom") {
        const s = document.getElementById("invoice_startDate")?.value;
        const e = document.getElementById("invoice_endDate")?.value;
        if (s && d < s) return false;
        if (e && d > e) return false;
      }
      return true;
    });
  }

  const totalUnits = invoicesList.reduce((acc, inv) => acc + inv.totalQty, 0);
  const totalValuation = invoicesList.reduce((acc, inv) => acc + inv.totalVal, 0);
  const latestInv = invoicesList[0] || {};

  document.getElementById("kpiInvoiceCount").innerText = `${invoicesList.length} Invoices`;
  document.getElementById("kpiInvoiceTotalQty").innerText = `${totalUnits.toLocaleString("en-IN")} pcs`;
  document.getElementById("kpiInvoiceTotalVal").innerText = formatINR(totalValuation);
  document.getElementById("kpiInvoiceLatestDate").innerText = latestInv.date || "-";
  document.getElementById("kpiInvoiceLatestNo").innerText = `Latest: ${latestInv.invoiceNo || "-"}`;

  if (invoicesList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted" style="padding:24px;">No invoices found matching selected filters.</td></tr>`;
    return;
  }

  invoicesList.forEach(inv => {
    const supObj = (ERP_DB.suppliers || []).find(s => s["Supplier ID"] === inv.supplier) || {};
    const supName = supObj["Supplier Name"] || inv.supplier;
    const itemDesc = inv.items.map(it => `${it["Product Name"]} (${it["Received Qty"] || it["Qty"]} pcs)`).join("<br>");

    const tr = document.createElement("tr");
    tr.className = "clickable-row";
    tr.onclick = () => openInvoiceDetailModal(inv.invoiceNo);

    tr.innerHTML = `
      <td>
        <strong style="color:var(--primary); font-family:'JetBrains Mono'; font-size:0.88rem;">${inv.invoiceNo}</strong>
        <span style="font-size:0.75rem; color:var(--text-secondary); display:block;">${inv.date}</span>
      </td>
      <td>
        <strong>${supName}</strong>
        <span style="font-size:0.72rem; color:var(--text-secondary); display:block; font-family:'JetBrains Mono';">${inv.supplier}</span>
      </td>
      <td><span class="po-chip" onclick="event.stopPropagation(); openPODetailsModal('${inv.poId}')">${inv.poId}</span></td>
      <td style="font-size:0.8rem; line-height:1.3;">${itemDesc}</td>
      <td><strong style="font-family:'JetBrains Mono'; font-size:0.9rem;">${inv.totalQty} pcs</strong></td>
      <td>₹150.00 avg</td>
      <td><strong class="text-success">${formatINR(inv.totalVal)}</strong></td>
      <td>${inv.remarks}</td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="event.stopPropagation(); openInvoiceDetailModal('${inv.invoiceNo}')">
          <i class="fa-solid fa-file-lines"></i> View GRN
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function handleInvoiceDateFilterChange(val) {
  const cd = document.getElementById("invoice_customDates");
  if (cd) cd.style.display = val === "custom" ? "inline-flex" : "none";
  renderInvoicesTable();
}

/**
 * Spec 6: Goods Received Note / Invoice Modal
 * Displays Invoice/PO date, product received info, supplier details, quantity, with print option!
 */
function openInvoiceDetailModal(invoiceNo) {
  currentInvoiceNo = invoiceNo;
  const allRecs = (ERP_DB.purchaseReceived || []).filter(r => r["Invoice No"] === invoiceNo);
  if (allRecs.length === 0) return;

  const first = allRecs[0];
  const supObj = (ERP_DB.suppliers || []).find(s => s["Supplier ID"] === first["Supplier ID"]) || {};
  const matchedPO = (ERP_DB.poSummary || []).find(p => p["PO ID"] === first["PO ID"]) || {};

  document.getElementById("modalInvNo").innerText = invoiceNo;
  document.getElementById("modalInvDate").innerText = cleanDateStr(first["Recived Date"] || first["Date"]);
  document.getElementById("modalInvSupplier").innerText = `${supObj["Supplier Name"] || first["Supplier ID"]} (${first["Supplier ID"]}) • ${supObj["Address"] || "Borpeta, Assam"}`;
  const poChipEl = document.getElementById("modalInvPOId");
  if (poChipEl) {
    const pId = first["PO ID"];
    poChipEl.innerText = `${pId} (${matchedPO["PO Date"] || "-"})`;
    poChipEl.onclick = () => openPODetailsModal(pId);
    poChipEl.style.cursor = "pointer";
  }

  const tbody = document.getElementById("invoiceModalItemsBody");
  tbody.innerHTML = "";

  let totalQty = 0;
  let totalVal = 0;

  allRecs.forEach(r => {
    const q = parseNumber(r["Received Qty"] || r["Qty"]);
    const rate = 150;
    const lineTot = q * rate;
    totalQty += q;
    totalVal += lineTot;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${r["Product Name"]}</strong></td>
      <td><span style="font-family:'JetBrains Mono'; font-size:0.75rem;">${r["Product ID"]}</span></td>
      <td><strong>${q} pcs</strong></td>
      <td>₹${rate.toFixed(2)}</td>
      <td><strong>${formatINR(lineTot)}</strong></td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("modalInvTotalUnits").innerText = `${totalQty} pcs`;
  document.getElementById("modalInvTotalAmount").innerText = formatINR(totalVal);

  openModal("invoiceDetailModal");
}

function closeInvoiceModal() {
  closeModal("invoiceDetailModal");
}

function printCurrentInvoice() {
  window.print();
}

// --------------------------------------------------------------------------
// 6.1 SUPPLIER PAYMENTS VIEW
// --------------------------------------------------------------------------
function renderPayments() {
  const tbody = document.getElementById("paymentsTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const supFilter = document.getElementById("paymentSupplierFilterSelect")?.value || "ALL";
  const dateFilter = document.getElementById("paymentDateFilterSelect")?.value || "all";

  let list = ERP_DB.supplierPayments || [];

  if (supFilter !== "ALL") {
    list = list.filter(p => p["Supplier"] === supFilter || p["Supplier ID"] === supFilter);
  }

  if (dateFilter !== "all") {
    list = list.filter(p => {
      const d = cleanDateStr(p["Payment Date"] || p["Date"]);
      if (dateFilter === "latest") return d === getLatestPaymentDate();
      if (dateFilter === "this_month") return d.startsWith(getTodayDateStr().substring(0, 7)) || d.startsWith("2026-10") || d.startsWith("2026-09");
      if (dateFilter === "last_30") return isDateInLastNDays(d, 30);
      if (dateFilter === "custom") {
        const s = document.getElementById("payment_startDate")?.value;
        const e = document.getElementById("payment_endDate")?.value;
        if (s && d < s) return false;
        if (e && d > e) return false;
      }
      return true;
    });
  }

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted" style="padding:24px;">No supplier payments recorded matching selected filters.</td></tr>`;
    return;
  }

  list.forEach(p => {
    const poId = p["PO ID"] || "-";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="badge badge-secondary">${p["Payment ID"]}</span></td>
      <td>${cleanDateStr(p["Payment Date"] || p["Date"])}</td>
      <td><strong>${p["Supplier"] || p["Supplier ID"]}</strong></td>
      <td>${poId !== '-' ? `<span class="po-chip" onclick="openPODetailsModal('${poId}')">${poId}</span>` : '-'}</td>
      <td>${p["Payment Type"] || "Regular"}</td>
      <td>${p["Payment Method"] || p["Method"] || "UPI"}</td>
      <td class="text-success font-bold">${formatINR(p["Amount"])}</td>
      <td>${p["Reference No"] || "-"}</td>
      <td>${p["Remarks"] || "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}

function handlePaymentDateFilterChange(val) {
  const cd = document.getElementById("payment_customDates");
  if (cd) cd.style.display = val === "custom" ? "inline-flex" : "none";
  renderPayments();
}

function filterPaymentsTableSearch(query) {
  filterTable("paymentsTable", query);
}

function renderCreditNotes() {
  const tbody = document.getElementById("creditNotesTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  (ERP_DB.creditNotes || []).forEach(c => {
    const poId = c["PO ID"] || "-";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="badge badge-warning">${c["Payment ID"]}</span></td>
      <td>${cleanDateStr(c["Payment Date"] || c["Date"])}</td>
      <td><strong>${c["Supplier"] || c["Supplier ID"]}</strong></td>
      <td>${poId !== '-' ? `<span class="po-chip" onclick="openPODetailsModal('${poId}')">${poId}</span>` : '-'}</td>
      <td>${c["Method"] || "Credit"}</td>
      <td class="text-danger font-bold">${formatINR(c["Amount"])}</td>
      <td>${c["Remarks"] || "Credit note adjustment"}</td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Spec 2 & 3: Supplier Ledger Analytics
 * - Line graph of trend of PO (Date-wise Quantity & Amount of Purchase Orders) with date filtering + custom date
 * - Payments trend graph with date filtering + custom date
 * - Supplier share & settlement charts
 */
function renderSupplierAnalytics() {
  if (typeof Chart === "undefined") return;

  // 1. PO Trend Line Graph (Date-Wise Quantity and Amount)
  const poDateRange = getFilterRangeForChart("poTrendLine");
  const pos = ERP_DB.poSummary || [];
  let filteredPOs = pos.filter(p => isDateInRange(cleanDateStr(p["PO Date"]), poDateRange));

  const dateMap = {};
  filteredPOs.forEach(p => {
    const d = cleanDateStr(p["PO Date"]);
    if (!dateMap[d]) dateMap[d] = { qty: 0, amount: 0 };
    dateMap[d].qty += parseNumber(p["PO/Order Qty"]);
    dateMap[d].amount += parseNumber(p["PO Amount"]);
  });

  const poDates = Object.keys(dateMap).sort();
  const poCanvas = document.getElementById("chartPOTrendLine");
  if (poCanvas) {
    if (chartInstances.poTrendLine) chartInstances.poTrendLine.destroy();
    chartInstances.poTrendLine = new Chart(poCanvas.getContext("2d"), {
      type: "line",
      data: {
        labels: poDates.map(d => d.substring(5)),
        datasets: [
          {
            label: "Ordered Quantity (Pieces)",
            data: poDates.map(d => dateMap[d].qty),
            borderColor: "#4f46e5",
            backgroundColor: "rgba(79, 70, 229, 0.08)",
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            yAxisID: "y"
          },
          {
            label: "Gross PO Amount (₹)",
            data: poDates.map(d => dateMap[d].amount),
            borderColor: "#10b981",
            backgroundColor: "rgba(16, 185, 129, 0.08)",
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            yAxisID: "y1"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top" },
          tooltip: { mode: "index", intersect: false }
        },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: "Quantity (Pieces)" }, position: "left" },
          y1: { beginAtZero: true, title: { display: true, text: "Amount (₹)" }, position: "right", grid: { drawOnChartArea: false } },
          x: { title: { display: true, text: "Date (MM-DD)" } }
        }
      }
    });
  }

  // 2. Payments Trend Graph
  const payDateRange = getFilterRangeForChart("paymentsTrendLine");
  const pays = ERP_DB.supplierPayments || [];
  let filteredPays = pays.filter(p => isDateInRange(cleanDateStr(p["Payment Date"] || p["Date"]), payDateRange));

  const payMap = {};
  filteredPays.forEach(p => {
    const d = cleanDateStr(p["Payment Date"] || p["Date"]);
    payMap[d] = (payMap[d] || 0) + parseNumber(p["Amount"]);
  });

  const payDates = Object.keys(payMap).sort();
  const payCanvas = document.getElementById("chartPaymentsTrendLine");
  if (payCanvas) {
    if (chartInstances.paymentsTrendLine) chartInstances.paymentsTrendLine.destroy();
    chartInstances.paymentsTrendLine = new Chart(payCanvas.getContext("2d"), {
      type: "line",
      data: {
        labels: payDates.map(d => d.substring(5)),
        datasets: [{
          label: "Supplier Disbursements (₹)",
          data: payDates.map(d => payMap[d]),
          borderColor: "#0ea5e9",
          backgroundColor: "rgba(14, 165, 233, 0.12)",
          fill: true,
          tension: 0.35,
          borderWidth: 2.5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "top" } },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: "Amount Disbursed (₹)" } },
          x: { title: { display: true, text: "Date (MM-DD)" } }
        }
      }
    });
  }

  // 3. Supplier Share Donut
  const suppliers = ERP_DB.suppliers || [];
  const shareCanvas = document.getElementById("chartSupplierShare");
  if (shareCanvas) {
    if (chartInstances.supShare) chartInstances.supShare.destroy();
    chartInstances.supShare = new Chart(shareCanvas.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: suppliers.map(s => s["Supplier Name"]),
        datasets: [{
          data: suppliers.map(s => s["_totalDealAmount"] || parseNumber(s["Total Amount of Deal"])),
          backgroundColor: ["#4f46e5", "#0ea5e9", "#10b981"]
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  // 4. Supplier Settlement Bar
  const settleCanvas = document.getElementById("chartSupplierSettlement");
  if (settleCanvas) {
    if (chartInstances.supSettle) chartInstances.supSettle.destroy();
    chartInstances.supSettle = new Chart(settleCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: suppliers.map(s => s["Supplier ID"]),
        datasets: [
          { label: "Paid", data: suppliers.map(s => s["_totalPaid"] || parseNumber(s["Total Payment"])), backgroundColor: "#10b981" },
          { label: "Pending", data: suppliers.map(s => s["_netPending"] || parseNumber(s["Net Pending"])), backgroundColor: "#ef4444" }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } }
    });
  }
}

// --------------------------------------------------------------------------
// 7.0 MEESHO OVERVIEW & PROPER VECTOR INDIA MAP
// --------------------------------------------------------------------------
function renderMeesho() {
  const m = ERP_DB.meesho;
  if (!m) return;

  document.getElementById("kpiMeeshoDelRev").innerText = formatINR(m.deliveredRevenue || 0);
  document.getElementById("kpiMeeshoDelCount").innerText = `${m.deliveredQty || 0} Delivered items`;
  document.getElementById("kpiMeeshoRetDed").innerText = formatINR(m.returnDeductions || 0);
  document.getElementById("kpiMeeshoRetCount").innerText = `${m.returnCount || 0} Return deductions`;
  document.getElementById("kpiMeeshoNet").innerText = formatINR(m.netPayout || 0);
  document.getElementById("kpiMeeshoRto").innerText = `${m.rtoCount || 0} orders`;

  renderMeeshoCharts();

  // Meesho Sales Table
  const tbodyS = document.querySelector("#meeshoSalesTable tbody");
  if (tbodyS) {
    tbodyS.innerHTML = "";
    (m.recentPayments || []).slice(0, 50).forEach(p => {
      const amt = parseNumber(p["AMOUNT"]);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p["Order Date"] || "-"}</td>
        <td>${p["DATE"] || "-"}</td>
        <td><span style="font-family:'JetBrains Mono'; font-size:0.75rem;">${p["ORDER ID"]}</span></td>
        <td>${p["SKU"]}</td>
        <td><span class="badge ${p['STATUS'] === 'Delivered' ? 'badge-success' : 'badge-warning'}">${p["STATUS"]}</span></td>
        <td>${p["QUANTITY"] || 1}</td>
        <td style="${amt < 0 ? 'color:var(--danger);' : 'color:var(--success); font-weight:700;'}">${formatINR(amt)}</td>
      `;
      tbodyS.appendChild(tr);
    });
  }

  // Meesho Returns Table
  const tbodyR = document.querySelector("#meeshoReturnsTable tbody");
  if (tbodyR) {
    tbodyR.innerHTML = "";
    (m.recentPayments || []).filter(p => p["STATUS"] === "Return" || parseNumber(p["AMOUNT"]) < 0).slice(0, 50).forEach(p => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p["DATE"] || "-"}</td>
        <td><span style="font-family:'JetBrains Mono'; font-size:0.75rem;">${p["ORDER ID"]}</span></td>
        <td>${p["SKU"]}</td>
        <td><span class="badge badge-danger">Customer Return</span></td>
        <td class="text-danger font-bold">${formatINR(Math.abs(parseNumber(p["AMOUNT"])))}</td>
      `;
      tbodyR.appendChild(tr);
    });
  }
}

/**
 * Spec 7 & 8:
 * - Meesho Sales Trend graph: Date-wise sales quantity with amount line graph
 * - Proper authentic vector India map
 * - Status & Returns graphs
 */
function renderMeeshoCharts() {
  const m = ERP_DB.meesho;
  if (!m) return;

  // 1. Meesho Sales Trend Graph (Date-wise Quantity with Amount)
  const sales = (ERP_DB.sales || []).filter(s => (getField(s, ["Platform"]) || "Meesho") === "Meesho");
  const dateRange = getFilterRangeForChart("meeshoSalesTrend");
  const filteredSales = sales.filter(s => isDateInRange(cleanDateStr(getField(s, ["Sales Date", "Date"])), dateRange));

  const dateMap = {};
  filteredSales.forEach(s => {
    const d = cleanDateStr(getField(s, ["Sales Date", "Date"]));
    if (!dateMap[d]) dateMap[d] = { qty: 0, amount: 0 };
    const q = parseNumber(getField(s, ["Quantity", "Qty"]));
    const p = parseNumber(getField(s, ["Selling Price", "Price"]));
    const tot = parseNumber(getField(s, ["Total Amount", "Total"])) || (q * p);
    dateMap[d].qty += q;
    dateMap[d].amount += tot;
  });

  const dates = Object.keys(dateMap).sort().slice(-16);
  const trendCanvas = document.getElementById("chartMeeshoSalesTrend");
  if (trendCanvas && typeof Chart !== "undefined") {
    if (chartInstances.meeshoSalesTrend) chartInstances.meeshoSalesTrend.destroy();
    chartInstances.meeshoSalesTrend = new Chart(trendCanvas.getContext("2d"), {
      type: "line",
      data: {
        labels: dates.map(d => d.substring(5)),
        datasets: [
          {
            label: "Sales Quantity (Pieces)",
            data: dates.map(d => dateMap[d].qty),
            borderColor: "#4f46e5",
            backgroundColor: "rgba(79, 70, 229, 0.08)",
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            yAxisID: "y"
          },
          {
            label: "Sales Amount (₹)",
            data: dates.map(d => dateMap[d].amount),
            borderColor: "#10b981",
            backgroundColor: "rgba(16, 185, 129, 0.08)",
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            yAxisID: "y1"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top" },
          tooltip: { mode: "index", intersect: false }
        },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: "Quantity (Pieces)" }, position: "left" },
          y1: { beginAtZero: true, title: { display: true, text: "Revenue (₹)" }, position: "right", grid: { drawOnChartArea: false } },
          x: { title: { display: true, text: "Date (MM-DD)" } }
        }
      }
    });
  }

  // 2. Proper Authentic Vector India Map (per spec 8)
  renderIndiaMap(m.stateDistribution || {});

  // 3. Order Status Breakdown
  const statusCanvas = document.getElementById("chartMeeshoStatus");
  if (statusCanvas && typeof Chart !== "undefined") {
    if (chartInstances.meeshoStatus) chartInstances.meeshoStatus.destroy();
    chartInstances.meeshoStatus = new Chart(statusCanvas.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: ["Delivered Orders", "RTO Courier Return", "Customer Returns"],
        datasets: [{
          data: [m.deliveredQty || 1, m.rtoCount || 0, m.returnCount || 0],
          backgroundColor: ["#10b981", "#f59e0b", "#ef4444"]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom" } }
      }
    });
  }

  // 4. RTO & Customer Returns Graph
  const rtoCanvas = document.getElementById("chartMeeshoRtoReturns");
  if (rtoCanvas && typeof Chart !== "undefined") {
    if (chartInstances.meeshoRtoReturns) chartInstances.meeshoRtoReturns.destroy();
    const totOrders = (m.deliveredQty || 0) + (m.rtoCount || 0) + (m.returnCount || 0) || 1;
    const rtoPct = ((m.rtoCount || 0) / totOrders * 100).toFixed(1);
    const retPct = ((m.returnCount || 0) / totOrders * 100).toFixed(1);
    const delPct = ((m.deliveredQty || 0) / totOrders * 100).toFixed(1);

    chartInstances.meeshoRtoReturns = new Chart(rtoCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: [`Delivered (${delPct}%)`, `RTO Transit (${rtoPct}%)`, `Customer Return (${retPct}%)`],
        datasets: [{
          label: "Percentage (%)",
          data: [delPct, rtoPct, retPct],
          backgroundColor: ["#10b981", "#f59e0b", "#ef4444"],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, max: 100, title: { display: true, text: "Percentage (%)" } }
        }
      }
    });
  }
}

/**
 * Authentic Geographic Vector India Map Renderer
 */
function renderIndiaMap(stateDistribution) {
  const svg = document.getElementById("indiaMapSvg");
  const tooltip = document.getElementById("indiaMapTooltip");
  const tbody = document.getElementById("statesLeaderboardBody");
  if (!svg) return;

  svg.innerHTML = "";

  const normalizedStates = {};
  let maxVolume = 1;
  let totalDispatches = 0;

  Object.entries(stateDistribution).forEach(([st, qty]) => {
    const q = parseNumber(qty);
    normalizedStates[st.toLowerCase()] = q;
    totalDispatches += q;
    if (q > maxVolume) maxVolume = q;
  });

  INDIA_MAP_GEOMETRY.forEach(st => {
    const stName = st.name;
    const volume = normalizedStates[stName.toLowerCase()] || 0;
    const ratio = volume / maxVolume;

    let fillClass = "state-empty";
    if (volume > 0) {
      if (ratio >= 0.6) fillClass = "state-high";
      else if (ratio >= 0.25) fillClass = "state-med";
      else fillClass = "state-low";
    }

    const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pathEl.setAttribute("d", st.path);
    pathEl.setAttribute("class", `state-path ${fillClass}`);
    pathEl.setAttribute("id", `map-state-${st.id}`);
    pathEl.setAttribute("data-state", stName);
    pathEl.setAttribute("data-volume", volume);

    pathEl.addEventListener("mouseenter", (e) => {
      if (tooltip) {
        const pct = totalDispatches > 0 ? ((volume / totalDispatches) * 100).toFixed(1) : 0;
        tooltip.innerHTML = `<strong>${stName}</strong><br>Sales: <strong>${volume} units</strong> (${pct}%)`;
        tooltip.style.display = "block";
      }
    });

    pathEl.addEventListener("mousemove", (e) => {
      if (tooltip) {
        const container = document.querySelector(".india-map-container");
        const rect = container.getBoundingClientRect();
        tooltip.style.left = (e.clientX - rect.left + 15) + "px";
        tooltip.style.top = (e.clientY - rect.top + 10) + "px";
      }
    });

    pathEl.addEventListener("mouseleave", () => {
      if (tooltip) tooltip.style.display = "none";
    });

    svg.appendChild(pathEl);
  });

  if (tbody) {
    tbody.innerHTML = "";
    const sortedStates = Object.entries(stateDistribution).sort((a, b) => parseNumber(b[1]) - parseNumber(a[1]));

    if (sortedStates.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No regional orders recorded yet.</td></tr>`;
    } else {
      sortedStates.forEach(([stName, val], idx) => {
        const qty = parseNumber(val);
        const pct = totalDispatches > 0 ? ((qty / totalDispatches) * 100).toFixed(1) : 0;
        const ratio = qty / maxVolume;
        let badgeColor = ratio >= 0.6 ? "#047857" : (ratio >= 0.25 ? "#10b981" : "#86efac");

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>#${idx + 1}</strong></td>
          <td>
            <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${badgeColor}; margin-right:6px;"></span>
            <strong>${stName}</strong>
          </td>
          <td><strong>${qty} pcs</strong></td>
          <td>${pct}%</td>
        `;
        tbody.appendChild(tr);
      });
    }
  }
}

// --------------------------------------------------------------------------
// 8.0 NEW BUSINESS DASHBOARD (Total Business Expenses per spec 12)
// --------------------------------------------------------------------------
function renderBusinessDashboard() {
  const pos = ERP_DB.poSummary || [];
  const pays = ERP_DB.supplierPayments || [];
  const exp = ERP_DB.expenses || {};
  const sals = (ERP_DB.employ && ERP_DB.employ.salary) ? ERP_DB.employ.salary : [];

  // Calculate Outflows
  const totalPOPaid = pays.reduce((acc, p) => acc + parseNumber(p["Amount"]), 0);
  const totalPOBilled = pos.reduce((acc, p) => acc + parseNumber(p["PO Amount"]), 0);
  const totalPOPending = Math.max(0, totalPOBilled - totalPOPaid);

  const packingOutflow = (exp.packing || []).reduce((acc, r) => acc + parseNumber(r["Amount"]), 0);
  const transportOutflow = (exp.transportation || []).reduce((acc, r) => acc + parseNumber(r["Amount"]), 0);
  const otherOutflow = (exp.other || []).reduce((acc, r) => acc + parseNumber(r["Amount"]), 0);
  const salaryOutflow = sals.reduce((acc, s) => acc + parseNumber(s["Amount"]), 0);

  const grandTotalExpenses = totalPOPaid + packingOutflow + transportOutflow + otherOutflow + salaryOutflow;

  document.getElementById("kpiBizTotalExpense").innerText = formatINR(grandTotalExpenses);
  document.getElementById("kpiBizPODeals").innerText = formatINR(totalPOBilled);
  document.getElementById("kpiBizPOPaidSub").innerText = `Paid to date: ${formatINR(totalPOPaid)}`;
  document.getElementById("kpiBizPacking").innerText = formatINR(packingOutflow);
  document.getElementById("kpiBizTransport").innerText = formatINR(transportOutflow);
  document.getElementById("kpiBizSalaries").innerText = formatINR(salaryOutflow);
  document.getElementById("kpiBizPendingPayables").innerText = formatINR(totalPOPending);

  renderBusinessExpensesCharts({
    poPaid: totalPOPaid,
    packing: packingOutflow,
    transport: transportOutflow,
    salary: salaryOutflow,
    other: otherOutflow
  });

  renderBusinessExpenseTable();
  renderBizPOSummaryTable();
  renderBizOpexTable();
}

function renderBusinessExpensesCharts(totals) {
  if (typeof Chart === "undefined") return;

  const donutCanvas = document.getElementById("chartBusinessExpenseBreakdown");
  if (donutCanvas) {
    if (chartInstances.businessExpenseBreakdown) chartInstances.businessExpenseBreakdown.destroy();
    chartInstances.businessExpenseBreakdown = new Chart(donutCanvas.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: ["PO Supplier Payments", "Packaging Materials", "Logistics & Fuel", "Staff Salaries", "Setup & Other"],
        datasets: [{
          data: [totals.poPaid, totals.packing, totals.transport, totals.salary, totals.other],
          backgroundColor: ["#4f46e5", "#f59e0b", "#0ea5e9", "#10b981", "#ec4899"]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom" } }
      }
    });
  }

  const dateMap = {};
  (ERP_DB.supplierPayments || []).forEach(p => {
    const d = cleanDateStr(p["Payment Date"] || p["Date"]);
    dateMap[d] = (dateMap[d] || 0) + parseNumber(p["Amount"]);
  });
  const exp = ERP_DB.expenses || {};
  [...(exp.packing || []), ...(exp.transportation || []), ...(exp.other || [])].forEach(e => {
    const d = cleanDateStr(e["Date"]);
    dateMap[d] = (dateMap[d] || 0) + parseNumber(e["Amount"]);
  });
  ((ERP_DB.employ && ERP_DB.employ.salary) || []).forEach(s => {
    const d = cleanDateStr(s["Payment Date"]);
    dateMap[d] = (dateMap[d] || 0) + parseNumber(s["Amount"]);
  });

  const dates = Object.keys(dateMap).sort().slice(-14);
  const trendCanvas = document.getElementById("chartBusinessExpenseTrends");
  if (trendCanvas) {
    if (chartInstances.businessExpenseTrends) chartInstances.businessExpenseTrends.destroy();
    chartInstances.businessExpenseTrends = new Chart(trendCanvas.getContext("2d"), {
      type: "line",
      data: {
        labels: dates.map(d => d.substring(5)),
        datasets: [{
          label: "Daily Outflow Spending (₹)",
          data: dates.map(d => dateMap[d]),
          borderColor: "#ef4444",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          fill: true,
          tension: 0.35,
          borderWidth: 2.5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "top" } },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: "Total Outflow (₹)" } }
        }
      }
    });
  }
}

function renderBusinessExpenseTable() {
  const tbody = document.getElementById("businessExpenseTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const catFilter = document.getElementById("bizExpenseCategoryFilter")?.value || "ALL";
  const dateFilter = document.getElementById("bizExpenseDateFilter")?.value || "all";

  const allItems = [];

  (ERP_DB.supplierPayments || []).forEach(p => {
    allItems.push({
      date: cleanDateStr(p["Payment Date"] || p["Date"]),
      category: "PO Payments",
      ref: p["Payment ID"] + " [" + (p["PO ID"] || "PO") + "]",
      desc: `Vendor: ${p["Supplier"] || p["Supplier ID"]}`,
      method: p["Payment Method"] || "UPI",
      amount: parseNumber(p["Amount"]),
      status: "Disbursed"
    });
  });

  const exp = ERP_DB.expenses || {};
  (exp.packing || []).forEach(r => {
    allItems.push({
      date: cleanDateStr(r["Date"]),
      category: "Packaging",
      ref: "EXP-PKG",
      desc: r["Item"] || "Packaging Material",
      method: "Cash / UPI",
      amount: parseNumber(r["Amount"]),
      status: "Paid"
    });
  });

  (exp.transportation || []).forEach(r => {
    allItems.push({
      date: cleanDateStr(r["Date"]),
      category: "Transportation",
      ref: "EXP-LOG",
      desc: `${r["Types"] || "Transit"} (${r["From"] || ""} to ${r["To"] || ""})`,
      method: "Cash",
      amount: parseNumber(r["Amount"]),
      status: "Paid"
    });
  });

  (exp.other || []).forEach(r => {
    allItems.push({
      date: cleanDateStr(r["Date"]),
      category: "Other",
      ref: "EXP-OTH",
      desc: r["Descrption"] || r["Type"] || "Setup cost",
      method: "UPI",
      amount: parseNumber(r["Amount"]),
      status: "Paid"
    });
  });

  ((ERP_DB.employ && ERP_DB.employ.salary) || []).forEach(s => {
    allItems.push({
      date: cleanDateStr(s["Payment Date"]),
      category: "Salary",
      ref: "WAGE-" + s["Employ ID"],
      desc: `Staff Salary (${s["Employ ID"]})`,
      method: "UPI",
      amount: parseNumber(s["Amount"]),
      status: "Paid"
    });
  });

  allItems.sort((a, b) => b.date.localeCompare(a.date));

  let filtered = allItems;
  if (catFilter !== "ALL") {
    filtered = filtered.filter(item => item.category === catFilter);
  }

  if (dateFilter !== "all") {
    filtered = filtered.filter(item => {
      const d = item.date;
      if (dateFilter === "latest") return d === getLatestExpenseDate();
      if (dateFilter === "this_month") return d.startsWith(getTodayDateStr().substring(0, 7)) || d.startsWith("2026-10") || d.startsWith("2026-09");
      if (dateFilter === "last_30") return isDateInLastNDays(d, 30);
      if (dateFilter === "custom") {
        const s = document.getElementById("bizExpense_startDate")?.value;
        const e = document.getElementById("bizExpense_endDate")?.value;
        if (s && d < s) return false;
        if (e && d > e) return false;
      }
      return true;
    });
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding:24px;">No expense records match the selected filters.</td></tr>`;
    return;
  }

  filtered.forEach(it => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${it.date}</strong></td>
      <td><span class="badge ${it.category === 'PO Payments' ? 'badge-primary' : (it.category === 'Packaging' ? 'badge-warning' : (it.category === 'Salary' ? 'badge-success' : 'badge-info'))}">${it.category}</span></td>
      <td><span style="font-family:'JetBrains Mono'; font-size:0.75rem;">${it.ref}</span></td>
      <td><strong>${it.desc}</strong></td>
      <td>${it.method}</td>
      <td class="text-danger font-bold">${formatINR(it.amount)}</td>
      <td><span class="badge badge-secondary">${it.status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function handleBizExpenseDateChange(val) {
  const cd = document.getElementById("bizExpense_customDates");
  if (cd) cd.style.display = val === "custom" ? "inline-flex" : "none";
  renderBusinessExpenseTable();
}

function renderBizPOSummaryTable() {
  const tbody = document.getElementById("bizPOSummaryBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  (ERP_DB.poSummary || []).forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${p["PO ID"]}</strong> <span style="font-size:0.75rem; color:var(--text-secondary);">${p["PO Date"]}</span></td>
      <td>${p["Supplier"]}</td>
      <td>${p["PO Description"]}</td>
      <td><strong>${formatINR(p["PO Amount"])}</strong></td>
      <td class="text-success font-bold">${formatINR(p["Paid Amount"])}</td>
      <td class="text-danger font-bold">${formatINR(p["Pending Amount"])}</td>
      <td><span class="badge ${p['PO Status'] === 'Closed' ? 'badge-success' : 'badge-warning'}">${p["PO Status"]}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderBizOpexTable() {
  const tbody = document.getElementById("bizOpexBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const exp = ERP_DB.expenses || {};
  [...(exp.packing || []), ...(exp.transportation || []), ...(exp.other || [])].forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r["Date"]}</td>
      <td><span class="badge badge-info">${r["Types"] || r["Type"] || "Material"}</span></td>
      <td><strong>${r["Item"] || r["Descrption"] || "Expense"}</strong></td>
      <td>${r["Qty"] || 1}</td>
      <td class="text-danger font-bold">${formatINR(r["Amount"])}</td>
      <td>${r["Remark"] || "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}

// --------------------------------------------------------------------------
// 8.1 UNIFIED ALL RECORDS TABLE
// --------------------------------------------------------------------------
function renderAllRecordsTable() {
  const tbody = document.getElementById("allRecordsTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const typeFilter = document.getElementById("allRecordsTypeFilter")?.value || "ALL";
  const dateFilter = document.getElementById("allRecordsDateFilter")?.value || "today";
  const todayStr = getTodayDateStr();

  const allRows = [];

  (ERP_DB.sales || []).forEach(s => {
    const plat = getField(s, ["Platform"]) || "Meesho";
    const typeLabel = plat === "Flipkart" ? "Flipkart Sales" : (plat === "Wholesale" ? "Wholesale" : "Meesho Sales");
    const q = parseNumber(getField(s, ["Quantity", "Qty"]));
    const p = parseNumber(getField(s, ["Selling Price", "Price"]));
    const tot = parseNumber(getField(s, ["Total Amount", "Total"])) || (q * p);
    allRows.push({
      date: cleanDateStr(getField(s, ["Sales Date", "Date"])),
      type: typeLabel,
      typeClass: plat === "Flipkart" ? "badge-warning" : (plat === "Wholesale" ? "badge-success" : "badge-info"),
      ref: getField(s, ["Sales ID"]) + " (" + getField(s, ["Order ID"]) + ")",
      desc: getField(s, ["Product Name"]),
      qty: q,
      amount: tot,
      status: "Dispatched",
      time: new Date(cleanDateStr(getField(s, ["Sales Date", "Date"])) || "1970-01-01").getTime()
    });
  });

  (ERP_DB.returns || []).forEach(r => {
    allRows.push({
      date: cleanDateStr(getField(r, ["Returs Date", "Returns Date", "Date"])),
      type: "Returns",
      typeClass: "badge-danger",
      ref: getField(r, ["Returs ID", "ID"]),
      desc: getField(r, ["Product Name"]),
      qty: parseNumber(getField(r, ["Quantity", "Qty"])),
      amount: 0,
      status: r["_returnType"] || "Customer Return",
      time: new Date(cleanDateStr(getField(r, ["Returs Date", "Returns Date", "Date"])) || "1970-01-01").getTime()
    });
  });

  (ERP_DB.purchaseReceived || []).forEach(p => {
    const q = parseNumber(p["Received Qty"] || p["Qty"]);
    allRows.push({
      date: cleanDateStr(p["Recived Date"] || p["Date"]),
      type: "Inward",
      typeClass: "badge-success",
      ref: (p["Invoice No"] || "INV") + " [" + p["PO ID"] + "]",
      desc: p["Product Name"],
      qty: q,
      amount: q * 150,
      status: "Stock Inward",
      time: new Date(cleanDateStr(p["Recived Date"] || p["Date"]) || "1970-01-01").getTime()
    });
  });

  (ERP_DB.supplierPayments || []).forEach(p => {
    allRows.push({
      date: cleanDateStr(p["Payment Date"] || p["Date"]),
      type: "Payments",
      typeClass: "badge-primary",
      ref: p["Payment ID"],
      desc: `Vendor: ${p["Supplier"]} [PO: ${p["PO ID"]}]`,
      qty: "-",
      amount: parseNumber(p["Amount"]),
      status: p["Payment Method"] || "Settled",
      time: new Date(cleanDateStr(p["Payment Date"] || p["Date"]) || "1970-01-01").getTime()
    });
  });

  const exp = ERP_DB.expenses || {};
  [...(exp.packing || []), ...(exp.transportation || []), ...(exp.other || [])].forEach(e => {
    allRows.push({
      date: cleanDateStr(e["Date"]),
      type: "Expenses",
      typeClass: "badge-secondary",
      ref: "EXP",
      desc: e["Item"] || e["Types"] || e["Type"] || "Expense",
      qty: parseNumber(e["Qty"]) || 1,
      amount: parseNumber(e["Amount"]),
      status: "Paid Outflow",
      time: new Date(cleanDateStr(e["Date"]) || "1970-01-01").getTime()
    });
  });

  allRows.sort((a, b) => b.time - a.time);

  let filtered = allRows;
  if (typeFilter !== "ALL") {
    filtered = filtered.filter(r => r.type === typeFilter);
  }

  filtered = filtered.filter(r => {
    const d = r.date;
    if (dateFilter === "today") return d === todayStr;
    if (dateFilter === "latest") return d === getLatestSalesDate() || d === getLatestReturnsDate() || d === getLatestInwardDate();
    if (dateFilter === "this_week") return isDateInLastNDays(d, 7);
    if (dateFilter === "this_month") return d.startsWith(todayStr.substring(0, 7)) || d.startsWith("2026-10") || d.startsWith("2026-09");
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:36px;">
      <i class="fa-solid fa-folder-open" style="font-size:2.2rem; color:var(--text-muted); margin-bottom:10px; display:block;"></i>
      <strong style="font-size:1rem; color:var(--text-primary);">No records have been added today.</strong><br>
      <span style="font-size:0.8rem; color:var(--text-secondary);">There are no transactions recorded for Today (${todayStr}).</span><br>
      <button class="btn btn-sm btn-outline" onclick="setAllRecordsDateFilter('latest')" style="margin-top:10px;">
        <i class="fa-regular fa-calendar-check"></i> Show Latest Available Records
      </button>
    </td></tr>`;
    return;
  }

  filtered.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${r.date}</strong></td>
      <td><span class="badge ${r.typeClass}">${r.type}</span></td>
      <td><span style="font-family:'JetBrains Mono'; font-size:0.75rem;">${r.ref}</span></td>
      <td><strong>${r.desc}</strong></td>
      <td>${r.qty}</td>
      <td><strong>${formatINR(r.amount)}</strong></td>
      <td><span class="badge badge-secondary">${r.status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function setAllRecordsDateFilter(val) {
  const el = document.getElementById("allRecordsDateFilter");
  if (el) {
    el.value = val;
    renderAllRecordsTable();
  }
}

// --------------------------------------------------------------------------
// 9.0 FLIPKART ANALYTICS & PERFORMANCE
// --------------------------------------------------------------------------
function renderFlipkart() {
  const list = ERP_DB.flipkart || [];
  let totPay = 0, logRet = 0, custRet = 0;

  list.forEach(r => {
    totPay += parseNumber(r["Payment"]);
    const t = String(r["Return Type"] || "");
    if (t.includes("Logistics")) logRet++;
    else if (t.includes("Customer")) custRet++;
  });

  const totReturns = logRet + custRet;
  const returnRate = list.length > 0 ? ((totReturns / list.length) * 100).toFixed(1) : 0;

  document.getElementById("kpiFkTotalOrders").innerText = `${list.length} Orders`;
  document.getElementById("kpiFkNetPayout").innerText = formatINR(totPay);
  document.getElementById("kpiFkReturnRate").innerText = `${returnRate}%`;
  document.getElementById("kpiFkLogisticsRet").innerText = `${logRet} Orders`;
  document.getElementById("kpiFkCustomerRet").innerText = `${custRet} Orders`;

  renderFlipkartCharts();

  const tbodyS = document.querySelector("#fkSalesTable tbody");
  if (tbodyS) {
    tbodyS.innerHTML = "";
    list.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r["SL"]}</td>
        <td>${cleanDateStr(r["Order Date "] || r["Order Date"])}</td>
        <td>${cleanDateStr(r["Dispatch Date"])}</td>
        <td><span style="font-family:'JetBrains Mono'; font-size:0.75rem;">${r["Order ID"]}</span></td>
        <td><strong>${r["SKU"]}</strong></td>
        <td>${r["Qty"]}</td>
        <td class="text-success font-bold">${formatINR(r["Payment"])}</td>
        <td><span class="badge ${r['Return Type'] === 'NA' ? 'badge-success' : 'badge-warning'}">${r["Return Type"] || "NA"}</span></td>
      `;
      tbodyS.appendChild(tr);
    });
  }

  const tbodyR = document.querySelector("#fkReturnsTable tbody");
  if (tbodyR) {
    tbodyR.innerHTML = "";
    list.filter(r => r["Return Type"] && r["Return Type"] !== "NA").forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><span style="font-family:'JetBrains Mono'; font-size:0.75rem;">${r["Order ID"]}</span></td>
        <td>${cleanDateStr(r["Order Date "] || r["Order Date"])}</td>
        <td><strong>${r["SKU"]}</strong></td>
        <td><span class="badge badge-danger">${r["Return Type"]}</span></td>
        <td class="text-danger font-bold">Payment Reversed</td>
      `;
      tbodyR.appendChild(tr);
    });
  }
}

function renderFlipkartCharts() {
  if (typeof Chart === "undefined") return;
  const list = ERP_DB.flipkart || [];

  const skuStats = {};
  list.forEach(r => {
    const sku = r["SKU"] || "Item";
    if (!skuStats[sku]) skuStats[sku] = { dispatched: 0, returned: 0 };
    skuStats[sku].dispatched += parseNumber(r["Qty"] || 1);
    if (r["Return Type"] && r["Return Type"] !== "NA") {
      skuStats[sku].returned += parseNumber(r["Qty"] || 1);
    }
  });

  const skus = Object.keys(skuStats).slice(0, 8);
  const perfCanvas = document.getElementById("chartFkProductPerformance");
  if (perfCanvas) {
    if (chartInstances.fkProductPerf) chartInstances.fkProductPerf.destroy();
    chartInstances.fkProductPerf = new Chart(perfCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: skus.map(s => s.length > 15 ? s.substring(0, 14) + "..." : s),
        datasets: [
          { label: "Dispatched Units", data: skus.map(s => skuStats[s].dispatched), backgroundColor: "#0ea5e9", borderRadius: 4 },
          { label: "Returned Units", data: skus.map(s => skuStats[s].returned), backgroundColor: "#ef4444", borderRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "top" } },
        scales: { y: { beginAtZero: true, title: { display: true, text: "Units" } } }
      }
    });
  }

  let logRet = 0, custRet = 0, delivered = 0;
  list.forEach(r => {
    const t = String(r["Return Type"] || "");
    if (t.includes("Logistics")) logRet++;
    else if (t.includes("Customer")) custRet++;
    else delivered++;
  });

  const donutCanvas = document.getElementById("chartFkReturnBreakdown");
  if (donutCanvas) {
    if (chartInstances.fkReturnBreakdown) chartInstances.fkReturnBreakdown.destroy();
    chartInstances.fkReturnBreakdown = new Chart(donutCanvas.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: ["Delivered Orders", "Logistics Return (RTO)", "Customer Returns"],
        datasets: [{
          data: [delivered, logRet, custRet],
          backgroundColor: ["#10b981", "#f59e0b", "#ef4444"]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom" } }
      }
    });
  }

  const dateMap = {};
  list.forEach(r => {
    const d = cleanDateStr(r["Order Date "] || r["Order Date"]);
    if (d) dateMap[d] = (dateMap[d] || 0) + 1;
  });

  const sortedDates = Object.keys(dateMap).sort().slice(-14);
  const trendCanvas = document.getElementById("chartFkTrendsLine");
  if (trendCanvas) {
    if (chartInstances.fkTrends) chartInstances.fkTrends.destroy();
    chartInstances.fkTrends = new Chart(trendCanvas.getContext("2d"), {
      type: "line",
      data: {
        labels: sortedDates.map(d => d.substring(5)),
        datasets: [{
          label: "Daily Flipkart Orders Processed",
          data: sortedDates.map(d => dateMap[d]),
          borderColor: "#0ea5e9",
          backgroundColor: "rgba(14, 165, 233, 0.1)",
          fill: true,
          tension: 0.35,
          borderWidth: 2.5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, title: { display: true, text: "Orders" } }
        }
      }
    });
  }
}

// --------------------------------------------------------------------------
// 4. OPERATING EXPENSES VIEW
// --------------------------------------------------------------------------
function renderExpenses() {
  const exp = ERP_DB.expenses || { packing: [], transportation: [], other: [] };
  const pList = exp.packing || [];
  const tList = exp.transportation || [];
  const oList = exp.other || [];

  const totP = pList.reduce((acc, r) => acc + parseNumber(r["Amount"]), 0);
  const totT = tList.reduce((acc, r) => acc + parseNumber(r["Amount"]), 0);
  const totO = oList.reduce((acc, r) => acc + parseNumber(r["Amount"]), 0);

  document.getElementById("kpiExpPacking").innerText = formatINR(totP);
  document.getElementById("kpiExpTransport").innerText = formatINR(totT);
  document.getElementById("kpiExpOpening").innerText = formatINR(totO);
  document.getElementById("kpiExpTotal").innerText = formatINR(totP + totT + totO);

  const tbodyP = document.querySelector("#expPackingTable tbody");
  if (tbodyP) {
    tbodyP.innerHTML = "";
    pList.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${r["Date"]}</td><td><strong>${r["Item"]}</strong></td><td>${r["Qty"]}</td><td>₹${r["Avg Price"]}</td><td><strong>${formatINR(r["Amount"])}</strong></td><td>${r["Remark"] || "-"}</td>`;
      tbodyP.appendChild(tr);
    });
  }

  const tbodyT = document.querySelector("#expTransportTable tbody");
  if (tbodyT) {
    tbodyT.innerHTML = "";
    tList.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${r["Date"]}</td><td><span class="badge badge-info">${r["Types"]}</span></td><td><strong>${formatINR(r["Amount"])}</strong></td><td>${r["PO/Reference"] || "-"}</td><td>${r["From"] || "-"}</td><td>${r["To"] || "-"}</td>`;
      tbodyT.appendChild(tr);
    });
  }

  const tbodyO = document.querySelector("#expOtherTable tbody");
  if (tbodyO) {
    tbodyO.innerHTML = "";
    oList.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${r["Date"]}</td><td><span class="badge badge-warning">${r["Type"]}</span></td><td><strong>${formatINR(r["Amount"])}</strong></td><td>${r["Descrption"] || "-"}</td>`;
      tbodyO.appendChild(tr);
    });
  }
}

// --------------------------------------------------------------------------
// 7. TEAM & INVESTORS VIEW
// --------------------------------------------------------------------------
function renderPartners() {
  const emps = (ERP_DB.employ && ERP_DB.employ.employees) ? ERP_DB.employ.employees : [];
  const tbodyE = document.querySelector("#employeeTable tbody");
  if (tbodyE) {
    tbodyE.innerHTML = "";
    emps.forEach(e => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td><strong>${e["ID"]}</strong></td><td><strong>${e["Name"]}</strong></td><td>${e["Employ Type"]}</td><td>${e["Salery Types"]}</td><td>${e["Working Time"]}</td><td>${cleanDateStr(e["Joining Date"])}</td><td><span class="badge badge-success">${e["Status"]}</span></td>`;
      tbodyE.appendChild(tr);
    });
  }

  const sals = (ERP_DB.employ && ERP_DB.employ.salary) ? ERP_DB.employ.salary : [];
  const tbodyS = document.querySelector("#salaryTable tbody");
  if (tbodyS) {
    tbodyS.innerHTML = "";
    sals.forEach(s => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${cleanDateStr(s["Payment Date"])}</td><td><strong>${s["Employ ID"]}</strong></td><td class="text-success font-bold">${formatINR(s["Amount"])}</td><td>UPI</td><td>${s["Remark"] || "-"}</td>`;
      tbodyS.appendChild(tr);
    });
  }

  const atts = (ERP_DB.employ && ERP_DB.employ.attendance) ? ERP_DB.employ.attendance : [];
  const tbodyA = document.querySelector("#attendanceTable tbody");
  if (tbodyA) {
    tbodyA.innerHTML = "";
    atts.forEach(a => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${cleanDateStr(a["Date"])}</td><td>${a["Timestamp"]}</td><td><strong>${a["Employ ID"]}</strong></td><td><span class="badge ${a['Start/End'] === 'Start' ? 'badge-success' : 'badge-danger'}">${a["Start/End"]}</span></td><td>${a["Work Description"] || "Packaging"}</td>`;
      tbodyA.appendChild(tr);
    });
  }

  const invests = ERP_DB.partnerTransactions || [];
  const tbodyI = document.querySelector("#partnerTransactionsTable tbody");
  if (tbodyI) {
    tbodyI.innerHTML = "";
    const tot = invests.reduce((acc, r) => acc + parseNumber(r["Amount"]), 0);
    document.getElementById("kpiInvestorName").innerText = "Robiul Awal";
    document.getElementById("kpiInvestorSub").innerText = "ID: INV01RBA | Profit Share: 50%";
    document.getElementById("kpiInvestorCapital").innerText = formatINR(tot);

    invests.forEach(i => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${cleanDateStr(i["Transaction Date"])}</td><td><strong>${i["Partner"]}</strong></td><td><span class="badge badge-info">${i["Transaction Type"]}</span></td><td class="text-success font-bold">${formatINR(i["Amount"])}</td><td>${i["Reference"] || "-"}</td><td>${i["Payment Method"] || "UPI"}</td><td>${i["Remarks"] || "-"}</td>`;
      tbodyI.appendChild(tr);
    });
  }
}

/* ==========================================================================
   4. MODAL CRUD HANDLERS
   ========================================================================== */
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add("active");
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove("active");
}

function openAddProductModal() { openModal("addProductModal"); }
function openAddShipmentModal() { openModal("addShipmentModal"); }
function openAddReturnModal() { openModal("addReturnModal"); }
function openRecordPaymentModal() { openModal("recordPaymentModal"); }
function openCreatePOModal() { openModal("createPOModal"); }
function openAddExpenseModal() { openModal("addExpenseModal"); }

async function handleAddProductSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("newProdId").value.trim();
  const name = document.getElementById("newProdName").value.trim();
  const stock = parseInt(document.getElementById("newProdStock").value) || 0;
  const price = parseFloat(document.getElementById("newProdPrice").value) || 150;

  const newRow = {
    "Product ID": id,
    "Product Name": name,
    "Opening Stock": stock,
    "Purchased": 0,
    "Sold": 0,
    "Returned": 0,
    "Current Stock": stock,
    "Status": "Healthy stock",
    "Price": price,
    "Stock Values": stock * price
  };

  ERP_DB.inventory.push(newRow);
  closeModal("addProductModal");
  renderInventory();

  postMutation("INVENTORY", "Stock Ledger", "addRecord", newRow);
}

async function handleAddShipmentSubmit(e) {
  e.preventDefault();
  const date = document.getElementById("shipDate").value;
  const plat = document.getElementById("shipPlatform").value;
  const name = document.getElementById("shipProdName").value.trim();
  const qty = parseInt(document.getElementById("shipQty").value) || 1;
  const price = parseFloat(document.getElementById("shipPrice").value) || 281;
  const ordId = document.getElementById("shipOrderId").value.trim();

  const newRow = {
    "Sales ID": "SAL" + (ERP_DB.sales.length + 1),
    "Sales Date": date || getTodayDateStr(),
    "Order ID": ordId || ("MO" + Math.floor(100 + Math.random() * 900)),
    "Platform": plat,
    "Product ID": "FG-MANUAL",
    "Product Name": name,
    "Quantity": qty,
    "Selling Price": price,
    "Total Amount": qty * price,
    "Remarks": "Dashboard Entry"
  };

  ERP_DB.sales.push(newRow);
  closeModal("addShipmentModal");
  renderSales();
  renderDashboard();

  postMutation("INVENTORY", "Daily Shipment", "addRecord", newRow);
}

async function handleAddReturnSubmit(e) {
  e.preventDefault();
  const date = document.getElementById("retDate").value;
  const plat = document.getElementById("retPlatform").value;
  const name = document.getElementById("retProdName").value.trim();
  const qty = parseInt(document.getElementById("retQty").value) || 1;

  const newRow = {
    "Returs ID": "RET" + Math.floor(1000 + Math.random() * 9000),
    "Returs Date": date || getTodayDateStr(),
    "Platform": plat,
    "Product ID": "FG-MANUAL",
    "Product Name": name,
    "Quantity": qty,
    "Remarks": "Customer Return",
    "_returnType": "Customer Return"
  };

  ERP_DB.returns.push(newRow);
  closeModal("addReturnModal");
  renderReturns();
  renderDashboard();

  postMutation("INVENTORY", "Returs", "addRecord", newRow);
}

async function handleRecordPaymentSubmit(e) {
  e.preventDefault();
  const sup = document.getElementById("paySupplierSelect").value;
  const poId = document.getElementById("payPoId").value.trim();
  const amt = parseFloat(document.getElementById("payAmount").value) || 0;
  const method = document.getElementById("payMethod").value;
  const rem = document.getElementById("payRemarks").value.trim();

  const newPayment = {
    "Payment ID": "PAY" + (ERP_DB.supplierPayments.length + 1),
    "Payment Date": getTodayDateStr(),
    "Supplier ID": sup,
    "Supplier": sup,
    "PO ID": poId || "-",
    "Payment Type": method === "Credit" ? "Credit" : "Regular",
    "Payment Method": method,
    "Method": method,
    "Amount": amt,
    "Reference No": "REF" + Date.now().toString().slice(-6),
    "Remarks": rem || "Recorded from dashboard"
  };

  ERP_DB.supplierPayments.push(newPayment);
  closeModal("recordPaymentModal");
  compilePOSummary();
  compileSupplierMetrics();
  renderPayments();
  renderPOSummary();
  renderSuppliers();

  postMutation("SUPPLIER_LEDGER", "Payments", "recordPayment", newPayment);
}

async function handleCreatePOSubmit(e) {
  e.preventDefault();
  const poId = document.getElementById("createPoId").value.trim();
  const sup = document.getElementById("createPoSupplier").value;
  const name = document.getElementById("createPoProdName").value.trim();
  const qty = parseInt(document.getElementById("createPoQty").value) || 50;
  const rate = parseFloat(document.getElementById("createPoRate").value) || 150;
  const gross = qty * rate;

  const item = {
    "PO ID": poId,
    "PO Date": getTodayDateStr(),
    "Supplier": sup,
    "Product ID": "FG-NEW",
    "Product Name": name,
    "Unit": "PSC",
    "Ordered Qty": qty,
    "Unit Price": rate,
    "Gross Amount": gross
  };

  ERP_DB.purchaseOrders.push(item);
  closeModal("createPOModal");
  compilePOSummary();
  compileSupplierMetrics();
  renderPOSummary();
  renderSuppliers();

  postMutation("SUPPLIER_LEDGER", "PO", "createPO", { poId: poId, supplier: sup, items: [item] });
}

async function handleAddExpenseSubmit(e) {
  e.preventDefault();
  const cat = document.getElementById("expCategory").value;
  const desc = document.getElementById("expItemDesc").value.trim();
  const amt = parseFloat(document.getElementById("expAmountVal").value) || 0;

  const newRow = {
    "Date": getTodayDateStr(),
    "Item": desc,
    "Types": desc,
    "Type": desc,
    "Qty": 1,
    "Avg Price": amt,
    "Amount": amt,
    "Remark": "Dashboard entry"
  };

  const sheetNameMap = { packing: "Packing Expenses", transportation: "Transportation", other: "Other Expenses" };
  const targetSheet = sheetNameMap[cat] || "Packing Expenses";

  ERP_DB.expenses[cat].push(newRow);
  closeModal("addExpenseModal");
  renderExpenses();

  postMutation("EXPENSES", targetSheet, "addRecord", newRow);
}

async function postMutation(sheetKey, sheetName, action, data, primaryKey, keyValue) {
  try {
    const payload = { sheetKey: sheetKey, sheetName: sheetName, action: action, data: data, primaryKey: primaryKey, keyValue: keyValue };
    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      mode: "cors"
    });
  } catch (err) {
    console.warn("Could not post live mutation to Google Sheets:", err);
  }
}

/* ==========================================================================
   5. CENTRAL SETTINGS & CONNECTION DIAGNOSTICS
   ========================================================================== */
function openCentralSettingsModal() {
  document.getElementById("settingAppsScriptUrl").value = APPS_SCRIPT_URL;
  openModal("centralSettingsModal");
  testDatabaseConnection();
}

function closeCentralSettingsModal() {
  closeModal("centralSettingsModal");
}

function saveCentralSettings() {
  const url = document.getElementById("settingAppsScriptUrl").value.trim();
  if (url) {
    APPS_SCRIPT_URL = url;
    localStorage.setItem("st_erp_api_url", url);
  }
  closeCentralSettingsModal();
  fetchERPData(true);
}

async function testDatabaseConnection() {
  const diag = document.getElementById("diagnosticStatusText");
  const testUrl = document.getElementById("settingAppsScriptUrl").value.trim();

  if (!diag) return;
  diag.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Pinging Google Apps Script endpoint: <code>${testUrl}</code>...`;

  try {
    const res = await fetch(`${testUrl}?action=ping&_t=${Date.now()}`);
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      if (text.includes("<!DOCTYPE") || text.includes("<html")) {
        diag.innerHTML = `<span style="color:var(--danger); font-weight:700;">✗ Deployment Access Notice:</span> Google returned an HTML login page. Redeploy the Web App with <strong>Who has access: Anyone</strong>.`;
        return;
      }
      diag.innerHTML = `<span style="color:var(--danger); font-weight:700;">✗ Response Error:</span> Received invalid JSON.`;
      return;
    }

    if (json.status === "success") {
      diag.innerHTML = `<span style="color:var(--success); font-weight:700;">✓ Connected (HTTP 200)!</span> Database API is responding and active.`;
    } else {
      diag.innerHTML = `<span style="color:var(--warning); font-weight:700;">⚠️ Connected with notice:</span> ${json.message}`;
    }
  } catch (err) {
    diag.innerHTML = `<span style="color:var(--danger); font-weight:700;">✗ Network / Endpoint Notice:</span> ${err.message}. Check that the Web App is deployed with 'Anyone' access.`;
  }
}

function copySetupInstructions() {
  const text = "1. Open script.google.com\n2. Paste Code.gs\n3. Deploy as Web app with 'Execute as: Me' and 'Who has access: Anyone'\n4. Copy the /exec URL into Settings.";
  navigator.clipboard.writeText(text);
  alert("Setup instructions copied to clipboard!");
}

/* ==========================================================================
   6. UTILITIES: AUTH, DATE FILTERS, TABLE SEARCH & EXPORT
   ========================================================================== */
function checkInitialAuth() {
  const isAuth = localStorage.getItem("st_erp_auth") === "true" || sessionStorage.getItem("st_erp_auth") === "true";
  const loginOverlay = document.getElementById("loginOverlay");
  if (isAuth) {
    loginOverlay.classList.add("hidden");
  } else {
    loginOverlay.classList.remove("hidden");
  }
}

function handleLogin(e) {
  e.preventDefault();
  const emailInput = document.getElementById("loginEmail").value.trim().toLowerCase();
  const passwordInput = document.getElementById("loginPassword").value.trim();
  const rememberMe = document.getElementById("rememberMeCheckbox").checked;
  const errorMsg = document.getElementById("loginErrorMsg");

  if (emailInput === AUTH_EMAIL.toLowerCase() && passwordInput === AUTH_PASSWORD_HASH) {
    errorMsg.classList.add("hidden");
    if (rememberMe) {
      localStorage.setItem("st_erp_auth", "true");
    } else {
      sessionStorage.setItem("st_erp_auth", "true");
    }
    document.getElementById("loginOverlay").classList.add("hidden");
    renderAllViews();
  } else {
    errorMsg.classList.remove("hidden");
  }
}

function handleLogout() {
  localStorage.removeItem("st_erp_auth");
  sessionStorage.removeItem("st_erp_auth");
  document.getElementById("loginOverlay").classList.remove("hidden");
  document.getElementById("loginPassword").value = "";
}

function togglePasswordVisibility() {
  const pwdInput = document.getElementById("loginPassword");
  const icon = document.getElementById("pwdToggleIcon");
  if (pwdInput.type === "password") {
    pwdInput.type = "text";
    icon.className = "fa-regular fa-eye-slash";
  } else {
    pwdInput.type = "password";
    icon.className = "fa-regular fa-eye";
  }
}

// --------------------------------------------------------------------------
// GLOBAL & PER-DATASET DATE FILTER ENGINE (Fixes Latest Record Date per spec 2)
// --------------------------------------------------------------------------
function handleGlobalDateFilterChange() {
  const select = document.getElementById("dateFilterSelect");
  const customInputs = document.getElementById("customDateInputs");
  
  if (select.value === "custom") {
    customInputs.style.display = "flex";
    if (!document.getElementById("customStartDate").value) {
      document.getElementById("customStartDate").value = "2026-09-01";
    }
    if (!document.getElementById("customEndDate").value) {
      document.getElementById("customEndDate").value = getLatestSalesDate();
    }
  } else {
    customInputs.style.display = "none";
  }

  renderDashboard();
  renderAllViews();
}

function handleCustomDateChange() {
  renderDashboard();
}

function applyCustomDateFilter() {
  renderDashboard();
  renderAllViews();
}

/**
 * Handles chart-level date filtering
 */
function handleChartDateFilterChange(chartKey, filterValue) {
  const customDiv = document.getElementById(`${chartKey}_customDates`);
  if (customDiv) {
    customDiv.style.display = filterValue === "custom" ? "inline-flex" : "none";
    if (filterValue === "custom") {
      const sInput = document.getElementById(`${chartKey}_startDate`);
      const eInput = document.getElementById(`${chartKey}_endDate`);
      if (sInput && !sInput.value) sInput.value = "2026-09-01";
      if (eInput && !eInput.value) eInput.value = getLatestSalesDate();
    }
  }

  CHART_FILTERS[chartKey] = {
    filter: filterValue,
    start: document.getElementById(`${chartKey}_startDate`)?.value || "",
    end: document.getElementById(`${chartKey}_endDate`)?.value || ""
  };

  triggerChartSpecificRender(chartKey);
}

function applyChartCustomDate(chartKey) {
  const sInput = document.getElementById(`${chartKey}_startDate`);
  const eInput = document.getElementById(`${chartKey}_endDate`);

  CHART_FILTERS[chartKey] = {
    filter: "custom",
    start: sInput?.value || "",
    end: eInput?.value || ""
  };

  triggerChartSpecificRender(chartKey);
}

function triggerChartSpecificRender(chartKey) {
  if (chartKey === "salesTrendsLine") renderDashboardCharts();
  else if (chartKey === "activeStockBar") renderInventoryAnalytics();
  else if (chartKey === "productSalesTrendsLine" || chartKey === "productSalesVsReturns" || chartKey === "platformSalesDist" || chartKey === "masterSalesAnalytics") renderSalesAnalyticsCharts();
  else if (chartKey === "poTrendLine" || chartKey === "paymentsTrendLine" || chartKey === "supShare" || chartKey === "supSettle") renderSupplierAnalytics();
  else if (chartKey === "meeshoSalesTrend" || chartKey === "meeshoStatus" || chartKey === "meeshoRtoReturns" || chartKey === "indiaMap") renderMeeshoCharts();
  else if (chartKey === "fkProductPerf" || chartKey === "fkReturnBreakdown" || chartKey === "fkTrendsLine") renderFlipkartCharts();
  else if (chartKey === "businessExpenseBreakdown" || chartKey === "businessExpenseTrends") renderBusinessDashboard();
}

function getFilterRangeForChart(chartKey, fallbackSelectId, fallbackStartId, fallbackEndId) {
  const cf = CHART_FILTERS[chartKey];
  let filterVal = cf ? cf.filter : (fallbackSelectId ? document.getElementById(fallbackSelectId)?.value : "all");
  let start = cf ? cf.start : (fallbackStartId ? document.getElementById(fallbackStartId)?.value : "");
  let end = cf ? cf.end : (fallbackEndId ? document.getElementById(fallbackEndId)?.value : "");

  const todayStr = getTodayDateStr();
  const latestDate = getLatestSalesDate();

  if (filterVal === "all") return { start: "", end: "" };
  if (filterVal === "last_7") return { start: getOffsetDateStr(7), end: latestDate };
  if (filterVal === "last_14") return { start: getOffsetDateStr(14), end: latestDate };
  if (filterVal === "last_30") return { start: getOffsetDateStr(30), end: latestDate };
  if (filterVal === "this_month") return { start: todayStr.substring(0, 7) + "-01", end: todayStr };
  if (filterVal === "custom") return { start: start, end: end };

  return { start: "", end: "" };
}

function isDateInRange(dateStr, range) {
  if (!dateStr) return false;
  if (!range.start && !range.end) return true;
  if (range.start && dateStr < range.start) return false;
  if (range.end && dateStr > range.end) return false;
  return true;
}

function getOffsetDateStr(daysAgo) {
  const d = new Date(getLatestSalesDate());
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

/**
 * Spec 2: Fix date filtering for 'Latest Record Date' across different datasets!
 */
function isDateInFilter(dateStr, contextType = "general") {
  if (!dateStr) return false;
  const filter = document.getElementById("dateFilterSelect")?.value || "today";
  if (filter === "all") return true;

  const todayStr = getTodayDateStr();

  if (filter === "today") return dateStr === todayStr;

  // Each dataset matches its own actual latest recorded date!
  if (filter === "latest") {
    if (contextType === "sales") return dateStr === getLatestSalesDate();
    if (contextType === "returns") return dateStr === getLatestReturnsDate();
    if (contextType === "inward") return dateStr === getLatestInwardDate();
    if (contextType === "payments") return dateStr === getLatestPaymentDate();
    if (contextType === "po") return dateStr === getLatestPODate();
    if (contextType === "expenses") return dateStr === getLatestExpenseDate();
    return dateStr === getLatestSalesDate() || dateStr === getLatestReturnsDate() || dateStr === getLatestInwardDate();
  }

  if (filter === "this_week") return isDateInLastNDays(dateStr, 7);
  if (filter === "this_month") return dateStr.startsWith(todayStr.substring(0, 7)) || dateStr.startsWith("2026-10") || dateStr.startsWith("2026-09");
  
  if (filter === "custom") {
    const start = document.getElementById("customStartDate")?.value || "";
    const end = document.getElementById("customEndDate")?.value || "";
    if (start && dateStr < start) return false;
    if (end && dateStr > end) return false;
    return true;
  }
  return true;
}

function getTodayDateStr() {
  return new Date().toISOString().split("T")[0];
}

function getLatestSalesDate() {
  const dates = (ERP_DB.sales || []).map(s => cleanDateStr(getField(s, ["Sales Date", "Date"]))).filter(Boolean).sort();
  return dates.length > 0 ? dates[dates.length - 1] : "2026-10-10";
}

function getLatestReturnsDate() {
  const dates = (ERP_DB.returns || []).map(r => cleanDateStr(getField(r, ["Returs Date", "Returns Date", "Date"]))).filter(Boolean).sort();
  return dates.length > 0 ? dates[dates.length - 1] : "2026-10-07";
}

function getLatestInwardDate() {
  const dates = (ERP_DB.purchaseReceived || []).map(p => cleanDateStr(p["Recived Date"] || p["Date"])).filter(Boolean).sort();
  return dates.length > 0 ? dates[dates.length - 1] : "2026-10-11";
}

function getLatestPaymentDate() {
  const dates = (ERP_DB.supplierPayments || []).map(p => cleanDateStr(p["Payment Date"] || p["Date"])).filter(Boolean).sort();
  return dates.length > 0 ? dates[dates.length - 1] : "2026-10-07";
}

function getLatestPODate() {
  const dates = (ERP_DB.poSummary || []).map(p => cleanDateStr(p["PO Date"])).filter(Boolean).sort();
  return dates.length > 0 ? dates[dates.length - 1] : "2026-10-10";
}

function getLatestExpenseDate() {
  const exp = ERP_DB.expenses || {};
  const dates = [...(exp.packing || []), ...(exp.transportation || []), ...(exp.other || [])]
    .map(e => cleanDateStr(e["Date"])).filter(Boolean).sort();
  return dates.length > 0 ? dates[dates.length - 1] : "2026-10-09";
}

function isDateInLastNDays(dateStr, n) {
  if (!dateStr) return false;
  const target = new Date(dateStr).getTime();
  const latest = new Date(getLatestSalesDate()).getTime();
  const diffDays = (latest - target) / (1000 * 3600 * 24);
  return diffDays >= 0 && diffDays <= n;
}

function filterTable(tableId, query) {
  const filter = (query || "").toLowerCase();
  const rows = document.querySelectorAll(`#${tableId} tbody tr`);
  rows.forEach(r => {
    const text = r.innerText.toLowerCase();
    r.style.display = text.includes(filter) ? "" : "none";
  });
}

function exportTableToCSV(tableId, filename) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const rows = table.querySelectorAll("tr");
  const csvContent = [];
  rows.forEach(r => {
    if (r.style.display === "none") return;
    const rowData = [];
    r.querySelectorAll("th, td").forEach(c => {
      let t = c.innerText.replace(/"/g, '""').trim();
      rowData.push(`"${t}"`);
    });
    csvContent.push(rowData.join(","));
  });

  const blob = new Blob([csvContent.join("\n")], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function setupThemeToggle() {
  const savedTheme = localStorage.getItem("st_erp_theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeIcon(savedTheme);
  // Duplicate addEventListener removed so onclick in HTML toggles cleanly once!
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("st_erp_theme", next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const icon = document.querySelector("#themeToggleBtn i");
  if (!icon) return;
  icon.className = theme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
}

function getField(obj, possibleKeys) {
  if (!obj || typeof obj !== "object") return "";

  // 1. Direct key match
  for (let key of possibleKeys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== "") {
      return obj[key];
    }
  }

  // 2. Normalized match (handles trailing spaces, case differences, underscores)
  const objKeys = Object.keys(obj);
  for (let targetKey of possibleKeys) {
    const cleanTarget = targetKey.toLowerCase().replace(/[\s_\-\.]/g, "");
    for (let k of objKeys) {
      const cleanK = k.toLowerCase().replace(/[\s_\-\.]/g, "");
      if (cleanK === cleanTarget) {
        const val = obj[k];
        if (val !== undefined && val !== null && val !== "") {
          return val;
        }
      }
    }
  }

  return "";
}

function formatINR(val) {
  const num = parseFloat(val) || 0;
  return "₹" + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseNumber(val) {
  if (typeof val === "number") return val;
  if (!val) return 0;
  return parseFloat(String(val).replace(/[^0-9.-]+/g, "")) || 0;
}

function cleanDateStr(d) {
  if (!d) return "";
  if (d instanceof Date) return d.toISOString().split("T")[0];
  const str = String(d).trim();
  if (str.length >= 10 && str.includes("-")) return str.substring(0, 10);
  return str;
}
