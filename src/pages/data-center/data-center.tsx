import { useContext, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { InfoContext } from '@/provider/global-provider';
import type { IGetUserRes } from '@/components/login/login-service';
import useTranslate from '@/hooks/useTranslate';
import style from '@/pages/data-center/data-center.module.less';

type Dataset = {
    id: string;
    name: string;
    version: string;
    type: 'Benchmark' | '自建数据集';
    capability: string;
    domains: string;
    tasks: number;
    environment: string;
    grader: string;
    status: '可运行' | '待验证';
    ownerOnly?: boolean;
    metric: string;
};

const DATASETS: readonly Dataset[] = [
    {
        id: 'exploitgym',
        name: 'ExploitGym',
        version: 'v1.0',
        type: 'Benchmark',
        capability: '漏洞利用',
        domains: '用户态 / 浏览器 / 内核',
        tasks: 869,
        environment: '869 容器化目标',
        grader: 'Exploit Validator',
        status: '可运行',
        metric: 'Exploit Count',
    },
    {
        id: 'exploitbench',
        name: 'ExploitBench',
        version: 'v8-r1',
        type: 'Benchmark',
        capability: '漏洞利用',
        domains: '浏览器与引擎',
        tasks: 41,
        environment: '41 V8 镜像',
        grader: 'Tier Grader',
        status: '可运行',
        metric: 'T5–T1 能力阶梯',
    },
    {
        id: 'cybergym',
        name: 'CyberGym',
        version: 'Level 1',
        type: 'Benchmark',
        capability: '漏洞发现 / 复现',
        domains: '用户态 / Web',
        tasks: 1507,
        environment: '3,014 镜像状态引用',
        grader: 'Submission Grader',
        status: '可运行',
        metric: '任务成功率',
    },
    {
        id: 'realvuln',
        name: 'RealVuln v2',
        version: 'v2.0',
        type: 'Benchmark',
        capability: '漏洞发现',
        domains: 'Web / 云原生',
        tasks: 2182,
        environment: '66 repo workspace',
        grader: 'Finding Grader',
        status: '待验证',
        metric: 'Finding Precision',
    },
    {
        id: 'patcheval',
        name: 'PatchEval Verified',
        version: 'fe6f402a',
        type: 'Benchmark',
        capability: '漏洞修复',
        domains: 'Web / 用户态',
        tasks: 230,
        environment: '230 evaluator sandbox',
        grader: 'fix-run.sh',
        status: '可运行',
        metric: 'PASS / MODEL_INCORRECT',
    },
    {
        id: 'internal-draft',
        name: '内部题库草稿',
        version: '2026.09-draft',
        type: '自建数据集',
        capability: '漏洞发现 / 利用',
        domains: '云原生与基础设施',
        tasks: 320,
        environment: '待验证 Docker 沙箱',
        grader: '待发布判分器',
        status: '待验证',
        ownerOnly: true,
        metric: '发布前校验',
    },
    {
        id: 'custom-web',
        name: '自建 Web 漏洞利用集',
        version: '2026.09',
        type: '自建数据集',
        capability: '漏洞利用',
        domains: 'Web 应用与服务',
        tasks: 4860,
        environment: 'Docker 漏洞沙箱',
        grader: '平台判分器',
        status: '可运行',
        metric: '成功率 / 运行取证',
    },
];

const DataCenter = () => {
    const translate = useTranslate();
    const routeUser = useOutletContext<IGetUserRes | undefined>();
    const { userInfo } = useContext(InfoContext);
    const isAdmin = (routeUser?.status ?? userInfo.status) === 'ADMIN';
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState<Dataset | null>(null);
    const datasets = useMemo(
        () =>
            DATASETS.filter(
                (dataset) =>
                    (!dataset.ownerOnly || isAdmin) && (dataset.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()) || dataset.capability.includes(query) || dataset.domains.includes(query)),
            ),
        [isAdmin, query],
    );

    return (
        <main className={style.page} data-view={isAdmin ? 'admin' : 'user'}>
            <header className={style.pageHeader}>
                <div>
                    <span>{translate('data.center.eyebrow')}</span>
                    <h1>{translate('nav.data')}</h1>
                    <p>{translate('data.center.subtitle')}</p>
                </div>
                <span className={style.roleBadge}>{translate(isAdmin ? 'data.center.adminMode' : 'data.center.userMode')}</span>
            </header>

            <section className={style.summary} aria-label={translate('data.center.summary')}>
                <div>
                    <span>{translate('data.center.sandboxes')}</span>
                    <strong>2,500+</strong>
                    <small>{translate('data.center.sandboxesHint')}</small>
                </div>
                <div>
                    <span>{translate('data.center.benchmarks')}</span>
                    <strong>5</strong>
                    <small>{translate('data.center.benchmarksHint')}</small>
                </div>
                <div>
                    <span>{translate('data.center.datasets')}</span>
                    <strong>12</strong>
                    <small>{translate('data.center.datasetsHint')}</small>
                </div>
                <div>
                    <span>{translate('data.center.versions')}</span>
                    <strong>26</strong>
                    <small>{translate('data.center.versionsHint')}</small>
                </div>
            </section>

            <section className={style.toolbar} aria-label={translate('data.center.toolbar')}>
                <input
                    type="search"
                    aria-label={translate('data.center.search')}
                    placeholder={translate('data.center.searchPlaceholder')}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                />
                <span>{isAdmin ? translate('data.center.adminHint') : translate('data.center.userHint')}</span>
            </section>

            <section className={style.catalog} aria-label={isAdmin ? translate('data.center.adminCatalog') : translate('data.center.userCatalog')}>
                <header>
                    <h2>{isAdmin ? translate('data.center.adminCatalog') : translate('data.center.userCatalog')}</h2>
                    <span>
                        {datasets.length} {translate('data.center.items')}
                    </span>
                </header>
                <div className={style.grid}>
                    {datasets.map((dataset) => (
                        <article key={dataset.id} className={style.card}>
                            <header>
                                <div>
                                    <strong>{dataset.name}</strong>
                                    <span>{dataset.version}</span>
                                </div>
                                <b className={dataset.status === '可运行' ? style.ready : style.pending}>{dataset.status}</b>
                            </header>
                            <p>
                                {dataset.type} · {dataset.capability}
                            </p>
                            <dl>
                                <div>
                                    <dt>{translate('data.center.fields.tasks')}</dt>
                                    <dd>{dataset.tasks.toLocaleString()}</dd>
                                </div>
                                <div>
                                    <dt>{translate('data.center.fields.domain')}</dt>
                                    <dd>{dataset.domains}</dd>
                                </div>
                                <div>
                                    <dt>{translate('data.center.fields.environment')}</dt>
                                    <dd>{dataset.environment}</dd>
                                </div>
                                <div>
                                    <dt>{translate('data.center.fields.metric')}</dt>
                                    <dd>{dataset.metric}</dd>
                                </div>
                            </dl>
                            <footer>
                                <span>
                                    {translate('data.center.grader')}：{dataset.grader}
                                </span>
                                <button type="button" onClick={() => setSelected(dataset)}>
                                    {translate('data.center.detail')}
                                </button>
                            </footer>
                        </article>
                    ))}
                </div>
            </section>

            {isAdmin ? (
                <section className={style.adminPanel} aria-label={translate('data.center.adminActions')}>
                    <h2>{translate('data.center.adminActions')}</h2>
                    <p>{translate('data.center.adminActionsHint')}</p>
                    <div>
                        <button type="button">{translate('data.center.import')}</button>
                        <button type="button">{translate('data.center.verify')}</button>
                        <button type="button">{translate('data.center.publish')}</button>
                        <button type="button">{translate('data.center.retire')}</button>
                    </div>
                </section>
            ) : null}

            {selected ? (
                <div className={style.backdrop}>
                    <section className={style.detailDialog} role="dialog" aria-modal="true" aria-labelledby="dataset-detail-title">
                        <header>
                            <div>
                                <h2 id="dataset-detail-title">{selected.name}</h2>
                                <p>
                                    {selected.version} · {selected.type}
                                </p>
                            </div>
                            <button type="button" aria-label={translate('common.close')} onClick={() => setSelected(null)}>
                                ×
                            </button>
                        </header>
                        <dl>
                            <div>
                                <dt>release_version</dt>
                                <dd>{selected.version}</dd>
                            </div>
                            <div>
                                <dt>manifest_hash</dt>
                                <dd>sha256:9c7e…{selected.id}</dd>
                            </div>
                            <div>
                                <dt>full_task_count</dt>
                                <dd>{selected.tasks.toLocaleString()}</dd>
                            </div>
                            <div>
                                <dt>logical_target_env_count</dt>
                                <dd>{selected.environment}</dd>
                            </div>
                            <div>
                                <dt>primary_metric</dt>
                                <dd>{selected.metric}</dd>
                            </div>
                            <div>
                                <dt>grader_ready</dt>
                                <dd>{selected.status === '可运行' ? 'true' : 'pending'}</dd>
                            </div>
                        </dl>
                        <p>{translate('data.center.detailHint')}</p>
                    </section>
                </div>
            ) : null}
        </main>
    );
};

export default DataCenter;
