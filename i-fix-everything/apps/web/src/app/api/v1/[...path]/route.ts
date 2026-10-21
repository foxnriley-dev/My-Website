import { handleApiRequest } from '@ife/server';

// The canonical versioned API for web, iOS and Android. Not a server action:
// native clients call these endpoints directly over HTTPS.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const handler = (req: Request) => handleApiRequest(req);
export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
