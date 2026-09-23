import { useContext, useState } from 'react';
import classNames from 'classnames';
import { useOutletContext } from 'react-router-dom';
import { InfoContext } from '@/provider/global-provider';
import type { IGetUserRes } from '@/components/login/login-service';
import { useQuestionBankSnapshot } from '@/hooks/useQuestionBank';
import useTranslate from '@/hooks/useTranslate';
import DataOverviewPanel from '@/pages/data-center/components/data-overview-panel';
import MyDatasetsPanel from '@/pages/data-center/components/my-datasets-panel';
import QuestionCatalogPanel from '@/pages/data-center/components/question-catalog-panel';
import QuestionLabelPanel from '@/pages/data-center/components/question-label-panel';
import QuestionSamplingPanel from '@/pages/data-center/components/question-sampling-panel';
import QuestionTransferPanel from '@/pages/data-center/components/question-transfer-panel';
import style from '@/pages/data-center/data-center.module.less';

type ViewRole = 'admin' | 'external';
type QuestionBankTab = 'overview' | 'catalog' | 'labels' | 'sampling' | 'transfer' | 'datasets';

interface TabConfig {
    id: QuestionBankTab;
    labelKey: string;
}

/**
 * Tab-level permission split (PRD §7.2): admins run the question-bank production
 * line (6 tabs); external users get a read-only benchmark view plus their own
 * writable domain — datasets, sampling plans, export requests (4 tabs). No shared
 * tab names between the two roles to avoid "visible but disabled" ambiguity.
 */
const ADMIN_TABS: readonly TabConfig[] = [
    { id: 'overview', labelKey: 'questionBank.tabs.overview' },
    { id: 'catalog', labelKey: 'questionBank.tabs.catalog' },
    { id: 'labels', labelKey: 'questionBank.tabs.labels' },
    { id: 'sampling', labelKey: 'questionBank.tabs.sampling' },
    { id: 'transfer', labelKey: 'questionBank.tabs.transfer' },
];

const EXTERNAL_TABS: readonly TabConfig[] = [
    // First-run journey (pm-critic F-04): a new vendor project starts by discovering
    // what it can use, then uploads its own data, plans sampling, requests exports.
    { id: 'catalog', labelKey: 'questionBank.tabs.catalogExternal' },
    { id: 'datasets', labelKey: 'questionBank.tabs.datasets' },
    { id: 'sampling', labelKey: 'questionBank.tabs.samplingExternal' },
    { id: 'transfer', labelKey: 'questionBank.tabs.transferExternal' },
];

const DataCenter = () => {
    const translate = useTranslate();
    const routeUser = useOutletContext<IGetUserRes | undefined>();
    const { userInfo } = useContext(InfoContext);
    const accountIsAdmin = (routeUser?.status ?? userInfo.status) === 'ADMIN';
    // External accounts are locked to the external view; admins keep a preview
    // toggle so the same demo account can walk both user journeys.
    const [viewRole, setViewRole] = useState<ViewRole>(accountIsAdmin ? 'admin' : 'external');
    const isAdmin = viewRole === 'admin';
    const tabs = isAdmin ? ADMIN_TABS : EXTERNAL_TABS;
    const [activeTab, setActiveTab] = useState<QuestionBankTab>(tabs[0].id);

    const snapshotQuery = useQuestionBankSnapshot();
    const snapshot = snapshotQuery.data;

    const switchRole = (role: ViewRole) => {
        setViewRole(role);
        setActiveTab((role === 'admin' ? ADMIN_TABS : EXTERNAL_TABS)[0].id);
    };

    return (
        <main className={style.page} data-view={isAdmin ? 'admin' : 'user'}>
            <header className={style.pageHeader}>
                <div>
                    <span>{translate('questionBank.eyebrow')}</span>
                    <h1>{translate('nav.data')}</h1>
                    <p>{translate(isAdmin ? 'questionBank.subtitle' : 'questionBank.subtitleExternal')}</p>
                </div>
                <div className={style.qbHeaderControls}>
                    <span className={style.roleBadge}>{translate(isAdmin ? 'data.center.adminMode' : 'data.center.userMode')}</span>
                    {accountIsAdmin ? (
                        <div className={style.qbChipRow} role="group" aria-label={translate('questionBank.viewToggle.label')}>
                            <button type="button" className={viewRole === 'admin' ? style.qbChipActive : style.qbChip} onClick={() => switchRole('admin')}>
                                {translate('questionBank.viewToggle.admin')}
                            </button>
                            <button type="button" className={viewRole === 'external' ? style.qbChipActive : style.qbChip} onClick={() => switchRole('external')}>
                                {translate('questionBank.viewToggle.external')}
                            </button>
                        </div>
                    ) : null}
                    <span className={style.qbDemoBadge}>{translate('questionBank.demoNotice')}</span>
                </div>
            </header>

            <section className={style.gatewayCard} aria-label={translate('questionBank.tabs.label')}>
                <div className={style.qbTabs} role="tablist" aria-label={translate('questionBank.tabs.label')}>
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab.id}
                            aria-controls={`question-bank-panel-${tab.id}`}
                            className={classNames(activeTab === tab.id && style.activeTab)}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {translate(tab.labelKey)}
                        </button>
                    ))}
                </div>
                <div id={`question-bank-panel-${activeTab}`} className={style.tabPanel} role="tabpanel">
                    {snapshotQuery.isError ? (
                        <p className={style.qbDangerLine}>{translate('common.error')}</p>
                    ) : activeTab === 'overview' && isAdmin ? (
                        <DataOverviewPanel translate={translate} onOpenCatalog={() => setActiveTab('catalog')} />
                    ) : activeTab === 'catalog' ? (
                        <QuestionCatalogPanel translate={translate} variant={isAdmin ? 'admin' : 'external'} snapshot={snapshot} />
                    ) : activeTab === 'labels' && isAdmin ? (
                        <QuestionLabelPanel translate={translate} isAdmin snapshot={snapshot} />
                    ) : activeTab === 'sampling' ? (
                        <QuestionSamplingPanel translate={translate} variant={isAdmin ? 'admin' : 'external'} snapshot={snapshot} />
                    ) : activeTab === 'datasets' && !isAdmin ? (
                        <MyDatasetsPanel translate={translate} snapshot={snapshot} />
                    ) : activeTab === 'transfer' ? (
                        <QuestionTransferPanel translate={translate} variant={isAdmin ? 'admin' : 'external'} snapshot={snapshot} />
                    ) : null}
                </div>
            </section>
        </main>
    );
};

export default DataCenter;
