// MemoryManager.ts
import { logger } from '../../utils/logger';

interface MemoryConfig {
  maxContextSize: number;
  chunkSize: number;
  overlapSize: number;
  maxConcurrentChunks: number;
}

interface MemoryAllocation {
  size: number;
  timestamp: number;
  lastAccessed: number;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'paused' | 'completed';
}

export class MemoryManager {
  private allocatedMemory = new Map<string, MemoryAllocation>();
  private totalAllocated = 0;
  private readonly MAX_IDLE_TIME = 5 * 60 * 1000; // 5 minutes
  private readonly HIGH_MEMORY_THRESHOLD = 0.8;

  constructor(private config: MemoryConfig) {}

  estimateMemoryRequirement(request: any): number {
    // Estimate based on request size and type
    const requestSize = JSON.stringify(request).length;
    const overhead = 1.5; // 50% overhead for AI ops
    return Math.ceil(requestSize * overhead);
  }

  /**
   * Attempt to allocate memory for a given operation ID. Return false if insufficient capacity.
   */
  async allocateMemory(id: string, size: number): Promise<boolean> {
    if (this.totalAllocated + size > this.config.maxContextSize) {
      logger.warn('Insufficient memory to allocate', {
        requested: size,
        totalAllocated: this.totalAllocated,
        maxContextSize: this.config.maxContextSize
      });
      return false;
    }

    this.allocatedMemory.set(id, {
      size,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      priority: 'medium',
      status: 'active'
    });
    this.totalAllocated += size;
    logger.debug('Memory allocated', { id, size, totalAllocated: this.totalAllocated });
    return true;
  }

  releaseMemory(id: string) {
    const allocation = this.allocatedMemory.get(id);
    if (allocation) {
      this.totalAllocated -= allocation.size;
      this.allocatedMemory.delete(id);
      logger.debug('Memory released', { id, size: allocation.size, totalAllocated: this.totalAllocated });
    }
  }

  updateAllocationStatus(id: string, status: MemoryAllocation['status']) {
    const allocation = this.allocatedMemory.get(id);
    if (allocation) {
      allocation.status = status;
      allocation.lastAccessed = Date.now();
      this.allocatedMemory.set(id, allocation);
    }
  }

  setPriority(id: string, priority: MemoryAllocation['priority']) {
    const allocation = this.allocatedMemory.get(id);
    if (allocation) {
      allocation.priority = priority;
      this.allocatedMemory.set(id, allocation);
    }
  }

  /**
   * Periodically called to free memory from stale or completed tasks.
   */
  async cleanup() {
    for (const [id] of this.allocatedMemory.entries()) {
      if (this.shouldRelease(id)) {
        this.releaseMemory(id);
      }
    }
    if (this.totalAllocated > this.config.maxContextSize * 0.8) {
      logger.warn('Memory usage above 80%', {
        totalAllocated: this.totalAllocated,
        maxContext: this.config.maxContextSize
      });
    }
  }

  private shouldRelease(id: string): boolean {
    const allocation = this.allocatedMemory.get(id);
    if (!allocation) return false;

    const now = Date.now();
    const memoryUsageRatio = this.totalAllocated / this.config.maxContextSize;
    const idleTime = now - allocation.lastAccessed;
    
    // Always release completed allocations
    if (allocation.status === 'completed') {
      return true;
    }
    
    // Release based on priority and conditions
    switch (allocation.priority) {
      case 'low':
        // Release low priority if idle or memory pressure
        return idleTime > this.MAX_IDLE_TIME / 2 || memoryUsageRatio > this.HIGH_MEMORY_THRESHOLD;
        
      case 'medium':
        // Release medium priority if idle and memory pressure
        return idleTime > this.MAX_IDLE_TIME && memoryUsageRatio > this.HIGH_MEMORY_THRESHOLD;
        
      case 'high':
        // Only release high priority if very old and extreme memory pressure
        return idleTime > this.MAX_IDLE_TIME * 2 && memoryUsageRatio > 0.95;
        
      default:
        return false;
    }
  }

  getMemoryUsage() {
    return {
      totalAllocated: this.totalAllocated,
      maxSize: this.config.maxContextSize,
      allocations: Array.from(this.allocatedMemory.entries()).map(([id, alloc]) => ({
        id,
        size: alloc.size,
        age: Date.now() - alloc.timestamp,
        status: alloc.status,
        priority: alloc.priority
      }))
    };
  }
}