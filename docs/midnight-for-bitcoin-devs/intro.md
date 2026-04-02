---
id: intro
slug: /midnight-for-bitcoin-devs/intro
sidebar_position: 1
title: Introduction
---

# Midnight for Bitcoin Developers

This is a four-part series examining Midnight's architecture through the lens of Bitcoin. Each article assumes you already know Bitcoin well and focuses on where Midnight's design decisions diverge from Bitcoin's, why those divergences exist, and what tradeoffs they introduce.

The series does not try to sell you on Midnight. It tries to give you the information you need to evaluate it honestly.

## What this series covers

**[Part 1 — The UTXO Model](/midnight-for-bitcoin-devs/utxo-model)**

Midnight is UTXO-based, but it inherits from Cardano's extended UTXO model rather than Bitcoin's original. This article covers what's familiar, what's genuinely different — the nullifier set, the datum, ZK proof validation — and where the hybrid token model introduces account-model risk surface.

**[Part 2 — Private State vs Public UTXO](/midnight-for-bitcoin-devs/private-state)**

Bitcoin's transparency is a deliberate design property. Midnight inverts it. This article covers the two-ledger model, the `disclose()` operator as the enforced privacy boundary, commitments and Merkle trees as bridging mechanisms, and what you lose on auditability when you gain privacy.

**[Part 3 — NIGHT/DUST vs the Bitcoin Fee Market](/midnight-for-bitcoin-devs/night-dust)**

Bitcoin's fee market is emergent and neutral. Midnight's NIGHT/DUST model is designed and predictable. This article covers the battery model, DUST as a UTXO, dynamic pricing under congestion, fee sponsorship, and the governance tradeoff that cost predictability requires.

**[Part 4 — Compact Circuits vs Bitcoin Script](/midnight-for-bitcoin-devs/compact-circuits)**

Bitcoin Script is deliberately narrow. Compact circuits are deliberately expressive. This article covers what each can express, the witness mechanism, fixed compile-time bounds vs runtime gas limits, and the different trust foundations each model rests on.

## Who this is for

Bitcoin developers who are evaluating Midnight for a specific application, or who want to understand how Midnight's design choices relate to Bitcoin's without reading through marketing materials.

## A note on the analysis

All technical claims in this series are sourced from Midnight's published documentation, the Kachina academic paper, the Zswap research paper, and the Midnight tokenomics whitepaper. Where the analysis is opinion rather than fact, it is framed as such.