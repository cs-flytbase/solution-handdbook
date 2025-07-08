# HTML Preview Implementation Guide - Part 1: Core Structure

## Introduction

This guide provides a comprehensive walkthrough for implementing the HTML Preview component. The implementation is divided into multiple parts for clarity and to avoid overwhelming complexity. This part focuses on the core structure and basic functionality.

## Component Overview

The HTML Preview component is a full-featured editor and preview system that allows users to:

1. Write and edit HTML code
2. See a real-time preview of the HTML
3. Upload and embed images, PDFs, and DOCX files
4. Toggle between code editing and direct in-preview editing
5. Export content to PDF and DOCX formats
6. Resize images in direct edit mode

## Technology Stack

### Core Technologies
- **React**: Frontend library for UI components
- **Next.js**: React framework with server-side capabilities
- **TypeScript**: For type safety and developer experience

### Required Packages
- `react`, `react-dom`: Core React libraries
- `next`: Next.js framework
- `puppeteer`: For server-side PDF generation
- `pdfmake`: PDF generation utilities
- `html2pdf.js`: Alternative client-side PDF generation (optional)

### Type Definitions
- `@types/react`
- `@types/node`

## File Structure

```
/src
  /app
    /html-preview
      page.tsx          # Main HTML Preview component
    /api
      /generate-pdf
        route.ts        # Server API for PDF generation
      /image-proxy
        route.ts        # Server API for image proxying
      /convert-turbo
        route.ts        # Server API for DOCX conversion
  /components
    toast.tsx           # Toast notification component
  /utils
    pdf-utils.ts        # Utility functions for PDF handling
```

## Core Component Structure

The main component follows this structure:

```typescript
"use client";

import React, { useState, useRef, useEffect } from 'react';
// Other imports...

// Type definitions for external libraries
interface Window {
  pdfMake: any;
}

// Type definitions for HTML2PDF options
interface Html2PdfOptions {
  // Options definition
}

interface Html2PdfModule {
  // Module definition
}

export default function HtmlPreview() {
  // State variables
  const [htmlCode, setHtmlCode] = useState<string>('initial HTML here');
  const [editMode, setEditMode] = useState<'code' | 'direct'>('code');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [lastScrollPosition, setLastScrollPosition] = useState<number>(0);
  const [imageUploadProgress, setImageUploadProgress] = useState<number | null>(null);
  
  // Image resize state
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [showImageControls, setShowImageControls] = useState<boolean>(false);
  const [imageControlsPosition, setImageControlsPosition] = useState({ top: 0, left: 0 });
  
  // Refs
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Core functionality effects and handlers
  
  // UI rendering
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Component UI */}
    </div>
  );
}
```

## Basic State Management

### Essential State Variables

```typescript
// Content state
const [htmlCode, setHtmlCode] = useState<string>('<html>\n<head>\n  <title>HTML Preview</title>\n  <style>\n    /* Your CSS here */\n  </style>\n</head>\n<body>\n  <!-- Your HTML here -->\n  <h1>Hello, World!</h1>\n  <p>This is a preview of your HTML code.</p>\n</body>\n</html>');

// UI state
const [editMode, setEditMode] = useState<'code' | 'direct'>('code');
const [isExporting, setIsExporting] = useState<boolean>(false);
const [lastScrollPosition, setLastScrollPosition] = useState<number>(0);
const [imageUploadProgress, setImageUploadProgress] = useState<number | null>(null);
```

### Essential Refs

```typescript
// Reference to the iframe element
const iframeRef = useRef<HTMLIFrameElement>(null);
```

## Core Effect: Syncing HTML to Preview

```typescript
useEffect(() => {
  if (iframeRef.current) {
    const iframeDocument = iframeRef.current.contentDocument;
    
    if (iframeDocument) {
      // Store scroll position before updating content
      if (iframeRef.current.contentWindow) {
        const currentPosition = iframeRef.current.contentWindow.scrollY;
        if (currentPosition > 0) {
          setLastScrollPosition(currentPosition);
        }
      }
      
      // HTML styling
      const a4PageStyle = `
        body {
          margin: 0;
          padding: 20px;
          font-family: Arial, sans-serif;
        }
        .document-content {
          padding: 0;
        }
      `;
      
      // Write HTML to the iframe
      iframeDocument.open();
      iframeDocument.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>${a4PageStyle}</style>
          </head>
          <body>
            <div class="document-content">${htmlCode}</div>
          </body>
        </html>
      `);
      iframeDocument.close();
      
      // Restore scroll position
      setTimeout(() => {
        if (iframeRef.current?.contentWindow && lastScrollPosition > 0) {
          iframeRef.current.contentWindow.scrollTo(0, lastScrollPosition);
          setLastScrollPosition(0);
        }
      }, 10);
    }
  }
}, [htmlCode, lastScrollPosition]);
```

## Basic Input Handlers

```typescript
// Handle changes to the HTML code textarea
const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  setHtmlCode(e.target.value);
};

// Clear the HTML code
const handleClear = () => {
  setHtmlCode('');
};

// Reset to default HTML template
const handleReset = () => {
  setHtmlCode('<html>\n<head>\n  <title>HTML Preview</title>\n  <style>\n    /* Your CSS here */\n  </style>\n</head>\n<body>\n  <!-- Your HTML here -->\n  <h1>Hello, World!</h1>\n  <p>This is a preview of your HTML code.</p>\n</body>\n</html>');
};
```

## Basic UI Structure

```tsx
return (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
    <main className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          HTML Preview & Export
        </h1>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Paste your HTML code, preview it in real-time, and export as PDF or DOCX.
        </p>
      </div>
      
      {/* Main content area */}
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)]">
        {/* Preview Area */}
        <div className="lg:w-[70%] bg-white dark:bg-gray-800 rounded-xl shadow-lg flex flex-col h-full">
          {/* Preview Header */}
          <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
            <h3 className="font-medium text-gray-900 dark:text-white">Live Preview</h3>
            <div className="flex gap-2">
              {/* Action buttons will go here */}
            </div>
          </div>
          
          {/* Preview iframe */}
          <div className="flex-grow bg-gray-200 dark:bg-gray-700 p-1 overflow-auto relative">
            <iframe
              ref={iframeRef}
              title="HTML Preview"
              className="w-full h-full border-0"
              sandbox="allow-same-origin allow-scripts"
              style={{ minHeight: '100%' }}
            />
          </div>
        </div>
        
        {/* HTML Input Area */}
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
```

## Implementation Mistakes to Avoid

1. **Direct DOM Manipulation**: Don't directly modify the iframe document without considering React's lifecycle and state management.

2. **Inefficient State Updates**: Avoid excessive state updates which can cause performance issues, especially with real-time HTML rendering.

3. **Scroll Position Jumps**: Always preserve and restore scroll position when updating the iframe content.

4. **Unsafe HTML**: Be cautious about directly injecting user-provided HTML which can lead to security vulnerabilities.

5. **Missing Type Definitions**: Always provide proper TypeScript types, especially for external libraries.

6. **Missing Error Handling**: Include proper error handling for all operations, especially file uploads and exports.

7. **Poor Performance with Large Documents**: Implement performance optimizations for handling large HTML documents.

8. **Ignoring Accessibility**: Ensure the component is accessible to all users.

## Next Steps

In Part 2, we'll cover:
- Direct edit mode implementation
- File upload functionality
- Drag and drop support
- Image resize controls
