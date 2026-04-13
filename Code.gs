/**
 * Hiring Funnel Calculator — Standalone Web App
 * Server-side: routing, presets, activity logging, role-based access.
 */

var SPREADSHEET_KEY = "HIRING_FUNNEL_SS_ID";

/**
 * Run this once from the script editor to seed the initial admin.
 * After that, manage roles from the Admin UI.
 */
function setupInitialAdmin() {
  var ss = getOrCreateSpreadsheet();
  var sheet = ss.getSheetByName("Roles");
  var data = sheet.getDataRange().getValues();
  var target = "sylvester.ikpa@doordash.com";

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase().trim() === target) {
      sheet.getRange(i + 1, 2).setValue("admin");
      Logger.log("Updated " + target + " to admin.");
      return;
    }
  }
  sheet.appendRow([target, "admin"]);
  Logger.log("Added " + target + " as admin.");
}

// ── Routing ──

function doGet(e) {
  var page = (e && e.parameter && e.parameter.page) || "";
  var role = getUserRole();

  if (!role) {
    return HtmlService.createHtmlOutput(
      "<html><body style='font-family:sans-serif;display:flex;align-items:center;" +
      "justify-content:center;height:100vh;background:#f7f8fa'>" +
      "<div style='text-align:center'><h2>Access Denied</h2>" +
      "<p>Contact Darya Behroozi for access.</p></div></body></html>"
    ).setTitle("Access Denied");
  }

  if (page === "admin") {
    if (role !== "admin") {
      return HtmlService.createHtmlOutput(
        "<html><body style='font-family:sans-serif;display:flex;align-items:center;" +
        "justify-content:center;height:100vh;background:#f7f8fa'>" +
        "<div style='text-align:center'><h2>Access Denied</h2>" +
        "<p>Admin access required.</p></div></body></html>"
      ).setTitle("Access Denied");
    }
    return HtmlService.createHtmlOutputFromFile("Admin")
      .setTitle("Hiring Funnel — Admin")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("Hiring Funnel Calculator")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ── Spreadsheet bootstrap ──

function getOrCreateSpreadsheet() {
  var props = PropertiesService.getScriptProperties();
  var ssId = props.getProperty(SPREADSHEET_KEY);
  var ss;

  if (ssId) {
    try { ss = SpreadsheetApp.openById(ssId); } catch (_) { ss = null; }
  }

  if (!ss) {
    ss = SpreadsheetApp.create("Hiring Funnel Data");
    props.setProperty(SPREADSHEET_KEY, ss.getId());
  }

  ensureSheet_(ss, "Presets",     ["Name", "Created", "Modified", "Owner", "State"]);
  ensureSheet_(ss, "ActivityLog", ["Timestamp", "Email", "Action", "Detail"]);
  ensureSheet_(ss, "Roles",       ["Email", "Role"]);

  return ss;
}

function ensureSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ── User identity & roles ──

function getUserEmail() {
  return Session.getActiveUser().getEmail();
}

function getUserRole() {
  var email = getUserEmail().toLowerCase();
  if (!email) return null;
  var ss = getOrCreateSpreadsheet();
  var sheet = ss.getSheetByName("Roles");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase().trim() === email) {
      return String(data[i][1]).toLowerCase().trim();
    }
  }
  return null;
}

function getUserInfo() {
  return { email: getUserEmail(), role: getUserRole() };
}

// ── Presets ──

function savePreset(name, stateJson) {
  var email = getUserEmail().toLowerCase();
  var role = getUserRole();
  if (role === "viewer") return { error: "Viewers cannot save presets." };

  var ss = getOrCreateSpreadsheet();
  var sheet = ss.getSheetByName("Presets");
  var data = sheet.getDataRange().getValues();
  var now = new Date().toISOString();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === name) {
      var owner = String(data[i][3]).toLowerCase().trim();
      if (owner !== email && role !== "admin") {
        return { error: "Only the owner can update this preset." };
      }
      sheet.getRange(i + 1, 3).setValue(now);
      sheet.getRange(i + 1, 5).setValue(stateJson);
      logActivity("save_preset", JSON.stringify({ preset: name, state: JSON.parse(stateJson) }));
      return { success: true };
    }
  }

  sheet.appendRow([name, now, now, email, stateJson]);
  logActivity("save_preset", JSON.stringify({ preset: name, state: JSON.parse(stateJson) }));
  return { success: true };
}

function loadPresets() {
  var ss = getOrCreateSpreadsheet();
  var sheet = ss.getSheetByName("Presets");
  var data = sheet.getDataRange().getValues();
  var results = [];
  for (var i = 1; i < data.length; i++) {
    results.push({
      name:     String(data[i][0]),
      created:  String(data[i][1]),
      modified: String(data[i][2]),
      owner:    String(data[i][3]),
      state:    String(data[i][4])
    });
  }
  return results;
}

function deletePreset(name) {
  var email = getUserEmail().toLowerCase();
  var role = getUserRole();
  var ss = getOrCreateSpreadsheet();
  var sheet = ss.getSheetByName("Presets");
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === name) {
      var owner = String(data[i][3]).toLowerCase().trim();
      if (owner !== email && role !== "admin") {
        return { error: "Only the owner can delete this preset." };
      }
      sheet.deleteRow(i + 1);
      logActivity("delete_preset", JSON.stringify({ preset: name }));
      return { success: true };
    }
  }
  return { error: "Preset not found." };
}

// ── Activity logging ──

function logActivity(action, detailJson) {
  var ss = getOrCreateSpreadsheet();
  var sheet = ss.getSheetByName("ActivityLog");
  sheet.appendRow([
    new Date().toISOString(),
    getUserEmail(),
    action,
    detailJson || ""
  ]);
}

// ── Admin functions ──

function getAdminData() {
  if (getUserRole() !== "admin") return { error: "Not authorized." };
  var ss = getOrCreateSpreadsheet();

  var presetSheet = ss.getSheetByName("Presets");
  var presetData = presetSheet.getDataRange().getValues();
  var presets = [];
  for (var i = 1; i < presetData.length; i++) {
    presets.push({
      name: String(presetData[i][0]), created: String(presetData[i][1]),
      modified: String(presetData[i][2]), owner: String(presetData[i][3])
    });
  }

  var logSheet = ss.getSheetByName("ActivityLog");
  var logData = logSheet.getDataRange().getValues();
  var logs = [];
  for (var j = 1; j < logData.length; j++) {
    logs.push({
      timestamp: String(logData[j][0]), email: String(logData[j][1]),
      action: String(logData[j][2]), detail: String(logData[j][3])
    });
  }

  var roleSheet = ss.getSheetByName("Roles");
  var roleData = roleSheet.getDataRange().getValues();
  var roles = [];
  for (var k = 1; k < roleData.length; k++) {
    roles.push({ email: String(roleData[k][0]), role: String(roleData[k][1]) });
  }

  // Summary stats
  var uniqueEmails = {};
  var openCount = 0;
  var saveCount = 0;
  var lastTimestamp = "";
  logs.forEach(function(l) {
    uniqueEmails[l.email] = (uniqueEmails[l.email] || 0) + 1;
    if (l.action === "open") openCount++;
    if (l.action === "save_preset") saveCount++;
    if (l.timestamp > lastTimestamp) lastTimestamp = l.timestamp;
  });

  var mostActive = "";
  var maxActions = 0;
  Object.keys(uniqueEmails).forEach(function(e) {
    if (uniqueEmails[e] > maxActions) { maxActions = uniqueEmails[e]; mostActive = e; }
  });

  return {
    presets: presets,
    logs: logs.reverse(),
    roles: roles,
    summary: {
      uniqueUsers: Object.keys(uniqueEmails).length,
      totalSessions: openCount,
      totalPresets: presets.length,
      mostActive: mostActive,
      lastActivity: lastTimestamp
    }
  };
}

function adminDeletePreset(name) {
  if (getUserRole() !== "admin") return { error: "Not authorized." };
  var ss = getOrCreateSpreadsheet();
  var sheet = ss.getSheetByName("Presets");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === name) {
      sheet.deleteRow(i + 1);
      logActivity("admin_delete_preset", JSON.stringify({ preset: name }));
      return { success: true };
    }
  }
  return { error: "Preset not found." };
}

// ── Role management (admin only) ──

function getRoles() {
  if (getUserRole() !== "admin") return { error: "Not authorized." };
  var ss = getOrCreateSpreadsheet();
  var sheet = ss.getSheetByName("Roles");
  var data = sheet.getDataRange().getValues();
  var roles = [];
  for (var i = 1; i < data.length; i++) {
    roles.push({ email: String(data[i][0]), role: String(data[i][1]) });
  }
  return roles;
}

function setRole(email, role) {
  if (getUserRole() !== "admin") return { error: "Not authorized." };
  var validRoles = ["admin", "user", "viewer"];
  if (validRoles.indexOf(role.toLowerCase()) === -1) return { error: "Invalid role." };

  var ss = getOrCreateSpreadsheet();
  var sheet = ss.getSheetByName("Roles");
  var data = sheet.getDataRange().getValues();
  var target = email.toLowerCase().trim();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase().trim() === target) {
      sheet.getRange(i + 1, 2).setValue(role.toLowerCase());
      logActivity("set_role", JSON.stringify({ target: email, role: role }));
      return { success: true };
    }
  }

  sheet.appendRow([target, role.toLowerCase()]);
  logActivity("set_role", JSON.stringify({ target: email, role: role }));
  return { success: true };
}

function removeRole(email) {
  if (getUserRole() !== "admin") return { error: "Not authorized." };
  var ss = getOrCreateSpreadsheet();
  var sheet = ss.getSheetByName("Roles");
  var data = sheet.getDataRange().getValues();
  var target = email.toLowerCase().trim();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase().trim() === target) {
      sheet.deleteRow(i + 1);
      logActivity("remove_role", JSON.stringify({ target: email }));
      return { success: true };
    }
  }
  return { error: "User not found." };
}

function bulkSetRoles(csvRows) {
  if (getUserRole() !== "admin") return { error: "Not authorized." };
  var count = 0;
  csvRows.forEach(function(row) {
    if (row.length >= 2 && row[0] && row[1]) {
      setRole(row[0].trim(), row[1].trim());
      count++;
    }
  });
  logActivity("bulk_set_roles", JSON.stringify({ count: count }));
  return { success: true, count: count };
}
