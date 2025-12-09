# 🎯 Tiny Tweaks

**Smart changes. Real progress.**

A mobile-friendly web app to help you make smart changes by logging daily weight, food intake, and exercise—all with smart unit conversion and beautiful data visualization.

---

## ✨ Features

### 📊 Daily Dashboard
- **Date Navigation**: Easily browse through past and future dates
- **Weekday/Weekend Detection**: Automatically identifies and displays day type
- **Weight Tracking**: Log your weight in pounds or kilograms
- **Automatic Conversion**: Enter in one unit, see both instantly (lb ↔ kg)
- **Calorie Summary**: See total calories eaten, burned, and net for the day

### 🍽️ Food Logging
- Add multiple food entries per day
- Track by meal category (Breakfast, Lunch, Dinner, Snack, Other)
- Record portion sizes and calories
- One-tap deletion of entries
- Option to save any food as a preset for quick logging

### 💪 Exercise Logging
- Log exercise name, duration, and calories burned
- Track daily exercise totals
- Simple interface for quick entry

### 🔖 Preset Meals
- Create reusable meal templates
- Store frequently eaten meals with default calories
- One-tap to add preset to current day
- Manage and delete presets as needed

### 📈 Weight Progress Graph
- Beautiful line chart showing weight over time
- Toggle between lb and kg display
- See overall progress and trends
- Track summary statistics (days logged, total change)

---

## 🎨 Design

Built with the **Tiny Tweaks** brand identity:
- **Primary Color**: Raspberry Red `#BF3143`
- **Typography**: Inter (clean, modern, mobile-friendly)
- **Mobile-First**: Responsive design optimized for touch
- **Clean UI**: Cozy, data-nerd aesthetic with friendly tone

---

## 🚀 Getting Started

### Quick Start
1. Open `index.html` in any modern web browser
2. Start logging your weight, food, and exercise
3. All data is saved automatically to your browser's localStorage

### No Installation Required
This is a client-side only app—no server, no database, no login needed. Perfect for personal use!

---

## 📱 How to Use

### Log Your Weight
1. Select today's date (or any date)
2. Enter your weight in either pounds or kilograms
3. The other unit updates automatically
4. Data is saved instantly

### Track Food
1. Tap **+ Food** button
2. Enter food name, category, portion, and calories
3. Optionally save as a preset for future use
4. See your total calories update automatically

### Add Exercise
1. Tap **+ Exercise** button
2. Enter exercise name, duration, and calories burned
3. Watch your net calories adjust

### Use Presets
1. Tap **+ Preset** to select from saved meals
2. Or go to the Presets screen to manage your library
3. Create new presets from the Presets screen or when adding food

### View Progress
1. Navigate to the Progress tab
2. Toggle between lb and kg view
3. See your weight trend over time

---

## 🛠️ Technical Details

### Technologies Used
- **HTML5**: Semantic structure
- **CSS3**: Custom styling with CSS variables
- **Vanilla JavaScript**: No frameworks, pure JS
- **Chart.js**: Beautiful weight progress visualization
- **localStorage**: Client-side data persistence

### Data Model
```javascript
{
  "days": [
    {
      "date": "2025-12-05",
      "dayOfWeek": "Fri",
      "dayType": "weekday",
      "weightLb": 119.0,
      "weightKg": 54.0,
      "foods": [...],
      "exercises": [...]
    }
  ],
  "presets": [
    {
      "id": "preset-1",
      "name": "My standard lunch salad",
      "description": "Spinach, tomatoes, eggs...",
      "defaultCalories": 450
    }
  ]
}
```

### Weight Conversion
- **lb to kg**: `kg = lb × 0.45359237` (rounded to 1 decimal)
- **kg to lb**: `lb = kg ÷ 0.45359237` (rounded to 1 decimal)

---

## 🎯 Future Enhancements

Some ideas for v2:
- Export data to CSV/JSON
- Import data from other apps
- Set calorie goals and targets
- Weekly/monthly summary views
- Photo logging for meals
- Multiple user profiles
- Cloud sync option
- Dark mode
- Progressive Web App (PWA) for offline use

---

## 📄 License

Free to use for personal projects. Built with ❤️ by the Tiny Tweaks team.

---

## 🙏 Credits

- **Design System**: Inspired by Tabbi AI color palette
- **Charts**: Powered by Chart.js
- **Typography**: Google Fonts (Inter)

---

**Ready to start your journey? Open index.html and let's go! 🚀**

*Smart changes. Real progress.*
