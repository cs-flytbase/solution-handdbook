# HTML Preview Implementation Guide - Part 3: Direct Edit Mode and File Upload

## Introduction

This guide covers the direct edit mode and file upload functionality of the HTML Preview component. These features enhance the user experience by allowing in-preview editing and easy file embedding.

## Direct Edit Mode Implementation

### Overview

Direct edit mode allows users to edit HTML content directly within the preview iframe rather than editing the HTML code. This provides a more intuitive editing experience for users who prefer WYSIWYG editing.

### 1. Toggle Function

```typescript
// State for tracking edit mode
const [editMode, setEditMode] = useState<'code' | 'direct'>('code');

// Function to toggle between code and direct edit modes
const toggleEditMode = () => {
  const newMode = editMode === 'code' ? 'direct' : 'code';
  setEditMode(newMode);
  
  // Store scroll position before switching modes
  if (iframeRef.current?.contentWindow) {
    const currentPosition = iframeRef.current.contentWindow.scrollY;
    if (currentPosition > 0) {
      setLastScrollPosition(currentPosition);
    }
  }
  
  if (newMode === 'direct' && iframeRef.current?.contentDocument) {
    const doc = iframeRef.current.contentDocument;
    
    // Wait for content to be loaded
    setTimeout(() => {
      // Find the content element (only make specific area editable)
      const contentElement = doc.querySelector('.document-content') || doc.body;
      
      // Make the content editable
      (contentElement as HTMLElement).contentEditable = 'true';
      
      // Set up image controls for direct edit mode
      setupImageControls(doc);
      
      // Function to sync content back to state
      const syncContent = () => {
        // Only update if there's actual content
        if (doc.body.innerHTML.trim()) {
          setHtmlCode(doc.body.innerHTML);
        }
      };
      
      // Remove existing event listener to avoid duplicates
      contentElement.removeEventListener('input', syncContent);
      
      // Add new event listener
      contentElement.addEventListener('input', syncContent);
    }, 100);
  } else if (iframeRef.current?.contentDocument) {
    const doc = iframeRef.current.contentDocument;
    
    // Find the content element
    const contentElement = doc.querySelector('.document-content') || doc.body;
    
    // Make the content non-editable
    (contentElement as HTMLElement).contentEditable = 'false';
    doc.designMode = 'off';
  }
};
```

### 2. UI Button

```tsx
<button
  onClick={toggleEditMode}
  className={`px-3 py-1 text-sm ${editMode === 'direct' 
    ? 'bg-purple-600 hover:bg-purple-700' 
    : 'bg-gray-600 hover:bg-gray-700'} text-white rounded-md transition-colors`}
  title={editMode === 'direct' ? 'Switch to code editing' : 'Switch to direct editing'}
>
  {editMode === 'direct' ? 'Direct Edit On' : 'Direct Edit Off'}
</button>
```

### 3. UI Indicators

```tsx
{editMode === 'direct' && (
  <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded text-sm">
    Direct edit mode: Click inside preview to edit
  </div>
)}
```

## File Upload Implementation

### Overview

The file upload functionality allows users to upload images, PDFs, and DOCX files either via a file picker or by dragging and dropping files onto the preview area.

### 1. File Upload Function

```typescript
// State for tracking upload progress
const [imageUploadProgress, setImageUploadProgress] = useState<number | null>(null);

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
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setImageUploadProgress((prev) => {
        if (prev === null || prev >= 90) return prev;
        return prev + 10;
      });
    }, 100);
    
    // Convert file to data URL
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
    
    // Handle different file types
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
    
    // Insert content at cursor position in direct edit mode or append to HTML code
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
    
    // Clean up and show success message
    clearInterval(interval);
    setImageUploadProgress(null);
    showToast('File uploaded successfully!', 'success');
  } catch (error) {
    console.error('Error uploading file:', error);
    showToast('Failed to upload file. Please try again.', 'error');
    setImageUploadProgress(null);
  }
};

// File input handler
const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    handleFileUpload(file);
  }
};
```

### 2. Drag and Drop Implementation

```typescript
// Handle drag over event
const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
  e.preventDefault();
  e.stopPropagation();
};

// Handle drop event
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
```

### 3. UI Components

```tsx
{/* File upload button */}
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

{/* Drag and drop area */}
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
  
  {/* Upload progress indicator */}
  {imageUploadProgress !== null && (
    <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded text-sm">
      Uploading: {imageUploadProgress}%
    </div>
  )}
</div>
```

## Image Resize Feature Implementation

### Overview

The image resize feature allows users to select images in direct edit mode and adjust their size using a floating toolbar.

### 1. State and Refs

```typescript
// State for image resize functionality
const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
const [showImageControls, setShowImageControls] = useState<boolean>(false);
const [imageControlsPosition, setImageControlsPosition] = useState({ top: 0, left: 0 });
```

### 2. Image Selection and Controls Setup

```typescript
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
```

### 3. Image Resize Functions

```typescript
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
```

### 4. Image Controls UI

```tsx
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
```

## Best Practices for Direct Edit Mode

1. **Preserve HTML Structure**: Only make specific elements editable rather than the entire document.

2. **Preserve Scroll Position**: Store and restore scroll position when toggling edit modes.

3. **Event Management**: Properly add and remove event listeners to avoid memory leaks and duplicate events.

4. **Debounce Content Updates**: For large documents, consider debouncing the content sync function.

5. **Provide User Feedback**: Clearly indicate when direct edit mode is active.

## Best Practices for File Upload

1. **Support Multiple File Types**: Handle different file types with appropriate embeddings.

2. **Progress Indication**: Always provide upload progress feedback.

3. **Error Handling**: Validate file types and handle upload errors gracefully.

4. **File Size Limits**: Implement size limits to prevent performance issues.

5. **Content Security**: Convert uploads to data URLs to avoid CORS issues.

## Implementation Mistakes to Avoid

1. **Breaking the Editing Experience**: Making the entire iframe editable can cause unexpected behavior.

2. **Losing HTML Structure**: Direct manipulation of innerHTML without proper consideration can break the document structure.

3. **Event Listener Duplication**: Not removing previous event listeners before adding new ones can cause memory leaks and duplicate events.

4. **Missing Content Sync**: Failing to trigger content synchronization after image resizing or other manipulations.

5. **Poor User Feedback**: Not clearly indicating when direct edit mode is active or when files are being uploaded.

6. **Ignoring User Selection**: Not considering where the user wants to insert uploaded content.

## Next Steps

In Part 4, we'll cover optimization, testing strategies, and advanced features to enhance the HTML Preview component.
