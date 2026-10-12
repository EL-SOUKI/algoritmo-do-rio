# Next milestone: Solana devnet

1. Create the Anchor workspace/program `proof_of_recycling`.
2. Define a protocol authority and collection-point/operator authorization model.
3. Store/reject duplicate 32-byte proof hashes on-chain.
4. Emit a `RecyclingVerified` event with material, weight, reward and participants.
5. Generate a TypeScript program client.
6. Implement `DevnetBlockchainGateway` using the current Solana TypeScript stack.
7. Write integration tests against local validator/devnet.
8. Decide whether REC stays as off-chain points for the hackathon MVP or becomes a Token-2022 asset.
