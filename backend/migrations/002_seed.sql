INSERT OR IGNORE INTO status (id, type, label, content, priority) VALUES
  (1, 'now', 'NOW', 'building something', 40),
  (2, 'mood', 'MOOD', 'low battery', 30),
  (3, 'music', 'MUSIC', 'online', 20),
  (4, 'signal', 'SIGNAL', 'stable', 10);

INSERT OR IGNORE INTO comments (id, nickname, content, avatar_url, weight) VALUES
  (1, '小雨', '这个主页也太像你的网络房间了', NULL, 3),
  (2, '404', '像素味很正，归档页很好用', NULL, 2),
  (3, 'Moon', '今天也要保持在线 ✦', NULL, 2),
  (4, 'Nana', '粉蓝配色看着很舒服', NULL, 1),
  (5, '朋友A', '什么时候更新下一篇？', NULL, 1);

INSERT OR IGNORE INTO friends (id, name, description, url, tag, sort_order) VALUES
  (1, 'Moonroom', '设计、摄影与一些轻量的生活记录。', 'https://example.com/moonroom', 'design', 10),
  (2, '404 Garden', '技术博客 / 开源项目 / 奇怪实验室。', 'https://example.com/404-garden', 'tech', 20),
  (3, 'Night Radio', '音乐、游戏和互联网文化收藏。', 'https://example.com/night-radio', 'culture', 30);

INSERT OR IGNORE INTO posts (id, slug, title, description, category, tags, link, published_at) VALUES
  (1, 'network-room', '欢迎来到我的网络房间', '主页索引、最近在做的事，以及这个网站为什么长成现在这样。', '站务', '["站务","随笔"]', '#', '2026-08-11T13:30:00Z'),
  (2, 'project-retrospective', '最近的一次项目复盘', '记录从模糊想法到可运行 Demo 的过程：问题、方案、取舍与下一步。', '项目', '["项目","复盘"]', '#', '2026-08-08T00:00:00Z'),
  (3, 'recent-learning', '一些最近学到的东西', '把零散输入整理成可复用的框架，而不是让收藏夹继续无限膨胀。', '学习', '["学习","笔记"]', '#', '2026-08-03T00:00:00Z');
