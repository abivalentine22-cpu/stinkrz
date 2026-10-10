import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

class Denied extends Error {
  status: number;
  constructor(message, status = 403) { super(message); this.status = status; }
}
async function allowed(entities, me, other) {
  if (typeof other !== 'string' || !other || me === other) throw new Denied('Invalid recipient', 400);
  const blocks = await entities.BlockedUser.filter({ $or: [
    { blocker_email: me, blocked_email: other }, { blocker_email: other, blocked_email: me },
  ] }, undefined, 1);
  if (blocks.length) throw new Denied('Media unavailable');
  if (!(await entities.ScentProfile.filter({ user_email: other }, undefined, 1)).length) throw new Denied('Media unavailable');
}
function publicMessage(message) {
  const result = { ...message, has_private_media: !!message.media_uri };
  delete result.media_uri;
  delete result.media_url;
  return result;
}
export async function handleRequest(req, makeClient = createClientFromRequest) {
  try {
    const client = makeClient(req);
    let me;
    try { me = await client.auth.me(); } catch { throw new Denied('Unauthorized', 401); }
    if (!me?.email) throw new Denied('Unauthorized', 401);
    const entities = client.asServiceRole.entities;
    if (req.headers.get('content-type')?.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file');
      const recipient = form.get('receiver_email');
      await allowed(entities, me.email, recipient);
      if (!(file instanceof File)) throw new Denied('File required', 400);
      const image = ['image/jpeg','image/png','image/webp','image/gif'].includes(file.type);
      const video = ['video/mp4','video/webm','video/quicktime'].includes(file.type);
      if (!image && !video) throw new Denied('Unsupported media type', 400);
      if (!file.size || file.size > (video ? 50 : 10) * 1024 * 1024) throw new Denied('File too large or empty', 400);
      const { file_uri } = await client.asServiceRole.integrations.Core.UploadPrivateFile({ file });
      if (!file_uri) throw new Error('Private upload failed');
      // Recheck the block after the upload; never trust a client-supplied URI.
      await allowed(entities, me.email, recipient);
      const message = await entities.ChatMessage.create({
        sender_email: me.email, receiver_email: recipient,
        content: video ? '🎥 Sent a video' : '📸 Sent a photo',
        media_uri: file_uri, media_type: video ? 'video' : 'image',
        is_sticker: false, read: false,
      });
      return Response.json({ message: publicMessage(message) }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const { message_id } = await req.json();
    if (typeof message_id !== 'string' || !message_id) throw new Denied('Message required', 400);
    const message = (await entities.ChatMessage.filter({ id: message_id }, undefined, 1))[0];
    if (!message || ![message.sender_email, message.receiver_email].includes(me.email)) throw new Denied('Media unavailable');
    const other = message.sender_email === me.email ? message.receiver_email : message.sender_email;
    await allowed(entities, me.email, other);
    if (!message.media_uri) throw new Denied('This attachment needs privacy migration', 409);
    const { signed_url } = await client.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: message.media_uri, expires_in: 300 });
    if (!signed_url) throw new Error('Media signing failed');
    return Response.json({ signed_url, expires_in: 300 }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({ error: error instanceof Denied ? error.message : 'Media request failed' }, { status: error instanceof Denied ? error.status : 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
Deno.serve((req) => handleRequest(req));
