import React from 'react';
import { UseFormRegister, FieldValues, FieldErrors } from 'react-hook-form';

interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  register: UseFormRegister<FieldValues>;
  error?: string;
  required?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  register,
  error,
  required
}) => (
  <div className="space-y-1">
    <label htmlFor={name} className="block text-sm font-medium text-gray-700">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <input
      id={name}
      type={type}
      {...register(name)}
      className={`
        block w-full rounded-md border-gray-300 shadow-sm
        focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm
        ${error ? 'border-red-500' : ''}
      `}
    />
    {error && (
      <p className="text-red-500 text-xs mt-1">{error}</p>
    )}
  </div>
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  isLoading,
  ...props
}) => (
  <button
    {...props}
    disabled={isLoading || props.disabled}
    className={`
      inline-flex items-center justify-center rounded-md px-4 py-2
      text-sm font-medium shadow-sm focus:outline-none focus:ring-2
      focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
      ${variant === 'primary'
        ? 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500'
        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500'
      }
    `}
  >
    {isLoading ? (
      <svg
        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    ) : null}
    {children}
  </button>
);