import { describe, it, expect } from 'vitest';
import { getHeaderTier, truncateWorkspacePath } from './Header.js';

describe('Header Responsive Layout & Helpers', () => {
  it('getHeaderTier returns minimal for < 60, compact for 60-99, and wide for >= 100', () => {
    expect(getHeaderTier(40)).toBe('minimal');
    expect(getHeaderTier(59)).toBe('minimal');
    expect(getHeaderTier(60)).toBe('compact');
    expect(getHeaderTier(80)).toBe('compact');
    expect(getHeaderTier(99)).toBe('compact');
    expect(getHeaderTier(100)).toBe('wide');
    expect(getHeaderTier(140)).toBe('wide');
  });

  it('truncateWorkspacePath preserves short paths and truncates long paths to last 2 segments', () => {
    expect(truncateWorkspacePath('/foo/bar')).toBe('/foo/bar');
    expect(truncateWorkspacePath('/run/media/sourav/New Volume/Projects/Collagility')).toBe(
      '…/Projects/Collagility'
    );
    expect(truncateWorkspacePath('C:\\Users\\Sourav\\Projects\\Collagility')).toBe(
      '…/Projects/Collagility'
    );
    expect(truncateWorkspacePath('')).toBe('');
  });
});
