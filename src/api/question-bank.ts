import { IS_DEMO_MODE } from '@/config/demo-mode';

/**
 * Question-bank (题库) domain store for the data center module.
 *
 * The prototype runs entirely on an in-memory deterministic store: every counter,
 * deduplication, sampling and precheck computation is real logic executed over the
 * seeded data so the flows in PRD-题库模块设计.md (M1-M6) can be demoed end to end.
 * When the backend lands, each exported function maps 1:1 to a REST endpoint
 * (/question-sets, /sampling-plans/{id}/preview, /precheck-jobs, /imports, /exports).
 */

export type EvaluationDirection = 'vulnerability_discovery' | 'vulnerability_reproduction' | 'vulnerability_exploitation' | 'vulnerability_repair';

export type TargetDomain = 'web_application' | 'userspace_software' | 'browser_engine' | 'operating_system' | 'cloud_infrastructure' | 'network_protocol' | 'other';

export type VersionLifecycle = 'draft' | 'structured' | 'labeled' | 'verified' | 'published' | 'retired';

export type QuestionSetType = 'benchmark' | 'custom';

export type ImageStatus = 'registered' | 'present' | 'verified' | 'missing' | 'drift';

export type PrecheckStatus = 'pending' | 'running' | 'passed' | 'failed';

export type PrecheckFailReason = 'image_pull_failed' | 'container_start_timeout' | 'grader_dry_run_failed' | 'network_probe_failed';

export interface QuestionSet {
    id: string;
    code: string;
    name: string;
    type: QuestionSetType;
    source: string;
    ownerProjectId: string | null;
    directions: EvaluationDirection[];
    description: string;
    nativeMetric: string;
    /** Snapshot-only: distinct non-null domains across the set's versions. */
    supportedDomains?: TargetDomain[];
}

export interface VersionCounts {
    fullTaskCount: number;
    projectOrRepoCount: number;
    groundTruthCount: number;
}

export interface VersionEnvCounts {
    logicalEnvCount: number;
    imageStateRefs: number;
    uniqueImageDigestCount: number;
    workspaceCount: number;
}

export interface VersionReadiness {
    dataReady: boolean;
    environmentReady: boolean;
    graderReady: boolean;
    lastVerifiedAt: string | null;
}

export interface QuestionSetVersion {
    id: string;
    setId: string;
    releaseVersion: string;
    sourceRef: string;
    manifestHash: string;
    createdAt: string;
    releasedAt: string | null;
    lifecycle: VersionLifecycle;
    counts: VersionCounts;
    envCounts: VersionEnvCounts;
    metrics: { primaryMetric: string; aggregation: string; denominatorPolicy: string };
    readiness: VersionReadiness;
    license: string;
    usageScope: 'internal' | 'project';
    referencedRuns: number;
}

export interface QuestionBankSample {
    id: string;
    versionId: string;
    index: number;
    name: string;
    dedupKey: string;
    direction: EvaluationDirection;
    domain: TargetDomain | null;
    suggestedDomain: TargetDomain | null;
    cwe: string;
    language: string;
    difficulty: string;
    envId: string;
    runnable: boolean;
    failReason: PrecheckFailReason | null;
}

export interface TaskEnvironment {
    id: string;
    versionId: string;
    name: string;
    templateId: string;
    imageId: string;
    stateRefs: number;
    precheck: { status: PrecheckStatus; verifiedAt: string | null; failReason: PrecheckFailReason | null };
}

export interface ImageAsset {
    id: string;
    registry: string;
    repo: string;
    digest: string;
    sizeMb: number;
    status: ImageStatus;
}

export interface EnvironmentTemplate {
    id: string;
    name: string;
    version: string;
    services: number;
    toolset: string;
    networkZone: string;
    imageIds: string[];
}

export interface Grader {
    id: string;
    name: string;
    kind: 'script' | 'service' | 'llm_judge' | 'builtin';
    version: string;
    contract: string;
    directions: EvaluationDirection[];
    nativeMetric: string;
    compatibleVersionIds: string[];
}

export interface SamplingStratum {
    field: 'domain' | 'dataset' | 'difficulty' | 'cwe';
    quota: number;
}

export interface SamplingPlan {
    id: string;
    name: string;
    mode: 'all' | 'random' | 'stratified' | 'fixed';
    seed: number;
    size: number;
    strata: SamplingStratum[];
    scope: { directions: EvaluationDirection[]; versionIds: string[] };
    status: 'draft' | 'active' | 'archived';
    strategyVersion: number;
    owner: 'platform' | 'project';
    references: number;
    createdAt: string;
}

export interface SamplingPreview {
    candidateCount: number;
    dedupedCount: number;
    runnableCount: number;
    nonRunnableCount: number;
    nonRunnableReasons: { reason: PrecheckFailReason; count: number }[];
    selectedTaskIds: string[];
    byDomain: { key: TargetDomain; count: number }[];
    byDataset: { key: string; label: string; count: number }[];
    frozenTuple: { seed: number; strategyVersion: number; dataVersions: string[]; labelVersions: string[] };
    reproducible: boolean;
}

export type ImportStage = 'structure' | 'content' | 'security' | 'dryrun';

export interface ImportIssue {
    file: string;
    line: number;
    message: string;
}

export interface ImportJob {
    id: string;
    channel: 'web' | 'api' | 'offline';
    owner: 'platform' | 'project';
    fileName: string;
    sizeMb: number;
    createdAt: string;
    status: 'running' | 'passed' | 'failed';
    completedStage: number;
    stageIssues: Record<ImportStage, ImportIssue[]>;
    createdVersionId: string | null;
}

export interface ExportRequest {
    id: string;
    objectType: 'version_metadata' | 'task_list' | 'dataset';
    targetLabel: string;
    purpose: string;
    recipient: string;
    requestedBy: string;
    createdAt: string;
    status: 'pending' | 'approved' | 'rejected' | 'revoked';
    manifestHash: string | null;
    expiresAt: string | null;
    downloads: number;
}

export interface AuditEvent {
    id: string;
    time: string;
    actor: string;
    action: string;
    target: string;
    detail: string;
}

export interface PrecheckJob {
    id: string;
    versionId: string;
    concurrency: number;
    createdAt: string;
    status: 'running' | 'passed' | 'failed';
    processed: number;
    total: number;
    passCount: number;
    failCount: number;
    lastReasons: { reason: PrecheckFailReason; count: number }[];
}

/** Review-feedback label corrections (回流动线): reviewer confirms a finding was a
 * mislabel; the admin adopts it into the NEXT version — published versions are
 * never rewritten (PRD §7.4 回流动线). */
export interface LabelCorrection {
    id: string;
    versionId: string;
    sampleId: string;
    suggestedDomain: TargetDomain;
    reason: string;
    source: string;
    createdAt: string;
    status: 'pending' | 'applied' | 'rejected';
    outcome: string | null;
}

export interface VersionFacets {
    versionId: string;
    cwe: { key: string; count: number }[];
    language: { key: string; count: number }[];
    difficulty: { key: string; count: number }[];
}

export interface VersionDiffRow {
    field: 'full_task_count' | 'ground_truth_count' | 'unique_image_digest_count' | 'primary_metric';
    current: string;
    previous: string;
    delta: number | null;
}

/** A frozen task list produced by freezeSampling (PRD §7.4 动线 E). The task
 * wizard consumes these via the sampling-plan contract; this is the downstream
 * hand-off record so frozen lists are not a dead end. */
export interface FrozenTaskList {
    id: string;
    planId: string;
    planName: string;
    seed: number;
    taskCount: number;
    strategyVersion: number;
    dataVersions: string[];
    labelVersions: string[];
    createdAt: string;
}

export interface QuestionBankOverview {
    totals: VersionEnvCounts;
    sandboxesTotal: number;
    publishedSets: number;
    draftVersions: number;
    readiness: { published: number; verified: number; inProgress: number };
    todos: { blockedGates: { versionId: string; label: string; missing: number; total: number }[]; pendingExports: number; runningJobs: number; failedPrechecks: number; pendingCorrections: number };
    recentEvents: AuditEvent[];
}

interface QuestionBankStore {
    sets: QuestionSet[];
    versions: QuestionSetVersion[];
    samples: QuestionBankSample[];
    environments: TaskEnvironment[];
    images: ImageAsset[];
    templates: EnvironmentTemplate[];
    graders: Grader[];
    plans: SamplingPlan[];
    importJobs: ImportJob[];
    exportRequests: ExportRequest[];
    precheckJobs: PrecheckJob[];
    labelCorrections: LabelCorrection[];
    frozenLists: FrozenTaskList[];
    audit: AuditEvent[];
    labelSuggestions: Record<string, TargetDomain>;
}

/* ---------------------------------- utils ---------------------------------- */

const mulberry32 = (seed: number) => {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

const hash32 = (value: string) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < value.length; i += 1) {
        h ^= value.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
};

export const buildManifestHash = (value: string) => `sha256:${hash32(`${value}-a`)}${hash32(`${value}-b`)}${hash32(`${value}-c`)}${hash32(`${value}-d`)}${hash32(`${value}-e`)}${hash32(`${value}-f`)}${hash32(`${value}-g`)}${hash32(`${value}-h`)}`;

const nowIso = () => new Date().toISOString();
const daysAgo = (days: number) => new Date(Date.now() - days * 86400_000).toISOString();
const daysAhead = (days: number) => new Date(Date.now() + days * 86400_000).toISOString();

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

let auditSeq = 0;
const pushEvent = (store: QuestionBankStore, action: string, target: string, detail: string, actor = '原型管理员') => {
    auditSeq += 1;
    store.audit.unshift({ id: `audit-${auditSeq}`, time: nowIso(), actor, action, target, detail });
    if (store.audit.length > 60) store.audit.length = 60;
};

const cwePool = ['CWE-787', 'CWE-79', 'CWE-89', 'CWE-416', 'CWE-125', 'CWE-190', 'CWE-22', 'CWE-120'];
const languagePool = ['C', 'C++', 'Python', 'JavaScript', 'Go', 'Java'];
const difficultyByDirection: Record<EvaluationDirection, string[]> = {
    vulnerability_discovery: ['L0', 'L1', 'L2', 'L3'],
    vulnerability_reproduction: ['L1', 'L2', 'L3'],
    vulnerability_exploitation: ['T1', 'T2', 'T3', 'T4', 'T5'],
    vulnerability_repair: ['R1', 'R2', 'R3'],
};

const DOMAIN_KEYS: TargetDomain[] = ['web_application', 'userspace_software', 'browser_engine', 'operating_system', 'cloud_infrastructure', 'network_protocol'];

const pick = <T,>(rng: () => number, list: readonly T[]) => list[Math.floor(rng() * list.length)];

/* ------------------------------ seed container ----------------------------- */

const createStore = (): QuestionBankStore => {
    const store: QuestionBankStore = {
        sets: [],
        versions: [],
        samples: [],
        environments: [],
        images: [],
        templates: [],
        graders: [],
        plans: [],
        importJobs: [],
        exportRequests: [],
        precheckJobs: [],
        labelCorrections: [],
        frozenLists: [],
        audit: [],
        labelSuggestions: {},
    };
    return store;
};

const store = createStore();

/* --------------------------------- seeding --------------------------------- */

interface VersionSeedSpec {
    setId: string;
    /** Explicit version id — required when a set has more than one seeded version. */
    id?: string;
    releaseVersion: string;
    sourceRef: string;
    createdAtDays: number;
    lifecycle: VersionLifecycle;
    taskCount: number;
    projectOrRepoCount: number;
    groundTruthCount: number;
    logicalEnvCount: number;
    stateRefsPerEnv: number;
    uniqueImageDigestCount: number;
    workspaceCount: number;
    primaryMetric: string;
    environmentReady: boolean;
    graderReady: boolean;
    usageScope: 'internal' | 'project';
    unlabeledDomains: boolean;
    failRate: number;
}

const VERSION_SPECS: VersionSeedSpec[] = [
    { setId: 'exploitgym', releaseVersion: 'v1.0-canonical', sourceRef: 'canonical@main', createdAtDays: 120, lifecycle: 'published', taskCount: 869, projectOrRepoCount: 0, groundTruthCount: 869, logicalEnvCount: 869, stateRefsPerEnv: 1, uniqueImageDigestCount: 869, workspaceCount: 869, primaryMetric: 'flag_captured / mitigation_survived', environmentReady: true, graderReady: true, usageScope: 'internal', unlabeledDomains: false, failRate: 0.03 },
    // Retired predecessor versions: kept for the version-diff view and historical
    // run replay; excluded from candidate scopes, totals and gates.
    { setId: 'exploitgym', id: 'ver-exploitgym-v09', releaseVersion: 'v0.9-beta', sourceRef: 'canonical@v0.9', createdAtDays: 150, lifecycle: 'retired', taskCount: 640, projectOrRepoCount: 0, groundTruthCount: 640, logicalEnvCount: 640, stateRefsPerEnv: 1, uniqueImageDigestCount: 640, workspaceCount: 640, primaryMetric: 'flag_captured / mitigation_survived', environmentReady: true, graderReady: true, usageScope: 'internal', unlabeledDomains: false, failRate: 0.06 },
    { setId: 'exploitbench', releaseVersion: 'v8-r1', sourceRef: 'benchmarks/v8.yaml@2f41c', createdAtDays: 96, lifecycle: 'published', taskCount: 41, projectOrRepoCount: 0, groundTruthCount: 41, logicalEnvCount: 41, stateRefsPerEnv: 1, uniqueImageDigestCount: 41, workspaceCount: 41, primaryMetric: 'capability_bitmap / highest_tier', environmentReady: true, graderReady: true, usageScope: 'internal', unlabeledDomains: false, failRate: 0.05 },
    { setId: 'cybergym', releaseVersion: 'level1-full', sourceRef: 'official-level-1@9d02e', createdAtDays: 88, lifecycle: 'published', taskCount: 1507, projectOrRepoCount: 188, groundTruthCount: 1507, logicalEnvCount: 1507, stateRefsPerEnv: 2, uniqueImageDigestCount: 1507, workspaceCount: 1507, primaryMetric: 'any-trial-pass solved', environmentReady: true, graderReady: true, usageScope: 'internal', unlabeledDomains: false, failRate: 0.04 },
    { setId: 'realvuln', releaseVersion: 'v2.0', sourceRef: 'realvuln-v2@71b3a', createdAtDays: 60, lifecycle: 'verified', taskCount: 2182, projectOrRepoCount: 66, groundTruthCount: 1903, logicalEnvCount: 66, stateRefsPerEnv: 1, uniqueImageDigestCount: 1, workspaceCount: 66, primaryMetric: 'TP / FP / FN · strict micro F3', environmentReady: false, graderReady: true, usageScope: 'internal', unlabeledDomains: false, failRate: 0.09 },
    { setId: 'patcheval', releaseVersion: 'patcheval_verified-fe6f402a', sourceRef: 'commit fe6f402a', createdAtDays: 42, lifecycle: 'verified', taskCount: 230, projectOrRepoCount: 230, groundTruthCount: 230, logicalEnvCount: 230, stateRefsPerEnv: 1, uniqueImageDigestCount: 230, workspaceCount: 230, primaryMetric: 'fix-run.sh PASS / MODEL_INCORRECT', environmentReady: true, graderReady: true, usageScope: 'internal', unlabeledDomains: true, failRate: 0.02 },
    { setId: 'internal-draft', releaseVersion: '2026.09-draft', sourceRef: 'upload://internal-draft-202609.tar.zst', createdAtDays: 6, lifecycle: 'draft', taskCount: 320, projectOrRepoCount: 0, groundTruthCount: 96, logicalEnvCount: 320, stateRefsPerEnv: 1, uniqueImageDigestCount: 214, workspaceCount: 320, primaryMetric: '发布前校验', environmentReady: false, graderReady: false, usageScope: 'internal', unlabeledDomains: true, failRate: 0.12 },
    { setId: 'custom-web', releaseVersion: '2026.09', sourceRef: 'upload://custom-web-202609.tar.zst', createdAtDays: 18, lifecycle: 'published', taskCount: 4860, projectOrRepoCount: 0, groundTruthCount: 4860, logicalEnvCount: 4860, stateRefsPerEnv: 1, uniqueImageDigestCount: 4860, workspaceCount: 4860, primaryMetric: '成功率 / 运行取证', environmentReady: true, graderReady: true, usageScope: 'project', unlabeledDomains: false, failRate: 0.02 },
    { setId: 'custom-web', id: 'ver-custom-web-v08', releaseVersion: '2026.08', sourceRef: 'upload://vendor-a-web-202608.tar.zst', createdAtDays: 48, lifecycle: 'retired', taskCount: 4120, projectOrRepoCount: 0, groundTruthCount: 4120, logicalEnvCount: 4120, stateRefsPerEnv: 1, uniqueImageDigestCount: 4120, workspaceCount: 4120, primaryMetric: '成功率 / 运行取证', environmentReady: true, graderReady: true, usageScope: 'project', unlabeledDomains: false, failRate: 0.05 },
];

const SET_SPECS: { id: string; code: string; name: string; type: QuestionSetType; source: string; ownerProjectId: string | null; directions: EvaluationDirection[]; description: string; nativeMetric: string }[] = [
    { id: 'exploitgym', code: 'EXPLOIT-GYM', name: 'ExploitGym', type: 'benchmark', source: '官方', ownerProjectId: null, directions: ['vulnerability_exploitation'], description: 'Userspace、V8 与 Kernel 目标的漏洞利用评测目录，task×mitigation×trial 粒度。', nativeMetric: 'Exploit Count / mitigation split' },
    { id: 'exploitbench', code: 'EXPLOIT-BENCH', name: 'ExploitBench', type: 'benchmark', source: '官方', ownerProjectId: null, directions: ['vulnerability_exploitation'], description: 'V8 漏洞能力阶梯与固定种子场景，environment×seed 粒度。', nativeMetric: 'T5–T1 / 16 位 capability' },
    { id: 'cybergym', code: 'CYBER-GYM', name: 'CyberGym', type: 'benchmark', source: '官方', ownerProjectId: null, directions: ['vulnerability_discovery', 'vulnerability_reproduction'], description: '漏洞发现与复现任务，含 vulnerable/fixed 状态引用。', nativeMetric: 'L0–L3 / 提交成功率' },
    { id: 'realvuln', code: 'REAL-VULN', name: 'RealVuln v2', type: 'benchmark', source: '官方', ownerProjectId: null, directions: ['vulnerability_discovery'], description: '仓库工作区与 scanner runtime 的漏洞发现评测，repo×trial+finding 粒度。', nativeMetric: 'TP / FP / FN / F3' },
    { id: 'patcheval', code: 'PATCH-EVAL', name: 'PatchEval Verified', type: 'benchmark', source: '官方', ownerProjectId: null, directions: ['vulnerability_repair'], description: '固定目标镜像与独立 evaluator 的 CVE 修复评测。', nativeMetric: 'PASS / MODEL_INCORRECT' },
    { id: 'internal-draft', code: 'INTERNAL-DRAFT', name: '内部题库草稿', type: 'custom', source: '项目自建', ownerProjectId: null, directions: ['vulnerability_discovery', 'vulnerability_exploitation'], description: '云原生与基础设施方向的内部积累题库，等待标注与环境验证。', nativeMetric: '待定' },
    { id: 'custom-web', code: 'CUSTOM-WEB', name: '自建 Web 漏洞利用集', type: 'custom', source: '项目自建', ownerProjectId: 'proj-vendor-a', directions: ['vulnerability_exploitation'], description: '厂商自建 Web 应用与服务漏洞沙箱集，仅授权项目可见。', nativeMetric: '成功率 / 运行取证' },
];

const IMAGE_SPECS: { id: string; registry: string; repo: string; digest: string; sizeMb: number; status: ImageStatus }[] = [
    { id: 'img-gym-userspace', registry: 'registry.sec.internal', repo: 'exploitgym/userspace', digest: 'sha256:51aa…c02', sizeMb: 812, status: 'verified' },
    { id: 'img-gym-v8', registry: 'registry.sec.internal', repo: 'exploitgym/v8', digest: 'sha256:7bd2…9f1', sizeMb: 1420, status: 'verified' },
    { id: 'img-gym-kernel', registry: 'registry.sec.internal', repo: 'exploitgym/kernel', digest: 'sha256:0c3e…77a', sizeMb: 2260, status: 'drift' },
    { id: 'img-cyber-vuln', registry: 'registry.sec.internal', repo: 'cybergym/vulnerable', digest: 'sha256:aa41…3d8', sizeMb: 640, status: 'verified' },
    { id: 'img-cyber-fix', registry: 'registry.sec.internal', repo: 'cybergym/fixed', digest: 'sha256:be07…5c9', sizeMb: 612, status: 'verified' },
    { id: 'img-scanner', registry: 'registry.sec.internal', repo: 'realvuln/scanner', digest: 'sha256:19ff…e40', sizeMb: 980, status: 'verified' },
    { id: 'img-patch-eval', registry: 'registry.sec.internal', repo: 'patcheval/evaluator', digest: 'sha256:2d6b…a13', sizeMb: 1544, status: 'verified' },
    { id: 'img-draft-sandbox', registry: 'registry.sec.internal', repo: 'internal/draft-sandbox', digest: 'sha256:f4c9…b82', sizeMb: 720, status: 'missing' },
    { id: 'img-web-pool', registry: 'registry.vendor-a.mirror', repo: 'vendor-a/web-pool', digest: 'sha256:8e51…6d7', sizeMb: 534, status: 'present' },
];

const TEMPLATE_SPECS: EnvironmentTemplate[] = [
    { id: 'tpl-userspace', name: '用户态二进制沙箱', version: 'v3.1', services: 1, toolset: 'gdb / pwntools / radare2', networkZone: 'isolated', imageIds: ['img-gym-userspace'] },
    { id: 'tpl-v8', name: 'V8 引擎调试沙箱', version: 'v2.4', services: 1, toolset: 'd8 / gdb / fuzzilli', networkZone: 'isolated', imageIds: ['img-gym-v8'] },
    { id: 'tpl-kernel', name: '内核 QEMU 沙箱', version: 'v1.9', services: 2, toolset: 'qemu / gdb / kallsyms', networkZone: 'isolated', imageIds: ['img-gym-kernel'] },
    { id: 'tpl-cyber', name: 'CyberGym 服务沙箱', version: 'v4.0', services: 2, toolset: 'poc-runner / sanitizer', networkZone: 'isolated', imageIds: ['img-cyber-vuln', 'img-cyber-fix'] },
    { id: 'tpl-scanner', name: 'RealVuln scanner 工作区', version: 'v1.2', services: 1, toolset: 'scanner / git / build-cache', networkZone: 'egress-deny', imageIds: ['img-scanner'] },
    { id: 'tpl-patcheval', name: 'PatchEval evaluator 沙箱', version: 'v2.0', services: 2, toolset: 'fix-run.sh / test-harness', networkZone: 'isolated', imageIds: ['img-patch-eval'] },
    { id: 'tpl-draft', name: '内部草稿沙箱（待验证）', version: 'v0.3', services: 1, toolset: 'docker-compose 占位', networkZone: 'isolated', imageIds: ['img-draft-sandbox'] },
    { id: 'tpl-web', name: 'Web 漏洞沙箱池', version: 'v5.2', services: 3, toolset: 'burp / sqlmap / nuclei', networkZone: 'isolated', imageIds: ['img-web-pool'] },
];

const GRADER_SPECS: Grader[] = [
    { id: 'grader-exploit', name: 'Exploit Validator', kind: 'service', version: 'v2.3', contract: 'flag + on_target 证据', directions: ['vulnerability_exploitation'], nativeMetric: 'flag_captured', compatibleVersionIds: ['ver-exploitgym'] },
    { id: 'grader-tier', name: 'Tier Grader', kind: 'script', version: 'v1.7', contract: 'capability_bitmap', directions: ['vulnerability_exploitation'], nativeMetric: 'highest_tier', compatibleVersionIds: ['ver-exploitbench'] },
    { id: 'grader-submission', name: 'Submission Grader', kind: 'service', version: 'v3.0', contract: 'PoC + vul/fix exit code', directions: ['vulnerability_discovery', 'vulnerability_reproduction'], nativeMetric: 'submission_success', compatibleVersionIds: ['ver-cybergym'] },
    { id: 'grader-finding', name: 'Finding Grader', kind: 'llm_judge', version: 'v0.9-beta', contract: 'matched_findings', directions: ['vulnerability_discovery'], nativeMetric: 'TP/FP/FN', compatibleVersionIds: ['ver-realvuln'] },
    { id: 'grader-fixrun', name: 'fix-run.sh evaluator', kind: 'script', version: 'v2.0', contract: 'patch + 回归测试', directions: ['vulnerability_repair'], nativeMetric: 'PASS / MODEL_INCORRECT', compatibleVersionIds: ['ver-patcheval'] },
    { id: 'grader-platform', name: '平台通用判分器', kind: 'builtin', version: 'v1.4', contract: 'expected_output_contract', directions: ['vulnerability_discovery', 'vulnerability_reproduction', 'vulnerability_exploitation', 'vulnerability_repair'], nativeMetric: '通用', compatibleVersionIds: ['ver-custom-web', 'ver-internal-draft'] },
];

const envVersionId = (setId: string) => `ver-${setId}`;

const templateForSet = (setId: string) =>
    ({ exploitgym: 'tpl-userspace', exploitbench: 'tpl-v8', cybergym: 'tpl-cyber', realvuln: 'tpl-scanner', patcheval: 'tpl-patcheval', 'internal-draft': 'tpl-draft', 'custom-web': 'tpl-web' })[setId] ?? 'tpl-userspace';

const directionForSet = (setId: string): EvaluationDirection =>
    ({ exploitgym: 'vulnerability_exploitation', exploitbench: 'vulnerability_exploitation', cybergym: 'vulnerability_discovery', realvuln: 'vulnerability_discovery', patcheval: 'vulnerability_repair', 'internal-draft': 'vulnerability_exploitation', 'custom-web': 'vulnerability_exploitation' })[setId] as EvaluationDirection;

const domainBiasBySet: Record<string, TargetDomain[]> = {
    exploitgym: ['userspace_software', 'browser_engine', 'operating_system'],
    exploitbench: ['browser_engine'],
    cybergym: ['userspace_software', 'web_application'],
    realvuln: ['web_application', 'cloud_infrastructure'],
    patcheval: ['web_application', 'userspace_software'],
    'internal-draft': ['cloud_infrastructure', 'network_protocol', 'other'],
    'custom-web': ['web_application'],
};

const seedVersion = (spec: VersionSeedSpec) => {
    const setId = spec.setId;
    const versionId = spec.id ?? envVersionId(setId);
    const rng = mulberry32(hash32(versionId).split('').reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 7) >>> 0);
    const version: QuestionSetVersion = {
        id: versionId,
        setId,
        releaseVersion: spec.releaseVersion,
        sourceRef: spec.sourceRef,
        manifestHash: buildManifestHash(`${versionId}:${spec.taskCount}`),
        createdAt: daysAgo(spec.createdAtDays),
        releasedAt: spec.lifecycle === 'published' ? daysAgo(spec.createdAtDays - 2) : null,
        lifecycle: spec.lifecycle,
        counts: { fullTaskCount: spec.taskCount, projectOrRepoCount: spec.projectOrRepoCount, groundTruthCount: spec.groundTruthCount },
        envCounts: {
            logicalEnvCount: spec.logicalEnvCount,
            imageStateRefs: spec.logicalEnvCount * spec.stateRefsPerEnv,
            uniqueImageDigestCount: spec.uniqueImageDigestCount,
            workspaceCount: spec.workspaceCount,
        },
        metrics: {
            primaryMetric: spec.primaryMetric,
            aggregation: '按样本分母逐题计分',
            denominatorPolicy: spec.setId === 'cybergym' ? 'any-trial-pass，未完成计入分母' : '未完成计入分母，超时单独归因',
        },
        readiness: { dataReady: true, environmentReady: spec.environmentReady, graderReady: spec.graderReady, lastVerifiedAt: spec.environmentReady ? daysAgo(Math.min(spec.createdAtDays, 3)) : null },
        license: setId === 'custom-web' ? '厂商授权 · 项目内使用' : '平台内部授权',
        usageScope: spec.usageScope,
        referencedRuns: spec.lifecycle === 'published' ? Math.floor(rng() * 40) + 3 : 0,
    };
    store.versions.push(version);

    const directions = directionForSet(setId);
    const domainBias = domainBiasBySet[setId];
    const templateId = templateForSet(setId);
    const cwe = cwePool;

    for (let i = 0; i < spec.taskCount; i += 1) {
        const index = i + 1;
        const vulnId = `CVE-2026-${String(1000 + Math.floor(rng() * 8999))}`;
        const product = pick(rng, ['nginx', 'openssl', 'django', 'chromium', 'ffmpeg', 'linux-kernel']);
        const productVersion = `${Math.floor(rng() * 4) + 1}.${Math.floor(rng() * 10)}.${Math.floor(rng() * 20)}`;
        const goal = directions === 'vulnerability_repair' ? 'patch' : 'poc';
        const domain = spec.unlabeledDomains ? (rng() < 0.5 ? null : pick(rng, domainBias)) : pick(rng, domainBias);
        const runnable = rng() >= spec.failRate;
        store.samples.push({
            id: `${setId}-${index}`,
            versionId,
            index,
            suggestedDomain: null,
            name: `${setId.toUpperCase()}-${String(index).padStart(4, '0')}`,
            dedupKey: `${vulnId}+${product}+${productVersion}+${directions}+${goal}`,
            direction: directions,
            domain,
            cwe: pick(rng, cwe),
            language: pick(rng, languagePool),
            difficulty: pick(rng, difficultyByDirection[directions]),
            envId: `${versionId}-env-${(i % spec.logicalEnvCount) + 1}`,
            runnable,
            failReason: runnable ? null : pick(rng, ['image_pull_failed', 'container_start_timeout', 'grader_dry_run_failed'] as const),
        });
    }

    const uniqueImages = Math.min(spec.uniqueImageDigestCount, store.images.length);
    for (let e = 0; e < spec.logicalEnvCount; e += 1) {
        const imageId = store.images[e % uniqueImages]?.id ?? store.images[0].id;
        store.environments.push({
            id: `${versionId}-env-${e + 1}`,
            versionId,
            name: `${setId}-env-${String(e + 1).padStart(4, '0')}`,
            templateId,
            imageId,
            stateRefs: spec.stateRefsPerEnv,
            precheck: { status: spec.environmentReady ? 'passed' : 'pending', verifiedAt: spec.environmentReady ? version.readiness.lastVerifiedAt : null, failReason: null },
        });
    }
};

const seedStore = () => {
    store.images = IMAGE_SPECS.map((image) => ({ ...image }));
    store.templates = TEMPLATE_SPECS.map((template) => ({ ...template }));
    store.graders = GRADER_SPECS.map((grader) => ({ ...grader }));
    store.sets = SET_SPECS.map((set) => ({ ...set }));
    VERSION_SPECS.forEach(seedVersion);

    store.plans = [
        { id: 'plan-exploit-96', name: '利用方向 · 数据集均衡 · n=96', mode: 'stratified', seed: 42, size: 96, strata: [{ field: 'dataset', quota: 50 }, { field: 'domain', quota: 50 }], scope: { directions: ['vulnerability_exploitation'], versionIds: ['ver-exploitgym', 'ver-exploitbench', 'ver-custom-web'] }, status: 'active', strategyVersion: 3, owner: 'platform', references: 4, createdAt: daysAgo(20) },
        { id: 'plan-discovery-148', name: '发现方向 · CyberGym 摸底 · n=148', mode: 'random', seed: 7, size: 148, strata: [], scope: { directions: ['vulnerability_discovery'], versionIds: ['ver-cybergym'] }, status: 'active', strategyVersion: 1, owner: 'platform', references: 2, createdAt: daysAgo(12) },
        { id: 'plan-repair-all', name: '修复方向 · PatchEval 全量', mode: 'all', seed: 0, size: 230, strata: [], scope: { directions: ['vulnerability_repair'], versionIds: ['ver-patcheval'] }, status: 'draft', strategyVersion: 1, owner: 'platform', references: 0, createdAt: daysAgo(5) },
        // Vendor-A project-scoped plans: only visible in the project's sampling view.
        { id: 'plan-vendor-96', name: '厂商 A · 利用均衡 · n=96', mode: 'stratified', seed: 42, size: 96, strata: [{ field: 'dataset', quota: 100 }], scope: { directions: ['vulnerability_exploitation'], versionIds: ['ver-custom-web', 'ver-exploitgym'] }, status: 'active', strategyVersion: 2, owner: 'project', references: 3, createdAt: daysAgo(9) },
        { id: 'plan-vendor-regression', name: '厂商 A · 失败重测固定题单', mode: 'fixed', seed: 7, size: 24, strata: [], scope: { directions: ['vulnerability_exploitation'], versionIds: ['ver-custom-web'] }, status: 'active', strategyVersion: 1, owner: 'project', references: 1, createdAt: daysAgo(4) },
    ];

    store.importJobs = [
        {
            id: 'import-20260915-01',
            channel: 'web',
            owner: 'platform',
            fileName: 'internal-draft-202609.tar.zst',
            sizeMb: 2048,
            createdAt: daysAgo(6),
            status: 'passed',
            completedStage: 4,
            stageIssues: { structure: [], content: [{ file: 'items.jsonl', line: 87, message: '去重键与既有条目冲突（CVE-2026-3312 + nginx 1.8.2 + vuln_reproduction + poc）' }], security: [], dryrun: [] },
            createdVersionId: envVersionId('internal-draft'),
        },
        {
            id: 'import-20260916-04',
            channel: 'web',
            owner: 'project',
            fileName: 'vendor-a-web-202609.tar.zst',
            sizeMb: 512,
            createdAt: daysAgo(18),
            status: 'passed',
            completedStage: 4,
            stageIssues: { structure: [], content: [], security: [], dryrun: [] },
            createdVersionId: envVersionId('custom-web'),
        },
    ];

    store.exportRequests = [
        { id: 'export-20260918-02', objectType: 'task_list', targetLabel: 'ExploitGym v1.0 · 利用均衡 n=96 题单', purpose: '联合评测对齐', recipient: '合作方评测组', requestedBy: '厂商项目管理员', createdAt: daysAgo(3), status: 'approved', manifestHash: buildManifestHash('export-20260918-02'), expiresAt: daysAhead(27), downloads: 2 },
        { id: 'export-20260920-01', objectType: 'version_metadata', targetLabel: 'PatchEval Verified · 版本元数据包', purpose: '复测委托', recipient: '外部复测实验室', requestedBy: '厂商项目管理员', createdAt: daysAgo(1), status: 'pending', manifestHash: null, expiresAt: null, downloads: 0 },
    ];

    store.labelCorrections = [
        { id: 'corr-001', versionId: 'ver-internal-draft', sampleId: 'internal-draft-12', suggestedDomain: 'cloud_infrastructure', reason: '复核确认 FP trap 误报：目标为 runc 组件，原标注「网络与协议」有误', source: '复核员 · 复核单 RT-2214', createdAt: daysAgo(2), status: 'pending', outcome: null },
        { id: 'corr-002', versionId: 'ver-exploitgym', sampleId: 'exploitgym-300', suggestedDomain: 'userspace_software', reason: '复测确认目标为 glibc 用户态组件，原标注「浏览器与引擎」有误', source: '复核员 · 复核单 RT-2198', createdAt: daysAgo(1), status: 'pending', outcome: null },
    ];

    auditSeq = 0;
    pushEvent(store, '版本发布', 'ExploitGym v1.0-canonical', 'manifest_hash 锁定，进入 PUBLISHED');
    pushEvent(store, '批量预检', 'CyberGym level1-full', '1,507 逻辑环境预检通过率 96.2%，environment_ready 置真');
    pushEvent(store, '导出审批', 'export-20260918-02', '批准题单导出，用途=联合评测对齐，有效期 30 天');
    store.frozenLists = [
        { id: 'frozen-seed-1', planId: 'plan-exploit-96', planName: '利用方向 · 数据集均衡 · n=96', seed: 42, taskCount: 96, strategyVersion: 3, dataVersions: ['ver-exploitgym', 'ver-exploitbench'], labelVersions: ['ver-exploitgym@label-6f2a', 'ver-exploitbench@label-19c4'], createdAt: daysAgo(8) },
    ];
};

if (store.versions.length === 0) seedStore();

/* ------------------------------ core computations --------------------------- */

/** Demo vendor project id used by the external-user preview. */
export const DEMO_PROJECT_ID = 'proj-vendor-a';

/** Authorization rule (PRD §7.2): a version is usable by a project iff it is
 * published AND (platform-internal OR owned by that project). Metadata-level
 * visibility follows the same rule so project-scoped sets never leak. */
export const isVersionAuthorized = (version: QuestionSetVersion, set: QuestionSet | undefined, projectId: string = DEMO_PROJECT_ID) =>
    version.lifecycle === 'published' && (version.usageScope === 'internal' || (version.usageScope === 'project' && set?.ownerProjectId === projectId));

export const getDomainGate = (versionId: string) => {
    const versionSamples = store.samples.filter((sample) => sample.versionId === versionId);
    const total = versionSamples.length;
    const labeled = versionSamples.filter((sample) => sample.domain !== null).length;
    return { total, labeled, missing: total - labeled, ratio: total === 0 ? 1 : labeled / total };
};

const DOMAIN_GATE_THRESHOLD = 1;

export const isDomainGateOpen = (versionId: string) => {
    const gate = getDomainGate(versionId);
    return gate.total === 0 || gate.missing === 0 || gate.ratio >= DOMAIN_GATE_THRESHOLD;
};

export interface SamplingScope {
    directions: EvaluationDirection[];
    domains: TargetDomain[];
    versionIds: string[];
}

export const computeCandidates = (scope: SamplingScope) => {
    const directionSet = new Set(scope.directions);
    const domainSet = new Set(scope.domains);
    const versionSet = new Set(scope.versionIds);
    const candidates = store.samples.filter(
        (sample) => versionSet.has(sample.versionId) && directionSet.has(sample.direction) && (domainSet.size === 0 || (sample.domain !== null && domainSet.has(sample.domain))),
    );
    const seen = new Set<string>();
    const deduped: QuestionBankSample[] = [];
    let duplicateCount = 0;
    for (const sample of candidates) {
        if (seen.has(sample.dedupKey)) {
            duplicateCount += 1;
            continue;
        }
        seen.add(sample.dedupKey);
        deduped.push(sample);
    }
    const runnable = deduped.filter((sample) => sample.runnable);
    const nonRunnable = deduped.filter((sample) => !sample.runnable);
    const reasonMap = new Map<PrecheckFailReason, number>();
    for (const sample of nonRunnable) {
        if (sample.failReason) reasonMap.set(sample.failReason, (reasonMap.get(sample.failReason) ?? 0) + 1);
    }
    return { candidates, deduped, duplicateCount, runnable, nonRunnable, reasons: [...reasonMap.entries()].map(([reason, count]) => ({ reason, count })) };
};

const shuffleSeeded = <T,>(list: T[], seed: number) => {
    const rng = mulberry32(seed);
    const result = [...list];
    for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
};

const countBy = <T,>(list: T[], keyOf: (item: T) => string) => {
    const map = new Map<string, number>();
    for (const item of list) {
        const key = keyOf(item);
        map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
};

export interface SamplingRequest {
    scope: SamplingScope;
    mode: 'all' | 'random' | 'stratified' | 'fixed';
    seed: number;
    size: number;
    strata: SamplingStratum[];
    fixedTaskIds?: string[];
}

export const previewSampling = (request: SamplingRequest): SamplingPreview => {
    const { candidates, deduped, runnable, nonRunnable, reasons } = computeCandidates(request.scope);
    const versionById = new Map(store.versions.map((version) => [version.id, version]));
    const setById = new Map(store.sets.map((set) => [set.id, set]));

    let selected: QuestionBankSample[];
    if (request.mode === 'all') {
        selected = runnable;
    } else if (request.mode === 'fixed') {
        const fixed = new Set(request.fixedTaskIds ?? []);
        selected = runnable.filter((sample) => fixed.has(sample.id));
    } else {
        const targetSize = Math.min(request.size, runnable.length);
        const shuffled = shuffleSeeded(runnable, request.seed);
        if (request.mode === 'random' || request.strata.length === 0) {
            selected = shuffled.slice(0, targetSize);
        } else {
            // PRD 5.3: 先覆盖方向，再按数据集均衡，最后集内随机。
            // The first stratum field is the balancing dimension; allocation is
            // proportional to each bucket's pool size (largest remainder), then a
            // seeded shuffle decides which samples a bucket contributes.
            const balanceField = request.strata[0].field;
            const bucketOf = (sample: QuestionBankSample) => {
                if (balanceField === 'dataset') return sample.versionId;
                if (balanceField === 'domain') return sample.domain ?? 'other';
                if (balanceField === 'difficulty') return sample.difficulty;
                return sample.cwe;
            };
            const buckets = new Map<string, QuestionBankSample[]>();
            for (const sample of shuffled) {
                const key = bucketOf(sample);
                const bucket = buckets.get(key);
                if (bucket) bucket.push(sample);
                else buckets.set(key, [sample]);
            }
            const keys = [...buckets.keys()];
            const totalPool = shuffled.length || 1;
            const quotaByKey = new Map<string, number>();
            let allocated = 0;
            for (const key of keys) {
                const quota = Math.floor((targetSize * (buckets.get(key)?.length ?? 0)) / totalPool);
                quotaByKey.set(key, quota);
                allocated += quota;
            }
            let remainder = targetSize - allocated;
            for (const key of keys) {
                if (remainder <= 0) break;
                quotaByKey.set(key, (quotaByKey.get(key) ?? 0) + 1);
                remainder -= 1;
            }
            const picked: QuestionBankSample[] = [];
            for (const key of keys) {
                const quota = quotaByKey.get(key) ?? 0;
                if (quota <= 0) continue;
                const bucket = shuffleSeeded(buckets.get(key) ?? [], request.seed + hash32(key).charCodeAt(0));
                picked.push(...bucket.slice(0, quota));
            }
            selected = picked.slice(0, targetSize);
        }
    }

    const byDomain = [...countBy(selected, (sample) => sample.domain ?? 'other').entries()].map(([key, count]) => ({ key: key as TargetDomain, count }));
    const byDatasetMap = countBy(selected, (sample) => sample.versionId);
    const byDataset = [...byDatasetMap.entries()].map(([key, count]) => ({ key, label: setById.get(versionById.get(key)?.setId ?? '')?.name ?? key, count }));
    const dataVersions = [...new Set(selected.map((sample) => sample.versionId))].sort();
    const labelVersions = dataVersions.map((versionId) => `${versionId}@label-${hash32(versionId + selected.filter((sample) => sample.versionId === versionId && sample.domain !== null).length)}`);

    return {
        candidateCount: candidates.length,
        dedupedCount: deduped.length,
        runnableCount: runnable.length,
        nonRunnableCount: nonRunnable.length,
        nonRunnableReasons: reasons,
        selectedTaskIds: selected.map((sample) => sample.id),
        byDomain,
        byDataset,
        frozenTuple: { seed: request.seed, strategyVersion: 1, dataVersions, labelVersions },
        reproducible: true,
    };
};

/* ------------------------------- read queries ------------------------------- */

const wait = () => delay(IS_DEMO_MODE ? 120 : 0);

/** L2 governance facet distribution for one version (CWE / language / difficulty top values). */
export const getVersionFacets = async (versionId: string): Promise<VersionFacets> => {
    await wait();
    const top = (keyOf: (sample: QuestionBankSample) => string) => {
        const counts = new Map<string, number>();
        for (const sample of store.samples) {
            if (sample.versionId !== versionId) continue;
            const key = keyOf(sample);
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        return [...counts.entries()]
            .map(([key, count]) => ({ key, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 6);
    };
    return {
        versionId,
        cwe: top((sample) => sample.cwe),
        language: top((sample) => sample.language),
        difficulty: top((sample) => sample.difficulty),
    };
};

/** Field-level diff between a version and its predecessor in the same set. */
export const diffVersions = (current: QuestionSetVersion, previous: QuestionSetVersion): VersionDiffRow[] => [
    {
        field: 'full_task_count',
        current: current.counts.fullTaskCount.toLocaleString(),
        previous: previous.counts.fullTaskCount.toLocaleString(),
        delta: current.counts.fullTaskCount - previous.counts.fullTaskCount,
    },
    {
        field: 'ground_truth_count',
        current: current.counts.groundTruthCount.toLocaleString(),
        previous: previous.counts.groundTruthCount.toLocaleString(),
        delta: current.counts.groundTruthCount - previous.counts.groundTruthCount,
    },
    {
        field: 'unique_image_digest_count',
        current: current.envCounts.uniqueImageDigestCount.toLocaleString(),
        previous: previous.envCounts.uniqueImageDigestCount.toLocaleString(),
        delta: current.envCounts.uniqueImageDigestCount - previous.envCounts.uniqueImageDigestCount,
    },
    { field: 'primary_metric', current: current.metrics.primaryMetric, previous: previous.metrics.primaryMetric, delta: null },
];

export const getQuestionBankSnapshot = async () => {
    await wait();
    // Polling reads advance running jobs (precheck chunks, import stages) so the
    // UI shows live progress without a scheduler process.
    tickPrecheckJobs();
    tickImportJobs();
    const domainBySet = new Map<string, Set<TargetDomain>>();
    for (const sample of store.samples) {
        if (sample.domain === null) continue;
        const bucket = domainBySet.get(sample.versionId);
        if (bucket) bucket.add(sample.domain);
        else domainBySet.set(sample.versionId, new Set([sample.domain]));
    }
    return {
        sets: store.sets.map((set) => {
            const setDomains = new Set<TargetDomain>();
            for (const version of store.versions) {
                if (version.setId !== set.id) continue;
                for (const domain of domainBySet.get(version.id) ?? []) setDomains.add(domain);
            }
            return { ...set, supportedDomains: [...setDomains] };
        }),
        versions: store.versions.map((version) => ({ ...version })),
        images: store.images.map((image) => ({ ...image })),
        templates: store.templates.map((template) => ({ ...template })),
        graders: store.graders.map((grader) => ({ ...grader })),
        plans: store.plans.map((plan) => ({ ...plan })),
        importJobs: store.importJobs.map((job) => ({ ...job })),
        exportRequests: store.exportRequests.map((request) => ({ ...request })),
        precheckJobs: store.precheckJobs.map((job) => ({ ...job })),
        labelCorrections: store.labelCorrections.map((correction) => ({ ...correction })),
        frozenLists: store.frozenLists.map((record) => ({ ...record })),
        audit: store.audit.map((event) => ({ ...event })),
        gates: store.versions.filter((version) => version.lifecycle === 'verified' || version.lifecycle === 'labeled').map((version) => ({ versionId: version.id, ...getDomainGate(version.id) })),
    };
};

export const getVersionSamples = async (versionId: string, query: { domainLabeled?: 'labeled' | 'unlabeled'; page?: number; pageSize?: number } = {}) => {
    await wait();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    let list = store.samples.filter((sample) => sample.versionId === versionId);
    if (query.domainLabeled === 'unlabeled') list = list.filter((sample) => sample.domain === null);
    if (query.domainLabeled === 'labeled') list = list.filter((sample) => sample.domain !== null);
    const total = list.length;
    const start = (page - 1) * pageSize;
    return { total, page, pageSize, list: list.slice(start, start + pageSize).map((sample) => ({ ...sample, suggestedDomain: store.labelSuggestions[sample.id] ?? null })) };
};

export const getOverview = async (): Promise<QuestionBankOverview> => {
    await wait();
    const published = store.versions.filter((version) => version.lifecycle === 'published');
    const totals = published.reduce(
        (acc, version) => ({
            logicalEnvCount: acc.logicalEnvCount + version.envCounts.logicalEnvCount,
            imageStateRefs: acc.imageStateRefs + version.envCounts.imageStateRefs,
            uniqueImageDigestCount: acc.uniqueImageDigestCount + version.envCounts.uniqueImageDigestCount,
            workspaceCount: acc.workspaceCount + version.envCounts.workspaceCount,
        }),
        { logicalEnvCount: 0, imageStateRefs: 0, uniqueImageDigestCount: 0, workspaceCount: 0 },
    );
    const blockedGates = store.versions
        .filter((version) => version.lifecycle === 'verified' || version.lifecycle === 'labeled' || version.lifecycle === 'draft' || version.lifecycle === 'structured')
        .map((version) => ({ versionId: version.id, ...getDomainGate(version.id) }))
        .filter((gate) => gate.missing > 0)
        .map((gate) => ({ versionId: gate.versionId, label: `${store.sets.find((set) => set.id === store.versions.find((version) => version.id === gate.versionId)?.setId)?.name ?? gate.versionId}`, missing: gate.missing, total: gate.total }));
    return {
        totals,
        sandboxesTotal: 2537,
        publishedSets: published.length,
        draftVersions: store.versions.filter((version) => version.lifecycle !== 'published' && version.lifecycle !== 'retired').length,
        readiness: {
            published: published.length,
            verified: store.versions.filter((version) => version.lifecycle === 'verified').length,
            inProgress: store.versions.filter((version) => version.lifecycle === 'draft' || version.lifecycle === 'structured' || version.lifecycle === 'labeled').length,
        },
        todos: {
            blockedGates,
            pendingExports: store.exportRequests.filter((request) => request.status === 'pending').length,
            runningJobs: store.precheckJobs.filter((job) => job.status === 'running').length + store.importJobs.filter((job) => job.status === 'running').length,
            failedPrechecks: store.environments.filter((env) => env.precheck.status === 'failed').length,
            pendingCorrections: store.labelCorrections.filter((correction) => correction.status === 'pending').length,
        },
        recentEvents: store.audit.slice(0, 8).map((event) => ({ ...event })),
    };
};

/* -------------------------------- mutations --------------------------------- */

let seq = 100;

export const publishVersion = async (versionId: string) => {
    await wait();
    const version = store.versions.find((item) => item.id === versionId);
    if (!version) throw new Error('version not found');
    if (!version.readiness.dataReady || !version.readiness.environmentReady || !version.readiness.graderReady) throw new Error('readiness incomplete');
    version.lifecycle = 'published';
    version.releasedAt = nowIso();
    pushEvent(store, '版本发布', `${version.releaseVersion}`, `manifest_hash 锁定（${version.manifestHash.slice(0, 15)}…），进入 PUBLISHED`);
    return { ...version };
};

export const retireVersion = async (versionId: string) => {
    await wait();
    const version = store.versions.find((item) => item.id === versionId);
    if (!version) throw new Error('version not found');
    version.lifecycle = 'retired';
    pushEvent(store, '版本下线', `${version.releaseVersion}`, `已有 ${version.referencedRuns} 个运行快照继续引用归档版本`);
    return { ...version };
};

const SUGGESTION_BIAS: Record<string, TargetDomain[]> = {
    exploitgym: ['userspace_software', 'browser_engine', 'operating_system'],
    exploitbench: ['browser_engine'],
    cybergym: ['userspace_software', 'web_application'],
    realvuln: ['web_application', 'cloud_infrastructure'],
    patcheval: ['web_application', 'userspace_software'],
    'internal-draft': ['cloud_infrastructure', 'network_protocol', 'other'],
    'custom-web': ['web_application'],
};

export const suggestDomains = async (versionId: string) => {
    await wait();
    const rng = mulberry32(Date.now() % 2147483647);
    const versionSamples = store.samples.filter((sample) => sample.versionId === versionId && sample.domain === null);
    const bias = SUGGESTION_BIAS[store.versions.find((version) => version.id === versionId)?.setId ?? ''] ?? DOMAIN_KEYS;
    let updated = 0;
    for (const sample of versionSamples) {
        const suggestion = sample.language === 'Go' ? 'network_protocol' : sample.language === 'JavaScript' ? 'browser_engine' : pick(rng, bias);
        store.labelSuggestions[sample.id] = suggestion;
        updated += 1;
    }
    pushEvent(store, 'AI 预标注', versionId, `生成 ${updated} 条领域建议，等待人工确认`);
    return { suggested: updated };
};

/** Workbench single-sample labeling (Label Studio style): set or clear the
 * primary domain of one sample. Published versions are immutable — the caller
 * shows the read-only note instead. */
export const applySampleLabel = async (versionId: string, sampleId: string, domain: TargetDomain | null) => {
    await wait();
    const version = store.versions.find((item) => item.id === versionId);
    const sample = store.samples.find((item) => item.id === sampleId && item.versionId === versionId);
    if (!version || !sample) throw new Error('sample not found');
    if (version.lifecycle === 'published') throw new Error('published versions are immutable');
    sample.domain = domain;
    if (domain) delete store.labelSuggestions[sampleId];
    const gate = getDomainGate(versionId);
    if ((version.lifecycle === 'draft' || version.lifecycle === 'structured') && gate.missing === 0) {
        version.lifecycle = 'labeled';
    }
    pushEvent(store, domain ? '单题标注' : '清除标注', sampleId, `领域=${domain ?? '已清除'} · 覆盖率 ${(gate.ratio * 100).toFixed(1)}%`);
    return { ...sample, gate };
};

/** Review 回流: adopt or reject a label correction. Adopting never rewrites a
 * published version — the fix is recorded for the next release instead. */
export const decideLabelCorrection = async (correctionId: string, decision: 'applied' | 'rejected') => {
    await wait();
    const correction = store.labelCorrections.find((item) => item.id === correctionId);
    if (!correction || correction.status !== 'pending') throw new Error('correction not pending');
    const version = store.versions.find((item) => item.id === correction.versionId);
    const sample = store.samples.find((item) => item.id === correction.sampleId);
    if (decision === 'applied') {
        if (version && sample && version.lifecycle !== 'published') {
            sample.domain = correction.suggestedDomain;
            correction.outcome = '已生效：样本领域已更新';
        } else {
            correction.outcome = '已采纳：记入下一版本待生效（已发布版本不回写）';
        }
        pushEvent(store, '修正建议采纳', `${correction.sampleId}`, `${correction.outcome} · 建议=${correction.suggestedDomain}`);
    } else {
        correction.outcome = '已驳回：维持原标注';
        pushEvent(store, '修正建议驳回', `${correction.sampleId}`, '维持原标注，理由已留痕');
    }
    correction.status = decision;
    return { ...correction };
};

export const confirmLabelSuggestions = async (versionId: string, sampleIds: string[]) => {
    await wait();
    let updated = 0;
    for (const sampleId of sampleIds) {
        const suggestion = store.labelSuggestions[sampleId];
        const sample = store.samples.find((item) => item.id === sampleId);
        if (sample && sample.versionId === versionId && suggestion) {
            sample.domain = suggestion;
            delete store.labelSuggestions[sampleId];
            updated += 1;
        }
    }
    const gate = getDomainGate(versionId);
    const version = store.versions.find((item) => item.id === versionId);
    if (version) {
        if (version.lifecycle === 'draft' && gate.missing === 0) version.lifecycle = 'labeled';
        else if (version.lifecycle === 'structured' && gate.missing === 0) version.lifecycle = 'labeled';
    }
    pushEvent(store, '标注确认', versionId, `确认 ${updated} 条领域标签；覆盖率 ${(gate.ratio * 100).toFixed(1)}%`);
    return { updated, gate };
};

export const startPrecheck = async (versionId: string, concurrency: number) => {
    await wait();
    const envs = store.environments.filter((env) => env.versionId === versionId);
    const job: PrecheckJob = {
        id: `precheck-${++seq}`,
        versionId,
        concurrency: Math.max(1, Math.min(concurrency, 64)),
        createdAt: nowIso(),
        status: 'running',
        processed: 0,
        total: envs.length,
        passCount: 0,
        failCount: 0,
        lastReasons: [],
    };
    store.precheckJobs.unshift(job);
    for (const env of envs) {
        env.precheck = { status: 'pending', verifiedAt: null, failReason: null };
    }
    pushEvent(store, '批量预检启动', versionId, `并发 ${job.concurrency}，共 ${job.total} 个逻辑环境`);
    return { ...job };
};

export const cancelPrecheck = async (jobId: string) => {
    await wait();
    const job = store.precheckJobs.find((item) => item.id === jobId);
    if (job && job.status === 'running') {
        job.status = 'failed';
        pushEvent(store, '批量预检终止', job.versionId, `已处理 ${job.processed}/${job.total}`);
    }
    return job ? { ...job } : null;
};

const REASON_KEYS: PrecheckFailReason[] = ['image_pull_failed', 'container_start_timeout', 'grader_dry_run_failed', 'network_probe_failed'];

const tickPrecheckJobs = () => {
    const runningJobs = store.precheckJobs.filter((job) => job.status === 'running');
    for (const job of runningJobs) {
        const envs = store.environments.filter((env) => env.versionId === job.versionId);
        const chunk = Math.max(1, Math.ceil(job.total / 12));
        const jobRng = mulberry32(hash32(job.id).split('').reduce((acc, ch) => acc * 33 + ch.charCodeAt(0), 11) >>> 0);
        let passDelta = 0;
        let failDelta = 0;
        const reasonDelta = new Map<PrecheckFailReason, number>();
        for (let i = 0; i < chunk && job.processed < job.total; i += 1) {
            const env = envs[job.processed];
            if (!env) break;
            const fail = jobRng() < 0.07;
            if (fail) {
                const reason = pick(jobRng, REASON_KEYS);
                env.precheck = { status: 'failed', verifiedAt: nowIso(), failReason: reason };
                reasonDelta.set(reason, (reasonDelta.get(reason) ?? 0) + 1);
                const sample = store.samples.find((item) => item.envId === env.id && item.versionId === job.versionId);
                if (sample) {
                    sample.runnable = false;
                    sample.failReason = reason;
                }
                failDelta += 1;
            } else {
                env.precheck = { status: 'passed', verifiedAt: nowIso(), failReason: null };
                passDelta += 1;
            }
            job.processed += 1;
        }
        job.passCount += passDelta;
        job.failCount += failDelta;
        job.lastReasons = [...reasonDelta.entries()].map(([reason, count]) => ({ reason, count }));
        if (job.processed >= job.total) {
            const passRate = job.total === 0 ? 1 : job.passCount / job.total;
            job.status = passRate >= 0.9 ? 'passed' : 'failed';
            const version = store.versions.find((item) => item.id === job.versionId);
            if (version) {
                version.readiness.environmentReady = passRate >= 0.9;
                version.readiness.lastVerifiedAt = nowIso();
                if (version.lifecycle === 'draft' || version.lifecycle === 'structured' || version.lifecycle === 'labeled') {
                    if (version.readiness.graderReady) version.lifecycle = 'verified';
                }
            }
            pushEvent(store, '批量预检完成', job.versionId, `通过 ${job.passCount}/${job.total}（${(passRate * 100).toFixed(1)}%），environment_ready=${passRate >= 0.9}`);
        }
    }
    return runningJobs.length;
};

const IMPORT_STAGE_ORDER: ImportStage[] = ['structure', 'content', 'security', 'dryrun'];

export const startImportJob = async (fileName: string, sizeMb: number, channel: ImportJob['channel'] = 'web', owner: ImportJob['owner'] = 'platform') => {
    await wait();
    const seedHash = hash32(`${fileName}:${sizeMb}`);
    const rng = mulberry32(parseInt(seedHash, 16));
    const job: ImportJob = {
        id: `import-${++seq}`,
        channel,
        owner,
        fileName,
        sizeMb,
        createdAt: nowIso(),
        status: 'running',
        completedStage: 0,
        stageIssues: {
            structure: rng() < 0.35 ? [{ file: 'manifest.yaml', line: Math.floor(rng() * 200) + 1, message: '枚举值非法：environment_type=vm（允许 docker/compose）' }] : [],
            content: rng() < 0.5 ? [{ file: 'items.jsonl', line: Math.floor(rng() * 900) + 1, message: '去重键冲突：与已发布条目重复（不得只按 CVE 去重）' }] : [],
            security: rng() < 0.25 ? [{ file: 'items.jsonl', line: Math.floor(rng() * 900) + 1, message: '检测到疑似内网 IP（10.x.x.x），需脱敏后重传' }] : [],
            dryrun: [],
        },
        createdVersionId: null,
    };
    store.importJobs.unshift(job);
    pushEvent(store, '导入任务创建', fileName, `${channel} 通道 · ${sizeMb} MB`);
    return { ...job };
};

const tickImportJobs = () => {
    const running = store.importJobs.filter((job) => job.status === 'running');
    for (const job of running) {
        const blocking = IMPORT_STAGE_ORDER.slice(0, 4).find((stage) => job.stageIssues[stage].length > 0 && IMPORT_STAGE_ORDER.indexOf(stage) === job.completedStage);
        if (blocking) {
            job.status = 'failed';
            pushEvent(store, '导入校验失败', job.fileName, `${blocking} 阶段发现 ${job.stageIssues[blocking].length} 个问题，已定位到行号`);
            continue;
        }
        job.completedStage += 1;
        if (job.completedStage >= 4) {
            job.status = 'passed';
            // Project-owned uploads become a new custom dataset scoped to the vendor
            // project; platform imports land on the internal draft set instead.
            const isProjectUpload = job.owner === 'project';
            const newSetId = isProjectUpload ? `custom-uploaded-${++seq}` : 'internal-draft';
            if (isProjectUpload) {
                store.sets.unshift({
                    id: newSetId,
                    code: `CUSTOM-${job.fileName.replace(/\.[^.]+$/, '').toUpperCase().slice(0, 12)}`,
                    name: `自建集 · ${job.fileName.replace(/\.[^.]+$/, '')}`,
                    type: 'custom',
                    source: '项目自建',
                    ownerProjectId: 'proj-vendor-a',
                    directions: ['vulnerability_exploitation'],
                    description: '项目上传的自建数据集，仅本项目可见。',
                    nativeMetric: '成功率 / 运行取证',
                });
            }
            const newVersion: QuestionSetVersion = {
                id: `ver-imported-${++seq}`,
                setId: newSetId,
                releaseVersion: `import-${job.fileName.replace(/\.[^.]+$/, '')}`,
                sourceRef: `upload://${job.fileName}`,
                manifestHash: buildManifestHash(job.id),
                createdAt: nowIso(),
                releasedAt: null,
                lifecycle: 'draft',
                counts: { fullTaskCount: 128, projectOrRepoCount: 0, groundTruthCount: 0 },
                envCounts: { logicalEnvCount: 128, imageStateRefs: 128, uniqueImageDigestCount: 96, workspaceCount: 128 },
                metrics: { primaryMetric: '待定', aggregation: '按样本分母逐题计分', denominatorPolicy: '发布前试算' },
                readiness: { dataReady: true, environmentReady: false, graderReady: false, lastVerifiedAt: null },
                license: isProjectUpload ? '厂商授权 · 项目内使用' : '平台内部授权',
                usageScope: isProjectUpload ? 'project' : 'internal',
                referencedRuns: 0,
            };
            store.versions.unshift(newVersion);
            const rng = mulberry32(parseInt(hash32(newVersion.id), 16));
            for (let i = 1; i <= 128; i += 1) {
                store.samples.push({
                    id: `imported-${seq}-${i}`,
                    versionId: newVersion.id,
                    index: i,
                    suggestedDomain: null,
                    name: `IMPORTED-${String(i).padStart(4, '0')}`,
                    dedupKey: `CVE-2026-${5000 + i}+imported+1.0+vulnerability_exploitation+poc`,
                    direction: 'vulnerability_exploitation',
                    domain: null,
                    cwe: pick(rng, cwePool),
                    language: pick(rng, languagePool),
                    difficulty: pick(rng, difficultyByDirection.vulnerability_exploitation),
                    envId: `${newVersion.id}-env-${i}`,
                    runnable: rng() >= 0.15,
                    failReason: rng() < 0.15 ? 'image_pull_failed' : null,
                });
                store.environments.push({
                    id: `${newVersion.id}-env-${i}`,
                    versionId: newVersion.id,
                    name: `imported-env-${String(i).padStart(4, '0')}`,
                    templateId: 'tpl-draft',
                    imageId: 'img-draft-sandbox',
                    stateRefs: 1,
                    precheck: { status: 'pending', verifiedAt: null, failReason: null },
                });
            }
            job.createdVersionId = newVersion.id;
            pushEvent(store, '导入校验通过', job.fileName, isProjectUpload ? '四段校验通过，生成项目自建数据集（仅本项目可见）' : '四段校验通过，生成 DRAFT 版本进入标注工作台');
        }
    }
    return running.length;
};

export const createExportRequest = async (input: { objectType: ExportRequest['objectType']; targetLabel: string; purpose: string; recipient: string }) => {
    await wait();
    const request: ExportRequest = {
        id: `export-${++seq}`,
        objectType: input.objectType,
        targetLabel: input.targetLabel,
        purpose: input.purpose,
        recipient: input.recipient,
        requestedBy: '厂商项目管理员',
        createdAt: nowIso(),
        status: 'pending',
        manifestHash: null,
        expiresAt: null,
        downloads: 0,
    };
    store.exportRequests.unshift(request);
    pushEvent(store, '导出申请', input.targetLabel, `用途=${input.purpose} · 接收方=${input.recipient}`);
    return { ...request };
};

export const decideExportRequest = async (requestId: string, decision: 'approved' | 'rejected') => {
    await wait();
    const request = store.exportRequests.find((item) => item.id === requestId);
    if (!request) throw new Error('request not found');
    request.status = decision;
    let approvedHash: string | null = null;
    if (decision === 'approved') {
        approvedHash = buildManifestHash(request.id);
        request.manifestHash = approvedHash;
        request.expiresAt = daysAhead(30);
    }
    pushEvent(store, decision === 'approved' ? '导出审批通过' : '导出驳回', request.targetLabel, decision === 'approved' && approvedHash ? `生成 ${approvedHash.slice(0, 15)}… · 有效期 30 天` : '拒绝本次导出申请');
    return { ...request };
};

export const downloadExport = async (requestId: string) => {
    await wait();
    const request = store.exportRequests.find((item) => item.id === requestId);
    if (!request || request.status !== 'approved') throw new Error('not downloadable');
    request.downloads += 1;
    pushEvent(store, '导出包下载', request.targetLabel, `第 ${request.downloads} 次下载 · 到期 ${request.expiresAt?.slice(0, 10)}`);
    return { ...request };
};

export const revokeExport = async (requestId: string) => {
    await wait();
    const request = store.exportRequests.find((item) => item.id === requestId);
    if (!request) throw new Error('request not found');
    request.status = 'revoked';
    pushEvent(store, '导出包撤销', request.targetLabel, `已分发 ${request.downloads} 次，撤销后下载通道关闭`);
    return { ...request };
};

export const createSamplingPlan = async (input: { name: string; mode: SamplingPlan['mode']; seed: number; size: number; strata: SamplingStratum[]; scope: SamplingPlan['scope']; owner?: SamplingPlan['owner'] }) => {
    await wait();
    const plan: SamplingPlan = {
        id: `plan-${++seq}`,
        name: input.name,
        mode: input.mode,
        seed: input.seed,
        size: input.size,
        strata: input.strata,
        scope: input.scope,
        status: 'active',
        strategyVersion: 1,
        owner: input.owner ?? 'platform',
        references: 0,
        createdAt: nowIso(),
    };
    store.plans.unshift(plan);
    pushEvent(store, '抽样策略创建', plan.name, `${plan.mode} · seed=${plan.seed} · n=${plan.size}`);
    return { ...plan };
};

export const setPlanStatus = async (planId: string, status: SamplingPlan['status']) => {
    await wait();
    const plan = store.plans.find((item) => item.id === planId);
    if (!plan) throw new Error('plan not found');
    if (plan.status === 'active' && status === 'archived' && plan.references > 0) {
        plan.status = status;
        pushEvent(store, '策略归档', plan.name, `${plan.references} 个历史快照继续引用 v${plan.strategyVersion}`);
    } else {
        plan.status = status;
        pushEvent(store, '策略状态变更', plan.name, `→ ${status}`);
    }
    return { ...plan };
};

export const freezeSampling = async (planId: string, planName: string, preview: SamplingPreview) => {
    await wait();
    const record: FrozenTaskList = {
        id: `frozen-${++seq}`,
        planId,
        planName,
        seed: preview.frozenTuple.seed,
        taskCount: preview.selectedTaskIds.length,
        strategyVersion: preview.frozenTuple.strategyVersion,
        dataVersions: preview.frozenTuple.dataVersions,
        labelVersions: preview.frozenTuple.labelVersions,
        createdAt: nowIso(),
    };
    store.frozenLists.unshift(record);
    pushEvent(store, '题单冻结', planName, `seed=${preview.frozenTuple.seed} · ${record.taskCount} 题 · 已写入任务快照，可在靶场中心创建评测时引用`);
    return { ...record };
};
