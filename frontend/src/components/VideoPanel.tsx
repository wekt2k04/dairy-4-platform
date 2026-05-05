import { Video } from 'lucide-react';

interface VideoPanelProps {
  videoUrl?: string;
}

export default function VideoPanel({ videoUrl }: VideoPanelProps) {
  return (
    <div className="glass-panel rounded-3xl p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl bg-white/5 p-3 text-accent">
          <Video className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Vision Block</div>
          <div className="mt-1 text-lg font-medium text-white">YOLO / ViT behavior stream</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/30">
        {videoUrl ? (
          <video className="aspect-video w-full object-cover" controls src={videoUrl} />
        ) : (
          <div className="flex aspect-video items-center justify-center p-8 text-center text-sm text-slate-300">
            Upload a farm video to preview the behavior pipeline. The backend stores the file and returns a playable URL.
          </div>
        )}
      </div>
    </div>
  );
}
