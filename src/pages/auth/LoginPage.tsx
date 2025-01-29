import React, { useState } from 'react';
import { LoginForm } from '../../components/auth/LoginForm';
import { Code2 } from 'lucide-react';

export function LoginPage() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Code2 className="h-12 w-12 text-indigo-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to DevPipeline
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Access your AI-powered development workspace
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <LoginForm setLoading={setLoading} />
        </div>
      </div>
    </div>
  );
}