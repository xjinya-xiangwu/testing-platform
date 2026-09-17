import { ChangeEvent, useState } from 'react';
import useDialogFocus from '@/hooks/useDialogFocus';
import {
    getOptionLabelKey,
    INITIAL_TRAINING_DRAFT,
    TRAINING_ALGORITHMS,
    TRAINING_BASES,
    TRAINING_BENCHMARKS,
    TRAINING_DATASETS,
    TRAINING_DURATIONS,
    TRAINING_FRAMEWORKS,
    TRAINING_HYPERPARAMETERS,
    TRAINING_PRIORITIES,
    TRAINING_SPLITS,
    TRAINING_TYPES,
} from '@/pages/training/training-options';
import style from '@/pages/training/training.module.less';
import type {
    ITrainingTaskDraft,
    TrainingAlgorithm,
    TrainingBase,
    TrainingBenchmark,
    TrainingDataset,
    TrainingDuration,
    TrainingFramework,
    TrainingPriority,
    TrainingSplit,
    TrainingType,
} from '@/api/training-tasks';

interface TrainingTaskWizardProps {
    errorMessage?: string;
    isSubmitting: boolean;
    onClose: () => void;
    onSubmit: (draft: ITrainingTaskDraft) => void;
    translate: (key: string, values?: Readonly<Record<string, string | number>>) => string;
}

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

const STEPS = ['basic', 'data', 'model', 'resource', 'parameters', 'confirm'] as const;

const OptionButtons = <T extends string | number>({
    field,
    options,
    selected,
    setSelected,
    translate,
}: {
    field: string;
    options: readonly { labelKey: string; value: T }[];
    selected: T;
    setSelected: (value: T) => void;
    translate: TrainingTaskWizardProps['translate'];
}) => (
    <div className={style.optionButtons} role="radiogroup">
        {options.map((option) => (
            <label key={String(option.value)} className={selected === option.value ? style.selectedOption : undefined}>
                <input type="radio" name={field} checked={selected === option.value} onChange={() => setSelected(option.value)} />
                <span>{translate(option.labelKey)}</span>
            </label>
        ))}
    </div>
);

const TrainingTaskWizard = ({ errorMessage, isSubmitting, onClose, onSubmit, translate }: TrainingTaskWizardProps) => {
    const [step, setStep] = useState<WizardStep>(1);
    const [draft, setDraft] = useState<ITrainingTaskDraft>({
        ...INITIAL_TRAINING_DRAFT,
        name: translate('training.wizard.defaultName'),
        gpu: INITIAL_TRAINING_DRAFT.gpu.map((gpu) => ({ ...gpu })),
        hyperparameters: { ...INITIAL_TRAINING_DRAFT.hyperparameters },
    });
    const [validationError, setValidationError] = useState('');
    const dialogRef = useDialogFocus<HTMLElement>(true, onClose);

    const updateDraft = <K extends keyof ITrainingTaskDraft>(key: K, value: ITrainingTaskDraft[K]) => {
        setDraft((current) => ({ ...current, [key]: value }));
        setValidationError('');
    };

    const toggleBenchmark = (benchmark: TrainingBenchmark) => {
        const next = draft.benchmarks.includes(benchmark) ? draft.benchmarks.filter((item) => item !== benchmark) : [...draft.benchmarks, benchmark];
        updateDraft('benchmarks', next);
    };

    const goNext = () => {
        if (step === 1 && !draft.name.trim()) {
            setValidationError(translate('training.wizard.nameRequired'));
            return;
        }
        if (step < 6) {
            setStep((step + 1) as WizardStep);
            return;
        }
        onSubmit(draft);
    };

    const handleHyperparameter = (key: string) => (event: ChangeEvent<HTMLInputElement>) => {
        updateDraft('hyperparameters', { ...draft.hyperparameters, [key]: event.target.value });
    };

    const getStepClassName = (stepNumber: number) => {
        if (step === stepNumber) return style.currentStep;
        if (step > stepNumber) return style.completedStep;
        return undefined;
    };

    let body = null;
    if (step === 1) {
        body = (
            <div className={style.wizardFields}>
                <label>
                    <span>{translate('training.wizard.name')}</span>
                    <input maxLength={128} value={draft.name} onChange={(event) => updateDraft('name', event.target.value)} />
                </label>
                <fieldset>
                    <legend>{translate('training.wizard.priority')}</legend>
                    <OptionButtons
                        field="priority"
                        options={TRAINING_PRIORITIES}
                        selected={draft.priority}
                        setSelected={(value: TrainingPriority) => updateDraft('priority', value)}
                        translate={translate}
                    />
                </fieldset>
                <fieldset>
                    <legend>{translate('training.wizard.type')}</legend>
                    <OptionButtons field="type" options={TRAINING_TYPES} selected={draft.type} setSelected={(value: TrainingType) => updateDraft('type', value)} translate={translate} />
                </fieldset>
                <label>
                    <span>{translate('training.wizard.goal')}</span>
                    <textarea value={draft.goal} onChange={(event) => updateDraft('goal', event.target.value)} placeholder={translate('training.wizard.goalPlaceholder')} />
                </label>
            </div>
        );
    }
    if (step === 2) {
        body = (
            <div className={style.wizardFields}>
                <label>
                    <span>{translate('training.wizard.dataset')}</span>
                    <select value={draft.dataset} onChange={(event) => updateDraft('dataset', Number(event.target.value) as TrainingDataset)}>
                        {TRAINING_DATASETS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {translate(option.labelKey)}
                            </option>
                        ))}
                    </select>
                </label>
                <fieldset>
                    <legend>{translate('training.wizard.benchmarks')}</legend>
                    <div className={style.checkboxOptions}>
                        {TRAINING_BENCHMARKS.map((option) => (
                            <label key={option.value}>
                                <input type="checkbox" checked={draft.benchmarks.includes(option.value)} onChange={() => toggleBenchmark(option.value)} />
                                <span>{translate(option.labelKey)}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>
                <fieldset>
                    <legend>{translate('training.wizard.split')}</legend>
                    <OptionButtons field="split" options={TRAINING_SPLITS} selected={draft.split} setSelected={(value: TrainingSplit) => updateDraft('split', value)} translate={translate} />
                </fieldset>
            </div>
        );
    }
    if (step === 3) {
        body = (
            <div className={style.wizardFields}>
                <fieldset>
                    <legend>{translate('training.wizard.base')}</legend>
                    <OptionButtons field="base" options={TRAINING_BASES} selected={draft.base} setSelected={(value: TrainingBase) => updateDraft('base', value)} translate={translate} />
                </fieldset>
                <fieldset>
                    <legend>{translate('training.wizard.framework')}</legend>
                    <OptionButtons
                        field="framework"
                        options={TRAINING_FRAMEWORKS}
                        selected={draft.framework}
                        setSelected={(value: TrainingFramework) => updateDraft('framework', value)}
                        translate={translate}
                    />
                </fieldset>
                {draft.framework === 'rl' ? (
                    <fieldset>
                        <legend>{translate('training.wizard.algorithm')}</legend>
                        <OptionButtons
                            field="algorithm"
                            options={TRAINING_ALGORITHMS}
                            selected={draft.rlAlgorithm ?? 'grpo'}
                            setSelected={(value: TrainingAlgorithm) => updateDraft('rlAlgorithm', value)}
                            translate={translate}
                        />
                    </fieldset>
                ) : null}
            </div>
        );
    }
    if (step === 4) {
        body = (
            <div className={style.wizardFields}>
                <fieldset>
                    <legend>{translate('training.wizard.gpu')}</legend>
                    <OptionButtons
                        field="gpu"
                        options={[
                            { value: 4, labelKey: 'training.gpu.4' },
                            { value: 8, labelKey: 'training.gpu.8' },
                        ]}
                        selected={draft.gpu[0]?.count ?? 8}
                        setSelected={(count: number) => updateDraft('gpu', [{ model: 'H100', count }])}
                        translate={translate}
                    />
                </fieldset>
                <fieldset>
                    <legend>{translate('training.wizard.duration')}</legend>
                    <OptionButtons
                        field="duration"
                        options={TRAINING_DURATIONS}
                        selected={draft.duration}
                        setSelected={(value: TrainingDuration) => updateDraft('duration', value)}
                        translate={translate}
                    />
                </fieldset>
            </div>
        );
    }
    if (step === 5) {
        body = (
            <div className={style.hyperparameterGrid}>
                {TRAINING_HYPERPARAMETERS.map(([key]) => (
                    <label key={key}>
                        <span title={translate(`training.hyperparameter.help.${key}`)}>
                            {key} <i aria-label={translate('training.wizard.parameterHelp')}>?</i>
                        </span>
                        <input value={draft.hyperparameters[key]} onChange={handleHyperparameter(key)} />
                    </label>
                ))}
            </div>
        );
    }
    if (step === 6) {
        body = (
            <dl className={style.confirmationGrid}>
                <div>
                    <dt>{translate('training.wizard.name')}</dt>
                    <dd>{draft.name}</dd>
                </div>
                <div>
                    <dt>{translate('training.wizard.type')}</dt>
                    <dd>{translate(getOptionLabelKey(TRAINING_TYPES, draft.type))}</dd>
                </div>
                <div>
                    <dt>{translate('training.wizard.dataset')}</dt>
                    <dd>{translate(getOptionLabelKey(TRAINING_DATASETS, draft.dataset))}</dd>
                </div>
                <div>
                    <dt>{translate('training.wizard.model')}</dt>
                    <dd>
                        {draft.base} · {translate(getOptionLabelKey(TRAINING_FRAMEWORKS, draft.framework))}
                    </dd>
                </div>
                <div>
                    <dt>{translate('training.wizard.resource')}</dt>
                    <dd>
                        {draft.gpu.map((gpu) => `${gpu.count}×${gpu.model}`).join(' + ')} · {translate(getOptionLabelKey(TRAINING_DURATIONS, draft.duration))}
                    </dd>
                </div>
            </dl>
        );
    }

    return (
        <div className={style.dialogBackdrop}>
            <section ref={dialogRef} className={style.wizardDialog} role="dialog" aria-modal="true" aria-labelledby="training-wizard-title" tabIndex={-1}>
                <header className={style.dialogHeader}>
                    <div>
                        <h2 id="training-wizard-title">{translate('training.wizard.title')}</h2>
                        <p>{translate('training.wizard.description')}</p>
                    </div>
                    <button type="button" aria-label={translate('common.close')} onClick={onClose}>
                        ×
                    </button>
                </header>
                <ol className={style.wizardSteps} aria-label={translate('training.wizard.steps')}>
                    {STEPS.map((stepName, index) => (
                        <li key={stepName} className={getStepClassName(index + 1)}>
                            <span>{index + 1}</span>
                            {translate(`training.wizard.step.${stepName}`)}
                        </li>
                    ))}
                </ol>
                <div className={style.wizardBody}>{body}</div>
                {validationError || errorMessage ? (
                    <p className={style.validationError} role="alert">
                        {validationError || errorMessage}
                    </p>
                ) : null}
                <footer className={style.dialogFooter}>
                    <button type="button" onClick={onClose}>
                        {translate('common.cancel')}
                    </button>
                    <span />
                    {step > 1 ? (
                        <button type="button" onClick={() => setStep((step - 1) as WizardStep)}>
                            {translate('training.wizard.back')}
                        </button>
                    ) : null}
                    <button type="button" className={style.primaryButton} disabled={isSubmitting} onClick={goNext}>
                        {translate(step === 6 ? 'training.wizard.submit' : 'training.wizard.next')}
                    </button>
                </footer>
            </section>
        </div>
    );
};

export default TrainingTaskWizard;
