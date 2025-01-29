import { logger } from '../../utils/logger';

interface ContextWindow {
  id: string;
  content: string;
  timestamp: number;
  priority: number;
}

export class ContextManager {
  private contexts: Map<string, ContextWindow> = new Map();
  private readonly MAX_CONTEXTS = 100;
  private readonly CONTEXT_TTL = 1000 * 60 * 30; // 30 minutes

  addContext(id: string, content: string, priority: number = 1): void {
    if (this.contexts.size >= this.MAX_CONTEXTS) {
      this.pruneOldContexts();
    }

    this.contexts.set(id, {
      id,
      content,
      timestamp: Date.now(),
      priority
    });

    logger.debug('Context added', { id, priority });
  }

  getContext(id: string): string | null {
    const context = this.contexts.get(id);
    if (!context) return null;

    if (this.isExpired(context)) {
      this.contexts.delete(id);
      return null;
    }

    return context.content;
  }

  mergeContexts(contextIds: string[]): string {
    return contextIds
      .map(id => this.getContext(id))
      .filter(Boolean)
      .join('\n\n');
  }

  private isExpired(context: ContextWindow): boolean {
    return Date.now() - context.timestamp > this.CONTEXT_TTL;
  }

  private pruneOldContexts(): void {
    const contexts = Array.from(this.contexts.values())
      .sort((a, b) => {
        // Sort by priority first, then by timestamp
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return b.timestamp - a.timestamp;
      });

    while (contexts.length >= this.MAX_CONTEXTS) {
      const removed = contexts.pop();
      if (removed) {
        this.contexts.delete(removed.id);
        logger.debug('Context pruned', { id: removed.id });
      }
    }
  }

  clear(): void {
    this.contexts.clear();
    logger.info('Context manager cleared');
  }
}