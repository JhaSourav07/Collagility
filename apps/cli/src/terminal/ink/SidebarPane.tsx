import React from 'react';
import { Box, Text } from 'ink';
import type { ActivityLogItem } from './types.js';

interface SidebarPaneProps {
  activities: ActivityLogItem[];
}

export const SidebarPane: React.FC<SidebarPaneProps> = ({ activities }) => {
  return (
    <Box
      flexDirection="column"
      flexGrow={1}
      borderStyle="single"
      borderColor="gray"
      paddingLeft={1}
      paddingRight={1}
      minWidth={28}
    >
      {activities.map((item) => {
        let textColor = 'white';
        let isItalic = false;

        if (item.type === 'join') {
          textColor = 'green';
        } else if (item.type === 'leave') {
          textColor = 'red';
        } else if (item.type === 'typing') {
          textColor = 'gray';
          isItalic = true;
        } else if (item.type === 'session' || item.type === 'info') {
          textColor = 'gray';
        }

        return (
          <Box key={item.id} gap={1}>
            <Text color="gray">{item.timestamp}</Text>
            <Text color={textColor} italic={isItalic}>
              {item.text}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
};
