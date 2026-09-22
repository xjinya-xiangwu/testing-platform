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
    'gateway.tabs.access',
    'gateway.tabs.keys',
    'gateway.providers.register',
    'gateway.providers.columns.name',
    'gateway.providers.columns.method',
    'gateway.providers.columns.kind',
    'gateway.providers.columns.endpoint',
    'gateway.providers.columns.status',
    'gateway.providers.columns.tasks',
    'gateway.register.method',
    'gateway.register.method.rest_api',
    'gateway.register.method.mcp',
    'gateway.register.methodHint.rest_api',
    'gateway.register.submit',
    'gateway.register.success',
    'gateway.register.snippet',
    'gateway.verify.start',
    'gateway.verify.step.rest_api.protocol',
    'gateway.verify.step.mcp.protocol',
    'gateway.verify.step.cli.protocol',
    'gateway.verify.step.skill.protocol',
    'gateway.verify.error.network_unreachable',
    'gateway.verify.error.protocol_mismatch',
    'gateway.keys.create',
    'gateway.keys.columns.purpose',
    'gateway.sessions.title',
] as const;
const QUESTION_BANK_REQUIRED_KEYS = [
    'questionBank.title',
    'questionBank.subtitleExternal',
    'questionBank.tabs.catalog',
    'questionBank.tabs.catalogExternal',
    'questionBank.tabs.labels',
    'questionBank.tabs.sampling',
    'questionBank.tabs.samplingExternal',
    'questionBank.tabs.environments',
    'questionBank.tabs.transfer',
    'questionBank.tabs.transferExternal',
    'questionBank.tabs.datasets',
    'questionBank.myDatasets.title',
    'questionBank.myDatasets.isolationNote',
    'questionBank.overview.envLogical',
    'questionBank.catalog.publishDialog.description',
    'questionBank.labels.gate.blocked',
    'questionBank.sampling.preview.reproducible',
    'questionBank.env.precheck.writeBack',
    'questionBank.transfer.import.format',
    'questionBank.transfer.export.sanitizeNote',
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

    it.each(QUESTION_BANK_REQUIRED_KEYS)('defines %s in both languages', (key) => {
        expect(ZH).toHaveProperty(key);
        expect(EN).toHaveProperty(key);
    });
});
