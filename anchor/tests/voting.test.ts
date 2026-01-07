import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
import { Voting } from '../target/types/voting';
import { startAnchor } from "solana-bankrun";
import { BankrunProvider } from "anchor-bankrun";

const IDL = require('../target/idl/voting.json');
const votingAddress = new PublicKey('Count3AcZucFDPSFBAeHkQ6AvttieKUkyJ8HiQGhQwe');

describe('voting', () => {

  let context;
  let program;
  let provider;

  beforeAll(async ()=>{
      context = await startAnchor("", [{name:"voting", programId:votingAddress}],[]);
      provider = new BankrunProvider(context);

      program = new Program<Voting>(
        IDL,
        provider,
    );
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
      "Jack Lahuna Laguna",
    ).rpc();

    await program.methods.initializeCandidate(
      new anchor.BN(1),
      "Patrick",
    ).rpc();

     const [patrickAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, 'le', 8), Buffer.from("Patrick")],
      votingAddress,
    );

    const patrick = await program.account.candidate.fetch(patrickAddress);
    console.log(patrick);

    expect (patrick.candidateName).toEqual("Patrick");
    expect (patrick.candidateVotes.toNumber()).toEqual(0);

    const [jackAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, 'le', 8), Buffer.from("Jack Lahuna Laguna")],
      votingAddress,
    );

    const jack = await program.account.candidate.fetch(jackAddress);
    console.log(jack);

    expect (jack.candidateName).toEqual("Jack Lahuna Laguna");
    expect (jack.candidateVotes.toNumber()).toEqual(0);
  });

  it('Vote', async () => {
    await program.methods.vote(
      new anchor.BN(1),
      "Jack Lahuna Laguna",
    ).rpc();

    const [jackAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, 'le', 8), Buffer.from("Jack Lahuna Laguna")],
      votingAddress,
    );

    const jack = await program.account.candidate.fetch(jackAddress);
    console.log(jack);

    expect (jack.candidateVotes.toNumber()).toEqual(1);
  });
});
