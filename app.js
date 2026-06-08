// Global State variables
let state = {
    habits: {
        // Transportation
        ownsVehicle: true,
        vehicleType: 'sedan',
        fuelType: 'petrol',
        carDistance: 100, // weekly km
        publicTransit: 2, // weekly hours
        flights: 1, // annual count
        
        // Home Energy
        electricityBill: 80, // monthly USD
        gasBill: 40, // monthly USD
        cleanEnergyPct: 0, // 0-100
        householdMembers: 2,
        
        // Diet
        dietType: 'medium-meat',
        foodWaste: 20, // percentage
        
        // Habits & Waste
        clothingPurchases: 2, // monthly
        electronicsPurchases: 1, // annual
        recyclePaper: true,
        recyclePlastic: true,
        recycleGlass: false,
        recycleMetal: false
    },
    points: 0,
    completedChallenges: [],
    chatHistory: [],
    region: 'global',
    offsetAmount: 0, // 0-100% simulated offset
    triviaState: {
        active: false,
        questionIndex: 0
    },
    quizState: {
        active: false,
        currentStep: 0,
        tempData: {}
    }
};

// Emission factors (in kg CO2e)
const EMISSION_FACTORS = {
    transport: {
        // base per km
        car: {
            suv: 0.24,
            sedan: 0.17,
            compact: 0.13,
            motorcycle: 0.10
        },
        fuel: {
            petrol: 1.0,
            diesel: 1.1,
            hybrid: 0.65,
            electric: 0.3 // assuming average grid
        },
        transitPerHour: 1.2, // average speed 30km/h * transit factor
        flightPerTrip: 250 // average short/mid haul flight
    },
    energy: {
        // cost-to-emissions conversions:
        // Assume electricity cost is $0.15/kWh
        // Grid intensity by region (kg CO2e per kWh)
        gridIntensity: {
            us: 0.43,
            eu: 0.23,
            in: 0.78,
            global: 0.47
        },
        electricityCostPerKwh: 0.15,
        
        // Assume gas cost is $1.20 per therm
        // Natural gas emissions: 5.3 kg CO2e per therm
        gasCostPerTherm: 1.20,
        gasPerTherm: 5.3
    },
    diet: {
        // Annual emissions in kg CO2e
        'heavy-meat': 2500,
        'medium-meat': 1700,
        'low-meat': 1200,
        'vegetarian': 800,
        'vegan': 500,
        // waste factor: food waste adds up to 25% extra footprint
        wasteMultiplier: 0.5 // weight of food waste impact
    },
    waste: {
        clothingPerItem: 10,
        electronicsPerItem: 120, // annualized build cost
        recyclingOffset: 25 // yearly reduction (kg) per category recycled
    },
    regionalAverages: {
        // Annual tons CO2e per capita
        us: 15.5,
        eu: 6.5,
        in: 1.9,
        global: 4.8
    }
};

// Challenges list
const CHALLENGES = [
    {
        id: 'car-free',
        title: 'Commute Clean',
        desc: 'Swap 3 short car trips (<5km) for walking, cycling, or public transit this week.',
        pts: 50,
        co2: 12, // kg saved
        category: 'transport'
    },
    {
        id: 'meatless-mon',
        title: 'Meatless Days',
        desc: 'Go completely vegetarian or vegan for 3 days this week.',
        pts: 40,
        co2: 9,
        category: 'food'
    },
    {
        id: 'unplug-vampires',
        title: 'Vampire Power Cut',
        desc: 'Unplug all unused chargers and electronics on standby mode before bed.',
        pts: 20,
        co2: 4,
        category: 'energy'
    },
    {
        id: 'cool-thermostat',
        title: 'Eco Thermostat',
        desc: 'Keep your thermostat 2°C higher in summer or cooler in winter for 5 days.',
        pts: 30,
        co2: 10,
        category: 'energy'
    },
    {
        id: 'zero-waste',
        title: 'Sort Master',
        desc: 'Ensure 100% of your recyclable plastics, paper, metal, and glass are sorted and cleaned.',
        pts: 30,
        co2: 5,
        category: 'waste'
    },
    {
        id: 'secondhand-first',
        title: 'Pre-loved Purchases',
        desc: 'Buy second-hand or borrow instead of buying brand new products.',
        pts: 45,
        co2: 15,
        category: 'waste'
    },
    {
        id: 'line-dry',
        title: 'Dry Naturally',
        desc: 'Line-dry your laundry in the sun/air instead of running a machine tumble dryer.',
        pts: 25,
        co2: 8,
        category: 'energy'
    }
];

// Badge / Ranks details
const RANKS = [
    { name: 'Eco Seed', threshold: 0, icon: '🌱' },
    { name: 'Carbon Cutter', threshold: 100, icon: '✂️' },
    { name: 'Green Guardian', threshold: 250, icon: '🛡️' },
    { name: 'Eco Warrior', threshold: 450, icon: '⚔️' },
    { name: 'Earth Protector', threshold: 700, icon: '🌍' }
];

// Initialize DOM and App logic
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    setupTabNavigation();
    setupTrackerSliders();
    setupSelectors();
    
    // Attach Offset Simulator listener
    const offsetSlider = document.getElementById('offset-simulate-slider');
    if (offsetSlider) {
        offsetSlider.value = state.offsetAmount || 0;
        document.getElementById('offset-simulate-val').textContent = (state.offsetAmount || 0) + '% offsetted';
        document.getElementById('offset-points-badge').textContent = `+${Math.round((state.offsetAmount || 0) / 2)} Points`;
        
        offsetSlider.addEventListener('input', (e) => {
            state.offsetAmount = parseFloat(e.target.value) || 0;
            document.getElementById('offset-simulate-val').textContent = state.offsetAmount + '% offsetted';
            document.getElementById('offset-points-badge').textContent = `+${Math.round(state.offsetAmount / 2)} Points`;
            saveState();
            renderAll();
        });
    }

    renderAll();
    
    // EcoBot greeting
    if (state.chatHistory.length === 0) {
        addBotMessage("Hi! I'm EcoBot, your smart carbon assistant. 🌱\n\nI can help you understand your footprint, suggest personalized reductions, and log daily habits directly from our chat. \n\nWhere would you like to start?", [
            { text: "Take Onboarding Quiz 📝", action: "start_quiz" },
            { text: "Quick Footprint Check 📊", action: "analyze" },
            { text: "Give me eco tips 💡", action: "tips" },
            { text: "Play Eco-Trivia Game 🧠", action: "start_trivia" }
        ]);
    } else {
        restoreChat();
    }

    // Attach Save Button listener
    document.getElementById('btn-save-habits').addEventListener('click', saveHabitsFromForm);
    document.getElementById('btn-refresh-insights').addEventListener('click', () => {
        generateInsights();
        showToast("Insights refreshed and recalculated!");
    });
    
    document.getElementById('btn-clear-chat').addEventListener('click', clearChatHistory);
    document.getElementById('chat-form').addEventListener('submit', handleChatSubmit);
});

// Load State from LocalStorage
function loadState() {
    const saved = localStorage.getItem('ecosync_state');
    if (saved) {
        try {
            state = JSON.parse(saved);
            // Verify structure matches
            if (!state.habits) state.habits = {};
            if (!state.completedChallenges) state.completedChallenges = [];
            if (!state.chatHistory) state.chatHistory = [];
            if (state.offsetAmount === undefined) state.offsetAmount = 0;
            if (!state.triviaState) state.triviaState = { active: false, questionIndex: 0 };
        } catch (e) {
            console.error("Failed to parse local state", e);
        }
    }
}

// Save State to LocalStorage
function saveState() {
    localStorage.setItem('ecosync_state', JSON.stringify(state));
}

// Tab switcher
function setupTabNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            switchTab(tab);
        });
    });
}

function switchTab(tabId) {
    // Update navigation styles
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Update content tabs
    document.querySelectorAll('.tab-content').forEach(content => {
        if (content.id === `tab-${tabId}`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}

// Setup Activity Tracker Sliders dynamic labels
function setupTrackerSliders() {
    const sliders = [
        { id: 'car-distance', suffix: ' km/week' },
        { id: 'public-transit', suffix: ' hours/week' },
        { id: 'clean-energy', suffix: '% green power' },
        { id: 'food-waste', suffix: '% wasted' }
    ];

    sliders.forEach(slider => {
        const input = document.getElementById(slider.id);
        const valSpan = document.getElementById(`${slider.id}-val`);
        if (input && valSpan) {
            // Initial render
            valSpan.textContent = input.value + slider.suffix;
            
            // On input change
            input.addEventListener('input', (e) => {
                valSpan.textContent = e.target.value + slider.suffix;
            });
        }
    });

    // Custom toggle logic for vehicle ownership
    const ownsCheckbox = document.getElementById('owns-vehicle');
    const toggleText = document.getElementById('vehicle-toggle-text');
    const detailsContainer = document.getElementById('vehicle-details-container');

    if (ownsCheckbox) {
        ownsCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                toggleText.textContent = "Yes, I drive a car";
                detailsContainer.style.display = "block";
            } else {
                toggleText.textContent = "No, I don't drive";
                detailsContainer.style.display = "none";
            }
        });
    }

    // Category navigation inside log habits tab
    const catButtons = document.querySelectorAll('.tracker-cat-btn');
    catButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            catButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const category = btn.getAttribute('data-category');
            document.querySelectorAll('.tracker-form-section').forEach(section => {
                if (section.id === `form-${category}`) {
                    section.classList.add('active');
                } else {
                    section.classList.remove('active');
                }
            });
        });
    });
}

// Counters increment/decrement
function adjustCounter(id, delta) {
    const input = document.getElementById(id);
    if (input) {
        const val = parseInt(input.value) || 0;
        const min = parseInt(input.min) || 0;
        const max = parseInt(input.max) || 100;
        const newVal = Math.max(min, Math.min(max, val + delta));
        input.value = newVal;
    }
}

// Selectors
function setupSelectors() {
    const regionSelect = document.getElementById('region-select');
    if (regionSelect) {
        regionSelect.value = state.region || 'global';
        regionSelect.addEventListener('change', (e) => {
            state.region = e.target.value;
            saveState();
            renderAll();
            showToast(`Region set to ${e.target.options[e.target.selectedIndex].text}`);
        });
    }
}

// Save Habits from Input Form
function saveHabitsFromForm() {
    const h = state.habits;
    
    // Transport inputs
    h.ownsVehicle = document.getElementById('owns-vehicle').checked;
    h.vehicleType = document.getElementById('vehicle-type').value;
    h.fuelType = document.getElementById('fuel-type').value;
    h.carDistance = parseFloat(document.getElementById('car-distance').value) || 0;
    h.publicTransit = parseFloat(document.getElementById('public-transit').value) || 0;
    h.flights = parseInt(document.getElementById('flights').value) || 0;

    // Energy inputs
    h.electricityBill = parseFloat(document.getElementById('electricity').value) || 0;
    h.gasBill = parseFloat(document.getElementById('gas').value) || 0;
    h.cleanEnergyPct = parseFloat(document.getElementById('clean-energy').value) || 0;
    h.householdMembers = parseInt(document.getElementById('house-members').value) || 1;

    // Food inputs
    h.dietType = document.getElementById('diet-type').value;
    h.foodWaste = parseFloat(document.getElementById('food-waste').value) || 0;

    // Habits inputs
    h.clothingPurchases = parseInt(document.getElementById('clothing-purchases').value) || 0;
    h.electronicsPurchases = parseInt(document.getElementById('electronics-purchases').value) || 0;
    h.recyclePaper = document.getElementById('recycle-paper').checked;
    h.recyclePlastic = document.getElementById('recycle-plastic').checked;
    h.recycleGlass = document.getElementById('recycle-glass').checked;
    h.recycleMetal = document.getElementById('recycle-metal').checked;

    saveState();
    renderAll();

    const saveMsg = document.getElementById('save-status-msg');
    saveMsg.textContent = "Carbon stats updated successfully!";
    setTimeout(() => {
        saveMsg.textContent = "";
    }, 3000);

    showToast("Habits logged. Dashboard updated!");
}

// Read current state values and populate form
function populateFormFromState() {
    const h = state.habits;
    if (!h) return;

    // Transport inputs
    document.getElementById('owns-vehicle').checked = h.ownsVehicle;
    document.getElementById('vehicle-type').value = h.vehicleType;
    document.getElementById('fuel-type').value = h.fuelType;
    document.getElementById('car-distance').value = h.carDistance;
    document.getElementById('car-distance-val').textContent = h.carDistance + ' km/week';
    document.getElementById('public-transit').value = h.publicTransit;
    document.getElementById('public-transit-val').textContent = h.publicTransit + ' hours/week';
    document.getElementById('flights').value = h.flights;

    const detailsContainer = document.getElementById('vehicle-details-container');
    const toggleText = document.getElementById('vehicle-toggle-text');
    if (h.ownsVehicle) {
        toggleText.textContent = "Yes, I drive a car";
        detailsContainer.style.display = "block";
    } else {
        toggleText.textContent = "No, I don't drive";
        detailsContainer.style.display = "none";
    }

    // Energy inputs
    document.getElementById('electricity').value = h.electricityBill;
    document.getElementById('gas').value = h.gasBill;
    document.getElementById('clean-energy').value = h.cleanEnergyPct;
    document.getElementById('clean-energy-val').textContent = h.cleanEnergyPct + '% green power';
    document.getElementById('house-members').value = h.householdMembers;

    // Food inputs
    document.getElementById('diet-type').value = h.dietType;
    document.getElementById('food-waste').value = h.foodWaste;
    document.getElementById('food-waste-val').textContent = h.foodWaste + '% wasted';

    // Habits inputs
    document.getElementById('clothing-purchases').value = h.clothingPurchases;
    document.getElementById('electronics-purchases').value = h.electronicsPurchases;
    document.getElementById('recycle-paper').checked = h.recyclePaper;
    document.getElementById('recycle-plastic').checked = h.recyclePlastic;
    document.getElementById('recycle-glass').checked = h.recycleGlass;
    document.getElementById('recycle-metal').checked = h.recycleMetal;
}

// ----------------- CARBON CALCULATOR -----------------
function calculateEmissions() {
    const h = state.habits;
    const region = state.region || 'global';
    
    // 1. TRANSPORTATION EMISSIONS (Annual Tons CO2e)
    let transportAnnual = 0;
    if (h.ownsVehicle) {
        const distancePerYear = h.carDistance * 52; // km/year
        const factor = EMISSION_FACTORS.transport.car[h.vehicleType] || 0.17;
        const fuelMultiplier = EMISSION_FACTORS.transport.fuel[h.fuelType] || 1.0;
        transportAnnual += distancePerYear * factor * fuelMultiplier;
    }
    // Public Transit
    const transitDistancePerYear = (h.publicTransit * 30) * 52; // 30 km/h avg speed
    transportAnnual += transitDistancePerYear * 0.04; // 0.04 kg/km average
    // Flights
    transportAnnual += h.flights * EMISSION_FACTORS.transport.flightPerTrip; // annual total in kg
    
    const transportTons = transportAnnual / 1000;

    // 2. ENERGY EMISSIONS (Annual Tons CO2e)
    // Electricity conversion: (Bill / cost per kWh) * grid intensity * 12 months
    const gridIntensity = EMISSION_FACTORS.energy.gridIntensity[region] || 0.47;
    const cleanPowerOffset = (100 - h.cleanEnergyPct) / 100;
    const electricityAnnualKwh = (h.electricityBill / EMISSION_FACTORS.energy.electricityCostPerKwh) * 12;
    const electricityAnnualKg = electricityAnnualKwh * gridIntensity * cleanPowerOffset;

    // Natural Gas conversion: (Bill / cost per therm) * emissions * 12 months
    const gasAnnualTherms = (h.gasBill / EMISSION_FACTORS.energy.gasCostPerTherm) * 12;
    const gasAnnualKg = gasAnnualTherms * EMISSION_FACTORS.energy.gasPerTherm;

    // Divide energy by household members
    const energyTons = ((electricityAnnualKg + gasAnnualKg) / Math.max(1, h.householdMembers)) / 1000;

    // 3. DIET EMISSIONS (Annual Tons CO2e)
    const baseDietKg = EMISSION_FACTORS.diet[h.dietType] || 1700;
    // Food waste impact
    const wasteFactor = 1 + (h.foodWaste / 100) * EMISSION_FACTORS.diet.wasteMultiplier;
    const dietTons = (baseDietKg * wasteFactor) / 1000;

    // 4. CONSUMPTION & WASTE (Annual Tons CO2e)
    let wasteAnnualKg = (h.clothingPurchases * 12 * EMISSION_FACTORS.waste.clothingPerItem) + 
                        (h.electronicsPurchases * EMISSION_FACTORS.waste.electronicsPerItem);
    
    // Subtract recycling offsets
    let recyclingOffsetTotal = 0;
    if (h.recyclePaper) recyclingOffsetTotal += EMISSION_FACTORS.waste.recyclingOffset;
    if (h.recyclePlastic) recyclingOffsetTotal += EMISSION_FACTORS.waste.recyclingOffset;
    if (h.recycleGlass) recyclingOffsetTotal += EMISSION_FACTORS.waste.recyclingOffset;
    if (h.recycleMetal) recyclingOffsetTotal += EMISSION_FACTORS.waste.recyclingOffset;
    
    wasteAnnualKg = Math.max(50, wasteAnnualKg - recyclingOffsetTotal); // clamp minimum at 50kg for baseline consumption
    const wasteTons = wasteAnnualKg / 1000;

    // TOTALS
    const totalRaw = transportTons + energyTons + dietTons + wasteTons;
    
    // Subtract Active Challenges Completed reduction values
    let totalCompletedChallengeReductions = 0;
    state.completedChallenges.forEach(cid => {
        const challenge = CHALLENGES.find(c => c.id === cid);
        if (challenge) {
            // challenges savings are weekly/monthly. annualized:
            totalCompletedChallengeReductions += (challenge.co2 * 52) / 1000; // annual tons
        }
    });

    // Subtract simulated carbon offset
    const offsetTons = totalRaw * ((state.offsetAmount || 0) / 100);
    const totalProjected = Math.max(0.0, totalRaw - totalCompletedChallengeReductions - offsetTons);

    return {
        transport: transportTons,
        energy: energyTons,
        diet: dietTons,
        waste: wasteTons,
        totalRaw: totalRaw,
        reductions: totalCompletedChallengeReductions + offsetTons,
        totalProjected: totalProjected
    };
}

// ----------------- RENDER ENGINE -----------------
function renderAll() {
    populateFormFromState();
    
    // Calculate values
    const emissions = calculateEmissions();
    
    // Compute total points including offsets
    const totalPointsDisplay = state.points + Math.round((state.offsetAmount || 0) / 2);

    // Update Dashboard Metrics
    const totalCo2Span = document.getElementById('dashboard-total-co2');
    if (totalCo2Span) {
        totalCo2Span.textContent = emissions.totalProjected.toFixed(1);
    }
    
    // Active challenges stats
    const activeChallengesSpan = document.getElementById('dashboard-active-challenges');
    if (activeChallengesSpan) {
        // Active = total challenges minus completed ones
        activeChallengesSpan.textContent = (CHALLENGES.length - state.completedChallenges.length).toString();
    }
    
    // Points stats
    document.getElementById('header-points').textContent = totalPointsDisplay;
    const ptsValueDashboard = document.getElementById('dashboard-points');
    if (ptsValueDashboard) ptsValueDashboard.textContent = totalPointsDisplay;
    const ptsBadgeTotal = document.getElementById('points-total-badge');
    if (ptsBadgeTotal) ptsBadgeTotal.textContent = `${totalPointsDisplay} Points`;
    
    // Reduction Impact stat
    const reductionSpan = document.getElementById('dashboard-reduction');
    if (reductionSpan) {
        // reduction in kg/year
        reductionSpan.textContent = `${Math.round(emissions.reductions * 1000)} kg/yr`;
    }

    // Comparison to regional average
    const region = state.region || 'global';
    const regionAvg = EMISSION_FACTORS.regionalAverages[region] || 4.8;
    const comparisonText = document.getElementById('comparison-text');
    const comparisonFill = document.getElementById('comparison-fill');
    
    if (comparisonText && comparisonFill) {
        const pctOfAvg = (emissions.totalProjected / regionAvg) * 100;
        
        let labelText = "";
        if (pctOfAvg < 60) {
            labelText = `${Math.round(100 - pctOfAvg)}% below average (Excellent! 🌱)`;
            comparisonFill.style.background = "linear-gradient(90deg, #10b981 0%, #34d399 100%)";
        } else if (pctOfAvg <= 100) {
            labelText = `${Math.round(100 - pctOfAvg)}% below average (Good 🌿)`;
            comparisonFill.style.background = "linear-gradient(90deg, #10b981 0%, #f59e0b 100%)";
        } else {
            labelText = `${Math.round(pctOfAvg - 100)}% above average (Needs work ⚠️)`;
            comparisonFill.style.background = "linear-gradient(90deg, #f59e0b 0%, #f43f5e 100%)";
        }
        
        comparisonText.textContent = labelText;
        
        // Cap visual representation between 5% and 100%
        const visualWidth = Math.max(5, Math.min(100, pctOfAvg));
        comparisonFill.style.width = `${visualWidth}%`;
    }

    // Update User Badges and Rank Progress
    updateRankAndBadges(totalPointsDisplay);

    // Render SVG Doughnut Chart
    renderDoughnutChart(emissions);

    // Render Historical Trend Chart
    renderHistoricalChart(emissions);

    // Render Offset Trees status
    renderOffsetCard(emissions);

    // Render Challenges
    renderChallengesList();

    // Render Badges panel
    renderBadgesGrid();

    // Generate smart insights
    generateInsights(emissions);
}

function updateRankAndBadges(displayPoints) {
    let currentRank = RANKS[0];
    let nextRank = RANKS[1];
    
    const activePoints = typeof displayPoints === 'number' ? displayPoints : state.points;
    
    // Find highest rank unlocked
    for (let i = 0; i < RANKS.length; i++) {
        if (activePoints >= RANKS[i].threshold) {
            currentRank = RANKS[i];
            nextRank = RANKS[i+1] || null;
        }
    }

    // Header badge text
    document.getElementById('header-badge').textContent = `${currentRank.icon} ${currentRank.name}`;
    
    // Challenges tab rank text
    const rankLabel = document.getElementById('current-rank-label');
    if (rankLabel) {
        rankLabel.textContent = `Rank: ${currentRank.name} ${currentRank.icon}`;
    }

    // Progress to next rank
    const progressFill = document.getElementById('points-progress-fill');
    const nextRankLabel = document.getElementById('next-rank-points');
    
    if (nextRankLabel && progressFill) {
        if (nextRank) {
            const range = nextRank.threshold - currentRank.threshold;
            const progressWithinRange = state.points - currentRank.threshold;
            const pct = Math.max(0, Math.min(100, (progressWithinRange / range) * 100));
            
            progressFill.style.width = `${pct}%`;
            nextRankLabel.textContent = `Need ${nextRank.threshold - state.points} points for ${nextRank.name}`;
        } else {
            progressFill.style.width = '100%';
            nextRankLabel.textContent = 'Ultimate Rank Unlocked! 🏅';
        }
    }
}

// Custom SVG Doughnut Chart Renderer
function renderDoughnutChart(emissions) {
    const svg = document.getElementById('svg-doughnut');
    const legend = document.getElementById('chart-legend');
    const overlayVal = document.getElementById('chart-overlay-value');
    
    if (!svg || !legend) return;

    // Filter values and calculate totals
    const categories = [
        { key: 'transport', label: 'Transport', color: 'var(--accent-blue)', val: emissions.transport },
        { key: 'energy', label: 'Home Energy', color: 'var(--accent-orange)', val: emissions.energy },
        { key: 'diet', label: 'Diet & Food', color: 'var(--accent-rose)', val: emissions.diet },
        { key: 'waste', label: 'Habits/Waste', color: 'var(--primary)', val: emissions.waste }
    ];

    const totalVal = categories.reduce((sum, cat) => sum + cat.val, 0);
    
    // Draw SVG segments
    // Circumference of radius 40 circle is 2 * Math.PI * 40 ≈ 251.327
    const C = 251.327;
    let accumulatedOffset = 0;
    
    // Clear old segments
    const oldSegments = svg.querySelectorAll('.chart-segment');
    oldSegments.forEach(s => s.remove());
    
    let chartHTML = '';
    let legendHTML = '';
    
    if (totalVal === 0) {
        overlayVal.textContent = "0%";
        legend.innerHTML = `<div class="empty-state">No tracked footprint. Enter data.</div>`;
        return;
    }

    categories.forEach(cat => {
        const pct = cat.val / totalVal;
        const dashLen = pct * C;
        const dashOffset = -accumulatedOffset;
        
        // Inject SVG path segment
        // stroke-dasharray = "dashLength totalLength"
        const path = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        path.setAttribute("class", "chart-segment");
        path.setAttribute("cx", "50");
        path.setAttribute("cy", "50");
        path.setAttribute("r", "40");
        path.setAttribute("fill", "transparent");
        path.setAttribute("stroke", cat.color);
        path.setAttribute("stroke-width", "10");
        path.setAttribute("stroke-dasharray", `${dashLen} ${C}`);
        path.setAttribute("stroke-dashoffset", dashOffset.toString());
        path.setAttribute("style", "transition: var(--transition-smooth);");
        
        // Add hover labels
        path.addEventListener('mouseover', () => {
            overlayVal.textContent = `${Math.round(pct * 100)}%`;
            overlayVal.style.color = cat.color;
        });
        path.addEventListener('mouseout', () => {
            overlayVal.textContent = `${Math.round((1 - (emissions.reductions / emissions.totalRaw)) * 100)}%`;
            overlayVal.style.color = 'var(--text-main)';
        });

        svg.appendChild(path);
        
        accumulatedOffset += dashLen;

        // Build legend
        legendHTML += `
            <div class="legend-item">
                <span class="legend-color" style="background-color: ${cat.color}"></span>
                <span>${cat.label}</span>
                <span class="legend-val">${cat.val.toFixed(1)} t</span>
            </div>
        `;
    });

    legend.innerHTML = legendHTML;
    
    // Default center overlay shows the tracked % (excluding direct reductions)
    const activeReductionPct = emissions.totalRaw > 0 ? (1 - (emissions.reductions / emissions.totalRaw)) * 100 : 100;
    overlayVal.textContent = `${Math.max(0, Math.round(activeReductionPct))}%`;
    overlayVal.style.color = 'var(--text-main)';
}

function renderHistoricalChart(emissions) {
    const container = document.getElementById('trend-bar-chart');
    if (!container) return;

    // Last 3 weeks are pre-populated historical entries to show data trend
    const w1 = 12.4;
    const w2 = 10.8;
    const w3 = 9.2;
    // Current projected footprint
    const w4 = emissions.totalProjected;
    
    const weeks = [
        { label: 'Wk 1', val: w1 },
        { label: 'Wk 2', val: w2 },
        { label: 'Wk 3', val: w3 },
        { label: 'Current', val: w4, isCurrent: true }
    ];

    const maxVal = Math.max(w1, w2, w3, w4, 15.0); // Baseline scale limit

    let html = '';
    weeks.forEach(w => {
        const pctHeight = Math.max(5, (w.val / maxVal) * 100);
        
        html += `
            <div class="trend-bar-container">
                <div class="trend-bar" style="height: ${pctHeight}%; ${w.isCurrent ? '' : 'background: rgba(255, 255, 255, 0.08); border: 1px solid var(--border-color); opacity: 0.7;'}">
                    <span class="trend-bar-val">${w.val.toFixed(1)}t</span>
                </div>
                <span class="trend-bar-label">${w.label}</span>
            </div>
        `;
    });

    container.innerHTML = html;
}

function renderOffsetCard(emissions) {
    const offsetTrees = document.getElementById('offset-trees');
    if (!offsetTrees) return;

    // 1 mature tree absorbs about 22 kg of CO2 per year = 0.022 tons.
    // Trees needed = emissions.totalProjected / 0.022
    const treesNeeded = Math.round(emissions.totalProjected / 0.022);
    offsetTrees.textContent = treesNeeded.toLocaleString();
}

// ----------------- CHALLENGES ENGINE -----------------
function renderChallengesList() {
    const container = document.getElementById('challenges-container');
    if (!container) return;

    let html = '';
    
    CHALLENGES.forEach(c => {
        const isCompleted = state.completedChallenges.includes(c.id);
        
        html += `
            <div class="challenge-item ${isCompleted ? 'completed' : ''}" id="challenge-${c.id}">
                <div class="challenge-checkbox ${isCompleted ? 'checked' : ''}" onclick="toggleChallenge('${c.id}')">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <div class="challenge-info">
                    <span class="challenge-title">${c.title}</span>
                    <p class="challenge-desc">${c.desc}</p>
                </div>
                <div class="challenge-points-badge">
                    <span class="challenge-pts">+${c.pts} pts</span>
                    <span class="challenge-co2">-${c.co2} kg CO2e</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    // Update pending challenges badge in sidebar
    const pendingCount = CHALLENGES.length - state.completedChallenges.length;
    const badge = document.getElementById('pending-challenges-badge');
    if (badge) {
        if (pendingCount > 0) {
            badge.style.display = 'block';
            badge.textContent = pendingCount.toString();
        } else {
            badge.style.display = 'none';
        }
    }
}

function toggleChallenge(id) {
    const index = state.completedChallenges.indexOf(id);
    const challenge = CHALLENGES.find(c => c.id === id);
    
    if (!challenge) return;

    if (index === -1) {
        // Complete challenge
        state.completedChallenges.push(id);
        state.points += challenge.pts;
        showToast(`Challenge Met! +${challenge.pts} EcoPoints! 🎉`);
        
        // Add response in bot chat if active
        addBotMessage(`Awesome job completing the **${challenge.title}** challenge! You saved **${challenge.co2} kg** of CO2 and earned **${challenge.pts} EcoPoints**. Keep it up! 🌟`);
    } else {
        // Uncheck challenge
        state.completedChallenges.splice(index, 1);
        state.points = Math.max(0, state.points - challenge.pts);
        showToast(`Challenge undone. -${challenge.pts} EcoPoints.`);
    }

    saveState();
    renderAll();
}

// ----------------- BADGES GRID RENDERER -----------------
function renderBadgesGrid() {
    const container = document.getElementById('badges-container');
    if (!container) return;

    let html = '';
    
    RANKS.forEach(rank => {
        const isUnlocked = state.points >= rank.threshold;
        
        html += `
            <div class="badge-card ${isUnlocked ? 'unlocked' : ''}">
                <div class="badge-icon-wrapper">
                    <span style="font-size: 1.75rem">${rank.icon}</span>
                </div>
                <span class="badge-name">${rank.name}</span>
                <span class="badge-req">${isUnlocked ? 'Unlocked' : `Requires ${rank.threshold} pts`}</span>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ----------------- PERSONALIZED INSIGHTS GENERATION -----------------
function generateInsights(emissions) {
    const container = document.getElementById('insights-panel');
    if (!container) return;

    if (!emissions) {
        emissions = calculateEmissions();
    }

    // Threshold details
    const insights = [];

    // Check if user has entered data (all direct baselines should not be 0)
    if (emissions.totalRaw === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No insights generated yet. Please enter your carbon habit logs or complete the EcoBot Onboarding Quiz to get personalized reduction strategies.</p>
                <button class="btn btn-primary" onclick="switchTab('tracker')">Set Up Profile</button>
            </div>
        `;
        return;
    }

    const h = state.habits;

    // 1. High transport driver
    if (emissions.transport > emissions.totalRaw * 0.4 && h.carDistance > 80 && h.ownsVehicle) {
        const saving = (h.carDistance * 0.5 * 52 * 0.17).toFixed(0); // savings in kg if reduced by 50%
        insights.push({
            category: 'transport',
            title: 'Reduce Car Travel',
            desc: `Transport makes up ${Math.round((emissions.transport/emissions.totalRaw)*100)}% of your footprint. Commuting by walking, cycling, or transit just 2 days a week would prevent ~${saving} kg of CO2 emissions annually.`,
            impact: `~${saving} kg/yr`
        });
    }

    // 2. Flight driver
    if (h.flights >= 3) {
        const saving = 250; // short flight footprint
        insights.push({
            category: 'transport',
            title: 'Choose Trains Over Short Flights',
            desc: `You take ${h.flights} flights yearly. Swapping one short-haul flight for high-speed rail can reduce that trip's emissions by 85%.`,
            impact: `-${saving} kg/trip`
        });
    }

    // 3. Clean energy upgrade
    if (h.cleanEnergyPct < 50 && h.electricityBill > 50) {
        const potentialSaving = Math.round((emissions.energy * (1 - h.cleanEnergyPct/100)) * 0.8 * 1000);
        insights.push({
            category: 'energy',
            title: 'Enroll in Clean Power Plan',
            desc: `Your home power uses standard local grid electricity. Switching to 100% renewable grid options or installing solar panels can eliminate up to ${potentialSaving} kg of emissions annually.`,
            impact: `~${potentialSaving} kg/yr`
        });
    }

    // 4. Standby energy vampire
    if (h.electricityBill > 80 && !state.completedChallenges.includes('unplug-vampires')) {
        insights.push({
            category: 'energy',
            title: 'Slay Standby Vampire Power',
            desc: 'Devices on standby make up 5-10% of household electricity bills. Try unplugging consoles, TVs, and microwave clocks at night or use smart power strips.',
            impact: '~60 kg/yr'
        });
    }

    // 5. Heavy Meat diet
    if (h.dietType === 'heavy-meat' || h.dietType === 'medium-meat') {
        const isHeavy = h.dietType === 'heavy-meat';
        const reductionSaving = isHeavy ? 800 : 500; // saving if switching meat consumption down
        insights.push({
            category: 'food',
            title: 'Adopt a Low-Carbon Diet',
            desc: `Your diet carries a higher footprint. Shifting to low-meat or pescatarian alternatives (e.g. swapping beef/pork for poultry, fish, and legumes) can save up to ${reductionSaving} kg of CO2 annually.`,
            impact: `~${reductionSaving} kg/yr`
        });
    }

    // 6. Food waste reduction
    if (h.foodWaste > 15) {
        const baseline = EMISSION_FACTORS.diet[h.dietType] || 1700;
        const wasteSaving = Math.round(baseline * (h.foodWaste - 5)/100 * 0.5);
        insights.push({
            category: 'food',
            title: 'Reduce Kitchen Food Waste',
            desc: `You throw away ${h.foodWaste}% of your food. Plan weekly shopping list, store food properly, and compost scraps. Reducing waste to 5% prevents rotting organic trash emissions.`,
            impact: `~${wasteSaving} kg/yr`
        });
    }

    // 7. Fast fashion
    if (h.clothingPurchases >= 3) {
        insights.push({
            category: 'waste',
            title: 'Curb Fast Fashion Purchases',
            desc: 'Manufacturing new textiles generates heavy industrial carbon. Consider buying vintage, clothing swaps, or investing in higher quality items with longer wear life cycles.',
            impact: `~${h.clothingPurchases * 5 * 12} kg/yr`
        });
    }

    // 8. Recycling boost
    if (!h.recycleGlass || !h.recycleMetal) {
        insights.push({
            category: 'waste',
            title: 'Expand Recycling Sorting',
            desc: 'Recycling aluminum cans and glass requires 95% less energy than processing virgin raw materials. Enable recycling bins for glass/metals in your home.',
            impact: '~50 kg/yr'
        });
    }

    // Render insights
    let html = '';
    
    // Select top 3 relevant insights
    const topInsights = insights.slice(0, 3);
    
    if (topInsights.length === 0) {
        html = `
            <div class="insight-card waste">
                <div class="insight-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <div class="insight-details">
                    <h4>Excellent Carbon Score!</h4>
                    <p>Your habits are highly optimized. Continue logging regularly, take on active challenges, and share your eco-badges on social media to inspire others!</p>
                </div>
                <span class="insight-impact">Top Tier 🌟</span>
            </div>
        `;
    } else {
        topInsights.forEach(ins => {
            let svgIcon = '';
            if (ins.category === 'transport') {
                svgIcon = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>';
            } else if (ins.category === 'energy') {
                svgIcon = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>';
            } else if (ins.category === 'food') {
                svgIcon = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>';
            } else {
                svgIcon = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
            }

            html += `
                <div class="insight-card ${ins.category}">
                    <div class="insight-icon">${svgIcon}</div>
                    <div class="insight-details">
                        <h4>${ins.title}</h4>
                        <p>${ins.desc}</p>
                    </div>
                    <span class="insight-impact">${ins.impact}</span>
                </div>
            `;
        });
    }

    container.innerHTML = html;
}

// ----------------- ECOBOT CHAT DIALOGUE ENGINE -----------------
function handleChatSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    // Add User Bubble
    addUserMessage(text);
    input.value = '';

    // Trigger Bot Reply after short delay
    showTypingIndicator();
    setTimeout(() => {
        hideTypingIndicator();
        processBotResponse(text);
    }, 1000);
}

function sendSuggestion(text) {
    addUserMessage(text);
    showTypingIndicator();
    setTimeout(() => {
        hideTypingIndicator();
        processBotResponse(text);
    }, 1000);
}

// Low-level DOM injection for chat messages
function addUserMessage(text) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper user';
    wrapper.innerHTML = `
        <div class="message-avatar">👤</div>
        <div class="message-bubble">
            <p>${escapeHTML(text)}</p>
        </div>
    `;
    messagesContainer.appendChild(wrapper);
    scrollToBottom();

    // Store in history
    state.chatHistory.push({ sender: 'user', text: text });
    saveState();
}

function addBotMessage(text, actions = []) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper bot';
    
    let actionsHTML = '';
    if (actions.length > 0) {
        actionsHTML = `<div class="chat-actions-container">`;
        actions.forEach(a => {
            actionsHTML += `<button class="chat-action-btn" onclick="handleChatAction('${a.action}', '${a.param || ''}')">${a.text}</button>`;
        });
        actionsHTML += `</div>`;
    }

    // Convert markdownbold ** to HTML bold tags
    let formattedText = escapeHTML(text).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Convert newlines to breaks
    formattedText = formattedText.replace(/\n/g, '<br>');

    wrapper.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-bubble">
            <p>${formattedText}</p>
            ${actionsHTML}
        </div>
    `;
    messagesContainer.appendChild(wrapper);
    scrollToBottom();

    // Store in history
    state.chatHistory.push({ sender: 'bot', text: text, actions: actions });
    saveState();
}

function restoreChat() {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;

    messagesContainer.innerHTML = '';
    state.chatHistory.forEach(msg => {
        const wrapper = document.createElement('div');
        wrapper.className = `message-wrapper ${msg.sender}`;
        
        let actionsHTML = '';
        if (msg.actions && msg.actions.length > 0) {
            actionsHTML = `<div class="chat-actions-container">`;
            msg.actions.forEach(a => {
                actionsHTML += `<button class="chat-action-btn" onclick="handleChatAction('${a.action}', '${a.param || ''}')">${a.text}</button>`;
            });
            actionsHTML += `</div>`;
        }

        let formattedText = escapeHTML(msg.text).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formattedText = formattedText.replace(/\n/g, '<br>');

        const avatar = msg.sender === 'bot' ? '🤖' : '👤';

        wrapper.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-bubble">
                <p>${formattedText}</p>
                ${actionsHTML}
            </div>
        `;
        messagesContainer.appendChild(wrapper);
    });
    scrollToBottom();
}

function clearChatHistory() {
    state.chatHistory = [];
    saveState();
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) messagesContainer.innerHTML = '';
    
    // Re-introduce greeting
    addBotMessage("Hi! I'm EcoBot, your smart carbon assistant. 🌱\n\nI can help you understand your footprint, suggest personalized reductions, and log daily habits directly from our chat. \n\nWhere would you like to start?", [
        { text: "Take Onboarding Quiz 📝", action: "start_quiz" },
        { text: "Quick Footprint Check 📊", action: "analyze" },
        { text: "Give me eco tips 💡", action: "tips" }
    ]);
}

function showTypingIndicator() {
    const ind = document.getElementById('chat-typing-indicator');
    if (ind) ind.style.display = 'flex';
    scrollToBottom();
}

function hideTypingIndicator() {
    const ind = document.getElementById('chat-typing-indicator');
    if (ind) ind.style.display = 'none';
}

function scrollToBottom() {
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// Bot Dialogue Processor (Main Logic Node)
function processBotResponse(userInput) {
    const text = userInput.toLowerCase();
    
    // Check if trivia game is active
    if (state.triviaState.active) {
        handleTriviaAnswer(userInput);
        return;
    }
    
    // Check if onboarding quiz is active
    if (state.quizState.active) {
        handleQuizProgress(userInput);
        return;
    }

    // Check Trivia trigger
    if (text.includes('game') || text.includes('trivia') || text.includes('play')) {
        startTriviaGame();
        return;
    }

    // 1. Check Onboarding trigger
    if (text.includes('quiz') || text.includes('onboarding') || text.includes('start_quiz')) {
        startOnboardingQuiz();
        return;
    }

    // 2. Check Footprint analysis
    if (text.includes('analyze') || text.includes('footprint') || text.includes('score') || text.includes('doughnut')) {
        const em = calculateEmissions();
        const total = em.totalProjected.toFixed(1);
        const transportPct = em.totalRaw > 0 ? Math.round(em.transport / em.totalRaw * 100) : 0;
        const energyPct = em.totalRaw > 0 ? Math.round(em.energy / em.totalRaw * 100) : 0;
        const dietPct = em.totalRaw > 0 ? Math.round(em.diet / em.totalRaw * 100) : 0;

        let reply = `Your current carbon footprint is **${total} tons CO2e** per year. \n\nHere is your category breakdown:\n`;
        reply += `🚗 **Transport**: ${em.transport.toFixed(1)} t (${transportPct}%)\n`;
        reply += `⚡ **Home Energy**: ${em.energy.toFixed(1)} t (${energyPct}%)\n`;
        reply += `🍲 **Food & Diet**: ${em.diet.toFixed(1)} t (${dietPct}%)\n`;
        reply += `📦 **Habits & Waste**: ${em.waste.toFixed(1)} t (${Math.max(0, 100 - transportPct - energyPct - dietPct)}%)\n\n`;
        
        // Find biggest driver
        let max = Math.max(em.transport, em.energy, em.diet, em.waste);
        if (max === em.transport) {
            reply += "💡 **Transport is your largest emission source.** Consider taking public transit, carpooling, or walking for shorter trips to save emissions.";
        } else if (max === em.energy) {
            reply += "💡 **Home Energy is your largest emission source.** Unplugging devices on standby, running laundry at 30°C, and using clean power offset plans would make a massive difference.";
        } else if (max === em.diet) {
            reply += "💡 **Diet is your largest emission source.** Swapping red meats (beef, lamb) for chicken or plant-based meals cuts food footprint by up to 60%.";
        } else {
            reply += "💡 **Indirect consumption / Waste is your largest source.** Shifting to secondhand shopping and boosting glass/plastic recycling will trim your score.";
        }

        addBotMessage(reply, [
            { text: "Suggest a Challenge 🏆", action: "suggest_challenge" },
            { text: "Log a custom trip 🚗", action: "log_trip_prompt" }
        ]);
        return;
    }

    // 3. Tips suggestions
    if (text.includes('tip') || text.includes('advice') || text.includes('help') || text.includes('suggest')) {
        const em = calculateEmissions();
        let max = Math.max(em.transport, em.energy, em.diet, em.waste);
        
        let reply = "Here are a few quick tips to start slicing your footprint:\n\n";
        
        if (max === em.transport) {
            reply += "1. **Commute clean**: Telecommute when possible. Swapping a 10 km daily car ride for a bike ride prevents ~450 kg of CO2 per year.\n";
            reply += "2. **Eco Driving**: Accelerate smoothly, maintain correct tire pressures, and empty cargo to save 10% on fuel bills.\n";
            reply += "3. **Rail over flight**: Try high-speed train connections instead of regional short flights.";
        } else if (max === em.energy) {
            reply += "1. **Adjust temperatures**: Shifting your thermostat down 1°C in winter saves ~200 kg CO2/yr and saves on utility bills.\n";
            reply += "2. **Cold Laundry**: Washing clothes in cold water (30°C/86°F) uses 75% less energy than hot cycles.\n";
            reply += "3. **Unplug standbys**: Unplug TV boxes and computers when not in use.";
        } else if (max === em.diet) {
            reply += "1. **Adopt Meatless Days**: Skipping beef and pork just 2 days a week saves ~400 kg CO2/yr.\n";
            reply += "2. **Reduce Kitchen Waste**: Plan meals and freeze leftovers. Food waste in landfills produces highly potent methane gas.\n";
            reply += "3. **Buy local/seasonal**: Prevents heavy cargo transport emissions.";
        } else {
            reply += "1. **Circular Fashion**: Purchase vintage/thrifted garments. Making 1 brand new cotton t-shirt uses 2700 liters of water!\n";
            reply += "2. **Repair over replace**: Keep cell phones and computers for at least 3-4 years.\n";
            reply += "3. **Zero Waste**: Buy goods in bulk or choose minimal, plastic-free packaging.";
        }

        addBotMessage(reply, [
            { text: "Commit to Challenges 🏆", action: "open_challenges" }
        ]);
        return;
    }

    // 4. Log savings shortcut
    if (text.includes('log') && (text.includes('save') || text.includes('bike') || text.includes('walk') || text.includes('transit') || text.includes('km') || text.includes('mile'))) {
        // Parse a distance
        let kmMatch = text.match(/(\d+)\s*(km|kilometer|mile|mi)/);
        let distance = 10; // default fallback
        let unit = 'km';
        
        if (kmMatch) {
            distance = parseInt(kmMatch[1]);
            unit = kmMatch[2].startsWith('m') ? 'mile' : 'km';
        }

        if (unit === 'mile') {
            distance = Math.round(distance * 1.609); // convert to km
        }

        // Calculate saved co2 compared to typical petrol sedan (0.17 kg/km)
        const savedCo2 = (distance * 0.17).toFixed(1);

        addBotMessage(`Awesome! Swapping a car drive for a **${distance} km** bike/walk/transit trip prevented approximately **${savedCo2} kg of CO2e** from entering the atmosphere. \n\nWould you like me to log this trip, which grants you **+15 EcoPoints**?`, [
            { text: `Yes, Log it! ✅`, action: "log_saving_confirmed", param: `${savedCo2}` },
            { text: "Cancel", action: "cancel" }
        ]);
        return;
    }

    // 5. Short keyword replies
    if (text.includes('car') || text.includes('drive') || text.includes('gasoline') || text.includes('petrol') || text.includes('diesel')) {
        addBotMessage("Commuting by personal combustion cars produces heavy tailpipe emissions. EVs and Hybrids represent a huge step forward, but active transit (walking, bicycling) is the cleanest option.\n\nYou can update your driving stats in the **Log Habits** tab at any time.");
        return;
    }

    if (text.includes('vegan') || text.includes('diet') || text.includes('vegetarian') || text.includes('meat') || text.includes('food')) {
        addBotMessage("Dietary choices have a major impact. Animal agriculture (especially cattle farming) requires intensive land use and emits substantial methane. Moving to plant-forward meals is a high-impact action!\n\nWould you like to try the **Meatless Days** challenge this week?", [
            { text: "Commit to Challenge 🏆", action: "commit_challenge", param: "meatless-mon" }
        ]);
        return;
    }

    if (text.includes('solar') || text.includes('electricity') || text.includes('utility') || text.includes('energy')) {
        addBotMessage("Switching to carbon-free solar/wind power is the most direct way to eliminate home emissions. You can contact your utility provider to see if they offer a 'Green Power Tariff', or enroll in a community solar array!");
        return;
    }

    if (text.includes('recycling') || text.includes('plastic') || text.includes('waste')) {
        addBotMessage("Recycling preserves the carbon energy embedded in materials. E.g., recycling aluminum saves 95% of energy needed for virgin smelting. Be sure to check the plastic codes accepted in your local curbside system.");
        return;
    }

    // Fallback response
    addBotMessage("I'm not fully sure how to answer that, but I can help you with: \n\n• Parsing logs (e.g. type *'I rode my bike 12 km today'*) \n• Footprint audits (*'Analyze my footprint'*) \n• Custom tips (*'Give me eco tips'*)\n• Onboarding (*'Take Onboarding Quiz'*)\n\nWhat would you like to explore?", [
        { text: "Analyze footprint 📊", action: "analyze" },
        { text: "Eco Tips 💡", action: "tips" }
    ]);
}

// Onboarding Quiz State Machine
function startOnboardingQuiz() {
    state.quizState.active = true;
    state.quizState.currentStep = 1;
    state.quizState.tempData = {};
    saveState();
    
    addBotMessage("Welcome to the **EcoSync Onboarding Quiz**! 📝\n\nI will ask you 5 simple questions to construct your initial carbon profile. Let's start:\n\n**Question 1**: How do you primarily travel for daily commuting? (Select one below)", [
        { text: "🚗 Single-occupant Car", action: "quiz_ans", param: "car" },
        { text: "🚌 Public Transit", action: "quiz_ans", param: "transit" },
        { text: "🚲 Walking / Biking", action: "quiz_ans", param: "active" }
    ]);
}

function handleQuizProgress(userInput) {
    const step = state.quizState.currentStep;
    
    // We expect user to use the buttons. If they typed, we'll try to map it.
    let val = userInput.toLowerCase();
    
    if (step === 1) {
        state.quizState.tempData.commute = val.includes('transit') ? 'transit' : (val.includes('car') ? 'car' : 'active');
        state.quizState.currentStep = 2;
        saveState();

        if (state.quizState.tempData.commute === 'car') {
            addBotMessage("Got it. **Question 2**: What size vehicle do you drive?", [
                { text: "Large SUV / Pickup", action: "quiz_ans", param: "suv" },
                { text: "Standard Sedan", action: "quiz_ans", param: "sedan" },
                { text: "Compact / EV / Hybrid", action: "quiz_ans", param: "hybrid" }
            ]);
        } else {
            // Skip vehicle type for non-drivers
            state.quizState.tempData.vehicle = 'none';
            state.quizState.currentStep = 3;
            saveState();
            askDietQuestion();
        }
    }
    else if (step === 2) {
        state.quizState.tempData.vehicle = val;
        state.quizState.currentStep = 3;
        saveState();
        askDietQuestion();
    }
    else if (step === 3) {
        state.quizState.tempData.diet = val;
        state.quizState.currentStep = 4;
        saveState();
        
        addBotMessage("**Question 4**: Estimate your weekly travel distance (either driving or transit):", [
            { text: "Low (< 50 km / 30 miles)", action: "quiz_ans", param: "50" },
            { text: "Medium (50 - 200 km)", action: "quiz_ans", param: "150" },
            { text: "High (200+ km)", action: "quiz_ans", param: "350" }
        ]);
    }
    else if (step === 4) {
        state.quizState.tempData.distance = parseInt(val) || 150;
        state.quizState.currentStep = 5;
        saveState();

        addBotMessage("**Question 5**: Select your household's average monthly electricity bill:", [
            { text: "Eco Friendly (< $50)", action: "quiz_ans", param: "40" },
            { text: "Moderate ($50 - $120)", action: "quiz_ans", param: "80" },
            { text: "High ($120+)", action: "quiz_ans", param: "160" }
        ]);
    }
    else if (step === 5) {
        state.quizState.tempData.electric = parseInt(val) || 80;
        
        // Finalize state changes!
        applyQuizDataToHabits();
        
        state.quizState.active = false;
        state.quizState.currentStep = 0;
        state.points += 50; // Onboarding bonus
        saveState();
        
        // Re-render
        renderAll();

        addBotMessage("🎉 **Carbon Profile Created!** \n\nI have configured your tracker with these initial estimates and granted you **+50 EcoPoints** as a welcome gift!\n\nSwitch to the **Dashboard** tab to check your personalized carbon scorecard.", [
            { text: "View Dashboard 📊", action: "open_dashboard" },
            { text: "Check Active Challenges 🏆", action: "open_challenges" }
        ]);
    }
}

function askDietQuestion() {
    addBotMessage("**Question 3**: What describes your typical eating habits?", [
        { text: "Meat Lover (Beef/pork regularly)", action: "quiz_ans", param: "heavy-meat" },
        { text: "Balanced Meat/Poultry/Fish", action: "quiz_ans", param: "medium-meat" },
        { text: "Vegetarian / Vegan", action: "quiz_ans", param: "vegan" }
    ]);
}

function applyQuizDataToHabits() {
    const q = state.quizState.tempData;
    const h = state.habits;

    // Apply commute
    if (q.commute === 'car') {
        h.ownsVehicle = true;
        h.carDistance = q.distance || 100;
        h.publicTransit = 0;
        
        if (q.vehicle === 'suv') {
            h.vehicleType = 'suv';
            h.fuelType = 'petrol';
        } else if (q.vehicle === 'hybrid') {
            h.vehicleType = 'compact';
            h.fuelType = 'hybrid';
        } else {
            h.vehicleType = 'sedan';
            h.fuelType = 'petrol';
        }
    } else if (q.commute === 'transit') {
        h.ownsVehicle = false;
        h.carDistance = 0;
        h.publicTransit = Math.round((q.distance || 100) / 30); // 30 km/h avg speed
    } else {
        h.ownsVehicle = false;
        h.carDistance = 0;
        h.publicTransit = 0;
    }

    // Apply diet
    h.dietType = q.diet || 'medium-meat';
    
    // Apply energy
    h.electricityBill = q.electric || 80;
    h.gasBill = Math.round(h.electricityBill * 0.4); // rough approximation
    h.cleanEnergyPct = 0;
    h.householdMembers = 2; // default avg
}

// Handle action triggers from chat buttons
function handleChatAction(action, param) {
    // Log user response representation
    const textLabel = document.querySelector(`[onclick*="${action}"][onclick*="${param}"]`);
    const actionText = textLabel ? textLabel.textContent : `Selected action: ${action}`;
    
    addUserMessage(actionText);
    showTypingIndicator();

    setTimeout(() => {
        hideTypingIndicator();
        
        if (action === "start_quiz") {
            startOnboardingQuiz();
        } 
        else if (action === "start_trivia") {
            startTriviaGame();
        }
        else if (action === "trivia_ans") {
            handleTriviaAnswer(param);
        }
        else if (action === "analyze") {
            processBotResponse("analyze footprint");
        } 
        else if (action === "tips") {
            processBotResponse("give eco tips");
        }
        else if (action === "quiz_ans") {
            handleQuizProgress(param);
        }
        else if (action === "suggest_challenge") {
            // Find a challenge not yet completed
            const pending = CHALLENGES.find(c => !state.completedChallenges.includes(c.id));
            if (pending) {
                addBotMessage(`I recommend taking on the **${pending.title}** challenge:\n\n*${pending.desc}*\n\nCompleting it reduces your projected carbon footprint by **${pending.co2} kg/week** and awards **${pending.pts} EcoPoints**!`, [
                    { text: "Commit to Challenge 🏆", action: "commit_challenge", param: pending.id },
                    { text: "Show all challenges", action: "open_challenges" }
                ]);
            } else {
                addBotMessage("Amazing! You have completed all our active eco-challenges! You're a true climate champion! 🌍🌱");
            }
        }
        else if (action === "log_trip_prompt") {
            addBotMessage("To calculate trip emissions, type something like:\n\n*\"I logged 15 km bike commute today\"*\nor *\"I drove 80 miles in a car\"*");
        }
        else if (action === "log_saving_confirmed") {
            state.points += 15;
            // Also deduct carbon directly by adding to general savings impact
            // For simplicity, we just save points and trigger a toast
            saveState();
            renderAll();
            showToast(`Logged carbon savings! +15 EcoPoints! 🚲`);
            addBotMessage("Awesome! Carbon savings logged. Check your updated points tally in the upper right. Keep traveling green! 💚");
        }
        else if (action === "commit_challenge") {
            if (!state.completedChallenges.includes(param)) {
                toggleChallenge(param);
            } else {
                addBotMessage("You have already completed that challenge!");
            }
        }
        else if (action === "open_challenges") {
            switchTab('challenges');
            addBotMessage("Switched to the **Challenges** tab. Take a look at your current goals!");
        }
        else if (action === "open_dashboard") {
            switchTab('dashboard');
            addBotMessage("Switched to your **Dashboard**. Look at those green charts! 📊");
        }
        else if (action === "cancel") {
            addBotMessage("No problem. Let me know if you need anything else!");
        }
    }, 1000);
}

// ----------------- UI UTILITIES -----------------
function showToast(msg) {
    const toast = document.getElementById('toast-notification');
    const toastMsg = document.getElementById('toast-message');
    if (toast && toastMsg) {
        toastMsg.textContent = msg;
        toast.style.display = 'flex';
        
        // Hide after 3.5 seconds
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3500);
    }
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// ----------------- TRIVIA GAME ENGINE -----------------
const TRIVIA_QUESTIONS = [
    {
        q: "What percentage of global greenhouse gas emissions come from food production?",
        options: ["A) 10%", "B) 26%", "C) 50%"],
        correct: "b",
        explain: "Food production accounts for about 26% of global emissions, with livestock representing a large portion of that."
    },
    {
        q: "Which transit method has the lowest carbon footprint per passenger-kilometer?",
        options: ["A) Electric Train", "B) Electric Car (EV)", "C) Diesel Bus"],
        correct: "a",
        explain: "Electric rail/train transit is extremely energy-efficient and has the lowest emissions per passenger km."
    },
    {
        q: "How much carbon dioxide does an average mature tree absorb per year?",
        options: ["A) 5 kg", "B) 22 kg", "C) 100 kg"],
        correct: "b",
        explain: "A mature tree absorbs roughly 22 kg (48 lbs) of carbon dioxide annually from the atmosphere."
    }
];

function startTriviaGame() {
    state.triviaState.active = true;
    state.triviaState.questionIndex = 0;
    saveState();
    askTriviaQuestion();
}

function askTriviaQuestion() {
    const qIndex = state.triviaState.questionIndex;
    const qData = TRIVIA_QUESTIONS[qIndex];
    
    addBotMessage(`🌱 **Eco-Trivia Question ${qIndex + 1}/3**:\n\n${qData.q}`, [
        { text: qData.options[0], action: "trivia_ans", param: "a" },
        { text: qData.options[1], action: "trivia_ans", param: "b" },
        { text: qData.options[2], action: "trivia_ans", param: "c" }
    ]);
}

function handleTriviaAnswer(userInput) {
    const qIndex = state.triviaState.questionIndex;
    const qData = TRIVIA_QUESTIONS[qIndex];
    
    // Parse choice (a, b, c) from text
    let ans = userInput.toLowerCase().trim();
    if (ans.startsWith('a') || ans.includes('10%') || ans.includes('train')) ans = 'a';
    else if (ans.startsWith('b') || ans.includes('26%') || ans.includes('22')) ans = 'b';
    else if (ans.startsWith('c') || ans.includes('50%') || ans.includes('bus') || ans.includes('100')) ans = 'c';
    else {
        // Fallback to what was passed or a guess
        ans = ans.charAt(0);
    }

    if (ans === qData.correct) {
        state.points += 20;
        saveState();
        renderAll();
        showToast("Correct! +20 EcoPoints! 🧠");
        addBotMessage(`✨ **Correct!**\n\n${qData.explain}\n\nYou earned **+20 EcoPoints**!`);
    } else {
        addBotMessage(`❌ **Incorrect.** The correct answer was **${qData.correct.toUpperCase()}**.\n\n*Fact: ${qData.explain}*`);
    }

    setTimeout(() => {
        state.triviaState.questionIndex++;
        if (state.triviaState.questionIndex < TRIVIA_QUESTIONS.length) {
            saveState();
            askTriviaQuestion();
        } else {
            state.triviaState.active = false;
            state.triviaState.questionIndex = 0;
            saveState();
            addBotMessage("🎉 **Trivia Game Completed!** Thanks for playing. Check out your points and rank on the dashboard! 🌍🌱", [
                { text: "View Dashboard 📊", action: "open_dashboard" },
                { text: "Suggest eco tips 💡", action: "tips" }
            ]);
        }
    }, 3000);
}
