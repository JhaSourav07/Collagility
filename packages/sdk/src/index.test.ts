import { describe, it, expect } from 'vitest';
import { CollagilityClientSDK } from './index.js';

describe('@collagility/sdk', () => {
  it('should initialize SDK with server configuration', () => {
    const sdk = new CollagilityClientSDK({ serverUrl: 'wss://localhost:8080' });
    expect(sdk.getConfig().serverUrl).toBe('wss://localhost:8080');
  });
});
