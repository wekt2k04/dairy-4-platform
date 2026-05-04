type Props = {
  videoUrl?: string | null;
};

const boxes = [
  { left: "14%", top: "20%", width: "22%", height: "18%", label: "Cow #14" },
  { left: "56%", top: "34%", width: "18%", height: "21%", label: "Motion" },
  { left: "34%", top: "58%", width: "26%", height: "16%", label: "Feed zone" },
];

export function VisionPlayer({ videoUrl }: Props) {
  return (
    <div className="rounded-[2rem] border border-pasture/10 bg-white/85 p-5 shadow-panel backdrop-blur-sm">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-pasture/55">Vision stream</p>
          <h3 className="mt-2 font-display text-2xl font-bold text-slateInk">YOLO/ViT overlay preview</h3>
        </div>
        <div className="rounded-full border border-pasture/15 bg-pasture/8 px-3 py-1 text-xs font-semibold text-pastureDark">
          {videoUrl ? "Uploaded clip active" : "Demo clip placeholder"}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[1.6rem] border border-slate-200 bg-slate-950 shadow-inner">
        {videoUrl ? (
          <video controls playsInline muted className="aspect-video w-full object-cover" src={videoUrl} />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.1),_transparent_38%),linear-gradient(135deg,#102019_0%,#294436_45%,#5f6f52_100%)] px-6 text-center text-cream">
            <div>
              <p className="font-display text-3xl font-bold">Camera feed ready</p>
              <p className="mx-auto mt-3 max-w-lg text-sm text-cream/75">
                Upload a farm video in the simulator to attach a playable clip here. Detection boxes are rendered as a
                visual stand-in for the future vision model output.
              </p>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0">
          {boxes.map((box) => (
            <div
              key={box.label}
              className="absolute rounded-2xl border border-amber-300/80 bg-amber-200/8 shadow-[0_0_0_1px_rgba(244,190,90,0.3)] backdrop-blur-[1px]"
              style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
            >
              <div className="absolute -top-3 left-2 rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.22em] text-slateInk">
                {box.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
