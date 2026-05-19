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

export interface ProductionInput extends HealthInput, SimulationContext {
  video_url?: string | null;
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
  prediction_id: string;
  created_at: string;
  source: 'api' | 'firestore';
  inputs: ProductionInput;
  health: HealthPredictionResponse;
  production: ProductionPredictionResponse;
  vision?: VisionProcessResponse | null;
  firestore_path?: string | null;
}

export interface CowInfo {
  cow_id: string;
  name: string;
  breed: string;
  created_at?: string;
}

export interface LiveSensorData {
  temperature_c: number;
  heart_rate_bpm: number;
  rumen_ph: number;
  activity_score: number;
  milk_yesterday_liters: number;
}

export interface AnomalyInfo {
  id: number | null;
  type: string;
  severity: string;
  rule_number: number;
  description: string;
  triggered_by: Record<string, number>;
  exclusion_check: string | null;
  recommendation: string;
  citation: string;
  report_available: boolean;
  timestamp: string;
}

export interface LiveCowUpdate {
  cow_id: string;
  cow_name: string;
  sensor: LiveSensorData;
  health: HealthPredictionResponse;
  production: ProductionPredictionResponse;
  anomalies: AnomalyInfo[];
  timestamp: string;
}

export interface AlertItem {
  id: string;
  cow_id: string;
  cow_name: string;
  type: 'health' | 'production' | 'sensor' | 'anomaly';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
  anomaly?: AnomalyInfo;
}
