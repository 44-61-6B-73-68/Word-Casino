export type BotDifficulty = 'easy' | 'medium' | 'hard';

export interface GameStats {
  coins: number;
  gamesPlayedWanted: number;
  gamesWonWanted: number;
  highestScoreWanted: number;
  gamesPlayedLetterjack: number;
  gamesWonLetterjack: number;
  highestScoreLetterjack: number;
  totalEarnings: number;
  wordLog: WordLogEntry[];
}

export interface WordLogEntry {
  word: string;
  score: number;
  game: 'wanted' | 'letterjack';
  timestamp: string;
}

export interface GameSettings {
  soundEffects: boolean;
  ambientMusic: boolean;
  botDifficulty: BotDifficulty;
}

export interface LetterCard {
  id: string;
  letter: string;
  value: number;
  isUsed?: boolean;
}

// Official Scrabble values for letters A-Z
export const SCRABBLE_VALUES: Record<string, number> = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1, M: 3,
  N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10
};

// Official Scrabble frequencies for standard letter pool distributions
export const SCRABBLE_FREQUENCIES: Record<string, number> = {
  A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9, J: 1, K: 1, L: 4, M: 2,
  N: 6, O: 8, P: 2, Q: 1, R: 6, S: 4, T: 6, U: 4, V: 2, W: 2, X: 1, Y: 2, Z: 1
};

export const INITIAL_STATS: GameStats = {
  coins: 1000,
  gamesPlayedWanted: 0,
  gamesWonWanted: 0,
  highestScoreWanted: 0,
  gamesPlayedLetterjack: 0,
  gamesWonLetterjack: 0,
  highestScoreLetterjack: 0,
  totalEarnings: 0,
  wordLog: []
};

export const INITIAL_SETTINGS: GameSettings = {
  soundEffects: true,
  ambientMusic: false,
  botDifficulty: 'medium'
};

export interface PartyPlayer {
  id: string;
  name: string;
  isBot: boolean;
  coins: number;
  game: 'wanted' | 'letterjack' | 'none';
  state: {
    mistakes?: number;
    wordLength?: number;
    solvedMask?: string;
    hand?: LetterCard[];
    score?: number;
    busted?: boolean;
    stood?: boolean;
  } | null;
}

export interface ChatMessage {
  playerId: string;
  senderName: string;
  message: string;
  timestamp: number;
}

export interface PartyState {
  code: string;
  isRandom?: boolean;
  players: PartyPlayer[];
  activePlayerId: string | null;
  mode: 'offline' | 'online' | 'none';
  activeScreen?: 'wanted' | 'letterjack' | 'none';
  turnIndex?: number;
  sharedState?: any;
  chatMessages?: ChatMessage[];
}

