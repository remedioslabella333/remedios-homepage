async function digest(value) {
  const bytes = new TextEncoder().encode(value);
  const buffer = await crypto.subtle.digest('SHA-256', bytes);
  return new Uint8Array(buffer);
}

export async function isAdmin(request, env) {
  const configured = env.ADMIN_TOKEN;
  if (!configured) return false;
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return false;
  const [provided, expected] = await Promise.all([digest(header.slice(7)), digest(configured)]);
  return provided.length === expected.length && provided.every((byte, index) => byte === expected[index]);
}
