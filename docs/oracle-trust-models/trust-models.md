---
slug: /oracle-trust-models/trust-models
---

# Trust Models

How does a system decide that a transaction is valid? The answer turns out to
differ significantly between Bitcoin and oracle-dependent blockchains — not
just in implementation, but in the assumptions each model is built on.

## Trust in Self-Contained Systems

Bitcoin's answer is simple enough to state in one sentence: a transaction is
valid if every node, given only the transaction data and the current UTXO set,
reaches the same conclusion by applying the same rules. No external query.
No third party. The same inputs always produce the same verdict.

The reason this works is less about cryptography and more about scope.
Everything a node needs to reach a verdict (signatures, spending conditions,
timelocks) is already in the transaction or the chain state. Nothing has to
be fetched. Nothing external is trusted. The node just runs the rules against
the data it already has, and the answer is either yes or no.

## Bitcoin Script and Explicit Spending Policies

Spending conditions in Bitcoin are encoded directly into each output's
`scriptPubKey` at creation time and evaluated against the `scriptSig` or
witness data at spend time. The range of conditions that Script can express
covers most practically useful cases:

Single-key authorization requires one signature from a specific public key.
Multi-party authorization uses `OP_CHECKMULTISIG` or, in Tapscript,
`OP_CHECKSIGADD` to require `m-of-n` signatures from a defined key set.
Timelocks are enforced at the protocol level via `OP_CHECKLOCKTIMEVERIFY`
and `OP_CHECKSEQUENCEVERIFY`, making time-conditional paths a first-class
feature rather than an application-level convention. Hash preimage conditions
— used in HTLCs and cross-chain atomic swaps — tie spending to knowledge of
a secret value satisfying `OP_HASH160` or `OP_SHA256`.

Taproot (BIP-341) extended this further. Complex policies can be committed
to as a Merkle tree of script leaves (MAST), with only the executed path
revealed at spend time. A contract with ten spending conditions only discloses
the one that was actually used. Everything else remains private.

Miniscript adds a formal policy language on top of this. Given a Miniscript
expression, you can statically determine which key combinations authorize a
spend, what timelock constraints apply to each path, and whether the policy
is satisfiable at all, before any funds are committed. These guarantees come
from the protocol, not from trusting anyone to execute the policy correctly.

## Trust in Oracle-Based Systems

EVM-based contracts can encode logic that Bitcoin Script cannot: persistent
state, loops, arbitrary computation. That expressiveness is what makes lending
protocols and derivatives possible. It also creates a dependency that
Bitcoin by design avoids: contracts need data that does not exist onchain.

The mechanics vary by design. In push oracle systems, data providers post
values directly to a storage contract and consuming contracts read from it.
Pull-based designs flip the direction: a contract requests a value and
receives a response, usually through a commit-reveal scheme that makes
front-running harder. Aggregation networks add another layer: multiple
independent node operators each fetch and sign values independently, and
an on-chain contract combines their responses and filters statistical
outliers before surfacing the final result.

None of these are cryptographic proofs. The guarantee is probabilistic,
grounded in economic incentives and the operational assumption that a
sufficient threshold of independent participants won't be compromised at
the same time.

## Attestation-Based Trust in Bitcoin

DLC-style constructions bypass the data import problem entirely. Rather than
posting a result to a contract, the oracle acts as a cryptographic trigger.
By publishing a commitment before an event and a signature after,
the oracle provides the exact scalar needed to authorize one specific,
pre-calculated transaction path.

To secure the contract, the oracle anchors itself to a specific secret $k$ by publishing a nonce public key $R = kG$ for every outcome ahead of time. Any attempt to swap that secret after $R$ is public would invalidate the final signature.

When the event concludes, the oracle reveals the signature $s$ by combining its private key $x$ with that pre-committed $k$. This produces the scalar $s = k + H(R, P, \text{outcome}) \cdot x$, which serves as the final "key" needed to settle the transaction. Because the participant's CETs (Contract Execution Transactions) were locked specifically to that $R$ value, only the signature derived from the original $k$ can satisfy the contract.

Since the parties built their CETs using adaptor signatures locked to the
anticipated value of $s$ for a given outcome, the oracle's signature
doesn't just "inform" the contract: it mathematically completes it.

:::note On-Chain Privacy
The network doesn't "see" the oracle or the event. It's just verifying a standard Schnorr signature against a spending script. Since the signature is indistinguishable from any other, the contract's actual logic stays off-chain.
:::

## Threshold Multi-Oracle Constructions (VweTS)

Standard DLC constructions using adaptor signatures scale poorly when
multiple oracles are required. For a `t-of-n` threshold scheme with many
possible outcomes, the number of adaptor signature packages a party must
prepare grows combinatorially: one package per (outcome, oracle-subset)
combination.

Verifiable Witness Encryption based on Threshold Signatures (VweTS) addresses
this directly. Rather than preparing one adaptor-signature path for every
possible oracle subset, a single settlement transaction is prepared per
outcome. The payment authorization is encrypted such that it becomes usable
only once a threshold `t` of `n` independent oracles attest to the same
outcome. The combined oracle attestations act as the witness that decrypts
the valid payment signature.

The tradeoffs relative to adaptor-signature DLCs are worth understanding.
VweTS setup scales linearly with the number of oracles: a major improvement
over the combinatorial blowup in threshold DLC constructions, where parties
must prepare one adaptor-signature package per (outcome, oracle-subset)
combination. The cost is on-chain footprint: VweTS requires spending from
2-of-2 multisig outputs, making the spending pattern more distinguishable.
Vwe2psTS addresses this by enabling oracle-based conditional payments from
joint addresses using a two-party signature that looks identical to a regular
single-key spend, recovering the privacy properties of adaptor-signature DLCs
without sacrificing threshold scalability.

## Privacy-Preserving Oracle Constructions (DECO)

Both push oracle systems and DLC-style attestations share a limitation: the
oracle either publishes data onchain, or it learns what question is being
asked in order to produce an attestation. Neither model supports queries over
private data that the oracle should not see.

DECO (Decentralized Oracle) addresses this using TLS session cryptography
and zero-knowledge proofs. The core idea is a three-party handshake between
a prover (the data requester), a verifier (the oracle or smart contract), and
a TLS web server. The session key is split between prover and verifier such
that neither can forge data from the server independently, but the prover can
prove statements about the session data to the verifier in zero-knowledge
without revealing the underlying content.

This enables queries that neither push oracles nor DLCs can support. A user
can prove their bank account balance exceeds a threshold without the oracle
ever seeing the actual number. Identity attributes from a government web
service can be verified without exposing the underlying record. Delivery
status from a private logistics API can be confirmed without disclosing
what's being shipped.

DECO isn't a replacement for aggregation infrastructure; it's a tool for
the sourcing phase specifically. Getting a result onchain still requires an
oracle network to aggregate multiple DECO proofs and handle delivery. What
DECO adds is a confidentiality layer around how that data is initially
sourced and verified, without touching the rest of the stack.

## Comparing the Models

| Property | Self-Contained (Bitcoin) | Oracle-Based (EVM) | Attestation-Based (DLCs) | Threshold (VweTS) | Privacy-Preserving (DECO) |
|---|---|---|---|---|---|
| Input source | Internal | External | External (via signatures) | External (via signatures) | External (via ZK proofs) |
| Verification method | Cryptographic | Aggregation + incentives | Cryptographic | Cryptographic | Zero-knowledge |
| Protocol enforced | Yes | Partially | Yes | Yes | Partially |
| External trust surface | None | Data providers, operators | Oracle key holders | Threshold oracle set | TLS server + oracle network |
| Onchain data exposure | Spending conditions only | Raw data values | Signatures only | Signatures only | None |
| Threshold oracle support | N/A | Yes (aggregation) | Combinatorial cost | Linear cost | Depends on integration |

Each of these models can support correct outcomes. They do so under fundamentally
different assumptions about where truth comes from and what the protocol
is responsible for verifying.

The right mental model is not that one approach is strictly better. It is
that each optimizes for different things, and each inherits a distinct
failure surface as a result. The [failure modes section](/failure-modes-and-tradeoffs)
covers what can go wrong in each.