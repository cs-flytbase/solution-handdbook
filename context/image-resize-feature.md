# Image Resize Feature - HTML Preview Component

## Feature Overview

Added the ability to resize images in the HTML Preview component. This feature allows users to:

1. Click on any image to select it
2. Use a floating toolbar with resize controls that appears above the selected image
3. Increase or decrease the image size gradually by 10%
4. Reset the image to its original size

## Implementation Details

### 1. State Management

Added new state variables to handle image selection and controls:

```typescript
const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
const [showImageControls, setShowImageControls] = useState(false);
const [imageControlsPosition, setImageControlsPosition] = useState({ top: 0, left: 0 });
```

### 2. Image Selection System

Implemented a click handler that selects images and positions the controls:

```typescript
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
  
  // Add click event listener to hide controls when clicking elsewhere
  doc.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).tagName !== 'IMG') {
      setShowImageControls(false);
      setSelectedImage(null);
    }
  });
};
```

### 3. Resize Functions

Three main functions handle the resize operations:

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
    
    // Trigger content sync
    // Similar to above...
  }
};

// Function to reset image size
const resetImageSize = () => {
  if (selectedImage) {
    // Remove explicit width/height to restore natural size
    selectedImage.style.width = '';
    selectedImage.style.height = '';
    
    // Trigger content sync
    // Similar to above...
  }
};
```

### 4. UI Component

Added a floating toolbar UI that appears when an image is selected:

```tsx
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
    
    {/* Reset button */}
    {/* Increase button */}
  </div>
)}
```

### 5. Integration with Direct Edit Mode

Updated the direct edit mode to work with image resizing:

1. Setup image controls when editing mode is active
2. Trigger content sync after image resize operations
3. Preserve image sizes during HTML updates

## Design Decisions

1. **Gradual Resizing**: Chose 10% increments for smooth, controlled resizing (not too big, not too small)
2. **Size Limits**: 
   - Minimum: 50px to prevent images from disappearing
   - Maximum: 2000px to prevent extreme sizes
3. **Reset Function**: Added reset option to quickly restore original dimensions
4. **Cursor Indicator**: Changed cursor to pointer on images to indicate they are interactive
5. **Position Above Image**: Controls appear above the image to avoid covering content

## Usage

1. Enable direct edit mode by clicking "Direct Edit On" button
2. Click on any image in the preview
3. Use the floating controls to:
   - Decrease size (- button)
   - Reset to original size (↻ button)  
   - Increase size (+ button)
4. Changes are automatically saved to the HTML content

## Technical Details

- Works in both normal and dark mode
- Controls position is calculated based on iframe and image positions
- Uses event dispatching to trigger content sync after resize
- Size changes are saved in inline style attributes (width)

## Date Added
2025-06-22
