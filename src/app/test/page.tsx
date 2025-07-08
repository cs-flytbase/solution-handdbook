'use client';

import React, { useState } from 'react';
import MacOSDock from '../../../components/ui/mac-os-dock';

// Sample app data with actual macOS-style icons
const sampleApps = [
  { 
    id: 'finder', 
    name: 'Finder', 
    icon: 'https://cdn.jim-nielsen.com/macos/1024/finder-2021-09-10.png?rf=1024' 
  },
  { 
    id: 'calculator', 
    name: 'Calculator', 
    icon: 'https://cdn.jim-nielsen.com/macos/1024/calculator-2021-04-29.png?rf=1024' 
  },
  { 
    id: 'terminal', 
    name: 'Terminal', 
    icon: 'https://cdn.jim-nielsen.com/macos/1024/terminal-2021-06-03.png?rf=1024' 
  },
  { 
    id: 'mail', 
    name: 'Mail', 
    icon: 'https://cdn.jim-nielsen.com/macos/1024/mail-2021-05-25.png?rf=1024' 
  },
  { 
    id: 'notes', 
    name: 'Notes', 
    icon: 'https://cdn.jim-nielsen.com/macos/1024/notes-2021-05-25.png?rf=1024' 
  },
  { 
    id: 'safari', 
    name: 'Safari', 
    icon: 'https://cdn.jim-nielsen.com/macos/1024/safari-2021-06-02.png?rf=1024' 
  },
  { 
    id: 'photos', 
    name: 'Photos', 
    icon: 'https://cdn.jim-nielsen.com/macos/1024/photos-2021-05-28.png?rf=1024' 
  },
  { 
    id: 'music', 
    name: 'Music', 
    icon: 'https://cdn.jim-nielsen.com/macos/1024/music-2021-05-25.png?rf=1024' 
  },
  { 
    id: 'calendar', 
    name: 'Calendar', 
    icon: 'https://cdn.jim-nielsen.com/macos/1024/calendar-2021-04-29.png?rf=1024' 
  },
];

export default function TestPage() {
  const [openApps, setOpenApps] = useState<string[]>(['finder', 'safari']);

  const handleAppClick = (appId: string) => {
    console.log('App clicked:', appId);
    
    // Toggle app in openApps array
    setOpenApps(prev => 
      prev.includes(appId) 
        ? prev.filter(id => id !== appId)
        : [...prev, appId]
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-black">
      <h1 className="text-3xl font-bold text-white mb-8">Mac OS Dock Demo</h1>
      <p className="text-gray-300 mb-12">Click on an app icon to toggle its "open" state</p>
      
      <div className="flex-grow flex items-center justify-center w-full">
        {/* The Dock Component */}
        <MacOSDock
          apps={sampleApps}
          onAppClick={handleAppClick}
          openApps={openApps}
        />
      </div>
    </div>
  );
}
