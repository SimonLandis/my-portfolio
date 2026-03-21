import { lastNames, legends } from './playerData';

export const generatePool = () => {
    const pool = [];

    // 1. Add our 3 hard-coded legends
    pool.push(...legends.map((l, i) => ({ ...l, id: `p-00${i + 1}`, isDrafted: false })));

    // 2. Add the Random Elite Midfielder
    const midInitial = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const midName = lastNames[Math.floor(Math.random() * lastNames.length)];
    pool.push({
        id: 'p-004',
        name: `${midInitial}. ${midName}`,
        position: "Midfielder",
        baseDie: 10,
        profDie: 10,
        luck: 7,
        tier: "Elite",
        isDrafted: false
    });

    // 3. Generate the remaining 96 players
    for (let i = 5; i <= 100; i++) {
        const isPro = Math.random() > 0.75; // 25% Pros, 75% Rookies
        const initial = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

        pool.push({
            id: `p-${i.toString().padStart(3, '0')}`,
            name: `${initial}. ${lastName}`,
            position: ["Striker", "Midfielder", "Defender", "Keeper"][Math.floor(Math.random() * 4)],
            tier: isPro ? "Pro" : "Rookie",
            baseDie: isPro ? 8 : 6,   // Pros have higher floor
            profDie: isPro ? 6 : 0,   // Only Pros get the extra Expertise Die
            luck: Math.floor(Math.random() * 10) + 1,
            isDrafted: false
        });
    }

    return pool;
};