import { describe, expect, it, vi } from 'vitest';
import { createDemoJobApi } from '@/api/demo-job';
import { DEMO_JOB } from '@/config/cgi';
import { DEMO_JOB_ID } from '@/config/demo-job';

const DEMO_RESPONSE = {
    card: {
        job_id: DEMO_JOB_ID,
        display_no: 'JOB-20260827-001',
        name: '企业内网攻击模拟',
        subtitle: '与态势感知首页同步的攻击模拟任务',
        resource_name: 'SCN-01 · 企业内网',
        agent_id: 'Mythos-Attack-v2',
        status: 'RUNNING',
        topo_summary: '6 网区 · 23 节点',
        attack_chain: '外部攻击者 → React应用 → Dubbo服务 → GIS/运维双分支',
        run_mode_text: '自动循环攻击模拟',
        milestones: { total: 9, completed: 3, verified: 2 },
        progress: 33.3,
    },
    detail: { top_info: { name: '企业内网攻击模拟', status: 'RUNNING' } },
};

describe('demo job API facade', () => {
    it('requests the standalone demo endpoint and preserves its detail payload', async () => {
        const request = vi.fn(async () => DEMO_RESPONSE);

        const result = await createDemoJobApi({ request }).getDemoJob();

        expect(request).toHaveBeenCalledWith(DEMO_JOB);
        expect(result.card).toEqual({
            jobId: DEMO_JOB_ID,
            displayNo: 'JOB-20260827-001',
            name: '企业内网攻击模拟',
            subtitle: '与态势感知首页同步的攻击模拟任务',
            resourceName: 'SCN-01 · 企业内网',
            agentId: 'Mythos-Attack-v2',
            status: 'RUNNING',
            topologySummary: '6 网区 · 23 节点',
            attackChain: '外部攻击者 → React应用 → Dubbo服务 → GIS/运维双分支',
            runModeText: '自动循环攻击模拟',
            milestones: { total: 9, completed: 3, verified: 2 },
            progress: 33.3,
        });
        expect(result.detail).toBe(DEMO_RESPONSE.detail);
    });

    it('rejects an unexpected demo id so a malformed card is never rendered', async () => {
        const request = vi.fn(async () => ({ ...DEMO_RESPONSE, card: { ...DEMO_RESPONSE.card, job_id: 'job_other' } }));

        await expect(createDemoJobApi({ request }).getDemoJob()).rejects.toThrow('demo job id');
    });
});
