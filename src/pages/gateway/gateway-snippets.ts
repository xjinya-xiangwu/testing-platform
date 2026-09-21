import type { GatewayIntegrationMethod } from '@/features/gateway/domain/gateway-provider';

export interface IGatewaySnippet {
    code: string;
    descriptionKey: string;
    id: GatewayIntegrationMethod;
    title: string;
}

// The actual integration snippets, one per gateway integration method. `keyRef` is the
// visible key prefix reference — plaintext secrets are only ever shown once at creation.
export const getGatewaySnippets = (origin: string, keyRef: string): readonly IGatewaySnippet[] => {
    const evalUrl = new URL('/api/v1/evals', origin).toString();
    const mcpUrl = new URL('/mcp', origin).toString();

    return [
        {
            code: `curl -X POST ${evalUrl} \\\n  -H "Authorization: Bearer ${keyRef}" \\\n  -d '{"scene":"SCN-01","model":"claude-opus-4.7"}'`,
            descriptionKey: 'gateway.docs.rest_api.description',
            id: 'rest_api',
            title: 'REST API',
        },
        {
            code: `{\n  "mcpServers": {\n    "ai-range": {\n      "url": "${mcpUrl}",\n      "headers": { "Authorization": "Bearer ${keyRef}" }\n    }\n  }\n}`,
            descriptionKey: 'gateway.docs.mcp.description',
            id: 'mcp',
            title: 'MCP',
        },
        {
            code: `air login --key ${keyRef}\nair eval create --scene SCN-01 --model glm-5.2\nair report fetch JOB-20260804-07 --format pdf`,
            descriptionKey: 'gateway.docs.cli.description',
            id: 'cli',
            title: 'CLI',
        },
        {
            code: `# SKILL.md\nname: ai-range-eval\n\ntools:\n  - range.eval.create\n  - range.judge.review`,
            descriptionKey: 'gateway.docs.skill.description',
            id: 'skill',
            title: 'Skill',
        },
    ];
};

export const getGatewaySnippet = (origin: string, keyRef: string, method: GatewayIntegrationMethod): IGatewaySnippet =>
    getGatewaySnippets(origin, keyRef).find((snippet) => snippet.id === method) ?? getGatewaySnippets(origin, keyRef)[0];
