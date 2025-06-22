import { NextRequest, NextResponse } from 'next/server';
import HtmlToDocx from '@turbodocx/html-to-docx';

export async function POST(req: NextRequest) {
  try {
    console.log('Starting HTML to DOCX conversion');
    const { html } = await req.json();
    if (!html) {
      return new NextResponse('Missing html content', { status: 400 });
    }

    console.log('HTML content length:', html?.length);
    
    // Create a simple HTML structure for testing
    const cleanHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Document</title>
        <style>
          body { font-family: Arial; margin: 40px; }
          p { margin-bottom: 10px; }
        </style>
      </head>
      <body>
        ${html}
      </body>
      </html>
    `;

    // Use minimal options for TurboDocx
    const docxBuffer = await HtmlToDocx(
      cleanHtml,
      undefined,
      {
        orientation: 'portrait',
        pageSize: { width: 12240, height: 15840 }, // A4 dimensions in twips
        margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    );

    // Convert the result to a proper Buffer object
    let buffer: Buffer;
    if (Buffer.isBuffer(docxBuffer)) {
      buffer = docxBuffer;
    } else if (docxBuffer instanceof ArrayBuffer) {
      buffer = Buffer.from(new Uint8Array(docxBuffer));
    } else if (typeof docxBuffer === 'object') {
      // Handle any other object type that might be returned
      try {
        // Try to convert to array buffer first if it's a Blob
        if ('arrayBuffer' in docxBuffer && typeof docxBuffer.arrayBuffer === 'function') {
          const arrayBuffer = await docxBuffer.arrayBuffer();
          buffer = Buffer.from(new Uint8Array(arrayBuffer));
        } else {
          // Fall back to direct Buffer conversion
          buffer = Buffer.from(docxBuffer as any);
        }
      } catch (bufferError) {
        console.error('Error converting to Buffer:', bufferError);
        throw new Error('Failed to convert DOCX content to Buffer');
      }
    } else {
      throw new Error(`Unexpected docxBuffer type: ${typeof docxBuffer}`);
    }
    
    // Create response with proper headers for file download
    const response = new NextResponse(buffer);
    response.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    response.headers.set('Content-Disposition', 'attachment; filename=document.docx');
    
    return response;
  } catch (error) {
    console.error('Error converting HTML to DOCX:', error);
    return new NextResponse(`Error converting to DOCX: ${error instanceof Error ? error.message : String(error)}`, { status: 500 });
  }
}
