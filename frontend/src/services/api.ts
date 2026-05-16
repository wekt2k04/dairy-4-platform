import type {
  DashboardState,
  MockLoginResponse,
  ProductionInput,
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

  return parseResponse<MockLoginResponse>(response);
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

export async function runFullSimulation(input: ProductionInput): Promise<DashboardState> {
  const response = await fetch(`${apiBaseUrl}/api/predict/full-simulation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  return parseResponse<DashboardState>(response);
}
