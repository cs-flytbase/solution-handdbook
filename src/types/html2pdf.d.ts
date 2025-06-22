declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | [number, number, number, number];
    filename?: string;
    image?: { type?: string; quality?: number };
    enableLinks?: boolean;
    html2canvas?: any;
    jsPDF?: any;
    pagebreak?: {
      mode?: string | string[];
      before?: string | string[];
      after?: string | string[];
      avoid?: string | string[];
    };
  }

  function html2pdf(): {
    from(element: HTMLElement | string): any;
    set(options: Html2PdfOptions): any;
    save(): Promise<void>;
  };

  export = html2pdf;
}
