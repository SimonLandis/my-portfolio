// src/logic/duelEngine.js

const rollDice = (sides) => {
    if (!sides || sides < 1) return 0;
    return Math.floor(Math.random() * sides) + 1;
};

/**
 * Resolves a matchup between an attacker and a defender.
 * Formula: (Base + Prof + Luck) vs (Base + Prof + Luck)
 */
export const resolveDuel = (attacker, defender) => {
    // Attack Roll
    const atkBase = rollDice(attacker.baseDie);
    const atkProf = rollDice(attacker.profDie || 0);
    const atkLuck = rollDice(attacker.luck || 0);
    const totalAtk = atkBase + atkProf + atkLuck;

    // Defense Roll
    const defBase = rollDice(defender.baseDie);
    const defProf = rollDice(defender.profDie || 0);
    const defLuck = rollDice(defender.luck || 0);
    const totalDef = defBase + defProf + defLuck;

    return {
        isGoal: totalAtk > totalDef,
        atkScore: totalAtk,
        defScore: totalDef,
        breakdown: {
            atk: `(${atkBase}+${atkProf}+${atkLuck})`,
            def: `(${defBase}+${defProf}+${defLuck})`
        }
    };
};