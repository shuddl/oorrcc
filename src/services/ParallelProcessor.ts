interface Task {
  id: string;
  type: 'analysis' | 'generation' | 'optimization';
  data: any;
}

export class ParallelProcessor {
  private workers: Worker[] = [];
  private taskQueue: Task[] = [];
  private readonly maxWorkers = navigator.hardwareConcurrency || 4;

  constructor() {
    this.initializeWorkers();
  }

  private initializeWorkers() {
    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = new Worker(
        new URL('../workers/processor.worker.ts', import.meta.url)
      );
      this.workers.push(worker);
    }
  }

  async processTask(task: Task): Promise<any> {
    return new Promise((resolve) => {
      const worker = this.getAvailableWorker();
      worker.postMessage(task);
      worker.onmessage = (e) => resolve(e.data);
    });
  }

  private getAvailableWorker(): Worker {
    // Simple round-robin worker selection
    const worker = this.workers.shift()!;
    this.workers.push(worker);
    return worker;
  }

  terminate() {
    this.workers.forEach(worker => worker.terminate());
  }
}