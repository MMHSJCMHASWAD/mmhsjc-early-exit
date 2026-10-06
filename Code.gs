/**
 * MMHSJC EARLY EXIT - Google Apps Script backend
 *
 * Bind this script to the Google Sheet containing:
 *   STUDENT MASTER
 *   EARLY EXIT
 *   LISTS
 *
 * Deploy as Web App:
 *   Execute as: Me
 *   Who has access: Anyone with the link (or your school domain)
 *
 * Then put the deployed /exec URL into index.html -> CONFIG.API_URL
 *
 * Set the staff PIN once:
 *   Apps Script -> Project Settings -> Script Properties
 *   EARLY_EXIT_PIN = your PIN
 */

const CFG = {
  STUDENT_SHEET: 'STUDENT MASTER',
  EXIT_SHEET: 'EARLY EXIT',
  LISTS_SHEET: 'LISTS',
  PIN_PROPERTY: 'EARLY_EXIT_PIN',
  DEFAULT_PIN: '1234'
};

function doGet(e) {
  const p = e.parameter || {};
  const action = p.action || '';
  const callback = p.callback || '';
  let out;
  try {
    if (action === 'bootstrap') {
      requirePin_(p.pin);
      out = {ok:true, students:getStudents_(), lists:getLists_()};
    } else if (action === 'today') {
      requirePin_(p.pin);
      out = {ok:true, exits:getTodayExits_()};
    } else if (action === 'saveExit') {
      requirePin_(p.pin);
      const payload = JSON.parse(p.payload || '{}');
      out = saveExit_(payload);
    } else {
      out = {ok:true, message:'MMHSJC Early Exit API'};
    }
  } catch (err) {
    out = {ok:false, error:String(err && err.message ? err.message : err)};
  }
  const json = JSON.stringify(out);
  if (callback) {
    return ContentService.createTextOutput(callback+'('+json+');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function requirePin_(pin) {
  const expected = PropertiesService.getScriptProperties().getProperty(CFG.PIN_PROPERTY) || CFG.DEFAULT_PIN;
  if (!pin || String(pin) !== String(expected)) throw new Error('Invalid staff PIN.');
}

function getStudents_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(CFG.STUDENT_SHEET);
  if (!sh) throw new Error('STUDENT MASTER sheet not found.');
  const values = sh.getDataRange().getDisplayValues();
  if (values.length < 2) return [];
  const map = headerMap_(values[0]);
  return values.slice(1).filter(r => {
    const name = val_(r,map,['student name','name','student']);
    return String(name).trim() !== '';
  }).map(r => ({
    scholarNo: val_(r,map,['scholar no','scholar number','scholarno','admission no','admission number']),
    rollNo: val_(r,map,['roll no','roll number','rollno']),
    name: val_(r,map,['student name','name','student']),
    classDivision: val_(r,map,['class/division','class division','class','grade','standard']),
    parentName: val_(r,map,['parent name','father name','father/guardian name','guardian name','parent']),
    parentMobile: val_(r,map,['parent mobile','parent mobile no','mobile','mobile no','contact no','phone'])
  }));
}

function getLists_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(CFG.LISTS_SHEET);
  if (!sh) return {relations:['Father','Mother','Guardian','Brother','Sister','Grandparent','Relative','Other'],
                   reasons:['Medical / Health','Family Emergency','Doctor Appointment','Personal Work','Parent Request','Other']};
  const values = sh.getDataRange().getDisplayValues();
  const rel=[], reason=[];
  values.forEach(row => {
    row.forEach((cell,i) => {
      const x=String(cell).trim();
      if(!x) return;
      const h = i===0 ? '' : '';
      if (/father|mother|guardian|brother|sister|grand|relative|relation/i.test(x)) rel.push(x);
      if (/medical|health|emergency|doctor|appointment|personal|parent request|reason/i.test(x)) reason.push(x);
    });
  });
  return {
    relations:[...new Set(rel.length?rel:['Father','Mother','Guardian','Brother','Sister','Grandparent','Relative','Other'])],
    reasons:[...new Set(reason.length?reason:['Medical / Health','Family Emergency','Doctor Appointment','Personal Work','Parent Request','Other'])]
  };
}

function saveExit_(p) {
  if (!p.student || !p.student.name) throw new Error('Student is missing.');
  const sh = SpreadsheetApp.getActive().getSheetByName(CFG.EXIT_SHEET) || SpreadsheetApp.getActive().insertSheet(CFG.EXIT_SHEET);
  ensureExitHeaders_(sh);
  const now = new Date();
  const date = Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd-MM-yyyy');
  const time = Utilities.formatDate(now, Session.getScriptTimeZone(), 'hh:mm a');
  const headers = sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0];
  const row = new Array(headers.length).fill('');
  const data = {
    'date':date,'time':time,
    'student name':p.student.name,'student':p.student.name,
    'scholar no':p.student.scholarNo,'scholar number':p.student.scholarNo,
    'roll no':p.student.rollNo,'roll number':p.student.rollNo,
    'class/division':p.student.classDivision,'class division':p.student.classDivision,'class':p.student.classDivision,
    'parent name':p.student.parentName,'parent mobile':p.student.parentMobile,
    'person taking student':p.takingPerson,'taking person':p.takingPerson,'taken by':p.takingPerson,
    'relation':p.relation,'reason':p.reason,'remarks':p.remarks||'','staff':p.staff||'Staff'
  };
  const hm=headerMap_(headers);
  headers.forEach((h,i)=>{const k=norm_(h); if(data[k]!==undefined) row[i]=data[k];});
  sh.appendRow(row);

  const phone=normaliseIndiaMobile_(p.student.parentMobile);
  const text =
`MMHSJC - EARLY EXIT
Student Name: ${p.student.name}
Scholar No.: ${p.student.scholarNo||'-'}
Roll No.: ${p.student.rollNo||'-'}
Class/Division: ${p.student.classDivision||'-'}
Date: ${date}
Time: ${time}
Person Taking Student: ${p.takingPerson}
Relation: ${p.relation}
Reason: ${p.reason}
Remarks: ${p.remarks||'-'}
Staff: ${p.staff||'Staff'}

This is to inform you that the above student has left the school with the person mentioned above.`;
  const wa = 'https://wa.me/'+phone+'?text='+encodeURIComponent(text);
  return {ok:true, whatsappUrl:wa, date, time};
}

function getTodayExits_() {
  const sh=SpreadsheetApp.getActive().getSheetByName(CFG.EXIT_SHEET);
  if(!sh||sh.getLastRow()<2) return [];
  const v=sh.getDataRange().getDisplayValues(), hm=headerMap_(v[0]);
  const today=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'dd-MM-yyyy');
  return v.slice(1).filter(r=>val_(r,hm,['date'])===today).map(r=>({
    time:val_(r,hm,['time']),
    studentName:val_(r,hm,['student name','student']),
    classDivision:val_(r,hm,['class/division','class division','class']),
    reason:val_(r,hm,['reason']),
    takingPerson:val_(r,hm,['person taking student','taking person','taken by'])
  })).reverse();
}

function ensureExitHeaders_(sh) {
  if(sh.getLastRow()===0 || sh.getLastColumn()===0) {
    sh.getRange(1,1,1,12).setValues([[
      'Date','Time','Student Name','Scholar No.','Roll No.','Class/Division',
      'Parent Name','Parent Mobile','Person Taking Student','Relation','Reason','Remarks'
    ]]);
  } else if(String(sh.getRange(1,1).getDisplayValue()).trim()==='') {
    sh.getRange(1,1,1,12).setValues([[
      'Date','Time','Student Name','Scholar No.','Roll No.','Class/Division',
      'Parent Name','Parent Mobile','Person Taking Student','Relation','Reason','Remarks'
    ]]);
  }
}

function headerMap_(headers) {
  const m={}; headers.forEach((h,i)=>m[norm_(h)]=i); return m;
}
function norm_(s) { return String(s||'').toLowerCase().replace(/[._-]/g,' ').replace(/\s+/g,' ').trim(); }
function val_(row,map,aliases) {
  for(const a of aliases){const i=map[norm_(a)]; if(i!==undefined) return row[i]||'';}
  return '';
}
function normaliseIndiaMobile_(raw) {
  let s=String(raw||'').replace(/\D/g,'');
  if(s.length===10) s='91'+s;
  if(s.length===11 && s.startsWith('0')) s='91'+s.slice(1);
  return s;
}
