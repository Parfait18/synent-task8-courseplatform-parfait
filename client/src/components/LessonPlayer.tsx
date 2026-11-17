import { parseVideoUrl } from '@/lib/video'

/** HTML5 video for files, privacy-enhanced YouTube embed for YouTube links. */
export function LessonPlayer({ url, title }: { url: string; title: string }) {
  const source = parseVideoUrl(url)
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-ink">
      {source.kind === 'youtube' && (
        <iframe
          key={source.id}
          src={source.embedUrl}
          title={`Video: ${title}`}
          className="absolute inset-0 size-full"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          loading="lazy"
        />
      )}
      {source.kind === 'file' && (
        <video key={source.src} className="absolute inset-0 size-full" controls preload="metadata" playsInline aria-label={`Video: ${title}`}>
          <source src={source.src} />
          Your browser cannot play this video. <a href={source.src}>Download it</a> instead.
        </video>
      )}
      {source.kind === 'unsupported' && (
        <div className="on-dark absolute inset-0 grid place-items-center p-6 text-center text-white">
          <p>This video format is not supported in the player.</p>
        </div>
      )}
    </div>
  )
}
