import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ModuleAnalysis } from '../types/ProductSpec';
import { GripVertical } from 'lucide-react';

export interface Props {
  module: ModuleAnalysis;
  onContextMenu: (e: React.MouseEvent, moduleId: string) => void;
}

const DraggableModule: React.FC<Props> = ({ module, onContextMenu }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: module.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-lg shadow p-6 relative"
      onContextMenu={(e) => onContextMenu(e, module.id)}
    >
      <div className="absolute left-2 top-1/2 -translate-y-1/2 cursor-move" {...attributes} {...listeners}>
        <GripVertical className="h-5 w-5 text-gray-400" />
      </div>
      
      <div className="ml-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {module.name} ({module.id})
          </h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium
            ${module.status === 'completed' ? 'bg-green-100 text-green-800' :
              module.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'}`}>
            {module.status.replace('_', ' ')}
          </span>
        </div>

        <p className="text-gray-600 mb-4">{module.description}</p>
        
        {/* Module content here */}
      </div>
    </div>
  );
}

export default DraggableModule;