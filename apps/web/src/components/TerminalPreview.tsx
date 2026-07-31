'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function TerminalPreview() {
  const [streamProgress, setStreamProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStreamProgress((prev) => (prev >= 100 ? 0 : prev + 10));
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto rounded-xl border border-[#22262d] bg-[#0e1014] overflow-hidden card-glow subtle-glow">
      {/* Terminal Titlebar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#13161c] border-b border-[#22262d]">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
        </div>
        <div className="text-xs font-mono text-[#8a919e] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          collagility — bright-river-8651 (owner: alex)
        </div>
        <div className="text-xs font-mono text-[#525866]">v0.1.0-alpha.1</div>
      </div>

      {/* Split Terminal View */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#22262d] font-mono text-xs md:text-sm p-4 gap-4 md:gap-0 bg-[#0b0c0e]">
        {/* Left Side: Developer Chat & AI Command Prompt */}
        <div className="p-4 space-y-4 text-[#c5c9d3]">
          <div className="text-xs uppercase tracking-wider text-[#525866] font-semibold flex items-center justify-between border-b border-[#1b1f26] pb-2">
            <span>Session Chat & Prompts</span>
            <span className="text-[#00f2fe] text-[10px] bg-[#00f2fe]/10 px-2 py-0.5 rounded border border-[#00f2fe]/20">2 Members Active</span>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-[#525866]">[19:10:01]</span>{' '}
              <span className="text-amber-400 font-semibold">alex (OWNER)</span>:
              <span className="text-zinc-300 ml-2">Hey Sarah, initializing AI session for workspace</span>
            </div>

            <div>
              <span className="text-[#525866]">[19:10:05]</span>{' '}
              <span className="text-cyan-400 font-semibold">sarah (MEMBER)</span>:
              <span className="text-zinc-300 ml-2">Joined. Ready to pair.</span>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-2.5 rounded bg-[#13161c] border border-[#22262d]"
            >
              <div className="flex items-center gap-2 text-emerald-400">
                <span className="font-bold">&gt;</span>
                <span className="text-cyan-300 font-semibold">@agi</span>
                <span className="text-zinc-100">Create responsive index.html landing page</span>
              </div>
            </motion.div>

            <div className="text-xs text-zinc-500 italic pt-2">
              Waiting for next command input...
            </div>
          </div>
        </div>

        {/* Right Side: Live AI Execution Stream */}
        <div className="p-4 space-y-3 bg-[#0a0b0d] text-[#e1e4ed]">
          <div className="text-xs uppercase tracking-wider text-[#525866] font-semibold flex items-center justify-between border-b border-[#1b1f26] pb-2">
            <span>Real-time AI Stream</span>
            <span className="text-emerald-400 text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Live Output
            </span>
          </div>

          {/* Stream Header */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-cyan-400 text-black font-bold px-1.5 py-0.5 text-[11px] rounded">🤖 ANTIGRAVITY</span>
              <span className="text-cyan-400 font-semibold">AI Stream Started (agi)</span>
            </div>
            <div className="text-[#525866] text-xs">Prompt: "Create responsive index.html landing page"</div>
            <div className="text-[#22262d]">────────────────────────────────────────────────────────</div>
          </div>

          {/* Live Thinking & Stream Execution Content */}
          <div className="space-y-1.5">
            <div className="text-cyan-400/80 italic text-xs flex items-center gap-1.5">
              <span>⚡</span>
              <span>Thinking... analyzing project root structure</span>
            </div>
            <div className="text-cyan-400/80 italic text-xs flex items-center gap-1.5">
              <span>⚡</span>
              <span>Reading package.json workspace configuration</span>
            </div>
            <div className="text-cyan-400/80 italic text-xs flex items-center gap-1.5">
              <span>⚡</span>
              <span>Generating index.html in /run/media/.../Projects/Collagility</span>
            </div>

            <div className="mt-3 p-2 bg-[#12151b] border border-[#22262d] rounded text-xs text-zinc-300">
              <div className="text-cyan-400 text-[11px] font-semibold mb-1">┌── [html] ──────────────────────────</div>
              <div className="text-emerald-300 font-mono pl-2">
                {streamProgress > 20 && `<!DOCTYPE html>\n`}
                {streamProgress > 40 && `<html lang="en">\n<head>\n  <title>Collagility</title>\n</head>\n`}
                {streamProgress > 60 && `<body>\n  <h1>🎉 Collagility AI Integration Working</h1>\n`}
                {streamProgress > 80 && `</body>\n</html>`}
              </div>
              <div className="text-cyan-400 text-[11px] font-semibold mt-1">└────────────────────────────────────</div>
            </div>

            <div className="text-emerald-400 text-xs flex items-center gap-2 pt-2">
              <span>✓ Stream Complete (14 chunks, 1240ms, 482 bytes)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
