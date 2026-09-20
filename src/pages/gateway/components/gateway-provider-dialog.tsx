import classNames from 'classnames';
import { FormEvent, useEffect, useState } from 'react';
import useDialogFocus from '@/hooks/useDialogFocus';
import { GATEWAY_HARNESSES, GATEWAY_PROVIDER_KINDS, GATEWAY_PROTOCOLS, isGatewayEndpoint, type IGatewayProviderInput, type IGatewayProvider } from '@/features/gateway/domain/gateway-provider';
import { buildVerificationSteps } from '@/features/gateway/domain/gateway-verification';
import type { IGatewayProviderRegistration } from '@/api/gateway-providers';
import style from '@/pages/gateway/gateway.module.less';
import type { IApiToken } from '@/api/api-tokens';

export type GatewayProviderDialogMode = { mode: 'register' } | { mode: 'reverify'; providerId: string };

interface MutationProps {
    isPending: boolean;
}

interface RegisterMutationProps extends MutationProps {
    mutateAsync: (input: IGatewayProviderInput) => Promise<IGatewayProviderRegistration>;
    reset: () => void;
}

interface VerifyMutationProps extends MutationProps {
    mutateAsync: (providerId: string) => Promise<IGatewayProviderRegistration>;
    reset: () => void;
}

interface GatewayProviderDialogProps {
    mode: GatewayProviderDialogMode;
    providers: readonly IGatewayProvider[];
    registerMutation: RegisterMutationProps;
    tokens: readonly IApiToken[];
    translate: (key: string, values?: Readonly<Record<string, string | number>>) => string;
    verifyMutation: VerifyMutationProps;
    onClose: () => void;
}

const DialogHeader = ({ description, id, title, translate, onClose }: { description: string; id: string; title: string; translate: GatewayProviderDialogProps['translate']; onClose: () => void }) => (
    <header className={style.dialogHeader}>
        <div>
            <h2 id={id}>{title}</h2>
            <p>{description}</p>
        </div>
        <button type="button" aria-label={translate('common.close')} onClick={onClose}>
            ×
        </button>
    </header>
);

const VerificationResult = ({
    registration,
    translate,
    onClose,
    onBack,
    onRetry,
    isRetrying,
}: {
    isRetrying: boolean;
    onClose: () => void;
    onBack: (() => void) | null;
    onRetry: (() => void) | null;
    registration: IGatewayProviderRegistration;
    translate: GatewayProviderDialogProps['translate'];
}) => {
    const { provider, verification } = registration;
    const steps = buildVerificationSteps(verification);

    return (
        <>
            {verification.passed ? (
                <div className={style.successBanner} role="status">
                    {translate('gateway.register.success', { name: provider.name })}
                </div>
            ) : (
                <div className={style.failureBanner} role="alert">
                    <strong>{translate('gateway.register.failureTitle', { error: translate(`gateway.verify.error.${verification.errorCode}`) })}</strong>
                    <span>{translate(`gateway.verify.error.${verification.errorCode}.hint`)}</span>
                </div>
            )}
            <ol className={style.verifySteps} aria-label={translate('gateway.verify.steps')}>
                {steps.map((step, index) => (
                    <li key={step.step} className={classNames(step.state === 'passed' && style.stepPassed, step.state === 'failed' && style.stepFailed, step.state === 'skipped' && style.stepSkipped)}>
                        <i aria-hidden="true">{step.state === 'passed' ? '✓' : index + 1}</i>
                        <span>{translate(`gateway.verify.step.${step.step}`)}</span>
                        <strong>{translate(`gateway.verify.stepState.${step.state}`)}</strong>
                    </li>
                ))}
            </ol>
            <footer className={style.dialogFooter}>
                {onBack ? (
                    <button type="button" className={style.secondaryButton} onClick={onBack}>
                        {translate('gateway.register.back')}
                    </button>
                ) : null}
                {onRetry ? (
                    <button type="button" className={style.secondaryButton} disabled={isRetrying} onClick={onRetry}>
                        {translate('gateway.providers.reverify')}
                    </button>
                ) : null}
                <button type="button" className={style.primaryButton} onClick={onClose}>
                    {translate(verification.passed ? 'gateway.register.done' : 'common.close')}
                </button>
            </footer>
        </>
    );
};

export const GatewayProviderDialog = ({ mode, providers, registerMutation, tokens, translate, verifyMutation, onClose }: GatewayProviderDialogProps) => {
    const dialogRef = useDialogFocus<HTMLElement>(true, onClose);
    const reverifyTarget = mode.mode === 'reverify' ? (providers.find((provider) => provider.id === mode.providerId) ?? null) : null;
    const [phase, setPhase] = useState<'form' | 'result'>('form');
    const [name, setName] = useState('');
    const [kind, setKind] = useState<(typeof GATEWAY_PROVIDER_KINDS)[number]>('model');
    const [endpoint, setEndpoint] = useState('');
    const [protocol, setProtocol] = useState<(typeof GATEWAY_PROTOCOLS)[number]>('openai_responses');
    const [harness, setHarness] = useState<(typeof GATEWAY_HARNESSES)[number]>('codex');
    const [tokenId, setTokenId] = useState(tokens[0]?.credentialId ?? '');
    const [fieldError, setFieldError] = useState('');
    const [result, setResult] = useState<IGatewayProviderRegistration | null>(null);
    const [submitError, setSubmitError] = useState(false);

    useEffect(() => {
        if (!tokenId && tokens[0]) setTokenId(tokens[0].credentialId);
    }, [tokenId, tokens]);

    const activeTokens = tokens.filter((token) => token.status === 'ACTIVE');
    const isSubmitting = registerMutation.isPending || verifyMutation.isPending;

    const runVerification = async (registration: Promise<IGatewayProviderRegistration>) => {
        setSubmitError(false);
        try {
            const outcome = await registration;
            setResult(outcome);
            setPhase('result');
        } catch {
            setSubmitError(true);
        }
    };

    const handleRegister = (event: FormEvent) => {
        event.preventDefault();
        if (!isGatewayEndpoint(endpoint)) {
            setFieldError('gateway.verify.endpointError');
            return;
        }
        if (!tokenId) {
            setFieldError('gateway.verify.keyError');
            return;
        }
        setFieldError('');
        const input: IGatewayProviderInput = { endpoint, harness, keyCredentialId: tokenId, kind, name, protocol };
        void runVerification(registerMutation.mutateAsync(input));
    };

    const handleReverify = () => {
        if (!reverifyTarget) return;
        void runVerification(verifyMutation.mutateAsync(reverifyTarget.id));
    };

    const backToForm = () => {
        setResult(null);
        setPhase('form');
    };

    return (
        <div className={style.dialogBackdrop}>
            <section ref={dialogRef} className={style.dialog} role="dialog" aria-modal="true" aria-labelledby="gateway-provider-dialog-title" tabIndex={-1}>
                {mode.mode === 'register' && phase === 'form' ? (
                    <form onSubmit={handleRegister}>
                        <DialogHeader
                            description={translate('gateway.register.description')}
                            id="gateway-provider-dialog-title"
                            title={translate('gateway.register.title')}
                            translate={translate}
                            onClose={onClose}
                        />
                        <div className={style.formGrid}>
                            <label className={style.dialogField}>
                                <span>{translate('gateway.register.name')}</span>
                                <input value={name} maxLength={128} placeholder={translate('gateway.register.namePlaceholder')} autoComplete="off" onChange={(event) => setName(event.target.value)} />
                            </label>
                            <label className={style.dialogField}>
                                <span>{translate('gateway.register.kind')}</span>
                                <select value={kind} onChange={(event) => setKind(event.target.value as (typeof GATEWAY_PROVIDER_KINDS)[number])}>
                                    {GATEWAY_PROVIDER_KINDS.map((option) => (
                                        <option key={option} value={option}>
                                            {translate(`gateway.agent.kind.${option}`)}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className={style.dialogField}>
                                <span>{translate('gateway.register.endpoint')}</span>
                                <input value={endpoint} placeholder={translate('gateway.register.endpointPlaceholder')} autoComplete="off" onChange={(event) => setEndpoint(event.target.value)} />
                            </label>
                            <label className={style.dialogField}>
                                <span>{translate('gateway.register.protocol')}</span>
                                <select value={protocol} onChange={(event) => setProtocol(event.target.value as (typeof GATEWAY_PROTOCOLS)[number])}>
                                    {GATEWAY_PROTOCOLS.map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className={style.dialogField}>
                                <span>{translate('gateway.register.harness')}</span>
                                <select value={harness} onChange={(event) => setHarness(event.target.value as (typeof GATEWAY_HARNESSES)[number])}>
                                    {GATEWAY_HARNESSES.map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className={style.dialogField}>
                                <span>{translate('gateway.register.key')}</span>
                                <select value={tokenId} onChange={(event) => setTokenId(event.target.value)}>
                                    {activeTokens.length === 0 ? <option value="">{translate('gateway.register.noKey')}</option> : null}
                                    {activeTokens.map((token) => (
                                        <option key={token.credentialId} value={token.credentialId}>
                                            {token.name} · {token.keyPrefix}…
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        {fieldError ? (
                            <p className={style.inlineError} role="alert">
                                {translate(fieldError)}
                            </p>
                        ) : null}
                        {submitError ? (
                            <p className={style.inlineError} role="alert">
                                {translate('gateway.register.submitError')}
                            </p>
                        ) : null}
                        <footer className={style.dialogFooter}>
                            <button type="button" className={style.secondaryButton} onClick={onClose}>
                                {translate('common.cancel')}
                            </button>
                            <button type="submit" className={style.primaryButton} disabled={isSubmitting || !name.trim()}>
                                {translate('gateway.register.submit')}
                            </button>
                        </footer>
                    </form>
                ) : null}

                {mode.mode === 'reverify' && phase === 'form' && reverifyTarget ? (
                    <>
                        <DialogHeader
                            description={translate('gateway.register.reverifyDescription', { endpoint: reverifyTarget.endpoint })}
                            id="gateway-provider-dialog-title"
                            title={translate('gateway.register.reverifyTitle', { name: reverifyTarget.name })}
                            translate={translate}
                            onClose={onClose}
                        />
                        <dl className={style.detailList}>
                            <div>
                                <dt>{translate('gateway.register.summary')}</dt>
                                <dd>
                                    {reverifyTarget.name} · {reverifyTarget.protocol} · {reverifyTarget.harness}
                                </dd>
                            </div>
                        </dl>
                        <footer className={style.dialogFooter}>
                            <button type="button" className={style.secondaryButton} onClick={onClose}>
                                {translate('common.cancel')}
                            </button>
                            <button type="button" className={style.primaryButton} disabled={isSubmitting} onClick={handleReverify}>
                                {translate('gateway.verify.start')}
                            </button>
                        </footer>
                    </>
                ) : null}

                {phase === 'result' && result ? (
                    <>
                        <DialogHeader
                            description={translate('gateway.providers.description')}
                            id="gateway-provider-dialog-title"
                            title={translate(
                                result.verification.passed ? 'gateway.register.title' : 'gateway.register.failureTitle',
                                result.verification.passed ? { name: result.provider.name } : { error: translate(`gateway.verify.error.${result.verification.errorCode}`) },
                            )}
                            translate={translate}
                            onClose={onClose}
                        />
                        <VerificationResult
                            isRetrying={isSubmitting}
                            registration={result}
                            translate={translate}
                            onClose={onClose}
                            onBack={mode.mode === 'register' ? backToForm : null}
                            onRetry={mode.mode === 'reverify' ? handleReverify : null}
                        />
                    </>
                ) : null}
            </section>
        </div>
    );
};

export const GatewayRemoveProviderDialog = ({
    isSubmitting,
    onClose,
    onConfirm,
    provider,
    translate,
}: {
    isSubmitting: boolean;
    onClose: () => void;
    onConfirm: () => void;
    provider: IGatewayProvider;
    translate: GatewayProviderDialogProps['translate'];
}) => {
    const dialogRef = useDialogFocus<HTMLElement>(true, onClose);

    return (
        <div className={style.dialogBackdrop}>
            <section ref={dialogRef} className={style.dialog} role="dialog" aria-modal="true" aria-labelledby="gateway-remove-provider-title" tabIndex={-1}>
                <header className={style.dialogHeader}>
                    <div>
                        <h2 id="gateway-remove-provider-title">{translate('gateway.providers.removeDialog.title')}</h2>
                        <p>{translate('gateway.providers.removeDialog.description', { name: provider.name, endpoint: provider.endpoint })}</p>
                    </div>
                </header>
                <footer className={style.dialogFooter}>
                    <button type="button" className={style.secondaryButton} onClick={onClose}>
                        {translate('common.cancel')}
                    </button>
                    <button type="button" className={style.dangerButton} disabled={isSubmitting} onClick={onConfirm}>
                        {translate('gateway.providers.removeDialog.confirm')}
                    </button>
                </footer>
            </section>
        </div>
    );
};
