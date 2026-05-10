# 🛡️ SolShield — Solana Wallet & Token Security Scanner

**Paste any Solana wallet address, token contract, or suspicious link and get an instant risk report.**  
Voice reads the verdict out loud. If flagged, a safe bridge/swap route is shown via LI.FI.

![SolShield](https://img.shields.io/badge/Solana-Devnet-blueviolet) ![License](https://img.shields.io/badge/license-MIT-green) ![Status](https://img.shields.io/badge/status-hackathon--ready-brightgreen) ![Node](https://img.shields.io/badge/node-18%2B-blue) ![Anchor](https://img.shields.io/badge/Anchor-0.30.1-purple)

---

## 🧠 SolShield Intelligence Engine

SolShield leverages a sophisticated **Security Intelligence Engine** that synthesizes real-time data from multiple high-authority sources to provide instant, actionable risk assessments.

### Core Intelligence Components

Our engine operates as a multi-source aggregator, performing deep analysis across the following dimensions:

#### 1. Real-Time Data Aggregation (API Integration)

| Intelligence Source | Function |
|---|---|
| **Solana Global State** | Direct RPC access to account metadata, balance, and executable status. |
| **Solana FM** | Comprehensive entity labeling and community-driven threat identification. |
| **GoPlus Security** | Institutional-grade threat intelligence (Cybercrime, Phishing, Money Laundering). |
| **ElevenLabs AI** | Neural-powered voice synthesis for instant auditory risk verdicts. |
| **LI.FI Protocol** | Intelligent safe-path routing for risk mitigation. |

#### 2. Advanced Heuristic Analysis

The SolShield backend implements a proprietary heuristic engine that evaluates wallet behavior patterns:

- **Automated Behavioral Detection**: Identifies "Burst Activity" (high-frequency automated transactions) typical of drainer contracts.
- **Probabilistic Risk Scoring**: Analyzes transaction error rates and account age to detect "burner" wallets.
- **Token Distribution Modeling**: Evaluates token account density to flag potential airdrop scam operations.

#### 3. Decentralized On-Chain Registry

SolShield utilizes a custom Anchor-based program on the Solana Devnet to maintain a community-driven, immutable ledger of flagged malicious actors, ensuring security intelligence is shared across the ecosystem.

#### 4. Weighted Scoring Algorithm

Signals are processed through a weighted intelligence matrix to produce a final Risk Score (0-100):

```
Risk Score = Σ (DataSignal_i × Weight_i)

Classification:
  ≥ 70  → CRITICAL RISK (Immediate action required)
  ≥ 45  → HIGH RISK (Extreme caution advised)
  ≥ 25  → MEDIUM RISK (Verification recommended)
  <  25 → SAFE / LOW RISK
```

---

## 🚀 Features

| Feature | Status | Description |
|---------|--------|-------------|
| 🔍 Instant Risk Analysis | ✅ Implemented | Paste any Solana address and get a weighted risk score with detailed breakdown |
| 📊 Multi-Source Checks | ✅ Implemented | Queries Solana FM, GoPlus Security, community blacklists, and on-chain data |
| 🌐 Phishing URL Shield | ✅ Implemented | Deep analysis of URLs/domains for brand impersonation and scam patterns |
| 🔊 Voice Verdict | ✅ Implemented | Premium ElevenLabs AI proxied via backend (with browser TTS fallback) |
| 🛡️ Safe Route | ✅ Implemented | LI.FI widget shows safe bridge/swap alternatives for flagged addresses |
| ⛓️ On-Chain Registry | ✅ Implemented | Anchor program stores flagged addresses on Solana devnet via PDAs |
| 📱 Responsive UI | ✅ Implemented | Premium dark-mode glassmorphism design that works on all devices |
| 🚩 Report Address | ✅ Implemented | Users can report suspicious addresses through the UI |
| 👛 Wallet Connect | ✅ Implemented | Phantom wallet integration for on-chain identity and reporting |

---

## 🏁 Quick Start

### Installation

```bash
# Clone the repo
git clone https://github.com/foziamohammed/solshield.git
cd solshield

# Install all dependencies
npm run install:all
```

### Running Locally

```bash
# Start development environment
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001 |

| Input | Verdict |
|---------|--------|
| `vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg` | 🟢 Safe — known validator wallet |
| `https://uniswap-airdrop-claim.net` | 🔴 Critical — Phishing URL detected |
| `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | 🟢 Safe — USDC token mint |

---

## 🚧 Remaining Features & Roadmap

### 🔴 Not Yet Implemented (Critical)

| Feature | Description | Current State |
|---------|-------------|---------------|
| **Anchor Program Deployment** | The smart contract has NOT been deployed to devnet. `PROGRAM_ID` is a placeholder. | Backend uses in-memory `Map` as fallback |
| **Real On-Chain Flag Submission** | `POST /api/report` currently records to local store; needs frontend wallet signing for real on-chain persistence. | Logic prepared for wallet integration |

### 🟡 Partially Implemented

| Feature | Description | Current State |
|---------|-------------|---------------|
| **Community Blacklist** | Expanded demo dataset. | Pulls from `blacklist.js` and external APIs |
| **Token Contract Analysis** | Honeypot detection and liquidity locks. | Basic GoPlus checks implemented |

### 🟢 Planned / Nice-to-Have

| Feature | Description |
|---------|-------------|
| **Scan History** | Persist past scans in localStorage or a database |
| **Real-Time Alerts** | WebSocket-based alerts for newly flagged addresses |
| **Mainnet Support** | Switch from devnet to mainnet-beta |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Open a Pull Request

---

## 📄 License

MIT License — Built for the Solana Hackathon
