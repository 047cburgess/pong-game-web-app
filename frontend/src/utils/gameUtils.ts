/**
 * Shared utilities for local game creation
 *
 * Types match the typespec definitions in /frontend/typespec/public-api.tsp
 */

/**
 * GameKey from public-api.tsp
 * Returned by endpoints that open game websocket connections
 */
export interface GameKey {
  key: string;
  gameId: string;
  expires: string; // utcDateTime from typespec
}

/**
 * Create a local game via the API
 * @param nPlayers - Number of players (2, 3, or 4)
 * @returns Game keys for each player
 */
export async function createLocalGame(nPlayers: number): Promise<GameKey[]> {
  const response = await fetch("/api/v1/games/local/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nPlayers }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create game: ${response.status}`);
  }

  const data = await response.json();
  return data.gameKeys;
}
