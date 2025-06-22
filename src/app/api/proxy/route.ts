import { NextResponse, NextRequest } from 'next/server';
import {
  createDocumentJob,
  getDocumentJob,
  updateDocumentJob,
  cleanupOldJobs
} from '@/utils/supabase';

// Run background cleanup once per day
let lastCleanupTime = 0;
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

// Cleanup old jobs periodically (every 15 minutes)
setInterval(async () => {
  if (Date.now() - lastCleanupTime > CLEANUP_INTERVAL) {
    await cleanupOldJobs();
    lastCleanupTime = Date.now();
  }
}, 15 * 60 * 1000);

export async function POST(request: NextRequest) {
  try {
    // Check if this is a job status check
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    // If jobId is provided, return the status of that job
    if (jobId) {
      return checkJobStatus(jobId);
    }

    // This is a new job submission
    const data = await request.json();
    const prompt = data.prompt || "No prompt provided";
    
    // Create a new job in the database
    const job = await createDocumentJob(prompt);
    
    if (!job) {
      throw new Error('Failed to create job record');
    }
    
    // Start processing the job in the background (don't await)
    processJob(job.job_id, data);
    
    // Return immediately with the job ID
    return NextResponse.json({
      jobId: job.job_id,
      status: 'pending',
      message: 'Your request is being processed',
      html: createLoadingHtml(prompt),
      projectId: `job-${job.job_id}`
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      html: createFallbackHtml("Error processing your request"),
      projectId: `error-${Date.now()}`
    });
  }
}

async function processJob(jobId: string, data: any) {
  try {
    console.log(`Processing job ${jobId}...`);
    
    // Update job status to processing
    await updateDocumentJob(jobId, {
      status: 'processing'
    });
    
    // Call the n8n webhook
    const response = await fetch(
      "https://srv-roxra.app.n8n.cloud/webhook/5bf5071c-57f4-4219-b7ad-414d516be1de",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }

    const responseText = await response.text();
    
    try {
      // Try to parse as JSON
      const jsonData = JSON.parse(responseText);
      
      // Update job with completed status and result
      await updateDocumentJob(jobId, {
        status: 'completed',
        html: jsonData.html,
        project_id: jsonData.projectId,
        result: jsonData
      });
      
      console.log(`Job ${jobId} completed successfully`);
    } catch (e) {
      // Not valid JSON, but might be HTML
      if (isHtmlContent(responseText)) {
        await updateDocumentJob(jobId, {
          status: 'completed',
          html: responseText,
          project_id: `html-${jobId}`,
          result: {
            html: responseText,
            projectId: `html-${jobId}`
          }
        });
        console.log(`Job ${jobId} completed with HTML content`);
      } else {
        // Not valid JSON or HTML
        throw new Error('Invalid response format');
      }
    }
  } catch (error) {
    console.error(`Job ${jobId} failed:`, error);
    
    // Get the current job data to access the prompt
    const job = await getDocumentJob(jobId);
    
    if (job) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const fallbackHtml = createFallbackHtml(job.prompt, errorMessage);
      
      // Update job with failed status
      await updateDocumentJob(jobId, {
        status: 'failed',
        error: errorMessage,
        html: fallbackHtml,
        project_id: `error-${jobId}`,
        result: {
          html: fallbackHtml,
          projectId: `error-${jobId}`
        }
      });
    }
  }
}

async function checkJobStatus(jobId: string) {
  const job = await getDocumentJob(jobId);
  
  if (!job) {
    return NextResponse.json({
      error: 'Job not found',
      status: 'not_found'
    }, { status: 404 });
  }
  
  if (job.status === 'pending' || job.status === 'processing') {
    return NextResponse.json({
      status: job.status,
      message: 'Your request is still being processed',
      html: job.html || createLoadingHtml(job.prompt),
      projectId: job.project_id || `pending-${jobId}`
    });
  }
  
  if (job.status === 'failed') {
    return NextResponse.json({
      status: 'failed',
      error: job.error || 'Unknown error',
      html: job.html || createFallbackHtml(job.prompt, job.error || 'Unknown error'),
      projectId: job.project_id || `failed-${jobId}`
    });
  }
  
  // Job completed successfully
  return NextResponse.json({
    status: 'completed',
    result: job.result,
    html: job.html,
    projectId: job.project_id || `completed-${jobId}`
  });
}

function createFallbackHtml(prompt: string = "", errorMessage: string = "") {
  return `
    <div>
      <h1>Sample Document</h1>
      <p>This is a fallback document generated because we couldn't process your request properly.</p>
      ${errorMessage ? `<p><strong>Error:</strong> ${errorMessage}</p>` : ''}
      <p>Your prompt was: "${prompt}"</p>
      <hr>
      <p>Generated at: ${new Date().toLocaleString()}</p>
    </div>
  `;
}

// Helper function to check if a string is HTML content
function isHtmlContent(text: string): boolean {
  return text.trim().startsWith('<!DOCTYPE') || 
         text.trim().startsWith('<html') || 
         (text.includes('<') && text.includes('>'));
}

// Function to generate a unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// Function to create loading HTML content
function createLoadingHtml(prompt: string = ""): string {
  return `
    <div>
      <h1>Processing Your Request</h1>
      <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #3498db; background-color: #f8f9fa;">
        <p>We're working on generating your document from the prompt:</p>
        <p><em>"${prompt}"</em></p>
      </div>
      
      <div style="margin: 20px 0; text-align: center;">
        <div style="display: inline-block; width: 50px; height: 50px; border: 5px solid #f3f3f3; 
                    border-top: 5px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <p>This may take up to 2 minutes to complete...</p>
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </div>
      
      <p>The system is working on your document. Please wait while we process your request.</p>
      <hr>
      <p>Started at: ${new Date().toLocaleString()}</p>
    </div>
  `;
}

// Handle preflight OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
