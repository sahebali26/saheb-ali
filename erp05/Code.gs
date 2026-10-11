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
function getCachedSpreadsheet(spreadsheetId) {
  if (!_SS_CACHE[spreadsheetId]) {
    _SS_CACHE[spreadsheetId] = SpreadsheetApp.openById(spreadsheetId);
  }
  return _SS_CACHE[spreadsheetId];
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
  const result = {
    timestamp: new Date().toISOString(),
    inventory: getSheetObjects(SPREADSHEET_IDS.INVENTORY, "Stock Ledger"),
    products: getSheetObjects(SPREADSHEET_IDS.INVENTORY, "Products"),
    sales: getSheetObjects(SPREADSHEET_IDS.INVENTORY, "Daily Shipment"),
    returns: getSheetObjects(SPREADSHEET_IDS.INVENTORY, "Returs"),
    newStock: getSheetObjects(SPREADSHEET_IDS.INVENTORY, "Imported Data"),
    suppliers: getSheetObjects(SPREADSHEET_IDS.SUPPLIER_LEDGER, "Suppliers"),
    suppliersSummary: getSheetObjects(SPREADSHEET_IDS.SUPPLIER_LEDGER, "Suppliers Summery", ["Suppliers Summary", "Supplier Summary"]),
    purchaseOrders: getSheetObjects(SPREADSHEET_IDS.SUPPLIER_LEDGER, "PO"),
    poSummarySheet: getSheetObjects(SPREADSHEET_IDS.SUPPLIER_LEDGER, "PO Summery", ["PO Summary", "PO_Summary"]),
    purchaseReceived: getSheetObjects(SPREADSHEET_IDS.SUPPLIER_LEDGER, "PurchaseRecived", ["Purchase/recieved", "Purchase/Recived", "Purchase Received", "Imported Data", "PurchaseRecieved"]),
    supplierPayments: getSheetObjects(SPREADSHEET_IDS.SUPPLIER_LEDGER, "Payments"),
    expenses: {
      packing: getSheetObjects(SPREADSHEET_IDS.EXPENSES, "Packing Expenses"),
      transportation: getSheetObjects(SPREADSHEET_IDS.EXPENSES, "Transportation"),
      other: getSheetObjects(SPREADSHEET_IDS.EXPENSES, "Other Expenses")
    },
    employ: {
      employees: getSheetObjects(SPREADSHEET_IDS.EMPLOYEES, "Employs"),
      salary: getSheetObjects(SPREADSHEET_IDS.EMPLOYEES, "Salery"),
      attendance: getSheetObjects(SPREADSHEET_IDS.EMPLOYEES, "Employ Attendence")
    },
    partnerTransactions: getSheetObjects(SPREADSHEET_IDS.INVESTORS, "Investments"),
    flipkart: getSheetObjects(SPREADSHEET_IDS.FLIPKART, "Sheet1"),
    meesho: getMeeshoSummary(SPREADSHEET_IDS.MEESHO)
  };

  return createJsonResponse({
    status: "success",
    data: result
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
function getSheetObjects(spreadsheetId, sheetName, alternativeNames) {
  try {
    const ss = getCachedSpreadsheet(spreadsheetId);
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet && alternativeNames && alternativeNames.length) {
      for (let k = 0; k < alternativeNames.length; k++) {
        sheet = ss.getSheetByName(alternativeNames[k]);
        if (sheet) break;
      }
    }
    if (!sheet) return [];

    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) return [];

    const headers = values[0].map(function(h) { return String(h).trim(); });
    const rows = [];

    for (let i = 1; i < values.length; i++) {
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
            cell = Utilities.formatDate(cell, Session.getScriptTimeZone(), "yyyy-MM-dd");
          }
          obj[header] = cell !== undefined ? cell : "";
        }
      }
      rows.push(obj);
    }
    return rows;
  } catch (err) {
    Logger.log("Error reading " + sheetName + " from " + spreadsheetId + ": " + err);
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
