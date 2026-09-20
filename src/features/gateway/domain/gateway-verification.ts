import type { GatewayErrorCode, GatewayProviderHealth, GatewayProviderStatus } from '@/features/gateway/domain/gateway-provider';

export const GATEWAY_VERIFICATION_STEPS = ['auth', 'connectivity', 'protocol', 'loop', 'catalog'] as const;
export type GatewayVerificationStep = (typeof GATEWAY_VERIFICATION_STEPS)[number];
export type GatewayVerificationStepState = 'failed' | 'passed' | 'skipped';

export interface IGatewayVerificationStep {
    state: GatewayVerificationStepState;
    step: GatewayVerificationStep;
}

export interface IGatewayVerificationOutcome {
    checkedAt: string;
    errorCode: GatewayErrorCode | null;
    failedStep: GatewayVerificationStep | null;
    passed: boolean;
}

const ERROR_STEP: Readonly<Record<GatewayErrorCode, GatewayVerificationStep>> = {
    auth_failed: 'auth',
    endpoint_invalid: 'auth',
    no_active_key: 'auth',
    cert_expired: 'connectivity',
    network_unreachable: 'connectivity',
    protocol_mismatch: 'protocol',
};

export const gatewayErrorStep = (code: GatewayErrorCode): GatewayVerificationStep => ERROR_STEP[code];

export const deriveVerificationProviderState = (outcome: IGatewayVerificationOutcome): { health: GatewayProviderHealth; status: GatewayProviderStatus } => {
    if (outcome.passed) return { health: 'healthy', status: 'verified' };
    return { health: 'down', status: 'unverified' };
};

// Renders a raw pass/fail outcome as the full five-step list: steps before the
// failure passed, the failing step failed, and everything after was skipped.
export const buildVerificationSteps = (outcome: IGatewayVerificationOutcome): IGatewayVerificationStep[] => {
    const failedIndex = outcome.failedStep ? GATEWAY_VERIFICATION_STEPS.indexOf(outcome.failedStep) : -1;
    return GATEWAY_VERIFICATION_STEPS.map((step, index) => {
        if (outcome.passed || failedIndex < 0 || index < failedIndex) return { state: 'passed', step };
        if (index === failedIndex) return { state: 'failed', step };
        return { state: 'skipped', step };
    });
};
