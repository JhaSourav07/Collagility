# @collagility/renderer

> Terminal AST Parser, Virtual Screen Diffing, and ANSI Formatter Engine

`@collagility/renderer` parses raw streaming output into structured terminal AST nodes, diffs virtual screen frames, and formats rich terminal UI components for React Ink.

---

## ⚡ Exported APIs & Features

- **`Lexer` & `Parser`**: Converts streaming ANSI text into structured AST elements (paragraphs, code blocks, tool calls, inline styles).
- **`VirtualScreen` & `ScreenDiff`**: Calculates minimal terminal screen redraw deltas for smooth high-frequency stream rendering.
- **`ANSIFormatter`**: Handles terminal color codes, text attributes, and custom block rendering.

---

## 🧪 Testing

```bash
pnpm --filter @collagility/renderer test
```
