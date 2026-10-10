import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// One-time admin migration: moves legacy public DM attachments into private
// storage and removes the public URL reference from each message. Participant
// access is preserved through the existing private-chat-media signed-URL flow.
class Rejection extends Error {
  status: number;
  constructor(message, status = 403) { super(message); this.status = status; }
}

async function all(entity, query, sort = '-created_date') {
  const result = [];
  for (let skip = 0; skip < 10000; skip += 500) {
    const page = await entity.filter(query, sort, 500, skip);
    result.push(...page);
    if (page.length < 500) return result;
  }
  throw new Rejection('Too many records to scan', 400);
}

async function fetchBlob(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30000), redirect: 'follow' });
  if (!res.ok) throw new Rejection(`Source HTTP ${res.status}`, 502);
  const blob = await res.blob();
  if (!blob.size) throw new Rejection('Source file empty', 502);
  return blob;
}

function toFile(blob, mediaType) {
  const isVideo = mediaType === 'video';
  const name = isVideo ? 'migrated.mp4' : 'migrated.jpg';
  const type = blob.type || (isVideo ? 'video/mp4' : 'image/jpeg');
  return new File([blob], name, { type });
}

export async function handleRequest(req, makeClient = createClientFromRequest) {
  try {
    const client = makeClient(req);
    let me;
    try { me = await client.auth.me(); } catch { throw new Rejection('Unauthorized', 401); }
    if (!me?.email) throw new Rejection('Unauthorized', 401);
    if (me.role !== 'admin') throw new Rejection('Admin only', 403);

    const entities = client.asServiceRole.entities;
    const integrations = client.asServiceRole.integrations;

    // Legacy messages carry a public media_url but no private media_uri.
    const rows = await all(entities.ChatMessage, { media_url: { $exists: true } });
    const legacy = rows.filter(r =>
      typeof r.media_url === 'string' && r.media_url.startsWith('http') && !r.media_uri
    );

    const migrated = [];
    const failed = [];
    const batchSize = 6;
    for (let i = 0; i < legacy.length; i += batchSize) {
      const batch = legacy.slice(i, i + batchSize);
      await Promise.allSettled(batch.map(async (msg) => {
        try {
          const blob = await fetchBlob(msg.media_url);
          const file = toFile(blob, msg.media_type);
          const { file_uri } = await integrations.Core.UploadPrivateFile({ file });
          if (!file_uri) throw new Rejection('Private upload failed', 502);
          // Swap the public reference for the private one in a single write.
          await entities.ChatMessage.updateMany(
            { id: msg.id },
            { $set: { media_uri: file_uri }, $unset: { media_url: '' } }
          );
          migrated.push({ id: msg.id, old_url: msg.media_url, media_uri: file_uri });
        } catch (error) {
          failed.push({ id: msg.id, old_url: msg.media_url, reason: error?.message || String(error) });
        }
      }));
    }

    // Verify a sample of the old public URLs so we can report whether the
    // underlying file is still fetchable at its direct storage location.
    const verifySample = migrated.slice(0, 10);
    const verified = await Promise.all(verifySample.map(async (m) => {
      try {
        const res = await fetch(m.old_url, { method: 'GET', signal: AbortSignal.timeout(15000), redirect: 'follow' });
        return { id: m.id, status: res.status, still_fetchable: res.ok };
      } catch (error) {
        return { id: m.id, status: 0, still_fetchable: false, error: error?.message };
      }
    }));

    return Response.json({
      total: legacy.length,
      migrated: migrated.length,
      failed: failed.length,
      failures: failed,
      verification: verified,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json(
      { error: error instanceof Rejection ? error.message : 'Migration failed' },
      { status: error instanceof Rejection ? error.status : 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

Deno.serve((req) => handleRequest(req));