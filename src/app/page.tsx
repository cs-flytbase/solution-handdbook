"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { asBlob } from "html-docx-ts";
import { saveAs } from "file-saver";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [projectId, setProjectId] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setGeneratedHtml("");
    setProjectId("");

    try {
      console.log("Sending request with prompt:", prompt);
      
      // Submit the job to start processing
      const submitResponse = await fetch(
        "/api/proxy", 
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({ prompt }),
        }
      );

      if (!submitResponse.ok) {
        throw new Error(`HTTP error! Status: ${submitResponse.status}`);
      }

      // Parse the initial response which contains the job ID
      const initialData = await submitResponse.json();
      console.log("Job submitted:", initialData);
      
      if (!initialData.jobId) {
        throw new Error("No job ID returned from server");
      }
      
      // Redirect to the document page with the job ID
      window.location.href = `/document/${initialData.jobId}`;
      return;
      
    } catch (error) {
      console.error("Error generating document:", error);
      
      // Create a fallback document on error
      const fallbackHtml = `
        <div>
          <h1>Generated Document</h1>
          <p>We encountered an issue processing your request, but we've created this document instead.</p>
          <p>Your prompt was: "${prompt}"</p>
          <hr>
          <p>Generated at: ${new Date().toISOString()}</p>
        </div>
      `;
      setGeneratedHtml(fallbackHtml);
      setProjectId(`error-${Date.now()}`);
      alert("There was an error generating the document. A fallback document has been created.");
      setLoading(false);
    }
  };
  
  // Poll for job status until it completes or fails
  const pollJobStatus = async (jobId: string) => {
    try {
      let attempts = 0;
      const maxAttempts = 60; // 2 minutes max with 2-second intervals
      
      // Function to check job status once
      const checkStatus = async (): Promise<boolean> => {
        const statusResponse = await fetch(`/api/proxy?jobId=${jobId}`);
        
        if (!statusResponse.ok) {
          throw new Error(`Error checking job status: ${statusResponse.status}`);
        }
        
        const statusData = await statusResponse.json();
        console.log(`Job status (${attempts + 1}/${maxAttempts}):`, statusData.status);
        
        if (statusData.status === 'completed') {
          // Job completed successfully
          setGeneratedHtml(statusData.html || statusData.result?.html || '');
          setProjectId(statusData.projectId || statusData.result?.projectId || `job-${jobId}`);
          setLoading(false);
          setIsSubmitted(true);
          return true; // Done polling
          
        } else if (statusData.status === 'failed') {
          // Job failed
          const errorHtml = statusData.html || `
            <div>
              <h1>Error Generating Document</h1>
              <p>We encountered an error: ${statusData.error || 'Unknown error'}</p>
              <p>Your prompt was: "${prompt}"</p>
              <hr>
              <p>Time: ${new Date().toISOString()}</p>
            </div>
          `;
          setGeneratedHtml(errorHtml);
          setProjectId(statusData.projectId || `error-${jobId}`);
          setLoading(false);
          return true; // Done polling
          
        } else if (statusData.html && statusData.html !== generatedHtml) {
          // Update the loading/processing HTML if it changed
          setGeneratedHtml(statusData.html);
        }
        
        // Still pending, continue polling
        return false;
      };
      
      // Poll until completed or max attempts reached
      while (attempts < maxAttempts) {
        const done = await checkStatus();
        if (done) return;
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between polls
      }
      
      // If we exit the loop without returning, we timed out
      throw new Error('Job processing timed out after 2 minutes');
      
    } catch (error) {
      console.error('Error polling for job status:', error);
      const timeoutHtml = `
        <div>
          <h1>Processing Timeout</h1>
          <p>Your document request took too long to process.</p>
          <p>Your prompt was: "${prompt}"</p>
          <p>Error: ${error instanceof Error ? error.message : 'Unknown error'}</p>
          <hr>
          <p>Time: ${new Date().toISOString()}</p>
        </div>
      `;
      setGeneratedHtml(timeoutHtml);
      setProjectId(`timeout-${Date.now()}`);
      setLoading(false);
    }
  };
  
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    setLoading(true);
    setGeneratedHtml("");
    setProjectId("");
    
    try {
      await handleSubmit(e);
    } catch (finalError) {
      console.error("Final error handling:", finalError);
      alert("Failed to generate document. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    setPrompt("");
    setGeneratedHtml("");
    setIsSubmitted(false);
    setProjectId("");
  };

  const downloadHtml = () => {
    if (!generatedHtml) return;
    
    try {
      // Create a blob with the HTML content
      const htmlBlob = new Blob([generatedHtml], { type: 'text/html' });
      
      // Create a download link
      const url = URL.createObjectURL(htmlBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Document-${projectId}.html`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading HTML:", error);
      alert("Failed to download document. Please try again.");
    }
  };
  
  const downloadDocx = async () => {
    if (!generatedHtml) return;
    
    try {
      // Prepare the HTML with proper pagination support
      let formattedHtml = generatedHtml;
      
      // Add pagination styles to ensure proper page breaks in DOCX
      formattedHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            @page {
              size: A4;
              margin: 20mm;
            }
            body {
              margin: 0;
              font-family: Arial, sans-serif;
            }
            /* Split content at these elements if they exist */
            h1, h2, .page-break {
              page-break-before: always;
              break-before: page;
            }
            /* Ensure these elements stay together */
            h1 + p, h2 + p, table, figure, .page-keep {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            /* Ensure proper A4 page dimensions */
            .a4-page {
              page-break-after: always;
              break-after: page;
              width: 210mm;
              padding: 20mm;
              box-sizing: border-box;
            }
            /* Last page doesn't need a break */
            .a4-page:last-child {
              page-break-after: avoid;
              break-after: avoid;
            }
          </style>
        </head>
        <body>
          ${wrapContentInPages(formattedHtml)}
        </body>
        </html>
      `;
      
      // Convert HTML to DOCX using html-docx-ts
      // The library expects HTML string directly, not an object
      const blob = await asBlob(formattedHtml, {
        orientation: 'portrait',
        margins: {
          top: 72,     // ~2cm in points
          right: 72,   // ~2cm in points
          bottom: 72,  // ~2cm in points
          left: 72,    // ~2cm in points
          header: 35,  // ~1.27cm in points
          footer: 35   // ~1.27cm in points
        }
      });
      
      // Save the DOCX file using file-saver
      // Ensure we're working with a proper Blob
      if (blob instanceof Blob) {
        saveAs(blob, `Document-${projectId || Date.now()}.docx`);
      } else {
        // Handle case where result might be Buffer instead of Blob
        const docxBlob = new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        saveAs(docxBlob, `Document-${projectId || Date.now()}.docx`);
      }
    } catch (error) {
      console.error("Error downloading DOCX:", error);
      alert("Failed to download document as DOCX. Please try again.");
    }
  };
  
  // Helper function to wrap content in pages if it isn't already
  const wrapContentInPages = (html: string): string => {
    if (!html) return '';
    
    // If content already has page dividers, return as is
    if (html.includes('class="a4-page"') || html.includes('page-break')) {
      return html;
    }
    
    // For HTML without explicit page breaks, wrap the entire content in a single page
    return `<div class="a4-page">${html}</div>`;
  };

  useEffect(() => {
    // Update iframe content when generatedHtml changes
    if (iframeRef.current && generatedHtml) {
      const iframeDocument = iframeRef.current.contentDocument;
      if (iframeDocument) {
        iframeDocument.open();
        iframeDocument.write(generatedHtml);
        iframeDocument.close();
      }
    }
  }, [generatedHtml]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-black">
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b bg-white dark:bg-gray-900 shadow-sm">
        <div className="flex items-center gap-2">
          <Image 
            src="/document-icon.svg" 
            alt="Smart Handbook System" 
            width={28} 
            height={28}
            priority
          />
          <h1 className="text-xl font-bold">Smart Handbook System</h1>
        </div>
        {isSubmitted && (
          <button
            onClick={resetChat}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            New Document
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4">
        {!isSubmitted ? (
          // Initial centered chat interface
          <div className="max-w-2xl mx-auto mt-20 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <h2 className="text-2xl font-semibold mb-6 text-center">Create Your Smart Document</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the document you want to create..."
                  className="w-full h-40 p-4 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 resize-none dark:bg-gray-700 dark:border-gray-600"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-lg font-medium text-white ${loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} transition-colors`}
              >
                {loading ? "Generating..." : "Generate Document"}
              </button>
            </form>
          </div>
        ) : (
          // Split view with chat on left and document on right
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
            {/* Chat interface on the left */}
            <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 h-[calc(100vh-10rem)] flex flex-col">
              <h3 className="text-lg font-medium mb-4">Project: {projectId}</h3>
              <div className="flex-grow overflow-auto mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="mb-4">
                  <p className="font-medium">Your Prompt:</p>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">{prompt}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={downloadHtml}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  Download as HTML
                </button>
                <button
                  onClick={downloadDocx}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                >
                  Download as DOCX
                </button>
              </div>
            </div>

            {/* Document preview on the right */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden h-[calc(100vh-10rem)]">
              <div className="bg-gray-100 dark:bg-gray-700 p-3 flex justify-between items-center">
                <h3 className="font-medium">Document Preview</h3>
              </div>
              <div className="h-[calc(100%-3rem)] overflow-hidden">
                <iframe
                  ref={iframeRef}
                  title="Document Preview"
                  className="w-full h-full border-0"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
