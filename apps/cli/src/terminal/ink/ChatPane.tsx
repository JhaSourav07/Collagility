import React from 'react';
import { Box, Text } from 'ink';
import type { ChatMessageItem, ActivityLogItem, InteractivePromptState, PermissionPromptState } from './types.js';
import { DocumentRenderer } from '@collagility/renderer';
import { InteractivePromptCard } from './InteractivePromptCard.js';
import { PermissionPromptCard } from './PermissionPromptCard.js';

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

interface TimelineEvent {
  id: string;
  timestamp: string;
  kind: 'system' | 'activity' | 'user' | 'ai';
  sender?: string;
  content: string;
  icon?: string;
  isStreaming?: boolean;
  thoughtBlock?: string;
  toolCard?: ChatMessageItem['toolCard'];
  fileEditCard?: ChatMessageItem['fileEditCard'];
}

export const ChatPane: React.FC<ChatPaneProps> = ({
  messages,
  activities = [],
  interactivePrompt,
  permissionPrompt,
  isOwner = true,
  queueCount = 1,
  onEditCommand,
}) => {
  // Build unified chronological timeline stream
  const timeline: TimelineEvent[] = [];

  for (const msg of messages) {
    if (msg.id.startsWith('sys-init')) {
      timeline.push({
        id: msg.id,
        timestamp: msg.timestamp,
        kind: 'system',
        content: msg.content,
      });
    } else if (msg.senderRole === 'system') {
      timeline.push({
        id: msg.id,
        timestamp: msg.timestamp,
        kind: 'system',
        content: msg.content,
      });
    } else if (msg.senderRole === 'ai') {
      timeline.push({
        id: msg.id,
        timestamp: msg.timestamp,
        kind: 'ai',
        sender: msg.sender.replace(/^🤖\s*/, '').trim(),
        content: msg.content,
        isStreaming: msg.isStreaming,
        thoughtBlock: msg.thoughtBlock,
        toolCard: msg.toolCard,
        fileEditCard: msg.fileEditCard,
      });
    } else {
      timeline.push({
        id: msg.id,
        timestamp: msg.timestamp,
        kind: 'user',
        sender: msg.sender,
        content: msg.content,
        icon: msg.icon,
      });
    }
  }

  for (const act of activities) {
    timeline.push({
      id: act.id,
      timestamp: act.timestamp,
      kind: 'activity',
      content: act.text,
    });
  }

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

          // Render formatted markdown response document
          const formattedResponse = docRenderer.renderMarkdown(event.content);
          const lines = formattedResponse.split(/\r?\n/);

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
                    marginY={0.3}
                  >
                    <Text color="magenta" bold dimColor>
                      ▸ Multi-Step Reasoning / Thought Process:
                    </Text>
                    <Text color="gray" italic dimColor>
                      {event.thoughtBlock}
                    </Text>
                  </Box>
                )}

                {/* Structured File Edit Card */}
                {event.fileEditCard && (
                  <Box
                    borderStyle="round"
                    borderColor="cyan"
                    flexDirection="column"
                    paddingX={1}
                    marginY={0.3}
                  >
                    <Box gap={1}>
                      <Text color="cyan" bold>📝 File Edit:</Text>
                      <Text color="white" bold>{event.fileEditCard.filePath}</Text>
                    </Box>
                    <Box gap={2}>
                      <Text color="green">+{event.fileEditCard.additions} lines</Text>
                      <Text color="red">-{event.fileEditCard.deletions} lines</Text>
                    </Box>
                    {event.fileEditCard.diffSummary && (
                      <Text color="gray" italic>{event.fileEditCard.diffSummary}</Text>
                    )}
                  </Box>
                )}

                {/* Structured Tool Execution Card */}
                {event.toolCard && (
                  <Box
                    borderStyle="round"
                    borderColor={event.toolCard.status === 'failed' ? 'red' : 'green'}
                    flexDirection="column"
                    paddingX={1}
                    marginY={0.3}
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

                  // Tool action execution log: ● Read(file)
                  if (trimmedLine.startsWith('●')) {
                    return (
                      <Box key={idx} gap={1}>
                        <Text color="cyan">⚙️</Text>
                        <Text color="white">{trimmedLine.slice(1).trim()}</Text>
                      </Box>
                    );
                  }

                  // Tool action completed: ✓ Read(file)
                  if (trimmedLine.startsWith('✓ Tool') || trimmedLine.startsWith('✓ Read') || trimmedLine.startsWith('✓ Search') || trimmedLine.startsWith('✓ Edit')) {
                    return (
                      <Box key={idx} gap={1}>
                        <Text color="green">✓</Text>
                        <Text color="gray">{trimmedLine.replace(/^✓\s*/, '')}</Text>
                      </Box>
                    );
                  }

                  // Thought step summary: ▸ Thought for 2.1s
                  if (trimmedLine.startsWith('▸ Thought') || trimmedLine.startsWith('▸')) {
                    return (
                      <Box key={idx} marginY={0.2}>
                        <Text color="magenta" italic dimColor>
                          {trimmedLine}
                        </Text>
                      </Box>
                    );
                  }

                  return <Text key={idx}>{line}</Text>;
                })}
              </Box>
            </Box>
          );
        }

        // User Chat Message
        return (
          <Box key={event.id} gap={1} marginY={0.2}>
            <Text color="gray">{event.timestamp}</Text>
            {event.icon && <Text>{event.icon} </Text>}
            <Text color={senderColor} bold>
              {event.sender}&gt;
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
