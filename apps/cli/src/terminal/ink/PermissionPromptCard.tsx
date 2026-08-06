import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { PermissionRequest, RiskLevel, PermissionDecision } from '@collagility/protocol';

export interface PermissionPromptCardProps {
  request: PermissionRequest;
  onSelect: (decision: PermissionDecision) => void;
  queueCount?: number;
}

export const PermissionPromptCard: React.FC<PermissionPromptCardProps> = ({
  request,
  onSelect,
  queueCount = 1,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const options: Array<{ label: string; value: PermissionDecision }> = [
    { label: 'Yes, run once', value: 'allow-once' },
    { label: `Always allow [${request.toolName}] for this session`, value: 'allow-session' },
    { label: 'No, deny execution', value: 'deny' },
  ];

  useInput((_input, key) => {
    if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
    }
    if (key.downArrow) {
      setSelectedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
    }
    if (key.return) {
      onSelect(options[selectedIndex].value);
    }
  });

  const getBorderColor = (risk: RiskLevel) => {
    switch (risk) {
      case 'LOW':
        return 'green';
      case 'MEDIUM':
        return 'yellow';
      case 'HIGH':
      default:
        return 'red';
    }
  };

  const getBadgeColor = (risk: RiskLevel) => {
    switch (risk) {
      case 'LOW':
        return 'green';
      case 'MEDIUM':
        return 'yellow';
      case 'HIGH':
      default:
        return 'red';
    }
  };

  const borderColor = getBorderColor(request.riskLevel);
  const badgeColor = getBadgeColor(request.riskLevel);
  const queueBadge = queueCount > 1 ? ` (${queueCount} pending)` : '';

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={borderColor} paddingX={1} marginY={1}>
      <Box justifyContent="space-between" width="100%">
        <Text color="red" bold>
          🛡 SECURITY PERMISSION REQUIRED{queueBadge}
        </Text>
        <Text color={badgeColor} bold>
          [ RISK: {request.riskLevel} ]
        </Text>
      </Box>

      <Box marginTop={1} gap={1}>
        <Text color="cyan" bold>
          Tool:
        </Text>
        <Text color="white" bold>
          {request.toolName}
        </Text>
      </Box>

      <Box gap={1}>
        <Text color="cyan" bold>
          Command:
        </Text>
        <Text color="yellow">{request.command || request.toolName}</Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text color="gray" italic>
          Select action using ↑/↓ arrow keys and press Enter:
        </Text>
        {options.map((opt, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <Box key={opt.value} gap={1}>
              <Text color={isSelected ? 'cyan' : 'gray'}>
                {isSelected ? '❯' : ' '}
              </Text>
              <Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
                {opt.label}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
