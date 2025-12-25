# 🚀 SnapExtract AI: Universal Tech Scanner

SnapExtract AI is a high-performance, frontend-only AI application designed to transform messy technical screenshots (reels, code editors, social media posts) into clean, structured, and actionable data.

---

## 🛠 Tech Stack

### Frontend & UI
- **Framework:** React 19+ (Functional Components with Hooks)
- **Styling:** Tailwind CSS (Modern Glassmorphism & High-Contrast UI)
- **Icons:** Heroicons (v2 Outline)
- **Type Safety:** TypeScript
- **PDF Generation:** jsPDF
- **Bundling:** Pure ESM Module Imports (No heavy build step required for browser execution)

### Intelligence & AI
- **SDK:** `@google/genai` (Google Generative AI SDK)
- **Extraction Model:** `gemini-3-flash-preview` (Optimized for speed and structured JSON output)
- **Assistant Model:** `gemini-3-pro-preview` (Used for complex technical chat reasoning)
- **Image Model:** `gemini-3-pro-image-preview` (High-quality 1K/2K/4K visualization)

### Storage & Persistence
- **Database:** Browser `localStorage` (No server-side database required; all data stays private on your machine)
- **State Management:** React `useState` & `useEffect` with deep persistence.

---

## 🌟 Key Features

### 1. Universal Technical Scraper
- **Multi-Input:** Upload from Gallery, capture via Camera, or simply **Paste (Ctrl+V)** from your clipboard.
- **Auto-Detection:** Extracts AI Tools, Code Snippets (with formatting), YouTube Channels, Social Profiles, and Websites.
- **Duplicate Prevention:** Automatically merges identical entries across multiple screenshots.

### 2. Visualization Engine
- Takes extracted concepts or text descriptions and generates high-fidelity images using Gemini 3's image capabilities.
- Supports variable resolutions (1K, 2K, 4K).

### 3. Technical Assistant
- A persistent chat interface that knows about the Gemini ecosystem.
- Real-time streaming responses for a smooth conversational feel.

### 4. Data Portability
- **PDF Export:** Generate professional technical reports of your scanned history.
- **Copy All:** One-click copy for moving data into Google Sheets, Notion, or Obsidian.
- **Persistence:** Your scan history is automatically saved and reloaded whenever you visit the app.

---

## 🔑 API Configuration

This application utilizes the **Google Gemini API**. 
- **Requirement:** A valid API Key from a paid Google Cloud Project is required for high-tier model access.
- **Access:** The key is managed via the `process.env.API_KEY` variable or the secure `aistudio` key selector dialog.

---

## 💻 Local Setup & Development

Because this app uses modern ES6 Modules and Import Maps, it is extremely lightweight.

### Prerequisites
- A simple local web server (e.g., Python's `http.server`, `npx serve`, or Live Server extension).

### Running Locally
1. Clone or download the project files.
2. Ensure `index.html`, `index.tsx`, `App.tsx`, `types.ts`, and `services/` are in the same root directory.
3. Open your terminal in the project folder and run:
   ```bash
   npx serve
   ```
4. Access the app at `http://localhost:3000`.

---

## 🏗 System Architecture (End-to-End)

1. **Client Layer:** Browser handles all UI, Camera processing, and Clipboard events.
2. **Logic Layer:** `geminiService.ts` handles the interface with Google's servers, formatting base64 images into `parts` and handling JSON schemas.
3. **API Layer:** Calls are made directly from the browser to Google's edge locations.
4. **Storage Layer:** All "History" is serialized to JSON and stored in the user's `localStorage`. No data is ever sent to a private backend—it only travels between the user and Google's AI.

---

## 🛡 Security & Privacy
- **Client-Side:** Your screenshots never touch a third-party server besides Google's API.
- **No Tracking:** The app does not include analytics or cookies.
- **Ephemeral Input:** Uploaded images are cleared from the interface after scanning to save browser memory.