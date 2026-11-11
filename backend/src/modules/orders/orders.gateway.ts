import { Inject, Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Namespace, Socket } from 'socket.io';
import { requireStaffSession, staffSocketOptions } from '../../common/staff-socket';
import { Auth, BETTER_AUTH } from '../auth/better-auth';

/**
 * Storefront order realtime feed for the admin live board (KDS).
 * Orders carry customer names, phones and addresses, so only a signed-in staff
 * session may connect: send it as `auth: { token }` (or an Authorization header).
 * Emits `order.created` / `order.updated` to every connected staff client.
 */
@WebSocketGateway({
  ...staffSocketOptions,
  namespace: '/orders',
})
export class OrdersGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Namespace;

  private readonly logger = new Logger(OrdersGateway.name);

  constructor(@Inject(BETTER_AUTH) private readonly auth: Auth) {}

  /** Refuse the connection before it can receive anything unless it is a staff session. */
  afterInit(server: Namespace) {
    requireStaffSession(this.auth, server);
  }

  handleConnection(client: Socket) {
    this.logger.log(`Orders board client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Orders board client disconnected: ${client.id}`);
  }

  broadcastOrderCreated(order: unknown) {
    this.server?.emit('order.created', order);
  }

  broadcastOrderUpdated(order: unknown) {
    this.server?.emit('order.updated', order);
  }
}
