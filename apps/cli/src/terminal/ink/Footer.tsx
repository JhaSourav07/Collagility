import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { SecurityMode } from '@collagility/protocol';
import type { TokenStatus } from './types.js';

export interface FooterProps {
  modelName?: string;
  securityMode?: SecurityMode;
  tokenStatus?: TokenStatus;
  onCycleSecurityMode?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  modelName = 'Gemini 3.5 Flash',
  securityMode = 'manual',
  tokenStatus = { used: 14200, limit: 1000000 },
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

  const formatTokens = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return `${num}`;
  };

  return (
    <Box width="100%" justifyContent="space-between" paddingX={1} marginTop={0}>
      <Box gap={1}>
        <Text color="gray">Mode:</Text>
        {getSecurityBadge(securityMode)}
      </Box>

      <Box gap={1}>
        <Text color="gray">Tokens:</Text>
        <Text color="white" bold>
          {formatTokens(tokenStatus.used)} / {formatTokens(tokenStatus.limit)}
        </Text>
      </Box>

      <Text color="gray">
        <Text color="cyan">?</Text> help <Text color="gray">•</Text>{' '}
        <Text color="cyan">/config</Text> settings <Text color="gray">•</Text>{' '}
        <Text color="cyan">Shift+Tab</Text> cycle
      </Text>

      <Text color="magenta">{modelName}</Text>
    </Box>
  );
};
