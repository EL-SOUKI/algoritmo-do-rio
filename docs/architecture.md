# O Algoritmo do Rio — MVP Architecture

```text
React Web App
     |
     v
Node.js / TypeScript API
     |
     +--------------------+
     |                    |
     v                    v
PostgreSQL          Solana Gateway
                          |
                          v
                  Solana Local Validator
                          |
                          v
                     Anchor Program
                          |
             +------------+------------+
             |            |            |
             v            v            v
        REC SPL Mint  ImpactPool   Certificates
```

## Physical-to-digital flow

```text
Recycler
  -> recycling event
  -> authorized operator verification
  -> deterministic Proof of Recycling
  -> Solana transaction
  -> RecyclingProof PDA
  -> REC mint
  -> company receives REC
  -> REC burn
  -> impact retirement
  -> ImpactCertificate PDA
```

## Trust model

Blockchain does not independently verify physical waste.

An authenticated collection-point operator validates the real-world material and
weight. The protocol then uses Solana to make that attestation auditable,
non-duplicable and programmable.

## Recycling state machine

```text
PENDING
   |
   +--> REJECTED
   |
   v
VERIFIED
   |
   +--> ONCHAIN_FAILED
   |
   v
RECORDED_ONCHAIN
```

## Current hackathon deployment

The functional MVP runs on Solana localnet.

Devnet/mainnet deployment, client-side wallet signing and stronger physical
anti-fraud mechanisms are production milestones.
