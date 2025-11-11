import Database from "better-sqlite3";

export function prepareStatements(db: Database.Database) {
  return {
    insertGame: db.prepare(`
      INSERT INTO games (game_id, mode, tournament_id, winner_id, date, duration)
      VALUES (?, ?, ?, ?, ?, ?)
    `),

    insertGameParticipation: db.prepare(`
      INSERT INTO game_participation (game_id, user_id, score, result)
      VALUES (?, ?, ?, ?)
    `),

    insertTournament: db.prepare(`
      INSERT INTO tournaments (tournament_id, semi1_id, semi2_id, final_id, winner_id, date)
      VALUES (?, ?, ?, ?, ?, ?)
    `),

    insertTournamentParticipation: db.prepare(`
      INSERT INTO tournament_participation (tournament_id, user_id)
      VALUES (?, ?)
    `),

    getGamesByPlayer: db.prepare(`
      SELECT
        g.game_id,
        g.mode,
        g.tournament_id,
        g.winner_id,
        g.date,
        g.duration,
        json_group_array(
          json_object('id', gp.user_id, 'score', gp.score, 'result', gp.result)
        ) AS players
      FROM games g
      JOIN game_participation gp ON g.game_id = gp.game_id
      WHERE g.game_id IN (
        SELECT game_id FROM game_participation WHERE user_id = ?
      )
      GROUP BY g.game_id
      ORDER BY g.date DESC
      LIMIT ? OFFSET ?
    `),

    getTournamentsByPlayer: db.prepare(`
      SELECT
        t.tournament_id,
        t.semi1_id,
        t.semi2_id,
        t.final_id,
        t.winner_id,
        t.date,
        json_group_array(
          json_object('id', tp.user_id)
        ) AS participants
      FROM tournaments t
      JOIN tournament_participation tp ON t.tournament_id = tp.tournament_id
      WHERE t.tournament_id IN (
        SELECT tournament_id FROM tournament_participation WHERE user_id = ?
      )
      GROUP BY t.tournament_id
      ORDER BY t.date DESC
      LIMIT ? OFFSET ?
    `),

    getGameStatsByPlayer: db.prepare(`
      SELECT
        SUM(CASE WHEN gp.result = 'win' THEN 1 ELSE 0 END) AS wins,
        SUM(CASE WHEN gp.result = 'draw' THEN 1 ELSE 0 END) AS draws,
        SUM(CASE WHEN gp.result = 'loss' THEN 1 ELSE 0 END) AS losses
      FROM game_participation gp
      WHERE gp.user_id = ?
    `),

    getDailyStatsByPlayer: db.prepare(`
      SELECT
        date(g.date) AS day,
        COUNT(*) AS totalGames,
        SUM(CASE WHEN gp.result = 'win' THEN 1 ELSE 0 END) AS wins,
        SUM(CASE WHEN gp.result = 'draw' THEN 1 ELSE 0 END) AS draws,
        SUM(CASE WHEN gp.result = 'loss' THEN 1 ELSE 0 END) AS losses
      FROM games g
      JOIN game_participation gp ON g.game_id = gp.game_id
      WHERE gp.user_id = ?
      GROUP BY day
      ORDER BY day DESC
    `),

    getRecentGamesByPlayer: db.prepare(`
      SELECT
        g.game_id,
        g.mode,
        g.tournament_id,
        g.winner_id,
        g.date,
        g.duration,
        json_group_array(
          json_object('id', gp.user_id, 'score', gp.score, 'result', gp.result)
        ) AS players
      FROM games g
      JOIN game_participation gp ON g.game_id = gp.game_id
      WHERE g.game_id IN (
        SELECT game_id FROM game_participation WHERE user_id = ?
      )
      GROUP BY g.game_id
      ORDER BY g.date DESC
      LIMIT ?
    `),

      getRecentTournamentsByPlayer: db.prepare(`
      SELECT
        t.tournament_id,
        t.semi1_id,
        t.semi2_id,
        t.final_id,
        t.winner_id,
        t.date,
        json_group_array(
          json_object('id', tp.user_id)
        ) AS participants
      FROM tournaments t
      JOIN tournament_participation tp ON t.tournament_id = tp.tournament_id
      WHERE t.tournament_id IN (
        SELECT tournament_id FROM tournament_participation WHERE user_id = ?
      )
      GROUP BY t.tournament_id
      ORDER BY t.date DESC
      LIMIT ?
    `),

    getGameById: db.prepare(`
      SELECT
        g.game_id,
        g.mode,
        g.tournament_id,
        g.winner_id,
        g.date,
        g.duration,
        json_group_array(
          json_object('id', gp.user_id, 'score', gp.score, 'result', gp.result)
        ) AS players
      FROM games g
      JOIN game_participation gp ON g.game_id = gp.game_id
      WHERE g.game_id = ?
      GROUP BY g.game_id
    `),

    getTournamentById: db.prepare(`
      SELECT
        t.tournament_id,
        t.semi1_id,
        t.semi2_id,
        t.final_id,
        t.winner_id,
        t.date,
        json_group_array(
          json_object('id', tp.user_id)
        ) AS participants
      FROM tournaments t
      JOIN tournament_participation tp ON t.tournament_id = tp.tournament_id
      WHERE t.tournament_id = ?
      GROUP BY t.tournament_id
    `),

    insertLocalGame: db.prepare(`
      INSERT INTO local_games (game_id, host_id, date, duration, winner_type, winner_guest_name)
      VALUES (?, ?, ?, ?, ?, ?)
    `),

    insertLocalGameParticipant: db.prepare(`
      INSERT INTO local_game_participants (game_id, position, guest_name, score)
      VALUES (?, ?, ?, ?)
    `),

    insertLocalTournament: db.prepare(`
      INSERT INTO local_tournaments (tournament_id, host_id, guest1_name, guest2_name, guest3_name, semi1_id, semi2_id, final_id, winner_type, winner_name, date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),

    getLocalGamesByPlayer: db.prepare(`
      SELECT
        lg.game_id,
        lg.host_id,
        lg.date,
        lg.duration,
        lg.winner_type,
        lg.winner_guest_name,
        json_group_array(
          json_object('position', lgp.position, 'guestName', lgp.guest_name, 'score', lgp.score)
        ) AS participants
      FROM local_games lg
      JOIN local_game_participants lgp ON lg.game_id = lgp.game_id
      WHERE lg.host_id = ?
      GROUP BY lg.game_id
      ORDER BY lg.date DESC
      LIMIT ? OFFSET ?
    `),

    getLocalTournamentsByPlayer: db.prepare(`
      SELECT *
      FROM local_tournaments
      WHERE host_id = ?
      ORDER BY date DESC
      LIMIT ? OFFSET ?
    `),
  };
}

