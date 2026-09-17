import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const panelLess = readFileSync(resolve(process.cwd(), 'src/pages/dashboard/components/dashboard-panels.module.less'), 'utf8');
const REFERENCE_VIEWPORT_WIDTH = 1920;
const escapePattern = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const extractLessRule = (source: string, selector: string) => {
    const selectorPattern = selector.trim().split(/\s+/).map(escapePattern).join('\\s+');
    const selectorStart = new RegExp(`${selectorPattern}\\s*\\{`, 'm').exec(source)?.index ?? -1;
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

const extractNestedRule = (parent: string, selector: string) => extractLessRule(parent, selector);

const readFontSizeInPixels = (rule: string) => {
    const declaration = rule.match(/font-size:\s*([\d.]+)(cqw|px)\s*;/i);
    if (!declaration) return undefined;
    const value = Number(declaration[1]);
    return declaration[2].toLowerCase() === 'cqw' ? (value * REFERENCE_VIEWPORT_WIDTH) / 100 : value;
};

describe('Dashboard model leaderboard typography contract', () => {
    it('matches the enlarged reference typography across all three benchmark cards', () => {
        const board = extractLessRule(panelLess, '.modelBoard');
        const header = extractLessRule(panelLess, '.modelBoardHeader');
        const summary = extractLessRule(panelLess, '.modelBoardSummary');
        const rankList = extractLessRule(panelLess, '.modelRankList');
        const currentModel = extractLessRule(panelLess, '.currentModel');
        const expectations = [
            { label: 'benchmark title', minimumPixels: 13, rule: extractNestedRule(header, 'h3') },
            { label: 'benchmark category', minimumPixels: 10.5, rule: extractNestedRule(header, 'span') },
            { label: 'benchmark lead', minimumPixels: 12, rule: extractNestedRule(summary, 'strong') },
            { label: 'benchmark metric label', minimumPixels: 12, rule: extractNestedRule(summary, 'em') },
            { label: 'benchmark metric value', minimumPixels: 12, rule: extractNestedRule(summary, 'em b') },
            { label: 'benchmark description', minimumPixels: 12, rule: extractNestedRule(board, '> p') },
            { label: 'benchmark ranking row', minimumPixels: 12, rule: extractNestedRule(rankList, '> li') },
            { label: 'current model emphasis', minimumPixels: 13, rule: currentModel },
        ] as const;
        const violations = expectations.flatMap(({ label, minimumPixels, rule }) => {
            const actualPixels = readFontSizeInPixels(rule);
            if (actualPixels === undefined) return [`${label}: missing font-size`];
            return actualPixels >= minimumPixels ? [] : [`${label}: ${actualPixels.toFixed(1)}px < ${minimumPixels}px`];
        });

        expect(violations).toEqual([]);
    });
});
