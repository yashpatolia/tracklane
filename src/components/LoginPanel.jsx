const STAGES = ['Applied', 'OA', 'Interview', 'Offer'];

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.27-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  );
}

export default function LoginPanel() {
  return (
    <div className="login-page">
      <div className="login-brand">
        <div className="login-eyebrow">
          <span className="live-dot">
            <span className="live-dot__ring" />
            <span className="live-dot__core" />
          </span>
          <span>TRACKLANE</span>
        </div>
        <h1 className="login-headline">
          Every application,
          <br />
          one pipeline.
        </h1>
        <p className="login-sub">
          Applied, OA, interview, offer — tracked end to end in one place.
        </p>
        <div className="login-stages">
          {STAGES.map((stage, i) => (
            <>
              <div className="login-stage" style={{ '--i': i }} key={stage}>
                <span className="login-stage__dot" />
                <span className="login-stage__label">{stage}</span>
              </div>
              {i < STAGES.length - 1 && <span className="login-stage__rail" key={`${stage}-rail`} />}
            </>
          ))}
        </div>
      </div>

      <div className="login-panel">
        <div className="login-card">
          <div className="login-card__body">
            <p className="login-card__eyebrow">Sign in</p>
            <h2 className="login-card__title">Welcome back</h2>
            <p className="login-card__sub">Continue with your Google account.</p>
            <a className="login-google-btn" href="/auth/google">
              <GoogleIcon />
              Continue with Google
            </a>
          </div>
          <div className="login-card__stub">
            <span className="login-card__stub-code">TRK-{new Date().getFullYear()}</span>
            <span className="login-card__stub-code">BOARDING</span>
          </div>
        </div>
      </div>
    </div>
  );
}
