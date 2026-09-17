import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const dashboardCss = readFileSync(resolve(process.cwd(), 'src/pages/dashboard/dashboard.module.less'), 'utf8');
const chartCss = readFileSync(resolve(process.cwd(), 'src/pages/dashboard/components/dashboard-charts.module.less'), 'utf8');
const panelCss = readFileSync(resolve(process.cwd(), 'src/pages/dashboard/components/dashboard-panels.module.less'), 'utf8');

const RGB_PATTERN = /rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i;
const HEX_PATTERN = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i;

const parseRgb = (color: string) => {
    const channels = color.trim().match(RGB_PATTERN);
    const hexChannels = color.trim().match(HEX_PATTERN);
    expect(channels ?? hexChannels, `Expected an RGB color, received "${color}"`).not.toBeNull();
    return {
        red: channels ? Number(channels[1]) : Number.parseInt(hexChannels?.[1] ?? '', 16),
        green: channels ? Number(channels[2]) : Number.parseInt(hexChannels?.[2] ?? '', 16),
        blue: channels ? Number(channels[3]) : Number.parseInt(hexChannels?.[3] ?? '', 16),
    };
};

const expectBlueDominant = (color: string, label: string) => {
    const { red, green, blue } = parseRgb(color);
    expect(blue, `${label} should be blue-dominant`).toBeGreaterThan(green);
    expect(blue, `${label} should be blue-dominant`).toBeGreaterThan(red);
};

const expectGreenDominant = (color: string, label: string) => {
    const { red, green, blue } = parseRgb(color);
    expect(green, `${label} should remain green-dominant`).toBeGreaterThan(blue);
    expect(green, `${label} should remain green-dominant`).toBeGreaterThan(red);
};

const extractColor = (css: string, pattern: RegExp, label: string) => {
    const color = css.match(pattern)?.[1];
    expect(color, `Missing ${label} color contract`).toBeDefined();
    return color as string;
};

const tokenColor = (name: string) => extractColor(dashboardCss, new RegExp(`${name}:\\s*(#[\\da-f]{6})`, 'i'), name);

const extractRule = (css: string, selector: string) => {
    const rule = css.match(new RegExp(`\\.${selector}\\s*\\{([\\s\\S]*?)\\n\\}`, 'i'))?.[1];
    expect(rule, `Missing .${selector} color contract`).toBeDefined();
    return rule as string;
};

const ruleColor = (css: string, selector: string, property: string) => {
    const rules = Array.from(css.matchAll(new RegExp(`\\.${selector}\\s*\\{([\\s\\S]*?)\\n\\}`, 'gi')), (match) => match[1]);
    const matchingRule = rules.find((rule) => new RegExp(`${property}:\\s*`, 'i').test(rule));
    expect(matchingRule, `Missing .${selector} rule with ${property}`).toBeDefined();
    return extractColor(matchingRule as string, new RegExp(`${property}:\\s*([^;]+);`, 'i'), `.${selector} ${property}`);
};

describe('Dashboard semantic color contract', () => {
    it('keeps non-topology panels, cards, headers, and radar blue while reserving green for success', () => {
        const border = tokenColor('--dash-border');
        const primary = tokenColor('--dash-primary');
        const interactive = tokenColor('--dash-interactive');
        const accent = tokenColor('--dash-accent');
        const success = tokenColor('--dash-success');
        const structuralColors = { border, primary, interactive, accent };
        const cardBorder = extractColor(dashboardCss, /\.metric,\s*\.card\s*\{[\s\S]*?border:\s*1px solid (rgb\([^;]+\))/i, 'card border');
        const radarCurrentRule = extractRule(chartCss, 'radarCurrent');
        const radarCurrentStroke = ruleColor(chartCss, 'radarCurrent', 'stroke');
        const donutProgressStroke = ruleColor(chartCss, 'donutProgress', 'stroke');
        const currentLegend = extractColor(panelCss, /\.radarKey\s*\{[\s\S]*?span::before\s*\{[\s\S]*?background:\s*([^;]+);/i, 'current radar legend');
        const efficiencyProgress = extractColor(panelCss, /&::-webkit-progress-value\s*\{[\s\S]*?linear-gradient\([^,]+,\s*([^,]+),/i, 'efficiency progress');

        Object.entries(structuralColors).forEach(([label, color]) => expectBlueDominant(color, label));
        expectBlueDominant(cardBorder, 'card border');
        expectBlueDominant(radarCurrentStroke, 'current radar series');
        expectBlueDominant(donutProgressStroke, 'task completion series');
        expectBlueDominant(currentLegend, 'current radar legend');
        expectBlueDominant(efficiencyProgress, 'efficiency progress');
        const accentChannels = parseRgb(accent);
        expect(accentChannels.blue - accentChannels.green, 'accent should be visibly blue instead of green-cyan').toBeGreaterThanOrEqual(40);
        expectGreenDominant(success, 'success');
        expect(donutProgressStroke.toLowerCase()).not.toBe(success.toLowerCase());
        expect(radarCurrentRule).not.toMatch(/101\s+245\s+227|var\(--dash-success\)/i);
        expect(radarCurrentRule.toLowerCase()).not.toContain(success.toLowerCase());
    });
});
