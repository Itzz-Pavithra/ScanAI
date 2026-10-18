# ScanAI — Premium Multimodal AI Visual Scanner

ScanAI is a production-grade multimodal visual intelligence platform inspired by Google Lens. It enables users to upload images, capture live camera snapshots, select top-tier AI providers (OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet, Google Gemini), and receive rich, streaming explanations, step-by-step breakdowns, and multi-turn conversational follow-ups.

---

## 🌟 Key Features

1. **Dynamic Provider Themes:**
   - **ChatGPT / OpenAI:** Crisp monochrome, black, white, and charcoal minimal aesthetic.
   - **Claude (Anthropic):** Warm cream, terracotta orange, and deep dark accents.
   - **Gemini (Google):** Vibrant, multicolor gradients and fluid ambient glows.
2. **Vision Scanning & Camera:**
   - Drag-and-drop file upload with client-side image compression and binary magic-byte validation.
   - Live camera capture with responsive permission-denied fallbacks.
3. **Real-time SSE Streaming & Multi-Turn Chat:**
   - Server-Sent Events (SSE) streaming with instant user cancellation support.
   - Multi-turn conversation history with full context retention across turns.
4. **Security & Authentication:**
   - Secure Argon2id password hashing and SHA-256 session token hashes.
   - Strict `HttpOnly`, `SameSite=Lax`, and `Secure` cookie management.
   - Route-level server guards, CSRF origin verification, and strict Content Security Policy (CSP).
   - In-memory sliding-window rate limiting for authentication and password resets.
5. **Persistence & Image Storage:**
   - MongoDB Atlas for user accounts, conversation history, and usage records.
   - MongoDB GridFS for binary image storage with strict user ownership authorization.
   - Conversation search, filtering, bookmarking, renaming, Markdown export, and share revocation.
6. **Progressive Web App (PWA):**
   - Web App Manifest (`manifest.webmanifest`) supporting standalone mobile and desktop installation.
   - Built-in Service Worker with conservative privacy caching (strictly bypasses `/api/*` endpoints).
   - Dedicated offline fallback screen (`/offline`).
   - Interactive install prompt banner and automatic update detection.
7. **Production & Android Readiness:**
   - Vercel-ready with zero secret leakage.
   - Dedicated `/api/health` monitoring endpoint.
   - Capacitor configuration (`capacitor.config.json`) and documentation for Android packaging.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+ or 20+
- MongoDB instance (MongoDB Atlas or local `mongodb://127.0.0.1:27017`)
- At least one AI provider API key (`GEMINI_API_KEY`, `OPENAI_API_KEY`, or `ANTHROPIC_API_KEY`)

### 2. Environment Setup
Copy the example environment file and configure your credentials:
```bash
cp .env.example .env
```

Edit `.env` with your values:
```ini
GEMINI_API_KEY="AIzaSy..."
OPENAI_API_KEY="sk-proj-..."
ANTHROPIC_API_KEY="sk-ant-..."
MONGODB_URI="mongodb://127.0.0.1:27017"
MONGODB_DB_NAME="scanai"
SESSION_SECRET="your-64-char-random-secret"
```

### 3. Run Development Server
```bash
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Testing

ScanAI includes an automated test suite executed via the native Node.js test runner:
```bash
npm test
```
Tests cover:
- Password security (Argon2id) and session token hashing.
- Input validation (emails, passwords, display names).
- Image binary validation (PNG/JPEG/WEBP magic bytes) and compression thresholds.
- Provider normalization, error mapping, and streaming SSE protocol.
- Multi-user data isolation and GridFS authorization.
- CSRF protection and `/api/health` security invariants.

---

## 📦 Production Build & Deployment

To verify the production build locally:
```bash
npm run build
```

For complete Vercel and MongoDB Atlas production deployment instructions, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

For Capacitor Android APK and Play Store packaging instructions, see [docs/ANDROID.md](docs/ANDROID.md).
