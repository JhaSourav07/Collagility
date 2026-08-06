import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface PermissionsOverlayProps {
  onClose: () => void;
}

export const PermissionsOverlay: React.FC<PermissionsOverlayProps> = ({ onClose }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const permissions = [
    { tool: 'File Read / Search', status: 'ALWAYS ALLOWED', color: 'green' },
    { tool: 'File Write / Edit', status: 'MANUAL CONFIRMATION REQUIRED', color: 'yellow' },
    { tool: 'Terminal Command Execution', status: 'MANUAL CONFIRMATION REQUIRED', color: 'yellow' },
    { tool: 'Network Requests / API Calls', status: 'ALWAYS ALLOWED', color: 'green' },
    { tool: 'Subagent Process Spawning', status: 'ALWAYS ALLOWED', color: 'green' },
  ];

  useInput((_input, key) => {
    if (key.escape || key.return) {
      onClose();
    } else if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : permissions.length - 1));
    } else if (key.downArrow) {
      setSelectedIndex((prev) => (prev < permissions.length - 1 ? prev + 1 : 0));
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="yellow"
      paddingX={2}
      paddingY={1}
      width="100%"
      marginY={1}
    >
      <Box justifyContent="space-between" width="100%" marginBottom={1}>
        <Text color="yellow" bold>
          🛡  TOOL EXECUTION SECURITY PERMISSIONS (/permissions)
        </Text>
        <Text color="gray">[Esc / Enter to close]</Text>
      </Box>

      {permissions.map((item, idx) => {
        const isSelected = idx === selectedIndex;
        return (
          <Box key={item.tool} justifyContent="space-between" marginY={0.2}>
            <Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
              {isSelected ? '❯ ' : '  '}
              {item.tool}
            </Text>
            <Text color={item.color as any} bold>
              [{item.status}]
            </Text>
          </Box>
        );
      })}

      <Box marginTop={1}>
        <Text color="gray" italic>
          Use Shift+Tab or /mode to toggle active Security Mode • Press Esc to close
        </Text>
      </Box>
    </Box>
  );
};
