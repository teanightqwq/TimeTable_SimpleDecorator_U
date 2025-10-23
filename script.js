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
        document.getElementById('courseColor').value = course.color;
        // restore exam dates
        const midEl = document.getElementById('courseMidtermDate');
        const finEl = document.getElementById('courseFinalDate');
        if (midEl) midEl.value = course.midtermDate || '';
        if (finEl) finEl.value = course.finalDate || '';
        // restore multiple slots (migrate if legacy)
        renderSlots(course.slots ? course.slots : migrateToSlots(course));
    } else {
        editingCourseId = null;
        modalTitle.textContent = '添加课程';
        courseForm.reset();
        document.getElementById('courseColor').value = getRandomColor();
        const midEl = document.getElementById('courseMidtermDate');
        const finEl = document.getElementById('courseFinalDate');
        if (midEl) midEl.value = '';
        if (finEl) finEl.value = '';
        renderSlots([]);
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
    const color = document.getElementById('courseColor').value;
    const midtermDateEl = document.getElementById('courseMidtermDate');
    const finalDateEl = document.getElementById('courseFinalDate');
    const midtermDate = midtermDateEl ? (midtermDateEl.value || '') : '';
    const finalDate = finalDateEl ? (finalDateEl.value || '') : '';
    const slots = collectSlots();
    if (!slots.length) {
        alert('请至少添加一个时间段');
        return;
    }
    const selfErr = findSelfOverlap(slots);
    if (selfErr) {
        alert(selfErr);
        return;
    }

    const course = {
        id: editingCourseId || Date.now().toString(),
        code,
        name,
        instructor,
        location,
        color,
        slots,
        midtermDate,
        finalDate
    };

    // 重叠校验（基于每个时间段）：同一天，只要与现有课程时间重叠且双方不是单/双周互斥，就禁止保存
    if (hasBlockingOverlapSlots(course)) {
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

function hasBlockingOverlap(candidate) { return false; }
function hasBlockingOverlapSlots(candidate) {
    return courses.some(existing => {
        if (editingCourseId && existing.id === editingCourseId) return false;
        const eSlots = existing.slots ? existing.slots : migrateToSlots(existing);
        return candidate.slots.some(cs => eSlots.some(es => {
            if (es.day !== cs.day) return false;
            const eType = es.weekType || 'both';
            const cType = cs.weekType || 'both';
            const mutuallyExclusive = (eType === 'odd' && cType === 'even') || (eType === 'even' && cType === 'odd');
            if (mutuallyExclusive) return false;
            return intervalsOverlap(es.startTime, es.endTime, cs.startTime, cs.endTime);
        }));
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
        const pixelsPerHour = 50; // 时间高度像素
        content.style.height = `${slots * pixelsPerHour}px`;
        content.style.background = `linear-gradient(to bottom, transparent 0%, transparent calc(${pixelsPerHour}px - 1px), #e2e8f0 calc(${pixelsPerHour}px - 1px), #e2e8f0 ${pixelsPerHour}px)`;
        content.style.backgroundSize = `100% ${pixelsPerHour}px`;
    });

    // 基于时间段按天分组，以便在“全部”视图中进行重叠决策
    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    const slotsByDay = {};
    courses.forEach(c => {
        const arr = c.slots ? c.slots : migrateToSlots(c);
        arr.forEach(s => {
            const wt = s.weekType || 'both';
            if (!matchWeekFilter(wt, currentWeekFilter)) return;
            (slotsByDay[s.day] ||= []).push({ ...s, course: c });
        });
    });

    days.forEach(day => {
        const list = slotsByDay[day] || [];
        const dayColumn = document.querySelector(`.day-column[data-day="${day}"] .day-content`);
        if (!dayColumn) return;
        list.forEach(item => {
            const wt = item.weekType || 'both';
            if (currentWeekFilter === 'both') {
                if (wt === 'both') {
                    dayColumn.appendChild(createCourseBlock(item.course, 'full', item.day, item.startTime, item.endTime, wt));
                } else {
                    const opposite = wt === 'odd' ? 'even' : 'odd';
                    const hasOppositeOverlap = list.some(other => {
                        const owt = other.weekType || 'both';
                        if (owt !== opposite) return false;
                        return intervalsOverlap(item.startTime, item.endTime, other.startTime, other.endTime);
                    });
                    if (hasOppositeOverlap) {
                        const mode = wt === 'odd' ? 'half-left' : 'half-right';
                        dayColumn.appendChild(createCourseBlock(item.course, mode, item.day, item.startTime, item.endTime, wt));
                    } else {
                        dayColumn.appendChild(createCourseBlock(item.course, 'full', item.day, item.startTime, item.endTime, wt));
                    }
                }
            } else {
                dayColumn.appendChild(createCourseBlock(item.course, 'full', item.day, item.startTime, item.endTime, wt));
            }
        });
    });
}

// legacy helper removed: renderCourseSlots

function createCourseBlock(course, widthMode = 'full', day = null, start = null, end = null, slotWeekType = 'both') {
    const block = document.createElement('div');
    block.className = 'course-block';
    block.style.backgroundColor = course.color;
    
    // 课程气泡框大小计算
    const useStart = start || '08:00';
    const useEnd = end || '09:00';
    const startMinutes = timeToMinutes(useStart);
    const endMinutes = timeToMinutes(useEnd);
    const startHour = 8; // 时间表从 8:00 开始
    const pixelsPerHour = 50; // 时间高度像素
    
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
    const wtLabel = (slotWeekType && slotWeekType !== 'both') ? ` • ${slotWeekType === 'odd' ? '单周' : '双周'}` : '';
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
    // only show exam info once per course to avoid duplicates
    const isPrimary = !document.querySelector(`.course-block[data-course-id="${course.id}"]`);
    if (isPrimary) {
        if (course.midtermDate) {
            html += `<div class="course-exam">📝 期中：${course.midtermDate}</div>`;
        }
        if (course.finalDate) {
            html += `<div class="course-exam">📘 期末：${course.finalDate}</div>`;
        }
    }
    
    block.setAttribute('data-course-id', course.id);
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
    const filtered = courses.filter(c => {
        const s = c.slots ? c.slots : migrateToSlots(c);
        return s.some(sl => matchWeekFilter((sl.weekType || 'both'), currentWeekFilter));
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state">这里暂时还没有输入课程噢，试试“添加课程”或切换到有课程的周 🎓</div>';
        return;
    }
    
    // Sort courses by day and time
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const sortedCourses = [...filtered].sort((a, b) => {
        const aFirst = (a.slots ? a.slots : migrateToSlots(a))[0];
        const bFirst = (b.slots ? b.slots : migrateToSlots(b))[0];
        const dayCompare = dayOrder.indexOf(aFirst?.day) - dayOrder.indexOf(bFirst?.day);
        if (dayCompare !== 0) return dayCompare;
        return (aFirst?.startTime || '00:00').localeCompare(bFirst?.startTime || '00:00');
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
                ${(course.slots ? course.slots : migrateToSlots(course)).map(sl => `<div>📅 ${sl.day} ｜ ⏰ ${sl.startTime} - ${sl.endTime}${(sl.weekType && sl.weekType !== 'both') ? ` • ${sl.weekType === 'odd' ? '单周' : '双周'}` : ''}</div>`).join('')}
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
    // 已改为每行绑定
}

function setupTimeQuickPickersHour() {
    // 已改为每行绑定
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
// ---------- 多时间段 UI 与校验 ----------
function setupBatchTimeInputs() {
    if (!addTimeSlotBtn || !batchTimesContainer) return;
    addTimeSlotBtn.addEventListener('click', () => addSlotRowUI());
}

function renderSlots(slots) {
    if (!batchTimesContainer) return;
    batchTimesContainer.innerHTML = '';
    (slots || []).forEach(s => addSlotRowUI(s));
    if ((slots || []).length === 0) addSlotRowUI();
}

function addSlotRowUI(slot = null) {
    const row = document.createElement('div');
    row.className = 'slot-row';
    row.innerHTML = `
        <div class="slot-line slot-line-top">
            <label>星期 / 周期</label>
            <div class="line-fields">
                <select class="slot-day">
                    <option value="Monday">星期一</option>
                    <option value="Tuesday">星期二</option>
                    <option value="Wednesday">星期三</option>
                    <option value="Thursday">星期四</option>
                    <option value="Friday">星期五</option>
                    <option value="Saturday">星期六</option>
                    <option value="Sunday">星期天</option>
                </select>
                <select class="slot-week">
                    <option value="both">每周</option>
                    <option value="odd">单周</option>
                    <option value="even">双周</option>
                </select>
            </div>
        </div>
        <div class="slot-line">
            <label>开始时间</label>
            <div class="line-fields">
                <input type="time" class="slot-start">
                <select class="time-hour-quick slot-start-hour" title="小时快捷选择">
                    <option value="">HH</option>
                    <option value="06">06</option>
                    <option value="07">07</option>
                    <option value="08">08</option>
                    <option value="09">09</option>
                    <option value="10">10</option>
                    <option value="11">11</option>
                    <option value="12">12</option>
                    <option value="13">13</option>
                    <option value="14">14</option>
                    <option value="15">15</option>
                    <option value="16">16</option>
                    <option value="17">17</option>
                    <option value="18">18</option>
                    <option value="19">19</option>
                    <option value="20">20</option>
                    <option value="21">21</option>
                    <option value="22">22</option>
                </select>
                <select class="time-minute-quick slot-start-minute" title="分钟快捷选择">
                    <option value="">mm</option>
                    <option value="00">00</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="30">30</option>
                    <option value="40">40</option>
                    <option value="50">50</option>
                </select>
            </div>
        </div>
        <div class="slot-line">
            <label>结束时间</label>
            <div class="line-fields">
                <input type="time" class="slot-end">
                <select class="time-hour-quick slot-end-hour" title="小时快捷选择">
                    <option value="">HH</option>
                    <option value="08">08</option>
                    <option value="09">09</option>
                    <option value="10">10</option>
                    <option value="11">11</option>
                    <option value="12">12</option>
                    <option value="13">13</option>
                    <option value="14">14</option>
                    <option value="15">15</option>
                    <option value="16">16</option>
                    <option value="17">17</option>
                    <option value="18">18</option>
                    <option value="19">19</option>
                    <option value="20">20</option>
                    <option value="21">21</option>
                    <option value="22">22</option>
                </select>
                <select class="time-minute-quick slot-end-minute" title="分钟快捷选择">
                    <option value="">mm</option>
                    <option value="00">00</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="30">30</option>
                    <option value="40">40</option>
                    <option value="50">50</option>
                </select>
            </div>
        </div>
        <div class="slot-actions">
            <button type="button" class="btn btn-danger slot-remove">删除时间段</button>
        </div>
    `;
    batchTimesContainer.appendChild(row);
    const daySel = row.querySelector('.slot-day');
    const weekSel = row.querySelector('.slot-week');
    const sInput = row.querySelector('.slot-start');
    const eInput = row.querySelector('.slot-end');
    const sHour = row.querySelector('.slot-start-hour');
    const sMin = row.querySelector('.slot-start-minute');
    const eHour = row.querySelector('.slot-end-hour');
    const eMin = row.querySelector('.slot-end-minute');
    const rmBtn = row.querySelector('.slot-remove');
    if (slot) {
        daySel.value = slot.day || 'Monday';
        weekSel.value = slot.weekType || 'both';
        sInput.value = slot.startTime || '';
        eInput.value = slot.endTime || '';
    }
    rmBtn.addEventListener('click', () => row.remove());
    sHour.addEventListener('change', () => applyHourQuick(sInput, sHour));
    sMin.addEventListener('change', () => applyMinuteQuick(sInput, sMin));
    eHour.addEventListener('change', () => applyHourQuick(eInput, eHour));
    eMin.addEventListener('change', () => applyMinuteQuick(eInput, eMin));
}

function collectSlots() {
    if (!batchTimesContainer) return [];
    const rows = Array.from(batchTimesContainer.querySelectorAll('.slot-row'));
    const slots = [];
    rows.forEach(r => {
        const day = r.querySelector('.slot-day').value;
        const weekType = r.querySelector('.slot-week').value;
        const s = r.querySelector('.slot-start').value;
        const e = r.querySelector('.slot-end').value;
        if (s && e && s < e) {
            slots.push({ day, weekType, startTime: s, endTime: e });
        }
    });
    return slots;
}

function findSelfOverlap(slots) {
    for (let i=0;i<slots.length;i++){
        for (let j=i+1;j<slots.length;j++){
            const a = slots[i], b = slots[j];
            if (a.day !== b.day) continue;
            const mutuallyExclusive = (a.weekType==='odd' && b.weekType==='even') || (a.weekType==='even' && b.weekType==='odd');
            if (mutuallyExclusive) continue;
            if (intervalsOverlap(a.startTime, a.endTime, b.startTime, b.endTime)) {
                return '填写的时间段之间存在冲突（非单双周互斥）。请检查后再试。';
            }
        }
    }
    return '';
}

function migrateToSlots(c) {
    const base = [];
    if (c.day && c.startTime && c.endTime){
        base.push({ day: c.day, weekType: c.weekType || 'both', startTime: c.startTime, endTime: c.endTime });
    }
    if (Array.isArray(c.timeSlots)){
        c.timeSlots.forEach(s => base.push({ day: s.day || c.day, weekType: c.weekType || 'both', startTime: s.startTime, endTime: s.endTime }));
    }
    return base;
}

function normalizeCourse(c){
    const nc = { ...c };
    nc.midtermDate = nc.midtermDate || '';
    nc.finalDate = nc.finalDate || '';
    if (!Array.isArray(nc.slots) || nc.slots.length === 0){
        nc.slots = migrateToSlots(nc);
    }
    delete nc.day; delete nc.startTime; delete nc.endTime; delete nc.timeSlots; delete nc.weekType;
    return nc;
}

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
