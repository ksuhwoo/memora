// knexfile.js
require('dotenv').config(); // .env 파일을 읽기 위해 추가

module.exports = {
  development: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  },
  // production 환경 설정도 동일하게 추가할 수 있습니다.
};