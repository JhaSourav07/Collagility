import React from 'react';
import { Box, Text } from 'ink';

export interface FooterProps {
  modelName?: string;
}

export const Footer: React.FC<FooterProps> = ({ modelName = 'Gemini 3.5 Flash · high' }) => {
  return (
    <Box width="100%" justifyContent="space-between" paddingX={1} marginTop={0}>
      <Text color="gray">? for shortcuts</Text>
      <Text color="gray">
        Press <Text color="white">↑/↓</Text> history <Text color="gray">•</Text>{' '}
        <Text color="white">Tab</Text> completion <Text color="gray">•</Text>{' '}
        <Text color="white">/help</Text> commands
      </Text>
      <Text color="cyan">{modelName}</Text>
    </Box>
  );
};
