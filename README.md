# 🛡️ SolShield — Solana Wallet & Token Security Scanner

**Paste any Solana wallet address, token contract, or suspicious link and get an instant risk report.**  
Voice reads the verdict out loud. If flagged, a safe bridge/swap route is shown via LI.FI.

![SolShield](https://img.shields.io/badge/Solana-Devnet-blueviolet) ![License](https://img.shields.io/badge/license-MIT-green) ![Status](https://img.shields.io/badge/status-hackathon--ready-brightgreen) ![Node](https://img.shields.io/badge/node-18%2B-blue) ![Anchor](https://img.shields.io/badge/Anchor-0.30.1-purple)

---

## 📑 Table of Contents

- [Features](#-features)
- [Architecture](#️-architecture)
- [AI & Intelligence — How Risk Analysis Works](#-ai--intelligence--how-risk-analysis-works)
- [Risk Score Breakdown](#-risk-score-breakdown)
- [Tech Stack](#️-tech-stack)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [Solana Program (Anchor)](#️-solana-program-anchor)
- [Voice Integration (ElevenLabs / Browser TTS)](#-voice-integration-elevenlabs--browser-tts)
- [LI.FI Safe Route](#-lifi-safe-route)
- [Project Structure](#-project-structure)
- [API Reference](#-api-reference)
- [Demo Flow & Test Addresses](#-demo-flow--test-addresses)
- [Remaining Features & Roadmap](#-remaining-features--roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🚀 Features

| Feature | Status | Description |
|---------|--------|-------------|
| 🔍 Instant Risk Analysis | ✅ Implemented | Paste any Solana address and get a weighted risk score with detailed breakdown |
| 📊 Multi-Source Checks | ✅ Implemented | Queries Solana FM, GoPlus Security, community blacklists, and on-chain data |
| 🔊 Voice Verdict | ✅ Implemented | Browser TTS reads the verdict aloud (ElevenLabs upgrade available) |
| 🛡️ Safe Route | ✅ Implemented | LI.FI widget shows safe bridge/swap alternatives for flagged addresses |
| ⛓️ On-Chain Registry | ✅ Implemented | Anchor program stores flagged addresses on Solana devnet via PDAs |
| 📱 Responsive UI | ✅ Implemented | Premium dark-mode glassmorphism design that works on all devices |
| 🚩 Report Address | ✅ Implemented | Users can report suspicious addresses through the UI |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Frontend (Vite + Vanilla JS)              │
│                                                               │
│  Address Input → API Call → Risk Display → Voice → LI.FI     │
│  • Animated SVG score ring with eased number counter          │
│  • Dynamic factor cards grid (color-coded by risk level)      │
│  • Browser TTS / ElevenLabs voice verdict                     │
│  • LI.FI iframe widget for safe swap/bridge routes            │
└──────────────────────┬───────────────────────────────────────┘
                       │ REST API  (Vite proxy → localhost:3001)
┌──────────────────────▼───────────────────────────────────────┐
│                   Backend (Express.js)                         │
│                                                               │
│  POST /api/analyze ─┬─ getOnChainData()     (Solana RPC)     │
│                     ├─ checkBlacklists()     (External APIs)  │
│                     └─ getFlaggedAddresses() (Program PDAs)   │
│                                                               │
│  analyzeAddress() → weighted scoring → verdict generation     │
└──────────────────────┬───────────────────────────────────────┘
                       │ RPC / PDA Lookup
┌──────────────────────▼───────────────────────────────────────┐
│               Solana Devnet Program (Anchor / Rust)           │
│                                                               │
│  flag_address()        → Create PDA with flag data            │
│  unflag_address()      → Deactivate flag (reporter only)      │
│  initialize_registry() → One-time registry setup              │
└──────────────────────────────────────────────────────────────┘
```

---

## 🧠 AI & Intelligence — How Risk Analysis Works

### ⚠️ No AI/ML Model Was Trained

SolShield does **NOT** use a trained machine learning model. There is no neural network, no dataset, and no model inference involved.

### What We Actually Use: Rule-Based Heuristic Engine + External API Endpoints

The risk scoring engine is a **deterministic, rule-based heuristic system** that aggregates signals from **multiple external API endpoints** and applies **weighted scoring** to produce a final risk assessment.

Here is exactly how each data source works:

#### 1. External API Endpoints (Live Queries)

| API / Data Source | Endpoint | What It Does | Auth Required? |
|---|---|---|---|
| **Solana RPC** | `https://api.devnet.solana.com` | Fetches account info, transaction signatures, token accounts, and on-chain state | No |
| **Solana FM** | `https://api.solana.fm/v0/accounts/{address}` | Checks for community-assigned labels (e.g., "scam", "exploit", "phishing") | No |
| **GoPlus Security** | `https://api.gopluslabs.io/api/v1/solana/address_security/{address}` | Checks for cybercrime, money laundering, phishing, darkweb activity, fake tokens | No |
| **ElevenLabs** | `https://api.elevenlabs.io/v1/text-to-speech/{voice_id}` | Converts verdict text to premium AI voice audio (optional upgrade) | Yes (API Key) |
| **LI.FI** | `https://transferto.xyz/swap` | Provides safe bridge/swap routes as an alternative when address is flagged | No |

#### 2. Local Community Blacklist (Hardcoded)

A `Set` of known scam addresses is maintained in-memory inside `backend/services/blacklist.js`. This is a **static list** seeded with documented community-reported scam wallets for demonstration purposes. In production, this would be replaced by a live database or API.

#### 3. On-Chain Program Lookup (Solana Anchor)

The backend derives a PDA (Program Derived Address) using `[b"flagged", address_pubkey]` seeds and checks if a `FlagAccount` exists on-chain. If configured with a valid `PROGRAM_ID`, this is a live on-chain lookup. For demo purposes, an in-memory `Map` is also used as a fallback.

#### 4. Heuristic Transaction Pattern Analysis

The backend's `solana.js` service fetches the last 100 transaction signatures and runs pattern detection:

- **Burst Activity** — Checks if 10+ transactions occurred within a 1-minute window (indicates automated drainer behavior)
- **High Error Rate** — If > 50% of transactions failed with errors (indicates malicious probing)
- **Account Age** — Calculated from the oldest transaction timestamp (new accounts < 7 days are high risk)
- **Token Account Count** — Abnormally high counts (> 50) may indicate airdrop scammers

#### 5. Weighted Scoring Algorithm

All signals are combined into a final score (capped at 100) using a deterministic weighted formula:

```
Risk Score = Σ (signal_weight × signal_present)

Thresholds:
  ≥ 70  → Critical
  ≥ 45  → High
  ≥ 25  → Medium
  ≥ 10  → Low
  <  10 → Safe
```

This is **pure algorithmic logic** — no AI, no ML model, no training.

#### 6. Voice Verdict (Text-to-Speech)

The verdict is generated as a human-readable string by the `generateVerdict()` function in `analyzer.js`. Two TTS options are available:

- **Browser SpeechSynthesis API** (default, free, no setup required) — uses the Web Speech API built into all modern browsers
- **ElevenLabs API** (optional upgrade) — calls the ElevenLabs REST API to convert text to premium AI-generated speech audio. This is an **API endpoint call**, not a trained model — you send text and receive audio bytes back.

---

## 📋 Risk Score Breakdown

| Factor | Max Weight | Trigger Condition |
|--------|-----------|-------------------|
| Blacklist Match (Critical) | +40 | Found in known scam databases with critical label |
| Blacklist Match (Standard) | +25 | Found in known scam databases |
| On-Chain Community Flags | +30 | Flagged by SolShield program on-chain |
| Account Age (< 7 days) | +15 | Very new wallet, commonly used in scams |
| Account Age (< 30 days) | +8 | Relatively new wallet |
| Account Age Unknown | +10 | No transaction history to determine age |
| Zero Transactions | +10 | Empty or dormant wallet |
| Very Low Activity (< 5 txs) | +5 | Barely used wallet |
| Burst Activity | +12 | 10+ transactions within 1 minute |
| High Error Rate (> 50%) | +8 | Many failed transactions — malicious probing |
| Abnormal Token Count (> 50) | +5 | Possible airdrop scammer |
| Invalid Address Format | +5 | Not a valid Solana public key |

**Score is capped at 100.**

---

## 🛠️ Tech Stack

### Frontend
- **Vanilla JavaScript** (ES Modules) — no framework, pure DOM manipulation
- **Vite 6** — dev server with HMR and API proxy to backend
- **CSS** — custom design system with CSS variables, glassmorphism, and micro-animations
- **Google Fonts** — Inter (UI) + JetBrains Mono (addresses/code)
- **Web Speech API** — browser-native text-to-speech
- **LI.FI Widget** — iframe embed for safe swap/bridge routes

### Backend
- **Node.js 18+** with ES Modules
- **Express 4** — REST API server
- **@solana/web3.js 1.98** — Solana RPC queries and PDA derivation
- **node-fetch 3** — HTTP client for external API calls
- **dotenv** — environment variable management
- **cors** — cross-origin resource sharing

### Blockchain
- **Solana** (Devnet) — target chain
- **Anchor 0.30.1** — Solana program framework
- **Rust** — smart contract language
- **PDAs** (Program Derived Addresses) — deterministic on-chain storage for flags

### External APIs
- **Solana FM API** — address label lookups
- **GoPlus Security API** — threat intelligence
- **ElevenLabs API** — premium text-to-speech (optional)
- **LI.FI / Transferto** — safe bridge/swap routing

### Dev Tooling
- **concurrently** — run backend + frontend in parallel
- **Node --watch** — built-in file watcher for backend hot reload

---

## 🏁 Quick Start

### Prerequisites

- **Node.js 18+** and **npm**
- (Optional) Solana CLI + Anchor CLI for smart contract deployment

### Installation

```bash
# Clone the repo
git clone https://github.com/foziamohammed/solshield.git
cd solshield

# Install all dependencies (root + backend + frontend)
npm run install:all

# Or manually:
cd backend && npm install && cd ../frontend && npm install && cd ..
```

### Running Locally

```bash
# Option 1: Run both services together (recommended)
npm run dev

# Option 2: Run separately
# Terminal 1 — Backend API
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001 |
| Health Check | http://localhost:3001/api/health |

> **Note:** The Vite dev server proxies `/api/*` requests to `localhost:3001`, so the frontend makes API calls to the same origin.

---

## 🔧 Environment Variables

Copy `backend/.env.example` to `backend/.env`:

```bash
cp backend/.env.example backend/.env
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SOLANA_RPC_URL` | No | `https://api.devnet.solana.com` | Solana RPC endpoint |
| `PORT` | No | `3001` | Backend API port |
| `ELEVENLABS_API_KEY` | No | empty | ElevenLabs API key for premium voice (browser TTS used if empty) |
| `PROGRAM_ID` | No | empty | Deployed Anchor program ID (in-memory fallback used if empty) |

---

## ⛓️ Solana Program (Anchor)

### Program Instructions

| Instruction | Description | Access Control |
|---|---|---|
| `flag_address` | Flag a wallet with reason (≤ 256 chars) and risk level (0–100). Creates a PDA account. | Any signer (pays rent) |
| `unflag_address` | Deactivate a flag. Sets `is_active = false`. | Original reporter only |
| `initialize_registry` | One-time registry setup, stores authority and total flag count. | Any signer (pays rent) |

### Account Layout — `FlagAccount` PDA

Seeds: `[b"flagged", flagged_address_pubkey]`

| Field | Type | Description |
|-------|------|-------------|
| `flagged_address` | `Pubkey` | The wallet being flagged |
| `reporter` | `Pubkey` | Who submitted the report |
| `reason` | `String (max 256)` | Human-readable reason |
| `risk_level` | `u8` | Risk severity (0–100) |
| `timestamp` | `i64` | Unix timestamp of flag creation |
| `is_active` | `bool` | Whether the flag is currently active |
| `bump` | `u8` | PDA bump seed |

### Account Layout — `Registry` PDA

Seeds: `[b"registry"]`

| Field | Type | Description |
|-------|------|-------------|
| `authority` | `Pubkey` | Registry admin |
| `total_flags` | `u64` | Total number of flags ever created |
| `bump` | `u8` | PDA bump seed |

### Events Emitted

- `AddressFlagged { flagged_address, reporter, risk_level, timestamp }`
- `AddressUnflagged { flagged_address, reporter, timestamp }`

### Deployment

```bash
# Prerequisites: Solana CLI + Anchor CLI
# https://www.anchor-lang.com/docs/installation

cd anchor

# Build the program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Copy the printed Program ID and update:
#   1. anchor/Anchor.toml         → [programs.devnet]
#   2. anchor/programs/solshield/src/lib.rs  → declare_id!()
#   3. backend/.env               → PROGRAM_ID=
```

> ⚠️ The smart contract has **not been deployed yet**. The `PROGRAM_ID` is currently a placeholder. The backend falls back to an in-memory store for the demo.

---

## 🔊 Voice Integration (ElevenLabs / Browser TTS)

### Default: Browser SpeechSynthesis (No Setup)

Works out of the box. Uses the Web Speech API built into Chrome, Firefox, Safari, and Edge. Attempts to select a Google English voice if available, otherwise falls back to any English voice.

### Upgrade: ElevenLabs Premium Voice

1. Get an API key from [elevenlabs.io](https://elevenlabs.io)
2. Set `ELEVENLABS_API_KEY` in `backend/.env`
3. In `frontend/scripts/app.js`, modify the `handleVoice()` function to call `speakWithElevenLabs(currentReport.verdict, apiKey)` instead of `speakWithBrowserTTS()`

The ElevenLabs function uses the **Rachel** voice (`21m00Tcm4TlvDq8ikWAM`) with the `eleven_monolingual_v1` model.

---

## 🔀 LI.FI Safe Route

When an address is flagged as **high** or **critical** risk, the LI.FI widget appears showing safe bridge/swap alternatives. This prevents users from sending funds to scam addresses by redirecting them to verified routes.

The widget is loaded as an iframe from `https://transferto.xyz/swap?fromChain=sol&toChain=sol`.

---

## 📁 Project Structure

```
solshield/
├── package.json                    # Root workspace config (npm workspaces)
├── .gitignore
├── README.md
│
├── anchor/                         # Solana Anchor smart contract
│   ├── Anchor.toml                 # Anchor configuration (cluster, wallet, program ID)
│   └── programs/solshield/
│       ├── Cargo.toml              # Rust dependencies (anchor-lang 0.30.1)
│       └── src/lib.rs              # Program logic: flag, unflag, registry
│
├── backend/                        # Express.js API server
│   ├── package.json                # Backend dependencies
│   ├── server.js                   # Express app: routes, middleware, startup
│   ├── .env                        # Environment variables (gitignored)
│   ├── .env.example                # Template for env vars
│   └── services/
│       ├── analyzer.js             # Risk scoring engine (weighted heuristics)
│       ├── blacklist.js            # Scam DB checks (Solana FM, GoPlus, local list)
│       ├── program.js              # On-chain program interface (PDA lookups)
│       └── solana.js               # Solana RPC queries (account, txs, patterns)
│
└── frontend/                       # Vite frontend
    ├── package.json                # Frontend dev dependencies
    ├── vite.config.js              # Vite config with API proxy
    ├── index.html                  # Main HTML (SEO meta tags, semantic structure)
    ├── scripts/
    │   └── app.js                  # Application logic (scan, render, voice, report)
    └── styles/
        └── main.css                # Full design system (CSS vars, glassmorphism, responsive)
```

---

## 📡 API Reference

### `GET /api/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "solshield-api",
  "timestamp": "2026-05-10T04:00:00.000Z"
}
```

### `POST /api/analyze`

Main risk analysis endpoint. Runs all checks in parallel and returns a comprehensive risk report.

**Request Body:**
```json
{
  "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
}
```

**Response:**
```json
{
  "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "riskScore": 5,
  "riskLevel": "safe",
  "verdict": "Good news! This wallet EPjFW...Dt1v appears safe...",
  "factors": [
    {
      "category": "Blacklist",
      "label": "Known Scam Database",
      "risk": "safe",
      "score": 0,
      "detail": "Not found in any known scam databases",
      "icon": "✅"
    }
  ],
  "onChainData": {
    "balance": 0.0,
    "accountAge": 365,
    "transactionCount": 50,
    "tokenAccountCount": 3,
    "isProgram": false
  },
  "blacklistSources": [...],
  "timestamp": "2026-05-10T04:00:00.000Z",
  "showSafeRoute": false
}
```

### `POST /api/report`

Report a suspicious address (adds to flagged list).

**Request Body:**
```json
{
  "address": "SuspiciousAddress...",
  "reason": "Attempted wallet drain"
}
```

### `GET /api/flagged`

Returns all flagged addresses from the on-chain registry (or in-memory store).

---

## 🎥 Demo Flow & Test Addresses

### Demo Flow

1. User pastes a suspicious wallet address or token contract
2. Backend runs all checks in parallel (Solana RPC, Solana FM, GoPlus, blacklist, program)
3. Returns risk score with factor breakdown cards
4. Voice reads the verdict aloud via browser TTS
5. If risky (high/critical), the LI.FI widget appears with safe swap alternatives

### Test Addresses

| Address | Expected Result |
|---------|----------------|
| `ScamAd1111111111111111111111111111111111111` | 🔴 Critical — in blacklist + on-chain flagged |
| `vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg` | 🟢 Safe — known validator wallet |
| `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | 🟢 Safe — USDC token mint |

---

## 🚧 Remaining Features & Roadmap

### 🔴 Not Yet Implemented (Critical)

| Feature | Description | Current State |
|---------|-------------|---------------|
| **Anchor Program Deployment** | The smart contract has NOT been deployed to devnet. `PROGRAM_ID` is a placeholder. | Backend uses in-memory `Map` as fallback |
| **Real On-Chain Flag Submission** | `POST /api/report` only writes to in-memory store, does NOT submit an Anchor transaction. | The `addFlaggedAddress()` function skips the Solana transaction |
| **ElevenLabs Backend Proxy** | ElevenLabs API key should be proxied through backend, not exposed to frontend. | API key sits in `.env` but is never used by the backend — the frontend function expects it client-side |
| **Wallet Connect Integration** | Users should connect Phantom/Solflare wallet to sign flag/unflag transactions on-chain. | No wallet adapter integrated |

### 🟡 Partially Implemented

| Feature | Description | Current State |
|---------|-------------|---------------|
| **Community Blacklist** | Only 3 hardcoded demo addresses in `KNOWN_SCAM_ADDRESSES` Set. | Should pull from a live database or API |
| **Scam Token Mints** | `KNOWN_SCAM_TOKENS` Set is declared but **empty**. | No token mint checks implemented |
| **Suspicious Pattern Detection** | Only 1 regex pattern defined for vanity addresses. | Needs more patterns (e.g., drain signatures, flash loan patterns) |
| **Registry `total_flags` Counter** | `Registry` account has a `total_flags` field but `flag_address()` does NOT increment it. | Counter never updates |

### 🟢 Planned / Nice-to-Have

| Feature | Description |
|---------|-------------|
| **Scan History** | Persist past scans in localStorage or a database so users can review previous results |
| **Batch Scanning** | Allow scanning multiple addresses at once |
| **Token Contract Analysis** | Deep analysis of token contracts (honeypot detection, liquidity locks, ownership renouncement) |
| **Real-Time Alerts** | WebSocket-based alerts when a previously-scanned address gets newly flagged |
| **User Accounts / Auth** | Login system so users can track their reports and build reputation |
| **Mainnet Support** | Switch from devnet to mainnet-beta with a production RPC endpoint |
| **Rate Limiting** | Add express-rate-limit to prevent API abuse |
| **Caching Layer** | Redis or in-memory cache for repeated address lookups to reduce RPC/API calls |
| **Testing** | Unit tests for analyzer, blacklist, solana services. Integration tests for API routes. Anchor program tests. |
| **CI/CD Pipeline** | GitHub Actions for automated testing, linting, and deployment |
| **Docker Support** | Dockerize frontend + backend for easy deployment |
| **Dashboard** | Admin dashboard showing total scans, flagged addresses, community reports |
| **Mobile App / PWA** | Progressive Web App support or native mobile companion |
| **Additional Data Sources** | Integration with Chainabuse, Solscan labels, Helius DAS API |
| **Export Reports** | PDF/JSON export of risk analysis results |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — Built for the Solana Hackathon
