---
id: night-dust
slug: /midnight-for-bitcoin-devs/night-dust
sidebar_position: 4
title: NIGHT/DUST vs the Bitcoin Fee Market
---

# NIGHT/DUST vs the Bitcoin Fee Market

*Part 3 of 4: Midnight for Bitcoin Developers*

---

Bitcoin's fee market is one of the most elegant and most brutal mechanisms in
cryptosystems. Elegant because it requires no central coordination. Fees emerge
from the interaction of miners optimizing for revenue and users competing for
block space. Brutal because it is entirely indifferent to your application's
cost model. Whatever you planned to charge users for a transaction, the mempool
will occasionally charge three times that, and occasionally ten times, and
occasionally less than you expected, and there is nothing you can do about any
of it.

If you've shipped a Bitcoin application that involves transaction fees paid by
users, you have already solved the problem of explaining to a non-technical user
why the same action cost $0.50 yesterday and $8 today. The explanation involves
miners, block space scarcity, fee estimation algorithms, and the emergent
behavior of a decentralized market. It's accurate. It's also not something most
users find acceptable.

Midnight's resource model is built on a different set of assumptions entirely.
Understanding where those assumptions lead, and what they trade away to get
there, is what this article is about.

---

## Bitcoin's fee market: how it actually works

Bitcoin block space is scarce by design. Blocks are capped at roughly 4 million
weight units. Transactions compete for inclusion by attaching fees. Miners
select transactions to maximize fee revenue per block, which in practice means
selecting by fee rate, satoshis per virtual byte, rather than absolute fee
amount. When block space demand exceeds supply, fee rates rise until enough
marginal transactions become uneconomical to submit and the mempool clears.

The fee a transaction pays is entirely disconnected from what the transaction
does. A simple P2PKH send and a complex multisig settlement with multiple inputs
and outputs differ in size, and therefore in fee at the same fee rate, but not
in any way related to the computation they represent. Bitcoin Script execution
is cheap enough that nodes don't charge for it separately. The fee is purely a
function of transaction weight.

The emergent properties of this market are well understood. During low demand
periods, fees approach the minimum relay threshold. During high demand periods,
ordinals inscription waves, halving periods, mempool congestion events, fees
spike rapidly and unpredictably. Applications that need reliable fee estimation
use complex heuristics, maintain fee reserves, or implement Replace-By-Fee
strategies to unstick transactions that become uneconomical at their original
fee rate.

For individual users transacting occasionally this is manageable, if annoying.
For applications that need to submit transactions on predictable schedules at
predictable costs, the fee market is a significant operational challenge. An
enterprise application that needs to batch-settle transactions on a fixed
schedule cannot predict its settlement cost a week in advance. A Lightning node
that needs to force-close channels in time-sensitive situations cannot guarantee
the fee rate will be reasonable when the force-close needs to happen.

Bitcoin developers work around this. They batch transactions. They use
fee-bumping via CPFP or RBF. They maintain fee reserves. They accept that the
cost of their application is a variable they don't fully control.

---

## NIGHT/DUST: the battery model

Midnight separates network access from network payment in a way that has no
Bitcoin equivalent.

NIGHT is the capital asset. It's a standard transferable token with a fixed
supply of 24 billion. It's publicly visible on-chain, tradeable on exchanges,
and functions as the governance and staking token for the network. Holding NIGHT
does not directly pay for transactions. What it does is generate DUST.

DUST is not a token. It's a shielded, non-transferable network resource that
accumulates over time proportional to your NIGHT balance. The generation rate
from the current protocol parameters is 5 DUST per NIGHT held, with a
generation time to capacity of approximately one week. DUST pays for
transactions. Once spent, it regenerates from the backing NIGHT balance. If you
never spend your DUST, it accumulates to a cap and stays there. If you spend
NIGHT, the associated DUST begins decaying linearly to zero.

The whitepaper describes DUST's value over time in four linear segments:

```
1. Generating:     creation -> capacity (based on NIGHT balance)
2. Constant max:   at capacity, as long as backing NIGHT is unspent
3. Decaying:       from NIGHT spend until DUST value reaches zero
4. Constant zero:  forever after
```

The practical result for an application developer: as long as you hold NIGHT
and don't move it, you have predictable resource generation. That is not the
same as fully predictable transaction throughput. Actual capacity depends on
network pricing at the time of submission and the circuit complexity of your
transactions. You don't spend NIGHT to transact. You spend DUST, which
regenerates. The cost model for a steady-state application is not "how much
does each transaction cost in token terms" but "how much NIGHT do I need to
hold to sustain my transaction rate."

This is a subscription model, not a pay-per-use model. You capitalize the
access cost upfront by acquiring NIGHT, and then operate from the generated
DUST. The Bitcoin fee market is explicitly pay-per-use, with the price set by
real-time market conditions you don't control.

---

## DUST is itself a UTXO

This is the detail that Bitcoin developers will find most interesting and most
surprising.

DUST is not an account balance. It is not a number stored somewhere that gets
decremented when you transact. DUST is a UTXO, following the same
commitment/nullifier pattern described in parts one and two of this series.
The protocol deterministically derives the spendable resource over time from
NIGHT ownership, rather than through explicit minting transactions. No separate
minting event is required.

Each DUST UTXO has a commitment inserted into an append-only Merkle tree on
creation, and a nullifier inserted into the nullifier set when spent. Spending
DUST is a self-spend: one DUST UTXO in, one DUST UTXO out with the fee declared
publicly in the transaction, because each spend consumes the entire UTXO and
produces a new one. The input's nullifier is posted. The output's commitment is
posted. The value of the new UTXO is the old value minus the fee.

The protocol parameters governing this:

```javascript
const INITIAL_DUST_PARAMETERS = {
  night_dust_ratio: 5_000_000_000,  // 5 DUST per NIGHT
  generation_decay_rate: 8_267,     // ~1 week to capacity
  dust_grace_period: 3 hours,       // grace period before decay begins
};
```

The generation rate depends on how much NIGHT backs the DUST UTXO. The value
grows linearly from zero to the capacity cap over approximately one week, stays
at cap until the backing NIGHT is spent, then decays linearly to zero. The
three-hour grace period means a short NIGHT movement doesn't immediately destroy
accumulated DUST. Spending during decay is permitted. The decay rate doesn't
change, but you can still use the remaining DUST before it reaches zero.

Because DUST is a UTXO and each spend consumes the entire output, an application
with a single DUST UTXO can only submit one transaction per block. The spend
creates a new output that is not available until the next block. High-throughput
applications need to plan their NIGHT UTXO topology deliberately, splitting
NIGHT to create a pool of independent DUST UTXOs that can be spent in parallel,
much like coin selection in Bitcoin wallet management.

One edge case worth understanding: if you spend only part of your NIGHT, the
change output creates a new NIGHT UTXO that starts fresh DUST generation from
zero. The old DUST UTXO tied to the spent NIGHT begins decaying immediately.
This is a non-obvious operational hazard. Moving NIGHT, even partially, resets
generation on the resulting outputs. Applications that frequently rebalance
funds can unintentionally destroy their steady-state DUST capacity.

Each NIGHT UTXO generates DUST independently. If your application splits NIGHT
across multiple wallets for security, or distributes it operationally, that
independence matters. Consolidating NIGHT UTXOs restarts the generation period.
Splitting them multiplies the generation sources but each at a lower rate. The
total DUST capacity is proportional to total NIGHT held regardless of how it's
distributed, but the time-to-capacity depends on when each NIGHT UTXO last
moved.

This makes UTXO management an operational concern not just for value transfer,
but for transaction capacity planning. Poor UTXO hygiene can degrade effective
throughput even when total NIGHT holdings are unchanged.

---

## Dynamic pricing: what happens under congestion

The DUST model provides cost predictability under normal conditions. What
happens under load is more nuanced.

Transaction fees in DUST have three components: a base fee, a variable
congestion component, and a ZK proof cost. The congestion component is adjusted dynamically per block, based on current and previous block utilization. When blocks fill beyond the 50% target, fees rise and fall when utilization falls below that. The
model looks at the trend across two blocks rather than just current utilization,
which smooths out single-block spikes. Bitcoin developers will recognize this
as similar in structure to EIP-1559's base fee mechanism, with the difference
that you pay in a resource you generated rather than a market-priced asset.

In Bitcoin, the fee you pay is negotiated at submission time against all other
pending transactions. In Midnight, the fee is determined by recent block
utilization history at the time your transaction is included. You don't bid
against other transactions. You pay the current network rate. This means the
exact fee is not fixed at submission time but derived at inclusion time based
on recent network conditions. This does not eliminate contention. If demand
exceeds available capacity, transactions may still be delayed, but pricing
adjusts protocol-wide rather than through per-transaction bidding.

The ZK proof component is worth noting separately. Generating a ZK proof has a
computational cost that doesn't exist in Bitcoin. That cost is paid by the user
generating the proof on their machine, it's time not money, but the
transaction's fee also reflects the verification cost that validators bear,
which correlates with proof size and circuit complexity. Simple transfers sit
at the lower end, seconds of generation time and modest proof size. Complex
privacy logic involving full Zswap operations takes longer and costs more DUST.
This is the Midnight equivalent of transaction weight in Bitcoin: circuit
complexity scales the fee.

---

## DUST is non-transferable: the spam prevention mechanism

In Bitcoin, anyone with BTC can submit any transaction at any fee rate. The fee
market is the only spam prevention mechanism. During periods of low fees,
submitting large volumes of low-value transactions is cheap, and the mempool can
grow substantially.

Midnight's non-transferability of DUST is a different approach to the same
problem. Because DUST cannot be purchased directly or transferred between
wallets, accumulating large transaction capacity requires holding NIGHT for an
extended period. You cannot buy a spike of DUST to spam the network with
transactions. You can only generate DUST at the rate your NIGHT balance permits,
up to the capacity cap.

This does not eliminate spam. An attacker can accumulate NIGHT, hold it long
enough to generate DUST capacity, and pre-generate proofs in advance. What the
model does is raise both the capital cost and the computational cost relative
to a pure fee market. Every shielded transaction requires generating a proof,
which has real computational cost on the submitting machine. Submitting
thousands of transactions per minute requires generating thousands of proofs per
minute, which requires substantial computational resources beyond just the DUST
balance.

This two-layer spam resistance, DUST capacity limiting the sustained rate and
proof generation cost limiting the burst rate, is more nuanced than Bitcoin's
single fee market mechanism. Whether it's more robust in adversarial conditions
is an open question that mainnet will eventually answer empirically.

---

## Fee sponsorship and the capacity marketplace

Bitcoin has no native fee sponsorship mechanism. If a user can't afford the fee,
they can't submit the transaction. Applications that want to pay fees on behalf
of users require custodial architectures or complex off-chain coordination.

Midnight builds fee sponsorship into the protocol design. A developer can
delegate their generated DUST to pay for users' transactions, without
transferring ownership of the underlying NIGHT. The application holds NIGHT,
generates DUST, and sponsors transactions for users who have no NIGHT of their
own. The user never needs to acquire or manage NIGHT. The developer absorbs the
ledger cost. The user still generates the ZK proof on their own machine, so the
computational cost of privacy stays with the user rather than the sponsor.

This maps reasonably cleanly to Web2 freemium models: the service provider
absorbs infrastructure costs and monetizes through other means. Bitcoin's fee
model has no equivalent. If you want to build a Bitcoin application with zero
friction for end users around fees, you need custodial wallets, off-chain
accounting, and significant infrastructure complexity to approximate what
Midnight builds natively.

---

## The honest comparison

Bitcoin's fee market and Midnight's NIGHT/DUST model are optimizing for
different things.

Bitcoin's fee market optimizes for simplicity and neutrality. The mechanism
requires no trusted parameter setter, no governance decision about what fees
should be, no protocol-level distinction between types of users. The market
sets the price and everyone pays it. The downside is volatility and
unpredictability that makes certain application categories difficult to build.

Midnight's model optimizes for cost predictability and application developer
experience. Holding NIGHT gives you predictable resource generation. You can
plan your operational costs. You can sponsor users. The downside is that the
model introduces protocol parameters, the NIGHT/DUST ratio, the generation
rate, the congestion algorithm, that require governance decisions and can be
changed. Fee stability is not just governed, it is dependent on governance
behaving predictably. That is a different trust model than an emergent market
where no single party controls the price.

For Bitcoin developers who value the fee market's neutrality and trustlessness,
the fact that no one decides what fees should be, Midnight's model is a step
toward managed infrastructure. The parameters are set by the protocol, governed
by token holders, and subject to change. That's not wrong, but it's a different
kind of risk.

For application developers who need to build products with predictable unit
economics, Midnight's model makes cost modeling closer to infrastructure
planning than transaction pricing. The ability to hold NIGHT, generate DUST at
a known rate, and sponsor users without custodial complexity is a genuine
capability that Bitcoin doesn't offer at the base layer.

---

## What to take away

NIGHT and DUST separate capital from operational cost in a way Bitcoin doesn't.
Holding NIGHT is the capital expenditure. Generating DUST is the operational
budget. Transactions spend DUST, which regenerates. The model is
subscription-flavored rather than pay-per-use, and it's designed explicitly for
application developers who need predictable cost structures.

DUST's implementation as a UTXO following the commitment/nullifier paradigm
means that even the fee resource inherits Midnight's privacy properties. DUST
spends are shielded. Your transaction throughput, timing, and fee payments are
not publicly observable the way Bitcoin transaction fees are.

The tradeoff is that cost predictability comes from protocol design rather than
market emergence. The parameters that make DUST predictable are governable and
changeable. Bitcoin developers who trust markets more than governance will find
this uncomfortable. Application developers who need to ship products with
predictable unit economics will find it useful.

[Part 4](/midnight-for-bitcoin-devs/compact-circuits) covers Compact circuits
vs Bitcoin Script, an analysis written for developers who already know Script
and want to understand what ZK circuits actually are, what they can express
that Script cannot, and what they give up to get there.