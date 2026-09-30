<div align="center">
  <img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# 📸 SnapPop PhotoBooth

An interactive, web-based photo booth application built during the **Google Build with AI Bootcamp**. **SnapPop PhotoBooth** leverages Google Gemini's multimodal capabilities to analyze live camera frames in real time and dynamically generate custom postcard aesthetics—acting as a structured design engine rather than an image generator.

---

## 🌟 Key Features

* **Live Stream Ingestion:** Real-time webcam preview featuring an automated 3-second countdown timer.
* **Multimodal AI Inference:** Uses **Google Gemini** (`@google/genai`) to analyze visual context, mood, and objects, returning structured layout metadata (captions, color palettes, frame geometry, and stamps)
* **Dynamic Canvas Compositing:** Programmatically merges raw image data and Gemini metadata onto an HTML5 Canvas to produce high-resolution 4x6 print-ready postcards
* **Interactive Fine-Tuning Controls:** Real-time post-processing adjustments including brightness, contrast, saturation, sepia warmth, and light leak accents
* **Multi-Format Export & Print Settings:** Configure output ratios (4x6 postcard, 2x6 twin strips, polaroid keepsakes) and trigger print or download actions directly

---

## 🏗️ Architecture & Development Workflow

1. **UI Prototyping (Google Stitch):** Rapidly mocked up neo-brutalist UI component layouts.orce Gemini to output structured visual parameters instead of generating synthetic diffusion images
3. **Local Orchestration (Google Antigravity):** Set up and managed full-stack runtime workflows locally via Antigravity
4. **Client-Side Rendering (React + Canvas API):** Dynamic DOM updates and hardware-accelerated canvas compositing

---

## 🛠️ Tech Stack

* **AI & Multimodal Engine:** Google Gemini API (`@google/genai`), Google AI Studio
* **Development & Prototyping Tools:** Google Antigravity, Google Stitch
* **Frontend Framework:** React (TypeScript) + Vite
* **Styling & UI:** Tailwind CSS
* **Rendering & Hardware:** HTML5 Canvas API, Web MediaStream API

---

