// db.js
const mysql = require('mysql2/promise'); // mysql2/promise 사용 (async/await 지원)
require('dotenv').config(); // .env 파일 로드

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 40, // 동시에 유지할 수 있는 커넥션 수
  queueLimit: 0,
  timeZone: 'Asia/Seoul'
});

// 연결 테스트 (선택 사항)
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('MySQL DB에 성공적으로 연결되었습니다.');
    connection.release(); // 사용 후 커넥션 반환
  } catch (error) {
    console.error('MySQL DB 연결 실패:', error);
  }
}
testConnection();

module.exports = pool;