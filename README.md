# voting-dapp (Practice Project)

A simple Solana voting application for learning and practice. It consists of:
- A Next.js web app with basic wallet UI (using @solana/web3.js)
- An Anchor program that records votes
- Minimal Solana Actions endpoints to create and track a vote transaction (`/api/vote` and `/api/vote/next`)
- Solana Action Blinks integration to make the voting action unfurlable and executable across clients that support Blinks

This repository is for practice only. It is not audited, not production-ready, and comes with no guarantees. Do not use real funds.

## Prerequisites
- Node.js (LTS) and pnpm installed
- Rust toolchain, Solana CLI, and Anchor CLI installed
- A Solana keypair for local/devnet testing (default: `~/.config/solana/id.json`)

## Setup
1. Install dependencies:
   ```sh
   pnpm install
   ```
2. Initialize environment files (adjust values as needed):
   ```sh
   cp .env.example .env
   cp anchor/.env.example anchor/.env
   ```
   - App env supports `SOLANA_CLUSTER` (`devnet` | `testnet` | `mainnet` | `localnet`), `SOLANA_RPC_URL`, and optional client-side overrides.
   - Anchor env supports `ANCHOR_CLUSTER`, `ANCHOR_PROVIDER_URL`, and `ANCHOR_WALLET`.

## Running Locally

### Option A: Local Validator (recommended for quick practice)
1. Start local validator and deploy the program:
   ```sh
   pnpm anchor-localnet
   ```
   This runs a local validator, builds, and deploys the voting program.
2. In a new terminal, start the web app:
   ```sh
   pnpm dev
   ```
3. Open the app in your browser (the terminal will print the local URL).

### Option B: Devnet
1. Build the program:
   ```sh
   pnpm anchor-build
   ```
2. Deploy to devnet (ensure your Anchor wallet has some devnet SOL):
   ```sh
   pnpm anchor deploy --provider.cluster devnet
   ```
3. Start the web app pointing to devnet (configure `.env` accordingly):
   ```sh
   pnpm dev
   ```

## Solana Actions & Blinks
- `GET /api/vote` provides an Action that lets a user vote for a candidate.
- `POST /api/vote` creates the transaction using the Anchor client and returns a NextAction link to `/api/vote/next`.
- `POST /api/vote/next` polls the network for confirmation of the submitted transaction and responds when confirmed.
- Blinks: This project is set up so the voting Action can be unfurled and executed by Blink-enabled clients, providing a portable, interactive experience.

## Project Structure
- `anchor/` — Anchor program, config, and tests
- `src/app/` — Next.js app router pages and API routes
- `src/components/` — UI components and providers

## Notes & Troubleshooting
- If transactions take long to confirm, check your RPC settings in `.env` and that the selected cluster matches where the program was deployed.
- For local validator issues, restart the process and ensure your wallet/keypair is accessible.
- If you change the program ID, update any hardcoded references and regenerate types as needed.

## Resources
- Anchor installation and environment setup guide: https://www.anchor-lang.com/docs/installation
- Dialect Blinks docs: https://docs.dialect.to/blinks
- Solana Developer Bootcamp 2024 (Projects incl. Voting & Blinks): https://www.youtube.com/watch?v=amAq-WHAFs8&t=551s

## Build
```sh
pnpm build
```

## License
MIT (practice and learning purposes only).
