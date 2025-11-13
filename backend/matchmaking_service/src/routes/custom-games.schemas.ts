// POST /games/create - Create custom game
export const createCustomGameSchema = {
  body: {
    type: 'object',
    required: ['numberOfPlayers', 'invitedPlayerIds'],
    properties: {
      numberOfPlayers: {
        type: 'integer',
        minimum: 2,
        maximum: 4
      },
      invitedPlayerIds: {
        type: 'array',
        items: { type: 'number' }
      }
    }
  },
  response: {
    200: {
      type: 'object',
      required: ['key', 'gameId', 'expires'],
      properties: {
        key: { type: 'string' },
        gameId: { type: 'string' },
        expires: { type: 'string', format: 'date-time' }
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

// POST /games/{gameId}/join - Accept game invite
export const joinGameSchema = {
  params: {
    type: 'object',
    required: ['gameId'],
    properties: {
      gameId: { type: 'string' }
    }
  },
  response: {
    200: {
      type: 'object',
      required: ['key', 'gameId', 'expires'],
      properties: {
        key: { type: 'string' },
        gameId: { type: 'string' },
        expires: { type: 'string', format: 'date-time' }
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

// DELETE /games/{gameId}/decline - Decline game invite
export const declineGameSchema = {
  params: {
    type: 'object',
    required: ['gameId'],
    properties: {
      gameId: { type: 'string' }
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

// POST /games/{gameId}/view - Get viewing key for tournament game
export const viewGameSchema = {
  params: {
    type: 'object',
    required: ['gameId'],
    properties: {
      gameId: { type: 'string' }
    }
  },
  response: {
    200: {
      type: 'object',
      required: ['viewingKey', 'gameId'],
      properties: {
        viewingKey: { type: 'string' },
        gameId: { type: 'string' }
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

export const inviteGameSchema = {
  params: {
    type: 'object',
    required: ['gameId'],
    properties: {
      gameId: { type: 'string' }
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
      required: ['invitedPlayerIds'],
      properties: {
        invitedPlayerIds: {
          type: 'array',
          items: { type: 'number' }
        }
      }
    },
    400: {
      type: 'object',
      properties: { error: { type: 'string' } }
    },
    401: {
      type: 'object',
      properties: { error: { type: 'string' } }
    },
    404: {
      type: 'object',
      properties: { error: { type: 'string' } }
    },
    409: {
      type: 'object',
      properties: { error: { type: 'string' } }
    }
  }
};

