import React, { useState } from 'react';
import { Box, Text } from 'ink';

export interface DiffLine {
  type: 'add' | 'delete' | 'context';
  line: string;
}

export interface FileDiffCardProps {
  filePath: string;
  additions: number;
  deletions: number;
  diffSummary?: string;
  patch?: string;
  diffLines?: DiffLine[];
  isExpanded?: boolean;
}

export const FileDiffCard: React.FC<FileDiffCardProps> = ({
  filePath,
  additions,
  deletions,
  diffSummary,
  patch,
  diffLines,
  isExpanded: initialExpanded = false,
}) => {
  const [expanded] = useState(initialExpanded);

  const parsedLines: DiffLine[] = React.useMemo(() => {
    if (diffLines && diffLines.length > 0) return diffLines;
    if (!patch) return [];

    const lines = patch.split(/\r?\n/);
    const result: DiffLine[] = [];
    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        result.push({ type: 'add', line: line.slice(1) });
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        result.push({ type: 'delete', line: line.slice(1) });
      } else if (!line.startsWith('@@') && !line.startsWith('diff')) {
        result.push({ type: 'context', line: line.startsWith(' ') ? line.slice(1) : line });
      }
    }
    return result;
  }, [patch, diffLines]);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1} marginY={0.3}>
      <Box justifyContent="space-between" width="100%">
        <Box gap={1}>
          <Text color="yellow" bold>✏️ Edited</Text>
          <Text color="white" bold>{filePath}</Text>
          <Text color="gray">
            (<Text color="green">+{additions} lines</Text>, <Text color="red">-{deletions} lines</Text>)
          </Text>
        </Box>
        {parsedLines.length > 0 && (
          <Text color="gray" dimColor>
            {expanded ? '▲ [Fold]' : '▼ [Diff]'}
          </Text>
        )}
      </Box>

      {diffSummary && !expanded && (
        <Text color="gray" italic dimColor>
          {diffSummary}
        </Text>
      )}

      {(expanded || (parsedLines.length > 0 && parsedLines.length <= 15)) && parsedLines.length > 0 && (
        <Box flexDirection="column" marginTop={0.5} paddingLeft={1}>
          {parsedLines.map((dl, idx) => {
            if (dl.type === 'add') {
              return (
                <Box key={idx}>
                  <Text color="green">+ {dl.line}</Text>
                </Box>
              );
            }
            if (dl.type === 'delete') {
              return (
                <Box key={idx}>
                  <Text color="red">- {dl.line}</Text>
                </Box>
              );
            }
            return (
              <Box key={idx}>
                <Text color="gray">  {dl.line}</Text>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};
