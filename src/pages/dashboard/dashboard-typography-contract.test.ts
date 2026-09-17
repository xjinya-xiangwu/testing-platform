import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const dashboardLess = readFileSync(resolve(process.cwd(), 'src/pages/dashboard/dashboard.module.less'), 'utf8');
const panelLess = readFileSync(resolve(process.cwd(), 'src/pages/dashboard/components/dashboard-panels.module.less'), 'utf8');
const chartLess = readFileSync(resolve(process.cwd(), 'src/pages/dashboard/components/dashboard-charts.module.less'), 'utf8');

describe('Dashboard typography contract', () => {
    it('uses the visual demo font stacks only inside the dashboard', () => {
        expect(dashboardLess).toMatch(/\.dashboard\s*\{[\s\S]*?--dash-font-sans:[^;]*PingFang SC[^;]*Microsoft YaHei[^;]*;/);
        expect(dashboardLess).toMatch(/\.dashboard\s*\{[\s\S]*?--dash-font-number:[^;]*DIN Alternate[^;]*Bahnschrift[^;]*Arial Narrow[^;]*;/);
        expect(dashboardLess).toMatch(/--range-mono:\s*var\(--dash-font-number\);/);
        expect(dashboardLess).toMatch(/font-family:\s*var\(--dash-font-sans\);/);
        expect(dashboardLess).toMatch(/text-rendering:\s*geometricPrecision;/);
    });

    it('keeps labels readable and gives high-value numbers deliberate emphasis', () => {
        expect(dashboardLess).toMatch(/\.metric\s*\{[\s\S]*?> span\s*\{[\s\S]*?font-size:\s*12px;[\s\S]*?font-weight:\s*700;/);
        expect(dashboardLess).toMatch(/\.metric\s*\{[\s\S]*?strong\s*\{[\s\S]*?font-size:\s*25px;[\s\S]*?font-weight:\s*400;/);
        expect(dashboardLess).toMatch(/\.cardHeader\s*\{[\s\S]*?span\s*\{[\s\S]*?font-size:\s*11px;[\s\S]*?font-weight:\s*600;/);
        expect(panelLess).toMatch(/\.modelBoardHeader\s*\{[\s\S]*?span\s*\{[\s\S]*?font-size:\s*11px;/);
        expect(panelLess).toMatch(/\.taskLegend\s*\{[\s\S]*?font-size:\s*12px;[\s\S]*?font-weight:\s*600;/);
        expect(panelLess).toMatch(/\.agentHeader\s*\{[\s\S]*?strong\s*\{[\s\S]*?font-size:\s*15px;/);
        expect(panelLess).toMatch(/\.capabilityRadar,[\s\S]*?> h3\s*\{[\s\S]*?font-size:\s*13px;[\s\S]*?font-weight:\s*700;/);
        expect(panelLess).toMatch(/\.radarLabels\s*\{[\s\S]*?font-size:\s*12px;/);
        expect(panelLess).toMatch(/\.costMetrics\s*\{[\s\S]*?dd\s*\{[\s\S]*?font-size:\s*14px;/);
        expect(chartLess).toMatch(/\.donutTotal\s*\{[\s\S]*?font-size:\s*34px;[\s\S]*?font-weight:\s*700;/);
    });
});
