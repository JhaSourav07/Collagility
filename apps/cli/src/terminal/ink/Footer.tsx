import React from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import type { SecurityMode } from '@collagility/protocol';
import type { TokenStatus } from './types.js';
import { getHeaderTier } from './Header.js';

export interface FooterProps {
  modelName?: string;
  securityMode?: SecurityMode;
  tokenStatus?: TokenStatus;
  isVisitor?: boolean;
  onCycleSecurityMode?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  modelName = 'Gemini 3.5 Flash',
  securityMode = 'manual',
  tokenStatus = { used: 14200, limit: 1000000 },
  isVisitor = false,
  onCycleSecurityMode,
}) => {
  const { stdout } = useStdout();
  const rawColumns = stdout?.columns || process.stdout.columns;
  const columns = typeof rawColumns === 'number' && rawColumns > 0 ? rawColumns : 120;
  const tier = getHeaderTier(columns);

  useInput((_input, key) => {
    // Shift + Tab cycling listener
    if (key.tab && key.shift) {
      if (onCycleSecurityMode) {
        onCycleSecurityMode();
      }
    }
  });

  const getSecurityBadge = (mode: SecurityMode) => {
    if (isVisitor) {
      return <Text color="cyan" bold>[ 📺 SCREENSHARE ]</Text>;
    }
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

  const renderTokenText = () => {
    if (isVisitor) {
      return <Text color="green" bold>0 Tokens (Host Funded)</Text>;
    }
    return (
      <Text color="white" bold>
        {formatTokens(tokenStatus.used)} / {formatTokens(tokenStatus.limit)}
      </Text>
    );
  };

  if (tier === 'minimal') {
    return (
      <Box flexDirection="column" width="100%" marginTop={0}>
        {/* Row 1: Mode badge + Tokens */}
        <Box width="100%" justifyContent="space-between" paddingX={1}>
          <Box gap={1}>
            <Text color="gray">Mode:</Text>
            {getSecurityBadge(securityMode)}
          </Box>

          <Box gap={1}>
            <Text color="gray">Tokens:</Text>
            {renderTokenText()}
          </Box>
        </Box>

        {/* Row 2: Model name & simple help hint */}
        <Box width="100%" justifyContent="space-between" paddingX={1}>
          <Text color="magenta">{modelName}</Text>
          <Text color="gray">
            <Text color="cyan">?</Text> help
          </Text>
        </Box>
      </Box>
    );
  }

  if (tier === 'compact') {
    return (
      <Box flexDirection="column" width="100%" marginTop={0}>
        {/* Row 1: Mode, Tokens, Model */}
        <Box width="100%" justifyContent="space-between" paddingX={1}>
          <Box gap={1}>
            <Text color="gray">Mode:</Text>
            {getSecurityBadge(securityMode)}
          </Box>

          <Box gap={1}>
            <Text color="gray">Tokens:</Text>
            {renderTokenText()}
          </Box>

          <Text color="magenta">{modelName}</Text>
        </Box>

        {/* Row 2: Shortcuts */}
        <Box width="100%" justifyContent="center" paddingX={1}>
          <Text color="gray">
            <Text color="cyan">?</Text> help <Text color="gray">•</Text>{' '}
            <Text color="cyan">/config</Text> settings <Text color="gray">•</Text>{' '}
            <Text color="cyan">Shift+Tab</Text> cycle
          </Text>
        </Box>
      </Box>
    );
  }

  // Tier: Wide (columns >= 100)
  return (
    <Box width="100%" justifyContent="space-between" paddingX={1} marginTop={0}>
      <Box gap={1}>
        <Text color="gray">Mode:</Text>
        {getSecurityBadge(securityMode)}
      </Box>

      <Box gap={1}>
        <Text color="gray">Tokens:</Text>
        {renderTokenText()}
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
