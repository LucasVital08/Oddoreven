// End-to-end smoke test — replicates the EXACT frontend flow (viem + the
// frontend's commit-reveal hashing) against a live Hardhat node. Proves the UI's
// hash logic matches the contract, top to bottom.
//
//   Terminal 1:  npx hardhat node                              (repo root)
//   Terminal 2:  npx hardhat run scripts/deploy.ts --network local
//   Terminal 2:  cd frontend && npm run smoke
//
import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  keccak256,
  decodeEventLog,
  formatEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "fs";

const chain = {
  id: 31337,
  name: "hh",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
};
const factoryAbi = JSON.parse(readFileSync("src/lib/abis/factory.json"));
const sessionAbi = JSON.parse(readFileSync("src/lib/abis/session.json"));
const FACTORY = process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Hardhat default accounts #1 (player1) and #2 (player2). #0 is the deployer/owner.
const k1 = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const k2 = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";
const p1 = privateKeyToAccount(k1);
const p2 = privateKeyToAccount(k2);
const pub = createPublicClient({ chain, transport: http() });
const w1 = createWalletClient({ account: p1, chain, transport: http() });
const w2 = createWalletClient({ account: p2, chain, transport: http() });

// --- frontend hash.ts logic, inlined so this test stays self-contained ---
function optionByteHex(o) {
  const b = o < 0 ? o & 0xff : o;
  return b.toString(16).padStart(2, "0");
}
function buildCommitHash(keygameHex, option) {
  return keccak256(`0x${keygameHex}${optionByteHex(option)}`);
}
function genKeygame() {
  const a = new Uint8Array(32);
  for (let i = 0; i < 32; i++) a[i] = Math.floor(Math.random() * 256);
  return Array.from(a)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const mine = async (hash, label) => {
  const r = await pub.waitForTransactionReceipt({ hash });
  console.log(`  ✓ ${label} (block ${r.blockNumber})`);
  return r;
};

async function main() {
  console.log("1. createSession (player1 desafia player2, aposta 0.1)");
  const hash = await w1.writeContract({ address: FACTORY, abi: factoryAbi, functionName: "createSession", args: [p2.address], value: parseEther("0.1") });
  const rc = await mine(hash, "createSession");
  let session;
  for (const log of rc.logs) {
    try {
      const p = decodeEventLog({ abi: factoryAbi, ...log });
      if (p.eventName === "SessionCreated") session = p.args.sessionAddress;
    } catch {}
  }
  console.log("  session:", session);

  const read = (fn, args = []) => pub.readContract({ address: session, abi: sessionAbi, functionName: fn, args });
  console.log("  player1 =", await read("player1"), "(esperado", p1.address + ")");
  if ((await read("player1")).toLowerCase() !== p1.address.toLowerCase()) throw new Error("player1 mismatch — bug na factory!");

  console.log("2. player2 entra (aposta 0.1)");
  await mine(await w2.writeContract({ address: session, abi: sessionAbi, functionName: "joinSession", value: parseEther("0.1") }), "joinSession");

  console.log("3. player1 propõe: PAR, número secreto 3, aposta 0.02");
  const keygame = genKeygame();
  const secret = 3;
  const commit = buildCommitHash(keygame, secret);
  await mine(await w1.writeContract({ address: session, abi: sessionAbi, functionName: "startRound", args: [false, commit, parseEther("0.02")] }), "startRound");

  console.log("4. player2 aceita com número 5  (3+5=8 → PAR → proponente vence)");
  await mine(await w2.writeContract({ address: session, abi: sessionAbi, functionName: "acceptRound", args: [5] }), "acceptRound");

  console.log("5. player1 revela (keygame + segredo) — contrato recalcula o hash");
  const b1Before = await read("balance1");
  await mine(await w1.writeContract({ address: session, abi: sessionAbi, functionName: "revealRound", args: [`0x${keygame}`, secret] }), "revealRound");
  const b1After = await read("balance1");
  console.log(`  balance1: ${formatEther(b1Before)} → ${formatEther(b1After)} ETH`);
  if (b1After <= b1Before) throw new Error("player1 deveria ter VENCIDO — hash do front não bate com o contrato!");
  console.log("  ✓ hash viem do front bateu com o contrato & player1 venceu como previsto");

  console.log("6. player1 encerra a sessão — comissão de 1% só no fecho");
  const ownerAddr = await read("platformOwner");
  const ownerBefore = await pub.getBalance({ address: ownerAddr });
  const pot = (await read("balance1")) + (await read("balance2"));
  await mine(await w1.writeContract({ address: session, abi: sessionAbi, functionName: "closeSession" }), "closeSession");
  const commission = (await pub.getBalance({ address: ownerAddr })) - ownerBefore;
  console.log(`  pote=${formatEther(pot)}  comissão=${formatEther(commission)} (esperado ${formatEther(pot / 100n)})`);
  if (commission !== pot / 100n) throw new Error("comissão divergente!");
  console.log(`  sessionClosed = ${await read("sessionClosed")}`);

  console.log("\n✅ FLUXO COMPLETO OK — createSession → join → propose → accept → reveal → close");
}

main().catch((e) => {
  console.error("\n❌", e.shortMessage || e.message || e);
  console.error("\nDica: o nó Hardhat está rodando e a factory foi deployada? Veja o README.");
  process.exit(1);
});
