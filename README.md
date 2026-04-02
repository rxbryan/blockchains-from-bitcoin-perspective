# Blockchains from a Bitcoin Perspective

A technical reference site examining blockchain systems through the lens of Bitcoin protocol development. The analysis starts from Bitcoin's design decisions and asks what other systems chose differently, why, and what tradeoffs follow.

Live site: [rxbryan.github.io/blockchains-from-bitcoin-perspective](https://rxbryan.github.io/blockchains-from-bitcoin-perspective)

---

## What this is

Each series on this site takes a specific blockchain system or design space and examines it the way a Bitcoin developer would: starting from first principles, naming the trust assumptions explicitly, and treating every design choice as a tradeoff rather than a feature.

The intended reader is a developer who already understands Bitcoin well and wants to evaluate other systems without wading through marketing materials.

---

## Series

### Oracle Trust Models

A conceptual reference covering how trust is constructed across Bitcoin, EVM aggregation systems, and DLC attestation constructions.

Topics include:
- How Bitcoin handles external data through signatures rather than on-chain state
- How EVM oracle systems like Chainlink construct trust through reputation, aggregation, and deviation thresholds
- DLC attestation mechanics, adaptor signatures, and BIP-340 nonce commitments
- Failure mode analysis across self-contained and oracle-dependent blockchains

Built with Docusaurus and KaTeX for mathematical notation.

---

### Midnight for Bitcoin Developers

A four-part series examining Midnight's architecture through the lens of Bitcoin. Written for developers who already know Bitcoin well and want to understand what Midnight does differently and why.

| Part | Topic |
|------|-------|
| 1 | The UTXO model: nullifier sets, eUTXO datums, ZK proof validation, and the hybrid token model |
| 2 | Private state: the two-ledger model, the `disclose()` operator, commitments, and the auditability tradeoff |
| 3 | NIGHT/DUST vs the Bitcoin fee market: the battery model, DUST as a UTXO, dynamic pricing, and fee sponsorship |
| 4 | Compact circuits vs Bitcoin Script: fixed compile-time bounds, witnesses, linkability prevention, and the trusted setup question |

---

## Running locally

```bash
npm install
npm start
```

Requires Node.js v22+.

---

## Built with

- [Docusaurus](https://docusaurus.io/)
- [KaTeX](https://katex.org/) for mathematical notation
- Deployed to GitHub Pages via GitHub Actions

---

## Author

Bryan Elee Atonye

- GitHub: [github.com/rxbryan](https://github.com/rxbryan)
- Medium: [medium.com/@bryanelee62](https://medium.com/@bryanelee62)
- LinkedIn: [linkedin.com/in/rxbryan](https://www.linkedin.com/in/rxbryan)