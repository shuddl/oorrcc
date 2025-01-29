export interface CanvasItemMetadata {
  generatedAt: string;
  performance?: number;
  complexity?: string;
  dependencies?: string[];
}

export interface CanvasItem {
  id: string;
  x: number;
  y: number;
  label: string;
  code?: string;
  color: string;
  type?: string;
  metadata?: Record<string, any>;
}

export interface CanvasStore {
  items: CanvasItem[];
  addItem: (item: Omit<CanvasItem, 'id'>) => void;
  moveItem: (id: string, x: number, y: number) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<CanvasItem>) => void;
}
