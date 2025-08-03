export default function Debug() {
  return (
    <div>
      <h1>Debug Page Works!</h1>
      <p>Environment: {process.env.NODE_ENV}</p>
      <p>App URL: {process.env.NEXT_PUBLIC_APP_URL || 'NOT SET'}</p>
      <p>If you see this, static routes work!</p>
    </div>
  );
}
