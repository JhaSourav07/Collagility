import { describe, it, expect } from 'vitest';
import { normalizeServerUrl } from './config.js';

describe('normalizeServerUrl', () => {
  it('should normalize bare IP addresses into WebSocket URLs', () => {
    expect(normalizeServerUrl('192.168.1.50')).toBe('ws://192.168.1.50:8080/ws');
  });

  it('should normalize host:port strings into WebSocket URLs', () => {
    expect(normalizeServerUrl('192.168.1.50:9000')).toBe('ws://192.168.1.50:9000/ws');
  });

  it('should convert http:// and https:// URLs to ws:// and wss://', () => {
    expect(normalizeServerUrl('http://192.168.1.50:8080')).toBe('ws://192.168.1.50:8080/ws');
    expect(normalizeServerUrl('https://collagility.example.com')).toBe('wss://collagility.example.com/ws');
  });

  it('should preserve valid ws:// and wss:// URLs', () => {
    expect(normalizeServerUrl('ws://192.168.1.50:8080/ws')).toBe('ws://192.168.1.50:8080/ws');
    expect(normalizeServerUrl('wss://my-server.com/ws')).toBe('wss://my-server.com/ws');
  });
});
