/**
 * ============================================================================
 * SAHEB TREND HOUSE - PRODUCTION GOOGLE APPS SCRIPT BACKEND (Code.gs)
 * ============================================================================
 * 
 * STEP-BY-STEP SETUP INSTRUCTIONS:
 * ----------------------------------------------------------------------------
 * 1. Open Google Sheets or go to https://script.google.com/
 * 2. Create a new project (e.g. "STH_Operations_Backend")
 * 3. Delete any code in Code.gs and paste this ENTIRE file.
 * 4. Verify that the 8 Spreadsheet IDs in SPREADSHEET_IDS below match your sheets:
 *    - To get a sheet's ID, look at its browser URL between "/d/" and "/edit".
 * 5. Click "Deploy" (top right) > "New deployment".
 * 6. Click the gear icon (⚙️) next to "Select type" and choose "Web app".
 * 7. In the deployment settings:
 *    - Description: "STH Live ERP Backend"
 *    - Execute as: "Me (your email)"
 *    - Who has access: "Anyone"  <-- CRITICAL! Must be "Anyone" so dashboard can connect without login prompt!
 * 8. Click "Deploy".
 * 9. Review Permissions and click "Advanced" > "Go to STH_Operations_Backend (unsafe)" > "Allow".
 * 10. Copy the generated Web App URL (ends with "/exec") and paste it into the dashboard Settings.
 * ============================================================================
 */

// SPREADSHEET IDS MAPPING

// SPREADSHEET INSTANCE CACHE (Reduces execution time from 10s to <2s)
const _SS_CACHE = {};
function getCachedSpreadsheet(spreadsheetId, errors) {
  if (!_SS_CACHE[spreadsheetId]) {
    try {
      _SS_CACHE[spreadsheetId] = SpreadsheetApp.openById(spreadsheetId);
    } catch (err) {
      if (errors) {
        errors.push("Cannot open spreadsheet (" + spreadsheetId + "): " + err.message);
      }
      return null;
    }
  }
  return _SS_CACHE[spreadsheetId];
}

/**
 * Robust sheet finder: handles case-insensitivity, whitespace, underscores, and synonyms.
 */
function findSheet(ss, targetName, alternativeNames) {
  if (!ss) return null;
  // 1. Exact match
  let sheet = ss.getSheetByName(targetName);
  if (sheet) return sheet;

  // 2. Alternative names exact match
  if (alternativeNames && alternativeNames.length) {
    for (let i = 0; i < alternativeNames.length; i++) {
      sheet = ss.getSheetByName(alternativeNames[i]);
      if (sheet) return sheet;
    }
  }

  // 3. Case-insensitive and trimmed match
  const sheets = ss.getSheets();
  const cleanTarget = targetName.toLowerCase().replace(/[\s_\-\/]/g, "");
  const altCleans = (alternativeNames || []).map(function(a) {
    return a.toLowerCase().replace(/[\s_\-\/]/g, "");
  });

  for (let j = 0; j < sheets.length; j++) {
    const sName = sheets[j].getName().toLowerCase().replace(/[\s_\-\/]/g, "");
    if (sName === cleanTarget || altCleans.indexOf(sName) !== -1) {
      return sheets[j];
    }
  }

  // 4. Substring match
  for (let k = 0; k < sheets.length; k++) {
    const sName = sheets[k].getName().toLowerCase();
    if (sName.indexOf(cleanTarget) !== -1 || cleanTarget.indexOf(sName) !== -1) {
      return sheets[k];
    }
  }

  // 5. Fallback: if only 1 sheet in workbook, use it
  if (sheets.length === 1) {
    return sheets[0];
  }

  return null;
}

/**
 * Auto-detects the header row index (handles merged title banners on row 1).
 */
function findHeaderRowIndex(values) {
  for (let r = 0; r < Math.min(values.length, 5); r++) {
    const row = values[r];
    let filled = 0;
    for (let c = 0; c < row.length; c++) {
      if (row[c] !== "" && row[c] !== null && row[c] !== undefined) {
        filled++;
      }
    }
    // If a row has 3 or more non-empty columns, it is the header row
    if (filled >= 3) {
      return r;
    }
  }
  return 0;
}

const SPREADSHEET_IDS = {
  CENTRAL_SETTINGS: "1bz1C-n9jJnkSxyuF6XvzagrDy49J1K5csmJ11zoOHoI",
  INVENTORY: "1bz1C-n9jJnkSxyuF6XvzagrDy49J1K5csmJ11zoOHoI",
  SUPPLIER_LEDGER: "1S1xoWEWYHZIVq_104cj-FTTjmyJBcBzVT4Aep_mnQrw",
  EXPENSES: "1X148GPfw8zvyyYI84WUe_LcDWD8Kaa-dFcWvOw0R_0A",
  EMPLOYEES: "1d3XYro4f0osK0tHHn0KGXaFjU1nHOqPwLlXQDHSIALc",
  INVESTORS: "1XoPECJLndRrezUjoFk57z6n2IsSDSNAte0F76PgVcX0",
  MEESHO: "1Ex8h2CcoWHaCLnhz37uBsrHVO_ZxpGTZviMearsHiA8",
  FLIPKART: "1smmEd2olBJC3D591XiGtQKPKaGNuhlcEkNQfuYOWZj8"
};

/**
 * HTTP GET Router: Delivers live data, authentication, and connection health-checks.
 */
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "ping";

  try {
    switch (action) {
      case "ping":
        return createJsonResponse({
          status: "success",
          message: "Saheb Trend House Database API is Online",
          timestamp: new Date().toISOString()
        });

      case "auth":
        return handleAuth(e.parameter.email, e.parameter.password);

      case "getAllData":
        return handleGetAllData();

      case "checkModified":
        return handleCheckModified();

      case "getSectionData":
        return handleGetSectionData(e.parameter.section);

      case "getInventory":
        return handleGetSheetData(SPREADSHEET_IDS.INVENTORY, ["Stock Ledger", "Daily Shipment", "Returs", "Products"]);

      case "getSuppliers":
        return handleGetSheetData(SPREADSHEET_IDS.SUPPLIER_LEDGER, ["Suppliers", "PO", "PurchaseRecived", "Payments"]);

      case "getExpenses":
        return handleGetSheetData(SPREADSHEET_IDS.EXPENSES, ["Packing Expenses", "Transportation", "Other Expenses"]);

      default:
        return createJsonResponse({
          status: "error",
          message: "Unknown action: " + action
        });
    }
  } catch (error) {
    return createJsonResponse({
      status: "error",
      message: error.toString(),
      stack: error.stack
    });
  }
}

/**
 * HTTP POST Router: Processes Live Data Mutations (Add, Edit, Remove).
 */
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    const action = payload.action;

    switch (action) {
      case "auth":
        return handleAuth(payload.email, payload.password);

      case "addRecord":
        return handleAddRecord(payload.sheetKey, payload.sheetName, payload.data);

      case "updateRecord":
        return handleUpdateRecord(payload.sheetKey, payload.sheetName, payload.primaryKey, payload.keyValue, payload.data);

      case "deleteRecord":
        return handleDeleteRecord(payload.sheetKey, payload.sheetName, payload.primaryKey, payload.keyValue);

      case "recordPayment":
        return handleRecordPayment(payload.data);

      case "createPO":
        return handleCreatePO(payload.data);

      default:
        return createJsonResponse({ status: "error", message: "Unknown POST action: " + action });
    }
  } catch (error) {
    return createJsonResponse({ status: "error", message: error.toString() });
  }
}

// ============================================================================
// DATA ENGINE HANDLERS
// ============================================================================

/**
 * Authenticates user credentials.
 */
function handleAuth(email, password) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanPass = String(password || "").trim();

  // Master credentials check
  if (cleanEmail === "saheb2602e.c@gmail.com" && cleanPass === "STH@2026") {
    return createJsonResponse({
      status: "success",
      authorized: true,
      user: { email: cleanEmail, name: "Saheb Ali", role: "Proprietor" }
    });
  }

  // Check against Central Settings sheet if accessible
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.CENTRAL_SETTINGS);
    const sheet = ss.getSheetByName("Sheet1") || ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim().toLowerCase() === cleanEmail && String(data[i][1]).trim() === cleanPass) {
        return createJsonResponse({
          status: "success",
          authorized: true,
          user: { email: cleanEmail, name: "Saheb Ali", role: "Proprietor" }
        });
      }
    }
  } catch (err) {
    // Continue
  }

  return createJsonResponse({ status: "error", authorized: false, message: "Invalid credentials" });
}

/**
 * Retrieves and compiles all live operational data across the connected spreadsheets.
 */
function handleGetAllData() {
  const errors = [];
  const stats = {};

  const result = {
    timestamp: new Date().toISOString(),
    inventory: getSheetObjects(SPREADSHEET_IDS.INVENTORY, "Stock Ledger", ["Stock", "Inventory", "StockLedger"], errors, stats),
    products: getSheetObjects(SPREADSHEET_IDS.INVENTORY, "Products", ["Product", "Items"], errors, stats),
    sales: getSheetObjects(SPREADSHEET_IDS.INVENTORY, "Daily Shipment", ["Daily Shipments", "Sales", "Shipments"], errors, stats),
    returns: getSheetObjects(SPREADSHEET_IDS.INVENTORY, "Returs", ["Returns", "Return", "Retur"], errors, stats),
    newStock: getSheetObjects(SPREADSHEET_IDS.INVENTORY, "Imported Data", ["Inward", "New Stock", "Purchase"], errors, stats),
    suppliers: getSheetObjects(SPREADSHEET_IDS.SUPPLIER_LEDGER, "Suppliers", ["Supplier", "Vendors"], errors, stats),
    suppliersSummary: getSheetObjects(SPREADSHEET_IDS.SUPPLIER_LEDGER, "Suppliers Summery", ["Suppliers Summary", "Supplier Summary", "SuppliersSummery"], errors, stats),
    purchaseOrders: getSheetObjects(SPREADSHEET_IDS.SUPPLIER_LEDGER, "PO", ["Purchase Orders", "Purchase Order", "POs"], errors, stats),
    poSummarySheet: getSheetObjects(SPREADSHEET_IDS.SUPPLIER_LEDGER, "PO Summery", ["PO Summary", "PO_Summary", "POSummery"], errors, stats),
    purchaseReceived: getSheetObjects(SPREADSHEET_IDS.SUPPLIER_LEDGER, "PurchaseRecived", ["Purchase/recieved", "Purchase/Recived", "Purchase Received", "Imported Data", "PurchaseRecieved", "GRN"], errors, stats),
    supplierPayments: getSheetObjects(SPREADSHEET_IDS.SUPPLIER_LEDGER, "Payments", ["Payment", "Supplier Payments"], errors, stats),
    expenses: {
      packing: getSheetObjects(SPREADSHEET_IDS.EXPENSES, "Packing Expenses", ["Packing", "Packaging Expenses", "Packaging"], errors, stats),
      transportation: getSheetObjects(SPREADSHEET_IDS.EXPENSES, "Transportation", ["Travel", "Transport", "Logistics"], errors, stats),
      other: getSheetObjects(SPREADSHEET_IDS.EXPENSES, "Other Expenses", ["Other", "Setup Expenses", "Setup"], errors, stats)
    },
    employ: {
      employees: getSheetObjects(SPREADSHEET_IDS.EMPLOYEES, "Employs", ["Employees", "Staff", "Employee"], errors, stats),
      salary: getSheetObjects(SPREADSHEET_IDS.EMPLOYEES, "Salery", ["Salary", "Salaries", "Wages"], errors, stats),
      attendance: getSheetObjects(SPREADSHEET_IDS.EMPLOYEES, "Employ Attendence", ["Attendance", "Timesheet", "Attendence"], errors, stats)
    },
    partnerTransactions: getSheetObjects(SPREADSHEET_IDS.INVESTORS, "Investments", ["Investment", "Investors", "Capital"], errors, stats),
    flipkart: getSheetObjects(SPREADSHEET_IDS.FLIPKART, "Sheet1", ["Flipkart", "Sales", "Orders"], errors, stats),
    meesho: getMeeshoSummary(SPREADSHEET_IDS.MEESHO)
  };

  return createJsonResponse({
    status: "success",
    data: result,
    _errors: errors,
    _stats: stats
  });
}

/**
 * Returns last modified timestamps across all spreadsheets to detect changes in ~200ms.
 */
function handleCheckModified() {
  const timestamps = {};
  const props = PropertiesService.getScriptProperties();
  for (const key in SPREADSHEET_IDS) {
    try {
      timestamps[key] = DriveApp.getFileById(SPREADSHEET_IDS[key]).getLastUpdated().getTime();
    } catch (err) {
      const p = props.getProperty("MODIFIED_" + key);
      timestamps[key] = p ? parseInt(p, 10) : 0;
    }
  }
  return createJsonResponse({
    status: "success",
    timestamps: timestamps,
    serverTime: Date.now()
  });
}

/**
 * Returns data ONLY for the requested section/sheet to make refreshing instantaneous (1-2s).
 */
function handleGetSectionData(section) {
  const s = String(section || "").toLowerCase();
  const data = {};

  if (s === "inventory" || s === "dashboard") {
    data.inventory = getSheetObjects(SPREADSHEET_IDS.INVENTORY, "Stock Ledger");
    data.products = getSheetObjects(SPREADSHEET_IDS.INVENTORY, "Products");
    data.sales = getSheetObjects(SPREADSHEET_IDS.INVENTORY, "Daily Shipment");
    data.returns = getSheetObjects(SPREADSHEET_IDS.INVENTORY, "Returs");
    data.newStock = getSheetObjects(SPREADSHEET_IDS.INVENTORY, "Imported Data");
  } else if (s === "suppliers" || s === "supplier_ledger") {
    data.suppliers = getSheetObjects(SPREADSHEET_IDS.SUPPLIER_LEDGER, "Suppliers");
    data.suppliersSummary = getSheetObjects(SPREADSHEET_IDS.SUPPLIER_LEDGER, "Suppliers Summery", ["Suppliers Summary", "Supplier Summary"]);
    data.purchaseOrders = getSheetObjects(SPREADSHEET_IDS.SUPPLIER_LEDGER, "PO");
    data.poSummarySheet = getSheetObjects(SPREADSHEET_IDS.SUPPLIER_LEDGER, "PO Summery", ["PO Summary", "PO_Summary"]);
    data.purchaseReceived = getSheetObjects(SPREADSHEET_IDS.SUPPLIER_LEDGER, "PurchaseRecived", ["Purchase/recieved", "Purchase/Recived", "Purchase Received", "Imported Data", "PurchaseRecieved"]);
    data.supplierPayments = getSheetObjects(SPREADSHEET_IDS.SUPPLIER_LEDGER, "Payments");
  } else if (s === "expenses") {
    data.expenses = {
      packing: getSheetObjects(SPREADSHEET_IDS.EXPENSES, "Packing Expenses"),
      transportation: getSheetObjects(SPREADSHEET_IDS.EXPENSES, "Transportation"),
      other: getSheetObjects(SPREADSHEET_IDS.EXPENSES, "Other Expenses")
    };
  } else if (s === "meesho") {
    data.meesho = getMeeshoSummary(SPREADSHEET_IDS.MEESHO);
  } else if (s === "flipkart") {
    data.flipkart = getSheetObjects(SPREADSHEET_IDS.FLIPKART, "Sheet1");
  } else if (s === "team" || s === "employ" || s === "partner") {
    data.employ = {
      employees: getSheetObjects(SPREADSHEET_IDS.EMPLOYEES, "Employs"),
      salary: getSheetObjects(SPREADSHEET_IDS.EMPLOYEES, "Salery"),
      attendance: getSheetObjects(SPREADSHEET_IDS.EMPLOYEES, "Employ Attendence")
    };
    data.partnerTransactions = getSheetObjects(SPREADSHEET_IDS.INVESTORS, "Investments");
  } else if (s === "business") {
    data.purchaseOrders = getSheetObjects(SPREADSHEET_IDS.SUPPLIER_LEDGER, "PO");
    data.poSummarySheet = getSheetObjects(SPREADSHEET_IDS.SUPPLIER_LEDGER, "PO Summery", ["PO Summary", "PO_Summary"]);
    data.supplierPayments = getSheetObjects(SPREADSHEET_IDS.SUPPLIER_LEDGER, "Payments");
    data.expenses = {
      packing: getSheetObjects(SPREADSHEET_IDS.EXPENSES, "Packing Expenses"),
      transportation: getSheetObjects(SPREADSHEET_IDS.EXPENSES, "Transportation"),
      other: getSheetObjects(SPREADSHEET_IDS.EXPENSES, "Other Expenses")
    };
    data.employ = {
      salary: getSheetObjects(SPREADSHEET_IDS.EMPLOYEES, "Salery")
    };
  } else {
    return createJsonResponse({ status: "error", message: "Unknown section: " + section });
  }

  return createJsonResponse({
    status: "success",
    section: s,
    data: data,
    timestamp: new Date().toISOString()
  });
}

function handleGetSheetData(spreadsheetId, sheetNames) {
  const out = {};
  sheetNames.forEach(function(s) {
    out[s] = getSheetObjects(spreadsheetId, s);
  });
  return createJsonResponse({ status: "success", data: out });
}

/**
 * Reads any sheet and returns clean array of row objects.
 */
function getSheetObjects(spreadsheetId, sheetName, alternativeNames, errors, stats) {
  try {
    const ss = getCachedSpreadsheet(spreadsheetId, errors);
    if (!ss) return [];

    let sheet = findSheet(ss, sheetName, alternativeNames);
    if (!sheet) {
      const available = ss.getSheets().map(function(s) { return s.getName(); }).join(", ");
      if (errors) {
        errors.push("Sheet '" + sheetName + "' not found in spreadsheet (" + spreadsheetId + "). Available tabs: [" + available + "]");
      }
      return [];
    }

    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) {
      if (stats) stats[sheetName] = 0;
      return [];
    }

    const headerIdx = findHeaderRowIndex(values);
    const headers = values[headerIdx].map(function(h) { return String(h || "").trim(); });
    const rows = [];

    for (let i = headerIdx + 1; i < values.length; i++) {
      const row = values[i];
      let hasData = false;
      for (let j = 0; j < row.length; j++) {
        if (row[j] !== "" && row[j] !== null && row[j] !== undefined) {
          hasData = true;
          break;
        }
      }
      if (!hasData) continue;

      const obj = {};
      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        if (header) {
          let cell = row[j];
          if (cell instanceof Date) {
            const y = cell.getFullYear();
            const m = ("0" + (cell.getMonth() + 1)).slice(-2);
            const d = ("0" + cell.getDate()).slice(-2);
            cell = y + "-" + m + "-" + d;
          }
          obj[header] = cell !== undefined ? cell : "";
        }
      }
      rows.push(obj);
    }

    if (stats) stats[sheetName] = rows.length;
    return rows;
  } catch (err) {
    Logger.log("Error reading " + sheetName + " from " + spreadsheetId + ": " + err);
    if (errors) {
      errors.push("Error reading '" + sheetName + "': " + err.message);
    }
    return [];
  }
}

/**
 * Summarizes Meesho data dynamically from the Meesho spreadsheet.
 */
function getMeeshoSummary(spreadsheetId) {
  try {
    const ss = getCachedSpreadsheet(spreadsheetId);
    const paySheet = ss.getSheetByName("Payments");
    const orderSheet = ss.getSheetByName("Orders");

    const payments = paySheet ? getSheetObjects(spreadsheetId, "Payments") : [];
    const orders = orderSheet ? getSheetObjects(spreadsheetId, "Orders") : [];

    let delRev = 0, retDed = 0, delQty = 0, rtoCount = 0, retCount = 0;
    const states = {};

    payments.forEach(function(p) {
      const s = String(p["STATUS"] || "").trim();
      const amt = parseFloat(p["AMOUNT"]) || 0;
      const q = parseFloat(p["QUANTITY"]) || 1;

      if (s === "Delivered") {
        delRev += amt;
        delQty += q;
      } else if (s === "Return" || amt < 0) {
        retDed += Math.abs(amt);
        retCount += q;
      } else if (s === "RTO") {
        rtoCount += q;
      }
    });

    orders.forEach(function(o) {
      const st = String(o["State"] || "").trim();
      if (st) states[st] = (states[st] || 0) + 1;
    });

    return {
      totalOrders: orders.length,
      deliveredQty: delQty,
      rtoCount: rtoCount,
      returnCount: retCount,
      deliveredRevenue: delRev,
      returnDeductions: retDed,
      netPayout: delRev - retDed,
      stateDistribution: states,
      recentPayments: payments.slice(-50).reverse()
    };
  } catch (err) {
    return { error: err.toString() };
  }
}

// ============================================================================
// MUTATIONS (ADD, UPDATE, DELETE)
// ============================================================================
function handleAddRecord(sheetKey, sheetName, rowData) {
  const ssId = SPREADSHEET_IDS[sheetKey] || SPREADSHEET_IDS.INVENTORY;
  const ss = SpreadsheetApp.openById(ssId);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return createJsonResponse({ status: "error", message: "Sheet not found: " + sheetName });

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newRow = headers.map(function(h) {
    const key = String(h).trim();
    return rowData[key] !== undefined ? rowData[key] : "";
  });

  sheet.appendRow(newRow);
  return createJsonResponse({ status: "success", message: "Record added to " + sheetName });
}

function handleUpdateRecord(sheetKey, sheetName, primaryKey, keyValue, updatedData) {
  const ssId = SPREADSHEET_IDS[sheetKey] || SPREADSHEET_IDS.INVENTORY;
  const ss = SpreadsheetApp.openById(ssId);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return createJsonResponse({ status: "error", message: "Sheet not found: " + sheetName });

  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(function(h) { return String(h).trim(); });
  const keyIdx = headers.indexOf(primaryKey);
  if (keyIdx === -1) return createJsonResponse({ status: "error", message: "Key not found: " + primaryKey });

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][keyIdx]).trim() === String(keyValue).trim()) {
      for (let j = 0; j < headers.length; j++) {
        const h = headers[j];
        if (updatedData[h] !== undefined) {
          sheet.getRange(i + 1, j + 1).setValue(updatedData[h]);
        }
      }
      return createJsonResponse({ status: "success", message: "Record updated in " + sheetName });
    }
  }

  return createJsonResponse({ status: "error", message: "Record not found with " + primaryKey + " = " + keyValue });
}

function handleDeleteRecord(sheetKey, sheetName, primaryKey, keyValue) {
  const ssId = SPREADSHEET_IDS[sheetKey] || SPREADSHEET_IDS.INVENTORY;
  const ss = SpreadsheetApp.openById(ssId);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return createJsonResponse({ status: "error", message: "Sheet not found: " + sheetName });

  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(function(h) { return String(h).trim(); });
  const keyIdx = headers.indexOf(primaryKey);
  if (keyIdx === -1) return createJsonResponse({ status: "error", message: "Key not found: " + primaryKey });

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][keyIdx]).trim() === String(keyValue).trim()) {
      sheet.deleteRow(i + 1);
      return createJsonResponse({ status: "success", message: "Record deleted from " + sheetName });
    }
  }

  return createJsonResponse({ status: "error", message: "Record not found with " + primaryKey + " = " + keyValue });
}

function handleRecordPayment(paymentData) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SUPPLIER_LEDGER);
  const sheet = ss.getSheetByName("Payments");
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  const newRow = headers.map(function(h) {
    const key = String(h).trim();
    return paymentData[key] !== undefined ? paymentData[key] : "";
  });

  sheet.appendRow(newRow);
  return createJsonResponse({ status: "success", message: "Payment recorded successfully" });
}

function handleCreatePO(poData) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SUPPLIER_LEDGER);
  const sheet = ss.getSheetByName("PO");
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  const items = poData.items || [poData];
  items.forEach(function(item) {
    const rowObj = {
      "PO ID": poData.poId || item["PO ID"],
      "PO Date": poData.poDate || item["PO Date"] || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
      "Supplier": poData.supplier || item["Supplier"],
      "Product ID": item["Product ID"] || "FG-NEW",
      "Product Name": item["Product Name"] || "Product",
      "Unit": item["Unit"] || "PSC",
      "Ordered Qty": item["Ordered Qty"] || 0,
      "Unit Price": item["Unit Price"] || 0,
      "Gross Amount": (item["Ordered Qty"] || 0) * (item["Unit Price"] || 0),
      "Discount": item["Discount"] || "",
      "Expected Date": item["Expected Date"] || "",
      "Recived Date": "",
      "Remarks": item["Remarks"] || ""
    };

    const newRow = headers.map(function(h) {
      const key = String(h).trim();
      return rowObj[key] !== undefined ? rowObj[key] : "";
    });

    sheet.appendRow(newRow);
  });

  return createJsonResponse({ status: "success", message: "PO created successfully" });
}

/**
 * Creates JSON response with standard output.
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
