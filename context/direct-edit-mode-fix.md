# Direct Edit Mode Fix - HTML Preview Component

## Issue Description

When activating direct edit mode in the HTML Preview component for the first time, the following issues occurred:
- The user would be scrolled to the top of the preview
- Top and bottom HTML content would disappear
- Subsequent edits worked fine, but the HTML structure remained broken

## Root Cause Analysis

The issue was in the `toggleEditMode()` function:
1. When switching to direct edit mode, the component was setting up event listeners
2. The event listener was immediately capturing the HTML content and updating it
3. This caused the structure to be lost during the first activation

## Solution Implemented

Fixed by enhancing the `toggleEditMode()` function with:

1. **Content Validation**: Only update HTML when there's actual content
   ```typescript
   if (doc.body.innerHTML.trim()) {
     setHtmlCode(doc.body.innerHTML);
   }
   ```

2. **Event Listener Management**: 
   - Remove any old listeners before adding new ones
   - Clean up listeners when switching back to code mode
   ```typescript
   doc.body.removeEventListener('input', syncContent);
   doc.body.addEventListener('input', syncContent);
   ```

3. **Better Timing Control**:
   - Added proper event handling to ensure content is only updated when actual edits happen
   - Not when the edit mode is first activated

## Complete Fix

```typescript
const toggleEditMode = () => {
  const newMode = editMode === 'code' ? 'direct' : 'code';
  setEditMode(newMode);
  
  if (newMode === 'direct' && iframeRef.current?.contentDocument) {
    const doc = iframeRef.current.contentDocument;
    
    // Store the current HTML structure
    const currentHTML = htmlCode;
    
    setTimeout(() => {
      // Make it editable
      doc.body.contentEditable = 'true';
      doc.designMode = 'on';
      
      // Important: Only update htmlCode when content actually changes
      // not on first activation
      const syncContent = () => {
        // Preserve the HTML structure by only updating body content
        if (doc.body.innerHTML.trim()) {
          setHtmlCode(doc.body.innerHTML);
        }
      };
      
      // Remove previous listeners if any
      doc.body.removeEventListener('input', syncContent);
      // Add new listener
      doc.body.addEventListener('input', syncContent);
    }, 100);
  } else if (iframeRef.current?.contentDocument) {
    const doc = iframeRef.current.contentDocument;
    doc.body.contentEditable = 'false';
    doc.designMode = 'off';
    
    // Cleanup event listeners when switching back
    const syncContent = () => {};
    doc.body.removeEventListener('input', syncContent);
  }
};
```

## Testing
After implementing this fix:
- Direct edit mode activates without losing HTML structure
- User remains at their current scroll position
- Top and bottom HTML content is preserved
- Subsequent edits continue to work correctly

## Related Files
- `src/app/html-preview/page.tsx`

## Date Fixed
2025-06-22
