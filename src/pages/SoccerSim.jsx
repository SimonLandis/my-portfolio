import React, { useState, useEffect, useMemo } from 'react';
import { generatePool } from '../data/playerGenerator';
import { resolveDuel } from '../logic/duelEngine';

const LEAGUE_TEAMS = [
    { name: "Claret Irons", primary: "#7A263A", secondary: "#1BB1E7" },
    { name: "North London Cannons", primary: "#EF0107", secondary: "#FFFFFF" },
    { name: "La Boca Juniors", primary: "#003CAE", secondary: "#F2B500" },
    { name: "Cascadia Summit", primary: "#004A26", secondary: "#FFFFFF" },
    { name: "Yellow Wall FC", primary: "#FDE100", secondary: "#000000" },
    { name: "Neon Tokyo FC", primary: "#00f2ff", secondary: "#ff00d4" },
    { name: "Royal Madrid", primary: "#FFFFFF", secondary: "#C5A059" },
    { name: "Void Wanderers", primary: "#1a1a1a", secondary: "#7b00ff" },
];

const getStartingXI = (p) => {
    if (!p || p.length < 10) return null;
    const s = [...p].sort((a, b) => ({ Elite: 3, Pro: 2, Rookie: 1 }[b.tier] - { Elite: 3, Pro: 2, Rookie: 1 }[a.tier]));
    const gk = s.find(x => x.position === 'GK') || s[9];
    const out = s.filter(x => x.id !== gk.id);
    const filterPos = (pos, start, end, count) => {
        const found = out.filter(x => x.position === pos).slice(0, count);
        return found.length ? found : out.slice(start, end);
    };
    return { gk, def: filterPos('DEF', 0, 3, 3), mid: filterPos('MID', 3, 7, 4), atk: filterPos('FWD', 7, 9, 2) };
};

const SoccerSim = () => {
    const [gameStage, setGameStage] = useState('SELECT_TEAM');
    const [playerPool, setPlayerPool] = useState(() => generatePool());
    const [teams, setTeams] = useState([]);
    const [currentPick, setCurrentPick] = useState(0);
    const [matchIndex, setMatchIndex] = useState(0);
    const [matchScore, setMatchScore] = useState({ home: 0, away: 0 });
    const [matchLog, setMatchLog] = useState([]);
    const [goals, setGoals] = useState([]);
    const [isSimulating, setIsSimulating] = useState(false);
    const [fieldZone, setFieldZone] = useState(0);
    const [roundCount, setRoundCount] = useState(0);
    const [bracket, setBracket] = useState({ qf: [], sf: [], f: null, results: [] });
    const [bracketRound, setBracketRound] = useState('LEAGUE');
    const [isSpectating, setIsSpectating] = useState(false);
    const [penaltyScore, setPenaltyScore] = useState({ home: 0, away: 0 });

    const userTeam = teams.find(t => !t.isCPU) || { primary: '#0f0', secondary: '#000' };
    const getTierStyle = (tier) => tier === 'Elite' ? { color: '#ffd700', fontWeight: 'bold' } : tier === 'Pro' ? { color: '#00d4ff' } : { color: '#888' };
    const getTurnOwnerId = (idx) => (Math.floor(idx / 8) % 2 !== 0) ? 7 - (idx % 8) : (idx % 8);

    const availablePlayers = useMemo(() =>
        playerPool.filter(p => !p.isDrafted).sort((a, b) => ({ Elite: 3, Pro: 2, Rookie: 1 }[b.tier] - { Elite: 3, Pro: 2, Rookie: 1 }[a.tier])), [playerPool]);

    const curMatch = useMemo(() => {
        const u = teams.find(t => !t.isCPU);
        if (!u || teams.length === 0) return { h: null, a: null };
        if (bracketRound === 'LEAGUE') {
            const opps = teams.filter(t => t.group === u.group && t.id !== u.id);
            return { h: u, a: opps[matchIndex] };
        }
        const activeBracket = bracketRound === 'QF' ? bracket.qf : bracketRound === 'SF' ? bracket.sf : [bracket.f];
        const match = activeBracket?.find(m => m?.home?.id === u.id || m?.away?.id === u.id);
        return { h: match?.home, a: match?.away };
    }, [teams, matchIndex, bracket, bracketRound]);

    const draftPlayer = (pId) => {
        if (currentPick >= 80) return;
        const p = playerPool.find(x => x.id === pId);
        setPlayerPool(prev => prev.map(x => x.id === pId ? { ...x, isDrafted: true } : x));
        setTeams(prev => prev.map(t => t.id === getTurnOwnerId(currentPick) ? { ...t, players: [...t.players, p] } : t));
        setCurrentPick(c => c + 1);
    };

    useEffect(() => {
        if (gameStage === 'DRAFT' && teams[getTurnOwnerId(currentPick)]?.isCPU) {
            const t = setTimeout(() => draftPlayer(availablePlayers[0]?.id), 30);
            return () => clearTimeout(t);
        }
    }, [currentPick, gameStage, availablePlayers]);

    useEffect(() => {
        if (gameStage !== 'LIVE' || !isSimulating) return;

        if (matchScore.home >= 3 || matchScore.away >= 3 || roundCount >= 50) {
            setIsSimulating(false);
            return;
        }

        if (roundCount === 25 && !matchLog.includes("--- HALFTIME ---")) {
            setIsSimulating(false);
            setMatchLog(l => [`--- HALFTIME ---`, ...l]);
            return;
        }

        const t = setTimeout(() => {
            const hXI = getStartingXI(curMatch.h.players), aXI = getStartingXI(curMatch.a.players);
            const isH = roundCount % 2 === 0;
            const atkXI = isH ? hXI : aXI, defXI = isH ? aXI : hXI;
            const atkTeam = isH ? curMatch.h : curMatch.a;

            const duelers = fieldZone === 0 ? [atkXI.mid, defXI.mid] : fieldZone === 1 ? [atkXI.atk, defXI.def] : [[atkXI.atk[0]], [defXI.gk]];
            const attacker = duelers[0][Math.floor(Math.random() * duelers[0].length)];
            const defender = duelers[1][Math.floor(Math.random() * duelers[1].length)];
            const res = resolveDuel(attacker, defender);

            if (res.isGoal) {
                if (fieldZone === 2) {
                    setMatchScore(s => ({ ...s, [isH ? 'home' : 'away']: s[isH ? 'home' : 'away'] + 1 }));
                    setGoals(g => [...g, { name: attacker.name, time: roundCount + 1, teamId: atkTeam.id }]);
                    setMatchLog(l => [`GOAL! ${attacker.name} takes the shot and scores for ${atkTeam.name}! (${roundCount + 1}')`, ...l]);
                    setFieldZone(0);
                } else {
                    setFieldZone(z => z + 1);
                    setMatchLog(l => [`${attacker.name} beats ${defender.name} to advance!`, ...l]);
                }
            } else {
                if (fieldZone === 2) setMatchLog(l => [`${attacker.name} takes the shot... and ${defender.name} makes the save!`, ...l]);
                else setMatchLog(l => [`Turnover! ${defender.name} stops ${attacker.name}.`, ...l]);
                setFieldZone(0);
            }
            setRoundCount(r => r + 1);
        }, 600);
        return () => clearTimeout(t);
    }, [isSimulating, roundCount, matchLog, matchScore]);

    const runPenalties = () => {
        setGameStage('PENALTIES');
        let hP = 0, aP = 0;
        // Simulating sudden death
        while (hP === aP) {
            if (Math.random() > 0.3) hP++;
            if (Math.random() > 0.3) aP++;
        }
        setPenaltyScore({ home: hP, away: aP });
    };

    const recordResult = () => {
        if (bracketRound === 'LEAGUE') {
            setTeams(prev => prev.map(t => {
                let gf = 0, ga = 0;
                if (t.id === curMatch.h.id) { gf = matchScore.home; ga = matchScore.away; }
                else if (t.id === curMatch.a.id) { gf = matchScore.away; ga = matchScore.home; }
                else { gf = Math.floor(Math.random() * 3); ga = Math.floor(Math.random() * 3); }
                return { ...t, points: t.points + (gf > ga ? 3 : gf === ga ? 1 : 0), gDiff: t.gDiff + (gf - ga) };
            }));
            if (matchIndex >= 2) setGameStage('GROUP_END'); else { setMatchIndex(m => m + 1); setGameStage('STANDINGS'); }
        } else {
            // Check for draw in knockouts
            if (matchScore.home === matchScore.away && gameStage !== 'PENALTIES') {
                runPenalties();
                return;
            }

            const finalH = gameStage === 'PENALTIES' ? penaltyScore.home : matchScore.home;
            const finalA = gameStage === 'PENALTIES' ? penaltyScore.away : matchScore.away;
            const userIsHome = curMatch.h?.id === 0;
            const userWon = (userIsHome && finalH > finalA) || (!userIsHome && finalA > finalH);

            if (!userWon) return setGameStage('ELIMINATED');
            advanceTournament();
        }
        setMatchScore({ home: 0, away: 0 }); setRoundCount(0); setFieldZone(0); setMatchLog([]); setGoals([]); setPenaltyScore({ home: 0, away: 0 });
    };

    const advanceTournament = () => {
        if (bracketRound === 'QF') { setIsSpectating(true); setBracketRound('SF'); }
        else if (bracketRound === 'SF') setBracketRound('FINAL');
        else setGameStage('CHAMPION');
        setGameStage('BRACKET');
    };

    const runFullSimRound = () => {
        const active = (bracketRound === 'QF' ? bracket.qf : bracketRound === 'SF' ? bracket.sf : [bracket.f]) || [];
        const newResults = active.map(m => {
            let hs = Math.floor(Math.random() * 4);
            let as = Math.floor(Math.random() * 4);
            let pScore = null;

            // Handle CPU draws
            if (hs === as) {
                let ph = 0, pa = 0;
                while (ph === pa) { if (Math.random() > 0.3) ph++; if (Math.random() > 0.3) pa++; }
                pScore = { h: ph, a: pa };
            }

            const events = [];
            for (let i = 0; i < hs; i++) events.push({ n: m.home.players[Math.floor(Math.random() * m.home.players.length)]?.name || "Striker", t: Math.floor(Math.random() * 90), side: 'H' });
            for (let i = 0; i < as; i++) events.push({ n: m.away.players[Math.floor(Math.random() * m.away.players.length)]?.name || "Striker", t: Math.floor(Math.random() * 90), side: 'A' });
            return { home: m.home, away: m.away, hScore: hs, aScore: as, pScore, events: events.sort((a, b) => a.t - b.t) };
        });

        setBracket(prev => ({ ...prev, results: newResults }));

        setTimeout(() => {
            const winners = newResults.map(r => {
                if (r.hScore !== r.aScore) return r.hScore > r.aScore ? r.home : r.away;
                return r.pScore.h > r.pScore.a ? r.home : r.away;
            });

            if (bracketRound === 'QF') {
                const sA = teams.filter(t => t.group === 'A').sort((a, b) => b.points - a.points || b.gDiff - a.gDiff);
                const sB = teams.filter(t => t.group === 'B').sort((a, b) => b.points - a.points || b.gDiff - a.gDiff);
                setBracket(p => ({ ...p, sf: [{ home: sA[0], away: winners[0] }, { home: sB[0], away: winners[1] }], results: [] }));
                setBracketRound('SF');
            } else if (bracketRound === 'SF') {
                setBracket(p => ({ ...p, f: { home: winners[0], away: winners[1] }, results: [] }));
                setBracketRound('FINAL');
            } else setGameStage('SPECTATE_END');
            setIsSpectating(false);
        }, 3000);
    };

    const startKnockouts = () => {
        const sA = teams.filter(t => t.group === 'A').sort((a, b) => b.points - a.points || b.gDiff - a.gDiff);
        const sB = teams.filter(t => t.group === 'B').sort((a, b) => b.points - a.points || b.gDiff - a.gDiff);
        const userInTop3 = sA.slice(0, 3).some(t => t.id === 0) || sB.slice(0, 3).some(t => t.id === 0);
        setBracket({ qf: [{ home: sA[1], away: sB[2] }, { home: sB[1], away: sA[2] }], sf: [], f: null, results: [] });
        if (!userInTop3) setGameStage('ELIMINATED');
        else {
            setBracketRound('QF');
            setIsSpectating(sA[0].id === 0 || sB[0].id === 0);
            setGameStage('BRACKET');
        }
    };

    return (
        <div style={{ backgroundColor: '#000', color: '#eee', minHeight: '100vh', padding: '20px', fontFamily: 'monospace', border: `5px solid ${userTeam.primary}` }}>
            {gameStage === 'SELECT_TEAM' && (
                <div style={{ textAlign: 'center' }}>
                    <h1>SELECT CLUB</h1>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                        {LEAGUE_TEAMS.map(c => <div key={c.name} onClick={() => { setTeams([{ id: 0, ...c, isCPU: false, players: [], group: 'A', points: 0, gDiff: 0 }, ...LEAGUE_TEAMS.filter(x => x.name !== c.name).map((x, i) => ({ id: i + 1, ...x, isCPU: true, players: [], group: i < 3 ? 'A' : 'B', points: 0, gDiff: 0 }))]); setGameStage('DRAFT'); }} style={{ background: c.primary, padding: '20px', cursor: 'pointer', border: `2px solid ${c.secondary}`, color: (c.primary === '#FFFFFF' || c.primary === '#FDE100') ? '#000' : '#fff' }}>{c.name}</div>)}
                    </div>
                </div>
            )}

            {gameStage === 'DRAFT' && (
                <div style={{ display: 'flex', gap: '20px' }}>
                    <div style={{ flex: 1.5, height: '80vh', overflowY: 'auto', border: '1px solid #222', padding: '10px' }}>
                        <h3>AVAILABLE POOL</h3>
                        {availablePlayers.map(p => (
                            <div key={p.id} style={{ padding: '8px', borderBottom: '1px solid #111', display: 'flex', justifyContent: 'space-between' }}>
                                <span><b>{p.name}</b> | {p.position} | <span style={getTierStyle(p.tier)}>{p.tier}</span></span>
                                {getTurnOwnerId(currentPick) === 0 && <button onClick={() => draftPlayer(p.id)} style={{ cursor: 'pointer' }}>PICK</button>}
                            </div>
                        ))}
                    </div>
                    <div style={{ flex: 1, height: '80vh', overflowY: 'auto', border: '1px solid #222', padding: '10px' }}>
                        <h3>ROSTERS ({currentPick}/80)</h3>
                        {teams.map(t => (
                            <div key={t.id} style={{ marginBottom: '15px', opacity: getTurnOwnerId(currentPick) === t.id ? 1 : 0.3 }}>
                                <b style={{ color: (t.name === "Yellow Wall FC" ? "#FDE100" : t.primary) }}>{t.name.toUpperCase()}</b>
                                {t.players.map((p, i) => <div key={i} style={{ fontSize: '0.7rem', color: '#888' }}>{p.name} | {p.position}</div>)}
                            </div>
                        ))}
                        {currentPick >= 80 && <button onClick={() => setGameStage('STANDINGS')} style={{ width: '100%', padding: '10px' }}>START SEASON</button>}
                    </div>
                </div>
            )}

            {(gameStage === 'STANDINGS' || gameStage === 'GROUP_END') && (
                <div style={{ textAlign: 'center' }}>
                    <h2>{gameStage === 'GROUP_END' ? "GROUP RESULTS" : "STANDINGS"}</h2>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '40px' }}>
                        {['A', 'B'].map(g => <div key={g}><h3>GRP {g}</h3>{teams.filter(t => t.group === g).sort((a, b) => b.points - a.points || b.gDiff - a.gDiff).map(t => <div key={t.id}>{t.name}: {t.points}pts</div>)}</div>)}
                    </div>
                    <button onClick={() => gameStage === 'GROUP_END' ? startKnockouts() : setGameStage('LIVE')} style={{ marginTop: '20px', padding: '10px 20px' }}>CONTINUE</button>
                </div>
            )}

            {(gameStage === 'LIVE' || gameStage === 'PENALTIES') && (
                <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', alignItems: 'center' }}>
                        <div style={{ width: '200px' }}>
                            <h3 style={{ color: curMatch.h?.primary }}>{curMatch.h?.name}</h3>
                            <div style={{ fontSize: '0.8rem', color: '#888' }}>
                                {goals.filter(g => g.teamId === curMatch.h.id).map((g, i) => <div key={i}>{g.name} ({g.time}')</div>)}
                            </div>
                        </div>
                        <div>
                            <h1 style={{ fontSize: '4rem' }}>{matchScore.home} - {matchScore.away}</h1>
                            {gameStage === 'PENALTIES' && <h2 style={{ color: userTeam.primary }}>(P) {penaltyScore.home} - {penaltyScore.away}</h2>}
                        </div>
                        <div style={{ width: '200px' }}>
                            <h3 style={{ color: curMatch.a?.primary }}>{curMatch.a?.name}</h3>
                            <div style={{ fontSize: '0.8rem', color: '#888' }}>
                                {goals.filter(g => g.teamId === curMatch.a.id).map((g, i) => <div key={i}>{g.name} ({g.time}')</div>)}
                            </div>
                        </div>
                    </div>
                    {gameStage === 'PENALTIES' ? <h2 style={{ color: 'red' }}>PENALTY SHOOTOUT!</h2> : <div style={{ margin: '10px 0' }}>{roundCount}'</div>}
                    <div style={{ height: '150px', border: `1px solid #333`, margin: '20px auto', width: '60%', padding: '15px', textAlign: 'left', overflowY: 'hidden' }}>{matchLog.slice(0, 5).map((l, i) => <div key={i} style={{ color: i === 0 ? userTeam.primary : '#444' }}>{">"} {l}</div>)}</div>
                    {!isSimulating && (roundCount === 0) && <button onClick={() => setIsSimulating(true)}>KICKOFF</button>}
                    {!isSimulating && (roundCount === 25 && matchScore.home < 3 && matchScore.away < 3) && <button onClick={() => setIsSimulating(true)}>START 2ND HALF</button>}
                    {!isSimulating && (roundCount >= 50 || matchScore.home >= 3 || matchScore.away >= 3 || gameStage === 'PENALTIES') && <button onClick={recordResult}>CONTINUE</button>}
                </div>
            )}

            {gameStage === 'BRACKET' && (
                <div style={{ textAlign: 'center' }}>
                    <h1>{bracketRound}</h1>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '20px', marginTop: '20px' }}>
                        {(bracketRound === 'QF' ? bracket.qf : bracketRound === 'SF' ? bracket.sf : [bracket.f]).map((m, i) => {
                            if (!m) return null;
                            const res = bracket.results[i];
                            const isUserMatch = m?.home?.id === 0 || m?.away?.id === 0;
                            return (
                                <div key={i} style={{ border: isUserMatch ? `2px solid ${userTeam.primary}` : '1px solid #333', padding: '15px', width: '300px', background: '#111' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                                        <span style={{ color: m?.home?.primary }}>{m?.home?.name || "TBD"}</span>
                                        <span>{res ? (res.pScore ? `(${res.pScore.h}) ` : '') + res.hScore : "-"}</span>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#777', textAlign: 'left', marginBottom: '10px' }}>
                                        {res?.events.filter(e => e.side === 'H').map((e, ei) => <div key={ei}>⚽ {e.n} ({e.t}')</div>)}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                                        <span style={{ color: m?.away?.primary }}>{m?.away?.name || "TBD"}</span>
                                        <span>{res ? (res.pScore ? `(${res.pScore.a}) ` : '') + res.aScore : "-"}</span>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#777', textAlign: 'left', marginBottom: '10px' }}>
                                        {res?.events.filter(e => e.side === 'A').map((e, ei) => <div key={ei}>⚽ {e.n} ({e.t}')</div>)}
                                    </div>
                                    {isUserMatch && !isSpectating && !res && <button onClick={() => setGameStage('LIVE')} style={{ marginTop: '15px', width: '100%' }}>PLAY</button>}
                                </div>
                            )
                        })}
                    </div>
                    {isSpectating && bracket.results.length === 0 && <button onClick={runFullSimRound} style={{ marginTop: '30px', padding: '10px 30px' }}>SIMULATE ROUND</button>}
                </div>
            )}

            {gameStage === 'ELIMINATED' && (
                <div style={{ textAlign: 'center' }}>
                    <h1>OUT OF THE RUNNING</h1>
                    <button onClick={() => { setIsSpectating(true); setBracketRound('QF'); setGameStage('BRACKET'); }} style={{ marginRight: '10px', padding: '10px 20px' }}>SPECTATE FINALS</button>
                    <button onClick={() => window.location.reload()} style={{ padding: '10px 20px' }}>RESTART</button>
                </div>
            )}

            {gameStage === 'SPECTATE_END' && <div style={{ textAlign: 'center' }}><h1>TOURNAMENT COMPLETE</h1><button onClick={() => window.location.reload()}>RESTART</button></div>}
            {gameStage === 'CHAMPION' && <div style={{ textAlign: 'center' }}><h1>🏆 CHAMPIONS 🏆</h1><button onClick={() => window.location.reload()}>RESTART</button></div>}
        </div>
    );
};

export default SoccerSim;