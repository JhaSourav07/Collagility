import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface ResumeOverlayProps {
  onClose: () => void;
  onSelectSession?: (id: string) => void;
}

export const ResumeOverlay: React.FC<ResumeOverlayProps> = ({ onClose, onSelectSession }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const pastSessions = [
    { id: 'sess-2026-0806-01', title: 'Antigravity Adapter Integration', time: '2 hours ago' },
    { id: 'sess-2026-0805-04', title: 'Milestone 9 E2E AI Stream Refactor', time: '1 day ago' },
    { id: 'sess-2026-0804-02', title: 'Terminal Renderer & Ink UI Setup', time: '2 days ago' },
  ];

  useInput((_input, key) => {
    if (key.escape) {
      onClose();
    } else if (key.return) {
      const selected = pastSessions[selectedIndex];
      if (selected && onSelectSession) {
        onSelectSession(selected.id);
      }
      onClose();
    } else if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : pastSessions.length - 1));
    } else if (key.downArrow) {
      setSelectedIndex((prev) => (prev < pastSessions.length - 1 ? prev + 1 : 0));
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="blue"
      paddingX={2}
      paddingY={1}
      width="100%"
      marginY={1}
    >
      <Box justifyContent="space-between" width="100%" marginBottom={1}>
        <Text color="blue" bold>
          📜  RESUME CONVERSATION HISTORY (/resume)
        </Text>
        <Text color="gray">[Esc to cancel • Enter to restore]</Text>
      </Box>

      {pastSessions.map((session, idx) => {
        const isSelected = idx === selectedIndex;
        return (
          <Box key={session.id} justifyContent="space-between" marginY={0.2}>
            <Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
              {isSelected ? '❯ ' : '  '}
              {session.title} <Text color="gray">({session.id})</Text>
            </Text>
            <Text color="gray">{session.time}</Text>
          </Box>
        );
      })}

      <Box marginTop={1}>
        <Text color="gray" italic>
          Select a previous session log to restore conversation context.
        </Text>
      </Box>
    </Box>
  );
};
