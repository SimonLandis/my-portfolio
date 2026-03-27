import React from 'react';

const ActionMenu = ({ activePlayer, teamAP, onSelectAction }) => {
    if (!activePlayer) return null;

    return (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 border-2 border-slate-700 p-4 rounded-lg shadow-2xl w-80 text-white">
            <div className="mb-3 border-b border-slate-700 pb-2">
                <h3 className="font-bold text-lg text-blue-400">{activePlayer.name}</h3>
                <p className="text-xs text-slate-400 uppercase tracking-widest">
                    {activePlayer.position} | Stamina: {activePlayer.stamina}/{activePlayer.maxStamina}
                </p>
            </div>

            <div className="space-y-2">
                {activePlayer.moves.map((move) => {
                    // Calculate target based on the required attribute
                    const targetValue = activePlayer.attributes[move.attr];
                    const canAfford = teamAP >= move.teamAP && activePlayer.stamina >= move.stamina;

                    return (
                        <button
                            key={move.id}
                            disabled={!canAfford || activePlayer.cooldown > 0}
                            onClick={() => onSelectAction(move)}
                            className={`w-full text-left p-2 rounded transition-all flex justify-between items-center
                                ${canAfford ? 'bg-slate-800 hover:bg-slate-700 border border-slate-600' : 'opacity-50 bg-slate-950 cursor-not-allowed'}
                            `}
                        >
                            <div>
                                <div className="font-bold text-sm">{move.name}</div>
                                <div className="text-[10px] text-slate-400">
                                    AP: {move.teamAP} | Stamina: {move.stamina}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-blue-300 font-mono">Roll ≤ {targetValue}</div>
                                <div className="text-[10px] text-slate-500 uppercase">{move.attr}</div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {activePlayer.cooldown > 0 && (
                <div className="mt-2 text-center text-red-400 text-xs italic">
                    Player is winded for {activePlayer.cooldown} more turns!
                </div>
            )}
        </div>
    );
};

export default ActionMenu;