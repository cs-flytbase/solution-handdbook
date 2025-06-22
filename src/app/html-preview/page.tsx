"use client";

import React, { useState, useRef, useEffect } from 'react';
import pdfFonts from 'pdfmake/build/vfs_fonts';

// Define type for pdfmake
declare global {
  interface Window {
    pdfMake: any;
  }
}

// Define type for html2pdf module for TypeScript
type Html2PdfOptions = {
  margin?: number[];
  filename?: string;
  image?: { type: string; quality: number };
  html2canvas?: {
    scale?: number;
    useCORS?: boolean;
    letterRendering?: boolean;
    allowTaint?: boolean;
    [key: string]: any;
  };
  jsPDF?: {
    unit?: string;
    format?: [number, number] | string;
    orientation?: 'portrait' | 'landscape';
    compress?: boolean;
    hotfixes?: string[];
    margins?: { top: number; right: number; bottom: number; left: number };
    [key: string]: any;
  };
  pagebreak?: { mode?: string; avoid?: string[]; [key: string]: any };
  enableLinks?: boolean;
  outputPdf?: string;
  [key: string]: any;
};

type Html2PdfModule = {
  default: () => {
    from: (element: HTMLElement | string) => any;
    set: (options: Html2PdfOptions) => any;
    toPdf: () => any;
    save: () => Promise<void>;
    output: (type: string) => Promise<string>;
  };
};

export default function HtmlPreview() {
  const [htmlCode, setHtmlCode] = useState('');
  const [editMode, setEditMode] = useState('code'); // 'code' or 'direct'
  const [imageUploadProgress, setImageUploadProgress] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Toast notification function
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '6px';
    toast.style.zIndex = '9999';
    toast.style.color = 'white';
    toast.style.fontWeight = '500';
    toast.style.maxWidth = '400px';
    
    switch (type) {
      case 'success':
        toast.style.backgroundColor = '#10b981';
        break;
      case 'error':
        toast.style.backgroundColor = '#ef4444';
        break;
      case 'warning':
        toast.style.backgroundColor = '#f59e0b';
        break;
      default:
        toast.style.backgroundColor = '#3b82f6';
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 3000);
  };

  // Function to handle image upload
  const handleImageUpload = async (file: File) => {
    if (!file || !/^image\//.test(file.type)) {
      showToast('Please upload a valid image file', 'error');
      return;
    }
    
    try {
      setImageUploadProgress(0);
      
      const reader = new FileReader();
      
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.onprogress = (event) => {
          if (event.lengthComputable) {
            setImageUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        };
        reader.readAsDataURL(file);
      });
      
      const imgTag = `<img src="${dataUrl}" alt="${file.name}" style="max-width: 100%; height: auto;" />`;
      
      if (editMode === 'direct' && iframeRef.current?.contentDocument) {
        const selection = iframeRef.current.contentDocument.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const imgElement = iframeRef.current.contentDocument.createElement('div');
          imgElement.innerHTML = imgTag;
          range.insertNode(imgElement.firstChild!);
          
          const updatedHtml = iframeRef.current.contentDocument.body.innerHTML;
          setHtmlCode(updatedHtml);
        }
      } else {
        setHtmlCode((prevHtml) => prevHtml + imgTag);
      }
      
      setImageUploadProgress(null);
      showToast('Image uploaded successfully!', 'success');
    } catch (error) {
      console.error('Error uploading image:', error);
      showToast('Failed to upload image. Please try again.', 'error');
      setImageUploadProgress(null);
    }
  };
  
  // Toggle between code and direct editing modes
  const toggleEditMode = () => {
    const newMode = editMode === 'code' ? 'direct' : 'code';
    setEditMode(newMode);
    
    if (newMode === 'direct' && iframeRef.current?.contentDocument) {
      const doc = iframeRef.current.contentDocument;
      setTimeout(() => {
        doc.body.contentEditable = 'true';
        doc.designMode = 'on';
        
        const syncContent = () => {
          setHtmlCode(doc.body.innerHTML);
        };
        
        doc.body.addEventListener('input', syncContent);
      }, 100);
    } else if (iframeRef.current?.contentDocument) {
      const doc = iframeRef.current.contentDocument;
      doc.body.contentEditable = 'false';
      doc.designMode = 'off';
    }
  };
  
  // Handle drag and drop for images
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        handleImageUpload(file);
      } else {
        showToast('Please drop an image file', 'error');
      }
    }
  };

  // Export to TurboDocx function
  const exportTurboDocx = async () => {
    if (!htmlCode.trim()) {
      showToast('Please enter some HTML content before exporting', 'error');
      return;
    }
    
    try {
      let contentToSend = htmlCode;
      
      if (htmlCode.includes('<html') && htmlCode.includes('<body')) {
        const bodyMatch = htmlCode.match(/<body[^>]*>(([\s\S])*?)<\/body>/i);
        if (bodyMatch && bodyMatch[1]) {
          contentToSend = bodyMatch[1].trim();
        }
      }
      
      showToast('Generating DOCX...', 'info');
      
      const response = await fetch('/api/convert-turbo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: contentToSend })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error (${response.status}): ${errorText}`);
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TurboDocx-${Date.now()}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      
      showToast('DOCX generated successfully!', 'success');
    } catch (error) {
      console.error('Error exporting with TurboDocx:', error);
      showToast(`Failed to export as DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  // Function to prepare HTML content for export by extracting body content if needed
  const prepareContentForExport = (htmlContent: string): string => {
    let contentToSend = htmlContent;
    
    if (htmlContent.includes('<html') && htmlContent.includes('<body')) {
      const bodyMatch = htmlContent.match(/<body[^>]*>((.[\s\S]*?))<\/body>/i);
      if (bodyMatch && bodyMatch[1]) {
        contentToSend = bodyMatch[1].trim();
      }
    }
    
    return contentToSend;
  };

  // Function to export HTML preview to PDF using server-side conversion
  const exportToPdf = async () => {
    if (!htmlCode.trim()) {
      showToast('Please enter some HTML content before exporting', 'error');
      return;
    }
    
    if (isExporting) {
      showToast('PDF export already in progress', 'warning');
      return;
    }
    
    try {
      setIsExporting(true);
      showToast('Generating PDF...', 'info');
      
      // Initialize html2pdf.js for proper HTML rendering
      const html2pdf = (await import('html2pdf.js')).default;
      
      // Get content from iframe
      if (!iframeRef.current?.contentDocument) {
        throw new Error('Cannot access iframe content');
      }
      
      const iframeDoc = iframeRef.current.contentDocument;
      const element = iframeDoc.body;
      
      // Calculate dynamic height for single continuous page
      const contentHeight = element.scrollHeight;
      const width = 210; // A4 width in mm
      
      const options = {
        filename: `HTML-Preview-${Date.now()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          foreignObjectRendering: false,
          letterRendering: true,
          logging: true,
          imageTimeout: 45000,
          async onclone(clonedDoc: Document) {
            // Process images through proxy
            const images = clonedDoc.querySelectorAll('img');
            console.log(`Processing ${images.length} images for PDF`);
            
            const imagePromises = Array.from(images).map(async (img, index) => {
              const originalSrc = img.getAttribute('src');
              if (!originalSrc || originalSrc.startsWith('data:')) return;
              
              try {
                let proxyUrl = '';
                if (originalSrc.startsWith('http') || originalSrc.startsWith('//')) {
                  const isGitbookUrl = originalSrc.includes('gitbook') || originalSrc.includes('~gitbook');
                  if (isGitbookUrl) {
                    proxyUrl = `/api/image-proxy?url=${encodeURIComponent(encodeURIComponent(originalSrc))}&gitbook=true&t=${Date.now()}`;
                  } else {
                    proxyUrl = `/api/image-proxy?url=${encodeURIComponent(originalSrc)}&t=${Date.now()}`;
                  }
                  
                  const response = await fetch(proxyUrl);
                  if (response.ok) {
                    const blob = await response.blob();
                    const dataURL = await new Promise<string>((resolve) => {
                      const reader = new FileReader();
                      reader.onload = () => resolve(reader.result as string);
                      reader.readAsDataURL(blob);
                    });
                    img.setAttribute('src', dataURL);
                    img.setAttribute('crossorigin', 'anonymous');
                  }
                }
              } catch (error) {
                console.error(`Failed to load image ${index + 1}:`, error);
              }
            });
            
            await Promise.all(imagePromises);
          }
        },
        jsPDF: {
          unit: 'mm',
          format: [width, Math.ceil(contentHeight / 2.65)],
          orientation: 'portrait',
          compress: true,
          hotfixes: ['px_scaling'],
          putOnlyUsedFonts: true,
          margins: { top: 5, right: 5, bottom: 5, left: 5 },
          textColor: '#000000',
          outputPdf: 'dataurlstring'
        },
        pagebreak: { mode: 'avoid-all' },
        enableLinks: true,
      };
      
      const pdf = await html2pdf().set(options).from(element).toPdf().get('pdf');
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      
      // Open PDF in new window as popup
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head>
              <title>HTML Preview PDF</title>
            </head>
            <body style="margin:0;padding:0;">
              <embed width="100%" height="100%" src="${url}" type="application/pdf" />
            </body>
          </html>
        `);
        
        // Clean up URL after delay
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        showToast('PDF generated successfully!', 'success');
      } else {
        showToast('Please allow popups to view the PDF', 'info');
      }
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      showToast(`Failed to export as PDF: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };
  
  // Helper function to split content into multiple A4 pages if needed
  const splitHtmlIntoPages = (html: string): string => {
    if (!html) return '';
    
    if (html.includes('class="a4-page"') || html.includes('page-break')) {
      return html;
    }
    
    return `<div class="a4-page"><div class="document-content">${html}</div><div class="page-number">1</div></div>`;
  };

  // Update the iframe whenever the HTML code changes
  useEffect(() => {
    if (iframeRef.current) {
      const iframeDocument = iframeRef.current.contentDocument;
      if (iframeDocument) {
        const a4PageStyle = `
          body {
            background-color: #e0e0e0;
            margin: 0;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
            font-family: 'Arial', 'Helvetica', sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .a4-page {
            background-color: white;
            width: 210mm;
            min-height: 297mm;
            max-height: 297mm;
            padding: 25mm 35mm;
            margin: 0 auto;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            box-sizing: border-box;
            page-break-after: always;
            position: relative;
          }
          .document-content {
            max-width: 100%;
            margin: 0 auto;
          }
          .page-number {
            position: absolute;
            bottom: 10mm;
            right: 10mm;
            font-size: 10px;
            color: #888;
          }
          h1, h2, h3, h4, h5, h6 {
            margin-top: 1.5em;
            margin-bottom: 0.8em;
            line-height: 1.3;
          }
          h1 { font-size: 2em; }
          h2 { font-size: 1.75em; }
          h3 { font-size: 1.5em; }
          h4 { font-size: 1.25em; }
          h5 { font-size: 1.1em; }
          h6 { font-size: 1em; }
          
          p, ul, ol, dl, table {
            margin-top: 0;
            margin-bottom: 1.2em;
          }
          
          ul, ol {
            padding-left: 2em;
          }
          
          li {
            margin-bottom: 0.5em;
          }
          
          table {
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 2em;
          }
          
          th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
          }
          
          th {
            background-color: #f7f7f7;
          }
          
          pre, code {
            font-family: monospace;
            background-color: #f7f7f7;
            border-radius: 3px;
          }
          
          pre {
            padding: 12px;
            overflow-x: auto;
            margin-bottom: 1.5em;
          }
          
          code {
            padding: 2px 5px;
          }
          
          @media print {
            .a4-page {
              margin: 0;
              box-shadow: none;
              page-break-after: always;
            }
          }
          .page-break {
            page-break-after: always;
            break-after: page;
            height: 0;
            clear: both;
          }
          .page-keep {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        `;

        const processedHtml = splitHtmlIntoPages(htmlCode);

        const wrappedHtmlCode = `
          <!DOCTYPE html>
          <html>
            <head>
              <style>${a4PageStyle}</style>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body>
              ${processedHtml}
            </body>
          </html>
        `;

        iframeDocument.open();
        iframeDocument.write(wrappedHtmlCode);
        iframeDocument.close();
      }
    }
  }, [htmlCode]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setHtmlCode(e.target.value);
  };

  const handleClear = () => {
    setHtmlCode('');
  };

  const handleReset = () => {
    setHtmlCode('<html>\n<head>\n  <title>HTML Preview</title>\n  <style>\n    /* Your CSS here */\n  </style>\n</head>\n<body>\n  <!-- Your HTML here -->\n  <h1>Hello, World!</h1>\n  <p>This is a preview of your HTML code.</p>\n</body>\n</html>');
  };

  // File input handler
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            HTML Preview & Export
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Paste your HTML code, preview it in real-time, and export as PDF or DOCX.
            You can also upload images by dragging and dropping them into the preview area.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)]">
          {/* Preview Area - 70% width on the left */}
          <div className="lg:w-[70%] bg-white dark:bg-gray-800 rounded-xl shadow-lg flex flex-col h-full">
            <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white">Live Preview</h3>
              <div className="flex gap-2 flex-wrap">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors cursor-pointer"
                >
                  Upload Image
                </label>
                <button
                  onClick={exportTurboDocx}
                  className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  Export DOCX
                </button>
                <button
                  onClick={toggleEditMode}
                  className={`px-3 py-1 text-sm ${editMode === 'direct' 
                    ? 'bg-purple-600 hover:bg-purple-700' 
                    : 'bg-gray-600 hover:bg-gray-700'} text-white rounded-md transition-colors`}
                  title={editMode === 'direct' ? 'Switch to code editing' : 'Switch to direct editing'}
                >
                  {editMode === 'direct' ? 'Direct Edit On' : 'Direct Edit Off'}
                </button>
                <button
                  onClick={exportToPdf}
                  disabled={isExporting}
                  className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded transition-colors"
                >
                  {isExporting ? 'Generating...' : 'Export PDF'}
                </button>
              </div>
            </div>
            <div 
              className="flex-grow bg-gray-200 dark:bg-gray-700 p-1 overflow-auto relative"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <iframe
                ref={iframeRef}
                title="HTML Preview"
                className="w-full h-full border-0"
                sandbox="allow-same-origin allow-scripts"
                style={{ minHeight: '100%' }}
              />
              {editMode === 'direct' && (
                <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded text-sm">
                  Direct edit mode: Click inside preview to edit
                </div>
              )}
              {imageUploadProgress !== null && (
                <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded text-sm">
                  Uploading: {imageUploadProgress}%
                </div>
              )}
            </div>
          </div>

          {/* HTML Input Area - 30% width on the right */}
          <div className="lg:w-[30%] bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 flex flex-col h-full">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-gray-900 dark:text-white">HTML Code</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleClear}
                  className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={handleReset}
                  className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  Sample
                </button>
              </div>
            </div>
            <textarea
              value={htmlCode}
              onChange={handleChange}
              placeholder="Paste your HTML code here..."
              className="w-full flex-grow p-4 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 resize-none font-mono text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-400"
              spellCheck="false"
            />
          </div>
        </div>
      </main>
    </div>
  );
}