import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

export interface MCPServerItem {
  name: string;
  transport: 'stdio' | 'sse';
  status: 'Active' | 'Disconnected' | 'Disabled';
  tools: string[];
}

export interface MCPOverlayProps {
  servers?: MCPServerItem[];
  onClose: () => void;
}

export const MCPOverlay: React.FC<MCPOverlayProps> = ({
  servers = [
    {
      name: 'filesystem',
      transport: 'stdio',
      status: 'Active',
      tools: ['read_file', 'write_file', 'list_directory'],
    },
    {
      name: 'fetch',
      transport: 'sse',
      status: 'Active',
      tools: ['fetch_web_page'],
    },
    {
      name: 'postgres-db',
      transport: 'stdio',
      status: 'Disconnected',
      tools: ['query_database', 'describe_table'],
    },
  ],
  onClose,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((_input, key) => {
    if (key.escape || key.return) {
      onClose();
    } else if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : servers.length - 1));
    } else if (key.downArrow) {
      setSelectedIndex((prev) => (prev < servers.length - 1 ? prev + 1 : 0));
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="green"
      paddingX={2}
      paddingY={1}
      width="100%"
      marginY={1}
    >
      <Box justifyContent="space-between" width="100%" marginBottom={1}>
        <Text color="green" bold>
          🔌  MODEL CONTEXT PROTOCOL (MCP) SERVERS OVERVIEW (/mcp)
        </Text>
        <Text color="gray">[Esc / Enter to close]</Text>
      </Box>

      {servers.length === 0 ? (
        <Text color="gray" italic>
          No MCP servers discovered in local .mcp.json or global ~/.gemini/antigravity-cli/mcp.json
        </Text>
      ) : (
        servers.map((server, idx) => {
          const isSelected = idx === selectedIndex;
          const statusColor =
            server.status === 'Active' ? 'green' : server.status === 'Disabled' ? 'gray' : 'red';

          return (
            <Box key={server.name} flexDirection="column" marginY={0.3}>
              <Box justifyContent="space-between">
                <Box gap={1}>
                  <Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
                    {isSelected ? '❯ ' : '  '}
                    {server.name}
                  </Text>
                  <Text color="gray">({server.transport.toUpperCase()})</Text>
                </Box>
                <Text color={statusColor} bold>
                  [{server.status}]
                </Text>
              </Box>

              <Box paddingLeft={4} gap={1}>
                <Text color="gray">Registered Tools:</Text>
                <Text color="cyan">
                  {server.tools.length > 0 ? server.tools.join(', ') : 'None'}
                </Text>
              </Box>
            </Box>
          );
        })
      )}

      <Box marginTop={1}>
        <Text color="gray" italic>
          All MCP tool calls pass through Collagility's risk evaluator before execution.
        </Text>
      </Box>
    </Box>
  );
};
