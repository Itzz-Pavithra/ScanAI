# ScanAI — Production Deployment Guide (Vercel & MongoDB Atlas)

This guide provides step-by-step instructions for deploying ScanAI to **Vercel** with **MongoDB Atlas** for database persistence and image storage via GridFS.

---

## 1. Prerequisites

- A [Vercel](https://vercel.com) account.
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster (M0 free tier or higher).
- Valid API keys for multimodal AI vision providers:
  - Google Gemini API Key (`GEMINI_API_KEY`)
  - OpenAI API Key (`OPENAI_API_KEY`)
  - Anthropic Claude API Key (`ANTHROPIC_API_KEY`)
- *(Optional)* [Resend](https://resend.com) API key for transactional emails (`RESEND_API_KEY`).

---

## 2. MongoDB Atlas Configuration

1. **Create or Select a Cluster:**
   - In MongoDB Atlas, create a free M0 or production M10+ cluster.
   - Choose a region geographically close to your Vercel deployment region (e.g., `us-east-1` or `iad1`).

2. **Configure Database Access:**
   - Under **Security > Database Access**, add a new database user (e.g. `scanai_user`).
   - Use password authentication with a strong, unpredictable password.
   - Grant `readWriteAnyDatabase` or scoped read/write access to the `scanai` database.

3. **Configure Network Access:**
   - Under **Security > Network Access**, click **Add IP Address**.
   - Add `0.0.0.0/0` (Allow Access from Anywhere) to permit connections from Vercel dynamic serverless IP pools.

4. **Retrieve Connection String:**
   - Click **Connect > Drivers > Node.js**.
   - Copy the SRV URI:
     ```text
     mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
     ```

---

## 3. Environment Variables Configuration

Configure the following environment variables in the Vercel dashboard under **Project Settings > Environment Variables**:

| Variable Name | Required | Description | Example / Default |
| :--- | :---: | :--- | :--- |
| `MONGODB_URI` | **Yes** | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority` |
| `MONGODB_DB_NAME` | **Yes** | Target database name | `scanai` |
| `SESSION_SECRET` | **Yes** | High-entropy secret for session hashes | 64+ random hex characters |
| `GEMINI_API_KEY` | **Yes\*** | Google GenAI API key for Gemini models | `AIzaSy...` |
| `OPENAI_API_KEY` | **Yes\*** | OpenAI API key for GPT-4o vision | `sk-proj-...` |
| `ANTHROPIC_API_KEY` | **Yes\*** | Anthropic API key for Claude 3.5 Sonnet | `sk-ant-...` |
| `RESEND_API_KEY` | Optional | Resend API key for transactional emails | `re_...` |
| `EMAIL_FROM` | Optional | Verified sender address for transactional emails | `ScanAI <noreply@yourdomain.com>` |
| `PUBLIC_APP_URL` | Optional | Canonical production URL | `https://scanai.vercel.app` |

*\* At least one AI provider key must be provided. ScanAI will gracefully indicate provider availability based on active keys.*

---

## 4. Vercel Deployment Workflow

### Step 1: Push Repository to GitHub / GitLab
Ensure all local changes are committed and pushed to your remote repository:
```bash
git add .
git commit -m "feat: complete Phase 5 production hardening & PWA"
git push origin main
```

### Step 2: Import Project into Vercel
1. Log in to [Vercel](https://vercel.com) and click **Add New > Project**.
2. Select your ScanAI repository.
3. Vercel automatically detects **SvelteKit** via `@sveltejs/adapter-auto`.
4. Keep the default build settings:
   - **Framework Preset:** SvelteKit
   - **Build Command:** `vite build`
   - **Output Directory:** Default (`.svelte-kit`)
   - **Install Command:** `npm install`

### Step 3: Set Environment Variables
Add all required environment variables listed in Section 3 above before clicking Deploy.

### Step 4: Deploy & Verify Preview
1. Click **Deploy**. Vercel will install dependencies, bundle client and SSR assets, and provision serverless functions.
2. Review build logs to ensure zero compilation or native binding errors.

---

## 5. Post-Deployment Verification (Smoke Tests)

Execute the following post-deployment checks against your production deployment:

1. **Health Check:**
   Visit `https://<your-app>.vercel.app/api/health`.
   Verify the response returns:
   ```json
   {
     "status": "healthy",
     "version": "1.0.0",
     "services": {
       "database": "connected"
     }
   }
   ```

2. **Security Headers:**
   Inspect response headers on `https://<your-app>.vercel.app`:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Content-Security-Policy`: Present and active.

3. **Core Workflows:**
   - **Registration & Login:** Register a new user account and verify session cookie is set with `HttpOnly` and `Secure`.
   - **Visual Scan:** Upload an image and verify real-time streaming answer from the active AI provider.
   - **History Persistence:** Verify the conversation is saved to MongoDB and visible under `/history`.
   - **Image Protection:** Verify the GridFS image is viewable by the author, and inaccessible to logged-out users or different accounts.
   - **PWA Installation:** Open Chrome or Edge and verify the install prompt / manifest is recognized.
   - **Offline Page:** Disconnect network and confirm `/offline` screen appears.

---

## 6. Troubleshooting

- **MongoDB Timeout:** Verify Network Access in Atlas includes `0.0.0.0/0` and that the MongoDB password does not contain unencoded special characters.
- **Provider API Error:** Check that provider quotas and billing are active on the respective developer consoles.
- **CSRF Block:** Ensure requests originate from the same host or configured production domain.
