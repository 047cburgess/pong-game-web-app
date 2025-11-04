// POST /tournaments/create - Create a new tournament
export const createTournamentSchema = {
  body: {
    type: 'object',
    properties: {
      invitedPlayerIds: {
        type: 'array',
        items: { type: 'number' },
        maxItems: 3,
        description: 'Optional list of player IDs to invite (max 3, host is automatically included)'
      }
    }
  },
  response: {
    200: {
      type: 'object',
      required: ['tournamentId'],
      properties: {
        tournamentId: { type: 'string' }
      }
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
    }
  }
};

// POST /tournaments/:tournamentId/invite - Invite additional players
export const inviteTournamentSchema = {
  params: {
    type: 'object',
    required: ['tournamentId'],
    properties: {
      tournamentId: { type: 'string' }
    }
  },
  body: {
    type: 'object',
    required: ['invitedPlayerIds'],
    properties: {
      invitedPlayerIds: {
        type: 'array',
        items: { type: 'number' },
        minItems: 1
      }
    }
  },
  response: {
    200: {
      type: 'object',
      required: ['tournamentId', 'invitedPlayers'],
      properties: {
        tournamentId: { type: 'string' },
        invitedPlayers: {
          type: 'array',
          items: { type: 'number' }
        }
      }
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
    403: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    },
    404: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    }
  }
};

// POST /tournaments/:tournamentId/join - Accept tournament invite
export const joinTournamentSchema = {
  params: {
    type: 'object',
    required: ['tournamentId'],
    properties: {
      tournamentId: { type: 'string' }
    }
  },
  response: {
    200: {
      type: 'object',
      required: ['tournamentId'],
      properties: {
        tournamentId: { type: 'string' }
      }
    },
    401: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    },
    403: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    },
    404: {
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

// DELETE /tournaments/:tournamentId/decline - Decline tournament invite
export const declineTournamentSchema = {
  params: {
    type: 'object',
    required: ['tournamentId'],
    properties: {
      tournamentId: { type: 'string' }
    }
  },
  response: {
    204: {
      type: 'null',
      description: 'Invite declined successfully'
    },
    401: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    },
    403: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    },
    404: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    }
  }
};

// GET /tournaments/:tournamentId/status - Get tournament status
export const getTournamentStatusSchema = {
  params: {
    type: 'object',
    required: ['tournamentId'],
    properties: {
      tournamentId: { type: 'string' }
    }
  },
  response: {
    200: {
      type: 'object',
      required: ['tournamentId', 'status', 'registeredPlayers', 'games'],
      properties: {
        tournamentId: { type: 'string' },
        status: {
          type: 'string',
          enum: ['waiting', 'ready', 'semi1', 'semi2', 'final', 'complete']
        },
        registeredPlayers: {
          type: 'array',
          items: { type: 'number' },
          description: 'User IDs of registered players'
        },
        games: {
          type: 'object',
          required: ['semi1', 'semi2', 'final'],
          properties: {
            semi1: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Game ID' },
                status: {
                  type: 'string',
                  enum: ['pending', 'ready', 'complete']
                },
                players: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['id', 'score'],
                    properties: {
                      id: { type: 'number', description: 'User ID' },
                      score: { type: 'number' }
                    }
                  }
                },
                winner: { type: 'number', description: 'Winner user ID' }
              }
            },
            semi2: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Game ID' },
                status: {
                  type: 'string',
                  enum: ['pending', 'ready', 'complete']
                },
                players: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['id', 'score'],
                    properties: {
                      id: { type: 'number', description: 'User ID' },
                      score: { type: 'number' }
                    }
                  }
                },
                winner: { type: 'number', description: 'Winner user ID' }
              }
            },
            final: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Game ID' },
                status: {
                  type: 'string',
                  enum: ['pending', 'ready', 'complete']
                },
                players: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['id', 'score'],
                    properties: {
                      id: { type: 'number', description: 'User ID' },
                      score: { type: 'number' }
                    }
                  }
                },
                winner: { type: 'number', description: 'Winner user ID' }
              }
            }
          }
        },
        winner: { type: 'number', description: 'Winner user ID' }
      }
    },
    401: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    },
    404: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    }
  }
};
