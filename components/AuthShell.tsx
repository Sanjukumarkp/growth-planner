import Link from 'next/link';

export const Logo = () => (
  <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="var(--accent)"/><rect x="7" y="17" width="4.5" height="8" rx="1.5" fill="#fff"/><rect x="13.75" y="12" width="4.5" height="13" rx="1.5" fill="#fff"/><rect x="20.5" y="7" width="4.5" height="18" rx="1.5" fill="#FFB01F"/></svg>
);

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth">
      <div className="auth-l">
        <Link className="brand" href="/"><Logo /><span>Growth Planner</span></Link>
        {children}
        <p className="small muted"><Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link></p>
      </div>
      <aside className="auth-r" aria-label="About Growth Planner">
        <div className="eyebrow">For first-time founders</div>
        <h2>Run your startup in <em>20 minutes</em> a week.</h2>
        <ul>
          <li><i />Three moves every Monday, picked from your numbers</li>
          <li><i />A 13-week cash forecast with what-if tests</li>
          <li><i />GST, TDS and ROC dates before they bite</li>
          <li><i />An advisor that reads your own numbers</li>
        </ul>
      </aside>
    </main>
  );
}
