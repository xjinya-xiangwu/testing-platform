import style from '@/pages/gateway/gateway.module.less';

interface GatewayApiPanelProps {
    translate: (key: string, values?: Readonly<Record<string, string | number>>) => string;
}

const GatewayApiPanel = ({ translate }: GatewayApiPanelProps) => (
    <article className={style.apiCard}>
        <h2>{translate('gateway.api.title')}</h2>
        <p>{translate('gateway.api.subtitle')}</p>
        <h3>{translate('gateway.api.flow.title')}</h3>
        <p>{translate('gateway.api.flow.description')}</p>
        <h3>{translate('gateway.api.params.title')}</h3>
        <div className={style.tableWrap}>
            <table aria-label={translate('gateway.api.params.title')}>
                <thead>
                    <tr>
                        <th>{translate('gateway.api.params.name')}</th>
                        <th>{translate('gateway.api.params.description')}</th>
                        <th>{translate('gateway.api.params.value')}</th>
                    </tr>
                </thead>
                <tbody>
                    {['modelName', 'baseUrl', 'apiKey', 'protocol', 'harness'].map((parameter) => (
                        <tr key={parameter}>
                            <td>
                                <code>{translate(`gateway.api.params.${parameter}.name`)}</code>
                            </td>
                            <td>{translate(`gateway.api.params.${parameter}.description`)}</td>
                            <td>{translate(`gateway.api.params.${parameter}.value`)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <h3>{translate('gateway.api.security.title')}</h3>
        <p>{translate('gateway.api.security.description')}</p>
    </article>
);

export default GatewayApiPanel;
