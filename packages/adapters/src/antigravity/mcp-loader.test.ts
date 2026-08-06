import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadMCPServerConfigs, getMCPConfigFilePaths } from './mcp-loader.js';

describe('mcp-loader', () => {
  const tmpDir = path.join(os.tmpdir(), `mcp-test-${Date.now()}`);

  beforeEach(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should parse local .mcp.json file correctly', () => {
    const mcpPath = path.join(tmpDir, '.mcp.json');
    fs.writeFileSync(
      mcpPath,
      JSON.stringify({
        mcpServers: {
          database: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-postgres'],
            transport: 'stdio',
          },
        },
      })
    );

    const servers = loadMCPServerConfigs({ cwd: tmpDir });
    expect(servers).toHaveLength(1);
    expect(servers[0].name).toBe('database');
    expect(servers[0].transport).toBe('stdio');
    expect(servers[0].status).toBe('Active');
  });

  it('should fallback to default MCP tools when no config files exist', () => {
    const emptyDir = path.join(tmpDir, 'empty');
    fs.mkdirSync(emptyDir, { recursive: true });

    const servers = loadMCPServerConfigs({ cwd: emptyDir, userHome: emptyDir });
    expect(servers.length).toBeGreaterThan(0);
    expect(servers.some((s) => s.name === 'filesystem')).toBe(true);
  });
});
