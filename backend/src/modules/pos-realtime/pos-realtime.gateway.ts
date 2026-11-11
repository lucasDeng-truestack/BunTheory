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

/** Weekend Grills POS realtime feed. Staff sessions only (the POS sends `auth: { token }`). */
@WebSocketGateway({
  ...staffSocketOptions,
  namespace: '/pos',
})
export class PosRealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Namespace;

  private readonly logger = new Logger(PosRealtimeGateway.name);

  constructor(@Inject(BETTER_AUTH) private readonly auth: Auth) {}

  afterInit(server: Namespace) {
    requireStaffSession(this.auth, server);
  }

  handleConnection(client: Socket) {
    this.logger.log(`POS client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`POS client disconnected: ${client.id}`);
  }

  broadcastOrderCreated(order: unknown) {
    this.server.emit('pos.order.created', order);
  }

  broadcastOrderUpdated(order: unknown) {
    this.server.emit('pos.order.updated', order);
  }
}
