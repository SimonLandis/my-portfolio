/**
 * MOVE_SETS: The "Spellbook" for each position.
 */
export const MOVE_SETS = {
    Keeper: [
        { id: 'distribute', name: 'Safety Distribution', teamAP: 2, stamina: 5, type: 'pass', attr: 'fin' },
        { id: 'launch', name: 'The Long Launch', teamAP: 5, stamina: 15, type: 'long_ball', attr: 'pow' },
        { id: 'command', name: 'Command Area', teamAP: 4, stamina: 20, type: 'buff', attr: 'foc' }
    ],
    Defender: [
        { id: 'clear', name: 'Tactical Clearance', teamAP: 3, stamina: 10, type: 'clear', attr: 'pow' },
        { id: 'tackle', name: 'Hard Tackle', teamAP: 4, stamina: 15, type: 'defense', attr: 'pow' },
        { id: 'overlap', name: 'Overlap Run', teamAP: 5, stamina: 20, type: 'move', attr: 'foc' }
    ],
    Midfielder: [
        { id: 'through', name: 'Through Ball', teamAP: 4, stamina: 12, type: 'pass', attr: 'fin' },
        { id: 'switch', name: 'Switch Play', teamAP: 3, stamina: 8, type: 'possession', attr: 'foc' },
        { id: 'burst', name: 'Box-to-Box Burst', teamAP: 5, stamina: 25, type: 'move', attr: 'foc' }
    ],
    Striker: [
        { id: 'finish', name: 'Clinical Finish', teamAP: 5, stamina: 15, type: 'shot', attr: 'fin' },
        { id: 'feint', name: 'Dribble Feint', teamAP: 3, stamina: 10, type: 'dribble', attr: 'fin' },
        { id: 'acrobatic', name: 'Acrobatic Effort', teamAP: 7, stamina: 35, type: 'power_shot', attr: 'pow' }
    ]
};

// PRE-DEFINED HERO CHARACTERS
export const legends = [
    {
        id: 'L1', name: "J. Danger", position: "Striker", tier: "S",
        attributes: { pow: 18, fin: 17, foc: 16 }, stamina: 110, maxStamina: 110,
        homeZone: 4, moves: MOVE_SETS.Striker, luck: 10
    },
    {
        id: 'L2', name: "M. Buzz", position: "Keeper", tier: "S",
        attributes: { pow: 16, fin: 18, foc: 17 }, stamina: 110, maxStamina: 110,
        homeZone: 1, moves: MOVE_SETS.Keeper, luck: 9
    },
    {
        id: 'L3', name: "D. O'Malley", position: "Defender", tier: "S",
        attributes: { pow: 18, fin: 16, foc: 18 }, stamina: 110, maxStamina: 110,
        homeZone: 2, moves: MOVE_SETS.Defender, luck: 8
    }
];

const TIER_CONFIG = {
    'S': { range: [16, 18], stamina: 100 },
    'A': { range: [14, 15], stamina: 90 },
    'B': { range: [11, 13], stamina: 80 },
    'C': { range: [8, 10], stamina: 70 },
    'D': { range: [5, 7], stamina: 60 }
};

const FIRST_NAMES = ["Klaus", "Santi", "Bastian", "Luca", "Malik", "Hugo", "Arlo", "Javi", "Mika", "Soren"];
const LAST_NAMES = ["Vance", "Kross", "Sterling", "Lobo", "Dante", "Grier", "Hale", "Nash", "Zane", "Reed"];

export const generatePool = (count = 120) => {
    const positions = ['Keeper', 'Defender', 'Midfielder', 'Striker'];
    const tiers = ['S', 'A', 'B', 'C', 'D'];

    return Array.from({ length: count }, (_, i) => {
        const tier = tiers[Math.floor(Math.random() * tiers.length)];
        const pos = positions[Math.floor(Math.random() * positions.length)];
        const config = TIER_CONFIG[tier];

        const fName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
        const lName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
        const roll = () => Math.floor(Math.random() * (config.range[1] - config.range[0] + 1)) + config.range[0];

        return {
            id: i,
            name: `${fName} ${lName}`,
            position: pos,
            tier: tier,
            attributes: { pow: roll(), fin: roll(), foc: roll() },
            stamina: config.stamina,
            maxStamina: config.stamina,
            cooldown: 0,
            isDrafted: false,
            homeZone: pos === 'Keeper' ? 1 : pos === 'Defender' ? 2 : pos === 'Midfielder' ? 3 : 4,
            currentZone: pos === 'Keeper' ? 1 : pos === 'Defender' ? 2 : pos === 'Midfielder' ? 3 : 4,
            moves: MOVE_SETS[pos]
        };
    });
};