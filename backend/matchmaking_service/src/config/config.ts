export const config = {
  PORT: process.env['PORT'] ? parseInt(process.env['PORT'], 10) : 3000,
  NODE_ENV: process.env['NODE_ENV'] || 'development',
  GAME_SERVICE_URL: process.env['GAME_SERVICE_URL'] || 'http://localhost:3001',
  USER_SERVICE_URL: process.env['USER_SERVICE_URL'] || 'http://localhost:3002',
  SERVICE_URL: process.env['SERVICE_URL'] || 'http://localhost:3000',
  LOG_LEVEL: process.env['LOG_LEVEL'] || 'info',
  DB_VERBOSE: process.env['DB_VERBOSE'] || 'false'
};
