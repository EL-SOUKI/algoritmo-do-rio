# River Algorithm — Solana Program

Anchor program for verifiable recycling impact and REC retirement.

## Implemented instructions

- `initialize_protocol`
- `register_collection_point`
- `set_collection_point_active`
- `create_campaign`
- `set_campaign_active`
- `initialize_impact_pool`
- `verify_recycling`
- `burn_for_certificate`

## Core accounts and PDAs

```text
ProtocolConfig     ["protocol"]
REC Mint           ["rec-mint"]
CollectionPoint    ["point", point_id_32]
Campaign           ["campaign", campaign_id_32]
ImpactPool         ["impact-pool", campaign]
RecyclingProof     ["proof", proof_hash_32]
RewardLedger       ["rewards", recycler_pubkey]
ImpactCertificate  ["certificate", campaign, certificate_id]
```

## REC issuance

The program validates:

- authorized verifier
- active collection point
- active campaign
- material compatibility
- campaign time window
- verified weight

The REC reward is calculated on-chain and minted through the SPL Token Program.

The REC mint is program-controlled through a PDA.

## Burn-to-Certificate

A company can permanently burn REC through `burn_for_certificate`.

The program:

1. validates the company's REC token account;
2. burns REC through the SPL Token Program;
3. updates ImpactPool retirement accounting;
4. creates an immutable ImpactCertificate PDA.

## Build

This hackathon MVP currently targets Solana localnet.

```bash
cd solana
anchor build --arch v2
```

Current localnet program ID:

```text
9bQFX3gtGKwN6he7bkRWRFXQRLdBk1YE4YcHYEzcgoaG
```

Devnet/mainnet deployment is a post-hackathon production milestone.

## Trust model

Solana guarantees digital uniqueness, accounting and retirement. Physical waste is validated by an authorized collection-point operator before the protocol submits the attestation on-chain.
