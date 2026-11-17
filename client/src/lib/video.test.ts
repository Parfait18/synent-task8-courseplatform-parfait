import { describe, expect, it } from 'vitest'
import { parseVideoUrl } from './video'

describe('parseVideoUrl', () => {
  it('should turn YouTube watch, short and embed links into a youtube-nocookie embed', () => {
    for (const url of ['https://www.youtube.com/watch?v=PkZNo7MFNFg', 'https://youtu.be/PkZNo7MFNFg', 'https://www.youtube.com/embed/PkZNo7MFNFg', 'https://m.youtube.com/watch?v=PkZNo7MFNFg&t=10']) {
      expect(parseVideoUrl(url)).toEqual({ kind: 'youtube', id: 'PkZNo7MFNFg', embedUrl: 'https://www.youtube-nocookie.com/embed/PkZNo7MFNFg?rel=0&modestbranding=1' })
    }
  })

  it('should play direct video files in an HTML5 player', () => {
    expect(parseVideoUrl('https://cdn.example.com/lesson.mp4')).toEqual({ kind: 'file', src: 'https://cdn.example.com/lesson.mp4' })
    expect(parseVideoUrl('https://cdn.example.com/lesson.webm').kind).toBe('file')
  })

  it('should refuse non-http schemes, malformed ids and unknown pages', () => {
    expect(parseVideoUrl('javascript:alert(1)').kind).toBe('unsupported')
    expect(parseVideoUrl('data:video/mp4;base64,AAAA').kind).toBe('unsupported')
    expect(parseVideoUrl('https://www.youtube.com/watch?v=bad"id').kind).toBe('unsupported')
    expect(parseVideoUrl('https://example.com/page.html').kind).toBe('unsupported')
    expect(parseVideoUrl('not a url').kind).toBe('unsupported')
  })
})
