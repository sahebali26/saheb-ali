/**
 * Saheb Trend House ERP (ST-House-ERP)
 * Frontend Engine, Authentication & State Manager
 */

// Credentials
const AUTH_EMAIL = "saheb2602e.c@gmail.com";
const AUTH_PASSWORD_HASH = "STH@2026";

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx2eq-YOQtAawrCTsu5d-K_JSV_dXP7ZpE7qPyaKrAZ6yUQDAA9uaZk5_UjP24VUieW5Q/exec";

let ERP_DB = {
  tcData: null,
  inventory: [],
  sales: [],
  returns: [],
  suppliers: [],
  poSummary: [],
  purchaseOrders: [],
  purchaseReceived: [],
  supplierPayments: [],
  creditNotes: [],
  expenses: [],
  partnerTransactions: [],
  partnerContribution: []
};

let chartInstances = {};
let currentSelectedPO = null;
let currentStatementSupplierId = null;

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupThemeToggle();
  setupDateFilters();

  // 1. Check Authentication Status
  checkInitialAuth();

  // 2. Load Local Cache & Preload Google Sheet Data in Background immediately
  loadLocalCachedData();
  fetchERPData(false);

  document.getElementById("sidebarToggleBtn").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("mobile-open");
  });

  document.getElementById("refreshDataBtn").addEventListener("click", () => {
    fetchERPData(true);
  });
});

/* ==========================================================================
   1. Authentication & Security Engine
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

/* ==========================================================================
   2. Fast Background Data Fetching & Cache Engine
   ========================================================================== */
function loadLocalCachedData() {
  try {
    const cachedStr = localStorage.getItem("st_erp_cached_payload");
    if (cachedStr) {
      const parsed = JSON.parse(cachedStr);
      if (parsed && parsed.data) {
        ERP_DB = parsed.data;
        renderAllViews();
        const lastSync = localStorage.getItem("st_erp_last_sync_str") || "Earlier";
        document.getElementById("lastUpdatedText").innerText = "Instant Cache (" + lastSync + ")";
      }
    }
  } catch (e) {
    console.warn("No valid local cache found:", e);
  }
}

async function fetchERPData(isManual = false) {
  const refreshBtn = document.getElementById("refreshDataBtn");
  if (refreshBtn) refreshBtn.querySelector("i").classList.add("fa-spin");

  if (isManual) {
    showNotification("<i class='fa-solid fa-arrows-rotate fa-spin'></i> Refreshing live data from Google Sheet...", true);
  }

  try {
    const url = isManual ? `${APPS_SCRIPT_URL}?refresh=true&_=${Date.now()}` : APPS_SCRIPT_URL;
    const response = await fetch(url);
    if (!response.ok) throw new Error("HTTP error " + response.status);
    
    const result = await response.json();
    if (result.status === "success" && result.data) {
      ERP_DB = result.data;
      renderAllViews();
      
      const timeStr = new Date().toLocaleTimeString();
      localStorage.setItem("st_erp_cached_payload", JSON.stringify(result));
      localStorage.setItem("st_erp_last_sync_str", timeStr);
      
      document.getElementById("lastUpdatedText").innerText = "Live synced at " + timeStr;
      
      if (isManual) {
        showNotification("<i class='fa-solid fa-circle-check'></i> Synced successfully in 1s!", false, 2500);
      }
    }
  } catch (error) {
    console.error("Data fetch error:", error);
    if (isManual) {
      showNotification("<i class='fa-solid fa-triangle-exclamation'></i> Sync failed. Please check network/permissions.", false, 5000);
    }
  } finally {
    if (refreshBtn) refreshBtn.querySelector("i").classList.remove("fa-spin");
  }
}

function showNotification(msg, persistent = false, timeout = 3000) {
  const notif = document.getElementById("syncNotification");
  const msgSpan = document.getElementById("syncNotificationMsg");
  msgSpan.innerHTML = msg;
  notif.classList.remove("hidden");
  if (!persistent) {
    setTimeout(() => notif.classList.add("hidden"), timeout);
  }
}

/* ==========================================================================
   3. Robust Helper & Field Matcher
   ========================================================================== */
function getField(obj, possibleKeys) {
  if (!obj) return "";
  for (let key of possibleKeys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== "") {
      return obj[key];
    }
  }
  const objKeys = Object.keys(obj);
  for (let key of possibleKeys) {
    const kClean = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    const found = objKeys.find(ok => ok.toLowerCase().replace(/[^a-z0-9]/g, '') === kClean);
    if (found && obj[found] !== undefined && obj[found] !== null && obj[found] !== "") {
      return obj[found];
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

/* ==========================================================================
   4. Tab Navigation & View Management
   ========================================================================== */
function setupNavigation() {
  const navItems = document.querySelectorAll(".sidebar-menu .nav-item");
  navItems.forEach(btn => {
    btn.addEventListener("click", () => {
      navItems.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      const tabId = btn.getAttribute("data-tab");
      document.querySelectorAll(".view-panel").forEach(p => p.classList.remove("active"));
      document.getElementById(tabId).classList.add("active");
      
      const title = btn.querySelector("span").innerText;
      document.getElementById("currentSectionTitle").innerText = title;
      
      document.getElementById("sidebar").classList.remove("mobile-open");

      if (tabId === "analytics-view") {
        renderAnalyticsCharts();
      }
    });
  });
}

function navigateToTab(tabId) {
  const targetBtn = document.querySelector(`.sidebar-menu .nav-item[data-tab='${tabId}']`);
  if (targetBtn) targetBtn.click();
}

/* ==========================================================================
   5. Date Filtering Engine
   ========================================================================== */
function setupDateFilters() {
  const select = document.getElementById("dateFilterSelect");
  const customDiv = document.getElementById("customDateInputs");
  
  select.addEventListener("change", () => {
    if (select.value === "custom") {
      customDiv.classList.remove("hidden");
    } else {
      customDiv.classList.add("hidden");
      renderDashboard();
    }
  });

  document.getElementById("applyCustomDateBtn").addEventListener("click", () => {
    renderDashboard();
  });
}

function isDateInFilter(dateStr) {
  const filter = document.getElementById("dateFilterSelect").value;
  if (filter === "all") return true;
  
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return true;
  
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  
  if (filter === "today") return dateStr === todayStr;
  if (filter === "yesterday") {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return dateStr === yesterday.toISOString().split("T")[0];
  }
  if (filter === "this_week") {
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);
    return d >= oneWeekAgo && d <= now;
  }
  if (filter === "this_month") {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  if (filter === "custom") {
    const start = document.getElementById("customStartDate").value;
    const end = document.getElementById("customEndDate").value;
    if (start && dateStr < start) return false;
    if (end && dateStr > end) return false;
    return true;
  }
  return true;
}

/* ==========================================================================
   6. View Renderers
   ========================================================================== */
function renderAllViews() {
  renderDashboard();
  renderInventory();
  renderPOSummary();
  renderSuppliers();
  renderSales();
  renderReturns();
  renderExpenses();
  renderPayments();
  renderCreditNotes();
  renderPartners();
}

// 6.1 Dashboard View: TC!E2, TC!E3, TC!F3, TC!G2
function renderDashboard() {
  const filter = document.getElementById("dateFilterSelect").value;
  const filteredSales = (ERP_DB.sales || []).filter(s => isDateInFilter(cleanDateStr(getField(s, ["Sales Date", "Date"]))));
  const filteredExpenses = (ERP_DB.expenses || []).filter(e => isDateInFilter(cleanDateStr(getField(e, ["Expense Date", "Date"]))));

  let grossSales = 0;
  let itemsSold = 0;
  let purchasesDeals = 0;
  let totalExpenses = 0;

  if (filter === "all" && ERP_DB.tcData) {
    grossSales = parseNumber(ERP_DB.tcData.grossSales);
    itemsSold = parseNumber(ERP_DB.tcData.itemSold);
    purchasesDeals = parseNumber(ERP_DB.tcData.purchaseDeals);
    totalExpenses = parseNumber(ERP_DB.tcData.expenses);
  } else {
    grossSales = filteredSales.reduce((acc, r) => {
      const qty = parseNumber(getField(r, ["Quantity", "Qty"]));
      const price = parseNumber(getField(r, ["Selling Price", "Price"]));
      return acc + (parseNumber(getField(r, ["Total Amount", "Total"])) || (qty * price));
    }, 0);

    itemsSold = filteredSales.reduce((acc, r) => acc + parseNumber(getField(r, ["Quantity", "Qty"])), 0);
    purchasesDeals = (ERP_DB.poSummary || []).reduce((acc, r) => acc + parseNumber(getField(r, ["PO Amount", "Amount"])), 0);
    totalExpenses = filteredExpenses.reduce((acc, r) => acc + parseNumber(getField(r, ["Amount"])), 0);
  }

  const netBalance = grossSales - purchasesDeals - totalExpenses;

  document.getElementById("kpiSales").innerText = formatINR(grossSales);
  document.getElementById("kpiSalesOrders").innerText = `${itemsSold} items sold`;

  document.getElementById("kpiPurchases").innerText = formatINR(purchasesDeals);
  document.getElementById("kpiExpenses").innerText = formatINR(totalExpenses);
  document.getElementById("kpiExpensesCount").innerText = `${filteredExpenses.length} expense entries`;

  document.getElementById("kpiNetRevenue").innerText = formatINR(netBalance);

  // Recent Sales: Lower records (latest bottom rows)
  const recentSalesTbody = document.querySelector("#recentSalesTable tbody");
  if (recentSalesTbody) {
    recentSalesTbody.innerHTML = "";
    const bottomRecentSales = filteredSales.slice(-6).reverse();
    bottomRecentSales.forEach(row => {
      const qty = parseNumber(getField(row, ["Quantity", "Qty"]));
      const price = parseNumber(getField(row, ["Selling Price", "Price"]));
      const total = parseNumber(getField(row, ["Total Amount", "Total"])) || (qty * price);
      
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${cleanDateStr(getField(row, ["Sales Date", "Date"]))}</td>
        <td><strong>${getField(row, ["Order ID", "Sales ID"]) || "-"}</strong></td>
        <td><span class="badge badge-info">${getField(row, ["Platform"]) || "Meesho"}</span></td>
        <td>${getField(row, ["Product Name", "Product ID"])}</td>
        <td>${qty}</td>
        <td><strong>${formatINR(total)}</strong></td>
      `;
      recentSalesTbody.appendChild(tr);
    });
  }

  // Stock Alerts
  const alertsContainer = document.getElementById("stockAlertsContainer");
  if (alertsContainer) {
    alertsContainer.innerHTML = "";
    const alertItems = (ERP_DB.inventory || []).filter(item => {
      const status = String(getField(item, ["Status"])).toLowerCase();
      return status.includes("out") || status.includes("low") || status.includes("action");
    });

    if (alertItems.length === 0) {
      alertsContainer.innerHTML = "<p class='text-muted'>All product inventory levels are healthy.</p>";
    } else {
      alertItems.slice(0, 5).forEach(item => {
        const status = String(getField(item, ["Status"]) || "Low Stock");
        let badgeClass = "badge-warning";
        if (status.toLowerCase().includes("out")) badgeClass = "badge-danger";
        
        const div = document.createElement("div");
        div.style.cssText = "display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color);";
        div.innerHTML = `
          <div>
            <strong>${getField(item, ["Product Name", "Product ID"])}</strong>
            <span style="font-size:0.75rem; color:var(--text-secondary); display:block;">Current Stock: ${getField(item, ["Current Stock"]) || 0}</span>
          </div>
          <span class="badge ${badgeClass}">${status}</span>
        `;
        alertsContainer.appendChild(div);
      });
    }
  }
}

// 6.2 Inventory View
function renderInventory() {
  const tbody = document.querySelector("#inventoryTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  let totalProducts = 0;
  let healthy = 0;
  let outOfStock = 0;
  let actionRequired = 0;
  let totalStockVal = 0;

  (ERP_DB.inventory || []).forEach(row => {
    totalProducts++;
    const currentStock = parseNumber(getField(row, ["Current Stock"]));
    const stockVal = parseNumber(getField(row, ["Stock Values", "Stock Value"]));
    totalStockVal += stockVal;

    const status = String(getField(row, ["Status"])).toLowerCase();
    let badgeClass = "badge-secondary";
    if (status.includes("good")) { healthy++; badgeClass = "badge-success"; }
    else if (status.includes("out")) { outOfStock++; badgeClass = "badge-danger"; }
    else if (status.includes("action") || status.includes("low")) { actionRequired++; badgeClass = "badge-warning"; }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${getField(row, ["Product ID"]) || "-"}</strong></td>
      <td>${getField(row, ["Product Name"]) || "-"}</td>
      <td>${getField(row, ["Opening Stock"]) || 0}</td>
      <td>${getField(row, ["Purchased"]) || 0}</td>
      <td>${getField(row, ["Sold"]) || 0}</td>
      <td>${getField(row, ["Returned"]) || 0}</td>
      <td><strong>${currentStock}</strong></td>
      <td><span class="badge ${badgeClass}">${getField(row, ["Status"]) || "Normal"}</span></td>
      <td><strong>${formatINR(stockVal)}</strong></td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("invTotalProducts").innerText = totalProducts;
  document.getElementById("invHealthyStock").innerText = healthy;
  document.getElementById("invOutOfStock").innerText = outOfStock;
  document.getElementById("invActionRequired").innerText = actionRequired;
  document.getElementById("invTotalStockValue").innerText = formatINR(totalStockVal);
}

// 6.3 PO Summary View (Active POs: Pending Amount > 0 | Closed POs: Pending Amount = 0)
function renderPOSummary() {
  const activeTbody = document.querySelector("#poSummaryTable tbody");
  const closedTbody = document.querySelector("#poClosedTable tbody");
  if (!activeTbody || !closedTbody) return;
  
  activeTbody.innerHTML = "";
  closedTbody.innerHTML = "";

  const poData = [...(ERP_DB.poSummary || [])];
  if (poData.length === 0) {
    activeTbody.innerHTML = `<tr><td colspan="11" class="text-center text-muted" style="padding:20px;">No PO records found.</td></tr>`;
    closedTbody.innerHTML = `<tr><td colspan="11" class="text-center text-muted" style="padding:20px;">No Closed PO records found.</td></tr>`;
    return;
  }

  poData.sort((a, b) => {
    const idA = getField(a, ["PO ID", "POID"]).toLowerCase();
    const idB = getField(b, ["PO ID", "POID"]).toLowerCase();
    return idA.localeCompare(idB);
  });

  let activeCount = 0;
  let closedCount = 0;

  poData.forEach(row => {
    const poId = getField(row, ["PO ID", "POID", "PO Id"]) || "-";
    const poDate = cleanDateStr(getField(row, ["PO Date", "Date"]));
    const supplier = getField(row, ["Supplier", "Supplier Name"]) || "-";
    const desc = getField(row, ["PO Description", "Description", "Remarks"]) || "-";
    const poAmount = parseNumber(getField(row, ["PO Amount", "Amount"]));
    const orderQty = parseNumber(getField(row, ["PO/Order Qty", "PO Order Qty", "Order Qty", "Ordered Qty", "Qty"]));
    const avgVal = parseNumber(getField(row, ["Average Value", "Avg Value"])) || (orderQty > 0 ? poAmount / orderQty : 0);
    const paidAmount = parseNumber(getField(row, ["Paid Amount", "Paid"]));
    const pendingAmount = parseNumber(getField(row, ["Pending Amount", "Pending"]));
    const recQty = parseNumber(getField(row, ["Received Qty", "Rec. Qty", "Rec Qty"]));
    const penQty = parseNumber(getField(row, ["Pending Qty", "Pen. Qty", "Pen Qty"]));
    const creditNote = getField(row, ["Credit Note", "Credit"]) || "-";
    const status = getField(row, ["PO Status", "Status"]) || "Active";

    const isClosed = pendingAmount === 0;

    const tr = document.createElement("tr");
    tr.className = "clickable-row";
    tr.onclick = () => openPODetailsModal(poId);
    
    tr.innerHTML = `
      <td>
        <span class="po-id-text">${poId}</span>
        <span class="po-date-subtext"><i class="fa-regular fa-calendar"></i> ${poDate}</span>
      </td>
      <td>${supplier}</td>
      <td>${desc}</td>
      <td>
        <span class="po-amt-text">${formatINR(poAmount)}</span>
        <span class="po-qty-subtext">${orderQty} pcs @ ${formatINR(avgVal)}</span>
      </td>
      <td class="text-success">${formatINR(paidAmount)}</td>
      <td class="${pendingAmount > 0 ? 'text-danger' : 'text-success'}"><strong>${formatINR(pendingAmount)}</strong></td>
      <td>${recQty}</td>
      <td>${penQty}</td>
      <td>${creditNote}</td>
      <td><span class="badge ${isClosed ? 'badge-success' : 'badge-warning'}">${isClosed ? 'Fully Settled' : status}</span></td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); openPODetailsModal('${poId}')">
          <i class="fa-solid fa-print"></i> View & Print
        </button>
      </td>
    `;

    if (isClosed) {
      closedCount++;
      closedTbody.appendChild(tr);
    } else {
      activeCount++;
      activeTbody.appendChild(tr);
    }
  });

  if (activeCount === 0) {
    activeTbody.innerHTML = `<tr><td colspan="11" class="text-center text-muted" style="padding:16px;">All purchase orders are currently fully settled (Pending = ₹0)!</td></tr>`;
  }
  if (closedCount === 0) {
    closedTbody.innerHTML = `<tr><td colspan="11" class="text-center text-muted" style="padding:16px;">No closed purchase orders.</td></tr>`;
  }
}

// Open PO Details Modal
function openPODetailsModal(poId) {
  const poSummary = (ERP_DB.poSummary || []).find(p => getField(p, ["PO ID", "POID", "PO Id"]) === poId) || {};
  const lineItems = (ERP_DB.purchaseOrders || []).filter(item => getField(item, ["PO ID", "POID", "PO Id"]) === poId);
  
  currentSelectedPO = { summary: poSummary, items: lineItems };

  document.getElementById("modalPOId").innerText = poId;
  document.getElementById("modalPODate").innerText = cleanDateStr(getField(poSummary, ["PO Date", "Date"])) || "-";
  document.getElementById("modalPOSupplier").innerText = getField(poSummary, ["Supplier", "Supplier Name"]) || "-";
  document.getElementById("modalPOStatus").innerText = getField(poSummary, ["PO Status", "Status"]) || "Active";
  document.getElementById("modalPODescription").innerText = getField(poSummary, ["PO Description", "Description"]) || "Purchase order created for inventory.";

  document.getElementById("modalPOTotalAmount").innerText = formatINR(getField(poSummary, ["PO Amount", "Amount"]));
  document.getElementById("modalPOPaidAmount").innerText = formatINR(getField(poSummary, ["Paid Amount", "Paid"]));
  document.getElementById("modalPOPendingAmount").innerText = formatINR(getField(poSummary, ["Pending Amount", "Pending"]));

  const tbody = document.querySelector("#poModalItemsTable tbody");
  tbody.innerHTML = "";

  if (lineItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No specific item lines found for this PO ID.</td></tr>`;
  } else {
    lineItems.forEach(item => {
      const pid = getField(item, ["Product ID"]) || "-";
      const pname = getField(item, ["Product Name"]) || "-";
      const ptype = getField(item, ["Product Type"]) || "Finished Product";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <span class="print-pid">${pid}</span>
          <span class="print-pname-type">${pname} • ${ptype}</span>
        </td>
        <td>${getField(item, ["Ordered Qty", "Qty"]) || 0}</td>
        <td>${formatINR(getField(item, ["Unit Price", "Rate"]))}</td>
        <td><strong>${formatINR(getField(item, ["Gross Amount", "Amount"]))}</strong></td>
        <td>${getField(item, ["Received Qty"]) || 0}</td>
        <td>${getField(item, ["Pending Qty"]) || 0}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  document.getElementById("poModal").classList.add("active");
}

function closePOModal() {
  document.getElementById("poModal").classList.remove("active");
}

function printCurrentPO() {
  window.print();
}

// 6.4 Supplier Ledger View
function renderSuppliers() {
  const tbody = document.querySelector("#supplierTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  (ERP_DB.suppliers || []).forEach(row => {
    const supplierId = getField(row, ["Supplier ID"]) || "-";
    const supplierName = getField(row, ["Supplier Name"]) || "-";

    const tr = document.createElement("tr");
    tr.className = "clickable-row";
    tr.onclick = () => openSupplierStatementModal(supplierId);

    tr.innerHTML = `
      <td><strong style="color:var(--primary);">${supplierId}</strong></td>
      <td><strong>${supplierName}</strong></td>
      <td><strong>${formatINR(getField(row, ["Total Amount of Deal"]))}</strong></td>
      <td>${formatINR(getField(row, ["Received Purchase"]))}</td>
      <td class="text-success">${formatINR(getField(row, ["Total Payment"]))}</td>
      <td>${formatINR(getField(row, ["Remain Credit"]))}</td>
      <td class="text-danger">${formatINR(getField(row, ["Net Pending"]))}</td>
      <td class="text-primary">${formatINR(getField(row, ["Advance Amount"]))}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); openSupplierStatementModal('${supplierId}')">
          <i class="fa-solid fa-file-invoice"></i> Statement
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Open Supplier Statement Modal
function openSupplierStatementModal(supplierId) {
  currentStatementSupplierId = supplierId;
  const supplierInfo = (ERP_DB.suppliers || []).find(s => getField(s, ["Supplier ID"]) === supplierId) || {};
  const supplierName = getField(supplierInfo, ["Supplier Name"]) || supplierId;

  document.getElementById("stmtSupplierName").innerText = supplierName;
  document.getElementById("stmtSupplierId").innerText = supplierId;
  document.getElementById("stmtGeneratedDate").innerText = new Date().toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' });

  // Populate Selective PO Dropdown
  const poSelect = document.getElementById("stmtSpecificPOSelect");
  poSelect.innerHTML = "";
  
  const supplierPOs = (ERP_DB.poSummary || []).filter(po => 
    getField(po, ["Supplier", "Supplier Name"]) === supplierId || getField(po, ["Supplier", "Supplier Name"]) === supplierName
  );

  supplierPOs.forEach(po => {
    const pid = getField(po, ["PO ID", "POID"]);
    const opt = document.createElement("option");
    opt.value = pid;
    opt.innerText = `${pid} (${formatINR(getField(po, ["PO Amount", "Amount"]))})`;
    poSelect.appendChild(opt);
  });

  document.getElementById("stmtViewTypeSelect").value = "all";
  document.getElementById("stmtSelectivePODiv").classList.add("hidden");

  filterSupplierStatement();
  document.getElementById("supplierStatementModal").classList.add("active");
}

function handleStatementFilterChange() {
  const viewType = document.getElementById("stmtViewTypeSelect").value;
  const selectiveDiv = document.getElementById("stmtSelectivePODiv");
  
  if (viewType === "selective_po") {
    selectiveDiv.classList.remove("hidden");
  } else {
    selectiveDiv.classList.add("hidden");
  }
  filterSupplierStatement();
}

// Cumulative Pending Calculation
function filterSupplierStatement() {
  if (!currentStatementSupplierId) return;

  const supplierId = currentStatementSupplierId;
  const supplierInfo = (ERP_DB.suppliers || []).find(s => getField(s, ["Supplier ID"]) === supplierId) || {};
  const supplierName = getField(supplierInfo, ["Supplier Name"]) || supplierId;

  const viewType = document.getElementById("stmtViewTypeSelect").value;
  const selectedPO = document.getElementById("stmtSpecificPOSelect").value;

  const badgeElement = document.getElementById("stmtFilterScopeBadge");
  if (viewType === "all") badgeElement.innerText = "All Transactions";
  else if (viewType === "active_only") badgeElement.innerText = "Active / Pending POs Only";
  else if (viewType === "selective_po") badgeElement.innerText = `PO: ${selectedPO}`;

  const rawTransactions = [];

  // 1. Collect POs
  (ERP_DB.poSummary || []).forEach(po => {
    const pSupp = getField(po, ["Supplier", "Supplier Name"]);
    if (pSupp === supplierId || pSupp === supplierName) {
      const poId = getField(po, ["PO ID", "POID"]);
      const poDate = cleanDateStr(getField(po, ["PO Date", "Date"]));
      const amt = parseNumber(getField(po, ["PO Amount", "Amount"]));
      const desc = getField(po, ["PO Description", "Description", "Remarks"]) || `Purchase order ${poId}`;
      const finalPending = parseNumber(getField(po, ["Pending Amount", "Pending"]));

      if (viewType === "active_only" && finalPending === 0) return;
      if (viewType === "selective_po" && poId !== selectedPO) return;

      rawTransactions.push({
        date: poDate,
        type: "Purchase Order",
        ref: poId,
        desc: desc,
        debit: amt,
        credit: 0,
        rawTime: new Date(poDate || "1970-01-01").getTime(),
        isPO: true,
        poId: poId
      });
    }
  });

  // 2. Collect Payments
  (ERP_DB.supplierPayments || []).forEach(pay => {
    const pSupp = getField(pay, ["Supplier"]);
    if (pSupp === supplierId || pSupp === supplierName) {
      const payId = getField(pay, ["Payment ID"]);
      const poRef = getField(pay, ["PO ID"]) || "";
      const payDate = cleanDateStr(getField(pay, ["Payment Date", "Date"]));
      const amt = parseNumber(getField(pay, ["Amount"]));
      const method = getField(pay, ["Payment Method"]) || "UPI";
      const remarks = getField(pay, ["Remarks"]) || `Payment via ${method}`;

      if (viewType === "selective_po" && poRef && poRef !== selectedPO) return;

      rawTransactions.push({
        date: payDate,
        type: `Payment (${method})`,
        ref: payId + (poRef ? ` • ${poRef}` : ""),
        desc: remarks,
        debit: 0,
        credit: amt,
        rawTime: new Date(payDate || "1970-01-01").getTime() + 1,
        isPayment: true,
        poId: poRef
      });
    }
  });

  // Sort Chronologically Ascending
  rawTransactions.sort((a, b) => a.rawTime - b.rawTime);

  const tbody = document.querySelector("#supplierStatementTable tbody");
  tbody.innerHTML = "";

  let totalBilled = 0;
  let totalPaid = 0;
  let runningPending = 0; // Cumulative Pending Balance

  if (rawTransactions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding:20px;">No transaction records match the selected statement filter.</td></tr>`;
  } else {
    rawTransactions.forEach(t => {
      totalBilled += t.debit;
      totalPaid += (t.isPayment ? t.credit : 0);

      // Billed (PO) adds to pending, Paid subtracts from pending
      runningPending += (t.debit - t.credit);

      let pendingHtml = "";
      if (runningPending === 0) {
        pendingHtml = `<strong class="text-success">${formatINR(0)}</strong>`;
      } else if (runningPending < 0) {
        pendingHtml = `<strong class="text-primary">${formatINR(Math.abs(runningPending))} (Adv)</strong>`;
      } else {
        pendingHtml = `<strong class="text-danger">${formatINR(runningPending)}</strong>`;
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${t.date || "-"}</strong></td>
        <td><span class="badge ${t.isPO ? 'badge-primary' : 'badge-info'}">${t.type}</span></td>
        <td>
          <span class="stmt-ref-text">${t.ref}</span>
          <span class="stmt-desc-subtext">${t.desc}</span>
        </td>
        <td>${t.debit > 0 ? formatINR(t.debit) : "-"}</td>
        <td class="text-success">${t.credit > 0 ? formatINR(t.credit) : "-"}</td>
        <td>${pendingHtml}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Update Statement Summary Header
  const netDue = totalBilled - totalPaid;
  document.getElementById("stmtTotalDeals").innerText = formatINR(totalBilled);
  document.getElementById("stmtTotalPaid").innerText = formatINR(totalPaid);
  
  const netBalElement = document.getElementById("stmtNetBalance");
  if (netDue === 0) {
    netBalElement.innerText = "₹0.00 (Fully Settled)";
    netBalElement.style.color = "var(--success)";
  } else if (netDue < 0) {
    netBalElement.innerText = `${formatINR(Math.abs(netDue))} (Advance Paid)`;
    netBalElement.style.color = "var(--primary)";
  } else {
    netBalElement.innerText = `${formatINR(netDue)} (Pending Payable)`;
    netBalElement.style.color = "var(--danger)";
  }
}

function closeSupplierStatementModal() {
  document.getElementById("supplierStatementModal").classList.remove("active");
}

function printCurrentSupplierStatement() {
  window.print();
}

// 6.5 Returns View
function renderReturns() {
  const tbody = document.querySelector("#returnsTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const returnsData = ERP_DB.returns || [];
  if (returnsData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="12" class="text-center text-muted" style="padding:20px;">No Returns records found.</td></tr>`;
    return;
  }

  returnsData.forEach(row => {
    const returnId = getField(row, ["Returs ID", "Returns ID", "Return ID", "ID"]) || "-";
    const returnDate = cleanDateStr(getField(row, ["Returs Date", "Returns Date", "Return Date", "Date"]));
    const platform = getField(row, ["Platform"]) || "Meesho";
    const productId = getField(row, ["Product ID", "Product Id", "PID"]) || "-";
    const productName = getField(row, ["Product Name", "Product", "Name"]) || "-";
    const productType = getField(row, ["Product Type", "Type"]) || "Finished Product";
    const unit = getField(row, ["Unit"]) || "PCS";
    const qty = parseNumber(getField(row, ["Quantity", "Qty", "Returned Qty"]));
    const price = parseNumber(getField(row, ["Price", "Selling Price", "Unit Price"]));
    const total = parseNumber(getField(row, ["Total Amount", "Total"])) || (qty * price);
    const remarks = getField(row, ["Remarks", "Remark"]) || "-";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${returnId}</strong></td>
      <td>${returnDate}</td>
      <td><span class="badge badge-warning">${platform}</span></td>
      <td>${productId}</td>
      <td>${productName}</td>
      <td>${productType}</td>
      <td>${unit}</td>
      <td>${qty}</td>
      <td>${formatINR(price)}</td>
      <td><strong>${formatINR(total)}</strong></td>
      <td>${remarks}</td>
    `;
    tbody.appendChild(tr);
  });
}

// 6.6 Sales View
function renderSales() {
  const tbody = document.querySelector("#salesTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  (ERP_DB.sales || []).forEach(row => {
    const qty = parseNumber(getField(row, ["Quantity", "Qty"]));
    const price = parseNumber(getField(row, ["Selling Price", "Price"]));
    const total = parseNumber(getField(row, ["Total Amount", "Total"])) || (qty * price);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${getField(row, ["Sales ID"]) || "-"}</strong></td>
      <td>${cleanDateStr(getField(row, ["Sales Date", "Date"]))}</td>
      <td>${getField(row, ["Order ID"]) || "-"}</td>
      <td><span class="badge badge-info">${getField(row, ["Platform"]) || "Meesho"}</span></td>
      <td>${getField(row, ["Product ID"]) || "-"}</td>
      <td>${getField(row, ["Product Name"]) || "-"}</td>
      <td>${getField(row, ["Product Type"]) || "Finished Product"}</td>
      <td>${getField(row, ["Unit"]) || "PCS"}</td>
      <td>${qty}</td>
      <td>${formatINR(price)}</td>
      <td><strong>${formatINR(total)}</strong></td>
      <td>${getField(row, ["Remarks"]) || "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}

// 6.7 Expenses View
function renderExpenses() {
  const tbody = document.querySelector("#expensesTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  (ERP_DB.expenses || []).forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${getField(row, ["Expense ID"]) || "-"}</strong></td>
      <td>${cleanDateStr(getField(row, ["Expense Date", "Date"]))}</td>
      <td><span class="badge badge-secondary">${getField(row, ["Expense Type"]) || "General"}</span></td>
      <td>${getField(row, ["Description"]) || "-"}</td>
      <td>${getField(row, ["Related To"]) || "-"}</td>
      <td>${getField(row, ["Payment Method"]) || "Cash"}</td>
      <td><strong>${formatINR(getField(row, ["Amount"]))}</strong></td>
      <td>${getField(row, ["Remarks"]) || "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}

// 6.8 Supplier Payments View
function renderPayments() {
  const tbody = document.querySelector("#paymentsTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  (ERP_DB.supplierPayments || []).forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${getField(row, ["Payment ID"]) || "-"}</strong></td>
      <td>${cleanDateStr(getField(row, ["Payment Date", "Date"]))}</td>
      <td>${getField(row, ["Supplier"]) || "-"}</td>
      <td><span class="badge badge-info">${getField(row, ["PO ID"]) || "-"}</span></td>
      <td>${getField(row, ["Payment Type"]) || "Advance"}</td>
      <td>${getField(row, ["Payment Method"]) || "UPI"}</td>
      <td><strong>${formatINR(getField(row, ["Amount"]))}</strong></td>
      <td>${getField(row, ["Reference No"]) || "-"}</td>
      <td>${getField(row, ["Remarks"]) || "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}

// 6.9 Credit Notes View
function renderCreditNotes() {
  const tbody = document.querySelector("#creditNotesTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  (ERP_DB.creditNotes || []).forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${getField(row, ["Credit Note ID"]) || "-"}</strong></td>
      <td>${cleanDateStr(getField(row, ["Credit Note Date", "Date"]))}</td>
      <td>${getField(row, ["Supplier"]) || "-"}</td>
      <td>${getField(row, ["PO ID"]) || "-"}</td>
      <td>${getField(row, ["Quantity"]) || 0}</td>
      <td>${formatINR(getField(row, ["Rate"]))}</td>
      <td><strong>${formatINR(getField(row, ["Amount"]))}</strong></td>
      <td>${formatINR(getField(row, ["Used Credit"]))}</td>
      <td class="text-success">${formatINR(getField(row, ["Remaining Credit"]))}</td>
      <td>${getField(row, ["Reason"]) || "-"}</td>
      <td>${getField(row, ["Resolution"]) || "-"}</td>
      <td>${getField(row, ["Remarks"]) || "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}

// 6.10 Partner View
function renderPartners() {
  const contTbody = document.querySelector("#partnerContributionTable tbody");
  if (contTbody) {
    contTbody.innerHTML = "";
    (ERP_DB.partnerContribution || []).forEach(row => {
      const perc = parseNumber(getField(row, ["Contribution %"])) * 100;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${getField(row, ["Partner ID"]) || "-"}</strong></td>
        <td>${getField(row, ["Partner Name"]) || "-"}</td>
        <td>${perc > 0 ? perc + "%" : getField(row, ["Contribution %"]) || "0%"}</td>
        <td>${formatINR(getField(row, ["Total Business Cost"]))}</td>
        <td>${formatINR(getField(row, ["Expected Contribution"]))}</td>
        <td class="text-success">${formatINR(getField(row, ["Actual Contribution"]))}</td>
        <td class="text-danger"><strong>${formatINR(getField(row, ["Balance"]))}</strong></td>
        <td><span class="badge badge-warning">${getField(row, ["Payment Status"]) || "Pending"}</span></td>
        <td><small>${getField(row, ["Note"]) || "-"}</small></td>
      `;
      contTbody.appendChild(tr);
    });
  }

  const transTbody = document.querySelector("#partnerTransactionsTable tbody");
  if (transTbody) {
    transTbody.innerHTML = "";
    (ERP_DB.partnerTransactions || []).forEach(row => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${cleanDateStr(getField(row, ["Transaction Date", "Date"]))}</td>
        <td><strong>${getField(row, ["Partner"]) || "-"}</strong></td>
        <td><span class="badge badge-info">${getField(row, ["Transaction Type"]) || "Contribution"}</span></td>
        <td><strong>${formatINR(getField(row, ["Amount"]))}</strong></td>
        <td>${getField(row, ["Reference"]) || "-"}</td>
        <td>${getField(row, ["Payment Method"]) || "UPI"}</td>
        <td>${getField(row, ["Remarks"]) || "-"}</td>
      `;
      transTbody.appendChild(tr);
    });
  }
}

/* ==========================================================================
   7. Analytics Charts (Chart.js Engine)
   ========================================================================== */
function renderAnalyticsCharts() {
  Object.values(chartInstances).forEach(c => c && c.destroy());
  chartInstances = {};

  const salesTrendCanvas = document.getElementById("salesTrendChart");
  if (!salesTrendCanvas) return;

  // 1. Sales & Revenue Trend
  const salesByDate = {};
  (ERP_DB.sales || []).forEach(s => {
    const d = cleanDateStr(getField(s, ["Sales Date", "Date"]));
    if (d) {
      const qty = parseNumber(getField(s, ["Quantity", "Qty"]));
      const price = parseNumber(getField(s, ["Selling Price", "Price"]));
      const amt = parseNumber(getField(s, ["Total Amount", "Total"])) || (qty * price);
      salesByDate[d] = (salesByDate[d] || 0) + amt;
    }
  });

  const trendDates = Object.keys(salesByDate).sort();
  const trendValues = trendDates.map(d => salesByDate[d]);

  chartInstances.salesTrend = new Chart(salesTrendCanvas.getContext("2d"), {
    type: "line",
    data: {
      labels: trendDates.length ? trendDates : ["No Data"],
      datasets: [{
        label: "Revenue (₹)",
        data: trendValues.length ? trendValues : [0],
        borderColor: "#4f46e5",
        backgroundColor: "rgba(79, 70, 229, 0.1)",
        fill: true,
        tension: 0.35
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });

  // 2. Return Rate Analysis
  const productSalesMap = {};
  const productReturnsMap = {};

  (ERP_DB.sales || []).forEach(s => {
    const name = getField(s, ["Product Name", "Product ID"]) || "Unknown";
    productSalesMap[name] = (productSalesMap[name] || 0) + parseNumber(getField(s, ["Quantity", "Qty"]));
  });

  (ERP_DB.returns || []).forEach(r => {
    const name = getField(r, ["Product Name", "Product ID"]) || "Unknown";
    productReturnsMap[name] = (productReturnsMap[name] || 0) + parseNumber(getField(r, ["Quantity", "Qty"]));
  });

  const productsList = Array.from(new Set([...Object.keys(productSalesMap), ...Object.keys(productReturnsMap)])).slice(0, 8);
  const salesCounts = productsList.map(p => productSalesMap[p] || 0);
  const returnCounts = productsList.map(p => productReturnsMap[p] || 0);

  const returnRateCanvas = document.getElementById("returnRateChart");
  if (returnRateCanvas) {
    chartInstances.returnRate = new Chart(returnRateCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: productsList,
        datasets: [
          { label: "Units Sold", data: salesCounts, backgroundColor: "#10b981" },
          { label: "Units Returned", data: returnCounts, backgroundColor: "#ef4444" }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  // 3. Top Selling Products
  const topProductsSorted = Object.entries(productSalesMap).sort((a, b) => b - a).slice(0, 6);
  const topProductsCanvas = document.getElementById("topProductsChart");
  if (topProductsCanvas) {
    chartInstances.topProducts = new Chart(topProductsCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: topProductsSorted.map(p => p[0]),
        datasets: [{
          label: "Quantity Sold",
          data: topProductsSorted.map(p => p[1]),
          backgroundColor: "#6366f1"
        }]
      },
      options: { indexAxis: "y", responsive: true, maintainAspectRatio: false }
    });
  }

  // 4. Expense Breakdown
  const expenseTypeMap = {};
  (ERP_DB.expenses || []).forEach(e => {
    const type = getField(e, ["Expense Type"]) || "Miscellaneous";
    expenseTypeMap[type] = (expenseTypeMap[type] || 0) + parseNumber(getField(e, ["Amount"]));
  });

  const expenseCanvas = document.getElementById("expenseBreakdownChart");
  if (expenseCanvas) {
    chartInstances.expenseBreakdown = new Chart(expenseCanvas.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: Object.keys(expenseTypeMap),
        datasets: [{
          data: Object.values(expenseTypeMap),
          backgroundColor: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"]
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  // 5. Supplier Payment Status
  const supplierLabels = [];
  const dealAmounts = [];
  const paidAmounts = [];

  (ERP_DB.suppliers || []).forEach(s => {
    supplierLabels.push(getField(s, ["Supplier Name", "Supplier ID"]));
    dealAmounts.push(parseNumber(getField(s, ["Total Amount of Deal"])));
    paidAmounts.push(parseNumber(getField(s, ["Total Payment"])));
  });

  const supplierCanvas = document.getElementById("supplierPaymentChart");
  if (supplierCanvas) {
    chartInstances.supplierPayment = new Chart(supplierCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: supplierLabels,
        datasets: [
          { label: "Deal Amount (₹)", data: dealAmounts, backgroundColor: "#3b82f6" },
          { label: "Total Paid (₹)", data: paidAmounts, backgroundColor: "#10b981" }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  // 6. Inventory Health Overview
  let healthyCount = 0;
  let nearLowCount = 0;
  let lowCount = 0;
  let outCount = 0;

  (ERP_DB.inventory || []).forEach(item => {
    const s = String(getField(item, ["Status"])).toLowerCase();
    if (s.includes("good")) healthyCount++;
    else if (s.includes("near")) nearLowCount++;
    else if (s.includes("low") || s.includes("action")) lowCount++;
    else if (s.includes("out")) outCount++;
  });

  const healthCanvas = document.getElementById("inventoryHealthChart");
  if (healthCanvas) {
    chartInstances.inventoryHealth = new Chart(healthCanvas.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: ["Good Stock", "Near Low Stock", "Action Required / Low", "Out of Stock"],
        datasets: [{
          data: [healthyCount, nearLowCount, lowCount, outCount],
          backgroundColor: ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"]
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
}

/* ==========================================================================
   8. Table Search & Export Utilities
   ========================================================================== */
function filterTable(tableId, query) {
  const filter = query.toLowerCase();
  const rows = document.querySelectorAll(`#${tableId} tbody tr`);
  
  rows.forEach(row => {
    const text = row.innerText.toLowerCase();
    row.style.display = text.includes(filter) ? "" : "none";
  });
}

function exportTableToCSV(tableId, filename) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const rows = table.querySelectorAll("tr");
  const csvContent = [];

  rows.forEach(row => {
    const rowData = [];
    row.querySelectorAll("th, td").forEach(cell => {
      let text = cell.innerText.replace(/"/g, '""').trim();
      rowData.push(`"${text}"`);
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

/* ==========================================================================
   9. Theme Toggle
   ========================================================================== */
function setupThemeToggle() {
  const toggleBtn = document.getElementById("themeToggleBtn");
  const savedTheme = localStorage.getItem("st_erp_theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeIcon(savedTheme);

  toggleBtn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("st_erp_theme", next);
    updateThemeIcon(next);

    if (document.getElementById("analytics-view").classList.contains("active")) {
      renderAnalyticsCharts();
    }
  });
}

function updateThemeIcon(theme) {
  const icon = document.querySelector("#themeToggleBtn i");
  if (theme === "dark") {
    icon.className = "fa-solid fa-sun";
  } else {
    icon.className = "fa-solid fa-moon";
  }
}