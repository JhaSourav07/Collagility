export interface ColorStyle {
  primary: string;
  secondary: string;
  heading: string;
  subheading: string;
  text: string;
  code: string;
  codeBackground?: string;
  border: string;
  quoteBorder: string;
  link: string;
  fileRef: string;
  success: string;
  warning: string;
  error: string;
  dim: string;
}

export interface RenderTheme {
  name: string;
  colors: ColorStyle;
}

export const darkTheme: RenderTheme = {
  name: 'dark',
  colors: {
    primary: '#06b6d4',      // cyan
    secondary: '#a855f7',    // magenta/purple
    heading: '#38bdf8',      // light cyan
    subheading: '#cbd5e1',   // slate
    text: '#f8fafc',         // bright white
    code: '#34d399',         // emerald green
    border: '#475569',       // slate border
    quoteBorder: '#818cf8',  // indigo
    link: '#60a5fa',         // blue
    fileRef: '#a855f7',      // purple
    success: '#4ade80',      // green
    warning: '#facc15',      // yellow
    error: '#f87171',        // red
    dim: '#64748b',          // dim slate
  },
};

export const lightTheme: RenderTheme = {
  name: 'light',
  colors: {
    primary: '#0284c7',
    secondary: '#9333ea',
    heading: '#0369a1',
    subheading: '#334155',
    text: '#0f172a',
    code: '#059669',
    border: '#cbd5e1',
    quoteBorder: '#4f46e5',
    link: '#2563eb',
    fileRef: '#7e22ce',
    success: '#16a34a',
    warning: '#ca8a04',
    error: '#dc2626',
    dim: '#94a3b8',
  },
};

export function getTheme(themeName: string | RenderTheme = 'dark'): RenderTheme {
  if (typeof themeName === 'object') return themeName;
  if (themeName === 'light') return lightTheme;
  return darkTheme;
}
