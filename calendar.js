// Calendar standalone page logic (reuses style.css)
const calPrevBtn = document.getElementById('calPrevBtn');
const calNextBtn = document.getElementById('calNextBtn');
const calTitle = document.getElementById('calTitle');
const calendarGrid = document.getElementById('calendarGrid');

const noteModal = document.getElementById('noteModal');
const noteClose = document.getElementById('noteClose');
const noteText = document.getElementById('noteText');
const noteSaveBtn = document.getElementById('noteSaveBtn');
const noteDeleteBtn = document.getElementById('noteDeleteBtn');
const noteCancelBtn = document.getElementById('noteCancelBtn');

let noteEditingDateISO = null;
let currentCal = new Date();

init();

function init(){
  renderCalendar();
  if (calPrevBtn) calPrevBtn.addEventListener('click', () => shiftMonth(-1));
  if (calNextBtn) calNextBtn.addEventListener('click', () => shiftMonth(1));
  if (noteClose) noteClose.addEventListener('click', closeNoteModal);
  if (noteCancelBtn) noteCancelBtn.addEventListener('click', closeNoteModal);
  if (noteSaveBtn) noteSaveBtn.addEventListener('click', saveNoteForEditingDate);
  if (noteDeleteBtn) noteDeleteBtn.addEventListener('click', deleteNoteForEditingDate);
  window.addEventListener('click', (e) => { if (e.target === noteModal) closeNoteModal(); });
}

function shiftMonth(delta){
  currentCal.setMonth(currentCal.getMonth() + delta);
  renderCalendar();
}

function renderCalendar(){
  const year = currentCal.getFullYear();
  const month = currentCal.getMonth();
  calTitle.textContent = `${year} 年 ${month + 1} 月`;

  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  calendarGrid.innerHTML = '';
  for (let i=0;i<startWeekday;i++) calendarGrid.appendChild(document.createElement('div'));

  const today = new Date();
  for (let d=1; d<=daysInMonth; d++){
    const cell = document.createElement('div');
    cell.className = 'calendar-day';
    const dateObj = new Date(year, month, d);
    const iso = dateObj.toISOString().slice(0,10);
    if (dateObj.toDateString() === today.toDateString()) cell.classList.add('today');

    const dateDiv = document.createElement('div');
    dateDiv.className = 'date';
    dateDiv.textContent = String(d);
    cell.appendChild(dateDiv);

    const note = getNote(iso);
    if (note){
      const noteDiv = document.createElement('div');
      noteDiv.className = 'note';
      noteDiv.textContent = note;
      cell.appendChild(noteDiv);
    }

    cell.addEventListener('click', () => openNoteModal(iso));
    calendarGrid.appendChild(cell);
  }
}

function getNotesStore(){
  try{
    const raw = localStorage.getItem('timetable-notes');
    return raw ? JSON.parse(raw) : {};
  }catch(e){ return {}; }
}
function setNotesStore(obj){ localStorage.setItem('timetable-notes', JSON.stringify(obj)); }
function getNote(iso){ const s = getNotesStore(); return s[iso] || ''; }
function saveNote(iso, text){
  const s = getNotesStore();
  if (text && text.trim()) s[iso] = text.trim();
  else delete s[iso];
  setNotesStore(s);
}

function openNoteModal(iso){
  noteEditingDateISO = iso;
  if (noteText) noteText.value = getNote(iso);
  const title = document.getElementById('noteModalTitle');
  if (title) title.textContent = `备注：${iso}`;
  if (noteModal) noteModal.style.display = 'block';
}
function closeNoteModal(){ if (noteModal) noteModal.style.display = 'none'; noteEditingDateISO = null; }
function saveNoteForEditingDate(){ if (!noteEditingDateISO) return; saveNote(noteEditingDateISO, noteText ? noteText.value : ''); closeNoteModal(); renderCalendar(); }
function deleteNoteForEditingDate(){ if (!noteEditingDateISO) return; saveNote(noteEditingDateISO, ''); closeNoteModal(); renderCalendar(); }
