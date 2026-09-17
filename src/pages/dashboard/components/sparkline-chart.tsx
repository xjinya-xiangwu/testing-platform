import style from '@/pages/dashboard/components/dashboard-charts.module.less';

interface SparklineChartProps {
    values: readonly number[];
}

const SparklineChart = ({ values }: SparklineChartProps) => {
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = Math.max(max - min, 1);
    const points = values.map((value, index) => `${(index / Math.max(values.length - 1, 1)) * 200},${44 - ((value - min) / range) * 36}`).join(' ');

    return (
        <svg viewBox="0 0 200 48" role="img" aria-label={values.join(', ')}>
            <polyline points={points} className={style.sparkline} />
        </svg>
    );
};

export default SparklineChart;
