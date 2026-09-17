import { Link, useNavigate, useParams } from 'react-router-dom';
import useTranslate from '@/hooks/useTranslate';
import RangeTopology from '@/pages/range/components/range-topology';
import { useRangeEnvironmentDetail } from '@/pages/range/hooks/use-range';
import style from '@/pages/range/range.module.less';
import { useTaskDraftStore } from '@/stores/task-draft-store';

const RangeDetail = () => {
    const translate = useTranslate();
    const navigate = useNavigate();
    const { envId = '' } = useParams();
    const { data, error, isLoading, refetch } = useRangeEnvironmentDetail(envId);
    const openWizard = useTaskDraftStore((state) => state.openWizard);
    const selectTaskType = useTaskDraftStore((state) => state.selectTaskType);
    const setEnvironmentId = useTaskDraftStore((state) => state.setEnvironmentId);

    const useEnvironment = () => {
        if (!data || data.status !== 'available') return;
        openWizard();
        selectTaskType('range');
        setEnvironmentId(data.taskEnvironmentId);
        navigate('/tasks');
    };

    if (isLoading) return <div className={style.feedback}>{translate('common.loading')}</div>;
    if (error || !data) {
        return (
            <div className={style.feedback} role="alert">
                <span>{translate('common.error')}</span>
                <button type="button" onClick={() => refetch()}>
                    {translate('common.retry')}
                </button>
            </div>
        );
    }

    const isAvailable = data.status === 'available';
    const hasTopology = data.topology.nodes.length > 0 && data.topology.zones.length > 0;
    const parameters = [
        [translate('range.fields.sceneId'), data.id],
        [translate('range.fields.industry'), data.industry],
        [translate('range.fields.access'), translate(data.isReal ? 'range.badge.real' : 'range.badge.preset')],
        [translate('range.fields.networkScale'), data.networkScale],
        [translate('range.fields.agents'), data.agents.join(' / ')],
        [translate('range.fields.subnet'), data.subnet],
        [translate('range.fields.zoneCount'), String(data.topology.zones.length)],
        [translate('range.fields.nodeCount'), String(data.topology.nodes.length)],
        [translate('range.fields.vulnerabilitySurface'), data.vulnerabilitySurface],
    ] as const;

    return (
        <main className={style.rangePage}>
            <Link className={style.backLink} to="/range-hall">
                {translate('range.actions.backHall')}
            </Link>

            <header className={style.pageHeader}>
                <div>
                    <span>{data.id}</span>
                    <h1>{data.name}</h1>
                    <p>{data.description}</p>
                </div>
            </header>

            <section className={style.detailSection} aria-labelledby="range-topology-heading">
                <div className={style.sectionHeading}>
                    <h2 id="range-topology-heading">{translate('range.detail.topology')}</h2>
                    <span>
                        {hasTopology ? translate('range.detail.topologySummary', { zones: data.topology.zones.length, nodes: data.topology.nodes.length }) : translate('range.detail.staticNote')}
                    </span>
                </div>
                {isAvailable && hasTopology ? (
                    <RangeTopology environmentName={data.name} topology={data.topology} />
                ) : isAvailable ? (
                    <div className={style.pendingPanel}>
                        <h3>{translate('range.detail.topologyUnavailable')}</h3>
                        <p>{translate('range.detail.topologyUnavailableDescription')}</p>
                    </div>
                ) : (
                    <div className={style.pendingPanel}>
                        <h3>{translate('range.detail.pending')}</h3>
                        <p>{translate('range.detail.pendingDescription')}</p>
                    </div>
                )}
            </section>

            <section className={style.detailSection} aria-labelledby="range-parameters-heading">
                <div className={style.sectionHeading}>
                    <h2 id="range-parameters-heading">{translate('range.detail.parameters')}</h2>
                    <span>{translate('range.detail.staticNote')}</span>
                </div>
                <div className={style.tableScroller}>
                    <table className={style.parameterTable} aria-label={translate('range.detail.parameters')}>
                        <tbody>
                            {parameters.map(([label, value]) => (
                                <tr key={label}>
                                    <th scope="row">{label}</th>
                                    <td>{value}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <footer className={style.pageActions}>
                <button type="button" className={style.primaryButton} disabled={!isAvailable} onClick={useEnvironment}>
                    {translate('range.actions.useEnvironment')}
                </button>
            </footer>
        </main>
    );
};

export default RangeDetail;
