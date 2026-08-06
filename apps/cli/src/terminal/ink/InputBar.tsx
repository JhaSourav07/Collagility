import React, { useState, useRef, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import fs from 'node:fs';
import path from 'node:path';

interface InputBarProps {
  onSubmit: (text: string) => void;
  placeholder?: string;
  isDisabled?: boolean;
}

export const InputBar: React.FC<InputBarProps> = ({
  onSubmit,
  placeholder = 'Type a prompt, @file, or /command...',
  isDisabled = false,
}) => {
  const [value, setValue] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const lastEscTimeRef = useRef<number>(0);

  const commandList = [
    '/config',
    '/settings',
    '/permissions',
    '/agents',
    '/rewind',
    '/undo',
    '/resume',
    '/mode',
    '/help',
    '/leave',
    '/clear',
    '@agy',
    '@gemini',
    '@antigravity',
  ];

  // Helper to read local directory files for @ path autocomplete
  const getPathSuggestions = (query: string): string[] => {
    try {
      const cleanQuery = query.replace(/^@/, '');
      const targetDir = cleanQuery.includes('/')
        ? path.resolve(process.cwd(), path.dirname(cleanQuery))
        : process.cwd();

      const searchPrefix = cleanQuery.includes('/')
        ? path.basename(cleanQuery)
        : cleanQuery;

      const entries = fs.readdirSync(targetDir, { withFileTypes: true });
      return entries
        .filter((e) => !e.name.startsWith('.') && e.name.toLowerCase().startsWith(searchPrefix.toLowerCase()))
        .slice(0, 5)
        .map((e) => (e.isDirectory() ? `@${e.name}/` : `@${e.name}`));
    } catch {
      return ['@src/', '@package.json', '@tsconfig.json', '@README.md'];
    }
  };

  // Determine active autocomplete suggestions
  const autocompleteSuggestions = useMemo(() => {
    if (!value) return [];
    if (value.startsWith('/')) {
      return commandList.filter((cmd) => cmd.startsWith(value)).slice(0, 5);
    }
    const lastWord = value.split(/\s+/).pop() || '';
    if (lastWord.startsWith('@') && !['@agy', '@gemini', '@antigravity'].includes(lastWord)) {
      return getPathSuggestions(lastWord);
    }
    return [];
  }, [value]);

  useInput((_input, key) => {
    if (isDisabled) return;

    // Double Escape to clear prompt
    if (key.escape) {
      const now = Date.now();
      if (now - lastEscTimeRef.current < 500) {
        setValue('');
        lastEscTimeRef.current = 0;
      } else {
        lastEscTimeRef.current = now;
      }
      return;
    }

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
      if (autocompleteSuggestions.length > 0) {
        const suggestion = autocompleteSuggestions[0];
        if (value.startsWith('/')) {
          setValue(suggestion + ' ');
        } else {
          const words = value.split(/\s+/);
          words.pop();
          words.push(suggestion);
          setValue(words.join(' ') + ' ');
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
    <Box flexDirection="column" width="100%">
      {/* Autocomplete Suggestions Popup Box */}
      {autocompleteSuggestions.length > 0 && (
        <Box
          borderStyle="single"
          borderColor="cyan"
          flexDirection="column"
          paddingX={1}
          marginBottom={0}
        >
          <Text color="gray" italic>
            Suggestions (Press Tab to select):
          </Text>
          <Box gap={2}>
            {autocompleteSuggestions.map((sug, idx) => (
              <Text key={idx} color={idx === 0 ? 'cyan' : 'white'} bold={idx === 0}>
                {idx === 0 ? '❯ ' : ''}{sug}
              </Text>
            ))}
          </Box>
        </Box>
      )}

      {/* Primary Input Container */}
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
    </Box>
  );
};
