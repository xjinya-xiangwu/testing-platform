import { useEffect, useState } from 'react';
import style from '@/pages/gateway/gateway.module.less';
import type { IApiToken } from '@/api/api-tokens';

interface GatewayDocsPanelProps {
    tokens: readonly IApiToken[];
    translate: (key: string, values?: Readonly<Record<string, string | number>>) => string;
}

// Snippets reference the selected key by its visible prefix: the plaintext secret is
// only ever shown once at creation, so generated configs never embed it.
const getGatewayDocs = (origin: string, keyRef: string) => {
    const evalUrl = new URL('/api/v1/evals', origin).toString();
    const mcpUrl = new URL('/mcp', origin).toString();

    return [
        {
            id: 'rest',
            title: 'REST API',
            code: `curl -X POST ${evalUrl} \\\n  -H "Authorization: Bearer ${keyRef}" \\\n  -d '{"scene":"SCN-01","model":"claude-opus-4.7"}'`,
        },
        {
            id: 'mcp',
            title: 'MCP',
            code: `{
  "mcpServers": {
    "ai-range": {
      "url": "${mcpUrl}",
      "headers": { "Authorization": "Bearer ${keyRef}" }
    }
  }
}`,
        },
        {
            id: 'cli',
            title: 'CLI',
            code: `air login --key ${keyRef}
air eval create --scene SCN-01 --model glm-5.2
air report fetch JOB-20260804-07 --format pdf`,
        },
        {
            id: 'skill',
            title: 'Skill',
            code: `# SKILL.md
name: ai-range-eval
tools:
  - range.eval.create
  - range.judge.review`,
        },
    ] as const;
};

const GatewayDocsPanel = ({ tokens, translate }: GatewayDocsPanelProps) => {
    const [copyMessage, setCopyMessage] = useState('');
    const [selectedCredentialId, setSelectedCredentialId] = useState(tokens[0]?.credentialId ?? '');

    useEffect(() => {
        if (!selectedCredentialId && tokens[0]) setSelectedCredentialId(tokens[0].credentialId);
    }, [selectedCredentialId, tokens]);

    const selectedToken = tokens.find((token) => token.credentialId === selectedCredentialId) ?? null;
    const keyRef = selectedToken ? `${selectedToken.keyPrefix}…` : '$AIR_KEY';
    const gatewayDocs = getGatewayDocs(window.location.origin, keyRef);

    const copyCode = async (title: string, code: string) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopyMessage(translate('gateway.docs.copied', { name: title }));
        } catch {
            setCopyMessage(translate('gateway.docs.copyFailed'));
        }
    };

    return (
        <>
            <div className={style.filterBar}>
                <label>
                    <span>{translate('gateway.docs.keyPicker')}</span>
                    <select value={selectedCredentialId} onChange={(event) => setSelectedCredentialId(event.target.value)}>
                        {tokens.length === 0 ? <option value="">{translate('gateway.register.noKey')}</option> : null}
                        {tokens.map((token) => (
                            <option key={token.credentialId} value={token.credentialId}>
                                {token.name} · {token.keyPrefix}…
                            </option>
                        ))}
                    </select>
                </label>
                {selectedToken ? <p className={style.filterHint}>{translate('gateway.docs.keyHint', { prefix: selectedToken.keyPrefix, name: selectedToken.name })}</p> : null}
            </div>
            <div className={style.docsGrid}>
                {gatewayDocs.map((item) => (
                    <article key={item.id} className={style.docCard}>
                        <h2>{item.title}</h2>
                        <p>{translate(`gateway.docs.${item.id}.description`)}</p>
                        <pre>
                            <code>{item.code}</code>
                        </pre>
                        <button type="button" onClick={() => void copyCode(item.title, item.code)}>
                            {translate('gateway.docs.copy')}
                        </button>
                    </article>
                ))}
            </div>
            <p className={style.panelNote}>{translate('gateway.docs.note')}</p>
            <div className={style.toast} role="status" aria-live="polite">
                {copyMessage}
            </div>
        </>
    );
};

export default GatewayDocsPanel;
