# Supabase Integration

This document explains how to set up the Supabase integration for the Smart Handbook System's asynchronous job processing.

## Environment Setup

Create a `.env.local` file in the root of your project with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://vlhkfhioidnjnqvahhml.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsaGtmaGlvaWRuam5xdmFoaG1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0OTgyODgsImV4cCI6MjA2MTA3NDI4OH0.lY07bnfls4BjLFQIAreb7Gxu5T5NQpO7GBd0JPGAuHo
```

## Table Structure

We've created a `document_jobs` table in Supabase with the following structure:

```sql
CREATE TABLE public.document_jobs (
  job_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  prompt TEXT NOT NULL,
  html TEXT,
  project_id TEXT,
  error TEXT,
  result JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

## How It Works

1. When a user submits a prompt, a new job is created in the Supabase database with a status of "pending".
2. The system returns the job ID to the client immediately, which begins polling for updates.
3. The background process updates the job status to "processing" and sends the request to the n8n webhook.
4. When the webhook returns, the job is updated with status "completed" or "failed", along with the results.
5. The client polling detects the status change and renders the result accordingly.

## Benefits of Using Supabase

- **Persistence:** Jobs persist even if the server restarts
- **Scalability:** Works seamlessly across multiple server instances
- **Observability:** Easily monitor and debug job processing using Supabase UI
- **Cleanup:** Automated job cleanup after 7 days

## Helper Functions

The `src/utils/supabase.ts` file contains utility functions for:

- Creating jobs
- Retrieving job status
- Updating job details
- Cleaning up old jobs
