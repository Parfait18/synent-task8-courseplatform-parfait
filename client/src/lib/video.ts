export type VideoSource =
  | { kind: 'youtube'; id: string; embedUrl: string }
  | { kind: 'file'; src: string }
  | { kind: 'unsupported'; url: string }

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/

/**
 * Turns a lesson URL into something playable. YouTube links become a privacy-enhanced
 * youtube-nocookie.com embed; direct video files play in an HTML5 <video>. Anything that is
 * not http(s) is refused, so a stored `javascript:` URL can never reach the page.
 */
export function parseVideoUrl(raw: string): VideoSource {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return { kind: 'unsupported', url: raw }
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { kind: 'unsupported', url: raw }

  const host = url.hostname.replace(/^www\.|^m\./, '')
  let id: string | null = null
  if (host === 'youtu.be') id = url.pathname.slice(1)
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') id = url.searchParams.get('v')
    else {
      const match = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)
      id = match?.[1] ?? null
    }
  }
  if (id !== null) {
    if (!YOUTUBE_ID.test(id)) return { kind: 'unsupported', url: raw }
    return { kind: 'youtube', id, embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1` }
  }
  if (/\.(mp4|webm|ogg|mov|m4v)$/i.test(url.pathname)) return { kind: 'file', src: url.toString() }
  return { kind: 'unsupported', url: raw }
}
