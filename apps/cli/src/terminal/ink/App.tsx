import React, { useState } from 'react';
import { Box, useInput } from 'ink';
import { Header } from './Header.js';
import { ChatPane } from './ChatPane.js';
import { InputBar } from './InputBar.js';
import { Footer } from './Footer.js';
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
  onCommand: CommandHandler;
  onCycleSecurityMode?: () => void;
  onClearScreen?: () => void;
  onExitSession?: () => void;
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
  onCommand,
  onCycleSecurityMode,
  onClearScreen,
  onExitSession,
}) => {
  const [activeOverlay, setActiveOverlay] = useState<OverlayType>(propOverlay);

  // Keybinding handler for global shortcuts
  useInput((input, key) => {
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

    if (key.ctrl && input.toLowerCase() === 'c') {
      if (activeOverlay !== 'none') {
        setActiveOverlay('none');
      } else if (onClearScreen) {
        onClearScreen();
      }
      return;
    }

    if (key.escape) {
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

      {/* Chat Pane */}
      <Box flexDirection="column" width="100%" paddingY={1}>
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
          isDisabled={isInputBlocked}
        />
      </Box>

      {/* Bottom Status Bar */}
      <Footer
        modelName={`${aiDriver.name} ${aiDriver.model}`}
        securityMode={aiDriver.securityMode || 'manual'}
        tokenStatus={aiDriver.tokenStatus}
        isVisitor={session.userRole !== 'owner'}
        onCycleSecurityMode={onCycleSecurityMode}
      />
    </Box>
  );
};
