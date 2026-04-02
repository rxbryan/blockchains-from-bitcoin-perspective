---
id: private-state
slug: /midnight-for-bitcoin-devs/private-state
sidebar_position: 3
title: Private State vs Public UTXO
---

# Private State vs Public UTXO

*Part 2 of 4: Midnight for Bitcoin Developers*

---

Bitcoin's transparency is not an accident or a limitation waiting to be fixed.
It is a deliberate design property that enables trustless verification. Anyone
with a copy of the chain can audit any transaction that has ever occurred,
verify any balance, trace any coin's history back to its coinbase. The UTXO set
is a complete, independently verifiable statement of the current ownership of
every satoshi in existence. You don't have to trust anyone to know it's correct.
You verify it yourself.

This transparency has costs. Every payment you make is permanently public. Every
address you've received to is permanently associated with every address you've
sent from, if those transactions are ever linked. CoinJoin, PayJoin, silent
payments, BIP-47: the entire privacy tooling ecosystem in Bitcoin exists to
work around a transparency model that makes privacy difficult by default and
requires active effort to achieve.

Midnight inverts this. Privacy is the default. Public visibility is the
exception that requires an explicit action. Understanding what that means at an
implementation level, not just as a marketing claim, is what this article is
about.

---

## The two-ledger model

In Bitcoin there is one ledger. It's public. Everything on it is visible to
everyone. Your UTXO is on the ledger. When you spend it, the spend is on the
ledger. The chain is the single source of truth and it's globally readable.

Midnight operates two distinct state spaces simultaneously.

The first is the public ledger. This is on-chain, globally readable, and
permanent. Public contract state lives here: counter values, public message
fields, unshielded token balances, anything the contract explicitly designates
as public. This part behaves like what you'd expect from any blockchain. Nodes
agree on it, it's auditable, it cannot be selectively hidden.

The second is private state. By default, private state is stored locally on the
user's machine and is not part of the chain or validator state. It is not
shared with validators as part of normal protocol operation. The chain has no
copy of it. If the user loses it and has no backup or recovery mechanism,
it's gone.

The connection between these two state spaces is the ZK proof. When a user
wants to take an action that modifies public ledger state, they run their
circuit locally against their private state and produce a proof. The proof goes
to the chain. The private state does not. Validators confirm that the proof is
valid for the circuit, that the private state justifies the proposed public
state change, without learning the private state itself.

Because private state is not globally available, correctness relies on users
providing valid proofs at each interaction rather than on shared state
replication. In multi-party interactions, coordination happens through shared
public commitments and proofs rather than shared private state, which introduces
additional complexity for protocol design. This is a different trust model from
Bitcoin, where the full chain state is replicated and independently verifiable
by every node.

For Bitcoin developers this requires a genuine mental adjustment. In Bitcoin, if
something happened on the chain, you can see it. In Midnight, a valid
transaction can reach the chain with private inputs that no validator, no node,
no block explorer, and no chain analyst will ever see. The proof certifies that
a valid private witness exists satisfying the circuit constraints. That's all
the chain ever learns.

---

## What private state actually contains

Private state in a Midnight contract is whatever the contract developer puts
there. It lives in a locally encrypted LevelDB store on the user's machine.
Contracts read from and write to it during circuit execution. None of those
reads or writes appear in the transaction.

This has a backup implication Bitcoin developers should note. In Bitcoin, your
seed is your coins. Lose the seed, lose access, but anyone with the seed can
recover everything from the chain. In Midnight, your seed recovers your wallet
keys but not your local private contract state. If that state is lost and the
contract has no recovery path built into it, you may lose the ability to
interact with that contract even with the seed intact. Private state backups are
the user's responsibility, not the protocol's.

Imagine a contract that authorizes actions based on membership in a set of
secret keys. The authorized keys are stored in a Merkle tree on the public
ledger, but only as commitments, hashes of the keys, not the keys themselves.
When a user wants to prove they are authorized, they run a circuit that:

1. Reads their secret key from local private state
2. Derives the corresponding commitment
3. Proves a Merkle path from their commitment to the tree root
4. Proves they know the secret key corresponding to that commitment

The public transcript records that a valid proof was provided and that the
action was authorized. It records nothing about which key was used, who used it,
or what the key was. Multiple authorized users can interact with the same
contract and none of their interactions are directly linkable on-chain, though
indirect correlation may still be possible depending on usage patterns.

Here is what that looks like in Compact:

```compact
import CompactStandardLibrary;

witness secretKey(): Bytes<32>;
witness findAuthPath(pk: Bytes<32>): MerkleTreePath<10, Bytes<32>>;

export ledger authorizedCommitments: HistoricMerkleTree<10, Bytes<32>>;
export ledger authorizedNullifiers: Set<Bytes<32>>;
export ledger restrictedCounter: Counter;

export circuit increment(): [] {
  const sk = secretKey();
  const authPath = findAuthPath(publicKey(sk));
  assert(authorizedCommitments.checkRoot(
    merkleTreePathRoot<10, Bytes<32>>(authPath)),
    "not authorized");
  const nul = nullifier(sk);
  assert !authorizedNullifiers.member(nul) "already incremented";
  authorizedNullifiers.insert(disclose(nul));
  restrictedCounter.increment(1);
}

circuit publicKey(sk: Bytes<32>): Bytes<32> {
  return persistentHash<Vector<2, Bytes<32>>>(
    [pad(32, "commitment-domain"), sk]);
}

circuit nullifier(sk: Bytes<32>): Bytes<32> {
  return persistentHash<Vector<2, Bytes<32>>>(
    [pad(32, "nullifier-domain"), sk]);
}
```

This example is illustrative. It omits contract-specific domain separation and
context binding that production code requires. Do not use it as-is.

The `witness` keyword marks data that comes from private state, the local
machine, not the ledger. `secretKey()` is never part of any transaction.
`findAuthPath()` computes a Merkle path locally. None of this touches the
chain.

The contract uses `HistoricMerkleTree` rather than a plain `MerkleTree`. The
distinction matters for privacy: a historic tree allows users to prove
membership against a past root, not just the current one. Without it, every
time a new member is added to the tree, all existing members would need to
regenerate their proofs against the new root. The historic variant makes
membership proofs stable across insertions.

What touches the chain is the nullifier, via `disclose()`. The nullifier is a
one-way derivative of the secret key. Knowing the nullifier reveals nothing
about the key. Its presence in the public nullifier set proves this key has been
used, without identifying which authorized key it was.

Bitcoin developers will recognize the commitment/nullifier pattern immediately.
It is structurally identical to what Midnight uses for shielded UTXO spending,
which we covered in part one, and for good reason. It's the same underlying
primitive, applied here to application-level authorization rather than token
ownership.

---

## The disclose() operator: privacy is opt-out, not opt-in

In Bitcoin there is no equivalent of `disclose()` because there is no private
state to disclose from. Everything is already public. The question of what to
reveal doesn't arise at the protocol level.

In Midnight, `disclose()` is the explicit gate between private and public. Any
value that starts in private context, a circuit parameter, a witness value, a
locally computed result, cannot be written to the public ledger without passing
through `disclose()`. The compiler enforces this. Attempting to assign a private
value to a public ledger field without disclosing it is a compile error.

```compact
export ledger message: Opaque<"string">;

export circuit storeMessage(newMessage: Opaque<"string">): [] {
  // newMessage is private -- circuit parameters are private by default
  message = disclose(newMessage);  // explicit transition to public
}
```

This is not just a convention. The type system tracks privacy context. A value
that has not been disclosed cannot flow into a public ledger write. The circuit
cannot accidentally leak private data through a forgotten assignment. The
compiler will catch it.

For Bitcoin developers accustomed to everything being public by default, this
inverts the mental model entirely. In Bitcoin you think about what to hide. In
Midnight you think about what to reveal. The default state of any data in a
Midnight circuit is private. Revealing it requires a deliberate act.

---

## Commitments and hashes as the bridge

Sometimes a contract needs to reference private data in public state without
revealing it. The standard approach is to store a commitment rather than the
value itself.

Compact's standard library provides two primitives for this.

`persistentHash` hashes binary data. `persistentCommit` hashes arbitrary data
together with a random blinding factor. The blinding factor matters. Without it,
an observer who can guess the possible values of private data can hash each
guess and check whether it matches the stored commitment. For data with a small
domain, a binary vote, a small integer, a choice from a known list, the hash
alone provides no real privacy. The blinding factor closes that attack.

```compact
// Vulnerable: observer can try all possible votes
export ledger voteCommitment: Bytes<32>;
circuit commitVote(vote: Boolean): Bytes<32> {
  return persistentHash<Boolean>(vote);  // brute-forceable
}

// Sound: blinding factor prevents enumeration
witness blindingFactor(): Bytes<32>;
circuit commitVote(vote: Boolean): Bytes<32> {
  return persistentCommit<Boolean>(vote, blindingFactor());
}
```

The blinding factor must come from private state. If it were public, it would
just shift the enumeration attack to the blinding factor. This is a subtle
failure mode that Midnight's docs flag explicitly, and it's the kind of thing
that bites developers coming from systems where the question doesn't arise
because everything is already public.

---

## Shielded vs unshielded tokens: a design decision, not a fixed property

In Bitcoin, all transactions are public. There is no per-transaction privacy
setting. The UTXO is either spent or not. The amount is visible. The addresses
are visible.

In Midnight, token privacy is a choice made at the application and transaction
level. NIGHT tokens can be shielded or unshielded. The same token can move
between shielded and unshielded states. A contract can receive shielded tokens,
process them privately, and emit unshielded tokens, or the reverse. This is
not a workaround. It is the intended design.

Unshielded tokens behave like Bitcoin UTXOs: amounts and addresses are
transparent, visible on-chain, verifiable by anyone. They are appropriate for
any scenario requiring auditability: exchange listings, public treasuries,
compliance-visible payments.

Shielded tokens use the nullifier/commitment scheme from part one. Amounts and
ownership are hidden. The proof enforces conservation under the assumptions of
the circuit and proof system, but an observer cannot determine who sent what
to whom or how much moved.

Midnight also provides viewing keys. A shielded transaction can be made
selectively auditable by creating a viewing key and sharing it with an
authorized party: a regulator, an auditor, a counterparty. Viewing keys are
derived from the spending key, so the user retains full control over who can
see what. The viewing key allows the holder to view the transaction's private
details as defined by the protocol, without enabling them to spend the
underlying tokens. Full privacy by default, selective disclosure by choice.

Bitcoin does not provide an equivalent mechanism natively at the protocol level.
Taproot and silent payments improve privacy against passive chain analysis, but
they do not provide selective disclosure to a specific authorized viewer without
also exposing the data to everyone. Midnight's viewing key is a fundamentally
different capability.

---

## What you lose: the auditability tradeoff

Bitcoin's transparency is also its strongest auditability story. Anyone can
verify the supply cap. Anyone can trace any coin from genesis. Anyone can
confirm that no inflation occurred. The chain is self-evidently correct to any
observer with the full chain and the validation rules.

Midnight's privacy model splits this auditability into two distinct properties.
Supply conservation is still verifiable: the proof enforces conservation under
the assumptions of the circuit and proof system. Transaction traceability is
not: an outside observer cannot determine who sent what to whom, what amounts
moved, or what path value took through the system. The what is preserved. The
who and how are not.

For Bitcoin developers who treat transparent auditability as a core security
property, this is a real tradeoff and worth naming honestly. Midnight's answer
is that the ZK proof provides cryptographic assurance for supply integrity
rather than observational transparency. Whether you find that satisfying depends
on your threat model and your trust in the underlying cryptographic assumptions.

The supply cap is still enforced. Value conservation is still enforced. But the
path that value took to get where it is may be permanently private. That's the
privacy guarantee working as intended. It's also the thing a Bitcoin maximalist
will point to as a reason to be skeptical, and that skepticism is not
unreasonable.

---

## What to take away

Private state in Midnight is not a layer on top of a public system. It is a
first-class part of the protocol, enforced at the type system level, stored
locally, and not directly posted to the chain. The `disclose()` operator is the
explicit boundary between private and public, and the compiler enforces it.
Commitments, Merkle trees, and nullifiers are the toolkit for bridging the two
state spaces without leaking information across them.

Coming from Bitcoin, the deepest adjustment is not technical. It's a shift in
the default assumption. In Bitcoin, data starts public and privacy requires
work. In Midnight, data starts private and publicity requires a deliberate act.
Every API you design, every state variable you declare, every value you compute
in a circuit: the first question is not "how do I protect this?" but "does
this need to be revealed at all, and to whom?"

[Part 3](/midnight-for-bitcoin-devs/night-dust) covers the NIGHT/DUST economic
model, a resource constraint mechanism that is superficially similar to
Bitcoin's fee market but designed around completely different principles, with
very different implications for application cost predictability.