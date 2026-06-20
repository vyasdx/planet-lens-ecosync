# How Planet Lens Works 🌍

A complete guide to **what the app does, how to use it, the engineering behind it, and what
makes it different** — for judges, evaluators, and contributors.

---

## 1. The one-line pitch

> Most carbon tools are passive dashboards you forget to open. **Planet Lens turns carbon
> reduction into a mission**: a grayed-out, struggling Earth that you bring back to life by
> making real low-carbon choices — intercepted at the *moment of decision* and proven with
> your phone's own sensors.

It directly answers Challenge 3 — *help individuals **understand, track, and reduce** their
carbon footprint through simple actions and personalized insights* — but reframes it as an
emotional, habit-forming experience instead of a spreadsheet.

---

## 2. How to use it (user journey)

1. **Welcome gate** — a vibrant, living 3D Earth greets you. Tap **Enter Command Center**.
2. **The Earth desaturates** — it flies into the dashboard and turns **grayscale**. That gray
   planet is the problem you're here to fix; restoring its color is your goal.
3. **Make a low-carbon choice**, two ways:
   - **AI Decision Lenses** (Food, Commute, Shopping, Waste, Energy) — simulate a real-life
     decision (e.g. a food-delivery cart) and the app intercepts it with a greener swap.
   - **Action Library** — 25 concrete actions across 5 elements; pick one and perform it.
4. **Prove it** — verify the action using a real device sensor (camera, GPS, or motion/steps)
   or a quick manual confirmation.
5. **A ring activates** — each verified action lights up one of the 5 **Planeteer rings**
   (Earth, Fire, Wind, Water, Heart). Each ring restores **20%** of planet health, and the
   3D Earth regains 20% of its color.
6. **Personalize** — open **My Lifestyle** to enter your real car/diet/energy/travel; your
   footprint becomes truly yours, and EcoBot tailors its insights.
7. **Restore the world** — unlock all **5 rings → the Earth returns to full color**, Captain
   Planet is summoned, and a synthesized **"Go Planet!"** voice plays. Mission complete.

Everything you do is saved locally and persists between visits (with daily/weekly/monthly resets).

---

## 3. The five screens

| Screen | Purpose |
| :--- | :--- |
| **Dashboard** | Live 3D Earth (health = color), Active Mission radial, Planeteer Elements, Decision Lenses, "Color My World" photo. |
| **Action Library** | 25 verified carbon-saving actions, filterable by element, with CO₂/points/verification. |
| **Community** | A live feed of Planeteer wins worldwide. |
| **Terminal** | Mother Earth Bot — conversational diagnostics, eco-tips, and Planeteer trivia. |
| **Logs** | System activity stream, regional impact, and the full **Reflection Console** (footprint calculator, emissions breakdown, historical trend, net-zero offset simulator). |

---

## 4. How it works under the hood

### Carbon engine (`calculateEmissions`)
Your annual footprint (tonnes CO₂e) is computed as:

```
footprint = baseline − ring_reductions − offsets
```

- **baseline** = your **personal lifestyle** estimate (from the My Lifestyle form) **or**, if
  not set, a **regional average** (US 15.5 / EU 6.5 / India 1.9 / Global 4.8 t/yr — real reference figures).
- **ring_reductions** = annualized CO₂ savings from each activated ring.
- **offsets** = tree-planting / clean-energy offset simulation.
The result feeds the breakdown doughnut (transport / energy / diet / waste), the regional
comparison bar, the historical trend, and the monthly mission.

### Personal footprint (`computeFootprint`)
The My Lifestyle form maps real inputs to emission factors — e.g. car distance × fuel factor
(petrol 0.192, diesel 0.171, hybrid 0.11, EV 0.05 kg/km) × vehicle multiplier, electricity ×
grid factor × (1 − clean %) ÷ household size, diet tier, flights, and goods — to produce a
genuinely personal annual estimate.

### The 5 rings ↔ elements
Each verified action unlocks the element it belongs to; 5 rings = 100% health = full-color Earth.

| Decision / action | Ring unlocked |
| :--- | :--- |
| Food (plant-forward) | 💧 Water |
| Waste (recycle/sort) | 🪨 Earth |
| Commute (transit/active) | 💨 Wind |
| Energy (standby/cooling) + 50%+ offset | 🔥 Fire |
| Shopping (second-hand/repair) | ❤️ Heart |

### Multi-agent decision pipeline (`runAgentTimeline`)
When a lens fires, a visible pipeline of specialized agents runs:

```
Context → Carbon → Swap → Nudge → Verify → Gaia
```
Context (region/time/sensors) → Carbon (computes the exact CO₂ delta) → Swap (finds the greener
option) → Nudge (frames the choice at decision time) → Verify (triggers device proof) → Gaia
(logs the win, releases the ring, updates the biosphere).

### Real device sensors (proof of action)
- **Camera** — `navigator.mediaDevices.getUserMedia` (scan/photo proof).
- **GPS** — `navigator.geolocation.getCurrentPosition` (commute/transit proof).
- **Motion** — `DeviceMotionEvent` accelerometer (step counting for walk/cycle).

### Live data & AI
- **Global atmospheric CO₂** is fetched live from the global-warming.org API (real Mauna Loa
  ppm) and shown on the welcome gate and dashboard, with a graceful static fallback offline.
- **Personalized insights are generated by Google Gemini 1.5 Flash** via a server-side proxy
  (`/api/insights` → `gemini.js`): the user's carbon profile is sent with a strict JSON
  `responseSchema`, `temperature: 0.4`, and a system instruction demanding specific, quantified
  advice. A deterministic rule-based fallback runs if the model is unavailable, so insights never
  fail. The API key stays server-side only (never shipped to the browser).

### The experience layer
- **3D Earth** — Three.js sphere with real NASA-style textures, clouds, atmospheric rim glow;
  a CSS `grayscale()` filter ties its color directly to planet health.
- **Audio** — programmatic 8-bit chiptune + chimes via the Web Audio API (no audio files).
- **Voice** — "Go Planet!" via the Web Speech API on full summon.
- **Color My World** — upload a personal photo; it restores from grayscale to color as you progress.

### Tech & data handling
Vanilla HTML/CSS/JS, **zero dependencies**, served by a minimal hardened Node static server.
All state lives in `localStorage` — **nothing is uploaded** (privacy by design). User text is
escaped before render; no `eval`; the server blocks path traversal.

---

## 5. Our moat — why this is hard to copy and better than a dashboard

1. **Moment-of-decision interception, not after-the-fact logging.** Behavior change happens
   *at* the choice (the food cart, the ride), not in a monthly report you never open.
2. **Emotional gamification with a payoff loop.** The grayscale→color Earth + the "Color My
   World" personal photo + Captain Planet summon create a visible, emotional reason to act —
   the part generic trackers lack.
3. **Real proof of action via device sensors.** Camera/GPS/motion verification makes actions
   credible instead of self-reported checkboxes — a foundation for trust and rewards.
4. **Real, production-grade GenAI — not a demo call.** Gemini 1.5 Flash behind a server-side
   proxy, with schema-enforced JSON output, low temperature, rate limiting, and a deterministic
   fallback engine so it never hard-fails. Plus a real lifestyle model and honest "what's live vs.
   illustrative" labeling — we don't fake precision.
5. **Multi-agent nudge framing.** The decision pipeline is an extensible pattern for plugging
   in smarter models and new decision domains.
6. **Zero-dependency, instantly portable, privacy-first.** No backend required, no data leaves
   the device, installable as a PWA — trivial to demo, deploy, and later wrap as a native app.

---

## 6. Explain it in 60 seconds (for judges)

> "Carbon apps fail because they're passive — you log, you forget. Planet Lens makes it a
> mission. You land on a living Earth that turns gray — that's the planet you have to save.
> When you're about to order food or book a ride, the app intercepts the decision and offers a
> greener swap. You prove you did it with your phone's camera, GPS, or step sensor, and that
> lights up one of five elemental rings — each one restores 20% of the Earth's color. Unlock
> all five and Captain Planet is summoned, the world is back in full color. Behind it: a real
> carbon engine with a personal lifestyle calculator, live global CO₂ data, a multi-agent
> nudge pipeline, and everything stored privately on-device. It's understand, track, and
> reduce — turned into something you actually *want* to come back to."

## 7. 2-minute live demo path

1. Welcome gate → point out the **live CO₂ ppm** (real data) → **Enter Command Center**.
2. Watch the Earth fly in and **gray out**. "This is the problem."
3. Open the **Food lens** → pick the high-carbon item → see the **swap + agent pipeline** → verify.
4. Show a **ring light up** and the Earth gain color + the **mission %** move.
5. Open **My Lifestyle**, change a value, save → footprint updates live. "Personalized."
6. (Optional) Unlock the rest → **full-color Earth + "Go Planet!" voice**.
7. Resize to a phone width → **bottom-nav app experience** + installable PWA.
