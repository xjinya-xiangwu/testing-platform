import { useEffect, useState } from 'react';
import classNames from 'classnames';
import { GATEWAY_VERIFY_STEPS, isGatewayEndpoint, type IGatewayAgent } from '@/pages/gateway/gateway-mock';
import style from '@/pages/gateway/gateway.module.less';
import type { IApiToken } from '@/api/api-tokens';

interface GatewayVerificationPanelProps {
    agents: readonly IGatewayAgent[];
    onVerified: (agentId: string) => void;
    tokens: readonly IApiToken[];
    translate: (key: string, values?: Readonly<Record<string, string | number>>) => string;
}

const GatewayVerificationPanel = ({ agents, onVerified, tokens, translate }: GatewayVerificationPanelProps) => {
    const activeTokens = tokens.filter((token) => token.status === 'ACTIVE');
    const [endpoint, setEndpoint] = useState('https://agent.customer.lab/mcp');
    const [tokenId, setTokenId] = useState(activeTokens[0]?.credentialId ?? '');
    const [isComplete, setIsComplete] = useState(false);
    const [errorKey, setErrorKey] = useState('');

    useEffect(() => {
        if (!tokenId && activeTokens[0]) setTokenId(activeTokens[0].credentialId);
    }, [activeTokens, tokenId]);

    const runVerification = async () => {
        if (!isGatewayEndpoint(endpoint)) {
            setErrorKey('gateway.verify.endpointError');
            return;
        }
        if (!tokenId) {
            setErrorKey('gateway.verify.keyError');
            return;
        }
        setErrorKey('');
        await Promise.resolve();
        setIsComplete(true);
        onVerified('ext-redbot');
    };

    return (
        <>
            <section className={style.verifyForm} aria-labelledby="gateway-verify-title">
                <div>
                    <h2 id="gateway-verify-title">{translate('gateway.verify.title')}</h2>
                    <p>{translate('gateway.verify.description')}</p>
                </div>
                <label>
                    <span>{translate('gateway.verify.endpoint')}</span>
                    <input value={endpoint} onChange={(event) => setEndpoint(event.target.value)} />
                </label>
                <label>
                    <span>{translate('gateway.verify.key')}</span>
                    <select value={tokenId} onChange={(event) => setTokenId(event.target.value)}>
                        {activeTokens.length === 0 ? <option value="">{translate('gateway.verify.noKey')}</option> : null}
                        {activeTokens.map((token) => (
                            <option key={token.credentialId} value={token.credentialId}>
                                {token.name} · {token.keyPrefix}…
                            </option>
                        ))}
                    </select>
                </label>
                <button type="button" className={style.primaryButton} disabled={isComplete} onClick={() => void runVerification()}>
                    {translate('gateway.verify.start')}
                </button>
            </section>
            {errorKey ? (
                <p className={style.inlineError} role="alert">
                    {translate(errorKey)}
                </p>
            ) : null}

            <section className={style.verifySteps} aria-label={translate('gateway.verify.steps')}>
                {GATEWAY_VERIFY_STEPS.map((step, index) => (
                    <div key={step} className={classNames(isComplete && style.stepPassed)}>
                        <i>{isComplete ? '✓' : index + 1}</i>
                        <span>{translate(`gateway.verify.step.${step}`)}</span>
                        <strong>{translate(isComplete ? 'gateway.status.verified' : 'common.notAvailable')}</strong>
                    </div>
                ))}
            </section>
            {isComplete ? (
                <div className={style.successBanner} role="status">
                    {translate('gateway.verify.success', { endpoint })}
                </div>
            ) : null}

            <header className={style.subsectionHeader}>
                <h2>{translate('gateway.agents.table')}</h2>
                <span>{translate('gateway.verify.catalogHint')}</span>
            </header>
            <div className={style.tableWrap}>
                <table aria-label={translate('gateway.verify.table')}>
                    <thead>
                        <tr>
                            {['name', 'kind', 'endpoint', 'status', 'verifiedAt'].map((column) => (
                                <th key={column}>{translate(`gateway.verify.columns.${column}`)}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {agents.map((agent) => (
                            <tr key={agent.id}>
                                <td className={style.strongCell}>{translate(agent.nameKey)}</td>
                                <td>{translate(agent.kindKey)}</td>
                                <td>
                                    <code>{agent.endpoint}</code>
                                </td>
                                <td>
                                    <span className={classNames(style.status, agent.isVerified ? style.statusActive : style.statusFailed)}>
                                        {translate(agent.isVerified ? 'gateway.status.verified' : 'gateway.status.unverified')}
                                    </span>
                                </td>
                                <td>{agent.verifiedAt || translate('common.notAvailable')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
};

export default GatewayVerificationPanel;
