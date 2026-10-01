import { ImageResponse } from 'next/og';

// Placeholder Open Graph image until the bio page is built.
export const alt = 'Fellow Owners';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: 72,
        background: '#DADADC',
        color: '#2D2D30',
        fontSize: 88,
        letterSpacing: -3,
      }}
    >
      <div style={{ fontSize: 32, color: '#6E6E73', marginBottom: 16 }}>Fellow Owners</div>
      Turn followers into fellow owners.
    </div>,
    size,
  );
}
