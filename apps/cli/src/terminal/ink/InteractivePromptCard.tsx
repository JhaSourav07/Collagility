import React from 'react';
import { Box, Text } from 'ink';
import type { InteractivePromptState } from './types.js';

interface InteractivePromptCardProps {
  prompt: InteractivePromptState;
  queueCount?: number;
}

export const InteractivePromptCard: React.FC<InteractivePromptCardProps> = ({
  prompt,
  queueCount = 1,
}) => {
  const getHeaderTitle = () => {
    const queueBadge = queueCount > 1 ? ` (1 of ${queueCount})` : '';
    switch (prompt.type) {
      case 'plan':
        return `📋 Implementation Plan Proposed${queueBadge}`;
      case 'question':
        return `❓ Agent Question${queueBadge}`;
      case 'confirmation':
        return `⚠️ Confirmation Requested${queueBadge}`;
      default:
        return `🤖 Interactive Prompt${queueBadge}`;
    }
  };

  const getHelpText = () => {
    switch (prompt.type) {
      case 'plan':
        return 'Type [y] Accept, [r] Read Details, [n] Reject';
      case 'question':
      case 'selection':
        return 'Type option number (1, 2, 3) or custom answer';
      case 'confirmation':
        return 'Type [y] Yes or [n] No';
      default:
        return 'Type choice or message';
    }
  };

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} marginY={1}>
      <Text color="cyan" bold>
        {getHeaderTitle()}
      </Text>
      <Text color="white" bold>
        {prompt.title}
      </Text>

      {prompt.filePath && (
        <Text color="magenta" dimColor>
          File: {prompt.filePath}
        </Text>
      )}

      <Box flexDirection="column" marginTop={1}>
        {prompt.options.map((opt) => (
          <Box key={opt.key} gap={1}>
            <Text color="yellow" bold>
              [{opt.key}]
            </Text>
            <Text color="white">{opt.label}</Text>
          </Box>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text color="gray" italic>
          {getHelpText()}
        </Text>
      </Box>
    </Box>
  );
};
