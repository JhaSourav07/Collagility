export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString();
}

export function truncateString(str: string, maxLength = 30): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}
