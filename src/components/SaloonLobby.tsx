import React, { useState, useEffect } from 'react';
import { useParty } from './PartyContext';
import { Users, Bot, User, LogOut, RefreshCw, Trophy, Sparkles, CheckCircle, Plus, Trash2 } from 'lucide-react';
import { audioManager } from '../utils/audio';

export default function SaloonLobby() {
  const {
    party,
    playerId,
    createParty,
    joinParty,
    joinRandomParty,
    addBot,
    removePlayer,
    resetParty,
    leaveParty
  } = useParty();

  const [nickname, setNickname] = useState<string>(() => {
    return localStorage.getItem('cowboy_nickname') || 'Cowboy';
  });
  const [joinCode, setJoinCode] = useState<string>('');
  const [isBotPartyLoading, setIsBotPartyLoading] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Save nickname
  const handleSaveNickname = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    localStorage.setItem('cowboy_nickname', nickname.trim());
    audioManager.playClick();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // Create standard online party
  const handleCreateOnlineParty = () => {
    audioManager.playClick();
    const activeName = localStorage.getItem('cowboy_nickname') || nickname || 'Cowboy';
    createParty(activeName, 'online');
  };

  // Create instant bot-only party
  const handleCreateBotParty = async () => {
    audioManager.playClick();
    setIsBotPartyLoading(true);
    const activeName = localStorage.getItem('cowboy_nickname') || nickname || 'Cowboy';
    
    // Create local party
    createParty(activeName, 'offline');
    
    // Auto add 2 bots instantly for the user's convenience
    setTimeout(() => {
      addBot('Tex (Easy)', 'easy');
      addBot('Belle (Hard)', 'hard');
      setIsBotPartyLoading(false);
    }, 600);
  };

  // Join online party
  const handleJoinPartySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    audioManager.playClick();
    const activeName = localStorage.getItem('cowboy_nickname') || nickname || 'Cowboy';
    joinParty(joinCode.trim().toUpperCase(), activeName);
  };

  // Quick check for host
  const isHost = party ? (party.mode === 'offline' || (party.players.length > 0 && party.players[0].id === playerId)) : false;

  // Render when NOT in any party
  if (!party) {
    return (
      <div className="bg-[#2a170d] border-4 border-black p-6 shadow-[8px_8px_0_0_#000] text-[#e3c598] max-w-2xl mx-auto space-y-6 select-none">
        <h2 className="font-serif font-black text-2xl text-[#d4af37] border-b-2 border-black pb-2 flex items-center gap-2">
          <Users className="w-7 h-7" /> MULTIPLAYER SALOON PARTY
        </h2>

        {/* NICKNAME BUILDER */}
        <form onSubmit={handleSaveNickname} className="bg-black/30 p-4 border-2 border-black space-y-3">
          <label className="block text-xs uppercase font-sans tracking-widest font-black text-[#e3c598]/70">
            🤠 Choose Cowboy Moniker
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              maxLength={15}
              placeholder="e.g., Doc Holliday"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="flex-1 bg-[#1a0f0a] border-2 border-black px-3 py-2 font-mono text-sm text-[#d4af37] placeholder:text-neutral-700 outline-none focus:border-[#d4af37]"
            />
            <button
              type="submit"
              className="px-4 bg-[#b5a642] hover:bg-[#c9ba4d] text-black border-2 border-black font-sans font-bold text-xs uppercase cursor-pointer flex items-center gap-1 transition-colors"
            >
              {saveSuccess ? <CheckCircle className="w-4 h-4 text-emerald-950" /> : 'Save'}
            </button>
          </div>
          {saveSuccess && (
            <p className="text-[11px] text-emerald-400 font-sans italic">Name updated, partner! Ready to enter the saloon.</p>
          )}
        </form>

        {/* RANDOM MATCHMAKING */}
        <div className="bg-[#1f100a] border-2 border-black p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
             <div className="flex items-center gap-2 text-emerald-500">
               <Sparkles className="w-5 h-5" />
               <h3 className="font-sans font-black text-sm uppercase">Quick Play (Random Lobby)</h3>
             </div>
             <p className="text-xs text-[#e3c598]/70 leading-relaxed font-sans">
               Jump straight into a table with other random cowboys looking for a game! Vote on which game to play.
             </p>
          </div>
          <button
             onClick={() => {
               audioManager.playClick();
               const activeName = localStorage.getItem('cowboy_nickname') || nickname || 'Cowboy';
               joinRandomParty(activeName);
             }}
             className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white border-2 border-black font-sans font-black text-xs uppercase cursor-pointer shadow-[2px_2px_0_0_#000] active:translate-y-0.5 active:shadow-[1px_1px_0_0_#000] transition-all"
          >
             🎲 Find Random Match
          </button>
        </div>

        {/* LOBBY MODES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* OFFLINE BOT LOBBY */}
          <div className="bg-[#3a2012] border-2 border-black p-4 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-yellow-500">
                <Bot className="w-5 h-5" />
                <h3 className="font-sans font-black text-sm uppercase">Saloon Bots Arena</h3>
              </div>
              <p className="text-xs text-[#e3c598]/70 leading-relaxed font-sans">
                Instantly populate your private table with automated cowboys. Excellent for testing strategy and getting quick games offline!
              </p>
            </div>
            <button
              onClick={handleCreateBotParty}
              disabled={isBotPartyLoading}
              className="w-full py-2.5 bg-[#b5a642] hover:bg-[#c9ba4d] disabled:opacity-50 text-black border-2 border-black font-sans font-black text-xs uppercase cursor-pointer shadow-[2px_2px_0_0_#000] active:translate-y-0.5 active:shadow-[1px_1px_0_0_#000] transition-all"
            >
              {isBotPartyLoading ? 'Entering Table...' : '🤖 Play With Bots'}
            </button>
          </div>

          {/* ONLINE LOBBY CREATION / JOIN */}
          <div className="bg-[#1f100a] border-2 border-black p-4 space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[#d4af37]">
                <Users className="w-5 h-5" />
                <h3 className="font-sans font-black text-sm uppercase">Online Table (Live)</h3>
              </div>
              <p className="text-xs text-[#e3c598]/60 leading-relaxed font-sans">
                Create a table room and share your code with other players to play together in real-time. Or paste a code to join.
              </p>
            </div>

            <div className="space-y-2.5">
              {/* Create online room button */}
              <button
                onClick={handleCreateOnlineParty}
                className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 text-black border-2 border-black font-sans font-bold text-xs uppercase cursor-pointer"
              >
                📢 Create Online Table
              </button>

              {/* Join form */}
              <form onSubmit={handleJoinPartySubmit} className="flex gap-1.5 pt-1 border-t border-black/30">
                <input
                  type="text"
                  maxLength={4}
                  placeholder="CODE"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-20 bg-black/40 border-2 border-black px-2 py-1.5 font-mono text-center text-xs text-[#d4af37] outline-none"
                />
                <button
                  type="submit"
                  disabled={!joinCode.trim()}
                  className="flex-1 py-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 text-white border-2 border-black font-sans font-bold text-xs uppercase cursor-pointer"
                >
                  Join Room
                </button>
              </form>
            </div>

          </div>

        </div>

        <p className="text-[10px] text-center text-[#e3c598]/40 leading-snug">
          💡 Entering any Saloon Party overrides single-player coins to a fresh $1,000 party wallet. Leaving the party recovers your single-player coins ledger.
        </p>
      </div>
    );
  }

  // Render when IN a party
  const hostPlayer = party.players[0];

  const handleVoteGame = (game: 'wanted' | 'letterjack') => {
    audioManager.playClick();
    const currentState = party.sharedState || {};
    const votes = currentState.votes || {};
    const newVotes = { ...votes, [playerId!]: game };
    
    // Check if everyone is ready to start (if all players voted)
    const allPlayersVoted = party.players.filter(p => !p.isBot).every(p => newVotes[p.id]);
    
    if (allPlayersVoted && party.players.length > 1) {
      // Find winner
      const wantedVotes = Object.values(newVotes).filter(v => v === 'wanted').length;
      const letterjackVotes = Object.values(newVotes).filter(v => v === 'letterjack').length;
      const winner = wantedVotes > letterjackVotes ? 'wanted' : 'letterjack';
      
      // We need to use party context to set active screen! But we are in a child component
      // Actually, since we're setting sharedState, we can just trigger it!
      if (isHost || party.isRandom) {
         setPartyGameState(winner, 0, null);
      }
    } else {
      setPartyGameState('none', 0, { ...currentState, votes: newVotes });
    }
  };

  return (
    <div className="bg-[#2a170d] border-4 border-black p-6 shadow-[8px_8px_0_0_#000] text-[#e3c598] max-w-2xl mx-auto space-y-6 select-none">
      
      {/* Header Bar */}
      <div className="border-b-2 border-black pb-3 flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {party.isRandom ? (
            <Sparkles className="w-6 h-6 text-emerald-500" />
          ) : (
            <Users className="w-6 h-6 text-[#d4af37]" />
          )}
          <div>
            <h3 className="font-serif font-black uppercase text-lg tracking-wider">
              {party.isRandom ? 'Random Match Lobby' : (party.mode === 'online' ? 'Online Saloon Party' : 'Bot Saloon Arena')}
            </h3>
            <span className="text-[10px] text-yellow-500/80 font-mono font-bold tracking-widest block uppercase">
              Host: {hostPlayer ? hostPlayer.name : 'Unknown'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-black border-2 border-black px-3 py-1 font-mono font-black text-[#d4af37] text-sm shadow-[2px_2px_0_0_#000]">
            ROOM CODE: {party.code}
          </div>
          {party.isRandom && (
            <button
              onClick={() => {
                audioManager.playClick();
                leaveParty();
                setTimeout(() => {
                   const activeName = localStorage.getItem('cowboy_nickname') || 'Cowboy';
                   joinRandomParty(activeName);
                }, 100);
              }}
              className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white border-2 border-black font-sans font-black text-xs uppercase cursor-pointer flex items-center gap-1"
              title="Find New Random Lobby"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Next Lobby
            </button>
          )}
          <button
            onClick={() => { audioManager.playClick(); leaveParty(); }}
            className="px-3 py-1 bg-red-700 hover:bg-red-600 text-white border-2 border-black font-sans font-black text-xs uppercase cursor-pointer flex items-center gap-1"
            title="Leave Saloon"
          >
            <LogOut className="w-3.5 h-3.5" /> Leave
          </button>
        </div>
      </div>

      {/* Players list & Lobby Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Players List (7 cols) */}
        <div className="md:col-span-7 space-y-3">
          <h4 className="text-xs font-sans font-black uppercase text-[#e3c598]/60 tracking-wider">
            🛋️ Players around Table ({party.players.length}/6)
          </h4>

          <div className="space-y-2">
            {party.players.map((p) => {
              const isPlayerHost = p.id === party.hostId;
              const isCurrentMe = p.id === playerId;

              return (
                <div 
                  key={p.id}
                  className={`p-3 border-2 flex justify-between items-center ${
                    isCurrentMe 
                      ? 'bg-[#3e251c] border-[#d4af37] shadow-[2px_2px_0_0_#000]' 
                      : 'bg-black/30 border-black'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {p.isBot ? (
                      <Bot className="w-4 h-4 text-[#d4af37]" />
                    ) : (
                      <User className="w-4 h-4 text-[#e3c598]/60" />
                    )}
                    <span className="font-mono text-xs font-black truncate">
                      {p.name} {isCurrentMe && <span className="text-[#d4af37] font-bold text-[10px] ml-1">(You)</span>}
                    </span>
                    {isPlayerHost && (
                      <span className="bg-[#d4af37] text-black text-[9px] px-1 font-black rounded uppercase scale-95 tracking-tighter">
                        HOST
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs text-[#d4af37] font-black">
                    <span>${p.coins.toLocaleString()}</span>
                    {isHost && !isCurrentMe && (
                      <button
                        onClick={() => { audioManager.playClick(); removePlayer(p.id); }}
                        className="p-1 bg-red-950/60 hover:bg-red-900 border border-black text-red-400 font-sans font-bold text-[10px] cursor-pointer ml-1"
                        title="Remove/Kick Cowboy"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* RESET / SEED PARTY COINS */}
          {isHost && (
            <div className="pt-2">
              <button
                onClick={() => { audioManager.playClick(); resetParty(); }}
                className="w-full py-2 bg-[#3d251e] hover:bg-black text-[#d4af37] border-2 border-black font-sans font-bold text-xs uppercase cursor-pointer flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4 animate-spin-slow" /> Reset All Wallets to $1,000
              </button>
            </div>
          )}
        </div>

        {/* Host controls / Bot injection panel (5 cols) */}
        <div className="md:col-span-5 bg-black/20 p-4 border-2 border-black space-y-4">
          <h4 className="text-xs font-sans font-black uppercase text-[#e3c598]/70 tracking-widest flex items-center gap-1 border-b border-black pb-1">
            {party.isRandom ? '🎲 GAME VOTING' : '⚙️ PARTY MANAGMENT'}
          </h4>

          {party.isRandom ? (
            <div className="space-y-3 text-xs">
              <p className="text-[#e3c598]/60 leading-relaxed font-sans text-[11px]">
                Vote for the game you want to play. When everyone votes, the most popular game starts automatically!
              </p>
              
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => handleVoteGame('wanted')}
                  className={`py-2 border-2 text-[10px] font-sans font-bold uppercase cursor-pointer flex justify-between items-center px-3 ${
                    party.sharedState?.votes?.[playerId!] === 'wanted' 
                      ? 'bg-red-900 border-red-500 text-white' 
                      : 'bg-black border-black text-red-400 hover:bg-zinc-900'
                  }`}
                >
                  <span>WANTED! (Hangman)</span>
                  <span className="font-mono bg-black/50 px-1.5 py-0.5 rounded">
                    {Object.values(party.sharedState?.votes || {}).filter(v => v === 'wanted').length} Votes
                  </span>
                </button>
                <button
                  onClick={() => handleVoteGame('letterjack')}
                  className={`py-2 border-2 text-[10px] font-sans font-bold uppercase cursor-pointer flex justify-between items-center px-3 ${
                    party.sharedState?.votes?.[playerId!] === 'letterjack' 
                      ? 'bg-emerald-900 border-emerald-500 text-white' 
                      : 'bg-black border-black text-emerald-400 hover:bg-zinc-900'
                  }`}
                >
                  <span>LETTERJACK (Blackjack)</span>
                  <span className="font-mono bg-black/50 px-1.5 py-0.5 rounded">
                    {Object.values(party.sharedState?.votes || {}).filter(v => v === 'letterjack').length} Votes
                  </span>
                </button>
              </div>

              <div className="text-center mt-2">
                <p className="text-[#d4af37] font-bold text-[10px]">
                  {Object.keys(party.sharedState?.votes || {}).length} / {party.players.filter(p => !p.isBot).length} Players Voted
                </p>
              </div>
            </div>
          ) : isHost ? (
            <div className="space-y-3 text-xs">
              <p className="text-[#e3c598]/60 leading-relaxed font-sans text-[11px]">
                You are the table host! You have full rights to populate the room with bots of different difficulties.
              </p>

              {party.players.length < 6 ? (
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-black text-stone-400">Add Cowboy Bot:</span>
                  <div className="grid grid-cols-1 gap-1.5">
                    <button
                      onClick={() => { audioManager.playClick(); addBot('Wild Bill (Easy)', 'easy'); }}
                      className="py-1.5 bg-black hover:bg-zinc-900 text-emerald-400 border border-black text-[10px] font-sans font-bold uppercase cursor-pointer text-left px-3 flex justify-between items-center"
                    >
                      <span>🟢 Wild Bill</span> <span className="opacity-60 text-[9px]">EASY</span>
                    </button>
                    <button
                      onClick={() => { audioManager.playClick(); addBot('Annie Oakley (Medium)', 'medium'); }}
                      className="py-1.5 bg-black hover:bg-zinc-900 text-amber-400 border border-black text-[10px] font-sans font-bold uppercase cursor-pointer text-left px-3 flex justify-between items-center"
                    >
                      <span>🟡 Annie Oakley</span> <span className="opacity-60 text-[9px]">MEDIUM</span>
                    </button>
                    <button
                      onClick={() => { audioManager.playClick(); addBot('Wyatt Earp (Hard)', 'hard'); }}
                      className="py-1.5 bg-black hover:bg-zinc-900 text-red-400 border border-black text-[10px] font-sans font-bold uppercase cursor-pointer text-left px-3 flex justify-between items-center"
                    >
                      <span>🔴 Wyatt Earp</span> <span className="opacity-60 text-[9px]">HARD</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-amber-500 font-bold font-sans text-[10px] text-center">Table is completely full (6 max).</p>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-[#e3c598]/50 space-y-2">
              <Sparkles className="w-6 h-6 text-yellow-600 mx-auto animate-pulse" />
              <p className="font-serif italic text-stone-400">"Only the host of this table can invite bots or configure balances."</p>
            </div>
          )}

          {/* LIVE CHIPS LEADERBOARD */}
          <div className="bg-[#1a0f0a] p-3 border border-black/80 space-y-2 rounded">
            <span className="text-[10px] uppercase tracking-wider font-bold text-yellow-600 block">🏆 Current Leader</span>
            {(() => {
              const leader = [...party.players].sort((a, b) => b.coins - a.coins)[0];
              if (!leader) return null;
              return (
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black truncate">{leader.name}</span>
                  <span className="text-xs font-mono font-bold text-[#d4af37]">${leader.coins.toLocaleString()}</span>
                </div>
              );
            })()}
          </div>

        </div>

      </div>

    </div>
  );
}
