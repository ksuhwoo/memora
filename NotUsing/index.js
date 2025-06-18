// server.js (하나의 파일에서 두 개의 포트 처리 - 일반적이지 않음)
const express = require('express');
const http = require('http'); // Node.js 내장 http 모듈
const bcrypt = require('bcryptjs');
const cors = require('cors');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config(); // .env 파일 로드

const dbPool = require('../db'); // 가정: db.js 파일에 MySQL 커넥션 풀 설정이 있음

// --- 백엔드 API 서버 설정 (3001번 포트) ---
const backendApp = express();
const BACKEND_PORT = process.env.BACKEND_PORT || 3001;

// CORS 설정 (백엔드 API는 프론트엔드 3000번 포트에서의 요청을 허용해야 함)
const corsOptions = {
  origin: 'http://localhost:3000', // 프론트엔드가 실행될 주소
  optionsSuccessStatus: 200
};
backendApp.use(cors(corsOptions));

backendApp.use(express.json()); // JSON 요청 본문 파싱
backendApp.use(express.urlencoded({ extended: true })); // URL-encoded 요청 본문 파싱

// Nodemailer Transporter 설정
let transporter;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
    });
    transporter.verify(function(error, success) {
      if (error) {
        console.error('Nodemailer 설정 오류 (API 서버):', error.message);
      } else {
        console.log('Nodemailer (API 서버)가 성공적으로 설정되어 이메일을 보낼 준비가 되었습니다.');
      }
    });
} else {
    console.warn('Nodemailer 설정이 .env 파일에 없어 API 서버의 이메일 발송 기능이 비활성화됩니다.');
}

// 이메일 인증을 위한 임시 저장소
const verificationCodes = {};

// API 라우트 정의 (backendApp 사용)
backendApp.get('/api', (req, res) => {
  res.json({ message: 'Memora 백엔드 API 서버 응답입니다. 정상 작동 중!' });
});

backendApp.post('/api/send-verification-email', async (req, res) => {
  if (!transporter) {
    return res.status(503).json({ message: '이메일 서비스가 현재 사용할 수 없습니다.' });
  }
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: '이메일을 입력해주세요.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: '유효한 이메일 주소를 입력해주세요.' });
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000;
    verificationCodes[email] = { code, expires, verified: false };
    const mailOptions = {
      from: `"Memora 인증팀" <${process.env.EMAIL_USER}>`, to: email,
      subject: '[Memora] 회원가입 이메일 인증 코드입니다.',
      html: `<div style="font-family: Arial, sans-serif; line-height: 1.6;"><h2>Memora 회원가입 인증 코드</h2><p>Memora 회원가입을 위한 인증 코드는 다음과 같습니다:</p><p style="font-size: 24px; font-weight: bold; color: #333;">${code}</p><p>이 코드는 10분 동안 유효합니다.</p></div>`
    };
    await transporter.sendMail(mailOptions);
    console.log(`API 서버: 인증 코드 이메일 발송 성공 - ${email}, 코드: ${code}`);
    res.status(200).json({ message: '인증 코드가 이메일로 성공적으로 전송되었습니다.' });
  } catch (error) {
    console.error('API 서버: 이메일 인증 코드 전송 오류 -', error);
    if (error.responseCode === 535) res.status(500).json({ message: '이메일 서버 인증에 실패했습니다.' });
    else res.status(500).json({ message: '인증 코드 전송 중 오류가 발생했습니다.' });
  }
});

backendApp.post('/api/verify-email-code', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ message: '이메일과 인증 코드를 모두 입력해주세요.' });
  const storedEntry = verificationCodes[email];
  if (!storedEntry) return res.status(400).json({ success: false, message: '인증 코드 요청 기록이 없거나 이미 사용되었습니다.' });
  if (storedEntry.expires < Date.now()) { delete verificationCodes[email]; return res.status(400).json({ success: false, message: '인증 코드가 만료되었습니다.' });}
  if (storedEntry.code === code) {
    verificationCodes[email].verified = true;
    console.log(`API 서버: 이메일 인증 성공 - ${email}`);
    res.status(200).json({ success: true, message: '이메일 인증에 성공했습니다!' });
  } else {
    console.log(`API 서버: 이메일 인증 실패 (코드 불일치) - ${email}`);
    res.status(400).json({ success: false, message: '인증 코드가 일치하지 않습니다.' });
  }
});

backendApp.post('/api/register', async (req, res) => {
  console.log('API 서버: /api/register 요청 받음 -', req.body);
  const { username, password, name, birth, email } = req.body;
  if (!username || !password || !name || !birth || !email) return res.status(400).json({ message: '모든 필드를 입력해주세요.' });
  const emailEntry = verificationCodes[email];
  if (!emailEntry || !emailEntry.verified) return res.status(403).json({ message: '이메일 인증이 완료되지 않았습니다.' });
  let connection;
  try {
    connection = await dbPool.getConnection();
    const [rows] = await connection.execute('SELECT * FROM users WHERE username = ? OR email = ?', [username, email]);
    if (rows.length > 0) {
      if (rows[0].username === username) return res.status(409).json({ message: '이미 사용 중인 아이디입니다.' });
      if (rows[0].email === email) return res.status(409).json({ message: '이미 가입된 이메일입니다.' });
    }
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const [result] = await connection.execute(
      'INSERT INTO users (username, email, password, name, birth, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [username, email, hashedPassword, name, birth]
    );
    delete verificationCodes[email];
    console.log('API 서버: 회원가입 성공 -', result.insertId);
    res.status(201).json({ message: '회원가입이 성공적으로 완료되었습니다.', userId: result.insertId });
  } catch (error) {
    console.error('API 서버: 회원가입 처리 중 오류 발생 -', error);
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: '이미 사용 중인 아이디 또는 이메일입니다.' });
    else if (error.code === 'ER_BAD_FIELD_ERROR') return res.status(500).json({ message: `데이터베이스 필드 오류: ${error.sqlMessage}` });
    else if (error.code === 'ER_DATA_TOO_LONG') return res.status(500).json({ message: `데이터베이스 필드 길이 초과: ${error.sqlMessage}` });
    else res.status(500).json({ message: '서버 내부 오류가 발생했습니다. 다시 시도해주세요.' });
  } finally {
    if (connection) connection.release();
  }
});

backendApp.post('/api/login', async (req, res) => {
    console.log('API 서버: /api/login 요청 받음 -', req.body);
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: '아이디와 비밀번호를 모두 입력해주세요.' });
    let connection;
    try {
        connection = await dbPool.getConnection();
        const [rows] = await connection.execute('SELECT id, username, password FROM users WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(401).json({ message: '아이디 또는 비밀번호가 잘못되었습니다.' });
        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: '아이디 또는 비밀번호가 잘못되었습니다.' });
        if (!process.env.JWT_SECRET) { console.error('JWT_SECRET이 .env 파일에 설정되지 않았습니다!'); return res.status(500).json({ message: '서버 설정 오류: JWT 시크릿이 없습니다.' });}
        const payload = { userId: user.id, username: user.username };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
        console.log(`API 서버: 로그인 성공 - ${username}`);
        res.status(200).json({ message: '로그인 성공!', token: token, userId: user.id, username: user.username });
    } catch (error) {
        console.error('API 서버: /api/login CATCH 블록 오류 발생 -', error);
        res.status(500).json({ message: '서버 내부 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    if (!process.env.JWT_SECRET) { console.error('JWT_SECRET이 .env 파일에 없어 토큰 검증 불가!'); return res.status(500).json({ message: '서버 설정 오류: JWT 시크릿이 없습니다.' }); }
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error('API 서버: JWT 검증 오류 -', err.message);
            if (err.name === 'TokenExpiredError') return res.status(403).json({ message: '토큰이 만료되었습니다.' });
            return res.status(403).json({ message: '유효하지 않은 토큰입니다.' });
        }
        req.user = user;
        next();
    });
}
backendApp.get('/api/profile', authenticateToken, async (req, res) => {
    console.log('API 서버: 보호된 라우트 접근 - 사용자 정보 (from token):', req.user);
    res.json({ message: `안녕하세요, ${req.user.username}님! 프로필 정보입니다.`, userData: req.user });
});
// --- 백엔드 API 서버 로직 끝 ---


// --- 프론트엔드 정적 파일 서버 설정 (3000번 포트) ---
const frontendApp = express();
const FRONTEND_PORT = process.env.FRONTEND_PORT || 3000;

// 'frontend' 폴더를 정적 파일 루트로 지정 (server.js와 같은 레벨에 frontend 폴더가 있다고 가정)
frontendApp.use(express.static(path.join(__dirname, 'frontend')));

// HTML 파일 제공 라우트 (frontendApp 사용)
frontendApp.get("/", function(req, res){
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});
frontendApp.get("/login", function(req, res){
    res.sendFile(path.join(__dirname, 'frontend', 'login.html'));
});
frontendApp.get("/signup", function(req, res){
    res.sendFile(path.join(__dirname, 'frontend', 'signup.html'));
});

// 만약 SPA이고 클라이언트 사이드 라우팅을 사용한다면, 위 특정 HTML 라우트 대신 아래와 같이 설정
// frontendApp.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
// });
// --- 프론트엔드 정적 파일 서버 로직 끝 ---


// --- 각 서버 시작 ---
const backendHttpServer = http.createServer(backendApp); // Express 앱으로 http 서버 생성
backendHttpServer.listen(BACKEND_PORT, () => {
  console.log(`백엔드 API 서버가 http://localhost:${BACKEND_PORT} 에서 실행 중입니다.`);
});

const frontendHttpServer = http.createServer(frontendApp); // Express 앱으로 http 서버 생성
frontendHttpServer.listen(FRONTEND_PORT, () => {
  console.log(`프론트엔드 서버가 http://localhost:${FRONTEND_PORT} 에서 실행 중입니다.`);
  console.log(`프론트엔드 접속 주소: http://localhost:${FRONTEND_PORT}/`);
});