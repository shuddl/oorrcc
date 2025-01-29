// src/components/CodeGenerationPanel.tsx

import React, { useState, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { Cpu, Code2, Eye, GitBranch, AlertCircle, Download, Clipboard } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { LoadingOverlay } from './common/LoadingOverlay';
import { useCanvasStore } from '../store/canvasItems';
import { saveAs } from 'file-saver';
import { useServices } from '../hooks/useServices';

interface Props {
  onCodeGenerated?: (code: string) => void;
}

export function CodeGenerationPanel({ onCodeGenerated }: Props) {
  const { ai, security, analysis } = useServices();
  
  const [prompt, setPrompt] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [aiConfig, setAiConfig] = useState({
    temperature: 0.7,
    maxTokens: 4000
  });

  const addCanvasItem = useCanvasStore((s) => s.addItem);

  // Enhanced Error Handling
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Prompt cannot be empty');
      return;
    }

    // Input Validation
    if (prompt.length > 1000) {
      toast.error('Prompt exceeds the maximum allowed length of 1000 characters.');
      return;
    }

    setIsGenerating(true);
    setGeneratedCode('');
    setAnalysisResult(null);
    setErrorMessage(null);

    try {
      const code = await ai.generateCode(prompt, aiConfig);

      // Security: Sanitize Generated Code
      const sanitizedCode = sanitizeCode(code);
      setGeneratedCode(sanitizedCode);
      toast.success('Code generated successfully');

      if (onCodeGenerated) {
        onCodeGenerated(sanitizedCode);
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'An unexpected error occurred.');
      toast.error(`Failed to generate code: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, ai, aiConfig, onCodeGenerated]);

  // Security Function to Sanitize Code
  const sanitizeCode = (code: string): string => {
    // Implement sanitization logic as needed
    return code.replace(/<script.*?>.*?<\/script>/gi, '');
  };

  const handleDownload = useCallback(() => {
    if (!generatedCode) {
      toast.error('No code to download');
      return;
    }
    const blob = new Blob([generatedCode], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generatedCode.js';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Code downloaded');
  }, [generatedCode]);

  const handleCopy = useCallback(() => {
    if (!generatedCode) {
      toast.error('No code to copy');
      return;
    }
    navigator.clipboard.writeText(generatedCode)
      .then(() => toast.success('Code copied to clipboard'))
      .catch(() => toast.error('Failed to copy code'));
  }, [generatedCode]);

  return (
    <div className="h-full flex flex-col bg-dark-800" aria-live="polite">
      {isGenerating && <LoadingOverlay message="Generating code..." />}

      <div className="bg-dark-700 p-6 border-b border-dark-600">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-4 flex items-center text-white">
            <Code2 className="mr-2 h-6 w-6 text-accent-500" />
            AI Code Generator
          </h2>
          <div className="flex gap-4">
            <textarea
              className="flex-1 p-3 bg-dark-600 border border-dark-500 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-white"
              rows={4}
              placeholder="Describe the code you want to generate..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus:ring-offset-dark-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Cpu className="h-5 w-5 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate Code'}
            </button>
          </div>
          {/* AI Configuration Settings */}
          <div className="mt-4 flex space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-300">Temperature</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={aiConfig.temperature}
                onChange={(e) => setAiConfig({ ...aiConfig, temperature: parseFloat(e.target.value) })}
                className="w-full"
              />
              <div className="text-xs text-gray-400">{aiConfig.temperature}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Max Tokens</label>
              <input
                type="number"
                min="100"
                max="8000"
                value={aiConfig.maxTokens}
                onChange={(e) => setAiConfig({ ...aiConfig, maxTokens: parseInt(e.target.value) })}
                className="w-full p-1 bg-dark-600 border border-dark-500 rounded text-white"
              />
            </div>
          </div>
          {errorMessage && (
            <div className="mt-4 p-3 bg-red-600 text-white rounded">
              {errorMessage}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="flex justify-end p-2 space-x-2">
          <button
            onClick={handleCopy}
            className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 flex items-center"
          >
            <Clipboard className="h-4 w-4 mr-1" />
            Copy
          </button>
          <button
            onClick={handleDownload}
            className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 flex items-center"
          >
            <Download className="h-4 w-4 mr-1" />
            Download
          </button>
        </div>
        <CodeMirror
          value={generatedCode}
          height="100%"
          extensions={[javascript()]}
          theme="dark"
          editable={false}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightActiveLine: true
          }}
        />
      </div>

      {analysisResult && (
        <div className="bg-dark-700 p-4 border-t border-dark-600">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span>Security Score: {analysisResult.security.score.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-green-500" />
                <span>Performance Score: {analysisResult.performance.score.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => toast.info(JSON.stringify(analysisResult, null, 2))}
                className="px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-500 flex items-center"
              >
                <Eye className="h-4 w-4 mr-1" />
                View Details
              </button>
            </div>
          </div>
          {/* Optional: Detailed Analysis Modal */}
          {/* Implement a modal to show detailed analysis when 'View Details' is clicked */}
        </div>
      )}
    </div>
  );
}

// Disable Lazy Loading by Ensuring All Functions are Loaded Synchronously
// Ensure that AI functions are invoked directly without dynamic imports