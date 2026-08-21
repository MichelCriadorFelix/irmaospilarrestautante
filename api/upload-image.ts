import { createClient } from '@supabase/supabase-js';

// Vercel serverless function (Node runtime). Images are hosted on Supabase
// Storage — same pattern already used in the Sensação Gourmet app, reusing
// that account's Supabase project but with this app's own bucket. Runs
// server-side because it needs the Supabase service-role key, which
// bypasses bucket policies and must never reach the browser.
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY is not configured');
  }
  return createClient(url, serviceKey);
}

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'irmaos-pilar-images';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { path, contentType, base64 } = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (!path || typeof path !== 'string' || !base64 || typeof base64 !== 'string') {
      res.status(400).json({ error: 'path and base64 are required' });
      return;
    }

    const buffer = Buffer.from(base64, 'base64');
    // A small safety cap — the client already compresses images to ~800px
    // before sending, so a legitimate upload is always well under this.
    if (buffer.byteLength > 10 * 1024 * 1024) {
      res.status(413).json({ error: 'Image too large' });
      return;
    }

    const supabase = getSupabaseAdmin();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: contentType || 'image/jpeg', upsert: true });

    if (uploadError) {
      res.status(500).json({ error: uploadError.message });
      return;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    res.status(200).json({ url: data.publicUrl });
  } catch (err: any) {
    console.error('upload-image error', err);
    res.status(500).json({ error: err?.message || 'Internal error' });
  }
}
