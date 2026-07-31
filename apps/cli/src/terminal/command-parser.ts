export type ParsedCLIInput =
  | { type: 'ai'; prompt: string; adapterName: string }
  | { type: 'chat'; text: string };

export function parseCLIInput(rawInput: string): ParsedCLIInput {
  const trimmed = rawInput.trim();

  // Match @gemini <prompt> or @ai <prompt>
  const aiMatch = trimmed.match(/^@(gemini|ai)\s+(.+)$/i);
  if (aiMatch) {
    return {
      type: 'ai',
      adapterName: aiMatch[1].toLowerCase() === 'ai' ? 'gemini' : aiMatch[1].toLowerCase(),
      prompt: aiMatch[2].trim(),
    };
  }

  return {
    type: 'chat',
    text: trimmed,
  };
}
