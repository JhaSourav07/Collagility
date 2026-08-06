import React from 'react';
import { Box, Text } from 'ink';
import type { SessionInfoState, AIDriverState, SubagentTask } from './types.js';

interface HeaderProps {
  session: SessionInfoState;
  aiDriver: AIDriverState;
  subagents?: SubagentTask[];
}

export const Header: React.FC<HeaderProps> = ({ session, aiDriver, subagents = [] }) => {
  const isOwner = session.userRole === 'owner';
  const workspace = session.workspacePath || process.cwd();
  const version = session.version || 'v2.0';
  const activeSubagentsCount = subagents.filter((s) => s.status === 'running').length;
  const connection = session.connectionStatus || 'connected';

  return (
    <Box flexDirection="column" width="100%" marginBottom={0}>
      {/* Classic Antigravity CLI Top Header Frame */}
      <Box
        borderStyle="single"
        borderColor="cyan"
        justifyContent="space-between"
        width="100%"
        paddingX={1}
      >
        <Box gap={1}>
          <Text color="cyan" bold>
            agy {version}
          </Text>
          <Text color="gray">//</Text>
          <Text color="white" bold>
            workspace:
          </Text>
          <Text color="blue">{workspace}</Text>
        </Box>

        <Box gap={2}>
          {/* Real-time Connection Status Badge */}
          <Box gap={1}>
            <Text color={connection === 'connected' ? 'green' : 'yellow'}>
              ● {connection.toUpperCase()}
            </Text>
          </Box>
          <Text color="gray">|</Text>
          {/* Active Agent & Model */}
          <Box gap={1}>
            <Text color="magenta" bold>
              {aiDriver.name}
            </Text>
            <Text color="gray">({aiDriver.model})</Text>
          </Box>
        </Box>
      </Box>

      {/* Sub-header Cards / Status Info Row */}
      <Box
        borderStyle="single"
        borderColor="gray"
        flexDirection="row"
        width="100%"
        justifyContent="space-between"
        paddingX={1}
        paddingY={0}
      >
        {/* Card 1: Session & Role */}
        <Box flexDirection="column" minWidth={22}>
          <Box gap={1}>
            <Text color="gray">Session:</Text>
            <Text color="blue" bold>{session.id}</Text>
          </Box>
          <Box gap={1}>
            <Text color="gray">Owner:</Text>
            <Text color="magenta" bold>{session.ownerName}</Text>
          </Box>
        </Box>

        {/* Card 2: Subagent Monitor Badge Indicator */}
        <Box flexDirection="column" minWidth={24}>
          <Box gap={1}>
            <Text color="cyan" bold>🤖 Subagents:</Text>
            <Text color={activeSubagentsCount > 0 ? 'green' : 'gray'} bold>
              {activeSubagentsCount} active
            </Text>
          </Box>
          <Text color="gray">Press Ctrl+K / /agents</Text>
        </Box>

        {/* Card 3: Connected Users */}
        <Box flexDirection="column" minWidth={22}>
          <Text color="gray" bold>
            Users ({session.users.length})
          </Text>
          <Box gap={1}>
            {session.users.slice(0, 2).map((user, idx) => (
              <Text key={idx} color={user.isSelf ? 'green' : 'white'}>
                {user.name}{user.isSelf ? ' (you)' : ''}
              </Text>
            ))}
          </Box>
        </Box>

        {/* Card 4: Quick Slash Shortcuts */}
        <Box flexDirection="column" minWidth={26}>
          <Text color="gray" bold>Shortcuts</Text>
          <Box gap={2}>
            <Text color="cyan">/config</Text>
            <Text color="cyan">/agents</Text>
            <Text color="cyan">/permissions</Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
