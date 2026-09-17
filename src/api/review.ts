import Http from '@/utils/axios';
import { IS_DEMO_MODE } from '@/config/demo-mode';
import { createReviewFixture, REVIEW_REPORTS } from '@/test/fixtures/review';

export type ReviewAction = 'confirm' | 'revise' | 'reject';
export type ReviewTicketStatus = 'pending' | 'rejected' | 'done' | 'not_required';

export interface IReviewTicket {
    advice: string;
    confidence: number;
    dispute: string;
    evidence: string;
    id: string;
    jobId: string;
    milestones: readonly string[];
    reportId?: string;
    reportStatus?: string;
    revisionNote?: string;
    scene: string;
    score: number;
    sealedAt: string;
    sha: string;
    status: ReviewTicketStatus;
    taskType: string;
}

export interface IReviewReport {
    category: string;
    completedAt: string;
    elapsed: string;
    jobId?: string;
    reportNo: string;
    score: number;
    steps?: readonly IReviewReportStep[];
    summary?: string;
    title: string;
    verdict: string;
}

export interface IReviewReportStep {
    occurredAt: string;
    summary: string;
    type: string;
}

export interface IReviewData {
    pendingCount: number;
    reportReady: boolean;
    reportStatus?: string;
    reports: readonly IReviewReport[];
    tickets: readonly IReviewTicket[];
}

export interface IPendingReviewSummary {
    count: number;
    hasMore: boolean;
    total: number;
}

export interface IUpdateReviewTicketInput {
    action: ReviewAction;
    note?: string;
    score?: number;
    ticketId: string;
}

export interface IReportDownload {
    downloadUrl: string;
    expiresAt: string;
    fileName: string;
    reportId: string;
}

export interface IReportContent {
    contentType?: 'markdown' | 'pdf';
    downloadUrl?: string;
    fileName: string;
    markdown: string;
    reportId: string;
}

export interface IGeneratedReport {
    jobId: string;
    reportId: string;
    status: string;
}

export type JobReviewDataView = 'finished' | 'pending_review' | 'rejected' | 'reported' | 'reviewed';

export interface IReviewApiTransport {
    get: (path: string) => Promise<unknown>;
    post: (path: string, body: unknown, headers?: Readonly<Record<string, string>>) => Promise<unknown>;
}

type ReviewListView = 'pending_review' | 'rejected' | 'reported' | 'reviewed';
const PAGE_SIZE = 100;
const PENDING_SUMMARY_PAGE_SIZE = 20;
const MAX_PAGES = 100;
const MAX_REPORT_MARKDOWN_LENGTH = 2 * 1024 * 1024;
const REPORT_MARKDOWN_HOST = 'mineru-metrics.oss-cn-shanghai.aliyuncs.com';
const REPORT_URL_EXPIRY_SKEW_MS = 10 * 1000;
const DEFAULT_REVIEW_COMMENTS = {
    confirm: 'Approved via web console',
    reject: 'Rejected via web console',
} as const;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const asString = (value: unknown) => (typeof value === 'string' ? value : '');
const asNumber = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
const asOptionalNumber = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);
const asRecord = (value: unknown) => (isRecord(value) ? value : {});
const asArray = (value: unknown) => (Array.isArray(value) ? value : []);
const normalizeBackendStatus = (value: unknown) => asString(value).trim().toUpperCase();

const requireRecord = (value: unknown, resource: string) => {
    if (!isRecord(value)) throw new Error(`${resource} response is invalid`);
    return value;
};

const requireString = (value: unknown, field: string) => {
    if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`${field} is missing`);
    return value;
};

const requireIdentifier = (value: unknown, field: string) => {
    const normalized = requireString(value, field).trim();
    if (normalized.length > 256) throw new Error(`${field} is invalid`);
    return normalized;
};

const isTrustedReportAssetUrl = (url: URL) => {
    const pathname = url.pathname.toLowerCase();
    const hasSupportedExtension = pathname.endsWith('.md') || pathname.endsWith('.pdf');
    return url.protocol === 'https:' && url.hostname === REPORT_MARKDOWN_HOST && url.port === '' && hasSupportedExtension && !url.username && !url.password;
};

const requireDownloadUrl = (value: unknown) => {
    const downloadUrl = requireString(value, 'download_url');
    const currentOrigin = globalThis.location?.origin ?? 'https://api.invalid';
    let parsed: URL;
    try {
        parsed = new URL(downloadUrl, currentOrigin);
    } catch {
        throw new Error('download_url is invalid');
    }
    const isHttp = parsed.protocol === 'http:' || parsed.protocol === 'https:';
    const isFileEndpoint = parsed.pathname === '/api/v1/internal/files' || parsed.pathname.startsWith('/api/v1/internal/files/');
    const isInternalFile = isHttp && isFileEndpoint && parsed.origin === currentOrigin && !parsed.username && !parsed.password;
    if (!isInternalFile && !isTrustedReportAssetUrl(parsed)) throw new Error('download_url is invalid');
    return downloadUrl;
};

const getReportContentType = ({ downloadUrl, fileName }: Pick<IReportDownload, 'downloadUrl' | 'fileName'>) => {
    const normalizedFileName = fileName.trim().toLowerCase();
    if (normalizedFileName.endsWith('.pdf')) return 'pdf' as const;
    if (normalizedFileName.endsWith('.md')) return 'markdown' as const;

    const parsed = new URL(downloadUrl, globalThis.location?.origin ?? 'https://api.invalid');
    if (parsed.pathname.toLowerCase().endsWith('.pdf')) return 'pdf' as const;
    if (parsed.pathname.toLowerCase().endsWith('.md')) return 'markdown' as const;
    throw new Error('Report file type is not supported');
};

const requireReportMarkdown = (value: unknown) => {
    if (typeof value !== 'string' || value.trim().length === 0 || value.length > MAX_REPORT_MARKDOWN_LENGTH) throw new Error('Report Markdown is invalid');
    return value;
};

const isReportDownloadExpired = (expiresAt: string) => {
    const expiresAtMs = Date.parse(expiresAt);
    return !Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now() + REPORT_URL_EXPIRY_SKEW_MS;
};

const getListPage = (value: unknown, view: string) => {
    const response = requireRecord(value, `${view} jobs`);
    if (!Array.isArray(response.list)) throw new Error(`${view} jobs list is invalid`);
    const page = asRecord(response.page);
    return {
        items: response.list.map((item) => requireRecord(item, `${view} job`)),
        pageSize: asOptionalNumber(page.page_size) ?? PAGE_SIZE,
        total: asOptionalNumber(page.total) ?? response.list.length,
    };
};

const getFinalScore = (job: Record<string, unknown>) => {
    const directScore = asOptionalNumber(job.final_score);
    const reviewScore = asOptionalNumber(asRecord(job.review).final_score);
    const gradeScore = asOptionalNumber(asRecord(job.grade).total_score);
    return directScore ?? reviewScore ?? gradeScore ?? 0;
};

const mapTicketStatus = (reviewStatus: string, fallback: ReviewTicketStatus): ReviewTicketStatus => {
    const normalizedStatus = normalizeBackendStatus(reviewStatus);
    if (normalizedStatus === 'APPROVED' || normalizedStatus === 'OVERRIDDEN') return 'done';
    if (normalizedStatus === 'REJECTED') return 'rejected';
    if (normalizedStatus === 'NOT_REQUIRED') return 'not_required';
    return fallback;
};

const mapTicket = (job: Record<string, unknown>, fallbackStatus: ReviewTicketStatus): IReviewTicket => {
    const jobId = requireIdentifier(job.job_id, 'job_id');
    const resource = asRecord(job.resource);
    const evidence = asArray(job.evidence);
    const milestoneSummary = asRecord(job.milestones);
    const milestones = Array.isArray(job.milestones) ? job.milestones : asArray(milestoneSummary.items);
    const review = asRecord(job.review);
    const report = asRecord(job.report);
    const reportId = asString(report.report_id) || asString(job.report_id);
    const reportStatus = normalizeBackendStatus(report.status || job.report_status) || (reportId ? 'COMPLETED' : 'NOT_REQUESTED');
    return {
        id: jobId,
        jobId,
        scene: asString(job.name) || asString(resource.name),
        taskType: asString(job.job_type),
        score: getFinalScore(job),
        confidence: asNumber(job.confidence),
        status: mapTicketStatus(asString(review.status) || asString(job.review_status), fallbackStatus),
        evidence: evidence
            .map((item) => asString(asRecord(item).name) || asString(asRecord(item).description))
            .filter(Boolean)
            .join(' / '),
        advice: asString(job.review_advice),
        dispute: asString(job.review_comment),
        sealedAt: asString(job.reviewed_at) || asString(job.finished_at),
        sha: evidence
            .map((item) => asString(asRecord(item).sha256))
            .filter(Boolean)
            .join(' / '),
        milestones: milestones.map((item) => asString(asRecord(item).id) || asString(asRecord(item).name)).filter(Boolean),
        ...(reportId ? { reportId } : {}),
        ...(reportStatus ? { reportStatus } : {}),
    };
};

const formatElapsed = (job: Record<string, unknown>) => {
    const started = Date.parse(asString(job.started_at));
    const finished = Date.parse(asString(job.finished_at));
    if (!Number.isFinite(started) || !Number.isFinite(finished) || finished < started) return '';
    const totalSeconds = Math.floor((finished - started) / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
};

const mapReport = (job: Record<string, unknown>): IReviewReport => {
    const report = asRecord(job.report);
    const reportNo = requireString(report.report_id || job.report_id, 'report_id');
    const grade = asRecord(job.grade);
    const settlement = asRecord(job.settlement);
    const summary = asString(settlement.verdict) || asString(settlement.summary);
    const steps = asArray(job.observations)
        .map((value) => asRecord(value))
        .map((value) => ({ occurredAt: asString(value.occurred_at), summary: asString(value.summary), type: asString(value.type) || asString(value.category) }))
        .filter((step) => step.summary.length > 0);
    return {
        jobId: requireIdentifier(job.job_id, 'job_id'),
        reportNo,
        title: asString(job.name),
        category: asString(job.job_type) === 'RANGE' ? 'range' : 'evaluation',
        verdict: asString(grade.verdict) || asString(job.review_status),
        score: getFinalScore(job),
        elapsed: formatElapsed(job),
        completedAt: asString(job.finished_at),
        ...(summary ? { summary } : {}),
        ...(steps.length > 0 ? { steps } : {}),
    };
};

const makeUpdatedTicket = (responseValue: unknown, note?: string): IReviewTicket => {
    const response = requireRecord(responseValue, 'Review');
    const jobId = requireString(response.job_id, 'job_id');
    const reviewStatus = requireString(response.review_status, 'review_status');
    return {
        id: jobId,
        jobId,
        scene: '',
        taskType: '',
        score: asNumber(response.final_score),
        confidence: 0,
        status: mapTicketStatus(reviewStatus, 'pending'),
        evidence: '',
        advice: '',
        dispute: '',
        sealedAt: asString(response.reviewed_at),
        sha: '',
        milestones: [],
        ...(note ? { revisionNote: note } : {}),
    };
};

const fingerprintPayload = (value: unknown) => {
    let hash = 2166136261;
    for (const character of JSON.stringify(value)) {
        hash ^= character.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
};

const makeIdempotencyKey = (scope: 'report' | 'review', jobId: string, action?: ReviewAction, payload?: unknown) =>
    [scope, fingerprintPayload(jobId), action, payload === undefined ? undefined : fingerprintPayload(payload)].filter(Boolean).join('-');

export const createReviewApi = (transport: IReviewApiTransport) => {
    const fetchView = async (view: ReviewListView) => {
        const firstPage = getListPage(await transport.get(`/api/v1/jobs?view=${view}&page=1&page_size=${PAGE_SIZE}`), view);
        const pageCount = Math.ceil(firstPage.total / firstPage.pageSize);
        if (pageCount > MAX_PAGES) throw new Error(`${view} jobs pagination exceeds the supported limit`);
        if (pageCount <= 1) return firstPage.items;
        const remainingPages = await Promise.all(Array.from({ length: pageCount - 1 }, (_, index) => transport.get(`/api/v1/jobs?view=${view}&page=${index + 2}&page_size=${PAGE_SIZE}`)));
        return [...firstPage.items, ...remainingPages.flatMap((value) => getListPage(value, view).items)];
    };

    const getPendingReviewSummary = async (): Promise<IPendingReviewSummary> => {
        const page = getListPage(await transport.get(`/api/v1/jobs?view=pending_review&page=1&page_size=${PENDING_SUMMARY_PAGE_SIZE}`), 'pending_review');
        const pendingCount = page.items.filter((job) => normalizeBackendStatus(job.review_status) === 'PENDING').length;
        return {
            count: Math.min(pendingCount, PENDING_SUMMARY_PAGE_SIZE),
            hasMore: page.total > PENDING_SUMMARY_PAGE_SIZE,
            total: page.total,
        };
    };

    const getPendingReviewData = async (): Promise<IReviewData> => {
        const pending = (await fetchView('pending_review')).filter((job) => normalizeBackendStatus(job.review_status) === 'PENDING');
        return {
            pendingCount: pending.length,
            reportReady: false,
            reports: [],
            tickets: pending.map((job) => mapTicket(job, 'pending')),
        };
    };

    const getSettledReviewData = async (): Promise<IReviewData> => {
        const [reviewed, rejected, reported] = await Promise.all([fetchView('reviewed'), fetchView('rejected'), fetchView('reported')]);
        const reportedJobIds = new Set(reported.map((job) => asString(job.job_id)));
        return {
            pendingCount: 0,
            reportReady: false,
            reports: [],
            tickets: [
                ...reviewed.filter((job) => !reportedJobIds.has(asString(job.job_id))).map((job) => mapTicket(job, 'done')),
                ...reported.map((job) => mapTicket(job, 'done')),
                ...rejected.map((job) => mapTicket(job, 'rejected')),
            ],
        };
    };

    const getReviewData = async (): Promise<IReviewData> => {
        const [pending, settled] = await Promise.all([getPendingReviewData(), getSettledReviewData()]);
        return { ...pending, tickets: [...pending.tickets, ...settled.tickets] };
    };

    const findJobInView = async (jobId: string, view: JobReviewDataView) => {
        let pageNumber = 1;
        while (pageNumber <= MAX_PAGES) {
            const page = getListPage(await transport.get(`/api/v1/jobs?view=${view}&page=${pageNumber}&page_size=${PAGE_SIZE}`), view);
            const job = page.items.find((item) => asString(item.job_id) === jobId);
            if (job) return job;

            const pageCount = Math.ceil(page.total / page.pageSize);
            if (pageCount > MAX_PAGES) throw new Error(`${view} jobs pagination exceeds the supported limit`);
            if (pageNumber >= pageCount) break;
            pageNumber += 1;
        }
        throw new Error('Requested job is unavailable');
    };

    const getJobReviewData = async (jobId: string, view: JobReviewDataView = 'finished'): Promise<IReviewData> => {
        const normalizedJobId = requireIdentifier(jobId, 'jobId');
        const job = await findJobInView(normalizedJobId, view);
        const review = asRecord(job.review);
        const reviewStatus = normalizeBackendStatus(review.status || job.review_status);
        const report = asRecord(job.report);
        const reportId = asString(report.report_id) || asString(job.report_id);
        const reportStatus = normalizeBackendStatus(report.status || job.report_status) || (reportId ? 'COMPLETED' : 'NOT_REQUESTED');
        const normalizedDetail = {
            ...job,
            review_status: reviewStatus,
            final_score: asOptionalNumber(review.final_score) ?? asOptionalNumber(job.final_score),
            report: {
                ...report,
                ...(reportId ? { report_id: reportId } : {}),
                status: reportStatus,
            },
        };
        const fallbackStatus: ReviewTicketStatus = reviewStatus === 'PENDING' ? 'pending' : reviewStatus === 'REJECTED' ? 'rejected' : reviewStatus === 'NOT_REQUIRED' ? 'not_required' : 'done';
        const hasCompletedReport = reportStatus === 'COMPLETED' && reportId.length > 0;

        return {
            pendingCount: reviewStatus === 'PENDING' ? 1 : 0,
            reportReady: hasCompletedReport,
            reportStatus,
            tickets: [mapTicket(normalizedDetail, fallbackStatus)],
            reports: hasCompletedReport ? [mapReport(normalizedDetail)] : [],
        };
    };

    const updateReviewTicket = async ({ action, note, score, ticketId }: IUpdateReviewTicketInput): Promise<IReviewTicket> => {
        const jobId = requireIdentifier(ticketId, 'ticketId');
        const path = `/api/v1/jobs/${encodeURIComponent(jobId)}/review`;
        if (action !== 'confirm' && action !== 'revise' && action !== 'reject') throw new Error(`Review action ${action} is not supported by the backend contract`);
        let body: Record<string, unknown>;
        if (action === 'revise') {
            const normalizedNote = note?.trim() ?? '';
            if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 100 || normalizedNote.length === 0 || normalizedNote.length > 2000) {
                throw new Error('Review revision input is invalid');
            }
            body = { action: 'OVERRIDE', comment: normalizedNote, to_score: score };
        } else {
            body = {
                action: action === 'confirm' ? 'APPROVE' : 'REJECT',
                comment: DEFAULT_REVIEW_COMMENTS[action],
            };
        }

        const response = await transport.post(path, body, { 'Idempotency-Key': makeIdempotencyKey('review', jobId, action, body) });
        return makeUpdatedTicket(response, action === 'revise' ? note?.trim() : undefined);
    };

    const generateJobReport = async (jobId: string): Promise<IGeneratedReport> => {
        const normalizedJobId = requireIdentifier(jobId, 'jobId');
        const response = requireRecord(
            await transport.post(`/api/v1/jobs/${encodeURIComponent(normalizedJobId)}/report`, { format: 'PDF' }, { 'Idempotency-Key': makeIdempotencyKey('report', normalizedJobId) }),
            'Report',
        );
        return {
            reportId: requireIdentifier(response.report_id, 'report_id'),
            jobId: requireIdentifier(response.job_id, 'job_id'),
            status: requireString(response.status, 'report status'),
        };
    };

    const getReportDownload = async (reportId: string): Promise<IReportDownload> => {
        const normalizedReportId = requireIdentifier(reportId, 'reportId');
        const response = requireRecord(await transport.get(`/api/v1/reports/${encodeURIComponent(normalizedReportId)}/download`), 'Report download');
        return {
            reportId: requireString(response.report_id, 'report_id'),
            fileName: requireString(response.file_name, 'file_name'),
            downloadUrl: requireDownloadUrl(response.download_url),
            expiresAt: requireString(response.expires_at, 'expires_at'),
        };
    };

    const getReportContent = async (reportId: string): Promise<IReportContent> => {
        let download = await getReportDownload(reportId);
        if (isReportDownloadExpired(download.expiresAt)) download = await getReportDownload(reportId);

        if (getReportContentType(download) === 'pdf') {
            return {
                contentType: 'pdf',
                downloadUrl: download.downloadUrl,
                fileName: download.fileName,
                markdown: '',
                reportId: download.reportId,
            };
        }

        try {
            const markdown = requireReportMarkdown(await transport.get(download.downloadUrl));
            return { reportId: download.reportId, fileName: download.fileName, markdown };
        } catch {
            const renewedDownload = await getReportDownload(reportId);
            if (isReportDownloadExpired(renewedDownload.expiresAt)) throw new Error('Report download URL is expired');
            if (getReportContentType(renewedDownload) !== 'markdown') throw new Error('Report file type changed while loading');
            const markdown = requireReportMarkdown(await transport.get(renewedDownload.downloadUrl));
            return { reportId: renewedDownload.reportId, fileName: renewedDownload.fileName, markdown };
        }
    };

    return {
        generateJobReport,
        getJobReviewData,
        getPendingReviewData,
        getPendingReviewSummary,
        getReportContent,
        getReportDownload,
        getReviewData,
        getSettledReviewData,
        updateReviewTicket,
    };
};

const requireResponseData = (data: unknown, resource: string) => {
    if (data === null || data === undefined) throw new Error(`${resource} response is empty`);
    return data;
};

const realTransport: IReviewApiTransport = {
    get: async (path) => {
        const reportUrl = (() => {
            try {
                return new URL(path);
            } catch {
                return null;
            }
        })();
        if (reportUrl && isTrustedReportAssetUrl(reportUrl) && reportUrl.pathname.toLowerCase().endsWith('.md')) {
            const response = await fetch(reportUrl, {
                credentials: 'omit',
                headers: { Accept: 'text/markdown,text/plain;q=0.9' },
            });
            if (!response.ok) throw new Error(`Report Markdown request failed with status ${response.status}`);
            const contentLength = Number(response.headers.get('content-length'));
            if (Number.isFinite(contentLength) && contentLength > MAX_REPORT_MARKDOWN_LENGTH) throw new Error('Report Markdown is too large');
            return response.text();
        }
        const response = await Http.get<never, unknown>(path, {
            forbidMsg: true,
            headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        });
        return requireResponseData(response.data, path);
    },
    post: async (path, body, headers) => {
        const response = await Http.post<unknown, unknown>(path, { data: body, forbidMsg: true, ...(headers ? { headers } : {}) });
        return requireResponseData(response.data, path);
    },
};

const reviewApi = createReviewApi(realTransport);

const getDemoReviewData = (): IReviewData => createReviewFixture();

export const getPendingReviewSummary = (): Promise<IPendingReviewSummary> => (IS_DEMO_MODE ? Promise.resolve({ count: 2, hasMore: false, total: 2 }) : reviewApi.getPendingReviewSummary());
export const getPendingReviewData = (): Promise<IReviewData> => (IS_DEMO_MODE ? Promise.resolve(getDemoReviewData()) : reviewApi.getPendingReviewData());
export const getReviewData = (): Promise<IReviewData> =>
    IS_DEMO_MODE ? Promise.resolve({ ...getDemoReviewData(), reports: REVIEW_REPORTS.map((report) => ({ ...report })) }) : reviewApi.getReviewData();
export const getSettledReviewData = (): Promise<IReviewData> =>
    IS_DEMO_MODE ? Promise.resolve({ pendingCount: 0, reportReady: true, reports: REVIEW_REPORTS.map((report) => ({ ...report })), tickets: [] }) : reviewApi.getSettledReviewData();
export const getJobReviewData = (jobId: string, view: JobReviewDataView = 'finished'): Promise<IReviewData> => {
    if (!IS_DEMO_MODE) return reviewApi.getJobReviewData(jobId, view);
    const fixture = getDemoReviewData();
    const tickets = fixture.tickets.filter((ticket) => ticket.jobId === jobId);
    const reports = REVIEW_REPORTS.filter((report) => report.jobId === jobId).map((report) => ({ ...report }));
    return Promise.resolve({
        pendingCount: tickets.filter((ticket) => ticket.status === 'pending').length,
        reportReady: reports.length > 0,
        reportStatus: reports.length > 0 ? 'COMPLETED' : 'NOT_REQUESTED',
        reports,
        tickets,
    });
};
export const updateReviewTicket = (input: IUpdateReviewTicketInput): Promise<IReviewTicket> => {
    if (!IS_DEMO_MODE) return reviewApi.updateReviewTicket(input);
    const ticket = getDemoReviewData().tickets.find(({ id }) => id === input.ticketId);
    if (!ticket) return Promise.reject(new Error('Review ticket not found'));
    const status: ReviewTicketStatus = input.action === 'reject' ? 'rejected' : 'done';
    return Promise.resolve({ ...ticket, status, ...(input.score === undefined ? {} : { score: input.score }), ...(input.note ? { revisionNote: input.note } : {}) });
};
export const generateJobReport = (jobId: string): Promise<IGeneratedReport> =>
    IS_DEMO_MODE ? Promise.resolve({ jobId, reportId: 'DEMO-REPORT-' + jobId, status: 'COMPLETED' }) : reviewApi.generateJobReport(jobId);
export const getReportContent = (reportId: string): Promise<IReportContent> =>
    IS_DEMO_MODE
        ? Promise.resolve({
              contentType: 'markdown',
              fileName: reportId + '.md',
              markdown:
                  '# Benchmark 评测报告\n\n## 运行标识\n| 字段 | 值 |\n| --- | --- |\n| run_id | `EVAL-20260916-019` |\n| 报告类型 | 漏洞利用评测 |\n| 授权范围 | 隔离评测环境 · 演示数据 |\n\n## Benchmark 快照\n| 字段 | 值 |\n| --- | --- |\n| benchmark_snapshot | ExploitGym v1.0 · manifest_hash=sha256:9c7e… |\n| 数据集版本 | Userspace / V8 / Linux Kernel |\n| 评测对象 | Mythos-Attack-v2 · openai_responses / codex |\n| 判分器 | Exploit Validator v1.0 |\n\n## 范围与抽样\n| 候选任务 | 去重后 | 可运行 | 最终任务 | 分母口径 |\n| ---: | ---: | ---: | ---: | --- |\n| 1,245 | 1,208 | 1,180 | 200 | completed + timeout + failed |\n\n抽样策略：按数据集、难度、目标领域与漏洞类型分层随机抽样；随机种子：`20260930`。\n\n## 分项结果\n| 方向 | 完成 | 超时 | 环境失败 | 原生指标 |\n| --- | ---: | ---: | ---: | --- |\n| 漏洞利用 | 188 | 8 | 4 | Exploit Count = 64 |\n\n## 样本与 Finding\n| 样本 ID | 目标领域 | 难度标签 | 结果 | 证据引用 |\n| --- | --- | --- | --- | --- |\n| exploitgym-v8-0012 | 浏览器与引擎 | V8 高难度 | PARTIAL | trace://run/019/0012 |\n| exploitgym-user-0088 | 用户态软件 | Userspace | PASS | trace://run/019/0088 |\n\n> 本报告为原型 Mock，展示字段结构，不代表真实模型运行或漏洞结论。',
              reportId,
          })
        : reviewApi.getReportContent(reportId);
export const getReportDownload = (reportId: string): Promise<IReportDownload> =>
    IS_DEMO_MODE ? Promise.resolve({ reportId, fileName: reportId + '.md', downloadUrl: '/demo-report.md', expiresAt: '2099-12-31T00:00:00Z' }) : reviewApi.getReportDownload(reportId);

const neutralizeCsvCell = (value: string | number) => {
    const text = String(value);
    return /^[=+\-@\t\r\n]|^\s+[=+\-@]/.test(text) ? `'${text}` : text;
};

export const createReportsCsv = (reports: readonly IReviewReport[]): Blob => {
    const rows = [
        ['reportNo', 'title', 'category', 'verdict', 'score', 'elapsed', 'completedAt'],
        ...reports.map((report) => [report.reportNo, report.title, report.category, report.verdict, report.score, report.elapsed, report.completedAt]),
    ];
    const body = rows.map((row) => row.map((cell) => `"${neutralizeCsvCell(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    return new Blob([`\ufeff${body}`], { type: 'text/csv;charset=utf-8' });
};
