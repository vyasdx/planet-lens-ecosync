// Global State variables
let state = {
    points: 0,
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
    worldCelebrated: false // track if 100% color-restored celebration ran
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
        q: "Gaia asks: What percentage of global greenhouse gas emissions come from food production?",
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
    setupTabNavigation();
    setupAudioController();
    setupOffsetSlider();
    setupSelectors();
    setupWorldImageUpload();
    renderAll();
    
    // Welcome message in chat
    if (state.chatHistory.length === 0) {
        addBotMessage("Greetings, Planeteer! I am Gaia. 🌍\n\nEcoSync Lens has initiated. Our mission is to protect the biosphere by making carbon-aware choices at the moment of decision. \n\nWe need to activate the **5 Planeteer Rings** (Earth, Fire, Wind, Water, Heart) to clean up the environment and summon Captain Planet. Where shall we start?", [
            { text: "Play Planeteer Trivia 🧠", action: "start_trivia" },
            { text: "Diagnose Footprint 📊", action: "analyze" },
            { text: "Clean Energy Tips 💡", action: "tips" }
        ]);
    } else {
        restoreChat();
    }

    // Attach listeners
    document.getElementById('btn-clear-chat').addEventListener('click', clearChatHistory);
    document.getElementById('chat-form').addEventListener('submit', handleChatSubmit);
    document.getElementById('btn-refresh-insights').addEventListener('click', () => {
        generateInsights();
        showToast("Gaia Terminal Insights updated!");
    });
});

// Load State from LocalStorage
function loadState() {
    const saved = localStorage.getItem('ecosync_lens_state');
    if (saved) {
        try {
            state = JSON.parse(saved);
            if (!state.unlockedRings) state.unlockedRings = [];
            if (!state.chatHistory) state.chatHistory = [];
            if (!state.worldImage) state.worldImage = null;
            if (state.worldCelebrated === undefined) state.worldCelebrated = false;
        } catch (e) {
            console.error("Failed to load local state", e);
        }
    }
}

function saveState() {
    localStorage.setItem('ecosync_lens_state', JSON.stringify(state));
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
            showToast(`Gaia Calibration: Region set to ${e.target.options[e.target.selectedIndex].text}`);
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
                
                // Add conversational nudge in Gaia Terminal
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
            progressText.textContent = "🌈 100% RESTORED (YOUR WORLD IS VIBRANT!)";
            imageFrame.classList.add('fully-restored');

            // Celebration trigger
            if (!state.worldCelebrated) {
                state.worldCelebrated = true;
                saveState();
                playSummonSFX();
                
                // Trigger Gaia Bot congratulatory message
                setTimeout(() => {
                    addBotMessage("🎉 AMAZING JOB, PLANETEER! Your world has returned to full, vibrant color! 🌈\n\nYour choices in food swaps, active commutes, recycling, and conservation have direct power. By uniting the 5 rings, you summoned Captain Planet and protected what you love! Keep up the real-world action! 🦸‍♂️🌍", [
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


// ----------------- PLANETEER RING CONTROLLER -----------------
function unlockRing(element) {
    if (!state.unlockedRings.includes(element)) {
        state.unlockedRings.push(element);
        const pts = PLANETEER_ELEMENTS[element].pts;
        state.points += pts;
        
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

function lockRing(element) {
    const index = state.unlockedRings.indexOf(element);
    if (index !== -1) {
        state.unlockedRings.splice(index, 1);
        const pts = PLANETEER_ELEMENTS[element].pts;
        state.points = Math.max(0, state.points - pts);
        
        const slot = document.getElementById(`ring-${element}`);
        if (slot) slot.classList.remove('remove');

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

    // Render Gaia EcoWorld SVG
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

// ----------------- GAIA ECOWORLD SVG ANIMATOR -----------------
function updateGaiaEcoWorldSVG(emissions) {
    const svg = document.getElementById('gaia-svg');
    const healthBadge = document.getElementById('gaia-health-badge');
    const smog = document.getElementById('svg-smog');
    const river = document.getElementById('svg-river');
    const foliage = document.getElementById('svg-foliage');
    const flowers = document.getElementById('svg-flowers');
    const capGlow = document.getElementById('svg-captain-glow');
    const capPlanet = document.getElementById('svg-captain-planet');

    if (!svg) return;

    // Health matches activated rings (20% per ring)
    const healthPct = state.unlockedRings.length * 20;
    
    if (healthBadge) {
        healthBadge.textContent = `Health: ${healthPct}%`;
        if (healthPct >= 80) healthBadge.style.borderColor = 'var(--primary)';
        else if (healthPct >= 40) healthBadge.style.borderColor = 'var(--accent-orange)';
        else healthBadge.style.borderColor = 'var(--color-fire)';
    }

    // 1. Smog opacity decreases as elements are unlocked
    if (smog) {
        const maxSmog = 0.65;
        const currentSmog = Math.max(0, maxSmog - (state.unlockedRings.length * 0.13));
        smog.setAttribute('opacity', currentSmog.toString());
    }

    // 2. River color shifts from murky grey (#475569) to clear sparkling blue (#0ea5e9)
    if (river) {
        if (healthPct >= 80) river.setAttribute('fill', '#0ea5e9'); // Clear blue
        else if (healthPct >= 40) river.setAttribute('fill', '#1d4ed8'); // Standard blue
        else river.setAttribute('fill', '#334155'); // Murky
    }

    // 3. Foliage grows (scale / opacity increases)
    if (foliage) {
        const currentFoliageOpacity = 0.1 + (state.unlockedRings.length * 0.18);
        foliage.setAttribute('opacity', currentFoliageOpacity.toString());
    }

    // 4. Flowers bloom at 100% health
    if (flowers) {
        flowers.setAttribute('opacity', healthPct === 100 ? '1' : '0');
    }

    // 5. Captain Planet summon visible at 100% health
    if (capGlow && capPlanet) {
        if (healthPct === 100) {
            capGlow.setAttribute('opacity', '1');
            capPlanet.setAttribute('opacity', '1');
        } else {
            capGlow.setAttribute('opacity', '0');
            capPlanet.setAttribute('opacity', '0');
        }
    }
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
                <button class="btn btn-primary" onclick="initiateSensorVerification('waste')">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="margin-right-sm"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    Open Live Camera Scanner
                </button>
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
function triggerCarbonNudge(lens, selection) {
    const nudgeBox = document.getElementById('active-nudge-box');
    if (!nudgeBox) return;

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
                    <div class="nudge-header">🌿 Gaia Check Completed</div>
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
                    <div class="nudge-header">🌿 Gaia Check Completed</div>
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
                    <div class="nudge-header">🌿 Gaia Check Completed</div>
                    <p class="nudge-desc">Vintage Upcycled Jacket selected (**1.5 kg CO2**). Highly circular, low-waste choice! Let's scan purchase receipt to activate the **Heart Ring**.</p>
                    <div class="nudge-buttons">
                        <button class="btn btn-primary btn-sm" onclick="initiateSensorVerification('shopping')">Submit Purchase Verification Proof</button>
                    </div>
                </div>
            `;
        }
    }

    nudgeBox.innerHTML = nudgeHTML;
    nudgeBox.style.display = 'block';
}

function acceptDecisionSwap(lens, swapOption) {
    showToast("Planeteer Swap Accepted! Impact logged.");
    triggerCarbonNudge(lens, swapOption);
}

function rejectDecisionSwap(lens) {
    showToast("Choice ignored. Smog levels increased.");
    addBotMessage("⚠️ **Gaia Warning**: A high-carbon decision was made without a swap. Smog particles have increased. Unlocking rings will help clear the air.");
    
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

    // Bind verification confirm button click
    document.getElementById('btn-confirm-verify').onclick = () => {
        stopWebcamStream();
        // Fallback immediate unlock
        const elementToUnlock = lens === 'food' ? 'water' : (lens === 'waste' ? 'earth' : (lens === 'commute' ? 'wind' : 'heart'));
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
            desc: 'Daily commuting is releasing direct tailpipe emissions. Taking the metro or active cycling prevents smog in Gaia\'s atmosphere.',
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
                    <p>Gaia is fully balanced! You have stabilized your carbon footprint. Continue monitoring your decision points and inspire other Planeteers!</p>
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

// ----------------- GAIA TERMINAL CHAT ENGINE -----------------
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
    
    addBotMessage("Gaia Bot Terminal Reset. Ready to commune.", [
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
        let reply = `Gaia Diagnosis: Your projected carbon footprint is **${score} tons CO2e** per year. \n\nActive Elements: **${state.unlockedRings.length}/5**\n`;
        state.unlockedRings.forEach(r => {
            reply += `✅ ${PLANETEER_ELEMENTS[r].name} (Active: -${PLANETEER_ELEMENTS[r].co2} kg CO2e/wk)\n`;
        });
        addBotMessage(reply, [
            { text: "Explain Elements 🪨", action: "explain_elements" }
        ]);
        return;
    }

    if (text.includes('tip') || text.includes('advice') || text.includes('help')) {
        addBotMessage("Gaia's tip: Adjusting your offset contributions to 50%+ unlocks the **Fire Ring**. Eating less beef unlocks the **Water Ring**. Walking or cycling unlocks the **Wind Ring**!");
        return;
    }

    addBotMessage("Gaia Terminal is online. I can assist with: \n\n• Trivia Game (*'Play Trivia'*)\n• EcoWorld Diagnoses (*'Diagnose Footprint'*)\n• Active Ring summaries\n\nWhat is your query, Planeteer?", [
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
                { text: "Ask Gaia for tips 💡", action: "tips" }
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
