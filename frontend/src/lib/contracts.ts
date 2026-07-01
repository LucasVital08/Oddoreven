import type { Abi } from "viem";
import factoryAbi from "./abis/factory.json";
import sessionAbi from "./abis/session.json";

export const FACTORY_ABI = factoryAbi as Abi;
export const SESSION_ABI = sessionAbi as Abi;

/**
 * Deployed factory address. Set NEXT_PUBLIC_FACTORY_ADDRESS in .env.local after
 * running `npx hardhat run scripts/deploy.ts --network local`.
 * Falls back to the deterministic first-deploy address on a fresh Hardhat node.
 */
export const FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_FACTORY_ADDRESS ||
  "0x5FbDB2315678afecb367f032d93F642f64180aa3") as `0x${string}`;

/** On-chain constants mirrored from OddOrEvenSession.sol */
export const TIMEOUT_SECONDS = 60 * 20; // 20 minutes
export const COMMISSION_PERCENT = 1; // taken only at closeSession()

/** RoundState enum — mirrors the contract */
export enum RoundState {
  IDLE = 0,
  COMMITTED = 1,
  ACCEPTED = 2,
}

export const ROUND_STATE_LABEL: Record<number, string> = {
  0: "Aguardando",
  1: "Proposta feita",
  2: "Aposta aceita",
};
