import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateJobReport, getPendingReviewData, getReportContent, getReportDownload, getSettledReviewData, updateReviewTicket } from '@/api/review';
import { exportReportElementAsPdf } from '@/pages/review/export-report-pdf';
import ReviewPanel from '@/pages/review/review-panel';
import { createReviewFixture, REVIEW_REPORTS } from '@/test/fixtures/review';
import { renderRangePage } from '@/test/render-range-page';
import type { IReviewData } from '@/api/review';

vi.mock('@/api/review', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/api/review')>();
    return { ...actual, generateJobReport: vi.fn(), getPendingReviewData: vi.fn(), getReportContent: vi.fn(), getReportDownload: vi.fn(), getSettledReviewData: vi.fn(), updateReviewTicket: vi.fn() };
});

vi.mock('@/pages/review/export-report-pdf', () => ({ exportReportElementAsPdf: vi.fn() }));

let reviewData: IReviewData;

describe('ReviewPanel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        reviewData = createReviewFixture();
        vi.mocked(getPendingReviewData).mockImplementation(async () => {
            const tickets = reviewData.tickets.filter((ticket) => ticket.status === 'pending');
            return structuredClone({ ...reviewData, pendingCount: tickets.length, reports: [], tickets });
        });
        vi.mocked(getSettledReviewData).mockImplementation(async () => {
            const tickets = reviewData.tickets.filter((ticket) => ticket.status !== 'pending');
            return structuredClone({ ...reviewData, pendingCount: 0, reports: [], tickets });
        });
        vi.mocked(updateReviewTicket).mockImplementation(async ({ action, note, score, ticketId }) => {
            const current = reviewData.tickets.find((ticket) => ticket.id === ticketId);
            if (!current) throw new Error('Review ticket not found');
            const updated = {
                ...current,
                score: action === 'revise' && typeof score === 'number' ? score : current.score,
                status: action === 'reject' ? ('rejected' as const) : ('done' as const),
                ...(note ? { revisionNote: note } : {}),
            };
            reviewData = {
                ...reviewData,
                tickets: reviewData.tickets.map((ticket) => (ticket.id === ticketId ? updated : ticket)),
                pendingCount: reviewData.tickets.filter((ticket) => ticket.id !== ticketId && ticket.status === 'pending').length,
            };
            return structuredClone(updated);
        });
        vi.mocked(generateJobReport).mockImplementation(async (jobId) => ({ jobId, reportId: `rpt-${jobId}`, status: 'COMPLETED' }));
        vi.mocked(getReportDownload).mockImplementation(async (reportId) => ({
            reportId,
            fileName: `${reportId}.pdf`,
            downloadUrl: `/api/v1/internal/files?report=${encodeURIComponent(reportId)}`,
            expiresAt: '2026-08-19T12:00:00Z',
        }));
        vi.mocked(getReportContent).mockImplementation(async (reportId) => ({
            contentType: 'markdown',
            reportId,
            fileName: `${reportId}.md`,
            markdown:
                '# 高阶结论\n\n应用服务器访问路径已确认\n\n## 执行步骤（摘要）\n\n- 关键路径与证据已归档。\n\n1. 固化证据\n\n> 报告由系统生成\n\n### 命令摘要\n\n```bash\necho archived\n```\n\n---',
        }));
        vi.mocked(exportReportElementAsPdf).mockResolvedValue(undefined);
    });

    it('TC-CONF-001 to TC-CONF-005 generates and opens a report for only the resolved task', async () => {
        renderRangePage(<ReviewPanel />);
        const user = userEvent.setup();
        const panel = await screen.findByRole('region', { name: '结果确认' });
        expect(within(panel).queryByRole('button', { name: '生成评测报告' })).not.toBeInTheDocument();

        await user.click(within(panel).getAllByRole('button', { name: '确认' })[0]);
        expect(await within(panel).findByRole('tab', { name: '已办结 1 项' })).toHaveAttribute('aria-selected', 'true');

        await user.click(within(panel).getByRole('button', { name: '生成评测报告' }));
        expect(generateJobReport).toHaveBeenCalledTimes(1);
        expect(generateJobReport).toHaveBeenCalledWith('JOB-20260806-021');

        await user.click(await within(panel).findByRole('button', { name: '查看报告' }));
        const reportDialog = await screen.findByRole('dialog', { name: '评测报告' });
        expect(getReportContent).toHaveBeenCalledWith('rpt-JOB-20260806-021');
        await user.click(within(reportDialog).getAllByRole('button', { name: '关闭' })[0]);

        await user.click(within(panel).getByRole('tab', { name: '待确认 1 项' }));
        await user.click(within(panel).getByRole('button', { name: '改判' }));
        const reviseDialog = await screen.findByRole('dialog', { name: '提交改判' });
        await user.clear(within(reviseDialog).getByLabelText('改判后分数'));
        await user.type(within(reviseDialog).getByLabelText('改判后分数'), '86');
        await user.type(within(reviseDialog).getByLabelText('改判说明'), '证据回放后调整判定');
        await user.click(within(reviseDialog).getByRole('button', { name: '确认提交改判' }));
        expect(await within(panel).findByRole('tab', { name: '已办结 2 项' })).toHaveAttribute('aria-selected', 'true');
    });

    it('loads resolved tickets only after the resolved tab is selected', async () => {
        reviewData = {
            ...reviewData,
            tickets: reviewData.tickets.map((ticket, index) => (index === 0 ? { ...ticket, status: 'done' as const } : ticket)),
            pendingCount: 1,
        };

        renderRangePage(<ReviewPanel />);
        const user = userEvent.setup();
        const panel = await screen.findByRole('region', { name: '结果确认' });

        expect(getPendingReviewData).toHaveBeenCalledTimes(1);
        expect(getSettledReviewData).not.toHaveBeenCalled();
        expect(within(panel).getByRole('tab', { name: '待确认 1 项' })).toHaveAttribute('aria-selected', 'true');

        await user.click(within(panel).getByRole('tab', { name: '已办结' }));

        expect(await within(panel).findByText('已办结 · 终审归档')).toBeInTheDocument();
        expect(getSettledReviewData).toHaveBeenCalledTimes(1);
        expect(within(panel).getByRole('tab', { name: '已办结 1 项' })).toHaveAttribute('aria-selected', 'true');
    });

    it('TC-CONF-003 and TC-CONF-006 expose the backend rejection terminal state and complete evidence details', async () => {
        renderRangePage(<ReviewPanel />);
        const user = userEvent.setup();
        const panel = await screen.findByRole('region', { name: '结果确认' });

        await user.click(within(panel).getAllByRole('button', { name: '详情' })[0]);
        const detail = await screen.findByRole('dialog', { name: '研判详情' });
        expect(within(detail).getByText('证据快照')).toBeInTheDocument();
        expect(within(detail).getByText(/Redis 横移、ClamAV 检测与 CMS 落点证据链已封存/)).toBeInTheDocument();
        expect(within(detail).getByText(/SHA256 已验签/)).toBeInTheDocument();
        expect(within(detail).getByText('争议焦点')).toBeInTheDocument();
        expect(within(detail).getByText(/轨迹回放/)).toBeInTheDocument();
        await user.click(within(detail).getByRole('button', { name: '关闭' }));

        await user.click(within(panel).getAllByRole('button', { name: '驳回' })[0]);
        await user.click(within(panel).getByRole('tab', { name: '已办结' }));
        expect(await within(panel).findByText('已驳回 · 重判中')).toBeInTheDocument();
        expect(within(panel).queryByRole('button', { name: '生成评测报告' })).not.toBeInTheDocument();
        expect(within(panel).queryByRole('button', { name: '评分器重判完成' })).not.toBeInTheDocument();
    });

    it('TC-CONF-007 opens an already generated task report in the shared report dialog', async () => {
        reviewData = {
            ...reviewData,
            tickets: reviewData.tickets.map((ticket, index) => ({
                ...ticket,
                status: 'done' as const,
                ...(index === 0 ? { reportId: REVIEW_REPORTS[0].reportNo, reportStatus: 'COMPLETED' } : {}),
            })),
            pendingCount: 0,
        };

        renderRangePage(<ReviewPanel />);
        const user = userEvent.setup();
        const panel = await screen.findByRole('region', { name: '结果确认' });
        await user.click(within(panel).getByRole('tab', { name: '已办结' }));
        await user.click(await within(panel).findByRole('button', { name: '查看报告' }));
        const reportDialog = await screen.findByRole('dialog', { name: '评测报告' });
        expect(within(reportDialog).getByText('高阶结论')).toBeInTheDocument();
        expect(within(reportDialog).getByText('执行步骤（摘要）')).toBeInTheDocument();
        expect(within(reportDialog).getByText('应用服务器访问路径已确认')).toBeInTheDocument();
        expect(getReportContent).toHaveBeenCalledWith(REVIEW_REPORTS[0].reportNo);
        expect(getReportDownload).not.toHaveBeenCalled();
        await user.click(within(reportDialog).getByRole('button', { name: '导出 PDF' }));
        await waitFor(() =>
            expect(exportReportElementAsPdf).toHaveBeenCalledWith({
                element: expect.any(HTMLElement),
                fileName: `${REVIEW_REPORTS[0].reportNo}.pdf`,
            }),
        );
        await user.click(within(reportDialog).getAllByRole('button', { name: '关闭' })[0]);
    });
});
