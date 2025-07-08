# HTML Preview Component UI Guide

## Overview

This guide provides comprehensive UI specifications and design patterns for the HTML Preview component, including all interactive elements, layout considerations, responsive behavior, and accessibility features.

## Layout Structure

### Two-Panel Split Layout
- **Left Panel (70%)**: Preview area with iframe
- **Right Panel (30%)**: HTML code editor
- **Min Height**: `calc(100vh-200px)` to ensure adequate vertical space
- **Responsive Behavior**: Stack vertically on mobile devices (< 1024px width)

### Components Hierarchy

```
Container
├── Header Area
│   ├── Title
│   └── Description
├── Main Content (Flex Row on Desktop, Column on Mobile)
│   ├── Preview Area (70% width)
│   │   ├── Preview Toolbar
│   │   │   ├── Title Label
│   │   │   └── Action Buttons
│   │   └── Preview Frame Container
│   │       ├── iframe
│   │       ├── Status Indicators (Bottom Right)
│   │       └── Upload Progress (Top Right)
│   └── HTML Code Area (30% width)
│       ├── Code Toolbar
│       │   ├── Title Label
│       │   └── Action Buttons
│       └── Code Textarea
└── Floating Components
    ├── Image Resize Controls (When an image is selected)
    └── Toast Notifications (Appear as needed)
```

## Color Scheme

### Light Mode
- **Background**: `bg-gray-50`
- **Component Background**: `bg-white`
- **Primary Button**: `bg-blue-600`, `hover:bg-blue-700`
- **Secondary Button**: `bg-gray-200`, `hover:bg-gray-300`
- **Text Primary**: `text-gray-900`
- **Text Secondary**: `text-gray-600`

### Dark Mode
- **Background**: `bg-gray-900`
- **Component Background**: `bg-gray-800`
- **Primary Button**: `bg-blue-600`, `hover:bg-blue-700`
- **Secondary Button**: `bg-gray-700`, `hover:bg-gray-600`
- **Text Primary**: `text-white`
- **Text Secondary**: `text-gray-300`

## Component Specifications

### Header Area
- **Title**: 4xl font size, bold weight, centered
- **Description**: Regular weight, max-width 2xl, centered
- **Spacing**: mb-8 (margin bottom)

### Button Styles
- **Standard Button**: 
  - Sizing: `px-3 py-1`
  - Text: `text-sm`
  - Corners: `rounded-md` or `rounded`
  - States: Include hover states for all buttons
  - Transitions: `transition-colors`

### Preview Area
- **Container**: Rounded corners, shadow, full height
- **Toolbar**: Flex container with space between, border bottom
- **iframe**: Border-0, full width and height

### Code Editor
- **Container**: Rounded corners, shadow, full height, padding
- **Textarea**: 
  - Font: Monospace
  - Size: `text-sm`
  - Full height with flex-grow
  - Border: Rounded with focus ring

### Image Resize Controls
- **Position**: Fixed, z-index 50
- **Background**: White (light) or dark gray (dark)
- **Shadow**: `shadow-lg`
- **Border**: Rounded
- **Buttons**: Icon buttons with tooltips

### Toast Notifications
- **Position**: Fixed bottom right
- **Animation**: Fade in and slide up
- **Duration**: Auto-dismiss after 3 seconds
- **Types**: Success (green), Error (red), Info (blue)

## Interaction Models

### Direct Edit Mode
- **Activation**: Toggle button in toolbar
- **Visual Indicator**: Purple button when active
- **User Feedback**: Bottom right floating indicator
- **Cursor**: Text cursor inside editable content

### Image Manipulation
- **Selection**: Click on images
- **Visual Feedback**: 
  - Pointer cursor on hover over images
  - Floating toolbar appears above selected image
- **Controls**: Decrease size (-), Reset size (↺), Increase size (+)

### Drag & Drop
- **Target Area**: Entire preview area accepts drag & drop
- **Valid Files**: Images, PDFs, DOCXs
- **Visual Feedback**: Standard browser drag indicator
- **Progress**: Upload progress indicator appears during processing

### File Upload
- **Control**: Hidden input with styled label
- **File Types**: Images, PDFs, DOCXs (defined in accept attribute)
- **User Feedback**: Toast notifications for success/error

### Export Actions
- **PDF Export**: 
  - Loading State: Button text changes to "Generating..."
  - Disabled State: During export process
  - Completion: Opens in popup window
- **DOCX Export**: Similar behavior to PDF export

## Responsive Design Specifications

### Breakpoints
- **Desktop**: >= 1024px (lg)
- **Tablet**: 768px - 1023px (md)
- **Mobile**: < 768px (sm)

### Responsive Adaptations
- **Desktop**: Two-column layout, full feature set
- **Tablet**: Two-column layout with reduced padding
- **Mobile**: 
  - Single column, stacked layout
  - Preview area above code editor
  - Simplified toolbar with potentially collapsible actions

### Touch Considerations
- **Button Sizes**: Minimum 44px touch target on mobile
- **Image Controls**: Slightly larger on touch devices
- **Drag & Drop**: Still supported but with adapted behavior for touch

## Accessibility Features

### Keyboard Navigation
- **Tab Order**: Logical progression through interactive elements
- **Button Access**: All buttons accessible via keyboard
- **Editor Access**: Code editor fully keyboard accessible

### Screen Reader Support
- **Semantic HTML**: Proper heading levels and landmark regions
- **Button Labels**: Clear text and ARIA labels for icon-only buttons
- **Status Updates**: ARIA live regions for dynamic content changes

### Focus Management
- **Focus Styles**: Visible focus indicators on all interactive elements
- **Focus Handling**: Proper focus management when opening/closing UI elements

### Color & Contrast
- **Text Contrast**: Minimum 4.5:1 for all text content
- **Interactive Elements**: Clear visual differentiation in all states
- **Dark Mode**: Full support with adequate contrast ratios

## Implementation Best Practices

### Component Modularity
- **Separate Components**: Break UI into reusable components
  - Preview Container
  - Code Editor
  - Toolbar
  - Image Controls
  - Toast System

### State Management
- **Local State**: React useState for component-specific state
- **Refs**: useRef for DOM element access (iframe, textarea)
- **Side Effects**: useEffect for synchronization and event handling

### Performance Optimizations
- **Event Debouncing**: For resize and frequent input events
- **Memoization**: For expensive renders
- **Lazy Loading**: For heavy dependencies
- **Virtualization**: For large HTML content in the editor

### Animation Guidelines
- **Transitions**: Smooth transitions for state changes
- **Performance**: Hardware-accelerated transforms and opacity
- **Duration**: Short (150-250ms) for UI feedback
- **Timing Function**: Ease-in-out for natural feeling

## Error States & Handling

### Form Validations
- **Empty State**: Prevent empty exports
- **File Size**: Warn on very large file uploads
- **Unsupported Content**: Clear error for unsupported file types

### Error Messaging
- **Toast Style**: Red background with white text
- **Position**: Bottom right, above other toasts
- **Content**: Clear error message with action when applicable

### Recovery Patterns
- **Auto-retry**: For network-related failures
- **Fallback Content**: For failed resource loading
- **State Preservation**: Maintain editor content on error

## UI Testing Checklist

- [ ] All buttons and interactive elements function as expected
- [ ] Responsive layout works at all breakpoints
- [ ] Dark mode renders correctly
- [ ] Image resize controls appear and function properly
- [ ] Toast notifications display and auto-dismiss
- [ ] Drag & drop works for all supported file types
- [ ] Export functions provide appropriate feedback
- [ ] Direct edit mode toggles correctly with visual indicators
- [ ] Focus states are visible and keyboard navigation works
- [ ] All text meets contrast requirements

## Future UI Enhancements

1. **Theme Customization**: Allow user-selectable themes
2. **Layout Preferences**: Saveable layout configurations
3. **Keyboard Shortcuts**: Advanced keyboard control options
4. **Template Library**: Quick-access templates for common HTML patterns
5. **Enhanced Controls**: Additional formatting and styling tools
6. **Preview Modes**: Device-specific preview modes (mobile, tablet, etc.)
7. **Collaboration Features**: Multi-user editing capabilities
8. **Accessibility Checker**: Built-in a11y validation tools
