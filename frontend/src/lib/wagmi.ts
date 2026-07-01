import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";
import { sepolia } from "wagmi/chains";

/** Local Hardhat node — matches hardhat.config.ts `local` network (chainId 31337). */
export const hardhatLocal = defineChain({
  id: 31337,
  name: "Hardhat Local",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
  },
  testnet: true,
});

/**
 * WalletConnect projectId — grab a free one at https://cloud.reown.com and set
 * NEXT_PUBLIC_WC_PROJECT_ID. A placeholder still allows injected wallets (MetaMask).
 */
const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || "oddoreven_local_dev";

export const wagmiConfig = getDefaultConfig({
  appName: "OddOrEven",
  projectId,
  chains: [hardhatLocal, sepolia],
  ssr: true,
});
