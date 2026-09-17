import { describe, expect, it } from 'vitest';
import { convertMermaidToTopology } from '@/features/topology/domain/mermaid-to-topology';
import { ITopologySupplement } from '@/features/topology/domain/topology';

const MINIMAL_SUPPLEMENT: ITopologySupplement = {
    zones: [
        { id: 'internet', label: 'Internet' },
        { id: 'access', label: 'Access' },
    ],
    zoneByEntityId: { attacker: 'internet', dmz: 'access', react: 'access' },
};

describe('convertMermaidToTopology', () => {
    it('preserves edge direction and derives interfaces only for node-network links', () => {
        const topology = convertMermaidToTopology({
            mermaid: `flowchart LR
              attacker(("External Attacker"))
              dmz["dmz_net<br/>172.110.1.0/24"]
              react["VULN: react<br/>dmz .18<br/>Next.js 15.5.6"]
              attacker --> dmz
              dmz --- react
              class attacker attacker
              class dmz network
              class react vuln`,
            supplement: MINIMAL_SUPPLEMENT,
        });

        expect(topology.links).toEqual([
            { id: 'attacker-dmz', source: { type: 'node', id: 'attacker' }, target: { type: 'network', id: 'dmz' }, directed: true },
            { id: 'dmz-react', source: { type: 'network', id: 'dmz' }, target: { type: 'node', id: 'react' }, directed: false },
        ]);
        expect(topology.nodes.find((node) => node.id === 'react')?.interfaces).toEqual([{ networkId: 'dmz', address: '172.110.1.18' }]);
    });

    it('supports camel-case network ids and multi-line interface annotations', () => {
        const topology = convertMermaidToTopology({
            mermaid: `flowchart LR
              dmzMq["dmz_to_mq_net<br/>172.140.2.0/24"]
              mqXinhu["mq_to_xinhu_net<br/>172.140.3.0/24"]
              activemq["VULN: activemq<br/>dmz-mq .2<br/>mq-xinhu .2<br/>ActiveMQ 5.17.3<br/>CVE-2023-46604 RCE"]
              dmzMq --- activemq
              activemq --- mqXinhu
              class dmzMq,mqXinhu network
              class activemq vuln`,
            supplement: {
                zones: [
                    { id: 'dmz-mq-zone', label: 'DMZ MQ' },
                    { id: 'xinhu-zone', label: 'Xinhu' },
                ],
                zoneByEntityId: { dmzMq: 'dmz-mq-zone', mqXinhu: 'xinhu-zone', activemq: 'dmz-mq-zone' },
            },
        });

        expect(topology.nodes[0]).toMatchObject({
            technology: 'ActiveMQ 5.17.3',
            interfaces: [
                { networkId: 'dmzMq', address: '172.140.2.2' },
                { networkId: 'mqXinhu', address: '172.140.3.2' },
            ],
        });
    });

    it.each([
        {
            name: 'conflicting classes',
            mermaid: `flowchart LR
              react["react"]
              class react vuln
              class react decoy`,
            message: 'react',
        },
        {
            name: 'unclassified entities',
            mermaid: `flowchart LR
              react["react"]`,
            message: 'classification',
        },
        {
            name: 'orphan links',
            mermaid: `flowchart LR
              react["react"]
              react --- missing
              class react vuln`,
            message: 'missing',
        },
    ])('fails fast for $name', ({ mermaid, message }) => {
        expect(() => convertMermaidToTopology({ mermaid, supplement: MINIMAL_SUPPLEMENT })).toThrow(message);
    });

    it('fails when business zone ownership is missing instead of guessing from layout', () => {
        const supplement: ITopologySupplement = {
            ...MINIMAL_SUPPLEMENT,
            zoneByEntityId: { attacker: 'internet', dmz: 'access' },
        };
        const mermaid = `flowchart LR
          attacker(("External Attacker"))
          dmz["dmz_net"]
          react["react"]
          dmz --- react
          class attacker attacker
          class dmz network
          class react vuln`;

        expect(() => convertMermaidToTopology({ mermaid, supplement })).toThrow('react');
    });
});
