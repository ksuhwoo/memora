// server.js
const express = require('express');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const nodemailer = require('nodemailer'); // Nodemailer 추가
const jwt = require('jsonwebtoken');
let path = require('path'); // path 모듈을 가져옵니다. 파일 경로를 다룰 때 유용합니다.
require('dotenv').config();

const dbPool = require('../db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Nodemailer Transporter 설정 ---
// Gmail을 사용하는 경우
const transporter = nodemailer.createTransport({
  service: 'gmail', // Gmail 서비스 사용
  auth: {
    user: process.env.EMAIL_USER, // .env 파일에서 불러온 Gmail 계정
    pass: process.env.EMAIL_PASS  // .env 파일에서 불러온 Gmail 앱 비밀번호
  },
  // Gmail의 경우 TLS 설정이 기본적으로 잘 되어 있어 추가 설정이 필요 없을 수 있습니다.
  // 다른 SMTP 서버를 사용한다면 host, port, secure 등의 옵션을 설정해야 합니다.
});

// 연결 테스트 (선택 사항, 서버 시작 시 한 번 실행)
transporter.verify(function(error, success) {
  if (error) {
    console.error('Nodemailer 설정 오류:', error);
  } else {
    console.log('Nodemailer가 성공적으로 설정되어 이메일을 보낼 준비가 되었습니다.');
  }
});
// ------------------------------------

// --- 이메일 인증을 위한 임시 저장소 (실제로는 DB, Redis 등을 사용) ---
const verificationCodes = {}; // 예: { 'user@example.com': { code: '123456', expires: timestamp, verified: false } }
// -------------------------------------------------------------------------


// --- 이메일 인증 코드 전송 API (Nodemailer 적용) ---
app.post('/api/send-verification-email', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: '이메일을 입력해주세요.' });
  }

  // 간단한 이메일 형식 검증 (더 정교한 검증 라이브러리 사용 가능)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: '유효한 이메일 주소를 입력해주세요.' });
  }

  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6자리 난수 생성
    const expires = Date.now() + 10 * 60 * 1000; // 10분 후 만료

    verificationCodes[email] = { code, expires, verified: false }; // verified 상태 추가

    // 이메일 내용 정의
    const mailOptions = {
      from: `"Memora 인증팀" <${process.env.EMAIL_USER}>`, // 보내는 사람 주소 및 이름
      to: email, // 받는 사람 주소
      subject: '[Memora] 회원가입 이메일 인증 코드입니다.', // 이메일 제목
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Memora 회원가입 인증 코드</h2>
          <p>안녕하세요,</p>
          <p>Memora 회원가입을 위한 인증 코드는 다음과 같습니다:</p>
          <p style="font-size: 24px; font-weight: bold; color: #333;">${code}</p>
          <p>이 코드는 10분 동안 유효합니다. 코드를 입력하여 회원가입을 완료해주세요.</p>
          <p>감사합니다.</p>
          <p>Memora 팀 드림</p>
        </div>
      `
      // text: `인증 코드: ${code}` // HTML을 지원하지 않는 클라이언트를 위한 일반 텍스트 내용
    };

    // 이메일 발송
    await transporter.sendMail(mailOptions);
    console.log(`인증 코드 이메일 발송 성공: ${email} - 코드: ${code}`);
    res.status(200).json({ message: '인증 코드가 이메일로 성공적으로 전송되었습니다.' });

  } catch (error) {
    console.error('이메일 인증 코드 전송 오류:', error);
    // Nodemailer 관련 에러인지, 다른 에러인지 구분하여 처리 가능
    if (error.responseCode && error.responseCode === 535) { // 535 Authentication credentials invalid
        res.status(500).json({ message: '이메일 서버 인증에 실패했습니다. 관리자에게 문의하세요.' });
    } else {
        res.status(500).json({ message: '인증 코드 전송 중 오류가 발생했습니다.' });
    }
  }
});
// ------------------------------------------

// --- 이메일 인증 코드 확인 API (수정) ---
app.post('/api/verify-email-code', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ message: '이메일과 인증 코드를 모두 입력해주세요.' });
  }

  const storedEntry = verificationCodes[email];

  if (!storedEntry) {
    return res.status(400).json({ message: '인증 코드 요청 기록이 없거나 이미 사용되었습니다.' });
  }

  if (storedEntry.expires < Date.now()) {
    delete verificationCodes[email]; // 만료된 코드 삭제
    return res.status(400).json({ message: '인증 코드가 만료되었습니다. 다시 요청해주세요.' });
  }

  if (storedEntry.code === code) {
    verificationCodes[email].verified = true; // 인증 성공 상태로 변경
    // 만약 코드를 한 번만 사용하게 하려면 여기서 delete verificationCodes[email]; 를 할 수 있지만,
    // 회원가입 최종 단계에서 다시 한번 이메일이 인증되었는지 확인하기 위해 verified 플래그를 사용합니다.
    // 최종 가입 시 이메일이 verified[email].verified === true 인지 확인 후 가입 처리하고 삭제.
    res.status(200).json({ success: true, message: '이메일 인증에 성공했습니다!' }); // 프론트에서 success를 사용하고 있으므로 유지
  } else {
    res.status(400).json({ success: false, message: '인증 코드가 일치하지 않습니다.' });
  }
});
// ------------------------------------------

// 회원가입 라우트 (POST /api/register) - 이메일 인증 상태 확인 추가
app.post('/api/register', async (req, res) => {
  const { username, password, name, birth, email } = req.body;

  if (!username || !password || !name || !birth || !email) {
    return res.status(400).json({ message: '모든 필드를 입력해주세요.' });
  }

  // --- 서버 측 이메일 인증 상태 확인 ---
  const emailEntry = verificationCodes[email];
  if (!emailEntry || !emailEntry.verified) {
      // 실제로는 이메일 인증을 다시 시도하라는 메시지를 보내거나,
      // 혹은 /api/verify-email-code API가 호출되지 않은 경우를 방지하는 로직이 필요할 수 있습니다.
      // 여기서는 간단하게, 인증되지 않았으면 가입을 막습니다.
      return res.status(403).json({ message: '이메일 인증이 완료되지 않았습니다. 이메일 인증을 먼저 진행해주세요.' });
  }
  // ------------------------------------

  let connection;
  try {
    connection = await dbPool.getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (rows.length > 0) {
      const existingUser = rows[0];
      if (existingUser.username === username) {
        return res.status(409).json({ message: '이미 사용 중인 아이디입니다.' });
      }
      if (existingUser.email === email) {
        // 이메일 중복은 이미 인증 단계에서 어느정도 걸러졌겠지만, 최종 DB 저장 전에도 확인
        return res.status(409).json({ message: '이미 가입된 이메일입니다.' });
      }
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const [result] = await connection.execute(
      'INSERT INTO users (username, email, password, name, birth, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [username, email, hashedPassword, name, birth]
    );

    delete verificationCodes[email]; // 회원가입 성공 후 인증 정보 삭제

    console.log('회원가입 성공:', result.insertId);
    res.status(201).json({ message: '회원가입이 성공적으로 완료되었습니다.', userId: result.insertId });

  } catch (error) {
    console.error('회원가입 처리 중 오류 발생:', error);
    if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: '이미 사용 중인 아이디 또는 이메일입니다.' });
    }
    res.status(500).json({ message: '서버 오류가 발생했습니다. 다시 시도해주세요.' });
  } finally {
    if (connection) connection.release();
  }
});

app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});

//----------------------------------------------------------------
app.use(express.static(path.join('/root', 'project', 'frontend')));

app.listen(3000, function(){
        console.log("App is running on port 3000");
});

// 루트 경로 ("/") 요청 시 index.html 응답
app.get("/", function(req, res){
        // res.sendfile()은 Express 4.x에서는 res.sendFile()로 변경되었습니다.
        // 절대 경로를 사용하는 것이 좋습니다. path.join을 활용합니다.
        res.sendFile(path.join('/root', 'project', 'frontend', 'index.html'));
});

// '/login' 경로 요청 시 login.html 응답 (새로 추가된 부분)
app.get("/login", function(req, res){
        // login.html 파일이 /root/project/frontend/ 안에 있다고 가정합니다.
        res.sendFile(path.join('/root', 'project', 'frontend', 'login.html'));
});

app.get("/signup", function(req, res){
        // signup.html 파일이 /root/project/frontend/ 안에 있다고 가정합니다.
        res.sendFile(path.join('/root', 'project', 'frontend', 'signup.html'));
});