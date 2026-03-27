/**
 * OSR Dice Rolling Utility
 */

export const rollD20 = () => Math.floor(Math.random() * 20) + 1;

/**
 * Resolves a tactical move check.
 * @param {Object} player - The player object performing the move.
 * @param {string} attrKey - 'pow', 'fin', or 'foc'.
 * @param {number} difficultyMod - Optional modifier (e.g., +2 for a difficult shot).
 * @returns {Object} - Result of the roll.
 */
export const resolveMove = (player, attrKey, difficultyMod = 0) => {
    const roll = rollD20();
    const target = player.attributes[attrKey] - difficultyMod;

    // Critical Success
    if (roll === 1) return { success: true, crit: true, msg: "CRITICAL SUCCESS!" };

    // Critical Failure
    if (roll === 2) return { success: false, crit: true, msg: "CRITICAL FUMBLE!" };

    // Standard Success (Roll Under)
    if (roll <= target) {
        return { success: true, crit: false, roll, target };
    }

    // Luck Check: If the player has luck points, they can attempt to "save"
    if (player.luck > 0) {
        // This is a logic hook for later: "Would you like to spend 1 Luck to re-roll?"
        return { success: false, canUseLuck: true, roll, target };
    }

    return { success: false, crit: false, roll, target };
};

/**
 * Initiative Roll: 1d20 + Focus
 */
export const rollInitiative = (team) => {
    const leadFoc = Math.max(...team.map(p => p.attributes.foc));
    return rollD20() + Math.floor(leadFoc / 4); // OSR style modifier
};