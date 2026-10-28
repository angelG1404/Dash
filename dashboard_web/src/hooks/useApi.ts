import { useEffect, useState } from 'react';
import { apiClient } from '../services/api';

type Params = Record<string, string | number | undefined>;
export function useApi<T>(path: string, params: Params, enabled = true, retry = 0) {
  const key = JSON.stringify([path, params, retry]);
  const [result, setResult] = useState<{ key: string; data?: T; error?: string }>({ key: '' });
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const [url, query] = JSON.parse(key) as [string, Params];
    apiClient.get<T>(url, { params: query, signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setResult({ key, data }); })
      .catch(() => { if (!controller.signal.aborted) setResult({ key, error: 'No se pudieron cargar los datos. Comprueba la conexión con la API y vuelve a intentar.' }); });
    return () => controller.abort();
  }, [key, enabled]);
  const current = enabled && result.key === key ? result : undefined;
  return { data: current?.data, error: current?.error, loading: enabled && !current };
}
