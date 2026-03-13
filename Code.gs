/**
 * SwapNest Analytics — Google Apps Script Backend
 *
 * Deploy as a Web App (execute as Me, access: Anyone) to get the URL.
 * This script:
 *   doPost() — receives session snapshots from the frontend and upserts them
 *              into a "Sessions" sheet (one row per unique sessionId).
 *   doGet()  — returns all session rows as a JSON array so admin-metrics.html
 *              can display data from every device/browser, not just localhost.
 *
 * Sheet columns (Sessions):
 *   A: sessionId | B: startedAt | C: referrer | D: timeSpentMs
 *   E: pageViews (JSON) | F: clicks (JSON) | G: waitlistSignups | H: lastUpdated
 */

var SHEET_NAME = 'Sessions';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      'sessionId', 'startedAt', 'referrer', 'timeSpentMs',
      'pageViews', 'clicks', 'waitlistSignups', 'lastUpdated'
    ]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function findRowBySessionId(sheet, sessionId) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === sessionId) return i + 1; // 1-based row number
  }
  return -1;
}

function corsResponse(content) {
  return ContentService
    .createTextOutput(content)
    .setMimeType(ContentService.MimeType.JSON);
}

// ── doPost — receive session snapshot from analytics.js ──────────────────────

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);

    // Only process 'session_snapshot' actions (other actions are ignored here).
    // Legacy events (session_start, click, waitlist_signup) are silently accepted
    // so existing traffic keeps working without JS errors.
    if (payload.action !== 'session_snapshot') {
      return corsResponse(JSON.stringify({ status: 'ignored', action: payload.action }));
    }

    var session = payload.session;
    if (!session || !session.id) {
      return corsResponse(JSON.stringify({ status: 'error', message: 'Missing session data' }));
    }

    var sheet = getSheet();
    var existingRow = findRowBySessionId(sheet, session.id);

    var rowData = [
      session.id,
      session.startedAt || '',
      session.referrer || 'direct',
      session.timeSpentMs || 0,
      JSON.stringify(session.pageViews || []),
      JSON.stringify(session.clicks || []),
      session.waitlistSignups || 0,
      new Date().toISOString()
    ];

    if (existingRow > 0) {
      sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }

    return corsResponse(JSON.stringify({ status: 'ok' }));
  } catch (err) {
    return corsResponse(JSON.stringify({ status: 'error', message: err.message }));
  }
}

// ── doGet — return all sessions as JSON for admin-metrics.html ───────────────

function doGet(e) {
  try {
    var sheet = getSheet();
    var data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      // Only header row — no sessions yet
      return corsResponse(JSON.stringify([]));
    }

    var sessions = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0]) continue; // skip empty rows

      var pageViews = [];
      var clicks = [];
      try { pageViews = JSON.parse(row[4]); } catch (_) {}
      try { clicks = JSON.parse(row[5]); } catch (_) {}

      sessions.push({
        id: row[0],
        startedAt: row[1],
        referrer: row[2] || 'direct',
        timeSpentMs: Number(row[3]) || 0,
        pageViews: pageViews,
        clicks: clicks,
        waitlistSignups: Number(row[6]) || 0,
        lastUpdated: row[7]
      });
    }

    return corsResponse(JSON.stringify(sessions));
  } catch (err) {
    return corsResponse(JSON.stringify({ error: err.message }));
  }
}
