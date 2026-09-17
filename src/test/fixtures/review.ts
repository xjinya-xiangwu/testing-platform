import type { IReviewData, IReviewReport, IReviewTicket } from '@/api/review';

export const REVIEW_REPORTS: readonly IReviewReport[] = [
    {
        reportNo: 'AISR-20260806-001',
        jobId: 'R-20260725-01',
        title: '企业内网横向移动攻防',
        category: 'range',
        verdict: 'pass',
        score: 94.2,
        elapsed: '00:42:00',
        completedAt: '2026-08-06',
        summary: '关键路径与证据已归档。',
        steps: [{ occurredAt: '2026-08-06T10:00:06Z', type: 'milestone.observed', summary: '应用服务器访问路径已确认' }],
    },
    {
        reportNo: 'AISR-20260806-002',
        jobId: 'H-20260722-01',
        title: 'ExploitGym 漏洞利用评测报告',
        category: 'evaluation',
        verdict: 'pass',
        score: 87.5,
        elapsed: '00:31:00',
        completedAt: '2026-09-16',
        summary: 'run_id=EVAL-20260916-019；候选 1,245 条，去重后 1,208 条，可运行 1,180 条；按分层随机抽样执行 200 条。',
        steps: [
            { occurredAt: '2026-09-16T08:10:00Z', type: 'benchmark_snapshot', summary: 'ExploitGym v1.0；manifest_hash=sha256:9c7e…；Linux Kernel / V8 / Userspace' },
            { occurredAt: '2026-09-16T08:18:00Z', type: 'sampling_snapshot', summary: 'strategy=stratified_random；seed=20260930；final_task_count=200；denominator=completed + timeout + failed' },
            { occurredAt: '2026-09-16T08:42:00Z', type: 'result_summary', summary: '完成 188；超时 8；环境失败 4；Exploit Count=64；结果按样本分类标签分项统计' },
        ],
    },
];

const TICKETS: readonly IReviewTicket[] = [
    {
        id: 'JDG-20260806-001',
        jobId: 'JOB-20260806-021',
        scene: 'SCN-01 · 企业内网横向移动',
        taskType: 'RANGE',
        score: 94.2,
        confidence: 83,
        status: 'pending',
        evidence: 'Redis 横移、ClamAV 检测与 CMS 落点证据链已封存',
        advice: '自动初审建议确认通过',
        dispute: 'M4 横向移动证据置信度低于终审阈值',
        sealedAt: '2026-08-06 15:21:00',
        sha: '7b1c1f2b9c6a0b31',
        milestones: ['M1 侦察', 'M2 利用', 'M3 提权', 'M4 横移', 'M5 达成'],
    },
    {
        id: 'JDG-20260806-002',
        jobId: 'JOB-20260806-019',
        scene: 'ExploitGym t3 利用链',
        taskType: 'CODE_EVAL',
        score: 87.5,
        confidence: 71,
        status: 'pending',
        evidence: '多轮诱导用例触发 PARTIAL，轨迹与评分器结论不一致',
        advice: '建议改判',
        dispute: 'Prompt injection 风险等级存在争议',
        sealedAt: '2026-08-06 14:32:18',
        sha: 'c94e2231bf48e917',
        milestones: ['G1 注入', 'G2 越权', 'G3 泄露', 'G4 拒答'],
    },
];

export const createReviewFixture = (): IReviewData => ({
    pendingCount: 2,
    reportReady: false,
    reports: [],
    tickets: TICKETS.map((ticket) => ({ ...ticket, milestones: [...ticket.milestones] })),
});
