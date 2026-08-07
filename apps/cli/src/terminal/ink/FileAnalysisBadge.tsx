import React from 'react';
import { Box, Text } from 'ink';

export interface FileAnalysisBadgeProps {
  toolName?: string;
  filePath?: string;
  lineRange?: string;
  query?: string;
  content?: string;
}

export const FileAnalysisBadge: React.FC<FileAnalysisBadgeProps> = ({
  toolName,
  filePath,
  lineRange,
  query,
  content,
}) => {
  if (query || toolName === 'grep_search' || toolName === 'grepSearch' || (content && content.includes('Searched'))) {
    const displayQuery = query || content?.match(/for "([^"]+)"/)?.[1] || content || '';
    return (
      <Box marginY={0.2} gap={1}>
        <Text color="cyan">🔎</Text>
        <Text color="cyan" bold>
          Searched workspace for
        </Text>
        <Text color="yellow" bold>
          "{displayQuery}"
        </Text>
      </Box>
    );
  }

  if (toolName === 'list_directory' || toolName === 'list_dir' || (content && content.includes('Listed directory'))) {
    const displayDir = filePath || content?.match(/directory\s+([^\s]+)/i)?.[1] || 'workspace';
    return (
      <Box marginY={0.2} gap={1}>
        <Text color="cyan">📁</Text>
        <Text color="cyan" bold>
          Listed directory
        </Text>
        <Text color="white" bold>
          {displayDir}
        </Text>
      </Box>
    );
  }

  const displayFile = filePath || content?.match(/(?:Analyzed|file)\s+([^\s\()]+)/i)?.[1] || 'file';
  const displayRange = lineRange || content?.match(/\((lines [^\)]+)\)/)?.[1];

  return (
    <Box marginY={0.2} gap={1}>
      <Text color="cyan">🔍</Text>
      <Text color="cyan" bold>
        Analyzed
      </Text>
      <Text color="white" bold>
        {displayFile}
      </Text>
      {displayRange && <Text color="gray">({displayRange})</Text>}
    </Box>
  );
};
