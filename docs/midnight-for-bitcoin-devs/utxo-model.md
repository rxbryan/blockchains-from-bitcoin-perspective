---
id: utxo-model
slug: /midnight-for-bitcoin-devs/utxo-model
sidebar_position: 2
title: The UTXO Model Through Bitcoin Eyes
---

# Midnight's UTXO Model Through Bitcoin Eyes

*Part 1 of 4: Midnight for Bitcoin Developers*

---

If you've spent serious time in Bitcoin, Midnight's documentation will do
something mildly irritating. It will explain UTXO to you using the cash
metaphor. You have a $5 bill. You can't tear it in half. You receive change.
There's a helpful diagram.

This series assumes you already know what a UTXO is. It starts where
Midnight's own docs don't: at the point where the model actually diverges
from what you know, and what those divergences mean in practice for
developers who have built on Bitcoin.

---

## The familiar parts

The foundation is genuinely familiar. Midnight is UTXO-based. NIGHT tokens,
the network's native token, exist as discrete unspent outputs. Transactions
consume inputs and create outputs. Nothing about that requires explanation
if you've read the Bitcoin whitepaper.

Atomicity works the same way. Either all inputs are consumed and all outputs
are created, or nothing happens. There is no partial execution, no rollback,
no intermediate state that other transactions can observe. A Bitcoin
developer's instinct here is correct.

Parallelism follows from the same structural property. Transactions touching
independent UTXOs have no shared mutable state between them and can be
processed simultaneously at the model level. This is not a feature Midnight
added. It's a property that comes for free from the UTXO model itself, just
as it does in Bitcoin. Where Ethereum must sequence transactions that touch
the same account because they share global state, Midnight transactions
compete only when they literally try to spend the same output.

Validation does not require replaying full chain history. The UTXO set
itself does not track spent outputs. If an output is not in the set, it has
either been spent or never existed. A node validating a new transaction
needs the current UTXO set and the transaction itself, not a full replay
of prior blocks.

So far, so home. Now for where it diverges.

---

## The nullifier set: how Zswap shields token transfers

In Bitcoin, when a UTXO is spent it is removed from the UTXO set. The set
tracks what exists. If it's not in the set, it's either been spent or never
existed, and those are the same thing from a validation standpoint. This is
elegant. The UTXO set is bounded by the number of unspent outputs, not by
total transaction history.

The reason this works in Bitcoin is that every input explicitly references
the UTXO it is spending by txid and output index. The reference is public.
The UTXO being consumed is identified. Any node can look it up, verify the
spending condition, and remove it from the set.

Midnight introduces Zswap, a shielded token transfer mechanism derived from
Zerocash. When tokens move through Zswap, the sender, receiver, amount, and
token type are all hidden from on-chain observers. Wallet addresses and
transaction details are not disclosed. This is what shielded transfers give
you: the ability to transact without exposing metadata to counterparties or
to the public ledger.

But shielding creates a problem Bitcoin doesn't have. You want to prove you
are spending a valid output without revealing which one. You cannot reference
the UTXO by txid and output index without pointing directly to it. The
public reference is what makes Bitcoin's removal approach possible, and it
is also what destroys the privacy. If you've thought seriously about
CoinJoin's limitations, this is the same problem one level deeper. CoinJoin
obscures the mapping between inputs and outputs within a transaction but the
inputs themselves are still publicly referenced. An observer watching the
UTXO set can still identify which coins are moving.

Midnight solves this with a nullifier set. Instead of referencing a UTXO
directly, the spender computes:

```
nullifier = Hash(UTXO_commitment, ownerSecret)
```

This nullifier is added to a global set that only ever grows. Double-spend
prevention works by set membership, the nullifier being present indicates
the UTXO has been spent and the transaction is rejected. The ZK proof
certifies that the spender owns a coin that exists in the commitment tree,
without identifying which coin it is or who owns it.

On-chain, the nullifier set is opaque. A watching node sees hashes entering
an append-only set. Which coins moved, who owned them, and what values were
transferred are not recoverable from that data. Timing correlations and
usage patterns can still leak information at the application layer depending
on how a contract is built, but the ledger does not directly disclose
anything about the transfer.

The tradeoff is storage. Bitcoin's UTXO set shrinks as outputs are spent.
Midnight's nullifier set never shrinks. Every Zswap transfer leaves a
permanent entry. Over time this grows without bound. That is the cost of
the privacy property, and it is a deliberate design decision borrowed from
the Zcash lineage. Midnight's Zswap protocol derives from Zcash Sapling,
which introduced the same nullifier construction. Midnight chose to inherit
that tradeoff with eyes open.

One important distinction from Zcash: while the nullifier construction
derives from Zcash Sapling, Midnight's Compact contracts can interact
directly with the shielded pools. In Zcash, shielded pools and smart
contract logic have historically been separate concerns. In Midnight they
are integrated: a contract can receive, hold, and send shielded tokens as
part of its logic.

The practical consequence for node operators is real. A pruned Bitcoin node
needs only the current UTXO set to validate new blocks. A Midnight full node
must retain the entire nullifier set indefinitely. The privacy guarantee and
the storage cost are the same tradeoff.

---

## eUTXO: the Cardano inheritance and what it changes

Midnight is built as a partner chain to Cardano and inherits Cardano's
extended UTXO model rather than Bitcoin's original. The extension changes
what a UTXO can carry and therefore what spending conditions can express.

In Bitcoin, a UTXO carries two things: a value in satoshis, and a locking
script (scriptPubKey). The spending condition is entirely encoded in the
script. This is intentional. Bitcoin Script is deliberately limited in
expressiveness, Turing-incomplete by design, and that constraint is a
security property. A Bitcoin Script can express simple conditions cleanly:
single signature, multisig, hash preimage, timelock, combinations of these.
What it cannot do cleanly is carry application state across transactions.

Bitcoin Script has no native way to carry state from one transaction to the
next. Lightning channels illustrate this clearly. Channel state is
coordinated off-chain between the two parties, but it is enforceable
on-chain via pre-signed commitment transactions. The off-chain coordination
exists precisely because Bitcoin Script cannot thread state natively through
a sequence of transactions. Covenant proposals like OP_CHECKTEMPLATEVERIFY
address this by constraining what future transactions can look like, but
they require reasoning about the full spending graph ahead of time. State
that needs to travel with a UTXO either gets encoded in the script itself,
which hits size limits quickly, or gets anchored to an OP_RETURN output and
reconstructed off-chain. In both cases a verifier has to reconstruct
application state from the transaction graph rather than reading it directly
from the output being spent.

Cardano's eUTXO model adds a third field to every output: a datum. The
datum is arbitrary structured data that travels with the UTXO and is
available to the spending script at validation time as a first-class input.
The output being spent carries its own context.

Concretely: a UTXO representing a vote carries the voting parameters. A
UTXO representing a DeFi position carries the position details. The spending
script reads the datum, validates that the proposed transition is valid, and
the output UTXO carries the updated datum. The state transition is
self-contained and auditable without off-chain reconstruction.

The datum is a tradeoff, not an upgrade. eUTXO adds expressiveness at the
cost of complexity. UTXOs are heavier, spending conditions more involved,
and coordination overhead increases when multiple parties interact with
shared state. For a Bitcoin developer whose priority is security and
trustlessness through simplicity, these are real costs worth weighing.

Where the datum earns its complexity is in applications that genuinely need
to thread state across a sequence of transactions. For simple value transfer
Bitcoin's lean UTXO is strictly better. For stateful protocol logic the
datum makes things more tractable. "More tractable" is not the same as
"better" and a Bitcoin developer is right to be skeptical of the tradeoff
until they have a specific application that needs it.

Midnight inherits the datum and extends it further. A Midnight UTXO's datum
has a public component on-chain and a private component stored only on the
owner's machine. The ZK proof attached to a transaction proves the private
state justifies the proposed public state transition without revealing it.
This is covered in depth in part two.

---

## Smart contract execution: where Bitcoin scripts end and Midnight circuits begin

Both Bitcoin Script and Midnight circuits are mechanisms for enforcing
conditions on state transitions. In Bitcoin, a script encodes the spending
condition directly on the UTXO. Every node executes that script independently
when the UTXO is spent. Validation is distributed re-execution. The opcode
set is deliberately constrained, which keeps the attack surface small and
makes every script formally analyzable. But the execution happens on-chain,
by every validating node, every time.

Midnight takes a different approach. Instead of storing executable logic
on-chain, Midnight stores a verifier key for each contract entry point. The
logic runs off-chain on the user's machine as a Compact circuit and produces
a ZK proof of correct execution. That proof, together with a public
transcript of the state changes it authorizes, is what gets submitted to
the chain. Validators verify the proof against the stored verifier key. They
never re-execute the logic.

The practical difference is in what the chain stores and what it receives.
In Bitcoin, the locking script sits on the UTXO. The spending transaction
provides witness data. Every node runs the script against the witness and
reaches the same result independently.

In Midnight, the chain stores a verifier key derived from the compiled
circuit. The user runs the circuit locally with their private inputs,
produces a proof, and submits a public transcript of the state changes
alongside it. The chain checks the proof against the verifier key and
applies the state changes described in the transcript. The private inputs
never appear anywhere. The locking script is replaced by a verifier key.
The witness stack is replaced by a proof. The script interpreter is replaced
by a proof verifier.

One property this shares with Bitcoin that Ethereum does not: local
determinism. If a proof validates correctly on your machine, it will
validate on-chain, barring a double-spend. You know before broadcasting
whether the transaction will succeed. Ethereum's gas estimation model
offers no such guarantee.

The performance implication follows directly. In Bitcoin, complex scripts
mean expensive on-chain validation. Every byte of script logic is executed
by every validating node. In Midnight, circuit complexity increases proof
generation time on the submitter's machine. Proof verification on validators
involves elliptic curve operations and is more expensive than a simple
signature check, but significantly cheaper than generating the proof. The
expensive work shifts from the network to the user submitting the
transaction.

This is not an upgrade over script execution. It is a different set of
tradeoffs. Script execution is cheap, transparent, and every node can
independently verify every transaction by running the same deterministic
computation against public inputs. ZK systems shift verification from
re-execution to cryptographic assurance, replacing deterministic replay with
assumptions about the proving system. Bitcoin's cryptographic assumptions
are well-understood and can be reasoned about with standard mathematics.
ZK proof systems involve more complex primitives that require more
specialized knowledge to audit. What you gain is expressiveness and privacy.
What you give up is the simplicity of verification that any node can perform
by running a script.

---

## Two token types, one chain, and what account-based actually means here

Midnight runs two token systems simultaneously, and understanding the
distinction matters more than the labels suggest.

NIGHT is the native ledger token. It exists as a public, unshielded UTXO
on the base ledger. Sender, receiver, and amount are all visible on-chain,
similar to a Bitcoin UTXO. NIGHT is the capital asset of the network. You
hold it to generate DUST, stake it to participate in consensus, and it will
be used for governance once that mechanism is live. When NIGHT moves through
Zswap, the transfer is shielded by the commitment/nullifier mechanism
described earlier. DUST, the fee resource, is always shielded. These are
distinct transfer paths, not properties of the token itself.

The docs draw a useful distinction here. Unshielded ledger tokens like NIGHT
are designed for transparency: exchanges, public treasuries, any scenario
requiring auditability. Shielded ledger tokens are the Zswap coins: private
peer-to-peer transfers where sender, receiver, and amount are all hidden.
Both are UTXO-based at the protocol level. The difference is whether the
transfer goes through the base unshielded ledger or through the Zswap
commitment/nullifier mechanism. NIGHT can move either way depending on
context. DUST always moves through the shielded path.

Midnight also supports contract tokens, which use an account-based data
model: balance mappings rather than discrete UTXOs. For Bitcoin developers,
"account-based" means shared mutable state, which means ordering dependencies
and the concurrency problems that follow. That concern is real but partially
addressed. Midnight handles this better than traditional account models
because many useful operations are commutative. Commutative operations, like
incrementing a counter, produce the same result regardless of execution
order, so simultaneous transactions do not conflict. Non-commutative
operations, like read-then-write sequences, still contend. The transcript
model minimizes conflicts where the underlying operations allow it, not
universally.

The important clarification is that **account-based refers to the data
model, not the validation mechanism**. Contract token transactions go
through the same ZK proof and public transcript system described in the
previous section. The chain stores a verifier key, not executable code.
Nodes verify proofs. The concurrency risk comes from shared mutable state,
not from how the execution is validated.

It is worth being precise about which Ethereum failure modes Midnight's
approach addresses and which it does not. Classic reentrancy attacks require
re-entrant contract calls during execution. Midnight's transcript model and
the current absence of cross-contract interaction make this attack surface
very small at mainnet launch, though this will need revisiting when
cross-contract interaction ships. Storage collision vulnerabilities are an
EVM-specific artifact of how Solidity maps state variables to storage slots.
Compact does not use the same storage model so this class of bug does not
apply. Upgrade proxy vulnerabilities are eliminated entirely because Compact
circuits are immutable after deployment. You cannot upgrade a deployed
contract. Bitcoin developers will consider that a feature.

What Midnight does not solve is the fundamental risk of shared mutable
state. Ordering dependencies, concurrency conflicts, and complex state
interaction bugs exist wherever multiple parties write to the same state,
regardless of how that state is validated. The ZK proof guarantees the
circuit ran correctly. It does not guarantee the circuit was designed
correctly.

The honest framing is this: contract tokens are an opt-in feature for
applications where richer state management is genuinely necessary. Complex
DeFi logic, governance systems, anything requiring intricate balance
accounting. The UTXO core is unaffected. A developer building a payment
protocol has no reason to touch contract tokens. A developer building an
AMM probably needs them and accepts the tradeoffs that come with shared
state.

Bitcoin's position, that mutable global state is a liability and the
constraint toward simpler models is a security property, is not wrong.
Midnight's position is that the constraint is too expensive for certain
application categories. That is a legitimate disagreement and reasonable
developers land on different sides of it depending on what they are
building.

---

## What to take away

The UTXO foundation in Midnight is real and the familiar properties hold.
The nullifier set is a genuine architectural extension that enables shielded
transactions Bitcoin does not natively support without significant protocol
changes or additional layers. The eUTXO datum makes stateful protocol design
more tractable for certain application categories, at the cost of complexity
that Bitcoin deliberately avoids. The shift from script execution to ZK proof
verification changes both the trust model and the performance profile: work
moves off-chain, cryptographic assumptions replace deterministic replay, and
expressiveness increases at the cost of auditability simplicity.

The hybrid token model is where reasonable Bitcoin developers will disagree,
and that is a legitimate disagreement about risk tolerance and application
scope rather than a technical misunderstanding.

[Part 2](/midnight-for-bitcoin-devs/private-state) covers what private
state actually means when you're coming from a system where every satoshi
movement is permanently public, which is where the real conceptual distance
between Bitcoin and Midnight opens up.