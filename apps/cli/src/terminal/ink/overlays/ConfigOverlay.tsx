import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface ConfigOverlayProps {
  onClose: () => void;
}

export const ConfigOverlay: React.FC<ConfigOverlayProps> = ({ onClose }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const settings = [
    { label: 'Security Mode', value: 'Manual Approval (Default)' },
    { label: 'AI Model', value: 'Gemini 3.5 Flash' },
    { label: 'Auto-Reconnect', value: 'Enabled (Max 10 attempts)' },
    { label: 'Stream Buffer Interval', value: '50 ms' },
    { label: 'Subagent Auto-Spawn', value: 'Enabled' },
    { label: 'Verbose Logging', value: 'Disabled' },
  ];

  useInput((_input, key) => {
    if (key.escape || key.return) {
      onClose();
    } else if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : settings.length - 1));
    } else if (key.downArrow) {
      setSelectedIndex((prev) => (prev < settings.length - 1 ? prev + 1 : 0));
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="magenta"
      paddingX={2}
      paddingY={1}
      width="100%"
      marginY={1}
    >
      <Box justifyContent="space-between" width="100%" marginBottom={1}>
        <Text color="magenta" bold>
          ⚙️  ANTIGRAVITY CLI CONFIGURATION & SETTINGS
        </Text>
        <Text color="gray">[Esc / Enter to close]</Text>
      </Box>

      {settings.map((item, idx) => {
        const isSelected = idx === selectedIndex;
        return (
          <Box key={item.label} gap={2} marginY={0.2}>
            <Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
              {isSelected ? '❯ ' : '  '}
              {item.label}:
            </Text>
            <Text color={isSelected ? 'yellow' : 'gray'}>{item.value}</Text>
          </Box>
        );
      })}

      <Box marginTop={1}>
        <Text color="gray" italic>
          Use ↑/↓ arrows to navigate settings • Press Esc to return to prompt
        </Text>
      </Box>
    </Box>
  );
};
