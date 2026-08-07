import React from 'react';
import { Box, Text } from 'ink';
import type { ChatMessageItem, ActivityLogItem, InteractivePromptState, PermissionPromptState } from './types.js';
import { DocumentRenderer } from '@collagility/renderer';
import { InteractivePromptCard } from './InteractivePromptCard.js';
import { PermissionPromptCard } from './PermissionPromptCard.js';
import { FileAnalysisBadge } from './FileAnalysisBadge.js';
import { FileDiffCard } from './FileDiffCard.js';

import { buildHumanTimeline, type TimelineEvent } from './timeline.js';

interface ChatPaneProps {
  messages: ChatMessageItem[];
  activities?: ActivityLogItem[];
  interactivePrompt?: InteractivePromptState | null;
  permissionPrompt?: PermissionPromptState | null;
  isOwner?: boolean;
  queueCount?: number;
  height?: number;
  onEditCommand?: (cmd: string) => void;
}

const docRenderer = new DocumentRenderer({ maxWidth: 95, theme: 'dark' });

export const ChatPane: React.FC<ChatPaneProps> = ({
  messages,
  activities = [],
  interactivePrompt,
  permissionPrompt,
  isOwner = true,
  queueCount = 1,
  onEditCommand,
}) => {
  const timeline = buildHumanTimeline(messages, activities);

  const getSenderColor = (sender?: string, kind?: string) => {
    if (kind === 'system' || kind === 'activity') return 'gray';
    if (kind === 'ai' || (sender && (sender.toLowerCase().includes('gemini') || sender.toLowerCase().includes('agy')))) {
      return 'magenta';
    }
    if (sender && sender.toLowerCase().includes('sourav')) return 'magenta';
    if (sender && sender.toLowerCase().includes('alex')) return 'blue';
    if (sender && sender.toLowerCase().includes('emma')) return 'green';
    return 'cyan';
  };

  return (
    <Box flexDirection="column" width="100%" paddingRight={1}>
      {timeline.map((event) => {
        const senderColor = getSenderColor(event.sender, event.kind);

        if (event.kind === 'system' || event.kind === 'activity') {
          return (
            <Box key={event.id} gap={1} marginY={0.1}>
              <Text color="gray">{event.timestamp}</Text>
              <Text color="gray" bold>
                [System]
              </Text>
              <Text color={event.content.includes('Session created') ? 'white' : 'gray'}>
                {event.content}
              </Text>
            </Box>
          );
        }

        if (event.kind === 'ai') {
          const isCheckmark = event.content.startsWith('✓');
          const isThinking = event.content === 'Thinking...' || event.content.startsWith('Thinking');

          if (isThinking && !event.thoughtBlock) {
            return (
              <Box key={event.id} gap={1} marginY={0.2}>
                <Text color="gray">{event.timestamp}</Text>
                <Text color="magenta" bold>
                  {event.sender}&gt;
                </Text>
                <Text color="magenta" dimColor italic>
                  💭 Multi-step reasoning in progress...
                </Text>
              </Box>
            );
          }

          if (isCheckmark) {
            return (
              <Box key={event.id} gap={1} marginY={0.2}>
                <Text color="gray">{event.timestamp}</Text>
                <Text color="magenta" bold>
                  {event.sender}&gt;
                </Text>
                <Text color="green">✓ </Text>
                <Text color="white">{event.content.replace(/^✓\s*/, '')}</Text>
              </Box>
            );
          }

          // Clean raw internal JSON string fragments and side-by-side duplicate badges
          const cleanedContent = event.content
            .replace(/\{"event":"(?:step_update|telemetry)".*?\}/g, '')
            .replace(/(📁 Listed directory [^\n]+?)\1+/g, '$1')
            .replace(/(🔍 Analyzed [^\n]+?)\1+/g, '$1')
            .replace(/(✏️ Edited [^\n]+?)\1+/g, '$1')
            .replace(/(🔎 Searched [^\n]+?)\1+/g, '$1')
            .trim();

          const formattedResponse = docRenderer.renderMarkdown(cleanedContent);
          const rawLines = formattedResponse.split(/\r?\n/);
          const lines: string[] = [];
          for (let i = 0; i < rawLines.length; i++) {
            const curr = rawLines[i].trim();
            if (!curr && i > 0 && !rawLines[i - 1].trim()) continue;
            if (curr.includes('{"event":"step_update"') || curr.includes('{"event":"telemetry"')) continue;
            if (i > 0 && curr.length > 0 && curr === rawLines[i - 1].trim()) continue;
            lines.push(rawLines[i]);
          }

          return (
            <Box key={event.id} flexDirection="column" marginY={0.5}>
              <Box gap={1}>
                <Text color="gray">{event.timestamp}</Text>
                <Text color="magenta" bold>
                  {event.sender}&gt;
                </Text>
              </Box>

              <Box paddingLeft={2} flexDirection="column">
                {/* Antigravity Thought Streaming Reasoning Block */}
                {event.thoughtBlock && (
                  <Box
                    borderStyle="single"
                    borderColor="gray"
                    flexDirection="column"
                    paddingX={1}
                    marginY={1}
                  >
                    <Text color="magenta" bold dimColor>
                      💭 Reasoning Thought:
                    </Text>
                    <Text color="gray" italic dimColor>
                      {event.thoughtBlock.startsWith('>') ? event.thoughtBlock : `> _${event.thoughtBlock}_`}
                    </Text>
                  </Box>
                )}

                {/* Structured File Analysis Badge */}
                {event.analysisBadge && (
                  <Box marginY={1} flexDirection="column">
                    <FileAnalysisBadge {...event.analysisBadge} />
                  </Box>
                )}

                {/* Structured File Edit Card */}
                {event.fileEditCard && (
                  <Box marginY={1} flexDirection="column">
                    <FileDiffCard
                      filePath={event.fileEditCard.filePath}
                      additions={event.fileEditCard.additions}
                      deletions={event.fileEditCard.deletions}
                      diffSummary={event.fileEditCard.diffSummary}
                      patch={event.fileEditCard.patch}
                      diffLines={event.fileEditCard.diffLines}
                    />
                  </Box>
                )}

                {/* Structured Tool Execution Card */}
                {event.toolCard && (
                  <Box
                    borderStyle="round"
                    borderColor={event.toolCard.status === 'failed' ? 'red' : 'green'}
                    flexDirection="column"
                    paddingX={1}
                    marginY={1}
                  >
                    <Box justifyContent="space-between">
                      <Box gap={1}>
                        <Text color="yellow" bold>🛠 Tool Execution:</Text>
                        <Text color="white" bold>{event.toolCard.toolName}</Text>
                      </Box>
                      <Text color={event.toolCard.status === 'success' ? 'green' : 'yellow'} bold>
                        [{event.toolCard.status.toUpperCase()}]
                      </Text>
                    </Box>
                    {event.toolCard.output && (
                      <Text color="gray">{event.toolCard.output}</Text>
                    )}
                  </Box>
                )}

                {/* Inline markdown lines */}
                {lines.map((line, idx) => {
                  const trimmedLine = line.trim();

                  // File Analysis Badge: 🔍 Analyzed / 🔎 Searched / 📁 Listed
                  if (trimmedLine.startsWith('🔍') || trimmedLine.startsWith('🔎') || trimmedLine.startsWith('📁') || trimmedLine.startsWith('[TOOL_ANALYSIS]')) {
                    return (
                      <Box key={idx} marginY={1} flexDirection="column">
                        <FileAnalysisBadge content={trimmedLine} />
                      </Box>
                    );
                  }

                  // File Diff Card: ✏️ Edited / [TOOL_FILE_EDIT]
                  if (trimmedLine.startsWith('✏️') || trimmedLine.startsWith('[TOOL_FILE_EDIT]')) {
                    const fMatch = trimmedLine.match(/(?:Edited\s+([^\s\()]+)|replace_file\s+([^\s]+)|write_file\s+([^\s]+)|edit_file\s+([^\s]+))/i);
                    const file = fMatch ? (fMatch[1] || fMatch[2] || fMatch[3] || fMatch[4]) : 'file';
                    const addMatch = trimmedLine.match(/\+(\d+)\s*lines?/i);
                    const delMatch = trimmedLine.match(/\-(\d+)\s*lines?/i);
                    const additions = addMatch ? parseInt(addMatch[1], 10) : 0;
                    const deletions = delMatch ? parseInt(delMatch[1], 10) : 0;
                    return (
                      <Box key={idx} marginY={1} flexDirection="column">
                        <FileDiffCard filePath={file} additions={additions} deletions={deletions} />
                      </Box>
                    );
                  }

                  // Tool action execution log: ● Read(file)
                  if (trimmedLine.startsWith('●')) {
                    return (
                      <Box key={idx} gap={1} marginY={0.1}>
                        <Text color="cyan">⚙️</Text>
                        <Text color="white">{trimmedLine.slice(1).trim()}</Text>
                      </Box>
                    );
                  }

                  // Tool action completed: ✓ Read(file)
                  if (trimmedLine.startsWith('✓ Tool') || trimmedLine.startsWith('✓ Read') || trimmedLine.startsWith('✓ Search') || trimmedLine.startsWith('✓ Edit')) {
                    return (
                      <Box key={idx} gap={1} marginY={0.1}>
                        <Text color="green">✓</Text>
                        <Text color="gray">{trimmedLine.replace(/^✓\s*/, '')}</Text>
                      </Box>
                    );
                  }

                  // Thought step summary or blockquote
                  if (trimmedLine.startsWith('▸ Thought') || trimmedLine.startsWith('▸') || trimmedLine.startsWith('>')) {
                    return (
                      <Box key={idx} marginY={0.1}>
                        <Text color="gray" italic dimColor>
                          {trimmedLine}
                        </Text>
                      </Box>
                    );
                  }

                  return <Text key={idx}>{line}</Text>;
                })}

                {/* Active typing indicator while response stream is processing */}
                {event.isStreaming && (
                  <Box gap={1} marginY={0.3}>
                    <Text color="magenta" dimColor italic>
                      [agy typing...]
                    </Text>
                  </Box>
                )}
              </Box>
            </Box>
          );
        }

        // User Chat Message
        const rawSender =
          (event.sender && event.sender.includes('-')
            ? event.sender.split('-')[0]
            : event.sender) || 'User';
        const displaySender =
          rawSender.length > 8 ? rawSender.slice(0, 8) : rawSender;

        return (
          <Box key={event.id} gap={1} marginY={0.2}>
            <Text color="gray">{event.timestamp}</Text>
            {event.icon && <Text>{event.icon} </Text>}
            <Text color={senderColor} bold>
              {displaySender}&gt;
            </Text>
            <Text color="white">{event.content}</Text>
          </Box>
        );
      })}

      {/* Render Security Permission Card or Active Option Card inside timeline stream */}
      {permissionPrompt ? (
        isOwner ? (
          <PermissionPromptCard
            request={permissionPrompt.request}
            onSelect={permissionPrompt.onResolve}
            onEditCommand={onEditCommand}
            queueCount={queueCount}
          />
        ) : (
          <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1} marginY={1}>
            <Text color="yellow" bold>
              ⏳ [Waiting for host to approve command: {permissionPrompt.request.command || permissionPrompt.request.toolName}]
            </Text>
            <Text color="gray" italic>
              Risk: {permissionPrompt.request.riskLevel} • Tool: {permissionPrompt.request.toolName}
            </Text>
          </Box>
        )
      ) : (
        interactivePrompt && <InteractivePromptCard prompt={interactivePrompt} queueCount={queueCount} />
      )}
    </Box>
  );
};
