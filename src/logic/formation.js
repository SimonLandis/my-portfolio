/**
 * src/logic/formation.js
 * Manages the 7v7 squad selection and spatial mapping for a 5-zone field.
 */

export const ZONES = {
    AWAY_GK_BOX: 1,
    AWAY_DEF_THIRD: 2,
    MIDFIELD: 3,
    HOME_DEF_THIRD: 4,
    HOME_GK_BOX: 5
};

/**
 * Selects exactly 7 players: 1 of each position (Pillars) 
 * plus the 3 best remaining (Fillers), capped at 3 per position.
 */
export const getActiveLineup = (roster) => {
    if (!roster || roster.length < 4) return [];

    const sortedRoster = [...roster].sort((a, b) => b.rating - a.rating);
    const activeLineup = [];
    const positions = ['GK', 'DF', 'MD', 'AT'];

    // 1. Secure Mandatory Pillars (1 of each)
    positions.forEach(pos => {
        const topInPos = sortedRoster.find(p => p.position === pos);
        if (topInPos) activeLineup.push(topInPos);
    });

    // 2. Identify remaining talent
    const remainingPool = sortedRoster.filter(
        p => !activeLineup.find(ap => ap.id === p.id)
    );

    // 3. Tactical Fill to 7 players (Max 3 per position)
    for (const player of remainingPool) {
        if (activeLineup.length >= 7) break;
        const posCount = activeLineup.filter(p => p.position === player.position).length;
        if (posCount < 3) activeLineup.push(player);
    }

    return activeLineup;
};

/**
 * Assigns each player a "Home Zone" based on their position.
 * This ensures players are spread across your 5 sections correctly.
 */
export const mapPlayersToZones = (lineup, isHomeTeam) => {
    return lineup.map(player => {
        let homeZone;

        if (isHomeTeam) {
            // Home team starts from the right (Zones 5, 4, 3)
            switch (player.position) {
                case 'GK': homeZone = ZONES.HOME_GK_BOX; break; // Zone 5
                case 'DF': homeZone = ZONES.HOME_DEF_THIRD; break; // Zone 4
                case 'MD': homeZone = ZONES.MIDFIELD; break; // Zone 3
                case 'AT': homeZone = ZONES.AWAY_DEF_THIRD; break; // Zone 2
                default: homeZone = ZONES.MIDFIELD;
            }
        } else {
            // Away team starts from the left (Zones 1, 2, 3)
            switch (player.position) {
                case 'GK': homeZone = ZONES.AWAY_GK_BOX; break; // Zone 1
                case 'DF': homeZone = ZONES.AWAY_DEF_THIRD; break; // Zone 2
                case 'MD': homeZone = ZONES.MIDFIELD; break; // Zone 3
                case 'AT': homeZone = ZONES.HOME_DEF_THIRD; break; // Zone 4
                default: homeZone = ZONES.MIDFIELD;
            }
        }

        return { ...player, homeZone };
    });
};

/**
 * Calculates total power for a specific zone based on which players are present.
 * In a 5-zone sim, players contribute most when the ball is in their "Home Zone".
 */
export const calculateZonePower = (lineupWithZones, currentBallZone) => {
    return lineupWithZones.reduce((acc, player) => {
        // Full power if in home zone, partial power if in adjacent zone
        const distance = Math.abs(player.homeZone - currentBallZone);
        const efficiency = distance === 0 ? 1 : (distance === 1 ? 0.5 : 0);

        return {
            baseDie: acc.baseDie + (player.baseDie * efficiency),
            profDie: acc.profDie + (player.profDie * efficiency),
            luck: acc.luck + (player.luck * efficiency)
        };
    }, { baseDie: 0, profDie: 0, luck: 0 });
};