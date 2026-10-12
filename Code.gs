/**
 * Customer Care Management · Teacher portal script
 * Elevate with Ms. Maria · Learnovate Qatar
 *
 * Paste this whole file into Extensions > Apps Script of the
 * Customer_Care_Teacher_Portal Google Sheet, then Deploy > New deployment > Web app
 * (Execute as: Me · Who has access: Anyone).
 * The website uses the Web app URL. Learners never see this Sheet.
 */

const TABS = { students: 'Students', l5: 'Sessions_L5', l4: 'Sessions_L4', scores: 'Quiz_Scores', progress: 'Progress' };

/* ---------- entry points ---------- */
function doGet(e) {
  const p = (e && e.parameter) || {};
  try {
    if (p.action === 'ping') return out({ ok: true, message: 'Teacher portal script is working.' });
    if (p.action === 'login') return out(login(p.code, p.level));
    if (p.action === 'content') return out(content(p.code, p.level));
    if (p.action === 'progress') return out(getProgress(p.code, p.level));
    return out({ ok: false, error: 'Unknown action' });
  } catch (err) { return out({ ok: false, error: String(err) }); }
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { return out({ ok: false, error: 'Bad request' }); }
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    if (body.action === 'score') return out(saveScore(body));
    if (body.action === 'progress') return out(saveProgress(body));
    if (body.action === 'workbook') return out(saveWorkbook(body));
    if (body.action === 'exitTicket') return out(saveExitTicket(body));
    if (body.action === 'teacherDashboard') return out(teacherDashboard(body));
    if (body.action === 'teacherSaveSession') return out(teacherSaveSession(body));
    if (body.action === 'teacherSaveStudent') return out(teacherSaveStudent(body));
    return out({ ok: false, error: 'Unknown action' });
  } catch (err) { return out({ ok: false, error: String(err) }); }
  finally { try { lock.releaseLock(); } catch (x) {} }
}

/* ---------- helpers ---------- */
function out(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function sheet(name) { const s = SpreadsheetApp.getActive().getSheetByName(name); if (!s) throw new Error('Missing tab: ' + name); return s; }
function rows(name) { const v = sheet(name).getDataRange().getValues(); const h = v.shift(); return v.map(r => { const o = {}; h.forEach((k, i) => o[k] = r[i]); return o; }); }
function clean(x) { return String(x == null ? '' : x).trim(); }
function levelsOf(x) { const s = clean(x); const l = []; if (s.indexOf('4') > -1) l.push('4'); if (s.indexOf('5') > -1) l.push('5'); return l; }

/** Finds an active learner by code. Codes are not case-sensitive. */
function findStudent(code) {
  const c = clean(code).toUpperCase();
  if (!c) return null;
  const st = rows(TABS.students).find(r => clean(r['Access code']).toUpperCase() === c);
  if (!st || clean(st['Active']).toLowerCase() !== 'yes') return null;
  return { code: c, name: clean(st['Name']), levels: levelsOf(st['Level']) };
}
function authorise(code, level) {
  const st = findStudent(code);
  if (!st) return { ok: false, error: 'This code is not active. Check it, or ask Ms. Maria.' };
  if (level && st.levels.indexOf(String(level)) === -1) return { ok: false, error: 'This code is not enrolled in Level ' + level + '.' };
  return { ok: true, student: st };
}

/* ---------- actions ---------- */
function login(code, level) {
  const a = authorise(code, level);
  if (!a.ok) return a;
  return { ok: true, name: a.student.name, levels: a.student.levels };
}

function content(code, level) {
  const a = authorise(code, level || '5');
  if (!a.ok) return a;
  const tab = String(level) === '4' ? TABS.l4 : TABS.l5;
  const sessions = rows(tab).filter(r => clean(r['Session'])).map(r => ({
    n: Number(r['Session']),
    visible: clean(r['Visible']).toLowerCase() !== 'no',
    form: /^https:\/\//.test(clean(r['Exit ticket link (Google Form)'])) ? clean(r['Exit ticket link (Google Form)']) : '',
    note: clean(r['Announcement']),
    slides: /^https:\/\/(www\.)?canva\.com\//.test(clean(r['Slides link (Canva)'])) ? clean(r['Slides link (Canva)']) : ''
  }));
  return { ok: true, sessions: sessions };
}

function saveScore(b) {
  const a = authorise(b.code, b.level);
  if (!a.ok) return a;
  const score = Number(b.score), total = Number(b.total), n = Number(b.session);
  if (!(total > 0 && score >= 0 && score <= total && n >= 1 && n <= 12)) return { ok: false, error: 'Invalid score' };
  sheet(TABS.scores).appendRow([new Date(), a.student.code, a.student.name, String(b.level), n, score, total]);
  return { ok: true };
}

function saveProgress(b) {
  const a = authorise(b.code, b.level);
  if (!a.ok) return a;
  const steps = (Array.isArray(b.steps) ? b.steps : []).map(Number).filter(x => x >= 1 && x <= 12).sort((x, y) => x - y).join(', ');
  const lab = JSON.stringify(b.lab || {}).slice(0, 500);
  const sh = sheet(TABS.progress), v = sh.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) {
    if (clean(v[i][0]).toUpperCase() === a.student.code && clean(v[i][2]) === String(b.level)) {
      sh.getRange(i + 1, 1, 1, 6).setValues([[a.student.code, a.student.name, String(b.level), steps, lab, new Date()]]);
      return { ok: true };
    }
  }
  sh.appendRow([a.student.code, a.student.name, String(b.level), steps, lab, new Date()]);
  return { ok: true };
}

function getProgress(code, level) {
  const a = authorise(code, level);
  if (!a.ok) return a;
  const r = rows(TABS.progress).find(x => clean(x['Access code']).toUpperCase() === a.student.code && clean(x['Level']) === String(level));
  if (!r) return { ok: true, steps: [], lab: {} };
  let lab = {}; try { lab = JSON.parse(r['Practice Lab'] || '{}'); } catch (e) {}
  return { ok: true, steps: clean(r['Capstone steps done']).split(',').map(Number).filter(Boolean), lab: lab };
}

/** Run this once from the editor (select testSetup, then Run) to check the Sheet is ready. */
function testSetup() {
  Object.values(TABS).forEach(t => sheet(t));
  ensureTeacherSetup();
  exitSheet();
  workbookSheet();
  const r = login('DEMO5', '5');
  Logger.log(r.ok ? 'Setup OK. Test login worked for: ' + r.name : 'Test login failed: ' + r.error);
}


/* =================== TEACHER PORTAL =================== */
const SETTINGS = 'Settings';

/** Creates the Settings tab (Teacher PIN) and the Canva slides column if they are missing. */
function ensureTeacherSetup() {
  const ss = SpreadsheetApp.getActive();
  let st = ss.getSheetByName(SETTINGS);
  if (!st) {
    st = ss.insertSheet(SETTINGS);
    st.getRange('A1:B1').setValues([['Setting', 'Value']]).setFontWeight('bold');
    st.getRange('A2:B2').setValues([['Teacher PIN', 'CHANGE-ME']]);
    st.getRange('A3').setValue('Type your own PIN in B2 (at least 6 letters or numbers). Never share it.');
    st.setColumnWidth(1, 160); st.setColumnWidth(2, 220);
  }
  [TABS.l5, TABS.l4].forEach(t => {
    const sh = sheet(t), h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    if (h.indexOf('Slides link (Canva)') === -1) sh.getRange(1, h.length + 1).setValue('Slides link (Canva)').setFontWeight('bold');
  });
}

function teacherOk(pin) {
  const st = SpreadsheetApp.getActive().getSheetByName(SETTINGS);
  if (!st) return false;
  const real = clean(st.getRange('B2').getValue());
  if (!real || real === 'CHANGE-ME' || real.length < 6) return false;
  if (clean(pin) !== real) { Utilities.sleep(800); return false; }
  return true;
}
const NO = { ok: false, error: 'Wrong teacher PIN, or the PIN is not set in the Settings tab.' };

function teacherDashboard(b) {
  if (!teacherOk(b.pin)) return NO;
  const level = String(b.level || '5');
  const students = rows(TABS.students).filter(r => clean(r['Access code'])).map(r => ({
    name: clean(r['Name']), code: clean(r['Access code']).toUpperCase(), level: clean(r['Level']), active: clean(r['Active']), notes: clean(r['Notes'])
  }));
  const scores = {};
  rows(TABS.scores).forEach(r => {
    if (clean(r['Level']) !== level) return;
    const c = clean(r['Access code']).toUpperCase(), n = Number(r['Session']), sc = Number(r['Score']), tot = Number(r['Total']);
    scores[c] = scores[c] || {};
    const cur = scores[c][n];
    if (!cur || sc > cur.best) scores[c][n] = { best: sc, total: tot };
  });
  const progress = {};
  rows(TABS.progress).forEach(r => {
    if (clean(r['Level']) !== level) return;
    progress[clean(r['Access code']).toUpperCase()] = {
      steps: clean(r['Capstone steps done']), lab: clean(r['Practice Lab']),
      updated: r['Last updated'] instanceof Date ? Utilities.formatDate(r['Last updated'], Session.getScriptTimeZone(), 'd MMM, HH:mm') : clean(r['Last updated'])
    };
  });
  const sessions = rows(level === '4' ? TABS.l4 : TABS.l5).filter(r => clean(r['Session'])).map(r => ({
    n: Number(r['Session']), title: clean(r['Title']), form: clean(r['Exit ticket link (Google Form)']),
    note: clean(r['Announcement']), visible: clean(r['Visible']) || 'Yes', slides: clean(r['Slides link (Canva)'])
  }));
  const exits = {};
  const ex = SpreadsheetApp.getActive().getSheetByName(EXIT);
  if (ex) rows(EXIT).forEach(r => {
    if (clean(r['Level']) !== level) return;
    const c = clean(r['Access code']).toUpperCase();
    exits[c] = exits[c] || [];
    exits[c].push({ n: Number(r['Session']), mark: clean(r['Mark (out of 10)']) });
  });
  const wbs = {};
  const wsh = SpreadsheetApp.getActive().getSheetByName(WB);
  if (wsh) rows(WB).forEach(r => {
    if (clean(r['Level']) !== level) return;
    const c = clean(r['Access code']).toUpperCase();
    wbs[c] = wbs[c] || [];
    wbs[c].push({ n: Number(r['Session']), score: Number(r['Score']), total: Number(r['Out of']) });
  });
  return { ok: true, students: students, scores: scores, progress: progress, sessions: sessions, exits: exits, workbooks: wbs };
}

function teacherSaveSession(b) {
  if (!teacherOk(b.pin)) return NO;
  const sh = sheet(String(b.level) === '4' ? TABS.l4 : TABS.l5);
  const v = sh.getDataRange().getValues(), h = v[0];
  const col = name => h.indexOf(name) + 1;
  for (let i = 1; i < v.length; i++) {
    if (Number(v[i][0]) === Number(b.n)) {
      if (b.form !== undefined) sh.getRange(i + 1, col('Exit ticket link (Google Form)')).setValue(clean(b.form));
      if (b.note !== undefined) sh.getRange(i + 1, col('Announcement')).setValue(clean(b.note));
      if (b.visible !== undefined) sh.getRange(i + 1, col('Visible')).setValue(b.visible === 'No' ? 'No' : 'Yes');
      if (b.slides !== undefined && col('Slides link (Canva)') > 0) sh.getRange(i + 1, col('Slides link (Canva)')).setValue(clean(b.slides));
      return { ok: true };
    }
  }
  return { ok: false, error: 'Session not found' };
}

function teacherSaveStudent(b) {
  if (!teacherOk(b.pin)) return NO;
  const code = clean(b.code).toUpperCase();
  if (!/^[A-Z0-9]{3,10}$/.test(code)) return { ok: false, error: 'Use 3 to 10 letters or numbers for the code.' };
  if (!clean(b.name)) return { ok: false, error: 'Type the learner name.' };
  const level = ['4', '5', '4 and 5'].indexOf(clean(b.level)) > -1 ? clean(b.level) : '5';
  const active = clean(b.active) === 'No' ? 'No' : 'Yes';
  const sh = sheet(TABS.students), v = sh.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) {
    if (clean(v[i][1]).toUpperCase() === code) {
      if (b.isNew) return { ok: false, error: 'This code is already used. Choose another.' };
      sh.getRange(i + 1, 1, 1, 4).setValues([[clean(b.name), code, level, active]]);
      return { ok: true };
    }
  }
  sh.appendRow([clean(b.name), code, level, active, clean(b.notes)]);
  return { ok: true };
}


/* =================== EXIT TICKETS =================== */
const EXIT = 'Exit_Tickets';
function exitSheet() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(EXIT);
  if (!sh) {
    sh = ss.insertSheet(EXIT);
    sh.getRange(1, 1, 1, 10).setValues([['Timestamp', 'Access code', 'Name', 'Level', 'Session', 'Answer 1', 'Answer 2', 'Answer 3', 'Mark (out of 10)', 'Teacher comment']]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}
function saveExitTicket(b) {
  const a = authorise(b.code, b.level);
  if (!a.ok) return a;
  const n = Number(b.session);
  if (!(n >= 1 && n <= 12)) return { ok: false, error: 'Invalid session' };
  const ans = (Array.isArray(b.answers) ? b.answers : []).slice(0, 5).map(x => clean(x).slice(0, 2000));
  if (!ans.some(Boolean)) return { ok: false, error: 'Write your answers first.' };
  const sh = exitSheet(), v = sh.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) {
    if (clean(v[i][1]).toUpperCase() === a.student.code && clean(v[i][3]) === String(b.level) && Number(v[i][4]) === n) {
      sh.getRange(i + 1, 1, 1, 8).setValues([[new Date(), a.student.code, a.student.name, String(b.level), n, ans[0] || '', ans[1] || '', ans[2] || '']]);
      return { ok: true, updated: true, name: a.student.name };
    }
  }
  sh.appendRow([new Date(), a.student.code, a.student.name, String(b.level), n, ans[0] || '', ans[1] || '', ans[2] || '']);
  return { ok: true, name: a.student.name };
}


/* =================== E-WORKBOOK RESULTS =================== */
const WB = 'Workbook_Results';
function workbookSheet() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(WB);
  if (!sh) {
    sh = ss.insertSheet(WB);
    sh.getRange(1, 1, 1, 9).setValues([['Timestamp', 'Access code', 'Name', 'Level', 'Session', 'Score', 'Out of', 'Task results', 'Written answers']]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}
function saveWorkbook(b) {
  const a = authorise(b.code, b.level);
  if (!a.ok) return a;
  const n = Number(b.session), score = Number(b.score), total = Number(b.total);
  if (!(n >= 1 && n <= 12 && total > 0 && score >= 0 && score <= total)) return { ok: false, error: 'Invalid workbook result' };
  const tasks = clean(b.tasks).slice(0, 1000), written = clean(b.written).slice(0, 5000);
  const row = [new Date(), a.student.code, a.student.name, String(b.level), n, score, total, tasks, written];
  const sh = workbookSheet(), v = sh.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) {
    if (clean(v[i][1]).toUpperCase() === a.student.code && clean(v[i][3]) === String(b.level) && Number(v[i][4]) === n) {
      sh.getRange(i + 1, 1, 1, 9).setValues([row]);
      return { ok: true, updated: true, name: a.student.name };
    }
  }
  sh.appendRow(row);
  return { ok: true, name: a.student.name };
}
