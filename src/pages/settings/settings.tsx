import { useContext } from 'react';
import classNames from 'classnames';
import { Link, useOutletContext } from 'react-router-dom';
import type { ApiTokenStatus, IApiToken } from '@/api/api-tokens';
import { getSafeAvatarUrl, type IGetUserRes } from '@/components/login/login-service';
import useTranslate from '@/hooks/useTranslate';
import AuditLogPanel from '@/pages/settings/components/audit-log-panel';
import { useApiTokens } from '@/pages/settings/hooks/use-api-tokens';
import { InfoContext } from '@/provider/global-provider';
import style from '@/pages/settings/settings.module.less';

const TOKEN_STATUS_KEY: Readonly<Record<ApiTokenStatus, string>> = {
    ACTIVE: 'settings.status.active',
    EXPIRED: 'settings.status.expired',
    REVOKED: 'settings.status.revoked',
};

const TOKEN_STATUS_CLASS: Readonly<Record<ApiTokenStatus, string>> = {
    ACTIVE: style.statusActive,
    EXPIRED: style.statusExpired,
    REVOKED: style.statusRevoked,
};

const getAccountInitial = (name: string) => {
    const normalizedName = name.trim();
    if (!normalizedName) return '';
    return /^[a-z]/i.test(normalizedName) ? normalizedName.slice(0, 2).toUpperCase() : normalizedName.slice(0, 1);
};

const formatDateTime = (value: string | undefined, language: string, fallback: string) => {
    if (!value) return fallback;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return fallback;
    return new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

interface TokenTableProps {
    language: string;
    tokens: readonly IApiToken[];
    translate: ReturnType<typeof useTranslate>;
}

const TokenTable = ({ language, tokens, translate }: TokenTableProps) => (
    <div className={style.tableWrap}>
        <table>
            <thead>
                <tr>
                    <th>{translate('settings.tokens.columns.name')}</th>
                    <th>{translate('settings.tokens.columns.key')}</th>
                    <th>{translate('settings.tokens.columns.created')}</th>
                    <th>{translate('settings.tokens.columns.expires')}</th>
                    <th>{translate('settings.tokens.columns.revoked')}</th>
                    <th>{translate('settings.tokens.columns.status')}</th>
                </tr>
            </thead>
            <tbody>
                {tokens.map((token) => (
                    <tr key={token.credentialId}>
                        <td>{token.name}</td>
                        <td>
                            <code>{token.keyPrefix}••••••••</code>
                        </td>
                        <td>{formatDateTime(token.createdAt, language, translate('settings.notAvailable'))}</td>
                        <td>{formatDateTime(token.expiresAt, language, translate('settings.notAvailable'))}</td>
                        <td>{formatDateTime(token.revokedAt, language, translate('settings.notAvailable'))}</td>
                        <td>
                            <span className={classNames(style.status, TOKEN_STATUS_CLASS[token.status])}>{translate(TOKEN_STATUS_KEY[token.status])}</span>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const Settings = () => {
    const routeUser = useOutletContext<IGetUserRes | undefined>();
    const { lang, loginOut, userInfo } = useContext(InfoContext);
    const translate = useTranslate();
    const tokenQuery = useApiTokens();
    const user = routeUser?.ssoUid ? routeUser : userInfo;
    const accountName = user.username || user.nickname || translate('auth.account.fallbackName');
    const accountInitial = getAccountInitial(accountName) || translate('auth.account.fallbackInitial');
    const accountStatusKey = user.status === 'ACTIVE' ? 'settings.status.normal' : 'settings.status.unknown';
    const avatarUrl = getSafeAvatarUrl(user.avatar);

    return (
        <main className={style.settingsPage}>
            <header className={style.pageHeader}>
                <div>
                    <h1>{translate('settings.title')}</h1>
                    <p>{translate('settings.subtitle')}</p>
                </div>
                <button type="button" className={style.logoutButton} onClick={loginOut}>
                    {translate('loginout')}
                </button>
            </header>

            <div className={style.profileGrid}>
                <section className={style.card} aria-labelledby="settings-profile-title">
                    <h2 id="settings-profile-title">{translate('settings.profile.title')}</h2>
                    <div className={style.profileRow}>
                        <span className={style.avatar}>
                            {avatarUrl ? <img src={avatarUrl} alt={translate('settings.profile.avatarAlt', { name: accountName })} referrerPolicy="no-referrer" /> : accountInitial}
                        </span>
                        <div>
                            <strong>{accountName}</strong>
                            <small>{translate('settings.profile.ssoAccount', { uid: user.ssoUid || translate('settings.notAvailable') })}</small>
                        </div>
                    </div>
                    <dl className={style.detailList}>
                        <div>
                            <dt>{translate('settings.profile.source')}</dt>
                            <dd>{translate('settings.profile.sourceValue')}</dd>
                        </div>
                        <div>
                            <dt>{translate('settings.profile.userId')}</dt>
                            <dd>{user.userId || translate('settings.notAvailable')}</dd>
                        </div>
                        <div>
                            <dt>{translate('settings.profile.ssoUid')}</dt>
                            <dd>{user.ssoUid || translate('settings.notAvailable')}</dd>
                        </div>
                        <div>
                            <dt>{translate('settings.profile.status')}</dt>
                            <dd>
                                <span className={classNames(style.status, user.status === 'ACTIVE' && style.statusActive)}>{translate(accountStatusKey)}</span>
                            </dd>
                        </div>
                    </dl>
                </section>

                <section className={style.card} aria-labelledby="settings-security-title">
                    <h2 id="settings-security-title">{translate('settings.security.title')}</h2>
                    <dl className={style.detailList}>
                        <div>
                            <dt>{translate('settings.security.authentication')}</dt>
                            <dd>{translate('settings.security.authenticationValue')}</dd>
                        </div>
                        <div>
                            <dt>{translate('settings.security.session')}</dt>
                            <dd>{translate('settings.security.sessionValue')}</dd>
                        </div>
                        <div>
                            <dt>{translate('settings.security.accountStatus')}</dt>
                            <dd>{translate(accountStatusKey)}</dd>
                        </div>
                    </dl>
                    {/* <p className={style.unsupportedNote}>{translate('settings.security.unsupported')}</p> */}
                </section>
            </div>

            <section className={style.card} aria-labelledby="settings-token-title">
                <div className={style.sectionHeader}>
                    <div>
                        <h2 id="settings-token-title">{translate('settings.tokens.title')}</h2>
                        <span>{translate('settings.tokens.subtitle')}</span>
                    </div>
                    {tokenQuery.data ? <small>{translate('settings.tokens.total', { total: tokenQuery.data.page.total })}</small> : null}
                </div>

                {tokenQuery.isLoading ? <div className={style.feedback}>{translate('common.loading')}</div> : null}
                {tokenQuery.isError ? (
                    <div className={style.feedback} role="alert">
                        <span>{translate('settings.tokens.error')}</span>
                        <button type="button" onClick={() => void tokenQuery.refetch()}>
                            {translate('common.retry')}
                        </button>
                    </div>
                ) : null}
                {tokenQuery.data?.list.length === 0 ? <div className={style.feedback}>{translate('settings.tokens.empty')}</div> : null}
                {tokenQuery.data && tokenQuery.data.list.length > 0 ? <TokenTable language={lang} tokens={tokenQuery.data.list} translate={translate} /> : null}

                <div className={style.cardFooter}>
                    <Link to="/gateway">{translate('settings.tokens.manage')}</Link>
                </div>
            </section>

            <div className={style.activityViewport}>
                <AuditLogPanel language={lang} />
            </div>
        </main>
    );
};

export default Settings;
