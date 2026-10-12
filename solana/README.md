# O Algoritmo do Rio — Solana program

Milestone 1 adds a real SPL reward asset (`REC`) to the existing Proof of Recycling model.

## What is implemented

- `initialize_protocol`
  - creates the protocol config PDA;
  - creates the REC mint PDA;
  - makes the REC mint PDA its own mint authority (program-controlled minting).
- `register_collection_point`
- `set_collection_point_active`
- `create_campaign`
- `set_campaign_active`
- `verify_recycling`
  - validates the authorized physical verifier;
  - validates point/campaign/material/time window;
  - creates a unique `RecyclingProof` PDA from `proof_hash`;
  - updates a recycler `RewardLedger` PDA;
  - calculates REC on-chain from weight + campaign rate;
  - creates the recycler's associated token account if needed;
  - mints REC via CPI to the SPL Token Program.

## REC monetary/impact semantics for the MVP

REC is an impact/reward unit, not a promise of fiat value.

The mint uses `0` decimals. Campaigns define an integer `reward_rec_per_kg`.
For the demo campaign:

```text
10 REC / kg of verified PET
2.4 kg PET -> 24 REC
100 g PET -> 1 REC
```

The program—not the frontend—calculates the amount minted.

## PDA map

```text
ProtocolConfig   ["protocol"]
REC Mint         ["rec-mint"]
CollectionPoint  ["point", point_id_32]
Campaign         ["campaign", campaign_id_32]
RecyclingProof   ["proof", proof_hash_32]
RewardLedger     ["rewards", recycler_pubkey]
```

`RecyclingProof` uses `init`, so a previously accepted `proof_hash` cannot be minted twice.

## First local build

Install Solana/Agave + Anchor first. This milestone targets Anchor 1.2.x, then:

```bash
cd solana
anchor keys sync
anchor build
anchor test
```

`Anchor.toml` and `declare_id!` intentionally contain a development placeholder program ID. `anchor keys sync` replaces it with the generated keypair's address.

## Devnet deployment

```bash
solana config set --url devnet
solana airdrop 2
cd solana
anchor keys sync
anchor build
anchor deploy --provider.cluster devnet
```

After deployment, copy the program ID into the backend `.env`:

```env
SOLANA_PROGRAM_ID=<DEPLOYED_PROGRAM_ID>
```

## Security model in this milestone

Blockchain does not independently know whether plastic existed. An authorized collection-point verifier attests the physical event. The program makes that attestation unique/auditable and enforces the reward rule before minting REC.

REC mint authority is not a normal wallet. The mint PDA controls issuance, and the program signs the `mint_to` CPI with PDA seeds. This prevents a client or sponsor from minting arbitrary REC outside `verify_recycling`.

## Next milestone

`ImpactPool` will track verified versus retired environmental impact. Then `burn_for_certificate` will permanently burn REC and create an on-chain impact certificate.
