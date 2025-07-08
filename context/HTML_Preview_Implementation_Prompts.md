# HTML Preview Implementation Prompts

## Introduction

This document provides a sequential series of prompts for implementing all features of the HTML Preview page. Each prompt builds upon the previous ones, creating a structured development path that minimizes rework and maximizes efficiency.

## Core Structure Implementation Prompts

### Prompt 1: Basic Component Setup
```
Create the basic structure for the HTML Preview component with a split layout. Include:
1. A main container with appropriate styling
2. A header area with title and description
3. A two-panel layout (70/30 split on desktop) with placeholder areas for:
   - Preview area (left/top)
   - Code editor area (right/bottom)
4. Basic responsive behavior (column layout on mobile)
Include all necessary imports, TypeScript types, and styling.
```

### Prompt 2: HTML Editor and Basic Preview
```
Implement the HTML code editor and basic preview functionality:
1. Add a textarea with monospace font for HTML code editing
2. Create state management for HTML code content with a default template
3. Implement the iframe for preview with proper sandboxing
4. Add the core effect that syncs HTML code to the preview iframe
5. Ensure scroll position is preserved when updating the preview
6. Add "Clear" and "Reset" buttons with their handlers
7. Style both panels properly with shadows, borders, and proper spacing
```

### Prompt 3: Initial UI Styling and Responsiveness
```
Enhance the UI styling and responsive behavior:
1. Implement a clean, modern UI following the specifications in HTML_Preview_UI_Guide.md
2. Add light/dark mode support with appropriate color schemes
3. Ensure responsive behavior works at all breakpoints (desktop, tablet, mobile)
4. Add proper spacing, shadows, and visual hierarchy
5. Optimize the textarea for code editing (font, line wrapping, etc.)
6. Make the iframe preview properly sized and responsive
7. Ensure all text meets accessibility contrast requirements
```

## Direct Edit Mode Implementation Prompts

### Prompt 4: Direct Edit Mode Toggle
```
Implement the toggle between code editing and direct editing modes:
1. Add state management for tracking edit mode ('code' or 'direct')
2. Create a toggle button with appropriate styling that changes appearance based on mode
3. Implement the toggleEditMode function that:
   - Switches between modes
   - Preserves scroll position
   - Makes content editable in direct mode
   - Makes content non-editable when returning to code mode
4. Add visual indicators for active edit mode
5. Ensure content synchronization from direct edits back to the HTML code state
6. Add tooltip or helper text explaining the feature
```

### Prompt 5: Direct Edit Mode Enhancements
```
Enhance the direct edit mode with additional functionality:
1. Improve content synchronization to handle all types of edits
2. Add keyboard shortcut support for toggling between modes
3. Add a floating indicator showing the current edit mode
4. Ensure cursor positioning works correctly
5. Implement proper focus management when switching modes
6. Fix any edge cases with content synchronization
7. Add protection against common direct edit issues (like content loss)
8. Ensure all direct edit functionality works in both light and dark modes
```

## File Upload Implementation Prompts

### Prompt 6: Basic File Upload
```
Implement basic file upload functionality:
1. Add a file input with a styled upload button
2. Create the handleFileUpload function to process uploaded files
3. Support image files with proper embedding in the HTML
4. Show upload progress indicator
5. Add success/error toast notifications
6. Ensure uploaded content appears at the cursor position in direct edit mode
7. Add proper error handling for invalid file types
```

### Prompt 7: Enhanced File Upload with Drag & Drop
```
Enhance the file upload with drag and drop support:
1. Implement drag over and drop event handlers for the preview area
2. Add visual feedback for drag operations
3. Process dropped files with the existing upload handler
4. Support multiple file types (images, PDFs, DOCXs)
5. Generate appropriate HTML for each file type:
   - Images as <img> tags
   - PDFs as embedded objects
   - DOCXs as download links
6. Improve error handling and user feedback
7. Make the drag and drop area visually apparent during drag operations
```

### Prompt 8: File Upload API and Image Proxy
```
Implement the server-side API for file handling:
1. Create the image proxy API endpoint at /api/image-proxy
2. Implement functionality to fetch external images and return them as proxied content
3. Add proper error handling and status codes
4. Implement image processing for both client and server sides
5. Ensure CORS issues are addressed
6. Add caching headers for better performance
7. Implement security checks for uploaded content
```

## Image Resize Implementation Prompts

### Prompt 9: Image Selection and Controls
```
Implement image selection and resize controls:
1. Add state variables for tracking selected image and control visibility
2. Implement setupImageControls function to add click listeners to images
3. Create the floating control panel UI that appears when an image is selected
4. Position the control panel correctly relative to the selected image
5. Add logic to hide controls when clicking elsewhere
6. Style the image controls appropriately for both light and dark modes
7. Add cursor styling to indicate images are selectable
```

### Prompt 10: Image Resize Functionality
```
Implement the image resize functionality:
1. Create functions for increasing, decreasing, and resetting image size
2. Connect these functions to the control panel buttons
3. Ensure changes to image size trigger content sync in direct edit mode
4. Add visual feedback during resize operations
5. Implement size constraints (minimum and maximum dimensions)
6. Ensure resize operations work correctly with percentage-based sizing
7. Optimize resize operations for performance
8. Test resize functionality with various image types and sizes
```

## Export Functionality Implementation Prompts

### Prompt 11: PDF Export Client-Side
```
Implement client-side portion of PDF export:
1. Add an "Export to PDF" button with appropriate styling
2. Implement the exportToPdf function to:
   - Show export progress/loading state
   - Process images for export (convert to data URLs)
   - Send HTML content to the server
   - Handle the response and open the PDF in a new window
3. Add error handling with user feedback
4. Implement the processImagesForExport helper function
5. Add visual feedback during export process
```

### Prompt 12: PDF Export Server-Side
```
Implement server-side PDF generation:
1. Create the generate-pdf API endpoint at /api/generate-pdf/route.ts
2. Implement Puppeteer setup for headless browser PDF generation
3. Configure PDF options for proper formatting (margins, page size)
4. Add content height calculation to prevent content cutoff
5. Set appropriate response headers for PDF delivery
6. Add proper error handling and logging
7. Optimize for performance and resource usage
8. Ensure browser instances are properly closed after use
```

### Prompt 13: DOCX Export Implementation
```
Implement DOCX export functionality:
1. Add an "Export to DOCX" button with appropriate styling
2. Implement the exportTurboDocx client function
3. Create the server-side API at /api/convert-turbo/route.ts
4. Set up HTML to DOCX conversion using appropriate library
5. Configure proper response headers for DOCX download
6. Add error handling and user feedback
7. Ensure images and formatting are preserved in the DOCX output
8. Test with various content types (text, images, tables)
```

## Notification and Feedback Implementation Prompts

### Prompt 14: Toast Notification System
```
Implement a reusable toast notification system:
1. Create the showToast function with parameters for message, type, and duration
2. Design toast UI for different types (success, error, info)
3. Add animation for appearance and disappearance
4. Implement auto-dismissal after configurable duration
5. Position toasts properly to avoid interfering with other UI elements
6. Ensure toasts are accessible (proper contrast, screen reader support)
7. Add ability to stack multiple toast messages
8. Implement touch-friendly dismiss functionality
```

## Polish and Accessibility Implementation Prompts

### Prompt 15: Keyboard Navigation and Focus Management
```
Enhance keyboard navigation and focus management:
1. Ensure all interactive elements are keyboard accessible
2. Implement proper tab order through the interface
3. Add visible focus indicators on all interactive elements
4. Implement keyboard shortcuts for common actions
5. Ensure modal elements trap focus appropriately
6. Add screen reader aria-labels and descriptions
7. Test and fix any keyboard navigation issues
8. Ensure focus is properly managed when switching modes or opening UI elements
```

### Prompt 16: Final Polish and Performance Optimization
```
Add final polish and performance optimizations:
1. Review and fix any edge cases in all implemented functionality
2. Optimize rendering performance for large HTML documents
3. Implement debouncing for frequent operations
4. Add lazy loading for heavy dependencies
5. Optimize state management to prevent unnecessary re-renders
6. Add final accessibility improvements (ARIA roles, landmarks)
7. Add comprehensive error handling throughout the application
8. Perform final testing across browsers and devices
9. Document any known limitations or future enhancements
```

## Integration and Deployment Prompts

### Prompt 17: Integration with Parent Application
```
Integrate the HTML Preview component with the parent application:
1. Export the component properly for use in other parts of the application
2. Create proper props interface for configuration options
3. Add event handlers to communicate with parent components
4. Implement data persistence if needed
5. Ensure styles don't conflict with parent application
6. Test integration in various contexts
7. Add documentation for integration use cases
```

### Prompt 18: Testing and Bug Fixes
```
Implement comprehensive testing and fix bugs:
1. Create unit tests for key functionality
2. Test all features across different browsers
3. Test with various types of content (simple HTML, complex HTML with images)
4. Verify responsive behavior across device sizes
5. Test edge cases (very large documents, invalid HTML)
6. Fix any identified bugs or issues
7. Ensure performance is acceptable with realistic content sizes
8. Document any remaining known issues
```

## Conclusion

These prompts cover the entire implementation of the HTML Preview component, from basic structure to advanced features. Each prompt builds logically on previous work, minimizing rework and ensuring a smooth development process. Follow them in sequence for the most efficient implementation.
