import { describe, expect, it } from 'vitest';
import { EN } from '@/locale/en';
import { ZH } from '@/locale/zh';

const DASHBOARD_REQUIRED_KEYS = ['dashboard.title', 'dashboard.metrics.environments', 'dashboard.topology.title', 'dashboard.events.title', 'dashboard.tasks.title', 'dashboard.alerts.title'] as const;
const TASK_REQUIRED_KEYS = ['tasks.title', 'tasks.sections.running', 'tasks.wizard.title', 'tasks.wizard.typeRequired', 'tasks.success.title', 'tasks.constraints.duration'] as const;
const RANGE_REQUIRED_KEYS = ['range.hall.title', 'range.hall.environments', 'range.detail.topology', 'range.console.title', 'range.topology.nodeDetails'] as const;
const WORKBENCH_REQUIRED_KEYS = ['workbench.title', 'workbench.sections.milestones', 'workbench.sections.terminal', 'confirm.title', 'confirm.actions.generate'] as const;
const SETTINGS_REQUIRED_KEYS = ['settings.title', 'settings.profile.userId', 'settings.profile.ssoUid', 'settings.tokens.title', 'settings.activity.refresh'] as const;
const TRAINING_REQUIRED_KEYS = ['training.title', 'training.wizard.title', 'training.status.4', 'training.detail.metrics', 'training.actions.development'] as const;
const GATEWAY_REQUIRED_KEYS = [
    'gateway.title',
    'gateway.tabs.agents',
    'gateway.tabs.keys',
    'gateway.keys.create',
    'gateway.verify.start',
    'gateway.sessions.title',
    'gateway.agents.columns.name',
    'gateway.agents.columns.kind',
    'gateway.agents.columns.endpoint',
    'gateway.agents.columns.status',
    'gateway.agents.columns.tasks',
    'gateway.agents.columns.tokens',
    'gateway.agents.columns.trajectories',
    'gateway.agents.columns.cost',
] as const;

describe('range locale contract', () => {
    it('keeps the Chinese and English dictionaries in sync', () => {
        expect(Object.keys(EN).sort()).toEqual(Object.keys(ZH).sort());
    });

    it.each(DASHBOARD_REQUIRED_KEYS)('defines %s in both languages', (key) => {
        expect(ZH).toHaveProperty(key);
        expect(EN).toHaveProperty(key);
    });

    it.each(TASK_REQUIRED_KEYS)('defines %s in both languages', (key) => {
        expect(ZH).toHaveProperty(key);
        expect(EN).toHaveProperty(key);
    });

    it.each(RANGE_REQUIRED_KEYS)('defines %s in both languages', (key) => {
        expect(ZH).toHaveProperty(key);
        expect(EN).toHaveProperty(key);
    });

    it.each(WORKBENCH_REQUIRED_KEYS)('defines %s in both languages', (key) => {
        expect(ZH).toHaveProperty(key);
        expect(EN).toHaveProperty(key);
    });

    it.each(SETTINGS_REQUIRED_KEYS)('defines %s in both languages', (key) => {
        expect(ZH).toHaveProperty(key);
        expect(EN).toHaveProperty(key);
    });

    it.each(TRAINING_REQUIRED_KEYS)('defines %s in both languages', (key) => {
        expect(ZH).toHaveProperty(key);
        expect(EN).toHaveProperty(key);
    });

    it.each(GATEWAY_REQUIRED_KEYS)('defines %s in both languages', (key) => {
        expect(ZH).toHaveProperty(key);
        expect(EN).toHaveProperty(key);
    });
});
