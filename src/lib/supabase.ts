import { createClient } from '@supabase/supabase-js'

// Type-safe access to Vite environment variables
const env = (import.meta as any).env as { VITE_SUPABASE_URL?: string; VITE_SUPABASE_ANON_KEY?: string; DEV?: boolean }

const supabaseUrl = env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project')) {
  const errorMessage = 
    '⚠️ Supabase configuration missing!\n' +
    'Please create a .env file in the project root with:\n' +
    'VITE_SUPABASE_URL=your-project-url\n' +
    'VITE_SUPABASE_ANON_KEY=your-anon-key\n\n' +
    'Get these values from your Supabase project settings: https://app.supabase.com/project/_/settings/api'
  
  console.error(errorMessage)
  
  // In development, show a helpful error. In production, this will fail at build time.
  if (env.DEV) {
    throw new Error(
      'Supabase configuration is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
    )
  }
}

// Create Supabase client.
// We disable automatic token refresh to avoid CORS issues with /auth/v1/token
// during local development. If the session expires, you may need to log in again.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: false,
  },
})

