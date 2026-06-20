# Planet Lens 🌍 — Eco-Intelligence Command Center

> An AI carbon-footprint copilot that helps individuals **understand, track, and reduce**
> their carbon footprint through simple, gamified actions and personalized insights.

**🔗 Live demo:** https://ecosync-1089016154142.europe-west9.run.app
**💻 Repository:** https://github.com/vyasdx/planet-lens-ecosync
**📱 Works on desktop & mobile web** (installable PWA — add to home screen for a full-screen app experience).
**📖 Full walkthrough & architecture:** see [HOW_IT_WORKS.md](HOW_IT_WORKS.md) — how to use it, the engineering behind it, our moat, and a judge demo script.

---

## 🎯 Challenge 3 — Carbon Footprint Awareness Platform

> *"Design a solution that helps individuals understand, track, and reduce their carbon
> footprint through simple actions and personalized insights."*

Rather than a plain logging dashboard, Planet Lens reframes carbon awareness as a
**mission** — a Captain Planet–inspired command center where you restore a grayed-out,
struggling Earth back to full color by making real low-carbon choices. This turns an
abstract metric into an emotional, habit-forming experience.

### How it maps to the problem statement

| Requirement | How Planet Lens delivers it |
| :--- | :--- |
| **Understand** | A live 3D Earth, real-time **global atmospheric CO₂** (Mauna Loa data), an emissions breakdown doughnut, and a Mother Earth Bot that explains your impact in plain language. |
| **Track** | A personal footprint that updates as you act, daily/weekly/monthly EcoPoints, a monthly 25 kg CO₂e mission, historical trend chart, and a 5-ring progress system. |
| **Reduce** | **AI Decision Lenses** intercept everyday choices (food, commute, shopping, waste, energy) at the moment of decision and nudge to lower-carbon swaps; a 25-action library turns intent into verified habits. |
| **Personalized insights** | A **"My Lifestyle"** calculator builds your real footprint from your vehicle, diet, energy, and travel; EcoBot generates tailored recommendations from your data. |

---

## 🌟 Key Features

- **Command-Center UI** — persistent navigation (Dashboard / Action Library / Community / Terminal / Logs) with an Eco-Futurism glassmorphic design system.
- **Cinematic 3D Earth** — a colorful living Earth on the welcome gate flies into the dashboard and **desaturates to grayscale**, then returns to full color as you restore the 5 Planeteer rings (Earth, Fire, Wind, Water, Heart).
- **AI Decision Lenses** — moment-of-decision interception for Food, Commute, Shopping, Waste, and Energy, each running a multi-agent pipeline (Context → Carbon → Swap → Nudge → Verify → Gaia).
- **25-Action Element Library** — one-time, habit, and long-term actions across the five elements, each with CO₂ saved, points, and a verification method.
- **Real device-sensor verification** — camera (`getUserMedia`), live GPS (`geolocation`), and motion/step counting (`DeviceMotion`) to prove actions.
- **Live global CO₂** — real-time atmospheric ppm from the global-warming.org API, with graceful offline fallback.
- **"My Lifestyle" footprint calculator** — personalizes the carbon math to the actual user.
- **Mother Earth Bot Terminal** — conversational guidance + Planeteer trivia.
- **"Go Planet!" voice** — synthesized Captain Planet line (Web Speech API) when all 5 rings activate.
- **Community feed & System Logs** — planetary activity stream and telemetry.

---

## 🏗️ Tech & Architecture

Built with **vanilla HTML / CSS / JavaScript and zero runtime dependencies** — no framework,
no build step. This keeps the bundle tiny, the code transparent, and the app instantly portable.

| File | Responsibility |
| :--- | :--- |
| `index.html` | App shell (sidebar + top bar + bottom nav), all six screens, modals. |
| `styles.css` | Eco-Futurism design tokens, glassmorphism, responsive + mobile/PWA layout. |
| `app.js` | State machine, carbon engine, decision pipelines, sensor verification, Three.js Earth, Web Audio, and a clearly-separated enhancement layer for the command-center features. |
| `server.js` | Minimal static file server with directory-traversal protection. |
| `manifest.json` | PWA manifest for installability (standalone, themed). |

- **State & privacy:** all user data lives in `localStorage` on the device — nothing is uploaded to a server.
- **Security:** user-supplied text is escaped (`escapeHTML`) before rendering; no `eval`/dynamic code execution; the static server rejects path-traversal.
- **Accessibility & reach:** semantic landmarks, `aria-label`s on icon controls, image `alt` text, keyboard-reachable controls, and a responsive layout with an Android-style bottom nav and safe-area handling on mobile.

---

## 🔬 Data Transparency

Honest about what is live vs. illustrative:

- **Real:** device sensors (camera/GPS/motion), live global CO₂ ppm, your logged actions and EcoPoints, and your personal footprint from the My Lifestyle form.
- **Illustrative (demo data):** the community feed, the System Logs / Regional Impact stream, and the Net-Zero simulation figures — included to show the intended at-scale experience.

---

## 🛠️ Run Locally

Requires Node.js (no packages to install — zero dependencies).

```bash
npm start
# serves on http://localhost:8080
```

## ✅ Testing

Core carbon logic lives in `core.js` — a pure, DOM-free, dependency-free module that the
browser app and the test suite both consume. Tests use Node's built-in runner (no frameworks):

```bash
npm test
```

`tests/core.test.js` covers regional baselines, the personal footprint calculator
(`computeFootprint`), projected emissions with ring reductions and offsets, planet-health
math, rank thresholds, the ISO week key, and `escapeHTML` (XSS-safety) — 13 passing tests.
Separating pure logic into `core.js` keeps the carbon engine independently testable and the
UI layer thin.

## 🚀 Deploy (Google Cloud Run)

```bash
gcloud run deploy ecosync --source . --region=europe-west9 --allow-unauthenticated
```

---

## 🗺️ Roadmap

- Package the PWA as a native Android app (TWA / Capacitor).
- Wire live regional grid-carbon and community data via backend APIs.
- Expand the lifestyle model with more granular, region-specific emission factors.
