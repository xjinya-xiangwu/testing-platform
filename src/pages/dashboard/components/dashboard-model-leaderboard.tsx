import { IDashboardModelLeaderboard } from '@/api/dashboard';
import style from '@/pages/dashboard/components/dashboard-panels.module.less';

interface DashboardModelLeaderboardProps {
    leaderboards: readonly IDashboardModelLeaderboard[];
    translate: (key: string) => string;
}

const DashboardModelLeaderboard = ({ leaderboards, translate }: DashboardModelLeaderboardProps) => {
    return (
        <div className={style.modelBoards}>
            {leaderboards.map((leaderboard) => (
                <article className={style.modelBoard} key={leaderboard.id}>
                    <header className={style.modelBoardHeader}>
                        <h3>{leaderboard.name}</h3>
                        <span>{translate(leaderboard.categoryKey)}</span>
                    </header>
                    <div className={style.modelBoardSummary}>
                        <strong>{translate(leaderboard.leadKey)}</strong>
                        <em>
                            {translate(leaderboard.metricKey)} <b>{leaderboard.metricValue}</b>
                        </em>
                    </div>
                    <p>{translate(leaderboard.descriptionKey)}</p>
                    <ol className={style.modelRankList}>
                        {leaderboard.entries.map((entry, index) => (
                            <li className={entry.isCurrent ? style.currentModel : entry.rank === '···' ? style.rankGap : undefined} key={`${entry.rank}-${entry.name}-${index}`}>
                                <span className={style.rankMarker}>{entry.rank}</span>
                                <b>{entry.nameKey ? translate(entry.nameKey) : entry.name}</b>
                                <strong>{entry.score}</strong>
                            </li>
                        ))}
                    </ol>
                </article>
            ))}
        </div>
    );
};

export default DashboardModelLeaderboard;
