"use client";

type AnnouncementBannerProps = {
  settings: {
    isEnabled: boolean;
    messages: string[];
    itemsPerCycle: number;
    bannerHeight: number;
  };
};

const BULLET = "•";

const buildMessageTrack = (messages: string[], targetLength: number): string[] => {
  const sanitized = messages
    .map((message) => message.trim())
    .filter((message) => message.length > 0);

  if (sanitized.length === 0) {
    return [];
  }

  const track: string[] = [...sanitized];

  while (track.length < targetLength) {
    track.push(...sanitized);
    if (track.length > targetLength) {
      track.splice(targetLength);
      break;
    }
  }

  return track;
};

export function AnnouncementBanner({ settings }: AnnouncementBannerProps) {
  if (!settings.isEnabled) {
    return null;
  }

  const itemsPerCycle = Math.max(1, Math.floor(settings.itemsPerCycle));
  const track = buildMessageTrack(settings.messages, itemsPerCycle);

  if (track.length === 0) {
    return null;
  }

  const marqueeRun = [...track, ...track];
  const textLength = marqueeRun.join(" ").length;
  const duration = Math.max(12, Math.min(40, Math.round(textLength * 0.4)));
  const height = Math.max(24, Math.min(120, Math.floor(settings.bannerHeight || 36)));

  return (
    <div
      className="border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60"
      style={{ minHeight: `${height}px` }}
    >
      <div className="relative overflow-hidden" style={{ minHeight: `${height}px` }}>
        <div
          className="flex items-center gap-8 whitespace-nowrap text-xs font-medium uppercase tracking-wider text-muted-foreground"
          style={{
            animation: `announcement-marquee ${duration}s linear infinite`,
            lineHeight: `${height}px`,
            minHeight: `${height}px`,
          }}
        >
          {marqueeRun.map((message, index) => (
            <span key={`${message}-${index}`} className="flex items-center gap-3">
              {message}
              <span aria-hidden>{BULLET}</span>
            </span>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes announcement-marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
