import React, { useRef, useState, useEffect, MouseEvent } from 'react';
import { useCanvasStore } from '../store/canvasItems';
import { CanvasItem } from '../store/canvasItems';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      div: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>;
      span: React.DetailedHTMLProps<React.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>;
      pre: React.DetailedHTMLProps<React.HTMLAttributes<HTMLPreElement>, HTMLPreElement>;
      code: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

export function InfiniteCanvas() {
  const items = useCanvasStore((state) => state.items);
  const moveItem = useCanvasStore((state) => state.moveItem);

  // Track user's pan offset and zoom
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const canvasRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [initialOffset, setInitialOffset] = useState({ x: 0, y: 0 });

  // Pan logic
  const onMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (e.button === 0) {
      setIsPanning(true);
      setStartPan({ x: e.clientX, y: e.clientY });
      setInitialOffset({ ...offset });
    }
  };

  const onMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      const dx = e.clientX - startPan.x;
      const dy = e.clientY - startPan.y;
      setOffset({ x: initialOffset.x + dx, y: initialOffset.y + dy });
    }
  };

  const onMouseUp = () => {
    setIsPanning(false);
  };

  // Zoom logic with wheel
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newZoom = Math.min(Math.max(0.1, zoom + delta), 10);
    setZoom(newZoom);
  };

  // Handle item drag
  const onItemDrag = (
    e: React.MouseEvent<HTMLDivElement>,
    id: string
  ) => {
    // Prevent the infinite canvas from panning
    e.stopPropagation();
    e.preventDefault();
  };

  // Actually move item on mouse move?
  // For brevity, let's do a separate approach:
  // We'll store "dragging item" in local state.
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [itemStart, setItemStart] = useState({ x: 0, y: 0 });

  const handleItemMouseDown = (e: React.MouseEvent<HTMLDivElement>, item: CanvasItem) => {
    e.stopPropagation();
    setDragItem(item.id);
    setDragStart({ x: e.clientX, y: e.clientY });
    setItemStart({ x: item.x, y: item.y });
  };

  const handleItemMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragItem) {
      e.stopPropagation();
      const dx = (e.clientX - dragStart.x) / zoom;
      const dy = (e.clientY - dragStart.y) / zoom;
      moveItem(dragItem, itemStart.x + dx, itemStart.y + dy);
    }
  };

  const handleItemMouseUp = () => {
    setDragItem(null);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setDragItem(null);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  return (
    <div
      ref={canvasRef}
      className="absolute inset-0 overflow-hidden bg-dark-800"
      style={{
        cursor: isPanning ? 'grabbing' : 'grab',
        backgroundColor: 'rgb(17, 18, 23)', // Darker background
        WebkitUserSelect: 'none',
        userSelect: 'none'
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onWheel={onWheel}
    >
      <div
        className="absolute inset-0"
        onMouseMove={handleItemMouseMove}
        onMouseUp={handleItemMouseUp}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          background: `
            radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 90% 80%, rgba(244, 63, 94, 0.05) 0%, transparent 50%)
          `
        }}
      >
        {/* Grid pattern - darker, more visible */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`
          }}
        />

        {/* Modified item rendering for better visibility */}
        {items.map((item) => (
          <div
            key={item.id}
            onMouseDown={(e) => handleItemMouseDown(e, item)}
            style={{
              position: 'absolute',
              left: item.x,
              top: item.y,
              width: 300,
              backgroundColor: `${item.color}20`, // Add transparency
              backdropFilter: 'blur(12px)',
              color: '#fff',
              borderRadius: '0.75rem',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
              border: `1px solid ${item.color}40`,
              padding: '1rem',
              fontSize: '0.875rem',
              userSelect: 'none',
              cursor: dragItem === item.id ? 'grabbing' : 'grab',
              transition: 'transform 0.2s, box-shadow 0.2s',
              transform: dragItem === item.id ? 'scale(1.02)' : 'scale(1)'
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm">{item.label}</span>
              {item.metadata && (
                <span className="text-xs opacity-50">
                  {new Date(item.metadata.generatedAt).toLocaleTimeString()}
                </span>
              )}
            </div>
            {item.code && (
              <pre className="text-xs bg-black bg-opacity-30 p-2 rounded overflow-auto" 
                   style={{ maxHeight: 200 }}>
                <code>{item.code.slice(0, 500)}...</code>
              </pre>
            )}
            {item.metadata && (
              <div className="mt-2 flex gap-2 text-xs opacity-70">
                {item.metadata.performance && (
                  <span>Perf: {item.metadata.performance.toFixed(2)}</span>
                )}
                {item.metadata.complexity && (
                  <span>Complexity: {item.metadata.complexity}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};