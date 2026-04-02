---
slug: /oracle-trust-models/encoding-external-events
---

# Encoding External Events in Bitcoin

There is no opcode in Bitcoin Script for reading an external value. No price
feed, no API call, no runtime injection of data from outside the transaction.
This is not a solvable engineering problem: it is a deliberate property of
the execution model. So the question becomes: how do you make a contract
whose outcome depends on a real-world event, given that the real-world event
can never enter the transaction directly?

The answer is to encode outcomes as cryptographic conditions rather than data
values. Discreet Log Contracts do this by binding oracle attestations to
transaction paths using Schnorr signatures and adaptor signatures.

## Setting Up the Contract

A DLC is constructed entirely before the event it references. Both parties
agree on the outcome space, the oracle that will attest to the result, and
the payout structure: how much each party receives for each possible
outcome. They also agree on a refund condition for the case where the oracle
never attests.

For each possible outcome `o_i`, the parties build a **Contract Execution
Transaction (CET)** that encodes the correct payout for that outcome. At
this point, none of the CETs are valid. Each one is missing a signature
that cannot exist until the oracle attests.

The contract is funded by a 2-of-2 multisig output requiring cooperation
from both parties to spend:

```
Funding Output:
  OP_2 <pubkey_A> <pubkey_B> OP_2 OP_CHECKMULTISIG
```

With Taproot, this is better expressed as a MuSig2 key-path spend: the
funding output becomes indistinguishable from a single-key output, and the
contract structure is invisible to anyone watching the chain.

Critically, the CETs and the refund transaction are all pre-signed before
the funding transaction is ever broadcast. This ordering matters: it
eliminates the possibility of one party locking funds and then refusing to
sign the outcome transactions.

## Oracle Nonce Commitments

Before the event, the oracle publishes a nonce public key for each outcome
it will attest to. For an event with $n$ possible outcomes:

$$
R_i = k_i \cdot G
$$

$k_i$ is a secret scalar, chosen fresh for each outcome, never reused. $G$
is the secp256k1 generator. The important thing about publishing $R_i$ is
that it binds the oracle before the event happens: try to sign later with
a different nonce and the signature won't satisfy the spending conditions
the parties already built their CETs around. The oracle also publishes
its long-term public key $P = x \cdot G$, where $x$ is its private key.

These commitments are made before the event resolves. They are what allow
the parties to construct valid adaptor signatures in advance.

## Adaptor Signatures

An adaptor signature is an incomplete signature, verifiable against a known
public point, but not yet a valid Schnorr signature. It becomes valid only
when combined with a specific secret scalar.

From the oracle's public commitments, the anticipated attestation scalar for
outcome $o_i$ is:

$$
s_i = k_i + H(R_i,\, P,\, o_i) \cdot x
$$

Anyone can compute the corresponding public point $S_i$ without knowing
any secrets:

$$
S_i = R_i + H(R_i,\, P,\, o_i) \cdot P
$$

$S_i$ is what the oracle's attestation scalar will multiply to on the curve.
Both parties use it to construct their adaptor signatures for $\text{CET}_i$.
An adaptor $(R', s')$ satisfies:

$$
s' \cdot G = R' + H(R',\, A,\, \text{CET}_i) \cdot A
$$

but with $s'$ offset so that $s' + s_i$ produces the final valid signature.
The counterparty can verify the adaptor without knowing $s_i$, but cannot
complete it without that scalar. Until the oracle attests, the CET is
permanently incomplete.

## Settlement

When the event resolves, the oracle publishes its attestation for the actual
outcome $o_i$:

$$
s_i = k_i + H(R_i,\, P,\, o_i) \cdot x
$$

The winning party adds $s_i$ to their adaptor scalar, combines the result
with the counterparty's adaptor signature, and broadcasts $\text{CET}_i$. The
transaction is now fully signed and valid.

Every other CET stays incomplete. Their adaptor signatures are locked to
scalars $s_j$ for outcomes $j \neq i$: scalars the oracle will never produce.

## BIP-340 and Cross-Protocol Safety

BIP-340 is the Schnorr signature specification that Taproot activation
brought to Bitcoin mainnet. The oracle attestation scheme above follows the
BIP-340 signing equation directly:

$$
s = k + H(R \,\|\, P \,\|\, m) \cdot x
$$

where $m$ is the encoded outcome string. The hash function used is a BIP-340
tagged hash:

$$
H_{\text{tag}}(m) = \text{SHA256}\!\left(\text{SHA256}(\text{tag}) \,\|\, \text{SHA256}(\text{tag}) \,\|\, m\right)
$$

The tag prefixing is what prevents cross-protocol signature reuse. A valid
oracle attestation for outcome $o_i$ cannot be replayed as a transaction
signature or used to authorize a key-path spend, because the domain separation
built into the tagged hash makes the two contexts cryptographically distinct.

## What the Chain Sees

At settlement, two transactions hit the chain: the funding transaction and
the winning CET. That's it. The oracle's attestation scalar is used offchain
to complete the adaptor; it never appears in any transaction. The outcome
space, the payout structure, the oracle's identity, and which party won are
all invisible to anyone inspecting the blockchain. A settled DLC looks like
two ordinary transactions.