// Course management
let courses = [];
let editingCourseId = null;

// DOM elements
const addCourseBtn = document.getElementById('addCourseBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
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
});

// Event listeners
addCourseBtn.addEventListener('click', () => {
    openModal();
});

clearAllBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all courses? This action cannot be undone.')) {
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

// Modal functions
function openModal(course = null) {
    if (course) {
        editingCourseId = course.id;
        modalTitle.textContent = 'Edit Course';
        document.getElementById('courseName').value = course.name;
        document.getElementById('courseInstructor').value = course.instructor || '';
        document.getElementById('courseLocation').value = course.location || '';
        document.getElementById('courseDay').value = course.day;
        document.getElementById('courseStartTime').value = course.startTime;
        document.getElementById('courseEndTime').value = course.endTime;
        document.getElementById('courseColor').value = course.color;
    } else {
        editingCourseId = null;
        modalTitle.textContent = 'Add Course';
        courseForm.reset();
        document.getElementById('courseColor').value = getRandomColor();
    }
    courseModal.style.display = 'block';
}

function closeModalWindow() {
    courseModal.style.display = 'none';
    courseForm.reset();
    editingCourseId = null;
}

// Course operations
function saveCourse() {
    const name = document.getElementById('courseName').value;
    const instructor = document.getElementById('courseInstructor').value;
    const location = document.getElementById('courseLocation').value;
    const day = document.getElementById('courseDay').value;
    const startTime = document.getElementById('courseStartTime').value;
    const endTime = document.getElementById('courseEndTime').value;
    const color = document.getElementById('courseColor').value;

    // Validate time
    if (startTime >= endTime) {
        alert('End time must be after start time!');
        return;
    }

    const course = {
        id: editingCourseId || Date.now().toString(),
        name,
        instructor,
        location,
        day,
        startTime,
        endTime,
        color
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
    if (confirm('Are you sure you want to delete this course?')) {
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
    });

    // Render each course
    courses.forEach(course => {
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
    let html = `<div class="course-name">${course.name}</div>`;
    html += `<div class="course-time">${course.startTime} - ${course.endTime}</div>`;
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
    
    if (courses.length === 0) {
        container.innerHTML = '<div class="empty-state">No courses added yet. Click "Add Course" to get started! 🎓</div>';
        return;
    }
    
    // Sort courses by day and time
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const sortedCourses = [...courses].sort((a, b) => {
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
                <div class="course-item-name">${course.name}</div>
                <div class="course-item-actions">
                    <button onclick="editCourse('${course.id}')" title="Edit">✏️</button>
                    <button onclick="deleteCourse('${course.id}')" title="Delete">🗑️</button>
                </div>
            </div>
            <div class="course-item-info">
                <div>📅 ${course.day}</div>
                <div>⏰ ${course.startTime} - ${course.endTime}</div>
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

// Storage functions
function saveCoursesToStorage() {
    localStorage.setItem('timetable-courses', JSON.stringify(courses));
}

function loadCoursesFromStorage() {
    const stored = localStorage.getItem('timetable-courses');
    if (stored) {
        try {
            courses = JSON.parse(stored);
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
                    courses = importedCourses;
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

// Utility functions
function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
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
