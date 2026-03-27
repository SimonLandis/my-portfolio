import React, { useState, useEffect, useCallback } from 'react';
import { generatePool } from '../data/playerGenerator';
import { getActiveLineup, mapPlayersToZones } from '../logic/lineup';
import { playTick, handleHalfTime, MATCH_CONFIG } from '../logic/matchEngine';
import { createGroups, sortStandings, generateKnockoutStages, quickSimMatch, resolvePKShootout } from '../logic/tournamentLogic';
import { resolveMove, rollInitiative } from '../logic/diceUtils';
import ActionMenu from './ActionMenu';

const TEAMS_DATA = [
    { id: 0, name: "Void Wanderers", primary: "#1a1a1a", secondary: "#7b00ff" },
    { id: 1, name: "Claret Irons", primary: "#7A263A", secondary: "#1BB1E7" },
    { id: 2, name: "North London", primary: "#EF0107", secondary: "#FFFFFF" },
    { id: 3, name: "La Boca", primary: "#003CAE", secondary: "#F2B500" },
    { id: 4, name: "Summit FC", primary: "#004A26", secondary: "#FFFFFF" },
    { id: 5, name: "Yellow Wall", primary: "#FDE100", secondary: "#000000" },
    { id: 6, name: "Neon Tokyo", primary: "#00f2ff", secondary: "#ff00d4" },
    { id: 7, name: "Royal Madrid", primary: "#FFFFFF", secondary: "#C5A059" },
];

const POSITION_CAPS = { 'Keeper': 2, 'Defender': 4, 'Midfielder': 4, 'Striker': 3 };
const tierWeights = { 'S': 100, 'A': 80, 'B': 60, 'C': 40, 'D': 20 };

const VERTICAL_LANES = ['50%', '30%', '70%', '15%', '85%', '25%', '75%'];

const getDynamicCoords = (side, position, playerIdx, ballZone) => {
    // FIX: Moved Keeper anchor to 3% to keep them deep in the goal area
    const anchors = { 'Keeper': 3, 'Defender': 25, 'Midfielder': 50, 'Striker': 75 };
    let homeX = side === 'HOME' ? anchors[position] : 100 - anchors[position];

    const ballPosPct = (ballZone - 1) * 20 + 10;

    // FIX: Keepers now have a much lower pull strength (0.02) so they stay on their line
    const pullStrength = position === 'Keeper' ? 0.02 : 0.15;
    const influencedX = homeX + (ballPosPct - homeX) * pullStrength;

    const individualOffset = (playerIdx - 3) * 3;
    const sideOffset = side === 'HOME' ? -2 : 2;

    return {
        left: `${influencedX + (position === 'Keeper' ? 0 : individualOffset) + sideOffset}%`,
        top: position === 'Keeper' ? '50%' : VERTICAL_LANES[playerIdx] || '50%'
    };
};

const getContrastingColor = (hex) => {
    const r = parseInt(hex.substring(1, 3), 16), g = parseInt(hex.substring(3, 5), 16), b = parseInt(hex.substring(5, 7), 16);
    return (((r * 299) + (g * 587) + (b * 114)) / 1000 >= 128) ? '#000000' : '#ffffff';
};

const SoccerSim = () => {
    const [gameStage, setGameStage] = useState('SELECT_TEAM');
    const [playerPool, setPlayerPool] = useState(() => generatePool());
    const [allRosters, setAllRosters] = useState({ 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] });
    const [currentPick, setCurrentPick] = useState(0);
    const [groups, setGroups] = useState(null);
    const [bracket, setBracket] = useState(null);
    const [activeMatch, setActiveMatch] = useState(null);
    const [matchState, setMatchState] = useState(null);

    const [matchPhase, setMatchPhase] = useState('INITIATIVE');
    const [homeAP, setHomeAP] = useState(10);
    const [activePlayer, setActivePlayer] = useState(null);
    const [matchLog, setMatchLog] = useState([]);

    const addToLog = (msg) => setMatchLog(prev => [msg, ...prev].slice(0, 5));

    const getTurnOwner = (idx) => {
        const round = Math.floor(idx / 8);
        return round % 2 !== 0 ? 7 - (idx % 8) : (idx % 8);
    };

    const handlePick = useCallback((pId) => {
        const p = playerPool.find(x => x.id === pId);
        if (!p || p.isDrafted) return;
        const ownerId = getTurnOwner(currentPick);
        if (allRosters[ownerId].filter(pl => pl.position === p.position).length >= POSITION_CAPS[p.position]) return;
        setAllRosters(prev => ({ ...prev, [ownerId]: [...prev[ownerId], p] }));
        setPlayerPool(prev => prev.map(x => x.id === pId ? { ...x, isDrafted: true } : x));
        setCurrentPick(c => c + 1);
    }, [currentPick, playerPool, allRosters]);

    useEffect(() => {
        if (gameStage === 'DRAFT') {
            const ownerId = getTurnOwner(currentPick);
            if (ownerId !== 0 && currentPick < 80) {
                const available = playerPool.filter(x => !x.isDrafted)
                    .filter(p => allRosters[ownerId].filter(pl => pl.position === p.position).length < POSITION_CAPS[p.position])
                    .sort((a, b) => tierWeights[b.tier] - tierWeights[a.tier]);

                if (available.length > 0) {
                    const timer = setTimeout(() => handlePick(available[0].id), 5);
                    return () => clearTimeout(timer);
                }
            }
            else if (currentPick === 80 && !groups) {
                const finalTeams = TEAMS_DATA.map(t => ({ ...t, roster: allRosters[t.id] }));
                setGroups(createGroups(finalTeams));
                setGameStage('GROUPS');
            }
        }
    }, [currentPick, gameStage, allRosters, handlePick, playerPool, groups]);

    const startMatch = (homeId, awayId, type) => {
        setAllRosters(prevRosters => {
            const newRosters = { ...prevRosters };
            Object.keys(newRosters).forEach(teamId => {
                newRosters[teamId] = newRosters[teamId].map(player => ({
                    ...player,
                    stamina: player.maxStamina || 100
                }));
            });
            return newRosters;
        });

        setActiveMatch({ homeId, awayId, type });
        setMatchState({
            clock: 0,
            half: 1,
            ballZone: 3,
            possession: 'home',
            homeScore: 0,
            awayScore: 0,
            goals: []
        });

        setMatchPhase('INITIATIVE');
        setHomeAP(10);
        setMatchLog(["Match Kickoff!"]);
        setGameStage('LIVE_MATCH');
    };

    const handleActionSelect = (move) => {
        if (!activePlayer) return;
        const result = resolveMove(activePlayer, move.attr);

        setHomeAP(prev => Math.max(0, prev - move.teamAP));

        setAllRosters(prev => {
            const teamId = activeMatch.homeId;
            const updatedTeam = prev[teamId].map(p =>
                p.id === activePlayer.id
                    ? { ...p, stamina: Math.max(0, p.stamina - move.stamina) }
                    : p
            );
            return { ...prev, [teamId]: updatedTeam };
        });

        if (result.success) {
            addToLog(`${activePlayer.name} successful ${move.name}!`);
        } else {
            addToLog(`${activePlayer.name} fumbled! Turnover.`);
            setMatchState(prev => ({ ...prev, possession: 'away' }));
        }
        setActivePlayer(null);
        setMatchPhase('RESOLUTION');
    };

    const finishMatch = () => {
        if (activeMatch.type === 'group') {
            const { homeId, awayId } = activeMatch;
            setGroups(prev => {
                if (!prev) return prev;
                let updatedGroups = JSON.parse(JSON.stringify(prev));
                const gn = prev.groupA.some(t => t.id === homeId) ? 'groupA' : 'groupB';

                updatedGroups[gn] = updatedGroups[gn].map(team => {
                    if (team.id === homeId || team.id === awayId) {
                        const isH = team.id === homeId;
                        const s = isH ? matchState.homeScore : matchState.awayScore;
                        const os = isH ? matchState.awayScore : matchState.homeScore;
                        return {
                            ...team,
                            mp: team.mp + 1,
                            gf: team.gf + s,
                            ga: team.ga + os,
                            gd: (team.gf + s) - (team.ga + os),
                            points: team.points + (s > os ? 3 : s === os ? 1 : 0)
                        };
                    }
                    return team;
                });

                ['groupA', 'groupB'].forEach(groupName => {
                    const idleTeams = updatedGroups[groupName].filter(t =>
                        t.id !== homeId && t.id !== awayId && t.mp < updatedGroups[gn].find(u => u.id === homeId).mp
                    );
                    if (idleTeams.length === 2) {
                        const res = quickSimMatch(allRosters[idleTeams[0].id], allRosters[idleTeams[1].id]);
                        idleTeams[0].mp += 1;
                        idleTeams[0].gf += res.homeScore;
                        idleTeams[0].ga += res.awayScore;
                        idleTeams[0].points += res.homeScore > res.awayScore ? 3 : (res.homeScore === res.awayScore ? 1 : 0);
                        idleTeams[1].mp += 1;
                        idleTeams[1].gf += res.awayScore;
                        idleTeams[1].ga += res.homeScore;
                        idleTeams[1].points += res.awayScore > res.homeScore ? 3 : (res.awayScore === res.homeScore ? 1 : 0);
                    }
                });
                return updatedGroups;
            });
            setGameStage('GROUPS');
        } else {
            if (matchState.homeScore === matchState.awayScore) {
                const pkRes = resolvePKShootout();
                setMatchState(prev => ({
                    ...prev,
                    homeScore: prev.homeScore + (pkRes.winner === 'home' ? 1 : 0),
                    awayScore: prev.awayScore + (pkRes.winner === 'away' ? 1 : 0)
                }));
            }
            setGameStage('BRACKET');
        }
    };

    useEffect(() => {
        let timer;
        if (gameStage === 'LIVE_MATCH' && matchState && !matchState.isPaused) {
            if (matchPhase === 'INITIATIVE') {
                timer = setTimeout(() => {
                    const hInit = rollInitiative(allRosters[activeMatch.homeId]);
                    const aInit = rollInitiative(allRosters[activeMatch.awayId]);
                    if (hInit >= aInit && matchState.possession === 'home') {
                        const lineup = getActiveLineup(allRosters[activeMatch.homeId]);
                        setActivePlayer(lineup.find(p => p.currentZone === matchState.ballZone) || lineup[0]);
                        setMatchPhase('ACTION');
                    } else {
                        setMatchPhase('RESOLUTION');
                    }
                }, 800);
            } else if (matchPhase === 'RESOLUTION') {
                timer = setTimeout(() => {
                    setMatchState(prev => {
                        if (prev.clock === MATCH_CONFIG.HALF_TIME && prev.half === 1) return { ...prev, isPaused: true };
                        if (prev.clock >= MATCH_CONFIG.MAX_TICKS) return { ...prev, isPaused: true };
                        return playTick(prev,
                            mapPlayersToZones(getActiveLineup(allRosters[activeMatch.homeId]), true),
                            mapPlayersToZones(getActiveLineup(allRosters[activeMatch.awayId]), false)
                        );
                    });
                    setHomeAP(prev => Math.min(prev + 1, 15));
                    setMatchPhase('INITIATIVE');
                }, 800);
            }
        }
        return () => clearTimeout(timer);
    }, [gameStage, matchState, matchPhase, activeMatch, allRosters]);

    return (
        <div style={{ backgroundColor: '#111', color: 'white', minHeight: '100vh', padding: '20px', fontFamily: 'monospace' }}>
            {gameStage === 'SELECT_TEAM' && (
                <div style={{ textAlign: 'center' }}>
                    <h1>CHOOSE YOUR CLUB</h1>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginTop: '40px' }}>
                        {TEAMS_DATA.map(team => (
                            <div key={team.id} onClick={() => setGameStage('DRAFT')}
                                style={{ background: team.primary, padding: '40px 10px', cursor: 'pointer', border: `4px solid ${team.secondary}`, borderRadius: '8px', color: getContrastingColor(team.primary) }}>
                                <h2>{team.name}</h2>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {gameStage === 'DRAFT' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: '#222', padding: '10px 20px' }}>
                        <h3>{getTurnOwner(currentPick) === 0 ? "YOUR PICK" : "AI PICKING..."}</h3>
                        <h3>{currentPick} / 80</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px', marginTop: '20px' }}>
                        {playerPool.filter(p => !p.isDrafted).slice(0, 30).map(p => (
                            <button key={p.id} onClick={() => handlePick(p.id)} style={{ padding: '10px', background: '#333', color: 'white' }}>
                                {p.name} <br /> <small>{p.position} ({p.tier})</small>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {gameStage === 'GROUPS' && groups && (
                <div style={{ textAlign: 'center' }}>
                    <h1>STANDINGS</h1>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
                        {['groupA', 'groupB'].map(gn => (
                            <div key={gn} style={{ width: '300px', background: '#222', padding: '10px' }}>
                                <h3>{gn.toUpperCase()}</h3>
                                {sortStandings(groups[gn]).map(t => (
                                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px' }}>
                                        <span>{t.name}</span>
                                        <span>{t.points}pts</span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={() => {
                            const user = groups.groupA.find(t => t.id === 0);
                            if (user.mp < 3) startMatch(0, groups.groupA.filter(t => t.id !== 0)[user.mp].id, 'group');
                            else { setBracket(generateKnockoutStages(groups.groupA, groups.groupB)); setGameStage('BRACKET'); }
                        }}
                        style={{ marginTop: '20px', padding: '10px 20px', background: '#7b00ff', color: 'white' }}
                    >
                        NEXT STAGE
                    </button>
                </div>
            )}

            {gameStage === 'BRACKET' && bracket && (
                <div style={{ textAlign: 'center' }}>
                    <h1>KNOCKOUT STAGE</h1>
                    {bracket.qf.map((m, i) => (
                        <div key={i} style={{ padding: '10px', background: '#222', margin: '10px auto', width: '300px' }}>
                            {m.home.name} vs {m.away.name}
                            {(m.home.id === 0 || m.away.id === 0) && (
                                <button onClick={() => startMatch(m.home.id, m.away.id, 'knockout')}>PLAY</button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {gameStage === 'LIVE_MATCH' && matchState && (
                <div style={{ textAlign: 'center', maxWidth: '1200px', margin: '0 auto' }}>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '60px' }}>
                            <div style={{ textAlign: 'right', minWidth: '220px' }}>
                                <h2 style={{ margin: 0, color: TEAMS_DATA[activeMatch.homeId].secondary, textTransform: 'uppercase' }}>{TEAMS_DATA[activeMatch.homeId].name}</h2>
                                <div style={{ minHeight: '40px' }}>
                                    {matchState.goals.filter(g => g.teamId === activeMatch.homeId).map((g, i) => (
                                        <div key={i} style={{ fontSize: '12px', color: '#aaa' }}>⚽ {g.playerName} {g.time}'</div>
                                    ))}
                                </div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '3.5rem', fontWeight: '900' }}>{matchState.homeScore} — {matchState.awayScore}</div>
                                <div style={{ fontSize: '1.2rem', color: '#7b00ff' }}>TIME: {matchState.clock}'</div>
                            </div>
                            <div style={{ textAlign: 'left', minWidth: '220px' }}>
                                <h2 style={{ margin: 0, color: '#fff', textTransform: 'uppercase' }}>{TEAMS_DATA[activeMatch.awayId].name}</h2>
                                <div style={{ minHeight: '40px' }}>
                                    {matchState.goals.filter(g => g.teamId === activeMatch.awayId).map((g, i) => (
                                        <div key={i} style={{ fontSize: '12px', color: '#aaa' }}>⚽ {g.playerName} {g.time}'</div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'start', gap: '20px' }}>
                        <div style={{ width: '220px', textAlign: 'right', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '4px', borderRight: `4px solid ${TEAMS_DATA[activeMatch.homeId].secondary}` }}>
                            {getActiveLineup(allRosters[activeMatch.homeId]).map(p => (
                                <div key={p.id} style={{ fontSize: '12px', margin: '6px 0', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                    <span style={{ color: '#888' }}>{p.position.charAt(0)}</span>
                                    <span style={{ fontWeight: 'bold' }}>{p.name}</span>
                                    <span style={{ minWidth: '35px', color: (p.stamina / (p.maxStamina || 100)) < 0.3 ? '#ff4444' : '#44ff44' }}>
                                        {Math.round((p.stamina / (p.maxStamina || 100)) * 100)}%
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div style={{ position: 'relative', width: '800px', height: '400px', background: '#2e7d32', border: '4px solid white', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', left: '50%', height: '100%', borderLeft: '2px solid rgba(255,255,255,0.5)' }} />
                            <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '120px', height: '120px', border: '2px solid rgba(255,255,255,0.5)', borderRadius: '50%' }} />
                            <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '4px', height: '4px', background: 'white', borderRadius: '50%' }} />

                            <div style={{ position: 'absolute', left: 0, top: '20%', width: '132px', height: '60%', border: '2px solid rgba(255,255,255,0.6)', borderLeft: 0 }} />
                            <div style={{ position: 'absolute', left: 0, top: '35%', width: '44px', height: '30%', border: '2px solid rgba(255,255,255,0.6)', borderLeft: 0 }} />
                            <div style={{ position: 'absolute', left: '-10px', top: '40%', width: '12px', height: '20%', border: '4px solid white', borderLeft: 0, borderRadius: '2px' }} />

                            <div style={{ position: 'absolute', right: 0, top: '20%', width: '132px', height: '60%', border: '2px solid rgba(255,255,255,0.6)', borderRight: 0 }} />
                            <div style={{ position: 'absolute', right: 0, top: '35%', width: '44px', height: '30%', border: '2px solid rgba(255,255,255,0.6)', borderRight: 0 }} />
                            <div style={{ position: 'absolute', right: '-10px', top: '40%', width: '12px', height: '20%', border: '4px solid white', borderRight: 0, borderRadius: '2px' }} />

                            {['HOME', 'AWAY'].map(side => {
                                const tId = side === 'HOME' ? activeMatch.homeId : activeMatch.awayId;
                                return getActiveLineup(allRosters[tId]).map((p, i) => {
                                    const coords = getDynamicCoords(side, p.position, i, matchState.ballZone);
                                    return (
                                        <div key={p.id} style={{
                                            position: 'absolute', left: coords.left, top: coords.top, width: '16px', height: '16px',
                                            background: side === 'HOME' ? TEAMS_DATA[tId].secondary : '#fff',
                                            borderRadius: '50%', border: `2px solid ${side === 'HOME' ? '#fff' : TEAMS_DATA[tId].primary}`,
                                            zIndex: 2, transition: 'all 0.6s ease', transform: 'translate(-50%, -50%)'
                                        }} />
                                    );
                                });
                            })}
                            <div style={{ position: 'absolute', left: `${(matchState.ballZone - 1) * 20 + 10}%`, top: '50%', fontSize: '22px', transform: 'translate(-50%, -50%)', zIndex: 3, transition: 'all 0.8s' }}>⚽</div>
                        </div>

                        <div style={{ width: '220px', textAlign: 'left', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '4px', borderLeft: `4px solid ${TEAMS_DATA[activeMatch.awayId].primary}` }}>
                            {getActiveLineup(allRosters[activeMatch.awayId]).map(p => (
                                <div key={p.id} style={{ fontSize: '12px', margin: '6px 0', display: 'flex', justifyContent: 'flex-start', gap: '8px' }}>
                                    <span style={{ minWidth: '35px', color: (p.stamina / (p.maxStamina || 100)) < 0.3 ? '#ff4444' : '#44ff44' }}>
                                        {Math.round((p.stamina / (p.maxStamina || 100)) * 100)}%
                                    </span>
                                    <span style={{ fontWeight: 'bold' }}>{p.name}</span>
                                    <span style={{ color: '#888' }}>{p.position.charAt(0)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginTop: '20px', minHeight: '200px' }}>
                        {matchState.isPaused && (
                            <div style={{ marginBottom: '20px' }}>
                                {matchState.clock === 45 ? (
                                    <button onClick={() => setMatchState(prev => ({ ...handleHalfTime(prev), isPaused: false }))} style={{ padding: '15px 40px', background: '#7b00ff', color: 'white', fontWeight: 'bold' }}>
                                        START 2ND HALF
                                    </button>
                                ) : (
                                    <button onClick={finishMatch} style={{ padding: '15px 40px', background: '#7b00ff', color: 'white', fontWeight: 'bold' }}>
                                        RETURN TO TOURNAMENT
                                    </button>
                                )}
                            </div>
                        )}

                        {activePlayer && matchPhase === 'ACTION' && !matchState.isPaused && (
                            <div>
                                <ActionMenu
                                    activePlayer={activePlayer}
                                    teamAP={homeAP}
                                    onSelectAction={(move) => {
                                        if (activePlayer.stamina >= move.stamina) {
                                            const result = resolveMove(activePlayer, move.attr);
                                            if (result.success && move.name.includes("Finish")) {
                                                setMatchState(prev => ({
                                                    ...prev, homeScore: prev.homeScore + 1, ballZone: 3, possession: 'away',
                                                    goals: [...(prev.goals || []), { playerName: activePlayer.name, time: prev.clock, teamId: activeMatch.homeId }]
                                                }));
                                            }
                                            handleActionSelect(move);
                                        } else {
                                            addToLog(`${activePlayer.name} is too exhausted!`);
                                        }
                                    }}
                                />
                                <button
                                    onClick={() => {
                                        addToLog(`${activePlayer.name} catches their breath. Turn ends.`);
                                        setAllRosters(prev => {
                                            const teamId = activeMatch.homeId;
                                            const updated = prev[teamId].map(p =>
                                                p.id === activePlayer.id ? { ...p, stamina: Math.min(p.maxStamina, p.stamina + 5) } : p
                                            );
                                            return { ...prev, [teamId]: updated };
                                        });
                                        setMatchPhase('INITIATIVE');
                                    }}
                                    style={{ marginTop: '10px', padding: '10px 20px', background: '#444', color: 'white' }}
                                >
                                    SKIP TURN / RECOVER
                                </button>
                            </div>
                        )}

                        <div style={{ width: '600px', margin: '20px auto', background: '#000', padding: '15px', border: '1px solid #333' }}>
                            {matchLog.map((m, i) => <div key={i} style={{ color: i === 0 ? '#7b00ff' : '#666' }}>{m}</div>)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SoccerSim;