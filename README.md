# River Algorithm

**DePIN / ReFi on Solana for verifiable recycling impact.**

River Algorithm connects recyclers, collection-point operators and companies in one auditable flow:

**physical recycling → operator verification → Proof of Recycling → REC mint → company retirement → on-chain certificate**

> Functional hackathon MVP running end-to-end on Solana localnet.

## Problem

Recycling and environmental-credit systems often rely on fragmented centralized records. Physical actions are hard to audit, and environmental claims can be difficult to verify or retire transparently.

The protocol does not claim that blockchain verifies physical waste by itself. Authorized operators validate the real-world event; Solana provides traceability, non-duplication, token accounting and permanent retirement.

## How it works

1. A recycler registers recyclable material at a collection point.
2. An authorized operator validates material and weight.
3. The backend generates a deterministic SHA-256 Proof of Recycling.
4. The Anchor program records the proof and updates campaign impact state.
5. REC SPL tokens are minted to the recycler.
6. REC can be transferred to a company.
7. The company burns REC.
8. The program retires the corresponding impact and creates a certificate PDA.

## Working MVP

Implemented and demonstrated:

- JWT authentication with USER, OPERATOR, COMPANY and ADMIN roles
- Recycler, operator and company dashboards
- Collection points and campaigns
- Anchor smart contract and real localnet transactions
- Program-controlled REC SPL mint
- ImpactPool accounting
- Recycler-to-company REC transfer
- Burn-to-Certificate and certificate PDAs
- PostgreSQL + Prisma
- React + TypeScript frontend

Demo flow:

**2 kg PET → 20 REC minted → 20 REC transferred to Company Demo → 15 REC burned → 1.5 kg impact retired → 2 on-chain certificates**

## Solana architecture

Anchor program: `solana/programs/proof-of-recycling/`

Program ID: `9bQFX3gtGKwN6he7bkRWRFXQRLdBk1YE4YcHYEzcgoaG`

Main PDAs:

- Protocol: `["protocol"]`
- REC Mint: `["rec-mint"]`
- Collection Point: `["point", sha256(collectionPointId)]`
- Campaign: `["campaign", sha256(campaignId)]`
- ImpactPool: `["impact-pool", campaign]`
- Proof: `["proof", proofHash]`
- Rewards: `["rewards", recycler]`
- Certificate: `["certificate", campaign, certificateId]`

The proof-hash PDA prevents the same verified recycling event from being recorded twice.

## REC and Burn-to-Certificate

For the current PET demo campaign, the reward rate is **10 REC/kg**.

Companies permanently retire REC through the smart contract:

**REC burn → ImpactPool retirement → Certificate PDA**

Burning is irreversible, creating a transparent link between physical recycling, REC issuance, REC ownership and environmental retirement.

## Tech stack

**Blockchain:** Solana, Rust, Anchor, SPL Token, PDAs
**Backend:** Node.js, TypeScript, Express, Prisma, PostgreSQL, Zod, JOSE/JWT, bcrypt
**Frontend:** React, TypeScript, Vite
**Infrastructure:** Docker, Docker Compose, Solana local validator

## Run locally

Prerequisites: Node.js 22+, Docker, Solana CLI and Anchor 1.2.x.

Backend:

    cp .env.example .env
    docker compose up -d
    npm install
    npm run prisma:generate
    npm run db:deploy
    npm run dev

Frontend:

    cd frontend
    npm install
    npm run dev

Solana build:

    cd solana
    anchor build --arch v2

The backend reads the generated IDL from `solana/target/idl/proof_of_recycling.json`.

### Fresh localnet deployment

Deployment keypairs, generated Anchor artifacts and validator ledgers are intentionally not committed. A fresh clone therefore generates its own local program keypair.

To deploy a fresh local instance:

    cd solana
    anchor build --arch v2
    anchor keys sync
    anchor build --arch v2
    solana-test-validator

Then, in another terminal:

    cd solana
    anchor deploy --provider.cluster localnet
    anchor keys list

Set `SOLANA_PROGRAM_ID` in the root `.env` to the program ID reported by Anchor. Keep `BLOCKCHAIN_MODE=localnet` and `SOLANA_RPC_URL=http://127.0.0.1:8899`.

The Program ID shown elsewhere in this README is the preserved hackathon localnet deployment used for the recorded demo.

API: `http://localhost:3333/api/v1`
Frontend: `http://localhost:5173`

## Security

Private keys, seed phrases, demo wallet keypairs, `.env`, local validator ledger and generated deployment artifacts are excluded from Git.

The local demo uses server-assisted company signing only for the demo localnet wallet. Production should use client-side or secure embedded-wallet/account-abstraction signing.

## Business model and impact

Potential revenue includes Burn-to-Certificate fees, enterprise integrations, traceability/reporting services and REC marketplace fees. The initial model proposes an approximately **2.5% protocol fee** around certificate retirement.

The project aligns with **SDG 1, 8, 12 and 14**.

## Team

- **Gabriel El Souki** — Full-stack / Solana
- **Tom Pantoja** — Project contributor
- **Abel Henrique Ferreira** — Project contributor

## Status

**Functional end-to-end MVP completed on Solana localnet.**

Next milestones: devnet/mainnet deployment, client-side wallet signing, decentralized cooperative validation, stronger physical anti-fraud mechanisms and enterprise reporting integrations.

---

**River Algorithm — From physical recycling to verifiable environmental impact on Solana.**
