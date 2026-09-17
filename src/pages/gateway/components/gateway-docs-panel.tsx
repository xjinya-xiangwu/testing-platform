import { useState } from 'react';
import { getGatewayDocs } from '@/pages/gateway/gateway-mock';
import style from '@/pages/gateway/gateway.module.less';

interface GatewayDocsPanelProps {
    translate: (key: string, values?: Readonly<Record<string, string | number>>) => string;
}

const GatewayDocsPanel = ({ translate }: GatewayDocsPanelProps) => {
    const [copyMessage, setCopyMessage] = useState('');
    const gatewayDocs = getGatewayDocs(window.location.origin);

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
