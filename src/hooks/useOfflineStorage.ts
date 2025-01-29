import { useState, useEffect } from 'react';
import { logger } from '../utils/logger';

export function useOfflineStorage<T>(key: string, initialData: T) {
  const [data, setData] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialData;
    } catch (error) {
      logger.error('Failed to load offline data', { error, key });
      return initialData;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      logger.error('Failed to save offline data', { error, key });
    }
  }, [key, data]);

  return [data, setData] as const;
}