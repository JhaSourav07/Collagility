import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { PermissionRequest, RiskLevel, PermissionDecision } from '@collagility/protocol';

export interface PermissionPromptCardProps {
  request: PermissionRequest;
  onSelect: (decision: PermissionDecision) => void;
  onEditCommand?: (command: string) => void;
  queueCount?: number;
}

export const PermissionPromptCard: React.FC<PermissionPromptCardProps> = ({
  request,
  onSelect,
  onEditCommand,
  queueCount = 1,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const options: Array<{ label: string; value: PermissionDecision }> = [
    { label: '(y) Yes, run once', value: 'allow-once' },
    { label: `Always allow [${request.toolName}] for session`, value: 'allow-session' },
    { label: '(n) No, deny execution', value: 'deny' },
  ];

  useInput((input, key) => {
    const lowerInput = input.toLowerCase();

    if (lowerInput === 'y') {
      onSelect('allow-once');
      return;
    }
    if (lowerInput === 'n') {
      onSelect('deny');
      return;
    }
    if (lowerInput === 'e') {
      if (onEditCommand) {
        onEditCommand(request.command || request.toolName);
      }
      return;
    }

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
          Press <Text color="white" bold>y</Text> to approve • <Text color="white" bold>n</Text> to deny • <Text color="white" bold>e</Text> to edit • <Text color="white" bold>↑/↓/Enter</Text> to select:
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
