/**
 * src/logic/lineup.js
 */

export const getActiveLineup = (roster) => {
    if (!roster || roster.length === 0) return [];

    const starters = [];
    // Sort by baseDie so we pick the best players first
    const sorted = [...roster].sort((a, b) => (b.baseDie || 0) - (a.baseDie || 0));

    // Helper to handle both "STR" and "Striker" naming conventions
    const isPos = (player, pos) => {
        const p = player.position.toLowerCase();
        if (pos === 'GK') return p === 'gk' || p === 'keeper';
        if (pos === 'DEF') return p === 'def' || p === 'defender';
        if (pos === 'MID') return p === 'mid' || p === 'midfielder';
        if (pos === 'STR') return p === 'str' || p === 'striker';
        return false;
    };

    // 1. MANDATORY: Exactly 1 Keeper
    const mainGK = sorted.find(p => isPos(p, 'GK'));
    if (mainGK) starters.push(mainGK);

    // 2. MANDATORY: Min 1 of each field position
    ['DEF', 'MID', 'STR'].forEach(pos => {
        const found = sorted.find(p => isPos(p, pos) && !starters.includes(p));
        if (found) starters.push(found);
    });

    // 3. FILL: Remaining spots to reach 7 players total (with caps)
    for (const p of sorted) {
        if (starters.length >= 7) break;
        if (starters.includes(p)) continue;

        // RULE: No extra keepers
        if (isPos(p, 'GK')) continue;

        // NEW RULES: Caps to prevent overcrowding
        const defCount = starters.filter(s => isPos(s, 'DEF')).length;
        const midCount = starters.filter(s => isPos(s, 'MID')).length;
        const strCount = starters.filter(s => isPos(s, 'STR')).length;

        if (isPos(p, 'DEF') && defCount >= 3) continue; // Max 3 DEF
        if (isPos(p, 'MID') && midCount >= 3) continue; // Max 3 MID
        if (isPos(p, 'STR') && strCount >= 2) continue; // Max 2 STR

        starters.push(p);
    }

    return starters;
};

export const mapPlayersToZones = (starters, isHome) => {
    const zoned = { 1: [], 2: [], 3: [], 4: [], 5: [] };

    starters.forEach(p => {
        const pos = p.position.toLowerCase();
        const isGK = pos === 'gk' || pos === 'keeper';
        const isDEF = pos === 'def' || pos === 'defender';
        const isMID = pos === 'mid' || pos === 'midfielder';
        const isSTR = pos === 'str' || pos === 'striker';

        if (isHome) {
            if (isGK) [1].forEach(z => zoned[z].push(p));
            if (isDEF) [1, 2, 3].forEach(z => zoned[z].push(p));
            if (isMID) [2, 3, 4].forEach(z => zoned[z].push(p));
            if (isSTR) [3, 4, 5].forEach(z => zoned[z].push(p));
        } else {
            // Away team (Opposition) moves 5 -> 1
            if (isGK) [5].forEach(z => zoned[z].push(p));
            if (isDEF) [5, 4, 3].forEach(z => zoned[z].push(p));
            if (isMID) [4, 3, 2].forEach(z => zoned[z].push(p));
            if (isSTR) [3, 2, 1].forEach(z => zoned[z].push(p));
        }
    });
    return zoned;
};