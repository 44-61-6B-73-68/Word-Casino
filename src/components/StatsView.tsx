import React from 'react';
import { GameStats } from '../types';
import { Award, TrendingUp, Trophy, RotateCcw, Calendar, CheckSquare, Zap, Coins } from 'lucide-react';
import { audioManager } from '../utils/audio';

interface StatsViewProps {
  stats: GameStats;
  onReset: () => void;
  onClose: () => void;
}

export default function StatsView({ stats, onReset, onClose }: StatsViewProps) {
  const totalPlayed = stats.gamesPlayedWanted + stats.gamesPlayedLetterjack;
  const totalWon = stats.gamesWonWanted + stats.gamesWonLetterjack;
  const winRate = totalPlayed > 0 ? Math.round((totalWon / totalPlayed) * 100) : 0;

  const handleResetClick = () => {
    audioManager.playClick();
    if (confirm("Are you sure you want to clean your ledger? This will reset all your coins and custom casino statistics!")) {
      onReset();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div 
        className="w-full max-w-2xl bg-[#3d251e] text-[#e3c598] border-4 border-black shadow-[8px_8px_0_0_#000]"
        id="stats-modal"
      >
        {/* Wood Carved Header */}
        <div className="bg-[#1a0f0a] px-6 py-4 border-b-4 border-black flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-[#d4af37] filter drop-shadow" />
            <h2 className="font-sans font-black text-2xl tracking-tight text-[#d4af37] select-none">
              THE SALOON LEDGER
            </h2>
          </div>
          <button 
            onClick={() => { audioManager.playClick(); onClose(); }}
            className="w-8 h-8 flex items-center justify-center bg-[#b5a642] hover:bg-[#c9ba4d] text-black border-2 border-black font-bold cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#1a0f0a] p-3 border-2 border-black text-center shadow-[3px_3px_0_0_#000]">
              <span className="text-xs text-[#e3c598]/60 block font-bold uppercase font-sans">Total Earnings</span>
              <span className="font-mono text-2xl text-[#d4af37] block mt-1">
                ${stats.totalEarnings.toLocaleString()}
              </span>
            </div>
            <div className="bg-[#1a0f0a] p-3 border-2 border-black text-center shadow-[3px_3px_0_0_#000]">
              <span className="text-xs text-[#e3c598]/60 block font-bold uppercase font-sans">Win Ratio</span>
              <span className="font-mono text-2xl text-emerald-400 block mt-1">
                {winRate}%
              </span>
            </div>
            <div className="bg-[#1a0f0a] p-3 border-2 border-black text-center shadow-[3px_3px_0_0_#000]">
              <span className="text-xs text-[#e3c598]/60 block font-bold uppercase font-sans">Games Played</span>
              <span className="font-mono text-2xl text-amber-100 block mt-1">
                {totalPlayed}
              </span>
            </div>
            <div className="bg-[#1a0f0a] p-3 border-2 border-black text-center shadow-[3px_3px_0_0_#000]">
              <span className="text-xs text-[#e3c598]/60 block font-bold uppercase font-sans">Current Cash</span>
              <span className="font-mono text-2xl text-amber-400 block mt-1 flex items-center justify-center gap-1">
                <Coins className="w-5 h-5 text-amber-500 inline" /> {stats.coins}
              </span>
            </div>
          </div>

          {/* Detailed Game Division Tabs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Wanted! Stats */}
            <div className="bg-[#1a0f0a]/40 p-4 border-2 border-black shadow-[3px_3px_0_0_#000]">
              <h3 className="font-sans font-black text-lg text-[#d4af37] border-b-2 border-black pb-2 mb-3 flex items-center gap-2">
                <span className="text-[#ef4444]">☠</span> WANTED! (Hangman)
              </h3>
              <div className="space-y-3 font-mono text-sm">
                <div className="flex justify-between">
                  <span className="text-[#e3c598]/60">Gallows Rounds:</span>
                  <span>{stats.gamesPlayedWanted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#e3c598]/60">Bounties Claimed:</span>
                  <span className="text-emerald-400">{stats.gamesWonWanted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#e3c598]/60">Highest Bounty:</span>
                  <span className="text-[#d4af37]">${stats.highestScoreWanted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#e3c598]/60">Escape Ratio:</span>
                  <span>
                    {stats.gamesPlayedWanted > 0 
                      ? Math.round((stats.gamesWonWanted / stats.gamesPlayedWanted) * 100) 
                      : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Letterjack Stats */}
            <div className="bg-[#1a0f0a]/40 p-4 border-2 border-black shadow-[3px_3px_0_0_#000]">
              <h3 className="font-sans font-black text-lg text-[#d4af37] border-b-2 border-black pb-2 mb-3 flex items-center gap-2">
                <span className="text-emerald-500">♣</span> LETTERJACK (Blackjack)
              </h3>
              <div className="space-y-3 font-mono text-sm">
                <div className="flex justify-between">
                  <span className="text-[#e3c598]/60">Dealer Rounds:</span>
                  <span>{stats.gamesPlayedLetterjack}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#e3c598]/60">Dealer Wins:</span>
                  <span className="text-emerald-400">{stats.gamesWonLetterjack}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#e3c598]/60">Highest Word Combo:</span>
                  <span className="text-[#d4af37]">${stats.highestScoreLetterjack}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#e3c598]/60">Showdown Ratio:</span>
                  <span>
                    {stats.gamesPlayedLetterjack > 0 
                      ? Math.round((stats.gamesWonLetterjack / stats.gamesPlayedLetterjack) * 100) 
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Word Log List */}
          <div className="bg-[#1a0f0a] p-4 border-2 border-black">
            <h3 className="font-sans font-bold text-[#d4af37] border-b-2 border-black pb-2 mb-3 text-sm tracking-wide uppercase flex items-center justify-between">
              <span>📜 Word Log Ledger</span>
              <span className="text-xs text-[#e3c598]/60 font-mono font-normal">Recent first</span>
            </h3>
            <div className="max-h-40 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
              {stats.wordLog.length === 0 ? (
                <div className="text-center py-6 text-[#e3c598]/40 italic select-none">
                  No registered words in the ledger yet. Go lay down some cards!
                </div>
              ) : (
                stats.wordLog.slice().reverse().map((entry, index) => (
                  <div 
                    key={index} 
                    className="flex justify-between items-center bg-[#3d251e] p-2 border border-black"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${entry.game === 'wanted' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                      <span className="font-bold text-[#e3c598] text-sm tracking-widest">{entry.word}</span>
                      <span className="text-[10px] text-[#e3c598]/60">
                        ({entry.game === 'wanted' ? 'Wanted!' : 'Letterjack'})
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[#d4af37] font-bold">+{entry.score} pts</span>
                      <span className="text-[10px] text-[#e3c598]/60">{entry.timestamp}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="bg-[#1a0f0a] px-6 py-4 border-t-4 border-black flex flex-col sm:flex-row justify-between items-center gap-4">
          <button
            onClick={handleResetClick}
            className="px-4 py-2 bg-red-700/20 hover:bg-red-700/40 text-red-200 border-2 border-black font-mono text-xs cursor-pointer flex items-center gap-2 transition-all active:translate-y-0.5"
          >
            <RotateCcw className="w-4 h-4" /> Reset All Statistics
          </button>
          
          <button
            onClick={() => { audioManager.playClick(); onClose(); }}
            className="px-5 py-2.5 bg-[#b5a642] text-black border-4 border-black shadow-[4px_4px_0_0_#000] font-sans font-bold uppercase tracking-tighter hover:bg-[#c9ba4d] active:translate-y-0.5 active:shadow-[2px_2px_0_0_#000] cursor-pointer transition-all"
          >
            Return to Tavern
          </button>
        </div>
      </div>
    </div>
  );
}
