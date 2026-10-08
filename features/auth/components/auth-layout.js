"use client";

export function Footer() {
  return (
    <footer className="auth-footer">
      <p>Need help?</p>
      <p className="terms">
        By logging in, you agree to volymoly
        <br />
        <a href="#terms">Terms of Use</a> and <a href="#privacy">Privacy Policy</a>
      </p>
    </footer>
  );
}

export function EmailSummary({ email, onChangeEmail }) {
  return (
    <div className="email-summary">
      <span>{email}</span>
      <button className="text-link accent" onClick={onChangeEmail} type="button">
        Change Email
      </button>
    </div>
  );
}

export function LoginHeader({ title = "Log in", subtitle = "Continue to volymoly", centered = true }) {
  return (
    <header className={`intro${centered ? " centered" : ""}`}>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </header>
  );
}
