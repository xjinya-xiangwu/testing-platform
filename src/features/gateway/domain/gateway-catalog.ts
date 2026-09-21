import type { IGatewayProvider, IGatewayProviderMetrics } from '@/features/gateway/domain/gateway-provider';

// The provider registry is the single source for test-task external candidates:
// only verified registry entries become selectable objects in the task wizard.
export interface IGatewayCatalogObject {
    harness: 'claude_code' | 'codex';
    id: string;
    kind: 'agent' | 'model';
    name: string;
    protocol: 'anthropic_messages' | 'mcp' | 'openai_chat' | 'openai_responses';
    verified: boolean;
}

export const toGatewayCatalogObjects = (providers: readonly IGatewayProvider[]): IGatewayCatalogObject[] =>
    providers
        .filter((provider) => provider.status === 'verified')
        .map((provider) => ({ harness: provider.harness, id: provider.id, kind: provider.kind, name: provider.name, protocol: provider.protocol, verified: true }))
        .sort((a, b) => a.id.localeCompare(b.id));

export interface IGatewayHealthSummary {
    healthy: number;
    impaired: number;
    unverified: number;
}

export const summarizeGatewayHealth = (providers: readonly IGatewayProvider[]): IGatewayHealthSummary =>
    providers.reduce(
        (summary, provider) => {
            if (provider.status === 'unverified') summary.unverified += 1;
            else if (provider.health === 'healthy') summary.healthy += 1;
            else summary.impaired += 1;
            return summary;
        },
        { healthy: 0, impaired: 0, unverified: 0 },
    );

export const aggregateGatewayMetrics = (providers: readonly IGatewayProvider[]): IGatewayProviderMetrics =>
    providers.reduce(
        (totals, provider) => ({
            costCny: totals.costCny + provider.metrics.costCny,
            tasks: totals.tasks + provider.metrics.tasks,
            tokensTotal: totals.tokensTotal + provider.metrics.tokensTotal,
            trajectories: totals.trajectories + provider.metrics.trajectories,
        }),
        { costCny: 0, tasks: 0, tokensTotal: 0, trajectories: 0 },
    );
