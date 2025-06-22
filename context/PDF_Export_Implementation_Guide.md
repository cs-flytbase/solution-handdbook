# PDF Export Implementation Guide

## Overview
This guide documents the complete implementation of a PDF export feature that generates **selectable text PDFs** with **single continuous page format** from HTML content, including proper image handling and dynamic height calculation.

## Problem Solved
- ✅ **Selectable text in PDFs** (not images like html2canvas)
- ✅ **Single continuous page** that adapts to content length
- ✅ **Image proxy handling** for external images (especially Gitbook URLs)
- ✅ **Dynamic height calculation** to prevent content cutoff
- ✅ **Popup display** instead of forced downloads

## Architecture

### Client-Side (React Component)
**File:** `src/app/html-preview/page.tsx`

**Key Functions:**
- `exportToPdf()` - Main PDF export function
- Extracts HTML content and styles from iframe
- Processes images through proxy and converts to data URLs
- Sends complete HTML to server-side PDF generation

### Server-Side (Next.js API Route)
**File:** `src/app/api/generate-pdf/route.ts`

**Key Features:**
- Uses **Puppeteer** for server-side PDF generation
- Robust dynamic height calculation
- Handles embedded images as data URLs
- Returns PDF as blob for popup display

## Dependencies
```json
{
  "puppeteer": "^latest"
}
```

## Installation
```bash
npm install puppeteer
```

## Implementation Details

### 1. Client-Side Image Processing
```typescript
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
    }
  }
});
```

### 2. Server-Side Height Calculation
```typescript
// Robust height measurement using multiple methods
const contentHeight = await page.evaluate((): Promise<number> => {
  document.body.style.height = 'auto';
  document.body.style.overflow = 'visible';
  
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const measurements = [
          document.body.scrollHeight,
          document.body.offsetHeight,
          document.body.clientHeight,
          document.documentElement.scrollHeight,
          document.documentElement.offsetHeight,
          document.documentElement.clientHeight
        ];
        
        const bodyRect = document.body.getBoundingClientRect();
        measurements.push(bodyRect.height);
        
        // Find maximum bottom position of all elements
        const allElements = document.body.querySelectorAll('*');
        let maxBottom = 0;
        allElements.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.bottom > maxBottom) {
            maxBottom = rect.bottom;
          }
        });
        measurements.push(maxBottom);
        
        const finalHeight = Math.max(...measurements.filter(h => h > 0));
        resolve(finalHeight);
      });
    });
  });
});
```

### 3. Dynamic PDF Page Sizing
```typescript
// Calculate page height with generous padding
const pageWidth = 210; // A4 width in mm
const heightInMm = Math.ceil(contentHeight * 0.3) + 100; // 100mm padding
const pageHeight = Math.max(297, heightInMm); // Minimum A4 height

const pdfBuffer = await page.pdf({
  width: `${pageWidth}mm`,
  height: `${pageHeight}mm`,
  printBackground: true,
  margin: { top: '5mm', right: '5mm', bottom: '5mm', left: '5mm' },
  preferCSSPageSize: false,
  pageRanges: '1',
});
```

## Configuration

### Image Proxy Endpoint
Ensure you have `/api/image-proxy` endpoint that handles:
- Regular external images
- Gitbook URLs with double encoding
- CORS headers
- Error handling

### Puppeteer Options
```typescript
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
```

## Usage

### In React Component
```typescript
const exportToPdf = async () => {
  try {
    setIsExporting(true);
    showToast('Generating PDF...', 'info');
    
    // Get HTML content from iframe
    const iframeDoc = iframeRef.current.contentDocument;
    
    // Extract styles and process images
    // ... (implementation details in main files)
    
    // Send to server
    const response = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ htmlContent }),
    });
    
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    // Open in popup
    const newWindow = window.open('', '_blank');
    newWindow.document.write(`
      <embed width="100%" height="100%" src="${url}" type="application/pdf" />
    `);
    
  } catch (error) {
    showToast('PDF generation failed', 'error');
  } finally {
    setIsExporting(false);
  }
};
```

## Features

### ✅ Working Features
1. **Selectable text** - Text can be selected and copied from PDF
2. **Single continuous page** - No page breaks, content flows naturally
3. **Dynamic height** - PDF height adapts to content length
4. **Image handling** - External images work through proxy
5. **Style preservation** - CSS styles are maintained
6. **Popup display** - PDF opens in new window, no forced download
7. **Error handling** - Comprehensive error handling and user feedback

### 🔧 Technical Specifications
- **Page width:** 210mm (A4 width)
- **Dynamic height:** Content height + 100mm padding
- **Margins:** 5mm on all sides
- **Image conversion:** Data URLs for server compatibility
- **Height calculation:** Multiple measurement methods with generous padding

## Troubleshooting

### Common Issues
1. **Images not loading:** Ensure image proxy endpoint is working
2. **Content cutoff:** Increase padding in height calculation (currently 100mm)
3. **PDF not opening:** Check popup blocker settings
4. **Style issues:** Verify CSS extraction from iframe

### Debug Information
The implementation includes console logs for:
- Height measurements
- Content dimensions
- Image processing status
- Final page calculations

## File Structure
```
src/
├── app/
│   ├── html-preview/
│   │   └── page.tsx              # Main React component
│   └── api/
│       ├── generate-pdf/
│       │   └── route.ts          # Server-side PDF generation
│       └── image-proxy/
│           └── route.ts          # Image proxy for CORS
└── context/
    ├── PDF_Export_Implementation_Guide.md  # This guide
    └── change-log.md                        # Change history
```

## Performance Considerations
- **Server resources:** Puppeteer requires significant memory
- **Image processing:** Large images increase processing time
- **Timeout handling:** 30-second timeout for complex content
- **Cleanup:** PDF URLs are cleaned up after 60 seconds

## Future Enhancements
- [ ] Custom page margins configuration
- [ ] Multiple page format support
- [ ] Background image optimization
- [ ] Progress indicators for large documents
- [ ] Batch PDF generation
