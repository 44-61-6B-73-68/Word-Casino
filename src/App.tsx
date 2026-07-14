import React, { useState, useEffect } from 'react';
import { GameStats, GameSettings, INITIAL_STATS, INITIAL_SETTINGS } from './types';
import { audioManager } from './utils/audio';
import { Coins, Trophy, BookOpen, Volume2, VolumeX, HelpCircle, Lock, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';
import WantedGame from './components/WantedGame';
import LetterjackGame from './components/LetterjackGame';
import StatsView from './components/StatsView';
import CollectionDetails from './components/CollectionDetails';
import { useParty } from './components/PartyContext';
import SaloonLobby from './components/SaloonLobby';

const STORAGE_STATS_KEY = "word_casino_stats_v1";
const STORAGE_SETTINGS_KEY = "word_casino_settings_v1";

export default function App() {
  // Global States
  const [stats, setStats] = useState<GameStats>(INITIAL_STATS);
  const [settings, setSettings] = useState<GameSettings>(INITIAL_SETTINGS);

  // Active Screen: 'menu' | 'wanted' | 'letterjack'
  const [activeScreen, setActiveScreen] = useState<'menu' | 'wanted' | 'letterjack'>('menu');
  
  // Modals
  const [showStats, setShowStats] = useState(false);
  const [showHandbook, setShowHandbook] = useState(false);

  // Dust Particle Array for Saloon atmosphere
  const [dustParticles, setDustParticles] = useState<{ id: number; left: number; top: number; delay: number }[]>([]);

  // Multiplayer Party context
  const { party, playerId, updateMyState, isHost, setPartyGameState, activeUsersCount } = useParty();

  // Active coins - switches between offline/online party balance ($1000 base) and single-player persistence
  const activeCoins = party && playerId
    ? (party.players.find(p => p.id === playerId)?.coins ?? 1000)
    : stats.coins;

  const handleUpdateStats = (updated: Partial<GameStats>) => {
    if (party && playerId) {
      if (updated.coins !== undefined) {
        updateMyState(
          activeScreen === 'menu' ? 'none' : activeScreen,
          party.players.find(p => p.id === playerId)?.state ?? null,
          updated.coins
        );
      }
    } else {
      updateStats(updated);
    }
  };

  const wrappedStats = party
    ? { ...stats, coins: activeCoins }
    : stats;

  // Load persistent stats and settings on mount
  useEffect(() => {
    const savedStats = localStorage.getItem(STORAGE_STATS_KEY);
    if (savedStats) {
      try {
        setStats(JSON.parse(savedStats));
      } catch (e) {
        console.error("Failed to load saloon ledger", e);
      }
    }

    const savedSettings = localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
        // Apply sound effect settings
        audioManager.setSoundEffectsEnabled(parsedSettings.soundEffects);
        if (parsedSettings.ambientMusic) {
          audioManager.startAmbientBackground();
        }
      } catch (e) {
        console.error("Failed to load saloon preferences", e);
      }
    }

    // Generate random ambient dust particles
    const particles = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 80 + 10,
      delay: Math.random() * 10
    }));
    setDustParticles(particles);
  }, []);

  // Synchronize active screen in multiplayer party automatically
  useEffect(() => {
    if (party && party.activeScreen) {
      if (party.activeScreen === 'none') {
        if (activeScreen !== 'menu') {
          setActiveScreen('menu');
        }
      } else {
        if (activeScreen !== party.activeScreen) {
          setActiveScreen(party.activeScreen);
        }
      }
    }
  }, [party?.activeScreen, activeScreen]);

  // Sync / Save Stats
  const updateStats = (updated: Partial<GameStats>) => {
    setStats(prev => {
      const next = { ...prev, ...updated };
      localStorage.setItem(STORAGE_STATS_KEY, JSON.stringify(next));
      return next;
    });
  };

  // Reset Stats
  const handleResetStats = () => {
    const next = { ...INITIAL_STATS, coins: 1000 };
    setStats(next);
    localStorage.setItem(STORAGE_STATS_KEY, JSON.stringify(next));
  };

  // Toggle Settings
  const toggleSoundEffects = () => {
    audioManager.playClick();
    const nextState = !settings.soundEffects;
    const nextSettings = { ...settings, soundEffects: nextState };
    setSettings(nextSettings);
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(nextSettings));
    audioManager.setSoundEffectsEnabled(nextState);
  };

  const toggleAmbientMusic = () => {
    audioManager.playClick();
    const nextState = !settings.ambientMusic;
    const nextSettings = { ...settings, ambientMusic: nextState };
    setSettings(nextSettings);
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(nextSettings));
    
    if (nextState) {
      audioManager.startAmbientBackground();
    } else {
      audioManager.stopAmbientBackground();
    }
  };

  // Refill coins if player goes completely broke (generous casino bankruptcy bailout)
  const handleBankruptcyRefill = () => {
    audioManager.playCoin();
    updateStats({ coins: 500 });
    alert("The Saloon Marshal slides you 500 courtesy chips! Don't blow them all in one go, partner.");
  };

  const launchGame = (game: 'wanted' | 'letterjack') => {
    audioManager.playClick();
    if (party) {
      if (isHost) {
        setPartyGameState(game, 0, null);
      } else {
        alert("Only the Party Leader can start the table's game, partner!");
      }
    } else {
      setActiveScreen(game);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a0f0a] text-[#e3c598] flex flex-col justify-between font-serif relative overflow-hidden selection:bg-[#d4af37] selection:text-[#1a0f0a]">
      
      {/* Immersive Geometric Saloon Background elements */}
      <div className="absolute inset-0 pointer-events-none select-none z-0">
        {/* Saloon Background Texture matching Design HTML */}
        <div className="absolute inset-0 opacity-20 geometric-bg-pattern" />

        {/* Sunset Window Glow */}
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-orange-600/30 blur-[120px] rounded-full" />
        <div className="absolute top-40 -left-20 w-80 h-80 bg-red-900/20 blur-[100px] rounded-full" />

        {/* Ambient floating dust particles */}
        {dustParticles.map(p => (
          <div
            key={p.id}
            className="absolute w-1.5 h-1.5 bg-[#e3c598]/20 rounded-full dust-particle"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}

        {/* Lantern Glow Effects from Design HTML */}
        <div className="absolute bottom-10 left-10 w-4 h-4 bg-orange-400 rounded-full shadow-[0_0_40px_20px_rgba(251,146,60,0.4)]"></div>
        <div className="absolute top-10 right-1/2 w-2 h-2 bg-yellow-200 rounded-full shadow-[0_0_30px_15px_rgba(254,240,138,0.3)]"></div>
      </div>

      {/* HEADER BAR: Coin Purse & Settings */}
      <header className="relative z-10 py-6 px-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        {/* Wallet & Stats indicators */}
        <div className="flex flex-wrap items-center gap-6">
          {/* Active Users Indicator */}
          <div className="bg-[#3d251e] border-4 border-black p-3 shadow-[4px_4px_0_0_#000] flex items-center select-none">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2 border border-black" />
            <span className="text-xs uppercase tracking-widest font-black text-[#e3c598]/80 font-sans">
              Online: <span className="text-[#d4af37] font-mono text-sm ml-1">{activeUsersCount}</span>
            </span>
          </div>

          {/* Wallet counter styled like Design HTML */}
          <div className="bg-[#3d251e] border-4 border-black p-3 shadow-[4px_4px_0_0_#000] flex items-center space-x-3 select-none relative group">
            <div className="w-8 h-8 bg-yellow-500 border-2 border-black rounded-full flex items-center justify-center shadow-[inset_-2px_-2px_0_0_#b58900]">
              <span className="text-black font-black text-xs font-sans">$</span>
            </div>
            <span className="text-2xl font-black tracking-tighter text-[#d4af37] drop-shadow-[2px_2px_0_#000] font-mono">
              {activeCoins.toLocaleString()}
            </span>
            {/* Bankruptcy rescue helper */}
            {activeCoins < 10 && (
              <button
                onClick={handleBankruptcyRefill}
                className="absolute -bottom-8 left-0 bg-red-700 hover:bg-red-600 text-white font-sans text-[10px] px-2 py-1 border-2 border-black shadow-[2px_2px_0_0_#000] cursor-pointer animate-bounce whitespace-nowrap z-30"
              >
                Claim Bailout ($500)
              </button>
            )}
          </div>

          {/* Wins Tracker Block like Design HTML */}
          <div className="bg-[#3d251e] border-4 border-black p-3 shadow-[4px_4px_0_0_#000] flex items-center select-none">
            <span className="text-xs uppercase tracking-widest font-black text-[#e3c598]/60 font-sans">Wins:</span>
            <span className="ml-2 text-xl font-bold font-mono text-[#d4af37]">
              {stats.gamesWonWanted + stats.gamesWonLetterjack}
            </span>
          </div>
        </div>

        {/* Quick Menu Controls */}
        <div className="flex items-center gap-3">
          {/* Sounds toggles */}
          <button
            onClick={toggleSoundEffects}
            className="w-12 h-12 bg-[#3d251e] border-4 border-black shadow-[4px_4px_0_0_#000] flex items-center justify-center hover:bg-[#533329] active:translate-y-0.5 active:shadow-[2px_2px_0_0_#000] cursor-pointer transition-all"
            title="Toggle Sound Effects"
          >
            {settings.soundEffects ? (
              <Volume2 className="w-5 h-5 text-[#d4af37]" />
            ) : (
              <VolumeX className="w-5 h-5 text-[#e3c598]/30" />
            )}
          </button>
          <button
            onClick={toggleAmbientMusic}
            className="h-12 px-4 bg-[#3d251e] border-4 border-black shadow-[4px_4px_0_0_#000] flex items-center justify-center hover:bg-[#533329] active:translate-y-0.5 active:shadow-[2px_2px_0_0_#000] cursor-pointer transition-all font-sans text-xs font-black tracking-wider text-[#d4af37] uppercase"
            title="Toggle Ambient Guitar"
          >
            🎸 {settings.ambientMusic ? <span className="text-emerald-400 ml-1">ON</span> : <span className="text-red-400 ml-1">OFF</span>}
          </button>

          {/* Handbook direct link */}
          <button
            onClick={() => { audioManager.playClick(); setShowHandbook(true); }}
            className="h-12 px-6 bg-[#b5a642] text-black border-4 border-black shadow-[4px_4px_0_0_#000] font-sans font-bold uppercase tracking-tighter hover:bg-[#c9ba4d] active:translate-y-0.5 active:shadow-[2px_2px_0_0_#000] cursor-pointer transition-all"
          >
            HANDBOOK
          </button>
        </div>
      </header>

      {/* CORE SCREENS ROUTING */}
      <main className="flex-1 relative z-10 flex items-center justify-center py-6 px-4">
        {activeScreen === 'menu' && (
          <div className="w-full max-w-5xl space-y-12">
            
            {/* CENTRAL BRANDING */}
            <div className="flex flex-col items-center mb-12 select-none">
              <div className="relative">
                <h1 className="text-6xl md:text-8xl lg:text-9xl font-black italic tracking-tighter text-[#d4af37] drop-shadow-[6px_6px_0_#000] uppercase text-center">
                  WORD CASINO
                </h1>
                <div className="absolute -top-6 -left-6 bg-red-700 text-white px-4 py-1 border-2 border-black rotate-[-12deg] font-sans font-bold text-xs md:text-sm tracking-widest shadow-[4px_4px_0_0_#000]">
                  EST. 1884
                </div>
              </div>
              <p className="text-[#d4af37]/60 tracking-[0.4em] uppercase text-xs mt-3 font-sans text-center">
                Fortune Favors the Literate
              </p>
            </div>

            {/* MULTIPLAYER / BOT SALOON LOBBY CONNECTOR */}
            <div className="max-w-2xl mx-auto w-full">
              <SaloonLobby />
            </div>

            {/* INTERACTIVE GAME CHOOSE SHELF */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Game 1: Wanted! */}
              <div 
                onClick={() => launchGame('wanted')}
                className="md:col-span-4 group relative bg-[#e3c598] border-4 border-black shadow-[8px_8px_0_0_#000] p-6 text-black flex flex-col justify-between items-center transition-all hover:-translate-y-1 hover:shadow-[12px_12px_0_0_#000] cursor-pointer overflow-hidden min-h-[380px]"
              >
                <div className="absolute top-0 left-0 w-full h-2 bg-black opacity-10"></div>
                
                <div className="text-center w-full">
                  <div className="flex justify-between items-center border-b-2 border-black/20 pb-2 mb-4">
                    <span className="text-2xl font-black uppercase tracking-tighter font-sans">WANTED!</span>
                    <span className="bg-red-700 text-white text-[9px] font-sans px-2 py-0.5 border border-black rounded font-black uppercase tracking-wider">
                      HANGMAN
                    </span>
                  </div>
                </div>

                {/* Hangman preview visualizer inside the card */}
                <div className="w-32 h-36 bg-black/5 border-2 border-black/20 flex items-center justify-center mb-4 relative rounded">
                  {/* Stick Figure Hanging Silhouette Simulation */}
                  <div className="w-1 bg-black h-10 absolute top-0"></div>
                  <div className="w-6 h-6 border-4 border-black rounded-full absolute top-10"></div>
                  <div className="w-1 h-12 bg-black absolute top-16"></div>
                  <div className="w-8 h-1 bg-black absolute top-20 rotate-12"></div>
                  <div className="w-8 h-1 bg-black absolute top-20 -rotate-12"></div>
                  <div className="w-1 h-8 bg-black absolute top-28 rotate-12 origin-top"></div>
                  <div className="w-1 h-8 bg-black absolute top-28 -rotate-12 origin-top"></div>
                </div>

                <div className="text-center mb-6 px-2">
                  <p className="font-bold text-xs font-sans uppercase mb-1 tracking-wider text-black/80">Scrabble Multipliers</p>
                  <p className="text-xs opacity-75 italic leading-relaxed font-sans">
                    "Guess the word before the gallows are completed. High value letters yield higher rewards!"
                  </p>
                </div>

                <div className="w-full bg-black text-[#e3c598] py-3 text-center font-bold font-sans tracking-widest hover:bg-zinc-800 transition-colors">
                  CHASE BOUNTY
                </div>
              </div>

              {/* Game 2: Letterjack */}
              <div 
                onClick={() => launchGame('letterjack')}
                className="md:col-span-4 group relative bg-[#264d3e] border-4 border-black shadow-[8px_8px_0_0_#000] p-6 text-white flex flex-col justify-between items-center transition-all hover:-translate-y-1 hover:shadow-[12px_12px_0_0_#000] cursor-pointer min-h-[380px]"
              >
                <div className="absolute inset-0 bg-white/5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, transparent 80%, rgba(0,0,0,0.3) 100%)' }}></div>
                
                <div className="text-center w-full z-10">
                  <div className="flex justify-between items-center border-b-2 border-[#d4af37]/30 pb-2 mb-4">
                    <span className="text-2xl font-black uppercase tracking-tighter text-[#d4af37] font-sans">LETTERJACK</span>
                    <span className="bg-[#d4af37] text-black text-[9px] font-sans px-2 py-0.5 border border-black rounded font-black uppercase tracking-wider">
                      BLACKJACK
                    </span>
                  </div>
                </div>

                {/* mini cards fanning out */}
                <div className="flex justify-center items-center space-x-2 my-6 h-36">
                  <div className="w-12 h-16 bg-[#e3c598] border-2 border-black rounded flex flex-col justify-between p-1.5 -rotate-12 shadow-[2px_2px_0_0_#000]">
                    <span className="text-[#1a0f0a] font-black text-sm">W</span>
                    <span className="text-right text-[8px] font-bold text-[#1a0f0a]">4</span>
                  </div>
                  <div className="w-12 h-16 bg-[#e3c598] border-2 border-black rounded flex flex-col justify-between p-1.5 rotate-3 shadow-[2px_2px_0_0_#000] transform -translate-y-2">
                    <span className="text-red-700 font-black text-sm">I</span>
                    <span className="text-right text-[8px] font-bold text-red-700">1</span>
                  </div>
                  <div className="w-12 h-16 bg-[#e3c598] border-2 border-black rounded flex flex-col justify-between p-1.5 rotate-12 shadow-[2px_2px_0_0_#000]">
                    <span className="text-[#1a0f0a] font-black text-sm">N</span>
                    <span className="text-right text-[8px] font-bold text-[#1a0f0a]">1</span>
                  </div>
                </div>

                <div className="text-center mb-6 px-2 z-10">
                  <p className="font-bold text-xs uppercase mb-1 tracking-wider text-[#d4af37] font-sans">Hit 21 Points</p>
                  <p className="text-xs opacity-75 italic leading-relaxed font-sans text-stone-200">
                    "Draw tiles, compile words to consume points, and outwit the dealer's hand without busting!"
                  </p>
                </div>

                <div className="w-full bg-[#d4af37] text-black py-3 text-center font-bold font-sans tracking-widest hover:bg-[#ebd068] transition-colors z-10">
                  PLAY HAND
                </div>
              </div>

              {/* Game 3: Locked Word Poker */}
              <div className="md:col-span-4 bg-[#3d251e] border-4 border-black shadow-[8px_8px_0_0_#000] p-6 text-[#e3c598]/30 flex flex-col justify-between items-center cursor-not-allowed overflow-hidden min-h-[380px] relative select-none">
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <span className="rotate-[-25deg] border-4 border-red-700/40 bg-[#1a0f0a]/90 text-red-500/80 px-4 py-2 font-black text-lg uppercase tracking-widest shadow-[4px_4px_0_0_rgba(0,0,0,0.5)] font-sans">
                    Coming Soon
                  </span>
                </div>

                <div className="text-center w-full opacity-40">
                  <div className="flex justify-between items-center border-b-2 border-black/20 pb-2 mb-4">
                    <span className="text-2xl font-black uppercase tracking-tighter font-sans">WORD POKER</span>
                    <Lock className="w-4 h-4 text-red-700/60" />
                  </div>
                </div>

                <div className="w-32 h-36 bg-black/20 border-2 border-black/10 rounded flex items-center justify-center my-6 opacity-30">
                  <span className="text-4xl">🃏</span>
                </div>

                <div className="text-center mb-6 px-2 opacity-40">
                  <p className="font-bold text-xs uppercase mb-1 tracking-wider font-sans">High Stakes</p>
                  <p className="text-xs italic leading-relaxed font-sans text-stone-400">
                    "Future Expansion: Form standard poker hands (flushes, straights) using custom card tiles."
                  </p>
                </div>

                <div className="w-full bg-black/20 py-3 text-center font-bold font-sans tracking-widest text-stone-600">
                  LOCKED
                </div>
              </div>
            </div>

            {/* QUICK BOOK MODALS HUB */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-6">
              <button
                onClick={() => { audioManager.playClick(); setShowHandbook(true); }}
                className="px-6 py-3 bg-[#3d251e] hover:bg-[#533329] text-[#e3c598] border-4 border-black shadow-[4px_4px_0_0_#000] font-sans font-bold uppercase tracking-wider text-sm flex items-center gap-2 cursor-pointer transition-all active:translate-y-0.5 active:shadow-[2px_2px_0_0_#000]"
              >
                <BookOpen className="w-4 h-4 text-[#d4af37]" /> Saloon Handbook & Tiles
              </button>
              
              <button
                onClick={() => { audioManager.playClick(); setShowStats(true); }}
                className="px-6 py-3 bg-[#3d251e] hover:bg-[#533329] text-[#e3c598] border-4 border-black shadow-[4px_4px_0_0_#000] font-sans font-bold uppercase tracking-wider text-sm flex items-center gap-2 cursor-pointer transition-all active:translate-y-0.5 active:shadow-[2px_2px_0_0_#000]"
              >
                <Trophy className="w-4 h-4 text-[#d4af37]" /> View Saloon Ledger
              </button>
            </div>

          </div>
        )}

        {activeScreen === 'wanted' && (
          <WantedGame
            stats={wrappedStats}
            settingsDifficulty={settings.botDifficulty}
            onUpdateStats={handleUpdateStats}
            onBackToMenu={() => {
              audioManager.playClick();
              if (party) {
                if (isHost) {
                  setPartyGameState('none', 0, null);
                } else {
                  setActiveScreen('menu');
                }
              } else {
                setActiveScreen('menu');
              }
            }}
          />
        )}

        {activeScreen === 'letterjack' && (
          <LetterjackGame
            stats={wrappedStats}
            onUpdateStats={handleUpdateStats}
            onBackToMenu={() => {
              audioManager.playClick();
              if (party) {
                if (isHost) {
                  setPartyGameState('none', 0, null);
                } else {
                  setActiveScreen('menu');
                }
              } else {
                setActiveScreen('menu');
              }
            }}
          />
        )}
      </main>

      {/* FOOTER COZY BAR */}
      <footer className="relative z-10 bg-[#1a0f0a] border-t-4 border-black py-4 px-8 text-center select-none font-mono text-[11px] text-[#e3c598]/60 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
          <span>&copy; 1883 Word Casino &bull; Certified Scrabble Word Checker</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5 uppercase font-sans font-bold tracking-widest text-[10px] text-[#d4af37]">
            <ShieldAlert className="w-3.5 h-3.5 text-yellow-600" /> Local Storage Persistent Save
          </span>
          <div className="px-3 py-1 bg-black text-[#d4af37] text-[10px] font-sans font-black tracking-[0.3em] uppercase border border-black shadow-[2px_2px_0_0_#000]">
            v1.0.4-BETA
          </div>
        </div>
      </footer>

      {/* MODALS RENDER OVERLAYS */}
      {showStats && (
        <StatsView
          stats={stats}
          onReset={handleResetStats}
          onClose={() => setShowStats(false)}
        />
      )}

      {showHandbook && (
        <CollectionDetails
          onClose={() => setShowHandbook(false)}
        />
      )}

    </div>
  );
}
