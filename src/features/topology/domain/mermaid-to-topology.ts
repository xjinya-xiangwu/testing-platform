import {
    ITopologyConverterInput,
    ITopologyDTO,
    ITopologyEntityReference,
    ITopologyInterface,
    ITopologyLink,
    ITopologyNetwork,
    ITopologyNode,
    TopologyEndpointType,
} from '@/features/topology/domain/topology';
import { parseTopologySupplement, validateTopology } from '@/features/topology/domain/validate-topology';

type MermaidClass = 'network' | 'attacker' | 'vuln' | 'clean' | 'info' | 'decoy';

interface IMermaidEntity {
    id: string;
    label: string;
}

interface IMermaidEdge {
    directed: boolean;
    sourceId: string;
    targetId: string;
}

const ENTITY_ID = '[A-Za-z0-9][A-Za-z0-9._:-]*';
const SQUARE_NODE_PATTERN = new RegExp(`^(${ENTITY_ID})\\["(.*)"\\];?$`);
const ROUND_NODE_PATTERN = new RegExp(`^(${ENTITY_ID})\\(\\("(.*)"\\)\\);?$`);
const EDGE_PATTERN = new RegExp(`^(${ENTITY_ID})\\s+(-->|---)\\s+(${ENTITY_ID});?$`);
const CLASS_PATTERN = new RegExp(`^class\\s+(${ENTITY_ID}(?:,${ENTITY_ID})*)\\s+(network|attacker|vuln|clean|info|decoy);?$`);

const decodeHtmlEntities = (value: string) => value.replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&amp;', '&');

const splitLabel = (value: string) =>
    decodeHtmlEntities(value)
        .split(/<br\s*\/?>/i)
        .map((line) => line.trim());

const cleanLabel = (value: string) => value.replace(/^(?:VULN|INFO):\s*/i, '').trim();

const completeCidrFromLabel = (value: string) => {
    const cidr = splitLabel(value)[1];
    return cidr && !cidr.includes('${') && /^\d{1,3}(?:\.\d{1,3}){3}\/\d{1,2}$/.test(cidr) ? cidr : undefined;
};

const parseMermaid = (mermaid: string) => {
    const entities = new Map<string, IMermaidEntity>();
    const edges: IMermaidEdge[] = [];
    const classes = new Map<string, MermaidClass>();
    const lines = mermaid
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (!/^flowchart\s+(?:LR|RL|TB|BT|TD)$/i.test(lines[0] ?? '')) throw new Error('Mermaid topology must start with a supported flowchart declaration');

    lines.slice(1).forEach((line) => {
        if (line.startsWith('classDef ')) return;
        const edgeMatch = line.match(EDGE_PATTERN);
        if (edgeMatch) {
            edges.push({ sourceId: edgeMatch[1], targetId: edgeMatch[3], directed: edgeMatch[2] === '-->' });
            return;
        }
        const classMatch = line.match(CLASS_PATTERN);
        if (classMatch) {
            classMatch[1].split(',').forEach((entityId) => {
                const nextClass = classMatch[2] as MermaidClass;
                const previousClass = classes.get(entityId);
                if (previousClass && previousClass !== nextClass) throw new Error(`Conflicting Mermaid classification for ${entityId}: ${previousClass} and ${nextClass}`);
                classes.set(entityId, nextClass);
            });
            return;
        }
        const entityMatch = line.match(SQUARE_NODE_PATTERN) ?? line.match(ROUND_NODE_PATTERN);
        if (entityMatch) {
            const id = entityMatch[1];
            if (entities.has(id)) throw new Error(`Mermaid contains duplicate entity id: ${id}`);
            entities.set(id, { id, label: entityMatch[2] });
            return;
        }
        throw new Error(`Unsupported Mermaid topology statement: ${line}`);
    });

    entities.forEach((_, entityId) => {
        if (!classes.has(entityId)) throw new Error(`Missing Mermaid classification for ${entityId}`);
    });
    classes.forEach((_, entityId) => {
        if (!entities.has(entityId)) throw new Error(`Mermaid classification references missing entity: ${entityId}`);
    });
    edges.forEach((edge) => {
        if (!entities.has(edge.sourceId)) throw new Error(`Mermaid link references missing source: ${edge.sourceId}`);
        if (!entities.has(edge.targetId)) throw new Error(`Mermaid link references missing target: ${edge.targetId}`);
    });

    return { entities, edges, classes };
};

const endpointType = (classification: MermaidClass): TopologyEndpointType => (classification === 'network' ? 'network' : 'node');

const ipv4Prefix = (cidr: string | undefined) => {
    const match = cidr?.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.0\/24$/);
    if (!match || match.slice(1).some((part) => Number(part) > 255)) return undefined;
    return `${match[1]}.${match[2]}.${match[3]}`;
};

const getNetworkAliases = (network: ITopologyNetwork) => {
    const camelCaseId = network.id.replace(/([a-z0-9])([A-Z])/g, '$1-$2');
    const networkLabel = network.label
        .replace(/_to_/gi, '-')
        .replace(/_(?:network|net)$/i, '')
        .replaceAll('_', '-');
    return new Set([network.id, network.id.replaceAll('_', '-'), camelCaseId, networkLabel].map((alias) => alias.toLowerCase()));
};

const isAddressAnnotation = (value: string) =>
    value
        .split('/')
        .map((segment) => segment.trim())
        .filter(Boolean)
        .every((segment) => /^[A-Za-z0-9_-]+\s+(?:\.\d{1,3}|\d{1,3}(?:\.\d{1,3}){3})$/.test(segment));

const addressFor = (entity: IMermaidEntity, network: ITopologyNetwork) => {
    const prefix = ipv4Prefix(network.cidr);
    if (!prefix) return undefined;
    const aliases = getNetworkAliases(network);
    const segments = splitLabel(entity.label)
        .slice(1)
        .flatMap((line) => line.split('/'))
        .map((segment) => segment.trim());
    for (const segment of segments) {
        const fullAddress = segment.match(/^([A-Za-z0-9_-]+)\s+(\d{1,3}(?:\.\d{1,3}){3})$/);
        if (fullAddress && aliases.has(fullAddress[1].toLowerCase())) return fullAddress[2];
        const suffix = segment.match(/^([A-Za-z0-9_-]+)\s+\.(\d{1,3})$/);
        if (suffix && aliases.has(suffix[1].toLowerCase()) && Number(suffix[2]) <= 255) return `${prefix}.${Number(suffix[2])}`;
    }
    return undefined;
};

const createLinkId = (sourceId: string, targetId: string, occurrences: Map<string, number>) => {
    const baseId = `${sourceId}-${targetId}`;
    const occurrence = (occurrences.get(baseId) ?? 0) + 1;
    occurrences.set(baseId, occurrence);
    return occurrence === 1 ? baseId : `${baseId}-${occurrence}`;
};

export const convertMermaidToTopology = ({ mermaid, supplement: supplementInput }: ITopologyConverterInput): ITopologyDTO => {
    const supplement = parseTopologySupplement(supplementInput);
    const parsed = parseMermaid(mermaid);
    const zoneIds = new Set(supplement.zones.map((zone) => zone.id));
    const zoneFor = (entityId: string) => {
        const zoneId = supplement.zoneByEntityId[entityId];
        if (!zoneId) throw new Error(`Missing business zone ownership for ${entityId}`);
        if (!zoneIds.has(zoneId)) throw new Error(`Unknown business zone ${zoneId} for ${entityId}`);
        return zoneId;
    };

    const networks = Array.from(parsed.entities.values())
        .filter((entity) => parsed.classes.get(entity.id) === 'network')
        .map<ITopologyNetwork>((entity) => {
            const label = splitLabel(entity.label)[0];
            const cidr = supplement.cidrByNetworkId?.[entity.id] ?? completeCidrFromLabel(entity.label);
            return { id: entity.id, label, zoneId: zoneFor(entity.id), ...(cidr ? { cidr } : {}) };
        });
    const networkById = new Map(networks.map((network) => [network.id, network]));
    const interfacesByNodeId = new Map<string, Map<string, ITopologyInterface>>();

    parsed.edges.forEach((edge) => {
        const sourceClass = parsed.classes.get(edge.sourceId);
        const targetClass = parsed.classes.get(edge.targetId);
        const networkId = sourceClass === 'network' ? edge.sourceId : targetClass === 'network' ? edge.targetId : undefined;
        const nodeId = sourceClass === 'network' ? edge.targetId : targetClass === 'network' ? edge.sourceId : undefined;
        if (!networkId || !nodeId || parsed.classes.get(nodeId) === 'network') return;
        const nodeInterfaces = interfacesByNodeId.get(nodeId) ?? new Map<string, ITopologyInterface>();
        if (!nodeInterfaces.has(networkId)) {
            const network = networkById.get(networkId);
            const entity = parsed.entities.get(nodeId);
            if (!network || !entity) throw new Error(`Unable to build interface ${nodeId}:${networkId}`);
            const address = addressFor(entity, network);
            const ports = supplement.portsByNodeId?.[nodeId]?.map((port) => ({ ...port }));
            nodeInterfaces.set(networkId, { networkId, ...(address ? { address } : {}), ...(ports ? { ports } : {}) });
            interfacesByNodeId.set(nodeId, nodeInterfaces);
        }
    });

    const nodes = Array.from(parsed.entities.values())
        .filter((entity) => parsed.classes.get(entity.id) !== 'network')
        .map<ITopologyNode>((entity) => {
            const classification = parsed.classes.get(entity.id);
            if (!classification) throw new Error(`Missing Mermaid classification for ${entity.id}`);
            const labelLines = splitLabel(entity.label);
            const kind = classification === 'attacker' ? 'external_actor' : 'service';
            const purpose = kind === 'service' ? (supplement.purposeByNodeId?.[entity.id] ?? (classification === 'decoy' ? 'decoy' : 'real')) : undefined;
            const technology = labelLines.slice(1).find((line) => !isAddressAnnotation(line));
            return {
                id: entity.id,
                label: cleanLabel(labelLines[0]),
                kind,
                zoneId: zoneFor(entity.id),
                interfaces: Array.from(interfacesByNodeId.get(entity.id)?.values() ?? []),
                ...(technology ? { technology } : {}),
                ...(purpose ? { purpose } : {}),
            };
        });

    const linkOccurrences = new Map<string, number>();
    const links = parsed.edges.map<ITopologyLink>((edge) => {
        const sourceClass = parsed.classes.get(edge.sourceId);
        const targetClass = parsed.classes.get(edge.targetId);
        if (!sourceClass || !targetClass) throw new Error(`Unable to classify link ${edge.sourceId}-${edge.targetId}`);
        const source: ITopologyEntityReference = { type: endpointType(sourceClass), id: edge.sourceId };
        const target: ITopologyEntityReference = { type: endpointType(targetClass), id: edge.targetId };
        return { id: createLinkId(edge.sourceId, edge.targetId, linkOccurrences), source, target, directed: edge.directed };
    });

    const topology: ITopologyDTO = {
        zones: supplement.zones.map((zone) => ({ ...zone })),
        networks,
        nodes,
        links,
        ...(supplement.attackPaths ? { attackPaths: supplement.attackPaths.map((path) => ({ ...path, nodeIds: [...path.nodeIds] })) } : {}),
    };
    validateTopology(topology);
    return topology;
};
