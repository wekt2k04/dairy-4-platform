import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Camera, CloudUpload, Radar, Send } from 'lucide-react';

import { runFullSimulation, uploadVideo } from '../services/api';
import type { ProductionInput } from '../types';

const defaultInputs: ProductionInput = {
  temperature_c: 38.4,
  heart_rate_bpm: 74,
  rumen_ph: 6.3,
  activity_score: 72,
  milk_yesterday_liters: 31.5,
  time_of_day_hhmm: '07:30',
};

export default function SimulatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [inputs, setInputs] = useState(defaultInputs);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const authMode =
    typeof location.state === 'object' && location.state && 'authMode' in location.state
      ? String((location.state as { authMode?: unknown }).authMode ?? '')
      : '';

  const previewName = useMemo(() => videoFile?.name ?? 'No file selected', [videoFile]);

  function updateInput<K extends keyof typeof defaultInputs>(key: K, value: (typeof defaultInputs)[K]) {
    setInputs((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      let videoUrl: string | undefined;
      if (videoFile) {
        const uploadResult = await uploadVideo(videoFile);
        videoUrl = uploadResult.video_url;
      }

      const result = await runFullSimulation({
        ...inputs,
        video_url: videoUrl,
      });

      navigate(`/dashboard?prediction_id=${result.prediction_id}`, { state: result });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Simulation failed');
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      setVideoFile(file);
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="glass-panel mb-6 rounded-[2rem] p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="label-chip w-fit">Simulation Control Panel</div>
              <h1 className="mt-4 text-3xl font-semibold text-white">Run AI Diagnostics.</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Enter the essential sensor variables, optionally attach a farm video, and send one unified payload to FastAPI.
              </p>
            </div>
            {authMode ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                Session mode: <span className="font-semibold text-white">{authMode}</span>
              </div>
            ) : null}
          </div>
        </header>

        <form className="grid gap-6 lg:grid-cols-[1fr_0.95fr]" onSubmit={handleSubmit}>
          <section className="glass-panel rounded-[2rem] p-6">
            <div className="mb-5 flex items-center gap-3">
              <Radar className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-medium text-white">Essential sensor inputs</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <NumberField
                label="Body Temperature (°C)"
                value={inputs.temperature_c}
                min={35}
                max={43}
                step={0.1}
                onChange={(value) => updateInput('temperature_c', Number(value))}
              />
              <NumberField
                label="Heart Rate (bpm)"
                value={inputs.heart_rate_bpm}
                min={20}
                max={150}
                step={1}
                onChange={(value) => updateInput('heart_rate_bpm', Number(value))}
              />
              <NumberField
                label="Rumen pH"
                value={inputs.rumen_ph}
                min={4}
                max={8}
                step={0.1}
                onChange={(value) => updateInput('rumen_ph', Number(value))}
              />
              <NumberField
                label="Yesterday's Milk Production (L)"
                value={inputs.milk_yesterday_liters}
                min={0}
                max={80}
                step={0.1}
                onChange={(value) => updateInput('milk_yesterday_liters', Number(value))}
              />
            </div>

            <div className="mt-6 max-w-md">
              <SliderField
                label="Activity Score"
                value={inputs.activity_score}
                min={0}
                max={100}
                onChange={(value) => updateInput('activity_score', Number(value))}
              />
            </div>

            <div className="mt-6 max-w-md">
              <TimeField label="Time of Record" value={inputs.time_of_day_hhmm} onChange={(value) => updateInput('time_of_day_hhmm', value)} />
            </div>
          </section>

          <aside className="space-y-6">
            <section className="glass-panel rounded-[2rem] p-6">
              <div className="mb-5 flex items-center gap-3">
                <CloudUpload className="h-5 w-5 text-accent2" />
                <h2 className="text-lg font-medium text-white">Optional video upload</h2>
              </div>

              <div
                onDragEnter={() => setDragActive(true)}
                onDragLeave={() => setDragActive(false)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                className={`rounded-[1.75rem] border-2 border-dashed p-8 text-center transition ${
                  dragActive ? 'border-accent bg-accent/10' : 'border-white/15 bg-white/5'
                }`}
              >
                <Camera className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-4 text-sm text-slate-200">Drop a farm clip here or choose a file.</p>
                <p className="mt-2 text-xs text-slate-400">The vision block stays optional and never blocks the health or production flow.</p>
                <label className="mt-5 inline-flex cursor-pointer items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10">
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(event) => setVideoFile(event.target.files?.[0] ?? null)}
                  />
                  Choose video
                </label>
                <div className="mt-4 text-xs text-slate-400">{previewName}</div>
              </div>
            </section>

            <button
              type="submit"
              disabled={loading}
              className="soft-button w-full bg-gradient-to-r from-accent to-accent2 shadow-[0_18px_40px_rgba(119,201,139,0.24)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Send className="h-4 w-4" />
              {loading ? 'Running diagnostics...' : 'Run AI Diagnostics'}
            </button>

            {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
          </aside>
        </form>
      </div>
    </main>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2 text-sm text-slate-300">
      <span className="block">{label}</span>
      <input className="soft-input" type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2 text-sm text-slate-300">
      <div className="flex items-center justify-between">
        <span>{label}</span>
        <span className="text-white">{value}</span>
      </div>
      <input className="w-full accent-cyan-300" type="range" min={min} max={max} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2 text-sm text-slate-300">
      <span className="block">{label}</span>
      <input className="soft-input" type="time" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
