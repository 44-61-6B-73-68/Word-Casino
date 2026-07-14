import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { PartyState, PartyPlayer, LetterCard, SCRABBLE_VALUES } from '../types';

interface PartyContextProps {
  party: PartyState | null;
  playerId: string | null;
  isHost: boolean;
  activeUsersCount: number;
  createParty: (playerName: string, isOnline: boolean) => void;
  joinParty: (partyCode: string, playerName: string) => Promise<boolean>;
  joinRandomParty: (playerName: string) => Promise<boolean>;
  addBot: (botName: string, difficulty: 'easy' | 'medium' | 'hard') => void;
  removePlayer: (id: string) => void;
  updateMyState: (game: 'wanted' | 'letterjack' | 'none', state: any, coins?: number) => void;
  resetParty: () => void;
  leaveParty: () => void;
  setPartyGameState: (activeScreen: 'wanted' | 'letterjack' | 'none', turnIndex: number, sharedState: any, players?: PartyPlayer[]) => void;
  sendChatMessage: (message: string) => void;
}

const PartyContext = createContext<PartyContextProps | undefined>(undefined);

// Helper to draw random letter card
function drawRandomCard(): LetterCard {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const letter = letters.charAt(Math.floor(Math.random() * letters.length));
  return {
    id: `card-${Math.random().toString(36).substr(2, 9)}`,
    letter,
    value: SCRABBLE_VALUES[letter] || 1,
  };
}

const BOT_NAMES = [
  'Sheriff Dan',
  'Doc Holliday',
  'Billy the Kid',
  'Calamity Jane',
  'Wyatt Earp',
  'Wild Bill',
  'Sundance Kid',
  'Butch Cassidy'
];

export function PartyProvider({ children }: { children: React.ReactNode }) {
  const [party, setParty] = useState<PartyState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [activeUsersCount, setActiveUsersCount] = useState<number>(0);
  const wsRef = useRef<WebSocket | null>(null);

  const isHost = party 
    ? (party.mode === 'offline' || (party.players.length > 0 && party.players[0].id === playerId))
    : false;

  // Initialize global websocket connection on mount
  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'global_stats') {
          setActiveUsersCount(msg.activeUsersCount || 0);
        } else if (msg.type === 'party_created' || msg.type === 'party_joined') {
          setPlayerId(msg.playerId);
          setParty({
            code: msg.partyCode,
            isRandom: msg.isRandom,
            players: msg.players,
            activePlayerId: msg.playerId,
            mode: 'online',
            activeScreen: msg.activeScreen || 'none',
            turnIndex: msg.turnIndex || 0,
            sharedState: msg.sharedState || null,
            chatMessages: msg.chatMessages || [],
          });
        } else if (msg.type === 'party_update') {
          setParty(prev => prev ? { 
            ...prev, 
            isRandom: msg.isRandom ?? prev.isRandom,
            players: msg.players,
            activeScreen: msg.activeScreen,
            turnIndex: msg.turnIndex,
            sharedState: msg.sharedState,
          } : null);
        } else if (msg.type === 'chat_message') {
          setParty(prev => {
            if (!prev) return null;
            const newMessages = [...(prev.chatMessages || []), msg];
            if (newMessages.length > 50) newMessages.shift();
            return { ...prev, chatMessages: newMessages };
          });
        } else if (msg.type === 'error') {
          alert(`Multiplayer Error: ${msg.message}`);
        }
      } catch (e) {
        console.error("Error parsing message", e);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  // Handle local simulation for offline mode
  useEffect(() => {
    if (!party || party.mode !== 'offline' || !isHost) return;

    // Simulation loop every 6 seconds
    const interval = setInterval(() => {
      setParty(prev => {
        if (!prev) return null;
        
        const updatedPlayers = prev.players.map(p => {
          if (!p.isBot) return p;
          
          // Simulation step for a bot
          const nextPlayer = { ...p };
          
          if (nextPlayer.game === 'none') {
            // Pick a game with 70% probability
            if (Math.random() < 0.7) {
              const nextGame = Math.random() < 0.5 ? 'wanted' as const : 'letterjack' as const;
              nextPlayer.game = nextGame;
              if (nextGame === 'wanted') {
                const len = Math.floor(Math.random() * 4) + 4; // 4 to 7 characters
                nextPlayer.state = {
                  mistakes: 0,
                  wordLength: len,
                  solvedMask: '_ '.repeat(len).trim(),
                };
              } else {
                const c1 = drawRandomCard();
                const c2 = drawRandomCard();
                nextPlayer.state = {
                  hand: [c1, c2],
                  score: c1.value + c2.value,
                  stood: false,
                  busted: false,
                };
              }
            }
          } else if (nextPlayer.game === 'wanted' && nextPlayer.state) {
            const state = { ...nextPlayer.state };
            
            if (state.mistakes >= 6 || !state.solvedMask.includes('_')) {
              // Finish round and reset
              const isWin = !state.solvedMask.includes('_');
              nextPlayer.coins = Math.max(10, nextPlayer.coins + (isWin ? 100 : -50));
              nextPlayer.game = 'none';
              nextPlayer.state = null;
            } else {
              // Make a guess
              const difficulty = nextPlayer.state.difficulty || 'medium';
              const winChance = difficulty === 'easy' ? 0.40 : difficulty === 'medium' ? 0.55 : 0.70;
              
              if (Math.random() < winChance) {
                // Correct guess - fill a blank spot
                const maskArr = state.solvedMask.split(' ');
                const blankIndices: number[] = [];
                maskArr.forEach((c, idx) => {
                  if (c === '_') blankIndices.push(idx);
                });
                
                if (blankIndices.length > 0) {
                  const targetIdx = blankIndices[Math.floor(Math.random() * blankIndices.length)];
                  const possibleLetters = 'AEIOUSTN';
                  maskArr[targetIdx] = possibleLetters.charAt(Math.floor(Math.random() * possibleLetters.length));
                  state.solvedMask = maskArr.join(' ');
                }
              } else {
                state.mistakes = (state.mistakes || 0) + 1;
              }
              nextPlayer.state = state;
            }
          } else if (nextPlayer.game === 'letterjack' && nextPlayer.state) {
            const state = { ...nextPlayer.state };
            
            if (state.busted || state.stood) {
              // Settle round and reset
              const finalScore = state.score || 0;
              const isWin = !state.busted && (finalScore >= 18);
              nextPlayer.coins = Math.max(10, nextPlayer.coins + (isWin ? 150 : -100));
              nextPlayer.game = 'none';
              nextPlayer.state = null;
            } else {
              const currentScore = state.score || 0;
              if (currentScore < 16) {
                // Draw a card (Hit)
                const card = drawRandomCard();
                const nextHand = [...(state.hand || []), card];
                const nextScore = nextHand.reduce((s, c) => s + c.value, 0);
                state.hand = nextHand;
                state.score = nextScore;
                state.busted = nextScore > 21;
                state.stood = nextScore >= 16 && nextScore <= 21;
              } else {
                state.stood = true;
              }
              nextPlayer.state = state;
            }
          }
          
          return nextPlayer;
        });
        
        return {
          ...prev,
          players: updatedPlayers,
        };
      });
    }, 6000);

    return () => clearInterval(interval);
  }, [party, isHost]);

  // Host simulates bots in online parties as well!
  useEffect(() => {
    if (!party || party.mode !== 'online' || !isHost || !wsRef.current) return;

    const interval = setInterval(() => {
      const bots = party.players.filter(p => p.isBot);
      if (bots.length === 0) return;

      // Update one bot per tick to avoid spamming updates
      const randomBot = bots[Math.floor(Math.random() * bots.length)];
      const nextPlayer = { ...randomBot };

      if (nextPlayer.game === 'none') {
        if (Math.random() < 0.7) {
          const nextGame = Math.random() < 0.5 ? 'wanted' as const : 'letterjack' as const;
          nextPlayer.game = nextGame;
          if (nextGame === 'wanted') {
            const len = Math.floor(Math.random() * 4) + 4;
            nextPlayer.state = {
              mistakes: 0,
              wordLength: len,
              solvedMask: '_ '.repeat(len).trim(),
            };
          } else {
            const c1 = drawRandomCard();
            const c2 = drawRandomCard();
            nextPlayer.state = {
              hand: [c1, c2],
              score: c1.value + c2.value,
              stood: false,
              busted: false,
            };
          }
        }
      } else if (nextPlayer.game === 'wanted' && nextPlayer.state) {
        const state = { ...nextPlayer.state };
        if (state.mistakes >= 6 || !state.solvedMask.includes('_')) {
          const isWin = !state.solvedMask.includes('_');
          nextPlayer.coins = Math.max(10, nextPlayer.coins + (isWin ? 100 : -50));
          nextPlayer.game = 'none';
          nextPlayer.state = null;
        } else {
          const winChance = 0.55;
          if (Math.random() < winChance) {
            const maskArr = state.solvedMask.split(' ');
            const blankIndices: number[] = [];
            maskArr.forEach((c, idx) => {
              if (c === '_') blankIndices.push(idx);
            });
            if (blankIndices.length > 0) {
              const targetIdx = blankIndices[Math.floor(Math.random() * blankIndices.length)];
              maskArr[targetIdx] = 'AEIOUSTN'.charAt(Math.floor(Math.random() * 8));
              state.solvedMask = maskArr.join(' ');
            }
          } else {
            state.mistakes = (state.mistakes || 0) + 1;
          }
          nextPlayer.state = state;
        }
      } else if (nextPlayer.game === 'letterjack' && nextPlayer.state) {
        const state = { ...nextPlayer.state };
        if (state.busted || state.stood) {
          const finalScore = state.score || 0;
          const isWin = !state.busted && (finalScore >= 18);
          nextPlayer.coins = Math.max(10, nextPlayer.coins + (isWin ? 150 : -100));
          nextPlayer.game = 'none';
          nextPlayer.state = null;
        } else {
          const currentScore = state.score || 0;
          if (currentScore < 16) {
            const card = drawRandomCard();
            const nextHand = [...(state.hand || []), card];
            const nextScore = nextHand.reduce((s, c) => s + c.value, 0);
            state.hand = nextHand;
            state.score = nextScore;
            state.busted = nextScore > 21;
            state.stood = nextScore >= 16 && nextScore <= 21;
          } else {
            state.stood = true;
          }
          nextPlayer.state = state;
        }
      }

      // Sync updated bot state to server
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'update_state',
          partyCode: party.code,
          playerId: nextPlayer.id,
          coins: nextPlayer.coins,
          game: nextPlayer.game,
          state: nextPlayer.state,
        }));
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [party, isHost]);

  // Clean up socket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const createParty = (playerName: string, isOnline: boolean) => {
    const freshPlayerId = `player-${Math.random().toString(36).substr(2, 9)}`;
    const myPlayer: PartyPlayer = {
      id: freshPlayerId,
      name: playerName || 'Cowboy',
      isBot: false,
      coins: 1000,
      game: 'none',
      state: null,
    };

    if (isOnline) {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'create_party',
          playerName: playerName || 'Cowboy',
        }));
      }
    } else {
      // Offline mode
      setPlayerId(freshPlayerId);
      
      // Auto-populate 2 bots so it feels instantly populated and competitive
      const bot1: PartyPlayer = {
        id: 'bot-1',
        name: BOT_NAMES[0],
        isBot: true,
        coins: 1000,
        game: 'none',
        state: null,
      };
      
      const bot2: PartyPlayer = {
        id: 'bot-2',
        name: BOT_NAMES[1],
        isBot: true,
        coins: 1000,
        game: 'none',
        state: null,
      };

      setParty({
        code: 'BOTS',
        players: [myPlayer, bot1, bot2],
        activePlayerId: freshPlayerId,
        mode: 'offline',
      });
    }
  };

  const joinParty = (partyCode: string, playerName: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'join_party',
          partyCode: partyCode.toUpperCase(),
          playerName,
        }));
        
        // Polling loop to wait for response, we assume success will trigger state change
        // In a real app we'd attach a one-off listener or check state
        const checkInterval = setInterval(() => {
          setParty(prev => {
            if (prev && prev.code === partyCode.toUpperCase()) {
              clearInterval(checkInterval);
              resolve(true);
            }
            return prev;
          });
        }, 100);
        
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(false);
        }, 5000); // 5 sec timeout
      } else {
        resolve(false);
      }
    });
  };

  const joinRandomParty = (playerName: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'join_random_party',
          playerName,
        }));

        const checkInterval = setInterval(() => {
          // Just waiting for party state to become non-null
          setParty(prev => {
             if (prev && prev.mode === 'online') {
               clearInterval(checkInterval);
               resolve(true);
             }
             return prev;
          });
        }, 100);

        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(false);
        }, 5000);
      } else {
        resolve(false);
      }
    });
  };

  const sendChatMessage = (message: string) => {
    if (party && party.mode === 'online' && playerId && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat_message',
        partyCode: party.code,
        playerId,
        message,
      }));
    }
  };

  const addBot = (botName: string, difficulty: 'easy' | 'medium' | 'hard') => {
    if (!party) return;
    const name = botName || BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    
    if (party.mode === 'offline') {
      const newBot: PartyPlayer = {
        id: `bot-${Math.random().toString(36).substr(2, 9)}`,
        name,
        isBot: true,
        coins: 1000,
        game: 'none',
        state: { mistakes: 0 },
      };
      setParty(prev => prev ? { ...prev, players: [...prev.players, newBot] } : null);
    } else if (party.mode === 'online' && wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'add_bot',
        partyCode: party.code,
        botName: name,
        botDifficulty: difficulty,
      }));
    }
  };

  const removePlayer = (id: string) => {
    if (!party) return;
    if (party.mode === 'offline') {
      setParty(prev => prev ? { ...prev, players: prev.players.filter(p => p.id !== id) } : null);
    } else if (party.mode === 'online' && wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'remove_player',
        partyCode: party.code,
        playerId: id,
      }));
    }
  };

  const updateMyState = (game: 'wanted' | 'letterjack' | 'none', state: any, coins?: number) => {
    if (!party || !playerId) return;

    if (party.mode === 'offline') {
      setParty(prev => {
        if (!prev) return null;
        const players = prev.players.map(p => {
          if (p.id === playerId) {
            return {
              ...p,
              game,
              state,
              coins: coins !== undefined ? coins : p.coins,
            };
          }
          return p;
        });
        return { ...prev, players };
      });
    } else if (party.mode === 'online' && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'update_state',
        partyCode: party.code,
        playerId,
        coins,
        game,
        state,
      }));
    }
  };

  const resetParty = () => {
    if (!party) return;
    if (party.mode === 'offline') {
      setParty(prev => {
        if (!prev) return null;
        const players = prev.players.map(p => ({
          ...p,
          coins: 1000,
          game: 'none' as const,
          state: null,
        }));
        return { ...prev, players };
      });
    } else if (party.mode === 'online' && wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'reset_party',
        partyCode: party.code,
      }));
    }
  };

  const setPartyGameState = (activeScreen: 'wanted' | 'letterjack' | 'none', turnIndex: number, sharedState: any, players?: PartyPlayer[]) => {
    if (!party) return;
    if (party.mode === 'offline') {
      setParty(prev => {
        if (!prev) return null;
        return {
          ...prev,
          activeScreen,
          turnIndex,
          sharedState,
          players: players || prev.players,
        };
      });
    } else if (party.mode === 'online' && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'set_party_game_state',
        partyCode: party.code,
        activeScreen,
        turnIndex,
        sharedState,
        players,
      }));
    }
  };

  const leaveParty = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setParty(null);
    setPlayerId(null);
  };

  return (
    <PartyContext.Provider value={{
      party,
      playerId,
      isHost,
      activeUsersCount,
      createParty,
      joinParty,
      joinRandomParty,
      addBot,
      removePlayer,
      updateMyState,
      resetParty,
      leaveParty,
      setPartyGameState,
      sendChatMessage,
    }}>
      {children}
    </PartyContext.Provider>
  );
}

export function useParty() {
  const context = useContext(PartyContext);
  if (context === undefined) {
    throw new Error('useParty must be used within a PartyProvider');
  }
  return context;
}
