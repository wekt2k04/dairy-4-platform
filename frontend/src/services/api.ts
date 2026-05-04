import type {
  HealthInput,
  HealthPredictionResponse,
  ProductionPredictionResponse,
  SimulationContext,
  UploadResponse,
} from '../types';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function mockLogin(username: string, password: string) {
  const response = await fetch(`${apiBaseUrl}/api/auth/mock-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  return parseResponse<{ success: boolean; token: string }>(response);
}

export async function predictHealth(input: HealthInput): Promise<HealthPredictionResponse> {
  const response = await fetch(`${apiBaseUrl}/api/predict/health`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  return parseResponse<HealthPredictionResponse>(response);
}

export async function uploadVideo(video: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('video', video);

  const response = await fetch(`${apiBaseUrl}/api/vision/upload`, {
    method: 'POST',
    body: formData,
  });

  return parseResponse<UploadResponse>(response);
}

export async function predictProduction(input: HealthInput & SimulationContext & { video_url?: string }): Promise<ProductionPredictionResponse> {
  const response = await fetch(`${apiBaseUrl}/api/predict/production`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  return parseResponse<ProductionPredictionResponse>(response);
}
