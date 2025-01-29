import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface CanvasItem {
  id: string;
  type: 'function' | 'ui' | 'snippet' | 'combined';
  label: string;
  code?: string;
  x: number;
  y: number;
  color?: string;
  metadata?: {
    generatedAt: number;
    source: string;
    performance?: number;
    complexity?: number;
  };
}

interface CanvasStore {
  items: CanvasItem[];
  addItem: (item: Omit<CanvasItem, 'id'>) => void;
  updateItem: (id: string, partial: Partial<CanvasItem>) => void;
  moveItem: (id: string, x: number, y: number) => void;
  removeItem: (id: string) => void;
  getNextPosition: () => { x: number; y: number };
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  items: [],
  addItem: (item) => {
    const { x, y } = get().getNextPosition();
    set((state) => ({
      items: [
        ...state.items,
        {
          id: uuidv4(),
          x,
          y,
          ...item,
          metadata: {
            generatedAt: Date.now(),
            source: item.type,
            ...item.metadata
          }
        }
      ]
    }));
  },
  updateItem: (id, partial) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, ...partial } : i
      )
    })),
  moveItem: (id, x, y) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, x, y } : i
      )
    })),
  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((i) => i.id !== id)
    })),
  getNextPosition: () => {
    const items = get().items;
    const padding = 20;
    const baseX = window.innerWidth * 0.1;
    const baseY = window.innerHeight * 0.1;
    
    if (items.length === 0) {
      return { x: baseX, y: baseY };
    }

    // Find the rightmost and bottommost positions
    const maxX = Math.max(...items.map(i => i.x));
    const maxY = Math.max(...items.map(i => i.y));

    // If we're too far right, start a new row
    if (maxX > window.innerWidth * 0.7) {
      return { 
        x: baseX,
        y: maxY + 200 + padding
      };
    }

    // Otherwise, continue to the right
    return {
      x: maxX + 200 + padding,
      y: maxY
    };
  }
}));