import { useContext, useState } from 'react';
import classNames from 'classnames';
import GatewayAgentPanel from '@/pages/gateway/components/gateway-agent-panel';
import GatewayApiPanel from '@/pages/gateway/components/gateway-api-panel';
import GatewayDocsPanel from '@/pages/gateway/components/gateway-docs-panel';
import GatewaySessionsPanel from '@/pages/gateway/components/gateway-sessions-panel';
import { GatewayCreateTokenDialog, GatewayRevokeTokenDialog, GatewayTokenSecretDialog } from '@/pages/gateway/components/gateway-token-dialogs';
import GatewayTokenPanel from '@/pages/gateway/components/gateway-token-panel';
import GatewayVerificationPanel from '@/pages/gateway/components/gateway-verification-panel';
import { GATEWAY_AGENTS, GATEWAY_TABS, type GatewayTab } from '@/pages/gateway/gateway-mock';
import { useApiTokens, useCreateApiToken, useRevokeApiToken } from '@/hooks/useApiTokens';
import useTranslate from '@/hooks/useTranslate';
import { InfoContext } from '@/provider/global-provider';
import style from '@/pages/gateway/gateway.module.less';

const Gateway = () => {
    const { lang } = useContext(InfoContext);
    const translate = useTranslate();
    const [activeTab, setActiveTab] = useState<GatewayTab>('agents');
    const [agents, setAgents] = useState(() => GATEWAY_AGENTS.map((agent) => ({ ...agent })));
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [plaintextToken, setPlaintextToken] = useState<string | null>(null);
    const [revokingId, setRevokingId] = useState<string | null>(null);
    const [pendingRevokeId, setPendingRevokeId] = useState<string | null>(null);
    const tokenQuery = useApiTokens();
    const createMutation = useCreateApiToken();
    const revokeMutation = useRevokeApiToken();

    const handleCreate = async (name: string) => {
        try {
            const created = await createMutation.mutateAsync(name);
            setPlaintextToken(created.token);
            setIsCreateOpen(false);
            setActiveTab('keys');
            createMutation.reset();
        } catch {
            // Mutation state renders the localized error inside the dialog.
        }
    };

    const handleRevoke = async (credentialId: string) => {
        setRevokingId(credentialId);
        try {
            await revokeMutation.mutateAsync(credentialId);
            setPendingRevokeId(null);
        } finally {
            setRevokingId(null);
        }
    };

    const handleVerified = (agentId: string) => {
        const verifiedAt = new Date().toISOString();
        setAgents((current) => current.map((agent) => (agent.id === agentId ? { ...agent, isVerified: true, verifiedAt } : agent)));
    };

    const tokenError = tokenQuery.isError ? translate('gateway.keys.loadError') : revokeMutation.isError ? translate('gateway.keys.revokeError') : null;
    const createError = createMutation.isError ? translate('gateway.keys.createError') : null;
    const activeTokens = tokenQuery.data?.list.filter((token) => token.status === 'ACTIVE') ?? [];
    const pendingRevokeToken = tokenQuery.data?.list.find((token) => token.credentialId === pendingRevokeId);

    return (
        <main className={style.gatewayPage}>
            <header className={style.pageHeader}>
                <div className={style.titleBlock}>
                    <div className={style.titleRow}>
                        <h1>{translate('gateway.title')}</h1>
                        <span className={style.helpBadge} role="img" aria-label={translate('gateway.help')}>
                            ?
                        </span>
                    </div>
                    <p>{translate('gateway.subtitle')}</p>
                </div>
                <button type="button" className={style.primaryButton} onClick={() => setIsCreateOpen(true)}>
                    {translate('gateway.keys.create')}
                </button>
            </header>

            <section className={style.gatewayCard}>
                <div className={style.tabs} role="tablist" aria-label={translate('gateway.tabs.label')}>
                    {GATEWAY_TABS.map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab}
                            aria-controls={`gateway-panel-${tab}`}
                            className={classNames(activeTab === tab && style.activeTab)}
                            onClick={() => setActiveTab(tab)}
                        >
                            {translate(`gateway.tabs.${tab}`)}
                        </button>
                    ))}
                </div>
                <div id={`gateway-panel-${activeTab}`} className={style.tabPanel} role="tabpanel">
                    {activeTab === 'agents' ? <GatewayAgentPanel agents={agents} translate={translate} /> : null}
                    {activeTab === 'keys' ? (
                        <GatewayTokenPanel
                            data={tokenQuery.data}
                            errorMessage={tokenError}
                            isLoading={tokenQuery.isLoading}
                            language={lang}
                            revokingId={revokingId}
                            translate={translate}
                            onRefetch={() => void tokenQuery.refetch()}
                            onRevoke={setPendingRevokeId}
                        />
                    ) : null}
                    {activeTab === 'docs' ? <GatewayDocsPanel translate={translate} /> : null}
                    {activeTab === 'verify' ? <GatewayVerificationPanel agents={agents} tokens={activeTokens} translate={translate} onVerified={handleVerified} /> : null}
                    {activeTab === 'sessions' ? <GatewaySessionsPanel language={lang} translate={translate} /> : null}
                    {activeTab === 'api' ? <GatewayApiPanel translate={translate} /> : null}
                </div>
            </section>

            {isCreateOpen ? (
                <GatewayCreateTokenDialog
                    errorMessage={createError}
                    isSubmitting={createMutation.isPending}
                    translate={translate}
                    onClose={() => {
                        setIsCreateOpen(false);
                        createMutation.reset();
                    }}
                    onSubmit={(name) => void handleCreate(name)}
                />
            ) : null}
            {plaintextToken ? <GatewayTokenSecretDialog token={plaintextToken} translate={translate} onClose={() => setPlaintextToken(null)} /> : null}
            {pendingRevokeToken ? (
                <GatewayRevokeTokenDialog
                    isSubmitting={revokeMutation.isPending}
                    token={pendingRevokeToken}
                    translate={translate}
                    onClose={() => setPendingRevokeId(null)}
                    onConfirm={() => void handleRevoke(pendingRevokeToken.credentialId)}
                />
            ) : null}
        </main>
    );
};

export default Gateway;
