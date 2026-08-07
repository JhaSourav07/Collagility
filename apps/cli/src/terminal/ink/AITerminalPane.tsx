import React from 'react';
import { Box, Text } from 'ink';
import type { StyledRun } from '@collagility/adapters';

export type ScreenRow = StyledRun[];

export interface AITerminalPaneProps {
  snapshot: ScreenRow[];
  isFocused?: boolean;
  height?: number;
  title?: string;
}

/**
 * Maps ANSI palette numbers or hex color strings to Ink color props.
 * Consistently matches renderer dark theme colors for extended palettes.
 */
function mapColor(color?: string): string | undefined {
  if (!color) return undefined;
  if (color.startsWith('#')) return color;

  const colorMap: Record<string, string> = {
    '0': 'black',
    '1': 'red',
    '2': 'green',
    '3': 'yellow',
    '4': 'blue',
    '5': 'magenta',
    '6': 'cyan',
    '7': 'white',
    '8': 'gray',
    '9': '#f87171',    // bright red
    '10': '#4ade80',   // bright green
    '11': '#facc15',   // bright yellow
    '12': '#60a5fa',   // bright blue
    '13': '#c084fc',   // bright magenta
    '14': '#38bdf8',   // bright cyan
    '15': '#ffffff',   // bright white
  };

  return colorMap[color] || color;
}

export const AITerminalPane: React.FC<AITerminalPaneProps> = ({
  snapshot,
  isFocused = false,
  height,
  title = 'AI Terminal PTY',
}) => {
  const borderColor = isFocused ? 'cyan' : 'gray';

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
      height={height}
      width="100%"
    >
      {/* Pane Header with Focus Indicator */}
      <Box justifyContent="space-between" width="100%" marginBottom={0}>
        <Text color={isFocused ? 'cyan' : 'white'} bold>
          🖥 {title}
        </Text>
        {isFocused ? (
          <Text color="green" bold>
            ● live
          </Text>
        ) : (
          <Text color="gray">○ idle</Text>
        )}
      </Box>

      {/* Screen Buffer Snapshot Rows */}
      <Box flexDirection="column" width="100%">
        {snapshot.map((row, rowIndex) => (
          <Box key={rowIndex} flexDirection="row" width="100%">
            {row.map((run, runIndex) => (
              <Text
                key={runIndex}
                color={mapColor(run.fg)}
                backgroundColor={mapColor(run.bg)}
                bold={run.bold}
                dimColor={run.dim}
                italic={run.italic}
                underline={run.underline}
              >
                {run.text}
              </Text>
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  );
};
