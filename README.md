# SolARM: Native ARM64 Infrastructure & Developer Tooling for Solana

**SolARM** (`https://coad1024-cmd.github.io/solarm/` / `https://github.com/coad1024-cmd/solana-arm64-linux`) is an open-source public goods initiative delivering automated, cryptographically signed native Linux ARM64 (`aarch64-unknown-linux-gnu`) release infrastructure, SBF compilation toolchains, and LiteSVM test harnesses for the global Solana and Agave ecosystem.

---

## 🚀 Key Value Propositions

1. **Eliminating the 90-Minute Compilation Tax:**
   - Pre-built, bit-for-bit verified ELF64 release archives collapse developer onboarding from 90 minutes down to **4.18 seconds**.
2. **40% Cloud Cost Reductions:**
   - Enables native development and CI execution on AWS Graviton3/Graviton4 and Oracle Ampere A1 instances.
3. **Apple Silicon & Edge Freedom:**
   - Native development on Asahi Linux and Raspberry Pi 5 without slow x86 emulation containers.
4. **All 24 Solana Core Binaries:**
   - Complete suite including `solana`, `solana-keygen`, `solana-test-validator`, `cargo-build-sbf`, `cargo-test-sbf`, `spl-token`, and `solana-ledger-tool`.
5. **Sub-Second LiteSVM Testing:**
   - Full Anchor contract deployment and instruction execution in **0.15s (150ms)** in-memory.

---

## ⚡ 1-Line Universal Installer

```bash
sh -c "$(curl -sSfL https://raw.githubusercontent.com/coad1024-cmd/solana-arm64-linux/main/install.sh)"
```

---

## 🛠️ Local Development & Preview

To preview the SolARM portal locally:

```bash
cd /home/hash/Hub/Projects/solarm-portal
python3 -m http.server 8080
```

Open `http://localhost:8080` in any modern web browser.

---

## 📜 License & Governance

- **License:** Apache 2.0 / MIT Open Source Public Good
- **Maintainer:** Hasher Nabi / SolARM
- **Grant Proposal:** Solana Foundation Developer Tooling Grant ($25,000 USD)
