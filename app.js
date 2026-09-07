/**
 * SolARM Web Platform & Developer Experience Engine
 * Interactive client-side orchestration for SolARM Public Goods Infrastructure
 */

// Data: The 24 Solana/Agave Native ARM64 Binaries
const SOLANA_ARM64_BINARIES = [
  { name: 'solana', category: 'Core CLI', size: '36.8 MB', status: 'Verified', desc: 'Main command-line interface for Solana blockchain interaction & account management' },
  { name: 'solana-keygen', category: 'Core CLI', size: '12.4 MB', status: 'Verified', desc: 'Cryptographic keypair generation, vanity address mining, and paper wallet recovery' },
  { name: 'solana-validator', category: 'Validator', size: '48.2 MB', status: 'Verified', desc: 'Full Solana validator node daemon, TPU transaction processing, and PoH engine' },
  { name: 'solana-test-validator', category: 'Validator', size: '45.1 MB', status: 'Verified', desc: 'Local testnet validator node for fast local smart contract development & RPC emulation' },
  { name: 'cargo-build-sbf', category: 'Toolchain', size: '18.9 MB', status: 'Verified', desc: 'Compiles Rust smart contracts to Solana Bytecode Format (SBF/eBPF) shared objects' },
  { name: 'cargo-test-sbf', category: 'Toolchain', size: '19.2 MB', status: 'Verified', desc: 'Runs unit and integration tests for SBF smart contracts in the local VM environment' },
  { name: 'cargo-build-bpf', category: 'Toolchain', size: '18.9 MB', status: 'Verified', desc: 'Legacy BPF program compilation harness wrapper for backward compatibility' },
  { name: 'cargo-test-bpf', category: 'Toolchain', size: '19.2 MB', status: 'Verified', desc: 'Legacy BPF program test execution wrapper' },
  { name: 'spl-token', category: 'DeFi / Tokens', size: '14.6 MB', status: 'Verified', desc: 'SPL Token CLI for creating, minting, transferring, and managing Token-2022 / SPL tokens' },
  { name: 'solana-ledger-tool', category: 'Diagnostics', size: '32.1 MB', status: 'Verified', desc: 'Low-level ledger verification, RocksDB blockstore inspection, and state repair' },
  { name: 'solana-gossip', category: 'Networking', size: '16.4 MB', status: 'Verified', desc: 'Discovers and audits active cluster nodes over Solana CRDS gossip protocol' },
  { name: 'solana-faucet', category: 'Testnet', size: '11.8 MB', status: 'Verified', desc: 'Airdrop faucet server for dispensing test SOL on local and devnet clusters' },
  { name: 'solana-bench-tps', category: 'Benchmarking', size: '24.5 MB', status: 'Verified', desc: 'High-concurrency load generation tool for measuring transactions per second (TPS)' },
  { name: 'solana-genesis', category: 'Validator', size: '15.3 MB', status: 'Verified', desc: 'Generates genesis block configuration, mint accounts, and cluster parameters' },
  { name: 'solana-watchtower', category: 'Monitoring', size: '13.7 MB', status: 'Verified', desc: 'Sanity checks validator cluster health, slot progression, and alert dispatch' },
  { name: 'solana-zk-keygen', category: 'Zero Knowledge', size: '16.1 MB', status: 'Verified', desc: 'Generates zero-knowledge proof keypairs for confidential transfers and ZK tokens' },
  { name: 'solana-tokens', category: 'Core CLI', size: '12.8 MB', status: 'Verified', desc: 'Batch token distribution and vesting schedule automation utility' },
  { name: 'solana-net-shaper', category: 'Networking', size: '10.2 MB', status: 'Verified', desc: 'Simulates network latency, jitter, and packet loss for validator resilience testing' },
  { name: 'solana-log-analyzer', category: 'Diagnostics', size: '8.4 MB', status: 'Verified', desc: 'High-throughput parser and analyzer for Solana validator system log files' },
  { name: 'solana-dos', category: 'Security', size: '14.9 MB', status: 'Verified', desc: 'Security benchmarking harness for measuring resistance against packet floods' },
  { name: 'solana-stake-accounts', category: 'Staking', size: '13.2 MB', status: 'Verified', desc: 'Audits and manages active stake delegations, warmup periods, and rewards' },
  { name: 'solana-banking-bench', category: 'Benchmarking', size: '22.0 MB', status: 'Verified', desc: 'Micro-benchmarking harness for transaction banking stages and signature queues' },
  { name: 'solana-accounts-bench', category: 'Benchmarking', size: '21.4 MB', status: 'Verified', desc: 'Benchmarks accounts-db read/write throughput and memory-mapped index latency' },
  { name: 'rbpf-cli', category: 'Runtime', size: '7.8 MB', status: 'Verified', desc: 'Standalone SBF/RBPF bytecode interpreter for low-level instruction tracing' }
];

// Code snippets for terminal tabs
const TERMINAL_SNIPPETS = {
  curl: {
    command: 'sh -c "$(curl -sSfL https://raw.githubusercontent.com/coad1024-cmd/solana-arm64-linux/main/install.sh)"',
    output: `[✓] Detecting Host Architecture: aarch64-unknown-linux-gnu (ARM64)
[✓] Fetching Latest Release: v1.18.26 (Agave Mainnet Release Suite)
[✓] Verifying SHA256 Checksum: solana-release-aarch64-unknown-linux-gnu.tar.bz2
[✓] Unpacking 24 Native ELF64 Binaries to ~/.local/share/solana/install/active_release/bin
[✓] Solana ARM64 Environment Ready in 4.18s!
$ solana --version
solana-cli 1.18.26 (client:SolanaLabs / Agave Native aarch64)`
  },
  cargo: {
    command: 'cargo build-sbf --manifest-path programs/counter/Cargo.toml',
    output: `[info] Compiling counter v0.1.0 (/home/dev/solana-project/programs/counter)
[info] LLVM SBF target: sbf-solana-solana (Native ARM64 LLVM backend)
[info] Binary artifact generated: target/deploy/counter.so (28.4 KB)
[info] SBF build completed in 18.2 seconds.`
  },
  litesvm: {
    command: 'cargo test --test litesvm_tests',
    output: `running 1 test
test tests::test_counter_lifecycle ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; finished in 0.15s
>>> Ultra-fast in-memory SVM test completed in 150 milliseconds!`
  },
  docker: {
    command: 'docker run --rm -it ghcr.io/solarm-org/solana-arm64:v1.18.26 solana --version',
    output: `Unable to find image 'ghcr.io/solarm-org/solana-arm64:v1.18.26' locally
v1.18.26: Pulling from solarm-org/solana-arm64 (linux/arm64)
Digest: sha256:4f8812e98c92a912b7dfa918a801e82811a0
solana-cli 1.18.26 (client:SolanaLabs native ARM64)`
  }
};

// DOM Content Loaded Handler
document.addEventListener('DOMContentLoaded', () => {
  initTerminalTabs();
  initToolingMatrix();
  initCalculator();
  initCopyButtons();
  initModals();
});

// Terminal Tabs Logic
function initTerminalTabs() {
  const tabs = document.querySelectorAll('.terminal-tab-btn');
  const codeElem = document.getElementById('terminal-code');
  const outputElem = document.getElementById('terminal-output');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const target = tab.getAttribute('data-tab');
      const snippet = TERMINAL_SNIPPETS[target];

      if (snippet && codeElem && outputElem) {
        codeElem.textContent = snippet.command;
        outputElem.textContent = snippet.output;
      }
    });
  });
}

// Tooling Matrix Search & Render
function initToolingMatrix() {
  const tableBody = document.getElementById('matrix-table-body');
  const searchInput = document.getElementById('matrix-search');
  const countBadge = document.getElementById('matrix-count');

  function renderTable(filterText = '') {
    if (!tableBody) return;
    const query = filterText.toLowerCase().trim();
    const filtered = SOLANA_ARM64_BINARIES.filter(item => 
      item.name.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.desc.toLowerCase().includes(query)
    );

    tableBody.innerHTML = filtered.map(item => `
      <tr>
        <td><span class="bin-name">${item.name}</span></td>
        <td><span class="bin-badge" style="background: rgba(153, 69, 255, 0.15); color: #d8b4fe;">${item.category}</span></td>
        <td><span class="bin-badge badge-verified"><span class="pulse-dot" style="display:inline-block; margin-right:4px;"></span>${item.status}</span></td>
        <td style="font-family: var(--font-mono); font-size: 0.85rem;">${item.size}</td>
        <td>${item.desc}</td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="copyText('${item.name} --help')" title="Copy usage command">
            Copy CMD
          </button>
        </td>
      </tr>
    `).join('');

    if (countBadge) {
      countBadge.textContent = `${filtered.length} of ${SOLANA_ARM64_BINARIES.length} Binaries`;
    }
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderTable(e.target.value);
    });
  }

  renderTable();
}

// Interactive ROI & Time Savings Calculator
function initCalculator() {
  const devsInput = document.getElementById('calc-devs');
  const buildsInput = document.getElementById('calc-builds');
  
  const devsVal = document.getElementById('calc-devs-val');
  const buildsVal = document.getElementById('calc-builds-val');

  const hoursSavedElem = document.getElementById('calc-hours-saved');
  const cloudSavedElem = document.getElementById('calc-cloud-saved');
  const co2SavedElem = document.getElementById('calc-co2-saved');

  function updateCalculations() {
    const devs = parseInt(devsInput.value, 10);
    const buildsPerDay = parseInt(buildsInput.value, 10);

    if (devsVal) devsVal.textContent = `${devs} Developers`;
    if (buildsVal) buildsVal.textContent = `${buildsPerDay} Builds/Day`;

    // Calculation constants
    const totalBuildsPerMonth = (devs * 2) + (buildsPerDay * 22);
    const hoursSavedMonth = Math.round(totalBuildsPerMonth * 1.08);
    const dollarsSavedMonth = Math.round((hoursSavedMonth * 2.8) + (totalBuildsPerMonth * 0.45));
    const co2SavedKg = Math.round(hoursSavedMonth * 0.18);

    if (hoursSavedElem) hoursSavedElem.textContent = `${hoursSavedMonth.toLocaleString()} hrs / mo`;
    if (cloudSavedElem) cloudSavedElem.textContent = `$${dollarsSavedMonth.toLocaleString()} USD / mo`;
    if (co2SavedElem) co2SavedElem.textContent = `${co2SavedKg.toLocaleString()} kg CO₂e`;
  }

  if (devsInput && buildsInput) {
    devsInput.addEventListener('input', updateCalculations);
    buildsInput.addEventListener('input', updateCalculations);
    updateCalculations();
  }
}

// Copy to Clipboard Utility with Toast Feedback
function initCopyButtons() {
  const copyBtn = document.getElementById('btn-copy-install');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const code = document.getElementById('terminal-code');
      if (code) {
        copyText(code.textContent.trim());
      }
    });
  }
}

window.copyText = function(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(`Copied: "${text.length > 35 ? text.substring(0, 35) + '...' : text}"`);
  }).catch(err => {
    console.error('Clipboard copy failed', err);
  });
};

function showToast(message) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span style="color: var(--sol-cyan);">✓</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

// Modal Dialog Management
function initModals() {
  // Roadmap & Blueprint Modal
  const openBlueprintBtns = document.querySelectorAll('#btn-open-proposal-modal');
  const blueprintModal = document.getElementById('grant-modal');
  const closeBlueprintBtn = document.getElementById('btn-close-modal');

  openBlueprintBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (blueprintModal) blueprintModal.showModal();
    });
  });

  if (closeBlueprintBtn && blueprintModal) {
    closeBlueprintBtn.addEventListener('click', () => {
      blueprintModal.close();
    });
  }

  // Devlog Modal
  const openDevlogBtn = document.getElementById('btn-open-devlog-modal');
  const devlogModal = document.getElementById('devlog-modal');
  const closeDevlogBtn = document.getElementById('btn-close-devlog-modal');

  if (openDevlogBtn && devlogModal) {
    openDevlogBtn.addEventListener('click', () => {
      devlogModal.showModal();
    });
  }

  if (closeDevlogBtn && devlogModal) {
    closeDevlogBtn.addEventListener('click', () => {
      devlogModal.close();
    });
  }
}
