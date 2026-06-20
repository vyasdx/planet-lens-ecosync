'use strict';
// Tests for the server-side Gemini insight engine (pure helpers + fallback path).
// No network calls — generateInsights falls back deterministically with no API key.

const test = require('node:test');
const assert = require('node:assert/strict');
const gemini = require('../gemini.js');

const PROFILE = {
    region: 'us',
    totalTons: 12.4,
    breakdown: { transport: 5.1, energy: 3.2, diet: 2.8, waste: 1.3 },
    unlockedRings: ['wind'],
    points: 120
};

test('buildPrompt includes the key profile facts', () => {
    const p = gemini.buildPrompt(PROFILE);
    assert.match(p, /Region: us/);
    assert.match(p, /12\.40 tonnes/);
    assert.match(p, /transport 5\.10/);
    assert.match(p, /wind/);
    assert.match(p, /JSON array/);
});

test('buildPrompt tolerates an empty profile', () => {
    const p = gemini.buildPrompt({});
    assert.match(p, /Region: global/);
    assert.match(p, /0\.00 tonnes/);
});

test('fallbackInsights returns 3 schema-shaped suggestions', () => {
    const out = gemini.fallbackInsights(PROFILE);
    assert.equal(out.length, 3);
    for (const o of out) {
        assert.equal(typeof o.category, 'string');
        assert.equal(typeof o.suggestion, 'string');
        assert.equal(typeof o.estimated_saving_kg, 'number');
        assert.ok(o.estimated_saving_kg >= 10);
    }
});

test('fallbackInsights prioritizes the largest emission source', () => {
    const out = gemini.fallbackInsights(PROFILE);
    assert.equal(out[0].category, 'Transport'); // transport is the biggest bucket here
});

test('sanitize coerces and caps a messy model response', () => {
    const out = gemini.sanitize([
        { category: 'Diet', suggestion: 'Eat more plants', estimated_saving_kg: '300.7' },
        { category: 'X', suggestion: 'Y', estimated_saving_kg: -5 },
        { nope: true },
        { category: 'Z', suggestion: 'W', estimated_saving_kg: 10 },
        { category: 'Extra', suggestion: 'too many', estimated_saving_kg: 1 }
    ]);
    assert.equal(out.length, 3); // capped at 3, junk filtered
    assert.equal(out[0].estimated_saving_kg, 301); // rounded
    assert.equal(out[1].estimated_saving_kg, 0); // negative clamped
});

test('sanitize rejects non-arrays / empties', () => {
    assert.equal(gemini.sanitize(null), null);
    assert.equal(gemini.sanitize([]), null);
    assert.equal(gemini.sanitize([{ junk: 1 }]), null);
});

test('generateInsights falls back gracefully with no API key (never throws)', async () => {
    delete process.env.GEMINI_API_KEY;
    const result = await gemini.generateInsights(PROFILE);
    assert.equal(result.source, 'fallback');
    assert.equal(result.insights.length, 3);
});
