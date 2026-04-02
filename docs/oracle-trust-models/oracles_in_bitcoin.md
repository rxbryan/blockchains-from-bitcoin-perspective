---
slug: /oracle-trust-models/oracles-in-bitcoin
---

# Oracles in Bitcoin: Signatures Instead of Data

The standard oracle pattern on EVM chains is straightforward: a set of node
operators fetch values from external sources, post them to an on-chain
contract, and other contracts read from that storage. The oracle is
infrastructure. Contracts consume its output the same way they consume any
other on-chain state.

Bitcoin cannot do this. And the alternative it uses is worth understanding
carefully, because it produces a very different security and privacy profile.

## The Multisig Era

Early attempts at Bitcoin oracles used the oracle as a co-signer. A typical
setup was a `2-of-3` multisig output: one key per counterparty, one key held
by the oracle. When the event resolved, the oracle co-signed whichever payout
transaction corresponded to the correct outcome.

This worked well enough for simple binary bets, but it had structural
problems. The oracle key appeared directly in the spending condition, making
its involvement visible onchain. Anyone watching the chain could see that an
escrow-like arrangement existed. Settlement also required the oracle to be
online and cooperative; if it went silent, the funds were stuck until a
timeout. And for contracts with many possible outcomes, the on-chain
complexity and fee cost scaled proportionally.

Taproot, activated in November 2021, changed what was possible. Schnorr
signatures enabled adaptor signatures to be used cleanly on mainnet, and that
unlocked a different design approach entirely.

## Bitcoin's Constraint: No External State

The constraint that shapes all of this is simple. Bitcoin Script has no
`SLOAD`. There is no mechanism for a script to read from external storage,
query another contract, or receive a runtime value that wasn't present in the
transaction at broadcast time. A value either exists in the transaction being
validated, or it doesn't exist as far as the protocol is concerned.

So external events cannot be represented as data in a Bitcoin transaction.
They have to be represented as something else.

## Signatures as Outcome Representations

The solution is to represent outcomes as cryptographic conditions rather than
data values. The oracle doesn't post a result anywhere. It commits to a
future attestation in advance by publishing a nonce public key for each
possible outcome. Take a binary event: two outcomes, `A` and `B`. The
oracle publishes two nonce points before anything happens:

$$
R_A = k_A \cdot G \qquad R_B = k_B \cdot G
$$

Both parties use these to build out their transactions. One CET per outcome,
each one requiring a signature that can only exist after the oracle attests
to that specific result. At this stage the contracts are structurally
complete but none of them can be broadcast.

After the event resolves, the oracle produces its attestation:

$$
s = k + H(R,\, P,\, \text{outcome}) \cdot x
$$

$k$ is the nonce secret it committed to earlier, $x$ is its private key,
$P = x \cdot G$ its public key. Publishing $s$ hands one of the parties exactly
what they need to complete their adaptor. The transaction for the actual
outcome becomes valid. Every other CET stays locked; the adaptor scalars
for the outcomes that didn't happen will never be released.

## Verification vs Interpretation

What the chain actually sees at settlement is a standard Schnorr signature
satisfying a spending condition. That's it. Bitcoin nodes verify the
signature is valid. They have no knowledge of the event, the oracle, the
nonce commitments, or what any of it means. The interpretation of what the
attestation represents happens entirely offchain between the parties.

This separation (verification onchain, interpretation offchain) is what
makes DLCs privacy-preserving. A settled DLC is indistinguishable from an
ordinary key-path Taproot spend. No data feed address, no published outcome,
no oracle identity. In contrast to EVM oracle systems where the feed address,
the value consumed, and the contract logic are all publicly readable, a DLC
leaves nothing for a chain observer to analyze.

## What the Oracle Does Not Do

It is worth being precise about the oracle's role in this model. The oracle
does not hold or control funds at any point. It does not appear as a
transaction participant. It cannot redirect funds to an unintended recipient
or prevent a valid transaction from being broadcast.

Its only power is to produce or withhold an attestation. If it withholds,
neither party can close the contract through the oracle path: they're both
stuck waiting. That's why every DLC is built with a refund transaction
pre-signed before the funding output is broadcast. Lock it behind a relative
timelock, and if the oracle never shows up, either party can eventually
recover their funds without asking anyone's permission.