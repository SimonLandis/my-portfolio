/**
 * src/logic/tournamentLogic.js
 * The Master Engine for Groups, Seeded Knockouts, and PK Shootouts.
 */
import { getActiveLineup } from './lineup';

/**
 * 1. INITIALIZATION: Split 8 teams into 2 Groups
 */
export const createGroups = (teams) => {
    const shuffled = [...teams].sort(() => 0.5 - Math.random());
    return {
        groupA: shuffled.slice(0, 4).map(t => ({
            ...t, points: 0, gf: 0, ga: 0, gd: 0, mp: 0, roster: t.roster || []
        })),
        groupB: shuffled.slice(4, 8).map(t => ({
            ...t, points: 0, gf: 0, ga: 0, gd: 0, mp: 0, roster: t.roster || []
        }))
    };
};

/**
 * 2. STANDINGS: Sort by Points -> GD -> GF
 */
export const sortStandings = (group) => {
    return [...group].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.gd !== a.gd) return b.gd - a.gd;
        return b.gf - a.gf;
    });
};

/**
 * 3. QUICK SIM: Upgraded logic for Non-User games
 * Uses a team's actual roster power to influence the score.
 */
export const quickSimMatch = (homeRoster, awayRoster) => {
    const homeLineup = getActiveLineup(homeRoster);
    const awayLineup = getActiveLineup(awayRoster);

    const calcPower = (l) => l.reduce((acc, p) => acc + (p.baseDie || 0) + (p.profDie || 0), 0);

    // Add a bit of "Match Day" randomness
    const homePower = calcPower(homeLineup) + (Math.random() * 12);
    const awayPower = calcPower(awayLineup) + (Math.random() * 12);

    const homeScore = Math.max(0, Math.floor((homePower - awayPower) / 6) + Math.floor(Math.random() * 3));
    const awayScore = Math.max(0, Math.floor((awayPower - homePower) / 6) + Math.floor(Math.random() * 3));

    return { homeScore, awayScore };
};

/**
 * 4. ADVANCEMENT: Create the Bracket with the #1 Seed BYE
 */
export const generateKnockoutStages = (groupA, groupB) => {
    const sA = sortStandings(groupA);
    const sB = sortStandings(groupB);

    return {
        qf: [
            { id: 'qf1', home: sA[1], away: sB[2], played: false, homeScore: 0, awayScore: 0 }, // A2 vs B3
            { id: 'qf2', home: sB[1], away: sA[2], played: false, homeScore: 0, awayScore: 0 }  // B2 vs A3
        ],
        sf: [
            { id: 'sf1', home: sA[0], away: null, isBye: true, played: false }, // A1 waits for QF2 Winner
            { id: 'sf2', home: sB[0], away: null, isBye: true, played: false }  // B1 waits for QF1 Winner
        ],
        final: { home: null, away: null, played: false }
    };
};

/**
 * 5. PK SHOOTOUT: Best of 5 then Sudden Death
 */
export const resolvePKShootout = (homeRoster, awayRoster) => {
    const homeLineup = getActiveLineup(homeRoster);
    const awayLineup = getActiveLineup(awayRoster);

    const homeKickers = homeLineup.filter(p => p.position !== 'GK');
    const awayKickers = awayLineup.filter(p => p.position !== 'GK');
    const homeGK = homeLineup.find(p => p.position === 'GK');
    const awayGK = awayLineup.find(p => p.position === 'GK');

    let hScore = 0, aScore = 0;

    // Simulates a penalty attempt (Higher Skill/Luck = Higher Chance)
    const attempt = (kicker, keeper) => {
        const kProb = (kicker?.baseDie || 6) + (kicker?.luck || 4);
        const gProb = (keeper?.baseDie || 6) + (keeper?.profDie || 4);
        return (Math.random() * kProb) > (Math.random() * gProb);
    };

    // Standard 5 rounds
    for (let i = 0; i < 5; i++) {
        if (attempt(homeKickers[i % homeKickers.length], awayGK)) hScore++;
        if (attempt(awayKickers[i % awayKickers.length], homeGK)) aScore++;
    }

    // Sudden Death
    let round = 5;
    while (hScore === aScore) {
        if (attempt(homeKickers[round % homeKickers.length], awayGK)) hScore++;
        if (attempt(awayKickers[round % awayKickers.length], homeGK)) aScore++;
        round++;
        if (round > 25) break; // Safety
    }

    return { hScore, aScore, winner: hScore > aScore ? 'home' : 'away' };
};