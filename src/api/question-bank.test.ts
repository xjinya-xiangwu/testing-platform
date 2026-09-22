import { describe, expect, it } from 'vitest';
import {
    buildManifestHash,
    computeCandidates,
    decideLabelCorrection,
    diffVersions,
    getDomainGate,
    getQuestionBankSnapshot,
    getVersionFacets,
    getVersionSamples,
    isDomainGateOpen,
    previewSampling,
    type SamplingRequest,
} from '@/api/question-bank';

const baseScope = {
    directions: ['vulnerability_exploitation'] as const,
    domains: [] as const,
    versionIds: ['ver-exploitbench'],
};

describe('question-bank store', () => {
    it('computes candidates, dedup and runnable filtering with reasons', () => {
        const result = computeCandidates({ directions: [...baseScope.directions], domains: [...baseScope.domains], versionIds: [...baseScope.versionIds] });
        expect(result.candidates.length).toBeGreaterThan(0);
        expect(result.candidates.length).toBe(result.deduped.length + result.duplicateCount);
        expect(result.deduped.length).toBe(result.runnable.length + result.nonRunnable.length);
        expect(result.runnable.every((sample) => sample.runnable)).toBe(true);
    });

    it('produces an identical task list for the same seed, data and label versions', () => {
        const request: SamplingRequest = { scope: { directions: [...baseScope.directions], domains: [], versionIds: [...baseScope.versionIds] }, mode: 'random', seed: 42, size: 20, strata: [] };
        const first = previewSampling(request);
        const second = previewSampling(request);
        expect(first.selectedTaskIds).toEqual(second.selectedTaskIds);
        expect(first.selectedTaskIds.length).toBe(20);
    });

    it('caps the selected size at the runnable pool and splits stratified quotas across datasets', () => {
        const request: SamplingRequest = {
            scope: { directions: ['vulnerability_exploitation'], domains: [], versionIds: ['ver-exploitgym', 'ver-exploitbench'] },
            mode: 'stratified',
            seed: 7,
            size: 100,
            strata: [{ field: 'dataset', quota: 100 }],
        };
        const preview = previewSampling(request);
        expect(preview.selectedTaskIds.length).toBe(Math.min(100, preview.runnableCount));
        const uniqueIds = new Set(preview.selectedTaskIds);
        expect(uniqueIds.size).toBe(preview.selectedTaskIds.length);
        expect(preview.byDataset.length).toBeGreaterThan(1);
    });

    it('closes the domain gate while unlabeled samples remain and opens it at full coverage', () => {
        const draftGate = getDomainGate('ver-internal-draft');
        expect(draftGate.missing).toBeGreaterThan(0);
        expect(isDomainGateOpen('ver-internal-draft')).toBe(false);
        expect(isDomainGateOpen('ver-exploitgym')).toBe(true);
    });

    it('builds stable manifest hashes', () => {
        expect(buildManifestHash('ver-demo')).toBe(buildManifestHash('ver-demo'));
        expect(buildManifestHash('ver-demo')).not.toBe(buildManifestHash('ver-other'));
        expect(buildManifestHash('ver-demo')).toMatch(/^sha256:[0-9a-f]{64}$/);
    });

    it('adopts review corrections without rewriting published versions', async () => {
        const snapshot = await getQuestionBankSnapshot();
        const pending = snapshot.labelCorrections.filter((correction) => correction.status === 'pending');
        expect(pending.length).toBe(2);
        const forPublished = pending.find((correction) => correction.versionId === 'ver-exploitgym');
        expect(forPublished).toBeDefined();
        const decided = await decideLabelCorrection(forPublished!.id, 'applied');
        expect(decided.status).toBe('applied');
        expect(decided.outcome).toContain('下一版本');
        // Adopting on a draft version mutates the sample immediately.
        const forDraft = snapshot.labelCorrections.find((correction) => correction.versionId === 'ver-internal-draft' && correction.status === 'pending');
        expect(forDraft).toBeDefined();
        await decideLabelCorrection(forDraft!.id, 'applied');
        const after = await getVersionSamples('ver-internal-draft', { page: 1, pageSize: 320 });
        const correctedSample = after.list.find((sample) => sample.id === 'internal-draft-12');
        expect(correctedSample?.domain).toBe(forDraft!.suggestedDomain);
    });

    it('computes facet distributions per version', async () => {
        const facets = await getVersionFacets('ver-cybergym');
        expect(facets.versionId).toBe('ver-cybergym');
        expect(facets.cwe.length).toBeGreaterThan(0);
        expect(facets.language.length).toBeGreaterThan(0);
        expect(facets.difficulty.length).toBeGreaterThan(0);
        const totalTopCwe = facets.cwe.reduce((sum, facet) => sum + facet.count, 0);
        expect(totalTopCwe).toBeGreaterThan(0);
    });

    it('diffs a version against its retired predecessor', async () => {
        const snapshot = await getQuestionBankSnapshot();
        const current = snapshot.versions.find((version) => version.id === 'ver-custom-web');
        const previous = snapshot.versions.find((version) => version.id === 'ver-custom-web-v08');
        expect(current).toBeDefined();
        expect(previous).toBeDefined();
        const diff = diffVersions(current!, previous!);
        const taskRow = diff.find((row) => row.field === 'full_task_count');
        expect(taskRow?.delta).toBe(4860 - 4120);
        expect(taskRow?.delta).toBeGreaterThan(0);
    });
});
