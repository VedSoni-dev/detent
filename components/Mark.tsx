// detent's mark: a rail with one notch and a ridged cap sitting in it. Our own drawing.
export default function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="mark">
      <rect x="2" y="11" width="20" height="2.4" rx="1.2" fill="currentColor" opacity=".28" />
      <rect x="2" y="11" width="10" height="2.4" rx="1.2" fill="var(--accent)" />
      <rect x="8.5" y="4" width="7" height="16" rx="3" fill="var(--bg, #fff)" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10.6 10h2.8M10.6 12.2h2.8M10.6 14.4h2.8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}
