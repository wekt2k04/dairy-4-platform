import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, AlertTriangle, BarChart3, Camera, ChevronDown, FileText, Heart,
  Languages, Moon, Sun, LogOut, Thermometer, Droplets, Wheat, Eye, Bell,
  TrendingUp, TrendingDown, Minus, Clock,
} from 'lucide-react';
import { getAuth, signOut } from 'firebase/auth';
import { Area, AreaChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { useLiveDashboard } from '../services/useLiveDashboard';
import { downloadAnomalyReport, getCowLiveStatus, processVision, uploadVideo } from '../services/api';
import { getFirebaseApp } from '../services/firebase';
import GaugeChart from '../components/GaugeChart';
import ProductionChart from '../components/ProductionChart';
import StatCard from '../components/StatCard';
import VideoPanel from '../components/VideoPanel';
import type { AlertItem, LiveCowUpdate, VisionProcessResponse } from '../types';

const TAB_OVERVIEW = 'overview';
const TAB_HEALTH = 'health';
const TAB_TRENDS = 'trends';
const TAB_ALERTS = 'alerts';
const TAB_VISION = 'vision';
type Tab = typeof TAB_OVERVIEW | typeof TAB_HEALTH | typeof TAB_TRENDS | typeof TAB_ALERTS | typeof TAB_VISION;

const STALE_TIMEOUT_MS = 15000;

const NORMAL_RANGES = {
  temperature: { min: 37.5, max: 39.5, label: '37.5 – 39.5 °C' },
  heartRate: { min: 48, max: 80, label: '48 – 80 bpm' },
  ph: { min: 6.0, max: 7.0, label: '6.0 – 7.0' },
  activity: { min: 40, max: 100, label: '40 – 100' },
};

function buildAlerts(updates: Record<string, LiveCowUpdate>): AlertItem[] {
  const items: AlertItem[] = [];
  for (const cow of Object.values(updates)) {
    if (cow.health.health_status === 'Critical') {
      items.push({
        id: `${cow.cow_id}-health-critical`,
        cow_id: cow.cow_id, cow_name: cow.cow_name,
        type: 'health', severity: 'critical',
        message: `${cow.cow_name} health CRITICAL (score: ${cow.health.health_score})`,
        timestamp: cow.timestamp,
      });
    } else if (cow.health.health_status === 'Warning') {
      items.push({
        id: `${cow.cow_id}-health-warning`,
        cow_id: cow.cow_id, cow_name: cow.cow_name,
        type: 'health', severity: 'warning',
        message: `${cow.cow_name} health needs attention (score: ${cow.health.health_score})`,
        timestamp: cow.timestamp,
      });
    }
    if (cow.production.drop_alert) {
      items.push({
        id: `${cow.cow_id}-production-drop`,
        cow_id: cow.cow_id, cow_name: cow.cow_name,
        type: 'production', severity: 'warning',
        message: `${cow.cow_name} production drop detected`,
        timestamp: cow.timestamp,
      });
    }
    const t = cow.sensor.temperature_c;
    if (t > NORMAL_RANGES.temperature.max || t < NORMAL_RANGES.temperature.min) {
      items.push({
        id: `${cow.cow_id}-temp-abnormal`,
        cow_id: cow.cow_id, cow_name: cow.cow_name,
        type: 'sensor', severity: t > 40 ? 'critical' : 'warning',
        message: `${cow.cow_name} temperature abnormal: ${t}°C`,
        timestamp: cow.timestamp,
      });
    }
    if (cow.anomalies && cow.anomalies.length > 0) {
      for (const anomaly of cow.anomalies) {
        const sev = anomaly.severity === 'High' ? 'critical' as const : 'warning' as const;
        items.push({
          id: `${cow.cow_id}-anomaly-${anomaly.rule_number}-${anomaly.timestamp}`,
          cow_id: cow.cow_id, cow_name: cow.cow_name,
          type: 'anomaly', severity: sev,
          message: `${anomaly.type}`,
          timestamp: anomaly.timestamp,
          anomaly,
        });
      }
    }
  }
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return items;
}

const RechartsTooltipStyle = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-color)',
  borderRadius: 12,
  color: 'var(--text-primary)',
  fontSize: 12,
};

function TrendIcon({ current, normal }: { current: number; normal: { min: number; max: number } }) {
  if (current > normal.max) return <TrendingUp className="h-3 w-3 text-rose-500" />;
  if (current < normal.min) return <TrendingDown className="h-3 w-3 text-blue-500" />;
  return <Minus className="h-3 w-3 text-emerald-500" />;
}

export default function DashboardPage() {
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useI18n();
  const navigate = useNavigate();
  const { connected, getCowUpdate, latestUpdates, history } = useLiveDashboard({ maxItems: 300 });
  const [selectedCowId, setSelectedCowId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>(TAB_OVERVIEW);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showCowList, setShowCowList] = useState(true);
  const [visionResult, setVisionResult] = useState<VisionProcessResponse | null>(null);
  const [visionError, setVisionError] = useState('');
  const [restInitialData, setRestInitialData] = useState<Record<string, LiveCowUpdate> | null>(null);
  const [lastConnectedTime, setLastConnectedTime] = useState<number>(Date.now());
  const [alertLog, setAlertLog] = useState<AlertItem[]>([]);
  const alertLogRef = useRef<AlertItem[]>([]);
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  const handleLogout = useCallback(async () => {
    const app = getFirebaseApp();
    if (app) {
      await signOut(getAuth(app));
    }
    navigate('/login');
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    async function loadInitial() {
      try {
        const ids = ['cow-001', 'cow-002', 'cow-003', 'cow-004', 'cow-005'];
        const results = await Promise.allSettled(ids.map((id) => getCowLiveStatus(id)));
        const map: Record<string, LiveCowUpdate> = {};
        for (const r of results) {
          if (r.status === 'fulfilled') map[r.value.cow_id] = r.value;
        }
        if (!cancelled) setRestInitialData(map);
      } catch { /* WS will provide data */ }
    }
    loadInitial();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (connected) setLastConnectedTime(Date.now());
  }, [connected]);

  useEffect(() => {
    const currentAlerts = buildAlerts(latestUpdates);
    const existingIds = new Set(alertLogRef.current.map((a) => a.id));
    const newAlerts = currentAlerts.filter((a) => !existingIds.has(a.id));
    if (newAlerts.length > 0) {
      alertLogRef.current = [...newAlerts, ...alertLogRef.current].slice(0, 200);
      setAlertLog([...alertLogRef.current]);
    }
  }, [latestUpdates]);

  const cows = useMemo(() => {
    const source = Object.keys(latestUpdates).length > 0 ? latestUpdates : (restInitialData ?? {});
    return Object.values(source);
  }, [latestUpdates, restInitialData]);

  const selectedUpdate = selectedCowId
    ? (getCowUpdate(selectedCowId) ?? (restInitialData ? restInitialData[selectedCowId] : undefined))
    : undefined;

  useEffect(() => {
    if (!selectedCowId && cows.length > 0) {
      setSelectedCowId(cows[0].cow_id);
    }
  }, [cows, selectedCowId]);

  const isStale = !connected && !!selectedUpdate && (Date.now() - lastConnectedTime > STALE_TIMEOUT_MS);
  const connectionStatus = connected ? 'live' : (isStale ? 'stale' : (selectedUpdate ? 'offline_with_data' : 'offline'));

  const sensorHistory = useMemo(() => {
    if (!selectedCowId) return [];
    return history
      .filter((h) => h.cow_id === selectedCowId)
      .map((h) => ({
        time: new Date(h.timestamp).toLocaleTimeString(),
        temperature: Number(h.sensor.temperature_c.toFixed(1)),
        heartRate: h.sensor.heart_rate_bpm,
        ph: Number(h.sensor.rumen_ph.toFixed(1)),
        activity: h.sensor.activity_score,
        healthScore: h.health.health_score,
        milkYield: Number(h.production.milk_yield_liters.toFixed(1)),
      }));
  }, [history, selectedCowId]);

  const handleVisionProcess = useCallback(async () => {
    if (!videoFile || !selectedCowId) return;
    setUploading(true);
    setVisionError('');
    setVisionResult(null);
    try {
      const uploadResult = await uploadVideo(videoFile);
      const result = await processVision(uploadResult.video_url);
      if (result.status === 'processed') {
        setVisionResult(result);
      } else {
        setVisionError(result.error_message ?? 'Vision processing failed');
      }
      setVideoFile(null);
    } catch (err) {
      setVisionError(err instanceof Error ? err.message : 'Vision processing failed');
    } finally {
      setUploading(false);
    }
  }, [videoFile, selectedCowId]);

  const activeAlertCount = alertLog.filter((a) => a.severity === 'critical' || a.severity === 'warning').length;

  function severityColor(s: string): string {
    switch (s) {
      case 'critical': return 'border-rose-500/30 bg-rose-500/8 text-rose-500';
      case 'warning': return 'border-amber-500/30 bg-amber-500/8 text-amber-500';
      default: return 'border-blue-500/30 bg-blue-500/8 text-blue-500';
    }
  }

  function severityDot(s: string) {
    switch (s) {
      case 'critical': return 'bg-rose-500';
      case 'warning': return 'bg-amber-500';
      default: return 'bg-emerald-500';
    }
  }

  function statusPill(label: string, color: string) {
    return (
      <div className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${color}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${color.includes('emerald') ? 'bg-emerald-500 animate-pulse-slow' : color.includes('rose') ? 'bg-rose-500' : 'bg-amber-500'}`} />
        {label}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b backdrop-blur-xl" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
          <div className="flex items-center justify-between px-4 py-2.5 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCowList(!showCowList)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 transition hover:bg-black/5 dark:hover:bg-white/5"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}>
                  <Heart className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{t('appTitle')}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition ${showCowList ? 'rotate-180' : ''}`} style={{ color: 'var(--text-secondary)' }} />
              </button>
              {connectionStatus === 'live' && statusPill(t('live'), 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400')}
              {connectionStatus === 'stale' && statusPill(t('stale'), 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400')}
              {(connectionStatus === 'offline_with_data' || connectionStatus === 'offline') && statusPill(t('offline'), 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400')}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setLang(lang === 'en' ? 'fr' : 'en')}
                className="rounded-lg border p-2 transition hover:bg-black/5 dark:hover:bg-white/5"
                style={{ borderColor: 'var(--border-color)' }}
                title={t('language')}
              >
                <Languages className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
              </button>
              <button
                onClick={toggleTheme}
                className="rounded-lg border p-2 transition hover:bg-black/5 dark:hover:bg-white/5"
                style={{ borderColor: 'var(--border-color)' }}
                title={theme === 'dark' ? t('lightMode') : t('darkMode')}
              >
                {theme === 'dark'
                  ? <Sun className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
                  : <Moon className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
                }
              </button>
              <button
                onClick={handleLogout}
                className="rounded-lg border p-2 transition hover:bg-rose-500/10"
                style={{ borderColor: 'var(--border-color)' }}
                title="Sign out"
              >
                <LogOut className="h-4 w-4 text-rose-500" />
              </button>
            </div>
          </div>
        </header>

        <div className="flex flex-1">
          {showCowList && (
            <aside className="w-64 shrink-0 border-r overflow-y-auto" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
              <div className="p-3">
                <div className="mb-3 flex items-center justify-between px-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                    {t('cows')}
                  </h3>
                  <span className="rounded-md border px-1.5 py-0.5 text-[10px] font-medium" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>{cows.length}</span>
                </div>
                <div className="space-y-1.5">
                  {cows.map((cow) => {
                    const isSelected = selectedCowId === cow.cow_id;
                    const isCritical = cow.health.health_status === 'Critical';
                    const isWarn = cow.health.health_status === 'Warning';
                    return (
                      <button
                        key={cow.cow_id}
                        onClick={() => { setSelectedCowId(cow.cow_id); setActiveTab(TAB_OVERVIEW); }}
                        className={`w-full rounded-xl border p-3 text-left transition-all hover:shadow-sm ${
                          isSelected ? 'ring-2 shadow-sm' : ''
                        }`}
                        style={{
                          borderColor: isSelected ? 'var(--accent)' : 'var(--border-color)',
                          background: isSelected ? 'var(--bg-card)' : 'transparent',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${isCritical ? 'bg-rose-500' : isWarn ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{cow.cow_name}</span>
                          </div>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            isCritical ? 'bg-rose-500/15 text-rose-500' : isWarn ? 'bg-amber-500/15 text-amber-500' : 'bg-emerald-500/15 text-emerald-500'
                          }`}>{cow.health.health_status}</span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <div className="flex items-center gap-1"><Thermometer className="h-3 w-3" />{cow.sensor.temperature_c}°C</div>
                          <div className="flex items-center gap-1"><Activity className="h-3 w-3" />{cow.sensor.heart_rate_bpm} bpm</div>
                          <div className="flex items-center gap-1"><Droplets className="h-3 w-3" />pH {cow.sensor.rumen_ph}</div>
                          <div className="flex items-center gap-1"><Eye className="h-3 w-3" />{cow.sensor.activity_score}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>
          )}

          <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
            {!selectedUpdate ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}>
                    <Heart className="h-8 w-8 text-white" />
                  </div>
                  <p className="mt-6 text-sm" style={{ color: 'var(--text-secondary)' }}>{t('waitingData')}</p>
                  <div className="mt-4 flex justify-center">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full" style={{ background: 'var(--border-color)' }}>
                      <div className="h-full w-1/3 animate-pulse rounded-full" style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent2))' }} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-7xl space-y-6 animate-slide-in">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}>
                        <Heart className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                          {selectedUpdate.cow_name}
                        </h1>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            <Clock className="inline h-3 w-3 mr-1" />
                            {new Date(selectedUpdate.timestamp).toLocaleTimeString()}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            selectedUpdate.health.health_status === 'Healthy' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                            selectedUpdate.health.health_status === 'Warning' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' :
                            'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          }`}>{selectedUpdate.health.health_status}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isStale && (
                      <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {t('disconnected')}
                      </div>
                    )}
                    {activeAlertCount > 0 && !isStale && (
                      <button
                        onClick={() => setActiveTab(TAB_ALERTS)}
                        className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:shadow-sm"
                        style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                      >
                        <Bell className="h-3.5 w-3.5 text-rose-500" />
                        {activeAlertCount} alert{activeAlertCount > 1 ? 's' : ''}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-1 rounded-xl border p-1 overflow-x-auto" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}>
                  {[
                    { id: TAB_OVERVIEW, label: t('overview'), icon: BarChart3 },
                    { id: TAB_HEALTH, label: t('health'), icon: Heart },
                    { id: TAB_TRENDS, label: t('trends'), icon: TrendingUp },
                    { id: TAB_ALERTS, label: t('alerts'), icon: Bell },
                    { id: TAB_VISION, label: t('vision'), icon: Camera },
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id as Tab)}
                      className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-all sm:px-5 sm:text-sm ${
                        activeTab === id ? 'shadow-sm' : ''
                      }`}
                      style={{
                        background: activeTab === id ? 'var(--accent)' : 'transparent',
                        color: activeTab === id ? '#fff' : 'var(--text-secondary)',
                      }}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

                {activeTab === TAB_OVERVIEW && (
                  <div className="space-y-6">
                    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <StatCard
                        label={t('temperature')}
                        value={`${selectedUpdate.sensor.temperature_c}°C`}
                        helper="Body temperature"
                        accent="from-rose-400/30 to-orange-400/30"
                        trend={<TrendIcon current={selectedUpdate.sensor.temperature_c} normal={NORMAL_RANGES.temperature} />}
                      />
                      <StatCard
                        label={t('heartRate')}
                        value={`${selectedUpdate.sensor.heart_rate_bpm} bpm`}
                        helper="Heart beats per minute"
                        accent="from-red-400/30 to-rose-400/30"
                        trend={<TrendIcon current={selectedUpdate.sensor.heart_rate_bpm} normal={NORMAL_RANGES.heartRate} />}
                      />
                      <StatCard
                        label={t('rumenPH')}
                        value={`${selectedUpdate.sensor.rumen_ph}`}
                        helper="Digestive health"
                        accent="from-amber-400/30 to-yellow-400/30"
                        trend={<TrendIcon current={selectedUpdate.sensor.rumen_ph} normal={NORMAL_RANGES.ph} />}
                      />
                      <StatCard
                        label={t('activity')}
                        value={`${selectedUpdate.sensor.activity_score}`}
                        helper="Movement score (0-100)"
                        accent="from-blue-400/30 to-cyan-400/30"
                        trend={<TrendIcon current={selectedUpdate.sensor.activity_score} normal={NORMAL_RANGES.activity} />}
                      />
                    </section>

                    <section className="grid gap-6 lg:grid-cols-2">
                      <div className="rounded-2xl border p-5 transition hover:shadow-sm" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}>
                        <h3 className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('healthScore')}</h3>
                        <GaugeChart score={selectedUpdate.health.health_score} status={selectedUpdate.health.health_status} />
                      </div>
                      <div className="rounded-2xl border p-5 transition hover:shadow-sm" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}>
                        <h3 className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('milkForecast')}</h3>
                        <ProductionChart
                          yesterday={selectedUpdate.sensor.milk_yesterday_liters}
                          predicted={selectedUpdate.production.milk_yield_liters}
                        />
                      </div>
                    </section>

                    {selectedUpdate.production.drop_alert && (
                      <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm font-medium text-rose-600 dark:text-rose-400">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        {t('dropAlert')}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === TAB_HEALTH && (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-2xl border p-5 transition hover:shadow-sm" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}>
                      <h3 className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('healthScore')} Trend</h3>
                      {sensorHistory.length > 1 ? (
                        <div className="h-56">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sensorHistory.slice(-30)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                              <defs>
                                <linearGradient id="healthFill" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
                                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                              <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} />
                              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} />
                              <Tooltip contentStyle={RechartsTooltipStyle} />
                              <Area type="monotone" dataKey="healthScore" stroke="var(--accent)" strokeWidth={2} fill="url(#healthFill)" dot={false} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('waitingData')}</p>
                      )}
                    </div>

                    <div className="rounded-2xl border p-5 transition hover:shadow-sm" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}>
                      <h3 className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('sensorData')}</h3>
                      <div className="space-y-2">
                        {[
                          { key: 'temperature', label: t('temperature'), value: `${selectedUpdate.sensor.temperature_c}°C`, range: NORMAL_RANGES.temperature, ok: selectedUpdate.sensor.temperature_c >= 37.5 && selectedUpdate.sensor.temperature_c <= 39.5 },
                          { key: 'heartRate', label: t('heartRate'), value: `${selectedUpdate.sensor.heart_rate_bpm} bpm`, range: NORMAL_RANGES.heartRate, ok: selectedUpdate.sensor.heart_rate_bpm >= 48 && selectedUpdate.sensor.heart_rate_bpm <= 80 },
                          { key: 'ph', label: t('rumenPH'), value: `${selectedUpdate.sensor.rumen_ph}`, range: NORMAL_RANGES.ph, ok: selectedUpdate.sensor.rumen_ph >= 6.0 && selectedUpdate.sensor.rumen_ph <= 7.0 },
                          { key: 'activity', label: t('activity'), value: `${selectedUpdate.sensor.activity_score}`, range: NORMAL_RANGES.activity, ok: selectedUpdate.sensor.activity_score >= 40 },
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between rounded-xl border px-4 py-3" style={{ borderColor: 'var(--border-color)' }}>
                            <div className="flex items-center gap-2">
                              <span className={`h-2 w-2 rounded-full ${item.ok ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              <div>
                                <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.label}</div>
                                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Normal: {item.range.label}</div>
                              </div>
                            </div>
                            <span className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === TAB_TRENDS && (
                  <div className="space-y-6">
                    <div className="rounded-2xl border p-5 transition hover:shadow-sm" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}>
                      <h3 className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('milkYield')}</h3>
                      {sensorHistory.length > 1 ? (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={sensorHistory.slice(-30)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                              <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} />
                              <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} />
                              <Tooltip contentStyle={RechartsTooltipStyle} />
                              <Line type="monotone" dataKey="milkYield" stroke="var(--accent)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: 'var(--accent)' }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('waitingData')}</p>
                      )}
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                      <div className="rounded-2xl border p-5 transition hover:shadow-sm" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}>
                        <h3 className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('temperature')}</h3>
                        {sensorHistory.length > 1 ? (
                          <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={sensorHistory.slice(-30)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} />
                                <YAxis domain={[36, 42]} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={RechartsTooltipStyle} />
                                <Line type="monotone" dataKey="temperature" stroke="#f43f5e" strokeWidth={2} dot={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('waitingData')}</p>
                        )}
                      </div>

                      <div className="rounded-2xl border p-5 transition hover:shadow-sm" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}>
                        <h3 className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('heartRate')}</h3>
                        {sensorHistory.length > 1 ? (
                          <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={sensorHistory.slice(-30)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={RechartsTooltipStyle} />
                                <Line type="monotone" dataKey="heartRate" stroke="#a855f7" strokeWidth={2} dot={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('waitingData')}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === TAB_ALERTS && (
                  <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {t('alerts')}
                        <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-secondary)' }}>({alertLog.length})</span>
                      </h3>
                      {alertLog.length > 0 && (
                        <button
                          onClick={() => { alertLogRef.current = []; setAlertLog([]); }}
                          className="text-xs font-medium transition hover:opacity-70"
                          style={{ color: 'var(--accent)' }}
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                    {alertLog.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <ShieldCheck className="h-10 w-10" style={{ color: 'var(--text-secondary)' }} />
                        <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{t('noAlerts')}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {alertLog.slice(0, 50).map((alert) => (
                          <div
                            key={alert.id + alert.timestamp}
                            className={`rounded-xl border text-sm ${severityColor(alert.severity)} ${
                              alert.anomaly ? 'cursor-pointer' : ''
                            }`}
                            onClick={() => {
                              if (alert.anomaly) {
                                setExpandedAlert(expandedAlert === alert.id ? null : alert.id);
                              }
                            }}
                          >
                            <div className="flex items-start gap-3 p-3">
                              <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                                alert.severity === 'critical' ? 'bg-rose-500/15' : alert.severity === 'warning' ? 'bg-amber-500/15' : 'bg-blue-500/15'
                              }`}>
                                <AlertTriangle className={`h-3.5 w-3.5 ${
                                  alert.severity === 'critical' ? 'text-rose-500' : alert.severity === 'warning' ? 'text-amber-500' : 'text-blue-500'
                                }`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-xs">{alert.cow_name}</span>
                                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                    alert.type === 'health' ? 'bg-rose-500/15 text-rose-500' :
                                    alert.type === 'production' ? 'bg-amber-500/15 text-amber-500' :
                                    alert.type === 'anomaly' ? 'bg-violet-500/15 text-violet-500' :
                                    'bg-blue-500/15 text-blue-500'
                                  }`}>{alert.type}</span>
                                </div>
                                <div className="mt-0.5 text-xs opacity-85">{alert.message}</div>
                                <div className="mt-1 text-[10px] opacity-60">{new Date(alert.timestamp).toLocaleString()}</div>
                              </div>
                              {alert.anomaly && (
                                <ChevronDown className={`h-4 w-4 shrink-0 transition ${expandedAlert === alert.id ? 'rotate-180' : ''}`} style={{ color: 'var(--text-secondary)' }} />
                              )}
                            </div>
                            {alert.anomaly && expandedAlert === alert.id && (
                              <div className="border-t px-3 py-3 text-xs space-y-2" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                                <div>
                                  <span className="font-semibold" style={{ color: 'var(--accent)' }}>Rule #{alert.anomaly.rule_number}</span> — Triggered Values:
                                </div>
                                <div className="grid grid-cols-2 gap-1.5">
                                  {Object.entries(alert.anomaly.triggered_by).map(([key, val]) => (
                                    <div key={key} className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5" style={{ borderColor: 'var(--border-color)' }}>
                                      <span className="capitalize opacity-70">{key.replace(/_/g, ' ')}:</span>
                                      <span className="font-semibold">{val}</span>
                                    </div>
                                  ))}
                                </div>
                                {alert.anomaly.exclusion_check && (
                                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/8 px-2.5 py-1.5 text-amber-600 dark:text-amber-400">
                                    Exclusion: {alert.anomaly.exclusion_check}
                                  </div>
                                )}
                                <div className="rounded-lg border px-2.5 py-1.5" style={{ borderColor: 'var(--border-color)' }}>
                                  {alert.anomaly.recommendation}
                                </div>
                                {alert.anomaly.report_available && alert.anomaly.id != null && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); downloadAnomalyReport(alert.anomaly!.id!); }}
                                    className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:opacity-70"
                                    style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                    Download Report
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === TAB_VISION && (
                  <div className="space-y-6">
                    <div className="rounded-2xl border p-5 transition hover:shadow-sm" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}>
                      <h3 className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('vision')}</h3>
                      <VideoPanel videoUrl={visionResult?.processed_video_url ?? undefined} />

                      {visionResult && visionResult.status === 'processed' && (
                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                          <div className="rounded-xl border p-4 text-center" style={{ borderColor: 'var(--border-color)' }}>
                            <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{t('framesProcessed')}</div>
                            <div className="mt-1 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{visionResult.frames_processed}</div>
                          </div>
                          <div className="rounded-xl border p-4 text-center" style={{ borderColor: 'var(--border-color)' }}>
                            <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{t('totalDetections')}</div>
                            <div className="mt-1 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{visionResult.total_detections}</div>
                          </div>
                          <div className="rounded-xl border p-4 text-center col-span-2 sm:col-span-1" style={{ borderColor: 'var(--border-color)' }}>
                            <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{t('behaviors')}</div>
                            <div className="mt-1 text-xs" style={{ color: 'var(--text-primary)' }}>
                              {Object.entries(visionResult.behavior_counts).map(([behavior, count]) => (
                                <div key={behavior} className="flex justify-between gap-2 py-0.5">
                                  <span className="capitalize">{behavior}</span>
                                  <span className="font-semibold">{count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {visionError && (
                        <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
                          {visionError}
                        </div>
                      )}

                      <div className="mt-6">
                        <div
                          className="rounded-2xl border-2 border-dashed p-8 text-center transition"
                          style={{
                            borderColor: videoFile ? 'var(--accent)' : 'var(--border-color)',
                            background: videoFile ? 'var(--bg-card)' : 'transparent',
                          }}
                        >
                          <Camera className="mx-auto h-10 w-10" style={{ color: 'var(--text-secondary)' }} />
                          <p className="mt-4 text-sm" style={{ color: 'var(--text-primary)' }}>{t('dragVideo')}</p>
                          <div className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{videoFile?.name ?? t('noVideo')}</div>
                          <label className="mt-5 inline-flex cursor-pointer items-center rounded-xl border px-5 py-2.5 text-sm font-medium transition hover:bg-black/5 dark:hover:bg-white/5"
                            style={{ borderColor: 'var(--border-color)' }}>
                            <input
                              type="file"
                              accept="video/*"
                              className="hidden"
                              onChange={(event) => { setVisionResult(null); setVisionError(''); setVideoFile(event.target.files?.[0] ?? null); }}
                            />
                            {t('uploadVideo')}
                          </label>
                          {videoFile && (
                            <button
                              onClick={handleVisionProcess}
                              disabled={uploading}
                              className="soft-button ml-3 text-white disabled:opacity-70"
                              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}
                            >
                              {uploading ? t('processing') : t('processVideo')}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
