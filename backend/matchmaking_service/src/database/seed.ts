import Database from "better-sqlite3";
import { prepareStatements } from "./statements.js";

export default function seedDatabase(db: Database.Database) {
  const stmts = prepareStatements(db);

  const transaction = db.transaction(() => {
    const users = [1, 2, 3, 4];
    const now = new Date();

    const daysAgo = (days: number, hours = 0, minutes = 0) => {
      const d = new Date(now);
      d.setDate(d.getDate() - days);
      d.setHours(hours, minutes, 0, 0);
      return d.toISOString();
    };

    const duration = (baseMinutes: number) => {
      const totalSeconds = baseMinutes * 60 + Math.floor(Math.random() * 60);
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      return `00:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const classicGames = [
      { id: "classic_1", winner: 1, date: daysAgo(12, 14, 23), duration: duration(5), players: [[1, 10, "win"], [2, 8, "loss"]] },
      { id: "classic_2", winner: 2, date: daysAgo(12, 19, 47), duration: duration(4), players: [[2, 11, "win"], [3, 9, "loss"]] },
      { id: "classic_3", winner: 3, date: daysAgo(11, 16, 15), duration: duration(6), players: [[3, 12, "win"], [4, 10, "loss"]] },
      { id: "classic_4", winner: null, date: daysAgo(11, 20, 38), duration: duration(5), players: [[1, 13, "draw"], [4, 13, "draw"]] },
      { id: "classic_5", winner: 4, date: daysAgo(10, 10, 52), duration: duration(5), players: [[4, 14, "win"], [2, 13, "loss"]] },
      { id: "classic_6", winner: 2, date: daysAgo(9, 15, 29), duration: duration(6), players: [[2, 15, "win"], [1, 13, "loss"]]}
    ];

    classicGames.forEach(g => {
      stmts.insertGame.run(g.id, "classic", null, g.winner, g.date, g.duration);
      g.players.forEach(([userId, score, result]) => {
        stmts.insertGameParticipation.run(g.id, userId, score, result);
      });
    });

    // Tournament 1
    const tourn1Games = [
      { id: "tourn1_semi1", winner: 1, date: daysAgo(8, 14, 5), duration: duration(6), players: [[1, 14, "win"], [2, 12, "loss"]] },
      { id: "tourn1_semi2", winner: 3, date: daysAgo(8, 14, 42), duration: duration(5), players: [[3, 16, "win"], [4, 13, "loss"]] },
      { id: "tourn1_final", winner: 1, date: daysAgo(8, 15, 18), duration: duration(7), players: [[1, 15, "win"], [3, 14, "loss"]]}
    ];

    tourn1Games.forEach(g => {
      stmts.insertGame.run(g.id, "tournament", "tourn_1", g.winner, g.date, g.duration);
      g.players.forEach(([userId, score, result]) => {
        stmts.insertGameParticipation.run(g.id, userId, score, result);
      });
    });

    stmts.insertTournament.run("tourn_1", "tourn1_semi1", "tourn1_semi2", "tourn1_final", 1, daysAgo(8, 16, 0));
    users.forEach(u => stmts.insertTournamentParticipation.run("tourn_1", u));

    // Tournament 2
    const tourn2Games = [
      { id: "tourn2_semi1", winner: 2, date: daysAgo(6, 13, 17), duration: duration(6), players: [[1, 11, "loss"], [2, 13, "win"]] },
      { id: "tourn2_semi2", winner: 4, date: daysAgo(6, 13, 55), duration: duration(5), players: [[3, 12, "loss"], [4, 15, "win"]] },
      { id: "tourn2_final", winner: 4, date: daysAgo(6, 14, 33), duration: duration(6), players: [[2, 14, "loss"], [4, 16, "win"]]}
    ];

    tourn2Games.forEach(g => {
      stmts.insertGame.run(g.id, "tournament", "tourn_2", g.winner, g.date, g.duration);
      g.players.forEach(([userId, score, result]) => {
        stmts.insertGameParticipation.run(g.id, userId, score, result);
      });
    });

    stmts.insertTournament.run("tourn_2", "tourn2_semi1", "tourn2_semi2", "tourn2_final", 4, daysAgo(6, 15, 20));
    users.forEach(u => stmts.insertTournamentParticipation.run("tourn_2", u));
  });

  transaction();
}

