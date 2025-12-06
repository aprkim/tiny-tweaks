// ===================================
// Tiny Deficit - App Logic
// ===================================

// Helper to get local date string (YYYY-MM-DD)
function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ===================================
// Custom Alert & Confirm
// ===================================

function customAlert(message) {
    return new Promise((resolve) => {
        document.getElementById('alert-message').textContent = message;
        openModal('custom-alert-modal');
        
        const handleOk = () => {
            closeModal('custom-alert-modal');
            document.getElementById('alert-ok-btn').removeEventListener('click', handleOk);
            resolve();
        };
        
        document.getElementById('alert-ok-btn').addEventListener('click', handleOk);
    });
}

function customConfirm(message) {
    return new Promise((resolve) => {
        document.getElementById('confirm-message').textContent = message;
        openModal('custom-confirm-modal');
        
        const handleOk = () => {
            closeModal('custom-confirm-modal');
            cleanup();
            resolve(true);
        };
        
        const handleCancel = () => {
            closeModal('custom-confirm-modal');
            cleanup();
            resolve(false);
        };
        
        const cleanup = () => {
            document.getElementById('confirm-ok-btn').removeEventListener('click', handleOk);
            document.getElementById('confirm-cancel-btn').removeEventListener('click', handleCancel);
        };
        
        document.getElementById('confirm-ok-btn').addEventListener('click', handleOk);
        document.getElementById('confirm-cancel-btn').addEventListener('click', handleCancel);
    });
}

// ===================================
// Data Model
// ===================================

// Data Model
let appData = {
    days: [],
    presets: []
};

// Current state
let currentDate = getLocalDateString();
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
        currentDate = getLocalDateString(date);
        loadTodayScreen();
    });
    
    document.getElementById('next-day').addEventListener('click', () => {
        const date = new Date(currentDate + 'T12:00:00');
        date.setDate(date.getDate() + 1);
        currentDate = getLocalDateString(date);
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
        document.getElementById('food-form').reset();
        openModal('food-modal');
    });
    
    document.getElementById('cancel-food-btn').addEventListener('click', () => {
        document.getElementById('food-form').reset();
        closeModal('food-modal');
    });
    
    document.getElementById('food-form').addEventListener('submit', (e) => {
        e.preventDefault();
        addFood();
    });
    
    // Lookup food calories
    document.getElementById('lookup-food-calories-btn').addEventListener('click', lookupFoodCalories);
    
    // Exercise modal
    document.getElementById('add-exercise-btn').addEventListener('click', () => {
        document.getElementById('exercise-form').reset();
        openModal('exercise-modal');
    });
    
    document.getElementById('cancel-exercise-btn').addEventListener('click', () => {
        document.getElementById('exercise-form').reset();
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
        document.getElementById('preset-form').reset();
        presetItems = [];
        updatePresetItemsList();
        document.querySelector('#preset-modal .modal-title').textContent = 'Create Preset Meal';
        openModal('preset-modal');
    });
    
    document.getElementById('cancel-preset-btn').addEventListener('click', () => {
        document.getElementById('preset-form').reset();
        presetItems = [];
        updatePresetItemsList();
        closeModal('preset-modal');
    });
    
    document.getElementById('preset-form').addEventListener('submit', (e) => {
        e.preventDefault();
        addPreset();
    });
    
    // Preset search and add
    document.getElementById('preset-search-btn').addEventListener('click', searchPresetFood);
    document.getElementById('preset-add-item-btn').addEventListener('click', addPresetItem);
    
    // Allow Enter key to search
    document.getElementById('preset-search-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchPresetFood();
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
    const calories = parseInt(document.getElementById('preset-total-calories').value);
    const description = document.getElementById('preset-description').value.trim();
    
    if (!name) {
        customAlert('Please enter a preset name');
        return;
    }
    
    if (isNaN(calories) || calories <= 0) {
        customAlert('Please add at least one food item');
        return;
    }
    
    if (editingPresetIndex !== null) {
        // Editing existing preset
        appData.presets[editingPresetIndex] = {
            ...appData.presets[editingPresetIndex],
            name: name,
            defaultCalories: calories,
            description: description,
            items: [...presetItems]
        };
        editingPresetIndex = null;
    } else {
        // Adding new preset
        const preset = {
            id: 'preset-' + Date.now(),
            name: name,
            defaultCalories: calories,
            description: description,
            items: [...presetItems]
        };
        appData.presets.push(preset);
    }
    
    saveData();
    
    // Reset form and modal title
    document.getElementById('preset-form').reset();
    presetItems = [];
    updatePresetItemsList();
    document.querySelector('#preset-modal .modal-title').textContent = 'Create Preset Meal';
    closeModal('preset-modal');
    loadPresetsScreen();
}

async function deletePreset(index) {
    appData.presets.splice(index, 1);
    saveData();
    loadPresetsScreen();
}

let editingPresetIndex = null;
let presetItems = [];

function editPreset(index) {
    editingPresetIndex = index;
    const preset = appData.presets[index];
    
    document.getElementById('preset-name').value = preset.name;
    document.getElementById('preset-description').value = preset.description || '';
    
    // Load preset items if they exist
    presetItems = preset.items ? [...preset.items] : [];
    updatePresetItemsList();
    
    // Change modal title
    document.querySelector('#preset-modal .modal-title').textContent = 'Edit Preset Meal';
    
    openModal('preset-modal');
}

async function searchPresetFood() {
    const searchInput = document.getElementById('preset-search-input');
    const caloriesInput = document.getElementById('preset-search-calories');
    const searchBtn = document.getElementById('preset-search-btn');
    const name = searchInput.value.trim();
    
    if (!name) {
        await customAlert('Please enter a food name to search');
        return;
    }
    
    // Show loading state
    searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    searchBtn.disabled = true;
    
    try {
        const response = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(name)}&pageSize=1&api_key=DEMO_KEY`);
        const data = await response.json();
        
        if (data.foods && data.foods.length > 0) {
            const food = data.foods[0];
            const calorieNutrient = food.foodNutrients.find(n => 
                n.nutrientName === 'Energy' && n.unitName === 'KCAL'
            );
            
            if (calorieNutrient) {
                const calories = Math.round(calorieNutrient.value);
                caloriesInput.value = calories;
            } else {
                await customAlert('Could not find calorie information for this food');
                caloriesInput.value = '';
            }
        } else {
            await customAlert('Food not found. Please try a different name.');
            caloriesInput.value = '';
        }
    } catch (error) {
        console.error('Search error:', error);
        await customAlert('Unable to search. Please try again.');
        caloriesInput.value = '';
    } finally {
        searchBtn.innerHTML = '<i class="fas fa-search"></i>';
        searchBtn.disabled = false;
    }
}

function addPresetItem() {
    const name = document.getElementById('preset-search-input').value.trim();
    const calories = parseInt(document.getElementById('preset-search-calories').value);
    
    if (!name) {
        customAlert('Please enter a food name');
        return;
    }
    
    if (isNaN(calories) || calories <= 0) {
        customAlert('Please search for calories first or enter a valid amount');
        return;
    }
    
    presetItems.push({ name, calories });
    
    // Clear inputs
    document.getElementById('preset-search-input').value = '';
    document.getElementById('preset-search-calories').value = '';
    document.getElementById('preset-search-input').focus();
    
    updatePresetItemsList();
}

function removePresetItem(index) {
    presetItems.splice(index, 1);
    updatePresetItemsList();
}

function updatePresetItemsList() {
    const container = document.getElementById('preset-items-list');
    const totalInput = document.getElementById('preset-total-calories');
    
    if (presetItems.length === 0) {
        container.innerHTML = '<p class="empty-state">No items added yet</p>';
        totalInput.value = 0;
        return;
    }
    
    // Calculate total
    const total = presetItems.reduce((sum, item) => sum + item.calories, 0);
    
    // Update display
    container.innerHTML = presetItems.map((item, index) => `
        <div class="preset-list-item">
            <div class="preset-list-item-info">
                <div class="preset-list-item-name">${item.name}</div>
            </div>
            <span class="preset-list-item-calories">${item.calories} kcal</span>
            <button type="button" class="preset-list-item-remove" onclick="removePresetItem(${index})">&times;</button>
        </div>
    `).join('');
    
    // Update total
    totalInput.value = total;
}

async function lookupFoodCalories() {
    const name = document.getElementById('food-name').value.trim();
    const caloriesInput = document.getElementById('food-calories');
    const lookupBtn = document.getElementById('lookup-food-calories-btn');
    
    if (!name) {
        await customAlert('Please enter a food name first');
        return;
    }
    
    // Show loading state
    lookupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    lookupBtn.disabled = true;
    
    try {
        const response = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(name)}&pageSize=1&api_key=DEMO_KEY`);
        const data = await response.json();
        
        if (data.foods && data.foods.length > 0) {
            const food = data.foods[0];
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
        lookupBtn.innerHTML = '<i class="fas fa-search"></i>';
        lookupBtn.disabled = false;
    }
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
                <button class="btn-secondary btn-sm preset-edit-btn" data-index="${index}">Edit</button>
                <button class="btn-secondary btn-sm preset-delete-btn" data-index="${index}">Delete</button>
            </div>
        </div>
    `).join('');
    
    // Attach event listeners
    container.querySelectorAll('.preset-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            editPreset(index);
        });
    });
    
    container.querySelectorAll('.preset-delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const index = parseInt(btn.dataset.index);
            await deletePreset(index);
        });
    });
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
        // Reset forms when closing modals
        if (modal.id === 'food-modal') {
            document.getElementById('food-form').reset();
        } else if (modal.id === 'exercise-modal') {
            document.getElementById('exercise-form').reset();
        } else if (modal.id === 'preset-modal') {
            document.getElementById('preset-form').reset();
            presetFoodItems = [];
            updatePresetFoodItemsDisplay();
        }
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
    const date = getLocalDateString();
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
