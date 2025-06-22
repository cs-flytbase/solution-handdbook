"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getDocumentJob, updateDocumentJob, DocumentJob } from '@/utils/supabase';
import { saveAs } from 'file-saver';
// Use require for html-docx-js as it doesn't have proper TypeScript types
const htmlDocx = require('html-docx-js');

export default function DocumentPage({ params }: { params: { id: string } }) {
  const jobId = params.id;
  const [documentJob, setDocumentJob] = useState<DocumentJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [messages, setMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const router = useRouter();

  // Fetch the document job on load
  useEffect(() => {
    async function fetchJob() {
      setLoading(true);
      try {
        const job = await getDocumentJob(jobId);
        if (job) {
          setDocumentJob(job);
          
          // If job has prompt, add it to messages
          if (job.prompt) {
            setMessages([{ role: 'user', content: job.prompt }]);
          }
        } else {
          setError('Document not found');
        }
      } catch (err) {
        setError('Failed to load document');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchJob();
  }, [jobId]);

  // Update iframe content when HTML changes
  useEffect(() => {
    if (iframeRef.current && documentJob?.html && viewMode === 'preview') {
      const iframeDoc = iframeRef.current.contentDocument;
      if (iframeDoc) {
        // Add base CSS for A4 page simulation with improved typography and spacing
        const baseStyles = `
          body {
            margin: 0;
            padding: 0;
            font-family: 'Arial', 'Helvetica', sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #e0e0e0;
          }
          .a4-page {
            width: 21cm;
            min-height: 29.7cm;
            padding: 2.5cm;
            margin: 1cm auto;
            background: white;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            box-sizing: border-box;
            page-break-after: always;
            overflow-wrap: break-word;
          }
          
          /* Typography improvements */
          h1, h2, h3, h4, h5, h6 {
            margin-top: 1.5em;
            margin-bottom: 0.8em;
            line-height: 1.3;
          }
          h1 { font-size: 2em; }
          h2 { font-size: 1.75em; }
          h3 { font-size: 1.5em; }
          h4 { font-size: 1.25em; }
          h5 { font-size: 1.1em; }
          h6 { font-size: 1em; }
          
          p, ul, ol, dl, table {
            margin-top: 0;
            margin-bottom: 1.2em;
          }
          
          /* List spacing */
          ul, ol {
            padding-left: 2em;
          }
          
          li {
            margin-bottom: 0.5em;
          }
          
          /* Table styling */
          table {
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 2em;
          }
          
          th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
          }
          
          th {
            background-color: #f7f7f7;
          }
          
          /* Code blocks */
          pre, code {
            font-family: monospace;
            background-color: #f7f7f7;
            border-radius: 3px;
          }
          
          pre {
            padding: 12px;
            overflow-x: auto;
            margin-bottom: 1.5em;
          }
          
          code {
            padding: 2px 5px;
          }
          
          @media print {
            .a4-page {
              margin: 0;
              box-shadow: none;
              page-break-after: always;
            }
          }
        `;

        // Create styles
        const styleEl = iframeDoc.createElement('style');
        styleEl.textContent = baseStyles;
        
        // Create wrapper and insert HTML
        const wrapperHtml = `
          <div class="a4-container">
            <div class="a4-page">${documentJob.html}</div>
          </div>
        `;
        
        iframeDoc.open();
        iframeDoc.write('<!DOCTYPE html><html><head></head><body></body></html>');
        iframeDoc.close();
        
        iframeDoc.head.appendChild(styleEl);
        iframeDoc.body.innerHTML = wrapperHtml;
      }
    }
  }, [documentJob?.html, viewMode]);

  // Handle chat submissions
  const handleMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !documentJob) return;

    // Add user message to chat
    const newMessages = [...messages, { role: 'user' as const, content: prompt }];
    setMessages(newMessages);
    
    // Clear input
    setPrompt('');
    
    try {
      // Call the webhook with the prompt and project_id
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          projectId: documentJob.project_id || `job-${documentJob.job_id}`
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to process message');
      }
      
      // Get the response as JSON
      const data = await response.json();
      
      // If we get a new job ID, it means the system is processing the request
      if (data.jobId) {
        // Poll for the job completion
        await pollJobStatus(data.jobId, newMessages);
      } else {
        // Direct response without job
        setMessages([...newMessages, {
          role: 'assistant' as const,
          content: data.html || 'Response received without HTML content.'
        }]);
        
        if (data.html) {
          const updatedJob = { ...documentJob, html: data.html };
          setDocumentJob(updatedJob as DocumentJob);
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setMessages([...newMessages, {
        role: 'assistant',
        content: 'Sorry, there was an error processing your request.'
      }]);
    }
  };

  // Poll for job status until completion
  const pollJobStatus = async (
    newJobId: string, 
    currentMessages: Array<{role: 'user' | 'assistant', content: string}>
  ) => {
    const maxAttempts = 60; // 2 minutes with 2-second intervals
    let attempts = 0;
    
    const checkStatus = async (): Promise<boolean> => {
      try {
        const response = await fetch(`/api/proxy?jobId=${newJobId}`);
        if (!response.ok) {
          throw new Error('Failed to check job status');
        }
        
        const data = await response.json();
        
        if (data.status === 'completed') {
          // Job completed successfully, update the document job
          const updatedJob = await getDocumentJob(newJobId);
          if (updatedJob) {
            setDocumentJob(updatedJob);
            setMessages([...currentMessages, {
              role: 'assistant' as const,
              content: 'Document updated successfully.'
            }]);
          }
          return true;
        } else if (data.status === 'failed') {
          // Job failed
          setMessages([...currentMessages, {
            role: 'assistant' as const,
            content: `Error: ${data.error || 'Unknown error'}`
          }]);
          return true;
        }
        
        return false;
      } catch (error) {
        console.error('Error checking job status:', error);
        setMessages([...currentMessages, {
          role: 'assistant' as const,
          content: 'Error checking job status'
        }]);
        return true;
      }
    };
    
    // Poll until completed or max attempts reached
    while (attempts < maxAttempts) {
      const done = await checkStatus();
      if (done) return;
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // If we exit the loop without returning, we timed out
    setMessages([...currentMessages, {
      role: 'assistant' as const,
      content: 'Request timed out. Please try again.'
    }]);
  };

  // Export document as DOCX
  const exportToDocx = () => {
    if (!documentJob?.html) return;

    try {
      // Create comprehensive styling for the DOCX output
      const docxStylesheet = `
        body {
          margin: 0;
          font-family: 'Calibri', 'Arial', sans-serif;
          font-size: 12pt;
          line-height: 1.6;
          color: #333333;
        }
        /* Typography styles */
        h1, h2, h3, h4, h5, h6 {
          margin-top: 2.0em;
          margin-bottom: 1.0em;
          line-height: 1.3;
          font-weight: bold;
          color: #333333;
        }
        h1 { font-size: 20pt; }
        h2 { font-size: 18pt; }
        h3 { font-size: 16pt; }
        h4 { font-size: 14pt; }
        h5 { font-size: 12pt; font-style: italic; }
        h6 { font-size: 12pt; font-style: italic; font-weight: normal; }
        
        p {
          margin-top: 0;
          margin-bottom: 1.2em;
        }
        
        ul, ol {
          margin-top: 1em;
          margin-bottom: 1em;
          padding-left: 2.5em;
        }
        
        li {
          margin-bottom: 0.7em;
        }
        
        table {
          width: 100%;
          margin: 2em 0;
          border-collapse: collapse;
          border: 1px solid #dee2e6;
        }
        
        th, td {
          border: 1px solid #dee2e6;
          padding: 10pt;
          vertical-align: top;
        }
        
        th {
          background-color: #f2f2f2;
        }
        
        /* Spacing and page breaks */
        p {
          orphans: 3;
          widows: 3;
        }
      `;
      
      // Wrap HTML in A4 page containers for proper pagination
      const wrappedHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            @page {
              size: A4;
              margin: 25mm;
            }
            body {
              font-family: 'Calibri', 'Arial', sans-serif;
              font-size: 12pt;
              line-height: 1.6;
              color: #333333;
              margin: 0;
              padding: 0;
            }
            
            /* Typography styling */
            h1, h2, h3, h4, h5, h6 {
              margin-top: 1.5em;
              margin-bottom: 0.8em;
              line-height: 1.3;
              page-break-after: avoid;
              break-after: avoid;
            }
            
            p, ul, ol, table {
              margin-bottom: 1em;
            }
            
            ul, ol {
              padding-left: 2.5em;
            }
            
            li {
              margin-bottom: 0.5em;
            }
            
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 1.5em 0;
            }
            
            th, td {
              border: 1px solid #ddd;
              padding: 8pt;
            }
            
            .a4-page {
              page-break-after: always;
            }
            
            .a4-page:last-child {
              page-break-after: avoid;
            }
            
            /* Ensure paragraphs don't break awkwardly */
            p {
              orphans: 3;
              widows: 3;
            }
            ${docxStylesheet}
          </style>
        </head>
        <body>
          <div class="a4-page">
            ${documentJob.html}
          </div>
        </body>
        </html>
      `;
      
      // Convert HTML to DOCX blob with improved styling
      const docOptions: any = {
        orientation: 'portrait',
        margins: { 
          top: '2.5cm',
          right: '2.5cm',
          bottom: '2.5cm',
          left: '2.5cm'
        }
      };

      const blob = htmlDocx.asBlob(wrappedHtml, docOptions);
      
      // Download the DOCX file
      const filename = `document-${jobId}.docx`;
      saveAs(blob, filename);
    } catch (error) {
      console.error('Error exporting to DOCX:', error);
      alert('Error exporting document. Please try again.');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading document...</div>;
  }

  if (error || !documentJob) {
    return <div className="flex items-center justify-center min-h-screen text-red-500">{error || 'Document not found'}</div>;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Chat panel - Left side */}
      <div className="w-1/3 h-full bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Chat</h2>
        </div>
        
        {/* Messages container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`p-3 rounded-lg ${
                msg.role === 'user' 
                  ? 'bg-blue-100 ml-4' 
                  : 'bg-gray-100 mr-4'
              }`}
            >
              <div className="font-semibold mb-1">
                {msg.role === 'user' ? 'You' : 'Assistant'}
              </div>
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          ))}
        </div>
        
        {/* Input area */}
        <div className="p-4 border-t border-gray-200">
          <form onSubmit={handleMessageSubmit} className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your message..."
            />
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Send
            </button>
          </form>
        </div>
      </div>

      {/* Document display - Right side */}
      <div className="w-2/3 h-full flex flex-col">
        {/* Toolbar */}
        <div className="bg-white p-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode('preview')}
              className={`px-4 py-2 rounded-lg ${viewMode === 'preview' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Preview
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`px-4 py-2 rounded-lg ${viewMode === 'code' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              HTML Code
            </button>
          </div>
          <button
            onClick={exportToDocx}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <span className="mr-1">Export DOCX</span>
          </button>
        </div>
        
        {/* Content area */}
        <div className="flex-1 overflow-auto">
          {viewMode === 'preview' ? (
            <iframe 
              ref={iframeRef}
              className="w-full h-full border-0" 
              title="Document preview"
            />
          ) : (
            <div className="p-4 h-full">
              <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-auto h-full">
                <code>{documentJob.html}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
