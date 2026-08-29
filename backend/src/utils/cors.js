function origins(env) {
  return new Set((env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean));
}

export function corsHeaders(request, env) {
  const origin = request.headers.get('origin');
  const allowed = origin && origins(env).has(origin) ? origin : null;
  return {
    ...(allowed ? { 'access-control-allow-origin': allowed, vary: 'Origin' } : {}),
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'access-control-allow-headers': 'Content-Type, Authorization, X-Session-Id',
    'access-control-max-age': '86400'
  };
}
