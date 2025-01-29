// src/components/ModuleBuilder.tsx

import React, { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { PromptEngineerAgent, PromptEngineerConfig, PersonaType } from '../services/PromptEngineerAgent';
import { useServices } from '../hooks/useServices';
import { AIError } from '../types/ai.types';
import { LoadingOverlay } from './common/LoadingOverlay';
import { useCanvasStore } from '../store/canvasItems';
import { v4 as uuidv4 } from 'uuid';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@radix-ui/react-select';
import { ChevronDown, Clipboard, Download, AlertCircle, Code2, Cpu } from 'lucide-react';

interface ModuleItem {
  id: string;
  name: string;
  persona: PersonaType;
  prompt: string;
  code?: string;
  generatedFrom?: string;
  status: 'pending' | 'generating' | 'complete' | 'error';
  error?: string;
}

const predefinedPersonas: PersonaType[] = [
  'sidebarGuru',
  'contemporaryLoudDesigner',
  'footerWizard',
  // Add more personas as needed
];

export function ModuleBuilder() {
  const { ai, componentGenerator } = useServices();
  const [config, setConfig] = useState<PromptEngineerConfig>({
    industry: 'finance',
    userType: 'corporate staff',
    designStyle: 'ultra minimal',
    brandColors: ['#FF0000', '#0000FF'],
    complexity: 'moderate',
    language: 'TypeScript'
  });

  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [selectedModule, setSelectedModule] = useState<ModuleItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [newModuleName, setNewModuleName] = useState('');

  const addCanvasItem = useCanvasStore((s) => s.addItem);
  const [customPersona, setCustomPersona] = useState<PersonaType | ''>('');

  const handleAddModule = () => {
    if (!newModuleName.trim()) {
      toast.error('Module name cannot be empty');
      return;
    }

    const newModule: ModuleItem = {
      id: uuidv4(),
      name: newModuleName.trim(),
      persona: customPersona || 'footerWizard', // Default or selected persona
      prompt: 'A custom new module...',
      status: 'pending'
    };
    setModules(prev => [...prev, newModule]);
    setNewModuleName('');
    toast.success('New module added');
  };

  const handleGenerateCode = useCallback(async (module: ModuleItem) => {
    try {
      setIsLoading(true);
      setModules(m => m.map(mod =>
        mod.id === module.id
          ? { ...mod, status: 'generating' }
          : mod
      ));

      const request: ComponentGenerationRequest = {
        name: module.name,
        type: 'functional', // or 'class' based on user selection
        description: module.prompt,
        features: ['accessibility', 'performance', 'testing'],
        styling: {
          framework: 'tailwind',
          theme: {
            primaryColor: '#FF0000',
            secondaryColor: '#0000FF'
          }
        },
        state: {
          type: 'local',
          schema: {
            // Define state schema if any
          }
        },
        props: [
          {
            name: 'title',
            type: 'string',
            required: true,
            description: 'Title of the component'
          }
          // Add more props as needed
        ],
        dependencies: [
          'react',
          'lodash' // Example dependencies
        ]
      };

      const result = await componentGenerator.generateComponent(request, {
        typescript: true,
        testing: true,
        storybook: true,
        documentation: true,
        optimization: true
      });

      setModules(m => m.map(mod =>
        mod.id === module.id
          ? { ...mod, code: result.files.get(`${mod.name}.tsx`) || '', status: 'complete' }
          : mod
      ));

      addCanvasItem({
        type: 'combined',
        label: `${module.name} (${module.persona})`,
        code: result.files.get(`${module.name}.tsx`) || '',
        x: Math.random() * window.innerWidth * 0.6,
        y: Math.random() * window.innerHeight * 0.6,
        color: '#90be6d'
      });

      toast.success(`Code generated for ${module.name}`);
    } catch (error) {
      setModules(m => m.map(mod =>
        mod.id === module.id
          ? { ...mod, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' }
          : mod
      ));
      toast.error(`Failed to generate code for ${module.name}`);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [componentGenerator, addCanvasItem]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {isLoading && <LoadingOverlay />}
      <h2 className="text-2xl font-bold mb-4 flex items-center text-gray-800">
        <Code2 className="mr-2 h-6 w-6 text-blue-500" />
        Module Builder + AI Prompt Engineer
      </h2>

      {/* Global Config Panel */}
      <div className="mb-6 border border-gray-200 rounded p-4 bg-white">
        <h3 className="text-lg font-semibold mb-3">Global Prompt Config</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Industry
            </label>
            <input
              type="text"
              value={config.industry}
              onChange={e => setConfig({ ...config, industry: e.target.value })}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              User Type
            </label>
            <input
              type="text"
              value={config.userType}
              onChange={e => setConfig({ ...config, userType: e.target.value })}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Design Style
            </label>
            <input
              type="text"
              value={config.designStyle}
              onChange={e => setConfig({ ...config, designStyle: e.target.value })}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Complexity
            </label>
            <select
              className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={config.complexity}
              onChange={e => setConfig({ ...config, complexity: e.target.value as any })}
            >
              <option value="basic">Basic</option>
              <option value="moderate">Moderate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Language
            </label>
            <select
              className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={config.language}
              onChange={e => setConfig({ ...config, language: e.target.value as any })}
            >
              <option value="TypeScript">TypeScript</option>
              <option value="JavaScript">JavaScript</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Brand Colors (comma-separated)
            </label>
            <input
              type="text"
              placeholder="#FF0000,#0000FF"
              onChange={e => {
                const arr = e.target.value.split(',').map(s => s.trim());
                setConfig({ ...config, brandColors: arr });
              }}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Current: {config.brandColors?.join(', ') || 'none'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Left: Module List */}
        <div className="w-1/3">
          <h3 className="text-lg font-semibold mb-2">Available Modules</h3>
          <div className="space-y-2">
            {modules.map(mod => (
              <div
                key={mod.id}
                className={`p-3 border border-gray-300 rounded-lg bg-white cursor-pointer hover:shadow-sm
                  ${selectedModule?.id === mod.id ? 'ring-2 ring-blue-400' : ''}
                  ${mod.status === 'error' ? 'border-red-300' : ''}
                  ${mod.status === 'generating' ? 'opacity-75' : ''}`}
                onClick={() => setSelectedModule(mod)}
              >
                <div className="font-medium">{mod.name}</div>
                <div className="text-xs text-gray-500">Persona: {mod.persona}</div>
                <div className="text-xs text-gray-500">{mod.prompt}</div>
                <div className="mt-1 text-xs flex items-center space-x-1">
                  {mod.status === 'complete' && (
                    <span className="text-green-600 flex items-center">
                      <Code2 className="h-4 w-4 mr-1" />
                      Generated ✓
                    </span>
                  )}
                  {mod.status === 'generating' && (
                    <span className="text-yellow-600 flex items-center">
                      <Cpu className="h-4 w-4 mr-1 animate-spin" />
                      Generating...
                    </span>
                  )}
                  {mod.status === 'error' && (
                    <span className="text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {mod.error}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add New Module Section */}
          <div className="mt-4">
            <h4 className="text-sm font-semibold mb-2">Add New Module</h4>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Module Name"
                value={newModuleName}
                onChange={(e) => setNewModuleName(e.target.value)}
                className="w-full p-2 bg-gray-100 border border-gray-300 rounded"
              />
              <Select onValueChange={(value) => setCustomPersona(value as PersonaType)}>
                <SelectTrigger className="w-full bg-gray-100 border border-gray-300 rounded p-2 flex justify-between items-center">
                  <SelectValue placeholder="Select Persona" />
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-300 rounded mt-1">
                  <SelectGroup>
                    {predefinedPersonas.map(persona => (
                      <SelectItem key={persona} value={persona}>
                        {persona}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <button
                onClick={handleAddModule}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add Module
              </button>
            </div>
          </div>
        </div>

        {/* Right: Module Detail */}
        <div className="flex-1 p-4 border border-gray-200 rounded-lg bg-white">
          {selectedModule ? (
            <>
              <h3 className="text-lg font-semibold">{selectedModule.name}</h3>
              <p className="text-sm text-gray-600 mb-2">
                Persona: <b>{selectedModule.persona}</b><br />
                Prompt: {selectedModule.prompt}
                {selectedModule.generatedFrom && (
                  <><br />Imported from: {selectedModule.generatedFrom}</>
                )}
              </p>

              {selectedModule.status !== 'complete' ? (
                <button
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center"
                  disabled={selectedModule.status === 'generating'}
                  onClick={() => handleGenerateCode(selectedModule)}
                >
                  {selectedModule.status === 'generating'
                    ? <>
                        <Cpu className="h-5 w-5 mr-2 animate-spin" />
                        Generating...
                      </>
                    : <>
                        <Cpu className="h-5 w-5 mr-2" />
                        Generate Code
                      </>
                  }
                </button>
              ) : (
                <div>
                  <h4 className="text-sm font-bold mt-4 mb-1">Generated Code</h4>
                  <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-64">
                    {selectedModule.code}
                  </pre>
                  <div className="flex space-x-2 mt-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedModule.code || '')
                          .then(() => toast.success('Code copied to clipboard!'))
                          .catch(() => toast.error('Failed to copy code'));
                      }}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
                      aria-label="Copy Code"
                    >
                      <Clipboard className="h-4 w-4 mr-1" />
                      Copy
                    </button>
                    <button
                      onClick={() => {
                        const blob = new Blob([selectedModule.code || ''], { type: 'text/typescript' });
                        saveAs(blob, `${selectedModule.name}.tsx`);
                        toast.success('Code downloaded successfully!');
                      }}
                      className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center"
                      aria-label="Download Code"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-gray-500">Select a module to see details</div>
          )}
        </div>
      </div>
    </div>
  );
}