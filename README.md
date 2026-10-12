# RecyChain Backend

Backend API for the RecyChain hackathon MVP: physical recycling → operator verification → Proof of Recycling → blockchain record → reward points.

## Current scope

Implemented:

- User creation and lookup
- Collection-point creation and nearby search
- Recycling-event creation
- Authorized operator verification/rejection
- Deterministic SHA-256 Proof of Recycling hash
- Material-based reward calculation
- Blockchain gateway abstraction
- Explicit local `mock` blockchain adapter
- PostgreSQL + Prisma data model
- Demo seed data

Not implemented yet:

- Authentication/session management
- Anchor program
- Real Solana devnet transaction submission
- Token/points minting on Solana
- Sponsor campaigns
- Anti-fraud scoring

## Requirements

- Node.js 22.18+
- Docker / Docker Compose
- npm 11 recommended for the current Prisma toolchain

## Run locally

```bash
cp .env.example .env
docker compose up -d
npm install
npm run prisma:generate
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

In another terminal, exercise the complete local MVP flow:

```bash
npm run demo:flow
```

API base URL:

```text
http://localhost:3333/api/v1
```

Health check:

```bash
curl http://localhost:3333/api/v1/health
```

## Main workflow

1. Create or use a recycler.
2. Choose a collection point.
3. Create a recycling event.
4. An operator assigned to that point verifies it.
5. The backend generates a proof hash and reward amount.
6. Call `record-onchain`.
7. In `BLOCKCHAIN_MODE=mock`, a clearly-marked fake signature is returned for local UI development.
8. In the next milestone the adapter will submit the Proof of Recycling to the Solana devnet Anchor program.

## API

### POST /users

```json
{
  "name": "Ana",
  "email": "ana@example.com"
}
```

### GET /collection-points/nearby?lat=-1.4558&lng=-48.4902&radiusKm=20

### POST /recycling-events

```json
{
  "recyclerId": "UUID",
  "collectionPointId": "UUID",
  "materialType": "PET_PLASTIC",
  "weightGrams": 2400
}
```

### POST /recycling-events/:id/verify

```json
{
  "operatorId": "UUID"
}
```

### POST /recycling-events/:id/record-onchain

No request body is required.

## Proof payload

The proof hash commits to the fields that matter for the verified event:

- event ID
- public recycling ID
- recycler
- collection point
- operator
- material
- weight
- reward
- verification timestamp

The current hash is SHA-256 over a canonicalized JSON representation. The Anchor program will use the resulting 32-byte digest as the on-chain proof identifier.

## Security notes

The current milestone has no production authentication. Never expose operator/admin routes publicly in this state. Authorization is currently modeled at the domain layer through operator-to-collection-point assignments; HTTP authentication will be added before deployment.

Never commit private keys or seed phrases. The real Solana adapter will use a dedicated devnet authority/key-management mechanism.

---

## Hackathon protocol upgrade: O Algoritmo do Rio / REC (Milestone 1)

The repository now includes an Anchor program under `solana/` implementing the first protocol upgrade from the pitch deck: verified physical recycling can mint a program-controlled SPL reward asset named **REC**.

Key properties:

- REC can only be minted through `verify_recycling`.
- The REC mint is a PDA and its own mint authority; no client wallet owns arbitrary mint power.
- The program calculates rewards from verified weight and the campaign's on-chain `reward_rec_per_kg` rule.
- `RecyclingProof = ["proof", proof_hash]` makes the same verified proof non-repeatable.
- `RewardLedger` tracks cumulative verified weight and REC issuance per recycler.

For the demo PET campaign, `10 REC/kg` means `2.4 kg -> 24 REC`.

See [`solana/README.md`](solana/README.md) and [`docs/rec-token-milestone.md`](docs/rec-token-milestone.md).

> The existing Node `DevnetBlockchainGateway` remains intentionally unwired in this milestone. Backend-to-Anchor submission is scheduled after the on-chain ImpactPool + burn/certificate primitives, so the protocol surface is stable before client integration.
