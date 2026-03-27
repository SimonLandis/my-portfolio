/**
 * src/logic/duelEngine.js
 * Core dice-rolling logic for 5-zone match resolutions.
 */

const rollDice = (sides) => {
    // Ensure we handle decimals by rounding, as power calculations 
    // in lineup.js might return 0.5 values.
    const sidesInt = Math.round(sides);
    if (!sidesInt || sidesInt < 1) return 0;
    return Math.floor(Math.random() * sidesInt) + 1;
};

/**
 * Resolves a battle in any of the 5 zones.
 * It compares the team with possession (Attacker) vs the team without (Defender).
 */
export const resolveZoneDuel = (attackerPower, defenderPower) => {
    // Attack Roll: Sum of Base, Proficiency, and Luck
    const atkBase = rollDice(attackerPower.baseDie);
    const atkProf = rollDice(attackerPower.profDie || 0);
    const atkLuck = rollDice(attackerPower.luck || 0);
    const totalAtk = atkBase + atkProf + atkLuck;

    // Defense Roll: Sum of Base, Proficiency, and Luck
    const defBase = rollDice(defenderPower.baseDie);
    const defProf = rollDice(defenderPower.profDie || 0);
    const defLuck = rollDice(defenderPower.luck || 0);
    const totalDef = defBase + defProf + defLuck;

    // A Goal only happens if the Attacker wins AND they are in the opponent's Goal Box.
    // (The actual 'isGoal' check happens in matchEngine.js based on zone ID)

    return {
        winner: totalAtk > totalDef ? 'attacker' : 'defender',
        isGoal: totalAtk > totalDef, // matchEngine will confirm if this is a point or just an advance
        atkScore: totalAtk,
        defScore: totalDef,
        breakdown: {
            atk: `${atkBase}b + ${atkProf}p + ${atkLuck}l`,
            def: `${defBase}b + ${defProf}p + ${defLuck}l`
        }
    };
};

/**
 * Midfield Duel remains for kickoffs or specific neutral-zone transitions.
 */
export const resolveMidfieldDuel = (homePower, awayPower) => {
    const homeRoll = rollDice(homePower.baseDie);
    const awayRoll = rollDice(awayPower.baseDie);

    return {
        winner: homeRoll > awayRoll ? 'home' : (awayRoll > homeRoll ? 'away' : 'draw'),
        homeRoll,
        awayRoll
    };
};