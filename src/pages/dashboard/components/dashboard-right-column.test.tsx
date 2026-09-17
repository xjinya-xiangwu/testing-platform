import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createDashboardFallbackData } from '@/api/dashboard';
import { ZH } from '@/locale/zh';
import DashboardRightColumn from '@/pages/dashboard/components/dashboard-right-column';

const panelLess = readFileSync(resolve(process.cwd(), 'src/pages/dashboard/components/dashboard-panels.module.less'), 'utf8');
const dashboardLess = readFileSync(resolve(process.cwd(), 'src/pages/dashboard/dashboard.module.less'), 'utf8');
const messages: Readonly<Record<string, string>> = ZH;
const translate = (key: string, values: Readonly<Record<string, string | number>> = {}) =>
    Object.entries(values).reduce((message, [name, value]) => message.replace(`{${name}}`, String(value)), messages[key] ?? key);

const extractLessRule = (selector: string) => {
    const selectorStart = panelLess.indexOf(`.${selector}`);
    expect(selectorStart, `Expected .${selector} Less rule`).toBeGreaterThanOrEqual(0);
    const openingBrace = panelLess.indexOf('{', selectorStart);
    let depth = 0;
    for (let index = openingBrace; index < panelLess.length; index += 1) {
        if (panelLess[index] === '{') depth += 1;
        if (panelLess[index] === '}') depth -= 1;
        if (depth === 0) return panelLess.slice(openingBrace + 1, index);
    }
    throw new Error(`Unclosed .${selector} Less rule`);
};

describe('DashboardRightColumn reference-card contract', () => {
    it('renders task status as a donut with a four-row vertical legend', async () => {
        const data = {
            ...createDashboardFallbackData(),
            taskRing: { total: 527, running: 87, queued: 23, doneToday: 417, completionPercent: 79.7 },
        };
        render(<DashboardRightColumn data={data} translate={translate} />);

        const taskCard = screen.getByRole('region', { name: '测评任务状态' });
        expect(within(taskCard).getByRole('img', { name: '总任务 527，完成进度 79.7%' })).toBeInTheDocument();
        const legend = within(taskCard).getByRole('list');
        const rows = within(legend).getAllByRole('listitem');
        const expectedRows = [
            ['运行中', '87'],
            ['排队中', '23'],
            ['已完成', '417'],
            ['完成进度', '79.7%'],
        ] as const;

        expect(rows).toHaveLength(4);
        expectedRows.forEach(([label, value], index) => {
            expect(rows[index]).toHaveTextContent(label);
            expect(rows[index]).toHaveTextContent(value);
        });
        expect(within(taskCard).queryByRole('progressbar')).not.toBeInTheDocument();
    });

    it('removes the retired duel and keeps task status followed by Agent capability', () => {
        const data = createDashboardFallbackData();
        render(<DashboardRightColumn data={data} translate={translate} />);

        const rightColumn = screen.getByRole('complementary', { name: '测评与 Agent 能力态势' });
        const cards = within(rightColumn).getAllByRole('region');

        expect(cards).toHaveLength(4);
        expect(cards[0]).toHaveAccessibleName('测评任务状态');
        expect(cards[1]).toHaveAccessibleName('Agent能力评估');
        expect(screen.queryByRole('region', { name: '红蓝实时对抗' })).not.toBeInTheDocument();
    });

    it('keeps task legend rows vertical instead of a three-column number strip', () => {
        const taskLegend = extractLessRule('taskLegend');

        expect(taskLegend).not.toMatch(/grid-template-columns:\s*repeat\(3/i);
        expect(taskLegend).toMatch(/(?:>|^)\s*li\s*\{[\s\S]*?display:\s*grid/i);
        expect(taskLegend).toMatch(/(?:>|^)\s*li\s*\{[\s\S]*?grid-template-columns:\s*[^;]+;/i);
        expect(panelLess).toMatch(/\.taskLegend\s+\.taskRunningDot\s*\{/i);
    });

    it('allocates the retired duel space to the enlarged Agent capability card', () => {
        const rightColumn = dashboardLess.match(/\.dashboardGrid\s*>\s*\.column:nth-child\(3\)\s*\{([^}]*)\}/i)?.[1];
        const capabilityPanel = extractLessRule('capabilityPanel');
        const rows = capabilityPanel.match(/grid-template-rows:\s*([\d.]+)cqh\s+([\d.]+)cqh\s+minmax\(0,\s*1fr\)/i);

        expect(rightColumn).toMatch(/grid-template-rows:\s*160px\s+792px\s*;/i);
        expect(rightColumn).toMatch(/gap:\s*12px\s*;/i);
        expect(dashboardLess).toMatch(/\.column:nth-child\(3\)\s*>\s*\.card:first-child\s*\{/i);
        expect(dashboardLess).not.toMatch(/\.column:nth-child\(3\)\s*>\s*\.card:nth-child\(-n\s*\+\s*2\)\s*\{/i);
        expect(Number(rows?.[1]), 'Agent header row must use the expanded UI height').toBeGreaterThanOrEqual(10);
        expect(Number(rows?.[2]), 'Radar row must use the expanded UI height').toBeGreaterThanOrEqual(30);
    });
});
