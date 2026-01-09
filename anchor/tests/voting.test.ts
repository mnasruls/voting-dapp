import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
import { Voting } from '../target/types/voting';
import { startAnchor } from "solana-bankrun";
import { BankrunProvider } from "anchor-bankrun";

const IDL = require('../target/idl/voting.json');
const votingAddress = new PublicKey('DwGLWi4HVytijLWPgbogFxj3JDtRRTP1AYA5KyeTDT9z');

describe('voting', () => {

  let context;
  let provider;
  anchor.setProvider(anchor.AnchorProvider.env());
  let program = anchor.workspace.Voting as Program<Voting>;

  beforeAll(async ()=>{
    //   context = await startAnchor("", [{name:"voting", programId:votingAddress}],[]);
    //   provider = new BankrunProvider(context);

    //   program = new Program<Voting>(
    //     IDL,
    //     provider,
    // );
  })

  it('Initialize Poll', async () => {
      await program.methods.initializePoll(
        new anchor.BN(1),
        "Which country that you really wanted to visit?",
        new anchor.BN(0),
        new anchor.BN(1867777767),
      ).rpc();

      const [pollAddress] = PublicKey.findProgramAddressSync(
        [new anchor.BN(1).toArrayLike(Buffer, 'le', 8)],
        votingAddress,
      );

      const poll = await program.account.poll.fetch(pollAddress);
      console.log(poll);

      expect (poll.pollId.toNumber()).toEqual(1);
      expect (poll.description).toEqual("Which country that you really wanted to visit?");
      expect (poll.pollStart.toNumber()).toBeLessThan(poll.pollEnd.toNumber())
  });

  it('Initialize Candidate', async () => {
    await program.methods.initializeCandidate(
      new anchor.BN(1),
      "Kyrgyztan",
    ).rpc();

    await program.methods.initializeCandidate(
      new anchor.BN(1),
      "Swizzterland",
    ).rpc();

    await program.methods.initializeCandidate(
      new anchor.BN(1),
      "Japan",
    ).rpc();

     const [kyrgyztanAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, 'le', 8), Buffer.from("Kyrgyztan")],
      votingAddress,
    );

    const kyrgyztan = await program.account.candidate.fetch(kyrgyztanAddress);
    console.log(kyrgyztan);

    expect (kyrgyztan.candidateName).toEqual("Kyrgyztan");
    expect (kyrgyztan.candidateVotes.toNumber()).toEqual(0);

    const [swizzterlandAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, 'le', 8), Buffer.from("Swizzterland")],
      votingAddress,
    );

    const swizzterland = await program.account.candidate.fetch(swizzterlandAddress);
    console.log(swizzterland);

    expect (swizzterland.candidateName).toEqual("Swizzterland");
    expect (swizzterland.candidateVotes.toNumber()).toEqual(0);

    const [japanAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, 'le', 8), Buffer.from("Japan")],
      votingAddress,
    );

    const japan = await program.account.candidate.fetch(japanAddress);
    console.log(japan);

    expect (japan.candidateName).toEqual("Japan");
    expect (japan.candidateVotes.toNumber()).toEqual(0);
  });

  it('Vote', async () => {
    await program.methods.vote(
      new anchor.BN(1),
      "Kyrgyztan",
    ).rpc();

    const [kyrgyztanAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, 'le', 8), Buffer.from("Kyrgyztan")],
      votingAddress,
    );

    const kyrgyztan = await program.account.candidate.fetch(kyrgyztanAddress);
    console.log(kyrgyztan);

    expect (kyrgyztan.candidateVotes.toNumber()).toEqual(1);
  });
});
