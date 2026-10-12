# RecyChain MVP architecture

```text
Web / Mobile UI
      |
      v
Node.js REST API
      |
      +------------------+
      |                  |
      v                  v
PostgreSQL         BlockchainGateway
                         |
              +----------+----------+
              |                     |
              v                     v
          Mock adapter        Solana devnet adapter
          (current)           (next milestone)
                                     |
                                     v
                               Anchor program
```

## Domain invariant

A valid Proof of Recycling is created only after an operator assigned to the selected collection point verifies a pending recycling event.

## State machine

```text
PENDING --> VERIFIED --> RECORDED_ONCHAIN
   |            |
   |            +------> ONCHAIN_FAILED
   v
REJECTED
```
