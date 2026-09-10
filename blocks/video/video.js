/**
 * video — embeds the source's players (Brightcove player/playlist, YouTube, Vimeo) from an authored link.
 * Rows: [poster image]? [link]. The link is kept (moved into the figure) so the video stays reachable
 * without JS; the iframe is added on decorate. Brightcove playlists get a taller frame like the source's
 * playlist player.
 */
function embedUrl(href) {
  try {
    const u = new URL(href);
    if (u.hostname.includes('youtube.com') || u.hostname === 'youtu.be') {
      const id = u.hostname === 'youtu.be' ? u.pathname.slice(1) : (u.searchParams.get('v') || u.pathname.split('/').pop());
      return { src: `https://www.youtube.com/embed/${id}?rel=0`, playlist: false };
    }
    if (u.hostname.includes('vimeo.com')) return { src: `https://player.vimeo.com/video/${u.pathname.split('/').pop()}`, playlist: false };
    if (u.hostname.includes('brightcove.net')) return { src: u.href, playlist: u.searchParams.has('playlistId') };
    return { src: u.href, playlist: false };
  } catch (e) { return null; }
}

export default function decorate(block) {
  const link = block.querySelector('a[href]');
  if (!link) return;
  const poster = block.querySelector('picture, img');
  const figure = document.createElement('figure');
  figure.className = 'video-figure';
  const info = embedUrl(link.href);
  if (poster) { const p = document.createElement('div'); p.className = 'video-poster'; p.append(poster.closest('picture') || poster); figure.append(p); }
  if (info) {
    const frame = document.createElement('iframe');
    frame.src = info.src;
    frame.title = link.textContent.trim() || 'Video';
    frame.setAttribute('allow', 'encrypted-media; fullscreen; picture-in-picture');
    frame.setAttribute('allowfullscreen', '');
    frame.loading = 'lazy';
    figure.append(frame);
    if (info.playlist) block.classList.add('playlist');
  }
  const cap = document.createElement('figcaption');
  cap.className = 'video-link';
  cap.append(link);
  figure.append(cap);
  block.replaceChildren(figure);
}
