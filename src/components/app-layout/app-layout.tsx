import { useContext } from 'react';
import classNames from 'classnames';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { InfoContext } from '@/provider/global-provider';
import useTranslate from '@/hooks/useTranslate';
import { useTheme } from '@/hooks/useTheme';
import IconFont from '@/components/icon-font/icon-font';
import type { IGetUserRes } from '@/components/login/login-service';
import style from '@/components/app-layout/app-layout.module.less';

const NAVIGATION_GROUPS = [
    {
        labelKey: 'nav.groups.primary',
        isLabelVisible: false,
        items: [{ icon: 'icon-awareness', labelKey: 'nav.dashboard', match: /^\/(?:dashboard)?\/?$/, path: '/dashboard' }],
    },
    {
        labelKey: 'nav.groups.tasks',
        isLabelVisible: true,
        items: [
            { icon: 'icon-test-tasks', labelKey: 'nav.codeEvaluation', match: /^\/(?:tasks|confirm|workbench)(?:\/|$)/, path: '/tasks?type=code' },
            { icon: 'icon-range-hall', labelKey: 'nav.rangeEvaluation', match: /^\/(?:tasks|confirm|workbench)(?:\/|$)/, path: '/tasks?type=range' },
        ],
    },
    {
        labelKey: 'nav.groups.operations',
        isLabelVisible: true,
        items: [
            { icon: 'icon-data-center', labelKey: 'nav.data', match: /^\/data(?:\/|$)/, path: '/data' },
            { icon: 'icon-range-hall', labelKey: 'nav.rangeHall', match: /^\/(?:range|range-hall|range-detail)(?:\/|$)/, path: '/range-hall' },
            { icon: 'icon-access-gateway', labelKey: 'nav.gateway', match: /^\/gateway(?:\/|$)/, path: '/gateway' },
            { icon: 'icon-user-settings', labelKey: 'nav.settings', match: /^\/settings(?:\/|$)/, path: '/settings' },
        ],
    },
] as const;

interface AppLayoutProps {
    user?: IGetUserRes;
}

const AppLayout = ({ user }: AppLayoutProps) => {
    const { loginOut, userInfo } = useContext(InfoContext);
    const { theme, toggleTheme } = useTheme();
    const { pathname, search } = useLocation();
    const activeTaskType = new URLSearchParams(search).get('type') === 'range' ? 'range' : 'code';
    const translate = useTranslate();
    const isDashboard = pathname === '/' || /^\/dashboard\/?$/.test(pathname);
    const accountName = user?.username || userInfo.username || translate('auth.account.fallbackName');
    const accountInitial = accountName.slice(0, 1).toUpperCase() || translate('auth.account.fallbackInitial');

    return (
        <div className={style.layout}>
            <aside className={classNames(style.sidebar, isDashboard && style.collapsed)} data-testid="app-sidebar" data-variant={isDashboard ? 'compact' : 'expanded'}>
                <div className={style.brand}>
                    <span className={style.brandSymbol} aria-hidden="true">
                        <IconFont type="icon-brand-shield" />
                    </span>
                    <strong>{translate('app.brand')}</strong>
                </div>
                <nav aria-label={translate('app.brand')}>
                    {NAVIGATION_GROUPS.map((group) => (
                        <section key={group.labelKey} className={style.navGroup} aria-label={translate(group.labelKey)}>
                            {group.isLabelVisible ? <span className={style.navCaption}>{translate(group.labelKey)}</span> : null}
                            {group.items.map((item) => {
                                const itemTaskType = item.path === '/tasks?type=range' ? 'range' : item.path === '/tasks?type=code' ? 'code' : null;
                                const isActive = item.match.test(pathname) && (!itemTaskType || itemTaskType === activeTaskType);
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        aria-label={translate(item.labelKey)}
                                        aria-current={isActive ? 'page' : undefined}
                                        className={classNames(isActive && style.active)}
                                    >
                                        <IconFont type={item.icon} className={style.menuIcon} aria-hidden="true" />
                                        <span className={style.navLabel}>{translate(item.labelKey)}</span>
                                    </Link>
                                );
                            })}
                        </section>
                    ))}
                </nav>
                <div className={style.sidebarFooter}>
                    <div className={style.account}>
                        <span>{accountInitial}</span>
                        <div>
                            <b>{accountName}</b>
                            <div className={style.accountActions}>
                                <button type="button" onClick={toggleTheme} aria-label={translate(theme === 'dark' ? 'theme.switchLight' : 'theme.switchDark')} title={translate(theme === 'dark' ? 'theme.switchLight' : 'theme.switchDark')}>
                                    {theme === 'dark' ? '☀' : '☾'}
                                </button>
                                <button type="button" onClick={loginOut}>
                                    {translate('loginout')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
            <div className={classNames(style.content, isDashboard && style.contentCollapsed)}>
                <Outlet context={user} />
            </div>
        </div>
    );
};

export default AppLayout;
