import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(request: NextRequest) {
  try {
    const { htmlContent } = await request.json();
    
    if (!htmlContent) {
      return NextResponse.json({ error: 'HTML content is required' }, { status: 400 });
    }

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set viewport for consistent rendering
    await page.setViewport({ width: 1200, height: 800 });
    
    // Set the HTML content
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Wait for any images to load
    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images)
          .filter((img) => !img.complete)
          .map((img) => new Promise((resolve) => {
            img.onload = img.onerror = resolve;
          }))
      );
    });

    // Wait a bit more for complete rendering
    await page.waitForTimeout(1000);

    // Get accurate content dimensions using multiple methods
    const contentHeight = await page.evaluate((): Promise<number> => {
      // Force full layout recalculation
      document.body.style.height = 'auto';
      document.body.style.overflow = 'visible';
      
      // Wait for layout
      return new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Get all possible height measurements
            const measurements = [
              document.body.scrollHeight,
              document.body.offsetHeight,
              document.body.clientHeight,
              document.documentElement.scrollHeight,
              document.documentElement.offsetHeight,
              document.documentElement.clientHeight
            ];
            
            // Get bounding rectangle of body
            const bodyRect = document.body.getBoundingClientRect();
            measurements.push(bodyRect.height);
            
            // Find all elements and get the maximum bottom position
            const allElements = document.body.querySelectorAll('*');
            let maxBottom = 0;
            
            allElements.forEach(el => {
              const rect = el.getBoundingClientRect();
              const bottom = rect.bottom;
              if (bottom > maxBottom) {
                maxBottom = bottom;
              }
            });
            
            measurements.push(maxBottom);
            
            // Return the maximum of all measurements
            const finalHeight = Math.max(...measurements.filter(h => h > 0));
            console.log('Height measurements:', measurements, 'Final:', finalHeight);
            resolve(finalHeight);
          });
        });
      });
    });

    console.log(`Final content height: ${contentHeight}px`);

    // Calculate page height with very generous padding
    const pageWidth = 210; // A4 width in mm
    // Use more generous conversion: 1px ≈ 0.3mm + much larger padding
    const heightInMm = Math.ceil(contentHeight * 0.3) + 100; // Add 100mm very generous padding
    const pageHeight = Math.max(297, heightInMm); // Minimum A4 height

    console.log(`Final page height: ${pageHeight}mm (from ${contentHeight}px)`);

    // Generate PDF with selectable text as single continuous page
    const pdfBuffer = await page.pdf({
      width: `${pageWidth}mm`,
      height: `${pageHeight}mm`,
      printBackground: true,
      margin: {
        top: '5mm',
        right: '5mm',
        bottom: '5mm',
        left: '5mm'
      },
      preferCSSPageSize: false,
      pageRanges: '1',
    });

    await browser.close();

    // Return PDF as blob
    return new NextResponse(pdfBuffer, {
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
