import React, { useState, useEffect } from 'react';
import { Box, useInput, useStdout } from 'ink';
import { Header } from './Header.js';
import { ChatPane } from './ChatPane.js';
import { InputBar } from './InputBar.js';
import { Footer } from './Footer.js';
import { AITerminalPane, type ScreenRow } from './AITerminalPane.js';
import { ConfigOverlay } from './overlays/ConfigOverlay.js';
import { PermissionsOverlay } from './overlays/PermissionsOverlay.js';
import { SubagentDrawer } from './SubagentDrawer.js';
import { ResumeOverlay } from './overlays/ResumeOverlay.js';
import { MCPOverlay } from './overlays/MCPOverlay.js';
import type {
  SessionInfoState,
  AIDriverState,
  ChatMessageItem,
  ActivityLogItem,
  InteractivePromptState,
  PermissionPromptState,
  SubagentTask,
  OverlayType,
  CommandHandler,
} from './types.js';
import { parseCLIInput } from '../command-parser.js';

export interface AppProps {
  session: SessionInfoState;
  aiDriver: AIDriverState;
  messages: ChatMessageItem[];
  activities: ActivityLogItem[];
  subagents?: SubagentTask[];
  interactivePrompt?: InteractivePromptState | null;
  permissionPrompt?: PermissionPromptState | null;
  queueCount?: number;
  activeOverlay?: OverlayType;
  ptySnapshot?: ScreenRow[];
  onCommand: CommandHandler;
  onCycleSecurityMode?: () => void;
  onClearScreen?: () => void;
  onExitSession?: () => void;
  onPtyWrite?: (data: string) => void;
  onPtyResize?: (cols: number, rows: number) => void;
  onPtyScroll?: (amount: number, unit?: 'page' | 'line') => void;
}

export const App: React.FC<AppProps> = ({
  session,
  aiDriver,
  messages,
  activities,
  subagents = [],
  interactivePrompt,
  permissionPrompt,
  queueCount = 1,
  activeOverlay: propOverlay = 'none',
  ptySnapshot = [],
  onCommand,
  onCycleSecurityMode,
  onClearScreen,
  onExitSession,
  onPtyWrite,
  onPtyResize,
  onPtyScroll,
}) => {
  const [activeOverlay, setActiveOverlay] = useState<OverlayType>(propOverlay);
  const [focusedPane, setFocusedPane] = useState<'chat' | 'terminal'>('chat');

  const { stdout } = useStdout();
  const columns = stdout?.columns || 120;
  const rows = stdout?.rows || 30;

  const isNarrow = columns < 100;
  const leftWidth = isNarrow ? columns : Math.floor(columns / 2);
  const rightWidth = isNarrow ? columns : columns - Math.floor(columns / 2);
  const ptyHeight = Math.max(10, rows - 8);

  useEffect(() => {
    if (onPtyResize) {
      onPtyResize(Math.max(20, rightWidth - 4), Math.max(5, ptyHeight - 3));
    }
  }, [rightWidth, ptyHeight, onPtyResize]);

  // Keybinding handler supporting focus toggle, scrollback, & raw PTY input
  useInput((input, key) => {
    // Tab or Ctrl+T toggles keyboard focus between Chat Input and AI Terminal PTY
    if (key.tab || (key.ctrl && input.toLowerCase() === 't')) {
      setFocusedPane((prev) => (prev === 'chat' ? 'terminal' : 'chat'));
      return;
    }

    // When terminal pane is focused, handle PageUp/PageDown scroll & raw keystrokes
    if (focusedPane === 'terminal') {
      if (key.pageUp) {
        if (onPtyScroll) onPtyScroll(-1, 'page');
        return;
      }
      if (key.pageDown) {
        if (onPtyScroll) onPtyScroll(1, 'page');
        return;
      }

      if (onPtyWrite) {
        if (key.return) {
          onPtyWrite('\r');
        } else if (key.backspace || key.delete) {
          onPtyWrite('\x7f');
        } else if (key.escape) {
          onPtyWrite('\x1b');
        } else if (key.ctrl && input) {
          const code = input.toUpperCase().charCodeAt(0) - 64;
          if (code >= 1 && code <= 26) {
            onPtyWrite(String.fromCharCode(code));
          } else {
            onPtyWrite(input);
          }
        } else if (input) {
          onPtyWrite(input);
        }
      }
      return;
    }

    // Global Antigravity shortcuts (only active when chat input has focus)
    if (key.ctrl && input.toLowerCase() === 'k') {
      setActiveOverlay((prev) => (prev === 'agents' ? 'none' : 'agents'));
      return;
    }

    if (key.ctrl && input.toLowerCase() === 'l') {
      if (onClearScreen) onClearScreen();
      return;
    }

    if (key.ctrl && input.toLowerCase() === 'd') {
      if (onExitSession) onExitSession();
      else onCommand('/leave');
      return;
    }

    if ((key.ctrl && input.toLowerCase() === 'c') || key.escape) {
      if (activeOverlay !== 'none') {
        setActiveOverlay('none');
      }
    }
  });

  const handleCommandWrapped = (raw: string) => {
    const parsed = parseCLIInput(raw);

    if (parsed.type === 'overlay') {
      setActiveOverlay(parsed.target);
      return;
    }

    if (parsed.type === 'action') {
      if (parsed.action === 'clear' && onClearScreen) {
        onClearScreen();
        return;
      }
    }

    onCommand(raw);
  };

  const isInputBlocked = Boolean(permissionPrompt) || activeOverlay !== 'none';

  return (
    <Box flexDirection="column" width="100%" paddingX={0}>
      {/* Header Info Banner */}
      <Header session={session} aiDriver={aiDriver} subagents={subagents} />

      {/* Active Overlay Modal / Subagent Drawer */}
      {activeOverlay === 'config' && (
        <ConfigOverlay onClose={() => setActiveOverlay('none')} />
      )}
      {activeOverlay === 'permissions' && (
        <PermissionsOverlay onClose={() => setActiveOverlay('none')} />
      )}
      {activeOverlay === 'agents' && (
        <SubagentDrawer tasks={subagents} onClose={() => setActiveOverlay('none')} />
      )}
      {activeOverlay === 'resume' && (
        <ResumeOverlay onClose={() => setActiveOverlay('none')} />
      )}
      {activeOverlay === 'mcp' && (
        <MCPOverlay onClose={() => setActiveOverlay('none')} />
      )}

      {/* Split / Stacked Panes Layout */}
      <Box flexDirection={isNarrow ? 'column' : 'row'} width="100%" paddingY={1}>
        {/* Left Chat Pane Column */}
        <Box flexDirection="column" width={leftWidth} paddingRight={isNarrow ? 0 : 1}>
          <ChatPane
            messages={messages}
            activities={activities}
            interactivePrompt={interactivePrompt}
            permissionPrompt={permissionPrompt}
            isOwner={session.userRole === 'owner'}
            queueCount={queueCount}
            onEditCommand={(cmd) => {
              onCommand(`/edit-cmd ${cmd}`);
            }}
          />
          <InputBar
            onSubmit={handleCommandWrapped}
            isDisabled={isInputBlocked || focusedPane === 'terminal'}
          />
        </Box>

        {/* Right AI Terminal PTY Pane Column */}
        <Box flexDirection="column" width={rightWidth}>
          <AITerminalPane
            snapshot={ptySnapshot}
            isFocused={focusedPane === 'terminal'}
            height={ptyHeight}
            title={`${aiDriver.name} PTY`}
          />
        </Box>
      </Box>

      {/* Bottom Status Bar */}
      <Footer
        modelName={`${aiDriver.name} ${aiDriver.model}`}
        securityMode={aiDriver.securityMode || 'manual'}
        tokenStatus={aiDriver.tokenStatus}
        onCycleSecurityMode={onCycleSecurityMode}
      />
    </Box>
  );
};
