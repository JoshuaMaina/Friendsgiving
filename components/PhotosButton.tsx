/** Link to the shared photo album the host sets on the dashboard. */
export function PhotosButton({ url }: { url: string }) {
  return (
    <a className="btn block photos-btn" href={url} target="_blank" rel="noopener">
      📸 Add your photos to the shared album ↗
    </a>
  );
}
