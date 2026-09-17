import { describe, expect, it, vi } from 'vitest';
import { createReportsCsv, createReviewApi } from '@/api/review';

const makeJob = (overrides: Record<string, unknown> = {}) => ({
    job_id: 'job_pending',
    name: 'Range5 live run',
    job_type: 'RANGE',
    agent_id: 'codex',
    resource: { id: 'rng_range5', name: 'Range5' },
    status: 'SUCCEEDED',
    progress: 100,
    review_status: 'PENDING',
    created_at: '2026-08-18T09:31:00Z',
    finished_at: '2026-08-18T10:01:00Z',
    ...overrides,
});

const createTransport = (
    responses: Readonly<Record<string, unknown>>,
): {
    get: ReturnType<typeof vi.fn<(path: string) => Promise<unknown>>>;
    post: ReturnType<typeof vi.fn<(path: string, data: unknown, headers?: Record<string, string>) => Promise<unknown>>>;
} => ({
    get: vi.fn(async (path: string) => {
        if (!(path in responses)) throw new Error(`Unexpected GET ${path}`);
        return responses[path];
    }),
    post: vi.fn(async (...args: [string, unknown, Readonly<Record<string, string>>?]): Promise<unknown> => {
        void args;
        throw new Error('Unexpected POST');
    }),
});

const readBlob = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener('load', () => resolve(String(reader.result)));
        reader.addEventListener('error', () => reject(reader.error));
        reader.readAsText(blob);
    });

describe('review API facade', () => {
    it('loads one NOT_REQUIRED job result without fetching aggregate review views', async () => {
        const transport = createTransport({
            '/api/v1/jobs?view=finished&page=1&page_size=100': {
                list: [
                    makeJob({
                        job_id: 'job_not_required',
                        review_status: 'NOT_REQUIRED',
                        final_score: 91,
                        evidence: [{ name: 'Execution trace', sha256: 'sha-real-001' }],
                        milestones: {
                            total: 2,
                            completed: 2,
                            verified: 1,
                            items: [
                                { ordinal: 0, id: 'react-user-shell', service: 'react', status: 'VERIFIED' },
                                { ordinal: 1, id: 'react-root-shell', service: 'react', status: 'OBSERVED' },
                            ],
                        },
                    }),
                ],
                page: { page: 1, page_size: 100, total: 1 },
            },
        });

        const result = await createReviewApi(transport).getJobReviewData('job_not_required');

        expect(transport.get).toHaveBeenCalledTimes(1);
        expect(transport.get).toHaveBeenCalledWith('/api/v1/jobs?view=finished&page=1&page_size=100');
        expect(result).toMatchObject({ pendingCount: 0, reportReady: false });
        expect(result.tickets).toEqual([
            expect.objectContaining({
                jobId: 'job_not_required',
                score: 91,
                status: 'not_required',
                evidence: 'Execution trace',
                sha: 'sha-real-001',
                milestones: ['react-user-shell', 'react-root-shell'],
            }),
        ]);
    });

    it('loads one PENDING job as the only confirmable ticket', async () => {
        const transport = createTransport({
            '/api/v1/jobs?view=pending_review&page=1&page_size=100': {
                list: [makeJob({ job_id: 'job_pending_single', review_status: 'PENDING', final_score: 88 })],
                page: { page: 1, page_size: 100, total: 1 },
            },
        });

        const result = await createReviewApi(transport).getJobReviewData('job_pending_single', 'pending_review');

        expect(result.pendingCount).toBe(1);
        expect(result.tickets).toEqual([expect.objectContaining({ jobId: 'job_pending_single', status: 'pending' })]);
        expect(transport.get).toHaveBeenCalledWith('/api/v1/jobs?view=pending_review&page=1&page_size=100');
    });

    it('generates a report for only the selected NOT_REQUIRED job', async () => {
        const transport = createTransport({});
        transport.post.mockResolvedValueOnce({ report_id: 'rpt_single', job_id: 'job/single', status: 'GENERATING' });

        await expect(createReviewApi(transport).generateJobReport('job/single')).resolves.toEqual({
            reportId: 'rpt_single',
            jobId: 'job/single',
            status: 'GENERATING',
        });
        expect(transport.post).toHaveBeenCalledWith('/api/v1/jobs/job%2Fsingle/report', { format: 'PDF' }, { 'Idempotency-Key': expect.stringMatching(/^report-[0-9a-f]{8}$/) });
    });

    it('keeps backend job identifiers out of report idempotency headers', async () => {
        const unsafeJobId = 'job\r\nunsafe';
        const transport = createTransport({});
        transport.post.mockResolvedValueOnce({ report_id: 'rpt_safe', job_id: unsafeJobId, status: 'GENERATING' });

        await createReviewApi(transport).generateJobReport(unsafeJobId);

        expect(transport.post.mock.calls[0][0]).toBe('/api/v1/jobs/job%0D%0Aunsafe/report');
        expect(transport.post.mock.calls[0][2]?.['Idempotency-Key']).toMatch(/^[\x21-\x7e]+$/);
    });

    it('loads only the first 20 pending reviews for the task-page summary and caps the display count', async () => {
        const firstPage = Array.from({ length: 20 }, (_, index) => makeJob({ job_id: `job_pending_${index + 1}` }));
        const transport = createTransport({
            '/api/v1/jobs?view=pending_review&page=1&page_size=20': { list: firstPage, page: { page: 1, page_size: 20, total: 23 } },
        });

        const summary = await createReviewApi(transport).getPendingReviewSummary();

        expect(summary).toEqual({ count: 20, hasMore: true, total: 23 });
        expect(transport.get).toHaveBeenCalledTimes(1);
        expect(transport.get).toHaveBeenCalledWith('/api/v1/jobs?view=pending_review&page=1&page_size=20');
    });

    it('does not append a plus sign when the pending-review total is exactly 20', async () => {
        const transport = createTransport({
            '/api/v1/jobs?view=pending_review&page=1&page_size=20': {
                list: Array.from({ length: 20 }, (_, index) => makeJob({ job_id: `job_pending_${index + 1}` })),
                page: { page: 1, page_size: 20, total: 20 },
            },
        });

        await expect(createReviewApi(transport).getPendingReviewSummary()).resolves.toEqual({ count: 20, hasMore: false, total: 20 });
    });

    it('loads only real pending tickets when the confirmation dialog opens', async () => {
        const transport = createTransport({
            '/api/v1/jobs?view=pending_review&page=1&page_size=100': {
                list: [makeJob(), makeJob({ job_id: 'job_not_required', review_status: 'NOT_REQUIRED' })],
                page: { page: 1, page_size: 100, total: 2 },
            },
        });

        const data = await createReviewApi(transport).getPendingReviewData();

        expect(transport.get).toHaveBeenCalledTimes(1);
        expect(transport.get).toHaveBeenCalledWith('/api/v1/jobs?view=pending_review&page=1&page_size=100');
        expect(data.pendingCount).toBe(1);
        expect(data.tickets.map(({ id, status }) => ({ id, status }))).toEqual([{ id: 'job_pending', status: 'pending' }]);
        expect(data.reports).toEqual([]);
        expect(data.reportReady).toBe(false);
    });

    it('accepts the lowercase pending review status returned by the backend', async () => {
        const transport = createTransport({
            '/api/v1/jobs?view=pending_review&page=1&page_size=100': {
                list: [makeJob({ review_status: 'pending' })],
                page: { page: 1, page_size: 100, total: 1 },
            },
        });

        const data = await createReviewApi(transport).getPendingReviewData();

        expect(data.pendingCount).toBe(1);
        expect(data.tickets).toEqual([expect.objectContaining({ jobId: 'job_pending', status: 'pending' })]);
    });

    it('exposes the real asynchronous report status from the job list row', async () => {
        const transport = createTransport({
            '/api/v1/jobs?view=finished&page=1&page_size=100': {
                list: [makeJob({ job_id: 'job_report_generating', review_status: 'approved', report_id: 'rpt_generating', report_status: 'generating' })],
                page: { page: 1, page_size: 100, total: 1 },
            },
        });

        await expect(createReviewApi(transport).getJobReviewData('job_report_generating')).resolves.toMatchObject({
            reportReady: false,
            reportStatus: 'GENERATING',
            reports: [],
        });
    });

    it('opens a completed report from top-level list report fields', async () => {
        const transport = createTransport({
            '/api/v1/jobs?view=reported&page=1&page_size=100': {
                list: [
                    makeJob({
                        job_id: 'job_reported',
                        review_status: 'APPROVED',
                        final_score: 96.8,
                        report_id: 'rpt_completed',
                        report_status: 'COMPLETED',
                    }),
                ],
                page: { page: 1, page_size: 100, total: 1 },
            },
        });

        await expect(createReviewApi(transport).getJobReviewData('job_reported', 'reported')).resolves.toMatchObject({
            reportReady: true,
            reportStatus: 'COMPLETED',
            reports: [expect.objectContaining({ jobId: 'job_reported', reportNo: 'rpt_completed', score: 96.8 })],
        });
    });

    it('continues through list pages until it finds the requested job', async () => {
        const firstPage = Array.from({ length: 100 }, (_, index) => makeJob({ job_id: `job_other_${index + 1}` }));
        const transport = createTransport({
            '/api/v1/jobs?view=pending_review&page=1&page_size=100': { list: firstPage, page: { page: 1, page_size: 100, total: 101 } },
            '/api/v1/jobs?view=pending_review&page=2&page_size=100': {
                list: [makeJob({ job_id: 'job_requested', review_status: 'PENDING' })],
                page: { page: 2, page_size: 100, total: 101 },
            },
        });

        await expect(createReviewApi(transport).getJobReviewData('job_requested', 'pending_review')).resolves.toMatchObject({ pendingCount: 1 });
        expect(transport.get.mock.calls.map(([path]) => path)).toEqual(['/api/v1/jobs?view=pending_review&page=1&page_size=100', '/api/v1/jobs?view=pending_review&page=2&page_size=100']);
    });

    it('loads reviewed, rejected, and reported tasks as independent resolved tickets', async () => {
        const transport = createTransport({
            '/api/v1/jobs?view=reviewed&page=1&page_size=100': {
                list: [makeJob({ job_id: 'job_reviewed', review_status: 'APPROVED', final_score: 92, reviewed_at: '2026-08-18T11:10:00Z' })],
                page: {},
            },
            '/api/v1/jobs?view=rejected&page=1&page_size=100': {
                list: [makeJob({ job_id: 'job_rejected', review_status: 'REJECTED', final_score: 0 })],
                page: {},
            },
            '/api/v1/jobs?view=reported&page=1&page_size=100': {
                list: [makeJob({ job_id: 'job_reported', review_status: 'APPROVED', final_score: 96, report_id: 'rpt_completed', report_status: 'COMPLETED' })],
                page: {},
            },
        });

        const data = await createReviewApi(transport).getSettledReviewData();

        expect(transport.get.mock.calls.map(([path]) => path)).toEqual([
            '/api/v1/jobs?view=reviewed&page=1&page_size=100',
            '/api/v1/jobs?view=rejected&page=1&page_size=100',
            '/api/v1/jobs?view=reported&page=1&page_size=100',
        ]);
        expect(data.tickets).toEqual([
            expect.objectContaining({ id: 'job_reviewed', status: 'done' }),
            expect.objectContaining({ id: 'job_reported', status: 'done', reportId: 'rpt_completed', reportStatus: 'COMPLETED' }),
            expect.objectContaining({ id: 'job_rejected', status: 'rejected' }),
        ]);
        expect(data).toMatchObject({ pendingCount: 0, reportReady: false, reports: [] });
    });

    it('follows list pagination so the review gate cannot ignore later pending jobs', async () => {
        const firstPage = Array.from({ length: 100 }, (_, index) => makeJob({ job_id: `job_pending_${index + 1}` }));
        const transport = createTransport({
            '/api/v1/jobs?view=pending_review&page=1&page_size=100': { list: firstPage, page: { page: 1, page_size: 100, total: 101 } },
            '/api/v1/jobs?view=pending_review&page=2&page_size=100': { list: [makeJob({ job_id: 'job_pending_101' })], page: { page: 2, page_size: 100, total: 101 } },
        });

        const data = await createReviewApi(transport).getPendingReviewData();

        expect(data.pendingCount).toBe(101);
        expect(data.tickets.at(-1)?.id).toBe('job_pending_101');
        expect(transport.get).toHaveBeenCalledWith('/api/v1/jobs?view=pending_review&page=2&page_size=100');
    });

    it('maps confirm and reject to backend actions with their required default comments', async () => {
        const transport = createTransport({});
        transport.post
            .mockResolvedValueOnce({ job_id: 'job_approve', review_status: 'APPROVED', final_score: 94, reviewed_at: '2026-08-18T11:10:00Z' })
            .mockResolvedValueOnce({ job_id: 'job_reject', review_status: 'REJECTED', final_score: 0, reviewed_at: '2026-08-18T11:11:00Z' });
        const api = createReviewApi(transport);

        await expect(api.updateReviewTicket({ ticketId: 'job_approve', action: 'confirm' })).resolves.toMatchObject({ id: 'job_approve', status: 'done', score: 94 });
        await expect(api.updateReviewTicket({ ticketId: 'job_reject', action: 'reject' })).resolves.toMatchObject({ id: 'job_reject', status: 'rejected', score: 0 });

        expect(transport.post).toHaveBeenNthCalledWith(
            1,
            '/api/v1/jobs/job_approve/review',
            { action: 'APPROVE', comment: 'Approved via web console' },
            { 'Idempotency-Key': expect.stringMatching(/^review-[0-9a-f]{8}-confirm-[0-9a-f]{8}$/) },
        );
        expect(transport.post).toHaveBeenNthCalledWith(
            2,
            '/api/v1/jobs/job_reject/review',
            { action: 'REJECT', comment: 'Rejected via web console' },
            { 'Idempotency-Key': expect.stringMatching(/^review-[0-9a-f]{8}-reject-[0-9a-f]{8}$/) },
        );
    });

    it('maps a total-score revision to the backend OVERRIDE contract', async () => {
        const transport = createTransport({});
        transport.post.mockResolvedValueOnce({ job_id: 'job_override', review_status: 'OVERRIDDEN', final_score: 85, reviewed_at: '2026-08-18T11:10:00Z' });

        const result = await createReviewApi(transport).updateReviewTicket({
            ticketId: 'job_override',
            action: 'revise',
            score: 85,
            note: 'Evidence replay requires a total-score correction.',
        });

        expect(transport.get).not.toHaveBeenCalled();
        expect(transport.post).toHaveBeenCalledWith(
            '/api/v1/jobs/job_override/review',
            {
                action: 'OVERRIDE',
                comment: 'Evidence replay requires a total-score correction.',
                to_score: 85,
            },
            { 'Idempotency-Key': expect.stringMatching(/^review-[0-9a-f]{8}-revise-[0-9a-f]{8}$/) },
        );
        expect(result).toMatchObject({ id: 'job_override', status: 'done', score: 85, revisionNote: 'Evidence replay requires a total-score correction.' });
    });

    it('uses different idempotency keys for different review payloads', async () => {
        const transport = createTransport({});
        transport.post.mockResolvedValue({ job_id: 'job_override', review_status: 'OVERRIDDEN', final_score: 85, reviewed_at: '2026-08-18T11:10:00Z' });
        const api = createReviewApi(transport);

        await api.updateReviewTicket({ ticketId: 'job_override', action: 'revise', score: 85, note: 'First correction.' });
        await api.updateReviewTicket({ ticketId: 'job_override', action: 'revise', score: 84, note: 'Second correction.' });

        const firstHeaders = transport.post.mock.calls[0][2];
        const secondHeaders = transport.post.mock.calls[1][2];
        expect(firstHeaders?.['Idempotency-Key']).not.toBe(secondHeaders?.['Idempotency-Key']);
    });

    it('validates revisions and fails fast for unknown actions', async () => {
        const transport = createTransport({});
        const api = createReviewApi(transport);

        await expect(api.updateReviewTicket({ ticketId: 'job_1', action: 'revise', score: 101, note: ' ' })).rejects.toThrow('revision');
        await expect(api.updateReviewTicket({ ticketId: 'job_1', action: 'destroy' as never })).rejects.toThrow('not supported');
        expect(transport.get).not.toHaveBeenCalled();
        expect(transport.post).not.toHaveBeenCalled();
    });

    it('gets a backend-issued report download URL without constructing a file URL', async () => {
        const transport = createTransport({
            '/api/v1/reports/rpt_real%2F001/download': {
                report_id: 'rpt_real/001',
                file_name: 'rpt_real_001.pdf',
                download_url: '/api/v1/internal/files?key=opaque&token=signed',
                expires_at: '2026-09-18T11:40:00Z',
            },
        });

        await expect(createReviewApi(transport).getReportDownload('rpt_real/001')).resolves.toMatchObject({
            reportId: 'rpt_real/001',
            fileName: 'rpt_real_001.pdf',
            downloadUrl: '/api/v1/internal/files?key=opaque&token=signed',
        });
        expect(transport.get).toHaveBeenCalledWith('/api/v1/reports/rpt_real%2F001/download');
    });

    it('loads report Markdown from the backend-issued content link', async () => {
        const markdownUrl = 'https://mineru-metrics.oss-cn-shanghai.aliyuncs.com/cyberrangeapi-dev%2Fjobs%2Fjob_real%2Freports%2Frpt_real_001.md?Expires=1787649802&Signature=signed';
        const transport = createTransport({
            '/api/v1/reports/rpt_real%2F001/download': {
                report_id: 'rpt_real/001',
                file_name: 'rpt_real_001.md',
                download_url: markdownUrl,
                expires_at: '2026-09-18T11:40:00Z',
            },
            [markdownUrl]: '# 高阶结论\n\n端到端攻击链完成。',
        });

        await expect(createReviewApi(transport).getReportContent('rpt_real/001')).resolves.toEqual({
            reportId: 'rpt_real/001',
            fileName: 'rpt_real_001.md',
            markdown: '# 高阶结论\n\n端到端攻击链完成。',
        });
        expect(transport.get.mock.calls.map(([path]) => path)).toEqual(['/api/v1/reports/rpt_real%2F001/download', markdownUrl]);
    });

    it('rejects dangerous report download schemes', async () => {
        const transport = createTransport({
            '/api/v1/reports/rpt_bad/download': {
                report_id: 'rpt_bad',
                file_name: 'rpt_bad.pdf',
                download_url: 'javascript:alert(1)',
                expires_at: '2026-08-18T11:40:00Z',
            },
        });

        await expect(createReviewApi(transport).getReportDownload('rpt_bad')).rejects.toThrow('download_url');
    });

    it('rejects a report download URL on an untrusted origin', async () => {
        const transport = createTransport({
            '/api/v1/reports/rpt_external/download': {
                report_id: 'rpt_external',
                file_name: 'rpt_external.pdf',
                download_url: 'https://evil.example/api/v1/internal/files?token=stolen',
                expires_at: '2026-08-18T11:40:00Z',
            },
        });

        await expect(createReviewApi(transport).getReportDownload('rpt_external')).rejects.toThrow('download_url');
    });

    it('creates a UTF-8 CSV Blob and neutralizes spreadsheet formulas', async () => {
        const csv = createReportsCsv([
            {
                reportNo: '=2+3',
                title: '  +SUM(A1:A2)',
                category: '-range',
                verdict: '@lookup',
                score: 94.2,
                elapsed: '\t00:42:00',
                completedAt: '\r2026-08-19',
            },
        ]);

        expect(csv.type).toBe('text/csv;charset=utf-8');
        const text = await readBlob(csv);
        expect(text).toContain("'=2+3");
        expect(text).toContain("'  +SUM(A1:A2)");
        expect(text).toContain("'-range");
        expect(text).toContain("'@lookup");
    });
});
