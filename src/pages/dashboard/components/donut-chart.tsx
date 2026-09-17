import style from '@/pages/dashboard/components/dashboard-charts.module.less';

interface DonutChartProps {
    ariaLabel: string;
    caption: string;
    completionPercent?: number;
    total: number | string;
}

const DonutChart = ({ ariaLabel, caption, completionPercent, total }: DonutChartProps) => {
    const circumference = 2 * Math.PI * 44;
    const safeCompletionPercent = Math.min(100, Math.max(0, completionPercent ?? 0));
    const completedLength = (safeCompletionPercent / 100) * circumference;

    return (
        <svg viewBox="0 0 100 100" role="img" aria-label={ariaLabel}>
            <circle className={style.donutTrack} cx="50" cy="50" r="44" />
            <circle className={style.donutProgress} cx="50" cy="50" r="44" strokeDasharray={`${completedLength} ${circumference - completedLength}`} />
            <text x="50" y="48" textAnchor="middle" className={style.donutTotal}>
                {total}
            </text>
            <text x="50" y="67" textAnchor="middle" className={style.donutCaption}>
                {caption}
            </text>
        </svg>
    );
};

export default DonutChart;
