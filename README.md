# Collagility

> **The Multiplayer Workspace for AI Coding Agents.**

Collagility is an open-source, terminal-native multiplayer platform that allows multiple developers to collaborate with the same local AI coding session directly from their own terminals.

---

## 🌟 Vision

Modern AI coding agents (such as Gemini CLI, Claude Code, Aider, and Goose) operate in isolated local terminals. Collagility enables teams to pair-program and debug collaboratively in real time while keeping **all AI compute and credentials strictly on the host developer's machine**.

* **Local Compute Sovereignty:** The AI agent executes exclusively on the owner's machine.
* **Zero-Knowledge Relay:** The server routes real-time collaboration events but never sees or handles AI API keys or provider requests.
* **Terminal Native:** Lightweight TUI experience designed for Unix workflows.

---

## 🏗️ Repository Architecture

This repository is structured as a pnpm monorepo managed with Turborepo:

```
collagility/
├── apps/
│   ├── cli/           # Terminal CLI entrypoint (@collagility/cli)
│   └── server/        # Fastify WebSocket relay server (@collagility/server)
├── packages/
│   ├── protocol/      # Event frame schemas and serialization (@collagility/protocol)
│   ├── sdk/           # Client WebSocket connection library (@collagility/sdk)
│   └── types/         # Shared domain types & interfaces (@collagility/types)
└── docs/              # Architecture Decision Records (ADRs) & Specs
```

---

## 🚀 Quickstart Development Guide

### Prerequisites
* Node.js `>= 22.0.0`
* pnpm `>= 9.0.0`

### Setup & Build Commands

```bash
# Install dependencies across all workspace packages
pnpm install

# Build all packages & applications via Turborepo
pnpm build

# Execute unit test suite with Vitest
pnpm test

# Run code linters
pnpm lint
```

---

## 📄 License

Apache 2.0 / MIT © Collagility Authors
