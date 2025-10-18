# TimeTable_SimpleDecorator_U
外观更舒服的大学时间表

## 📚 University Timetable - Simple Decorator

A visually pleasing, modern web application for creating and managing university course timetables. All data is stored locally in your browser for privacy and offline access.

## ✨ Features

- **Visual Timetable Grid**: Weekly view with time slots from 8:00 AM to 8:00 PM
- **Add/Edit Courses**: Easy-to-use modal form for course management
- **Course Details**: Track course name, instructor, location, day, and time
- **Color Coding**: Assign custom colors to courses for easy identification
- **Local Storage**: All data is automatically saved in your browser
- **Export/Import**: Export your timetable as JSON and import it later
- **Course List**: View all courses in a detailed list with edit and delete options
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Modern UI**: Beautiful gradient background and smooth animations

## 🚀 Getting Started

### Option 1: Direct Use
Simply open `index.html` in your web browser - no server required!

### Option 2: Using a Local Server
```bash
# Using Python
python3 -m http.server 8080

# Using Node.js
npx http-server -p 8080

# Then open http://localhost:8080 in your browser
```

## 📖 How to Use

### Adding a Course
1. Click the "+ Add Course" button
2. Fill in the course details:
   - Course Name (required)
   - Instructor (optional)
   - Location (optional)
   - Day (required)
   - Start Time (required)
   - End Time (required)
   - Color (customize the course color)
3. Click "Save Course"

### Editing a Course
- Click on a course block in the timetable, OR
- Click the edit (✏️) button in the course list

### Deleting a Course
- Click the delete (🗑️) button in the course list
- Confirm the deletion

### Exporting Your Timetable
- Click the "Export" button to download a JSON file with all your courses
- The file is named `timetable-YYYY-MM-DD.json`

### Importing a Timetable
- Click the "Import" button
- Select a previously exported JSON file
- Confirm to replace your current timetable

### Clearing All Courses
- Click the "Clear All" button
- Confirm to delete all courses

## 🎨 Customization

The website uses a modern color scheme with:
- Purple gradient background
- Blue primary buttons
- Color-coded course blocks
- Clean, card-based UI elements

You can customize colors by editing the `style.css` file.

## 💾 Local Storage

All course data is stored in your browser's localStorage, which means:
- ✅ Your data persists across browser sessions
- ✅ No internet connection required
- ✅ Complete privacy - data never leaves your device
- ⚠️ Clearing browser data will delete your timetable
- ⚠️ Data is not shared across different browsers or devices

## 🌐 Browser Compatibility

Works on all modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

## 📱 Mobile Support

The responsive design adapts to different screen sizes:
- Full timetable view on desktop
- Scrollable timetable on mobile
- Touch-friendly buttons and controls

## 🛠️ Technology Stack

- **HTML5**: Semantic markup
- **CSS3**: Modern styling with flexbox and grid
- **JavaScript (ES6+)**: Interactive functionality
- **localStorage API**: Data persistence

## 📄 Files

- `index.html` - Main HTML structure
- `style.css` - Styling and layout
- `script.js` - Application logic and functionality

## 📸 Screenshots

See the application in action with the screenshots in the pull request!

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📝 License

This project is open source and available for educational purposes.
