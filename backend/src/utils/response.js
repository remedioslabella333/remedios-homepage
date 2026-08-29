export function ok(data, status = 200, headers = {}) {
  return Response.json({ success: true, data }, { status, headers });
}

export function fail(code, message, status = 400, headers = {}) {
  return Response.json({ success: false, error: { code, message } }, { status, headers });
}
