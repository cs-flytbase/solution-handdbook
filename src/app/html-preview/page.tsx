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
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [showImageControls, setShowImageControls] = useState(false);
  const [imageControlsPosition, setImageControlsPosition] = useState({ top: 0, left: 0 });
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

  // Function to handle file upload
  const handleFileUpload = async (file: File) => {
    const isPdf = file.type === 'application/pdf';
    const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const isImage = /^image\//.test(file.type);
    
    if (!file || !(isImage || isPdf || isDocx)) {
      showToast('Please upload a valid image, PDF or DOCX file', 'error');
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
      
      // Handle different file types
      const isPdf = file.type === 'application/pdf';
      const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const isImage = /^image\//.test(file.type);
      
      let contentTag = '';
      
      if (isImage) {
        contentTag = `<img src="${dataUrl}" alt="${file.name}" style="max-width: 100%; height: auto;" />`;
      } else if (isPdf) {
        contentTag = `
          <div class="pdf-embed" style="width: 100%; margin: 20px 0;">
            <p style="font-weight: bold; margin-bottom: 5px;">${file.name}</p>
            <object data="${dataUrl}" type="application/pdf" width="100%" height="500px">
              <p>Your browser does not support PDF embedding. <a href="${dataUrl}" download="${file.name}">Click here to download</a></p>
            </object>
          </div>
        `;
      } else if (isDocx) {
        // For DOCX, we can only provide a download link as browsers can't render DOCX natively
        contentTag = `
          <div class="docx-link" style="padding: 15px; border: 1px solid #e0e0e0; border-radius: 5px; margin: 20px 0;">
            <p style="font-weight: bold; margin-bottom: 5px;">📄 ${file.name}</p>
            <p>DOCX file attached - <a href="${dataUrl}" download="${file.name}">Click here to download</a></p>
          </div>
        `;
      }
      
      if (editMode === 'direct' && iframeRef.current?.contentDocument) {
        const selection = iframeRef.current.contentDocument.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const contentElement = iframeRef.current.contentDocument.createElement('div');
          contentElement.innerHTML = contentTag;
          range.insertNode(contentElement.firstChild!);
          
          const updatedHtml = iframeRef.current.contentDocument.body.innerHTML;
          setHtmlCode(updatedHtml);
        }
      } else {
        setHtmlCode((prevHtml) => prevHtml + contentTag);
      }
      
      setImageUploadProgress(null);
      showToast('File uploaded successfully!', 'success');
    } catch (error) {
      console.error('Error uploading file:', error);
      showToast('Failed to upload file. Please try again.', 'error');
      setImageUploadProgress(null);
    }
  };
  
  // Preserve the editable state during direct editing mode
  const [isEditing, setIsEditing] = useState(false);
  const [lastScrollPosition, setLastScrollPosition] = useState(0);
  
  // Toggle between code and direct editing modes
  const toggleEditMode = () => {
    const newMode = editMode === 'code' ? 'direct' : 'code';
    setEditMode(newMode);
    
    if (newMode === 'direct' && iframeRef.current?.contentDocument) {
      // Store the scroll position
      if (iframeRef.current.contentWindow) {
        setLastScrollPosition(iframeRef.current.contentWindow.scrollY);
      }
      
      const doc = iframeRef.current.contentDocument;
      setIsEditing(true);
      
      // Make the body content editable without triggering a rerender
      setTimeout(() => {
        if (!doc || !doc.body) return;
        
        // Find the element that contains the actual content
        const contentElement = doc.querySelector('.document-content') || doc.body;
        
        // Make only the content area editable, not the whole document
        (contentElement as HTMLElement).contentEditable = 'true';
        
        // Setup image selection and controls when in direct edit mode
        setupImageControls(doc);
        
        // Define a function to update the HTML when content changes
        const syncContent = () => {
          if (!contentElement || !doc.body) return;
          
          // Store current scroll position before updating state
          const scrollY = doc.defaultView?.scrollY || 0;
          setLastScrollPosition(scrollY);
          
          // Get inner content from the editable area
          const editedContent = contentElement.innerHTML;
          
          // We'll modify the htmlCode state by only replacing the content portion
          // Extract only the body content section from the HTML code
          const bodyMatch = htmlCode.includes('<body') 
            ? htmlCode.match(/<body[^>]*>([\s\S]*?)<\/body>/i) 
            : null;
          
          // Check if we're in .document-content or directly in body
          const isInDocContent = doc.querySelector('.document-content') === contentElement;
          
          if (bodyMatch && bodyMatch[1]) {
            if (isInDocContent) {
              // If editing .document-content, we need to handle the special a4-page wrapper
              const docContentRegex = /<div class="document-content">(([\s\S]*?))<\/div>/i;
              const contentMatch = bodyMatch[1].match(docContentRegex);
              
              if (contentMatch && contentMatch[1]) {
                // Replace just the document-content part
                const newBodyContent = bodyMatch[1].replace(
                  contentMatch[1],
                  editedContent
                );
                setHtmlCode(htmlCode.replace(bodyMatch[1], newBodyContent));
              } else {
                // Replace just the inner content between body tags
                const updatedHtml = htmlCode.replace(
                  bodyMatch[1],
                  editedContent
                );
                setHtmlCode(updatedHtml);
              }
            } else {
              // Replace just the inner content between body tags
              const updatedHtml = htmlCode.replace(
                bodyMatch[1],
                editedContent
              );
              setHtmlCode(updatedHtml);
            }
          } else {
            // If no body tags found, just use the edited content
            setHtmlCode(editedContent);
          }
        };
        
        // Clean up old listener first
        contentElement.removeEventListener('input', syncContent);
        // Add listener for edits
        contentElement.addEventListener('input', syncContent);
      }, 100);
    } else if (iframeRef.current?.contentDocument) {
      // Switching back to code mode
      const doc = iframeRef.current.contentDocument;
      setIsEditing(false);
      
      // Find the element that contains the actual content
      const contentElement = doc.querySelector('.document-content') || doc.body;
      
      // Disable editing
      if (contentElement) {
        (contentElement as HTMLElement).contentEditable = 'false';
      }
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
      const isPdf = file.type === 'application/pdf';
      const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const isImage = file.type.startsWith('image/');
      
      if (isImage || isPdf || isDocx) {
        handleFileUpload(file);
      } else {
        showToast('Please drop an image, PDF, or DOCX file', 'error');
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

  // Function to export HTML preview to PDF using server-side Puppeteer approach
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
      
      // Get content from iframe for server-side generation
      if (!iframeRef.current?.contentDocument) {
        throw new Error('Cannot access iframe content');
      }
      
      const iframeDoc = iframeRef.current.contentDocument;
      
      // Get complete HTML with styles
      const styles = Array.from(iframeDoc.styleSheets)
        .map(sheet => {
          try {
            return Array.from(sheet.cssRules)
              .map(rule => rule.cssText)
              .join('\n');
          } catch (e) {
            return '';
          }
        })
        .join('\n');
      
      // Process images to use data URLs
      const clonedDoc = iframeDoc.cloneNode(true) as Document;
      const images = clonedDoc.querySelectorAll('img');
      
      // Convert images to data URLs for server-side access
      const imagePromises = Array.from(images).map(async (img) => {
        const originalSrc = img.getAttribute('src');
        if (originalSrc && (originalSrc.startsWith('http') || originalSrc.startsWith('//'))) {
          try {
            const isGitbookUrl = originalSrc.includes('gitbook') || originalSrc.includes('~gitbook');
            let proxyUrl = '';
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
              img.src = dataURL;
            }
          } catch (error) {
            console.error('Failed to load image:', error);
            // Keep original src as fallback
          }
        }
      });
      
      // Wait for all images to be processed
      await Promise.all(imagePromises);
      
      // Create complete HTML document
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              ${styles}
              body { margin: 0; padding: 20px; }
            </style>
          </head>
          <body>
            ${clonedDoc.body.innerHTML}
          </body>
        </html>
      `;
      
      // Send to server-side PDF generation
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ htmlContent }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      // Get PDF blob and show in popup
      const blob = await response.blob();
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
        showToast('PDF generated successfully with selectable text!', 'success');
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
    // Skip refresh if we're in direct edit mode to avoid losing focus and position
    if (isEditing) {
      // Still setup image controls when content changes during editing
      if (iframeRef.current?.contentDocument) {
        setupImageControls(iframeRef.current.contentDocument);
      }
      return;
    }
    
    if (iframeRef.current) {
      // Store current scroll position before updating
      const currentScrollY = iframeRef.current.contentWindow?.scrollY || 0;
      
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
        
        // Restore scroll position after content is loaded
        // Use a short timeout to ensure the content has rendered
        setTimeout(() => {
          if (iframeRef.current?.contentWindow && lastScrollPosition > 0) {
            iframeRef.current.contentWindow.scrollTo(0, lastScrollPosition);
            // Reset stored position only after it's been restored
            setLastScrollPosition(0);
          }
        }, 10);
      }
    }
  }, [htmlCode, isEditing, lastScrollPosition]);

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
      handleFileUpload(file);
    }
  };

  // Function to set up image selection and controls
  const setupImageControls = (doc: Document) => {
    // Function to handle image click for selection
    const handleImageClick = (e: Event) => {
      const img = e.target as HTMLImageElement;
      if (img.tagName === 'IMG') {
        e.preventDefault();
        e.stopPropagation();
        
        // Set the selected image
        setSelectedImage(img);
        
        // Position controls near the image
        const rect = img.getBoundingClientRect();
        const iframe = iframeRef.current;
        
        if (iframe) {
          const iframeRect = iframe.getBoundingClientRect();
          setImageControlsPosition({
            top: iframeRect.top + rect.top - 40, // Position above the image
            left: iframeRect.left + rect.left
          });
          
          setShowImageControls(true);
        }
      } else {
        // Click outside an image hides the controls
        setShowImageControls(false);
        setSelectedImage(null);
      }
    };
    
    // Add click event listeners to all images
    const images = doc.querySelectorAll('img');
    images.forEach(img => {
      img.removeEventListener('click', handleImageClick as EventListener);
      img.addEventListener('click', handleImageClick as EventListener);
      img.style.cursor = 'pointer'; // Show pointer cursor on images
    });
    
    // Add click event listener to the document to hide controls when clicking elsewhere
    doc.removeEventListener('click', (e) => {
      if ((e.target as HTMLElement).tagName !== 'IMG') {
        setShowImageControls(false);
        setSelectedImage(null);
      }
    });
    
    doc.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).tagName !== 'IMG') {
        setShowImageControls(false);
        setSelectedImage(null);
      }
    });
  };
  
  // Function to increase image size
  const increaseImageSize = () => {
    if (selectedImage) {
      const currentWidth = selectedImage.width || selectedImage.offsetWidth;
      const newWidth = Math.min(currentWidth * 1.1, 2000); // Increase by 10%, max 2000px
      
      // Update image width
      selectedImage.style.width = `${newWidth}px`;
      
      // Trigger content sync if in direct edit mode
      if (editMode === 'direct' && iframeRef.current?.contentDocument) {
        const event = new Event('input', { bubbles: true });
        const contentElement = iframeRef.current.contentDocument.querySelector('.document-content') || 
                              iframeRef.current.contentDocument.body;
        contentElement.dispatchEvent(event);
      }
    }
  };
  
  // Function to decrease image size
  const decreaseImageSize = () => {
    if (selectedImage) {
      const currentWidth = selectedImage.width || selectedImage.offsetWidth;
      const newWidth = Math.max(currentWidth * 0.9, 50); // Decrease by 10%, min 50px
      
      // Update image width
      selectedImage.style.width = `${newWidth}px`;
      
      // Trigger content sync if in direct edit mode
      if (editMode === 'direct' && iframeRef.current?.contentDocument) {
        const event = new Event('input', { bubbles: true });
        const contentElement = iframeRef.current.contentDocument.querySelector('.document-content') || 
                              iframeRef.current.contentDocument.body;
        contentElement.dispatchEvent(event);
      }
    }
  };
  
  // Function to reset image size
  const resetImageSize = () => {
    if (selectedImage) {
      // Remove explicit width/height to restore natural size
      selectedImage.style.width = '';
      selectedImage.style.height = '';
      
      // Trigger content sync if in direct edit mode
      if (editMode === 'direct' && iframeRef.current?.contentDocument) {
        const event = new Event('input', { bubbles: true });
        const contentElement = iframeRef.current.contentDocument.querySelector('.document-content') || 
                              iframeRef.current.contentDocument.body;
        contentElement.dispatchEvent(event);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Image resize controls - floating toolbar */}
      {showImageControls && selectedImage && (
        <div className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 flex gap-2" 
             style={{ top: `${imageControlsPosition.top}px`, left: `${imageControlsPosition.left}px` }}>
          <button
            onClick={decreaseImageSize}
            className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            title="Decrease image size"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          
          <button
            onClick={resetImageSize}
            className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            title="Reset to original size"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          
          <button
            onClick={increaseImageSize}
            className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            title="Increase image size"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
            </svg>
          </button>
        </div>
      )}
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
                  accept="image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileInputChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors cursor-pointer"
                >
                  Upload File
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