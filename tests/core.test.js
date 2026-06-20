'use strict';
// Unit tests for Planet Lens core carbon logic.
// Zero dependencies — run with: npm test  (Node 18+ built-in test runner)

const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../core.js');

test('regionalBaseline returns known reference values', () => {
    assert.equal(core.regionalBaseline('us'), 15.5);
    assert.equal(core.regionalBaseline('eu'), 6.5);
    assert.equal(core.regionalBaseline('in'), 1.9);
    assert.equal(core.regionalBaseline('global'), 4.8);
});

test('regionalBaseline falls back to global for unknown regions', () => {
    assert.equal(core.regionalBaseline('atlantis'), 4.8);
    assert.equal(core.regionalBaseline(undefined), 4.8);
});

test('rankForPoints maps thresholds correctly', () => {
    assert.equal(core.rankForPoints(0).name, 'Planeteer Cadet');
    assert.equal(core.rankForPoints(99).name, 'Planeteer Cadet');
    assert.equal(core.rankForPoints(100).name, 'Earth Ranger');
    assert.equal(core.rankForPoints(250).name, 'Eco Defender');
    assert.equal(core.rankForPoints(450).name, 'Planet Guardian');
    assert.equal(core.rankForPoints(700).name, 'Captain Planet Summoner');
    assert.equal(core.rankForPoints(99999).name, 'Captain Planet Summoner');
});

test('computeFootprint: a higher-impact lifestyle yields a larger footprint', () => {
    const green = { vehicle: 'none', fuel: 'none', carKm: 0, transit: 0, flights: 0, electricity: 100, cleanPct: 80, members: 2, diet: 'vegan', clothing: 0, electronics: 0 };
    const heavy = { vehicle: 'suv', fuel: 'diesel', carKm: 400, transit: 0, flights: 6, electricity: 600, cleanPct: 0, members: 1, diet: 'high-meat', clothing: 5, electronics: 3 };
    assert.ok(core.computeFootprint(heavy) > core.computeFootprint(green));
});

test('computeFootprint: increases monotonically with car distance', () => {
    const base = { vehicle: 'sedan', fuel: 'petrol', diet: 'medium-meat', members: 2, electricity: 250 };
    const low = core.computeFootprint({ ...base, carKm: 50 });
    const high = core.computeFootprint({ ...base, carKm: 500 });
    assert.ok(high > low);
});

test('computeFootprint: never returns below the 0.3t floor and tolerates empty input', () => {
    assert.ok(core.computeFootprint({}) >= 0.3);
    assert.ok(core.computeFootprint(undefined) >= 0.3);
});

test('computeFootprint: "none" vehicle removes car emissions', () => {
    const withCar = { vehicle: 'sedan', fuel: 'petrol', carKm: 300, diet: 'vegan', members: 2, electricity: 100 };
    const noCar = { ...withCar, vehicle: 'none', fuel: 'none' };
    assert.ok(core.computeFootprint(withCar) > core.computeFootprint(noCar));
});

test('projectedFootprint: unlocking rings reduces emissions', () => {
    const none = core.projectedFootprint({ region: 'us', unlockedRings: [] });
    const some = core.projectedFootprint({ region: 'us', unlockedRings: ['wind', 'earth'] });
    assert.equal(none, 15.5);
    assert.ok(some < none);
});

test('projectedFootprint: offsetting reduces emissions and never goes negative', () => {
    const noOffset = core.projectedFootprint({ region: 'in', unlockedRings: [] });
    const offset = core.projectedFootprint({ region: 'in', unlockedRings: [], offsetAmount: 50 });
    assert.ok(offset < noOffset);
    const maxed = core.projectedFootprint({ region: 'in', unlockedRings: ['earth', 'fire', 'wind', 'water', 'heart'], offsetAmount: 100 });
    assert.ok(maxed >= 0);
});

test('projectedFootprint: personal override takes precedence over region', () => {
    const v = core.projectedFootprint({ region: 'global', baseCarbonOverride: 9.0, unlockedRings: [] });
    assert.equal(v, 9.0);
});

test('planetHealth: 20% per ring, capped at 100', () => {
    assert.equal(core.planetHealth([]), 0);
    assert.equal(core.planetHealth(['earth']), 20);
    assert.equal(core.planetHealth(['earth', 'fire', 'wind', 'water', 'heart']), 100);
});

test('escapeHTML neutralizes script-injection characters', () => {
    assert.equal(core.escapeHTML('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
    assert.equal(core.escapeHTML(`a & "b" 'c'`), 'a &amp; &quot;b&quot; &#39;c&#39;');
    assert.equal(core.escapeHTML('safe text'), 'safe text');
});

test('getYearWeekString returns a YYYY-Wn key', () => {
    const key = core.getYearWeekString(new Date('2026-06-21T00:00:00Z'));
    assert.match(key, /^\d{4}-W\d{1,2}$/);
});
