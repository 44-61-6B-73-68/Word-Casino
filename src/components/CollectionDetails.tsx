import React, { useState } from 'react';
import { SCRABBLE_VALUES, SCRABBLE_FREQUENCIES } from '../types';
import { CATEGORY_WORDS } from '../utils/dictionary';
import { BookOpen, Search, HelpCircle, Coins, Sparkles } from 'lucide-react';
import { audioManager } from '../utils/audio';

interface CollectionDetailsProps {
  onClose: () => void;
}

export default function CollectionDetails({ onClose }: CollectionDetailsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const letters = Object.keys(SCRABBLE_VALUES).sort();

  // Search inside our built-in categorised dictionary
  const getFilteredWords = () => {
    let allWords: { word: string; category: string }[] = [];
    Object.entries(CATEGORY_WORDS).forEach(([cat, list]) => {
      list.forEach(w => {
        allWords.push({ word: w, category: cat });
      });
    });

    return allWords.filter(item => {
      const matchesSearch = item.word.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "ALL" || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  };

  const filteredWords = getFilteredWords().slice(0, 80); // limit to keep UI super fast and snappy

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div 
        className="w-full max-w-3xl bg-[#3d251e] text-[#e3c598] border-4 border-black shadow-[8px_8px_0_0_#000]"
        id="collection-modal"
      >
        {/* Header */}
        <div className="bg-[#1a0f0a] px-6 py-4 border-b-4 border-black flex justify-between items-center">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-[#d4af37] filter drop-shadow" />
            <h2 className="font-sans font-black text-2xl tracking-tight text-[#d4af37] select-none">
              CASINO HANDBOOK & TILES
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
        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 max-h-[75vh] overflow-y-auto">
          {/* Left Column: Tile Board & Values (7 Cols) */}
          <div className="md:col-span-7 space-y-5">
            <div className="bg-[#1a0f0a] p-4 border-2 border-black shadow-[3px_3px_0_0_#000]">
              <h3 className="font-sans font-bold text-sm text-[#d4af37] border-b border-black pb-2 mb-4 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> LETTER VALUATION & DISTRIBUTION
              </h3>
              
              {/* Letters grid */}
              <div className="grid grid-cols-6 sm:grid-cols-7 gap-2">
                {letters.map(letter => {
                  const points = SCRABBLE_VALUES[letter];
                  const count = SCRABBLE_FREQUENCIES[letter];
                  return (
                    <div 
                      key={letter}
                      className="bg-[#e3c598] text-[#1a0f0a] p-1.5 border-2 border-black flex flex-col items-center justify-between shadow-[2px_2px_0_0_#000] relative"
                    >
                      <span className="font-sans font-black text-lg leading-none">{letter}</span>
                      <span className="font-mono text-[9px] font-bold text-red-800 self-end leading-none mt-1">
                        {points}
                      </span>
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-700 text-white text-[8px] font-mono flex items-center justify-center border border-black shadow-[1px_1px_0_0_#000]">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-[#e3c598]/60 font-mono mt-4 leading-tight">
                * Indicators show card frequency in the shuffled deck (Total deck: 98 letters). Use these weights to optimize your hit and stand ratios in Letterjack!
              </p>
            </div>

            {/* Instruction cards */}
            <div className="bg-[#1a0f0a] p-4 border-2 border-black shadow-[3px_3px_0_0_#000] space-y-3 font-sans text-xs">
              <h3 className="font-sans font-bold text-sm text-[#d4af37] border-b border-black pb-2 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4" /> CASINO WORD COMBOS
              </h3>
              <div className="space-y-2 text-[#e3c598]/80">
                <p>
                  <strong className="text-white">WANTED! (Hangman) Multipliers:</strong> Guess letters carefully! Every correct letter adds its Scrabble value to your round score. Keep your cowboy alive to claim huge multipliers:
                </p>
                <div className="pl-3 border-l-2 border-black space-y-1 font-mono text-[11px]">
                  <div>6 lives remaining: <span className="text-emerald-400 font-bold">3.0x payout</span></div>
                  <div>4-5 lives remaining: <span className="text-amber-400 font-bold">2.0x payout</span></div>
                  <div>1-3 lives remaining: <span className="text-amber-500 font-bold">1.2x payout</span></div>
                </div>
                <p>
                  <strong className="text-white">LETTERJACK Words:</strong> Build word spells of at least <strong className="text-[#d4af37]">3 letters</strong> from your hand to permanently harvest cards and keep yourself from busting over 21!
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Searchable Word list (5 Cols) */}
          <div className="md:col-span-5 bg-[#1a0f0a] p-4 border-2 border-black flex flex-col h-[52vh] min-h-[350px]">
            <h3 className="font-sans font-bold text-sm text-[#d4af37] border-b border-black pb-2 mb-3 flex items-center gap-1.5 select-none">
              <Search className="w-4 h-4" /> BOUNTY DICTIONARY
            </h3>

            {/* Filter inputs */}
            <div className="space-y-2 mb-3">
              <input 
                type="text"
                placeholder="Search words..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2 bg-[#3d251e] text-[#e3c598] border-2 border-black font-mono text-xs focus:outline-none focus:border-[#d4af37]"
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full p-2 bg-[#3d251e] text-[#e3c598] border-2 border-black font-sans text-xs focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                {Object.keys(CATEGORY_WORDS).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Word list view */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-1 font-mono text-xs">
              {filteredWords.length === 0 ? (
                <div className="text-center py-10 text-[#e3c598]/40 italic">
                  No matches in the saloon registry.
                </div>
              ) : (
                filteredWords.map((item, idx) => {
                  // Compute word value
                  const score = item.word.split('').reduce((acc, char) => acc + (SCRABBLE_VALUES[char] || 0), 0);
                  return (
                    <div 
                      key={idx}
                      className="flex justify-between items-center p-1.5 bg-[#3d251e]/60 hover:bg-[#3d251e] border border-black transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-amber-200 uppercase tracking-widest">{item.word}</span>
                        <span className="text-[9px] text-[#e3c598]/60 font-sans">{item.category}</span>
                      </div>
                      <span className="bg-black text-[#d4af37] px-1.5 py-0.5 border border-black shadow-[1px_1px_0_0_#000] text-[10px] font-bold">
                        {score} pts
                      </span>
                    </div>
                  );
                })
              )}
              {filteredWords.length >= 80 && (
                <p className="text-[10px] text-center text-[#e3c598]/40 pt-2 font-sans">
                  Showing first 80 matching entries...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#1a0f0a] px-6 py-4 border-t-4 border-black flex justify-end">
          <button
            onClick={() => { audioManager.playClick(); onClose(); }}
            className="px-5 py-2.5 bg-[#b5a642] text-black border-4 border-black shadow-[4px_4px_0_0_#000] font-sans font-bold uppercase tracking-tighter hover:bg-[#c9ba4d] active:translate-y-0.5 active:shadow-[2px_2px_0_0_#000] cursor-pointer transition-all"
          >
            Done browsing
          </button>
        </div>
      </div>
    </div>
  );
}
