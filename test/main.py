#!/bin/env python3

from dataclasses import asdict, dataclass
from datetime import date, datetime, timedelta
from random import randint, seed
from typing import Any, Optional, cast

import toml
from aiohttp import web
from aiohttp.web import json_response
from sortedcontainers import SortedList

CONFIG = toml.load("mockConfig.toml")
CONFIG.setdefault("seed", 313373)

print(CONFIG)

seed(CONFIG["seed"])

Username = str
GameId = str
TournId = str


@dataclass
class UserGameStats:
    wins: int
    draws: int
    losses: int


@dataclass
class GameResult:
    date: str
    gameId: GameId
    playerScores: dict[Username, int]
    duration: int
    tournament: Optional[str]


@dataclass
class Tournament:
    date: str
    tournId: TournId
    gameIds: list[GameId]
    players: list[Username]


@dataclass
class UserStats:
    username: str
    realname: Optional[str]
    gameStats: UserGameStats
    tournamentStats: UserGameStats
    activity: list[tuple[date, UserGameStats]]

    def asdict(self) -> dict:
        return asdict(self) | {
            "activity": {x[0].isoformat(): asdict(x[1]) for x in self.activity}
        }


def _make_game_result(
    gameId: str,
    stats: dict[str, int],
    *,
    duration: timedelta = timedelta(minutes=1, seconds=30),
    date: datetime = datetime(2025, 10, 15, 13, 25, 16),
    tournament: Optional[str] = None,
) -> GameResult:
    return GameResult(
        date.isoformat(),
        gameId,
        stats,
        int(duration.total_seconds() * 1000 + randint(0, 999)),
        tournament=tournament,
    )


def _day_offset(n: int = 0) -> date:
    return date.today() + timedelta(n)


def _gen_stat() -> UserGameStats:
    return UserGameStats(randint(0, 15), randint(0, 15), randint(0, 15))


USERS: dict[Username, UserStats] = {
    username: UserStats(
        username,
        isinstance(info, dict) and info.get("realname") or None,
        _gen_stat(),
        _gen_stat(),
        [(_day_offset(-x), _gen_stat()) for x in range(7)],
    )
    for username, info in cast(dict[str, Any], CONFIG["users"]).items()
}


CURRENT_USER: Username = next(iter(cast(dict[str, Any], CONFIG["users"]).keys()))

GAMES: dict[GameId, GameResult] = {}

GAME_PARTICIP: dict[Username, SortedList] = {}  # list of game ids

TOURNAMENTS: dict[TournId, Tournament] = {}

TOURN_PARTICIP: dict[Username, SortedList] = {}  # list of tourn ids


def _setup_game(stats: dict[str, int]):
    tempId = stats.get("id")
    tempTournId = stats.get("tournamentId")
    gameId = cast(str | None, tempId) or f"mock_game_{len(GAMES)}"
    date = datetime(
        2025, 10, randint(5, 25), randint(0, 23), randint(0, 59), randint(0, 59)
    )
    tempStats = stats.copy()
    tempStats.pop("id", 0)
    tempStats.pop("tournamentId", 0)
    game = _make_game_result(
        gameId,
        tempStats,
        duration=timedelta(seconds=randint(10, 110)),
        date=date,
        tournament=cast(str | None, tempTournId),
    )
    GAMES[gameId] = game
    for user in stats.keys():
        GAME_PARTICIP.setdefault(
            user, SortedList([], key=lambda gameId: GAMES[gameId].date)
        ).add(gameId)


for game in cast(list[dict[str, int]], CONFIG.get("games", [])):
    _setup_game(game)


def _setup_tourn(data: dict[str, Any]):
    id = cast(TournId, data["id"])
    games = cast(list[GameId], data.get("games", []))
    players = cast(list[Username], data["players"])

    TOURNAMENTS[id] = Tournament(
        _day_offset(randint(-10, 0)).isoformat(), id, games, players
    )

    for p in players:
        TOURN_PARTICIP.setdefault(
            p, SortedList([], key=lambda tId: TOURNAMENTS[tId].date)
        ).add(id)


for t in cast(list[dict[str, Any]], CONFIG.get("tournaments", [])):
    _setup_tourn(t)


async def user_stats(request: web.Request) -> web.Response:
    user = request.query.get("user", CURRENT_USER)
    if user := USERS.get(user):
        return json_response(user.asdict())
    else:
        return json_response({"error": "User doesn't exist"}, status=404)


async def game_stats(request: web.Request) -> web.Response:
    id = request.query.get("id")
    if not id:
        return json_response({"error": "No game id provided"}, status=400)
    game = GAMES.get(id)
    if not game:
        return json_response({"error": "No game with such id"}, status=404)
    return json_response(asdict(game))


async def games_list(request: web.Request) -> web.Response:
    user = request.query.get("user", CURRENT_USER)
    per_page = int(request.query.get("per_page", 25))
    page = int(request.query.get("page", 1))
    if user not in USERS:
        return json_response({"error": "User doesn't exist"}, status=404)
    part = cast(
        list[GameId],
        GAME_PARTICIP.get(user, [])[(page - 1) * per_page : page * per_page],
    )
    return json_response(
        [asdict(cast(GameResult, GAMES.get(cast(GameId, game)))) for game in part]
    )


async def tourn_stats(request: web.Request) -> web.Response:
    id = request.query.get("id")
    if not id:
        return json_response({"error": "No tournament id provided"}, status=400)
    tourn = TOURNAMENTS.get(id)
    if not tourn:
        return json_response({"error": "No tournament with such id"}, status=404)
    res = asdict(tourn)
    res["games"] = [asdict(cast(GameResult, GAMES.get(id))) for id in tourn.gameIds]
    res.pop("gameIds", None)
    return json_response(res)


async def tourns_list(request: web.Request) -> web.Response:
    user = request.query.get("user", CURRENT_USER)
    per_page = int(request.query.get("per_page", 25))
    page = int(request.query.get("page", 1))
    if user not in USERS:
        return json_response({"error": "User doesn't exist"}, status=404)
    part = cast(
        list[TournId],
        TOURN_PARTICIP.get(user, [])[(page - 1) * per_page : page * per_page],
    )
    res = []
    for t in part:
        tourn = cast(Tournament, TOURNAMENTS.get(t))
        temp = asdict(tourn)
        temp["games"] = [
            asdict(cast(GameResult, GAMES.get(id))) for id in tourn.gameIds
        ]
        temp.pop("gameIds", None)
        res.append(temp)
    return json_response(res)


app = web.Application()

app.add_routes(
    (
        web.get("/stats", user_stats),
        web.get("/game", game_stats),
        web.get("/tournament", tourn_stats),
        web.get("/games", games_list),
        web.get("/tournaments", tourns_list),
    )
)

web.run_app(app)
