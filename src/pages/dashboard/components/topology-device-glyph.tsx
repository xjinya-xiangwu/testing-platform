interface TopologyDeviceGlyphProps {
    nodeId: string;
}

const DATABASE_IDS = new Set(['redis', 'postgres', 'cassandra', 'influx', 'clickhouse', 'neo4j', 'cactidb']);
const MAIL_IDS = new Set(['postfix', 'dovecot']);
const MONITOR_IDS = new Set(['snmp', 'cacti']);
const NETWORK_IDS = new Set(['squid', 'iperf']);
const CODE_IDS = new Set(['gitea', 'gitdecoy']);

const TopologyDeviceGlyph = ({ nodeId }: TopologyDeviceGlyphProps) => {
    if (DATABASE_IDS.has(nodeId)) {
        return (
            <g>
                <ellipse cx="0" cy="-6" rx="11" ry="4" />
                <path d="M-11 -6 V7 C-11 12 11 12 11 7 V-6 M-11 0 C-11 5 11 5 11 0" />
            </g>
        );
    }

    if (MAIL_IDS.has(nodeId)) {
        return (
            <g>
                <rect x="-12" y="-9" width="24" height="18" rx="2" />
                <path d="M-11 -7 L0 1 L11 -7" />
            </g>
        );
    }

    if (MONITOR_IDS.has(nodeId)) {
        return (
            <g>
                <rect x="-12" y="-10" width="24" height="18" rx="2" />
                <path d="M-9 3 H-5 L-2 -5 L2 7 L5 -1 H9 M-3 12 H3 M0 8 V12" />
            </g>
        );
    }

    if (NETWORK_IDS.has(nodeId)) {
        return (
            <g>
                <circle cx="0" cy="0" r="12" />
                <path d="M-12 0 H12 M0 -12 C7 -5 7 5 0 12 M0 -12 C-7 -5 -7 5 0 12" />
            </g>
        );
    }

    if (CODE_IDS.has(nodeId)) {
        return (
            <g>
                <path d="M-10 -11 H4 L10 -5 V11 H-10 Z M4 -11 V-5 H10 M-5 1 H5 M-5 6 H2" />
            </g>
        );
    }

    if (nodeId === 'attacker') {
        return (
            <g>
                <circle cx="0" cy="-6" r="5" />
                <path d="M-9 11 C-7 2 -4 0 0 0 C4 0 7 2 9 11 M-11 -8 L-14 -11 M11 -8 L14 -11 M0 -13 V-17" />
            </g>
        );
    }

    return (
        <g>
            <rect x="-12" y="-10" width="24" height="18" rx="2" />
            <path d="M-8 -4 H8 M-8 1 H5 M-3 12 H3 M0 8 V12" />
        </g>
    );
};

export default TopologyDeviceGlyph;
