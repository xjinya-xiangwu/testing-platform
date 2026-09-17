import { beforeEach, describe, expect, it } from 'vitest';
import { resetTaskDraftStore, useTaskDraftStore } from '@/stores/task-draft-store';

describe('task draft store', () => {
    beforeEach(() => resetTaskDraftStore());

    it('starts a fresh draft from step one whenever the wizard opens', () => {
        const store = useTaskDraftStore.getState();
        store.selectTaskType('range');
        store.setEnvironmentId('nuclear');
        store.setConstraint('duration', 90);
        store.setStep(2);
        store.closeWizard();
        store.openWizard();

        expect(useTaskDraftStore.getState()).toMatchObject({
            constraints: { duration: 45, token: 20, tools: 60, cost: 200 },
            environmentId: 'rng_range5',
            isOpen: true,
            step: 1,
            taskType: null,
        });
    });

    it('updates constraints immutably', () => {
        const before = useTaskDraftStore.getState().constraints;
        useTaskDraftStore.getState().setConstraint('duration', 90);
        const after = useTaskDraftStore.getState().constraints;

        expect(after).not.toBe(before);
        expect(after.duration).toBe(90);
        expect(before.duration).toBe(45);
    });
});
