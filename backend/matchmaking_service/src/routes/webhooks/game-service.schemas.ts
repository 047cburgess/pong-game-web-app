
export const gameResultWebhookSchema = {
  params: {
    type: 'object',
    required: ['gameId'],
    properties: {
      gameId: {
        type: 'string'
      }
    }
  },
  body: {
    type: 'object',
    required: ['players', 'date', 'duration'],
    properties: {
      players: {
        type: 'array',
        minItems: 2,
        maxItems: 4,
        items: {
          type: 'object',
          required: ['id', 'score'],
          properties: {
            id: { type: 'number' },
            score: { type: 'number' }
          }
        }
      },
      winnerId: {
        type: 'number'
      },
      date: {
        type: 'string',
        format: 'date-time'
      },
      duration: {
        type: 'string'
      }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      },
      description: 'Game result processed'
    }
  }
};
