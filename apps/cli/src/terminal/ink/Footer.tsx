import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { SecurityMode } from '@collagility/protocol';

export interface FooterProps {
  modelName?: string;
  securityMode?: SecurityMode;
  onCycleSecurityMode?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  modelName = 'Gemini 3.5 Flash',
  securityMode = 'manual',
  onCycleSecurityMode,
}) => {
  useInput((_input, key) => {
    // Shift + Tab cycling listener
    if (key.tab && key.shift) {
      if (onCycleSecurityMode) {
        onCycleSecurityMode();
      }
    }
  });

  const getSecurityBadge = (mode: SecurityMode) => {
    switch (mode) {
      case 'auto':
        return <Text color="green" bold>[ ⚡ AUTO ]</Text>;
      case 'accept-edits':
        return <Text color="cyan" bold>[ 🛡 ACCEPT ]</Text>;
      case 'plan-only':
        return <Text color="blue" bold>[ 🔒 PLAN ]</Text>;
      case 'manual':
      default:
        return <Text color="yellow" bold>[ ⏸ MANUAL ]</Text>;
    }
  };

  return (
    <Box width="100%" justifyContent="space-between" paddingX={1} marginTop={0}>
      <Box gap={1}>
        <Text color="gray">Security Mode:</Text>
        {getSecurityBadge(securityMode)}
      </Box>
      <Text color="gray">
        Press <Text color="white">↑/↓</Text> history <Text color="gray">•</Text>{' '}
        <Text color="white">Shift+Tab</Text> mode <Text color="gray">•</Text>{' '}
        <Text color="white">/mode</Text> security
      </Text>
      <Text color="cyan">{modelName}</Text>
    </Box>
  );
};
