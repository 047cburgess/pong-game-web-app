const gameSchema = {
	type: 'object',
	properties: {
		id: { type: 'string' },
		mode: { type: 'string', enum: ['classic', 'tournament'] },
		tournamentId: { type: ['string', 'null'] },
		winnerId: { type: ['number', 'null'] },
		date: { type: 'string' },
		duration: { type: 'string' },
		players: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					id: { type: 'number' },
					score: { type: 'number' },
					result: { type: 'string', enum: ['win', 'loss', 'draw'] }
				}
			}
		}
	}
};

export const getPlayerGamesSchema = {
	description: 'Get paginated list of games for a player',
	tags: ['Game Stats'],
	params: {
		type: 'object',
		required: ['userId'],
		properties: {
			userId: { type: 'number', description: 'Player user ID' }
		}
	},
	querystring: {
		type: 'object',
		properties: {
			page: { type: 'number', default: 1, minimum: 1 },
			per_page: { type: 'number', default: 25, minimum: 1, maximum: 100 }
		}
	},
	response: {
		200: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					id: { type: 'string' },
					mode: { type: 'string', enum: ['classic', 'tournament'] },
					tournamentId: { type: ['string', 'null'] },
					winnerId: { type: ['number', 'null'] },
					date: { type: 'string' },
					duration: { type: 'string' },
					players: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								id: { type: 'number' },
								score: { type: 'number' },
								result: { type: 'string', enum: ['win', 'loss', 'draw'] }
							}
						}
					}
				}
			}
		}
	}
};

export const getPlayerStatsSchema = {
	description: 'Get combined game statistics for a player',
	tags: ['Game Stats'],
	params: {
		type: 'object',
		required: ['userId'],
		properties: {
			userId: { type: 'number', description: 'Player user ID' }
		}
	},
	response: {
		200: {
			type: 'object',
			properties: {
				lifetime: {
					type: 'object',
					properties: {
						wins: { type: 'number' },
						draws: { type: 'number' },
						losses: { type: 'number' }
					}
				},
				daily: {
					type: 'array',
					maxItems: 7,
					items: {
						type: 'object',
						properties: {
							day: { type: 'string' },
							wins: { type: 'number' },
							draws: { type: 'number' },
							losses: { type: 'number' }
						}
					}
				},
				recentMatches: {
					type: 'array',
					maxItems: 5,
					items: {
						type: 'object',
						properties: {
							id: { type: 'string' },
							mode: { type: 'string', enum: ['classic', 'tournament'] },
							tournamentId: { type: ['string', 'null'] },
							winnerId: { type: ['number', 'null'] },
							date: { type: 'string' },
							duration: { type: 'string' },
							players: {
								type: 'array',
								items: {
									type: 'object',
									properties: {
										id: { type: 'number' },
										score: { type: 'number' },
										result: { type: 'string', enum: ['win', 'loss', 'draw'] }
									}
								}
							}
						}
					}
				},
				recentTournaments: {
					type: 'array',
					maxItems: 5,
					items: {
						type: 'object',
						properties: {
							id: { type: 'string' },
							date: { type: 'string' },
							participants: {
								type: 'array',
								minItems: 4,
								maxItems: 4,
								items: {
									type: 'object',
									properties: {
										id: { type: 'number' }
									}
								}
							},
							games: {
								type: 'object',
								properties: {
									semifinal1: gameSchema,
									semifinal2: gameSchema,
									final: gameSchema
								}
							}
						}
					}
				}
			}
		}
	}
};

export const getGameByIdSchema = {
	description: 'Get details of a specific game',
	tags: ['Game History'],
	params: {
		type: 'object',
		required: ['gameId'],
		properties: {
			gameId: { type: 'string', description: 'Game ID' }
		}
	},
	response: {
		200: {
			type: 'object',
			properties: {
				id: { type: 'string' },
				mode: { type: 'string', enum: ['classic', 'tournament'] },
				tournamentId: { type: ['string', 'null'] },
				winnerId: { type: ['number', 'null'] },
				date: { type: 'string' },
				duration: { type: 'string' },
				players: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							id: { type: 'number' },
							score: { type: 'number' },
							result: { type: 'string', enum: ['win', 'loss', 'draw'] }
						}
					}
				}
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

export const getPlayerTournamentsSchema = {
	description: 'Get paginated list of tournaments for a player',
	tags: ['Game Stats'],
	params: {
		type: 'object',
		required: ['userId'],
		properties: {
			userId: { type: 'number', description: 'Player user ID' }
		}
	},
	querystring: {
		type: 'object',
		properties: {
			page: { type: 'number', default: 1, minimum: 1 },
			per_page: { type: 'number', default: 20, minimum: 1, maximum: 50 }
		}
	},
	response: {
		200: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					id: { type: 'string' },
					date: { type: 'string' },
					participants: {
						type: 'array',
						minItems: 4,
						maxItems: 4,
						items: {
							type: 'object',
							properties: {
								id: { type: 'number' }
							}
						}
					},
					games: {
						type: 'object',
						properties: {
							semifinal1: gameSchema,
							semifinal2: gameSchema,
							final: gameSchema
						}
					}
				}
			}
		}
	}
};

export const getTournamentByIdSchema = {
	description: 'Get details of a specific tournament',
	tags: ['Game History'],
	params: {
		type: 'object',
		required: ['tournamentId'],
		properties: {
			tournamentId: { type: 'string', description: 'Tournament ID' }
		}
	},
	response: {
		200: {
			type: 'object',
			properties: {
				id: { type: 'string' },
				date: { type: 'string' },
				participants: {
					type: 'array',
					minItems: 4,
					maxItems: 4,
					items: {
						type: 'object',
						properties: {
							id: { type: 'number' }
						}
					}
				},
				games: {
					type: 'object',
					properties: {
						semifinal1: gameSchema,
						semifinal2: gameSchema,
						final: gameSchema
					}
				}
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
