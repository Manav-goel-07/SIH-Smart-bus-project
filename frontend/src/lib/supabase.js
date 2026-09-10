import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
export const supabase = supabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null
export const videoBucket = import.meta.env.VITE_SUPABASE_VIDEO_BUCKET || 'bus-videos'
export const imageBucket = import.meta.env.VITE_SUPABASE_IMAGE_BUCKET || 'bus-images'
