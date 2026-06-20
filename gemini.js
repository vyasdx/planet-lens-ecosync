/* =====================================================================
   Planet Lens — Gemini insight engine (server-side)
   Calls Google Gemini 1.5 Flash to turn a user's carbon profile into
   personalized, quantified reduction suggestions. Engineered for
   production reliability: a strict JSON response schema, low temperature
   for factual output, an 8s timeout, and a DETERMINISTIC fallback engine
   so the feature never hard-fails. The API key stays server-side only.
   ===================================================================== */
'use strict';

const MODEL = 'gemini-2.5-flash-lite';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const SYSTEM_INSTRUCTION =
    "You are Planet Lens, a precise carbon-reduction advisor. Given a user's annual carbon " +
    "profile, return exactly 3 personalized, specific, and realistic actions that target their " +
    "largest emission sources. Each suggestion must be concrete (not generic advice) and quantify " +
    "the estimated annual CO2e saving in kilograms. Be encouraging, factual, and never exaggerate.";

// Strict structured-output contract — Gemini must match this schema.
const RESPONSE_SCHEMA = {
    type: 'ARRAY',
    items: {
        type: 'OBJECT',
        properties: {
            category: { type: 'STRING' },
            suggestion: { type: 'STRING' },
            estimated_saving_kg: { type: 'NUMBER' }
        },
        required: ['category', 'suggestion', 'estimated_saving_kg']
    }
};

/** Build the user-turn prompt from a carbon profile (pure, testable). */
function buildPrompt(profile) {
    profile = profile || {};
    const b = profile.breakdown || {};
    const rings = Array.isArray(profile.unlockedRings) ? profile.unlockedRings : [];
    return [
        `Region: ${profile.region || 'global'}`,
        `Total annual footprint: ${Number(profile.totalTons || 0).toFixed(2)} tonnes CO2e`,
        `Emission breakdown (tonnes/yr): transport ${num(b.transport)}, energy ${num(b.energy)}, diet ${num(b.diet)}, waste ${num(b.waste)}`,
        `Sustainability rings already active: ${rings.length ? rings.join(', ') : 'none'}`,
        `EcoPoints earned: ${profile.points || 0}`,
        '',
        'Return 3 suggestions as a JSON array. Prioritize the largest emission sources above.'
    ].join('\n');
}

function num(v) { return Number(v || 0).toFixed(2); }

/** Deterministic rule-based suggestions — used if Gemini is unavailable. */
function fallbackInsights(profile) {
    profile = profile || {};
    const b = profile.breakdown || {};
    const buckets = [
        { key: 'transport', category: 'Transport', suggestion: 'Replace 2 car trips per week with cycling, walking, or public transit.', factor: 0.18 },
        { key: 'energy', category: 'Energy', suggestion: 'Switch to LED lighting and unplug standby appliances; shift to a clean-energy tariff if available.', factor: 0.15 },
        { key: 'diet', category: 'Diet', suggestion: 'Adopt 3 plant-forward meals per week in place of red meat.', factor: 0.20 },
        { key: 'waste', category: 'Waste', suggestion: 'Compost food scraps and recycle consistently to cut landfill methane.', factor: 0.12 }
    ];
    return buckets
        .map(x => ({ ...x, tonnes: Number(b[x.key] || 0) }))
        .sort((a, z) => z.tonnes - a.tonnes)
        .slice(0, 3)
        .map(x => ({
            category: x.category,
            suggestion: x.suggestion,
            estimated_saving_kg: Math.max(10, Math.round(x.tonnes * x.factor * 1000))
        }));
}

/** Validate + coerce a parsed model response into our contract. */
function sanitize(arr) {
    if (!Array.isArray(arr)) return null;
    const out = arr
        .filter(o => o && typeof o.suggestion === 'string')
        .slice(0, 3)
        .map(o => ({
            category: String(o.category || 'General').slice(0, 40),
            suggestion: String(o.suggestion).slice(0, 280),
            estimated_saving_kg: Math.max(0, Math.round(Number(o.estimated_saving_kg) || 0))
        }));
    return out.length ? out : null;
}

/**
 * Generate insights. Tries Gemini; on missing key, timeout, or any error,
 * returns the deterministic fallback. Never throws.
 * @returns {Promise<{source:'gemini'|'fallback', insights:Array}>}
 */
async function generateInsights(profile) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || typeof fetch !== 'function') {
        return { source: 'fallback', insights: fallbackInsights(profile) };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
        const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(key)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
                contents: [{ role: 'user', parts: [{ text: buildPrompt(profile) }] }],
                generationConfig: {
                    temperature: 0.4,
                    topP: 0.9,
                    maxOutputTokens: 1000,
                    responseMimeType: 'application/json',
                    responseSchema: RESPONSE_SCHEMA
                }
            })
        });
        if (!res.ok) throw new Error('gemini http ' + res.status);
        const data = await res.json();
        const text = data && data.candidates && data.candidates[0] &&
            data.candidates[0].content && data.candidates[0].content.parts &&
            data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
        const parsed = sanitize(JSON.parse(text));
        if (!parsed) throw new Error('gemini empty/invalid');
        return { source: 'gemini', insights: parsed };
    } catch (e) {
        return { source: 'fallback', insights: fallbackInsights(profile) };
    } finally {
        clearTimeout(timer);
    }
}

module.exports = { generateInsights, buildPrompt, fallbackInsights, sanitize, RESPONSE_SCHEMA, MODEL };
