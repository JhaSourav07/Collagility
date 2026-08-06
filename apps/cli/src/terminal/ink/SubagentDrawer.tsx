import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { SubagentTask } from './types.js';

export interface SubagentDrawerProps {
  tasks?: SubagentTask[];
  onClose: () => void;
}

export const SubagentDrawer: React.FC<SubagentDrawerProps> = ({
  tasks = [
    {
      id: 'subagent-101',
      name: 'Code Reviewer',
      target: 'Refactoring auth components',
      status: 'running',
      runtime: '14s',
      progress: 45,
    },
    {
      id: 'subagent-102',
      name: 'Static Analyzer',
      target: 'Checking ESLint and TS errors',
      status: 'completed',
      runtime: '32s',
      progress: 100,
    },
  ],
  onClose,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((_input, key) => {
    if (key.escape || key.return) {
      onClose();
    } else if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : tasks.length - 1));
    } else if (key.downArrow) {
      setSelectedIndex((prev) => (prev < tasks.length - 1 ? prev + 1 : 0));
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
          🤖 ANTIGRAVITY SUBAGENT MONITORING DRAWER (Ctrl+K / /agents)
        </Text>
        <Text color="gray">[Press Esc / Enter to close]</Text>
      </Box>

      {tasks.length === 0 ? (
        <Text color="gray" italic>
          No background subagent workers currently active.
        </Text>
      ) : (
        tasks.map((task, idx) => {
          const isSelected = idx === selectedIndex;
          const statusColor =
            task.status === 'running'
              ? 'green'
              : task.status === 'completed'
              ? 'blue'
              : task.status === 'failed'
              ? 'red'
              : 'gray';

          return (
            <Box key={task.id} flexDirection="column" marginY={0.3}>
              <Box justifyContent="space-between">
                <Box gap={1}>
                  <Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
                    {isSelected ? '❯ ' : '  '}[{task.id}]
                  </Text>
                  <Text color="white" bold>
                    {task.target || task.name}
                  </Text>
                </Box>

                <Box gap={1}>
                  <Text color="gray">Status:</Text>
                  <Text color={statusColor} bold>
                    {task.status.toUpperCase()}
                  </Text>
                  {task.runtime && <Text color="gray">({task.runtime})</Text>}
                </Box>
              </Box>

              <Box paddingLeft={4} gap={2}>
                {task.progress !== undefined && (
                  <Text color="cyan">Progress: {task.progress}%</Text>
                )}
                {task.name && task.name !== task.target && (
                  <Text color="gray">Active Tool: {task.name}</Text>
                )}
              </Box>
            </Box>
          );
        })
      )}

      <Box marginTop={1}>
        <Text color="gray" italic>
          Background subagents run asynchronously without interrupting prompt input.
        </Text>
      </Box>
    </Box>
  );
};
