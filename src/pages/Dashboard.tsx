import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { ProductSpecGenerator } from '../components/ProductSpecGenerator';
import { ModuleBuilder } from '../components/ModuleBuilder';
import { CodeGenerationPanel } from '../components/CodeGenerationPanel';
import { Code2, Wand2, Layers } from 'lucide-react';

export function Dashboard() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'spec' | 'code' | 'modules'>('spec');

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="border-b bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-4 p-2">
            <button
              onClick={() => setActiveTab('spec')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                activeTab === 'spec'
                  ? 'bg-white shadow text-indigo-600'
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              <Wand2 className="h-4 w-4" />
              Project Spec
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                activeTab === 'code'
                  ? 'bg-white shadow text-indigo-600'
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              <Code2 className="h-4 w-4" />
              Code Generator
            </button>
            <button
              onClick={() => setActiveTab('modules')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                activeTab === 'modules'
                  ? 'bg-white shadow text-indigo-600'
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              <Layers className="h-4 w-4" />
              Module Builder
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {activeTab === 'spec' ? (
          <ProductSpecGenerator />
        ) : activeTab === 'code' ? (
          <CodeGenerationPanel />
        ) : (
          <ModuleBuilder />
        )}
      </div>
    </div>
  );
}