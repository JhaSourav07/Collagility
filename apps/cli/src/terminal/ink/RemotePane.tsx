import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { VirtualScreen } from '@collagility/renderer';

export interface RemotePaneProps {
  screenData?: string;
  cols?: number;
  rows?: number;
  statusText?: string;
}

export function sanitizeTerminalStreamText(text: string): string {
  if (!text) return '';
  return text
    .replace(/^\s*\{"event":.*?\}(?:\r?\n)?/gm, '')
    .replace(/^\s*\{"type":.*?\}(?:\r?\n)?/gm, '')
    .replace(/\{"event":"(?:step_update|telemetry|init|result)".*?\}/g, '')
    .replace(/\{"step_type":".*?\}/g, '');
}

export function formatRemoteScreenLines(
  screenData: string,
  cols = 80,
  rows = 24
): string[] {
  if (!screenData) return [];

  const sanitized = sanitizeTerminalStreamText(screenData);
  if (!sanitized.trim()) return [];

  const screenHeight = Math.min(Math.max(rows, 10), 30);
  const screenWidth = Math.max(cols, 40);
  const screen = new VirtualScreen(screenWidth, screenHeight);

  const rawLines = sanitized.split(/\r?\n/).filter((l) => {
    const trimmed = l.trim();
    return (
      trimmed.length > 0 &&
      !trimmed.startsWith('{"event":') &&
      !trimmed.startsWith('{"type":') &&
      !trimmed.startsWith('{"step_type":')
    );
  });

  const visibleLines = rawLines.slice(-screenHeight);

  visibleLines.forEach((line, idx) => {
    // Strip ANSI escape control sequences for clean Ink string rendering
    const cleanLine = line.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
    screen.writeString(0, idx, cleanLine);
  });

  const outputRows: string[] = [];
  for (let y = 0; y < Math.min(visibleLines.length, screen.height); y++) {
    outputRows.push(screen.getRowString(y));
  }
  return outputRows;
}

export const RemotePane: React.FC<RemotePaneProps> = ({
  screenData = '',
  cols = 80,
  rows = 24,
  statusText = '[Waiting for host process...]',
}) => {
  const renderedLines = useMemo(() => {
    return formatRemoteScreenLines(screenData, cols, rows);
  }, [screenData, cols, rows]);

  if (!screenData || renderedLines.length === 0) {
    return (
      <Box
        flexDirection="column"
        width="100%"
        height="100%"
        borderStyle="round"
        borderColor="cyan"
        padding={1}
        justifyContent="center"
        alignItems="center"
      >
        <Text color="cyan" bold>
          📺 Live Terminal Mirror (agy)
        </Text>
        <Text color="gray">{statusText}</Text>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      width="100%"
      height="100%"
      borderStyle="round"
      borderColor="gray"
      paddingX={1}
    >
      <Box marginBottom={1} justifyContent="space-between">
        <Text color="green" bold>
          ● [Live Terminal - agy]
        </Text>
        <Text color="gray">
          {cols}x{rows}
        </Text>
      </Box>
      {renderedLines.map((line, idx) => (
        <Text key={`line-${idx}`} color="white">
          {line}
        </Text>
      ))}
    </Box>
  );
};
