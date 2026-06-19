# ZeroWaste — Smart Food Waste Tracker

A production-ready React + Firebase web application that helps households track food inventory, reduce waste, and understand the environmental and financial impact of their food habits.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Data Model](#data-model)
- [Security](#security)
- [CI / Quality Checks](#ci--quality-checks)
- [Deployment](#deployment)

---

## Overview

ZeroWaste tracks what you buy, what you eat, and what you throw away — and turns that data into actionable insights. It supports multi-member households with shared inventory, smart barcode scanning, AI-powered recipe suggestions, and an impact analytics hub that quantifies savings in money, kilograms, and CO₂.

The application is designed as a lab-in-production project: it runs on real Firebase infrastructure with Firestore security rules, real-time listeners, and scoped write operations. All features are tested against a live backend; there is no mock data layer in production.

---

## Features

| Area | Capability |
|---|---|
| **Inventory** | Add items manually or by barcode scan; set expiry dates and quantities; sort by urgency; filter by category |
| **Household** | Create or join a shared household via a shareable join code; real-time inventory sync across all members |
| **Shopping** | Build a shopping list, tick off items, transfer purchased items directly into inventory in one transaction |
| **Recipes** | AI-assisted recipe generation from pantry contents via Groq LLM; ingredient cards with cost estimates |
| **Impact Hub** | Animated analytics dashboard — lifetime savings counter, CO₂ prevented, health score radial, trend area chart, loss categories, and full event timeline |
| **Barcode scanner** | ZXing-based scanner with category/quantity/unit fields |
| **Notifications** | Expiry alerts drawer; items grouped by urgency (24 h, 72 h, 7 days) |
| **Settings** | Profile management, currency selector, notification preferences, household management (create / join / leave) |
| **Auth** | Firebase Auth (email/password); join-code based household linking with Firestore transaction integrity |

---

## Architecture

```
src/
├── app/                    # Router, providers, top-level shell
├── components/common/      # Shared UI: Layout, Modal shells, ErrorBoundary, auth guard
├── context/                # Settings and Theme context providers
├── features/
│   ├── auth/               # AuthContext, sign-in/register forms, household flows
│   ├── impact/             # Impact Hub page, analytics engine, chart sub-components
│   ├── inventory/          # Inventory page, FoodCard, AddFoodModal, barcode scanner
│   ├── recipes/            # Recipe page, ingredient selector, Groq API integration
│   ├── settings/           # Settings page, household panel, profile panel
│   └── shopping/           # Shopping page, checkout flow, pantry swap logic
├── hooks/
│   ├── useDataStore.jsx    # Central Firestore listener — inventory, shopping, impact
│   └── useCurrency.jsx     # Locale-aware currency formatter
├── shared/
│   ├── firebase.js         # Firebase app initialisation (reads VITE_ env vars)
│   └── utils/              # CO₂ calculator, toast helper, shared utilities
└── styles/                 # Per-feature SCSS modules and global design tokens
```

### Key architectural decisions

**Single listener, scoped queries.** `useDataStore` attaches three `onSnapshot` listeners (inventory, shopping, impact) scoped to either the user's household or their own UID. The scope resolves only after `AuthContext` confirms `isHouseholdReady`, preventing a race condition where items would temporarily disappear on refresh before the household snapshot loads.

**Write scope vs read scope.** All writes use `currentUser.householdId` (the user's actual membership), never the view-mode `activeHouseholdId`. This ensures items added under a household are never orphaned with `householdId: null`.

**Firestore transactions.** Checkout (shopping → inventory), archiving (inventory → impact), and household join/leave all use `runTransaction` for atomicity. The join flow re-reads the household document inside the transaction and verifies it still exists before committing.

**Local mode fallback.** If Firestore rules reject a query during an auth edge case, the app falls back to `localStorage` and surfaces a toast notification rather than showing an empty state or crashing silently.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 19 |
| Build tool | Vite 7 |
| Styling | SCSS (Sass) — feature-scoped modules, CSS custom properties |
| Routing | React Router v7 |
| Animation | Framer Motion 12 |
| Charts | Recharts 3 |
| Icons | Lucide React |
| Backend / Auth | Firebase 12 (Auth + Firestore + Storage) |
| Barcode scanning | ZXing Browser / ZXing Library |
| AI inference | Groq API (Llama 3.3 70B) |
| Recipe data | Spoonacular API |
| Food imagery | Unsplash API |
| Testing | Vitest + Testing Library |
| Linting | ESLint 9 (flat config) |
| CI | GitHub Actions |
| Hosting | Vercel (SPA rewrite rule via `vercel.json`) |

---

## Getting Started

### Prerequisites

- Node.js 18 or 20
- npm 9+
- A Firebase project with Firestore, Auth (Email/Password), and Storage enabled

### Installation

```bash
git clone https://github.com/your-username/my-waste-app.git
cd my-waste-app
npm install
```

### Configuration

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your Firebase project values and third-party API keys. See [Environment Variables](#environment-variables) for the full reference.

### Deploy Firestore security rules

```bash
firebase deploy --only firestore:rules
```

The included `firestore.rules` enforces per-user and per-household access control. The app will not function correctly without these rules deployed.

### Development server

```bash
npm run dev
# http://localhost:5173
```

### Production build

```bash
npm run build
npm run preview    # local preview of the built output
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in all required values. **Never commit `.env` to version control** — it is listed in `.gitignore`.

| Variable | Required | Description |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | Yes | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase Auth domain (`project.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Firebase Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase App ID |
| `VITE_SPOONACULAR_API_KEY` | Yes | Spoonacular API key for food and recipe data |
| `GROQ_API_KEY` | Yes | Groq API key for LLM recipe generation. **Server-side only** — no `VITE_` prefix, so it is never bundled into the client. Used by the Vite dev proxy and the Vercel serverless function (`api/groq.js`). |
| `VITE_GROQ_MODEL` | No | Groq model ID (default: `llama-3.3-70b-versatile`) |
| `VITE_UNSPLASH_KEY` | No | Unsplash access key for food imagery |
| `VITE_RECIPE_BATCH_SIZE` | No | Recipes returned per AI generation (default: `6`) |

> **Firebase Web API keys are not secret.** They identify the Firebase project in the browser and are safe to expose. Access control is enforced entirely by Firestore Security Rules. Groq, Spoonacular, and Unsplash keys should be treated as secrets and rate-limited at the provider level.

---

## Project Structure

```
my-waste-app/
├── .env.example                        # Environment variable template
├── .github/
│   └── workflows/
│       └── quality-checks.yml          # CI pipeline
├── firestore.rules                     # Firestore security rules
├── firebase.json                       # Firebase project config
├── vercel.json                         # Vercel SPA rewrite rule
├── vite.config.js
├── vitest.config.js
├── eslint.config.js
└── src/
    ├── app/
    │   ├── providers/AppProviders.jsx  # Context + auth providers tree
    │   └── router/routes.jsx           # Route definitions
    ├── components/common/
    │   ├── Layout/                     # Sidebar, Dock, MainLayout, MobileMenu
    │   ├── UI/                         # Modal shells, UserAvatar
    │   ├── ErrorBoundary.jsx
    │   └── RequireAuth.jsx
    ├── context/
    │   └── SettingsContext.jsx         # Currency, notifications
    ├── features/
    │   ├── auth/
    │   │   ├── AuthContext.jsx         # currentUser, household, join/leave flows
    │   │   └── components/            # SignInForm, RegisterForm
    │   ├── impact/
    │   │   ├── Impact.jsx             # Analytics engine + page layout
    │   │   └── components/            # Hero, Stats, Charts, Insights, Timeline
    │   ├── inventory/
    │   │   ├── components/            # FoodCard, AddFoodModal, Scanner, Skeleton
    │   │   └── hooks/                 # useFilteredInventory
    │   ├── recipes/
    │   │   └── components/            # IngredientSelector, RecipeList, RecipeModal
    │   ├── settings/
    │   │   └── components/            # HouseholdPanel, ProfilePanel, CurrencySelector
    │   └── shopping/
    │       └── components/            # ShoppingList, ShoppingSummary, TransferModal
    ├── hooks/
    │   ├── useDataStore.jsx            # Firestore real-time listeners
    │   └── useCurrency.jsx
    └── shared/
        ├── firebase.js
        └── utils/                     # co2.js, toast.js
```

---

## Data Model

All collections live directly under the Firestore root. Documents that belong to a household include both `ownerId` (the creating user) and `householdId`.

### `users/{uid}`
User profile — `displayName`, `email`, `householdId`, `currency`, `notificationsEnabled`.

### `users/{uid}/stats/summary`
Lifetime aggregate, updated on every food action — `lifetimeSavings`, `totalFoodSavedKg`.

### `households/{householdId}`
Household document — `ownerId`, `memberIds[]`, `joinCode`, `name`, `createdAt`.

### `householdJoinCodes/{joinCode}`
Join-code lookup index — `householdId`. Deleted atomically when the household is deleted or the owner leaves.

### `inventory/{itemId}`
Food item — `name`, `category`, `quantity`, `unit`, `price`, `expiryDate`, `ownerId`, `householdId`, `addedAt`.

### `shopping/{itemId}`
Shopping list entry — `name`, `checked`, `quantity`, `unit`, `estimatedPrice`, `ownerId`, `householdId`.

### `impact/{entryId}`
Archived food action — `name`, `status` (eaten / saved / wasted / expired), `price`, `actionDate`, `weightKg`, `ownerId`, `householdId`.

### `priceHistory/{entryId}`
Per-item price log — `name`, `price`, `purchaseDate`, `ownerId`, `householdId`.

---

## Security

**Authentication.** Firebase Auth with email/password. Every Firestore read and write requires `request.auth != null`.

**Row-level access control.** Each document is readable and writable only by its `ownerId` or by a verified member of its `householdId`. Membership is verified inside the Firestore rule via a `get()` call on the household document — not by trusting a client-supplied field.

**No secrets in source.** API keys are injected at build time via Vite's `import.meta.env`. The CI pipeline runs `scripts/ci/check_no_client_keys.js` on every push to block any accidental commit of raw key values.

**Service account key.** The app and its maintenance scripts under `scripts/` use only the public Firebase Web SDK, authenticating with a real user account (see `MIGRATION_EMAIL`/`MIGRATION_PASSWORD` and `MEMBER_EMAIL`/`MEMBER_PASSWORD`). No Firebase Admin SDK service-account key is required anywhere. As a safeguard, `serviceAccountKey.json` and `*-serviceaccount*.json` are listed in `.gitignore` so such a file can never be committed; if you ever introduce one for an external tool, keep it outside the repository.

**Join code integrity.** Household join is executed inside a `runTransaction` that re-reads the household document and verifies it still exists before writing the membership update. Stale join-code lookup documents are detected and rejected.

---

## CI / Quality Checks

The GitHub Actions workflow (`.github/workflows/quality-checks.yml`) runs on every push to `main` and `develop`, across Node 18 and Node 20:

1. `npm run lint` — ESLint with React Hooks and React Refresh rules
2. `npm run test:run` — Vitest unit tests (no watch mode)
3. `npm run test:coverage` — coverage report, uploaded to Codecov
4. `npm run build` — full Vite production build
5. `npm run ci:check-keys` — rejects any raw API key values in source files

Run the same checks locally before pushing:

```bash
npm run lint
npm run test:run
npm run ci:check-keys
npm run build
```

---

## Deployment

The app is configured for **Vercel**. `vercel.json` rewrites all routes to `index.html` for client-side routing.

1. Import the repository in Vercel
2. Add all `VITE_*` environment variables in the Vercel project settings
3. Vercel auto-deploys on every push to `main`

For **Firebase Hosting**, add a `hosting` block to `firebase.json` and run:

```bash
firebase deploy --only hosting
```

---

*Built with React, Firebase, and a genuine interest in reducing household food waste.*
