export const createTablesSQL = `
CREATE TABLE IF NOT EXISTS games (
  game_id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK(mode IN ('classic', 'tournament')),
  tournament_id TEXT,
  winner_id INTEGER,
  date DATETIME NOT NULL,
  duration TEXT
);

CREATE TABLE IF NOT EXISTS game_participation (
  game_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  score INTEGER NOT NULL,
  result TEXT NOT NULL CHECK(result IN ('win', 'loss', 'draw')),
  PRIMARY KEY (game_id, user_id),
  FOREIGN KEY (game_id) REFERENCES games(game_id)
);

CREATE TABLE IF NOT EXISTS tournaments (
  tournament_id TEXT PRIMARY KEY,
  semi1_id TEXT NOT NULL,
  semi2_id TEXT NOT NULL,
  final_id TEXT NOT NULL,
  winner_id INTEGER NOT NULL,
  date DATETIME NOT NULL,
  FOREIGN KEY (semi1_id) REFERENCES games(game_id),
  FOREIGN KEY (semi2_id) REFERENCES games(game_id),
  FOREIGN KEY (final_id) REFERENCES games(game_id)
);

CREATE TABLE IF NOT EXISTS tournament_participation (
  tournament_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  PRIMARY KEY (tournament_id, user_id),
  FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id)
);

CREATE TABLE IF NOT EXISTS local_games (
  game_id TEXT PRIMARY KEY,
  host_id INTEGER NOT NULL,
  date DATETIME NOT NULL,
  duration TEXT NOT NULL,
  winner_type TEXT CHECK(winner_type IN ('host', 'guest')),
  winner_guest_name TEXT
);

CREATE TABLE IF NOT EXISTS local_game_participants (
  game_id TEXT NOT NULL,
  position INTEGER NOT NULL CHECK(position >= 1 AND position <= 4),
  guest_name TEXT,
  score INTEGER NOT NULL,
  PRIMARY KEY (game_id, position),
  FOREIGN KEY (game_id) REFERENCES local_games(game_id)
);

CREATE TABLE IF NOT EXISTS local_tournaments (
  tournament_id TEXT PRIMARY KEY,
  host_id INTEGER NOT NULL,
  guest1_name TEXT NOT NULL,
  guest2_name TEXT NOT NULL,
  guest3_name TEXT NOT NULL,
  semi1_id TEXT NOT NULL,
  semi2_id TEXT NOT NULL,
  final_id TEXT NOT NULL,
  winner_type TEXT NOT NULL CHECK(winner_type IN ('host', 'guest')),
  winner_name TEXT NOT NULL,
  date DATETIME NOT NULL,
  FOREIGN KEY (semi1_id) REFERENCES local_games(game_id),
  FOREIGN KEY (semi2_id) REFERENCES local_games(game_id),
  FOREIGN KEY (final_id) REFERENCES local_games(game_id)
);
`;
