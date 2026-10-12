import {
  Connection,
  PublicKey,
} from "@solana/web3.js";

import { env } from "../config/env.js";

const connection = new Connection(
  env.SOLANA_RPC_URL,
  "confirmed",
);

export const solanaService = {
  async getStatus() {
    const version = await connection.getVersion();
    const slot = await connection.getSlot("confirmed");

    let programDeployed = false;

    if (env.SOLANA_PROGRAM_ID) {
      const programId = new PublicKey(
        env.SOLANA_PROGRAM_ID,
      );

      const accountInfo =
        await connection.getAccountInfo(
          programId,
          "confirmed",
        );

      programDeployed =
        accountInfo?.executable === true;
    }

    return {
      connected: true,
      network: env.BLOCKCHAIN_MODE,
      rpcUrl: env.SOLANA_RPC_URL,
      programId: env.SOLANA_PROGRAM_ID || null,
      programDeployed,
      slot,
      solanaVersion: version["solana-core"],
    };
  },
};
