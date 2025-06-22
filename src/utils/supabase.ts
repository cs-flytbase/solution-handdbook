import { createClient } from '@supabase/supabase-js';

// Supabase client configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a singleton instance of the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type definitions for our document jobs
export interface DocumentJob {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  prompt: string;
  html?: string;
  project_id?: string;
  error?: string;
  result?: any;
  created_at: string;
  updated_at: string;
}

// Helper functions for working with document jobs

/**
 * Create a new document generation job
 */
export async function createDocumentJob(prompt: string): Promise<DocumentJob | null> {
  const { data, error } = await supabase
    .from('document_jobs')
    .insert({ prompt })
    .select()
    .single();

  if (error) {
    console.error('Error creating document job:', error);
    return null;
  }

  return data;
}

/**
 * Get a document job by ID
 */
export async function getDocumentJob(jobId: string): Promise<DocumentJob | null> {
  const { data, error } = await supabase
    .from('document_jobs')
    .select('*')
    .eq('job_id', jobId)
    .single();

  if (error) {
    console.error('Error retrieving document job:', error);
    return null;
  }

  return data;
}

/**
 * Update a document job's status and data
 */
export async function updateDocumentJob(
  jobId: string, 
  updates: Partial<Omit<DocumentJob, 'job_id' | 'created_at' | 'updated_at'>>
): Promise<boolean> {
  const { error } = await supabase
    .from('document_jobs')
    .update(updates)
    .eq('job_id', jobId);

  if (error) {
    console.error('Error updating document job:', error);
    return false;
  }

  return true;
}

/**
 * Clean up old jobs (e.g., jobs older than 7 days)
 */
export async function cleanupOldJobs(daysToKeep: number = 7): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  const { count, error } = await supabase
    .from('document_jobs')
    .delete()
    .lt('created_at', cutoffDate.toISOString())
    .select('count');

  if (error) {
    console.error('Error cleaning up old jobs:', error);
    return 0;
  }

  return count || 0;
}
