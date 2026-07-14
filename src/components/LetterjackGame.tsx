import React, { useState, useEffect } from 'react';
import { GameStats, LetterCard, SCRABBLE_FREQUENCIES, SCRABBLE_VALUES } from '../types';
import { isValidWord } from '../utils/dictionary';
import { audioManager } from '../utils/audio';
import { ArrowLeft, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useParty } from './PartyContext';
import PartySidebar from './PartySidebar';

interface LetterjackGameProps {
  stats: GameStats;
  onUpdateStats: (updated: Partial<GameStats>) => void;
  onBackToMenu: () => void;
}

const CHIP_VALUES = [10, 50, 100, 250, 500];

export default function LetterjackGame({ stats, onUpdateStats, onBackToMenu }: LetterjackGameProps) {
  const { party, updateMyState, playerId, isHost, setPartyGameState } = useParty();
  const hasParty = !!party;

  // Local state equivalents for single-player mode
  const [localPhase, setLocalPhase] = useState<'betting' | 'playing' | 'dealer-turn' | 'ended'>('betting');
  const [localBet, setLocalBet] = useState<number>(100);
  const [localDeck, setLocalDeck] = useState<LetterCard[]>([]);
  const [localPlayerHand, setLocalPlayerHand] = useState<LetterCard[]>([]);
  const [localDealerHand, setLocalDealerHand] = useState<LetterCard[]>([]);
  const [localBlackjackMessage, setLocalBlackjackMessage] = useState<string>("");
  const [localFinalPayout, setLocalFinalPayout] = useState<number>(0);
  const [localDealerExpression, setLocalDealerExpression] = useState<'idle' | 'smile' | 'lose' | 'win'>('idle');

  // Hybrid states mapping automatically to either shared party state or local state
  const phase = hasParty ? (party.sharedState?.phase || 'betting') : localPhase;
  const bet = hasParty ? (party.sharedState?.bet || 100) : localBet;
  const deck = hasParty ? (party.sharedState?.deck || []) : localDeck;
  const dealerHand = hasParty ? (party.sharedState?.dealerHand || []) : localDealerHand;
  const blackjackMessage = hasParty ? (party.sharedState?.blackjackMessage || "") : localBlackjackMessage;
  const finalPayout = hasParty ? (party.sharedState?.finalPayout || 0) : localFinalPayout;
  const dealerExpression = hasParty ? (party.sharedState?.dealerExpression || 'idle') : localDealerExpression;

  // Derive active player turn index and details
  const activePlayer = hasParty && party.players ? party.players[party.turnIndex ?? 0] : null;
  const isMyTurn = hasParty ? (activePlayer?.id === playerId) : true;

  // Current player's hand derived from state
  const playerHand = hasParty
    ? (party.players.find(p => p.id === playerId)?.state?.hand || [])
    : localPlayerHand;

  // Real-time synchronization state-setter bridges
  const setPlayerHand = (newHand: LetterCard[]) => {
    if (hasParty) {
      const nextScore = newHand.reduce((sum, c) => sum + c.value, 0);
      const isBusted = nextScore > 21;
      const updatedPlayers = party.players.map(p => {
        if (p.id === playerId) {
          return {
            ...p,
            state: {
              ...p.state,
              hand: newHand,
              score: nextScore,
              busted: isBusted,
              stood: p.state?.stood || isBusted,
            }
          };
        }
        return p;
      });
      setPartyGameState('letterjack', party.turnIndex ?? 0, party.sharedState, updatedPlayers);
    } else {
      setLocalPlayerHand(newHand);
    }
  };

  const setBet = (val: number | ((prev: number) => number)) => {
    const nextBet = typeof val === 'function' ? val(bet) : val;
    if (hasParty) {
      setPartyGameState('letterjack', party.turnIndex ?? 0, { ...party.sharedState, bet: nextBet });
    } else {
      setLocalBet(nextBet);
    }
  };

  const setDeck = (val: LetterCard[]) => {
    if (hasParty) {
      setPartyGameState('letterjack', party.turnIndex ?? 0, { ...party.sharedState, deck: val });
    } else {
      setLocalDeck(val);
    }
  };

  const setDealerHand = (val: LetterCard[]) => {
    if (hasParty) {
      setPartyGameState('letterjack', party.turnIndex ?? 0, { ...party.sharedState, dealerHand: val });
    } else {
      setLocalDealerHand(val);
    }
  };

  const setPhase = (val: 'betting' | 'playing' | 'dealer-turn' | 'ended') => {
    if (hasParty) {
      setPartyGameState('letterjack', party.turnIndex ?? 0, { ...party.sharedState, phase: val });
    } else {
      setLocalPhase(val);
    }
  };

  const setBlackjackMessage = (val: string) => {
    if (hasParty) {
      setPartyGameState('letterjack', party.turnIndex ?? 0, { ...party.sharedState, blackjackMessage: val });
    } else {
      setLocalBlackjackMessage(val);
    }
  };

  const setFinalPayout = (val: number) => {
    if (hasParty) {
      setPartyGameState('letterjack', party.turnIndex ?? 0, { ...party.sharedState, finalPayout: val });
    } else {
      setLocalFinalPayout(val);
    }
  };

  const setDealerExpression = (val: 'idle' | 'smile' | 'lose' | 'win') => {
    if (hasParty) {
      setPartyGameState('letterjack', party.turnIndex ?? 0, { ...party.sharedState, dealerExpression: val });
    } else {
      setLocalDealerExpression(val);
    }
  };

  const [wordSelection, setWordSelection] = useState<string>("");
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [submittedWords, setSubmittedWords] = useState<{ word: string; score: number }[]>([]);
  const [accumulatedWordScore, setAccumulatedWordScore] = useState<number>(0);

  // Broadcast real-time hand updates to other party members
  useEffect(() => {
    if (!party) return;

    if (phase === 'playing') {
      const currentScore = playerHand.reduce((sum, c) => sum + c.value, 0);
      updateMyState('letterjack', {
        hand: playerHand,
        score: currentScore,
        busted: currentScore > 21,
        stood: false,
      });
    } else if (phase === 'dealer-turn' || phase === 'ended') {
      const currentScore = playerHand.reduce((sum, c) => sum + c.value, 0);
      updateMyState('letterjack', {
        hand: playerHand,
        score: currentScore,
        busted: currentScore > 21,
        stood: true,
      });
    } else {
      updateMyState('none', null);
    }
  }, [party, phase, playerHand]);

  // HOST-ONLY DEALER PLAY AGENT FOR MULTIPLAYER
  useEffect(() => {
    if (!party || !isHost || party.activeScreen !== 'letterjack') return;
    if (phase !== 'dealer-turn') return;

    const timeout = setTimeout(() => {
      let currentDealerHand = [...dealerHand];
      let currentDeck = [...deck];

      // Draw until score >= 17
      while (getHandTotal(currentDealerHand) < 17 && currentDeck.length > 0) {
        currentDealerHand.push(currentDeck.shift()!);
      }

      const dealerTotal = getHandTotal(currentDealerHand);

      // Evaluate outcomes and adjust payouts for each participant
      const updatedPlayers = party.players.map(p => {
        const pScore = p.state?.score ?? 0;
        const pBusted = p.state?.busted ?? false;

        let payoutGain = 0;
        if (pBusted) {
          payoutGain = 0; // Lost initial bet
        } else if (dealerTotal > 21) {
          payoutGain = bet * 2; // Dealer bust pays 1:1 (total double back)
        } else if (pScore > dealerTotal) {
          payoutGain = bet * 2; // Win hand pays 1:1
        } else if (pScore < dealerTotal) {
          payoutGain = 0; // Lost hand
        } else {
          payoutGain = bet; // Push (tie) returns initial bet
        }

        return {
          ...p,
          coins: p.coins + payoutGain,
          state: {
            ...p.state,
            stood: true,
          }
        };
      });

      let summaryMsg = `Marshal Cardwell got ${dealerTotal}. `;
      if (dealerTotal > 21) {
        summaryMsg += "The Dealer BUSTED! Outlaws are rewarded.";
      } else {
        summaryMsg += "Showdown completed! Check your table winnings.";
      }

      const nextShared = {
        phase: 'ended' as const,
        deck: currentDeck,
        dealerHand: currentDealerHand,
        bet,
        blackjackMessage: summaryMsg,
        finalPayout: 0,
        dealerExpression: dealerTotal > 21 ? 'lose' : 'win' as any,
      };

      setPartyGameState('letterjack', 0, nextShared, updatedPlayers);
    }, 1500);

    return () => clearTimeout(timeout);
  }, [party?.activeScreen, phase, isHost, deck, dealerHand, bet]);

  // HOST-ONLY BOT ACTION DECISIONS AGENT FOR MULTIPLAYER
  useEffect(() => {
    if (!party || !isHost || party.activeScreen !== 'letterjack') return;
    if (phase !== 'playing') return;

    const currentActive = party.players[party.turnIndex ?? 0];
    if (!currentActive || !currentActive.isBot) return;

    const timeout = setTimeout(() => {
      const botScore = currentActive.state?.score ?? 0;
      // Bot logic: hit if under 16 with high probability
      const shouldHit = botScore < 16 && Math.random() < 0.85;

      if (shouldHit && deck.length > 0) {
        const nextDeck = [...deck];
        const drawn = nextDeck.shift()!;
        const currentHand = currentActive.state?.hand || [];
        const nextHand = [...currentHand, drawn];
        const nextScore = nextHand.reduce((sum, c) => sum + c.value, 0);
        const isBusted = nextScore > 21;

        const updatedPlayers = party.players.map(p => {
          if (p.id === currentActive.id) {
            return {
              ...p,
              state: {
                ...p.state,
                hand: nextHand,
                score: nextScore,
                busted: isBusted,
                stood: isBusted,
              }
            };
          }
          return p;
        });

        let nextTurnIndex = party.turnIndex ?? 0;
        let nextPhase: 'playing' | 'dealer-turn' | 'ended' | 'betting' = 'playing';

        const everyoneDone = updatedPlayers.every(p => p.state?.stood || p.state?.busted);
        if (everyoneDone) {
          nextPhase = 'dealer-turn';
        } else {
          let found = false;
          let checkIdx = party.turnIndex ?? 0;
          for (let i = 1; i <= party.players.length; i++) {
            const nextIdx = (checkIdx + i) % party.players.length;
            const targetPlayer = updatedPlayers[nextIdx];
            if (!targetPlayer.state?.stood && !targetPlayer.state?.busted) {
              nextTurnIndex = nextIdx;
              found = true;
              break;
            }
          }
          if (!found) {
            nextPhase = 'dealer-turn';
          }
        }

        const nextShared = {
          phase: nextPhase,
          deck: nextDeck,
          dealerHand,
          bet,
          blackjackMessage,
          finalPayout,
          dealerExpression,
        };

        setPartyGameState('letterjack', nextTurnIndex, nextShared, updatedPlayers);
      } else {
        // Bot STANDS
        const updatedPlayers = party.players.map(p => {
          if (p.id === currentActive.id) {
            return {
              ...p,
              state: {
                ...p.state,
                stood: true,
              }
            };
          }
          return p;
        });

        let nextTurnIndex = party.turnIndex ?? 0;
        let nextPhase: 'playing' | 'dealer-turn' | 'ended' | 'betting' = 'playing';

        const everyoneDone = updatedPlayers.every(p => p.state?.stood || p.state?.busted);
        if (everyoneDone) {
          nextPhase = 'dealer-turn';
        } else {
          let found = false;
          let checkIdx = party.turnIndex ?? 0;
          for (let i = 1; i <= party.players.length; i++) {
            const nextIdx = (checkIdx + i) % party.players.length;
            const targetPlayer = updatedPlayers[nextIdx];
            if (!targetPlayer.state?.stood && !targetPlayer.state?.busted) {
              nextTurnIndex = nextIdx;
              found = true;
              break;
            }
          }
          if (!found) {
            nextPhase = 'dealer-turn';
          }
        }

        const nextShared = {
          phase: nextPhase,
          deck,
          dealerHand,
          bet,
          blackjackMessage,
          finalPayout,
          dealerExpression,
        };

        setPartyGameState('letterjack', nextTurnIndex, nextShared, updatedPlayers);
      }
    }, 2000);

    return () => clearTimeout(timeout);
  }, [party?.turnIndex, phase, isHost, deck, dealerHand, bet]);

  // Per-Action Betting States
  const [showHitWagerModal, setShowHitWagerModal] = useState<boolean>(false);

  // Setup default bets on start
  useEffect(() => {
    if (stats.coins < bet) {
      setBet(Math.max(10, stats.coins));
    }
  }, [stats.coins, bet]);

  // Generate full Scrabble frequency deck with loaded high-value card frequencies
  const buildDeck = (): LetterCard[] => {
    const cardPool: LetterCard[] = [];
    let idCounter = 1;

    Object.entries(SCRABBLE_FREQUENCIES).forEach(([letter, originalCount]) => {
      const value = SCRABBLE_VALUES[letter];
      // Boost the occurrence of high-value letters to make the game highly volatile and easier to lose / bust.
      let count = originalCount;
      if (value >= 8) {
        // High-value letters Q (10), Z (10), J (8), X (8) normally have frequency 1.
        // We boost them to 10 to flood the deck with high points!
        count = 10;
      } else if (value >= 4) {
        // Medium-high letters like K (5), F, H, V, W, Y (4) normally have frequency 1 or 2.
        // We boost them to 8.
        count = 8;
      }

      for (let i = 0; i < count; i++) {
        cardPool.push({
          id: `${letter}-${idCounter++}`,
          letter,
          value
        });
      }
    });

    // Fisher-Yates Shuffle
    for (let i = cardPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cardPool[i], cardPool[j]] = [cardPool[j], cardPool[i]];
    }

    return cardPool;
  };

  // Start round
  const handleStartRound = () => {
    audioManager.playClick();
    const currentCoins = hasParty ? (party.players.find(p => p.id === playerId)?.coins ?? 1000) : stats.coins;
    if (currentCoins < bet) {
      alert("You don't have enough coins, partner! Lower your bet.");
      return;
    }

    const initialDeck = buildDeck();
    const d1 = initialDeck.shift()!;
    const d2 = initialDeck.shift()!;
    const initialDealerHand = [d1, d2];

    if (hasParty) {
      if (isHost) {
        // Deal 2 cards to each player at the table
        const updatedPlayers = party.players.map(p => {
          const p1 = initialDeck.shift()!;
          const p2 = initialDeck.shift()!;
          const initialHand = [p1, p2];
          const initialScore = p1.value + p2.value;
          return {
            ...p,
            game: 'letterjack' as const,
            state: {
              hand: initialHand,
              score: initialScore,
              busted: initialScore > 21,
              stood: initialScore === 21, // BlackJack auto-stands
            },
            coins: p.coins - bet, // Spend bet
          };
        });

        const initialShared = {
          phase: 'playing' as const,
          deck: initialDeck,
          dealerHand: initialDealerHand,
          bet,
          blackjackMessage: "",
          finalPayout: 0,
          dealerExpression: 'idle' as const,
        };

        setPartyGameState('letterjack', 0, initialShared, updatedPlayers);
      }
    } else {
      // Spend coins for initial bet
      onUpdateStats({ coins: stats.coins - bet });

      const p1 = initialDeck.shift()!;
      const p2 = initialDeck.shift()!;

      setLocalDeck(initialDeck);
      setLocalPlayerHand([p1, p2]);
      setLocalDealerHand(initialDealerHand);
      
      setWordSelection("");
      setSelectedCardIds(new Set());
      setSubmittedWords([]);
      setAccumulatedWordScore(0);
      setLocalDealerExpression('idle');
      setLocalPhase('playing');
      setLocalBlackjackMessage("");
      setLocalFinalPayout(0);
    }

    audioManager.playCardDeal();
    setTimeout(() => audioManager.playCardDeal(), 150);
  };

  // Calculate hand Scrabble running total value
  const getHandTotal = (hand: LetterCard[]) => {
    return hand.reduce((sum, card) => sum + card.value, 0);
  };

  // Triggered when clicking "HIT" - opens the per-action bet modifier modal
  const handleHitPrompt = () => {
    if (phase !== 'playing') return;
    audioManager.playClick();
    
    if (getHandTotal(playerHand) >= 21) {
      alert("You're already at or over 21, partner!");
      return;
    }

    if (deck.length === 0) {
      alert("The deck is bone dry, partner!");
      return;
    }

    // Open wager increase modal before drawing the hit card!
    setShowHitWagerModal(true);
  };

  // Execute actual draw after selecting hit wager increase
  const executeHit = (additionalWager: number) => {
    setShowHitWagerModal(false);

    const currentCoins = hasParty ? (party.players.find(p => p.id === playerId)?.coins ?? 1000) : stats.coins;
    if (currentCoins < additionalWager) {
      alert("Not enough coins to increase your bet!");
      return;
    }

    if (hasParty) {
      const nextDeck = [...deck];
      const drawn = nextDeck.shift()!;
      const nextHand = [...playerHand, drawn];
      const nextScore = nextHand.reduce((sum, c) => sum + c.value, 0);
      const isBusted = nextScore > 21;

      const updatedPlayers = party.players.map(p => {
        if (p.id === playerId) {
          return {
            ...p,
            state: {
              ...p.state,
              hand: nextHand,
              score: nextScore,
              busted: isBusted,
              stood: p.state?.stood || isBusted,
            },
            coins: p.coins - additionalWager,
          };
        }
        return p;
      });

      let nextTurnIndex = party.turnIndex ?? 0;
      let nextPhase: 'playing' | 'dealer-turn' | 'ended' | 'betting' = 'playing';

      const everyoneDone = updatedPlayers.every(p => p.state?.stood || p.state?.busted);
      if (everyoneDone) {
        nextPhase = 'dealer-turn';
      } else {
        let found = false;
        let checkIdx = party.turnIndex ?? 0;
        for (let i = 1; i <= party.players.length; i++) {
          const nextIdx = (checkIdx + i) % party.players.length;
          const targetPlayer = updatedPlayers[nextIdx];
          if (!targetPlayer.state?.stood && !targetPlayer.state?.busted) {
            nextTurnIndex = nextIdx;
            found = true;
            break;
          }
        }
        if (!found) {
          nextPhase = 'dealer-turn';
        }
      }

      const nextShared = {
        phase: nextPhase,
        deck: nextDeck,
        dealerHand,
        bet: bet + additionalWager,
        blackjackMessage,
        finalPayout,
        dealerExpression,
      };

      setPartyGameState('letterjack', nextTurnIndex, nextShared, updatedPlayers);
      audioManager.playCardDeal();

    } else {
      if (additionalWager > 0) {
        onUpdateStats({ coins: stats.coins - additionalWager });
        setBet(prev => prev + additionalWager);
      }

      const nextDeck = [...deck];
      const drawn = nextDeck.shift()!;
      const nextHand = [...playerHand, drawn];

      setLocalDeck(nextDeck);
      setLocalPlayerHand(nextHand);
      audioManager.playCardDeal();

      // Check bust over 21
      if (getHandTotal(nextHand) > 21) {
        handleBust(bet + additionalWager);
      }
    }
  };

  // Double Down action: Double wager, draw exactly 1 card, and stand
  const handleDoubleDown = () => {
    if (phase !== 'playing' || playerHand.length !== 2) return;
    audioManager.playClick();

    const doubleCost = bet;
    const currentCoins = hasParty ? (party.players.find(p => p.id === playerId)?.coins ?? 1000) : stats.coins;
    if (currentCoins < doubleCost) {
      alert("You don't have enough coins to double your wager, partner!");
      return;
    }

    if (hasParty) {
      const nextDeck = [...deck];
      const drawn = nextDeck.shift()!;
      const nextHand = [...playerHand, drawn];
      const nextScore = nextHand.reduce((sum, c) => sum + c.value, 0);
      const isBusted = nextScore > 21;

      const updatedPlayers = party.players.map(p => {
        if (p.id === playerId) {
          return {
            ...p,
            state: {
              ...p.state,
              hand: nextHand,
              score: nextScore,
              busted: isBusted,
              stood: true, // auto-stood after double-down
            },
            coins: p.coins - doubleCost,
          };
        }
        return p;
      });

      let nextTurnIndex = party.turnIndex ?? 0;
      let nextPhase: 'playing' | 'dealer-turn' | 'ended' | 'betting' = 'playing';

      const everyoneDone = updatedPlayers.every(p => p.state?.stood || p.state?.busted);
      if (everyoneDone) {
        nextPhase = 'dealer-turn';
      } else {
        let found = false;
        let checkIdx = party.turnIndex ?? 0;
        for (let i = 1; i <= party.players.length; i++) {
          const nextIdx = (checkIdx + i) % party.players.length;
          const targetPlayer = updatedPlayers[nextIdx];
          if (!targetPlayer.state?.stood && !targetPlayer.state?.busted) {
            nextTurnIndex = nextIdx;
            found = true;
            break;
          }
        }
        if (!found) {
          nextPhase = 'dealer-turn';
        }
      }

      const nextShared = {
        phase: nextPhase,
        deck: nextDeck,
        dealerHand,
        bet: bet * 2,
        blackjackMessage,
        finalPayout,
        dealerExpression,
      };

      setPartyGameState('letterjack', nextTurnIndex, nextShared, updatedPlayers);
      audioManager.playCardDeal();

    } else {
      // Deduct double cost and set doubled bet
      onUpdateStats({ coins: stats.coins - doubleCost });
      const finalDoubledBet = bet * 2;
      setBet(finalDoubledBet);

      const nextDeck = [...deck];
      const drawn = nextDeck.shift()!;
      const nextHand = [...playerHand, drawn];

      setLocalDeck(nextDeck);
      setLocalPlayerHand(nextHand);
      audioManager.playCardDeal();

      const playerTotal = getHandTotal(nextHand);
      if (playerTotal > 21) {
        handleBust(finalDoubledBet);
      } else {
        // Stand immediately and trigger dealer AI turn
        setLocalPhase('dealer-turn');
        setTimeout(() => {
          runDealerTurn(nextHand, nextDeck, finalDoubledBet);
        }, 800);
      }
    }
  };

  const handleBust = (currentActiveBet: number) => {
    setLocalDealerExpression('smile');
    setLocalPhase('ended');
    audioManager.playBust();
    setLocalBlackjackMessage("Busted over 21! You lose the card wager.");
    
    // Save stats
    onUpdateStats({
      gamesPlayedLetterjack: stats.gamesPlayedLetterjack + 1
    });
  };

  // Add card letter to current word constructor
  const handleCardClick = (card: LetterCard) => {
    if (phase !== 'playing') return;
    if (hasParty && !isMyTurn) return;
    audioManager.playClick();

    if (selectedCardIds.has(card.id)) {
      // Remove from selection
      const nextSelected = new Set(selectedCardIds);
      nextSelected.delete(card.id);
      setSelectedCardIds(nextSelected);
      
      // Rebuild typed word based on current selected ids
      const nextWord = playerHand
        .filter(c => nextSelected.has(c.id))
        .map(c => c.letter)
        .join("");
      setWordSelection(nextWord);
    } else {
      // Add to selection
      const nextSelected = new Set(selectedCardIds);
      nextSelected.add(card.id);
      setSelectedCardIds(nextSelected);

      const nextWord = wordSelection + card.letter;
      setWordSelection(nextWord);
    }
  };

  // Clear current word selection
  const handleClearSelection = () => {
    audioManager.playClick();
    setSelectedCardIds(new Set());
    setWordSelection("");
  };

  // Submit word constructed from player hand cards
  const handleSubmitWord = () => {
    if (phase !== 'playing') return;
    if (hasParty && !isMyTurn) return;
    audioManager.playClick();

    if (wordSelection.length < 3) {
      alert("Words must be at least 3 letters long, partner!");
      return;
    }

    if (!isValidWord(wordSelection)) {
      alert(`"${wordSelection}" didn't pass the Scrabble dictionary marshal! Try another spell.`);
      return;
    }

    // Compute Scrabble word score
    const wordScore = wordSelection.split('').reduce((sum, char) => sum + (SCRABBLE_VALUES[char] || 0), 0);
    const bonusFactor = wordSelection.length >= 5 ? 15 : 0; // Length bonus
    const finalScore = (wordScore * 10) + bonusFactor;

    audioManager.playCoin();
    setSubmittedWords(prev => [...prev, { word: wordSelection, score: finalScore }]);
    setAccumulatedWordScore(prev => prev + finalScore);

    // Consume cards used
    const nextHand = playerHand.filter(card => !selectedCardIds.has(card.id));
    setPlayerHand(nextHand);

    // Reset selection
    setSelectedCardIds(new Set());
    setWordSelection("");
  };

  // Stand and trigger dealer AI turn
  const handleStand = () => {
    if (phase !== 'playing') return;
    if (hasParty && !isMyTurn) return;
    audioManager.playClick();

    if (hasParty) {
      const updatedPlayers = party.players.map(p => {
        if (p.id === playerId) {
          return {
            ...p,
            state: {
              ...p.state,
              stood: true,
            }
          };
        }
        return p;
      });

      let nextTurnIndex = party.turnIndex ?? 0;
      let nextPhase: 'playing' | 'dealer-turn' | 'ended' | 'betting' = 'playing';

      const everyoneDone = updatedPlayers.every(p => p.state?.stood || p.state?.busted);
      if (everyoneDone) {
        nextPhase = 'dealer-turn';
      } else {
        let found = false;
        let checkIdx = party.turnIndex ?? 0;
        for (let i = 1; i <= party.players.length; i++) {
          const nextIdx = (checkIdx + i) % party.players.length;
          const targetPlayer = updatedPlayers[nextIdx];
          if (!targetPlayer.state?.stood && !targetPlayer.state?.busted) {
            nextTurnIndex = nextIdx;
            found = true;
            break;
          }
        }
        if (!found) {
          nextPhase = 'dealer-turn';
        }
      }

      const nextShared = {
        phase: nextPhase,
        deck,
        dealerHand,
        bet,
        blackjackMessage,
        finalPayout,
        dealerExpression,
      };

      setPartyGameState('letterjack', nextTurnIndex, nextShared, updatedPlayers);

    } else {
      setLocalPhase('dealer-turn');
      // Run dealer drawing algorithm
      setTimeout(() => {
        runDealerTurn(playerHand, deck, bet);
      }, 600);
    }
  };

  const runDealerTurn = (currentPlayerHand: LetterCard[], currentDeckState: LetterCard[], currentActiveBet: number) => {
    let currentDealerHand = [...dealerHand];
    let currentDeck = [...currentDeckState];
    
    // Dealer shuffles/draws cards while total value is less than 17
    while (getHandTotal(currentDealerHand) < 17 && currentDeck.length > 0) {
      currentDealerHand.push(currentDeck.shift()!);
      audioManager.playCardDeal();
    }

    setLocalDealerHand(currentDealerHand);
    setLocalDeck(currentDeck);

    // Determine final outcome
    const playerTotal = getHandTotal(currentPlayerHand);
    const dealerTotal = getHandTotal(currentDealerHand);

    let blackjackGain = 0;
    let outcomeMsg = "";
    let expression: 'idle' | 'smile' | 'lose' | 'win' = 'idle';

    if (dealerTotal > 21) {
      outcomeMsg = "Dealer busted over 21! You win the Blackjack hand.";
      blackjackGain = currentActiveBet * 2;
      expression = 'lose';
      audioManager.playWin();
    } else if (playerTotal > dealerTotal) {
      outcomeMsg = `Your hand total (${playerTotal}) beats Dealer's (${dealerTotal}). You win!`;
      blackjackGain = currentActiveBet * 2;
      expression = 'lose';
      audioManager.playWin();
    } else if (playerTotal < dealerTotal) {
      outcomeMsg = `Dealer's hand total (${dealerTotal}) beats yours (${playerTotal}).`;
      blackjackGain = 0; // wager lost
      expression = 'win';
      audioManager.playLose();
    } else {
      outcomeMsg = `Hand showdown ends in a push/tie (${playerTotal} vs ${dealerTotal}). Bet returned.`;
      blackjackGain = currentActiveBet; // return wager
      expression = 'idle';
      audioManager.playClick();
    }

    setLocalDealerExpression(expression);
    setLocalBlackjackMessage(outcomeMsg);
    
    // Combine payout blackjack gain + word score
    const totalPayout = blackjackGain + accumulatedWordScore;
    setLocalFinalPayout(totalPayout);
    setLocalPhase('ended');

    // Log submitted words to stats ledger
    const statsWordLogs = submittedWords.map(sw => ({
      word: sw.word,
      score: sw.score,
      game: 'letterjack' as const,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));

    // Save final coin stats
    const wonHand = blackjackGain > currentActiveBet;
    onUpdateStats({
      coins: stats.coins + totalPayout,
      gamesPlayedLetterjack: stats.gamesPlayedLetterjack + 1,
      gamesWonLetterjack: stats.gamesWonLetterjack + (wonHand ? 1 : 0),
      highestScoreLetterjack: Math.max(stats.highestScoreLetterjack, totalPayout),
      totalEarnings: stats.totalEarnings + totalPayout,
      wordLog: [...stats.wordLog, ...statsWordLogs]
    });
  };

  // Return to betting screen
  const handlePlayAgain = () => {
    audioManager.playClick();
    setPhase('betting');
  };

  // Bet adjustments
  const adjustBet = (amount: number) => {
    audioManager.playClick();
    if (amount === -1) {
      setBet(stats.coins);
    } else {
      setBet(prev => {
        const next = prev + amount;
        if (next < 10) return 10;
        if (next > stats.coins) return stats.coins;
        return next;
      });
    }
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
          <ArrowLeft className="w-4 h-4" /> {hasParty ? "Leave Lobby Party" : "Exit to Saloon"}
        </button>

        {hasParty && (
          <div className="bg-[#1a0f0a] border border-black/50 px-3 py-1.5 text-xs text-[#eedbb0] font-mono flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isMyTurn ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
            <span>Turn: <strong className="text-emerald-400">{activePlayer?.name || "None"}</strong> {isMyTurn ? "(YOU)" : ""}</span>
          </div>
        )}

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-[#d4af37] font-bold bg-black px-2.5 py-1 border-2 border-black">
            <Coins className="w-4 h-4 text-amber-500" />
            <span>${stats.coins.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1 bg-black px-2.5 py-1 border-2 border-black text-[#e3c598]/60">
            <span className="font-sans">Dealer Wins:</span>
            <span className="text-white font-bold">{stats.gamesWonLetterjack}</span>
          </div>
        </div>
      </div>

      {/* Break Safeguard */}
      {stats.coins < 10 && phase === 'betting' && !hasParty && (
        <div className="bg-red-950 p-4 border-4 border-black text-center space-y-3 shadow-[4px_4px_0_0_#000]">
          <p className="text-sm text-red-200 font-sans font-bold">You are broke, partner! Head over to the Sheriff for a grant.</p>
          <button 
            onClick={() => { audioManager.playCoin(); onUpdateStats({ coins: 250 }); }}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-black border-2 border-black font-sans font-black text-xs uppercase cursor-pointer shadow-[2px_2px_0_0_#000]"
          >
            🤠 Claim Sheriff's $250 Bounty Relief Grant
          </button>
        </div>
      )}

      {/* Main Wood Placard Header */}
      <div className="bg-[#2a170d] p-4 text-center border-4 border-black shadow-[6px_6px_0_0_#000] space-y-1">
        <h1 className="font-sans font-black text-4xl text-[#d4af37] uppercase tracking-wide">LETTERJACK</h1>
        <p className="text-xs text-[#e3c598]/60 uppercase font-mono tracking-widest">SCRABBLE MEETS VEGAS BLACKJACK!</p>
      </div>

      {/* PHASE 1: BETTING / WAGER SELECTION */}
      {phase === 'betting' && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          {/* Rules / Tutorial Board (5 cols) */}
          <div className="lg:col-span-5 bg-[#e3c598] text-black p-6 border-4 border-black shadow-[8px_8px_0_0_#000] text-center flex flex-col justify-between space-y-4">
            <div className="border-4 border-dashed border-black/50 p-5 flex flex-col items-center justify-center flex-1 space-y-4">
              <span className="font-sans font-black text-2xl tracking-tight border-b-4 border-black pb-1 w-full text-black">
                LETTERJACK RULES
              </span>
              
              <div className="w-20 h-20 bg-emerald-900 flex flex-col items-center justify-between p-2 text-[#eedbb0] font-sans font-black text-3xl border-2 border-black shadow-[3px_3px_0_0_#000] relative">
                <span>Q</span>
                <span className="text-[10px] text-red-300 font-mono self-end">10</span>
              </div>

              <div className="text-left font-sans text-xs space-y-2.5 text-black/80 max-w-xs leading-relaxed">
                <p>
                  1. Letters use their <strong className="text-black font-black">Scrabble point value</strong> counts. Draw letters to hit <strong className="text-black font-black">21</strong>.
                </p>
                <p>
                  2. Double Down is available on your starting hand to double your payout!
                </p>
                <p>
                  3. Select cards to <strong className="text-black font-black">build words</strong>. Correct words pay out scores instantly and remove tiles from your hand!
                </p>
                <p>
                  4. Stand to trigger Marshal Cardwell's showdown draw rules.
                </p>
              </div>
            </div>
          </div>

          {/* Betting Setup Board (7 cols) */}
          <div className="lg:col-span-7 bg-[#2a170d] text-white p-6 border-4 border-black shadow-[8px_8px_0_0_#000] space-y-6 flex flex-col justify-between">
            <div className="space-y-4 border-b border-black pb-4">
              <h2 className="font-sans font-black text-3xl text-[#d4af37] flex items-center gap-2 select-none">
                ♣ THE EMERALD TABLE
              </h2>
              <p className="font-sans text-xs text-[#e3c598]/60">
                {hasParty ? "Table stakes are set by the party leader. Join hands, spell words, and secure the leaderboard." : "Dealer shuffles a full deck of Scrabble tiles. Bet your coins, spell words, beat the Dealer, and claim the tabletop."}
              </p>
              
              <div className="bg-red-950/50 border-2 border-red-900 p-3 text-xs text-red-200 font-sans space-y-1 shadow-[2px_2px_0_0_#000]">
                <span className="font-black text-red-400 block uppercase tracking-wider flex items-center gap-1">
                  ⚠️ VOLATILE HIGH-VALUE DECK ACTIVE
                </span>
                <p className="leading-snug text-[11px] text-red-300">
                  High-value letters (<strong>Q, Z, J, X, K, F, H, etc.</strong>) are stacked 5x to 10x more frequently in Cardwell's deck. Hand values escalate rapidly—stay sharp, or you will bust!
                </p>
              </div>
            </div>

            {/* Bet display */}
            <div className="bg-black/40 p-4 border-2 border-black shadow-[2px_2px_0_0_#000] text-center space-y-3">
              <span className="text-xs font-sans font-bold uppercase text-[#e3c598]/60 block">Wager Bet Amount</span>
              <span className="font-mono text-4xl text-[#d4af37] font-bold flex items-center justify-center gap-1.5">
                <Coins className="w-8 h-8 text-amber-400" /> {bet}
              </span>

              {/* Adjust chips */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => adjustBet(-50)}
                  disabled={hasParty && !isHost}
                  className="px-3 py-1.5 bg-[#3d251e] hover:bg-black disabled:opacity-30 disabled:pointer-events-none border border-black text-[#e3c598] font-mono text-xs cursor-pointer"
                >
                  -50
                </button>
                <button
                  onClick={() => adjustBet(-10)}
                  disabled={hasParty && !isHost}
                  className="px-3 py-1.5 bg-[#3d251e] hover:bg-black disabled:opacity-30 disabled:pointer-events-none border border-black text-[#e3c598] font-mono text-xs cursor-pointer"
                >
                  -10
                </button>
                {CHIP_VALUES.map(val => (
                  <button
                    key={val}
                    onClick={() => adjustBet(val - bet)}
                    disabled={(hasParty && !isHost) || stats.coins < val}
                    className="w-10 h-10 rounded-full border-2 border-dashed border-[#e3c598] bg-black text-[#e3c598] font-mono text-xs font-bold hover:bg-black cursor-pointer disabled:opacity-40 flex items-center justify-center shadow-[2px_2px_0_0_#000] active:scale-90 transition-transform"
                  >
                    {val}
                  </button>
                ))}
                <button
                  onClick={() => adjustBet(-1)}
                  disabled={hasParty && !isHost}
                  className="px-3 py-1.5 bg-red-950 hover:bg-black disabled:opacity-30 disabled:pointer-events-none border border-black text-red-200 font-mono text-xs font-bold cursor-pointer"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Launch Deal */}
            {hasParty && !isHost ? (
              <div className="w-full py-4 bg-black/40 border-4 border-dashed border-black text-[#e3c598]/60 font-sans font-bold text-center text-sm tracking-wider uppercase animate-pulse">
                ⏳ Waiting for Party Leader to Deal Initial Letters...
              </div>
            ) : (
              <button
                onClick={handleStartRound}
                className="w-full py-4 bg-[#b5a642] hover:bg-[#c9ba4d] text-black border-4 border-black font-sans font-black text-lg tracking-widest shadow-[4px_4px_0_0_#000] cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-[2px_2px_0_0_#000] transition-all select-none uppercase"
              >
                ♠ Deal Initial Letters
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* ACTIVE GAMEBOARD */}
      {(phase === 'playing' || phase === 'dealer-turn' || phase === 'ended') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT STATION: Dealer portrait & Word Spells Builder (4 cols) */}
          <div className="lg:col-span-4 bg-[#2a170d] p-4 border-4 border-black shadow-[6px_6px_0_0_#000] flex flex-col justify-between space-y-4">
            
            {/* Dealer face card/portrait info */}
            <div className="bg-black/40 p-4 border border-black text-center space-y-2 relative overflow-hidden">
              <span className="text-[9px] font-mono text-[#e3c598]/60 uppercase block">THE DEALER</span>
              
              {/* Face expression graphic rendering */}
              <div className="w-16 h-16 rounded-full border-2 border-black bg-[#1a0f0a] mx-auto flex items-center justify-center relative shadow">
                {dealerExpression === 'idle' && <span className="text-3xl">👨‍✈️</span>}
                {dealerExpression === 'smile' && <span className="text-3xl">😎</span>}
                {dealerExpression === 'lose' && <span className="text-3xl">😭</span>}
                {dealerExpression === 'win' && <span className="text-3xl">🤑</span>}
                
                <div className="absolute inset-0 bg-[#f59e0b]/5 rounded-full" />
              </div>

              <span className="font-sans font-bold text-sm text-[#d4af37] block mt-1">Marshal Cardwell</span>
              <p className="text-[10px] text-[#e3c598]/60 font-sans leading-none italic">
                {phase === 'playing' ? '"Play your hand, partner."' : '"Showdown time."'}
              </p>
            </div>

            {/* Word Spell Builder block */}
            <div className="bg-black/20 p-4 border border-black flex-1 flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <span className="text-[10px] font-sans text-[#e3c598]/60 uppercase block text-center">Word spell builder</span>
                
                {/* Constructed word display bar */}
                <div className="min-h-12 bg-black border-2 border-black flex items-center justify-center text-center p-2">
                  {wordSelection ? (
                    <span className="font-sans font-black text-emerald-400 text-xl uppercase tracking-widest">
                      {wordSelection}
                    </span>
                  ) : (
                    <span className="text-xs text-[#e3c598]/40 font-mono italic">
                      Click letter tiles to construct words
                    </span>
                  )}
                </div>
              </div>

              {/* Action utilities */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleClearSelection}
                  disabled={!wordSelection || phase !== 'playing'}
                  className="py-1.5 bg-[#3d251e] hover:bg-black disabled:opacity-40 border border-black font-sans text-xs cursor-pointer text-[#e3c598]"
                >
                  Clear Letters
                </button>
                <button
                  onClick={handleSubmitWord}
                  disabled={wordSelection.length < 3 || phase !== 'playing'}
                  className="py-1.5 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-40 border border-black font-sans text-xs font-bold cursor-pointer text-emerald-100"
                >
                  Claim Word Points
                </button>
              </div>

              {/* Words submitted ledger */}
              <div className="border-t border-black pt-2 text-xs font-mono space-y-1.5">
                <span className="text-[#e3c598]/60 uppercase text-[9px] block">Claimed Words:</span>
                <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                  {submittedWords.length === 0 ? (
                    <span className="text-[#e3c598]/40 italic text-[10px] block text-center py-2">
                      No words spelled yet.
                    </span>
                  ) : (
                    submittedWords.map((sw, i) => (
                      <div key={i} className="flex justify-between items-center bg-black/60 p-1 border border-black px-2">
                        <span className="text-amber-200 tracking-wider font-bold uppercase">{sw.word}</span>
                        <span className="text-emerald-400 font-bold">+{sw.score} coins</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Green Casino Tabletop Card Area (8 cols) */}
          <div className="lg:col-span-8 bg-[#104b2b] border-4 border-black p-6 shadow-[6px_6px_0_0_#000] flex flex-col justify-between space-y-6 relative overflow-hidden min-h-[480px]">
            {/* Table overlay shadows */}
            <div className="absolute inset-0 bg-radial-gradient from-transparent to-[#041a0e]/60 pointer-events-none" />

            {/* VOLATILE DECK ALERT */}
            <div className="z-20 bg-red-950/80 border border-red-900 text-[10px] text-red-200 px-3 py-1.5 font-sans uppercase font-bold tracking-wider rounded flex items-center justify-between shadow">
              <span>⚠️ HIGH-VOLTAGE LOOSE-DECK IN PLAY</span>
              <span className="text-[9px] text-red-300">Q, Z, J, X, K, etc. are heavily stacked</span>
            </div>

            {/* CURVED CASINO GOLD PRINT TEXT ON THE GREEN FELT */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center opacity-15 pointer-events-none text-center select-none z-0">
              <span className="font-serif italic text-3xl md:text-4xl text-amber-300 font-black tracking-widest uppercase">
                BLACKJACK PAYS 3 TO 2
              </span>
              <span className="font-serif text-sm md:text-base text-amber-200 font-bold tracking-widest mt-1">
                INSURANCE PAYS 2 TO 1
              </span>
            </div>

            {/* DEALER FIELD */}
            <div className="space-y-2 border-b border-emerald-950 pb-4 z-10 relative">
              <div className="flex justify-between items-center font-sans text-xs text-emerald-200 font-bold">
                <span>Marshal's Hand</span>
                <span>
                  Value:{" "}
                  <strong className="text-white bg-black px-2 py-0.5 border border-black font-mono">
                    {phase === 'playing' ? '?' : getHandTotal(dealerHand)}
                  </strong>
                </span>
              </div>

              {/* Dealer Cards */}
              <div className="flex gap-2">
                {dealerHand.map((card, idx) => {
                  const hideCard = phase === 'playing' && idx === 1;
                  return (
                    <motion.div
                      key={card.id}
                      initial={{ scale: 0.9, rotateY: 180 }}
                      animate={{ scale: 1, rotateY: 0 }}
                      className={`w-14 h-20 border-2 border-black flex flex-col items-center justify-between font-sans shadow-[2px_2px_0_0_#000] relative ${
                        hideCard 
                          ? "bg-red-800" 
                          : "bg-[#e3c598] text-black"
                      }`}
                    >
                      {hideCard ? (
                        <div className="absolute inset-0 bg-[#3d0b0b] flex items-center justify-center">
                          <span className="text-red-400 text-xl font-mono font-bold">♠</span>
                        </div>
                      ) : (
                        <>
                          <span className="font-black text-xl leading-none mt-2">{card.letter}</span>
                          <span className="font-mono text-[9px] font-bold text-red-800 self-end mr-1.5 mb-1 leading-none">
                            {card.value}
                          </span>
                        </>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* PLAYER FIELD */}
            <div className="space-y-3 pt-2 z-10 relative">
              <div className="flex justify-between items-center font-sans text-xs text-emerald-200 font-bold">
                <span>Your Card Hand</span>
                <span className="flex items-center gap-1">
                  Value total:{" "}
                  <strong className={`px-2 py-0.5 border border-black font-mono ${getHandTotal(playerHand) > 21 ? 'bg-red-900 text-red-200 animate-pulse' : 'bg-black text-white'}`}>
                    {getHandTotal(playerHand)}
                  </strong>
                  / 21
                </span>
              </div>

              {/* Player Cards (Interactive selection) */}
              <div className="flex flex-wrap gap-2.5 min-h-[96px] p-2 bg-black/30 border border-emerald-950">
                {playerHand.length === 0 ? (
                  <div className="text-center w-full py-8 text-emerald-300 italic font-mono text-xs">
                    No card tiles in your hand. Draw cards!
                  </div>
                ) : (
                  playerHand.map(card => {
                    const isSelected = selectedCardIds.has(card.id);
                    return (
                      <motion.div
                        key={card.id}
                        layout
                        onClick={() => handleCardClick(card)}
                        className={`w-14 h-20 border-2 flex flex-col items-center justify-between font-sans shadow-[2px_2px_0_0_#000] cursor-pointer transition-all relative ${
                          isSelected
                            ? "bg-amber-200 border-black scale-105 -translate-y-2 ring-2 ring-amber-400 text-amber-950 animate-pulse"
                            : "bg-[#e3c598] border-black text-black hover:bg-amber-100"
                        }`}
                      >
                        <span className="font-black text-xl leading-none mt-4">{card.letter}</span>
                        <span className="font-mono text-[9px] font-bold text-red-800 self-end mr-1.5 mb-1 leading-none">
                          {card.value}
                        </span>
                        
                        {/* Selected indicator */}
                        {isSelected && (
                          <span className="absolute top-1 left-1 text-[8px] bg-black text-amber-300 w-3.5 h-3.5 flex items-center justify-center border border-black shadow-[1px_1px_0_0_#000]">
                            ✓
                          </span>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ACTIVE BET INDICATOR BOX */}
            <div className="bg-black/50 border border-emerald-900 p-2.5 text-center flex justify-between items-center z-10">
              <span className="font-sans text-[11px] text-[#e3c598]/60 uppercase font-black">ACTIVE ROUND WAGER</span>
              <div className="flex items-center gap-1">
                <Coins className="w-4 h-4 text-amber-500" />
                <span className="font-mono font-black text-white text-lg">${bet}</span>
              </div>
            </div>

            {/* CONTROLS OR OUTCOME BANNER */}
            <div className="pt-4 z-10 border-t border-emerald-950 flex flex-col items-center justify-center">
              {phase === 'playing' ? (
                <div className="flex flex-col items-center gap-3 w-full">
                  {hasParty && !isMyTurn && (
                    <div className="w-full text-center py-2 bg-black/40 border-2 border-dashed border-amber-950 text-amber-400 font-sans font-bold text-xs animate-pulse uppercase tracking-wider">
                      🤠 Waiting for {activePlayer?.name || "partner"}'s turn...
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                    <button
                      onClick={handleHitPrompt}
                      disabled={(hasParty && !isMyTurn) || getHandTotal(playerHand) >= 21}
                      className="flex-1 py-3 bg-[#b5a642] hover:bg-[#c9ba4d] disabled:opacity-30 disabled:pointer-events-none text-black border-4 border-black shadow-[4px_4px_0_0_#000] font-sans font-black text-xs uppercase cursor-pointer active:translate-y-0.5 active:shadow-[2px_2px_0_0_#000] transition-all"
                    >
                      🃏 HIT CARD (DRAW)
                    </button>
                    
                    {/* Double Down Button: Only active on initial hand size of 2 */}
                    {playerHand.length === 2 && (
                      <button
                        onClick={handleDoubleDown}
                        disabled={hasParty && !isMyTurn}
                        className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-30 disabled:pointer-events-none text-black border-4 border-black shadow-[4px_4px_0_0_#000] font-sans font-black text-xs uppercase cursor-pointer active:translate-y-0.5 active:shadow-[2px_2px_0_0_#000] transition-all"
                      >
                        🔥 DOUBLE DOWN (${bet})
                      </button>
                    )}

                    <button
                      onClick={handleStand}
                      disabled={hasParty && !isMyTurn}
                      className="flex-1 py-3 bg-black hover:bg-[#1a0f0a] disabled:opacity-30 disabled:pointer-events-none text-[#e3c598] border-4 border-black shadow-[4px_4px_0_0_#000] font-sans font-black text-xs uppercase cursor-pointer active:translate-y-0.5 active:shadow-[2px_2px_0_0_#000] transition-all"
                    >
                      ✋ STAND (SHOWDOWN)
                    </button>
                  </div>
                </div>
              ) : phase === 'dealer-turn' ? (
                <div className="font-sans text-xs text-center text-emerald-200 animate-pulse py-2">
                  Marshal Cardwell is drawing card tiles...
                </div>
              ) : (
                // PHASE: ENDED OUTCOME RESOLUTION
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-black/60 p-4 border-4 border-black shadow-[4px_4px_0_0_#000] text-center space-y-3 w-full"
                >
                  <span className="font-sans font-black text-xl text-amber-300 tracking-wide block uppercase">
                    {blackjackMessage}
                  </span>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-sm mx-auto font-sans text-xs text-[#eedbb0]">
                    <div>
                      <span className="text-[#e3c598]/60">Card Wager Result:</span>
                      <span className="font-bold text-white block font-mono">
                        {finalPayout - accumulatedWordScore > 0 ? `+$${finalPayout - accumulatedWordScore}` : '$0'}
                      </span>
                    </div>
                    <div className="border-l border-black h-8 hidden sm:block" />
                    <div>
                      <span className="text-[#e3c598]/60">Word Spell Harvest:</span>
                      <span className="font-bold text-[#d4af37] block font-mono">
                        +${accumulatedWordScore}
                      </span>
                    </div>
                    <div className="border-l border-black h-8 hidden sm:block" />
                    <div>
                      <span className="font-bold text-[#d4af37]">Total Payout:</span>
                      <span className="font-bold text-[#d4af37] block font-mono">
                        ${finalPayout} coins
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-center justify-center gap-3 pt-2 w-full">
                    {hasParty && !isHost && (
                      <div className="text-[10px] text-[#e3c598]/60 font-sans uppercase animate-pulse mb-1">
                        ⏳ Waiting for Party Leader to start the next deal...
                      </div>
                    )}
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={handlePlayAgain}
                        disabled={hasParty && !isHost}
                        className="px-5 py-2.5 bg-[#b5a642] text-black border-4 border-black shadow-[4px_4px_0_0_#000] font-sans font-bold uppercase tracking-tighter hover:bg-[#c9ba4d] disabled:opacity-35 disabled:pointer-events-none active:translate-y-0.5 active:shadow-[2px_2px_0_0_#000] cursor-pointer transition-all"
                      >
                        Play Another Deal
                      </button>
                      <button
                        onClick={() => { audioManager.playClick(); onBackToMenu(); }}
                        className="px-5 py-2.5 bg-black text-[#e3c598] border-4 border-black shadow-[4px_4px_0_0_#000] font-sans font-bold uppercase tracking-tighter hover:bg-[#1a0f0a] active:translate-y-0.5 active:shadow-[2px_2px_0_0_#000] cursor-pointer transition-all"
                      >
                        Lobby Menu
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* PER-ACTION BET MODIFIER MODAL (PROMPTED BEFORE DRAWING/HITTING EACH CARD) */}
      <AnimatePresence>
        {showHitWagerModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#2a170d] border-4 border-black p-6 w-full max-w-sm text-center space-y-4 shadow-[8px_8px_0_0_#000]"
            >
              <h3 className="font-sans font-black text-xl text-[#d4af37] uppercase">
                🔫 Confirm Hit Wager
              </h3>
              <p className="font-sans text-xs text-[#e3c598]/80 leading-relaxed">
                Choose how much additional coins to wager on this next card draw! Your active wager is <strong className="text-white">${bet}</strong>.
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                {/* No addition option */}
                <button
                  onClick={() => executeHit(0)}
                  className="py-2.5 bg-black/60 hover:bg-black text-white border-2 border-black font-sans text-xs font-bold cursor-pointer"
                >
                  Just Draw (+$0)
                </button>

                {/* Addition Chips */}
                {[10, 50, 100].map(addVal => {
                  const hasCoins = stats.coins >= addVal;
                  return (
                    <button
                      key={addVal}
                      onClick={() => executeHit(addVal)}
                      disabled={!hasCoins}
                      className="py-2.5 bg-[#b5a642] hover:bg-[#c9ba4d] disabled:opacity-30 disabled:pointer-events-none text-black border-2 border-black font-sans text-xs font-black cursor-pointer uppercase flex items-center justify-center gap-1"
                    >
                      <Coins className="w-3.5 h-3.5" /> +${addVal}
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-black pt-3">
                <button
                  onClick={() => setShowHitWagerModal(false)}
                  className="w-full py-2.5 bg-[#3d251e] hover:bg-black text-[#e3c598] border-2 border-black font-sans text-xs cursor-pointer uppercase"
                >
                  Cancel Draw
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      </div>
      {party && <PartySidebar />}
    </div>
  );
}
