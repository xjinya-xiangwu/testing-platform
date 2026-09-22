import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Outlet, Route, Routes } from 'react-router-dom';
import DataCenter from '@/pages/data-center/data-center';
import { renderRangePage } from '@/test/render-range-page';

const renderDataCenter = (admin: boolean) =>
    renderRangePage(
        <Routes>
            <Route path="/" element={<Outlet context={{ ssoUid: admin ? 'admin' : 'vendor', status: admin ? 'ADMIN' : 'USER' }} />}>
                <Route path="data" element={<DataCenter />} />
            </Route>
        </Routes>,
        '/data',
    );

const ADMIN_TABS = ['总览', '题库目录', '标签中心', '抽样策略', '环境与判分', '导入导出'] as const;
const EXTERNAL_TABS = ['我的数据集', '可用题库', '我的抽样策略', '导出申请'] as const;

describe('DataCenter question bank', () => {
    it('renders the six admin tabs and the overview four-count board for administrators', async () => {
        renderDataCenter(true);

        expect(screen.getByRole('heading', { name: '数据中心' })).toBeInTheDocument();
        ADMIN_TABS.forEach((name) => expect(screen.getByRole('tab', { name })).toBeInTheDocument());
        expect(screen.queryByRole('tab', { name: '我的数据集' })).not.toBeInTheDocument();

        // The four-count board keeps counters separate (never one merged Docker count).
        expect(await screen.findByText('逻辑任务环境')).toBeInTheDocument();
        expect(screen.getByText('镜像状态引用')).toBeInTheDocument();
        expect(screen.getByText('唯一镜像 digest')).toBeInTheDocument();
        expect(screen.getByText('workspace')).toBeInTheDocument();
    });

    it('locks external users into their four tabs with no admin entries', async () => {
        const user = userEvent.setup();
        renderDataCenter(false);

        EXTERNAL_TABS.forEach((name) => expect(screen.getByRole('tab', { name })).toBeInTheDocument());
        ['总览', '标签中心', '环境与判分', '导入导出', '题库目录'].forEach((name) => {
            expect(screen.queryByRole('tab', { name })).not.toBeInTheDocument();
        });
        // External accounts never see the role preview toggle.
        expect(screen.queryByRole('group', { name: '预览视角' })).not.toBeInTheDocument();

        // Default landing tab is 可用题库 (discovery before upload), with the vendor's
        // own set visible and foreign drafts absent.
        expect(screen.getByRole('tab', { name: '可用题库' })).toHaveAttribute('aria-selected', 'true');
        expect(await screen.findByText('ExploitGym')).toBeInTheDocument();
        expect(screen.queryByText('内部题库草稿')).not.toBeInTheDocument();

        await user.click(screen.getByRole('tab', { name: '我的数据集' }));
        expect(await screen.findByText('自建 Web 漏洞利用集')).toBeInTheDocument();
        expect(screen.getByText('自建数据集不进入平台题库目录；其他项目与管理员题库管理页均不可见。')).toBeInTheDocument();

        await user.click(screen.getByRole('tab', { name: '我的抽样策略' }));
        expect((await screen.findAllByText('厂商 A · 利用均衡 · n=96')).length).toBeGreaterThan(0);
    });

    it('keeps drafts and management actions out of the external benchmark catalog', async () => {
        const user = userEvent.setup();
        renderDataCenter(false);

        await user.click(screen.getByRole('tab', { name: '可用题库' }));
        expect(await screen.findByText('ExploitGym')).toBeInTheDocument();
        expect(screen.queryByText('内部题库草稿')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '审核发布' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '下线版本' })).not.toBeInTheDocument();
    });

    it('keeps platform plans out of the external sampling view', async () => {
        const user = userEvent.setup();
        renderDataCenter(false);

        await user.click(screen.getByRole('tab', { name: '我的抽样策略' }));
        expect((await screen.findAllByText('厂商 A · 利用均衡 · n=96')).length).toBeGreaterThan(0);
        expect(screen.queryByText('发现方向 · CyberGym 摸底 · n=148')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: '新建策略' })).toBeInTheDocument();
    });

    it('shows export requests only (no import pipeline or approval powers) to external users', async () => {
        const user = userEvent.setup();
        renderDataCenter(false);

        await user.click(screen.getByRole('tab', { name: '导出申请' }));
        expect(await screen.findByText('ExploitGym v1.0 · 利用均衡 n=96 题单')).toBeInTheDocument();
        expect(screen.queryByRole('region', { name: '导入任务' })).not.toBeInTheDocument();
        expect(screen.queryByText('internal-draft-202609.tar.zst')).not.toBeInTheDocument();
        // The pending request belongs to the admin queue: external can neither approve nor reject.
        expect(screen.queryByRole('button', { name: '批准' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '驳回' })).not.toBeInTheDocument();
    });

    it('lets an admin preview the external journey through the role toggle', async () => {
        const user = userEvent.setup();
        renderDataCenter(true);

        await user.click(screen.getByRole('button', { name: '外部用户视角' }));
        EXTERNAL_TABS.forEach((name) => expect(screen.getByRole('tab', { name })).toBeInTheDocument());
        ADMIN_TABS.forEach((name) => expect(screen.queryByRole('tab', { name })).not.toBeInTheDocument());

        await user.click(screen.getByRole('button', { name: '管理员视角' }));
        ADMIN_TABS.forEach((name) => expect(screen.getByRole('tab', { name })).toBeInTheDocument());
    });

    it('shows the sampling preview with dedup and runnable counters plus the frozen tuple (admin view)', async () => {
        const user = userEvent.setup();
        renderDataCenter(true);

        await user.click(screen.getByRole('tab', { name: '抽样策略' }));
        expect(await screen.findByText('候选')).toBeInTheDocument();
        expect(screen.getByText('去重后')).toBeInTheDocument();
        expect(screen.getByText('可运行')).toBeInTheDocument();
        expect(screen.getByText('不可运行')).toBeInTheDocument();
        expect(screen.getAllByText('seed').length).toBeGreaterThan(0);
        expect(screen.getByRole('button', { name: '冻结题单（写入任务快照）' })).toBeEnabled();
        expect(screen.getByRole('button', { name: '重放校验' })).toBeEnabled();

        // Frozen lists bridge to the range task wizard (downstream hand-off).
        expect(await screen.findByText('冻结记录（供靶场中心任务向导引用）')).toBeInTheDocument();
        expect(screen.getAllByText('利用方向 · 数据集均衡 · n=96').length).toBeGreaterThan(1);
        expect(screen.getByRole('link', { name: '去靶场中心创建评测 →' })).toHaveAttribute('href', '/tasks?type=code');
    });

    it('exposes the labeling workbench with the domain gate for the unlabeled draft (admin view)', async () => {
        const user = userEvent.setup();
        renderDataCenter(true);

        await user.click(screen.getByRole('tab', { name: '标签中心' }));
        expect(await screen.findByText('标注工作台')).toBeInTheDocument();
        expect(screen.getByText('L1 系统词表')).toBeInTheDocument();
        expect(screen.getAllByText('闸门关闭 · 按领域筛选禁用').length).toBeGreaterThan(0);

        // Switch the workbench target to the unlabeled draft: the suggest action enables.
        await user.click(screen.getByRole('button', { name: /内部题库草稿/ }));
        expect(await screen.findByRole('button', { name: 'AI 预标注全部未标注' })).toBeEnabled();
        expect(screen.getByRole('button', { name: '确认本页建议' })).toBeEnabled();
    });

    it('surfaces review-feedback label corrections with adopt/reject for admins only', async () => {
        const user = userEvent.setup();
        renderDataCenter(true);

        expect(await screen.findByText('待处理修正建议')).toBeInTheDocument();

        await user.click(screen.getByRole('tab', { name: '标签中心' }));
        expect(await screen.findByText('复核回流 · 修正建议')).toBeInTheDocument();
        expect(screen.getByText('exploitgym-300')).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: '采纳' }).length).toBe(2);
        expect(screen.getAllByRole('button', { name: '驳回' }).length).toBe(2);

        // L2 facet distributions render for the selected version.
        expect(screen.getByText('L2 治理标签 · facet 分布')).toBeInTheDocument();
    });
});
