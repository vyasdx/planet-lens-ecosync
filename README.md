# Planet Lens 🌍 — Eco-Intelligence Command Center

Planet Lens is an AI carbon-footprint copilot with a command-center UI (sidebar Dashboard / Action Library / Community / Terminal / Logs), featuring a 3D rotating Earth that starts grayscale and returns to full color as you activate the 5 Planeteer rings (Captain Planet theme).

---

## 🌟 Features

- **Command-Center Dashboard**: Full-featured control panel hosting decision lenses, environmental metrics, and target metrics widgets.
- **3D Earth Flight & Grayscale-to-Color Restoration**: Cinematic introduction featuring a 3D Earth flying from the welcome splash directly into the dashboard, transitioning from grayscale (0% health) to full vibrant color as rings are restored.
- **AI Decision Lenses**: Moment-of-decision prompts covering Food, Commute, Shopping, Waste, and Energy carbon habits.
- **25-Action Element Library**: Core actions categorised under Earth, Fire, Wind, Water, and Heart elements to earn points.
- **Device-Sensor Verification**: Verification of eco-actions via camera scan uploads, live GPS geolocation tracking, and motion/device step sensors.
- **Live Global Atmospheric CO₂**: Real-time atmospheric CO₂ data loaded directly from the global-warming.org API.
- **"My Lifestyle" Footprint Calculator**: A personal carbon footprint calculator mapping daily user choices to environmental impact.
- **Mother Earth Bot Terminal + Trivia**: Direct conversational interface and trivia gameplay to educate on biosphere preservation.
- **Community Feed**: Real-time activity feed highlighting verified wins and carbon savings from global protectors.
- **System Logs**: Comprehensive command logs detailing active background triggers, diagnostics, and session states.
- **"Go Planet!" Voice Activation**: Synthesised Captain Planet speech using the Web Speech API when all 5 elemental rings are successfully unlocked.

---

## 🛠️ Local Development & Running

EcoSync is built with zero dependencies using vanilla HTML/CSS/JS. It includes a minimal Node.js server.js file to serve static files.

### 1. Run Locally
```bash
# Install Node.js if not present
# Start the web server
npm start
```
By default, the server runs on `http://localhost:8080`.

---

## 🚀 Google Cloud Run Deployment

EcoSync Lens is deployed on **Google Cloud Run** using containerized hosting.

### 1. Build and Deploy Command
```bash
gcloud run deploy ecosync --source . --region=europe-west9 --allow-unauthenticated
```
