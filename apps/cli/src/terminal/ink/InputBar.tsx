import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';

interface InputBarProps {
  onSubmit: (text: string) => void;
  placeholder?: string;
  isDisabled?: boolean;
}

export const InputBar: React.FC<InputBarProps> = ({
  onSubmit,
  placeholder = 'Type a message or /command...',
  isDisabled = false,
}) => {
  const [value, setValue] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const commandList = [
    '/help',
    '/mode',
    '/users',
    '/history',
    '/driver',
    '/share',
    '/leave',
    '/clear',
    '/gemini',
    '@gemini',
    '@agy',
    '@antigravity',
  ];

  useInput((_input, key) => {
    if (isDisabled) return;

    if (key.upArrow) {
      if (history.length > 0) {
        const nextIndex = historyIndex < history.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(nextIndex);
        setValue(history[history.length - 1 - nextIndex] || '');
      }
    } else if (key.downArrow) {
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setValue(history[history.length - 1 - nextIndex] || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setValue('');
      }
    } else if (key.tab) {
      if (value.startsWith('/') || value.startsWith('@')) {
        const match = commandList.find((cmd) => cmd.startsWith(value));
        if (match) {
          setValue(match + ' ');
        }
      }
    }
  });

  const handleSubmit = (text: string) => {
    if (isDisabled) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    setHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);
    setValue('');
    onSubmit(trimmed);
  };

  if (isDisabled) {
    return (
      <Box
        borderStyle="round"
        borderColor="gray"
        width="100%"
        paddingX={1}
        paddingY={0}
        marginTop={0}
      >
        <Text color="gray" bold>
          🔒 [Input Blocked - Resolve Permission Prompt Above]
        </Text>
      </Box>
    );
  }

  return (
    <Box
      borderStyle="round"
      borderColor="magenta"
      width="100%"
      paddingX={1}
      paddingY={0}
      marginTop={0}
    >
      <Text color="magenta" bold>
        &gt;{' '}
      </Text>
      <TextInput
        value={value}
        onChange={setValue}
        onSubmit={handleSubmit}
        placeholder={placeholder}
        showCursor
      />
    </Box>
  );
};
