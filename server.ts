import express from 'express';
import path from 'path';
import { createServer as createHttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;
const server = createHttpServer(app);

// WebSocket Server
const wss = new WebSocketServer({ noServer: true });

// Attach WS upgrade handling
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// Structure for Party Player / Bot
interface PartyPlayer {
  id: string;
  name: string;
  isBot: boolean;
  coins: number;
  game: 'wanted' | 'letterjack' | 'none';
  state: any; // game-specific real-time view state
}

interface ChatMessage {
  playerId: string;
  senderName: string;
  message: string;
  timestamp: number;
}

interface Party {
  code: string;
  isRandom?: boolean;
  players: PartyPlayer[];
  lastActive: number;
  activeScreen?: 'wanted' | 'letterjack' | 'none';
  turnIndex?: number;
  sharedState?: any;
  chatMessages?: ChatMessage[];
}

// In-memory store for active parties
const parties = new Map<string, Party>();

// Helper to generate a random 4-letter room code
function generatePartyCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (parties.has(code));
  return code;
}

// Clean up idle parties every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [code, party] of parties.entries()) {
    if (now - party.lastActive > 30 * 60 * 1000) { // 30 mins idle
      parties.delete(code);
      console.log(`[Server] Deleted idle party: ${code}`);
    }
  }
}, 15 * 60 * 1000);

// Map of socket -> player metadata for quick cleanups
const socketMetadata = new Map<WebSocket, { partyCode: string; playerId: string }>();

// Broadcast party update to all active players in a room
function broadcastPartyUpdate(partyCode: string) {
  const party = parties.get(partyCode);
  if (!party) return;

  const payload = JSON.stringify({
    type: 'party_update',
    partyCode,
    isRandom: party.isRandom,
    players: party.players,
    activeScreen: party.activeScreen || 'none',
    turnIndex: party.turnIndex ?? 0,
    sharedState: party.sharedState || null,
  });

  for (const [ws, meta] of socketMetadata.entries()) {
    if (meta.partyCode === partyCode && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

function broadcastGlobalStats() {
  let totalConnections = 0;
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      totalConnections++;
    }
  });

  const payload = JSON.stringify({
    type: 'global_stats',
    activeUsersCount: totalConnections
  });

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

wss.on('connection', (ws) => {
  console.log('[WS] Client connected');
  broadcastGlobalStats();

  ws.on('message', (messageData) => {
    try {
      const data = JSON.parse(messageData.toString());
      console.log(`[WS] Received message of type: ${data.type}`);

      switch (data.type) {
        case 'create_party': {
          const { playerName } = data;
          const partyCode = generatePartyCode();
          const playerId = `player-${Math.random().toString(36).substr(2, 9)}`;

          const newParty: Party = {
            code: partyCode,
            players: [
              {
                id: playerId,
                name: playerName || 'Cowboy',
                isBot: false,
                coins: 1000,
                game: 'none',
                state: null,
              },
            ],
            lastActive: Date.now(),
          };

          parties.set(partyCode, newParty);
          socketMetadata.set(ws, { partyCode, playerId });

          ws.send(JSON.stringify({
            type: 'party_created',
            partyCode,
            isRandom: false,
            playerId,
            players: newParty.players,
          }));
          break;
        }

        case 'join_party': {
          const { partyCode, playerName } = data;
          const code = (partyCode || '').toUpperCase();
          const party = parties.get(code);

          if (!party) {
            ws.send(JSON.stringify({
              type: 'error',
              message: `No active party found with code ${code}`,
            }));
            return;
          }

          const playerId = `player-${Math.random().toString(36).substr(2, 9)}`;
          const newPlayer: PartyPlayer = {
            id: playerId,
            name: playerName || 'Partner',
            isBot: false,
            coins: 1000,
            game: 'none',
            state: null,
          };

          party.players.push(newPlayer);
          party.lastActive = Date.now();
          socketMetadata.set(ws, { partyCode: code, playerId });

          ws.send(JSON.stringify({
            type: 'party_joined',
            partyCode: code,
            isRandom: party.isRandom,
            playerId,
            players: party.players,
            chatMessages: party.chatMessages || [],
          }));

          // Notify all players in this room
          broadcastPartyUpdate(code);
          break;
        }

        case 'join_random_party': {
          const { playerName } = data;
          let foundCode = null;
          
          for (const [code, party] of parties.entries()) {
            if (party.isRandom && party.players.length < 4 && (!party.activeScreen || party.activeScreen === 'none')) {
              foundCode = code;
              break;
            }
          }

          const playerId = `player-${Math.random().toString(36).substr(2, 9)}`;
          const newPlayer: PartyPlayer = {
            id: playerId,
            name: playerName || 'Random Player',
            isBot: false,
            coins: 1000,
            game: 'none',
            state: null,
          };

          if (foundCode) {
            const party = parties.get(foundCode)!;
            party.players.push(newPlayer);
            party.lastActive = Date.now();
            socketMetadata.set(ws, { partyCode: foundCode, playerId });

            ws.send(JSON.stringify({
              type: 'party_joined',
              partyCode: foundCode,
              isRandom: true,
              playerId,
              players: party.players,
              chatMessages: party.chatMessages || [],
            }));
            broadcastPartyUpdate(foundCode);
          } else {
            const partyCode = generatePartyCode();
            const newParty: Party = {
              code: partyCode,
              isRandom: true,
              players: [newPlayer],
              lastActive: Date.now(),
              chatMessages: [],
            };
            parties.set(partyCode, newParty);
            socketMetadata.set(ws, { partyCode, playerId });

            ws.send(JSON.stringify({
              type: 'party_created',
              partyCode,
              isRandom: true,
              playerId,
              players: newParty.players,
            }));
          }
          break;
        }

        case 'chat_message': {
          const { partyCode, playerId, message } = data;
          const party = parties.get(partyCode);
          if (!party) return;

          const player = party.players.find(p => p.id === playerId);
          if (!player) return;

          const chatMessage: ChatMessage = {
            playerId,
            senderName: player.name,
            message,
            timestamp: Date.now()
          };

          if (!party.chatMessages) party.chatMessages = [];
          party.chatMessages.push(chatMessage);
          if (party.chatMessages.length > 50) party.chatMessages.shift(); // Keep last 50

          const payload = JSON.stringify({
            type: 'chat_message',
            ...chatMessage
          });

          for (const [wsConn, meta] of socketMetadata.entries()) {
            if (meta.partyCode === partyCode && wsConn.readyState === WebSocket.OPEN) {
              wsConn.send(payload);
            }
          }
          break;
        }

        case 'add_bot': {
          const { partyCode, botName, botDifficulty } = data;
          const party = parties.get(partyCode);
          if (!party) return;

          const botId = `bot-${Math.random().toString(36).substr(2, 9)}`;
          const newBot: PartyPlayer = {
            id: botId,
            name: botName || 'Iron Bot',
            isBot: true,
            coins: 1000,
            game: 'none',
            state: { difficulty: botDifficulty || 'medium' },
          };

          party.players.push(newBot);
          party.lastActive = Date.now();
          broadcastPartyUpdate(partyCode);
          break;
        }

        case 'remove_player': {
          const { partyCode, playerId } = data;
          const party = parties.get(partyCode);
          if (!party) return;

          party.players = party.players.filter(p => p.id !== playerId);
          party.lastActive = Date.now();
          broadcastPartyUpdate(partyCode);
          break;
        }

        case 'update_state': {
          const { partyCode, playerId, coins, game, state } = data;
          const party = parties.get(partyCode);
          if (!party) return;

          const player = party.players.find(p => p.id === playerId);
          if (player) {
            if (coins !== undefined) player.coins = coins;
            if (game !== undefined) player.game = game;
            if (state !== undefined) player.state = state;
            party.lastActive = Date.now();
            broadcastPartyUpdate(partyCode);
          }
          break;
        }

        case 'set_party_game_state': {
          const { partyCode, activeScreen, turnIndex, sharedState, players } = data;
          const party = parties.get(partyCode);
          if (!party) return;

          if (activeScreen !== undefined) party.activeScreen = activeScreen;
          if (turnIndex !== undefined) party.turnIndex = turnIndex;
          if (sharedState !== undefined) party.sharedState = sharedState;
          if (players !== undefined) party.players = players;
          
          party.lastActive = Date.now();
          broadcastPartyUpdate(partyCode);
          break;
        }

        case 'reset_party': {
          const { partyCode } = data;
          const party = parties.get(partyCode);
          if (!party) return;

          // Reset all players' coins to 1000
          party.players.forEach(p => {
            p.coins = 1000;
            p.game = 'none';
            p.state = null;
          });
          party.lastActive = Date.now();
          broadcastPartyUpdate(partyCode);
          break;
        }

        default:
          console.warn(`[WS] Unknown action type: ${data.type}`);
      }
    } catch (e) {
      console.error('[WS] Error processing message:', e);
    }
  });

  ws.on('close', () => {
    console.log('[WS] Client disconnected');
    const meta = socketMetadata.get(ws);
    if (meta) {
      const { partyCode, playerId } = meta;
      socketMetadata.delete(ws);

      const party = parties.get(partyCode);
      if (party) {
        // Filter out the human player
        party.players = party.players.filter(p => p.id !== playerId);
        
        // If there are no more human players, remove the party
        const remainingHumans = party.players.filter(p => !p.isBot);
        if (remainingHumans.length === 0) {
          parties.delete(partyCode);
          console.log(`[Server] All human players left. Deleted party: ${partyCode}`);
        } else {
          party.lastActive = Date.now();
          broadcastPartyUpdate(partyCode);
        }
      }
    }
    broadcastGlobalStats();
  });
});

// Start routing config
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', partiesCount: parties.size });
});

// Configure static assets serving & SPA fallback
async function startApp() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startApp();
