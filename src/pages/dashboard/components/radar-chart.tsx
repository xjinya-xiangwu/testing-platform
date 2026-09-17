import style from '@/pages/dashboard/components/dashboard-charts.module.less';

interface RadarChartProps {
    baseline: readonly number[];
    current: readonly number[];
    labels: readonly string[];
}

const CENTER_X = 120;
const CENTER_Y = 86;
const RADIUS = 70;

const pointFor = (value: number, index: number, count: number) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
    const radius = (Math.max(0, Math.min(value, 100)) / 100) * RADIUS;
    return `${CENTER_X + Math.cos(angle) * radius},${CENTER_Y + Math.sin(angle) * radius}`;
};

const polygonFor = (values: readonly number[]) => values.map((value, index) => pointFor(value, index, values.length)).join(' ');

const RadarChart = ({ baseline, current, labels }: RadarChartProps) => {
    return (
        <svg viewBox="0 0 240 168" role="img" aria-label={labels.join(', ')}>
            {[25, 50, 75, 100].map((value) => (
                <polygon key={value} points={polygonFor(labels.map(() => value))} className={style.radarGrid} />
            ))}
            <polygon points={polygonFor(baseline)} className={style.radarBaseline} />
            <polygon points={polygonFor(current)} className={style.radarCurrent} />
        </svg>
    );
};

export default RadarChart;
