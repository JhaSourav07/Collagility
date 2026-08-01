'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StopCircle, Trash2, Send, X, Terminal, Users, Info, Sparkles, ShieldCheck, MessageSquare } from 'lucide-react';

export function TerminalPreview() {
  const [activeTab, setActiveTab] = useState<'chat' | 'members' | 'info'>('chat');
  const [inputValue, setInputValue] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isStreaming, setIsStreaming] = useState(true);
  const [streamStep, setStreamStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStreamStep((prev) => (prev >= 6 ? 0 : prev + 1));
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto rounded-xl border border-[#1f242d] bg-[#090a0d] shadow-2xl overflow-hidden font-sans text-xs md:text-sm select-none">
      {/* OS Window Titlebar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0f1117] border-b border-[#1f242d]">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 mr-3">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57] border border-[#e0443e]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e] border border-[#d8a025]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840] border border-[#1aab29]" />
          </div>
          <span className="font-mono text-xs text-[#8e95a5] font-medium tracking-wide">
            Collagility CLI v0.1.0-alpha.5
          </span>
        </div>
        <div className="flex items-center space-x-3 text-[#586073]">
          <span className="hover:text-white cursor-pointer">—</span>
          <span className="hover:text-white cursor-pointer">☐</span>
          <span className="hover:text-white cursor-pointer">✕</span>
        </div>
      </div>

      {/* Main Split Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#1c2029] bg-[#07080a] min-h-[580px]">
        {/* ================= LEFT PANEL: SESSION CHAT & PROMPTS ================= */}
        <div className="flex flex-col h-full bg-[#08090c]">
          {/* Header */}
          <div className="p-3.5 border-b border-[#1a1d26] bg-[#0c0e13]">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="font-mono text-[#e1e4eb] font-semibold text-xs md:text-sm">
                  Collagility Session: <span className="text-cyan-300">crimson-ridge-4493</span>
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                  OWNER
                </span>
                <span className="text-[#636b7e] font-mono text-xs">• 2 members</span>
              </div>
              <button className="text-[#525a6e] hover:text-white transition-colors p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-1.5 text-[11px] font-mono text-[#636e85] truncate">
              Workspace: <span className="text-[#3b82f6]">/home/sourav/Projects/Collagility</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center border-b border-[#1a1d26] bg-[#0a0c10] px-3 font-mono text-xs">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center space-x-2 px-3 py-2.5 border-b-2 font-medium transition-colors ${
                activeTab === 'chat'
                  ? 'border-[#3b82f6] text-[#60a5fa] bg-[#11151f]/50'
                  : 'border-transparent text-[#64748b] hover:text-[#94a3b8]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat</span>
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`flex items-center space-x-2 px-3 py-2.5 border-b-2 font-medium transition-colors ${
                activeTab === 'members'
                  ? 'border-[#3b82f6] text-[#60a5fa] bg-[#11151f]/50'
                  : 'border-transparent text-[#64748b] hover:text-[#94a3b8]'
              }`}
            >
              <span>Members (2)</span>
            </button>
            <button
              onClick={() => setActiveTab('info')}
              className={`flex items-center space-x-2 px-3 py-2.5 border-b-2 font-medium transition-colors ${
                activeTab === 'info'
                  ? 'border-[#3b82f6] text-[#60a5fa] bg-[#11151f]/50'
                  : 'border-transparent text-[#64748b] hover:text-[#94a3b8]'
              }`}
            >
              <span>Session Info</span>
            </button>
          </div>

          {/* Chat Messages Stream */}
          <div className="flex-1 p-4 font-mono text-xs space-y-3.5 overflow-y-auto max-h-[380px] bg-[#07080b]">
            {/* System message */}
            <div className="text-[#64748b]">
              <span className="text-[#475569]">[18:32:01]</span>{' '}
              <span className="text-[#38bdf8] font-semibold">[System]</span> Member{' '}
              <span className="text-zinc-300">0f749bda</span> joined the session
            </div>

            {/* Chat 1 */}
            <div>
              <span className="text-[#475569]">[18:32:05]</span>{' '}
              <span className="text-[#fbbf24] font-semibold">63e53e5a (You):</span>{' '}
              <span className="text-[#e2e8f0]">hi</span>
            </div>

            {/* Chat 2 */}
            <div>
              <span className="text-[#475569]">[18:32:08]</span>{' '}
              <span className="text-[#38bdf8] font-semibold">0f749bda:</span>{' '}
              <span className="text-[#e2e8f0]">hello! 👋</span>
            </div>

            {/* AI Command Divider 1 */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-[#1e2330]"></div>
              <span className="flex-shrink mx-3 text-[10px] text-[#475569] uppercase tracking-wider font-semibold">
                AI Command
              </span>
              <div className="flex-grow border-t border-[#1e2330]"></div>
            </div>

            {/* Prompt 1 */}
            <div>
              <span className="text-[#475569]">[18:32:23]</span>{' '}
              <span className="text-[#fbbf24] font-semibold">63e53e5a (You):</span>{' '}
              <span className="text-[#c084fc] font-bold">@agi</span>{' '}
              <span className="text-[#e2e8f0]">say hello if you are working</span>
            </div>

            {/* Stream started event 1 */}
            <div className="pl-3 border-l-2 border-[#c084fc]/40 space-y-0.5 py-0.5">
              <div className="text-[#c084fc] font-semibold flex items-center gap-1.5">
                <span>🤖 AI Stream Started (agi)</span>
              </div>
              <div className="text-[#94a3b8]">Prompt: "say hello if you are working"</div>
              <div className="text-[#475569] italic text-[11px]">(Streaming in right panel)</div>
            </div>

            {/* Chat reply */}
            <div>
              <span className="text-[#475569]">[18:32:50]</span>{' '}
              <span className="text-[#38bdf8] font-semibold">0f749bda:</span>{' '}
              <span className="text-[#e2e8f0]">nice!</span>
            </div>

            {/* AI Command Divider 2 */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-[#1e2330]"></div>
              <span className="flex-shrink mx-3 text-[10px] text-[#475569] uppercase tracking-wider font-semibold">
                AI Command
              </span>
              <div className="flex-grow border-t border-[#1e2330]"></div>
            </div>

            {/* Prompt 2 */}
            <div>
              <span className="text-[#475569]">[18:33:05]</span>{' '}
              <span className="text-[#fbbf24] font-semibold">63e53e5a (You):</span>{' '}
              <span className="text-[#c084fc] font-bold">@agi</span>{' '}
              <span className="text-[#e2e8f0]">
                create a file named hello.txt in this project root with what you just said
              </span>
            </div>

            {/* Stream started event 2 */}
            <div className="pl-3 border-l-2 border-[#c084fc]/40 space-y-0.5 py-0.5">
              <div className="text-[#c084fc] font-semibold flex items-center gap-1.5">
                <span>🤖 AI Stream Started (agi)</span>
              </div>
              <div className="text-[#94a3b8]">
                Prompt: "create a file named hello.txt in this project root with what you just said"
              </div>
              <div className="text-[#475569] italic text-[11px]">(Streaming in right panel)</div>
            </div>

            {/* Chat 3 */}
            <div>
              <span className="text-[#475569]">[18:34:10]</span>{' '}
              <span className="text-[#38bdf8] font-semibold">0f749bda:</span>{' '}
              <span className="text-[#e2e8f0]">🔥</span>
            </div>
          </div>

          {/* Bottom Chat Input Form */}
          <div className="p-3 border-t border-[#1a1d26] bg-[#0b0d12]">
            <div className="p-2.5 rounded-lg border border-[#242936] bg-[#07080b] focus-within:border-[#3b82f6] transition-colors">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type a message or @agi <prompt>..."
                className="w-full bg-transparent outline-none font-mono text-xs text-[#e2e8f0] placeholder-[#475569]"
              />
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#181b24] text-[10px] font-mono text-[#64748b]">
                <div className="flex items-center space-x-1.5 text-[#a855f7]">
                  <span className="font-medium">AI Commands:</span>
                  <span className="text-[#94a3b8]">@agi &lt;prompt&gt; | @agy &lt;prompt&gt; | @gemini &lt;prompt&gt;</span>
                </div>
                <button className="px-3 py-1 rounded bg-[#1d2432] text-[#60a5fa] hover:bg-[#2563eb] hover:text-white border border-[#2b3548] transition-colors font-sans font-semibold">
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT PANEL: LIVE AI CLI OUTPUT ================= */}
        <div className="flex flex-col h-full bg-[#06070a]">
          {/* Stream Header */}
          <div className="p-3.5 border-b border-[#1a1d26] bg-[#0c0e13] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs md:text-sm font-semibold text-[#e2e8f0] flex items-center gap-1.5">
                🤖 AI CLI (agi) - <span className="text-emerald-400 font-bold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" /> LIVE</span>
              </span>
            </div>
            <div className="flex items-center space-x-2 font-sans text-xs">
              <button className="px-2.5 py-1 rounded border border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors flex items-center gap-1 font-medium">
                <span className="w-2 h-2 rounded-sm border border-rose-400 bg-rose-500"></span>
                Stop AI
              </button>
              <button className="px-2.5 py-1 rounded border border-[#272d3b] bg-[#131620] text-[#94a3b8] hover:text-white transition-colors flex items-center gap-1">
                <span>🗑️</span> Clear
              </button>
            </div>
          </div>

          {/* AI Metadata Sub-bar */}
          <div className="px-4 py-2 bg-[#090b10] border-b border-[#171a23] font-mono text-[11px] text-[#64748b] space-y-0.5">
            <div>Model: <span className="text-[#e2e8f0] font-medium">Claude 3.5 (via agy CLI)</span></div>
            <div className="flex items-center justify-between">
              <div>Status: <span className="text-emerald-400 font-semibold">Connected</span></div>
              <div>Workspace: <span className="text-[#3b82f6]">/home/sourav/Projects/Collagility</span></div>
            </div>
          </div>

          {/* Cards Area */}
          <div className="flex-1 p-4 font-mono text-xs space-y-4 overflow-y-auto max-h-[400px] bg-[#050608]">
            {/* Stream Output Card 1 */}
            <div className="space-y-2">
              {/* Prompt Card */}
              <div className="p-3 rounded-lg border border-[#a855f7]/30 bg-[#a855f7]/5">
                <div className="text-[#c084fc] font-semibold text-[11px] mb-0.5">Current Prompt:</div>
                <div className="text-[#e2e8f0]">say hello if you are working</div>
              </div>

              {/* Terminal Output Window */}
              <div className="p-3.5 rounded-lg border border-[#a855f7]/30 bg-[#090a0f] space-y-1.5 text-[#34d399]">
                <div className="text-[#10b981] font-bold">&gt; agy</div>
                <div>&gt; Hello! Yes, I'm working perfectly fine. 👋</div>
                <div>&gt; How can I assist you with your project today?</div>
                <div className="flex items-center gap-1">
                  <span>&gt;</span>
                  <span className="w-2 h-4 bg-emerald-400 animate-pulse inline-block" />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="text-center font-mono text-[10px] text-[#a855f7]/60 my-2">
              ----------------------------- --- Stream Completed --- -----------------------------
            </div>

            {/* Stream Output Card 2 */}
            <div className="space-y-2">
              {/* Prompt Card */}
              <div className="p-3 rounded-lg border border-[#a855f7]/30 bg-[#a855f7]/5">
                <div className="text-[#c084fc] font-semibold text-[11px] mb-0.5">Current Prompt:</div>
                <div className="text-[#e2e8f0]">
                  create a file named hello.txt in this project root with what you just said
                </div>
              </div>

              {/* Terminal Output Window */}
              <div className="p-3.5 rounded-lg border border-[#a855f7]/30 bg-[#090a0f] space-y-1.5 text-[#34d399]">
                <div className="text-[#10b981] font-bold">&gt; agy</div>
                <div>&gt; I'll create that file for you.</div>
                <div className="font-semibold text-emerald-300">&gt; Creating file: hello.txt</div>
                <div className="font-bold text-emerald-400">&gt; File created successfully!</div>
                <div>&gt;</div>
                <div>&gt; Absolute path: <span className="text-[#10b981] underline">/home/sourav/Projects/Collagility/hello.txt</span></div>
                <div>&gt;</div>
                <div>&gt; Would you like me to open it or make any changes?</div>
                <div className="flex items-center gap-1">
                  <span>&gt;</span>
                  <span className="w-2 h-4 bg-emerald-400 animate-pulse inline-block" />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Status Bar */}
          <div className="px-4 py-2 bg-[#090b10] border-t border-[#171a23] font-mono text-[11px] flex items-center justify-between text-[#64748b]">
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Streaming output from agy CLI...</span>
            </div>
            <div className="text-emerald-400 font-semibold">
              Auto-scroll: ON
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
