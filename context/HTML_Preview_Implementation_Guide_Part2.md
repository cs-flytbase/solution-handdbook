# HTML Preview Implementation Guide - Part 2: Export Functionality

## Introduction

This guide covers the PDF and DOCX export functionality of the HTML Preview component. This is a critical feature that allows users to generate professional documents from their HTML content.

## PDF Export Implementation

### Overview

The PDF export functionality uses server-side Puppeteer to generate high-quality PDFs with selectable text and proper styling. This approach preserves the exact styling and layout of the HTML content.

### 1. Client-Side Setup

```typescript
// State for tracking export status
const [isExporting, setIsExporting] = useState<boolean>(false);

// Function to export HTML content to PDF
const exportToPdf = async () => {
  try {
    setIsExporting(true);
    
    // Process images to data URLs to avoid CORS issues
    const processedHtml = await processImagesForExport(htmlCode);
    
    // Send to server for PDF generation
    const response = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ htmlContent: processedHtml }),
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    // Get the PDF as a blob
    const pdfBlob = await response.blob();
    
    // Create a URL for the blob
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    // Open the PDF in a new window
    window.open(pdfUrl, '_blank');
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
    showToast('PDF generated successfully!', 'success');
  } catch (error) {
    console.error('Error generating PDF:', error);
    showToast('Failed to generate PDF. Please try again.', 'error');
  } finally {
    setIsExporting(false);
  }
};

// Function to process images before export
const processImagesForExport = async (html: string) => {
  // Create a temporary DOM element
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Find all images
  const images = tempDiv.querySelectorAll('img');
  
  // Process each image
  await Promise.all(Array.from(images).map(async (img) => {
    // Skip if already a data URL
    if (img.src.startsWith('data:')) return;
    
    try {
      // Convert external image to data URL using proxy
      const response = await fetch(`/api/image-proxy?url=${encodeURIComponent(img.src)}`);
      const blob = await response.blob();
      
      // Create a new data URL
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      
      // Update the image src
      img.src = dataUrl;
    } catch (error) {
      console.error('Error processing image:', error);
      // Keep original src if conversion fails
    }
  }));
  
  return tempDiv.innerHTML;
};
```

### 2. Server-Side PDF Generation API

Create a file at `/src/app/api/generate-pdf/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const { htmlContent } = body;
    
    if (!htmlContent) {
      return NextResponse.json(
        { error: 'HTML content is required' },
        { status: 400 }
      );
    }
    
    // Launch browser
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    // Create new page
    const page = await browser.newPage();
    
    // Set content
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0' 
    });
    
    // Add styles for PDF
    await page.addStyleTag({
      content: `
        body {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
        }
        @page {
          margin: 1cm;
        }
      `
    });
    
    // Calculate content height to avoid cutoff
    const bodyHeight = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;
      
      return Math.max(
        body.scrollHeight,
        body.offsetHeight,
        html.clientHeight,
        html.scrollHeight,
        html.offsetHeight
      );
    });
    
    // Add generous padding to ensure no content is cut off
    const pdfHeight = bodyHeight + 500; // Add 500px padding
    
    // Generate PDF
    const pdf = await page.pdf({
      format: 'A4',
      width: '8.27in',
      height: `${pdfHeight}px`,
      printBackground: true,
      displayHeaderFooter: false,
      margin: {
        top: '0.4in',
        right: '0.4in',
        bottom: '0.4in',
        left: '0.4in',
      }
    });
    
    // Close browser
    await browser.close();
    
    // Return PDF
    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="document.pdf"',
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
```

### 3. Image Proxy API

Create a file at `/src/app/api/image-proxy/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Get URL parameter
    const url = req.nextUrl.searchParams.get('url');
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }
    
    // Fetch the image
    const response = await fetch(url);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }
    
    // Get the image data
    const imageData = await response.arrayBuffer();
    
    // Get content type
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Return the image
    return new NextResponse(imageData, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy image' },
      { status: 500 }
    );
  }
}
```

## DOCX Export Implementation

### 1. Client-Side Function

```typescript
const exportTurboDocx = async () => {
  try {
    // Process images to data URLs (same function as for PDF)
    const processedHtml = await processImagesForExport(htmlCode);
    
    // Send content to the server
    const response = await fetch('/api/convert-turbo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ html: processedHtml }),
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    // Get the DOCX as blob
    const docxBlob = await response.blob();
    
    // Create download link
    const url = window.URL.createObjectURL(docxBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.docx';
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    showToast('DOCX file generated successfully!', 'success');
  } catch (error) {
    console.error('Error generating DOCX:', error);
    showToast('Failed to generate DOCX. Please try again.', 'error');
  }
};
```

### 2. Server-Side DOCX Conversion API

Create a file at `/src/app/api/convert-turbo/route.ts`. This example uses an external library for HTML to DOCX conversion:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import htmlDocx from 'html-docx-js';

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const { html } = body;
    
    if (!html) {
      return NextResponse.json(
        { error: 'HTML content is required' },
        { status: 400 }
      );
    }
    
    // Convert HTML to DOCX
    const docxBuffer = htmlDocx.asBlob(html);
    
    // Return DOCX file
    return new NextResponse(docxBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="document.docx"',
      },
    });
  } catch (error) {
    console.error('DOCX conversion error:', error);
    return NextResponse.json(
      { error: 'Failed to convert to DOCX' },
      { status: 500 }
    );
  }
}
```

## Toast Notification System

### 1. Toast Function

```typescript
// Toast notification system
const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `fixed bottom-4 right-4 p-4 rounded-lg text-white shadow-lg z-50 transition-opacity duration-300 ${
    type === 'success' ? 'bg-green-600' : 
    type === 'error' ? 'bg-red-600' : 
    'bg-blue-600'
  }`;
  toast.textContent = message;
  
  // Add to document
  document.body.appendChild(toast);
  
  // Fade in
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 10);
  
  // Remove after delay
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, 3000);
};
```

## Best Practices for Export Implementation

1. **Process Images Before Export**: Convert all images to data URLs to avoid CORS issues.

2. **Add Generous Height Padding**: When generating PDFs, add extra padding to ensure no content is cut off.

3. **Provide User Feedback**: Show loading states and success/error notifications.

4. **Error Handling**: Implement robust error handling at both client and server sides.

5. **Content Type Headers**: Set proper content type headers for PDF and DOCX responses.

6. **Cleanup Resources**: Close Puppeteer browser instances and revoke object URLs when done.

7. **Security Considerations**: Validate and sanitize HTML content before processing.

## Common Export Issues and Solutions

### PDF Generation Issues

1. **Content Cutoff**:
   - Solution: Dynamically calculate needed height and add extra padding.

2. **Missing Images**:
   - Solution: Convert all images to data URLs before sending to the server.

3. **Styling Inconsistencies**:
   - Solution: Include all necessary CSS in the HTML or add it via page.addStyleTag().

4. **Memory Leaks**:
   - Solution: Always close browser instances after use.

### DOCX Export Issues

1. **Complex HTML Not Converting Well**:
   - Solution: Use a more advanced HTML to DOCX library or simplify the HTML structure.

2. **Images Not Appearing**:
   - Solution: Ensure all images are using data URLs.

3. **Formatting Issues**:
   - Solution: Apply consistent and simpler styling that works well with DOCX format.

## Performance Optimization

1. **Lazy Loading**: Import heavy libraries only when needed.

2. **Server Resources**: Monitor Puppeteer memory usage and implement timeouts.

3. **Request Size Limits**: Set appropriate limits for request body size.

4. **Browser Pooling**: For high-traffic applications, implement browser pooling.

## Implementation Mistakes to Avoid

1. **Not Handling CORS**: Always proxy external images to avoid CORS issues.

2. **Missing Error Handling**: Implement comprehensive error handling for network requests.

3. **Resource Leaks**: Failing to close browser instances or revoke object URLs.

4. **Poor UI Feedback**: Always provide clear feedback during export operations.

5. **Inadequate Testing**: Test with various content types and sizes to ensure reliability.

In Part 3, we'll cover the direct edit mode and file upload functionality.
