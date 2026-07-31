const ADJECTIVES = [
  'silent',
  'blue',
  'swift',
  'forest',
  'cosmic',
  'crimson',
  'golden',
  'shadow',
  'bright',
  'amber',
];

const NOUNS = [
  'lake',
  'hawk',
  'echo',
  'river',
  'peak',
  'falcon',
  'nebula',
  'harbor',
  'ridge',
  'valley',
];

export interface SessionIdGenerator {
  generate(): string;
}

export class HumanReadableSessionIdGenerator implements SessionIdGenerator {
  public generate(): string {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${adj}-${noun}-${num}`;
  }
}
