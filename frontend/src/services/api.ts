import { getAuth, getIdToken } from 'firebase/auth';
import type {
  CowInfo,
  LiveCowUpdate,
  ProductionInput,
  UploadResponse,
  VisionProcessResponse,
} from '../types';
import { getFirebaseApp } from './firebase';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

async function getAuthToken(): Promise<string | null> {
  const app = getFirebaseApp();
  if (!app) return null;
  const auth = getAuth(app);
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await getIdToken(user);
  } catch {
    return null;
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function fetchFromApi<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...options.headers as Record<string, string> };
  const auth = await authHeaders();
  Object.assign(headers, auth);
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function getCows(): Promise<CowInfo[]> {
  return fetchFromApi<CowInfo[]>(`${apiBaseUrl}/api/realtime/cows`);
}

export async function getCowLiveStatus(cowId: string): Promise<LiveCowUpdate> {
  return fetchFromApi<LiveCowUpdate>(`${apiBaseUrl}/api/realtime/cows/${cowId}/live`);
}

export async function uploadVideo(video: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('video', video);
  const headers = await authHeaders();
  const response = await fetch(`${apiBaseUrl}/api/vision/upload`, {
    method: 'POST',
    body: formData,
    headers,
  });
  if (!response.ok) throw new Error('Upload failed');
  return response.json() as Promise<UploadResponse>;
}

export async function processVision(videoUrl: string, maxFrames = 500): Promise<VisionProcessResponse> {
  return fetchFromApi<VisionProcessResponse>(`${apiBaseUrl}/api/vision/process`, {
    method: 'POST',
    body: JSON.stringify({ video_url: videoUrl, max_frames: maxFrames }),
  });
}

export async function runFullSimulation(input: ProductionInput) {
  return fetchFromApi(`${apiBaseUrl}/api/predict/full-simulation`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function downloadAnomalyReport(anomalyId: number): Promise<void> {
  const headers = await authHeaders();
  const response = await fetch(`${apiBaseUrl}/api/anomalies/report/${anomalyId}`, { headers });
  if (!response.ok) throw new Error('Report download failed');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `anomaly_${anomalyId}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function getWebSocketUrl(): Promise<string> {
  const wsBase = apiBaseUrl.replace(/^http/, 'ws');
  const token = await getAuthToken();
  if (token) {
    return `${wsBase}/api/ws/dashboard?token=${encodeURIComponent(token)}`;
  }
  return `${wsBase}/api/ws/dashboard`;
}
