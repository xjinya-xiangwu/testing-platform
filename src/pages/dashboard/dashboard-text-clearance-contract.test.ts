import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const dashboardLess = readFileSync(resolve(process.cwd(), 'src/pages/dashboard/dashboard.module.less'), 'utf8');
const panelLess = readFileSync(resolve(process.cwd(), 'src/pages/dashboard/components/dashboard-panels.module.less'), 'utf8');
const REFERENCE_HEIGHT = 1080;
const MINIMUM_CLEARANCE_PX = 2;

const escapePattern = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const extractRule = (source: string, selector: string) => {
    const pattern = selector.trim().split(/\s+/).map(escapePattern).join('\\s+');
    const selectorStart = new RegExp(`${pattern}\\s*\\{`, 'm').exec(source)?.index ?? -1;
    expect(selectorStart, `Expected ${selector} Less rule`).toBeGreaterThanOrEqual(0);
    const openingBrace = source.indexOf('{', selectorStart);
    let depth = 0;
    for (let index = openingBrace; index < source.length; index += 1) {
        if (source[index] === '{') depth += 1;
        if (source[index] === '}') depth -= 1;
        if (depth === 0) return source.slice(openingBrace + 1, index);
    }
    throw new Error(`Unclosed ${selector} Less rule`);
};

const readCqh = (rule: string, property: string) => {
    const value = rule.match(new RegExp(`${property}:\\s*([\\d.]+)cqh\\s*;`, 'i'))?.[1];
    expect(value, `Expected ${property} in cqh`).toBeDefined();
    return (Number(value) * REFERENCE_HEIGHT) / 100;
};

const expectVerticalClearance = (label: string, height: number, lineHeight: number, borderPixels: number) => {
    const clearance = (height - lineHeight - borderPixels) / 2;
    expect(clearance, `${label} has only ${clearance.toFixed(2)}px vertical clearance`).toBeGreaterThanOrEqual(MINIMUM_CLEARANCE_PX);
};

describe('Dashboard text-to-border clearance contract', () => {
    it('keeps bordered labels at least two pixels away from their edges', () => {
        const statusBadge = extractRule(dashboardLess, '.liveBadge,\n.pendingBadge');
        const badgeBlockPadding = statusBadge.match(/padding:\s*([\d.]+)px/i)?.[1];
        expect(badgeBlockPadding).toBeDefined();
        expect(Number(badgeBlockPadding)).toBeGreaterThanOrEqual(MINIMUM_CLEARANCE_PX);

        const rankList = extractRule(panelLess, '.modelRankList');
        const rankRow = extractRule(rankList, '> li');
        expectVerticalClearance('ranking row', readCqh(rankRow, 'height'), readCqh(rankRow, 'line-height'), 1);

        const currentModel = extractRule(panelLess, '.currentModel');
        expectVerticalClearance('current model row', readCqh(currentModel, 'height'), readCqh(currentModel, 'line-height'), 2);

        const rankMarker = extractRule(panelLess, '.rankMarker');
        expectVerticalClearance('rank marker', readCqh(rankMarker, 'height'), readCqh(rankMarker, 'line-height'), 0);

        const capabilityPanels = extractRule(panelLess, '.capabilityRadar,\n.costEfficiency');
        const capabilityHeading = extractRule(capabilityPanels, '> h3');
        expectVerticalClearance('capability heading', readCqh(capabilityHeading, 'height'), readCqh(capabilityHeading, 'line-height'), 1);
    });
});
