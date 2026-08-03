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
  CommandHandler,
} from './types.js';

export interface AppProps {
  session: SessionInfoState;
  aiDriver: AIDriverState;
  messages: ChatMessageItem[];
  activities: ActivityLogItem[];
  interactivePrompt?: InteractivePromptState | null;
  queueCount?: number;
  onCommand: CommandHandler;
}

export const App: React.FC<AppProps> = ({
  session,
  aiDriver,
  messages,
  activities,
  interactivePrompt,
  queueCount = 1,
  onCommand,
}) => {
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
          queueCount={queueCount}
        />
      </Box>

      {/* Bottom Developer Input Box */}
      <InputBar onSubmit={onCommand} />

      {/* Bottom Status Bar */}
      <Footer modelName={`${aiDriver.name} ${aiDriver.model}`} />
    </Box>
  );
};
