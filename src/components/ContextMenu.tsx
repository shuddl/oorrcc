import React from 'react';
import { Plus, Edit, Trash } from 'lucide-react';

interface Props {
  x: number;
  y: number;
  onClose: () => void;
  onAddFeature: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ContextMenu({ x, y, onClose, onAddFeature, onEdit, onDelete }: Props) {
  React.useEffect(() => {
    const handleClick = () => onClose();
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [onClose]);

  return (
    <div
      className="fixed bg-white rounded-lg shadow-lg py-1 z-50"
      style={{ top: y, left: x }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
        onClick={onAddFeature}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Feature
      </button>
      <button
        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
        onClick={onEdit}
      >
        <Edit className="h-4 w-4 mr-2" />
        Edit Module
      </button>
      <button
        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 flex items-center"
        onClick={onDelete}
      >
        <Trash className="h-4 w-4 mr-2" />
        Delete Module
      </button>
    </div>
  );
}