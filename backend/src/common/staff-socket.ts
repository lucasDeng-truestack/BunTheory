import type { IncomingMessage } from 'http';
import type { Namespace, Socket } from 'socket.io';
import {
  Auth,
  STAFF_ROLES,
  getRequestSession,
} from '../modules/auth/better-auth';
import { getAllowedOrigins, normalizeOrigin } from './allowed-origins';

/**
 * Origin rules for staff realtime feeds: our own sites only. Checked per request so
 * FRONTEND_URL(S) set after import still count. No Origin (server-side clients) is
 * allowed through to the session check, which is the real gate.
 */
const originAllowed = (origin: string | undefined) =>
  !origin || getAllowedOrigins().includes(normalizeOrigin(origin));

/**
 * Spread into @WebSocketGateway. `cors` only covers HTTP polling; `allowRequest` also
 * runs on the websocket handshake, which browsers do not hold to CORS.
 */
export const staffSocketOptions = {
  cors: {
    origin: (origin: string | undefined, cb: (err: Error | null, ok?: boolean) => void) =>
      cb(null, originAllowed(origin)),
  },
  allowRequest: (req: IncomingMessage, cb: (err: string | null | undefined, ok: boolean) => void) =>
    cb(null, originAllowed(req.headers.origin)),
};

/** The Authorization value a socket sent: `auth: { token }` or the header. */
function socketAuthorization(socket: Socket): string | undefined {
  const raw = (socket.handshake.auth as { token?: unknown } | undefined)?.token;
  const token = typeof raw === 'string' ? raw.trim() : '';
  return token ? `Bearer ${token}` : socket.handshake.headers.authorization;
}

async function isStaffSession(auth: Auth, authorization: string | undefined): Promise<boolean> {
  if (!authorization) return false;
  const session = await getRequestSession(auth, { authorization });
  return !!session && STAFF_ROLES.includes(session.user.role);
}

/** How often open connections are checked again, so a revoked or expired session is cut off. */
const RECHECK_MS = 60_000;

/**
 * Refuses a connection before it can receive anything unless it carries a staff
 * session, sent as `auth: { token }` or an Authorization header, then re-checks every
 * open connection each minute and disconnects those whose session has ended (sign out,
 * password change, expiry). Call from afterInit.
 */
export function requireStaffSession(auth: Auth, server: Namespace) {
  server.use((socket, next) => {
    void isStaffSession(auth, socketAuthorization(socket))
      .then((ok) => next(ok ? undefined : new Error('UNAUTHORIZED')))
      .catch(() => next(new Error('UNAUTHORIZED')));
  });

  const timer = setInterval(() => {
    for (const socket of server.sockets.values()) {
      void isStaffSession(auth, socketAuthorization(socket))
        .then((ok) => {
          if (!ok) socket.disconnect(true);
        })
        .catch(() => {
          // A failed check (database blip) keeps the connection; the next one decides.
        });
    }
  }, RECHECK_MS);
  timer.unref();
}
