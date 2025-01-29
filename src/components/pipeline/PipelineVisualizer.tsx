import React, { useEffect, useRef } from 'react';
import { PipelineStage } from '../../services/PipelineStages';

interface Props {
  stages: PipelineStage[];
  executionOrder: string[];
}

export function PipelineVisualizer({ stages, executionOrder }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw connections
    const stageMap = new Map(stages.map(s => [s.id, s]));
    const positions = new Map<string, { x: number; y: number }>();

    // Calculate positions
    executionOrder.forEach((stageId, index) => {
      const x = 100 + (index * 200);
      const y = canvas.height / 2;
      positions.set(stageId, { x, y });
    });

    // Draw connections
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;

    stages.forEach(stage => {
      const from = positions.get(stage.id);
      if (!from) return;

      stage.dependencies.forEach(depId => {
        const to = positions.get(depId);
        if (!to) return;

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      });
    });

    // Draw nodes
    stages.forEach(stage => {
      const pos = positions.get(stage.id);
      if (!pos) return;

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
      ctx.fillStyle = getStatusColor(stage.status);
      ctx.fill();
    });
  }, [stages, executionOrder]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-40 bg-gray-50"
      width={1000}
      height={160}
    />
  );
}

function getStatusColor(status: PipelineStage['status']): string {
  switch (status) {
    case 'completed': return '#22c55e';
    case 'failed': return '#ef4444';
    case 'running': return '#eab308';
    default: return '#9ca3af';
  }
}