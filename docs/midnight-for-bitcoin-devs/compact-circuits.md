---
id: compact-circuits
slug: /midnight-for-bitcoin-devs/compact-circuits
sidebar_position: 5
title: Compact Circuits vs Bitcoin Script
---

# Compact Circuits vs Bitcoin Script

*Part 4 of 4: Midnight for Bitcoin Developers*

---

Bitcoin Script is not a programming language in the conventional sense. It has
no loops. It has no recursion. It cannot call external functions. It cannot read
chain state beyond the UTXO being spent. It cannot store intermediate values
between transactions. Every one of these constraints is intentional, and every
one of them is a security property.

The constraints exist because Bitcoin's threat model includes the validator. A
validator running an unbounded computation is a denial-of-service vector. A
script that reads arbitrary chain state creates ordering dependencies that break
the UTXO model's parallelism. Loops create halting problem risks. Recursion
creates stack overflow risks. The Turing-incompleteness of Bitcoin Script is not
a limitation of ambition. It's an explicit design goal, chosen to make
validation cheap, predictable, and safe.

Compact circuits are not subject to the same constraints. They can express
arbitrarily complex computation, but only within fixed bounds determined at
compile time. They are capable of reading private local state and can implement
complex control flow including conditionals and function calls. They are compiled
to ZK circuits before deployment, which means the computational bounds are fixed
at compile time rather than determined at runtime.

This article is not going to argue that Compact is better than Bitcoin Script.
It is going to explain precisely what each can express, where the boundaries
are, and what a Bitcoin developer needs to understand about the difference.

---

## What Bitcoin Script actually does well

Before comparing, it's worth being precise about what Bitcoin Script is
optimized for, because the comparison only makes sense in context.

Bitcoin Script's primary job is to express spending conditions on UTXOs. It
answers one question: given these inputs, is this UTXO authorized to be spent?
The conditions it can express cleanly are:

Single signature — check that a provided signature validates against a known
public key:

```
OP_DUP OP_HASH160 <pubKeyHash> OP_EQUALVERIFY OP_CHECKSIG
```

Multisig — check that M of N provided signatures validate:

```
OP_2 <pubKey1> <pubKey2> <pubKey3> OP_3 OP_CHECKMULTISIG
```

Hash preimage — check that a provided value hashes to a known commitment:

```
OP_SHA256 <hash> OP_EQUAL
```

Timelock — check that the transaction is not broadcast before a specified
block height or timestamp:

```
<locktime> OP_CHECKLOCKTIMEVERIFY OP_DROP OP_DUP OP_HASH160 ...
```

Taproot allows more complex spending conditions through script trees, but the
individual leaf scripts are still constrained to the same primitive set.
Miniscript formalizes the composition of these primitives into a policy language
with provable security properties and analyzable spending complexity.

All of these conditions share a property: they can be verified in bounded time
with bounded computation. A validator executing any valid Bitcoin Script knows
it will terminate and knows approximately how expensive it will be before
starting. This is not an accident.

What Bitcoin Script cannot do is equally important to understand. It cannot
verify that a signature was made under a particular private key that also
satisfies some other property. The verification happens against a public key,
and the relationship between the private key and any other data is opaque to the
script. It cannot read the values of other UTXOs during validation. It cannot
carry application state from one transaction to the next without encoding it in
the script itself or in an OP_RETURN output. It cannot implement a loop. It
cannot call a function defined elsewhere.

These are not bugs. They are the surface area of what Bitcoin Script is designed
to do, drawn deliberately small.

---

## What a Compact circuit is

A Compact circuit is a function that compiles to a zero-knowledge circuit. It
takes public inputs, private inputs (witnesses), and produces public outputs and
a ZK proof that the computation was performed correctly.

The structure of a Compact contract has three distinct contexts:

```compact
pragma language_version 0.22;

import CompactStandardLibrary;

// 1. Ledger: public on-chain state
export ledger authority: Bytes<32>;
export ledger value: Uint<64>;
export ledger state: State;
export ledger round: Counter;

// 2. Witness: private local state, from the user's machine
witness secretKey(): Bytes<32>;

// 3. Circuit: the computation that bridges them
export circuit set(v: Uint<64>): [] {
  assert(state == State.UNSET, "Attempted to set initialized value");
  const sk = secretKey();           // reads from private local state
  const pk = publicKey(round, sk);  // computes locally, never posted
  authority = disclose(pk);         // explicitly transitions to public
  value = disclose(v);
  state = State.SET;
}
```

The `witness` keyword marks data that comes from the user's local machine and
never appears in any transaction. The circuit computes over both public ledger
state and private witness data. The `disclose()` operator is the explicit
boundary. Only values that pass through `disclose()` can be written to the
public ledger. The compiler enforces this at the type level.

For a Bitcoin Script developer, the closest mental model is this: imagine a
Bitcoin Script that could verify not just "does this signature validate against
this public key" but "does this secret key, which I will never reveal, hash to
this public key AND satisfy this additional predicate that involves data I'm
also not going to reveal?" The ZK proof provides exactly that capability. The
circuit verifies the computation. The proof certifies it happened correctly.
Neither the secret key nor the private predicate inputs ever appear on-chain.

---

## Fixed bounds at compile time, not at runtime

Compact circuits can express arbitrarily complex computation, but only within
fixed bounds determined at compile time. This is a critical distinction from
both Bitcoin Script and Ethereum's runtime model.

In Ethereum, expressiveness at runtime means validators must execute arbitrary
Solidity bytecode, which requires gas limits to prevent infinite loops. The gas
limit is a runtime mechanism that caps computation per transaction. Bitcoin
avoids this entirely by making the language Turing-incomplete. There is nothing
to bound because loops don't exist.

Compact takes a third path. The circuit is fixed at compile time. The verifier
key is derived from the compiled circuit and stored on-chain. The circuit cannot
change after deployment. Any loops or recursion in the Compact source code are
unrolled at compile time into a fixed-size circuit with a fixed number of
constraints. If your circuit has a loop that runs N times, the compiler produces
N copies of the loop body as circuit constraints. The validator verifies a proof
against this fixed circuit and does not execute anything.

The practical consequence: circuit complexity is bounded at compile time, not
capped at runtime. If you write a circuit that loops 10,000 times, the compiler
produces a very large circuit with 10,000 unrolled constraint sets. Compilation
takes longer. Proof generation takes longer. But validation cost does not scale
with circuit complexity in the way execution-based systems do. Verifying a ZK
proof is effectively constant cost regardless of what the circuit computes.

This is different from Bitcoin Script's bounded computation and different from
Ethereum's gas-limited runtime computation. It's a third model: arbitrary
expressiveness at development time, fixed cost at validation time, with proof
generation cost paid by the user who submits the transaction.

---

## Witnesses: the private input mechanism Bitcoin Script doesn't have

Bitcoin Script receives its inputs from the scriptSig or witness stack. These
inputs are public. They appear in the transaction and are visible to all nodes.
The script verifies them and either accepts or rejects the spend. There is no
mechanism in Bitcoin Script for an input to be private.

Compact's `witness` mechanism is the native equivalent. A witness is a value
that comes from the user's local machine. The contract declares a witness but doesn't implement it. The implementation is the job of the TypeScript DApp code running locally. The contract only cares about the type and how the value is used in the circuit:


```compact
// Declaration in contract — type only, no implementation
witness secretKey(): Bytes<32>;

// Usage in circuit — the value is private, never in the transaction
export circuit clear(): [] {
  const sk = secretKey();
  const pk = publicKey(round, sk);
  assert(authority == pk, "not authorized");
  state = State.UNSET;
  round.increment(1);
}
```

The TypeScript implementation that provides the witness value runs on the user's
machine before transaction submission:

```typescript
// TypeScript DApp code — provides the witness value locally
const witnesses = {
  secretKey: (): Uint8Array => {
    return loadSecretKeyFromLocalStorage();
  }
};
```

The secret key is read from local storage, used in the circuit computation,
and never posted anywhere. The ZK proof certifies that whoever submitted this
transaction knows a secret key whose hash matches the stored `authority` value.
The key itself is not recoverable from the proof.

Because witness generation lives entirely in client code, different
implementations may produce different valid witnesses for the same logical
action. The contract will accept any that satisfy the circuit constraints, which
can lead to inconsistencies across clients if witness generation is not carefully
standardized. This is a real-world failure mode that Bitcoin developers won't
encounter with Script, where the inputs are fully specified by the locking
condition itself.

For Bitcoin developers who have implemented Miniscript policies: the witness
mechanism generalizes what Miniscript does with spending conditions. Miniscript
formalizes which keys and preimages must be provided. Compact witnesses
generalize this to arbitrary private data, not just signatures and preimages,
but any local value the circuit needs to compute over, including Merkle paths,
private state, application-specific secrets.

---

## The round counter: linkability prevention Bitcoin Script ignores

The contract example above includes a `round` counter that is incremented on
each `clear` operation. Its purpose is not functional. It's privacy.

Without the round counter, the `publicKey` computation would produce the same
hash for the same secret key every time. An observer watching the ledger could
see that `authority` contains the same value in two different rounds and
conclude they were set by the same user. No information about the secret key is
leaked, but linkability between rounds is.

With the round counter included:

```compact
circuit publicKey(round: Field, sk: Bytes<32>): Bytes<32> {
  return persistentHash<Vector<3, Bytes<32>>>(
    [pad(32, "midnight:examples:lock:pk"), round as Bytes<32>, sk]);
}
```

Different rounds produce different public keys even for the same secret key.
The rounds are unlinkable by an on-chain observer. The user is re-pseudonymized
on each interaction. This pattern improves unlinkability, but introduces
additional state management and requires careful coordination in multi-user
contracts to avoid race conditions around the counter.

Different rounds produce different public keys even for the same secret key. The rounds are unlinkable by an on-chain observer. The tradeoff is real though: the round counter adds state to
manage and creates coordination complexity in contracts where multiple
users interact with the same counter simultaneously.

Bitcoin Script sidesteps this entirely because it has no persistent state.
Each spend is independent. If you want unlinkability in
Bitcoin, you use separate keys for separate transactions, a well-established
privacy practice but one implemented at the wallet layer, not the script layer.
In Midnight, unlinkability is a contract-level concern, and the pattern for
achieving it is encoded directly in the circuit logic.

---

## What Compact cannot do that Bitcoin Script takes for granted

Compact circuits have meaningful constraints that Bitcoin developers will notice.

**No introspection of other contracts during circuit execution.** A Compact
circuit operates on the contract's own ledger state and the witness values
provided locally. At present, circuits cannot read external contract state
during execution. Cross-contract interaction is an active area of development.

**No runtime dynamism in circuit structure.** Because circuits are compiled to
fixed constraint sets, the structure of computation must be known at compile
time. You cannot write a circuit that decides at runtime whether to perform 10
iterations or 100. You must write two circuits, or bound the iteration at a
fixed maximum and use conditional logic within the fixed bounds.

**Proof generation time is not free.** Bitcoin Script execution is
near-instantaneous. Compact circuit execution, proof generation, runs on the
user's machine and takes seconds to minutes depending on circuit complexity. For
applications with real-time interaction requirements, proof generation latency
is a design constraint that Bitcoin developers don't face.

**The security model of witnesses depends on local implementation.** The
contract only specifies that a witness has a certain type. The contract has no
way to verify that the TypeScript implementation of the witness is doing the
right thing. It only verifies that the value produced satisfies the circuit
constraints. The user must trust their own DApp implementation to produce
correct witness values. Beyond correctness, private state cannot be audited
from on-chain data alone, which makes debugging subtly wrong witness behavior
harder than debugging a misbehaving Bitcoin Script.

---

## The security comparison: simplicity vs expressiveness

Bitcoin Script's security case rests on simplicity. A small opcode set means a
small attack surface. Formal analysis tools like Miniscript can exhaustively
analyze the spending conditions of any script. The behavior of any Bitcoin
Script is fully determined by public inputs, fully auditable, and
straightforwardly verifiable.

Compact's security case rests on cryptographic assumptions and compiler
correctness. The ZK proof guarantees that the circuit ran correctly, but that
guarantee is only as strong as the underlying proof system. The circuit itself
must be written correctly. Bugs in the circuit logic are equivalent to bugs in
a smart contract, with the added complexity that some of the logic operates over
private state that cannot be audited from on-chain data alone.

The trusted setup question is worth naming directly. ZK-SNARK systems require
a trusted setup ceremony to generate the proving parameters. If the setup is
compromised and toxic waste is retained, it becomes possible to forge proofs.
Midnight uses a universal SRS (structured reference string) to mitigate this,
which requires trusting the setup of the universal parameters rather than
per-circuit setups. The security argument is strong but it is a cryptographic
argument, not an observational one. Bitcoin's security arguments are largely
observational. You can verify them by running the code.

This is not a reason to dismiss Compact. It's a reason to understand the
different trust foundation. Bitcoin Script says: anyone can verify this.
Compact says: cryptographic proofs attest that this computation was executed
correctly. Both are valid security properties. They require different
verification approaches and rest on different assumptions.

---

## What to take away

Bitcoin Script is deliberately narrow. It solves the spending condition problem
with a minimal surface area and makes that surface amenable to formal analysis.
The narrowness is the point.

Compact circuits are deliberately expressive. They can operate over private
inputs, implement complex control flow, carry state across rounds, and express
spending conditions that have no Bitcoin Script equivalent. The expressiveness
is the point.

The tradeoffs follow directly. Script's narrowness means simplicity,
auditability, and validation that requires no cryptographic assumptions.
Compact's expressiveness means proof generation cost, compiler trust,
cryptographic assumptions, and a larger surface area for subtle bugs in circuit
logic.

Neither is universally superior. For verifying that a signature matches a key,
Bitcoin Script is overkill in the good direction. It does exactly what's needed
with no excess complexity. For verifying that a user holds a secret key that
also satisfies a complex application-level predicate over private data, Bitcoin
Script cannot do it at all. Compact can.

The question for a Bitcoin developer evaluating Midnight is not whether Compact
is better than Bitcoin Script. It's whether the applications you want to build
require the expressiveness Compact offers, and whether you're comfortable with
the different trust model that expressiveness requires.

---

*This is the fourth and final article in the Midnight for Bitcoin Developers
series. The complete series covers the [UTXO model](/midnight-for-bitcoin-devs/utxo-model),
[private state](/midnight-for-bitcoin-devs/private-state),
the [NIGHT/DUST economic model](/midnight-for-bitcoin-devs/night-dust),
and Compact circuits.*