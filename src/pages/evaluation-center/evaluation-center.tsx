import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import classNames from 'classnames';
import style from '@/pages/evaluation-center/evaluation-center.module.less';

type Tab = 'overview' | 'create' | 'runs' | 'reports' | 'assets';
type Direction = '发现' | '利用' | '修复';

type Benchmark = {
    id: string;
    name: string;
    direction: Direction;
    scale: string;
    metric: string;
    description: string;
    dataReady: boolean;
    environmentReady: boolean;
    graderReady: boolean;
};

const BENCHMARKS: readonly Benchmark[] = [
    {
        id: 'exploit-gym',
        name: 'ExploitGym',
        direction: '利用',
        scale: '869 个容器化目标',
        metric: '成功率 / Flag / 缓解配置',
        description: 'Userspace、V8 与 Kernel 目标的利用能力评测目录。',
        dataReady: true,
        environmentReady: true,
        graderReady: false,
    },
    {
        id: 'exploit-bench',
        name: 'ExploitBench',
        direction: '利用',
        scale: '41 个 V8 任务',
        metric: 'capability score / ACE',
        description: 'V8 漏洞能力阶梯与固定种子场景。',
        dataReady: true,
        environmentReady: false,
        graderReady: false,
    },
    {
        id: 'cyber-gym',
        name: 'CyberGym',
        direction: '发现',
        scale: '1,507 个任务 · 188 个项目',
        metric: 'L0-L3 / PoC 提交成功率',
        description: '漏洞发现任务，包含 vulnerable/fixed 状态引用。',
        dataReady: true,
        environmentReady: true,
        graderReady: true,
    },
    {
        id: 'real-vuln-v2',
        name: 'RealVuln v2',
        direction: '发现',
        scale: '66 仓库 · 2,182 GT',
        metric: 'TP / FP / FN / strict micro F3',
        description: '仓库工作区与 scanner runtime 的漏洞发现评测目录。',
        dataReady: true,
        environmentReady: false,
        graderReady: true,
    },
    {
        id: 'patch-eval',
        name: 'PatchEval Verified',
        direction: '修复',
        scale: '230 个 CVE 修复任务',
        metric: 'fix-run.sh PASS / 功能回归',
        description: '固定目标镜像与独立 evaluator sandbox 的修复评测目录。',
        dataReady: true,
        environmentReady: false,
        graderReady: false,
    },
];

const DIRECTIONS: readonly { name: Direction; note: string }[] = [
    { name: '发现', note: '识别漏洞与误报边界' },
    { name: '利用', note: '仅在隔离漏洞沙箱中验证' },
    { name: '修复', note: '验证补丁正确性与功能回归' },
];

const TABS: readonly { id: Tab; label: string }[] = [
    { id: 'overview', label: '总览' },
    { id: 'create', label: '新建评测' },
    { id: 'runs', label: '运行记录' },
    { id: 'reports', label: '报告与对比' },
    { id: 'assets', label: '资产与接入' },
];

const getTab = (value: string | null): Tab => (TABS.some((tab) => tab.id === value) ? (value as Tab) : 'overview');
const supportsDirection = (item: Benchmark, target: Direction) => item.direction === target;

const Readiness = ({ ready, label }: { ready: boolean; label: string }) => (
    <span className={classNames(style.readiness, ready ? style.ready : style.notReady)}>
        <i aria-hidden="true" />
        {label}: {ready ? '已登记' : '待验证'}
    </span>
);

const EvaluationCenter = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [step, setStep] = useState(1);
    const [direction, setDirection] = useState<Direction>('发现');
    const [benchmarkId, setBenchmarkId] = useState('cyber-gym');
    const [sampling, setSampling] = useState<'stratified' | 'all'>('stratified');
    const [modelName, setModelName] = useState('安全代码 Agent v0.9');
    const [connectionChecked, setConnectionChecked] = useState(false);
    const [createdRun, setCreatedRun] = useState(false);

    const activeTab = getTab(searchParams.get('tab'));
    const benchmark = BENCHMARKS.find((item) => item.id === benchmarkId) ?? BENCHMARKS[0];
    const availableBenchmarks = useMemo(() => BENCHMARKS.filter((item) => supportsDirection(item, direction)), [direction]);
    const candidateCount = benchmark.id === 'cyber-gym' ? 148 : benchmark.id === 'exploit-gym' ? 96 : 41;
    const sampleCount = sampling === 'all' ? candidateCount : Math.min(32, candidateCount);
    const selectTab = (tab: Tab) => setSearchParams(tab === 'overview' ? {} : { tab });
    const selectDirection = (nextDirection: Direction) => {
        setDirection(nextDirection);
        const nextBenchmark = BENCHMARKS.find((item) => supportsDirection(item, nextDirection));
        if (nextBenchmark) setBenchmarkId(nextBenchmark.id);
    };
    const createRun = () => {
        setCreatedRun(true);
        setStep(1);
        selectTab('runs');
    };

    const renderOverview = () => (
        <>
            <section className={style.hero} aria-labelledby="evaluation-center-title">
                <div>
                    <span className={style.eyebrow}>V1.3 · 930 评审原型</span>
                    <h1 id="evaluation-center-title">中心化托管安全评测</h1>
                    <p>围绕评测任务完成模型接入、Benchmark 选择、快照冻结、受控运行、单题回放和原生指标报告。</p>
                </div>
                <button type="button" className={style.primaryButton} onClick={() => selectTab('create')}>
                    新建评测任务
                </button>
            </section>
            <section className={style.demoNotice} aria-label="原型说明">
                <strong>演示数据 · 非真实运行</strong>
                <span>当前内容仅用于评审产品流程；未连接模型凭据、评测环境或真实判分器。</span>
            </section>
            <section className={style.metrics} aria-label="评测中心概览">
                <article>
                    <span>Benchmark 目录</span>
                    <b>5</b>
                    <small>五类原生评测口径</small>
                </article>
                <article>
                    <span>可创建的评测方向</span>
                    <b>4</b>
                    <small>发现、利用、修复</small>
                </article>
                <article>
                    <span>当前演示任务</span>
                    <b>1</b>
                    <small>等待环境预检</small>
                </article>
                <article>
                    <span>报告闸门</span>
                    <b>冻结</b>
                    <small>快照差异将禁止直接比较</small>
                </article>
            </section>
            <section className={style.section}>
                <header className={style.sectionHeader}>
                    <div>
                        <span>评测任务闭环</span>
                        <h2>从范围到报告，每一步留下可核验快照</h2>
                    </div>
                    <button type="button" className={style.textButton} onClick={() => selectTab('create')}>
                        进入任务向导 →
                    </button>
                </header>
                <ol className={style.flow}>
                    {['确定范围', '选择 Benchmark', '确认任务集', '抽题与冻结', '模型配置与预检', '受控运行', '回放与报告'].map((item, index) => (
                        <li key={item}>
                            <b>0{index + 1}</b>
                            <span>{item}</span>
                        </li>
                    ))}
                </ol>
            </section>
            <section className={style.splitGrid}>
                <article className={style.card}>
                    <header>
                        <div>
                            <span>下一步</span>
                            <h2>创建可运行的评测批次</h2>
                        </div>
                        <span className={style.statusPending}>等待预检</span>
                    </header>
                    <dl className={style.definitionList}>
                        <div>
                            <dt>方向</dt>
                            <dd>漏洞发现</dd>
                        </div>
                        <div>
                            <dt>候选任务</dt>
                            <dd>148 / 演示快照</dd>
                        </div>
                        <div>
                            <dt>默认抽题</dt>
                            <dd>按难度分层随机 32 题</dd>
                        </div>
                        <div>
                            <dt>隔离策略</dt>
                            <dd>无公网 · sandbox only</dd>
                        </div>
                    </dl>
                    <button type="button" className={style.secondaryButton} onClick={() => selectTab('create')}>
                        继续配置
                    </button>
                </article>
                <article className={style.card}>
                    <header>
                        <div>
                            <span>安全与治理</span>
                            <h2>运行前的硬性边界</h2>
                        </div>
                    </header>
                    <ul className={style.guardList}>
                        <li>题单、模型、环境、工具、预算与评分规则必须冻结。</li>
                        <li>仅授权隔离环境；默认禁止访问公网和未授权资产。</li>
                        <li>低置信、判分冲突与风险事件必须进入人工复核。</li>
                    </ul>
                </article>
            </section>
        </>
    );

    const renderCreate = () => (
        <section className={style.creation} aria-labelledby="create-title">
            <header className={style.sectionHeader}>
                <div>
                    <span>评测任务向导</span>
                    <h1 id="create-title">创建评测批次</h1>
                    <p>配置会在提交前汇总为不可变快照；本原型不会发起真实运行。</p>
                </div>
                <span className={style.demoPill}>演示流程</span>
            </header>
            <ol className={style.stepper} aria-label="创建评测步骤">
                {['范围', 'Benchmark', '任务集', '模型与预算', '确认运行'].map((item, index) => (
                    <li key={item} className={classNames(index + 1 === step && style.current, index + 1 < step && style.done)}>
                        <b>{index + 1}</b>
                        <span>{item}</span>
                    </li>
                ))}
            </ol>
            <div className={style.wizardLayout}>
                <div className={style.wizardPanel}>
                    {step === 1 ? (
                        <fieldset className={style.choiceFieldset}>
                            <legend>1. 确定评测范围</legend>
                            <p>V1.3 默认按评测方向进入，随后再选择目标领域和 Benchmark。</p>
                            <div className={style.choiceGrid}>
                                {DIRECTIONS.map((item) => (
                                    <button
                                        key={item.name}
                                        type="button"
                                        className={classNames(style.choiceCard, direction === item.name && style.selected)}
                                        onClick={() => selectDirection(item.name)}
                                    >
                                        <b>{item.name}</b>
                                        <span>{item.note}</span>
                                    </button>
                                ))}
                            </div>
                        </fieldset>
                    ) : null}
                    {step === 2 ? (
                        <fieldset className={style.choiceFieldset}>
                            <legend>2. 选择 Benchmark</legend>
                            <p>目录状态为演示信息。真实运行前必须由运营人员验证环境和判分器。</p>
                            <div className={style.benchmarkChoices}>
                                {availableBenchmarks.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        className={classNames(style.benchmarkChoice, benchmarkId === item.id && style.selected)}
                                        onClick={() => setBenchmarkId(item.id)}
                                    >
                                        <div>
                                            <b>{item.name}</b>
                                            <span>{item.scale}</span>
                                        </div>
                                        <small>{item.metric}</small>
                                    </button>
                                ))}
                            </div>
                        </fieldset>
                    ) : null}
                    {step === 3 ? (
                        <fieldset className={style.choiceFieldset}>
                            <legend>3. 确认任务集与抽题</legend>
                            <p>候选任务按方向、数据集子集和环境可用性筛选，并以漏洞 ID、版本、方向和目标去重。</p>
                            <dl className={style.counts}>
                                <div>
                                    <dt>候选任务</dt>
                                    <dd>{candidateCount}</dd>
                                </div>
                                <div>
                                    <dt>已去重</dt>
                                    <dd>{candidateCount - 8}</dd>
                                </div>
                                <div>
                                    <dt>可运行</dt>
                                    <dd>{candidateCount - 16}</dd>
                                </div>
                                <div>
                                    <dt>待验证</dt>
                                    <dd>16</dd>
                                </div>
                            </dl>
                            <div className={style.choiceGrid}>
                                <button type="button" className={classNames(style.choiceCard, sampling === 'stratified' && style.selected)} onClick={() => setSampling('stratified')}>
                                    <b>分层随机抽题</b>
                                    <span>保存 seed，并按难度与领域分层。</span>
                                </button>
                                <button type="button" className={classNames(style.choiceCard, sampling === 'all' && style.selected)} onClick={() => setSampling('all')}>
                                    <b>全量评测</b>
                                    <span>将全部候选任务写入冻结题单。</span>
                                </button>
                            </div>
                        </fieldset>
                    ) : null}
                    {step === 4 ? (
                        <fieldset className={style.choiceFieldset}>
                            <legend>4. 模型、运行配置与预检</legend>
                            <p>仅展示接入配置结构，模型凭据不在浏览器中展示或保存。</p>
                            <label className={style.inputLabel}>
                                模型 / Agent 版本
                                <input value={modelName} onChange={(event) => setModelName(event.target.value)} />
                            </label>
                            <div className={style.policyGrid}>
                                <span>
                                    <b>并发</b> 2
                                </span>
                                <span>
                                    <b>单题超时</b> 20 min
                                </span>
                                <span>
                                    <b>Token 预算</b> 1.0M
                                </span>
                                <span>
                                    <b>成本上限</b> ¥300
                                </span>
                            </div>
                            <div className={style.connectionLine}>
                                <span>{connectionChecked ? '连接测试通过（演示）' : '尚未执行连接测试'}</span>
                                <button type="button" className={style.secondaryButton} onClick={() => setConnectionChecked(true)}>
                                    测试接入
                                </button>
                            </div>
                        </fieldset>
                    ) : null}
                    {step === 5 ? (
                        <fieldset className={style.choiceFieldset}>
                            <legend>5. 确认并创建评测批次</legend>
                            <p>提交后将锁定当前展示的模型、Benchmark、题单、预算、网络策略和评分规则。</p>
                            <dl className={style.summaryList}>
                                <div>
                                    <dt>评测方向</dt>
                                    <dd>{direction}</dd>
                                </div>
                                <div>
                                    <dt>Benchmark</dt>
                                    <dd>{benchmark.name}</dd>
                                </div>
                                <div>
                                    <dt>题单</dt>
                                    <dd>
                                        {sampling === 'all' ? '全量' : '分层随机'} · {sampleCount} 题
                                    </dd>
                                </div>
                                <div>
                                    <dt>模型 / Agent</dt>
                                    <dd>{modelName}</dd>
                                </div>
                                <div>
                                    <dt>运行策略</dt>
                                    <dd>隔离环境 · 无公网 · 可随时停止</dd>
                                </div>
                                <div>
                                    <dt>评分口径</dt>
                                    <dd>{benchmark.metric}</dd>
                                </div>
                            </dl>
                        </fieldset>
                    ) : null}
                    <footer className={style.wizardFooter}>
                        <button type="button" className={style.secondaryButton} disabled={step === 1} onClick={() => setStep((current) => current - 1)}>
                            上一步
                        </button>
                        <span />
                        {step < 5 ? (
                            <button type="button" className={style.primaryButton} onClick={() => setStep((current) => current + 1)}>
                                下一步
                            </button>
                        ) : (
                            <button type="button" className={style.primaryButton} onClick={createRun}>
                                创建演示批次
                            </button>
                        )}
                    </footer>
                </div>
                <aside className={style.snapshot} aria-label="当前快照">
                    <span>当前快照</span>
                    <h2>评测配置摘要</h2>
                    <dl>
                        <div>
                            <dt>方向</dt>
                            <dd>{direction}</dd>
                        </div>
                        <div>
                            <dt>Benchmark</dt>
                            <dd>{benchmark.name}</dd>
                        </div>
                        <div>
                            <dt>数据状态</dt>
                            <dd>已登记</dd>
                        </div>
                        <div>
                            <dt>环境 / 判分</dt>
                            <dd>
                                {benchmark.environmentReady ? '环境已登记' : '环境待验证'} / {benchmark.graderReady ? '判分已登记' : '判分待验证'}
                            </dd>
                        </div>
                        <div>
                            <dt>题单</dt>
                            <dd>{sampleCount} 题 · seed: demo-930</dd>
                        </div>
                        <div>
                            <dt>预算</dt>
                            <dd>¥300 上限</dd>
                        </div>
                    </dl>
                </aside>
            </div>
        </section>
    );

    const renderRuns = () => (
        <section className={style.section} aria-labelledby="runs-title">
            <header className={style.sectionHeader}>
                <div>
                    <span>可核验运行记录</span>
                    <h1 id="runs-title">评测批次与单题回放</h1>
                    <p>仅展示计划、工具动作、环境观测、产物和判分证据；不展示模型隐藏思维链。</p>
                </div>
                <button type="button" className={style.primaryButton} onClick={() => selectTab('create')}>
                    新建评测
                </button>
            </header>
            <section className={style.demoNotice}>
                <strong>演示数据 · 非真实运行</strong>
                <span>状态和耗时为评审用样例，尚未连接队列、容器或判分器。</span>
            </section>
            <div className={style.runTable} role="table" aria-label="评测批次">
                <div role="row" className={style.tableHeader}>
                    <span>批次</span>
                    <span>范围 / Benchmark</span>
                    <span>冻结快照</span>
                    <span>状态</span>
                    <span>操作</span>
                </div>
                {createdRun ? (
                    <div role="row">
                        <span>
                            <b>EV-20260916-002</b>
                            <small>刚刚创建</small>
                        </span>
                        <span>
                            {direction} · {benchmark.name}
                            <small>
                                {sampleCount} 题 · {modelName}
                            </small>
                        </span>
                        <span>demo-930 · hash pending</span>
                        <span>
                            <i className={style.statusPending}>待预检</i>
                        </span>
                        <span>
                            <button type="button" className={style.textButton}>
                                查看快照
                            </button>
                        </span>
                    </div>
                ) : null}
                <div role="row">
                    <span>
                        <b>EV-20260916-001</b>
                        <small>演示批次</small>
                    </span>
                    <span>
                        发现 · CyberGym<small>32 题 · 安全代码 Agent v0.9</small>
                    </span>
                    <span>manifest: cg-v1 · seed: demo-930</span>
                    <span>
                        <i className={style.statusPending}>等待环境预检</i>
                    </span>
                    <span>
                        <button type="button" className={style.textButton}>
                            查看回放
                        </button>
                    </span>
                </div>
            </div>
            <div className={style.replayCard}>
                <div>
                    <span>单题回放示例</span>
                    <h2>CG-017 · 演示记录</h2>
                    <p>计划已生成；环境请求、工具调用和判分证据在真实运行接入后逐项写入。</p>
                </div>
                <dl>
                    <div>
                        <dt>状态</dt>
                        <dd>未执行</dd>
                    </div>
                    <div>
                        <dt>预计耗时</dt>
                        <dd>18 min</dd>
                    </div>
                    <div>
                        <dt>预算</dt>
                        <dd>¥9.40</dd>
                    </div>
                    <div>
                        <dt>风险事件</dt>
                        <dd>0</dd>
                    </div>
                </dl>
            </div>
        </section>
    );

    const renderReports = () => (
        <section className={style.section} aria-labelledby="reports-title">
            <header className={style.sectionHeader}>
                <div>
                    <span>原生指标优先</span>
                    <h1 id="reports-title">报告与版本比较</h1>
                    <p>漏洞发现、利用、修复分别汇总；不混算为单一“成功率”。</p>
                </div>
                <span className={style.demoPill}>示例报告</span>
            </header>
            <section className={style.demoNotice}>
                <strong>演示数据 · 非真实结果</strong>
                <span>以下仅用于验证报告结构、指标层级和比较提示。</span>
            </section>
            <div className={style.reportGrid}>
                <article>
                    <span>漏洞发现 · RealVuln v2</span>
                    <b>strict micro F3</b>
                    <strong>0.41</strong>
                    <small>TP 18 · FP 6 · FN 13</small>
                </article>
                <article>
                    <span>漏洞发现 · CyberGym</span>
                    <b>PoC 提交成功率</b>
                    <strong>62.5%</strong>
                    <small>any-trial-pass 20 / 32</small>
                </article>
                <article>
                    <span>漏洞利用 · ExploitGym</span>
                    <b>Flag / 缓解配置</b>
                    <strong>—</strong>
                    <small>环境与判分待验证，不生成结果</small>
                </article>
                <article>
                    <span>漏洞修复 · PatchEval</span>
                    <b>fix-run.sh PASS</b>
                    <strong>—</strong>
                    <small>环境与判分待验证，不生成结果</small>
                </article>
            </div>
            <article className={style.comparisonGate}>
                <div>
                    <span>版本对比闸门</span>
                    <h2>只允许同快照、同配置的结果直接比较</h2>
                    <p>当 Benchmark manifest、题单、模型/Agent、环境、工具、预算或评分规则不同，报告会明确提示差异，不给出误导性的横向结论。</p>
                </div>
                <button type="button" className={style.secondaryButton}>
                    查看比较条件
                </button>
            </article>
        </section>
    );

    const renderAssets = () => (
        <section className={style.section} aria-labelledby="assets-title">
            <header className={style.sectionHeader}>
                <div>
                    <span>资产可观测</span>
                    <h1 id="assets-title">Benchmark 资产与模型接入</h1>
                    <p>目录接入不等于环境已上线。数据、环境与判分器需要分别记录可用状态与最近验证时间。</p>
                </div>
                <span className={style.demoPill}>目录演示</span>
            </header>
            <div className={style.assetGrid}>
                {BENCHMARKS.map((item) => (
                    <article key={item.id} className={style.assetCard}>
                        <header>
                            <div>
                                <span>{item.direction}</span>
                                <h2>{item.name}</h2>
                            </div>
                            <span className={style.demoPill}>演示目录</span>
                        </header>
                        <p>{item.description}</p>
                        <dl>
                            <div>
                                <dt>任务规模</dt>
                                <dd>{item.scale}</dd>
                            </div>
                            <div>
                                <dt>原生指标</dt>
                                <dd>{item.metric}</dd>
                            </div>
                        </dl>
                        <footer>
                            <Readiness ready={item.dataReady} label="数据" />
                            <Readiness ready={item.environmentReady} label="环境" />
                            <Readiness ready={item.graderReady} label="判分" />
                        </footer>
                    </article>
                ))}
            </div>
            <article className={style.integrationCard}>
                <div>
                    <span>模型与 Agent 接入</span>
                    <h2>OpenAI-compatible API 优先</h2>
                    <p>接入页仅保存受控的 endpoint、headers、模型参数和 Agent/工具包版本快照；凭据由密钥托管服务保护。</p>
                </div>
                <dl>
                    <div>
                        <dt>当前配置</dt>
                        <dd>安全代码 Agent v0.9</dd>
                    </div>
                    <div>
                        <dt>连接测试</dt>
                        <dd>{connectionChecked ? '通过（演示）' : '未执行'}</dd>
                    </div>
                    <div>
                        <dt>凭据展示</dt>
                        <dd>禁止</dd>
                    </div>
                </dl>
                <button type="button" className={style.secondaryButton} onClick={() => setConnectionChecked(true)}>
                    测试演示接入
                </button>
            </article>
        </section>
    );

    return (
        <main className={style.page}>
            <nav className={style.tabs} aria-label="评测中心导航">
                {TABS.map((tab) => (
                    <button key={tab.id} type="button" className={activeTab === tab.id ? style.activeTab : undefined} onClick={() => selectTab(tab.id)}>
                        {tab.label}
                    </button>
                ))}
            </nav>
            {activeTab === 'overview' ? renderOverview() : null}
            {activeTab === 'create' ? renderCreate() : null}
            {activeTab === 'runs' ? renderRuns() : null}
            {activeTab === 'reports' ? renderReports() : null}
            {activeTab === 'assets' ? renderAssets() : null}
        </main>
    );
};

export default EvaluationCenter;
