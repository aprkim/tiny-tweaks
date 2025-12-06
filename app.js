// ===================================
// Tiny Deficit - App Logic
// ===================================

// Data Model
let appData = {
    days: [],
    presets: []
};

// Current state
let currentDate = new Date().toISOString().split('T')[0];
let currentUnit = 'lb'; // for graph
let isUpdatingWeight = false; // prevent conversion loops

// ===================================
// Initialization
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initializeEventListeners();
    loadTodayScreen();
});

// ===================================
// Data Storage
// ===================================

function loadData() {
    const stored = localStorage.getItem('tiny-deficit-data');
    if (stored) {
        try {
            appData = JSON.parse(stored);
        } catch (e) {
            console.error('Error loading data:', e);
            appData = { days: [], presets: [] };
        }
    }
}

function saveData() {
    localStorage.setItem('tiny-deficit-data', JSON.stringify(appData));
}

function getDayData(date) {
    return appData.days.find(d => d.date === date);
}

function getOrCreateDayData(date) {
    let day = getDayData(date);
    if (!day) {
        const dateObj = new Date(date + 'T12:00:00');
        const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dateObj.getDay()];
        const dayType = (dateObj.getDay() === 0 || dateObj.getDay() === 6) ? 'weekend' : 'weekday';
        
        day = {
            date: date,
            dayOfWeek: dayOfWeek,
            dayType: dayType,
            weightLb: null,
            weightKg: null,
            foods: [],
            exercises: []
        };
        appData.days.push(day);
        appData.days.sort((a, b) => a.date.localeCompare(b.date));
    }
    return day;
}

// ===================================
// Weight Conversion
// ===================================

function lbToKg(lb) {
    return Math.round(lb * 0.45359237 * 10) / 10;
}

function kgToLb(kg) {
    return Math.round(kg / 0.45359237 * 10) / 10;
}

// ===================================
// Navigation
// ===================================

function initializeEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const screen = btn.dataset.screen;
            switchScreen(screen);
        });
    });
    
    // Date navigation
    document.getElementById('date-input').addEventListener('change', (e) => {
        currentDate = e.target.value;
        loadTodayScreen();
    });
    
    document.getElementById('prev-day').addEventListener('click', () => {
        const date = new Date(currentDate + 'T12:00:00');
        date.setDate(date.getDate() - 1);
        currentDate = date.toISOString().split('T')[0];
        loadTodayScreen();
    });
    
    document.getElementById('next-day').addEventListener('click', () => {
        const date = new Date(currentDate + 'T12:00:00');
        date.setDate(date.getDate() + 1);
        currentDate = date.toISOString().split('T')[0];
        loadTodayScreen();
    });
    
    // Weight inputs
    document.getElementById('weight-lb').addEventListener('input', (e) => {
        if (isUpdatingWeight) return;
        const lb = parseFloat(e.target.value);
        if (!isNaN(lb) && lb >= 0) {
            isUpdatingWeight = true;
            const kg = lbToKg(lb);
            document.getElementById('weight-kg').value = kg;
            
            const day = getOrCreateDayData(currentDate);
            day.weightLb = lb;
            day.weightKg = kg;
            saveData();
            isUpdatingWeight = false;
        } else if (e.target.value === '') {
            document.getElementById('weight-kg').value = '';
            const day = getOrCreateDayData(currentDate);
            day.weightLb = null;
            day.weightKg = null;
            saveData();
        }
    });
    
    document.getElementById('weight-kg').addEventListener('input', (e) => {
        if (isUpdatingWeight) return;
        const kg = parseFloat(e.target.value);
        if (!isNaN(kg) && kg >= 0) {
            isUpdatingWeight = true;
            const lb = kgToLb(kg);
            document.getElementById('weight-lb').value = lb;
            
            const day = getOrCreateDayData(currentDate);
            day.weightKg = kg;
            day.weightLb = lb;
            saveData();
            isUpdatingWeight = false;
        } else if (e.target.value === '') {
            document.getElementById('weight-lb').value = '';
            const day = getOrCreateDayData(currentDate);
            day.weightLb = null;
            day.weightKg = null;
            saveData();
        }
    });
    
    // Food modal
    document.getElementById('add-food-btn').addEventListener('click', () => {
        openModal('food-modal');
    });
    
    document.getElementById('cancel-food-btn').addEventListener('click', () => {
        closeModal('food-modal');
    });
    
    document.getElementById('food-form').addEventListener('submit', (e) => {
        e.preventDefault();
        addFood();
    });
    
    // Exercise modal
    document.getElementById('add-exercise-btn').addEventListener('click', () => {
        openModal('exercise-modal');
    });
    
    document.getElementById('cancel-exercise-btn').addEventListener('click', () => {
        closeModal('exercise-modal');
    });
    
    document.getElementById('exercise-form').addEventListener('submit', (e) => {
        e.preventDefault();
        addExercise();
    });
    
    // Preset modals
    document.getElementById('add-preset-btn').addEventListener('click', () => {
        loadPresetSelectList();
        openModal('preset-select-modal');
    });
    
    document.getElementById('add-new-preset-btn').addEventListener('click', () => {
        presetFoodItems = [];
        updatePresetFoodItemsDisplay();
        openModal('preset-modal');
    });
    
    document.getElementById('cancel-preset-btn').addEventListener('click', () => {
        closeModal('preset-modal');
    });
    
    document.getElementById('preset-form').addEventListener('submit', (e) => {
        e.preventDefault();
        addPreset();
    });
    
    // Add preset food item
    document.getElementById('add-preset-item-btn').addEventListener('click', addPresetFoodItem);
    
    // Lookup calories button
    document.getElementById('lookup-calories-btn').addEventListener('click', lookupCalories);
    
    // Allow Enter key to add preset item
    document.getElementById('preset-item-calories').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            addPresetFoodItem();
        }
    });
    
    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            closeAllModals();
        });
    });
    
    // Click outside modal to close
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeAllModals();
            }
        });
    });
    
    // Graph unit toggle
    document.getElementById('toggle-lb').addEventListener('click', () => {
        currentUnit = 'lb';
        document.getElementById('toggle-lb').classList.add('active');
        document.getElementById('toggle-kg').classList.remove('active');
        renderGraph();
    });
    
    document.getElementById('toggle-kg').addEventListener('click', () => {
        currentUnit = 'kg';
        document.getElementById('toggle-kg').classList.add('active');
        document.getElementById('toggle-lb').classList.remove('active');
        renderGraph();
    });
    
    // Export/Import data
    document.getElementById('export-data-btn').addEventListener('click', exportData);
    document.getElementById('import-file-input').addEventListener('change', importData);
}

function switchScreen(screenName) {
    // Update nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.nav-btn[data-screen="${screenName}"]`).classList.add('active');
    
    // Update screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(`${screenName}-screen`).classList.add('active');
    
    // Load screen content
    if (screenName === 'today') {
        loadTodayScreen();
    } else if (screenName === 'presets') {
        loadPresetsScreen();
    } else if (screenName === 'progress') {
        renderGraph();
    }
}

// ===================================
// Today Screen
// ===================================

function loadTodayScreen() {
    // Set date input
    document.getElementById('date-input').value = currentDate;
    
    // Get or create day data
    const day = getOrCreateDayData(currentDate);
    
    // Update day info
    const dateObj = new Date(currentDate + 'T12:00:00');
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    document.getElementById('day-of-week').textContent = dayNames[dateObj.getDay()];
    
    const dayTypeEl = document.getElementById('day-type');
    dayTypeEl.textContent = day.dayType === 'weekend' ? 'Weekend' : 'Weekday';
    dayTypeEl.className = `day-type ${day.dayType}`;
    
    // Load weight
    document.getElementById('weight-lb').value = day.weightLb || '';
    document.getElementById('weight-kg').value = day.weightKg || '';
    
    // Load food list
    renderFoodList(day);
    
    // Load exercise list
    renderExerciseList(day);
    
    // Update summary
    updateSummary(day);
}

function renderFoodList(day) {
    const listEl = document.getElementById('food-list');
    
    if (day.foods.length === 0) {
        listEl.innerHTML = '<p class="empty-state">No food logged yet. Tap + Food to start!</p>';
        return;
    }
    
    listEl.innerHTML = day.foods.map((food, index) => `
        <div class="item">
            <div class="item-info">
                <div class="item-name">${food.name}</div>
                <div class="item-details">
                    ${food.category ? food.category + ' • ' : ''}${food.portion || 'N/A'}
                </div>
                ${food.note ? `<div class="item-note">${food.note}</div>` : ''}
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
                <div class="item-value">${food.calories} kcal</div>
                <div class="item-actions">
                    <button class="item-delete" onclick="deleteFood(${index})">&times;</button>
                </div>
            </div>
        </div>
    `).join('');
}

function renderExerciseList(day) {
    const listEl = document.getElementById('exercise-list');
    
    if (day.exercises.length === 0) {
        listEl.innerHTML = '<p class="empty-state">No exercise logged yet. Tap + Exercise to start!</p>';
        return;
    }
    
    listEl.innerHTML = day.exercises.map((exercise, index) => `
        <div class="item">
            <div class="item-info">
                <div class="item-name">${exercise.name}</div>
                <div class="item-details">${exercise.durationMinutes} minutes</div>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
                <div class="item-value">${exercise.caloriesBurned || 0} kcal</div>
                <div class="item-actions">
                    <button class="item-delete" onclick="deleteExercise(${index})">×</button>
                </div>
            </div>
        </div>
    `).join('');
}

function updateSummary(day) {
    const totalEaten = day.foods.reduce((sum, food) => sum + (food.calories || 0), 0);
    const totalBurned = day.exercises.reduce((sum, ex) => sum + (ex.caloriesBurned || 0), 0);
    const net = totalEaten - totalBurned;
    
    document.getElementById('total-calories-eaten').textContent = totalEaten;
    document.getElementById('total-calories-burned').textContent = totalBurned;
    document.getElementById('net-calories').textContent = net;
}

// ===================================
// Food Operations
// ===================================

function addFood() {
    const name = document.getElementById('food-name').value.trim();
    const category = document.getElementById('food-category').value;
    const portion = document.getElementById('food-portion').value.trim();
    const note = document.getElementById('food-note').value.trim();
    const calories = parseInt(document.getElementById('food-calories').value);
    const saveAsPreset = document.getElementById('save-as-preset').checked;
    
    if (!name || isNaN(calories)) {
        customAlert('Please fill in food name and calories');
        return;
    }
    
    const day = getOrCreateDayData(currentDate);
    const food = {
        id: 'food-' + Date.now(),
        name: name,
        category: category,
        portion: portion,
        note: note,
        calories: calories
    };
    
    day.foods.push(food);
    saveData();
    
    // Save as preset if checked
    if (saveAsPreset) {
        const preset = {
            id: 'preset-' + Date.now(),
            name: name,
            defaultCalories: calories,
            description: portion ? `Portion: ${portion}` : ''
        };
        appData.presets.push(preset);
        saveData();
    }
    
    // Reset form and close
    document.getElementById('food-form').reset();
    closeModal('food-modal');
    loadTodayScreen();
}

function deleteFood(index) {
    const day = getDayData(currentDate);
    if (day) {
        day.foods.splice(index, 1);
        saveData();
        loadTodayScreen();
    }
}

// ===================================
// Exercise Operations
// ===================================

function addExercise() {
    const name = document.getElementById('exercise-name').value.trim();
    const duration = parseInt(document.getElementById('exercise-duration').value);
    const calories = parseInt(document.getElementById('exercise-calories').value) || 0;
    
    if (!name || isNaN(duration) || duration <= 0) {
        customAlert('Please enter exercise name and duration');
        return;
    }
    
    const day = getOrCreateDayData(currentDate);
    const exercise = {
        id: 'ex-' + Date.now(),
        name: name,
        durationMinutes: duration,
        caloriesBurned: calories
    };
    
    day.exercises.push(exercise);
    saveData();
    
    // Reset form and close
    document.getElementById('exercise-form').reset();
    closeModal('exercise-modal');
    loadTodayScreen();
}

function deleteExercise(index) {
    const day = getDayData(currentDate);
    if (day) {
        day.exercises.splice(index, 1);
        saveData();
        loadTodayScreen();
    }
}

// ===================================
// Preset Operations
// ===================================

function addPreset() {
    const name = document.getElementById('preset-name').value.trim();
    const calories = parseInt(document.getElementById('preset-calories').value);
    const description = document.getElementById('preset-description').value.trim();
    
    if (!name || isNaN(calories)) {
        customAlert('Please fill in preset name and calories');
        return;
    }
    
    if (editingPresetIndex !== null) {
        // Editing existing preset
        appData.presets[editingPresetIndex] = {
            ...appData.presets[editingPresetIndex],
            name: name,
            defaultCalories: calories,
            description: description,
            items: presetFoodItems.length > 0 ? [...presetFoodItems] : undefined
        };
        editingPresetIndex = null;
    } else {
        // Adding new preset
        const preset = {
            id: 'preset-' + Date.now(),
            name: name,
            defaultCalories: calories,
            description: description,
            items: presetFoodItems.length > 0 ? [...presetFoodItems] : undefined
        };
        appData.presets.push(preset);
    }
    
    saveData();
    
    // Reset form and modal title
    document.getElementById('preset-form').reset();
    presetFoodItems = [];
    updatePresetFoodItemsDisplay();
    document.querySelector('#preset-modal .modal-title').textContent = 'Create Preset Meal';
    closeModal('preset-modal');
    loadPresetsScreen();
}

async function deletePreset(index) {
    const confirmed = await customConfirm('Delete this preset?');
    if (confirmed) {
        appData.presets.splice(index, 1);
        saveData();
        loadPresetsScreen();
    }
}

let editingPresetIndex = null;
let presetFoodItems = [];

function editPreset(index) {
    editingPresetIndex = index;
    const preset = appData.presets[index];
    
    document.getElementById('preset-name').value = preset.name;
    document.getElementById('preset-calories').value = preset.defaultCalories;
    document.getElementById('preset-description').value = preset.description || '';
    
    // Load preset food items if they exist
    presetFoodItems = preset.items ? [...preset.items] : [];
    updatePresetFoodItemsDisplay();
    
    // Change modal title
    document.querySelector('#preset-modal .modal-title').textContent = 'Edit Preset Meal';
    
    openModal('preset-modal');
}

async function lookupCalories() {
    const name = document.getElementById('preset-item-name').value.trim();
    const caloriesInput = document.getElementById('preset-item-calories');
    const lookupBtn = document.getElementById('lookup-calories-btn');
    
    if (!name) {
        await customAlert('Please enter a food name first');
        return;
    }
    
    // Show loading state
    lookupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    lookupBtn.disabled = true;
    
    try {
        // Using USDA FoodData Central API (no API key required for basic search)
        const response = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(name)}&pageSize=1&api_key=DEMO_KEY`);
        const data = await response.json();
        
        if (data.foods && data.foods.length > 0) {
            const food = data.foods[0];
            // Find calories per 100g
            const calorieNutrient = food.foodNutrients.find(n => 
                n.nutrientName === 'Energy' && n.unitName === 'KCAL'
            );
            
            if (calorieNutrient) {
                const calories = Math.round(calorieNutrient.value);
                caloriesInput.value = calories;
                caloriesInput.focus();
            } else {
                await customAlert('Could not find calorie information for this food');
            }
        } else {
            await customAlert('Food not found. Please try a different name or enter calories manually.');
        }
    } catch (error) {
        console.error('Calorie lookup error:', error);
        await customAlert('Unable to look up calories. Please enter manually.');
    } finally {
        // Restore button
        lookupBtn.innerHTML = '<i class="fas fa-search"></i>';
        lookupBtn.disabled = false;
    }
}

function addPresetFoodItem() {
    const name = document.getElementById('preset-item-name').value.trim();
    const calories = parseInt(document.getElementById('preset-item-calories').value);
    
    if (!name || isNaN(calories)) {
        customAlert('Please enter item name and calories');
        return;
    }
    
    presetFoodItems.push({ name, calories });
    
    // Clear inputs
    document.getElementById('preset-item-name').value = '';
    document.getElementById('preset-item-calories').value = '';
    document.getElementById('preset-item-name').focus();
    
    updatePresetFoodItemsDisplay();
}

function removePresetFoodItem(index) {
    presetFoodItems.splice(index, 1);
    updatePresetFoodItemsDisplay();
}

function updatePresetFoodItemsDisplay() {
    const container = document.getElementById('preset-food-items');
    const emptyState = document.getElementById('preset-food-empty');
    
    if (presetFoodItems.length === 0) {
        container.innerHTML = '<p class="empty-state" id="preset-food-empty">No items added yet</p>';
        document.getElementById('preset-calories').value = '';
        document.getElementById('preset-calories-calculated').textContent = '';
        return;
    }
    
    // Calculate total calories
    const totalCalories = presetFoodItems.reduce((sum, item) => sum + item.calories, 0);
    
    // Update display
    container.innerHTML = presetFoodItems.map((item, index) => `
        <div class="preset-food-item">
            <div class="preset-item-info">
                <div class="preset-item-name">${item.name}</div>
                <div class="preset-item-calories">${item.calories} kcal</div>
            </div>
            <button type="button" class="preset-item-remove" onclick="removePresetFoodItem(${index})">&times;</button>
        </div>
    `).join('');
    
    // Auto-fill total calories
    document.getElementById('preset-calories').value = totalCalories;
    document.getElementById('preset-calories-calculated').textContent = `(auto-calculated from ${presetFoodItems.length} item${presetFoodItems.length > 1 ? 's' : ''})`;
}

function loadPresetsScreen() {
    const container = document.getElementById('presets-list');
    
    if (appData.presets.length === 0) {
        container.innerHTML = '<p class="empty-state">No presets yet. Create your first one!</p>';
        return;
    }
    
    container.innerHTML = appData.presets.map((preset, index) => `
        <div class="preset-card">
            <div class="preset-header">
                <div>
                    <div class="preset-name">${preset.name}</div>
                    ${preset.description ? `<div class="preset-description">${preset.description}</div>` : ''}
                </div>
                <div class="preset-calories">${preset.defaultCalories} kcal</div>
            </div>
            <div class="preset-actions">
                <button class="btn-secondary btn-sm" onclick="editPreset(${index})">Edit</button>
                <button class="btn-secondary btn-sm" onclick="deletePreset(${index})">Delete</button>
            </div>
        </div>
    `).join('');
}

function loadPresetSelectList() {
    const container = document.getElementById('preset-select-list');
    
    if (appData.presets.length === 0) {
        container.innerHTML = '<p class="empty-state">No presets available. Create one first!</p>';
        return;
    }
    
    container.innerHTML = appData.presets.map((preset) => `
        <div class="preset-select-item" onclick="addPresetToToday('${preset.id}')">
            <div>
                <div style="font-weight: 600;">${preset.name}</div>
                <div style="font-size: 12px; color: var(--text-muted);">${preset.description || ''}</div>
            </div>
            <div style="font-weight: 700; color: var(--primary);">${preset.defaultCalories} kcal</div>
        </div>
    `).join('');
}

function addPresetToToday(presetId) {
    const preset = appData.presets.find(p => p.id === presetId);
    if (!preset) return;
    
    const day = getOrCreateDayData(currentDate);
    const food = {
        id: 'food-' + Date.now(),
        name: preset.name,
        category: 'Other',
        portion: '',
        calories: preset.defaultCalories,
        fromPresetId: preset.id
    };
    
    day.foods.push(food);
    saveData();
    
    closeModal('preset-select-modal');
    loadTodayScreen();
}

// ===================================
// Graph
// ===================================

let chartInstance = null;

function renderGraph() {
    const daysWithWeight = appData.days.filter(d => d.weightLb !== null && d.weightLb !== undefined);
    
    if (daysWithWeight.length === 0) {
        document.getElementById('chart-summary').textContent = 'No weight data yet. Start logging your weight!';
        return;
    }
    
    // Sort by date
    daysWithWeight.sort((a, b) => a.date.localeCompare(b.date));
    
    const labels = daysWithWeight.map(d => {
        const date = new Date(d.date + 'T12:00:00');
        return `${date.getMonth() + 1}/${date.getDate()}`;
    });
    
    const data = daysWithWeight.map(d => currentUnit === 'lb' ? d.weightLb : d.weightKg);
    
    const ctx = document.getElementById('weight-chart');
    
    // Destroy previous chart
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `Weight (${currentUnit})`,
                data: data,
                borderColor: '#BF3143',
                backgroundColor: 'rgba(191, 49, 67, 0.1)',
                tension: 0.3,
                pointBackgroundColor: '#A52A3A',
                pointBorderColor: '#BF3143',
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(1) + ' ' + currentUnit;
                        }
                    }
                }
            }
        }
    });
    
    // Update summary
    const firstWeight = data[0];
    const lastWeight = data[data.length - 1];
    const change = lastWeight - firstWeight;
    const changeText = change >= 0 ? `+${change.toFixed(1)}` : change.toFixed(1);
    
    document.getElementById('chart-summary').textContent = 
        `${daysWithWeight.length} days tracked • ${changeText} ${currentUnit} change`;
}

// ===================================
// Modal Utilities
// ===================================

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

// ===================================
// Export/Import Data
// ===================================

function exportData() {
    const dataStr = JSON.stringify(appData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().split('T')[0];
    link.download = `tiny-deficit-backup-${date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    customAlert('Data exported successfully! ✓');
}

async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            
            // Validate data structure
            if (!imported.days || !imported.presets) {
                await customAlert('Invalid data file format');
                return;
            }
            
            // Confirm overwrite
            if (appData.days.length > 0 || appData.presets.length > 0) {
                const confirmed = await customConfirm('This will replace your current data. Continue?');
                if (!confirmed) return;
            }
            
            appData = imported;
            saveData();
            loadTodayScreen();
            
            await customAlert('Data imported successfully! ✓');
        } catch (error) {
            await customAlert('Error importing data. Please check the file.');
            console.error('Import error:', error);
        }
    };
    
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
}
