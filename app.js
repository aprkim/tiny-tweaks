// ===================================
// Tiny Tweaks - App Logic
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
    presets: [],
    exercisePresets: []
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

    // Initialize sync pill based on existing sync code
    const existingCode = getSyncCode();
    if (existingCode) {
        updateSyncPill(true);
        updateSyncCodeDisplay(existingCode);
    }
});

// ===================================
// Data Storage
// ===================================

function loadData() {
    const stored = localStorage.getItem('tiny-tweaks-data');
    if (stored) {
        try {
            appData = JSON.parse(stored);
            // Ensure backwards compatibility - add exercisePresets if it doesn't exist
            if (!appData.exercisePresets) {
                appData.exercisePresets = [];
            }
        } catch (e) {
            console.error('Error loading data:', e);
            appData = { days: [], presets: [], exercisePresets: [] };
        }
    }
}

function saveData() {
    localStorage.setItem('tiny-tweaks-data', JSON.stringify(appData));
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
        foodItems = [];
        updateFoodItemsList();
        openModal('food-modal');
    });
    
    document.getElementById('cancel-food-btn').addEventListener('click', () => {
        document.getElementById('food-form').reset();
        foodItems = [];
        updateFoodItemsList();
        closeModal('food-modal');
    });
    
    document.getElementById('food-form').addEventListener('submit', (e) => {
        e.preventDefault();
        addFood();
    });
    
    // Food search and add
    document.getElementById('food-search-btn').addEventListener('click', searchFood);
    document.getElementById('food-add-item-btn').addEventListener('click', addFoodItem);
    
    // Allow Enter key to search in food modal
    document.getElementById('food-search-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchFood();
        }
    });
    
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

    document.getElementById('add-new-preset-from-select-btn').addEventListener('click', () => {
        closeModal('preset-select-modal');
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

    // Exercise preset modals
    document.getElementById('add-exercise-preset-btn').addEventListener('click', () => {
        loadExercisePresetSelectList();
        openModal('exercise-preset-select-modal');
    });

    document.getElementById('add-new-exercise-preset-btn').addEventListener('click', () => {
        document.getElementById('exercise-preset-form').reset();
        document.querySelector('#exercise-preset-modal .modal-title').textContent = 'Create Preset Exercise';
        openModal('exercise-preset-modal');
    });

    document.getElementById('add-new-exercise-preset-from-select-btn').addEventListener('click', () => {
        closeModal('exercise-preset-select-modal');
        document.getElementById('exercise-preset-form').reset();
        document.querySelector('#exercise-preset-modal .modal-title').textContent = 'Create Preset Exercise';
        openModal('exercise-preset-modal');
    });

    document.getElementById('cancel-exercise-preset-btn').addEventListener('click', () => {
        document.getElementById('exercise-preset-form').reset();
        closeModal('exercise-preset-modal');
    });

    document.getElementById('exercise-preset-form').addEventListener('submit', (e) => {
        e.preventDefault();
        addExercisePreset();
    });

    // Preset tabs
    document.querySelectorAll('.preset-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.presetTab;
            switchPresetTab(tabName);
        });
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

    // Clear all weight data button
    document.getElementById('clear-all-weight-btn').addEventListener('click', confirmClearAllWeight);

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
        loadExercisePresetsScreen();
    } else if (screenName === 'progress') {
        renderGraph();
    }
}

function switchPresetTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.preset-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`.preset-tab[data-preset-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.preset-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-presets-tab`).classList.add('active');
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
                ${food.category || food.portion ? `<div class="item-details">
                    ${food.category ? food.category + ' • ' : ''}${food.portion || ''}
                </div>` : ''}
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
    const foodName = document.getElementById('food-name').value.trim();
    const note = document.getElementById('food-note').value.trim();
    const totalCalories = parseInt(document.getElementById('food-total-calories').value);
    
    if (!foodName) {
        customAlert('Please enter a food name');
        return;
    }
    
    if (isNaN(totalCalories) || totalCalories <= 0) {
        customAlert('Please add at least one food item');
        return;
    }
    
    const day = getOrCreateDayData(currentDate);
    
    // Create a single food entry with the given name and all items' calories combined
    const food = {
        id: 'food-' + Date.now(),
        name: foodName,
        note: note,
        calories: totalCalories
    };
    day.foods.push(food);
    
    saveData();
    
    // Reset form
    document.getElementById('food-form').reset();
    foodItems = [];
    updateFoodItemsList();
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
let foodItems = [];
let editingExercisePresetIndex = null;

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
        const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(name)}&search_simple=1&action=process&json=1&page_size=1`);
        const data = await response.json();
        
        if (data.products && data.products.length > 0) {
            const product = data.products[0];
            // Energy is in kJ per 100g, convert to kcal
            const energyKcal = product.nutriments['energy-kcal_100g'] || product.nutriments['energy-kcal'];
            
            if (energyKcal) {
                const calories = Math.round(energyKcal);
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

async function searchFood() {
    const searchInput = document.getElementById('food-search-input');
    const caloriesInput = document.getElementById('food-search-calories');
    const searchBtn = document.getElementById('food-search-btn');
    const name = searchInput.value.trim();
    
    if (!name) {
        await customAlert('Please enter a food name to search');
        return;
    }
    
    // Show loading state
    searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    searchBtn.disabled = true;
    
    try {
        const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(name)}&search_simple=1&action=process&json=1&page_size=1`);
        const data = await response.json();
        
        if (data.products && data.products.length > 0) {
            const product = data.products[0];
            // Energy is in kJ per 100g, convert to kcal
            const energyKcal = product.nutriments['energy-kcal_100g'] || product.nutriments['energy-kcal'];
            
            if (energyKcal) {
                const calories = Math.round(energyKcal);
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

function addFoodItem() {
    const name = document.getElementById('food-search-input').value.trim();
    const calories = parseInt(document.getElementById('food-search-calories').value);
    
    if (!name) {
        customAlert('Please enter a food name');
        return;
    }
    
    if (isNaN(calories) || calories <= 0) {
        customAlert('Please search for calories first or enter a valid amount');
        return;
    }
    
    foodItems.push({ name, calories });
    
    // Clear inputs
    document.getElementById('food-search-input').value = '';
    document.getElementById('food-search-calories').value = '';
    document.getElementById('food-search-input').focus();
    
    updateFoodItemsList();
}

function removePresetItem(index) {
    presetItems.splice(index, 1);
    updatePresetItemsList();
}

function removeFoodItem(index) {
    foodItems.splice(index, 1);
    updateFoodItemsList();
}

function updatePresetItemsList() {
    const container = document.getElementById('preset-items-list');
    const totalInput = document.getElementById('preset-total-calories');
    
    if (presetItems.length === 0) {
        container.innerHTML = '<p class="empty-state">No items added yet</p>';
        // Don't reset total if user manually entered a value
        if (!totalInput.value || totalInput.value === '0') {
            totalInput.value = '';
        }
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

function updateFoodItemsList() {
    const container = document.getElementById('food-items-list');
    const totalInput = document.getElementById('food-total-calories');
    
    if (foodItems.length === 0) {
        container.innerHTML = '<p class="empty-state">No items added yet</p>';
        // Don't reset total if user manually entered a value
        if (!totalInput.value || totalInput.value === '0') {
            totalInput.value = '';
        }
        return;
    }
    
    // Calculate total
    const total = foodItems.reduce((sum, item) => sum + item.calories, 0);
    
    // Update display
    container.innerHTML = foodItems.map((item, index) => `
        <div class="preset-list-item">
            <div class="preset-list-item-info">
                <div class="preset-list-item-name">${item.name}</div>
            </div>
            <span class="preset-list-item-calories">${item.calories} kcal</span>
            <button type="button" class="preset-list-item-remove" onclick="removeFoodItem(${index})">&times;</button>
        </div>
    `).join('');
    
    // Update total
    totalInput.value = total;
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
// Exercise Preset Operations
// ===================================

function addExercisePreset() {
    const name = document.getElementById('exercise-preset-name').value.trim();
    const duration = parseInt(document.getElementById('exercise-preset-duration').value);
    const calories = parseInt(document.getElementById('exercise-preset-calories').value) || 0;
    const description = document.getElementById('exercise-preset-description').value.trim();

    if (!name) {
        customAlert('Please enter a preset name');
        return;
    }

    if (isNaN(duration) || duration <= 0) {
        customAlert('Please enter a valid duration');
        return;
    }

    if (editingExercisePresetIndex !== null) {
        // Editing existing preset
        appData.exercisePresets[editingExercisePresetIndex] = {
            ...appData.exercisePresets[editingExercisePresetIndex],
            name: name,
            durationMinutes: duration,
            caloriesBurned: calories,
            description: description
        };
        editingExercisePresetIndex = null;
    } else {
        // Adding new preset
        const preset = {
            id: 'exercise-preset-' + Date.now(),
            name: name,
            durationMinutes: duration,
            caloriesBurned: calories,
            description: description
        };
        appData.exercisePresets.push(preset);
    }

    saveData();

    // Reset form and modal title
    document.getElementById('exercise-preset-form').reset();
    document.querySelector('#exercise-preset-modal .modal-title').textContent = 'Create Preset Exercise';
    closeModal('exercise-preset-modal');
    loadExercisePresetsScreen();
}

async function deleteExercisePreset(index) {
    appData.exercisePresets.splice(index, 1);
    saveData();
    loadExercisePresetsScreen();
}

function editExercisePreset(index) {
    editingExercisePresetIndex = index;
    const preset = appData.exercisePresets[index];

    document.getElementById('exercise-preset-name').value = preset.name;
    document.getElementById('exercise-preset-duration').value = preset.durationMinutes;
    document.getElementById('exercise-preset-calories').value = preset.caloriesBurned || '';
    document.getElementById('exercise-preset-description').value = preset.description || '';

    // Change modal title
    document.querySelector('#exercise-preset-modal .modal-title').textContent = 'Edit Preset Exercise';

    openModal('exercise-preset-modal');
}

function loadExercisePresetsScreen() {
    const container = document.getElementById('exercise-presets-list');

    if (appData.exercisePresets.length === 0) {
        container.innerHTML = '<p class="empty-state">No presets yet. Create your first one!</p>';
        return;
    }

    container.innerHTML = appData.exercisePresets.map((preset, index) => `
        <div class="preset-card">
            <div class="preset-header">
                <div>
                    <div class="preset-name">${preset.name}</div>
                    ${preset.description ? `<div class="preset-description">${preset.description}</div>` : ''}
                </div>
                <div class="preset-calories">${preset.durationMinutes} min${preset.caloriesBurned ? ` • ${preset.caloriesBurned} kcal` : ''}</div>
            </div>
            <div class="preset-actions">
                <button class="btn-secondary btn-sm exercise-preset-edit-btn" data-index="${index}">Edit</button>
                <button class="btn-secondary btn-sm exercise-preset-delete-btn" data-index="${index}">Delete</button>
            </div>
        </div>
    `).join('');

    // Attach event listeners
    container.querySelectorAll('.exercise-preset-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            editExercisePreset(index);
        });
    });

    container.querySelectorAll('.exercise-preset-delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const index = parseInt(btn.dataset.index);
            await deleteExercisePreset(index);
        });
    });
}

function loadExercisePresetSelectList() {
    const container = document.getElementById('exercise-preset-select-list');

    if (appData.exercisePresets.length === 0) {
        container.innerHTML = '<p class="empty-state">No presets available. Create one first!</p>';
        return;
    }

    container.innerHTML = appData.exercisePresets.map((preset) => `
        <div class="preset-select-item" onclick="addExercisePresetToToday('${preset.id}')">
            <div>
                <div style="font-weight: 600;">${preset.name}</div>
                <div style="font-size: 12px; color: var(--text-muted);">${preset.description || ''}</div>
            </div>
            <div style="font-weight: 700; color: var(--primary);">${preset.durationMinutes} min${preset.caloriesBurned ? ` • ${preset.caloriesBurned} kcal` : ''}</div>
        </div>
    `).join('');
}

function addExercisePresetToToday(presetId) {
    const preset = appData.exercisePresets.find(p => p.id === presetId);
    if (!preset) return;

    const day = getOrCreateDayData(currentDate);
    const exercise = {
        id: 'ex-' + Date.now(),
        name: preset.name,
        durationMinutes: preset.durationMinutes,
        caloriesBurned: preset.caloriesBurned || 0,
        fromPresetId: preset.id
    };

    day.exercises.push(exercise);
    saveData();

    closeModal('exercise-preset-select-modal');
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
        document.getElementById('weight-data-card').style.display = 'none';
        return;
    }

    // Sort by date
    daysWithWeight.sort((a, b) => a.date.localeCompare(b.date));

    // Fill in missing dates with interpolated values
    const filledData = [];
    for (let i = 0; i < daysWithWeight.length - 1; i++) {
        const currentDay = daysWithWeight[i];
        const nextDay = daysWithWeight[i + 1];

        filledData.push(currentDay);

        // Calculate days between current and next
        const currentDate = new Date(currentDay.date + 'T12:00:00');
        const nextDate = new Date(nextDay.date + 'T12:00:00');
        const daysBetween = Math.floor((nextDate - currentDate) / (1000 * 60 * 60 * 24)) - 1;

        // Add interpolated points for missing days
        if (daysBetween > 0) {
            const currentWeight = currentUnit === 'lb' ? currentDay.weightLb : currentDay.weightKg;
            const nextWeight = currentUnit === 'lb' ? nextDay.weightLb : nextDay.weightKg;
            const weightDiff = nextWeight - currentWeight;
            const weightStep = weightDiff / (daysBetween + 1);

            for (let j = 1; j <= daysBetween; j++) {
                const interpolatedDate = new Date(currentDate);
                interpolatedDate.setDate(interpolatedDate.getDate() + j);
                const dateStr = getLocalDateString(interpolatedDate);
                const interpolatedWeight = currentWeight + (weightStep * j);

                filledData.push({
                    date: dateStr,
                    weightLb: currentUnit === 'lb' ? interpolatedWeight : kgToLb(interpolatedWeight),
                    weightKg: currentUnit === 'kg' ? interpolatedWeight : lbToKg(interpolatedWeight),
                    isInterpolated: true
                });
            }
        }
    }
    // Add the last actual data point
    filledData.push(daysWithWeight[daysWithWeight.length - 1]);

    const labels = filledData.map(d => {
        const date = new Date(d.date + 'T12:00:00');
        return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    const data = filledData.map(d => currentUnit === 'lb' ? d.weightLb : d.weightKg);

    // Create point styles - smaller and lighter for interpolated points
    const pointRadii = filledData.map(d => d.isInterpolated ? 2 : 5);
    const pointBackgroundColors = filledData.map(d => d.isInterpolated ? 'rgba(191, 49, 67, 0.3)' : '#A52A3A');
    const pointBorderColors = filledData.map(d => d.isInterpolated ? 'rgba(191, 49, 67, 0.5)' : '#BF3143');

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
                pointBackgroundColor: pointBackgroundColors,
                pointBorderColor: pointBorderColors,
                pointRadius: pointRadii,
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

    // Render weight data list
    renderWeightDataList(daysWithWeight);
}

function renderWeightDataList(daysWithWeight) {
    const listEl = document.getElementById('weight-data-list');
    const cardEl = document.getElementById('weight-data-card');

    if (daysWithWeight.length === 0) {
        cardEl.style.display = 'none';
        return;
    }

    cardEl.style.display = 'block';

    // Sort by date descending (most recent first)
    const sortedDays = [...daysWithWeight].sort((a, b) => b.date.localeCompare(a.date));

    listEl.innerHTML = sortedDays.map((day) => {
        const date = new Date(day.date + 'T12:00:00');
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
        const weight = currentUnit === 'lb' ? day.weightLb : day.weightKg;

        return `
            <div class="item">
                <div class="item-info">
                    <div class="item-name">${dateStr}</div>
                    <div class="item-details">${dayName}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div class="item-value">${weight.toFixed(1)} ${currentUnit}</div>
                    <div class="item-actions">
                        <button class="item-delete" onclick="deleteWeightData('${day.date}')">&times;</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function deleteWeightData(date) {
    const confirmed = await customConfirm(`Delete weight data for ${date}?`);
    if (!confirmed) return;

    const day = getDayData(date);
    if (day) {
        day.weightLb = null;
        day.weightKg = null;
        saveData();
        renderGraph();
    }
}

async function confirmClearAllWeight() {
    const confirmed = await customConfirm('Clear all weight data? This cannot be undone.');
    if (!confirmed) return;

    // Clear weight from all days
    appData.days.forEach(day => {
        day.weightLb = null;
        day.weightKg = null;
    });
    saveData();
    renderGraph();
    customAlert('All weight data cleared successfully');
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
            foodItems = [];
            updateFoodItemsList();
        } else if (modal.id === 'exercise-modal') {
            document.getElementById('exercise-form').reset();
        } else if (modal.id === 'preset-modal') {
            document.getElementById('preset-form').reset();
            presetItems = [];
            updatePresetItemsList();
        } else if (modal.id === 'exercise-preset-modal') {
            document.getElementById('exercise-preset-form').reset();
        }
        modal.classList.remove('active');
    });
}

// ===================================
// Settings - Data Management
// ===================================

async function confirmResetBrowser() {
    const confirmed = await customConfirm('This will clear all your data from this browser. Are you sure?');
    if (confirmed) {
        resetBrowser();
    }
}

function resetBrowser() {
    localStorage.removeItem('tiny-tweaks-data');
    appData = { days: [], presets: [], exercisePresets: [] };
    customAlert('Browser data has been reset. Refreshing...');
    setTimeout(() => {
        location.reload();
    }, 1500);
}

async function confirmDeleteAllData() {
    const confirmed = await customConfirm('Delete all data permanently? This action cannot be undone.');
    if (confirmed) {
        deleteAllData();
    }
}

function deleteAllData() {
    localStorage.removeItem('tiny-tweaks-data');
    appData = { days: [], presets: [], exercisePresets: [] };
    customAlert('All data has been permanently deleted. Refreshing...');
    setTimeout(() => {
        location.reload();
    }, 1500);
}


// ===================================
// Sync Code Functions
// ===================================

// Generate a memorable 6-word sync code
function generateSyncCode() {
    const words = [
        'apple', 'banana', 'cherry', 'dragon', 'eagle', 'forest',
        'garden', 'harbor', 'island', 'jungle', 'kitchen', 'lemon',
        'mountain', 'novel', 'ocean', 'piano', 'quiet', 'river',
        'sunset', 'thunder', 'umbrella', 'village', 'winter', 'yellow'
    ];
    const code = [];
    for (let i = 0; i < 6; i++) {
        code.push(words[Math.floor(Math.random() * words.length)]);
    }
    return code.join('-');
}

// Get sync code from localStorage
function getSyncCode() {
    return localStorage.getItem('tiny-body-sync-code');
}

// Update sync code display
function updateSyncCodeDisplay(code) {
    const el = document.getElementById('syncCodeText');
    if (el && code) el.textContent = code;
}

// Update sync pill
function updateSyncPill(isConnected) {
    const pill = document.getElementById('syncPill');
    if (!pill) return;
    if (isConnected) {
        pill.textContent = 'ON';
        pill.style.background = '#E7F1EB';
        pill.style.border = '1px solid #C8DCD0';
        pill.style.color = '#3F6B52';
    } else {
        pill.textContent = 'OFF';
        pill.style.background = '#f3f4f6';
        pill.style.border = '1px solid #e5e7eb';
        pill.style.color = '#6b7280';
    }
}

// Show sync code card
function showSyncCodeCard() {
    const card = document.getElementById('syncCodeCard');
    const textEl = document.getElementById('syncCodeText');
    let code = getSyncCode();

    // If no code exists, generate one
    if (!code) {
        code = generateSyncCode();
        localStorage.setItem('tiny-body-sync-code', code);
        updateSyncCodeDisplay(code);
        updateSyncPill(true);
    }

    if (textEl) textEl.textContent = code || '—';
    if (card) card.style.display = 'flex';
}

// Copy sync code to clipboard
async function copySyncCode() {
    const code = getSyncCode();
    if (!code) return;

    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(code);
            const btn = document.querySelector('.sync-copy-btn');
            if (btn) {
                const originalText = btn.textContent;
                btn.textContent = 'Copied!';
                setTimeout(() => {
                    btn.textContent = originalText;
                }, 2000);
            }
        }
    } catch (e) {
        console.error('Failed to copy sync code:', e);
    }
}

// Submit sync code from input
function submitSyncCode() {
    const input = document.getElementById('enterSyncCodeInput');
    const code = input.value.trim().toLowerCase();
    const linkBtn = document.querySelector('.sync-link-btn');

    if (!code) {
        customAlert('Please enter a sync code');
        return;
    }

    // Save the sync code
    localStorage.setItem('tiny-body-sync-code', code);
    syncCodeForFirebase = code;
    updateSyncCodeDisplay(code);
    updateSyncPill(true);

    // Show the sync code card with the entered code
    const card = document.getElementById('syncCodeCard');
    const textEl = document.getElementById('syncCodeText');
    if (textEl) textEl.textContent = code;
    if (card) card.style.display = 'flex';

    // Restart Firebase sync with new code
    if (unsubscribe) unsubscribe();
    isFirstLoad = true;
    if (firebaseReady) {
        setupFirebaseSync();
    }

    // Change button text to "Linked"
    if (linkBtn) {
        linkBtn.textContent = 'Linked';
        linkBtn.disabled = true;
    }

    input.value = '';
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
    link.download = `tiny-tweaks-backup-${date}.json`;
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

// ===================================
// Firebase Sync
// ===================================

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBycFP3HfMF7tyshQixvwzoaAE3Df8Fz_8",
    authDomain: "tiny-wins25.firebaseapp.com",
    projectId: "tiny-wins25",
    storageBucket: "tiny-wins25.firebasestorage.app",
    messagingSenderId: "497477643272",
    appId: "1:497477643272:web:9f8e43fbffd18003e5f5bd"
};

// Initialize Firebase
let db, auth;
let firebaseReady = false;
let syncCodeForFirebase = null;
let unsubscribe = null;
let isFirstLoad = true;

try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();

    // Enable offline persistence
    db.enablePersistence({ synchronizeTabs: true })
        .catch((err) => {
            if (err.code === 'failed-precondition') {
                console.warn('⚠️ Persistence: Multiple tabs open');
            } else if (err.code === 'unimplemented') {
                console.warn('⚠️ Persistence not available');
            }
        });

    console.log('✅ Firebase initialized');

    // Auto sign-in anonymously
    auth.onAuthStateChanged((user) => {
        if (user) {
            firebaseReady = true;
            syncCodeForFirebase = getSyncCode();

            console.log('✅ User ID:', user.uid);
            console.log('🔑 Sync Code:', syncCodeForFirebase);

            if (syncCodeForFirebase) {
                setupFirebaseSync();
            }
        } else {
            auth.signInAnonymously()
                .then(() => console.log('✅ Signed in anonymously'))
                .catch((err) => console.error('❌ Auth failed:', err));
        }
    });

} catch (error) {
    console.error('❌ Firebase init failed:', error);
}

// Setup Firebase real-time sync
function setupFirebaseSync() {
    if (!firebaseReady || !syncCodeForFirebase) return;

    const userDoc = db.collection('tinyBody').doc(syncCodeForFirebase);

    // Listen for remote changes
    unsubscribe = userDoc.onSnapshot((doc) => {
        if (doc.exists) {
            const remoteData = doc.data();

            // Apply remote data
            if (remoteData.days) appData.days = remoteData.days;
            if (remoteData.presets) appData.presets = remoteData.presets;
            if (remoteData.exercisePresets) appData.exercisePresets = remoteData.exercisePresets;

            // Save to localStorage
            localStorage.setItem('tiny-tweaks-data', JSON.stringify(appData));

            // Refresh current screen
            const activeScreen = document.querySelector('.screen.active');
            if (activeScreen) {
                const screenId = activeScreen.id;
                if (screenId === 'today-screen') {
                    loadTodayScreen();
                } else if (screenId === 'presets-screen') {
                    loadPresetsScreen();
                    loadExercisePresetsScreen();
                } else if (screenId === 'progress-screen') {
                    renderGraph();
                }
            }

            console.log(isFirstLoad ? '✅ Loaded from Firestore' : '✅ Synced from another device');
        } else if (!doc.exists && isFirstLoad) {
            // No remote data yet, push local data
            saveToFirestore();
            console.log('✅ Initial sync: Local → Firestore');
        }

        isFirstLoad = false;
    }, (error) => {
        console.error('❌ Sync error:', error);

        if (error.code === 'permission-denied') {
            console.warn('⚠️ Firestore rules not deployed yet');
            firebaseReady = false;
        }
    });
}

// Save to Firestore
async function saveToFirestore() {
    if (!firebaseReady || !syncCodeForFirebase) return;

    try {
        await db.collection('tinyBody').doc(syncCodeForFirebase).set({
            days: appData.days,
            presets: appData.presets,
            exercisePresets: appData.exercisePresets,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log('✅ Saved to Firestore');
    } catch (error) {
        console.error('❌ Save failed:', error);

        if (error.code === 'permission-denied') {
            console.warn('⚠️ Firestore rules not deployed. Using localStorage only.');
            firebaseReady = false;
        }
    }
}

// Hook into existing saveData function
const originalSaveData = saveData;
saveData = function() {
    originalSaveData();
    saveToFirestore();
};
