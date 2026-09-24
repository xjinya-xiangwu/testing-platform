import { ChangeEvent } from 'react';
import { TreeSelect } from 'antd';
import { Link } from 'react-router-dom';
import { ITaskCreationData, ITaskDraftPayload, TaskConstraintKey, TaskType } from '@/api/tasks';
import useDialogFocus from '@/hooks/useDialogFocus';
import { TaskEvaluationDirection, TaskSamplingStratum, useTaskDraftStore } from '@/stores/task-draft-store';
import style from '@/pages/tasks/tasks.module.less';

interface TaskWizardProps {
    data: ITaskCreationData;
    isSubmitting: boolean;
    onSubmit: (draft: ITaskDraftPayload) => void;
    submitErrorKey: string | null;
    translate: (key: string, values?: Readonly<Record<string, string | number>>) => string;
}

const CONSTRAINTS: readonly { key: TaskConstraintKey; labelKey: string; maximum: number; minimum: number; unitKey: string }[] = [
    { key: 'duration', labelKey: 'tasks.constraints.duration', minimum: 10, maximum: 120, unitKey: 'tasks.constraints.unit.duration' },
    { key: 'token', labelKey: 'tasks.constraints.token', minimum: 5, maximum: 100, unitKey: 'tasks.constraints.unit.token' },
    { key: 'tools', labelKey: 'tasks.constraints.tools', minimum: 10, maximum: 200, unitKey: 'tasks.constraints.unit.tools' },
    { key: 'cost', labelKey: 'tasks.constraints.cost', minimum: 20, maximum: 1000, unitKey: 'tasks.constraints.unit.cost' },
];

const EVALUATION_DIRECTIONS: readonly { value: TaskEvaluationDirection; title: string; description: string }[] = [
    { value: 'discovery', title: '漏洞发现', description: '从代码或程序中自主发现、定位安全漏洞。' },
    { value: 'exploit', title: '漏洞利用', description: '将已知漏洞转化为利用原语或受控 Exploit。' },
    { value: 'repair', title: '漏洞修复', description: '生成并验证安全补丁，确保功能不回归。' },
];

const TARGET_DOMAINS = ['Web 应用与服务', '用户态软件', '浏览器与引擎', '操作系统与内核', '云原生与基础设施', '网络与协议'] as const;

type EvaluationDataset = {
    id: string;
    benchmark: string;
    version: string;
    taskCount: number;
    directions: readonly TaskEvaluationDirection[];
    domains: readonly (typeof TARGET_DOMAINS)[number][];
    environment: string;
    difficulty: string;
    metric: string;
    average: string;
    description: string;
};

const EVALUATION_DATASETS: readonly EvaluationDataset[] = [
    {
        id: 'cybergym-l0',
        benchmark: 'CyberGym · Level 0',
        version: 'v1.0',
        taskCount: 312,
        directions: ['discovery'],
        domains: ['用户态软件', 'Web 应用与服务'],
        environment: '1,507 逻辑任务环境',
        difficulty: 'L0 自主发现',
        metric: '漏洞定位成功率',
        average: '18 min / 题',
        description: '覆盖软件项目中的自主漏洞发现与定位。',
    },
    {
        id: 'realvuln-v2',
        benchmark: 'RealVuln v2',
        version: 'v2.0',
        taskCount: 2182,
        directions: ['discovery'],
        domains: ['Web 应用与服务', '云原生与基础设施'],
        environment: '66 repo workspace',
        difficulty: 'CWE / 严重性标签',
        metric: 'Finding Precision',
        average: '12 min / repo',
        description: '包含漏洞与 false-positive traps 的真实仓库评测集。',
    },
    {
        id: 'exploitgym-user',
        benchmark: 'ExploitGym · Userspace',
        version: 'v1.0',
        taskCount: 502,
        directions: ['exploit'],
        domains: ['用户态软件'],
        environment: '502 容器化目标',
        difficulty: 'Userspace',
        metric: 'Exploit Count',
        average: '16 min / 题',
        description: '用户态漏洞从触发到利用原语的受控验证。',
    },
    {
        id: 'exploitgym-v8',
        benchmark: 'ExploitGym · V8',
        version: 'v1.0',
        taskCount: 181,
        directions: ['exploit'],
        domains: ['浏览器与引擎'],
        environment: '181 容器化目标',
        difficulty: 'V8 高难度',
        metric: 'Exploit Count',
        average: '28 min / 题',
        description: '浏览器引擎漏洞利用评测单元。',
    },
    {
        id: 'exploitgym-kernel',
        benchmark: 'ExploitGym · Linux Kernel',
        version: 'v1.0',
        taskCount: 186,
        directions: ['exploit'],
        domains: ['操作系统与内核'],
        environment: '186 容器化目标',
        difficulty: 'Kernel 高难度',
        metric: 'Exploit Count',
        average: '36 min / 题',
        description: '内核漏洞利用与环境隔离验证。',
    },
    {
        id: 'exploitbench-v8',
        benchmark: 'ExploitBench',
        version: 'v8-r1',
        taskCount: 41,
        directions: ['exploit'],
        domains: ['浏览器与引擎'],
        environment: '41 V8 目标镜像',
        difficulty: 'T5–T1',
        metric: '能力阶梯',
        average: '25 min / 题',
        description: '从漏洞触发到任意代码执行的 V8 评测。',
    },
    {
        id: 'patcheval-verified',
        benchmark: 'PatchEval Verified',
        version: 'fe6f402a',
        taskCount: 230,
        directions: ['repair'],
        domains: ['Web 应用与服务', '用户态软件'],
        environment: '230 evaluator sandbox',
        difficulty: '语言 / 修复类型',
        metric: 'PASS / MODEL_INCORRECT',
        average: '14 min / 题',
        description: '官方 fix-run.sh 驱动的修复与回归验证。',
    },
];

const getFlow = (taskType: TaskType | null, fixed: boolean, translate: TaskWizardProps['translate']) => {
    if (taskType === 'evaluation' && fixed) {
        return [
            { key: 'matrix', title: translate('tasks.wizard.flow.matrix') },
            { key: 'datasets', title: translate('tasks.wizard.flow.datasets') },
            { key: 'sampling', title: translate('tasks.wizard.flow.sampling') },
            { key: 'runtime', title: translate('tasks.wizard.flow.runtime') },
            { key: 'freeze', title: translate('tasks.wizard.flow.freeze') },
        ];
    }
    if (taskType === 'range') {
        return [
            { key: 'environment', title: translate('tasks.wizard.flow.environment') },
            { key: 'subject', title: translate('tasks.wizard.flow.subject') },
            { key: 'constraints', title: translate('tasks.wizard.flow.constraints') },
            { key: 'freeze', title: translate('tasks.wizard.flow.freeze') },
        ];
    }
    return [
        { key: 'type', title: translate('tasks.wizard.step.type') },
        { key: 'target', title: translate('tasks.wizard.step.target') },
        { key: 'object', title: translate('tasks.wizard.step.object') },
        { key: 'constraints', title: translate('tasks.wizard.step.constraints') },
    ];
};

const TaskWizard = ({ data, isSubmitting, onSubmit, submitErrorKey, translate }: TaskWizardProps) => {
    const constraints = useTaskDraftStore((state) => state.constraints);
    const environmentId = useTaskDraftStore((state) => state.environmentId);
    const evaluationDirections = useTaskDraftStore((state) => state.evaluationDirections);
    const selectedCombinations = useTaskDraftStore((state) => state.selectedCombinations);
    const selectedDatasetIds = useTaskDraftStore((state) => state.selectedDatasetIds);
    const targetDomains = useTaskDraftStore((state) => state.targetDomains);
    const samplingMode = useTaskDraftStore((state) => state.samplingMode);
    const sampleCount = useTaskDraftStore((state) => state.sampleCount);
    const samplingStrata = useTaskDraftStore((state) => state.samplingStrata);
    const stratumWeights = useTaskDraftStore((state) => state.stratumWeights);
    const firstStageRatio = useTaskDraftStore((state) => state.firstStageRatio);
    const isTaskTypeFixed = useTaskDraftStore((state) => state.isTaskTypeFixed);
    const modelId = useTaskDraftStore((state) => state.modelId);
    const objectSource = useTaskDraftStore((state) => state.objectSource);
    const questionSetId = useTaskDraftStore((state) => state.questionSetId);
    const step = useTaskDraftStore((state) => state.step);
    const taskType = useTaskDraftStore((state) => state.taskType);
    const validationErrorKey = useTaskDraftStore((state) => state.validationErrorKey);
    const closeWizard = useTaskDraftStore((state) => state.closeWizard);
    const selectTaskType = useTaskDraftStore((state) => state.selectTaskType);
    const setConstraint = useTaskDraftStore((state) => state.setConstraint);
    const setEnvironmentId = useTaskDraftStore((state) => state.setEnvironmentId);
    const setEvaluationDirections = useTaskDraftStore((state) => state.setEvaluationDirections);
    const setModelId = useTaskDraftStore((state) => state.setModelId);
    const setObjectSource = useTaskDraftStore((state) => state.setObjectSource);
    const setQuestionSetId = useTaskDraftStore((state) => state.setQuestionSetId);
    const setSampleCount = useTaskDraftStore((state) => state.setSampleCount);
    const setSamplingMode = useTaskDraftStore((state) => state.setSamplingMode);
    const setSamplingStrata = useTaskDraftStore((state) => state.setSamplingStrata);
    const setSelectedCombinations = useTaskDraftStore((state) => state.setSelectedCombinations);
    const setSelectedDatasetIds = useTaskDraftStore((state) => state.setSelectedDatasetIds);
    const setStep = useTaskDraftStore((state) => state.setStep);
    const setStratumWeight = useTaskDraftStore((state) => state.setStratumWeight);
    const setTargetDomains = useTaskDraftStore((state) => state.setTargetDomains);
    const setFirstStageRatio = useTaskDraftStore((state) => state.setFirstStageRatio);
    const setValidationErrorKey = useTaskDraftStore((state) => state.setValidationErrorKey);
    const dialogRef = useDialogFocus<HTMLElement>(true, closeWizard);

    const fixedEvaluation = taskType === 'evaluation' && isTaskTypeFixed;
    const fixedRange = taskType === 'range' && isTaskTypeFixed;
    const objectPool = objectSource === 'external' ? data.externalObjects : data.builtinObjects;
    const selectedObject = objectPool.find((object) => object.id === modelId) ?? objectPool[0];
    const selectedEnvironment = data.environments.find((environment) => environment.id === environmentId);
    const selectedQuestionSet = data.questionSets.find((questionSet) => questionSet.id === questionSetId);
    const taskTypeName = taskType ? translate('tasks.type.' + taskType) : '';
    const flow = getFlow(taskType, isTaskTypeFixed, translate);
    const availableCombinations = EVALUATION_DIRECTIONS.flatMap((direction) =>
        TARGET_DOMAINS.map((domain) => ({ id: direction.value + '::' + domain, direction, domain })).filter(({ direction, domain }) =>
            EVALUATION_DATASETS.some((dataset) => dataset.directions.includes(direction.value) && dataset.domains.includes(domain)),
        ),
    );
    const scopeTreeData = EVALUATION_DIRECTIONS.map((direction) => {
        const children = availableCombinations.filter((item) => item.direction.value === direction.value);
        const taskCount = children.reduce(
            (total, item) =>
                total +
                EVALUATION_DATASETS.filter((dataset) => dataset.directions.includes(item.direction.value) && dataset.domains.includes(item.domain)).reduce(
                    (count, dataset) => count + dataset.taskCount,
                    0,
                ),
            0,
        );

        return {
            value: 'direction:' + direction.value,
            label: direction.title,
            title: (
                <span className={style.scopeOptionParent}>
                    <strong>{direction.title}</strong>
                    <small>{translate('tasks.wizard.scopeDirectionMeta', { domains: children.length, tasks: taskCount.toLocaleString() })}</small>
                </span>
            ),
            children: children.map((item) => {
                const datasets = EVALUATION_DATASETS.filter((dataset) => dataset.directions.includes(item.direction.value) && dataset.domains.includes(item.domain));
                const leafTaskCount = datasets.reduce((total, dataset) => total + dataset.taskCount, 0);
                return {
                    value: item.id,
                    label: item.direction.title + ' → ' + item.domain,
                    title: (
                        <span className={style.scopeOptionLeaf}>
                            <strong>{item.direction.title + ' → ' + item.domain}</strong>
                            <small>{translate('tasks.wizard.scopeLeafMeta', { datasets: datasets.length, tasks: leafTaskCount.toLocaleString() })}</small>
                        </span>
                    ),
                };
            }),
        };
    });
    const selectedCombinationItems = availableCombinations.filter((item) => selectedCombinations.includes(item.id));
    const activeDirections = evaluationDirections.length ? evaluationDirections : EVALUATION_DIRECTIONS.map((item) => item.value);
    const activeDomains = targetDomains.length ? targetDomains : [...TARGET_DOMAINS];
    const candidates = EVALUATION_DATASETS.filter(
        (dataset) => dataset.directions.some((direction) => activeDirections.includes(direction)) && dataset.domains.some((domain) => activeDomains.includes(domain)),
    );
    const selectedDatasets = candidates.filter((dataset) => selectedDatasetIds.includes(dataset.id));
    const candidateCount = selectedDatasets.reduce((total, dataset) => total + dataset.taskCount, 0);
    const dedupedCount = Math.max(0, candidateCount - Math.floor(candidateCount * 0.024));
    const runnableCount = Math.max(0, dedupedCount - Math.min(28, Math.floor(dedupedCount * 0.02)));
    const finalCount = samplingMode === 'all' ? runnableCount : Math.min(sampleCount, runnableCount);
    const selectedDatasetNames = selectedDatasets.map((dataset) => dataset.benchmark).join('；') || translate('tasks.wizard.pending');
    const legacyTargetName = translate(taskType === 'evaluation' ? (selectedQuestionSet?.nameKey ?? '') : (selectedEnvironment?.nameKey ?? ''));
    const objectSummary = translate('tasks.wizard.objectSummary', {
        name: selectedObject?.name ?? '',
        source: translate(objectSource === 'external' ? 'tasks.wizard.external' : 'tasks.wizard.builtin'),
        protocol: selectedObject?.protocol ?? '',
        harness: selectedObject?.harness ?? '',
    });
    const configuredWeightTotal = samplingStrata.reduce((total, stratum) => total + stratumWeights[stratum], 0);

    const stepSummary = (index: number) => {
        if (index >= step - 1) return translate('tasks.wizard.pending');
        if (fixedEvaluation) {
            return [
                selectedCombinations.length ? translate('tasks.wizard.combinationSummary', { count: selectedCombinations.length }) : translate('tasks.wizard.pending'),
                selectedDatasetIds.length ? translate('tasks.wizard.datasetSummary', { count: selectedDatasetIds.length, tasks: runnableCount }) : translate('tasks.wizard.pending'),
                samplingMode === 'all' ? translate('tasks.wizard.allTasks', { count: finalCount }) : translate('tasks.wizard.stratifiedSummary', { count: finalCount, strata: samplingStrata.length }),
                selectedObject?.name ?? '',
                translate('tasks.wizard.snapshotSummary'),
            ][index];
        }
        if (fixedRange) {
            return [
                legacyTargetName,
                selectedObject?.name ?? '',
                translate('tasks.wizard.constraintsSummary', { duration: constraints.duration, token: constraints.token }),
                translate('tasks.wizard.snapshotSummary'),
            ][index];
        }
        return [taskTypeName, legacyTargetName, selectedObject?.name ?? '', translate('tasks.wizard.constraintsSummary', { duration: constraints.duration, token: constraints.token })][index];
    };

    const toggle = <T,>(items: readonly T[], item: T) => (items.includes(item) ? items.filter((value) => value !== item) : [...items, item]);
    const toggleDataset = (datasetId: string) => {
        const ids = toggle(selectedDatasetIds, datasetId);
        setSelectedDatasetIds(ids);
        if (ids.length > 0) setQuestionSetId(ids[0]);
    };
    const toggleStratum = (stratum: TaskSamplingStratum) => setSamplingStrata(toggle(samplingStrata, stratum));

    const applyCombinations = (combinations: readonly string[]) => {
        const normalized = [
            ...new Set(
                combinations.flatMap((combination) => {
                    if (!combination.startsWith('direction:')) return [combination];
                    const direction = combination.slice('direction:'.length);
                    return availableCombinations.filter((item) => item.direction.value === direction).map((item) => item.id);
                }),
            ),
        ].filter((combination) => availableCombinations.some((item) => item.id === combination));
        const items = availableCombinations.filter((item) => normalized.includes(item.id));
        setSelectedCombinations(normalized);
        setEvaluationDirections([...new Set(items.map((item) => item.direction.value))]);
        setTargetDomains([...new Set(items.map((item) => item.domain))]);
    };

    const goForward = () => {
        if (step === 1 && !taskType) {
            setValidationErrorKey('tasks.wizard.typeRequired');
            return;
        }
        if (fixedEvaluation && step === 1 && selectedCombinations.length === 0) {
            setValidationErrorKey('tasks.wizard.combinationRequired');
            return;
        }
        if (fixedEvaluation && step === 2 && selectedDatasetIds.length === 0) {
            setValidationErrorKey('tasks.wizard.datasetRequired');
            return;
        }
        if (fixedEvaluation && step === 3 && samplingMode === 'stratified' && (sampleCount < 1 || sampleCount > runnableCount || samplingStrata.length === 0 || configuredWeightTotal !== 100)) {
            setValidationErrorKey('tasks.wizard.strategyRequired');
            return;
        }
        const totalSteps = fixedEvaluation ? 5 : 4;
        if (step < totalSteps) {
            setStep((step + 1) as 2 | 3 | 4 | 5);
            return;
        }
        onSubmit({ constraints, environmentId, modelId, objectSource, questionSetId, taskType });
    };

    const handleConstraint = (key: TaskConstraintKey) => (event: ChangeEvent<HTMLInputElement>) => {
        const value = Number(event.target.value);
        if (Number.isInteger(value)) setConstraint(key, value);
    };

    const renderObjectStep = () => (
        <div className={style.objectStep}>
            <div className={style.sourceTabs}>
                <button type="button" className={objectSource === 'builtin' ? style.activeTab : undefined} onClick={() => setObjectSource('builtin')}>
                    {translate('tasks.wizard.builtin')}
                </button>
                <button type="button" className={objectSource === 'external' ? style.activeTab : undefined} onClick={() => setObjectSource('external')}>
                    {translate('tasks.wizard.external')}
                </button>
            </div>
            <label>
                <span>{translate('tasks.wizard.model')}</span>
                <select value={selectedObject?.id ?? ''} onChange={(event) => setModelId(event.target.value)}>
                    {objectPool.map((object) => (
                        <option key={object.id} value={object.id}>
                            {object.name} · {translate('tasks.object.' + object.kind)}
                        </option>
                    ))}
                </select>
            </label>
            <dl className={style.connectionDetails}>
                <div>
                    <dt>{translate('tasks.fields.protocol')}</dt>
                    <dd>{selectedObject?.protocol}</dd>
                </div>
                <div>
                    <dt>{translate('tasks.fields.harness')}</dt>
                    <dd>{selectedObject?.harness}</dd>
                </div>
            </dl>
            <p>{translate(objectSource === 'external' ? 'tasks.wizard.externalHint' : 'tasks.wizard.builtinHint')}</p>
        </div>
    );

    const renderConstraints = () => (
        <fieldset className={style.constraintFields}>
            <legend>{translate('tasks.wizard.constraints')}</legend>
            {CONSTRAINTS.map((constraint) => (
                <label key={constraint.key}>
                    <span>{translate(constraint.labelKey)}</span>
                    <input type="range" min={constraint.minimum} max={constraint.maximum} value={constraints[constraint.key]} onChange={handleConstraint(constraint.key)} />
                    <output>{translate(constraint.unitKey, { value: constraints[constraint.key] })}</output>
                </label>
            ))}
        </fieldset>
    );

    const renderLegacyTarget = () =>
        taskType === 'range' ? (
            <fieldset className={style.optionGrid}>
                <legend>{translate('tasks.wizard.environment')}</legend>
                {data.environments.map((environment) => (
                    <label key={environment.id} className={environmentId === environment.id ? style.selectedOption : undefined}>
                        <input
                            className={style.selectionRadio}
                            type="radio"
                            name="environment"
                            disabled={environment.status !== 'available'}
                            checked={environmentId === environment.id}
                            onChange={() => setEnvironmentId(environment.id)}
                        />
                        <strong>{translate(environment.nameKey)}</strong>
                        <span>{translate(environment.descriptionKey)}</span>
                        <small>{environment.subnet}</small>
                    </label>
                ))}
                <p className={style.hallLink}>
                    {translate('tasks.wizard.environmentHint')}{' '}
                    <Link to="/range-hall" onClick={closeWizard}>
                        {translate('tasks.wizard.rangeHall')}
                    </Link>
                </p>
            </fieldset>
        ) : (
            <fieldset className={style.questionSets}>
                <legend>{translate('tasks.wizard.questionSets')}</legend>
                {data.questionSets.map((questionSet) => (
                    <label key={questionSet.id} className={questionSetId === questionSet.id ? style.selectedOption : undefined}>
                        <input className={style.selectionRadio} type="radio" name="question-set" checked={questionSetId === questionSet.id} onChange={() => setQuestionSetId(questionSet.id)} />
                        <span>
                            <strong>{translate(questionSet.nameKey)}</strong>
                            <small>{translate('tasks.wizard.questionMeta', { count: questionSet.size, date: questionSet.updated })}</small>
                            <em>{translate(questionSet.descriptionKey)}</em>
                        </span>
                    </label>
                ))}
            </fieldset>
        );

    return (
        <div className={style.dialogBackdrop}>
            <section ref={dialogRef} className={style.dialog} role="dialog" aria-modal="true" aria-labelledby="task-wizard-title" tabIndex={-1}>
                <header className={style.dialogHeader}>
                    <div>
                        <h2 id="task-wizard-title">{translate(fixedEvaluation ? 'tasks.wizard.evaluationMatrixTitle' : fixedRange ? 'tasks.wizard.rangeTitle' : 'tasks.wizard.title')}</h2>
                        <p>{translate(fixedEvaluation ? 'tasks.wizard.evaluationMatrixDescription' : fixedRange ? 'tasks.wizard.rangeDescription' : 'tasks.wizard.description')}</p>
                        <span className={style.visuallyHidden}>{translate('tasks.wizard.progress', { step, total: fixedEvaluation ? 5 : 4 })}</span>
                    </div>
                    <button type="button" aria-label={translate('common.close')} onClick={closeWizard}>
                        ×
                    </button>
                </header>

                <ol className={style.steps} style={{ gridTemplateColumns: 'repeat(' + flow.length + ', minmax(0, 1fr))' }} aria-label={translate('tasks.wizard.steps')}>
                    {flow.map((item, index) => (
                        <li key={item.key} className={step === index + 1 ? style.currentStep : step > index + 1 ? style.doneStep : undefined}>
                            <span>{step > index + 1 ? '✓' : index + 1}</span>
                            <strong>{item.title}</strong>
                            <small>{stepSummary(index)}</small>
                        </li>
                    ))}
                </ol>

                <div className={style.dialogBody}>
                    {!isTaskTypeFixed && step === 1 ? (
                        <fieldset className={style.typeGrid}>
                            <legend>{translate('tasks.wizard.selectType')}</legend>
                            {(['evaluation', 'range'] as const).map((type) => (
                                <label key={type} className={taskType === type ? style.selectedOption : undefined}>
                                    <input
                                        className={style.selectionRadio}
                                        type="radio"
                                        name="task-type"
                                        aria-label={translate('tasks.type.' + type)}
                                        checked={taskType === type}
                                        onChange={() => selectTaskType(type)}
                                    />
                                    <strong>{translate('tasks.type.' + type)}</strong>
                                    <span>{translate('tasks.type.' + type + 'Description')}</span>
                                </label>
                            ))}
                        </fieldset>
                    ) : null}
                    {!isTaskTypeFixed && step === 2 ? renderLegacyTarget() : null}
                    {!isTaskTypeFixed && step === 3 ? renderObjectStep() : null}
                    {!isTaskTypeFixed && step === 4 ? (
                        <div className={style.constraintsStep}>
                            {renderConstraints()}
                            <section className={style.draftSummary} aria-label={translate('tasks.wizard.summary')}>
                                <h3>{translate('tasks.wizard.summary')}</h3>
                                <dl>
                                    <div>
                                        <dt>{translate('tasks.wizard.step.type')}</dt>
                                        <dd>{taskTypeName}</dd>
                                    </div>
                                    <div>
                                        <dt>{translate('tasks.wizard.model')}</dt>
                                        <dd>{objectSummary}</dd>
                                    </div>
                                    <div>
                                        <dt>{translate('tasks.wizard.step.constraints')}</dt>
                                        <dd>
                                            {translate('tasks.wizard.summaryValue', {
                                                duration: translate('tasks.constraints.unit.duration', { value: constraints.duration }),
                                                token: translate('tasks.constraints.unit.token', { value: constraints.token }),
                                                tools: translate('tasks.constraints.unit.tools', { value: constraints.tools }),
                                                cost: translate('tasks.constraints.unit.cost', { value: constraints.cost }),
                                            })}
                                        </dd>
                                    </div>
                                </dl>
                            </section>
                        </div>
                    ) : null}

                    {fixedEvaluation && step === 1 ? (
                        <section className={style.scopePicker} role="region" aria-label={translate('tasks.wizard.scopeTree')}>
                            <header className={style.scopePickerHeader}>
                                <div>
                                    <span>{translate('tasks.wizard.scopeEyebrow')}</span>
                                    <h3>{translate('tasks.wizard.scopeTree')}</h3>
                                    <p>{translate('tasks.wizard.scopeTreeHint')}</p>
                                </div>
                                <strong>{translate('tasks.wizard.combinationSummary', { count: selectedCombinations.length })}</strong>
                            </header>
                            <TreeSelect
                                aria-label={translate('tasks.wizard.scopeTree')}
                                className={style.scopeSelect}
                                classNames={{ popup: { root: style.scopeSelectPopup } }}
                                value={[...selectedCombinations]}
                                treeData={scopeTreeData}
                                treeNodeLabelProp="label"
                                treeNodeFilterProp="label"
                                treeCheckable
                                treeLine={{ showLeafIcon: false }}
                                treeDefaultExpandAll
                                showCheckedStrategy={TreeSelect.SHOW_CHILD}
                                showSearch
                                allowClear
                                maxTagCount="responsive"
                                placeholder={translate('tasks.wizard.scopePlaceholder')}
                                notFoundContent={translate('tasks.wizard.scopeEmpty')}
                                popupMatchSelectWidth={false}
                                listHeight={360}
                                onChange={(values) => applyCombinations(values as string[])}
                                getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
                            />
                            <div className={style.scopeSelectionPreview} aria-live="polite">
                                {selectedCombinationItems.length ? (
                                    selectedCombinationItems.map((item) => <span key={item.id}>{item.direction.title + ' → ' + item.domain}</span>)
                                ) : (
                                    <p>{translate('tasks.wizard.scopeEmptySelection')}</p>
                                )}
                            </div>
                            <p className={style.scopeFootnote}>{translate('tasks.wizard.scopeTreeFootnote')}</p>
                        </section>
                    ) : null}

                    {fixedEvaluation && step === 2 ? (
                        <div className={style.datasetStep}>
                            <header className={style.candidateSummary}>
                                <div>
                                    <span>{translate('tasks.wizard.selectedDirections')}</span>
                                    <strong>
                                        {evaluationDirections.length
                                            ? evaluationDirections.map((direction) => EVALUATION_DIRECTIONS.find((item) => item.value === direction)?.title).join('、')
                                            : translate('tasks.wizard.pending')}
                                    </strong>
                                </div>
                                <div>
                                    <span>{translate('tasks.wizard.selectedDomains')}</span>
                                    <strong>{targetDomains.length ? targetDomains.join('、') : translate('tasks.wizard.pending')}</strong>
                                </div>
                                <div>
                                    <span>{translate('tasks.wizard.selectedCombinations')}</span>
                                    <strong>{selectedCombinations.length}</strong>
                                </div>
                            </header>
                            <fieldset className={style.datasetCards}>
                                <legend>{translate('tasks.wizard.selectDatasets')}</legend>
                                {candidates.map((dataset) => (
                                    <label key={dataset.id} className={selectedDatasetIds.includes(dataset.id) ? style.selectedOption : undefined}>
                                        <input className={style.matrixCheck} type="checkbox" checked={selectedDatasetIds.includes(dataset.id)} onChange={() => toggleDataset(dataset.id)} />
                                        <span className={style.datasetTitle}>
                                            <strong>{dataset.benchmark}</strong>
                                            <em>{dataset.version}</em>
                                        </span>
                                        <span className={style.datasetMeta}>
                                            {dataset.taskCount.toLocaleString()} {translate('tasks.wizard.tasksUnit')} · {dataset.domains.join(' / ')}
                                        </span>
                                        <span className={style.datasetMeta}>
                                            {translate('tasks.wizard.environmentLabel')}：{dataset.environment}
                                        </span>
                                        <span className={style.datasetMeta}>
                                            {translate('tasks.wizard.metricLabel')}：{dataset.metric} · {dataset.difficulty}
                                        </span>
                                        <small>
                                            {dataset.description} · {translate('tasks.wizard.averageLabel')} {dataset.average}
                                        </small>
                                    </label>
                                ))}
                            </fieldset>
                            <div className={style.selectionCounter}>
                                {translate('tasks.wizard.selectionCount', { datasets: selectedDatasetIds.length, candidates: candidateCount, deduped: dedupedCount, runnable: runnableCount })}
                            </div>
                        </div>
                    ) : null}

                    {fixedEvaluation && step === 3 ? (
                        <div className={style.samplingStep}>
                            <fieldset className={style.samplingModes}>
                                <legend>{translate('tasks.wizard.selectSelectionStrategy')}</legend>
                                <label className={samplingMode === 'all' ? style.selectedOption : undefined}>
                                    <input className={style.selectionRadio} type="radio" name="sampling-mode" checked={samplingMode === 'all'} onChange={() => setSamplingMode('all')} />
                                    <strong>{translate('tasks.wizard.allEvaluation')}</strong>
                                    <span>{translate('tasks.wizard.allEvaluationHint', { count: runnableCount })}</span>
                                </label>
                                <label className={samplingMode === 'stratified' ? style.selectedOption : undefined}>
                                    <input className={style.selectionRadio} type="radio" name="sampling-mode" checked={samplingMode === 'stratified'} onChange={() => setSamplingMode('stratified')} />
                                    <strong>{translate('tasks.wizard.stratifiedSelection')}</strong>
                                    <span>{translate('tasks.wizard.stratifiedSelectionHint')}</span>
                                </label>
                            </fieldset>
                            {samplingMode === 'stratified' ? (
                                <div className={style.stratifiedConfig}>
                                    <section>
                                        <h3>{translate('tasks.wizard.strataDimensions')}</h3>
                                        <div className={style.strataGrid}>
                                            {(['dataset', 'difficulty', 'domain', 'vulnerability'] as const).map((stratum) => (
                                                <label key={stratum} className={samplingStrata.includes(stratum) ? style.selectedOption : undefined}>
                                                    <input className={style.matrixCheck} type="checkbox" checked={samplingStrata.includes(stratum)} onChange={() => toggleStratum(stratum)} />
                                                    <span>{translate('tasks.wizard.stratum.' + stratum)}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </section>
                                    <section>
                                        <h3>
                                            {translate('tasks.wizard.strataWeights')} <small>{configuredWeightTotal}%</small>
                                        </h3>
                                        <div className={style.weightGrid}>
                                            {samplingStrata.map((stratum) => (
                                                <label key={stratum}>
                                                    <span>{translate('tasks.wizard.stratum.' + stratum)}</span>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={100}
                                                        value={stratumWeights[stratum]}
                                                        onChange={(event) => setStratumWeight(stratum, Number(event.target.value) || 0)}
                                                    />
                                                    <b>%</b>
                                                </label>
                                            ))}
                                        </div>
                                    </section>
                                    <section>
                                        <h3>{translate('tasks.wizard.stageSelection')}</h3>
                                        <label className={style.stageRatio}>
                                            <span>{translate('tasks.wizard.stageOne')}</span>
                                            <input type="range" min={10} max={90} value={firstStageRatio} onChange={(event) => setFirstStageRatio(Number(event.target.value))} />
                                            <output>{firstStageRatio}%</output>
                                        </label>
                                        <p>{translate('tasks.wizard.stageHint', { first: firstStageRatio, second: 100 - firstStageRatio })}</p>
                                    </section>
                                    <label className={style.sampleCountInput}>
                                        <span>{translate('tasks.wizard.sampleCount')}</span>
                                        <input type="number" min={1} max={runnableCount} value={sampleCount} onChange={(event) => setSampleCount(Number(event.target.value) || 0)} />
                                    </label>
                                </div>
                            ) : null}
                            <section className={style.samplingPreview} aria-label={translate('tasks.wizard.selectionPreview')}>
                                <h3>{translate('tasks.wizard.selectionPreview')}</h3>
                                <dl>
                                    <div>
                                        <dt>{translate('tasks.wizard.candidateTasks')}</dt>
                                        <dd>{candidateCount.toLocaleString()}</dd>
                                    </div>
                                    <div>
                                        <dt>{translate('tasks.wizard.dedupedTasks')}</dt>
                                        <dd>{dedupedCount.toLocaleString()}</dd>
                                    </div>
                                    <div>
                                        <dt>{translate('tasks.wizard.runnableTasks')}</dt>
                                        <dd>{runnableCount.toLocaleString()}</dd>
                                    </div>
                                    <div>
                                        <dt>{translate('tasks.wizard.finalTasks')}</dt>
                                        <dd>{finalCount.toLocaleString()}</dd>
                                    </div>
                                </dl>
                                <p>{samplingMode === 'stratified' ? translate('tasks.wizard.strataRule') : translate('tasks.wizard.allEvaluationHint', { count: finalCount })}</p>
                            </section>
                        </div>
                    ) : null}

                    {fixedEvaluation && step === 4 ? (
                        <div className={style.runtimeStep}>
                            {renderObjectStep()}
                            {renderConstraints()}
                        </div>
                    ) : null}
                    {fixedEvaluation && step === 5 ? (
                        <div className={style.freezeStep}>
                            <section className={style.draftSummary} aria-label={translate('tasks.wizard.summary')}>
                                <h3>{translate('tasks.wizard.freezeTitle')}</h3>
                                <p>{translate('tasks.wizard.freezeDescription')}</p>
                                <dl>
                                    <div>
                                        <dt>{translate('tasks.wizard.flow.matrix')}</dt>
                                        <dd>{selectedCombinationItems.map((item) => item.direction.title + ' × ' + item.domain).join('；')}</dd>
                                    </div>
                                    <div>
                                        <dt>{translate('tasks.wizard.flow.datasets')}</dt>
                                        <dd>{selectedDatasetNames}</dd>
                                    </div>
                                    <div>
                                        <dt>{translate('tasks.wizard.flow.sampling')}</dt>
                                        <dd>
                                            {samplingMode === 'all'
                                                ? translate('tasks.wizard.allTasks', { count: finalCount })
                                                : translate('tasks.wizard.stratifiedSummary', { count: finalCount, strata: samplingStrata.length })}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt>{translate('tasks.wizard.flow.runtime')}</dt>
                                        <dd>
                                            {objectSummary} ·{' '}
                                            {translate('tasks.wizard.summaryValue', {
                                                duration: translate('tasks.constraints.unit.duration', { value: constraints.duration }),
                                                token: translate('tasks.constraints.unit.token', { value: constraints.token }),
                                                tools: translate('tasks.constraints.unit.tools', { value: constraints.tools }),
                                                cost: translate('tasks.constraints.unit.cost', { value: constraints.cost }),
                                            })}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt>{translate('tasks.wizard.snapshotFields')}</dt>
                                        <dd>run_id · benchmark_snapshot · dataset_version · label_version · selection_policy · denominator_policy</dd>
                                    </div>
                                </dl>
                            </section>
                        </div>
                    ) : null}

                    {fixedRange && step === 1 ? renderLegacyTarget() : null}
                    {fixedRange && step === 2 ? renderObjectStep() : null}
                    {fixedRange && step === 3 ? <div className={style.constraintsStep}>{renderConstraints()}</div> : null}
                    {fixedRange && step === 4 ? (
                        <div className={style.freezeStep}>
                            <section className={style.draftSummary} aria-label={translate('tasks.wizard.summary')}>
                                <h3>{translate('tasks.wizard.freezeTitle')}</h3>
                                <p>{translate('tasks.wizard.freezeDescription')}</p>
                                <dl>
                                    <div>
                                        <dt>{translate('tasks.wizard.flow.environment')}</dt>
                                        <dd>{legacyTargetName}</dd>
                                    </div>
                                    <div>
                                        <dt>{translate('tasks.wizard.model')}</dt>
                                        <dd>{objectSummary}</dd>
                                    </div>
                                </dl>
                            </section>
                        </div>
                    ) : null}
                    {validationErrorKey || submitErrorKey ? (
                        <p className={style.validationError} role="alert">
                            {translate(validationErrorKey ?? submitErrorKey ?? '')}
                        </p>
                    ) : null}
                </div>
                <footer className={style.dialogFooter}>
                    <button type="button" onClick={closeWizard}>
                        {translate('common.cancel')}
                    </button>
                    <span />
                    {step > 1 ? (
                        <button type="button" onClick={() => setStep((step - 1) as 1 | 2 | 3 | 4 | 5)}>
                            {translate('tasks.wizard.back')}
                        </button>
                    ) : null}
                    <button type="button" className={style.primaryButton} disabled={isSubmitting} onClick={goForward}>
                        {translate(step === (fixedEvaluation ? 5 : 4) ? 'tasks.wizard.submit' : 'tasks.wizard.next')}
                    </button>
                </footer>
            </section>
        </div>
    );
};

export default TaskWizard;
