# Notes on Compiling Solana on Linux ARM64 (and how SolARM came together)

*Hasher Nabi — September 2026*

---

I run Fedora Asahi on an Apple Silicon machine. A few days ago, I needed to spin up a local Solana test validator to test an on-chain program. I ran the standard install command from the official docs:

```bash
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
```

A few seconds later, `curl` returned a 404.

It turns out neither Solana Labs nor Anza has ever published precompiled release binaries for Linux ARM64 (`aarch64-unknown-linux-gnu`). macOS ARM64 has had official releases for years, but on Linux ARM64—whether you are on an Asahi laptop, an AWS Graviton instance, or an Oracle Ampere server—there are no binaries. If you want the Solana CLI tools on ARM64 Linux, you have to compile them from source yourself.

I figured compiling it would take an hour or two. Clone the Agave repo, run cargo install, wait for the crates to finish, and get back to work. It ended up taking two days of chasing compiler quirks, preprocessor edge cases, and dynamic linker version constraints across four Linux distributions. 

Here is what went wrong along the way, how we resolved it, and what we learned about Linux distribution targets in the process.

---

### 1. The GCC 15 and RocksDB Header Problem

I cloned `anza-xyz/agave` at tag `v4.2.2`, pinned the toolchain to Rust 1.96.1 (as specified in `rust-toolchain.toml`), and ran `scripts/cargo-install-all.sh`.

The first failure was trivial: vendored `openssl-sys` failed during `./Configure` because it could not find `FindBin.pm`. Fedora does not include core Perl modules in minimal base installs anymore, so `dnf install perl-FindBin perl-core` got past that.

The second failure was substantially more stubborn:

```text
error: ‘uint64_t’ does not name a type
error: ‘uint32_t’ does not name a type
error: ‘int64_t’ does not name a type
```

The error came from deep inside `librocksdb-sys`—specifically files like `trace_record.cc` and `blob_file_meta.cc`.

This happened because our host was running GCC 15. In earlier GCC versions, standard library headers like `<vector>` and `<memory>` transitively included `<cstdint>`. Decades of C++ code, including RocksDB's C++ bindings, relied on this implicit include without ever explicitly declaring `#include <cstdint>`. In GCC 15, the maintainers cleaned up standard library headers to improve parse times and meet ISO standards, which dropped `<cstdint>` from `<vector>`.

As a result, GCC 15 did not recognize basic fixed-width integer types in dozens of RocksDB files.

The immediate reaction was to prepend `#include <cstdint>` to `rocksdb/c.h`. That solved the C++ compile step, but immediately broke Rust's `bindgen`:

```text
fatal error: 'cstdint' file not found
```

`rocksdb/c.h` is a shared header. When Rust's `bindgen` parses it to generate FFI bindings, Clang runs in pure C mode. In pure C, `<cstdint>` does not exist; the standard header is `<stdint.h>`.

Adding `<cstdint>` fixed the C++ build and broke the C parser. 

To fix both simultaneously without modifying upstream code by hand across dozens of dependencies, we wrote a small Python script (`scripts/apply-patches.sh`) to traverse the source tree, Cargo git checkouts, and registry caches. It injects dual preprocessor guards into any header relying on fixed-width types:

```c
#if defined(__cplusplus)
#include <cstdint>
#else
#include <stdint.h>
#endif
```

The script patched 1,052 headers across the workspace and cargo cache. RocksDB compiled cleanly on the next attempt.

---

### 2. Missing `libclang.so` in User Space

Once RocksDB compiled, the build progressed through several hundred crates until `clang-sys` failed:

```text
thread 'main' panicked at clang-sys-1.2.2/build/dynamic.rs:211:45:
called `Result::unwrap()` on an `Err` value: 
"couldn't find any valid shared libraries matching: ['libclang.so', 'libclang-*.so'], 
set the `LIBCLANG_PATH` environment variable..."
```

Clang was installed on the system, and `/usr/lib64/libclang.so.21.1` existed. But `clang-sys` searches specifically for `libclang.so` or `libclang-*.so`. 

On RPM distributions (Fedora, RHEL), the runtime library package only installs the soname (`libclang.so.21.1`). The unversioned symlink `libclang.so` is part of `clang-devel`. In environments without root or `sudo` access, you cannot run `dnf install clang-devel`.

Instead of requiring root privileges, we added a small check in the build script that finds the installed versioned `.so` and creates a local symlink in `./lib`:

```bash
mkdir -p "${ENGINE_ROOT}/lib"
SYSTEM_LIBCLANG="$(find /usr/lib64 /usr/lib -name "libclang.so*" 2>/dev/null | head -n 1)"
ln -sf "$SYSTEM_LIBCLANG" "${ENGINE_ROOT}/lib/libclang.so"
export LIBCLANG_PATH="${ENGINE_ROOT}/lib"
```

Once pointed at `./lib`, `clang-sys` resolved the library and compilation continued.

---

### 3. Feature Unification and Dev Tools (DCOU)

Agave has a feature flag called `dev-context-only-utils` (DCOU). Diagnostic tools like `agave-ledger-tool` need DCOU enabled to inspect internal structures, while production binaries like `agave-validator` must never have DCOU enabled (to prevent debug code or cost-model overrides from leaking into production consensus).

Due to how Cargo resolves workspace features, if you run `cargo build --workspace` with both types of binaries specified, Cargo unifies features across the graph and taints the release validator.

Agave handles this by checking the build plan before compilation using an unstable cargo flag:

```bash
RUSTC_BOOTSTRAP=1 cargo build --profile release -Z unstable-options --unit-graph --bin solana-validator ...
```

The script parses the unit graph with `jq` to verify that `dev-context-only-utils` evaluates to false across all production units before proceeding. Production binaries are compiled first, followed by a separate pass for `dev-bins/Cargo.toml` (`agave-ledger-tool`).

---

### 4. The 18-Minute Linker and the Crates.io Timeout

Compiling all of Agave from source on an 8-core ARM machine takes about 18 minutes. The final link step for `agave-validator` is particularly heavy; the resulting binary is over 70 MB unstripped.

At minute 18, `cargo` completed:

```text
Finished `release` profile [optimized] target(s) in 18m 22s
```

All primary binaries (`agave-validator`, `solana`, `solana-keygen`, `solana-test-validator`, `agave-ledger-tool`) were sitting in `target/release`.

However, the default `cargo-install-all.sh` script does not stop after building the workspace. At the very bottom, it attempts to install `spl-token-cli` from crates.io. During our run, crates.io's sparse index had network latency issues, and the script entered a 20-minute retry loop:

```text
warning: spurious network error (5 tries remaining): transfer too slow: failed to transfer more than 10 bytes in 120s (transferred 0 bytes)
```

Waiting 20 minutes for a 10-byte token transfer after successfully compiling a 74 MB consensus engine was a useful lesson in decoupling build steps. 

We killed the stalled job, used `--no-spl-token` in subsequent runs, and treated auxiliary CLI tools as standalone packages rather than bundling them into the critical path of the validator suite.

---

### 5. Multi-Distro Verification and the `glibc` Floor

We packaged the suite into a standard tarball (`solana-release-aarch64-unknown-linux-gnu.tar.bz2`, ~128 MB) with backward-compatible symlinks (`solana-validator -> agave-validator`, `solana-ledger-tool -> agave-ledger-tool`) and a `version.yml` manifest.

To verify whether this archive would actually run on other machines, we set up Docker containers across four target Linux distributions:
- Ubuntu 24.04 LTS (`glibc 2.39`)
- Fedora 40 (`glibc 2.39`)
- Debian 12 Bookworm (`glibc 2.36`)
- Ubuntu 22.04 LTS (`glibc 2.35`)

We ran `ldd` checks and smoke tests (`solana-keygen new`, `solana --version`) inside each container:

| Target Distribution | glibc Version | Linkage Check | Keygen / CLI Test |
| :--- | :--- | :--- | :--- |
| **Ubuntu 24.04 LTS** | 2.39 | All shared libraries resolved | **PASS** |
| **Fedora 40** | 2.39 | All shared libraries resolved | **PASS** |
| **Debian 12** | 2.36 | Missing `GLIBC_2.38`, `CXXABI_1.3.15` | **FAIL** |
| **Ubuntu 22.04 LTS** | 2.35 | Missing `GLIBC_2.38`, `CXXABI_1.3.15` | **FAIL** |

The failures on Debian 12 and Ubuntu 22.04 came down to GNU `glibc` symbol versioning.

Glibc guarantees **forward compatibility**, but not **backward compatibility**:
- When you compile software on a modern host like Fedora with `glibc 2.41`, the compiler links against newer symbol versions (such as `GLIBC_2.38` for ISO C23 math and string functions).
- If you copy that binary to a system running `glibc 2.35` (Ubuntu 22.04) or `glibc 2.36` (Debian 12), the dynamic linker aborts because those symbols do not exist in the older runtime.

This is why building release software directly on a developer's workstation often causes compatibility issues. Most Solana validators run on Ubuntu 22.04 LTS or Debian 12, not bleeding-edge Fedora.

The standard fix in release engineering is to set the compile floor to the oldest supported distribution:
If you build the release inside an **Ubuntu 22.04 container (`glibc 2.35`)**, the resulting binary only binds to symbols available in 2.35 or earlier. Because glibc is forward-compatible, that same binary will run cleanly on Ubuntu 22.04, Debian 12, Ubuntu 24.04, Fedora 40/41, and Arch Linux without symbol conflicts.

We updated our CI template (`ci-templates/arm64-release.yml`) to use `container: ubuntu:22.04` on GitHub's native `ubuntu-24.04-arm` runners.

---

### What's Next

We packaged this work into an open-source project called **SolARM**:
- A public repository with a working 1-line installer for Linux ARM64: [`coad1024-cmd/solana-arm64-linux`](https://github.com/coad1024-cmd/solana-arm64-linux).
- A private staging engine (`agave-arm64-engine`) with reproducible build scripts, FFI patchers, and multi-distro test runners.
- An upstream grant proposal submitted to the Solana Foundation to add native ARM64 release automation directly to Anza's core CI pipeline.

If you are running Linux on an Apple Silicon machine, an AWS Graviton instance, or an Oracle Ampere server, the 1-line installer is live on GitHub. The goal is to make Linux ARM64 a first-class release target upstream so no one has to debug GCC 15 headers just to run a test validator.
