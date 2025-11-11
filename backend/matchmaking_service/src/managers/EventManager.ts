// TODO: Check how reconnections are managed -> and checking that doesn't allow connection more than once for same user. or should it allow it?
// TODO: Potentially store the notifications if they haven't been delivered to retry?
import type { FastifyReply } from 'fastify';
import type { FastifyBaseLogger } from 'fastify';
import { UserId, GameId, TournamentId, GameInviteEvent, TournamentInviteEvent } from '../types.js';

export interface InviteResponseEvent {
  event: 'InviteAccepted' | 'InviteDeclined';
  gameId: GameId;
  playerId: UserId;
}

export interface TournamentInviteResponseEvent {
  event: 'TournamentInviteAccepted' | 'TournamentInviteDeclined';
  tournamentId: TournamentId;
  from: UserId;
}

type SSEEvent =
  | GameInviteEvent
  | InviteResponseEvent
  | TournamentInviteEvent
  | TournamentInviteResponseEvent

export class EventManager {

  private log: FastifyBaseLogger;
  private connections: Map<UserId, FastifyReply>;
  private heartbeats: Map<UserId, NodeJS.Timeout>;

  constructor(log: FastifyBaseLogger) {
	  this.log = log;
	  this.connections = new Map<UserId, FastifyReply>();
	  this.heartbeats = new Map<UserId, NodeJS.Timeout>();
  }

  /**
   * Register a new SSE connection for a user
   * @param userId - The user ID connecting
   * @param reply - The Fastify reply object for SSE streaming
   */
  addConnection(userId: UserId, reply: FastifyReply) {
    this.connections.set(userId, reply);
    this.log.debug(`Event Manager: User ${userId} connected.`);
  }

  /**
   * Register a heartbeat interval for a user's SSE connection
   * @param userId - The user ID
   * @param intervalId - The interval ID from setInterval
   */
  addHeartbeat(userId: UserId, intervalId: NodeJS.Timeout) {
    this.heartbeats.set(userId, intervalId);
  }

  /**
   * Remove SSE connection when user disconnects
   * @param userId - The user ID disconnecting
   */
  removeConnection(userId: UserId) {
    // Clear heartbeat interval if exists
    const heartbeat = this.heartbeats.get(userId);
    if (heartbeat) {
      clearInterval(heartbeat);
      this.heartbeats.delete(userId);
    }

    this.connections.delete(userId);
    this.log.debug(`Event Manager: User ${userId} disconnected.`);
  }

  /**
   * Send an SSE event to a specific user
   * @param toUserId - The user ID to send the event to
   * @param event - The event data to send
   * @returns true if delivered, false if user is offline
   */
  sendEvent(toUserId: UserId, event: SSEEvent): boolean {
	const message = `data: ${JSON.stringify(event)}\n\n`;
	this.log.debug(`SENDEVENT Function: Sending SSE to ${toUserId}: ${message}`);

    const connection = this.connections.get(toUserId);

    if (!connection) {
	this.log.debug(`SENDEVENT Function: User ${toUserId} is not online, cannot send SSE`);
      return false; // User offline
    }

    // SSE format: data: {json}\n\n
    connection.raw.write(message);
    return true; // Delivered
  }

  /**
   * Broadcast an SSE event to multiple users
   * @param userIds - Array of user IDs to send the event to
   * @param event - The event data to send
   * @returns Array of user IDs who successfully received the event (were online)
   */
  broadcastEvent(userIds: UserId[], event: SSEEvent): UserId[] {
    const deliveredTo: UserId[] = [];
    this.log.debug(`Event Manager: Preparing to Broadcast to ${deliveredTo}.`);
    userIds.forEach(userId => {
      if (this.sendEvent(userId, event)) {
        deliveredTo.push(userId);
      }
    });

    return deliveredTo;
  }

  /**
   * Close all SSE connections gracefully
   * Called during server shutdown to clean up all active connections and heartbeat intervals
   */
  closeAllConnections(): void {
    this.log.info({ count: this.connections.size }, 'Closing all SSE connections');

    // Clear all heartbeat intervals
    for (const [userId, heartbeat] of this.heartbeats.entries()) {
      clearInterval(heartbeat);
      this.log.debug({ userId }, 'Heartbeat interval cleared');
    }
    this.heartbeats.clear();

    // Close all SSE connections
    for (const [userId, connection] of this.connections.entries()) {
      try {
        connection.raw.end();
        this.log.debug({ userId }, 'SSE connection closed');
      } catch (err) {
        this.log.error({ userId, err }, 'Error closing SSE connection');
      }
    }
    this.connections.clear();

    this.log.info('All SSE connections closed');
  }
}
