import { describe, expect, it } from 'vitest';
import { aggregateGatewayMetrics, summarizeGatewayHealth, toGatewayCatalogObjects } from '@/features/gateway/domain/gateway-catalog';
import type { IGatewayProvider } from '@/features/gateway/domain/gateway-provider';

const provider = (overrides: Partial<IGatewayProvider> = {}): IGatewayProvider => ({
    endpoint: 'https://api.openai.com/v1',
    harness: 'codex',
    health: 'healthy',
    id: 'ext-gpt54',
    keyCredentialId: 'demo-ci',
    kind: 'model',
    lastCheckedAt: '2026-08-04T11:02:00+08:00',
    lastErrorCode: null,
    method: 'rest_api',
    metrics: { costCny: 100, tasks: 10, tokensTotal: 1_000, trajectories: 20 },
    name: 'GPT-5.4',
    protocol: 'openai_responses',
    status: 'verified',
    verifiedAt: '2026-08-04T11:02:00+08:00',
    ...overrides,
});

describe('gateway catalog domain', () => {
    it('derives task candidates from verified providers only', () => {
        const objects = toGatewayCatalogObjects([provider(), provider({ id: 'ext-redbot', status: 'unverified', verifiedAt: null })]);

        expect(objects).toEqual([{ harness: 'codex', id: 'ext-gpt54', kind: 'model', name: 'GPT-5.4', protocol: 'openai_responses', verified: true }]);
    });

    it('sorts catalog objects by id for a stable wizard order', () => {
        const objects = toGatewayCatalogObjects([provider({ id: 'ext-claude' }), provider({ id: 'ext-glm52' }), provider({ id: 'ext-gpt54' })]);
        expect(objects.map((object) => object.id)).toEqual(['ext-claude', 'ext-glm52', 'ext-gpt54']);
    });

    it('summarizes registry health across verified and unverified providers', () => {
        const summary = summarizeGatewayHealth([provider(), provider({ health: 'down' }), provider({ id: 'ext-redbot', status: 'unverified' })]);
        expect(summary).toEqual({ healthy: 1, impaired: 1, unverified: 1 });
    });

    it('aggregates registry metrics', () => {
        const totals = aggregateGatewayMetrics([provider(), provider({ metrics: { costCny: 50, tasks: 5, tokensTotal: 500, trajectories: 10 } })]);
        expect(totals).toEqual({ costCny: 150, tasks: 15, tokensTotal: 1_500, trajectories: 30 });
    });
});
