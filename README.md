# Collagility

> **The Multiplayer Terminal for AI Coding Agents**

[![Release](https://img.shields.io/badge/version-0.1.0beta-cyan.svg)](https://github.com/JhaSourav07/Collagility/releases/tag/0.1.0beta)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()

Collagility is an open-source multiplayer workspace that turns local AI coding agents into real-time collaborative pair programming sessions. Connect your local CLI tools (`agy`, `gemini`, `claude`) with collaborators and stream AI execution output token-by-token across every participant's terminal simultaneously.

---

### ⚡ Key Features

- **Multiplayer AI Streaming (done)**: Every session member observes the exact same real-time token output and progress logs from the session owner's local AI agent.
- **Provider-Agnostic Adapter Registry (done)**: Seamlessly route prompts to Antigravity (`agy`), Gemini (`gemini`), Claude (`claude`), Codex (`codex`), Aider (`aider`), or Goose (`goose`). Dynamic `@agi` tag automatically targets the active adapter.
- **Project Workspace Integration (done)**: AI agents execute commands and file modifications directly within the owner's project root workspace directory.
- **Permission Controls (done)**: Session owner maintains strict control over AI execution triggers while participants collaborate via live session chat.
- **Zero-Latency Event Protocol (done)**: Lightweight Fastify & WebSocket event plane architecture built with TypeScript.
- **IDE Extension Integration (future)**: VS Code & Antigravity IDE plugin integration for GUI-based pairing.
- **Interactive Co-Driver Approvals (future)**: Peer code review for agent tool calls in real time.

---

## 📽️ Demo

```text
[Owner Terminal]                                     [Collaborator Terminal]
> @agi create index.ts                              
                                                     🤖 ANTIGRAVITY AI Stream Started (agi)
🤖 ANTIGRAVITY AI Stream Started (agi)              Prompt: "create index.ts"
Prompt: "create index.ts"                           ────────────────────────────────────────────
────────────────────────────────────────────        ⚡ Thinking...
⚡ Thinking...                                       ⚡ Creating index.ts in project root...
⚡ Creating index.ts in project root...             ✓ File created successfully
✓ File created successfully
```

---

## 📦 Installation

### Single-Command Quick Install (Zero Dependencies Required) (done)

No Node.js, pnpm, or repository cloning is required. Run the automated installer in your terminal:

```bash
curl -fsSL https://raw.githubusercontent.com/JhaSourav07/Collagility/main/install.sh | bash
```

> **Note**: The automated installer fetches published release binaries from GitHub Releases. If installing prior to a published release or on private repos, use the [Source Build](#-installing-from-source-contributors) option below.

The installer detects your OS and architecture, downloads the latest standalone release binary, and installs it into `~/.local/bin/collagility`.

---

### 💻 Supported Platforms

| Platform | Architecture | Binary Archive | Status |
| -------- | ------------ | -------------- | ------ |
| Linux | x64 (AMD64) | `collagility-linux-x64.tar.gz` | **(done)** |
| Linux | arm64 (AArch64) | `collagility-linux-arm64.tar.gz` | **(done)** |
| macOS | Intel (x64) | `collagility-macos-x64.tar.gz` | **(done)** |
| macOS | Apple Silicon (M1/M2/M3) | `collagility-macos-arm64.tar.gz` | **(done)** |
| Windows | x64 | `collagility-windows-x64.zip` | **(future)** |

---

### 🔄 Updating Collagility (done)

To update Collagility to the latest version at any time, re-run the installation command:

```bash
curl -fsSL https://raw.githubusercontent.com/JhaSourav07/Collagility/main/install.sh | bash
```

---

### 🛠️ Installing from Source (Contributors) (done)

```bash
# Clone repository & build monorepo packages
git clone https://github.com/JhaSourav07/Collagility.git
cd Collagility
pnpm install && pnpm run build
sudo npm link
```

---

## 🚀 Usage (done)

### 1. Start Collagility Server (done)

```bash
collagility server start
```

### 2. Create a Session (Session Owner) (done)

```bash
# Start & host a session
collagility host

# Or in mock/demo mode (no AI binary required)
collagility host --mock
```

### 3. Join a Session (Participant) (done)

```bash
collagility join <session-id>
```

### 4. Invoke AI Commands (done)

Inside an active session terminal:

```text
> @agi create a responsive landing page in index.html
> @gemini explain mutex lock in src/index.ts
> hello team (normal chat)
```

---

## 🗺️ Roadmap

- [x] **v0.1.0-alpha.1**: Multiplayer WebSocket relay, AI stream chunking, `agy`/`gemini` CLI adapter, workspace execution, terminal renderer.
- [x] **v0.1.0-alpha.2**: Multi-provider adapters (`claude`, `codex`, `aider`, `goose`), permissions guard, binary packager, and release CI workflow.
- [x] **v0.1.0-alpha.6**: Professional terminal UI overhaul — AGY tool timeline, incremental stream rendering, fixed layout engine, non-blocking animations, 13 terminal components.
- [x] **v0.1.0beta** *(current)*: Official first public beta. Premium interactive installer (`install.sh`), `collagility host` alias, cross-platform test suite (28 tests), GitHub release `0.1.0beta`.
- [ ] **v0.2.0** *(planned)*: `collagility upgrade` self-updater, WebAssembly diffing engine, OSC 8 hyperlinks, multi-agent relay swarm.
- [ ] **v0.3.0** *(planned)*: Interactive co-driver approvals — peer code review for agent tool calls in real time.
- [ ] **v0.4.0** *(planned)*: Web dashboard, multi-agent consensus swarm routing, Redis cluster scaling.

---

## 📐 Architecture Overview

```text
┌────────────────┐     WebSocket     ┌────────────────┐     WebSocket     ┌────────────────┐
│   Owner CLI    │ ────────────────> │ Fastify Server │ ────────────────> │  Participant   │
│  (AI Adapter)  │ <──────────────── │ (StreamManager)│ <──────────────── │      CLI       │
└────────────────┘                   └────────────────┘                   └────────────────┘
```

- **`apps/cli`**: Terminal user interface, command parser, stream renderer.
- **`apps/server`**: High-performance WebSocket control plane and session manager.
- **`packages/adapters`**: Multi-provider AI process manager (`agy`, `gemini`, `claude`, `codex`).
- **`packages/stream`**: Token chunking, sequence ordering, and stream state management.
- **`packages/protocol`**: Shared WebSocket event schemas and envelope types.

---

## 🤝 Contributing

Contributions are welcome! Please read [`CONTRIBUTING.md`](CONTRIBUTING.md) and adhere to our [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

---

## 📜 License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for details.
