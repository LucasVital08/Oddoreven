# OddOrEven — Frontend

A arena de apostas 1v1 de par ou ímpar on-chain. Next.js 14 (App Router) +
wagmi v2 + RainbowKit + Framer Motion, com estética de casa de apostas
(tema escuro, neon, indicadores ao vivo).

## Rodar localmente contra o nó Hardhat

**1. Suba o nó local** (na raiz do repositório):

```bash
npx hardhat node
```

**2. Faça o deploy do contrato** (em outro terminal, na raiz):

```bash
npx hardhat run scripts/deploy.ts --network local
```

Copie o endereço impresso.

**3. Configure o frontend:**

```bash
cd frontend
cp .env.local.example .env.local
# cole o endereço em NEXT_PUBLIC_FACTORY_ADDRESS
npm install
npm run dev
```

Abra http://localhost:3000.

**4. Carteira:** adicione a rede local no MetaMask
(RPC `http://127.0.0.1:8545`, chainId `31337`) e importe uma das chaves
privadas que o `npx hardhat node` imprime para ter ETH de teste.

## Estrutura

| Rota | Descrição |
| --- | --- |
| `/` | Landing / arena — hero, volume ao vivo, fluxo do jogo |
| `/lobby` | Criar sala + encontrar oponentes (salas abertas/ao vivo) |
| `/play/[address]` | Sala de jogo — máquina de estados commit-reveal, timers, histórico |
| `/profile/[address]` | Perfil do jogador — Jazzicon + estatísticas agregadas |
| `/how` | Como funciona (fluxo provably fair) |

## Camada web3

- `src/lib/wagmi.ts` — chains (Hardhat local + Sepolia) e config RainbowKit
- `src/lib/contracts.ts` — endereços, ABIs, constantes espelhadas do contrato
- `src/lib/hash.ts` — commit-reveal (idêntico a `Keccak256Utils` + testes)
- `src/lib/hooks.ts` — leitura batched das sessões (multicall + polling)
- `src/store/useCommitStore.ts` — persiste o segredo entre `startRound` e `revealRound`
