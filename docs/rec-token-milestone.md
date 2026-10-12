# Milestone 1 — REC SPL token

The public product direction is **O Algoritmo do Rio**, while the repository may remain named `recychain-backend` during the hackathon.

## Physical → digital invariant

A REC mint can happen only as the terminal action of a valid `verify_recycling` instruction:

```text
physical delivery
  -> authorized verifier
  -> unique proof_hash
  -> campaign rule checked on-chain
  -> RecyclingProof PDA
  -> REC mint
```

The client never submits an arbitrary reward amount. It submits verified weight/material plus the proof hash. The Solana program reads `reward_rec_per_kg` from the campaign account and computes the mint amount itself.

## Why mint authority is a PDA

The REC mint is the PDA `["rec-mint"]` and is also its own mint authority. Only the Proof of Recycling program can produce the PDA signature required by the Token Program CPI. This removes a hot-wallet mint-authority key from the reward path.

## Double-mint protection

The proof account is initialized at `["proof", proof_hash]`. A second transaction using the same proof hash fails because the PDA is already initialized.

## Deliberately deferred

This milestone does not yet implement retirement/burn semantics. REC issuance represents **verified impact available for later retirement**. The next milestone adds `ImpactPool`, followed by `burn_for_certificate` and `ImpactCertificate`.
