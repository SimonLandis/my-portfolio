/**
 * src/logic/matchEngine.js
 */

export const MATCH_CONFIG = {
    MAX_TICKS: 90,
    HALF_TIME: 45,
    GOAL_PROBABILITY: 0.15,
    STAMINA_RECOVERY: 0.5, // Passive recovery per tick
    STAMINA_BURN_PASSIVE: 0.2 // Small drain just for being on the pitch
};

export const playTick = (state, homeZoned, awayZoned) => {
    let { clock, ballZone, possession, homeScore, awayScore, lastEvent, goals } = state;
    const newGoals = [...(goals || [])];

    // 1. Advance Clock
    clock += 1;

    // 2. Identify Players in the current Action Zone
    const hInZone = homeZoned[ballZone] || [];
    const aInZone = awayZoned[ballZone] || [];

    // 3. Define Power with Stamina weighting
    // A player at 0% stamina now contributes significantly less power than one at 100%
    const calcPower = (players) => {
        if (!players || players.length === 0) return 0;
        return players.reduce((acc, p) => {
            const staminaMult = (p.stamina || 0) / 100;
            return acc + ((p.baseDie || 0) * (0.5 + (staminaMult * 0.5))) + (p.luck || 0);
        }, 0);
    };

    const getPosType = (pos) => {
        const p = pos?.toLowerCase() || "";
        if (p.includes("gk") || p.includes("keeper")) return "GK";
        if (p.includes("def")) return "DEF";
        if (p.includes("mid")) return "MID";
        if (p.includes("str")) return "STR";
        return "PLY";
    };

    // 4. THE HYBRID LOGIC
    // If it's HOME possession, we skip the engine's "Auto-Move" 
    // because the User handles this via the ActionMenu.
    if (possession === 'home') {
        lastEvent = "Waiting for tactical orders...";
    } else {
        // CPU (AWAY) LOGIC - The engine still controls the opposition
        const hPower = calcPower(hInZone) + (Math.random() * 5);
        const aPower = calcPower(aInZone) + (Math.random() * 8); // Slight CPU edge to keep it challenging

        if (aPower > hPower) {
            // CPU successfully moves the ball
            if (ballZone > 1) {
                ballZone -= 1;
                lastEvent = `Opposition pushes the ball back into Zone ${ballZone}.`;
            } else {
                // CPU Scoring Attempt
                if (Math.random() < MATCH_CONFIG.GOAL_PROBABILITY) {
                    const attackers = aInZone.filter(p => getPosType(p.position) === 'STR');
                    const scorer = (attackers.length > 0 ? attackers[0].name : "Opposition");
                    awayScore += 1;
                    ballZone = 3;
                    possession = 'home'; // Reset possession to user after goal
                    lastEvent = `GOAL! ${scorer} scores for the opposition!`;
                    newGoals.push({ teamId: 'away', playerName: scorer, time: clock });
                } else {
                    lastEvent = "Massive save! You've cleared the ball.";
                    ballZone = 2;
                    possession = 'home';
                }
            }
        } else {
            lastEvent = "Your defense is holding firm!";
        }
    }

    return {
        ...state,
        clock,
        ballZone,
        possession,
        homeScore,
        awayScore,
        lastEvent,
        goals: newGoals
    };
};

export const handleHalfTime = (state) => ({
    ...state,
    half: 2,
    ballZone: 3,
    lastEvent: "Second half starts!",
    isPaused: false,
    // Optional: Give everyone a small halftime rest boost
});