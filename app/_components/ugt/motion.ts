export function motionPolicy(pathname: string): 'loud' | 'quiet' {
  const path = pathname.split('?')[0].replace(/\/$/, '') || '/';
  return path === '/' || path === '/experience' ? 'loud' : 'quiet';
}