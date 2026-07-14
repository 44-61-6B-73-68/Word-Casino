import React, { useState, useEffect, useCallback } from 'react';
import { GameStats, BotDifficulty, SCRABBLE_VALUES } from '../types';
import { getRandomCategoryWord } from '../utils/dictionary';
import { audioManager } from '../utils/audio';
import { Coins, Skull, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { useParty } from './PartyContext';
import PartySidebar from './PartySidebar';

interface WantedGameProps {
  stats: GameStats;
  settingsDifficulty: BotDifficulty;
  onUpdateStats: (updated: Partial<GameStats>) => void;
  onBackToMenu: () => void;
}

const CATEGORIES = ["RANDOM", "WESTERN", "ANIMALS", "COUNTRIES", "OBJECTS", "PLACES", "FOOD", "TECHNOLOGY"];
const CHIP_VALUES = [10, 50, 100, 250, 500];

export default function WantedGame({ stats, settingsDifficulty, onUpdateStats, onBackToMenu }: WantedGameProps) {
  const { party, playerId, isHost, updateMyState, setPartyGameState } = useParty();

  // Local States (used when not in a party)
  const [localPhase, setLocalPhase] = useState<'betting' | 'playing' | 'ended'>('betting');
  const [localDifficulty, setLocalDifficulty] = useState<BotDifficulty>('medium');
  const [localCategory, setLocalCategory] = useState<string>("WESTERN");
  const [localBet, setLocalBet] = useState<number>(100);
  const [localWord, setLocalWord] = useState<string>("");
  const [localGuessedLetters, setLocalGuessedLetters] = useState<Set<string>>(new Set());
  const [localMistakes, setLocalMistakes] = useState<number>(0);
  const [localAccumulatedScore, setLocalAccumulatedScore] = useState<number>(0);
  const [localOutcome, setLocalOutcome] = useState<'victory' | 'defeat' | null>(null);
  const [localFinalPayout, setLocalFinalPayout] = useState<number>(0);

  // Derive active game properties based on whether we are in a party
  const hasParty = !!party;
  const phase = hasParty ? (party.sharedState?.phase || 'betting') : localPhase;
  const difficulty = hasParty ? (party.sharedState?.difficulty || 'medium') : localDifficulty;
  const category = hasParty ? (party.sharedState?.category || "WESTERN") : localCategory;
  const bet = hasParty ? (party.sharedState?.bet || 100) : localBet;
  const word = hasParty ? (party.sharedState?.word || "") : localWord;
  const guessedLetters = hasParty ? new Set<string>(party.sharedState?.guessedLetters || []) : localGuessedLetters;
  const mistakes = hasParty ? (party.sharedState?.mistakes || 0) : localMistakes;
  const outcome = hasParty ? (party.sharedState?.outcome || null) : localOutcome;
  const accumulatedScore = hasParty ? (party.sharedState?.accumulatedScore || 0) : localAccumulatedScore;
  const finalPayout = hasParty ? (party.sharedState?.finalPayout || 0) : localFinalPayout;

  // Derive turn index & whose turn it is
  const turnIndex = party?.turnIndex ?? 0;
  const activePlayer = party?.players[turnIndex];
  const isMyTurn = hasParty ? (activePlayer?.id === playerId) : true;

  const setCategory = (cat: string) => {
    if (hasParty) {
      if (isHost) {
        setPartyGameState('wanted', party.turnIndex ?? 0, { ...party.sharedState, category: cat });
      }
    } else {
      setLocalCategory(cat);
    }
  };

  const setDifficulty = (diff: BotDifficulty) => {
    if (hasParty) {
      if (isHost) {
        setPartyGameState('wanted', party.turnIndex ?? 0, { ...party.sharedState, difficulty: diff });
      }
    } else {
      setLocalDifficulty(diff);
    }
  };

  const setBet = (b: number) => {
    if (hasParty) {
      setPartyGameState('wanted', party.turnIndex ?? 0, { ...party.sharedState, bet: b });
    } else {
      setLocalBet(b);
    }
  };

  // Broadcast real-time updates to the party (sync participant status bar/skulls in sidebar)
  useEffect(() => {
    if (!party) return;

    if (phase === 'playing' && word) {
      const mask = word
        .split('')
        .map(char => {
          const isSpace = char === ' ' || char === '-';
          return guessedLetters.has(char) || isSpace ? char : '_';
        })
        .join(' ');

      updateMyState('wanted', {
        mistakes,
        wordLength: word.length,
        solvedMask: mask,
      });
    } else if (phase === 'ended' && word) {
      const mask = word.split('').join(' ');
      updateMyState('wanted', {
        mistakes,
        wordLength: word.length,
        solvedMask: mask,
      });
    } else {
      updateMyState('none', null);
    }
  }, [party, phase, mistakes, word, guessedLetters]);

  // Sparkles/Gold explosion state for victory
  const [goldParticles, setGoldParticles] = useState<{ id: number; x: number; y: number }[]>([]);

  // Setup initial default bet limits
  useEffect(() => {
    const currentCoins = hasParty ? (activePlayer?.coins ?? 1000) : stats.coins;
    if (currentCoins < bet) {
      setBet(Math.max(10, currentCoins));
    }
  }, [stats.coins, bet, hasParty, activePlayer?.coins]);

  // Launch a game round (no up-front bet deducted!)
  const handleStartGame = () => {
    audioManager.playClick();
    
    // Pick a word
    const selectedWord = getRandomCategoryWord(category, difficulty);
    
    if (hasParty) {
      if (isHost) {
        const initialShared = {
          word: selectedWord,
          guessedLetters: [],
          mistakes: 0,
          phase: 'playing',
          outcome: null,
          category,
          difficulty,
          bet,
          accumulatedScore: 0,
          finalPayout: 0,
        };
        const resetPlayers = party.players.map(p => ({
          ...p,
          game: 'wanted' as const,
          state: { mistakes: 0, solvedMask: selectedWord.split('').map(c => c === ' ' || c === '-' ? c : '_').join(' ') },
        }));
        setPartyGameState('wanted', 0, initialShared, resetPlayers);
      }
    } else {
      setLocalWord(selectedWord);
      setLocalGuessedLetters(new Set());
      setLocalMistakes(0);
      setLocalAccumulatedScore(0);
      setLocalOutcome(null);
      setLocalFinalPayout(0);
      setLocalPhase('playing');
    }
  };

  // Process a guessed letter with active per-letter wager
  const makeGuess = (letter: string) => {
    if (phase !== 'playing' || guessedLetters.has(letter)) return;

    if (hasParty) {
      if (!isMyTurn) return; // Only active player can guess!

      const activeCoins = activePlayer?.coins ?? 1000;
      if (activeCoins < bet) {
        alert("You don't have enough coins to place this wager, partner! Lower your bet amount.");
        return;
      }

      audioManager.playClick();
      const isCorrect = word.includes(letter);
      const nextGuessedList = [...Array.from(guessedLetters), letter];
      let nextMistakes = mistakes;
      let nextPhase: 'playing' | 'ended' = 'playing';
      let nextOutcome = null as 'victory' | 'defeat' | null;
      let nextCoins = activeCoins - bet;
      let gainedPayout = 0;
      let nextAccumScore = accumulatedScore;
      let nextPayout = finalPayout;

      if (isCorrect) {
        audioManager.playCoin();
        const occurrences = word.split(letter).length - 1;
        const letterValue = SCRABBLE_VALUES[letter] || 1;
        const roundMultiplier = mistakes === 0 ? 5 : (mistakes <= 2 ? 3 : (mistakes <= 4 ? 2 : 1));
        gainedPayout = Math.round(bet * letterValue * occurrences * roundMultiplier);
        nextCoins = nextCoins + gainedPayout;
        nextAccumScore = accumulatedScore + gainedPayout;

        // Check if word is fully solved
        const isWordSolved = word.split('').every(char => nextGuessedList.includes(char) || char === ' ' || char === '-');
        if (isWordSolved) {
          audioManager.playWin();
          nextPhase = 'ended';
          nextOutcome = 'victory';
          
          const victoryBonus = 150;
          nextPayout = nextAccumScore + victoryBonus;
          nextCoins += victoryBonus; // flat victory bonus for solving!

          // Generate visual gold bursts locally
          const particles = Array.from({ length: 24 }).map((_, i) => ({
            id: i,
            x: Math.random() * 200 - 100,
            y: Math.random() * -150 - 50
          }));
          setGoldParticles(particles);
        }
      } else {
        audioManager.playBust();
        nextMistakes = mistakes + 1;
        if (nextMistakes >= 6) {
          audioManager.playLose();
          nextPhase = 'ended';
          nextOutcome = 'defeat';
        }
      }

      // Update active player's coins and status
      const updatedPlayers = party.players.map(p => {
        if (p.id === activePlayer.id) {
          return {
            ...p,
            coins: nextCoins,
            state: {
              ...p.state,
              mistakes: nextMistakes,
            }
          };
        }
        return p;
      });

      // Advance turn if game is still playing
      let nextTurnIndex = party.turnIndex ?? 0;
      if (nextPhase === 'playing') {
        nextTurnIndex = (nextTurnIndex + 1) % party.players.length;
      }

      const nextShared = {
        word,
        guessedLetters: nextGuessedList,
        mistakes: nextMistakes,
        phase: nextPhase,
        outcome: nextOutcome,
        category,
        difficulty,
        bet,
        accumulatedScore: nextAccumScore,
        finalPayout: nextPayout,
      };

      setPartyGameState('wanted', nextTurnIndex, nextShared, updatedPlayers);

    } else {
      if (stats.coins < bet) {
        alert("You don't have enough coins to place this wager, partner! Lower your bet amount.");
        return;
      }

      audioManager.playClick();
      const newGuessed = new Set(guessedLetters);
      newGuessed.add(letter);
      setLocalGuessedLetters(newGuessed);

      // Spend bet coins immediately
      const coinsAfterBet = stats.coins - bet;
      const isCorrect = word.includes(letter);

      if (isCorrect) {
        audioManager.playCoin();
        const occurrences = word.split(letter).length - 1;
        const letterValue = SCRABBLE_VALUES[letter] || 1;
        const roundMultiplier = mistakes === 0 ? 5 : (mistakes <= 2 ? 3 : (mistakes <= 4 ? 2 : 1));
        const gainedPayout = Math.round(bet * letterValue * occurrences * roundMultiplier);
        
        setLocalAccumulatedScore(prev => prev + gainedPayout);
        const nextCoins = coinsAfterBet + gainedPayout;
        
        onUpdateStats({ coins: nextCoins });

        // Check if word is fully solved
        const isWordSolved = word.split('').every(char => newGuessed.has(char) || char === ' ' || char === '-');
        if (isWordSolved) {
          handleGameEnd('victory', localAccumulatedScore + gainedPayout, nextCoins);
        }
      } else {
        audioManager.playBust();
        onUpdateStats({ coins: coinsAfterBet });
        
        const nextMistakes = mistakes + 1;
        setLocalMistakes(nextMistakes);

        if (nextMistakes >= 6) {
          handleGameEnd('defeat', localAccumulatedScore, coinsAfterBet);
        }
      }
    }
  };

  // Bot Turn Simulation for Hangman
  useEffect(() => {
    if (!party || !isHost || party.activeScreen !== 'wanted') return;
    if (phase !== 'playing') return;

    const currentActive = party.players[party.turnIndex ?? 0];
    if (!currentActive || !currentActive.isBot) return;

    const timeout = setTimeout(() => {
      const unguessed = 'AEIOUSTNLRDMGBCWFPYKVJXZQ'.split('').filter(l => !guessedLetters.has(l));
      if (unguessed.length === 0) return;

      const correctLetters = word.split('').filter(l => l >= 'A' && l <= 'Z' && !guessedLetters.has(l));
      const botDifficulty = settingsDifficulty || 'medium';
      const correctChance = botDifficulty === 'easy' ? 0.35 : botDifficulty === 'medium' ? 0.55 : 0.75;

      let chosenLetter = '';
      if (correctLetters.length > 0 && Math.random() < correctChance) {
        chosenLetter = correctLetters[Math.floor(Math.random() * correctLetters.length)];
      } else {
        chosenLetter = unguessed[Math.floor(Math.random() * unguessed.length)];
      }

      makeGuess(chosenLetter);
    }, 2500);

    return () => clearTimeout(timeout);
  }, [party?.turnIndex, phase, isHost, word, guessedLetters]);

  // Handle keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'playing') return;
      if (hasParty && !isMyTurn) return; // Disallow physical typing if not my turn
      const key = e.key.toUpperCase();
      if (key.length === 1 && key >= 'A' && key <= 'Z') {
        makeGuess(key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, guessedLetters, isMyTurn, hasParty]);

  // Finish game round
  const handleGameEnd = (result: 'victory' | 'defeat', finalWordScore: number, finalCoins: number) => {
    setLocalOutcome(result);
    setLocalPhase('ended');

    if (result === 'victory') {
      audioManager.playWin();
      
      // Flat bonus for saving the outlaw
      const victoryBonus = 150;
      const totalSessionEarnings = finalWordScore + victoryBonus;
      setLocalFinalPayout(totalSessionEarnings);

      // Generate visual gold bursts
      const particles = Array.from({ length: 24 }).map((_, i) => ({
        id: i,
        x: Math.random() * 200 - 100,
        y: Math.random() * -150 - 50
      }));
      setGoldParticles(particles);

      // Log word and save
      const wordLogEntry = {
        word: word,
        score: totalSessionEarnings,
        game: 'wanted' as const,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      onUpdateStats({
        coins: finalCoins + victoryBonus,
        gamesPlayedWanted: stats.gamesPlayedWanted + 1,
        gamesWonWanted: stats.gamesWonWanted + 1,
        highestScoreWanted: Math.max(stats.highestScoreWanted, totalSessionEarnings),
        totalEarnings: stats.totalEarnings + totalSessionEarnings,
        wordLog: [...stats.wordLog, wordLogEntry]
      });
    } else {
      audioManager.playLose();
      
      onUpdateStats({
        gamesPlayedWanted: stats.gamesPlayedWanted + 1
      });
    }
  };

  // Return to betting setup
  const handlePlayAgain = () => {
    audioManager.playClick();
    if (hasParty) {
      if (isHost) {
        const nextShared = {
          word: "",
          guessedLetters: [],
          mistakes: 0,
          phase: 'betting',
          outcome: null,
          category,
          difficulty,
          bet,
          accumulatedScore: 0,
          finalPayout: 0,
        };
        setPartyGameState('wanted', 0, nextShared);
      }
    } else {
      setLocalPhase('betting');
    }
  };

  // Adjust bets
  const adjustBet = (amount: number) => {
    audioManager.playClick();
    const currentCoins = hasParty ? (activePlayer?.coins ?? 1000) : stats.coins;
    if (amount === -1) {
      setBet(currentCoins); // ALL-IN!
    } else {
      const next = bet + amount;
      let bounded = next;
      if (next < 10) bounded = 10;
      if (next > currentCoins) bounded = currentCoins;
      setBet(bounded);
    }
  };

  // Render a detailed cowboy hat in SVG
  const renderCowboyHat = (isRed: boolean) => (
    <svg viewBox="0 0 32 32" className={`w-10 h-10 ${isRed ? 'text-red-500 fill-red-600' : 'text-neutral-700/50 fill-neutral-800/30'} transition-all duration-300`}>
      <path d="M 4,22 C 4,19 8,19 11,18 C 13,14 17,14 19,18 C 22,19 26,19 26,22 C 26,24 4,24 4,22 Z" stroke="black" strokeWidth="2" />
      <path d="M 11,18 C 11,13 13,9 15,9 C 17,9 19,13 19,18" stroke="black" strokeWidth="2" fill="none" />
    </svg>
  );

  // Render the Cowboy Gallows (Scenic Sunset Backdrop & detailed Vector-Pixel Style)
  const renderGallows = () => {
    return (
      <svg viewBox="0 0 200 200" className="w-full h-full max-h-72 drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] bg-[#1a0f0a] border-4 border-black">
        <defs>
          <linearGradient id="sunsetGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4a1c02" />
            <stop offset="40%" stopColor="#b45309" />
            <stop offset="75%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fef08a" />
          </linearGradient>
        </defs>
        
        {/* Sunset Sky */}
        <rect width="200" height="175" fill="url(#sunsetGrad)" />

        {/* Glowing Sun */}
        <circle cx="150" cy="110" r="18" fill="#fff" opacity="0.8" />
        <circle cx="150" cy="110" r="28" fill="#fef08a" opacity="0.3" />

        {/* Mountain silhouettes */}
        <polygon points="0,175 40,110 90,175" fill="#311201" />
        <polygon points="60,175 120,95 180,175" fill="#1e0900" />
        <polygon points="120,175 160,130 200,175" fill="#250b00" />

        {/* Cactuses */}
        <rect x="22" y="140" width="3.5" height="18" rx="1" fill="#150500" />
        <path d="M 19 146 Q 19 150 22 150" fill="none" stroke="#150500" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 25 143 Q 25 147 22 147" fill="none" stroke="#150500" strokeWidth="2.5" strokeLinecap="round" />

        {/* Ground */}
        <rect y="170" width="200" height="30" fill="#1a0f0a" />

        {/* Wooden Gallows structure */}
        <line x1="45" y1="170" x2="45" y2="25" stroke="#4a2711" strokeWidth="7" strokeLinecap="round" />
        <line x1="41" y1="28" x2="135" y2="28" stroke="#4a2711" strokeWidth="7" strokeLinecap="round" />
        <line x1="45" y1="55" x2="75" y2="28" stroke="#4a2711" strokeWidth="5" />
        <line x1="130" y1="28" x2="130" y2="55" stroke="#361a0a" strokeWidth="3" />

        {/* Rope */}
        {mistakes >= 1 && (
          <line x1="130" y1="55" x2="130" y2="80" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="3,1" />
        )}

        {/* Cowboy Hat and Character (Appears at 2 mistakes) */}
        {mistakes >= 2 && (
          <g>
            {/* Head */}
            <circle cx="130" cy="88" r="8" fill="#fbcfe8" stroke="#000" strokeWidth="1.5" />
            {/* Beard & Hair */}
            <path d="M 122 88 Q 130 98 138 88" fill="none" stroke="#1a0f0a" strokeWidth="3" />
            {/* Eyes */}
            {phase === 'playing' ? (
              <g>
                <circle cx="127" cy="86" r="1" fill="#000" />
                <circle cx="133" cy="86" r="1" fill="#000" />
              </g>
            ) : outcome === 'victory' ? (
              <g>
                <path d="M 125 87 L 128 85" stroke="#000" strokeWidth="1.2" />
                <path d="M 135 87 L 132 85" stroke="#000" strokeWidth="1.2" />
              </g>
            ) : (
              <g>
                <path d="M 125 84 L 129 88 M 129 84 L 125 88" stroke="#000" strokeWidth="1.2" />
                <path d="M 131 84 L 135 88 M 135 84 L 131 88" stroke="#000" strokeWidth="1.2" />
              </g>
            )}

            {/* Red neck bandana */}
            <polygon points="126,94 134,94 130,100" fill="#ef4444" stroke="#000" strokeWidth="1" />

            {/* Cowboy Hat (Falls off if dead) */}
            {mistakes < 6 ? (
              <g>
                <ellipse cx="130" cy="79" rx="14" ry="3" fill="#653b1b" stroke="#000" strokeWidth="1.5" />
                <path d="M 121 79 Q 130 68 139 79" fill="#4a2711" stroke="#000" strokeWidth="1.5" />
                <rect x="124" y="77" width="12" height="1.5" fill="#ef4444" />
              </g>
            ) : (
              <g className="animate-bounce">
                {/* Fallen Hat */}
                <ellipse cx="165" cy="163" rx="14" ry="3" fill="#653b1b" stroke="#000" strokeWidth="1.5" />
                <path d="M 156 163 Q 165 152 174 163" fill="#4a2711" stroke="#000" strokeWidth="1.5" />
                <rect x="159" y="161" width="12" height="1.5" fill="#ef4444" />
              </g>
            )}
          </g>
        )}

        {/* Torso/Vest (Appears at 3 mistakes) */}
        {mistakes >= 3 && (
          <g>
            <rect x="122" y="97" width="16" height="26" rx="2" fill="#4a2711" stroke="#000" strokeWidth="1.5" />
            <line x1="130" y1="97" x2="130" y2="123" stroke="#000" strokeWidth="1" />
            <polygon points="124,103 126,103 125,106" fill="#fbbf24" stroke="#000" strokeWidth="0.5" />
          </g>
        )}

        {/* Arms (Appears at 4 mistakes) */}
        {mistakes >= 4 && (
          <g>
            <path d="M 122 102 L 110 114" stroke="#4a2711" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M 138 102 L 150 114" stroke="#4a2711" strokeWidth="4.5" strokeLinecap="round" />
          </g>
        )}

        {/* Legs (Appears at 5 mistakes) */}
        {mistakes >= 5 && (
          <g>
            <line x1="125" y1="123" x2="121" y2="152" stroke="#1e3a8a" strokeWidth="5.5" strokeLinecap="round" />
            <rect x="117" y="150" width="6" height="4" rx="1" fill="#1a0f0a" stroke="#000" strokeWidth="1" />
            <line x1="135" y1="123" x2="139" y2="152" stroke="#1e3a8a" strokeWidth="5.5" strokeLinecap="round" />
            <rect x="137" y="150" width="6" height="4" rx="1" fill="#1a0f0a" stroke="#000" strokeWidth="1" />
          </g>
        )}

        {/* Trapdoor & Lever */}
        {mistakes < 6 ? (
          <g>
            <line x1="110" y1="156" x2="150" y2="156" stroke="#4a2711" strokeWidth="4.5" />
            <line x1="175" y1="170" x2="180" y2="143" stroke="#311201" strokeWidth="3" />
            <circle cx="180" cy="143" r="4.5" fill="#ef4444" stroke="#000" />
          </g>
        ) : (
          <g>
            <line x1="110" y1="156" x2="120" y2="175" stroke="#4a2711" strokeWidth="4.5" />
            <line x1="150" y1="156" x2="140" y2="175" stroke="#4a2711" strokeWidth="4.5" />
            <line x1="175" y1="170" x2="185" y2="168" stroke="#311201" strokeWidth="3" />
            <circle cx="185" cy="168" r="4.5" fill="#ef4444" stroke="#000" />
          </g>
        )}
      </svg>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 items-start select-none">
      <div className="flex-1 w-full space-y-6">
        {/* Upper Navigation bar */}
        <div className="flex justify-between items-center bg-[#2a170d] p-3 border-4 border-black shadow-[4px_4px_0_0_#000]">
        <button
          onClick={() => { audioManager.playClick(); onBackToMenu(); }}
          className="px-3 py-1.5 bg-[#b5a642] hover:bg-[#c9ba4d] border-2 border-black text-black font-sans font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-colors uppercase"
        >
          <ArrowLeft className="w-4 h-4" /> Exit to Saloon
        </button>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-[#d4af37] font-bold bg-black px-2.5 py-1 border-2 border-black">
            <Coins className="w-4 h-4 text-amber-500" />
            <span>${stats.coins.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1 bg-black px-2.5 py-1 border-2 border-black text-[#e3c598]/60">
            <span className="font-sans">Lobby Wins:</span>
            <span className="text-white font-bold">{stats.gamesWonWanted}</span>
          </div>
        </div>
      </div>

      {/* Main Wood Placard Header */}
      <div className="bg-[#2a170d] p-4 text-center border-4 border-black shadow-[6px_6px_0_0_#000] space-y-1">
        <h1 className="font-sans font-black text-4xl text-[#d4af37] uppercase tracking-wide">HANGMAN</h1>
        <p className="text-xs text-[#e3c598]/60 uppercase font-mono tracking-widest">GUESS THE WORD, SAVE THE OUTLAW!</p>
      </div>

      {/* PHASE 1: ROUND SETUP & PRE-GAME OPTIONS */}
      {phase === 'betting' && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          {/* Setup Panel (7 cols) */}
          <div className="lg:col-span-7 bg-[#2a170d] p-6 border-4 border-black shadow-[8px_8px_0_0_#000] space-y-6">
            <h2 className="font-sans font-black text-2xl text-[#d4af37] border-b-2 border-black pb-2 flex items-center gap-2">
              <Skull className="w-7 h-7 text-red-500" /> BOUNTY SHIPMENT SETUP
            </h2>

            {/* Category */}
            <div className="space-y-2">
              <label className="block text-xs font-sans font-bold uppercase text-[#e3c598]/60 flex justify-between items-center">
                <span>Target Category</span>
                {hasParty && !isHost && (
                  <span className="text-[10px] text-[#e3c598]/40 normal-case font-mono">(Set by Host)</span>
                )}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    disabled={hasParty && !isHost}
                    onClick={() => { audioManager.playClick(); setCategory(cat); }}
                    className={`p-2 border-2 font-mono text-[10px] cursor-pointer transition-all ${
                      category === cat
                        ? "bg-[#e3c598] text-[#1a0f0a] border-black font-bold scale-[1.03] shadow-[2px_2px_0_0_#000]"
                        : "bg-[#1a0f0a] text-[#e3c598] border-black hover:bg-black"
                    } disabled:opacity-50`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div className="space-y-2">
              <label className="block text-xs font-sans font-bold uppercase text-[#e3c598]/60 flex justify-between items-center">
                <span>Bounty Difficulty</span>
                {hasParty && !isHost && (
                  <span className="text-[10px] text-[#e3c598]/40 normal-case font-mono">(Set by Host)</span>
                )}
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['easy', 'medium', 'hard'] as const).map(diff => (
                  <button
                    key={diff}
                    disabled={hasParty && !isHost}
                    onClick={() => { audioManager.playClick(); setDifficulty(diff); }}
                    className={`py-2.5 border-2 font-sans font-bold text-xs capitalize cursor-pointer transition-all ${
                      difficulty === diff
                        ? "bg-[#e3c598] text-[#1a0f0a] border-black scale-[1.03] shadow-[2px_2px_0_0_#000]"
                        : "bg-[#1a0f0a] text-[#e3c598] border-black hover:bg-black"
                    } disabled:opacity-50`}
                  >
                    {diff === 'easy' ? '🟢 Easy' : diff === 'medium' ? '🟡 Medium' : '🔴 Hard'}
                  </button>
                ))}
              </div>
            </div>

            {/* Play Button */}
            <button
              onClick={handleStartGame}
              disabled={hasParty && !isHost}
              className="w-full py-4 bg-[#b5a642] hover:bg-[#c9ba4d] text-black border-4 border-black font-sans font-black text-lg tracking-wider shadow-[4px_4px_0_0_#000] cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-[2px_2px_0_0_#000] transition-all select-none uppercase disabled:opacity-50"
            >
              {hasParty ? (isHost ? "🔫 Start Game for Saloon" : "⏳ Waiting for Host to Start...") : "🔫 Track Bounty Target"}
            </button>
          </div>

          {/* Side Info Poster Card (5 cols) */}
          <div className="lg:col-span-5 bg-[#e3c598] text-black p-6 border-4 border-black shadow-[8px_8px_0_0_#000] text-center flex flex-col justify-between space-y-4">
            <div className="border-4 border-dashed border-black/50 p-6 flex flex-col items-center justify-center flex-1 space-y-4">
              <span className="font-sans font-black text-3xl tracking-tight border-b-4 border-black pb-1 w-full text-black uppercase">
                WANTED
              </span>
              
              <div className="w-24 h-24 rounded-full border-4 border-black bg-[#1a0f0a] flex items-center justify-center text-[#e3c598]">
                <Skull className="w-14 h-14 animate-pulse" />
              </div>

              <div className="font-sans">
                <span className="text-xs text-black/60 block uppercase font-bold tracking-wider">REWARD DEAD OR ALIVE</span>
                <span className="text-2xl text-red-700 font-black block tracking-tight">
                  UP TO 5.0X MULTIPLIERS
                </span>
              </div>

              <p className="font-sans text-[11px] text-black/70 leading-tight max-w-xs">
                Welcome partner! Place wagers directly on letters before guessing them. Match correctly to claim instant coin multipliers!
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* PHASE 2 & 3: PLAYING & ENDED */}
      {(phase === 'playing' || phase === 'ended') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Gallows Visual & Instructions (7 cols) */}
          <div className="lg:col-span-7 space-y-6 flex flex-col">
            {/* Gallows & Mistakes Card */}
            <div className="bg-[#2a170d] p-4 border-4 border-black shadow-[6px_6px_0_0_#000]">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                {/* SVG Scaffold Display */}
                <div className="sm:col-span-7 flex justify-center items-center p-1 bg-black border-2 border-black">
                  {renderGallows()}
                </div>

                {/* Mistakes Wooden Card */}
                <div className="sm:col-span-5 bg-[#1a0f0a] p-4 border-4 border-black flex flex-col justify-between items-center text-center space-y-3 min-h-[220px]">
                  <span className="font-sans font-black text-sm text-[#d4af37] tracking-wider uppercase">
                    MISTAKES
                  </span>
                  
                  {/* Hat Counter */}
                  <div className="grid grid-cols-3 gap-2 w-full max-w-[150px]">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="flex justify-center items-center bg-black/60 border border-neutral-800 p-1">
                        {renderCowboyHat(i <= mistakes)}
                      </div>
                    ))}
                  </div>

                  {/* Ratio Text */}
                  <div className="font-mono text-xl text-red-400 font-bold bg-black px-4 py-1 border border-neutral-800">
                    {mistakes} / 6
                  </div>
                </div>
              </div>
            </div>

            {/* Scrabble Word Mystery Board */}
            <div className="bg-[#2a170d] p-6 border-4 border-black shadow-[6px_6px_0_0_#000] text-center space-y-4">
              <span className="font-mono text-xs text-[#e3c598]/60 uppercase tracking-widest block">
                CATEGORY: <strong className="text-white font-black">{category}</strong>
              </span>

              {/* Word Tiles Container */}
              <div className="flex flex-wrap justify-center gap-2 py-4">
                {word.split('').map((char, index) => {
                  const isSpace = char === ' ' || char === '-';
                  const isRevealed = guessedLetters.has(char) || phase === 'ended' || isSpace;
                  return (
                    <motion.div
                      key={index}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className={`w-11 h-14 border-2 border-black flex flex-col items-center justify-between font-sans shadow-[2px_2px_0_0_#000] relative ${
                        isSpace
                          ? "bg-transparent border-none text-white text-2xl font-black flex items-center justify-center"
                          : isRevealed 
                          ? "bg-[#e3c598] text-black" 
                          : "bg-[#1a0f0a] text-transparent"
                      }`}
                    >
                      {isSpace ? (
                        <span>{char}</span>
                      ) : (
                        <>
                          {/* Letter */}
                          <span className="font-black text-2xl leading-none mt-2.5">
                            {isRevealed ? char : "?"}
                          </span>
                          
                          {/* Point Indicator */}
                          {isRevealed && (
                            <span className="font-mono text-[9px] font-bold text-red-800 self-end mr-1 mb-1 leading-none">
                              {SCRABBLE_VALUES[char] || 1}
                            </span>
                          )}
                        </>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Row: How To Play & Current Prize Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* How To Play */}
              <div className="bg-[#2a170d] p-4 border-4 border-black shadow-[4px_4px_0_0_#000] space-y-2">
                <span className="font-sans font-black text-xs text-[#d4af37] uppercase block border-b border-black pb-1">
                  HOW TO PLAY
                </span>
                <ul className="text-[10px] space-y-1.5 list-decimal list-inside text-[#e3c598]/80 leading-relaxed">
                  <li>Adjust your <strong className="text-[#d4af37]">Bet Amount</strong> before guessing.</li>
                  <li>Click a letter key to wager on that letter.</li>
                  <li>Correct letters pay out immediately by Scrabble point value!</li>
                  <li>Remaining lives grant massive multiplier scale bonuses.</li>
                </ul>
              </div>

              {/* Current Reward tracker */}
              <div className="bg-[#2a170d] p-4 border-4 border-black shadow-[4px_4px_0_0_#000] flex flex-col justify-between">
                <span className="font-sans font-black text-xs text-[#d4af37] uppercase block border-b border-black pb-1">
                  CURRENT ROUND CHEST
                </span>
                <div className="text-center py-2">
                  <span className="text-3xl font-mono text-[#d4af37] font-black flex items-center justify-center gap-1">
                    <Coins className="w-7 h-7 text-amber-500" /> ${accumulatedScore}
                  </span>
                  <span className="text-[9px] text-[#e3c598]/60 font-sans block mt-1 uppercase">
                    Bounty Coins Gained This Round
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Controls, Bet adjustment & keyboard (5 cols) */}
          <div className="lg:col-span-5 space-y-6 flex flex-col">
            
            {/* BET AMOUNT SELECTION PANEL */}
            <div className="bg-[#2a170d] p-4 border-4 border-black shadow-[6px_6px_0_0_#000] space-y-3">
              <span className="font-sans font-black text-xs text-[#d4af37] uppercase tracking-wider block text-center">
                BET AMOUNT PER GUESS
              </span>

              {/* Adjust Bar */}
              <div className="flex items-center justify-between bg-black p-2 border-2 border-black max-w-xs mx-auto">
                <button
                  onClick={() => adjustBet(-10)}
                  disabled={hasParty && !isMyTurn}
                  className="w-10 h-10 bg-[#3d251e] hover:bg-black text-[#e3c598] font-black border border-black flex items-center justify-center text-lg active:scale-95 transition-transform cursor-pointer disabled:opacity-30"
                >
                  ◀
                </button>
                <div className="flex items-center gap-1.5">
                  <Coins className="w-5 h-5 text-amber-500" />
                  <span className="font-mono text-2xl text-white font-black">{bet}</span>
                </div>
                <button
                  onClick={() => adjustBet(10)}
                  disabled={hasParty && !isMyTurn}
                  className="w-10 h-10 bg-[#3d251e] hover:bg-black text-[#e3c598] font-black border border-black flex items-center justify-center text-lg active:scale-95 transition-transform cursor-pointer disabled:opacity-30"
                >
                  ▶
                </button>
              </div>

              {/* Quick Chips row */}
              <div className="flex justify-center gap-1.5 flex-wrap">
                {CHIP_VALUES.map(val => (
                  <button
                    key={val}
                    onClick={() => adjustBet(val - bet)}
                    disabled={stats.coins < val || phase !== 'playing' || (hasParty && !isMyTurn)}
                    className="px-2.5 py-1 text-[10px] font-mono border-2 border-black bg-[#1a0f0a] text-[#e3c598] hover:bg-black disabled:opacity-30 cursor-pointer"
                  >
                    ${val}
                  </button>
                ))}
                <button
                  onClick={() => adjustBet(-1)}
                  disabled={phase !== 'playing' || (hasParty && !isMyTurn)}
                  className="px-2.5 py-1 text-[10px] font-mono border-2 border-black bg-red-950 text-red-200 hover:bg-black disabled:opacity-30 cursor-pointer font-bold uppercase"
                >
                  Max
                </button>
              </div>
            </div>

            {/* CHOOSE A LETTER / KEYBOARD GRID */}
            <div className="bg-[#2a170d] p-4 border-4 border-black shadow-[6px_6px_0_0_#000] space-y-3 flex-1 flex flex-col justify-between">
              <span className="font-sans font-black text-xs text-[#d4af37] uppercase tracking-wider block text-center">
                {hasParty ? (
                  isMyTurn ? (
                    <span className="text-emerald-400 animate-pulse font-serif text-sm tracking-wide block">
                      YOUR TURN! Choose a letter!
                    </span>
                  ) : (
                    <span className="text-[#e3c598]/60 font-serif text-sm tracking-wide block uppercase font-bold">
                      WAITING FOR {activePlayer?.name.toUpperCase()}'S TURN...
                    </span>
                  )
                ) : (
                  "CHOOSE A LETTER"
                )}
              </span>

              {phase === 'playing' ? (
                <div className="grid grid-cols-5 gap-2 pt-2">
                  {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('').map(letter => {
                    const isGuessed = guessedLetters.has(letter);
                    const isCorrect = isGuessed && word.includes(letter);
                    const val = SCRABBLE_VALUES[letter] || 1;

                    return (
                      <button
                        key={letter}
                        onClick={() => makeGuess(letter)}
                        disabled={isGuessed || (hasParty && !isMyTurn)}
                        className={`py-3 border-2 border-black font-sans font-black text-base cursor-pointer transition-all flex flex-col items-center justify-center relative shadow-[2px_2px_0_0_#000] active:translate-y-0.5 active:shadow-none ${
                          isCorrect
                            ? "bg-emerald-800 text-emerald-100 opacity-80"
                            : isGuessed
                            ? "bg-red-950 text-red-400 opacity-60"
                            : "bg-[#eedbb0]/90 text-black hover:bg-[#e3c598]"
                        } disabled:opacity-40 disabled:scale-95`}
                      >
                        <span>{letter}</span>
                        <span className="absolute bottom-0.5 right-1 font-mono text-[8px] opacity-60">
                          {val}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* PHASE 3 ROUND END OUTCOMES PANEL */
                <div className="bg-black/60 p-4 border-2 border-black text-center space-y-4 shadow-[4px_4px_0_0_#000] flex-1 flex flex-col justify-center items-center">
                  {outcome === 'victory' ? (
                    <div className="space-y-3">
                      <span className="text-emerald-400 font-sans font-black text-2xl tracking-tight block animate-bounce">
                        🌟 BOUNTY CAPTURED! 🌟
                      </span>
                      <p className="font-sans text-[11px] text-[#e3c598]/80 leading-relaxed max-w-xs mx-auto">
                        Amazing job! You solved <strong className="text-white uppercase">{word}</strong> and saved the outlaw before they met the gallows.
                      </p>

                      <div className="bg-[#2a170d] p-3 border border-neutral-800 text-left font-sans text-[11px] space-y-1.5 max-w-xs mx-auto">
                        <div className="flex justify-between">
                          <span className="text-[#e3c598]/60">Letter Multipliers Gained:</span>
                          <span className="text-amber-400 font-bold">${accumulatedScore}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#e3c598]/60">Outlaw Saved Bonus:</span>
                          <span className="text-emerald-400 font-bold">+$150</span>
                        </div>
                        <hr className="border-black my-1" />
                        <div className="flex justify-between text-sm">
                          <span className="font-bold text-white">Total Round Payout:</span>
                          <span className="font-bold text-[#d4af37] font-mono flex items-center gap-1">
                            <Coins className="w-4 h-4 text-amber-500" /> ${finalPayout}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <span className="text-red-500 font-sans font-black text-2xl tracking-tight block uppercase">
                        ☠ GALLOWS CAPTURED! ☠
                      </span>
                      <p className="font-sans text-[11px] text-[#e3c598]/80 leading-relaxed max-w-xs mx-auto">
                        Ouch! The outlaw met their fate. The correct word was <strong className="text-[#d4af37] uppercase">{word}</strong>.
                      </p>
                      <div className="bg-[#2a170d] p-3 border border-neutral-800 text-center font-sans text-xs text-red-200 max-w-xs mx-auto">
                        Lay down some fresh bets to save the next fugitive!
                      </div>
                    </div>
                  )}

                  {/* Next Steps Buttons */}
                  <div className="flex flex-col gap-2.5 w-full max-w-xs pt-2">
                    <button
                      onClick={handlePlayAgain}
                      disabled={hasParty && !isHost}
                      className="w-full py-2.5 bg-[#b5a642] text-black border-4 border-black shadow-[3px_3px_0_0_#000] font-sans font-bold uppercase hover:bg-[#c9ba4d] active:translate-y-0.5 active:shadow-[1px_1px_0_0_#000] cursor-pointer transition-all disabled:opacity-40"
                    >
                      {hasParty ? (isHost ? "Play Another Round" : "Waiting for Host...") : "Play Another Round"}
                    </button>
                    <button
                      onClick={() => { audioManager.playClick(); onBackToMenu(); }}
                      className="w-full py-2.5 bg-black text-[#e3c598] border-4 border-black shadow-[3px_3px_0_0_#000] font-sans font-bold uppercase hover:bg-[#1a0f0a] active:translate-y-0.5 active:shadow-[1px_1px_0_0_#000] cursor-pointer transition-all"
                    >
                      Lobby Menu
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* PRIZE TABLE PANEL */}
            <div className="bg-[#2a170d] p-4 border-4 border-black shadow-[6px_6px_0_0_#000] space-y-2">
              <span className="font-sans font-black text-xs text-[#d4af37] uppercase tracking-wider block text-center">
                PRIZE TABLE MULTIPLIERS
              </span>
              <div className="font-mono text-[11px] space-y-1.5 leading-none">
                <div className="flex justify-between items-center text-emerald-400">
                  <span>Win with 0 mistakes</span>
                  <span className="font-bold">⭐⭐⭐ 5x bet</span>
                </div>
                <div className="flex justify-between items-center text-emerald-500">
                  <span>Win with 1-2 mistakes</span>
                  <span className="font-bold">⭐⭐ 3x bet</span>
                </div>
                <div className="flex justify-between items-center text-amber-400">
                  <span>Win with 3-4 mistakes</span>
                  <span className="font-bold">⭐ 2x bet</span>
                </div>
                <div className="flex justify-between items-center text-amber-500">
                  <span>Win with 5 mistakes</span>
                  <span className="font-bold">1x bet</span>
                </div>
                <div className="flex justify-between items-center text-red-500">
                  <span>Lose (6 mistakes)</span>
                  <span className="font-bold">0 payout</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
      </div>
      
      {party && <PartySidebar />}
    </div>
  );
}
