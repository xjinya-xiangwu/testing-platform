interface DashboardTopologyDeviceGlyphProps {
    nodeId: string;
}

const DATABASE_IDS = new Set(['redis', 'postgres', 'cassandra', 'influx', 'clickhouse', 'neo4j', 'cactidb']);
const REGISTRY_IDS = new Set(['zookeeper', 'consul']);
const NETWORK_IDS = new Set(['squid', 'iperf']);
const CODE_IDS = new Set(['gitea', 'gitdecoy']);

const DashboardTopologyDeviceGlyph = ({ nodeId }: DashboardTopologyDeviceGlyphProps) => {
    if (nodeId === 'attacker') {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="7.2" r="3.1" />
                <path d="M6.2 18.8c.8-3.5 2.8-5.2 5.8-5.2s5 1.7 5.8 5.2" />
                <path d="M5 5.8 3.6 4.4M19 5.8l1.4-1.4M12 3.2V1.6" />
            </svg>
        );
    }

    if (DATABASE_IDS.has(nodeId)) {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <ellipse cx="12" cy="6" rx="7" ry="3" />
                <path d="M5 6v10c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
                <path d="M5 11c0 1.7 3.1 3 7 3s7-1.3 7-3" />
            </svg>
        );
    }

    if (nodeId === 'react') {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="4" y="5" width="16" height="12" rx="1.8" />
                <path d="M7 9h10M7 13h7M10 20h4M12 17v3" />
            </svg>
        );
    }

    if (CODE_IDS.has(nodeId)) {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6h8l4 4v8H6z" />
                <path d="M14 6v4h4M9 14h6M9 17h4" />
                <circle cx="8" cy="9" r="1" />
            </svg>
        );
    }

    if (nodeId === 'postfix' || nodeId === 'dovecot') {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="4" y="6" width="16" height="12" rx="1.7" />
                <path d={nodeId === 'dovecot' ? 'M5 8l7 5 7-5M8 16h8' : 'M5 8l7 5 7-5'} />
            </svg>
        );
    }

    if (nodeId === 'rabbitmq') {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="5" y="5" width="14" height="4" rx="1" />
                <rect x="5" y="10" width="14" height="4" rx="1" />
                <rect x="5" y="15" width="14" height="4" rx="1" />
                <path d="M8 7h4M8 12h4M8 17h4" />
            </svg>
        );
    }

    if (nodeId === 'dubbo') {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="4" y="7" width="6" height="6" rx="1.2" />
                <rect x="14" y="7" width="6" height="6" rx="1.2" />
                <rect x="9" y="15" width="6" height="5" rx="1.1" />
                <path d="M10 10h4M12 13v2" />
            </svg>
        );
    }

    if (REGISTRY_IDS.has(nodeId)) {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="7" cy="8" r="2.6" />
                <circle cx="17" cy="8" r="2.6" />
                <circle cx="12" cy="17" r="2.6" />
                <path d="M9.2 9.4h5.6M8.4 10.1l2.3 4.6M15.6 10.1l-2.3 4.6" />
            </svg>
        );
    }

    if (nodeId === 'snmp' || nodeId === 'cacti') {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="4" y="5" width="16" height="12" rx="1.7" />
                <path d="M7 13h2l1.4-4 2.4 7 1.6-4H17M10 20h4M12 17v3" />
            </svg>
        );
    }

    if (nodeId === 'syslog') {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="5" y="4" width="14" height="16" rx="1.5" />
                <path d="M8 8h8M8 12h8M8 16h5" />
            </svg>
        );
    }

    if (nodeId === 'geoserver') {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4.5 6.5 10 4l4 2 5.5-2.2v13.7L14 20l-4-2-5.5 2.2z" />
                <path d="M10 4v14M14 6v14" />
            </svg>
        );
    }

    if (NETWORK_IDS.has(nodeId)) {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="8.5" />
                <path d="M3.5 12h17M12 3.5c2.2 2.4 3.3 5.2 3.3 8.5s-1.1 6.1-3.3 8.5M12 3.5C9.8 5.9 8.7 8.7 8.7 12s1.1 6.1 3.3 8.5" />
            </svg>
        );
    }

    if (nodeId === 'cups') {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 8V4h10v4" />
                <rect x="5" y="9" width="14" height="8" rx="1.6" />
                <path d="M8 15h8v5H8zM8 12h.1M16 12h.1" />
            </svg>
        );
    }

    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="4" y="5" width="16" height="12" rx="1.8" />
            <path d="M7 9h10M7 13h7M10 20h4M12 17v3" />
        </svg>
    );
};

export default DashboardTopologyDeviceGlyph;
