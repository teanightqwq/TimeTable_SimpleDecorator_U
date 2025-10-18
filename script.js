// Course management
let courses = [];
let editingCourseId = null;

// DOM elements
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadCoursesFromStorage();
    renderTimetable();
    renderCourseList();
    setupTimeQuickPickersMinute();
    setupTimeQuickPickersHour();
    setupWeekFilter();
    setupTitleDisplayMode();
});

// Event listeners
addCourseBtn.addEventListener('click', () => {
    openModal();
});

clearAllBtn.addEventListener('click', () => {
    if (confirm('你真的要开摆吗？习惯就很难再卷了💔')) {
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
    } else {
        editingCourseId = null;
        modalTitle.textContent = '添加课程';
        courseForm.reset();
        document.getElementById('courseColor').value = getRandomColor();
        const wt = document.getElementById('courseWeekType');
        if (wt) wt.value = 'both';
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

    // 时间验证
    if (startTime >= endTime) {
        alert('不接受跨天课程😠！');
        return;
    }

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
        weekType
    };

    if (editingCourseId) {
        const index = courses.findIndex(c => c.id === editingCourseId);
        courses[index] = course;
    } else {
        courses.push(course);
    }

    saveCoursesToStorage();
    renderTimetable();
    renderCourseList();
    closeModalWindow();
}

function deleteCourse(id) {
    if (confirm('你真的要抛弃这门课程吗?')) {
        courses = courses.filter(c => c.id !== id);
        saveCoursesToStorage();
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
        // Dynamic height based on number of slots
        const slots = document.querySelectorAll('.time-column .time-slot').length;
        const pixelsPerHour = 60; // matched with background-size 60px
        content.style.height = `${slots * pixelsPerHour}px`;
        content.style.background = `linear-gradient(to bottom, transparent 0%, transparent calc(${pixelsPerHour}px - 1px), #e2e8f0 calc(${pixelsPerHour}px - 1px), #e2e8f0 ${pixelsPerHour}px)`;
        content.style.backgroundSize = `100% ${pixelsPerHour}px`;
    });

    // Render each course
    courses.forEach(course => {
        // Backward compatibility default
        const wt = course.weekType || 'both';
        if (!matchWeekFilter(wt, currentWeekFilter)) return;
        const dayColumn = document.querySelector(`.day-column[data-day="${course.day}"] .day-content`);
        if (dayColumn) {
            const courseBlock = createCourseBlock(course);
            dayColumn.appendChild(courseBlock);
        }
    });
}

function createCourseBlock(course) {
    const block = document.createElement('div');
    block.className = 'course-block';
    block.style.backgroundColor = course.color;
    
    // Calculate position and height
    const startMinutes = timeToMinutes(course.startTime);
    const endMinutes = timeToMinutes(course.endTime);
    const startHour = 8; // Timetable starts at 8:00
    const pixelsPerHour = 60;
    
    const top = ((startMinutes - (startHour * 60)) / 60) * pixelsPerHour;
    const height = ((endMinutes - startMinutes) / 60) * pixelsPerHour;
    
    block.style.top = `${top}px`;
    block.style.height = `${height}px`;
    
    // Add content
    // Title display based on mode
    const primaryTitle = getPrimaryTitle(course);
    let html = `<div class="course-code">${primaryTitle}</div>`;
    const wtLabel = (course.weekType && course.weekType !== 'both') ? ` • ${course.weekType === 'odd' ? 'Odd' : 'Even'} week` : '';
    html += `<div class="course-time">${course.startTime} - ${course.endTime}${wtLabel}</div>`;
    if (course.name) {
        html += `<div class="course-name">${course.name}</div>`;
    }
    if (course.location) {
        html += `<div class="course-location">📍 ${course.location}</div>`;
    }
    if (course.instructor) {
        html += `<div class="course-instructor">👨‍🏫 ${course.instructor}</div>`;
    }
    
    block.innerHTML = html;
    
    // Add click event
    block.addEventListener('click', () => {
        editCourse(course.id);
    });
    
    return block;
}

function renderCourseList() {
    const container = document.getElementById('courseListContainer');
    container.innerHTML = '';
    
    // Filter by view for list as well
    const filtered = courses.filter(c => matchWeekFilter((c.weekType || 'both'), currentWeekFilter));

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state">No courses in this view. Switch the week filter or click "Add Course" to get started! 🎓</div>';
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
                <div>⏰ ${course.startTime} - ${course.endTime}${(course.weekType && course.weekType !== 'both') ? ` • ${course.weekType === 'odd' ? 'Odd' : 'Even'} week` : ''}</div>
        `;
        
        if (course.instructor) {
            html += `<div>👨‍🏫 ${course.instructor}</div>`;
        }
        if (course.location) {
            html += `<div>📍 ${course.location}</div>`;
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
                weekType: c.weekType || 'both'
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
                        weekType: c.weekType || 'both'
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
