// Global State variables
let state = {
    points: 0,
    dailyPoints: 0,
    weeklyPoints: 0,
    monthlyPoints: 0,
    dailyCompletedActionIds: [],
    lastActiveDate: "",
    lastActiveWeek: "",
    lastActiveMonth: "",
    unlockedRings: [], // 'earth', 'fire', 'wind', 'water', 'heart'
    offsetAmount: 0, // 0-100% simulated offset
    chatHistory: [],
    region: 'global',
    activeNudge: null, // current pending decision
    triviaState: {
        active: false,
        questionIndex: 0
    },
    worldImage: null, // Base64 string of compressed personal photo
    worldCelebrated: false, // track if 100% color-restored celebration ran
    totalSavedKgCO2e: 0, // monthly progress in kg CO2
    proofs: [], // array of verified eco-actions
    activeLibFilter: 'all' // active tab in action library
};

const ELEMENT_ACTIONS_LIBRARY = {
    earth: [
        { id: "e1", title: "Recycle a plastic bottle", co2: 0.1, pts: 20, type: "One-time", verify: "camera" },
        { id: "e2", title: "Separate food waste", co2: 0.3, pts: 25, type: "Habit", verify: "manual" },
        { id: "e3", title: "Sort e-waste safely", co2: 0.5, pts: 30, type: "One-time", verify: "camera" },
        { id: "e4", title: "Use a reusable bag", co2: 0.2, pts: 20, type: "Habit", verify: "manual" },
        { id: "e5", title: "Repair instead of discard", co2: 2.0, pts: 40, type: "Long-term", verify: "photo upload" }
    ],
    fire: [
        { id: "f1", title: "Unplug idle chargers", co2: 0.1, pts: 15, type: "Habit", verify: "manual" },
        { id: "f2", title: "Set AC to 24–26°C", co2: 1.0, pts: 30, type: "Habit", verify: "manual" },
        { id: "f3", title: "Use natural light", co2: 0.2, pts: 15, type: "Habit", verify: "manual" },
        { id: "f4", title: "Use fan instead of AC for 1 hour", co2: 0.5, pts: 25, type: "One-time", verify: "manual" },
        { id: "f5", title: "Switch to LED lighting", co2: 5.0, pts: 60, type: "Long-term", verify: "photo upload" }
    ],
    wind: [
        { id: "w1", title: "Walk a short trip", co2: 0.5, pts: 30, type: "One-time", verify: "motion" },
        { id: "w2", title: "Cycle instead of driving", co2: 1.0, pts: 40, type: "One-time", verify: "motion" },
        { id: "w3", title: "Use bus or metro", co2: 1.5, pts: 45, type: "Habit", verify: "location" },
        { id: "w4", title: "Carpool today", co2: 1.2, pts: 35, type: "One-time", verify: "manual" },
        { id: "w5", title: "No private vehicle day", co2: 2.0, pts: 60, type: "Habit", verify: "manual" }
    ],
    water: [
        { id: "a1", title: "Choose a plant-forward meal", co2: 3.0, pts: 40, type: "One-time", verify: "manual" },
        { id: "a2", title: "Finish leftovers", co2: 0.5, pts: 25, type: "Habit", verify: "photo upload" },
        { id: "a3", title: "Refill your bottle", co2: 0.2, pts: 20, type: "Habit", verify: "manual" },
        { id: "a4", title: "Choose local seasonal food", co2: 1.0, pts: 30, type: "One-time", verify: "manual" },
        { id: "a5", title: "Try a meatless day", co2: 4.0, pts: 60, type: "Habit", verify: "manual" }
    ],
    heart: [
        { id: "h1", title: "Buy second-hand", co2: 10.0, pts: 50, type: "One-time", verify: "photo upload" },
        { id: "h2", title: "Repair clothing", co2: 5.0, pts: 45, type: "Long-term", verify: "photo upload" },
        { id: "h3", title: "Borrow instead of buying", co2: 3.0, pts: 35, type: "One-time", verify: "manual" },
        { id: "h4", title: "Choose a local seller", co2: 1.0, pts: 25, type: "One-time", verify: "manual" },
        { id: "h5", title: "Delay an impulse purchase", co2: 2.0, pts: 30, type: "Habit", verify: "manual" }
    ]
};

// Web Audio API Synth Engine
let audioCtx = null;
let bgmOsc = null;
let bgmGain = null;
let bgmInterval = null;
let isPlayingMusic = false;

// Element Colors
const ELEMENT_COLORS = {
    earth: '#10b981',
    fire: '#ef4444',
    wind: '#38bdf8',
    water: '#2563eb',
    heart: '#ec4899'
};

// Planeteer elements details
const PLANETEER_ELEMENTS = {
    earth: { name: 'Earth Ring', icon: '🪨', task: 'Composted waste or recycled paper/plastic', pts: 60, co2: 12 },
    fire: { name: 'Fire Ring', icon: '🔥', task: 'Unplugged vampire appliances or offset electricity', pts: 40, co2: 8 },
    wind: { name: 'Wind Ring', icon: '💨', task: 'Opted for cycling, walking, or public transit', pts: 70, co2: 15 },
    water: { name: 'Water Ring', icon: '💧', task: 'Swapped a high-carbon meal for a plant-based alternative', pts: 50, co2: 10 },
    heart: { name: 'Heart Ring', icon: '❤️', task: 'Bought secondhand or local sustainable goods', pts: 60, co2: 14 }
};

// Trivia game questions
const TRIVIA_QUESTIONS = [
    {
        q: "Mother Earth asks: What percentage of global greenhouse gas emissions come from food production?",
        options: ["A) 10%", "B) 26%", "C) 50%"],
        correct: "b",
        explain: "Food production accounts for about 26% of global emissions. Swapping beef/mutton for plant-based foods is the most immediate way to cut this footprint."
    },
    {
        q: "Captain Planet asks: Which transit method has the lowest carbon footprint per passenger-kilometer?",
        options: ["A) Electric Train", "B) Electric SUV (EV)", "C) Diesel Bus"],
        correct: "a",
        explain: "Electric trains are highly efficient mass-transit systems. They beat even individual electric SUVs due to high passenger density!"
    },
    {
        q: "Wheeler asks: How much CO2 does a single mature tree absorb on average per year?",
        options: ["A) 5 kg", "B) 22 kg", "C) 100 kg"],
        correct: "b",
        explain: "A mature tree absorbs roughly 22 kg (48 lbs) of carbon dioxide annually from the atmosphere. Every tree planted counts!"
    }
];

// Initialize DOM
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    checkResetIntervals();
    setupTabNavigation();
    setupOffsetSlider();
    setupSelectors();
    setupWorldImageUpload();
    renderAll();
    
    // Welcome message in chat
    if (state.chatHistory.length === 0) {
        addBotMessage("Greetings, Planeteer! I am Mother Earth. 🌍\n\nPlanet Lens has initiated. Our mission is to protect the biosphere by making carbon-aware choices at the moment of decision. \n\nWe need to activate the **5 Planeteer Rings** (Earth, Fire, Wind, Water, Heart) to clean up the environment and summon Captain Planet. Where shall we start?", [
            { text: "Play Planeteer Trivia 🧠", action: "start_trivia" },
            { text: "Diagnose Footprint 📊", action: "analyze" },
            { text: "Clean Energy Tips 💡", action: "tips" }
        ]);
    } else {
        restoreChat();
    }

    // Initialize 3D Rotating Earth Globe and Background Shader
    initThreeJSEarth();
    initBackgroundShader();

    // Welcome terminal logs simulation ticker
    const statusLogs = [
        "SCANNING BIOMES...",
        "RETRIEVING SAT-IMAGERY...",
        "CALCULATING ECO-IMPACT...",
        "SYSTEM HEALTH: CRITICAL (0%)",
        "AWAITING CARBON DIAGNOSIS..."
    ];
    let logIndex = 0;
    const logElement = document.getElementById('status-terminal');
    if (logElement) {
        setInterval(() => {
            logElement.textContent = statusLogs[logIndex];
            logIndex = (logIndex + 1) % statusLogs.length;
        }, 3000);
    }

    // Setup Welcome Splash Screen Transition with 3D Earth Flight
    const btnEnter = document.getElementById('btn-enter-dashboard');
    const welcomeSplash = document.getElementById('welcome-splash');
    
    if (btnEnter && welcomeSplash) {
        btnEnter.addEventListener('click', () => {
            // Play chime SFX
            playRingChimeSFX();
            
            // Start flight transition for the Three.js Earth
            const container = document.getElementById('threejs-earth-container');
            const targetSlot = document.getElementById('dashboard-earth-slot');
            
            if (container && targetSlot) {
                // Pin the container to its current screen viewport coordinates
                const startRect = container.getBoundingClientRect();
                container.style.position = 'fixed';
                container.style.left = `${startRect.left}px`;
                container.style.top = `${startRect.top}px`;
                container.style.width = `${startRect.width}px`;
                container.style.height = `${startRect.height}px`;
                container.style.transform = 'none';
                container.style.margin = '0';
                
                // Force layout reflow so the browser registers the fixed positioning
                void container.offsetWidth;
                
                // Fetch destination coordinates on the dashboard card
                const destRect = targetSlot.getBoundingClientRect();
                
                // Transition to destination size and positioning
                container.style.left = `${destRect.left}px`;
                container.style.top = `${destRect.top}px`;
                container.style.width = `${destRect.width}px`;
                container.style.height = `${destRect.height}px`;
                
                // When flight is complete, insert the Earth into the dashboard card flow
                const onFlightEnd = () => {
                    container.removeEventListener('transitionend', onFlightEnd);
                    targetSlot.appendChild(container);
                    container.classList.add('dashboard-mode');
                    container.style.position = 'relative';
                    container.style.left = '0';
                    container.style.top = '0';
                    container.style.width = '100%';
                    container.style.height = '280px';
                    
                    // Trigger Three.js resize to match new layout bounds
                    resizeThreeJS();
                };
                container.addEventListener('transitionend', onFlightEnd);
                
                // Fallback timeout in case transitionend does not fire
                setTimeout(onFlightEnd, 1300);
            }
            
            // Fade out the welcome splash screen overlay
            welcomeSplash.classList.add('fade-out');
            
            // Hide overlay completely after transition (1300ms)
            setTimeout(() => {
                welcomeSplash.style.display = 'none';
            }, 1300);
        });
    }

    // Attach listeners
    document.getElementById('btn-clear-chat').addEventListener('click', clearChatHistory);
    document.getElementById('chat-form').addEventListener('submit', handleChatSubmit);
    document.getElementById('btn-refresh-insights').addEventListener('click', () => {
        if (window.refreshInsightsSmart) {
            window.refreshInsightsSmart(true);
        } else {
            generateInsights();
            showToast("Mother Earth Terminal Insights updated!");
        }
    });
});

const MOCK_COMMUNITY_WINS = [
    { name: "Wheeler (New York)", action: "unplugged all standby loads", element: "fire", co2: 0.1, timestamp: "2 mins ago" },
    { name: "Gi (Beijing)", action: "cycled 5 km to work", element: "wind", co2: 1.0, timestamp: "10 mins ago" },
    { name: "Linka (Moscow)", action: "composted organic food waste", element: "earth", co2: 0.3, timestamp: "25 mins ago" }
];

// Load State from LocalStorage
function loadState() {
    const saved = localStorage.getItem('ecosync_lens_state');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state = { ...state, ...parsed };
            if (!state.unlockedRings) state.unlockedRings = [];
            if (!state.chatHistory) state.chatHistory = [];
            if (!state.worldImage) state.worldImage = null;
            if (state.worldCelebrated === undefined) state.worldCelebrated = false;
            if (state.totalSavedKgCO2e === undefined) state.totalSavedKgCO2e = 0;
            if (!state.proofs) state.proofs = [];
            if (state.activeLibFilter === undefined) state.activeLibFilter = 'all';
            if (state.dailyPoints === undefined) state.dailyPoints = 0;
            if (state.weeklyPoints === undefined) state.weeklyPoints = 0;
            if (state.monthlyPoints === undefined) state.monthlyPoints = 0;
            if (!state.dailyCompletedActionIds) state.dailyCompletedActionIds = [];
            if (state.lastActiveDate === undefined) state.lastActiveDate = "";
            if (state.lastActiveWeek === undefined) state.lastActiveWeek = "";
            if (state.lastActiveMonth === undefined) state.lastActiveMonth = "";
            if (!state.communityWins || state.communityWins.length === 0) {
                state.communityWins = JSON.parse(JSON.stringify(MOCK_COMMUNITY_WINS));
            }
        } catch (e) {
            console.error("Failed to load local state", e);
        }
    } else {
        state.communityWins = JSON.parse(JSON.stringify(MOCK_COMMUNITY_WINS));
    }
}

function saveState() {
    localStorage.setItem('ecosync_lens_state', JSON.stringify(state));
}

function getYearWeekString(d) {
    const tempDate = new Date(d.getTime());
    tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7));
    const year = tempDate.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const week = Math.ceil((((tempDate - startOfYear) / 86400000) + 1) / 7);
    return `${year}-W${week}`;
}

function checkResetIntervals() {
    const now = new Date();
    const currentDateStr = now.toISOString().slice(0, 10); // "YYYY-MM-DD"
    const currentMonthStr = now.toISOString().slice(0, 7); // "YYYY-MM"
    const currentWeekStr = getYearWeekString(now); // "YYYY-WXX"
    
    let stateChanged = false;
    
    // Daily checks
    if (!state.lastActiveDate) {
        state.lastActiveDate = currentDateStr;
        state.dailyPoints = 0;
        state.dailyCompletedActionIds = [];
        stateChanged = true;
    } else if (state.lastActiveDate !== currentDateStr) {
        state.lastActiveDate = currentDateStr;
        state.dailyPoints = 0;
        state.dailyCompletedActionIds = [];
        stateChanged = true;
    }
    
    // Weekly checks
    if (!state.lastActiveWeek) {
        state.lastActiveWeek = currentWeekStr;
        state.weeklyPoints = 0;
        stateChanged = true;
    } else if (state.lastActiveWeek !== currentWeekStr) {
        state.lastActiveWeek = currentWeekStr;
        state.weeklyPoints = 0;
        stateChanged = true;
    }
    
    // Monthly checks
    if (!state.lastActiveMonth) {
        state.lastActiveMonth = currentMonthStr;
        state.monthlyPoints = 0;
        stateChanged = true;
    } else if (state.lastActiveMonth !== currentMonthStr) {
        state.lastActiveMonth = currentMonthStr;
        state.monthlyPoints = 0;
        stateChanged = true;
    }
    
    if (stateChanged) {
        saveState();
    }
}

// ----------------- WEB AUDIO SYNTHESIZER ENGINE -----------------
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Play Retro synth loop
function startRetroBGM() {
    initAudio();
    if (isPlayingMusic) return;

    isPlayingMusic = true;
    
    // Create nodes
    bgmGain = audioCtx.createGain();
    bgmGain.gain.setValueAtTime(0.08, audioCtx.currentTime); // Low background volume
    bgmGain.connect(audioCtx.destination);

    // E, G, A, B retro arpeggio notes
    const melody = [329.63, 392.00, 440.00, 493.88, 440.00, 392.00, 329.63, 293.66];
    let noteIndex = 0;
    
    // Programmatic retro step sequencer loop
    bgmInterval = setInterval(() => {
        if (!audioCtx || audioCtx.state === 'suspended') return;
        
        const osc = audioCtx.createOscillator();
        const noteGain = audioCtx.createGain();
        
        // Triangle wave for smooth 8-bit sound
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(melody[noteIndex], audioCtx.currentTime);
        
        noteGain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        noteGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
        
        osc.connect(noteGain);
        noteGain.connect(bgmGain);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
        
        noteIndex = (noteIndex + 1) % melody.length;
    }, 450);
}

function stopRetroBGM() {
    if (bgmInterval) {
        clearInterval(bgmInterval);
        bgmInterval = null;
    }
    isPlayingMusic = false;
}

// Play Ascending Chime SFX
function playRingChimeSFX() {
    initAudio();
    if (!audioCtx) return;
    
    const now = audioCtx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    
    notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + (idx * 0.08));
        
        gain.gain.setValueAtTime(0.12, now + (idx * 0.08));
        gain.gain.exponentialRampToValueAtTime(0.001, now + (idx * 0.08) + 0.25);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start(now + (idx * 0.08));
        osc.stop(now + (idx * 0.08) + 0.3);
    });
}

// Play Ascending Epic Summon SFX
function playSummonSFX() {
    initAudio();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sawtooth';
    // Sweep frequency upwards
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 1.2);
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    
    // Add lowpass filter for retro sweep
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(2000, now + 1.0);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start(now);
    osc.stop(now + 1.25);
}

function setupAudioController() {
    const musicBtn = document.getElementById('btn-toggle-music');
    const playIcon = musicBtn.querySelector('.icon-play');
    const pauseIcon = musicBtn.querySelector('.icon-pause');
    const btnText = document.getElementById('music-btn-text');

    musicBtn.addEventListener('click', () => {
        if (!isPlayingMusic) {
            startRetroBGM();
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'inline-block';
            btnText.textContent = "Mute Music";
            showToast("BGM Retro Synth started! 🎵");
        } else {
            stopRetroBGM();
            playIcon.style.display = 'inline-block';
            pauseIcon.style.display = 'none';
            btnText.textContent = "Play BGM";
            showToast("Music muted.");
        }
    });
}

// ----------------- TAB NAVIGATION -----------------
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
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    document.querySelectorAll('.tab-content').forEach(content => {
        if (content.id === `tab-${tabId}`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}

// Setup Offset slider
function setupOffsetSlider() {
    const slider = document.getElementById('offset-simulate-slider');
    if (slider) {
        slider.addEventListener('input', (e) => {
            state.offsetAmount = parseInt(e.target.value) || 0;
            document.getElementById('offset-simulate-val').textContent = state.offsetAmount + '% offsetted';
            
            const offsetPoints = Math.round(state.offsetAmount / 2);
            document.getElementById('offset-points-badge').textContent = `+${offsetPoints} Points`;
            
            // Fire ring unlocks if offset is 50%+
            if (state.offsetAmount >= 50 && !state.unlockedRings.includes('fire')) {
                unlockRing('fire');
            } else if (state.offsetAmount < 50 && state.unlockedRings.includes('fire')) {
                lockRing('fire');
            }

            saveState();
            renderAll();
        });
    }
}

function setupSelectors() {
    const regionSelect = document.getElementById('region-select');
    if (regionSelect) {
        regionSelect.value = state.region || 'global';
        regionSelect.addEventListener('change', (e) => {
            state.region = e.target.value;
            saveState();
            renderAll();
            showToast(`Mother Earth Calibration: Region set to ${e.target.options[e.target.selectedIndex].text}`);
        });
    }
}

// ----------------- COLOR MY WORLD PHOTO LOADER & RESIZER -----------------
function setupWorldImageUpload() {
    const fileInput = document.getElementById('world-image-input');
    const uploadZone = document.getElementById('world-upload-zone');
    const clearBtn = document.getElementById('btn-clear-image');

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                processAndSaveImage(file);
            }
        });
    }

    if (uploadZone) {
        // Drag and Drop
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.style.borderColor = 'var(--primary-light)';
            uploadZone.style.background = 'rgba(255, 255, 255, 0.05)';
        });

        uploadZone.style.cursor = 'pointer';

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.style.borderColor = 'var(--border-color)';
            uploadZone.style.background = 'rgba(255, 255, 255, 0.02)';
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.style.borderColor = 'var(--border-color)';
            uploadZone.style.background = 'rgba(255, 255, 255, 0.02)';
            
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                processAndSaveImage(file);
            } else {
                showToast("Please upload a valid image file!");
            }
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            state.worldImage = null;
            state.worldCelebrated = false;
            saveState();
            renderAll();
            showToast("World image reset.");
        });
    }
}

// Draw image to hidden canvas to resize/compress to under ~150KB for local storage
function processAndSaveImage(file) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            // Target max width/height of 320px
            const maxDim = 320;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxDim) {
                    height = Math.round(height * (maxDim / width));
                    width = maxDim;
                }
            } else {
                if (height > maxDim) {
                    width = Math.round(width * (maxDim / height));
                    height = maxDim;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Compress to JPEG at 0.75 quality
            try {
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
                state.worldImage = compressedBase64;
                state.worldCelebrated = false;
                saveState();
                renderAll();
                showToast("World photo uploaded! Let's bring it to color.");
                
                // Add conversational nudge in Mother Earth Terminal
                addBotMessage("Beautiful photo, Planeteer! 📸 This is the world you are protecting. Currently, it is grayed out. For every Planeteer Ring you activate (Earth, Fire, Wind, Water, Heart), we will restore 20% of its natural color. Let's make it colorful together!", [
                    { text: "Understood! Let's go 🌟", action: "tips" }
                ]);
            } catch (err) {
                console.error("Image compression error", err);
                showToast("Failed to process image.");
            }
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function updateColorMyWorldCard() {
    const uploadZone = document.getElementById('world-upload-zone');
    const imageFrame = document.getElementById('world-image-frame');
    const worldImg = document.getElementById('world-img');
    const progressText = document.getElementById('color-progress-text');

    if (!uploadZone || !imageFrame || !worldImg || !progressText) return;

    if (state.worldImage) {
        uploadZone.style.display = 'none';
        imageFrame.style.display = 'flex';
        worldImg.src = state.worldImage;

        const unlockedCount = state.unlockedRings.length;
        const colorPercentage = unlockedCount * 20; // 0, 20, 40, 60, 80, 100
        const grayscalePercentage = 100 - colorPercentage;

        // Apply filter grayscale in CSS
        worldImg.style.filter = `grayscale(${grayscalePercentage}%)`;

        if (unlockedCount === 5) {
            progressText.textContent = "🌈 Your world is restored. Every small action brought color back.";
            imageFrame.classList.add('fully-restored');

            // Celebration trigger
            if (!state.worldCelebrated) {
                state.worldCelebrated = true;
                saveState();
                playSummonSFX();
                triggerConfettiCelebration();
                
                // Trigger Mother Earth Bot congratulatory message
                setTimeout(() => {
                    addBotMessage("🎉 AMAZING JOB, PLANETEER! Your world has returned to full, vibrant color! 🌈\n\nYour choices in food swaps, active commutes, recycling, energy conservation, and shopping have direct power. By uniting the 5 rings, you summoned Captain Planet and protected what you love! Keep up the real-world action! 🦸‍♂️🌍", [
                        { text: "Summon Captain Planet Again ⚡", action: "summon_flourish" },
                        { text: "Review Console Log 📊", action: "tips" }
                    ]);
                }, 1000);
            }
        } else {
            progressText.textContent = `Restored: ${colorPercentage}% (Grayscale ${grayscalePercentage}%)`;
            imageFrame.classList.remove('fully-restored');
        }
    } else {
        uploadZone.style.display = 'block';
        imageFrame.style.display = 'none';
        worldImg.src = '';
        progressText.textContent = 'Grayscale (0% Restored)';
        imageFrame.classList.remove('fully-restored');
    }
}

// Particle/confetti burst on hidden canvas overlay
function triggerConfettiCelebration() {
    const canvas = document.getElementById('world-celebration-canvas');
    if (!canvas) return;

    // Set canvas dimensions based on its bounding box
    canvas.width = canvas.offsetWidth || 300;
    canvas.height = canvas.offsetHeight || 225;

    const ctx = canvas.getContext('2d');
    const particles = [];
    const colors = ['#10b981', '#ef4444', '#38bdf8', '#2563eb', '#ec4899', '#fef08a'];

    // Create particles
    for (let i = 0; i < 80; i++) {
        particles.push({
            x: canvas.width / 2,
            y: canvas.height / 2,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8 - 3, // slightly upward
            size: Math.random() * 5 + 3,
            color: colors[Math.floor(Math.random() * colors.length)],
            alpha: 1,
            decay: Math.random() * 0.02 + 0.015
        });
    }

    let animationFrameId;
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        let active = false;
        particles.forEach(p => {
            if (p.alpha > 0) {
                active = true;
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.1; // gravity
                p.alpha -= p.decay;
                
                ctx.save();
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        });

        if (active) {
            animationFrameId = requestAnimationFrame(animate);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    animate();
}


// ----------------- PLANETEER RING CONTROLLER -----------------
function unlockRing(element) {
    if (!state.unlockedRings.includes(element)) {
        state.unlockedRings.push(element);
        const pts = PLANETEER_ELEMENTS[element].pts;
        state.points += pts;
        state.dailyPoints += pts;
        state.weeklyPoints += pts;
        state.monthlyPoints += pts;
        
        // Add class active on UI
        const slot = document.getElementById(`ring-${element}`);
        if (slot) slot.classList.add('active');

        playRingChimeSFX();
        showToast(`${PLANETEER_ELEMENTS[element].name} Activated! +${pts} pts! 🌟`);
        
        addBotMessage(`✨ **${PLANETEER_ELEMENTS[element].name} Activated!**\n\nYou successfully verified: *${PLANETEER_ELEMENTS[element].task}*.\n\nCarbon Saved: **${PLANETEER_ELEMENTS[element].co2} kg CO2e**. Earned **+${pts} EcoPoints**!`);
        
        // Check for Captain Planet summon
        if (state.unlockedRings.length === 5) {
            triggerCaptainPlanetSummon();
        }

        saveState();
        renderAll();
    }
}

function completeActionSuccess(action, element, imageBase64, details = null) {
    // 1. Add points to state
    state.points += action.pts;
    state.dailyPoints += action.pts;
    state.weeklyPoints += action.pts;
    state.monthlyPoints += action.pts;

    // 2. Add saved carbon
    state.totalSavedKgCO2e += action.co2;

    // 3. Track daily completed action
    if (!state.dailyCompletedActionIds.includes(action.id)) {
        state.dailyCompletedActionIds.push(action.id);
    }

    // 4. Create verified proof
    const proof = {
        actionId: action.id,
        title: action.title,
        element: element,
        co2: action.co2,
        pts: action.pts,
        image: imageBase64 || null,
        details: details || "Action verified",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    state.proofs.push(proof);

    // 5. Add to community wins feed
    const newWin = {
        name: "You",
        action: action.title.toLowerCase(),
        element: element,
        co2: action.co2,
        timestamp: "Just now"
    };
    state.communityWins.unshift(newWin);
    if (state.communityWins.length > 20) {
        state.communityWins.pop();
    }

    showToast(`Action Verified! +${action.pts} pts! 🚀`);

    // 6. Trigger elements ring unlock
    unlockRing(element);

    // 7. Save state and render
    saveState();
    renderAll();
    closeVerifyModal();
}
window.completeActionSuccess = completeActionSuccess; // Expose globally

function lockRing(element) {
    const index = state.unlockedRings.indexOf(element);
    if (index !== -1) {
        state.unlockedRings.splice(index, 1);
        const pts = PLANETEER_ELEMENTS[element].pts;
        state.points = Math.max(0, state.points - pts);
        state.dailyPoints = Math.max(0, state.dailyPoints - pts);
        state.weeklyPoints = Math.max(0, state.weeklyPoints - pts);
        state.monthlyPoints = Math.max(0, state.monthlyPoints - pts);
        
        const slot = document.getElementById(`ring-${element}`);
        if (slot) slot.classList.remove('active');

        saveState();
        renderAll();
    }
}

function triggerCaptainPlanetSummon() {
    playSummonSFX();
    showToast("🦸‍♂️ BY YOUR POWERS COMBINED, CAPTAIN PLANET SUMMONED! 🦸‍♂️");
    
    // Add bot message
    addBotMessage("🦸‍♂️ **Captain Planet: 'By your powers combined, I am here!** You have successfully balanced all five elements and reached a net-zero trajectory. Remember Planeteers, the power is yours! Go Planet! 🌍' ");
}

// ----------------- CARBON ENGINE (COPILOT ADAPTED) -----------------
function calculateEmissions() {
    // Standard baseline emissions (Tons CO2e/year)
    // We calibrate based on region average, subtracted by rings unlocked and offsets
    const region = state.region || 'global';
    
    // Regional Baseline
    let baseCarbon = 4.8; // global avg
    if (region === 'us') baseCarbon = 15.5;
    else if (region === 'eu') baseCarbon = 6.5;
    else if (region === 'in') baseCarbon = 1.9;

    // Personal lifestyle override (from the "My Lifestyle" form) takes precedence
    // over the regional default, making the footprint reflect the actual user.
    if (typeof state.baseCarbonOverride === 'number' && state.baseCarbonOverride > 0) {
        baseCarbon = state.baseCarbonOverride;
    }

    // Direct reductions from unlocked rings
    let ringReductions = 0;
    state.unlockedRings.forEach(r => {
        const details = PLANETEER_ELEMENTS[r];
        if (details) {
            // annualize reductions (e.g. 15kg weekly commute = 0.78 tons)
            ringReductions += (details.co2 * 52) / 1000;
        }
    });

    const totalRaw = baseCarbon;
    const offsetTons = totalRaw * (state.offsetAmount / 100);
    const totalProjected = Math.max(0.0, totalRaw - ringReductions - offsetTons);

    return {
        transport: Math.max(0.1, baseCarbon * 0.35 - (state.unlockedRings.includes('wind') ? 0.78 : 0)),
        energy: Math.max(0.1, baseCarbon * 0.3 - (state.unlockedRings.includes('fire') ? 0.41 : 0)),
        diet: Math.max(0.1, baseCarbon * 0.22 - (state.unlockedRings.includes('water') ? 0.52 : 0)),
        waste: Math.max(0.1, baseCarbon * 0.13 - (state.unlockedRings.includes('earth') ? 0.25 : 0)),
        totalRaw: totalRaw,
        reductions: ringReductions + offsetTons,
        totalProjected: totalProjected
    };
}

// ----------------- RENDER ENGINE -----------------
function renderAll() {
    const emissions = calculateEmissions();
    const displayPoints = state.points + Math.round((state.offsetAmount || 0) / 2);

    // Update Header
    document.getElementById('header-points').textContent = displayPoints;
    
    // Ranks mapping
    let currentRank = RANKS[0];
    for (let i = 0; i < RANKS.length; i++) {
        if (displayPoints >= RANKS[i].threshold) {
            currentRank = RANKS[i];
        }
    }
    document.getElementById('header-badge').textContent = `${currentRank.icon} ${currentRank.name}`;

    // Update Console Metrics
    const totalCo2Span = document.getElementById('dashboard-total-co2');
    if (totalCo2Span) totalCo2Span.textContent = emissions.totalProjected.toFixed(1);

    const activeSpan = document.getElementById('dashboard-active-challenges');
    if (activeSpan) activeSpan.textContent = state.unlockedRings.length.toString() + "/5";

    const ptsSpan = document.getElementById('dashboard-points');
    if (ptsSpan) ptsSpan.textContent = displayPoints;

    const reductionSpan = document.getElementById('dashboard-reduction');
    if (reductionSpan) reductionSpan.textContent = `${Math.round(emissions.reductions * 1000)} kg/yr`;

    // Regional averages comparison
    const region = state.region || 'global';
    const regionAvg = EMISSION_FACTORS.regionalAverages[region] || 4.8;
    const comparisonText = document.getElementById('comparison-text');
    const comparisonFill = document.getElementById('comparison-fill');
    
    if (comparisonText && comparisonFill) {
        const pctOfAvg = (emissions.totalProjected / regionAvg) * 100;
        let labelText = "";
        if (pctOfAvg < 50) {
            labelText = `${Math.round(100 - pctOfAvg)}% below average (Planet Saved! 🦸‍♂️)`;
            comparisonFill.style.background = "linear-gradient(90deg, #10b981 0%, #34d399 100%)";
        } else if (pctOfAvg <= 100) {
            labelText = `${Math.round(100 - pctOfAvg)}% below average (Good Job 🌿)`;
            comparisonFill.style.background = "linear-gradient(90deg, #10b981 0%, #f59e0b 100%)";
        } else {
            labelText = `${Math.round(pctOfAvg - 100)}% above average (Smog Rising ⚠️)`;
            comparisonFill.style.background = "linear-gradient(90deg, #f59e0b 0%, #f43f5e 100%)";
        }
        comparisonText.textContent = labelText;
        comparisonFill.style.width = `${Math.max(5, Math.min(100, pctOfAvg))}%`;
    }

    // Render active state on Ring Slots
    setupRingSlotsUI();

    // Render Mother Earth SVG
    updateGaiaEcoWorldSVG(emissions);

    // Update Color My World photo states
    updateColorMyWorldCard();

    // Render visual doughnut
    renderDoughnutChart(emissions);

    // Render historical bar chart
    renderHistoricalChart(emissions);

    // Render offset trees card
    renderOffsetCard(emissions);

    // Generate insights
    generateInsights(emissions);

    // Render newly added MVP modules
    renderMonthlyMission();
    renderActionLibrary();
    renderProofGallery();
    renderCommunityWins();
}

function setupRingSlotsUI() {
    document.querySelectorAll('.ring-slot').forEach(slot => {
        const el = slot.getAttribute('data-element');
        if (state.unlockedRings.includes(el)) {
            slot.classList.add('active');
        } else {
            slot.classList.remove('active');
        }
    });

    const alert = document.getElementById('summon-alert');
    if (alert) {
        if (state.unlockedRings.length === 5) {
            alert.textContent = "🦸‍♂️ CAPTAIN PLANET IS ACTIVE! GO PLANET! 🌍";
            alert.classList.add('summoned');
        } else {
            alert.textContent = `Elements active: ${state.unlockedRings.length}/5 (Unleash Earth, Fire, Wind, Water, Heart)`;
            alert.classList.remove('summoned');
        }
    }
}

// ----------------- MOTHER EARTH THREE.JS ANIMATOR -----------------
function updateGaiaEcoWorldSVG(emissions) {
    const healthBadge = document.getElementById('gaia-health-badge');
    const earthAura = document.getElementById('earth-aura');

    // Health matches activated rings (20% per ring)
    const healthPct = state.unlockedRings.length * 20;
    
    if (healthBadge) {
        healthBadge.textContent = `Health: ${healthPct}%`;
        if (healthPct >= 80) healthBadge.style.borderColor = 'var(--primary)';
        else if (healthPct >= 40) healthBadge.style.borderColor = 'var(--accent-orange)';
        else healthBadge.style.borderColor = 'var(--color-fire)';
    }

    if (earthAura) {
        if (healthPct > 0) {
            // Fades from transparent/slate to bright cyan/emerald aura pulse
            const opacity = 0.15 + (healthPct / 100) * 0.45;
            const size = 170 + (healthPct / 100) * 20;
            const spread = 20 + (healthPct / 100) * 30;
            earthAura.style.width = `${size}px`;
            earthAura.style.height = `${size}px`;
            earthAura.style.background = `radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, rgba(56, 189, 248, 0.05) 50%, transparent 70%)`;
            earthAura.style.boxShadow = `0 0 ${spread}px rgba(16, 185, 129, ${opacity})`;
        } else {
            // Dormant state - very subtle low glow
            earthAura.style.width = `170px`;
            earthAura.style.height = `170px`;
            earthAura.style.background = 'radial-gradient(circle, rgba(100, 116, 139, 0.05) 0%, transparent 70%)';
            earthAura.style.boxShadow = 'none';
        }
    }

    // Update Three.js Canvas Grayscale Filter based on Health Percentage
    updateThreeJSEarth();
}

// ----------------- DECISION COPILOT MODALS -----------------
function openDecisionModal(lens) {
    const modal = document.getElementById('decision-modal');
    const content = document.getElementById('modal-lens-content');
    if (!modal || !content) return;

    state.activeNudge = lens;
    
    let html = '';
    
    if (lens === 'food') {
        html = `
            <h3>🍔 Food Order Lens</h3>
            <p class="section-desc">EcoSync is intercepting your food delivery cart (Zomato/Swiggy simulation). Make a choice:</p>
            
            <div class="mock-order-screen">
                <span class="mock-title">ACTIVE DELIVERY BASKET</span>
                <div class="mock-menu-grid">
                    <div class="mock-menu-item" id="food-beef" onclick="triggerCarbonNudge('food', 'beef')">
                        <div class="item-details">
                            <span class="item-name">Pepperoni Beef Pizza 🍕🥩</span>
                            <span class="item-desc">High industrial carbon emissions</span>
                        </div>
                        <span class="item-action-trigger">Select & Checkout</span>
                    </div>
                    <div class="mock-menu-item" id="food-chicken" onclick="triggerCarbonNudge('food', 'chicken')">
                        <div class="item-details">
                            <span class="item-name">Tandoori Chicken Roll 🌯</span>
                            <span class="item-desc">Moderate poultry footprint</span>
                        </div>
                        <span class="item-action-trigger">Select & Checkout</span>
                    </div>
                    <div class="mock-menu-item" id="food-veg" onclick="triggerCarbonNudge('food', 'veg')">
                        <div class="item-details">
                            <span class="item-name">Paneer Tikka Veg Thali 🍲🥦</span>
                            <span class="item-desc">Low emissions, plant-forward</span>
                        </div>
                        <span class="item-action-trigger">Select & Checkout</span>
                    </div>
                </div>
                
                <div id="active-nudge-box" style="display: none;"></div>
            </div>
        `;
    } 
    else if (lens === 'commute') {
        html = `
            <h3>🚗 Commute Route Lens</h3>
            <p class="section-desc">Simulating destination mapping. Propose transit commute before you start the car:</p>
            
            <div class="mock-map-screen">
                <span class="mock-title">ROUTING: HOME TO OFFICE (15 KM)</span>
                <div class="mock-routes-list">
                    <div class="mock-route-item" onclick="triggerCarbonNudge('commute', 'suv')">
                        <div class="item-details">
                            <span class="item-name">Drive gasoline SUV (Fastest)</span>
                            <span class="route-details">Petrol engine • 15.6 kg CO2e</span>
                        </div>
                        <span class="item-action-trigger">Start Drive</span>
                    </div>
                    <div class="mock-route-item" onclick="triggerCarbonNudge('commute', 'transit')">
                        <div class="item-details">
                            <span class="item-name">Take Metro Line 2 (Bus / Train)</span>
                            <span class="route-details">Clean grid rail • 1.1 kg CO2e</span>
                        </div>
                        <span class="item-action-trigger">Select Metro</span>
                    </div>
                    <div class="mock-route-item" onclick="triggerCarbonNudge('commute', 'active')">
                        <div class="item-details">
                            <span class="item-name">Cycle / Walk (Clean Air Route)</span>
                            <span class="route-details">Zero Tailpipe • 0.0 kg CO2e</span>
                        </div>
                        <span class="item-action-trigger">Select Bike</span>
                    </div>
                </div>
                
                <div id="active-nudge-box" style="display: none;"></div>
            </div>
        `;
    }
    else if (lens === 'shopping') {
        html = `
            <h3>🛍️ Shopping Scanner</h3>
            <p class="section-desc">Simulates scanning product labels or store shopping carts to inspect sustainability lifecycles:</p>
            
            <div class="mock-scanner-screen">
                <span class="mock-title">ITEM SCANNER READOUT</span>
                <div class="mock-menu-grid">
                    <div class="mock-menu-item" onclick="triggerCarbonNudge('shopping', 'fastfashion')">
                        <div class="item-details">
                            <span class="item-name">Fast-Fashion Denim Jeans 👖</span>
                            <span class="item-desc">Heavy water footprint, synthetic dye</span>
                        </div>
                        <span class="item-action-trigger">Scan Barcode</span>
                    </div>
                    <div class="mock-menu-item" onclick="triggerCarbonNudge('shopping', 'secondhand')">
                        <div class="item-details">
                            <span class="item-name">Vintage Upcycled Jacket 🧥</span>
                            <span class="item-desc">Thrifted secondhand, zero build carbon</span>
                        </div>
                        <span class="item-action-trigger">Scan Barcode</span>
                    </div>
                </div>
                
                <div id="active-nudge-box" style="display: none;"></div>
            </div>
        `;
    }
    else if (lens === 'waste') {
        html = `
            <h3>♻️ Waste Classifier</h3>
            <p class="section-desc">Classifies material waste using device cameras to guide recycling and composting sorting.</p>
            
            <div class="mock-scanner-screen">
                <span class="mock-title">LENS DETECTOR VIEWPORT</span>
                <button class="btn btn-primary" onclick="triggerCarbonNudge('waste', 'detect')">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="margin-right-sm"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    Open Live Camera Scanner
                </button>
                <div id="active-nudge-box" style="display: none; margin-top: 1rem;"></div>
            </div>
        `;
    }
    else if (lens === 'energy') {
        html = `
            <h3>⚡ Energy Saver Lens</h3>
            <p class="section-desc">Intercept high electricity load decisions. Choose a clean energy action to verify and save CO2:</p>
            
            <div class="mock-order-screen">
                <span class="mock-title">ACTIVE POWER OUTLET SELECTOR</span>
                <div class="mock-menu-grid">
                    <div class="mock-menu-item" onclick="triggerCarbonNudge('energy', 'standby')">
                        <div class="item-details">
                            <span class="item-name">Turn off Standby Appliances 🔌</span>
                            <span class="item-desc">Cuts vampire draw of idle electronics</span>
                        </div>
                        <span class="item-action-trigger">Select Action</span>
                    </div>
                    <div class="mock-menu-item" onclick="triggerCarbonNudge('energy', 'ac')">
                        <div class="item-details">
                            <span class="item-name">Set AC to 24–26°C ❄️</span>
                            <span class="item-desc">Optimal energy saving thermostat setting</span>
                        </div>
                        <span class="item-action-trigger">Select Action</span>
                    </div>
                    <div class="mock-menu-item" onclick="triggerCarbonNudge('energy', 'naturallight')">
                        <div class="item-details">
                            <span class="item-name">Use Natural Light ☀️</span>
                            <span class="item-desc">Turn off overhead lamps during daytime</span>
                        </div>
                        <span class="item-action-trigger">Select Action</span>
                    </div>
                    <div class="mock-menu-item" onclick="triggerCarbonNudge('energy', 'unplug')">
                        <div class="item-details">
                            <span class="item-name">Unplug Charger Adapters 🔋</span>
                            <span class="item-desc">Stops energy leak from wall plugs</span>
                        </div>
                        <span class="item-action-trigger">Select Action</span>
                    </div>
                    <div class="mock-menu-item" onclick="triggerCarbonNudge('energy', 'fan')">
                        <div class="item-details">
                            <span class="item-name">Use Fan instead of AC for 1 Hour 🪭</span>
                            <span class="item-desc">Saves ~90% power compared to AC compressor</span>
                        </div>
                        <span class="item-action-trigger">Select Action</span>
                    </div>
                </div>
                
                <div id="active-nudge-box" style="display: none;"></div>
            </div>
        `;
    }

    content.innerHTML = html;
    modal.style.display = 'flex';
}

function closeDecisionModal() {
    document.getElementById('decision-modal').style.display = 'none';
    state.activeNudge = null;
}

// ----------------- DYNAMIC NUDGES & SWAPS -----------------
function runAgentTimeline(lens, selection, callback) {
    const nudgeBox = document.getElementById('active-nudge-box');
    if (!nudgeBox) {
        callback();
        return;
    }

    nudgeBox.style.display = 'block';
    nudgeBox.innerHTML = `
        <div class="agent-timeline-container">
            <div class="agent-timeline-title">🤖 Active Multi-Agent Pipeline:</div>
            <div class="agent-timeline">
                <div class="agent-step" id="step-context"><span class="step-dot"></span>Context Agent</div>
                <div class="agent-arrow">➔</div>
                <div class="agent-step" id="step-carbon"><span class="step-dot"></span>Carbon Agent</div>
                <div class="agent-arrow">➔</div>
                <div class="agent-step" id="step-swap"><span class="step-dot"></span>Swap Agent</div>
                <div class="agent-arrow">➔</div>
                <div class="agent-step" id="step-nudge"><span class="step-dot"></span>Nudge Agent</div>
                <div class="agent-arrow">➔</div>
                <div class="agent-step" id="step-verify"><span class="step-dot"></span>Verification Agent</div>
                <div class="agent-arrow">➔</div>
                <div class="agent-step" id="step-motherearth"><span class="step-dot"></span>Mother Earth Agent</div>
            </div>
        </div>
    `;

    const steps = ['context', 'carbon', 'swap', 'nudge', 'verify', 'motherearth'];
    let currentIdx = 0;

    function nextStep() {
        if (currentIdx > 0) {
            const prevStep = document.getElementById(`step-${steps[currentIdx - 1]}`);
            if (prevStep) {
                prevStep.classList.remove('active');
                prevStep.classList.add('completed');
            }
        }
        if (currentIdx < steps.length) {
            const currStep = document.getElementById(`step-${steps[currentIdx]}`);
            if (currStep) {
                currStep.classList.add('active');
            }
            currentIdx++;
            playAgentTickSound();
            setTimeout(nextStep, 200); // 200ms per step animation
        } else {
            callback();
        }
    }

    nextStep();
}

function playAgentTickSound() {
    initAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1600, now);
    gain.gain.setValueAtTime(0.015, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
}

function triggerCarbonNudge(lens, selection) {
    const nudgeBox = document.getElementById('active-nudge-box');
    if (!nudgeBox) return;

    runAgentTimeline(lens, selection, () => {
        let nudgeHTML = '';

        if (lens === 'food') {
            if (selection === 'beef') {
                nudgeHTML = `
                    <div class="nudge-panel">
                        <div class="nudge-header">⚠️ Carbon Copilot Alert</div>
                        <p class="nudge-desc">Your choice (Pepperoni Beef Pizza) generates **22.4 kg CO2e**. Beef production requires 20x more land and emits 10x more greenhouse gases than plant alternatives.</p>
                        <p class="nudge-desc">💡 **Planeteer Swap**: Margherita Veg Thali (**1.2 kg CO2**). Saves **21.2 kg** of CO2!</p>
                        <div class="nudge-buttons">
                            <button class="btn btn-primary btn-sm" onclick="acceptDecisionSwap('food', 'veg')">Accept Veg Swap ✅</button>
                            <button class="btn btn-secondary btn-sm" onclick="rejectDecisionSwap('food')">Ignore Nudge ❌</button>
                        </div>
                    </div>
                `;
            } 
            else if (selection === 'chicken') {
                nudgeHTML = `
                    <div class="nudge-panel">
                        <div class="nudge-header">⚠️ Carbon Copilot Alert</div>
                        <p class="nudge-desc">Chicken has lower emissions than beef, but still generates **5.8 kg CO2e**. </p>
                        <p class="nudge-desc">💡 **Planeteer Swap**: Veg Thali (**1.2 kg CO2**). Saves **4.6 kg** of CO2!</p>
                        <div class="nudge-buttons">
                            <button class="btn btn-primary btn-sm" onclick="acceptDecisionSwap('food', 'veg')">Accept Veg Swap ✅</button>
                            <button class="btn btn-secondary btn-sm" onclick="rejectDecisionSwap('food')">Ignore Nudge ❌</button>
                        </div>
                    </div>
                `;
            }
            else {
                nudgeHTML = `
                    <div class="nudge-panel green-glow">
                        <div class="nudge-header">🌿 Mother Earth Check Completed</div>
                        <p class="nudge-desc">Veg Thali selected (**1.2 kg CO2**). This is a highly sustainable, low-carbon choice! Let's submit proof to unlock the **Water Ring**.</p>
                        <div class="nudge-buttons">
                            <button class="btn btn-primary btn-sm" onclick="initiateSensorVerification('food')">Submit Food Verification Proof</button>
                        </div>
                    </div>
                `;
            }
        }
        else if (lens === 'commute') {
            if (selection === 'suv') {
                nudgeHTML = `
                    <div class="nudge-panel">
                        <div class="nudge-header">⚠️ Carbon Copilot Alert</div>
                        <p class="nudge-desc">Driving generates **15.6 kg CO2e**. Running a single-occupant gasoline SUV releases heavy tailpipe smog into the air.</p>
                        <p class="nudge-desc">💡 **Planeteer Swap**: Take Metro Line 2 (**1.1 kg CO2**) or Cycle. Saves **14.5 kg** of CO2!</p>
                        <div class="nudge-buttons">
                            <button class="btn btn-primary btn-sm" onclick="acceptDecisionSwap('commute', 'transit')">Accept Metro Swap ✅</button>
                            <button class="btn btn-secondary btn-sm" onclick="rejectDecisionSwap('commute')">Ignore Nudge ❌</button>
                        </div>
                    </div>
                `;
            }
            else {
                const label = selection === 'transit' ? 'Metro Transit' : 'Active Cycling';
                const value = selection === 'transit' ? '1.1 kg' : '0.0 kg';
                nudgeHTML = `
                    <div class="nudge-panel green-glow">
                        <div class="nudge-header">🌿 Mother Earth Check Completed</div>
                        <p class="nudge-desc">${label} selected (${value} CO2). Great choice for clean air! Let's submit browser location or motion proof to activate the **Wind Ring**.</p>
                        <div class="nudge-buttons">
                            <button class="btn btn-primary btn-sm" onclick="initiateSensorVerification('commute')">Submit Commute Verification Proof</button>
                        </div>
                    </div>
                `;
            }
        }
        else if (lens === 'shopping') {
            if (selection === 'fastfashion') {
                nudgeHTML = `
                    <div class="nudge-panel">
                        <div class="nudge-header">⚠️ Carbon Copilot Alert</div>
                        <p class="nudge-desc">Fast fashion jeans generate **25.0 kg CO2e** due to resource-heavy manufacturing, dyeing, and shipping.</p>
                        <p class="nudge-desc">💡 **Planeteer Swap**: Vintage Upcycled thrift jacket (**1.5 kg CO2**). Saves **23.5 kg** of CO2!</p>
                        <div class="nudge-buttons">
                            <button class="btn btn-primary btn-sm" onclick="acceptDecisionSwap('shopping', 'secondhand')">Accept Vintage Swap ✅</button>
                            <button class="btn btn-secondary btn-sm" onclick="rejectDecisionSwap('shopping')">Ignore Nudge ❌</button>
                        </div>
                    </div>
                `;
            }
            else {
                nudgeHTML = `
                    <div class="nudge-panel green-glow">
                        <div class="nudge-header">🌿 Mother Earth Check Completed</div>
                        <p class="nudge-desc">Vintage Upcycled Jacket selected (**1.5 kg CO2**). Highly circular, low-waste choice! Let's scan purchase receipt to activate the **Heart Ring**.</p>
                        <div class="nudge-buttons">
                            <button class="btn btn-primary btn-sm" onclick="initiateSensorVerification('shopping')">Submit Purchase Verification Proof</button>
                        </div>
                    </div>
                `;
            }
        }
        else if (lens === 'waste') {
            nudgeHTML = `
                <div class="nudge-panel green-glow">
                    <div class="nudge-header">🌿 Mother Earth Check Completed</div>
                    <p class="nudge-desc">Material waste scanner initialized. Let's start the camera scanner to classify plastics/paper and unlock the **Earth Ring**.</p>
                    <div class="nudge-buttons">
                        <button class="btn btn-primary btn-sm" onclick="initiateSensorVerification('waste')">Open Camera Scanner</button>
                    </div>
                </div>
            `;
        }
        else if (lens === 'energy') {
            const energyActions = {
                standby: { name: "Turn off Standby Appliances", co2: "0.2 kg" },
                ac: { name: "Set AC to 24-26°C", co2: "1.5 kg" },
                naturallight: { name: "Use Natural Light", co2: "0.1 kg" },
                unplug: { name: "Unplug Charger Adapters", co2: "0.05 kg" },
                fan: { name: "Use Fan instead of AC for 1 hour", co2: "0.3 kg" }
            };
            const action = energyActions[selection] || { name: "Energy saving action", co2: "0.5 kg" };
            nudgeHTML = `
                <div class="nudge-panel green-glow">
                    <div class="nudge-header">🌿 Mother Earth Check Completed</div>
                    <p class="nudge-desc">${action.name} selected (${action.co2} CO2 saved). Outstanding power conservation choice! Let's submit verification to activate the **Fire Ring**.</p>
                    <div class="nudge-buttons">
                        <button class="btn btn-primary btn-sm" onclick="initiateSensorVerification('energy')">Submit Energy Verification Proof</button>
                    </div>
                </div>
            `;
        }

        nudgeBox.innerHTML = nudgeHTML;
        nudgeBox.style.display = 'block';
    });
}

function acceptDecisionSwap(lens, swapOption) {
    showToast("Planeteer Swap Accepted! Impact logged.");
    triggerCarbonNudge(lens, swapOption);
}

function rejectDecisionSwap(lens) {
    showToast("Choice ignored. Smog levels increased.");
    addBotMessage("⚠️ **Mother Earth Warning**: A high-carbon decision was made without a swap. Smog particles have increased. Unlocking rings will help clear the air.");
    
    // increase smog visuals manually for a brief moment
    const smog = document.getElementById('svg-smog');
    if (smog) smog.setAttribute('opacity', '0.75');
    
    closeDecisionModal();
    renderAll();
}

// ----------------- HARDWARE SENSOR VERIFICATIONS -----------------
let localStream = null;

function initiateSensorVerification(lens) {
    closeDecisionModal();
    const modal = document.getElementById('verify-modal');
    const container = document.getElementById('verify-interface-container');
    if (!modal || !container) return;

    let html = '';

    if (lens === 'food' || lens === 'waste' || lens === 'shopping') {
        // Camera verification (live media getUserMedia)
        html = `
            <div class="mock-scanner-screen">
                <span class="mock-title">CAMERA DETECTION FEED</span>
                <div class="camera-feed-viewport">
                    <video id="webcam-feed" autoplay playsinline muted></video>
                    <div class="scanner-overlay">
                        <div class="scanner-line"></div>
                        <div class="scanner-corner top-left"></div>
                        <div class="scanner-corner top-right"></div>
                        <div class="scanner-corner bottom-left"></div>
                        <div class="scanner-corner bottom-right"></div>
                    </div>
                </div>
                <div class="progress-bar-bg" style="height: 6px;">
                    <div class="progress-bar-fill" id="scan-progress" style="width: 0%"></div>
                </div>
                <span class="input-subtext text-center" id="scan-status">Opening camera stream...</span>
            </div>
        `;
        
        container.innerHTML = html;
        modal.style.display = 'flex';
        
        // Start webcam stream
        startWebcamStream();
        simulateProgressVerification('scan-progress', 'scan-status', 'Analyzing items...', 'Verification Match Approved! Recyclable/Eco-friendly item detected.', () => {
            stopWebcamStream();
            const elementToUnlock = lens === 'food' ? 'water' : (lens === 'waste' ? 'earth' : 'heart');
            unlockRing(elementToUnlock);
            closeVerifyModal();
        });
    }
    else if (lens === 'commute') {
        // Location Geolocation verification
        html = `
            <div class="mock-scanner-screen">
                <span class="mock-title">GEOLOCATION GPS RECEIVER</span>
                <div class="gps-coordinates-readout">
                    <div class="gps-row"><span>CALIBRATING SATELLITES...</span><span class="blink">LOCK</span></div>
                    <div class="gps-row"><span>LATITUDE:</span><span id="gps-lat">Capturing...</span></div>
                    <div class="gps-row"><span>LONGITUDE:</span><span id="gps-lng">Capturing...</span></div>
                    <div class="gps-row"><span>ACCURACY:</span><span id="gps-acc">Capturing...</span></div>
                    <div class="gps-row"><span>STATUS:</span><span id="gps-status">Verifying nearby transit nodes...</span></div>
                </div>
                <div class="progress-bar-bg" style="height: 6px;">
                    <div class="progress-bar-fill" id="gps-progress" style="width: 0%"></div>
                </div>
            </div>
        `;
        container.innerHTML = html;
        modal.style.display = 'flex';

        // Trigger real Geolocation API if available
        captureRealGeolocation();
        simulateProgressVerification('gps-progress', null, null, null, () => {
            unlockRing('wind');
            closeVerifyModal();
        });
    }
    else if (lens === 'energy') {
        // Smart meter power draw verification
        html = `
            <div class="mock-scanner-screen">
                <span class="mock-title">SMART PLUG ENERGY MONITOR</span>
                <div class="gps-coordinates-readout" style="color: var(--color-fire); border-color: rgba(239, 68, 68, 0.4);">
                    <div class="gps-row"><span style="color: var(--color-fire);">SMART OUTLET DETECTED</span><span class="blink" style="color: var(--color-fire);">LIVE</span></div>
                    <div class="gps-row"><span>DEVICE TYPE:</span><span>Standby Outlet / AC Controller</span></div>
                    <div class="gps-row"><span>PREVIOUS LOAD:</span><span>850 W</span></div>
                    <div class="gps-row"><span>CURRENT LOAD:</span><span id="meter-load">Verifying cut...</span></div>
                    <div class="gps-row"><span>SAVINGS INDEX:</span><span id="meter-savings">Pending...</span></div>
                </div>
                <div class="progress-bar-bg" style="height: 6px;">
                    <div class="progress-bar-fill" id="energy-progress" style="width: 0%"></div>
                </div>
            </div>
        `;
        container.innerHTML = html;
        modal.style.display = 'flex';

        // Animate smart meter load reduction
        setTimeout(() => {
            const loadEl = document.getElementById('meter-load');
            const savingsEl = document.getElementById('meter-savings');
            if (loadEl) loadEl.innerHTML = "<span style='color: var(--color-earth);'>42 W (Energy cut 95%!)</span>";
            if (savingsEl) savingsEl.innerHTML = "<span style='color: var(--color-earth);'>+0.8 kg CO2/hr</span>";
        }, 1500);

        simulateProgressVerification('energy-progress', null, null, null, () => {
            unlockRing('fire');
            closeVerifyModal();
        });
    }

    // Bind verification confirm button click
    document.getElementById('btn-confirm-verify').onclick = () => {
        stopWebcamStream();
        // Fallback immediate unlock
        const elementToUnlock = lens === 'food' ? 'water' : (lens === 'waste' ? 'earth' : (lens === 'commute' ? 'wind' : (lens === 'energy' ? 'fire' : 'heart')));
        unlockRing(elementToUnlock);
        closeVerifyModal();
    };
}

function startWebcamStream() {
    const video = document.getElementById('webcam-feed');
    if (!video) return;

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            .then(stream => {
                localStream = stream;
                video.srcObject = stream;
                video.play();
            })
            .catch(err => {
                console.error("Camera access blocked", err);
                document.getElementById('scan-status').textContent = "Camera blocked. Simulating capture view...";
            });
    }
}

function stopWebcamStream() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
}

function captureRealGeolocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            document.getElementById('gps-lat').textContent = position.coords.latitude.toFixed(6) + ' N';
            document.getElementById('gps-lng').textContent = position.coords.longitude.toFixed(6) + ' E';
            document.getElementById('gps-acc').textContent = position.coords.accuracy.toFixed(1) + ' meters';
            document.getElementById('gps-status').textContent = "Aligned with local Metro Route Line! Transit confirmed.";
        }, err => {
            console.error("Geolocation failed", err);
            // simulated coords
            document.getElementById('gps-lat').textContent = "12.9716 N (Simulated)";
            document.getElementById('gps-lng').textContent = "77.5946 E (Simulated)";
            document.getElementById('gps-acc').textContent = "5.0 meters";
            document.getElementById('gps-status').textContent = "Simulated Geolocation locked. Transit confirmed.";
        });
    }
}

function simulateProgressVerification(progressId, textId, initialText, successText, callback) {
    const bar = document.getElementById(progressId);
    let pct = 0;
    const interval = setInterval(() => {
        pct += 5;
        if (bar) bar.style.width = pct + '%';
        
        if (pct === 35 && textId && initialText) {
            document.getElementById(textId).textContent = initialText;
        }

        if (pct >= 100) {
            clearInterval(interval);
            if (textId && successText) {
                document.getElementById(textId).textContent = successText;
            }
            setTimeout(callback, 500);
        }
    }, 150);
}

function closeVerifyModal() {
    stopWebcamStream();
    if (typeof stopActionWebcamStream === 'function') {
        stopActionWebcamStream();
    }
    document.getElementById('verify-modal').style.display = 'none';
}

// ----------------- DOUGHNUT CHART RENDERER -----------------
function renderDoughnutChart(emissions) {
    const svg = document.getElementById('svg-doughnut');
    const legend = document.getElementById('chart-legend');
    const overlayVal = document.getElementById('chart-overlay-value');
    if (!svg || !legend) return;

    const categories = [
        { key: 'transport', label: 'Transport', color: 'var(--accent-blue)', val: emissions.transport },
        { key: 'energy', label: 'Energy', color: 'var(--accent-orange)', val: emissions.energy },
        { key: 'diet', label: 'Diet & Food', color: 'var(--color-water)', val: emissions.diet },
        { key: 'waste', label: 'Waste', color: 'var(--primary)', val: emissions.waste }
    ];

    const totalVal = categories.reduce((sum, cat) => sum + cat.val, 0);
    const C = 251.327;
    let accumulatedOffset = 0;
    
    // Clear old segments
    svg.querySelectorAll('.chart-segment').forEach(s => s.remove());
    let legendHTML = '';

    categories.forEach(cat => {
        const pct = cat.val / totalVal;
        const dashLen = pct * C;
        const dashOffset = -accumulatedOffset;
        
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
        
        path.addEventListener('mouseover', () => {
            overlayVal.textContent = `${Math.round(pct * 100)}%`;
            overlayVal.style.color = cat.color;
        });
        path.addEventListener('mouseout', () => {
            overlayVal.textContent = `${Math.max(0, Math.round((1 - (emissions.reductions / emissions.totalRaw)) * 100))}%`;
            overlayVal.style.color = 'var(--text-main)';
        });

        svg.appendChild(path);
        accumulatedOffset += dashLen;

        legendHTML += `
            <div class="legend-item">
                <span class="legend-color" style="background-color: ${cat.color}"></span>
                <span>${cat.label}</span>
                <span class="legend-val">${cat.val.toFixed(1)} t</span>
            </div>
        `;
    });

    legend.innerHTML = legendHTML;
    const activePct = emissions.totalRaw > 0 ? (1 - (emissions.reductions / emissions.totalRaw)) * 100 : 100;
    overlayVal.textContent = `${Math.max(0, Math.round(activePct))}%`;
    overlayVal.style.color = 'var(--text-main)';
}

// ----------------- HISTORICAL BAR CHART -----------------
function renderHistoricalChart(emissions) {
    const container = document.getElementById('trend-bar-chart');
    if (!container) return;

    const w1 = 12.4;
    const w2 = 10.8;
    const w3 = 9.2;
    const w4 = emissions.totalProjected;
    
    const weeks = [
        { label: 'Wk 1', val: w1 },
        { label: 'Wk 2', val: w2 },
        { label: 'Wk 3', val: w3 },
        { label: 'Current', val: w4, isCurrent: true }
    ];

    const maxVal = Math.max(w1, w2, w3, w4, 15.0);

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
    const treesNeeded = Math.round(emissions.totalProjected / 0.022);
    offsetTrees.textContent = treesNeeded.toLocaleString();
}

// ----------------- PERSONALIZED INSIGHTS -----------------
function generateInsights(emissions) {
    const container = document.getElementById('insights-panel');
    if (!container) return;

    if (!emissions) {
        emissions = calculateEmissions();
    }

    const insights = [];

    if (!state.unlockedRings.includes('water')) {
        insights.push({
            category: 'food',
            title: 'Activate Water Element 💧',
            desc: 'Your food choices represent a major carbon and water footprint. Swapping a beef meal for a veggie thali cuts carbon by 90% and saves water.',
            impact: '💧 Water'
        });
    }

    if (!state.unlockedRings.includes('wind')) {
        insights.push({
            category: 'transport',
            title: 'Activate Wind Element 💨',
            desc: 'Daily commuting is releasing direct tailpipe emissions. Taking the metro or active cycling prevents smog in Mother Earth\'s atmosphere.',
            impact: '💨 Wind'
        });
    }

    if (!state.unlockedRings.includes('fire')) {
        insights.push({
            category: 'energy',
            title: 'Activate Fire Element 🔥',
            desc: 'Home energy standby use is a resource drain. Slide the Net-Zero Offset simulator to 50%+ or complete energy challenges to unlock.',
            impact: '🔥 Fire'
        });
    }

    if (!state.unlockedRings.includes('earth')) {
        insights.push({
            category: 'waste',
            title: 'Activate Earth Element 🪨',
            desc: 'Circular waste sorting is required. Initiate the Live Camera Scanner in the Waste Lens to verify your recycling choices.',
            impact: '🪨 Earth'
        });
    }

    let html = '';
    const topInsights = insights.slice(0, 3);
    
    if (topInsights.length === 0) {
        html = `
            <div class="insight-card waste">
                <div class="insight-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <div class="insight-details">
                    <h4>All Planeteer Rings Active! 🦸‍♂️</h4>
                    <p>Mother Earth is fully balanced! You have stabilized your carbon footprint. Continue monitoring your decision points and inspire other Planeteers!</p>
                </div>
                <span class="insight-impact">Net Zero 🌿</span>
            </div>
        `;
    } else {
        topInsights.forEach(ins => {
            let svgIcon = '';
            if (ins.category === 'transport') {
                svgIcon = '💨';
            } else if (ins.category === 'energy') {
                svgIcon = '🔥';
            } else if (ins.category === 'food') {
                svgIcon = '💧';
            } else {
                svgIcon = '🪨';
            }

            html += `
                <div class="insight-card ${ins.category}">
                    <div class="insight-icon" style="font-size: 1.5rem">${svgIcon}</div>
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

// ----------------- MOTHER EARTH TERMINAL CHAT ENGINE -----------------
function handleChatSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    addUserMessage(text);
    input.value = '';

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

    let formattedText = escapeHTML(text).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
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
    
    addBotMessage("Mother Earth Bot Terminal Reset. Ready to commune.", [
        { text: "Play Planeteer Trivia 🧠", action: "start_trivia" },
        { text: "Diagnose Footprint 📊", action: "analyze" }
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

// Bot dialogue decision loop
function processBotResponse(userInput) {
    const text = userInput.toLowerCase();
    
    if (state.triviaState.active) {
        handleTriviaAnswer(userInput);
        return;
    }

    if (text.includes('game') || text.includes('trivia') || text.includes('play')) {
        startTriviaGame();
        return;
    }

    if (text.includes('summon') || text.includes('captain planet')) {
        addBotMessage("To summon **Captain Planet**, you must activate all five rings. Choose decision lenses (Food, Commute, Shopping, Waste) on the dashboard and verify your actions! \n\n*\"By your powers combined, I am Captain Planet!\"*");
        return;
    }

    if (text.includes('analyze') || text.includes('footprint') || text.includes('diagnosis')) {
        const em = calculateEmissions();
        const score = em.totalProjected.toFixed(1);
        let reply = `Mother Earth Diagnosis: Your projected carbon footprint is **${score} tons CO2e** per year. \n\nActive Elements: **${state.unlockedRings.length}/5**\n`;
        state.unlockedRings.forEach(r => {
            reply += `✅ ${PLANETEER_ELEMENTS[r].name} (Active: -${PLANETEER_ELEMENTS[r].co2} kg CO2e/wk)\n`;
        });
        addBotMessage(reply, [
            { text: "Explain Elements 🪨", action: "explain_elements" }
        ]);
        return;
    }

    if (text.includes('tip') || text.includes('advice') || text.includes('help')) {
        addBotMessage("Mother Earth's tip: Adjusting your offset contributions to 50%+ unlocks the **Fire Ring**. Eating less beef unlocks the **Water Ring**. Walking or cycling unlocks the **Wind Ring**!");
        return;
    }

    addBotMessage("Mother Earth Terminal is online. I can assist with: \n\n• Trivia Game (*'Play Trivia'*)\n• EcoWorld Diagnoses (*'Diagnose Footprint'*)\n• Active Ring summaries\n\nWhat is your query, Planeteer?", [
        { text: "Play Planeteer Trivia 🧠", action: "start_trivia" },
        { text: "Diagnose Footprint 📊", action: "analyze" }
    ]);
}

// ----------------- TRIVIA GAME LOOP -----------------
function startTriviaGame() {
    state.triviaState.active = true;
    state.triviaState.questionIndex = 0;
    saveState();
    askTriviaQuestion();
}

function askTriviaQuestion() {
    const qIndex = state.triviaState.questionIndex;
    const qData = TRIVIA_QUESTIONS[qIndex];
    
    addBotMessage(`🌱 **Planeteer Trivia ${qIndex + 1}/3**:\n\n${qData.q}`, [
        { text: qData.options[0], action: "trivia_ans", param: "a" },
        { text: qData.options[1], action: "trivia_ans", param: "b" },
        { text: qData.options[2], action: "trivia_ans", param: "c" }
    ]);
}

function handleTriviaAnswer(userInput) {
    const qIndex = state.triviaState.questionIndex;
    const qData = TRIVIA_QUESTIONS[qIndex];
    
    let ans = userInput.toLowerCase().trim();
    if (ans.startsWith('a') || ans.includes('10%') || ans.includes('train')) ans = 'a';
    else if (ans.startsWith('b') || ans.includes('26%') || ans.includes('22')) ans = 'b';
    else if (ans.startsWith('c') || ans.includes('50%') || ans.includes('bus') || ans.includes('100')) ans = 'c';
    else ans = ans.charAt(0);

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
            addBotMessage("🎉 **Trivia completed!** Go Planet! The power is yours! 🌍", [
                { text: "View Dashboard 📊", action: "open_dashboard" },
                { text: "Ask Mother Earth for tips 💡", action: "tips" }
            ]);
        }
    }, 3000);
}

// Handle chat actions
function handleChatAction(action, param) {
    addUserMessage(`Selected: ${action} ${param ? '('+param+')' : ''}`);
    showTypingIndicator();

    setTimeout(() => {
        hideTypingIndicator();
        
        if (action === "start_trivia") {
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
        else if (action === "open_dashboard") {
            switchTab('lens');
        }
        else if (action === "explain_elements") {
            let desc = "**Planeteer Elements Summary**:\n\n";
            Object.keys(PLANETEER_ELEMENTS).forEach(key => {
                const el = PLANETEER_ELEMENTS[key];
                desc += `• **${el.name}** ${el.icon}: ${el.task} (+${el.pts} pts, -${el.co2} kg CO2e)\n`;
            });
            addBotMessage(desc);
        }
        else if (action === "summon_flourish") {
            playSummonSFX();
            addBotMessage("⚡ *THE POWER IS YOURS!* ⚡\n\nCaptain Planet sweeps across the biosphere to restore balance! Go Planet!");
        }
    }, 1000);
}

function toggleReflectionConsole() {
    const content = document.getElementById('reflection-console-content');
    const arrow = document.getElementById('reflection-toggle-arrow');
    if (!content || !arrow) return;
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        arrow.style.transform = 'rotate(180deg)';
    } else {
        content.style.display = 'none';
        arrow.style.transform = 'rotate(0deg)';
    }
}

// ----------------- UI UTILITIES -----------------
function showToast(msg) {
    const toast = document.getElementById('toast-notification');
    const toastMsg = document.getElementById('toast-message');
    if (toast && toastMsg) {
        toastMsg.textContent = msg;
        toast.style.display = 'flex';
        setTimeout(() => { toast.style.display = 'none'; }, 3500);
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

// Legacy helpers mapping
const RANKS = [
    { name: 'Planeteer Cadet', threshold: 0, icon: '🌱' },
    { name: 'Earth Ranger', threshold: 100, icon: '✂️' },
    { name: 'Eco Defender', threshold: 250, icon: '🛡️' },
    { name: 'Planet Guardian', threshold: 450, icon: '🌍' },
    { name: 'Captain Planet Summoner', threshold: 700, icon: '🦸‍♂️' }
];

const EMISSION_FACTORS = {
    regionalAverages: { us: 15.5, eu: 6.5, in: 1.9, global: 4.8 }
};

// ----------------- MVP MATURITY MODULES -----------------
let actionLocalStream = null;

function renderMonthlyMission() {
    const fill = document.getElementById('mission-progress-fill');
    const text = document.getElementById('mission-progress-text');
    const percent = document.getElementById('mission-percent-text');
    const emptyState = document.getElementById('mission-empty-state');
    if (!fill || !text || !percent) return;

    const target = 25.0; // 25 kg CO2e
    const current = state.totalSavedKgCO2e || 0;
    const pct = Math.min(100, Math.round((current / target) * 100));

    fill.style.width = pct + '%';
    text.textContent = `${current.toFixed(1)} / ${target.toFixed(1)} kg CO₂e saved`;
    percent.textContent = `${pct}% Complete`;

    if (emptyState) {
        if (current >= target) {
            emptyState.innerHTML = `🏆 <strong>Mission Accomplished!</strong> You saved ${current.toFixed(1)} kg CO₂e. Mother Earth's world is thriving!`;
            emptyState.style.color = 'var(--color-earth)';
        } else if (current > 0) {
            emptyState.innerHTML = `✨ Keep going! Every verified choice brings us closer to the 25 kg target.`;
            emptyState.style.color = 'var(--primary-light)';
        } else {
            emptyState.innerHTML = `Start with one small decision. Every ring brings your world back to color.`;
            emptyState.style.color = 'var(--text-muted)';
        }
    }
}

function filterLibraryActions(element) {
    state.activeLibFilter = element;
    saveState();
    
    // Update active tab button classes
    document.querySelectorAll('.lib-tab-btn').forEach(btn => {
        if (btn.id === `lib-tab-${element}`) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    renderActionLibrary();
}
window.filterLibraryActions = filterLibraryActions; // Expose globally

function renderActionLibrary() {
    const dailyEl = document.getElementById('lib-stat-daily');
    const weeklyEl = document.getElementById('lib-stat-weekly');
    const monthlyEl = document.getElementById('lib-stat-monthly');
    if (dailyEl) dailyEl.textContent = state.dailyPoints;
    if (weeklyEl) weeklyEl.textContent = state.weeklyPoints;
    if (monthlyEl) monthlyEl.textContent = state.monthlyPoints;

    const grid = document.getElementById('actions-library-grid');
    if (!grid) return;

    grid.innerHTML = '';
    
    const filter = state.activeLibFilter || 'all';
    
    let actionsToShow = [];
    if (filter === 'all') {
        Object.keys(ELEMENT_ACTIONS_LIBRARY).forEach(el => {
            ELEMENT_ACTIONS_LIBRARY[el].forEach(action => {
                actionsToShow.push({ ...action, element: el });
            });
        });
    } else {
        if (ELEMENT_ACTIONS_LIBRARY[filter]) {
            ELEMENT_ACTIONS_LIBRARY[filter].forEach(action => {
                actionsToShow.push({ ...action, element: filter });
            });
        }
    }

    if (actionsToShow.length === 0) {
        grid.innerHTML = '<div class="input-subtext text-center" style="grid-column: 1/-1;">No actions found.</div>';
        return;
    }

    actionsToShow.forEach(action => {
        const isCompleted = state.dailyCompletedActionIds.includes(action.id);
        const card = document.createElement('div');
        card.className = `library-action-card glass element-${action.element}${isCompleted ? ' completed-action completed-glow' : ''}`;
        
        const elDetails = PLANETEER_ELEMENTS[action.element] || { icon: '🌿', name: action.element };
        
        let typeClass = 'action-type-onetime';
        if (action.type.toLowerCase() === 'habit') typeClass = 'action-type-habit';
        if (action.type.toLowerCase() === 'long-term') typeClass = 'action-type-longterm';

        let verifyLabel = '📄 Manual';
        if (action.verify === 'camera') verifyLabel = '📷 Camera';
        if (action.verify === 'photo upload') verifyLabel = '📤 Upload';
        if (action.verify === 'location') verifyLabel = '📍 Location';
        if (action.verify === 'motion') verifyLabel = '📳 Motion';

        card.innerHTML = `
            <div class="action-card-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; width: 100%;">
                <span class="action-card-type-tag ${typeClass}">${action.type}</span>
                <span style="font-size: 0.85rem; font-family: var(--font-retro); color: ${ELEMENT_COLORS[action.element] || 'var(--primary)'}">${elDetails.icon} ${elDetails.name.replace(' Ring', '')}</span>
            </div>
            <div class="action-card-body" style="width: 100%;">
                <h4 class="action-card-title" style="margin-bottom: 0.5rem;">${action.title}</h4>
                <div class="action-card-detail-row">
                    <span>CO₂ Saved:</span>
                    <strong style="color: var(--primary-light); font-family: var(--font-retro); font-size: 0.7rem;">-${action.co2.toFixed(1)} kg</strong>
                </div>
                <div class="action-card-detail-row">
                    <span>EcoPoints:</span>
                    <strong style="color: var(--color-earth); font-family: var(--font-retro); font-size: 0.7rem;">+${action.pts} pts</strong>
                </div>
                <div class="action-card-detail-row">
                    <span>Verification:</span>
                    <span>${verifyLabel}</span>
                </div>
            </div>
            <div class="action-card-footer" style="margin-top: 0.5rem; display: flex; justify-content: flex-end; width: 100%;">
                <button type="button" class="btn ${isCompleted ? 'btn-secondary' : 'btn-primary'} btn-sm" 
                        onclick="verifyActionFromLibrary('${action.id}', '${action.element}')" 
                        style="width: 100%; font-family: var(--font-retro); font-size: 0.65rem; padding: 0.45rem;">
                    ${isCompleted ? 'Re-verify Action ✓' : 'Verify & Perform'}
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function verifyActionFromLibrary(actionId, element) {
    const action = ELEMENT_ACTIONS_LIBRARY[element].find(a => a.id === actionId);
    if (!action) return;

    const modal = document.getElementById('verify-modal');
    const container = document.getElementById('verify-interface-container');
    const confirmBtn = document.getElementById('btn-confirm-verify');
    if (!modal || !container) return;

    modal.style.display = 'flex';
    
    container.innerHTML = `
        <div id="active-nudge-box" style="width: 100%; padding: 1rem 0;"></div>
        <div id="sensor-interface" style="display: none;"></div>
    `;

    if (confirmBtn) {
        confirmBtn.style.display = 'none';
    }

    runAgentTimeline(element, action.title, () => {
        const nudgeBox = document.getElementById('active-nudge-box');
        if (nudgeBox) nudgeBox.style.display = 'none';
        
        const sensorInterface = document.getElementById('sensor-interface');
        if (sensorInterface) sensorInterface.style.display = 'block';

        setupActionSensorVerification(action, element);
    });
}
window.verifyActionFromLibrary = verifyActionFromLibrary; // Expose globally

function setupActionSensorVerification(action, element) {
    const container = document.getElementById('sensor-interface');
    if (!container) return;

    const confirmBtn = document.getElementById('btn-confirm-verify');
    if (confirmBtn) {
        confirmBtn.style.display = 'block';
        confirmBtn.textContent = 'Submit Verification Proof';
    }

    let html = '';

    if (action.verify === 'camera') {
        html = `
            <div class="mock-scanner-screen">
                <span class="mock-title">LIVE CAMERA DETECTION</span>
                <div class="camera-feed-viewport">
                    <video id="action-webcam-feed" autoplay playsinline muted style="width: 100%; height: 200px; border-radius: 8px; object-fit: cover; background: #111;"></video>
                    <div class="scanner-overlay">
                        <div class="scanner-line"></div>
                        <div class="scanner-corner top-left"></div>
                        <div class="scanner-corner top-right"></div>
                        <div class="scanner-corner bottom-left"></div>
                        <div class="scanner-corner bottom-right"></div>
                    </div>
                </div>
                <div class="progress-bar-bg" style="height: 6px; margin-top: 10px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden;">
                    <div class="progress-bar-fill" id="action-verify-progress" style="width: 0%; height: 100%; background: var(--primary); transition: width 0.15s linear;"></div>
                </div>
                <span class="input-subtext text-center" id="action-verify-status" style="display: block; margin-top: 5px;">Starting camera stream...</span>
            </div>
        `;
        container.innerHTML = html;

        startActionWebcamStream();

        simulateProgressVerification('action-verify-progress', 'action-verify-status', 'Analyzing environment...', 'Verification Approved! Eco action confirmed.', () => {
            completeActionSuccess(action, element, null);
        });
    }
    else if (action.verify === 'photo upload') {
        html = `
            <div class="mock-scanner-screen">
                <span class="mock-title">PROOF PHOTO UPLOAD</span>
                <p class="input-subtext text-center" style="margin-bottom: 12px;">Select or snap a photo of your completed action. Compressed locally.</p>
                <div class="upload-zone flex-column-center" id="action-upload-zone" style="border: 2px dashed var(--border-color); border-radius: 12px; padding: 2rem; cursor: pointer; text-align: center; transition: var(--transition-smooth); background: rgba(255,255,255,0.01);">
                    <span style="font-size: 2rem; margin-bottom: 0.5rem;">📤</span>
                    <span class="upload-label" style="font-size: 0.85rem; color: var(--text-main);">Click to upload proof photo</span>
                    <span class="input-subtext" style="font-size: 0.7rem; color: var(--text-muted); margin-top: 4px;">PNG, JPG (max 5MB)</span>
                    <input type="file" id="action-file-input" accept="image/*" style="display: none;">
                </div>
                <div class="camera-feed-viewport" id="action-upload-preview-container" style="display: none; height: 180px; position: relative;">
                    <img id="action-upload-preview" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">
                    <button type="button" class="btn-clear-image" id="btn-clear-action-image" style="position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center;">✕</button>
                </div>
                <div class="progress-bar-bg" id="action-upload-progress-container" style="height: 6px; margin-top: 10px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; display: none;">
                    <div class="progress-bar-fill" id="action-upload-progress" style="width: 0%; height: 100%; background: var(--primary); transition: width 0.15s linear;"></div>
                </div>
                <span class="input-subtext text-center" id="action-upload-status" style="display: block; margin-top: 5px;"></span>
            </div>
        `;
        container.innerHTML = html;

        const uploadZone = document.getElementById('action-upload-zone');
        const fileInput = document.getElementById('action-file-input');
        const previewContainer = document.getElementById('action-upload-preview-container');
        const previewImg = document.getElementById('action-upload-preview');
        const clearBtn = document.getElementById('btn-clear-action-image');
        const progressContainer = document.getElementById('action-upload-progress-container');
        const progressFill = document.getElementById('action-upload-progress');
        const uploadStatus = document.getElementById('action-upload-status');

        let uploadedBase64 = null;

        uploadZone.onclick = () => fileInput.click();
        
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            uploadStatus.textContent = "Compressing photo proof...";
            
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const maxDim = 320;
                    let w = img.width;
                    let h = img.height;
                    if (w > h) {
                        if (w > maxDim) {
                            h = Math.round(h * (maxDim / w));
                            w = maxDim;
                        }
                    } else {
                        if (h > maxDim) {
                            w = Math.round(w * (maxDim / h));
                            h = maxDim;
                        }
                    }
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);
                    uploadedBase64 = canvas.toDataURL('image/jpeg', 0.7);

                    uploadZone.style.display = 'none';
                    previewContainer.style.display = 'block';
                    previewImg.src = uploadedBase64;
                    progressContainer.style.display = 'block';

                    simulateProgressVerification('action-upload-progress', 'action-upload-status', 'Analyzing uploaded proof metadata...', 'Proof metadata matches element guidelines!', () => {
                        confirmBtn.onclick = () => {
                            completeActionSuccess(action, element, uploadedBase64);
                        };
                    });
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        };

        clearBtn.onclick = () => {
            fileInput.value = '';
            uploadZone.style.display = 'flex';
            previewContainer.style.display = 'none';
            previewImg.src = '';
            uploadedBase64 = null;
            progressContainer.style.display = 'none';
            progressFill.style.width = '0%';
            uploadStatus.textContent = '';
        };

        confirmBtn.onclick = () => {
            if (!uploadedBase64) {
                showToast("Please upload a proof photo first!");
                return;
            }
            completeActionSuccess(action, element, uploadedBase64);
        };
    }
    else if (action.verify === 'location') {
        html = `
            <div class="mock-scanner-screen">
                <span class="mock-title">GEOLOCATION GPS VERIFICATION</span>
                <div class="gps-coordinates-readout" style="color: var(--color-wind); border-color: rgba(56, 189, 248, 0.4);">
                    <div class="gps-row"><span>CALIBRATING GPS...</span><span class="blink" style="color: var(--color-wind);">LOCK</span></div>
                    <div class="gps-row"><span>LATITUDE:</span><span id="action-gps-lat">Connecting...</span></div>
                    <div class="gps-row"><span>LONGITUDE:</span><span id="action-gps-lng">Connecting...</span></div>
                    <div class="gps-row"><span>ACCURACY:</span><span id="action-gps-acc">Connecting...</span></div>
                    <div class="gps-row"><span>STATUS:</span><span id="action-gps-status">Scanning nearby transit coordinates...</span></div>
                </div>
                <div class="progress-bar-bg" style="height: 6px; margin-top: 10px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden;">
                    <div class="progress-bar-fill" id="action-gps-progress" style="width: 0%; height: 100%; background: var(--color-wind); transition: width 0.15s linear;"></div>
                </div>
            </div>
        `;
        container.innerHTML = html;

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                document.getElementById('action-gps-lat').textContent = position.coords.latitude.toFixed(6) + ' N';
                document.getElementById('action-gps-lng').textContent = position.coords.longitude.toFixed(6) + ' E';
                document.getElementById('action-gps-acc').textContent = position.coords.accuracy.toFixed(1) + ' meters';
                document.getElementById('action-gps-status').textContent = "Aligned with local zero-carbon route coordinate!";
            }, err => {
                console.error("GPS access denied or failed", err);
                document.getElementById('action-gps-lat').textContent = "12.9716 N (Simulated)";
                document.getElementById('action-gps-lng').textContent = "77.5946 E (Simulated)";
                document.getElementById('action-gps-acc').textContent = "8.2 meters";
                document.getElementById('action-gps-status').textContent = "Camera/GPS blocked fallback. Transit node verified!";
            });
        } else {
            document.getElementById('action-gps-lat').textContent = "12.9716 N (Simulated)";
            document.getElementById('action-gps-lng').textContent = "77.5946 E (Simulated)";
            document.getElementById('action-gps-acc').textContent = "N/A";
            document.getElementById('action-gps-status').textContent = "Geolocation API not supported. Transit node verified!";
        }

        simulateProgressVerification('action-gps-progress', null, null, null, () => {
            const gpsInfo = `LAT: ${document.getElementById('action-gps-lat').textContent}, LNG: ${document.getElementById('action-gps-lng').textContent}`;
            confirmBtn.onclick = () => {
                completeActionSuccess(action, element, null, gpsInfo);
            };
            completeActionSuccess(action, element, null, gpsInfo);
        });
    }
    else if (action.verify === 'motion') {
        html = `
            <div class="mock-scanner-screen">
                <span class="mock-title">MOTION STEP & SHAKE DETECTOR</span>
                <p class="input-subtext text-center">Shake your device or click 'Simulate Step' to trigger motion sensors:</p>
                <div class="flex-column-center" style="padding: 1.5rem; background: rgba(0,0,0,0.3); border-radius: 8px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="font-size: 2.5rem; margin-bottom: 0.5rem;" class="shake-element">👟</div>
                    <div style="font-family: var(--font-retro); font-size: 1.25rem; color: var(--primary);" id="motion-step-count">0 Steps</div>
                    <span class="input-subtext" id="motion-status-message">Awaiting physical stride motion...</span>
                </div>
                <button type="button" class="btn btn-secondary btn-sm" id="btn-simulate-step" style="width: 100%; margin-bottom: 10px;">Simulate Stride Step 🚶‍♂️</button>
                <div class="progress-bar-bg" style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden;">
                    <div class="progress-bar-fill" id="action-motion-progress" style="width: 0%; height: 100%; background: var(--primary); transition: width 0.1s linear;"></div>
                </div>
            </div>
        `;
        container.innerHTML = html;

        let stepsCount = 0;
        const stepCountEl = document.getElementById('motion-step-count');
        const statusEl = document.getElementById('motion-status-message');
        const simulateBtn = document.getElementById('btn-simulate-step');
        const progressFill = document.getElementById('action-motion-progress');

        const incrementStep = () => {
            stepsCount++;
            if (stepCountEl) stepCountEl.textContent = `${stepsCount} Steps`;
            if (statusEl) statusEl.textContent = `Active movement detected! Step ${stepsCount} logged.`;
            
            const pct = Math.min(100, stepsCount * 20);
            if (progressFill) progressFill.style.width = pct + '%';
            
            if (stepsCount >= 5) {
                setTimeout(() => {
                    completeActionSuccess(action, element, null, "5 Stride Steps motion verified");
                }, 500);
            }
        };

        simulateBtn.onclick = () => {
            incrementStep();
        };

        let shakeHandler = null;
        if (window.DeviceMotionEvent) {
            let lastX = null, lastY = null, lastZ = null;
            let threshold = 15;
            shakeHandler = (e) => {
                let acc = e.accelerationIncludingGravity;
                if (!acc) return;
                
                if (lastX === null) {
                    lastX = acc.x;
                    lastY = acc.y;
                    lastZ = acc.z;
                    return;
                }
                
                let deltaX = Math.abs(acc.x - lastX);
                let deltaY = Math.abs(acc.y - lastY);
                let deltaZ = Math.abs(acc.z - lastZ);
                
                if ((deltaX > threshold && deltaY > threshold) || (deltaX > threshold && deltaZ > threshold) || (deltaY > threshold && deltaZ > threshold)) {
                    incrementStep();
                }
                
                lastX = acc.x;
                lastY = acc.y;
                lastZ = acc.z;
            };
            window.addEventListener('devicemotion', shakeHandler);
        }

        const originalClose = closeVerifyModal;
        closeVerifyModal = () => {
            if (shakeHandler) {
                window.removeEventListener('devicemotion', shakeHandler);
            }
            originalClose();
            closeVerifyModal = originalClose;
        };
    }
    else if (action.verify === 'manual') {
        html = `
            <div class="mock-scanner-screen" style="text-align: left;">
                <span class="mock-title">MANUAL PLANETEER LOG</span>
                <p class="input-subtext" style="margin-bottom: 8px;">Please describe how you performed this action to help Mother Earth document the local impact:</p>
                <textarea id="action-manual-notes" placeholder="e.g. Set home thermostat to 25°C and utilized draft fans to cut power." style="width: 100%; height: 80px; padding: 0.5rem; border-radius: 6px; background: rgba(0,0,0,0.5); border: 1px solid var(--border-color); color: white; font-family: inherit; font-size: 0.85rem; resize: none; margin-bottom: 10px;"></textarea>
                <div class="progress-bar-bg" id="action-manual-progress-container" style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; display: none;">
                    <div class="progress-bar-fill" id="action-manual-progress" style="width: 0%; height: 100%; background: var(--primary); transition: width 0.15s linear;"></div>
                </div>
                <span class="input-subtext text-center" id="action-manual-status" style="display: block; margin-top: 5px;"></span>
            </div>
        `;
        container.innerHTML = html;

        confirmBtn.onclick = () => {
            const notesVal = document.getElementById('action-manual-notes').value.trim();
            if (!notesVal) {
                showToast("Please enter a short explanation of your action!");
                return;
            }
            
            document.getElementById('action-manual-progress-container').style.display = 'block';
            simulateProgressVerification('action-manual-progress', 'action-manual-status', 'Saving log to regional ledger...', 'Log registered successfully!', () => {
                completeActionSuccess(action, element, null, notesVal);
            });
        };
    }
}

function startActionWebcamStream() {
    const video = document.getElementById('action-webcam-feed');
    if (!video) return;

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            .then(stream => {
                actionLocalStream = stream;
                video.srcObject = stream;
                video.play();
            })
            .catch(err => {
                console.error("Camera access blocked", err);
                const status = document.getElementById('action-verify-status');
                if (status) status.textContent = "Camera blocked. Simulating capture scan...";
            });
    }
}

function stopActionWebcamStream() {
    if (actionLocalStream) {
        actionLocalStream.getTracks().forEach(track => track.stop());
        actionLocalStream = null;
    }
}

function renderProofGallery() {
    const grid = document.getElementById('proof-gallery-grid');
    const badge = document.getElementById('verified-actions-count');
    if (!grid) return;

    if (badge) {
        badge.textContent = `${state.proofs.length} Verified`;
    }

    if (state.proofs.length === 0) {
        grid.innerHTML = `
            <div class="card glass empty-gallery-card flex-column-center" style="grid-column: 1 / -1; padding: 2rem; text-align: center; color: var(--text-muted); width: 100%;">
                <span style="font-size: 2rem;">📸</span>
                <p style="margin-top: 0.5rem;">No verified actions yet. Do an action above to start building your gallery!</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = '';
    state.proofs.forEach(proof => {
        const card = document.createElement('div');
        card.className = 'proof-card glass';

        let imgHtml = '';
        if (proof.image) {
            imgHtml = `<img class="proof-card-image" src="${proof.image}" alt="${proof.title}">`;
        } else {
            const color = ELEMENT_COLORS[proof.element] || 'var(--primary)';
            imgHtml = `
                <div class="proof-card-image" style="background: linear-gradient(135deg, ${color}33 0%, ${color}11 100%); display: flex; align-items: center; justify-content: center; font-size: 2rem;">
                    ${PLANETEER_ELEMENTS[proof.element]?.icon || '🌿'}
                </div>
            `;
        }

        card.innerHTML = `
            ${imgHtml}
            <div class="proof-card-content">
                <span class="proof-card-tag" style="background: rgba(255,255,255,0.05); color: ${ELEMENT_COLORS[proof.element] || 'var(--text-main)'};">
                    ${PLANETEER_ELEMENTS[proof.element]?.icon || '🌿'} ${proof.element.toUpperCase()}
                </span>
                <h4 class="proof-card-title">${proof.title}</h4>
                <div class="proof-card-stats">
                    -${proof.co2.toFixed(1)} kg CO₂e • +${proof.pts} pts
                </div>
                <div style="font-size: 0.7rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 0.5rem;" title="${proof.details}">
                    ℹ️ ${proof.details}
                </div>
                <div class="proof-card-footer">
                    <span>Verified Proof</span>
                    <span>${proof.timestamp}</span>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function renderCommunityWins() {
    const list = document.getElementById('community-wins-list');
    if (!list) return;

    if (!state.communityWins || state.communityWins.length === 0) {
        state.communityWins = JSON.parse(JSON.stringify(MOCK_COMMUNITY_WINS));
    }

    list.innerHTML = '';
    state.communityWins.forEach(win => {
        const item = document.createElement('li');
        item.className = 'win-feed-item';
        
        const elDetails = PLANETEER_ELEMENTS[win.element] || { icon: '🌿' };
        
        item.innerHTML = `
            <div class="win-feed-avatar">${elDetails.icon}</div>
            <div>
                <strong>${win.name}</strong> ${win.action} 
                <span style="color: var(--text-muted); font-size: 0.75rem;">(saved ${win.co2.toFixed(1)} kg CO₂e)</span>
            </div>
            <div class="win-feed-time">${win.timestamp}</div>
        `;
        list.appendChild(item);
    });
}

function openImpactReportModal() {
    const modal = document.getElementById('impact-report-modal');
    const output = document.getElementById('report-output-box');
    if (!modal || !output) return;

    modal.style.display = 'flex';
    output.textContent = generateReportText();
}
window.openImpactReportModal = openImpactReportModal; // Expose globally

function closeImpactReportModal() {
    const modal = document.getElementById('impact-report-modal');
    if (modal) modal.style.display = 'none';
}
window.closeImpactReportModal = closeImpactReportModal; // Expose globally

function generateReportText() {
    const unlockedCount = state.unlockedRings.length;
    const rankObj = getPointsRank(state.points);
    const co2Saved = state.totalSavedKgCO2e || 0;
    
    let report = `====================================\n`;
    report += `   ECOSYNC LENS: CLIMATE IMPACT REPORT\n`;
    report += `====================================\n`;
    report += `Date Generated: ${new Date().toLocaleDateString()}\n`;
    report += `Planeteer Profile:\n`;
    report += `  - Total EcoPoints: ${state.points} pts\n`;
    report += `  - Active Rank: ${rankObj.icon} ${rankObj.name}\n`;
    report += `  - Unlocked Element Rings: ${unlockedCount}/5 (${state.unlockedRings.join(', ') || 'none'})\n`;
    report += `  - Monthly Carbon Savings: ${co2Saved.toFixed(2)} kg CO2e\n`;
    report += `\n`;
    report += `Mother Earth's World Status:\n`;
    report += `  - Restoration Level: ${unlockedCount * 20}%\n`;
    report += `  - Personal World Color: ${state.worldImage ? 'Restored (' + (unlockedCount * 20) + '%)' : 'No photo uploaded'}\n`;
    report += `\n`;
    report += `Verified Action Proof Log (${state.proofs.length} entries):\n`;
    
    if (state.proofs.length === 0) {
        report += `  - No actions verified yet. Start making carbon-cutting choices today!\n`;
    } else {
        state.proofs.forEach((p, idx) => {
            report += `  ${idx + 1}. [${p.element.toUpperCase()}] ${p.title}\n`;
            report += `     Savings: -${p.co2} kg CO2e | Verified: ${p.timestamp}\n`;
        });
    }
    
    report += `\n`;
    report += `====================================\n`;
    report += `   THE POWER IS YOURS! GO PLANET! 🌍\n`;
    report += `====================================`;
    
    return report;
}

function getPointsRank(pts) {
    let currentRank = RANKS[0];
    for (let i = 0; i < RANKS.length; i++) {
        if (pts >= RANKS[i].threshold) {
            currentRank = RANKS[i];
        }
    }
    return currentRank;
}

function copyReportToClipboard() {
    const reportText = generateReportText();
    navigator.clipboard.writeText(reportText)
        .then(() => {
            showToast("Report text copied to clipboard! 📋");
        })
        .catch(err => {
            console.error("Clipboard copy failed", err);
            showToast("Failed to copy report. Please manually copy the text.");
        });
}
window.copyReportToClipboard = copyReportToClipboard; // Expose globally

function downloadReportAsFile() {
    const reportText = generateReportText();
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ecosync_climate_report_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Impact report downloaded! 💾");
}
window.downloadReportAsFile = downloadReportAsFile; // Expose globally

function shareEcoActionText(type) {
    const rankObj = getPointsRank(state.points);
    const text = `🌍 I just analyzed my daily habits using EcoSync Lens! I've saved ${state.totalSavedKgCO2e.toFixed(1)} kg CO2e and reached rank: ${rankObj.icon} ${rankObj.name}. Join me in making carbon-saving decisions in real-time! #Planeteer #EcoSync`;
    
    if (navigator.share) {
        navigator.share({
            title: 'EcoSync Lens Climate Wins',
            text: text,
            url: window.location.href
        })
        .then(() => showToast("Shared successfully! 🚀"))
        .catch(err => {
            console.error("Share failed", err);
            navigator.clipboard.writeText(text);
            showToast("Share text copied to clipboard! 📋");
        });
    } else {
        navigator.clipboard.writeText(text);
        showToast("Share text copied to clipboard! 📋");
    }
}
window.shareEcoActionText = shareEcoActionText; // Expose globally

function generateLinkedInPost() {
    const rankObj = getPointsRank(state.points);
    const unlockedCount = state.unlockedRings.length;
    const co2Saved = state.totalSavedKgCO2e || 0;
    
    const postText = `🌍 Proud to share my Climate Action milestone! 🌍\n\nUsing EcoSync Lens: Planeteer Edition, I have been analyzing my carbon decisions at the source (commute, diet, energy, shopping, and waste).\n\n📈 My Results:\n- EcoPoints earned: ${state.points}\n- Planeteer Rank: ${rankObj.icon} ${rankObj.name}\n- Elements Activated: ${unlockedCount}/5\n- Monthly Carbon Cut: ${co2Saved.toFixed(1)} kg CO2e\n\nWe don't need a single person doing sustainability perfectly; we need billions making small, verified daily adjustments. Join the movement! 🦸‍♂️💚\n\n#Sustainability #GreenTech #ClimateAction #AI #EcoSync`;

    navigator.clipboard.writeText(postText)
        .then(() => {
            showToast("LinkedIn post copied! Opening LinkedIn sharing dialog...");
            setTimeout(() => {
                window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(window.location.origin), '_blank');
            }, 800);
        })
        .catch(err => {
            console.error("Failed to copy LinkedIn post text", err);
            showToast("Failed to copy post text. Please copy the report text instead.");
        });
}
window.generateLinkedInPost = generateLinkedInPost; // Expose globally

function resetDemoState() {
    if (confirm("Are you sure you want to reset all EcoSync data? This will clear your points, unlocked rings, uploaded image, and verified actions log.")) {
        localStorage.removeItem('ecosync_lens_state');
        showToast("EcoSync state cleared. Reloading...");
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }
}
window.resetDemoState = resetDemoState; // Expose globally

// ----------------- THREE.JS 3D EARTH GLOBE SYSTEM -----------------
let threeScene, threeCamera, threeRenderer, threeEarthGroup, threeClouds;

function initThreeJSEarth() {
    const container = document.getElementById('threejs-earth-container');
    if (!container) return;

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 320;

    threeScene = new THREE.Scene();
    threeCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    
    threeRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    threeRenderer.setSize(width, height);
    threeRenderer.setPixelRatio(window.devicePixelRatio || 1);
    
    container.innerHTML = '';
    container.appendChild(threeRenderer.domElement);

    // Realistic Lighting Setup as seen in Stitch
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    threeScene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(5, 3, 5);
    threeScene.add(sunLight);

    const backLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
    backLight.position.set(-5, -2, -5);
    threeScene.add(backLight);

    // Earth Group
    threeEarthGroup = new THREE.Group();
    threeScene.add(threeEarthGroup);

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');

    // High Fidelity Earth Mesh
    const geometry = new THREE.SphereGeometry(1.7, 64, 64);
    const material = new THREE.MeshPhongMaterial({
        map: loader.load('https://raw.githubusercontent.com/turban/webgl-earth/master/images/2_no_clouds_4k.jpg'),
        bumpMap: loader.load('https://raw.githubusercontent.com/turban/webgl-earth/master/images/elev_bump_4k.jpg'),
        bumpScale: 0.05,
        specularMap: loader.load('https://raw.githubusercontent.com/turban/webgl-earth/master/images/water_4k.png'),
        specular: new THREE.Color('grey'),
        shininess: 10
    });

    const earth = new THREE.Mesh(geometry, material);
    threeEarthGroup.add(earth);

    // Clouds Layer
    const cloudGeometry = new THREE.SphereGeometry(1.72, 64, 64);
    const cloudMaterial = new THREE.MeshPhongMaterial({
        map: loader.load('https://raw.githubusercontent.com/turban/webgl-earth/master/images/fair_clouds_4k.png'),
        transparent: true,
        opacity: 0.4,
        depthWrite: false
    });
    threeClouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
    threeEarthGroup.add(threeClouds);

    // Strong Atmospheric Cyan Rim Glow (Fresnel Effect)
    const atmosphereGeometry = new THREE.SphereGeometry(1.75, 64, 64);
    const atmosphereMaterial = new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.BackSide,
        uniforms: {
            glowColor: { value: new THREE.Color(0x38bdf8) },
            coefficient: { value: 0.2 },
            power: { value: 4.0 }
        },
        vertexShader: `
            varying vec3 vNormal;
            varying vec3 vPositionNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 glowColor;
            uniform float coefficient;
            uniform float power;
            varying vec3 vNormal;
            varying vec3 vPositionNormal;
            void main() {
                float intensity = pow(coefficient - dot(vNormal, vPositionNormal), power);
                gl_FragColor = vec4(glowColor, intensity);
            }
        `
    });

    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    threeEarthGroup.add(atmosphere);

    // Outer Bloom Halo
    const haloGeometry = new THREE.SphereGeometry(2.0, 64, 64);
    const haloMaterial = new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.BackSide,
        uniforms: {
            uColor: { value: new THREE.Color(0x00a6e0) }
        },
        vertexShader: `
            varying vec3 vNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec3 vNormal;
            uniform vec3 uColor;
            void main() {
                float intensity = pow(0.7 - dot(vNormal, vec3(0, 0, 1.0)), 6.0);
                gl_FragColor = vec4(uColor, 1.0) * intensity;
            }
        `
    });
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    threeScene.add(halo);

    threeCamera.position.z = 4.5;

    // Animation Loop
    function animate() {
        requestAnimationFrame(animate);
        if (threeEarthGroup) threeEarthGroup.rotation.y += 0.0012;
        if (threeClouds) threeClouds.rotation.y += 0.0015;
        if (threeRenderer && threeScene && threeCamera) {
            threeRenderer.render(threeScene, threeCamera);
        }
    }

    animate();
    
    // Apply initial state
    updateThreeJSEarth();
}

function updateThreeJSEarth() {
    const healthPct = state.unlockedRings.length * 20;
    const canvas = document.querySelector('#threejs-earth-container canvas');
    if (canvas) {
        canvas.style.filter = `grayscale(${100 - healthPct}%)`;
    }
}

function resizeThreeJS() {
    const container = document.getElementById('threejs-earth-container');
    if (!container || !threeRenderer || !threeCamera) return;

    const w = container.clientWidth;
    const h = container.clientHeight;
    threeCamera.aspect = w / h;
    threeCamera.updateProjectionMatrix();
    threeRenderer.setSize(w, h);
}

window.addEventListener('resize', resizeThreeJS);

function initBackgroundShader() {
    const canvas = document.getElementById('shader-canvas-ambient');
    if (!canvas) return;

    function syncSize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width  = w;
            canvas.height = h;
        }
    }
    window.addEventListener('resize', syncSize);
    syncSize();

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return;
    const vs = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;
    const fs = `precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
varying vec2 v_texCoord;

void main() {
    vec2 uv = v_texCoord;
    vec2 mouse = u_mouse / u_resolution;
    
    // Background color: Deep Obsidian
    vec3 color = vec3(0.02, 0.04, 0.08); 
    
    // Emerald / Green Gradient
    float d1 = distance(uv, vec2(0.2 + 0.1 * sin(u_time * 0.4), 0.2 + 0.1 * cos(u_time * 0.3)));
    vec3 green = vec3(0.063, 0.725, 0.506); // Emerald
    color += green * (0.25 / (d1 + 0.95)) * (0.4 + 0.6 * sin(u_time * 0.15));
    
    // Electric Cyan / Blue Gradient
    float d2 = distance(uv, vec2(0.8 + 0.1 * cos(u_time * 0.5), 0.8 + 0.1 * sin(u_time * 0.2)));
    vec3 cyan = vec3(0.0, 0.835, 1.0); // Cyan
    color += cyan * (0.25 / (d2 + 0.95)) * (0.4 + 0.6 * cos(u_time * 0.2));
    
    // Soft Violet Glow
    float d3 = distance(uv, vec2(0.5 + 0.2 * sin(u_time * 0.6), 0.5 + 0.2 * cos(u_time * 0.7)));
    vec3 violet = vec3(0.545, 0.231, 0.984);
    color += violet * (0.15 / (d3 + 1.1)) * (0.4 + 0.6 * sin(u_time * 0.3));

    // Mouse influence
    float mDist = distance(uv, mouse);
    color += vec3(0.05, 0.2, 0.15) * (0.03 / (mDist + 0.25));

    gl_FragColor = vec4(color, 1.0);
}`;
    function cs(type, src) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        return s;
    }
    const prog = gl.createProgram();
    gl.attachShader(prog, cs(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, cs(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes = gl.getUniformLocation(prog, 'u_resolution');
    const uMouse = gl.getUniformLocation(prog, 'u_mouse');

    let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    window.addEventListener('mousemove', (event) => {
        mouse.x = event.clientX;
        mouse.y = window.innerHeight - event.clientY;
    });

    function render(t) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        if (uTime) gl.uniform1f(uTime, t * 0.001);
        if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
        if (uMouse) gl.uniform2f(uMouse, mouse.x, mouse.y);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

/* =====================================================================
   STITCH COMMAND-CENTER ENHANCEMENTS (non-invasive presentation layer)
   Drives the new visual pieces introduced by the Planet Lens revamp:
   Active Mission radial, Planeteer Element status labels, the Logs
   System Activity feed, and the Regional Impact Stream. Reads existing
   state — never mutates it — and hooks renderAll() so it stays in sync.
   ===================================================================== */
(function () {
    "use strict";

    // ---- Active Mission radial mirrors the linear mission progress ----
    function syncMissionRadial() {
        const pctText = document.getElementById('mission-percent-text');
        const radial = document.getElementById('mission-radial');
        const radialVal = document.getElementById('mission-radial-val');
        const topVal = document.getElementById('mission-pct-top');
        if (!pctText || !radial) return;
        const m = (pctText.textContent || '').match(/(\d+)/);
        const pct = m ? Math.min(100, parseInt(m[1], 10)) : 0;
        radial.style.setProperty('--pct', pct);
        if (radialVal) radialVal.textContent = pct + '%';
        if (topVal) topVal.textContent = pct + '%';
    }

    // ---- Planeteer Element status labels reflect unlocked rings ----
    function syncElementStatuses() {
        document.querySelectorAll('.elements-list .ring-slot').forEach(slot => {
            const status = slot.querySelector('.ring-status');
            if (!status) return;
            status.textContent = slot.classList.contains('active') ? 'ONLINE' : 'DORMANT';
        });
    }

    // ---- Logs: System Activity feed (demo planetary mesh telemetry) ----
    const ACTIVITY_LOG = [
        { lvl: 'NEW',   cls: 'lv-new',   ts: '14:19:55', msg: 'Planeteer Activity: User @GaiaWatch submitted proof of reforestation (300 saplings).' },
        { lvl: 'ALERT', cls: 'lv-alert', ts: '14:18:30', msg: 'Abnormal Methane Spike detected in Sector G-14. Investigating source…' },
        { lvl: 'REST',  cls: 'lv-rest',  ts: '14:17:05', msg: 'System Restore Point Created: Global Mesh Network stable at 99.8%.' },
        { lvl: 'INFO',  cls: 'lv-info',  ts: '14:16:12', msg: 'Hydration metrics update received for Sub-Saharan quadrant.' },
        { lvl: 'SYNC',  cls: 'lv-sync',  ts: '14:15:00', msg: 'Orbital Drift Adjustment: Sentinel-6 repositioning for optimal spectral analysis.' },
        { lvl: 'WARN',  cls: 'lv-warn',  ts: '14:14:44', msg: 'API Rate Limit Warning: Integration hub 4 near capacity.' },
        { lvl: 'INFO',  cls: 'lv-info',  ts: '14:13:21', msg: 'Regional biodiversity coefficient updated: +0.02 improvement in Coral Triangle.' },
        { lvl: 'INFO',  cls: 'lv-info',  ts: '14:12:05', msg: 'Renewable energy surge detected: North Sea wind farm operating at 112% capacity.' },
        { lvl: 'REST',  cls: 'lv-rest',  ts: '14:10:48', msg: 'Carbon ledger checkpoint committed. Net offset balance reconciled.' },
        { lvl: 'WARN',  cls: 'lv-warn',  ts: '14:09:30', msg: 'Soil moisture below threshold in Sector A-7. Irrigation advisory issued.' }
    ];
    // Map filter buttons (info/warn/alert/rest) to log level codes
    const FILTER_MAP = { info: ['INFO', 'SYNC'], warn: ['WARN'], alert: ['ALERT'], rest: ['REST', 'NEW'] };
    let activeLogFilter = 'all';

    function renderActivityLog() {
        const stream = document.getElementById('log-stream');
        if (!stream) return;
        const rows = ACTIVITY_LOG.filter(r => {
            if (activeLogFilter === 'all') return true;
            return (FILTER_MAP[activeLogFilter] || []).includes(r.lvl);
        });
        stream.innerHTML = rows.map(r =>
            `<div class="log-row ${r.cls}"><span class="ts">[2024-05-24 ${r.ts}]</span><span class="lvl">${r.lvl}</span><span class="msg">${r.msg}</span></div>`
        ).join('') || '<div class="log-row"><span class="msg" style="opacity:0.6;">No entries for this filter.</span></div>';
    }

    function wireLogFilters() {
        document.querySelectorAll('.log-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.log-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeLogFilter = btn.getAttribute('data-level') || 'all';
                renderActivityLog();
            });
        });
    }

    // ---- Logs: Regional Impact Stream ----
    const REGION_STREAM = [
        { icon: '🟢', name: 'Oslo Hub',   time: 'JUST NOW', desc: 'Verified 500kWh of solar grid injection.', country: '🇳🇴 NORWAY' },
        { icon: '🔵', name: 'Kyoto Node',  time: '12M AGO',  desc: 'River purity sensors re-calibrated. All systems nominal.', country: '🇯🇵 JAPAN' },
        { icon: '🟣', name: 'Andes Array', time: '45M AGO',  desc: 'New glacier retreat telemetry data uploaded to core.', country: '🇨🇱 CHILE' }
    ];
    function renderRegionStream() {
        const el = document.getElementById('region-stream');
        if (!el) return;
        el.innerHTML = REGION_STREAM.map(r =>
            `<div class="region-stream-item">
                <div class="region-dot">${r.icon}</div>
                <div class="region-meta">
                    <div class="rh"><span class="rn">${r.name}</span><span class="rt">${r.time}</span></div>
                    <div class="rd">${r.desc}</div>
                    <div class="rc">${r.country}</div>
                </div>
            </div>`
        ).join('');
    }

    // ---- Accessibility: reflect the active tab to assistive tech ----
    function syncAriaCurrent() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            if (btn.classList.contains('active')) btn.setAttribute('aria-current', 'page');
            else btn.removeAttribute('aria-current');
        });
    }
    if (typeof switchTab === 'function') {
        const _origSwitchTab = switchTab;
        // eslint-disable-next-line no-global-assign
        switchTab = function () {
            const r = _origSwitchTab.apply(this, arguments);
            try { syncAriaCurrent(); } catch (e) { /* non-fatal */ }
            return r;
        };
    }

    // ---- Hook renderAll so the new pieces stay in sync with state ----
    if (typeof renderAll === 'function') {
        const _origRenderAll = renderAll;
        // eslint-disable-next-line no-global-assign
        renderAll = function () {
            const r = _origRenderAll.apply(this, arguments);
            try { syncMissionRadial(); syncElementStatuses(); } catch (e) { /* non-fatal */ }
            return r;
        };
    }

    // ---- Welcome earth: colorful on the gate, desaturates to grayscale on entry ----
    // Single-function `grayscale()` filter on both ends so the CSS transition is smooth.
    function setWelcomeEarthColor(attempt) {
        const canvas = document.querySelector('#threejs-earth-container canvas');
        if (canvas) { canvas.style.filter = 'grayscale(0%)'; return; }
        if ((attempt || 0) < 25) setTimeout(() => setWelcomeEarthColor((attempt || 0) + 1), 150);
    }
    // Uniform-scale flight: the centered circular earth shrinks into the dashboard
    // slot. Using transform: translate()+scale() keeps the sphere perfectly round
    // (animating width/height instead would stretch the fixed-resolution canvas).
    function flyEarthToDashboard() {
        const container = document.getElementById('threejs-earth-container');
        const slot = document.getElementById('dashboard-earth-slot');
        const splash = document.getElementById('welcome-splash');
        const backdrop = document.getElementById('welcome-backdrop');
        try { if (typeof playRingChimeSFX === 'function') playRingChimeSFX(); } catch (e) {}

        if (container && slot) {
            const start = container.getBoundingClientRect();
            const dest = slot.getBoundingClientRect();
            const targetSize = Math.max(120, Math.min(dest.width, dest.height || 300));
            const scale = targetSize / start.width;
            const tx = (dest.left + dest.width / 2) - (targetSize / 2) - start.left;
            const ty = (dest.top + (dest.height || 300) / 2) - (targetSize / 2) - start.top;

            // Pin to current visual position, square, no transition — then reflow.
            container.style.transition = 'none';
            container.style.transformOrigin = '0 0';
            container.style.top = start.top + 'px';
            container.style.left = start.left + 'px';
            container.style.width = start.width + 'px';
            container.style.height = start.height + 'px';
            container.style.transform = 'none';
            void container.offsetWidth;

            // Animate uniform scale + translate toward the slot.
            container.style.transition = 'transform 1.1s cubic-bezier(0.7, 0, 0.3, 1)';
            container.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;

            // Desaturate the earth to its health-based grayscale during the flight.
            setTimeout(() => { try { if (typeof updateThreeJSEarth === 'function') updateThreeJSEarth(); } catch (e) {} }, 220);

            const land = () => {
                container.removeEventListener('transitionend', land);
                container.style.transition = 'none';
                container.style.transform = 'none';
                slot.appendChild(container);
                container.classList.add('dashboard-mode');
                container.style.position = 'relative';
                container.style.top = '0'; container.style.left = '0';
                container.style.width = '100%'; container.style.height = '280px';
                try { if (typeof resizeThreeJS === 'function') resizeThreeJS(); } catch (e) {}
            };
            container.addEventListener('transitionend', land);
            setTimeout(land, 1300);
        }

        if (splash) { splash.classList.add('fade-out'); setTimeout(() => { splash.style.display = 'none'; }, 1300); }
        if (backdrop) { backdrop.classList.add('fade-out'); setTimeout(() => { backdrop.style.display = 'none'; }, 1300); }
    }

    function installEarthFlight() {
        // Capture-phase interceptor on document: fires before the button's own
        // listeners and stops propagation, so app.js's original width/height flight
        // never runs. Deterministic regardless of script load order.
        let flown = false;
        document.addEventListener('click', function (e) {
            const t = e.target && e.target.closest ? e.target.closest('#btn-enter-dashboard') : null;
            if (!t || flown) return;
            flown = true;
            e.stopImmediatePropagation();
            e.preventDefault();
            flyEarthToDashboard();
        }, true);
    }

    /* ---------------- Captain Planet "Go Planet!" voice ---------------- */
    const VOICE_KEY = 'pl_voice_enabled';
    function voiceEnabled() { return localStorage.getItem(VOICE_KEY) !== '0'; }
    function speakGoPlanet() {
        if (!voiceEnabled() || !('speechSynthesis' in window)) return;
        try {
            speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance('By your powers combined… Go Planet!');
            u.rate = 0.92; u.pitch = 1.05; u.volume = 1;
            speechSynthesis.speak(u);
        } catch (e) { /* non-fatal */ }
    }
    function wireVoiceToggle() {
        const btn = document.getElementById('btn-voice-toggle');
        if (!btn) return;
        const paint = () => {
            const on = voiceEnabled();
            btn.style.color = on ? 'var(--primary-light)' : 'var(--text-muted)';
            btn.style.borderColor = on ? 'rgba(78,222,163,0.4)' : 'var(--glass-stroke)';
            btn.title = on ? 'Captain Planet voice: ON' : 'Captain Planet voice: muted';
        };
        paint();
        btn.addEventListener('click', () => {
            localStorage.setItem(VOICE_KEY, voiceEnabled() ? '0' : '1');
            paint();
            if (voiceEnabled()) { showToast('Captain Planet voice ON 🔊'); speakGoPlanet(); }
            else { try { speechSynthesis.cancel(); } catch (e) {} showToast('Captain Planet voice muted 🔇'); }
        });
    }
    // Speak when Captain Planet is summoned (all 5 rings).
    if (typeof triggerCaptainPlanetSummon === 'function') {
        const _origSummon = triggerCaptainPlanetSummon;
        // eslint-disable-next-line no-global-assign
        triggerCaptainPlanetSummon = function () {
            const r = _origSummon.apply(this, arguments);
            setTimeout(speakGoPlanet, 650);
            return r;
        };
    }

    /* ---------------- Live global atmospheric CO₂ ---------------- */
    function applyCO2(ppm) {
        const round = Math.round(ppm);
        const wco2 = document.getElementById('welcome-co2');
        const wbar = document.getElementById('welcome-co2-bar');
        const wlive = document.getElementById('welcome-co2-live');
        const dco2 = document.getElementById('dash-co2');
        if (wco2) wco2.textContent = round + ' PPM';
        if (wbar) wbar.style.width = Math.max(5, Math.min(100, (ppm - 300) / 1.6)) + '%';
        if (wlive) wlive.style.display = 'inline';
        if (dco2) dco2.textContent = round + ' ppm';
    }
    function fetchGlobalCO2() {
        if (!window.fetch) return;
        // global-warming.org publishes daily Mauna Loa CO₂ (no key, CORS-enabled).
        fetch('https://global-warming.org/api/co2-api')
            .then(r => r.ok ? r.json() : Promise.reject(new Error('co2 http')))
            .then(d => {
                const arr = d && d.co2;
                if (Array.isArray(arr) && arr.length) {
                    const last = arr[arr.length - 1];
                    const ppm = parseFloat(last.trend || last.cycle);
                    if (ppm > 0) applyCO2(ppm);
                }
            })
            .catch(() => { /* keep the static 419 fallback */ });
    }

    /* ---------------- "My Lifestyle" personal footprint ---------------- */
    const LIFE_KEY = 'pl_lifestyle';
    const LIFE_DEFAULTS = { vehicle: 'sedan', fuel: 'petrol', carKm: 100, transit: 2, flights: 1, electricity: 250, cleanPct: 0, members: 2, diet: 'medium-meat', clothing: 2, electronics: 1 };
    function loadLifestyle() {
        try { return Object.assign({}, LIFE_DEFAULTS, JSON.parse(localStorage.getItem(LIFE_KEY) || '{}')); }
        catch (e) { return Object.assign({}, LIFE_DEFAULTS); }
    }
    // Annual tonnes CO₂e from lifestyle inputs. Delegates to the unit-tested
    // PlanetLensCore module; the inline version below is a safe fallback.
    function computeFootprint(v) {
        if (typeof PlanetLensCore !== 'undefined' && PlanetLensCore.computeFootprint) {
            return PlanetLensCore.computeFootprint(v);
        }
        const fuelF = { petrol: 0.192, diesel: 0.171, hybrid: 0.11, ev: 0.05, none: 0 }; // kg/km
        const vehM = { sedan: 1.0, suv: 1.4, hatchback: 0.85, ev: 1.0, none: 0 };
        const car = v.vehicle === 'none' ? 0 : (v.carKm * 52 * (fuelF[v.fuel] || 0.19) * (vehM[v.vehicle] || 1)) / 1000;
        const transit = (v.transit * 52 * 1.5) / 1000;
        const flights = (v.flights || 0) * 0.5;
        const elec = ((v.electricity * 12 * 0.42 * (1 - (v.cleanPct / 100))) / 1000) / Math.max(1, v.members);
        const dietF = { vegan: 1.5, vegetarian: 1.7, 'low-meat': 2.5, 'medium-meat': 3.3, 'high-meat': 4.7 };
        const diet = dietF[v.diet] || 3.0;
        const goods = (v.clothing * 0.1) + (v.electronics * 0.3);
        return Math.max(0.3, car + transit + flights + elec + diet + goods);
    }
    function applyLifestyle(v, announce) {
        state.lifestyle = v;
        state.baseCarbonOverride = computeFootprint(v);
        try { localStorage.setItem(LIFE_KEY, JSON.stringify(v)); } catch (e) {}
        if (typeof saveState === 'function') saveState();
        if (typeof renderAll === 'function') renderAll();
        if (announce && typeof showToast === 'function') showToast('Footprint updated: ' + state.baseCarbonOverride.toFixed(1) + ' t CO₂e/yr 🌍');
    }
    function buildLifestyleModal() {
        if (document.getElementById('lifestyle-modal')) return;
        const sel = (id, opts, cur) => `<select id="${id}" class="ls-input">${opts.map(o => `<option value="${o[0]}"${o[0] === cur ? ' selected' : ''}>${o[1]}</option>`).join('')}</select>`;
        const numf = (id, cur, min, max, step) => `<input type="number" id="${id}" class="ls-input" value="${cur}" min="${min}" max="${max}" step="${step || 1}">`;
        const v = loadLifestyle();
        const wrap = document.createElement('div');
        wrap.id = 'lifestyle-modal'; wrap.className = 'modal-overlay'; wrap.style.display = 'none';
        wrap.innerHTML = `
          <div class="modal-card glass" style="max-width:600px;">
            <button class="btn-close-modal" id="ls-close">&times;</button>
            <h3>🧬 My Lifestyle</h3>
            <p class="section-desc">Tell Planet Lens about your habits to compute your real annual carbon footprint. Stored privately in your browser.</p>
            <div class="ls-grid">
              <label class="ls-field"><span>🚗 Vehicle</span>${sel('ls-vehicle', [['sedan', 'Sedan'], ['suv', 'SUV'], ['hatchback', 'Hatchback'], ['ev', 'Electric'], ['none', 'No car']], v.vehicle)}</label>
              <label class="ls-field"><span>⛽ Fuel</span>${sel('ls-fuel', [['petrol', 'Petrol'], ['diesel', 'Diesel'], ['hybrid', 'Hybrid'], ['ev', 'Electric'], ['none', 'N/A']], v.fuel)}</label>
              <label class="ls-field"><span>🛣️ Car km / week</span>${numf('ls-carKm', v.carKm, 0, 2000, 5)}</label>
              <label class="ls-field"><span>🚌 Transit days / week</span>${numf('ls-transit', v.transit, 0, 14, 1)}</label>
              <label class="ls-field"><span>✈️ Flights / year</span>${numf('ls-flights', v.flights, 0, 50, 1)}</label>
              <label class="ls-field"><span>⚡ Electricity kWh / month</span>${numf('ls-electricity', v.electricity, 0, 5000, 10)}</label>
              <label class="ls-field"><span>🌞 Clean energy %</span>${numf('ls-cleanPct', v.cleanPct, 0, 100, 5)}</label>
              <label class="ls-field"><span>🏠 Household members</span>${numf('ls-members', v.members, 1, 20, 1)}</label>
              <label class="ls-field"><span>🍽️ Diet</span>${sel('ls-diet', [['vegan', 'Vegan'], ['vegetarian', 'Vegetarian'], ['low-meat', 'Low meat'], ['medium-meat', 'Medium meat'], ['high-meat', 'High meat']], v.diet)}</label>
              <label class="ls-field"><span>👕 Clothing items / month</span>${numf('ls-clothing', v.clothing, 0, 50, 1)}</label>
              <label class="ls-field"><span>📱 Electronics / year</span>${numf('ls-electronics', v.electronics, 0, 30, 1)}</label>
            </div>
            <div class="ls-result">Estimated footprint: <b id="ls-estimate">0.0</b> tons CO₂e / yr</div>
            <div class="verify-modal-actions" style="justify-content:flex-end;">
              <button class="btn btn-secondary" id="ls-cancel">Cancel</button>
              <button class="btn btn-primary" id="ls-save">Save & Recalculate</button>
            </div>
          </div>`;
        document.body.appendChild(wrap);

        const readForm = () => ({
            vehicle: wrap.querySelector('#ls-vehicle').value,
            fuel: wrap.querySelector('#ls-fuel').value,
            carKm: +wrap.querySelector('#ls-carKm').value || 0,
            transit: +wrap.querySelector('#ls-transit').value || 0,
            flights: +wrap.querySelector('#ls-flights').value || 0,
            electricity: +wrap.querySelector('#ls-electricity').value || 0,
            cleanPct: +wrap.querySelector('#ls-cleanPct').value || 0,
            members: Math.max(1, +wrap.querySelector('#ls-members').value || 1),
            diet: wrap.querySelector('#ls-diet').value,
            clothing: +wrap.querySelector('#ls-clothing').value || 0,
            electronics: +wrap.querySelector('#ls-electronics').value || 0
        });
        const refresh = () => { wrap.querySelector('#ls-estimate').textContent = computeFootprint(readForm()).toFixed(1); };
        wrap.addEventListener('input', refresh);
        refresh();
        const close = () => { wrap.style.display = 'none'; };
        wrap.querySelector('#ls-close').addEventListener('click', close);
        wrap.querySelector('#ls-cancel').addEventListener('click', close);
        wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
        wrap.querySelector('#ls-save').addEventListener('click', () => { applyLifestyle(readForm(), true); close(); });
    }
    function openLifestyleModal() {
        buildLifestyleModal();
        const m = document.getElementById('lifestyle-modal');
        if (m) m.style.display = 'flex';
    }

    /* ---------------- Gemini-powered personalized insights ---------------- */
    let geminiLoadedOnce = false;
    function buildCarbonProfile() {
        const e = (typeof calculateEmissions === 'function') ? calculateEmissions() : {};
        return {
            region: state.region || 'global',
            totalTons: e.totalProjected || 0,
            breakdown: { transport: e.transport || 0, energy: e.energy || 0, diet: e.diet || 0, waste: e.waste || 0 },
            unlockedRings: state.unlockedRings || [],
            points: state.points || 0
        };
    }
    function renderGeminiInsights(data) {
        const panel = document.getElementById('insights-panel');
        if (!panel) return;
        const isGemini = data.source === 'gemini';
        const badge = isGemini
            ? '<span class="badge" style="color:var(--accent-violet);border-color:rgba(167,139,250,0.4)">✨ Powered by Gemini 2.5 Flash-Lite</span>'
            : '<span class="badge" style="color:var(--accent-orange);border-color:rgba(245,158,11,0.4)">⚙️ Rule-based fallback</span>';
        const cards = data.insights.map(ins => `
            <div class="insight-card">
                <div class="insight-icon" style="font-size:1.4rem">🌍</div>
                <div class="insight-details">
                    <h4>${escapeHTML(ins.category)}</h4>
                    <p>${escapeHTML(ins.suggestion)}</p>
                </div>
                <span class="insight-impact">−${Math.round(ins.estimated_saving_kg)} kg/yr</span>
            </div>`).join('');
        panel.innerHTML = `<div style="display:flex;justify-content:flex-end;margin-bottom:0.6rem">${badge}</div>${cards}`;
    }
    async function refreshInsightsSmart(announce) {
        const panel = document.getElementById('insights-panel');
        if (!panel) return;
        panel.innerHTML = '<div class="insight-card" style="opacity:0.7"><div class="insight-icon">✨</div><div class="insight-details"><h4>Analyzing your footprint…</h4><p>Gemini is generating personalized reduction strategies.</p></div></div>';
        try {
            const res = await fetch('/api/insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(buildCarbonProfile())
            });
            const data = await res.json();
            if (!data || !Array.isArray(data.insights) || !data.insights.length) throw new Error('empty');
            renderGeminiInsights(data);
            geminiLoadedOnce = true;
            if (announce && typeof showToast === 'function') {
                showToast(data.source === 'gemini' ? 'Gemini insights updated ✨' : 'Insights updated (offline mode) ⚙️');
            }
        } catch (e) {
            if (typeof generateInsights === 'function') generateInsights(); // graceful local fallback
        }
    }
    window.refreshInsightsSmart = refreshInsightsSmart;
    // Fetch Gemini insights the first time the Reflection Console is opened.
    if (typeof toggleReflectionConsole === 'function') {
        const _origToggle = toggleReflectionConsole;
        // eslint-disable-next-line no-global-assign
        toggleReflectionConsole = function () {
            const r = _origToggle.apply(this, arguments);
            const content = document.getElementById('reflection-console-content');
            if (!geminiLoadedOnce && content && content.style.display !== 'none') {
                refreshInsightsSmart(false);
            }
            return r;
        };
    }

    /* ---------------- Initial paint (DOM ready: app.js loads at end of <body>) ---------------- */
    function initEnhancements() {
        renderActivityLog();
        renderRegionStream();
        wireLogFilters();
        syncMissionRadial();
        syncElementStatuses();
        setWelcomeEarthColor();
        installEarthFlight();
        wireVoiceToggle();
        fetchGlobalCO2();
        syncAriaCurrent();
        // restore a previously-saved lifestyle so the footprint is personal on load
        try { if (localStorage.getItem(LIFE_KEY)) applyLifestyle(loadLifestyle(), false); } catch (e) {}
        const lsBtn = document.getElementById('btn-open-lifestyle');
        if (lsBtn) lsBtn.addEventListener('click', openLifestyleModal);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initEnhancements);
    } else {
        initEnhancements();
    }
})();
