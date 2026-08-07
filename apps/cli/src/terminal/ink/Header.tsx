import React from 'react';
import { Box, Text, useStdout } from 'ink';
import type { SessionInfoState, AIDriverState, SubagentTask } from './types.js';

export function getHeaderTier(columns: number): 'wide' | 'compact' | 'minimal' {
  if (!columns || Number.isNaN(columns) || columns < 60) return 'minimal';
  if (columns >= 100) return 'wide';
  return 'compact';
}

export function truncateWorkspacePath(workspacePath: string): string {
  if (!workspacePath) return '';
  const normalized = workspacePath.replace(/\\/g, '/');
  const segments = normalized.split('/').filter(Boolean);
  if (segments.length <= 2) {
    return workspacePath;
  }
  const lastTwo = segments.slice(-2);
  return `…/${lastTwo.join('/')}`;
}

interface HeaderProps {
  session: SessionInfoState;
  aiDriver: AIDriverState;
  subagents?: SubagentTask[];
}

export const Header: React.FC<HeaderProps> = ({ session, aiDriver, subagents = [] }) => {
  const { stdout } = useStdout();
  const rawColumns = stdout?.columns || process.stdout.columns;
  const columns = typeof rawColumns === 'number' && rawColumns > 0 ? rawColumns : 120;
  const tier = getHeaderTier(columns);

  const workspace = session.workspacePath || process.cwd();
  const version = session.version || 'v2.0';
  const activeSubagentsCount = subagents.filter((s) => s.status === 'running').length;
  const connection = session.connectionStatus || 'connected';

  if (tier === 'minimal') {
    return (
      <Box
        borderStyle="single"
        borderColor="cyan"
        flexDirection="column"
        width="100%"
        paddingX={1}
        marginBottom={0}
      >
        {/* Line 1: agy version · connection status · active subagents */}
        <Box gap={1}>
          <Text color="cyan" bold>
            agy {version}
          </Text>
          <Text color="gray">·</Text>
          <Text color={connection === 'connected' ? 'green' : 'yellow'}>
            ● {connection.toUpperCase()}
          </Text>
          {activeSubagentsCount > 0 && (
            <>
              <Text color="gray">·</Text>
              <Text color="cyan">🤖 {activeSubagentsCount} active</Text>
            </>
          )}
        </Box>

        {/* Line 2: AI Driver & Model */}
        <Box gap={1}>
          <Text color="magenta" bold>
            {aiDriver.name}
          </Text>
          <Text color="gray">({aiDriver.model})</Text>
        </Box>

        {/* Line 3: Session ID */}
        <Box gap={1}>
          <Text color="gray">Session:</Text>
          <Text color="blue" bold>
            {session.id}
          </Text>
        </Box>

        {/* Line 4: Owner */}
        <Box gap={1}>
          <Text color="gray">Owner:</Text>
          <Text color="magenta" bold>
            {session.ownerName}
          </Text>
        </Box>
      </Box>
    );
  }

  const displayedWorkspace = tier === 'compact' ? truncateWorkspacePath(workspace) : workspace;

  if (tier === 'compact') {
    return (
      <Box flexDirection="column" width="100%" marginBottom={0}>
        {/* Compact Header Frame */}
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
            <Text color="blue">{displayedWorkspace}</Text>
          </Box>

          <Box gap={1}>
            <Text color={connection === 'connected' ? 'green' : 'yellow'}>
              ● {connection.toUpperCase()}
            </Text>
            <Text color="gray">|</Text>
            <Text color="magenta" bold>
              {aiDriver.name}
            </Text>
            <Text color="gray">({aiDriver.model})</Text>
          </Box>
        </Box>

        {/* 2 Rows of 2 Cards Each */}
        <Box
          borderStyle="single"
          borderColor="gray"
          flexDirection="column"
          width="100%"
          paddingX={1}
          gap={0}
        >
          {/* Row 1: Session/Owner & Subagents */}
          <Box flexDirection="row" width="100%" justifyContent="space-between">
            <Box flexDirection="column" width="48%">
              <Box gap={1}>
                <Text color="gray">Session:</Text>
                <Text color="blue" bold>{session.id}</Text>
              </Box>
              <Box gap={1}>
                <Text color="gray">Owner:</Text>
                <Text color="magenta" bold>{session.ownerName}</Text>
              </Box>
            </Box>

            <Box flexDirection="column" width="48%">
              <Box gap={1}>
                <Text color="cyan" bold>🤖 Subagents:</Text>
                <Text color={activeSubagentsCount > 0 ? 'green' : 'gray'} bold>
                  {activeSubagentsCount} active
                </Text>
              </Box>
              <Text color="gray">Press Ctrl+K / /agents</Text>
            </Box>
          </Box>

          {/* Row 2: Users & Shortcuts */}
          <Box flexDirection="row" width="100%" justifyContent="space-between" marginTop={1}>
            <Box flexDirection="column" width="48%">
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

            <Box flexDirection="column" width="48%">
              <Text color="gray" bold>Shortcuts</Text>
              <Box gap={1}>
                <Text color="cyan">/config</Text>
                <Text color="cyan">/agents</Text>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  // Tier 1: Wide Layout (columns >= 100)
  return (
    <Box flexDirection="column" width="100%" marginBottom={0}>
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
          <Box gap={1}>
            <Text color={connection === 'connected' ? 'green' : 'yellow'}>
              ● {connection.toUpperCase()}
            </Text>
          </Box>
          <Text color="gray">|</Text>
          <Box gap={1}>
            <Text color="magenta" bold>
              {aiDriver.name}
            </Text>
            <Text color="gray">({aiDriver.model})</Text>
          </Box>
        </Box>
      </Box>

      <Box
        borderStyle="single"
        borderColor="gray"
        flexDirection="row"
        width="100%"
        justifyContent="space-between"
        paddingX={1}
        paddingY={0}
      >
        <Box flexDirection="column" minWidth={28}>
          <Box gap={1} justifyContent="space-between">
            <Text color="gray">Session:</Text>
            <Text color="blue" bold>{session.id}</Text>
          </Box>
          <Box gap={1} justifyContent="space-between">
            <Text color="gray">Owner:</Text>
            <Text color="magenta" bold>{session.ownerName}</Text>
          </Box>
        </Box>

        <Box flexDirection="column" minWidth={24}>
          <Box gap={1}>
            <Text color="cyan" bold>🤖 Subagents:</Text>
            <Text color={activeSubagentsCount > 0 ? 'green' : 'gray'} bold>
              {activeSubagentsCount} active
            </Text>
          </Box>
          <Text color="gray">Press Ctrl+K / /agents</Text>
        </Box>

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

        <Box flexDirection="column" minWidth={28}>
          <Text color="gray" bold>Shortcuts</Text>
          <Box gap={2}>
            <Text color="cyan">/config </Text>
            <Text color="cyan">/agents </Text>
            <Text color="cyan">/permissions</Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
