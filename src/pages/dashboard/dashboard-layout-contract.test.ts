import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const dashboardLess = readFileSync(resolve(process.cwd(), 'src/pages/dashboard/dashboard.module.less'), 'utf8');
const panelLess = readFileSync(resolve(process.cwd(), 'src/pages/dashboard/components/dashboard-panels.module.less'), 'utf8');
const chartLess = readFileSync(resolve(process.cwd(), 'src/pages/dashboard/components/dashboard-charts.module.less'), 'utf8');
const appLayoutLess = readFileSync(resolve(process.cwd(), 'src/components/app-layout/app-layout.module.less'), 'utf8');

const escapePattern = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const extractRule = (selector: string) => {
    const rule = dashboardLess.match(new RegExp(`${escapePattern(selector)}\\s*\\{([\\s\\S]*?)\\n\\}`, 'i'))?.[1];
    expect(rule, `Missing ${selector} layout contract`).toBeDefined();
    return rule as string;
};

const readPx = (rule: string, property: string) => {
    const value = rule.match(new RegExp(`(?:^|\\n)\\s*${property}:\\s*(-?[\\d.]+)px\\s*;`, 'i'))?.[1];
    expect(value, `Missing ${property} px declaration`).toBeDefined();
    return Number(value);
};

interface ICssLength {
    unit: string;
    value: number;
}

const parseLength = (source: string): ICssLength => {
    const match = source.match(/^(-?[\d.]+)([a-z%]*)$/i);
    expect(match, `Expected a CSS length, received "${source}"`).not.toBeNull();
    return { value: Number(match?.[1]), unit: match?.[2] ?? '' };
};

const expandBoxShorthand = (source: string): readonly [ICssLength, ICssLength, ICssLength, ICssLength] => {
    const values = source.trim().split(/\s+/).map(parseLength);
    expect(values.length, `Expected one to four padding values, received "${source}"`).toBeGreaterThanOrEqual(1);
    expect(values.length, `Expected one to four padding values, received "${source}"`).toBeLessThanOrEqual(4);

    if (values.length === 1) return [values[0], values[0], values[0], values[0]];
    if (values.length === 2) return [values[0], values[1], values[0], values[1]];
    if (values.length === 3) return [values[0], values[1], values[2], values[1]];
    return values as unknown as readonly [ICssLength, ICssLength, ICssLength, ICssLength];
};

describe('Dashboard layout regression contract', () => {
    it('uses the demo flex centering so the unscaled 1920px stage cannot expand a grid track', () => {
        const dashboardRule = extractRule('.dashboard');

        expect(dashboardRule).toMatch(/display:\s*flex;[\s\S]*?align-items:\s*center;[\s\S]*?justify-content:\s*center;[\s\S]*?overflow:\s*hidden;/i);
        expect(dashboardRule).not.toMatch(/display:\s*grid|place-items:\s*center/i);
        expect(dashboardLess).toMatch(
            /\.stage\s*\{[\s\S]*?width:\s*var\(--dashboard-stage-width,\s*1920px\);[\s\S]*?transform:\s*scale\(var\(--dashboard-fit-scale,\s*1\)\);[\s\S]*?transform-origin:\s*center\s+center;/i,
        );
        expect(dashboardLess).not.toMatch(/@media\s*\(max-width:\s*1024px\)\s*\{[\s\S]*?\.dashboard\s*\{[\s\S]*?(?:display:\s*block|align-items:\s*start|justify-items:\s*start|overflow:\s*auto)/i);
    });

    it('mirrors the 64px compact rail below 1280px so the dashboard stays centered in the viewport', () => {
        expect(appLayoutLess).toMatch(/\.contentCollapsed\s*\{[\s\S]*?--dashboard-compact-rail-width:\s*64px;[\s\S]*?margin-left:\s*64px;/i);
        expect(dashboardLess).toMatch(/@media\s*\(max-width:\s*1279px\)\s*\{[\s\S]*?\.dashboard\s*\{[\s\S]*?width:\s*calc\(100%\s*-\s*var\(--dashboard-compact-rail-width,\s*0px\)\);/i);

        [1279, 1024, 800].forEach((viewportWidth) => {
            const railWidth = 64;
            const dashboardWidth = viewportWidth - railWidth * 2;
            const dashboardCenter = railWidth + dashboardWidth / 2;
            const unscaledStageWidth = 1920;
            const scale = dashboardWidth / unscaledStageWidth;
            const flexLayoutLeft = (dashboardWidth - unscaledStageWidth) / 2;
            const transformInset = (unscaledStageWidth * (1 - scale)) / 2;
            const visualStageLeft = railWidth + flexLayoutLeft + transformInset;
            const visualStageRight = visualStageLeft + unscaledStageWidth * scale;

            expect(dashboardCenter).toBe(viewportWidth / 2);
            expect(visualStageLeft).toBeCloseTo(railWidth, 5);
            expect(visualStageRight).toBeCloseTo(viewportWidth - railWidth, 5);
        });
    });

    it('keeps the compact dashboard rail on the left below 700px like the demo', () => {
        const narrowLayout = appLayoutLess.match(/@media \(max-width:\s*700px\)\s*\{([\s\S]*?)\n\}/i)?.[1];

        expect(narrowLayout).toMatch(/\.sidebar:not\(\.collapsed\)\s*\{/i);
        expect(narrowLayout).toMatch(/\.content:not\(\.contentCollapsed\)\s*\{/i);
        expect(narrowLayout).not.toMatch(/(?:^|,)\s*\.collapsed\s*\{/i);
        expect(narrowLayout).not.toMatch(/(?:^|,)\s*\.contentCollapsed\s*\{/i);
    });

    it('keeps live KPI values compact enough for longer backend counts', () => {
        const metricValueRule = dashboardLess.match(/\.metric\s*\{[\s\S]*?strong\s*\{([\s\S]*?)\n\s*\}/i)?.[1];
        expect(metricValueRule, 'Missing KPI value typography rule').toBeDefined();

        const fontSize = metricValueRule?.match(/font-size:\s*([\d.]+)px\s*;/i)?.[1];
        const lineHeight = metricValueRule?.match(/line-height:\s*([\d.]+)px\s*;/i)?.[1];
        expect(Number(fontSize), 'KPI value font must fit longer live counts').toBeLessThanOrEqual(25);
        expect(Number(lineHeight), 'KPI value line height must stay inside the card').toBeLessThanOrEqual(26);
    });

    it('gives the attack-event KPI extra width while keeping the right gutter compact', () => {
        const metricStrip = extractRule('.metricStrip');
        const systemRibbon = extractRule('.systemRibbon');
        const metricRight = 1920 - readPx(metricStrip, 'right');
        const systemLeft = 1920 - readPx(systemRibbon, 'right') - readPx(systemRibbon, 'width');

        expect(metricStrip).toMatch(/grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)\s+minmax\(0,\s*1\.2fr\)\s*;/i);
        expect(metricStrip).toMatch(/width:\s*auto\s*;/i);
        expect(readPx(metricStrip, 'gap'), 'KPI card gaps must stay compact').toBeLessThanOrEqual(8);
        expect(systemLeft - metricRight, 'The KPI strip must not overlap the system ribbon').toBeGreaterThan(0);
        expect(systemLeft - metricRight, 'The right gutter should release space to the attack-event KPI').toBeLessThanOrEqual(8);
    });

    it('keeps the topology frame between the side columns with positive gutters', () => {
        const leftColumn = extractRule('.dashboardGrid > .column:nth-child(1)');
        const topologyFrame = extractRule('.dashboardGrid > .column:nth-child(2) > .card:first-child');
        const rightColumn = extractRule('.dashboardGrid > .column:nth-child(3)');
        const leftColumnRight = readPx(leftColumn, 'left') + readPx(leftColumn, 'width');
        const topologyLeft = readPx(topologyFrame, 'left');
        const topologyRight = 1920 - readPx(topologyFrame, 'right');
        const rightColumnLeft = 1920 - readPx(rightColumn, 'right') - readPx(rightColumn, 'width');

        expect(topologyLeft - leftColumnRight, 'Topology frame must leave a positive gap after the left column').toBeGreaterThan(0);
        expect(rightColumnLeft - topologyRight, 'Topology frame must leave a positive gap before the right column').toBeGreaterThan(0);
    });

    it('keeps fixed side rails while the demo center expands above the 16:9 threshold', () => {
        const leftColumn = extractRule('.dashboardGrid > .column:nth-child(1)');
        const rightColumn = extractRule('.dashboardGrid > .column:nth-child(3)');
        const topologyFrame = extractRule('.dashboardGrid > .column:nth-child(2) > .card:first-child');
        const eventStream = extractRule('.dashboardGrid > .column:nth-child(2) > .card:nth-child(2)');
        const leftColumnRight = readPx(leftColumn, 'left') + readPx(leftColumn, 'width');

        expect(readPx(rightColumn, 'width')).toBe(350);
        expect(readPx(rightColumn, 'width')).toBeGreaterThan(readPx(leftColumn, 'width'));
        expect(panelLess, 'Side-panel geometry must stay fixed while only the center expands').not.toMatch(/\bcqw\b/i);
        expect(topologyFrame).toMatch(/width:\s*auto\s*;/i);
        expect(eventStream).toMatch(/width:\s*auto\s*;/i);

        [1920, 2400].forEach((stageWidth) => {
            const topologyFrameWidth = stageWidth - readPx(topologyFrame, 'left') - readPx(topologyFrame, 'right');
            const topologyCanvasLeft = readPx(topologyFrame, 'left') + (topologyFrameWidth - 1192) / 2 + 62.5;
            const visibleTopologyCenter = topologyCanvasLeft + 563.5;
            const rightColumnLeft = stageWidth - readPx(rightColumn, 'right') - readPx(rightColumn, 'width');
            const eventRight = stageWidth - readPx(eventStream, 'right');
            const eventLeftGap = readPx(eventStream, 'left') - leftColumnRight;
            const eventRightGap = rightColumnLeft - eventRight;

            expect(visibleTopologyCenter).toBeCloseTo(stageWidth / 2, 1);
            expect(eventLeftGap).toBe(26);
            expect(eventRightGap).toBe(26);
            expect(eventLeftGap).toBe(eventRightGap);
        });
        expect(chartLess).toMatch(/\.topologyMap\s*\{[\s\S]*?transform:\s*translateX\(62\.5px\);/);
    });

    it('keeps task statuses compact while emphasizing their scores', () => {
        expect(panelLess).toMatch(
            /\.taskPanel\s*\{[\s\S]*?grid-template-columns:\s*92px\s+max-content;[\s\S]*?justify-content:\s*center;[\s\S]*?gap:\s*48px;[\s\S]*?> svg\s*\{[\s\S]*?width:\s*84px;[\s\S]*?height:\s*7\.78cqh;[\s\S]*?justify-self:\s*center;/i,
        );
        expect(panelLess).toMatch(
            /\.taskLegend\s*\{[\s\S]*?width:\s*max-content;[\s\S]*?justify-self:\s*start;[\s\S]*?grid-template-columns:\s*12px\s+65px\s+48px;[\s\S]*?b\s*\{[\s\S]*?font-size:\s*14px;/i,
        );
        expect(chartLess).toMatch(/\.donutTotal\s*\{[\s\S]*?font-size:\s*34px;/i);
    });

    it('keeps at least 36px between the radar graphic and its legend while balancing the efficiency spacing', () => {
        expect(panelLess).toMatch(/\.radarPlot\s*\{[\s\S]*?width:\s*292px;/i);
        expect(panelLess).toMatch(/\.radarPlot\s*\{[\s\S]*?height:\s*22\.22cqh;[\s\S]*?svg\s*\{[\s\S]*?top:\s*0\.93cqh;[\s\S]*?height:\s*16\.2cqh;/i);
        expect(panelLess).toMatch(/\.radarKey\s*\{[\s\S]*?bottom:\s*0;[\s\S]*?line-height:\s*16px;/i);

        const stageCqhInPx = 10.8;
        const graphicBottom = (0.93 + 16.2) * stageCqhInPx;
        const legendTop = 22.22 * stageCqhInPx - 16;
        expect(legendTop - graphicBottom).toBeGreaterThanOrEqual(36);
        expect(panelLess).toMatch(/\.costEfficiency\s*\{[\s\S]*?margin-bottom:\s*1\.48cqh;/i);
        expect(panelLess).toMatch(/\.efficiencyBars\s*\{[\s\S]*?align-content:\s*start;[\s\S]*?gap:\s*0\.93cqh;[\s\S]*?padding:\s*1\.11cqh\s+4px\s+0\.65cqh;/i);
    });

    it('keeps the narrower right-column radar inside the available width', () => {
        const rightColumn = extractRule('.dashboardGrid > .column:nth-child(3)');
        const radarWidth = panelLess.match(/\.radarPlot\s*\{[\s\S]*?width:\s*([\d.]+)px\s*;/i)?.[1];
        const radarSvgWidth = panelLess.match(/\.radarPlot\s*\{[\s\S]*?svg\s*\{[\s\S]*?width:\s*([\d.]+)px\s*;/i)?.[1];

        expect(Number(radarWidth)).toBeLessThan(readPx(rightColumn, 'width') - 38);
        expect(Number(radarSvgWidth)).toBeLessThan(Number(radarWidth));
    });

    it('uses one title-bar height across the right column', () => {
        const cardHeader = extractRule('.cardHeader');
        const outerHeaderHeight = cardHeader.match(/height:\s*([\d.]+)cqh\s*;/i)?.[1];
        const taskHeaderHeight = dashboardLess.match(/\.column:nth-child\(3\)\s*>\s*\.card:first-child\s*\{[\s\S]*?\.cardHeader\s*\{[\s\S]*?height:\s*([\d.]+)cqh\s*;/i)?.[1];
        const innerHeaderHeight = panelLess.match(/\.capabilityRadar,\s*\n\.costEfficiency\s*\{[\s\S]*?> h3\s*\{[\s\S]*?height:\s*([\d.]+)cqh\s*;/i)?.[1];

        expect(taskHeaderHeight).toBe(outerHeaderHeight);
        expect(innerHeaderHeight).toBe(outerHeaderHeight);
        expect(panelLess).toMatch(/\.capabilityRadar\s*\{[\s\S]*?grid-template-rows:\s*2\.59cqh\s+minmax\(0,\s*1fr\);[\s\S]*?padding:\s*0\s+0\s+0\.93cqh;/i);
        expect(panelLess).toMatch(/\.costEfficiency\s*\{[\s\S]*?grid-template-rows:\s*2\.59cqh\s+7\.04cqh\s+minmax\(0,\s*1fr\)/i);
    });

    it('keeps the capability inner frame above the outer card bottom edge', () => {
        expect(dashboardLess).toMatch(
            /\.dashboardGrid\s*>\s*\.column:nth-child\(3\)\s*>\s*\.card:nth-child\(2\)\s*\{[\s\S]*?box-sizing:\s*border-box;[\s\S]*?display:\s*flex;[\s\S]*?flex-direction:\s*column;/i,
        );
        expect(panelLess).toMatch(/\.capabilityPanel\s*\{[\s\S]*?height:\s*auto;[\s\S]*?min-height:\s*0;[\s\S]*?flex:\s*1\s+1\s+auto;/i);
        expect(panelLess).toMatch(/\.costEfficiency\s*\{[\s\S]*?margin-bottom:\s*1\.48cqh;/i);
    });

    it('gives every card header non-zero block and inline padding', () => {
        const cardHeader = extractRule('.cardHeader');
        const padding = cardHeader.match(/(?:^|\n)\s*padding:\s*([^;]+);/i)?.[1];
        expect(padding, 'Card header must declare its own padding').toBeDefined();
        const [top, right, bottom, left] = expandBoxShorthand(padding as string);

        Object.entries({ top, right, bottom, left }).forEach(([side, length]) => {
            expect(length.value, `Card header ${side} padding must create visible spacing`).toBeGreaterThan(0);
        });
    });
});
