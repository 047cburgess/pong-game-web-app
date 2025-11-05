// POST - Submit local game result
export const submitLocalGameSchema = {
  body: {
    type: 'object',
    required: ['gameId', 'players', 'duration'],
    properties: {
      gameId: {
        type: 'string',
        description: 'Game ID from game service'
      },
      players: {
        type: 'array',
        minItems: 2,
        maxItems: 4,
        items: {
          type: 'object',
          required: ['id', 'score'],
          properties: {
            id: {
              description: 'User ID (number) for host, string name for guests'
            },
            score: {
              type: 'number',
            }
          }
        }
      },
      winnerId: {
        description: 'Winner ID - User ID or guest name (omit for draw)'
      },
      duration: {
        type: 'string',
      }
    }
  },
  response: {
    204: {
      type: 'null',
      description: 'Local game result saved successfully'
    },
    400: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    },
    401: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    },
    409: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    }
  }
};

// POST - Submit local tournament result
export const submitLocalTournamentSchema = {
  body: {
    type: 'object',
    required: ['participants', 'games'],
    properties: {
      participants: {
        type: 'array',
        minItems: 4,
        maxItems: 4,
        items: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              description: 'User ID (number) for host, string name for guests'
            }
          }
        }
      },
      games: {
        type: 'object',
        required: ['semifinal1', 'semifinal2', 'final'],
        properties: {
          semifinal1: {
            type: 'object',
            required: ['gameId', 'players', 'duration'],
            properties: {
              gameId: { type: 'string' },
              players: {
                type: 'array',
                minItems: 2,
                maxItems: 2,
                items: {
                  type: 'object',
                  required: ['id', 'score'],
                  properties: {
                    id: {},
                    score: { type: 'number' }
                  }
                }
              },
              winnerId: {},
              duration: { type: 'string' }
            }
          },
          semifinal2: {
            type: 'object',
            required: ['gameId', 'players', 'duration'],
            properties: {
              gameId: { type: 'string' },
              players: {
                type: 'array',
                minItems: 2,
                maxItems: 2,
                items: {
                  type: 'object',
                  required: ['id', 'score'],
                  properties: {
                    id: {},
                    score: { type: 'number' }
                  }
                }
              },
              winnerId: {},
              duration: { type: 'string' }
            }
          },
          final: {
            type: 'object',
            required: ['gameId', 'players', 'duration'],
            properties: {
              gameId: { type: 'string' },
              players: {
                type: 'array',
                minItems: 2,
                maxItems: 2,
                items: {
                  type: 'object',
                  required: ['id', 'score'],
                  properties: {
                    id: {},
                    score: { type: 'number' }
                  }
                }
              },
              winnerId: {},
              duration: { type: 'string' }
            }
          }
        }
      }
    }
  },
  response: {
    204: {
      type: 'null',
      description: 'Local tournament saved successfully'
    },
    400: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    },
    401: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    },
    409: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    }
  }
};
