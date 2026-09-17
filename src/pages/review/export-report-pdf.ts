interface ExportReportElementAsPdfInput {
    element: HTMLElement;
    fileName: string;
}

interface IGeneratedPdfDocument {
    internal: {
        getNumberOfPages: () => number;
        pageSize: { getHeight: () => number; getWidth: () => number };
    };
    rect: (x: number, y: number, width: number, height: number, style: 'F') => void;
    setFillColor: (red: number, green: number, blue: number) => void;
    setPage: (pageNumber: number) => void;
}

const fillLastPageBackground = (canvas: HTMLCanvasElement, pdf: IGeneratedPdfDocument) => {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pixelPageHeight = Math.floor(canvas.width * (pageHeight / pageWidth));
    const remainingPixels = canvas.height % pixelPageHeight;

    if (remainingPixels === 0) return;

    const contentHeight = (remainingPixels * pageWidth) / canvas.width;
    pdf.setPage(pdf.internal.getNumberOfPages());
    pdf.setFillColor(6, 16, 26);
    pdf.rect(0, Math.max(0, contentHeight - 0.2), pageWidth, pageHeight - contentHeight + 0.2, 'F');
};

export const exportReportElementAsPdf = async ({ element, fileName }: ExportReportElementAsPdfInput) => {
    const { default: html2pdf } = await import('html2pdf.js');
    element.classList.add('report-pdf-export');

    try {
        const worker = html2pdf()
            .set({
                filename: fileName,
                margin: 0,
                image: { quality: 0.96, type: 'jpeg' },
                html2canvas: {
                    backgroundColor: '#06101a',
                    logging: false,
                    scale: 2,
                    useCORS: true,
                },
                jsPDF: { format: 'a4', orientation: 'portrait', unit: 'mm' },
            })
            .from(element)
            .toPdf();

        const canvas = (await worker.get('canvas')) as HTMLCanvasElement;
        const pdf = (await worker.get('pdf')) as IGeneratedPdfDocument;
        fillLastPageBackground(canvas, pdf);
        await worker.save();
    } finally {
        element.classList.remove('report-pdf-export');
    }
};
