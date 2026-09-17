import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getReportContent, type IReportContent } from '@/api/review';
import style from '@/pages/review/review-panel.module.less';

interface ReportMarkdownContentProps {
    onContentChange?: (content: IReportContent | null) => void;
    reportId: string;
    translate: (key: string) => string;
}

interface IContentState {
    report?: IReportContent;
    status: 'error' | 'loading' | 'ready';
}

const ReportMarkdownContent = ({ onContentChange, reportId, translate }: ReportMarkdownContentProps) => {
    const [requestVersion, setRequestVersion] = useState(0);
    const [content, setContent] = useState<IContentState>({ status: 'loading' });

    useEffect(() => {
        let isActive = true;
        setContent({ status: 'loading' });
        onContentChange?.(null);
        void getReportContent(reportId)
            .then((report) => {
                if (!isActive) return;
                setContent({ report, status: 'ready' });
                onContentChange?.(report);
            })
            .catch(() => {
                if (!isActive) return;
                setContent({ status: 'error' });
                onContentChange?.(null);
            });
        return () => {
            isActive = false;
        };
    }, [onContentChange, reportId, requestVersion]);

    if (content.status === 'loading') {
        return (
            <div className={style.reportContentFeedback} role="status">
                {translate('confirm.report.contentLoading')}
            </div>
        );
    }

    if (content.status === 'error') {
        return (
            <div className={style.reportContentFeedback} role="alert">
                <p>{translate('confirm.report.contentError')}</p>
                <button type="button" onClick={() => setRequestVersion((version) => version + 1)}>
                    {translate('common.retry')}
                </button>
            </div>
        );
    }

    if (content.report?.contentType === 'pdf' && content.report.downloadUrl) {
        return <iframe className={style.pdfPreview} src={content.report.downloadUrl} title={translate('confirm.report.pdfPreviewTitle')} referrerPolicy="no-referrer" />;
    }

    return (
        <article className={style.markdownContent}>
            <Markdown remarkPlugins={[remarkGfm]}>{content.report?.markdown ?? ''}</Markdown>
        </article>
    );
};

export default ReportMarkdownContent;
