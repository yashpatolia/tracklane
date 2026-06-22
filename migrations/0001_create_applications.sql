CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company TEXT NOT NULL,
  role TEXT DEFAULT '',
  location TEXT DEFAULT '',
  stack TEXT DEFAULT '',
  status TEXT DEFAULT 'Not Applied',
  applied TEXT DEFAULT '',
  oa TEXT DEFAULT '',
  interview TEXT DEFAULT '',
  offer TEXT DEFAULT '',
  comp TEXT DEFAULT '',
  platform TEXT DEFAULT '',
  link TEXT DEFAULT '',
  notes TEXT DEFAULT ''
);
