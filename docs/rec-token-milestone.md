# REC Token Milestone — Historical Design Note

This document records the design decisions that led to the current REC implementation.

## Physical-to-digital invariant

REC issuance follows this flow:

```text
physical delivery
  -> authorized verification
  -> unique proof hash
  -> campaign rules checked on-chain
  -> RecyclingProof PDA
  -> REC mint
```

The client does not choose an arbitrary reward amount. The Anchor program reads the campaign reward rate and calculates REC from the verified weight.

## Program-controlled mint

The REC mint is the PDA:

```text
["rec-mint"]
```

The mint PDA is its own mint authority. The Proof of Recycling program signs the SPL Token CPI using PDA seeds.

This prevents a client or normal wallet from arbitrarily minting REC outside the protocol flow.

## Duplicate-proof protection

Each accepted recycling proof is stored at:

```text
["proof", proof_hash]
```

The account uses Anchor `init`, so the same proof hash cannot be accepted twice.

## Current status

The later milestones originally planned after REC issuance are now implemented:

- ImpactPool
- REC retirement
- `burn_for_certificate`
- ImpactCertificate PDA

See the root README and Anchor program for the current architecture.
