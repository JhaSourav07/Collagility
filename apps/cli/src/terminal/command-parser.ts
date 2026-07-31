export type ParsedCLIInput =
  | { type: 'ai'; prompt: string; adapterName: string }
  | { type: 'chat'; text: string };

export function parseCLIInput(rawInput: string): ParsedCLIInput {
  const trimmed = rawInput.trim();

  // Match @agi <prompt>, @agy <prompt>, @antigravity <prompt>, @gemini <prompt>, @ai <prompt>, or any @<tag> <prompt>
  const aiMatch = trimmed.match(/^@([a-zA-Z0-9_-]+)\s+(.+)$/i);
  if (aiMatch) {
    const rawTag = aiMatch[1].toLowerCase();
    const adapterName = rawTag === 'ai' ? 'gemini' : rawTag;
    return {
      type: 'ai',
      adapterName,
      prompt: aiMatch[2].trim(),
    };
  }

  return {
    type: 'chat',
    text: trimmed,
  };
}
