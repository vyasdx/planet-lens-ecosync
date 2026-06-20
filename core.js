/* =====================================================================
   Planet Lens — core carbon logic (pure, DOM-free, dependency-free)
   Shared by the browser app (window.PlanetLensCore) and the Node test
   suite (module.exports). No DOM, no globals, fully unit-testable.
   ===================================================================== */
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api; // Node / tests
    if (typeof window !== 'undefined') window.PlanetLensCore = api;             // browser app
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Real-world reference annual footprints (tonnes CO2e / person / year).
    const REGIONAL_BASELINES = { us: 15.5, eu: 6.5, in: 1.9, global: 4.8 };

    // Per-ring weekly CO2 saving (kg) — annualized as kg*52/1000 tonnes.
    const RING_WEEKLY_KG = { earth: 12, fire: 8, wind: 15, water: 10, heart: 14 };

    const RANKS = [
        { name: 'Planeteer Cadet', threshold: 0, icon: '🌱' },
        { name: 'Earth Ranger', threshold: 100, icon: '✂️' },
        { name: 'Eco Defender', threshold: 250, icon: '🛡️' },
        { name: 'Planet Guardian', threshold: 450, icon: '🌍' },
        { name: 'Captain Planet Summoner', threshold: 700, icon: '🦸‍♂️' }
    ];

    // Lifestyle emission factors (used by the "My Lifestyle" calculator).
    const FUEL_KG_PER_KM = { petrol: 0.192, diesel: 0.171, hybrid: 0.11, ev: 0.05, none: 0 };
    const VEHICLE_MULT = { sedan: 1.0, suv: 1.4, hatchback: 0.85, ev: 1.0, none: 0 };
    const DIET_TONNES = { vegan: 1.5, vegetarian: 1.7, 'low-meat': 2.5, 'medium-meat': 3.3, 'high-meat': 4.7 };

    /** Regional baseline footprint (tonnes/yr); falls back to global average. */
    function regionalBaseline(region) {
        return REGIONAL_BASELINES[region] != null ? REGIONAL_BASELINES[region] : REGIONAL_BASELINES.global;
    }

    /** Rank for a given EcoPoints total. */
    function rankForPoints(points) {
        let rank = RANKS[0];
        for (let i = 0; i < RANKS.length; i++) {
            if (points >= RANKS[i].threshold) rank = RANKS[i];
        }
        return rank;
    }

    /** Personal annual footprint (tonnes CO2e) from lifestyle inputs. */
    function computeFootprint(v) {
        v = v || {};
        const car = v.vehicle === 'none'
            ? 0
            : ((v.carKm || 0) * 52 * (FUEL_KG_PER_KM[v.fuel] != null ? FUEL_KG_PER_KM[v.fuel] : 0.19) * (VEHICLE_MULT[v.vehicle] != null ? VEHICLE_MULT[v.vehicle] : 1)) / 1000;
        const transit = ((v.transit || 0) * 52 * 1.5) / 1000;
        const flights = (v.flights || 0) * 0.5;
        const members = Math.max(1, v.members || 1);
        const elec = (((v.electricity || 0) * 12 * 0.42 * (1 - ((v.cleanPct || 0) / 100))) / 1000) / members;
        const diet = DIET_TONNES[v.diet] != null ? DIET_TONNES[v.diet] : 3.0;
        const goods = ((v.clothing || 0) * 0.1) + ((v.electronics || 0) * 0.3);
        return Math.max(0.3, car + transit + flights + elec + diet + goods);
    }

    /**
     * Projected annual footprint after ring reductions + offsets.
     * Mirrors the app's carbon engine. Never returns a negative number.
     */
    function projectedFootprint(opts) {
        opts = opts || {};
        const base = (typeof opts.baseCarbonOverride === 'number' && opts.baseCarbonOverride > 0)
            ? opts.baseCarbonOverride
            : regionalBaseline(opts.region);
        const rings = Array.isArray(opts.unlockedRings) ? opts.unlockedRings : [];
        let ringReductions = 0;
        rings.forEach(r => { if (RING_WEEKLY_KG[r]) ringReductions += (RING_WEEKLY_KG[r] * 52) / 1000; });
        const offset = base * ((opts.offsetAmount || 0) / 100);
        return Math.max(0, base - ringReductions - offset);
    }

    /** Planet health % = 20 per unlocked ring (0–100). */
    function planetHealth(unlockedRings) {
        const n = Array.isArray(unlockedRings) ? unlockedRings.length : 0;
        return Math.min(100, n * 20);
    }

    /** EcoPoints awarded for a given carbon-offset percentage. */
    function offsetPoints(offsetAmount) {
        return Math.round(Math.max(0, Math.min(100, offsetAmount || 0)) / 2);
    }

    /** Your footprint as a percentage of the regional average (lower is better). */
    function comparisonPct(footprint, regionAvg) {
        if (!regionAvg) return 0;
        return Math.round((footprint / regionAvg) * 100);
    }

    /** Mature trees needed to offset an annual footprint (~21 kg CO2/tree/yr). */
    function treesToOffset(tonnes) {
        return Math.max(0, Math.round((tonnes * 1000) / 21));
    }

    /** Escape user-supplied text before rendering (XSS-safe). */
    function escapeHTML(str) {
        return String(str).replace(/[&<>'"]/g, tag => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[tag] || tag));
    }

    /** ISO-style "YYYY-Wn" week key for daily/weekly/monthly resets. */
    function getYearWeekString(d) {
        const t = new Date(d.getTime());
        t.setDate(t.getDate() + 4 - (t.getDay() || 7));
        const year = t.getFullYear();
        const startOfYear = new Date(year, 0, 1);
        const week = Math.ceil((((t - startOfYear) / 86400000) + 1) / 7);
        return `${year}-W${week}`;
    }

    return {
        REGIONAL_BASELINES, RING_WEEKLY_KG, RANKS,
        regionalBaseline, rankForPoints, computeFootprint,
        projectedFootprint, planetHealth, offsetPoints, comparisonPct,
        treesToOffset, escapeHTML, getYearWeekString
    };
});
