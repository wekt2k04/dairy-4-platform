export type HealthStatus = 'Healthy' | 'Warning' | 'Critical';

export interface HealthInput {
  temperature_c: number;
  heart_rate_bpm: number;
  rumen_ph: number;
  activity_score: number;
}

export interface SimulationContext {
  milk_yesterday_liters: number;
  time_of_day_hhmm: string;
}

export interface HealthPredictionResponse {
  health_status: HealthStatus;
  health_score: number;
  confidence_score?: number;
}

export interface ProductionPredictionResponse {
  milk_yield_liters: number;
  drop_alert: boolean;
  confidence_score?: number;
}

export interface UploadResponse {
  video_url: string;
  filename: string;
}

export interface VisionProcessResponse {
  original_video_url: string;
  processed_video_url?: string | null;
  frames_processed: number;
  total_detections: number;
  behavior_counts: Record<string, number>;
  status: string;
  error_message?: string | null;
}

export interface DashboardState {
  inputs: HealthInput & SimulationContext;
  videoUrl?: string;
  processedVideoUrl?: string;
  vision?: VisionProcessResponse;
  health?: HealthPredictionResponse;
  production?: ProductionPredictionResponse;
}
