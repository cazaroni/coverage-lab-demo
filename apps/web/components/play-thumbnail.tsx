import type { PlayListRow } from "@projectedge/schemas";

type Props = {
  play: Pick<PlayListRow, "play_id" | "thumbnail_url">;
  className?: string;
};

export function PlayThumbnail({ play, className }: Props) {
  if (play.thumbnail_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={play.thumbnail_url}
        alt={`Play ${play.play_id} thumbnail`}
        className={className}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center bg-[#0f5d43]/30 text-[#37d0b6]/50 ${className ?? ""}`}
      aria-label={`No thumbnail for play ${play.play_id}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 opacity-60"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
        />
      </svg>
    </div>
  );
}
