import React, { useState, useEffect, useMemo } from 'react';
import { generatePool } from '../data/playerGenerator';
import { resolveDuel } from '../logic/duelEngine';

const SoccerSim = () => {
    // --- 1. CORE STATE ---
    const [gameStage, setGameStage] = useState('DRAFT');
    const [playerPool, setPlayerPool] = useState(() => generatePool());
    const [teams, setTeams] = useState([
        { id: 0, name: "User Team", players: [], isCPU: false, group: 'A', points: 0, gDiff: 0 },
        { id: 1, name: "CPU Alpha", players: [], isCPU: true, group: 'A', points: 0, gDiff: 0 },
        { id: 2, name: "CPU Beta", players: [], isCPU: true, group: 'A', points: 0, gDiff: 0 },
        { id: 3, name: "CPU Gamma", players: [], isCPU: true, group: 'A', points: 0, gDiff: 0 },
        { id: 4, name: "CPU Delta", players: [], isCPU: true, group: 'B', points: 0, gDiff: 0 },
        { id: 5, name: "CPU Epsilon", players: [], isCPU: true, group: 'B', points: 0, gDiff: 0 },
        { id: 6, name: "CPU Zeta", players: [], isCPU: true, group: 'B', points: 0, gDiff: 0 },
        { id: 7, name: "CPU Eta", players: [], isCPU: true, group: 'B', points: 0, gDiff: 0 },
    ]);

    const [currentPick, setCurrentPick] = useState(0);
    const [matchIndex, setMatchIndex] = useState(0);
    const [matchScore, setMatchScore] = useState({ home: 0, away: 0 });
    const [matchLog, setMatchLog] = useState([]);
    const [possession, setPossession] = useState(0);
    const [isSimulating, setIsSimulating] = useState(false);

    // KNOCKOUT STATE
    const [bracket, setBracket] = useState({ qf: [], sf: [], f: null });
    const [bracketRound, setBracketRound] = useState('LEAGUE');

    // --- 2. DRAFT ENGINE ---
    const getTurnOwnerId = (idx) => {
        const round = Math.floor(idx / 8);
        const pos = idx % 8;
        return (round % 2 !== 0) ? 7 - pos : pos;
    };

    const availablePlayers = useMemo(() =>
        playerPool.filter(p => !p.isDrafted).sort((a, b) => {
            const tierMap = { Elite: 3, Pro: 2, Rookie: 1 };
            return tierMap[b.tier] - tierMap[a.tier];
        })
        , [playerPool]);

    const draftPlayer = (playerId) => {
        if (currentPick >= 80) return;
        const player = playerPool.find(x => x.id === playerId);
        if (!player || player.isDrafted) return;

        setPlayerPool(prev => prev.map(x => x.id === playerId ? { ...x, isDrafted: true } : x));
        const turnOwnerId = getTurnOwnerId(currentPick);
        setTeams(prev => prev.map(t => t.id === turnOwnerId ? { ...t, players: [...t.players, player] } : t));
        setCurrentPick(prev => prev + 1);
    };

    useEffect(() => {
        if (gameStage !== 'DRAFT' || currentPick >= 80) return;
        const currentTeamId = getTurnOwnerId(currentPick);
        const currentTeam = teams.find(t => t.id === currentTeamId);
        if (currentTeam?.isCPU) {
            const cpuTimer = setTimeout(() => {
                const best = availablePlayers[0];
                if (best) draftPlayer(best.id);
            }, 50);
            return () => clearTimeout(cpuTimer);
        }
    }, [currentPick, gameStage, availablePlayers, teams]);

    // --- 3. TOURNAMENT LOGIC ---

    const getCurrentMatchTeams = () => {
        const user = teams.find(t => !t.isCPU);
        if (bracketRound === 'LEAGUE') {
            return { homeTeam: user, awayTeam: teams.filter(t => t.group === user.group && t.id !== user.id)[matchIndex] };
        }
        const matchArr = bracketRound === 'QF' ? bracket.qf : bracketRound === 'SF' ? bracket.sf : [bracket.f];
        const active = matchArr.find(m => m?.home?.id === user.id || m?.away?.id === user.id);
        return active ? { homeTeam: active.home, awayTeam: active.away } : { homeTeam: null, awayTeam: null };
    };

    const runBackgroundMatch = (tA, tB) => {
        let sA = 0, sB = 0;
        for (let i = 0; i < 10; i++) {
            if (resolveDuel(tA.players[i], tB.players[i]).isGoal) sA++;
            if (resolveDuel(tB.players[i], tA.players[i]).isGoal) sB++;
        }
        return sA >= sB ? tA : tB; // Simplified: higher score wins
    };

    const recordResult = () => {
        if (bracketRound === 'LEAGUE') {
            const { homeTeam, awayTeam } = getCurrentMatchTeams();
            setTeams(prev => {
                let updated = [...prev];
                const update = (id, gf, ga) => {
                    const idx = updated.findIndex(t => t.id === id);
                    updated[idx] = { ...updated[idx], points: updated[idx].points + (gf > ga ? 3 : gf === ga ? 1 : 0), gDiff: updated[idx].gDiff + (gf - ga) };
                };
                update(homeTeam.id, matchScore.home, matchScore.away);
                update(awayTeam.id, matchScore.away, matchScore.home);

                // Sim other Group A and all of Group B
                const othersA = updated.filter(t => t.group === 'A' && t.id !== homeTeam.id && t.id !== awayTeam.id);
                const resA_sA = Math.floor(Math.random() * 4); const resA_sB = Math.floor(Math.random() * 4);
                update(othersA[0].id, resA_sA, resA_sB); update(othersA[1].id, resA_sB, resA_sA);

                const gB = updated.filter(t => t.group === 'B');
                const p = matchIndex === 0 ? [[0, 1], [2, 3]] : matchIndex === 1 ? [[0, 2], [1, 3]] : [[0, 3], [1, 2]];
                p.forEach(([i1, i2]) => {
                    const s1 = Math.floor(Math.random() * 4); const s2 = Math.floor(Math.random() * 4);
                    update(gB[i1].id, s1, s2); update(gB[i2].id, s2, s1);
                });
                return updated;
            });
            if (matchIndex >= 2) setGameStage('GROUP_END');
            else { setMatchIndex(m => m + 1); setGameStage('STANDINGS'); }
        } else {
            handleBracketAdvancement();
        }
    };

    const handleBracketAdvancement = () => {
        const { homeTeam, awayTeam } = getCurrentMatchTeams();
        const user = teams.find(t => !t.isCPU);
        const userWon = homeTeam?.id === 0 ? matchScore.home >= matchScore.away : matchScore.away >= matchScore.home;

        if (bracketRound === 'QF') {
            // User might have a bye, or just finished their QF
            const qf1Winner = runBackgroundMatch(bracket.qf[0].home, bracket.qf[0].away);
            const qf2Winner = runBackgroundMatch(bracket.qf[1].home, bracket.qf[1].away);

            // If user was in QF, they must win to proceed. If they had a bye, they were in SF[0] or SF[1].
            if (bracket.qf.some(m => m.home.id === 0 || m.away.id === 0) && !userWon) return setGameStage('ELIMINATED');

            setBracket(prev => ({
                ...prev,
                sf: [
                    { home: prev.sf[0].home || qf1Winner, away: prev.sf[0].away || qf1Winner === qf1Winner ? qf1Winner : null },
                    { home: prev.sf[1].home || qf2Winner, away: prev.sf[1].away || qf2Winner }
                ]
            }));
            // Correcting SF pairing: SF1 gets QF1 winner, SF2 gets QF2 winner
            setBracket(prev => ({
                sf: [
                    { home: prev.sf[0].home, away: qf1Winner },
                    { home: prev.sf[1].home, away: qf2Winner }
                ]
            }));
            setBracketRound('SF');
        } else if (bracketRound === 'SF') {
            if (!userWon) return setGameStage('ELIMINATED');
            const otherSF = bracket.sf.find(m => m.home.id !== 0 && m.away.id !== 0);
            const finalOpponent = runBackgroundMatch(otherSF.home, otherSF.away);
            setBracket(prev => ({ ...prev, f: { home: user, away: finalOpponent } }));
            setBracketRound('FINAL');
        } else {
            if (!userWon) return setGameStage('ELIMINATED');
            setGameStage('CHAMPION');
        }
        setGameStage('BRACKET');
    };

    // --- 4. MATCH ENGINE ---
    useEffect(() => {
        if (!isSimulating) return;
        if (possession >= 10) { setTimeout(() => setIsSimulating(false), 50); return; }
        const timer = setTimeout(() => {
            const { homeTeam, awayTeam } = getCurrentMatchTeams();
            const isHomeAtk = possession % 2 === 0;
            const res = resolveDuel(isHomeAtk ? homeTeam.players[possession] : awayTeam.players[possession], isHomeAtk ? awayTeam.players[possession] : homeTeam.players[possession]);
            if (res.isGoal) setMatchScore(s => ({ ...s, [isHomeAtk ? 'home' : 'away']: s[isHomeAtk ? 'home' : 'away'] + 1 }));
            setMatchLog(prev => [`${isHomeAtk ? homeTeam.players[possession].name : awayTeam.players[possession].name} shoots... ${res.isGoal ? 'GOAL!' : 'SAVED!'}`, ...prev.slice(0, 5)]);
            setPossession(p => p + 1);
        }, 400);
        return () => clearTimeout(timer);
    }, [isSimulating, possession]);

    // --- 5. RENDER ---
    const { homeTeam, awayTeam } = getCurrentMatchTeams();
    const userHasBye = bracketRound === 'QF' && !homeTeam;

    return (
        <div style={{ backgroundColor: '#000', color: '#0f0', minHeight: '100vh', padding: '20px', fontFamily: 'monospace' }}>
            {gameStage === 'DRAFT' && (
                <div style={{ display: 'flex', gap: '20px' }}>
                    <div style={{ flex: 1.5, height: '85vh', overflowY: 'auto', border: '1px solid #0f0', padding: '10px' }}>
                        <h3>AVAILABLE PLAYERS</h3>
                        {availablePlayers.map(p => (
                            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #111' }}>
                                <span>{p.name} | {p.position} | <span style={{ color: p.tier === 'Elite' ? 'gold' : p.tier === 'Pro' ? 'cyan' : '#888' }}>{p.tier}</span></span>
                                {!(teams.find(t => t.id === getTurnOwnerId(currentPick))?.isCPU) && <button onClick={() => draftPlayer(p.id)} style={{ background: 'transparent', border: '1px solid #0f0', color: '#0f0', cursor: 'pointer' }}>PICK</button>}
                            </div>
                        ))}
                    </div>
                    <div style={{ flex: 1, border: '1px solid #0f0', padding: '10px' }}>
                        <h3>ROSTERS</h3>
                        {teams.map(t => (
                            <div key={t.id} style={{ marginBottom: '10px', fontSize: '0.8rem', opacity: getTurnOwnerId(currentPick) === t.id ? 1 : 0.5 }}>
                                <b>{t.name}</b>: {t.players.map(p => p.name).join(', ')}
                            </div>
                        ))}
                        {currentPick >= 80 && <button onClick={() => setGameStage('STANDINGS')} style={{ width: '100%', padding: '10px', background: '#0f0', color: '#000', cursor: 'pointer' }}>START SEASON</button>}
                    </div>
                </div>
            )}

            {(gameStage === 'STANDINGS' || gameStage === 'GROUP_END') && (
                <div style={{ textAlign: 'center' }}>
                    <h2>{gameStage === 'GROUP_END' ? 'FINAL STANDINGS' : 'LEAGUE TABLE'}</h2>
                    <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                        {['A', 'B'].map(g => (
                            <div key={g} style={{ border: '1px solid #0f0', padding: '10px', minWidth: '200px' }}>
                                <h3>GROUP {g}</h3>
                                {teams.filter(t => t.group === g).sort((a, b) => b.points - a.points || b.gDiff - a.gDiff).map(t => (
                                    <div key={t.id}>{t.name}: {t.points}pts</div>
                                ))}
                            </div>
                        ))}
                    </div>
                    <button onClick={() => {
                        if (gameStage === 'GROUP_END') {
                            const sA = [...teams].filter(t => t.group === 'A').sort((a, b) => b.points - a.points || b.gDiff - a.gDiff);
                            const sB = [...teams].filter(t => t.group === 'B').sort((a, b) => b.points - a.points || b.gDiff - a.gDiff);
                            setBracket({
                                qf: [{ home: sA[1], away: sB[2] }, { home: sB[1], away: sA[2] }],
                                sf: [{ home: sA[0], away: null }, { home: sB[0], away: null }],
                                f: null
                            });
                            setBracketRound('QF');
                            setGameStage('BRACKET');
                        } else {
                            setMatchScore({ home: 0, away: 0 }); setMatchLog([]); setPossession(0); setGameStage('LIVE');
                        }
                    }} style={{ marginTop: '20px', padding: '10px', background: 'transparent', color: '#0f0', border: '1px solid #0f0', cursor: 'pointer' }}>
                        {gameStage === 'GROUP_END' ? 'TO KNOCKOUTS' : 'PLAY NEXT MATCH'}
                    </button>
                </div>
            )}

            {gameStage === 'LIVE' && (
                <div style={{ textAlign: 'center' }}>
                    <h3>{homeTeam?.name} VS {awayTeam?.name}</h3>
                    <h1 style={{ fontSize: '4rem' }}>{matchScore.home} - {matchScore.away}</h1>
                    <div style={{ height: '150px', border: '1px solid #0f0', width: '60%', margin: 'auto', overflowY: 'hidden', padding: '10px', textAlign: 'left' }}>
                        {matchLog.map((l, i) => <div key={i}>{">"} {l}</div>)}
                    </div>
                    {possession < 10 ? (
                        <button onClick={() => setIsSimulating(true)} disabled={isSimulating} style={{ padding: '10px', marginTop: '10px' }}>{isSimulating ? 'PLAYING...' : 'KICKOFF'}</button>
                    ) : (
                        <button onClick={recordResult} style={{ padding: '10px', background: '#0f0', color: '#000', border: 'none', marginTop: '10px', cursor: 'pointer' }}>CONTINUE</button>
                    )}
                </div>
            )}

            {gameStage === 'BRACKET' && (
                <div style={{ textAlign: 'center' }}>
                    <h1>{bracketRound}</h1>
                    {userHasBye ? (
                        <div>
                            <p>You have a BYE this round. Simulating other matches...</p>
                            <button onClick={handleBracketAdvancement} style={{ padding: '10px', background: '#0f0', color: '#000' }}>NEXT ROUND</button>
                        </div>
                    ) : (
                        <div>
                            <p>{homeTeam?.name} vs {awayTeam?.name}</p>
                            <button onClick={() => { setMatchScore({ home: 0, away: 0 }); setMatchLog([]); setPossession(0); setGameStage('LIVE'); }} style={{ padding: '10px', background: 'transparent', color: '#0f0', border: '1px solid #0f0' }}>PLAY MATCH</button>
                        </div>
                    )}
                </div>
            )}

            {gameStage === 'ELIMINATED' && <h1 style={{ textAlign: 'center', color: 'red' }}>ELIMINATED</h1>}
            {gameStage === 'CHAMPION' && <h1 style={{ textAlign: 'center', color: 'gold' }}>🏆 CHAMPIONS 🏆</h1>}
        </div>
    );
};

export default SoccerSim;