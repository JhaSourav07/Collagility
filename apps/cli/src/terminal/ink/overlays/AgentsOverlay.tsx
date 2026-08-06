import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { SubagentTask } from '../types.js';

interface AgentsOverlayProps {
  tasks?: SubagentTask[];
  onClose: () => void;
}

export const AgentsOverlay: React.FC<AgentsOverlayProps> = ({
  tasks = [
    {
      id: 'task-101',
      name: 'Code Review Agent',
      target: 'apps/cli/src/terminal',
      status: 'running',
      runtime: '12s',
      progress: 65,
    },
    {
      id: 'task-102',
      name: 'Test Generator',
      target: 'packages/adapters',
      status: 'idle',
      runtime: '45s',
      progress: 100,
    },
  ],
  onClose,
}) => {
  useInput((_input, key) => {
    if (key.escape || key.return) {
      onClose();
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
      width="100%"
      marginY={1}
    >
      <Box justifyContent="space-between" width="100%" marginBottom={1}>
        <Text color="cyan" bold>
          🤖 CONCURRENT SUBAGENTS MONITOR (/agents or Ctrl+K)
        </Text>
        <Text color="gray">[Esc / Enter to close]</Text>
      </Box>

      {tasks.length === 0 ? (
        <Text color="gray">No active subagents running.</Text>
      ) : (
        tasks.map((task) => (
          <Box key={task.id} flexDirection="column" marginY={0.4}>
            <Box justifyContent="space-between">
              <Box gap={1}>
                <Text color="blue" bold>● {task.name}</Text>
                <Text color="gray">({task.id})</Text>
              </Box>
              <Text color={task.status === 'running' ? 'green' : 'gray'} bold>
                [{task.status.toUpperCase()}] • {task.runtime}
              </Text>
            </Box>
            <Box gap={1}>
              <Text color="gray">Target:</Text>
              <Text color="white">{task.target}</Text>
              {task.progress !== undefined && (
                <Text color="cyan">[{task.progress}%]</Text>
              )}
            </Box>
          </Box>
        ))
      )}

      <Box marginTop={1}>
        <Text color="gray" italic>
          Subagents run background reasoning and workspace checks autonomously.
        </Text>
      </Box>
    </Box>
  );
};
