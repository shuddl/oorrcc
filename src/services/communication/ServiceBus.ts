import { EventEmitter } from '../../lib/events';
import { logger } from '../../utils/logger';

interface ServiceMessage {
  type: string;
  payload: any;
  source: string;
  timestamp: number;
}

interface ServiceSubscription {
  service: string;
  messageType: string;
  callback: (message: ServiceMessage) => void;
}

export class ServiceBus extends EventEmitter {
  private static instance: ServiceBus;
  private subscriptions: ServiceSubscription[] = [];
  private messageQueue: ServiceMessage[] = [];
  private isProcessing = false;

  private constructor() {
    super();
    this.startMessageProcessing();
  }

  static getInstance(): ServiceBus {
    if (!ServiceBus.instance) {
      ServiceBus.instance = new ServiceBus();
    }
    return ServiceBus.instance;
  }

  publish(message: Omit<ServiceMessage, 'timestamp'>) {
    const fullMessage = {
      ...message,
      timestamp: Date.now()
    };

    this.messageQueue.push(fullMessage);
    this.processMessageQueue();
  }

  subscribe(
    service: string,
    messageType: string,
    callback: (message: ServiceMessage) => void
  ): () => void {
    const subscription = { service, messageType, callback };
    this.subscriptions.push(subscription);

    return () => {
      this.subscriptions = this.subscriptions.filter(s => s !== subscription);
    };
  }

  private async processMessageQueue() {
    if (this.isProcessing || this.messageQueue.length === 0) return;

    this.isProcessing = true;
    
    try {
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        if (!message) continue;

        const relevantSubscriptions = this.subscriptions.filter(
          sub => 
            (sub.messageType === '*' || sub.messageType === message.type) &&
            (sub.service === '*' || sub.service === message.source)
        );

        for (const subscription of relevantSubscriptions) {
          try {
            await subscription.callback(message);
          } catch (error) {
            logger.error('Error processing message', { error, message });
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private startMessageProcessing() {
    setInterval(() => {
      if (this.messageQueue.length > 0) {
        this.processMessageQueue();
      }
    }, 100);
  }
}
