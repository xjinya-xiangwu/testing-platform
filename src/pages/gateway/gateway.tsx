import { useContext, useState } from 'react';
import classNames from 'classnames';
import GatewayApiPanel from '@/pages/gateway/components/gateway-api-panel';
import GatewayDocsPanel from '@/pages/gateway/components/gateway-docs-panel';
import { GatewayProviderDialog, GatewayRemoveProviderDialog, type GatewayProviderDialogMode } from '@/pages/gateway/components/gateway-provider-dialog';
import GatewayProviderPanel from '@/pages/gateway/components/gateway-provider-panel';
import GatewaySessionsPanel from '@/pages/gateway/components/gateway-sessions-panel';
import { GatewayCreateTokenDialog, GatewayRevokeTokenDialog, GatewayTokenSecretDialog } from '@/pages/gateway/components/gateway-token-dialogs';
import GatewayTokenPanel from '@/pages/gateway/components/gateway-token-panel';
import { useApiTokens, useCreateApiToken, useRevokeApiToken } from '@/hooks/useApiTokens';
import { useGatewayProviders, useRegisterGatewayProvider, useRemoveGatewayProvider, useVerifyGatewayProvider } from '@/hooks/useGatewayProviders';
import useTranslate from '@/hooks/useTranslate';
import { InfoContext } from '@/provider/global-provider';
import style from '@/pages/gateway/gateway.module.less';

type GatewayTab = 'access' | 'keys' | 'docs';

const GATEWAY_TABS: readonly GatewayTab[] = ['access', 'keys', 'docs'];

const Gateway = () => {
    const { lang } = useContext(InfoContext);
    const translate = useTranslate();
    const [activeTab, setActiveTab] = useState<GatewayTab>('access');
    const [isCreateTokenOpen, setIsCreateTokenOpen] = useState(false);
    const [plaintextToken, setPlaintextToken] = useState<string | null>(null);
    const [pendingRevokeId, setPendingRevokeId] = useState<string | null>(null);
    const [providerDialog, setProviderDialog] = useState<GatewayProviderDialogMode | null>(null);
    const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

    const tokenQuery = useApiTokens();
    const createTokenMutation = useCreateApiToken();
    const revokeTokenMutation = useRevokeApiToken();
    const providerQuery = useGatewayProviders();
    const registerProviderMutation = useRegisterGatewayProvider();
    const verifyProviderMutation = useVerifyGatewayProvider();
    const removeProviderMutation = useRemoveGatewayProvider();

    const handleCreateToken = async (name: string, purpose?: 'adversarial' | 'evaluation' | 'training') => {
        try {
            const created = await createTokenMutation.mutateAsync({ name, purpose });
            setPlaintextToken(created.token);
            setIsCreateTokenOpen(false);
            setActiveTab('keys');
            createTokenMutation.reset();
        } catch {
            // Mutation state renders the localized error inside the dialog.
        }
    };

    const handleRevokeToken = async (credentialId: string) => {
        try {
            await revokeTokenMutation.mutateAsync(credentialId);
            setPendingRevokeId(null);
        } finally {
            // Mutation state renders the localized error inside the panel.
        }
    };

    const handleRemoveProvider = async (providerId: string) => {
        try {
            await removeProviderMutation.mutateAsync(providerId);
            setPendingRemoveId(null);
        } finally {
            // Query error state renders inside the providers panel.
        }
    };

    const tokenError = tokenQuery.isError ? translate('gateway.keys.loadError') : revokeTokenMutation.isError ? translate('gateway.keys.revokeError') : null;
    const createTokenError = createTokenMutation.isError ? translate('gateway.keys.createError') : null;
    const providerError = providerQuery.isError || removeProviderMutation.isError ? translate('gateway.providers.loadError') : null;
    const activeTokens = tokenQuery.data?.list.filter((token) => token.status === 'ACTIVE') ?? [];
    const pendingRevokeToken = tokenQuery.data?.list.find((token) => token.credentialId === pendingRevokeId);
    const providers = providerQuery.data?.list ?? [];
    const pendingRemoveProvider = providers.find((provider) => provider.id === pendingRemoveId);
    const busyProviderId = verifyProviderMutation.isPending ? verifyProviderMutation.variables : removeProviderMutation.isPending ? removeProviderMutation.variables : null;

    const closeProviderDialog = () => {
        setProviderDialog(null);
        registerProviderMutation.reset();
        verifyProviderMutation.reset();
    };

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
                <button type="button" className={style.primaryButton} onClick={() => setProviderDialog({ mode: 'register' })}>
                    {translate('gateway.providers.register')}
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
                    {activeTab === 'access' ? (
                        <>
                            <GatewayProviderPanel
                                busyProviderId={busyProviderId}
                                errorMessage={providerError}
                                isLoading={providerQuery.isLoading}
                                language={lang}
                                providers={providers}
                                tokens={tokenQuery.data?.list ?? []}
                                translate={translate}
                                onRegister={() => setProviderDialog({ mode: 'register' })}
                                onRemove={setPendingRemoveId}
                                onRetry={() => void providerQuery.refetch()}
                                onReverify={(providerId) => setProviderDialog({ mode: 'reverify', providerId })}
                            />
                            <GatewaySessionsPanel language={lang} providers={providers} translate={translate} />
                        </>
                    ) : null}
                    {activeTab === 'keys' ? (
                        <GatewayTokenPanel
                            data={tokenQuery.data}
                            errorMessage={tokenError}
                            isLoading={tokenQuery.isLoading}
                            language={lang}
                            revokingId={revokeTokenMutation.isPending ? revokeTokenMutation.variables : null}
                            translate={translate}
                            onCreateToken={() => setIsCreateTokenOpen(true)}
                            onRefetch={() => void tokenQuery.refetch()}
                            onRevoke={setPendingRevokeId}
                        />
                    ) : null}
                    {activeTab === 'docs' ? (
                        <>
                            <GatewayDocsPanel tokens={activeTokens} translate={translate} />
                            <GatewayApiPanel translate={translate} />
                        </>
                    ) : null}
                </div>
            </section>

            {providerDialog ? (
                <GatewayProviderDialog
                    mode={providerDialog}
                    providers={providers}
                    registerMutation={registerProviderMutation}
                    tokens={activeTokens}
                    translate={translate}
                    verifyMutation={verifyProviderMutation}
                    onClose={closeProviderDialog}
                />
            ) : null}
            {pendingRemoveProvider ? (
                <GatewayRemoveProviderDialog
                    isSubmitting={removeProviderMutation.isPending}
                    provider={pendingRemoveProvider}
                    translate={translate}
                    onClose={() => setPendingRemoveId(null)}
                    onConfirm={() => void handleRemoveProvider(pendingRemoveProvider.id)}
                />
            ) : null}
            {isCreateTokenOpen ? (
                <GatewayCreateTokenDialog
                    errorMessage={createTokenError}
                    isSubmitting={createTokenMutation.isPending}
                    translate={translate}
                    onClose={() => {
                        setIsCreateTokenOpen(false);
                        createTokenMutation.reset();
                    }}
                    onSubmit={(name, purpose) => void handleCreateToken(name, purpose)}
                />
            ) : null}
            {plaintextToken ? <GatewayTokenSecretDialog token={plaintextToken} translate={translate} onClose={() => setPlaintextToken(null)} /> : null}
            {pendingRevokeToken ? (
                <GatewayRevokeTokenDialog
                    isSubmitting={revokeTokenMutation.isPending}
                    token={pendingRevokeToken}
                    translate={translate}
                    onClose={() => setPendingRevokeId(null)}
                    onConfirm={() => void handleRevokeToken(pendingRevokeToken.credentialId)}
                />
            ) : null}
        </main>
    );
};

export default Gateway;
