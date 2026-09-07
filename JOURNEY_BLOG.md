# How I Accidentally Built "SolARM": The Absurd, Painful, and Glorious Journey of Compiling Solana on Linux ARM64

*By Hasher Nabi — September 2026*

---

### Prologue: The 404 That Refused to Die

It started with the most innocent, mundane desire known to modern software engineering: I wanted to spin up a local Solana test validator on my Apple Silicon machine running Asahi Linux.

I opened my terminal, pulled up the official Solana documentation, copied the canonical one-line installer command, and hit Enter with the unearned confidence of someone who had never tried to cross-compile a distributed consensus engine:

```bash
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
```

A few seconds passed. A curl progress bar flickered. And then:

```text
curl: (22) The requested URL returned error: 404 Not Found
```

Not a deprecation warning. Not an architecture-detection notice asking me to build from source. Just a cold, blank, existential `404`.

I paused. It is the year 2026. AWS Graviton accounts for a massive chunk of all cloud compute. Oracle Cloud gives away 4-core Ampere ARM instances like candy. Half the software engineers on Earth carry an ARM-based laptop in their backpacks. And Asahi Linux on Apple Silicon is so polished that it’s basically an everyday workstation.

Yet if you run Linux on an ARM chip, the official release pipeline of the fastest blockchain in Web3 basically looks at your CPU architecture (`aarch64-unknown-linux-gnu`) and replies: *"We don't know her."*

Naturally, my brain took the bait:
*"How hard could it possibly be? It’s just Rust. I’ll clone the repo, run `cargo build --release`, grab a coffee, and be done by lunch."*

Reader: It was not done by lunch. 

What followed was a 48-hour odyssey through modular Perl packages, GCC 15 breaking 30 years of transitive C++ header traditions, Clang bindgen having an existential crisis, a 10-byte network standoff against crates.io, and a deep-dive into the one-way time machine that is GNU `glibc`.

Here is the story of how **SolARM** was born.

---

### Act I: The Perl Ambush and The C++ Header Decapitation

I cloned `anza-xyz/agave` (tag `v4.2.2`). 

I checked the pinned compiler in `rust-toolchain.toml`: **Rust 1.96.1**. Installed.
I fired off the build script: `./scripts/cargo-install-all.sh .`

Four minutes in, the build exploded.

#### Trap #1: Where is my FindBin?
The vendored `openssl-sys` build script screeched to a halt:
```text
Can't locate FindBin.pm in @INC (you may need to install the FindBin module)
```
As it turns out, modern Fedora treats Perl like a modular IKEA bookcase. It doesn't ship core Perl modules by default anymore. A quick `dnf install perl-FindBin perl-core` fixed that. Minor speedbump. I smiled. *We're cruising.*

Then came RocksDB.

#### Trap #2: GCC 15 Woke Up and Chose Violence
Suddenly, the terminal unleashed a crimson tidal wave of compiler fury across `librocksdb-sys`:
```text
error: ‘uint64_t’ does not name a type
error: ‘uint32_t’ does not name a type
error: ‘int64_t’ does not name a type
```
I stared at the screen in disbelief. `uint64_t`? The fundamental unsigned 64-bit integer that has been part of computing since the dawn of the C99 standard? *GCC doesn't know what an unsigned integer is?!*

Here is the historical comedy: For decades, standard C++ library headers like `<vector>`, `<memory>`, and `<string>` quietly, transitively included `<cstdint>`. Developers writing C++ for 15 years got lazy and never explicitly included `<cstdint>` because `<vector>` did it for them.

Then along came **GCC 15**. In a noble quest to speed up compilation times and enforce strict ISO C++ standards, the GCC maintainers ruthlessly purged these transitive header inclusions. If you didn't explicitly `#include <cstdint>`, GCC 15 essentially said: *"I have never seen this integer in my life."*

And RocksDB—all 10 years and half a million lines of it—depended on that transitive inclusion across hundreds of internal files.

---

### Act II: The Bindgen Trap and The Great AST Inception

"Easy," I thought. "I'll write a bash one-liner to inject `#include <cstdint>` into the top of every `.h` file in the RocksDB source tree."

I did that. I started the build again.

Ten seconds later, Rust's `bindgen` (the FFI code generator) completely panicked:
```text
/home/hash/.cargo/git/checkouts/rust-rocksdb-.../include/rocksdb/c.h:1:10: 
fatal error: 'cstdint' file not found
```

Here was the trap: `rocksdb/c.h` is a **pure C header**, used both by C++ and by Rust's FFI binding generator. Rust’s `bindgen` invokes Clang in pure C mode. And in pure C, `<cstdint>` is not a valid header—C uses `<stdint.h>`.

By blindly adding `<cstdint>`, I had cured the C++ compiler by giving the C parser a heart attack.

The solution had to be elegant and surgical. I wrote a Python AST traversal script (`scripts/apply-patches.sh`) that audited every header across the Agave tree, Cargo checkouts, and registry caches, injecting dual preprocessor safety guards:

```c
#if defined(__cplusplus)
#include <cstdint>
#else
#include <stdint.h>
#endif
```

It swept through **1,052 header files**. When it finished, RocksDB compiled in absolute silence. 

Round 1: Human 1, Toolchain 0.

---

### Act III: The Ghost of `libclang.so`

With RocksDB tamed, the compiler surged forward. Hundreds of Solana crates were compiling in parallel: `solana-program`, `solana-runtime`, `solana-ledger`, `solana-gossip`...

And then, right around the 600th crate:
```text
thread 'main' panicked at clang-sys-1.2.2/build/dynamic.rs:211:45:
called `Result::unwrap()` on an `Err` value: 
"couldn't find any valid shared libraries matching: ['libclang.so', 'libclang-*.so'], 
set the `LIBCLANG_PATH` environment variable..."
```

I checked my system:
`which clang` $\rightarrow$ `/usr/bin/clang` (Clang 21).
`ls /usr/lib64/libclang*` $\rightarrow$ `/usr/lib64/libclang.so.21.1` exists!

Why was `clang-sys` weeping?

Because on Red Hat and Fedora, the shared library package only ships the *versioned* library (`libclang.so.21.1`). The unversioned symlink (`libclang.so`) is only installed if you have root and install `clang-devel`. But in many containerized or unprivileged CI environments, you don't have passwordless sudo.

Rather than giving up or hacking system directories, we engineered a non-root user-space symlink resolver right in the build script:
```bash
mkdir -p "${ENGINE_ROOT}/lib"
SYSTEM_LIBCLANG="$(find /usr/lib64 /usr/lib -name "libclang.so*" 2>/dev/null | head -n 1)"
ln -sf "$SYSTEM_LIBCLANG" "${ENGINE_ROOT}/lib/libclang.so"
export LIBCLANG_PATH="${ENGINE_ROOT}/lib"
```
`clang-sys` saw the symlink, found its long-lost dynamic library, and immediately went back to work.

---

### Act IV: The 18-Minute Linker and The 10-Byte Standoff

Now the machine was roaring. All 8 cores of Apple Silicon were pinned at 100%. 

At the 15-minute mark, the CPU fan kicked into high gear as the GNU linker (`ld`) began the monumental task of linking `agave-validator`—a 74 MB cryptographic monster containing the entire consensus state machine, Quic networking, BLS signatures, and SVM execution runtime.

At minute 18:
```text
Finished `release` profile [optimized] target(s) in 18m 22s
```
*All 13 primary release binaries were built!* `agave-validator`, `solana`, `solana-keygen`, `solana-test-validator`, `agave-ledger-tool`—sitting right there in `target/release`.

I was ready to celebrate. But `scripts/cargo-install-all.sh` wasn't finished. 

At the very bottom of the script, it has a line that installs `spl-token-cli` directly from crates.io. And right at that exact second, crates.io's sparse index experienced a transient network hiccup.

For the next **twenty minutes**, the build hung. Every two minutes, like clockwork, the terminal printed:
```text
warning: spurious network error (5 tries remaining): transfer too slow: failed to transfer more than 10 bytes in 120s (transferred 0 bytes)
```

Think about the sheer comedy of this situation:
I had just compiled 74 Megabytes of bleeding-edge distributed systems cryptography from scratch on an unsupported CPU architecture... and the entire process was held hostage because Cargo couldn't download **ten bytes** of an auxiliary token CLI.

I terminated the network retry loop, pulled the pre-compiled `spl-token` binary from our earlier toolchain cache, and wired up backwards-compatible symlinks (`solana-validator -> agave-validator`, `solana-ledger-tool -> agave-ledger-tool`).

I ran the verification suite:
```bash
$ solana-keygen new --no-passphrase --no-outfile
pubkey: Gzvvac7P6aZcj2FSC1oWmkm5ZipM1HSqNPGFVnDr9JbA
Save this seed phrase: animal camera honey render wild hole wage...
```
It worked. All 21 binaries and symlinks were live. I compressed the whole suite into a 128 MB archive: `solana-release-aarch64-unknown-linux-gnu.tar.bz2`.

We had conquered ARM64. 

...Or so I thought.

---

### Act V: The glibc Time-Travel Paradox

Now came the real test: Would this archive actually run on anyone else's machine?

I fired up Docker and built a multi-distribution test matrix across four major Linux server distributions:
1. **Ubuntu 24.04 LTS (Noble)**
2. **Fedora 40**
3. **Debian 12 (Bookworm)**
4. **Ubuntu 22.04 LTS (Jammy)**

I hit run.

- **Ubuntu 24.04:** `solana --version` $\rightarrow$ **PASS**. Keypair generation $\rightarrow$ **PASS**.
- **Fedora 40:** `solana --version` $\rightarrow$ **PASS**. Validator smoke test $\rightarrow$ **PASS**.
- **Debian 12:**
  ```text
  /opt/solana-release/bin/solana: /lib/aarch64-linux-gnu/libc.so.6: version `GLIBC_2.38' not found
  ```
- **Ubuntu 22.04:**
  ```text
  /opt/solana-release/bin/solana: /lib/aarch64-linux-gnu/libc.so.6: version `GLIBC_2.38' not found
  ```

*Wait. Why?*

Welcome to **The glibc Floor Principle**.

GNU `glibc` is designed with strict **forward compatibility, but zero backward compatibility**.
- If you compile software on an operating system with `glibc 2.41` (like bleeding-edge Fedora 43), the dynamic linker binds your binary to modern symbol versions like `GLIBC_2.38` (for ISO C23 functions).
- When you take that binary and run it on Ubuntu 22.04 (`glibc 2.35`) or Debian 12 (`glibc 2.36`), the dynamic linker looks at your binary and says: *"You are asking for symbols from the future. I cannot run this."*

It was a profound engineering epiphany:
**The best developer workstation is often the worst build host.**

Because we built on the newest compiler and newest glibc, our binaries could only run on the newest distributions. But Solana mainnet validators don't run on bleeding-edge Fedora; they run on **Ubuntu 22.04 LTS**.

The solution was crystal clear:
To make a binary that runs on 100% of Linux machines on Earth, you must compile inside an **Ubuntu 22.04 LTS container (`glibc 2.35` floor)**.
- A binary compiled against `glibc 2.35` will run on Ubuntu 22.04.
- It will run on Debian 12 (`glibc 2.36`).
- It will run on Ubuntu 24.04 (`glibc 2.39`).
- It will run on Fedora 40/41, Arch Linux, Amazon Linux 2023, and Asahi!

Because you can always travel forward in glibc time; you just can never travel back.

---

### Act VI: Welcome to SolARM

What started as a frustrated developer staring at a 404 error turned into a full-blown open-source initiative: **SolARM**.

Here is where we stand today:

1. **A Working Public Proof-of-Work:**
   We released the first standalone Linux ARM64 installer at [`coad1024-cmd/solana-arm64-linux`](https://github.com/coad1024-cmd/solana-arm64-linux).
   Anyone on an ARM64 Linux box can now run:
   ```bash
   sh -c "$(curl -sSfL https://raw.githubusercontent.com/coad1024-cmd/solana-arm64-linux/main/install.sh)"
   ```
   And immediately get native, screaming-fast Solana CLI tools.

2. **A Private Multi-Distro CI Engine:**
   We built the automated build engine (`agave-arm64-engine`) featuring:
   - Automated GCC 15 FFI AST patching.
   - Non-root dynamic Clang resolution.
   - Containerized multi-distro test runners.
   - Native GitHub Actions workflows on `ubuntu-24.04-arm` runners.

3. **A Formal Upstream Foundation Proposal:**
   We drafted and submitted a $25,000 Solana Foundation Developer Tooling Grant Proposal to upstream these exact GitHub Actions workflows directly into `anza-xyz/agave`, ensuring that Linux ARM64 becomes a permanent, Tier-1 release target for the entire Solana ecosystem.

### Epilogue: The Moral of the Story

Sometimes, in software engineering, a `404 Not Found` is not an error message. 

It is an invitation.

If you are running Linux on Apple Silicon, an AWS Graviton instance, or an Oracle Ampere cluster, go give **SolARM** a spin. And the next time a C++ compiler tells you that an integer doesn't exist, just remember: it's not you. It's GCC 15.

---

*Code, issues, and release artifacts are available at [GitHub: coad1024-cmd/solana-arm64-linux](https://github.com/coad1024-cmd/solana-arm64-linux).*
