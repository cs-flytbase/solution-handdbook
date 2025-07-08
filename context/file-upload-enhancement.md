# File Upload Enhancement

## Feature Overview

Added support for uploading and embedding PDF and DOCX files in addition to images in the HTML Preview component. This feature enables users to:

1. Upload PDFs, DOCXs, and images through the file picker
2. Drag and drop PDFs, DOCXs, and images directly into the preview area
3. View embedded PDFs directly in the preview
4. Access DOCX files through download links

## Implementation Details

### 1. File Type Detection

Added proper MIME type detection for PDF and DOCX files:

```typescript
const isPdf = file.type === 'application/pdf';
const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const isImage = /^image\//.test(file.type);
```

### 2. File Type-Specific Embedding

Created different HTML embedding templates based on file type:

#### For Images:
```html
<img src="${dataUrl}" alt="${file.name}" style="max-width: 100%; height: auto;" />
```

#### For PDFs:
```html
<div class="pdf-embed" style="width: 100%; margin: 20px 0;">
  <p style="font-weight: bold; margin-bottom: 5px;">${file.name}</p>
  <object data="${dataUrl}" type="application/pdf" width="100%" height="500px">
    <p>Your browser does not support PDF embedding. <a href="${dataUrl}" download="${file.name}">Click here to download</a></p>
  </object>
</div>
```

#### For DOCX files:
```html
<div class="docx-link" style="padding: 15px; border: 1px solid #e0e0e0; border-radius: 5px; margin: 20px 0;">
  <p style="font-weight: bold; margin-bottom: 5px;">📄 ${file.name}</p>
  <p>DOCX file attached - <a href="${dataUrl}" download="${file.name}">Click here to download</a></p>
</div>
```

### 3. UI Updates

- Changed "Upload Image" button to "Upload File"
- Updated file input to accept additional file types:
  ```html
  accept="image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ```

### 4. Integration with Direct Edit Mode

Ensured the file upload functionality works seamlessly with direct edit mode:
- Files can be uploaded at the cursor position when in direct edit mode
- The HTML is properly updated to include the embedded file content
- Content synchronization still functions when files are added

## Usage Instructions

1. Click the "Upload File" button or drag and drop files into the preview area
2. For images: They will be displayed directly in the preview
3. For PDFs: They will be embedded with a PDF viewer
4. For DOCX: A download link will be provided (browsers can't natively render DOCX)

## Technical Implementation Notes

1. All files are converted to data URLs using FileReader
2. PDF embedding uses the HTML `<object>` tag with fallback content
3. DOCX files are presented as styled download links
4. Proper error handling and progress indication are maintained from the original image upload feature

## Date Added
2025-06-22
