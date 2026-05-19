import { Video } from 'lucide-react';
import { resolveBackendAssetUrl } from '../services/api';

interface VideoPanelProps {
  videoUrl?: string;
}

export default function VideoPanel({ videoUrl }: VideoPanelProps) {
  const resolvedVideoUrl = resolveBackendAssetUrl(videoUrl);

  return (
    <div className="glass-panel rounded-3xl p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl p-3" style={{ background: 'var(--bg-card)', color: 'var(--accent)' }}>
          <Video className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.24em]" style={{ color: 'var(--text-secondary)' }}>Vision Block</div>
          <div className="mt-1 text-lg font-medium" style={{ color: 'var(--text-primary)' }}>YOLO / ViT behavior stream</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border" style={{ borderColor: 'var(--border-color)', background: 'rgba(0,0,0,0.3)' }}>
        {resolvedVideoUrl ? (
          <video
            key={resolvedVideoUrl}
            className="aspect-video w-full object-cover"
            controls
            playsInline
            preload="metadata"
            src={resolvedVideoUrl}
          />
        ) : (
          <div className="flex aspect-video items-center justify-center p-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            Upload a farm video to preview the behavior pipeline. The backend stores the file and returns a playable URL.
          </div>
        )}
      </div>
    </div>
  );
}
