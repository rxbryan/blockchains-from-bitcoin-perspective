---
slug: /oracle-trust-models/overview
---

# Overview

Smart contracts execute exactly as written. They consume only data present at
execution time, and every participant in the network can independently verify
the result: no trust in any counterparty required. That property is what
makes blockchain systems interesting.

It also makes them blind to the outside world.

## Bitcoin's Execution Model

Bitcoin Script is deliberately constrained. A script can check signatures,
verify hash preimages, and enforce timelocks. That's essentially the full
extent of it. There is no opcode for fetching a price, reading from an API,
or observing anything that happened outside the transaction being validated.

This isn't a limitation that crept in by accident. The UTXO model is built
around a specific guarantee:

> All inputs required for validation are globally visible and independently
> verifiable by every full node.

Each unspent output carries its own spending condition. It gets evaluated
against the transaction that tries to spend it, nothing else. There's no
shared contract state, no storage another script can read, no runtime values
injected from outside. Two nodes with identical UTXO sets will always reach
the same conclusion about validity: that's the property the whole model
is built to preserve.

## The Oracle Problem

Ethereum expanded what contracts can express. Lending protocols, derivatives,
prediction markets, and automated market makers — these all became possible on
a programmable blockchain. But they depend on information that will never
exist natively on-chain: asset prices, interest rate benchmarks, the outcome
of a sporting event, or the results of computation that is too expensive to run
on every node.

An **oracle** is whatever mechanism brings that data into the system.

The problem is structural. A deterministic system that must accept inputs
from outside itself can no longer verify those inputs the same way it verifies
everything else. The contract executes correctly against whatever data it
receives. If that data is wrong, stale, manipulated, or simply inaccurate, the execution produces the wrong outcome. The mistake doesn't happen at the
execution layer. It happens at the data supply layer, and the contract has
no way to distinguish the two.

## Two Different Models of Correctness

Ask a Bitcoin node whether a transaction is valid and you'll get a
deterministic answer derived from public data. Ask again from a different
node and you get the same answer. Ask a year later, still the same. The question has
exactly one correct response and anyone can compute it.

That's not how oracle-dependent systems work. Getting to a correct
answer requires accurate data from the source, honest reporting from node
operators, aggregation that filters bad values before they land onchain, and
a contract that interprets the result correctly. Any of those links can fail,
and the protocol has no way to enforce any of them.

Bitcoin-based oracle constructions sit somewhere between these two models.
Techniques like Discreet Log Contracts and adaptor signatures allow external
events to influence which transaction path gets settled, without ever
importing raw data into the chain. What the protocol verifies is a Schnorr
signature. The event that produced the attestation never touches the chain.

## The Evolution of Bitcoin Oracle Designs

Attempts to bring external data into Bitcoin contracts go back to 2011, well
before Ethereum existed. Developer Mike Hearn proposed using a multisignature
output where one key belongs to an oracle acting as arbiter — the oracle
co-signs whichever payout transaction matches the correct outcome. Simple
enough, but it meant the oracle key appeared in the spending condition,
visible onchain, and the oracle had to be online and cooperative at settlement
time.

Projects like Orisi extended this to larger federations, distributing oracle
responsibility across `m-of-n` key sets to reduce single-point-of-failure
risk. Counterparty went a different direction, encoding oracle and exchange
logic through a metaprotocol embedded in `OP_RETURN` outputs — which promptly
triggered a community debate about blockchain bloat and what Bitcoin's data
layer should be used for.

By 2015, Ethereum launched and most oracle development migrated there. The
EVM's expressive contract model was a better fit for the data-feed pattern.
Bitcoin development continued on a different track: SegWit fixed transaction
malleability, and Taproot in 2021 brought Schnorr signatures to mainnet.
Schnorr is what makes adaptor signatures practical, and adaptor signatures
are what make DLCs work cleanly.

The shift that followed was architectural. Early oracle designs put the oracle
inside the transaction: a visible co-signer, an `OP_RETURN` payload, an
explicit on-chain actor. Modern DLC-based designs push the oracle entirely
offchain. It publishes a commitment before the event, produces an attestation
after, and the chain sees none of it. What gets broadcast is an ordinary
transaction spending an ordinary output.

## Scope of This Guide

This guide works through the trust models, cryptographic mechanics, and
failure surfaces of Bitcoin-native oracle designs, using EVM oracle systems
as the contrasting reference point throughout.

- [Trust Models](/oracle-trust-models/trust-models) covers how correctness is established in each system — including threshold multi-oracle constructions (VweTS) and privacy-preserving oracle designs (DECO). 
- [Oracles in Bitcoin](/oracle-trust-models/oracles-in-bitcoin) gets into the mechanics of how Bitcoin's signature-based approach differs from the EVM data-feed pattern. 
- [Encoding External Events](/oracle-trust-models/encoding-external-events) is the most technically dense section: DLCs, adaptor signatures, nonce commitments, BIP-340, the full construction. 
- [Failure Modes and Tradeoffs](/oracle-trust-models/failure-modes-and-tradeoffs) covers what breaks in each model and why.
