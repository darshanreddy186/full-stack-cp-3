import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
)

// --- TYPE DEFINITIONS ---

export type DiaryEntry = {
  id: string
  user_id: string
  title: string
  content: string
  mood_score: number
  tags: string[]
  created_at: string
  updated_at: string
}

export type CommunityPost = {
  id: string
  user_id: string
  title: string
  content: string
  is_anonymous: boolean
  category: string
  created_at: string
}

export type CommunityResponse = {
  id: string
  post_id: string
  user_id: string
  content: string
  is_anonymous: boolean
  created_at: string
}

export type UserProfile = {
  id: string
  display_name: string | null
  age_range: string | null
  preferred_activities: string[]
  wellness_goals: string[]
  created_at: string
  updated_at: string
}


// --- STORAGE HELPER FUNCTION ---

/**
 * Uploads a file to a specified Supabase storage bucket.
 * @param file The file to upload.
 * @param bucketName The name of the storage bucket (e.g., 'diary_images').
 * @returns The public URL of the uploaded file.
 * @throws An error if the upload fails.
 */
export const uploadImage = async (file: File, bucketName: string): Promise<string> => {
  // 1. Create a unique file name to avoid overwriting files
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}-${Date.now()}.${fileExt}`;
  
  // 2. Upload the file to the specified bucket
  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(fileName, file);

  if (uploadError) {
    console.error('Error uploading file:', uploadError);
    throw uploadError;
  }

  // 3. Get the public URL of the newly uploaded file
  const { data } = supabase.storage
    .from(bucketName)
    .getPublicUrl(fileName);

  if (!data || !data.publicUrl) {
    throw new Error('Could not get public URL for the uploaded file.');
  }

  return data.publicUrl;
};

// **NEW FUNCTION TO ADD**
// This function extracts the file name from the public URL and deletes it from the bucket.
export const deleteImage = async (publicUrl: string): Promise<void> => {
  try {
    // A typical Supabase public URL looks like:
    // https://<project-ref>.supabase.co/storage/v1/object/public/<bucket-name>/<file-name>
    const urlParts = publicUrl.split('/');
    const bucket = urlParts[urlParts.length - 2];
    const fileName = urlParts[urlParts.length - 1];

    if (!bucket || !fileName) {
      throw new Error("Could not parse bucket or file name from URL.");
    }
    
    const { error } = await supabase.storage.from(bucket).remove([fileName]);
    
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("Error deleting image from Supabase Storage:", error);
    // We don't re-throw the error here to allow the image to be removed 
    // from the editor even if the storage deletion fails. You could add
    // more robust error handling here if needed.
  }
};