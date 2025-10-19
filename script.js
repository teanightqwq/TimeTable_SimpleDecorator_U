// 课程管理列表
let courses = [];
let editingCourseId = null;

// DOM 变量
const addCourseBtn = document.getElementById('addCourseBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const weekFilter = document.getElementById('weekFilter');
const courseModal = document.getElementById('courseModal');
const closeModal = document.querySelector('.close');
const courseForm = document.getElementById('courseForm');
const cancelBtn = document.getElementById('cancelBtn');
const modalTitle = document.getElementById('modalTitle');
const addTimeSlotBtn = document.getElementById('addTimeSlotBtn');
const batchTimesContainer = document.getElementById('batchTimesContainer');
const duplicateBtn = document.getElementById('duplicateBtn');

// 初始化课程
document.addEventListener('DOMContentLoaded', () => {
    loadCoursesFromStorage();
    renderTimetable();
    renderCourseList();
    setupTimeQuickPickersMinute();
    setupTimeQuickPickersHour();
    setupWeekFilter();
    setupTitleDisplayMode();
    setupBatchTimeInputs();
    if (duplicateBtn) duplicateBtn.addEventListener('click', duplicateCurrentCourse);
});

// Event listeners
addCourseBtn.addEventListener('click', () => {
    openModal();
});

clearAllBtn.addEventListener('click', () => {
    if (confirm('你真的要开摆吗？习惯了就很难再卷了💔')) {
        courses = [];
        saveCoursesToStorage();
        renderTimetable();
        renderCourseList();
    }
});

exportBtn.addEventListener('click', () => {
    exportCourses();
});

importBtn.addEventListener('click', () => {
    importFile.click();
});

importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        importCourses(file);
    }
});

closeModal.addEventListener('click', () => {
    closeModalWindow();
});

cancelBtn.addEventListener('click', () => {
    closeModalWindow();
});

window.addEventListener('click', (e) => {
    if (e.target === courseModal) {
        closeModalWindow();
    }
});

courseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveCourse();
});


// 周期表
let currentWeekFilter = 'both'; // both | odd | even

function setupWeekFilter() {
    if (weekFilter) {
        weekFilter.value = currentWeekFilter;
        weekFilter.addEventListener('change', () => {
            currentWeekFilter = weekFilter.value;
            renderTimetable();
            renderCourseList();
        });
    }
}

// 模态逻辑
function openModal(course = null) {
    if (course) {
        editingCourseId = course.id;
    modalTitle.textContent = '编辑课程';
        document.getElementById('courseCode').value = course.code;
        document.getElementById('courseName').value = course.name || '';
        document.getElementById('courseInstructor').value = course.instructor || '';
        document.getElementById('courseLocation').value = course.location || '';
        document.getElementById('courseDay').value = course.day;
        document.getElementById('courseStartTime').value = course.startTime;
        document.getElementById('courseEndTime').value = course.endTime;
        document.getElementById('courseColor').value = course.color;
        const wt = document.getElementById('courseWeekType');
        if (wt) wt.value = course.weekType || 'both';
        // restore exam dates
        const midEl = document.getElementById('courseMidtermDate');
        const finEl = document.getElementById('courseFinalDate');
        if (midEl) midEl.value = course.midtermDate || '';
        if (finEl) finEl.value = course.finalDate || '';
        // restore batch time slots
        renderBatchSlots(course.timeSlots || []);
    } else {
        editingCourseId = null;
        modalTitle.textContent = '添加课程';
        courseForm.reset();
        document.getElementById('courseColor').value = getRandomColor();
        const wt = document.getElementById('courseWeekType');
        if (wt) wt.value = 'both';
        const midEl = document.getElementById('courseMidtermDate');
        const finEl = document.getElementById('courseFinalDate');
        if (midEl) midEl.value = '';
        if (finEl) finEl.value = '';
        renderBatchSlots([]);
    }
    courseModal.style.display = 'block';
}

function closeModalWindow() {
    courseModal.style.display = 'none';
    courseForm.reset();
    editingCourseId = null;
}

// 课程处理
function saveCourse() {
    const code = document.getElementById('courseCode').value;
    const name = document.getElementById('courseName').value;
    const instructor = document.getElementById('courseInstructor').value;
    const location = document.getElementById('courseLocation').value;
    const day = document.getElementById('courseDay').value;
    const startTime = document.getElementById('courseStartTime').value;
    const endTime = document.getElementById('courseEndTime').value;
    const color = document.getElementById('courseColor').value;
    const weekTypeEl = document.getElementById('courseWeekType');
    const weekType = weekTypeEl ? weekTypeEl.value : 'both';
    const midtermDateEl = document.getElementById('courseMidtermDate');
    const finalDateEl = document.getElementById('courseFinalDate');
    const midtermDate = midtermDateEl ? (midtermDateEl.value || '') : '';
    const finalDate = finalDateEl ? (finalDateEl.value || '') : '';

    // 时间验证
    if (startTime >= endTime) {
        alert('不接受跨天课程😠！');
        return;
    }

    const timeSlots = collectBatchSlots({
        day,
        startTime,
        endTime
    });

    const course = {
        id: editingCourseId || Date.now().toString(),
        code,
        name,
        instructor,
        location,
        day,
        startTime,
        endTime,
        color,
        weekType,
        timeSlots,
        midtermDate,
        finalDate
    };

    // 重叠校验：同一天，只要与现有课程时间重叠且双方不是单/双周互斥，就禁止保存
    if (hasBlockingOverlap(course)) {
        alert('该时间段与已有课程冲突（非单双周互斥）。请调整后再试。');
        return;
    }

    let oldCourse = null;
    if (editingCourseId) {
        oldCourse = courses.find(c => c.id === editingCourseId) || null;
        const index = courses.findIndex(c => c.id === editingCourseId);
        courses[index] = course;
    } else {
        courses.push(course);
    }

    saveCoursesToStorage();
    // 同步课程考试时间到日历
    syncExamNotesForCourse(course, oldCourse);
    renderTimetable();
    renderCourseList();
    closeModalWindow();
}

function hasBlockingOverlap(candidate) {
    return courses.some(existing => {
        if (editingCourseId && existing.id === editingCourseId) return false; // 忽略自己
        if (existing.day !== candidate.day) return false; // 不同天不冲突
        // 如果两者周类型互斥（一个单周一个双周），可以共用时间，不算冲突
        const eType = existing.weekType || 'both';
        const cType = candidate.weekType || 'both';
        const mutuallyExclusive = (eType === 'odd' && cType === 'even') || (eType === 'even' && cType === 'odd');
        if (mutuallyExclusive) return false;
        // 剩下：出现重叠即冲突（包括 both 与 odd/even 之间，或 both 与 both）
        return intervalsOverlap(existing.startTime, existing.endTime, candidate.startTime, candidate.endTime);
    });
}

function deleteCourse(id) {
    if (confirm('你真的要抛弃这门课程吗?')) {
        const toDelete = courses.find(c => c.id === id);
        courses = courses.filter(c => c.id !== id);
        saveCoursesToStorage();
        // 同步删除考试时间
        if (toDelete) syncExamNotesForCourse(null, toDelete);
        renderTimetable();
        renderCourseList();
    }
}

function editCourse(id) {
    const course = courses.find(c => c.id === id);
    if (course) {
        openModal(course);
    }
}

// Rendering functions
function renderTimetable() {
    // Clear all day contents
    document.querySelectorAll('.day-content').forEach(content => {
        content.innerHTML = '';
        // 动态高度调整
        const slots = document.querySelectorAll('.time-column .time-slot').length;
        const pixelsPerHour = 60; // 时间高度像素 -- 课程背景
        content.style.height = `${slots * pixelsPerHour}px`;
        content.style.background = `linear-gradient(to bottom, transparent 0%, transparent calc(${pixelsPerHour}px - 1px), #e2e8f0 calc(${pixelsPerHour}px - 1px), #e2e8f0 ${pixelsPerHour}px)`;
        content.style.backgroundSize = `100% ${pixelsPerHour}px`;
    });

    // 按天分组以便在“全部”视图中进行重叠决策
    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    const coursesByDay = {};
    courses.forEach(c => {
        const wt = c.weekType || 'both';
        if (!matchWeekFilter(wt, currentWeekFilter)) return;
        (coursesByDay[c.day] ||= []).push(c);
    });

    days.forEach(day => {
        const list = coursesByDay[day] || [];
        const dayColumn = document.querySelector(`.day-column[data-day="${day}"] .day-content`);
        if (!dayColumn) return;
        list.forEach(course => {
            const wt = course.weekType || 'both';
            if (currentWeekFilter === 'both') {
                if (wt === 'both') {
                    // 每周课程 -> 全宽显示
                    // render primary slot and any extra slots
                    renderCourseSlots(dayColumn, course, 'full');
                } else {
                    const opposite = wt === 'odd' ? 'even' : 'odd';
                    const hasOppositeOverlap = list.some(other => {
                        const owt = other.weekType || 'both';
                        if (owt !== opposite) return false;
                        return intervalsOverlap(course.startTime, course.endTime, other.startTime, other.endTime);
                    });
                    if (hasOppositeOverlap) {
                        const mode = wt === 'odd' ? 'half-left' : 'half-right';
                        renderCourseSlots(dayColumn, course, mode);
                    } else {
                        // 无重叠时间 -> 变回全宽
                        renderCourseSlots(dayColumn, course, 'full');
                    }
                }
            } else {
                // 只有单/双周有课程 -> 全宽显示
                renderCourseSlots(dayColumn, course, 'full');
            }
        });
    });
}

function renderCourseSlots(container, course, widthMode) {
    // base slot
    container.appendChild(createCourseBlock(course, widthMode, course.day, course.startTime, course.endTime));
    // extra slots (may be different days or times)
    if (Array.isArray(course.timeSlots)) {
        course.timeSlots.forEach(slot => {
            const d = slot.day || course.day;
            const dc = document.querySelector(`.day-column[data-day="${d}"] .day-content`);
            if (!dc) return;
            // if filter mismatch, skip
            const wt = course.weekType || 'both';
            if (!matchWeekFilter(wt, currentWeekFilter)) return;
            dc.appendChild(createCourseBlock(course, widthMode, d, slot.startTime, slot.endTime));
        });
    }
}

function createCourseBlock(course, widthMode = 'full', day = null, start = null, end = null) {
    const block = document.createElement('div');
    block.className = 'course-block';
    block.style.backgroundColor = course.color;
    
    // 课程气泡框大小计算
    const useStart = start || course.startTime;
    const useEnd = end || course.endTime;
    const startMinutes = timeToMinutes(useStart);
    const endMinutes = timeToMinutes(useEnd);
    const startHour = 8; // 时间表从 8:00 开始
    const pixelsPerHour = 60; // 时间高度像素 -- 时间表时间背景
    
    const top = ((startMinutes - (startHour * 60)) / 60) * pixelsPerHour;
    const height = ((endMinutes - startMinutes) / 60) * pixelsPerHour;
    
    block.style.top = `${top}px`;
    block.style.height = `${height}px`;
    // 宽度计算 -- 单双周分辨
    if (widthMode === 'half-left') {
        block.style.left = '5px';
        block.style.right = 'calc(50% + 5px)';
    } else if (widthMode === 'half-right') {
        block.style.left = 'calc(50% + 5px)';
        block.style.right = '5px';
    } else {
        block.style.left = '5px';
        block.style.right = '5px';
    }
    
    // 内容添加
    // 根据显示模式显示重要标题资讯
    const primaryTitle = getPrimaryTitle(course);
    const secondaryTitle = getSecondaryTitle(course);
    let html = `<div class="course-code">${primaryTitle}</div>`;
    const wtLabel = (course.weekType && course.weekType !== 'both') ? ` • ${course.weekType === 'odd' ? '单周' : '双周'}` : '';
    html += `<div class="course-time">${useStart} - ${useEnd}${wtLabel}</div>`;
    if (secondaryTitle && secondaryTitle !== primaryTitle) {
        html += `<div class="course-name">${secondaryTitle}</div>`;
    }
    if (course.location) {
        html += `<div class="course-location">📍 ${course.location}</div>`;
    }
    if (course.instructor) {
        html += `<div class="course-instructor">👨‍🏫 ${course.instructor}</div>`;
    }
    // only show exam info on primary slot to avoid duplicates
    const isPrimary = (day === course.day) && (useStart === course.startTime) && (useEnd === course.endTime);
    if (isPrimary) {
        if (course.midtermDate) {
            html += `<div class="course-exam">📝 期中：${course.midtermDate}</div>`;
        }
        if (course.finalDate) {
            html += `<div class="course-exam">📘 期末：${course.finalDate}</div>`;
        }
    }
    
    block.innerHTML = html;
    
    // Add click event
    block.addEventListener('click', () => {
        editCourse(course.id);
    });
    
    return block;
}

// Batch time UI
function setupBatchTimeInputs() {
    if (!addTimeSlotBtn || !batchTimesContainer) return;
    addTimeSlotBtn.addEventListener('click', () => addSlotRow());
}

function renderBatchSlots(slots) {
    if (!batchTimesContainer) return;
    batchTimesContainer.innerHTML = '';
    (slots || []).forEach(s => addSlotRow(s));
}

function addSlotRow(slot = null) {
    const row = document.createElement('div');
    row.className = 'slot-row';
    row.innerHTML = `
        <select class="slot-day">
            <option value="Monday">星期一</option>
            <option value="Tuesday">星期二</option>
            <option value="Wednesday">星期三</option>
            <option value="Thursday">星期四</option>
            <option value="Friday">星期五</option>
            <option value="Saturday">星期六</option>
            <option value="Sunday">星期天</option>
        </select>
        <input type="time" class="slot-start">
        <span>—</span>
        <input type="time" class="slot-end">
        <button type="button" class="btn btn-danger slot-remove">删除</button>
    `;
    batchTimesContainer.appendChild(row);
    const daySel = row.querySelector('.slot-day');
    const sInput = row.querySelector('.slot-start');
    const eInput = row.querySelector('.slot-end');
    const rmBtn = row.querySelector('.slot-remove');
    if (slot) {
        daySel.value = slot.day || 'Monday';
        sInput.value = slot.startTime || '';
        eInput.value = slot.endTime || '';
    }
    rmBtn.addEventListener('click', () => row.remove());
}

function collectBatchSlots(primary) {
    if (!batchTimesContainer) return [];
    const rows = Array.from(batchTimesContainer.querySelectorAll('.slot-row'));
    const slots = [];
    rows.forEach(r => {
        const day = r.querySelector('.slot-day').value;
        const s = r.querySelector('.slot-start').value;
        const e = r.querySelector('.slot-end').value;
        if (s && e && s < e) {
            // 忽略与主时间重复的一段
            if (!(day === primary.day && s === primary.startTime && e === primary.endTime)) {
                slots.push({ day, startTime: s, endTime: e });
            }
        }
    });
    return slots;
}

// 复制课程
function duplicateCurrentCourse() {
    if (!editingCourseId) return;
    const course = courses.find(c => c.id === editingCourseId);
    if (!course) return;
    const copy = JSON.parse(JSON.stringify(course));
    copy.id = Date.now().toString();
    // 轻微调整颜色以便区分
    copy.color = tweakColor(copy.color, 10);
    courses.push(copy);
    saveCoursesToStorage();
    renderTimetable();
    renderCourseList();
    alert('已复制为新课程');
}

function tweakColor(hex, delta = 10) {
    try {
        const n = parseInt(hex.slice(1), 16);
        let r = Math.min(255, Math.max(0, ((n >> 16) & 255) + delta));
        let g = Math.min(255, Math.max(0, ((n >> 8) & 255) + delta));
        let b = Math.min(255, Math.max(0, (n & 255) + delta));
        const toHex = v => v.toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    } catch { return hex; }
}

function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
    const aS = timeToMinutes(aStart);
    const aE = timeToMinutes(aEnd);
    const bS = timeToMinutes(bStart);
    const bE = timeToMinutes(bEnd);
    return aS < bE && bS < aE;
}

function renderCourseList() {
    const container = document.getElementById('courseListContainer');
    container.innerHTML = '';
    
    // Filter by view for list as well
    const filtered = courses.filter(c => matchWeekFilter((c.weekType || 'both'), currentWeekFilter));

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state">这里暂时还没有输入课程噢，试试“添加课程”或切换到有课程的周 🎓</div>';
        return;
    }
    
    // Sort courses by day and time
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const sortedCourses = [...filtered].sort((a, b) => {
        const dayCompare = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
        if (dayCompare !== 0) return dayCompare;
        return a.startTime.localeCompare(b.startTime);
    });
    
    sortedCourses.forEach(course => {
        const item = document.createElement('div');
        item.className = 'course-item';
        item.style.borderLeftColor = course.color;
        
        let html = `
            <div class="course-item-header">
                <div class="course-item-code">${course.code}</div>
                <div class="course-item-actions">
                    <button onclick="editCourse('${course.id}')" title="Edit">✏️</button>
                    <button onclick="deleteCourse('${course.id}')" title="Delete">🗑️</button>
                </div>
            </div>
            <div class="course-item-info">
                <div>📅 ${course.day}</div>
                <div>⏰ ${course.startTime} - ${course.endTime}${(course.weekType && course.weekType !== 'both') ? ` • ${course.weekType === 'odd' ? '单周' : '双周'}` : ''}</div>
        `;
        
        if (course.instructor) {
            html += `<div>👨‍🏫 ${course.instructor}</div>`;
        }
        if (course.location) {
            html += `<div>📍 ${course.location}</div>`;
        }
        
        if (course.midtermDate) {
            html += `<div>📝 期中：${course.midtermDate}</div>`;
        }
        if (course.finalDate) {
            html += `<div>📘 期末：${course.finalDate}</div>`;
        }
        html += `</div>`;
        item.innerHTML = html;
        container.appendChild(item);
    });
}

function matchWeekFilter(courseWeekType, filter) {
    if (filter === 'both') return true;
    if (courseWeekType === 'both') return true;
    return courseWeekType === filter;
}

// Storage functions
function saveCoursesToStorage() {
    localStorage.setItem('timetable-courses', JSON.stringify(courses));
}

function loadCoursesFromStorage() {
    const stored = localStorage.getItem('timetable-courses');
    if (stored) {
        try {
            courses = JSON.parse(stored);
            // Normalize older records
            courses = Array.isArray(courses) ? courses.map(c => ({
                ...c,
                weekType: c.weekType || 'both',
                midtermDate: c.midtermDate || '',
                finalDate: c.finalDate || ''
            })) : [];
        } catch (e) {
            console.error('Error loading courses from storage:', e);
            courses = [];
        }
    }
}

// Import/Export functions
function exportCourses() {
    const dataStr = JSON.stringify(courses, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `timetable-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

function importCourses(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedCourses = JSON.parse(e.target.result);
            if (Array.isArray(importedCourses)) {
                if (confirm('This will replace all existing courses. Continue?')) {
                    courses = importedCourses.map(c => ({
                        ...c,
                        weekType: c.weekType || 'both',
                        midtermDate: c.midtermDate || '',
                        finalDate: c.finalDate || ''
                    }));
                    saveCoursesToStorage();
                    renderTimetable();
                    renderCourseList();
                    alert('Courses imported successfully!');
                }
            } else {
                alert('Invalid file format!');
            }
        } catch (error) {
            alert('Error importing file: ' + error.message);
        }
    };
    reader.readAsText(file);
    importFile.value = '';
}

// 快速搜索时间函数
function setupTimeQuickPickersMinute() {
    const startQuick = document.getElementById('courseStartMinuteQuick');
    const endQuick = document.getElementById('courseEndMinuteQuick');
    const startInput = document.getElementById('courseStartTime');
    const endInput = document.getElementById('courseEndTime');
    if (startQuick && startInput) {
        startQuick.addEventListener('change', () => applyMinuteQuick(startInput, startQuick));
    }
    if (endQuick && endInput) {
        endQuick.addEventListener('change', () => applyMinuteQuick(endInput, endQuick));
    }
}

function setupTimeQuickPickersHour() {
    const startQuick = document.getElementById('courseStartHourQuick');
    const endQuick = document.getElementById('courseEndHourQuick');
    const startInput = document.getElementById('courseStartTime');
    const endInput = document.getElementById('courseEndTime');
    if (startQuick && startInput) {
        startQuick.addEventListener('change', () => applyHourQuick(startInput, startQuick));
    }
    if (endQuick && endInput) {
        endQuick.addEventListener('change', () => applyHourQuick(endInput, endQuick));
    }
}

function applyMinuteQuick(timeInput, quickSelect) {
    const val = quickSelect.value;
    if (!val) return;
    // If timeInput has value, replace minutes; else set to HH:val using current hour or default 08
    let hour = '08';
    if (timeInput.value && /^\d{2}:\d{2}$/.test(timeInput.value)) {
        hour = timeInput.value.split(':')[0];
    }
    timeInput.value = `${hour}:${val}`;
}

function applyHourQuick(timeInput, quickSelect) {
    const val = quickSelect.value;
    if (!val) return;
    // Preserve minutes if present, otherwise default to 00
    let minutes = '00';
    if (timeInput.value && /^\d{2}:\d{2}$/.test(timeInput.value)) {
        minutes = timeInput.value.split(':')[1];
    }
    timeInput.value = `${val}:${minutes}`;
}

// Utility functions
function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

// Title display mode
let titleDisplayMode = 'code'; // 'code' | 'name'

function setupTitleDisplayMode() {
    const sel = document.getElementById('titleDisplayMode');
    if (!sel) return;
    // try load from storage
    const saved = localStorage.getItem('timetable-title-mode');
    if (saved === 'code' || saved === 'name') {
        titleDisplayMode = saved;
    }
    sel.value = titleDisplayMode;
    sel.addEventListener('change', () => {
        titleDisplayMode = sel.value;
        localStorage.setItem('timetable-title-mode', titleDisplayMode);
        renderTimetable();
        renderCourseList();
    });
}

function getPrimaryTitle(course) {
    if (titleDisplayMode === 'name') {
        return course.name || course.code || '';
    }
    return course.code || course.name || '';
}

function getSecondaryTitle(course) {
    if (titleDisplayMode === 'name') {
        return course.code || course.name || '';
    }
    return course.name || course.code || '';
}

function getRandomColor() {
    const colors = [
        '#4CAF50', '#2196F3', '#FF9800', '#E91E63', 
        '#9C27B0', '#00BCD4', '#FF5722', '#795548',
        '#607D8B', '#3F51B5', '#009688', '#CDDC39'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Make functions available globally for onclick handlers
window.editCourse = editCourse;
window.deleteCourse = deleteCourse;

// Calendar notes helpers (shared storage key)
function getNotesStore(){
    try{
        const raw = localStorage.getItem('timetable-notes');
        return raw ? JSON.parse(raw) : {};
    }catch(e){ return {}; }
}
function setNotesStore(obj){ localStorage.setItem('timetable-notes', JSON.stringify(obj)); }
function appendNoteLine(iso, line){
    if (!iso || !line) return;
    const store = getNotesStore();
    const cur = store[iso] || '';
    const lines = cur ? cur.split('\n') : [];
    if (!lines.includes(line)) lines.push(line);
    const text = lines.filter(Boolean).join('\n');
    if (text) store[iso] = text; else delete store[iso];
    setNotesStore(store);
}
function removeNoteLine(iso, line){
    if (!iso || !line) return;
    const store = getNotesStore();
    if (!(iso in store)) return;
    const lines = (store[iso] || '').split('\n').filter(Boolean).filter(l => l !== line);
    const text = lines.join('\n');
    if (text) store[iso] = text; else delete store[iso];
    setNotesStore(store);
}
function syncExamNotesForCourse(newCourse, oldCourse){
    const title = (c) => (c.code ? c.code : (c.name || '')) + (c.name && c.code ? ` ${c.name}` : '');
    // remove old
    if (oldCourse){
        const t = title(oldCourse);
        if (oldCourse.midtermDate){ removeNoteLine(oldCourse.midtermDate, `期中考试：${t}`); }
        if (oldCourse.finalDate){ removeNoteLine(oldCourse.finalDate, `期末考试：${t}`); }
    }
    // add new
    if (newCourse){
        const t = title(newCourse);
        if (newCourse.midtermDate){ appendNoteLine(newCourse.midtermDate, `期中考试：${t}`); }
        if (newCourse.finalDate){ appendNoteLine(newCourse.finalDate, `期末考试：${t}`); }
    }
}
