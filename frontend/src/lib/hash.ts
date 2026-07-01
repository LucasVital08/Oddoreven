import { keccak256 } from "viem";

/**
 * Commit-reveal helpers — must byte-for-byte match Keccak256Utils.appendByteToBytes
 * + OddOrEvenSession's hashing, and the test suite's buildHash().
 *
 * The proposer commits keccak256( keygameBytes ++ optionByte ) on-chain, keeps the
 * keygame + option secret, then reveals both so the contract can recompute the hash.
 */

/** Random 32-byte secret key, returned as a 64-char lowercase hex string (no 0x). */
export function generateKeygame(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Encode an int8 option as a single hex byte (two's complement for negatives). */
export function optionByteHex(option: number): string {
  const b = option < 0 ? option & 0xff : option;
  return b.toString(16).padStart(2, "0");
}

/** keccak256(keygameBytes ++ optionByte) — the value passed to startRound(). */
export function buildCommitHash(keygameHex: string, option: number): `0x${string}` {
  const payload = `0x${keygameHex}${optionByteHex(option)}` as `0x${string}`;
  return keccak256(payload);
}

/** The keygame as a 0x-prefixed bytes value for revealRound(). */
export function keygameToBytes(keygameHex: string): `0x${string}` {
  return `0x${keygameHex}` as `0x${string}`;
}

/**
 * Predict the round outcome locally (same rule as the contract):
 * proposer wins iff parity(optionProposer + optionAcceptor) == oddness AND option >= 0.
 */
export function proposerWins(
  isOdd: boolean,
  optionProposer: number,
  optionAcceptor: number
): boolean {
  if (optionProposer < 0) return false;
  const sumByte = (optionProposer + optionAcceptor) & 0xff;
  const parity = sumByte % 2; // 1 = odd, 0 = even
  return parity === (isOdd ? 1 : 0);
}
