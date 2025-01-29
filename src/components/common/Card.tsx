import React from 'react';

interface Props {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function Card({ title, subtitle, children, footer, className = '' }: Props) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {(title || subtitle) && (
        <div className="px-6 py-4 border-b">
          {title && (
            <h3 className="text-lg font-medium text-gray-900">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">
              {subtitle}
            </p>
          )}
        </div>
      )}
      <div className="px-6 py-4">
        {children}
      </div>
      {footer && (
        <div className="px-6 py-4 bg-gray-50 border-t rounded-b-lg">
          {footer}
        </div>
      )}
    </div>
  );
}