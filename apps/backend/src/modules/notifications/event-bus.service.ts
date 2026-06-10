import { Injectable } from '@nestjs/common';
import { DomainEventPayload, DomainEventType } from './events/domain-event.type';

type EventHandler = (payload: DomainEventPayload) => Promise<void>;

@Injectable()
export class EventBusService {
  private readonly handlers = new Map<DomainEventType, EventHandler[]>();

  subscribe(eventType: DomainEventType, handler: EventHandler): void {
    const existing = this.handlers.get(eventType) ?? [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
  }

  async publish(eventType: DomainEventType, payload: DomainEventPayload): Promise<void> {
    const handlers = this.handlers.get(eventType) ?? [];
    await Promise.all(handlers.map((handler) => handler(payload)));
  }
}
