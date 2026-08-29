export const EVENT_NAMES = new Set([
  'page_view', 'cli_command', 'music_play', 'music_pause',
  'post_click', 'friend_click', 'guestbook_submit'
]);

export async function recordEvent(db, event) {
  await db.prepare(
    'INSERT INTO events (event_name, session_id, page, metadata) VALUES (?, ?, ?, ?)'
  ).bind(event.event_name, event.session_id || null, event.page || null, JSON.stringify(event.metadata || {})).run();
}
