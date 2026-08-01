'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TerminalPreview } from '../components/TerminalPreview';
import {
  Terminal,
  Zap,
  Cpu,
  FolderGit2,
  ShieldCheck,
  Github,
  ArrowRight,
  Sparkles,
  Layers,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#0b0c0e] text-[#ededed] font-sans overflow-x-hidden selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Background Soft Glow Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-cyan-500/10 via-blue-500/5 to-transparent blur-[120px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0b0c0e]/80 border-b border-[#1a1d24]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-black text-sm">
              C
            </div>
            <span className="font-semibold text-lg tracking-tight text-white font-mono">Collagility</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              v0.1.0-alpha.5
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <a
              href="https://github.com/JhaSourav07/Collagility"
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-2 text-sm text-[#8a919e] hover:text-white transition-colors"
            >
              <Github className="w-4 h-4" />
              <span>GitHub</span>
            </a>
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-[#181b22] border border-[#262b36] text-[#8a919e]">
              Coming Soon
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-6 max-w-5xl mx-auto text-center space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#14171f] border border-[#232834] text-xs font-mono text-cyan-400"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>First Public Alpha Release</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-tight"
        >
          Collaborative AI Coding.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-xl md:text-2xl text-[#8a919e] max-w-3xl mx-auto font-light leading-relaxed"
        >
          One workspace. Multiple developers. One AI.
          <span className="block text-white font-medium mt-1">The multiplayer terminal for coding agents.</span>
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex items-center justify-center space-x-4 pt-4"
        >
          <a
            href="https://github.com/JhaSourav07/Collagility"
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-2 px-6 py-3 rounded-lg bg-white text-black font-medium text-sm hover:bg-zinc-200 transition-colors"
          >
            <Github className="w-4 h-4" />
            <span>View on GitHub</span>
            <ArrowRight className="w-4 h-4" />
          </a>

          <div className="px-6 py-3 rounded-lg bg-[#14171f] border border-[#232834] text-[#8a919e] font-medium text-sm flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Coming Soon</span>
          </div>
        </motion.div>
      </section>

      {/* Terminal Preview Section */}
      <section className="px-6 pb-28">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <TerminalPreview />
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-[#181b22] space-y-16">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold tracking-tight text-white">Built for Engineering Teams</h2>
          <p className="text-[#8a919e] max-w-xl mx-auto">
            Lightweight, open-source architecture connecting local AI CLI tools with collaborative real-time streaming.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-xl bg-[#101217] border border-[#1d212b] space-y-3 hover:border-cyan-500/30 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-white">Multiplayer AI Streaming</h3>
            <p className="text-sm text-[#8a919e] leading-relaxed">
              Every connected peer observes the exact same real-time token stream and progress status directly in their terminal window.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-[#101217] border border-[#1d212b] space-y-3 hover:border-cyan-500/30 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-white">Workspace-Aware Execution</h3>
            <p className="text-sm text-[#8a919e] leading-relaxed">
              AI prompts run directly in the session owner's project root directory, creating and editing files right where your code lives.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-[#101217] border border-[#1d212b] space-y-3 hover:border-cyan-500/30 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-white">Provider Adapter Framework</h3>
            <p className="text-sm text-[#8a919e] leading-relaxed">
              Pluggable adapter backend architecture supporting Antigravity (`agy`), Gemini, Claude, and Codex with dynamic `@agi` routing.
            </p>
          </div>
        </div>
      </section>

      {/* Roadmap Section */}
      <section className="max-w-4xl mx-auto px-6 py-20 border-t border-[#181b22] space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold tracking-tight text-white">Roadmap</h2>
          <p className="text-[#8a919e]">Public alpha release sequence and roadmap milestones.</p>
        </div>

        <div className="space-y-6">
          <div className="p-5 rounded-lg bg-[#12141a] border border-cyan-500/30 flex items-start space-x-4">
            <span className="px-2.5 py-1 text-xs font-mono rounded bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40">
              v0.1.0-alpha.5
            </span>
            <div className="space-y-1 flex-1">
              <h4 className="text-base font-semibold text-white">Initial Public Alpha</h4>
              <p className="text-sm text-[#8a919e]">
                Multiplayer WebSocket relay server, terminal CLI client, `agy`/`gemini` adapter, and workspace execution engine.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-lg bg-[#0e1014] border border-[#1d212b] flex items-start space-x-4">
            <span className="px-2.5 py-1 text-xs font-mono rounded bg-[#1c202a] text-[#8a919e] font-semibold border border-[#282e3d]">
              v0.2.0
            </span>
            <div className="space-y-1 flex-1">
              <h4 className="text-base font-semibold text-zinc-300">IDE Extensions</h4>
              <p className="text-sm text-[#8a919e]">
                VS Code and Antigravity IDE plugins for side-by-side graphical pair programming sessions.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-lg bg-[#0e1014] border border-[#1d212b] flex items-start space-x-4">
            <span className="px-2.5 py-1 text-xs font-mono rounded bg-[#1c202a] text-[#8a919e] font-semibold border border-[#282e3d]">
              v0.3.0
            </span>
            <div className="space-y-1 flex-1">
              <h4 className="text-base font-semibold text-zinc-300">Co-Driver Permissions</h4>
              <p className="text-sm text-[#8a919e]">
                Interactive multi-peer approval prompts for AI tool execution and code review.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Alpha Status Notice */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="p-6 rounded-xl bg-amber-500/5 border border-amber-500/20 text-center space-y-2">
          <div className="text-amber-400 font-semibold flex items-center justify-center space-x-2 text-sm">
            <ShieldCheck className="w-4 h-4" />
            <span>Early Public Alpha Release Notice</span>
          </div>
          <p className="text-xs text-amber-200/70 max-w-xl mx-auto leading-relaxed">
            Collagility is currently in early public alpha (`v0.1.0-alpha.5`). Breaking changes may occur in minor releases. Please report issues and feedback on GitHub.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#181b22] py-12 text-center text-xs text-[#525866] space-y-4">
        <div className="flex items-center justify-center space-x-6">
          <a href="https://github.com/JhaSourav07/Collagility" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
            GitHub
          </a>
          <a href="https://github.com/JhaSourav07/Collagility/blob/main/LICENSE" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
            License (MIT)
          </a>
          <a href="https://github.com/JhaSourav07/Collagility/blob/main/CONTRIBUTING.md" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
            Contributing
          </a>
        </div>
        <div>© 2026 Collagility. Built for engineers by engineers.</div>
      </footer>
    </div>
  );
}
