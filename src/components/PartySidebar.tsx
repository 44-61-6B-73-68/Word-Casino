import React from 'react';
import { useParty } from './PartyContext';
import { Trophy, Users, Skull, CreditCard, Sparkles, AlertTriangle } from 'lucide-react';

function renderMiniGallows(mistakes: number) {
  return (
    <svg viewBox="0 0 100 100" className="w-14 h-14 bg-[#1a0f0a] border-2 border-black rounded shadow-inner shrink-0 self-center">
      {/* Wooden Structure */}
      <line x1="15" y1="90" x2="85" y2="90" stroke="#4a2711" strokeWidth="4" />
      <line x1="30" y1="90" x2="30" y2="15" stroke="#4a2711" strokeWidth="4" />
      <line x1="28" y1="17" x2="70" y2="17" stroke="#4a2711" strokeWidth="4" />
      <line x1="30" y1="35" x2="48" y2="17" stroke="#4a2711" strokeWidth="3" />
      <line x1="65" y1="17" x2="65" y2="28" stroke="#361a0a" strokeWidth="2.5" />

      {/* Mistakes progress */}
      {mistakes >= 1 && (
        <circle cx="65" cy="32" r="4" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="1.5,0.8" />
      )}
      {mistakes >= 2 && (
        <circle cx="65" cy="39" r="6" fill="#fbcfe8" stroke="#000" strokeWidth="1" />
      )}
      {mistakes >= 3 && (
        <line x1="65" y1="45" x2="65" y2="65" stroke="#ef4444" strokeWidth="2.2" />
      )}
      {mistakes >= 4 && (
        <line x1="65" y1="48" x2="54" y2="54" stroke="#ef4444" strokeWidth="1.5" />
      )}
      {mistakes >= 5 && (
        <line x1="65" y1="48" x2="76" y2="54" stroke="#ef4444" strokeWidth="1.5" />
      )}
      {mistakes >= 6 && (
        <g>
          <line x1="65" y1="65" x2="57" y2="80" stroke="#ef4444" strokeWidth="1.5" />
          <line x1="65" y1="65" x2="73" y2="80" stroke="#ef4444" strokeWidth="1.5" />
        </g>
      )}
    </svg>
  );
}

export default function PartySidebar() {
  const { party, playerId, sendChatMessage } = useParty();
  const [chatInput, setChatInput] = React.useState('');
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [party?.chatMessages]);

  if (!party) return null;

  // Sort players by coins descending to make a live leaderboard
  const sortedPlayers = [...party.players].sort((a, b) => b.coins - a.coins);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      sendChatMessage(chatInput.trim());
      setChatInput('');
    }
  };

  return (
    <div className="w-full lg:w-80 bg-[#2b1712] border-4 border-black p-4 shadow-[4px_4px_0_0_#000] text-[#e3c598] font-sans flex flex-col gap-4 z-10 max-h-screen">
      
      {/* Header with Room Code */}
      <div className="border-b-2 border-black/30 pb-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#d4af37]" />
          <span className="font-serif font-black uppercase tracking-wider text-sm">
            {party.mode === 'online' ? 'Online Saloon' : 'Bot Saloon'}
          </span>
        </div>
        <div className="bg-[#1a0f0a] border-2 border-black px-2 py-0.5 text-xs font-mono font-bold text-[#d4af37] shadow-[2px_2px_0_x_#000]">
          CODE: {party.code}
        </div>
      </div>

      {/* Leaderboard Section */}
      <div className="flex-1 flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
        <h4 className="text-[10px] uppercase tracking-widest font-black text-[#e3c598]/60 flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-yellow-600" /> SALOON LEADERBOARD
        </h4>

        <div className="space-y-2.5">
          {sortedPlayers.map((p, idx) => {
            const isMe = p.id === playerId;
            const rankEmoji = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;

            return (
              <div 
                key={p.id}
                className={`p-3 border-2 transition-all ${
                  isMe 
                    ? 'bg-[#3e251c] border-[#d4af37] shadow-[2px_2px_0_0_#d4af37]' 
                    : 'bg-[#20110e] border-black shadow-[2px_2px_0_0_#000]'
                }`}
              >
                {/* Name & Wallet */}
                <div className="flex justify-between items-start gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-black">{rankEmoji}</span>
                    <span className={`text-xs font-bold truncate ${isMe ? 'text-[#d4af37]' : ''}`}>
                      {p.name}
                    </span>
                    {p.isBot && (
                      <span className="bg-[#d4af37] text-black text-[9px] px-1 font-black rounded scale-90">
                        BOT
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-[#d4af37] font-mono shrink-0">
                    ${p.coins.toLocaleString()}
                  </span>
                </div>

                {/* Real-time Game State */}
                <div className="mt-2 pt-2 border-t border-[#3d251e] text-[11px] space-y-1">
                  {p.game === 'none' ? (
                    <span className="text-[#e3c598]/40 italic">Shuffling chips...</span>
                  ) : p.game === 'wanted' ? (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] uppercase font-bold text-red-400">
                        <span>WANTED (Hangman)</span>
                        <span className="flex items-center gap-0.5 font-mono">
                          💀 {p.state?.mistakes ?? 0}/6
                        </span>
                      </div>
                      
                      {/* For the current player, they can see their mask. For others, hide it and show mini gallows */}
                      {isMe ? (
                        p.state?.solvedMask && (
                          <div className="bg-black/40 px-2 py-1 font-mono tracking-widest text-center text-xs border border-black text-[#e3c598] rounded">
                            {p.state.solvedMask}
                          </div>
                        )
                      ) : (
                        <div className="flex items-center gap-3 bg-black/20 p-1.5 rounded border border-black/10">
                          {renderMiniGallows(p.state?.mistakes ?? 0)}
                          <div className="flex-1 text-[11px] font-sans leading-none">
                            <div className="font-bold text-[#e3c598] text-[9px] tracking-wider">GALLOWS STATE</div>
                            <div className="text-red-400 font-mono font-bold mt-1 text-[10px]">
                              {6 - (p.state?.mistakes ?? 0)} LIVES LEFT
                            </div>
                            <div className="text-[9px] text-[#e3c598]/50 italic mt-1 leading-tight">
                              {(p.state?.mistakes ?? 0) >= 6 ? "🤠 HUNG!" : "GUESSING..."}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Visual Mistakes skulls bar */}
                      <div className="flex gap-0.5">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div 
                            key={i} 
                            className={`h-1.5 flex-1 border border-black rounded-sm ${
                              i < (p.state?.mistakes ?? 0) ? 'bg-red-700' : 'bg-stone-800'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  ) : p.game === 'letterjack' ? (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] uppercase font-bold text-emerald-400">
                        <span>LETTERJACK</span>
                        <span className="font-mono font-black text-xs">
                          {p.state?.score ?? 0} PTS
                        </span>
                      </div>

                      {/* Hands showing the tiles and their letters */}
                      {p.state?.hand && p.state.hand.length > 0 && (
                        <div className="flex flex-wrap gap-1 py-1">
                          {p.state.hand.map((card: any, cardIdx: number) => (
                            <div 
                              key={cardIdx} 
                              className="bg-[#e3c598] text-black border border-black rounded px-1 text-[10px] font-black font-mono shadow-[1px_1px_0_0_#000]"
                              title={`Value: ${card.value}`}
                            >
                              {card.letter}
                              <sub className="text-[7px] font-bold opacity-60 ml-0.5">{card.value}</sub>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Stood or Busted indicator */}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {p.state?.busted ? (
                          <span className="bg-red-950/80 border border-red-800 text-red-400 text-[9px] px-1.5 py-0.2 rounded font-black uppercase tracking-wider animate-pulse">
                            BUSTED 💥
                          </span>
                        ) : p.state?.stood ? (
                          <span className="bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-[9px] px-1.5 py-0.2 rounded font-black uppercase tracking-wider">
                            STOOD 🚪
                          </span>
                        ) : (
                          <span className="text-[9px] text-[#e3c598]/50 italic">Spelling hand...</span>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat Section */}
      {party.mode === 'online' && (
        <div className="flex-1 flex flex-col min-h-[150px] max-h-[300px] border-t-2 border-black pt-2 overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 pb-2 scrollbar-thin scrollbar-thumb-stone-700">
            {party.chatMessages && party.chatMessages.length > 0 ? (
              party.chatMessages.map((msg, i) => (
                <div key={i} className="text-xs break-words">
                  <span className={`font-bold font-mono ${msg.playerId === playerId ? 'text-emerald-400' : 'text-[#d4af37]'}`}>
                    {msg.senderName}:
                  </span>{' '}
                  <span className="text-[#e3c598]/80">{msg.message}</span>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-[#e3c598]/40 italic text-center mt-4">No messages yet. Say howdy!</p>
            )}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleSendChat} className="flex gap-1">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Chat to table..."
              className="flex-1 bg-black/40 border border-black px-2 py-1 text-xs text-[#e3c598] font-mono outline-none focus:border-[#d4af37]"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="px-3 bg-yellow-700 hover:bg-yellow-600 disabled:opacity-50 text-black border border-black font-sans font-black text-[10px] uppercase cursor-pointer"
            >
              SEND
            </button>
          </form>
        </div>
      )}

      {/* Quick notice of rules */}
      <div className="bg-[#1a0f0a] border border-black/50 p-2 text-[10px] text-[#e3c598]/60 space-y-1.5 rounded shrink-0">
        <p className="leading-snug">
          📌 <strong>Leaderboard Status</strong>: Reset at $1,000. In Hangman, guess letters secretly. In Letterjack, other players' hands are visible!
        </p>
      </div>

    </div>
  );
}
