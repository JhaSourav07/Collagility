import React from 'react';
import { Box, Text } from 'ink';
import type { SessionInfoState, AIDriverState } from './types.js';

interface HeaderProps {
  session: SessionInfoState;
  aiDriver: AIDriverState;
}

export const Header: React.FC<HeaderProps> = ({ session, aiDriver }) => {
  const isOwner = session.userRole === 'owner';

  return (
    <Box flexDirection="column" width="100%" marginBottom={0}>
      {/* Title Bar Frame */}
      <Box
        borderStyle="single"
        borderColor="gray"
        justifyContent="center"
        width="100%"
        paddingX={1}
      >
        <Text color="cyan" bold>
          Collagility – Multiplayer Workspace for AI Coding
        </Text>
      </Box>

      {/* 4 Header Cards Row */}
      <Box
        borderStyle="single"
        borderColor="gray"
        flexDirection="row"
        width="100%"
        justifyContent="space-between"
        paddingX={1}
        paddingY={0}
      >
        {/* Card 1: Session Info */}
        <Box flexDirection="column" minWidth={22}>
          <Box>
            <Text color="gray">Session: </Text>
            <Text color="blue" bold>{session.id}</Text>
          </Box>
          <Box>
            <Text color="gray">Owner:   </Text>
            <Text color="magenta" bold>{session.ownerName}</Text>
          </Box>
          <Box>
            <Text color="gray">Created: </Text>
            <Text color="gray">{session.createdAgo}</Text>
          </Box>
        </Box>

        {/* Card 2: AI Driver Info */}
        <Box flexDirection="column" minWidth={26}>
          <Box>
            <Text color="gray">AI Driver: </Text>
            <Text color="magenta" bold>{aiDriver.name}</Text>
          </Box>
          <Box>
            <Text color="gray">Model:     </Text>
            <Text color="blue">{aiDriver.model}</Text>
          </Box>
          <Box>
            <Text color="gray">Mode:      </Text>
            <Text color="blue">{aiDriver.mode}</Text>
          </Box>
        </Box>

        {/* Card 3: Users */}
        <Box flexDirection="column" minWidth={24}>
          <Text color="gray" bold>Users ({session.users.length})</Text>
          {session.users.slice(0, 3).map((user, idx) => (
            <Box key={idx}>
              <Text color="green">• </Text>
              <Text color={user.isSelf ? 'green' : 'white'} bold={user.isSelf}>
                {user.name} {user.isSelf ? '(you)' : ''}
              </Text>
              {user.isOwner ? (
                <Text color="magenta">  Owner</Text>
              ) : null}
            </Box>
          ))}
        </Box>

        {/* Card 4: Commands */}
        <Box flexDirection="column" minWidth={30}>
          <Text color="gray" bold>Commands</Text>
          {isOwner ? (
            <>
              <Box gap={2}>
                <Text color="cyan">/help</Text>
                <Text color="cyan">/users</Text>
                <Text color="cyan">/history</Text>
              </Box>
              <Box gap={2}>
                <Text color="cyan">/driver</Text>
                <Text color="cyan">/share</Text>
                <Text color="cyan">/leave</Text>
              </Box>
              <Box>
                <Text color="cyan">/clear</Text>
              </Box>
            </>
          ) : (
            <>
              <Box gap={2}>
                <Text color="cyan">/help</Text>
                <Text color="cyan">/users</Text>
                <Text color="cyan">/history</Text>
              </Box>
              <Box gap={2}>
                <Text color="cyan">/share</Text>
                <Text color="cyan">/leave</Text>
                <Text color="cyan">/clear</Text>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};
