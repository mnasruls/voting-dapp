import { ActionGetResponse, ActionPostRequest, ACTIONS_CORS_HEADERS, createPostResponse } from "@solana/actions";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { Voting } from "@/../anchor/target/types/voting";
import { BN, Program, AnchorProvider } from "@coral-xyz/anchor";

const IDL = require("@/../anchor/target/idl/voting.json");

export const OPTIONS = GET;

export async function GET(_request: Request) {
  const actionMetadata: ActionGetResponse = {
    title: "Vote which country that you really wanted to visit?",
    description: "Vote for your favorite country",
    icon: "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/1a/60/6a/e9/caption.jpg?w=800&h=800&s=1",
    label: "Vote",
    links: {
      actions: [
        { href: "/api/vote?candidat=Kyrgyztan", label: "Kyrgyztan", type: "transaction" },
        { href: "/api/vote?candidate=Swizzterland", label: "Swizzterland", type: "transaction" },
        { href: "/api/vote?candidate=Japan", label: "Japan", type: "transaction" },
      ],
    },
  };
  return Response.json(actionMetadata, { headers: ACTIONS_CORS_HEADERS });
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const candidate = url.searchParams.get("candidate");

    if (!candidate) {
      return Response.json({ error: "Missing candidate parameter" }, { headers: ACTIONS_CORS_HEADERS, status: 400 });
    }

    if (!["Kyrgyztan", "Swizzterland", "Japan"].includes(candidate)) {
      return Response.json({ error: "Invalid candidate parameter" }, { headers: ACTIONS_CORS_HEADERS, status: 400 });
    }

    if (candidate.length > 32) {
      return Response.json({ error: "Candidate name too long" }, { headers: ACTIONS_CORS_HEADERS, status: 400 });
    }

    const connection = new Connection("http://127.0.0.1:8899", "confirmed");

    const body: ActionPostRequest = await request.json();
    let voter: PublicKey;
    try {
      voter = new PublicKey(body.account);
    } catch (error) {
      return Response.json({ error: "Invalid account parameter" }, { headers: ACTIONS_CORS_HEADERS, status: 400 });
    }

    const wallet: any = {
      publicKey: voter,
      signTransaction: async (tx: Transaction) => tx,
      signAllTransactions: async (txs: Transaction[]) => txs,
    };
    const provider = new AnchorProvider(connection, wallet as any, { preflightCommitment: "confirmed" });

    const votingProgram: Program<Voting> = new Program(IDL as Voting, provider);
    const programId = votingProgram.programId;

    // Derive PDAs according to program seeds (little-endian u64 and candidate name bytes)
    const pollId = new BN(1);
    const [pollPda] = PublicKey.findProgramAddressSync([Buffer.from(pollId.toArray("le", 8))], programId);
    const [candidatePda] = PublicKey.findProgramAddressSync([
      Buffer.from(pollId.toArray("le", 8)),
      Buffer.from(candidate, "utf8"),
    ], programId);

    // Ensure required accounts exist to avoid wallet simulation failure
    const pollInfo = await connection.getAccountInfo(pollPda);
    if (!pollInfo) {
      return Response.json(
        { error: "Poll not found. Initialize the poll before voting.", details: { pollPda: pollPda.toBase58() } },
        { headers: ACTIONS_CORS_HEADERS, status: 400 }
      );
    }
    const candidateInfo = await connection.getAccountInfo(candidatePda);
    if (!candidateInfo) {
      return Response.json(
        { error: "Candidate not found. Initialize the candidate before voting.", details: { candidatePda: candidatePda.toBase58(), candidate } },
        { headers: ACTIONS_CORS_HEADERS, status: 400 }
      );
    }

    // Build the vote instruction with explicit accounts
    let instruction;
    try {
      instruction = await votingProgram.methods
        .vote(pollId, candidate)
        .accounts({ signer: voter })
        .instruction();
    } catch (e: any) {
      return Response.json(
        { error: "Failed to build vote instruction", message: e?.message ?? String(e) },
        { headers: ACTIONS_CORS_HEADERS, status: 500 }
      );
    }

    // Fetch recent blockhash and assemble transaction
    let blockhash;
    try {
      blockhash = await connection.getLatestBlockhash();
    } catch (e: any) {
      return Response.json(
        { error: "Failed to fetch latest blockhash", message: e?.message ?? String(e) },
        { headers: ACTIONS_CORS_HEADERS, status: 500 }
      );
    }

    const transaction = new Transaction();
    transaction.recentBlockhash = blockhash.blockhash;
    transaction.feePayer = voter;
    transaction.add(instruction);

    const response = await createPostResponse({
      fields: { transaction, type: "transaction", message: `Vote for ${candidate}` },
    });

    return Response.json(response, { headers: ACTIONS_CORS_HEADERS });
  } catch (e: any) {
    return Response.json(
      { error: "Unexpected server error", message: e?.message ?? String(e) },
      { headers: ACTIONS_CORS_HEADERS, status: 500 }
    );
  }
}
