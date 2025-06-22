# PDF Export Implementation Files

## Core Implementation Files

### 1. Client-Side Component
**File:** `src/app/html-preview/page.tsx`
**Function:** `exportToPdf()`
**Lines:** 258-348

**Key Responsibilities:**
- Extract HTML content and CSS styles from iframe
- Process images through proxy and convert to data URLs
- Send complete HTML to server-side generation
- Handle PDF blob response and popup display

### 2. Server-Side API Route
**File:** `src/app/api/generate-pdf/route.ts`
**Method:** POST
**Complete File**

**Key Responsibilities:**
- Launch Puppeteer browser instance
- Set HTML content and wait for rendering
- Calculate dynamic page height
- Generate PDF with selectable text
- Return PDF buffer as response

### 3. Image Proxy API (Existing)
**File:** `src/app/api/image-proxy/route.ts`
**Methods:** GET, OPTIONS

**Used For:**
- Proxying external images to avoid CORS issues
- Handling Gitbook URLs with double encoding
- Converting images for client-side processing

## Configuration Files

### Package Dependencies
**File:** `package.json`
**Added Dependency:**
```json
{
  "puppeteer": "^latest"
}
```

## Quick Setup for New Projects

### 1. Install Dependencies
```bash
npm install puppeteer
```

### 2. Copy Files
Copy these files to your Next.js project:
- `src/app/api/generate-pdf/route.ts`
- `src/app/api/image-proxy/route.ts` (if needed for images)

### 3. Client-Side Integration
Add the `exportToPdf()` function from `src/app/html-preview/page.tsx` to your component.

### 4. Environment Considerations
For production deployment, ensure:
- Server has sufficient memory for Puppeteer
- Puppeteer dependencies are installed
- Timeout values are appropriate for your content

## Code Snippets for Reuse

### Basic PDF Export Function
```typescript
const exportToPdf = async () => {
  try {
    setIsExporting(true);
    
    // Extract HTML content from your source
    const htmlContent = getHTMLContent(); // Your implementation
    
    // Send to server for PDF generation
    const response = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ htmlContent }),
    });
    
    if (!response.ok) throw new Error('PDF generation failed');
    
    // Display PDF in popup
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <embed width="100%" height="100%" src="${url}" type="application/pdf" />
      `);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
    
  } catch (error) {
    console.error('PDF export error:', error);
  } finally {
    setIsExporting(false);
  }
};
```

### Server-Side PDF Route Template
```typescript
import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(request: NextRequest) {
  try {
    const { htmlContent } = await request.json();
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // Your height calculation logic here
    const contentHeight = await page.evaluate(() => {
      return Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );
    });
    
    const pageHeight = Math.ceil(contentHeight * 0.3) + 100;
    
    const pdfBuffer = await page.pdf({
      width: '210mm',
      height: `${pageHeight}mm`,
      printBackground: true,
      margin: { top: '5mm', right: '5mm', bottom: '5mm', left: '5mm' }
    });
    
    await browser.close();
    
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="document.pdf"'
      }
    });
    
  } catch (error) {
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 });
  }
}
```

## Testing Checklist

When implementing in a new project:

- [ ] PDF generates without errors
- [ ] Text is selectable in the PDF
- [ ] Images load correctly
- [ ] No content cutoff
- [ ] Popup opens properly
- [ ] Error handling works
- [ ] Server has adequate resources
- [ ] Timeouts are appropriate

## Performance Optimization Tips

1. **Lazy load Puppeteer:** Only import when needed
2. **Image optimization:** Compress large images before conversion
3. **Content limits:** Consider pagination for very large documents
4. **Browser pooling:** Reuse browser instances for high-traffic scenarios
5. **Memory monitoring:** Watch server memory usage with Puppeteer instances
