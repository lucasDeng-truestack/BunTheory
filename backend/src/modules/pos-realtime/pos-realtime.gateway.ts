import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/pos',
})
export class PosRealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PosRealtimeGateway.name);

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
