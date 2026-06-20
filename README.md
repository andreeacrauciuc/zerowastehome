<div align="center">

# ZeroWasteHome

[🚀 See the live app](https://link-ul-tau-aici.com) | [📝 Read the documentation](#)

---

### A production-grade React + Firebase PWA for tracking food inventory, cutting household waste, and quantifying its financial & environmental impact.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![SCSS](https://img.shields.io/badge/SCSS-Modular-CC6699?logo=sass&logoColor=white)](https://sass-lang.com/)
[![Vitest](https://img.shields.io/badge/Vitest-4-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![CI](https://img.shields.io/badge/CI-GitHub_Actions-2088FF?logo=githubactions&logoColor=white)](./.github/workflows/quality-checks.yml)
[![PWA](https://img.shields.io/badge/PWA-Offline_Ready-5A0FC8?logo=pwa&logoColor=white)](./vite.config.js)

</div>

---

![ZeroWasteHome Dashboard](./assets/impact.png)

---

## 📖 Overview

**ZeroWasteHome** tracks what you buy, what you eat, and what you throw away — then turns that data into actionable insight. It supports multi-member households with real-time shared inventory, AI-generated recipes built from your actual pantry, smart shopping with one-tap transfer into inventory, and an analytics hub that quantifies savings in money, kilograms, and CO₂.

It is built as a **lab-in-production** project: it runs on real Firebase infrastructure with Firestore security rules, real-time listeners, scoped transactional writes, and a scheduled Cloud Function for push notifications — there is no mock data layer.

---

## ✨ Key Features

- **📦 Smart Inventory** — Add items manually or by **barcode scan** (ZXing); track expiry dates, quantities, and units; sort by urgency; filter by category. Cards visually escalate as items approach expiry.
- **🍳 AI Recipe Generation** — Generate recipes from your current pantry contents using the **Groq LLM** (Llama 3.3 70B), routed through a secure serverless proxy. Includes ingredient matching, cost estimates, eco-scores, and smart pantry swaps.
- **🛒 Smart Shopping List** — Build and check off a shopping list, then **transfer purchased items directly into inventory** in a single atomic operation. Pantry-swap suggestions reduce duplicate purchases.
- **📊 Impact Analytics Hub** — An animated dashboard: lifetime savings counter, CO₂ prevented, a kitchen-health radial score, saved-vs-wasted trend chart, top loss categories, and a full event timeline.
- **🏠 Households** — Create or join a shared household via a 6-character join code; inventory, shopping, and impact data sync in real time across all members.
- **🔔 Push Notifications** — A scheduled Firebase Cloud Function sends FCM expiry reminders, with per-user **silent-hours** support and automatic cleanup of stale device tokens.
- **⚙️ Settings** — Profile and avatar management, currency selection, granular notification preferences, and full household management.
- **📲 Installable PWA** — Offline-ready with a service worker, Firestore network-first runtime caching, and an install prompt.

---

## 🏛️ Architecture & Engineering Excellence

This project is deliberately structured to demonstrate scalable, maintainable frontend architecture.

### Feature-Sliced Design (FSD)
The codebase is organized by **business domain**, not by file type. Each feature is a self-contained slice owning its own components, hooks, services, utils, constants, and styles:

```
src/
├── app/                  # Router, provider tree, top-level shell
├── components/           # Cross-cutting shared UI (ErrorBoundary, modals, avatar)
├── features/
│   ├── auth/             # Auth context, sign-in/register, FCM token registration
│   ├── household/        # Household context, join/leave/transaction flows
│   ├── inventory/        # Inventory, FoodCard, AddFoodModal, barcode scanner
│   ├── recipes/          # AI recipe generation, ingredient selector, services/
│   ├── shopping/         # Shopping list, checkout, pantry-swap logic
│   ├── impact/           # Analytics engine + chart sub-components
│   └── settings/         # Profile, household, notification & currency panels
├── hooks/                # App-wide hooks (useDataStore — central Firestore layer)
├── services/             # Firebase-facing services (barcode, FCM, data writes)
├── firebase/             # Firebase app initialisation
└── styles/               # Global tokens; feature styles are colocated per-component
```

### Headless UI — logic lives in hooks
Components are kept **"dumb" and presentational**. All state machines, side effects, API calls, and derived data live in **21+ custom hooks** (e.g. `useDataStore`, `useNotificationDrawer`, `useAddFoodForm`, `useImpactAnalytics`, `useShoppingActions`). This makes UI trivial to reason about and the logic independently testable.

### Component-colocated SCSS
Following a single, consistent convention, **every component's stylesheet sits next to it** (`Inventory.jsx` ↔ `Inventory.scss`) — 51 colocated style files across the features. Large stylesheets are split into domain partials and re-exported through a barrel, with shared design tokens as SCSS variables and CSS custom properties. **Zero inline styles** in JSX (except genuinely dynamic runtime values).

### Robust data layer
- **Single listener, scoped queries.** `useDataStore` attaches `onSnapshot` listeners scoped to the user's household *or* their own UID, resolving scope only after auth is ready to avoid refresh race conditions.
- **Read scope vs. write scope.** Writes always use the user's real membership, never the view-mode household — so items are never orphaned.
- **Transactional integrity.** Checkout, archiving, and household join/leave run inside `runTransaction` for atomicity; the join flow re-reads the household doc before committing.
- **Local-mode fallback.** If a Firestore query is rejected during an auth edge case, the app degrades to `localStorage` with a toast rather than crashing.

---

## 🔐 DevSecOps & CI/CD

Security and automation are treated as first-class engineering concerns.

### 🔑 Serverless API-key proxy
The Groq LLM key is **never shipped to the browser**. All AI calls hit a server-side proxy that injects the key from the environment:

- **`api/groq.js`** — a **Vercel Serverless Function**: POST-only, validates the request body, attaches the `GROQ_API_KEY` server-side, forwards to Groq, and returns the response. The key stays on the server.
- **Vite dev proxy** — locally, `vite.config.js` mirrors this with a `/api/groq` proxy so the dev experience matches production without exposing the key.

The key is intentionally declared **without** a `VITE_` prefix, guaranteeing Vite never bundles it into the client.

### 🕵️ Custom secret-scanning CI gate
**`scripts/ci/check_no_client_keys.js`** recursively scans `src/` and **fails the build** if any client-exposed secret name (e.g. `VITE_GROQ_API_KEY`, `VITE_OCR_SPACE_API_KEY`, `VITE_UNSPLASH_KEY`) appears in source — a guardrail against accidentally promoting a server secret to the client bundle.

### ⚙️ Automated quality pipeline
The **GitHub Actions** workflow (`.github/workflows/quality-checks.yml`) runs on every push and PR to `main` / `develop` (Node 20):

| Step | Tool | Gate |
|------|------|------|
| Lint | ESLint 9 (flat config, React Hooks rules) | ❌ Blocking |
| Unit tests | Vitest + Testing Library | Reported |
| Coverage | Vitest v8 coverage → **Codecov** | Reported |
| Build | Vite production build | ❌ Blocking |
| Secret scan | `check_no_client_keys.js` | ❌ Blocking |

> Run the full gate locally before pushing:
> ```bash
> npm run lint && npm run test:run && npm run ci:check-keys && npm run build
> ```

---

## ☁️ Backend & Cloud

### Firebase
| Service | Usage |
|---------|-------|
| **Authentication** | Email/password; every Firestore operation requires `request.auth != null` |
| **Firestore** | Real-time inventory/shopping/impact data with per-user & per-household row-level rules |
| **Cloud Messaging (FCM)** | Web push for expiry reminders |
| **Storage** | Asset storage |

**Row-level access control** is enforced in `firestore.rules`: each document is accessible only by its `ownerId` or a verified member of its `householdId` — verified inside the rule via a `get()` on the household document, never by trusting a client field.

### Scheduled Cloud Function — `checkExpiringItems`
A **Firebase v2 scheduled function** (`functions/index.js`) runs as a daily cron (`every day 09:00`, Europe/Bucharest):

1. Queries inventory for items expiring in **2 days**.
2. Groups them by household or individual owner and fans out to all member UIDs.
3. Respects each user's configured **silent hours** (timezone-aware).
4. Sends a multicast FCM push via `sendEachForMulticast`.
5. **Self-heals** by detecting unregistered/invalid device tokens in the response and removing them with `arrayRemove`.

---

## 🚀 Local Setup & Development

### Prerequisites
- **Node.js 20** and npm
- A **Firebase project** with Firestore, Authentication (Email/Password), Storage, and Cloud Messaging enabled

### 1. Clone & install
```bash
git clone https://github.com/your-username/ZeroWasteHome.git
cd ZeroWasteHome
npm install
```

### 2. Configure environment
Copy the template and fill in your values:
```bash
cp .env.example .env
```

| Variable | Required | Notes |
|----------|:--------:|-------|
| `VITE_FIREBASE_API_KEY` | ✅ | Firebase Web API key (public — safe to expose) |
| `VITE_FIREBASE_AUTH_DOMAIN` | ✅ | `project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | ✅ | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | ✅ | Firebase Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ✅ | FCM sender ID |
| `VITE_FIREBASE_APP_ID` | ✅ | Firebase App ID |
| `VITE_FIREBASE_VAPID_KEY` | ✅ | Web Push (FCM) VAPID key |
| `GROQ_API_KEY` | ✅ | **Server-side only** (no `VITE_` prefix) — used by the dev proxy & serverless function |
| `VITE_GROQ_MODEL` | ➖ | Defaults to `llama-3.3-70b-versatile` |
| `VITE_UNSPLASH_KEY` | ➖ | Food imagery |
| `VITE_RECIPE_BATCH_SIZE` | ➖ | Recipes per generation |

> 🔒 **On Firebase keys:** Web API keys are *not* secrets — they identify the project in the browser and are protected by Firestore Security Rules. Groq and Unsplash keys **are** secrets and must stay server-side.

### 3. Deploy Firestore rules
```bash
firebase deploy --only firestore:rules
```
The app relies on these rules for access control and will not behave correctly without them.

### 4. Run
```bash
npm run dev        # http://localhost:5173

npm run build      # production build
npm run preview    # preview the built output
```

### Useful scripts
```bash
npm run lint           # ESLint
npm run test           # Vitest (watch)
npm run test:run       # Vitest (single run, used in CI)
npm run test:coverage  # coverage report
npm run ci:check-keys  # secret scan
```

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | **React 19** |
| Build / Dev | **Vite 7**, `vite-plugin-pwa` |
| Styling | **SCSS** — component-colocated, design tokens, CSS custom properties |
| Routing | React Router 7 |
| Animation | Framer Motion 12 |
| Charts | Recharts 3 |
| Icons | Lucide React |
| Backend | **Firebase 12** — Auth, Firestore, Messaging, Storage |
| Cloud | Firebase Cloud Functions (v2 scheduler) |
| AI | **Groq** (Llama 3.3 70B) via serverless proxy |
| Barcode | ZXing Browser / Library |
| Testing | **Vitest 4** + Testing Library + jsdom |
| Linting | ESLint 9 (flat config) |
| CI/CD | GitHub Actions + Codecov |
| Hosting | Vercel (SPA + serverless functions) |

---

<div align="center">

*Built with React, Firebase, and a genuine interest in reducing household food waste.* 

</div>
