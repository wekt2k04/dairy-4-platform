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

export interface DashboardState {
  inputs: HealthInput & SimulationContext;
  videoUrl?: string;
  health?: HealthPredictionResponse;
  production?: ProductionPredictionResponse;
}
