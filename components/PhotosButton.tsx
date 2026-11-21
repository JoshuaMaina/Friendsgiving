/** Link to the shared photo album the host sets on the dashboard. */
export function PhotosButton({ url }: { url: string }) {
  return (
    <a className="btn block photos-btn" href={url} target="_blank" rel="noopener">
      📸 Add your photos to the shared album ↗
    </a>
  );
}

/** Link to the Spotify Jam so guests can queue songs. */
export function MusicButton({ url }: { url: string }) {
  return (
    <a className="btn block photos-btn" href={url} target="_blank" rel="noopener">
      🎵 Add songs to the party playlist ↗
    </a>
  );
}
