export const config = {
  PORT: process.env['LISTEN_PORT'] ? parseInt(process.env['LISTEN_PORT'], 10) : 3001,
  NODE_ENV: process.env['NODE_ENV'] || 'development',
  LOG_LEVEL: process.env['LOG_LEVEL'] || 'info',
};
