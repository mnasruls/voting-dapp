import { ActionGetResponse, ActionPostRequest, ACTIONS_CORS_HEADERS, BLOCKCHAIN_IDS, createPostResponse } from "@solana/actions"
import { Connection, PublicKey, Transaction, ComputeBudgetProgram } from "@solana/web3.js"
import { Voting } from "@/../anchor/target/types/voting"
import { BN, Program, AnchorProvider } from "@coral-xyz/anchor"

import IDL from "@/../anchor/target/idl/voting.json"

// Resolve cluster from environment: devnet | mainnet | testnet | localnet (header supports: devnet | mainnet | testnet)
const clusterEnv = (process.env.SOLANA_CLUSTER || process.env.NEXT_PUBLIC_SOLANA_CLUSTER || "devnet").toLowerCase();
const blockchain =
  clusterEnv.startsWith("mainnet") ? BLOCKCHAIN_IDS.mainnet :
  clusterEnv === "testnet" ? BLOCKCHAIN_IDS.testnet :
  BLOCKCHAIN_IDS.devnet;
const headers = {
  ...ACTIONS_CORS_HEADERS,
  "X-Blockchain-Ids": blockchain,
  "X-Action-Version": "2.4",
};
export const OPTIONS = GET;

export async function GET(_request: Request) {
  const actionMetadata: ActionGetResponse = {
    type: "action",
    title: "Vote which country that you really wanted to visit?",
    description: "Vote for your favorite country",
    icon: "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/1a/60/6a/e9/caption.jpg?w=800&h=800&s=1",
    label: "Vote",
    links: {
      actions: [
        { href: "/api/vote?candidate=Kyrgyztan", label: "Kyrgyztan", type: "transaction" },
        { href: "/api/vote?candidate=Swizzterland", label: "Swizzterland", type: "transaction" },
        { href: "/api/vote?candidate=Japan", label: "Japan", type: "transaction" },
      ],
    },
  };
  return Response.json(actionMetadata, { headers: headers });
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const candidate = url.searchParams.get("candidate");

    if (!candidate) {
      return Response.json({ error: "Missing candidate parameter" }, { headers: headers, status: 400 });
    }

    if (!["Kyrgyztan", "Swizzterland", "Japan"].includes(candidate)) {
      return Response.json({ error: "Invalid candidate parameter" }, { headers: headers, status: 400 });
    }

    if (candidate.length > 32) {
      return Response.json({ error: "Candidate name too long" }, { headers: headers, status: 400 });
    }

    const defaultRpc =
      clusterEnv.startsWith("mainnet") ? "https://api.mainnet-beta.solana.com" :
      clusterEnv === "testnet" ? "https://api.testnet.solana.com" :
      clusterEnv === "localnet" || clusterEnv === "localhost" ? "http://localhost:8899" :
      "https://api.devnet.solana.com";
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || process.env.SOLANA_RPC_URL || defaultRpc;
    const connection = new Connection(rpcUrl, "confirmed");

    const body: ActionPostRequest = await request.json();
    let voter: PublicKey;
    try {
      voter = new PublicKey(body.account);
    } catch (error) {
      return Response.json({ error: "Invalid account parameter" }, { headers: headers, status: 400 });
    }

    const wallet: any = {
      publicKey: voter,
      signTransaction: async (tx: Transaction) => tx,
      signAllTransactions: async (txs: Transaction[]) => txs,
    };
    const provider = new AnchorProvider(connection, wallet as any, { preflightCommitment: "confirmed" });

    const votingProgram: Program<Voting> = new Program(IDL as Voting, provider);
    const programId = votingProgram.programId;

    const pollId = new BN(1);
    const [pollPda] = PublicKey.findProgramAddressSync([Buffer.from(pollId.toArray("le", 8))], programId);
    const [candidatePda] = PublicKey.findProgramAddressSync([
      Buffer.from(pollId.toArray("le", 8)),
      Buffer.from(candidate, "utf8"),
    ], programId);

    const pollInfo = await connection.getAccountInfo(pollPda);
    if (!pollInfo) {
      return Response.json(
        { error: "Poll not found. Initialize the poll before voting.", details: { pollPda: pollPda.toBase58() } },
        { headers: headers, status: 400 }
      );
    }
    const candidateInfo = await connection.getAccountInfo(candidatePda);
    if (!candidateInfo) {
      return Response.json(
        { error: "Candidate not found. Initialize the candidate before voting.", details: { candidatePda: candidatePda.toBase58(), candidate } },
        { headers: headers, status: 400 }
      );
    }

    let instruction;
    try {
      instruction = await votingProgram.methods
        .vote(pollId, candidate)
        .accounts({ signer: voter })
        .instruction();
    } catch (e: any) {
      return Response.json(
        { error: "Failed to build vote instruction", message: e?.message ?? String(e) },
        { headers: headers, status: 500 }
      );
    }

    let blockhash;
    try {
      blockhash = await connection.getLatestBlockhash();
    } catch (e: any) {
      return Response.json(
        { error: "Failed to fetch latest blockhash", message: e?.message ?? String(e) },
        { headers: headers, status: 500 }
      );
    }

    const transaction = new Transaction()
    transaction.recentBlockhash = blockhash.blockhash
    transaction.feePayer = voter
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10000 }),
    )
    transaction.instructions.push(instruction)
    console.log("transaction", transaction)

    const response = await createPostResponse({
      fields: { transaction, type: "transaction", message: `Vote for ${candidate}` },
    });

    return Response.json(response, { headers: headers });
  } catch (e: any) {
    return Response.json(
      { error: "Unexpected server error", message: e?.message ?? String(e) },
      { headers: headers, status: 500 }
    );
  }
}
