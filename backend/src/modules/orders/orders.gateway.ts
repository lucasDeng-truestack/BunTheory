import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

/**
 * Storefront order realtime feed for the admin live board (KDS).
 * Emits `order.created` / `order.updated` to all connected admin clients.
 */
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/orders',
})
export class OrdersGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OrdersGateway.name);

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
