// Monaco Editor worker configuration
// This file resolves the warnings about missing getWorkerUrl function

// Define the worker URL function to resolve Monaco Editor warnings
export function configureMonacoWorkers() {
  if (typeof window !== 'undefined') {
    // Only run in browser environment
    window.MonacoEnvironment = {
      getWorkerUrl: function (_moduleId: string, label: string) {
        // Provide a no-op worker to silence the warnings
        // In a production app, you would load the actual workers
        return '/monaco-editor-workers/empty-worker.js';
      }
    };
  }
}
