import React from 'react';
import { Box } from 'ink';
import { Header } from './Header.js';
import { ChatPane } from './ChatPane.js';
import { InputBar } from './InputBar.js';
import { Footer } from './Footer.js';
import type {
  SessionInfoState,
  AIDriverState,
  ChatMessageItem,
  ActivityLogItem,
  InteractivePromptState,
  PermissionPromptState,
  CommandHandler,
} from './types.js';

export interface AppProps {
  session: SessionInfoState;
  aiDriver: AIDriverState;
  messages: ChatMessageItem[];
  activities: ActivityLogItem[];
  interactivePrompt?: InteractivePromptState | null;
  permissionPrompt?: PermissionPromptState | null;
  queueCount?: number;
  onCommand: CommandHandler;
  onCycleSecurityMode?: () => void;
}

export const App: React.FC<AppProps> = ({
  session,
  aiDriver,
  messages,
  activities,
  interactivePrompt,
  permissionPrompt,
  queueCount = 1,
  onCommand,
  onCycleSecurityMode,
}) => {
  const isInputBlocked = Boolean(permissionPrompt);

  return (
    <Box flexDirection="column" width="100%" paddingX={0}>
      {/* Header Info Banner */}
      <Header session={session} aiDriver={aiDriver} />

      {/* Single Continuous Terminal Timeline Stream */}
      <Box flexDirection="column" width="100%" paddingY={1} minHeight={14}>
        <ChatPane
          messages={messages}
          activities={activities}
          interactivePrompt={interactivePrompt}
          permissionPrompt={permissionPrompt}
          isOwner={session.userRole === 'owner'}
          queueCount={queueCount}
        />

      </Box>

      {/* Bottom Developer Input Box (Disabled when permission prompt active) */}
      <InputBar onSubmit={onCommand} isDisabled={isInputBlocked} />

      {/* Bottom Status Bar with Live Security Mode Badge */}
      <Footer
        modelName={`${aiDriver.name} ${aiDriver.model}`}
        securityMode={aiDriver.securityMode || 'manual'}
        onCycleSecurityMode={onCycleSecurityMode}
      />
    </Box>
  );
};
