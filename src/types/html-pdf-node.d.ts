declare module 'html-pdf-node' {
  interface File {
    content?: string;
    url?: string;
  }

  interface Options {
    format?: string;
    width?: string | number;
    height?: string | number;
    margin?: {
      top?: string | number;
      right?: string | number;
      bottom?: string | number;
      left?: string | number;
    };
    args?: string[];
    preferCSSPageSize?: boolean;
    printBackground?: boolean;
    path?: string;
    displayHeaderFooter?: boolean;
    headerTemplate?: string;
    footerTemplate?: string;
    landscape?: boolean;
    pageRanges?: string;
    scale?: number;
  }

  // Main API functions
  export function generatePdf(file: File, options: Options): Promise<Buffer>;
  export function generatePdfs(files: File[], options: Options): Promise<Buffer[]>;
}
