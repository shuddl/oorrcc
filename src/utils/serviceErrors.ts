import { toast } from 'react-hot-toast';
import { AIError } from '../types/ai.types';

export function handleServiceError(error: unknown) {
  if (error instanceof AIError) {
    toast.error(`AI Service Error: ${error.message}`);
  } else if (error instanceof SecurityError) {
    toast.error(`Security Error: ${error.message}`);
  } else {
    toast.error('An unexpected error occurred');
    console.error(error);
  }
}
