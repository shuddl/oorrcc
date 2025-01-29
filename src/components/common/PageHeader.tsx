import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  title: string;
  subtitle?: string;
  backButton?: boolean;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, backButton, actions }: Props) {
  const navigate = useNavigate();

  return (
    <div className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {backButton && (
              <button
                onClick={() => navigate(-1)}
                className="mr-4 p-1 rounded-full hover:bg-gray-100"
              >
                <ChevronLeft className="h-6 w-6 text-gray-500" />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-sm text-gray-500">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {actions && (
            <div className="flex items-center space-x-4">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}