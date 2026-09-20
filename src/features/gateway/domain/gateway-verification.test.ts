import { describe, expect, it } from 'vitest';
import { buildVerificationSteps, deriveVerificationProviderState, gatewayErrorStep, type IGatewayVerificationOutcome } from '@/features/gateway/domain/gateway-verification';

const outcome = (overrides: Partial<IGatewayVerificationOutcome> = {}): IGatewayVerificationOutcome => ({
    checkedAt: '2026-09-20T10:00:00Z',
    errorCode: null,
    failedStep: null,
    passed: true,
    ...overrides,
});

describe('gateway verification domain', () => {
    it('maps each categorized error to the step that owns the failure', () => {
        expect(gatewayErrorStep('no_active_key')).toBe('auth');
        expect(gatewayErrorStep('auth_failed')).toBe('auth');
        expect(gatewayErrorStep('network_unreachable')).toBe('connectivity');
        expect(gatewayErrorStep('cert_expired')).toBe('connectivity');
        expect(gatewayErrorStep('protocol_mismatch')).toBe('protocol');
    });

    it('marks every step passed for a successful verification', () => {
        const steps = buildVerificationSteps(outcome());
        expect(steps).toHaveLength(5);
        expect(steps.every((step) => step.state === 'passed')).toBe(true);
    });

    it('marks steps after the failure as skipped and the failing step as failed', () => {
        const steps = buildVerificationSteps(outcome({ errorCode: 'protocol_mismatch', failedStep: 'protocol', passed: false }));
        expect(steps.map((step) => step.state)).toEqual(['passed', 'passed', 'failed', 'skipped', 'skipped']);
        expect(steps[2]).toMatchObject({ state: 'failed', step: 'protocol' });
    });

    it('derives verified + healthy state on success and unverified + down on failure', () => {
        expect(deriveVerificationProviderState(outcome())).toEqual({ health: 'healthy', status: 'verified' });
        expect(deriveVerificationProviderState(outcome({ passed: false, errorCode: 'network_unreachable', failedStep: 'connectivity' }))).toEqual({
            health: 'down',
            status: 'unverified',
        });
    });
});
