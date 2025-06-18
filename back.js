// back.js (또는 backend-server.js)
const express = require('express');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const fetch = require('node-fetch');
require('dotenv').config();

const dbPool = require('./db');

const app = express();
const BACKEND_PORT = process.env.BACKEND_PORT || 3001;

// --- 파일 업로드 폴더 생성 (없을 경우) ---
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// --- Multer 설정 ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // 파일이 저장될 경로
  },
  filename: function (req, file, cb) {
    // 파일명 중복을 피하기 위해 현재 시간과 원본 파일명을 조합
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// --- 업로드된 파일을 외부에서 접근 가능하도록 static 미들웨어 추가 ---
// 예: http://localhost:3001/uploads/profileImage-1678886400000.png 와 같이 접근
app.use('/uploads', express.static('uploads'));
// ----------------------------------------------------------------


// --- CORS 설정 ---
// Nginx를 통해 프론트엔드와 백엔드가 같은 도메인/포트에서 서비스되는 것처럼 보이므로,
// CORS 설정이 더 단순해지거나 필요 없을 수도 있습니다.
// 하지만 개발 중 직접 프론트엔드 서버(예: localhost:3000)에서 백엔드(localhost:3001)로 호출하는 경우를 대비해 유지합니다.
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000', // 프론트엔드 주소 (환경 변수 또는 직접 지정)
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
// --------------------

// --- 기본 미들웨어 ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// --------------------

// --- Nodemailer Transporter 설정 ---
let transporter;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      from:process.env.EMAIL_USER
    });
    transporter.verify((error, success) => {
      if (error) console.error('Nodemailer 설정 오류:', error.message);
      else console.log('Nodemailer가 성공적으로 설정되어 이메일을 보낼 준비가 되었습니다.');
    });
} else {
    console.warn('경고: EMAIL_USER 또는 EMAIL_PASS가 .env 파일에 설정되지 않아 이메일 발송 기능이 비활성화됩니다.');
}
// ------------------------------------

const verificationCodes = {}; // 임시 인증 코드 저장소

// --- API 라우트 ---

// 서버 상태 확인용
app.get('/api', (req, res) => {
  res.json({ message: 'Memora 백엔드 API 서버입니다. 정상 작동 중!' });
});

// 이메일 인증 코드 전송
app.post('/api/send-verification-email', async (req, res) => {
  if (!transporter) return res.status(503).json({ message: '이메일 서비스가 현재 사용할 수 없습니다.' });
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: '유효한 이메일 주소를 입력해주세요.' });
  }
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    verificationCodes[email] = { code, expires: Date.now() + 10 * 60 * 1000, verified: false };

    // 1. HTML 템플릿 파일 읽기
    const templatePath = path.join(__dirname, 'frontend', 'Email.html');
    let html = fs.readFileSync(templatePath, 'utf-8');

    // 2. 템플릿의 {{code}} 부분을 실제 코드로 교체
    html = html.replace('{{code}}', code);

    const mailOptions = {
      from: `"memora" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '[Memora] 회원가입 이메일 인증 코드입니다.',
      html: html // 파일에서 읽고 수정한 HTML을 사용
    };

    await transporter.sendMail(mailOptions);
    console.log(`인증 코드 이메일 발송 성공: ${email} - 코드: ${code}`);
    res.status(200).json({ message: '인증 코드가 이메일로 성공적으로 전송되었습니다.' });
  } catch (error) {
    console.error('이메일 인증 코드 전송 오류:', error);
    res.status(500).json({ message: '인증 코드 전송 중 오류가 발생했습니다.' });
  }
});

// 이메일 인증 코드 확인
app.post('/api/verify-email-code', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ message: '이메일과 인증 코드를 모두 입력해주세요.' });
  const storedEntry = verificationCodes[email];
  if (!storedEntry) return res.status(400).json({ success: false, message: '인증 코드 요청 기록이 없거나 이미 사용되었습니다.' });
  if (storedEntry.expires < Date.now()) {
    delete verificationCodes[email];
    return res.status(400).json({ success: false, message: '인증 코드가 만료되었습니다.' });
  }
  if (storedEntry.code === code) {
    verificationCodes[email].verified = true;
    console.log(`이메일 인증 성공: ${email}`);
    res.status(200).json({ success: true, message: '이메일 인증에 성공했습니다!' });
  } else {
    res.status(400).json({ success: false, message: '인증 코드가 일치하지 않습니다.' });
  }
});

// 회원가입
app.post('/api/register', async (req, res) => {
  console.log('--- /api/register 요청 받음 ---', req.body);
  // ▼▼▼ [추가된 hCaptcha 검증 로직] ▼▼▼
  const token = req.body['h-captcha-response'];
  const secretKey = process.env.HCAPTCHA_SECRET_KEY; // .env 파일에 비밀 키를 저장하세요!

  if (!secretKey) {
      console.error("HCAPTCHA_SECRET_KEY가 .env 파일에 설정되지 않았습니다.");
      return res.status(500).json({ message: '보안 설정에 오류가 있습니다. 관리자에게 문의하세요.' });
  }

  if (!token) {
      return res.status(400).json({ message: '보안 문자 인증이 필요합니다.' });
  }

  try {
      const params = new URLSearchParams();
      params.append('response', token);
      params.append('secret', secretKey);
      // 사용자 IP 주소를 함께 보내면 보안 수준이 향상됩니다.
      const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      params.append('remoteip', userIp);

      const verifyResponse = await fetch('https://api.hcaptcha.com/siteverify', {
          method: 'POST',
          body: params,
      });

      const verifyData = await verifyResponse.json();
        console.log('hCaptcha 검증 결과:', verifyData);

        if (!verifyData.success) {
            // 캡챠 검증 실패 시, 여기서 즉시 처리를 중단하고 에러 응답을 보냅니다.
            return res.status(400).json({ message: '보안 문자 인증에 실패했습니다. 다시 시도해주세요.' });
        }
    } catch (error) {
        console.error('hCaptcha 검증 API 호출 오류:', error);
        return res.status(500).json({ message: '보안 인증 중 서버 오류가 발생했습니다.' });
    }
    // ▲▲▲ [hCaptcha 검증 로직 끝] ▲▲▲
  const { username, password, name, birth, email } = req.body;
  if (!username || !password || !name || !birth || !email) {
    return res.status(400).json({ message: '모든 필수 필드를 입력해주세요.' });
  }
  const emailEntry = verificationCodes[email];
  if (!emailEntry || !emailEntry.verified) {
    return res.status(403).json({ message: '이메일 인증이 완료되지 않았습니다.' });
  }
  let connection;
  try {
    connection = await dbPool.getConnection();
    const [existingUsers] = await connection.execute(
      `SELECT username, email FROM ${process.env.DB_NAME}.users WHERE username = ? OR email = ?`,
      [username, email]
    );
    if (existingUsers.length > 0) {
      if (existingUsers.some(user => user.username === username)) return res.status(409).json({ message: '이미 사용 중인 아이디입니다.' });
      if (existingUsers.some(user => user.email === email)) return res.status(409).json({ message: '이미 가입된 이메일입니다.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await connection.execute(
      `INSERT INTO ${process.env.DB_NAME}.users (username, email, password, name, birth, created_at) VALUES (?, ?, ?, ?, ?, NOW())`,
      [username, email, hashedPassword, name, birth]
    );
    delete verificationCodes[email];

     // 👇 --- 여기에 로그 기록 코드를 추가하세요 ---
     try {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      await connection.execute(
          `INSERT INTO ${process.env.DB_NAME}.log_records (log_type, username, ip_address) VALUES (?, ?, ?)`,
          ['register_success', username, ip]
      );
  } catch (logError) {
      console.error('회원가입 성공 로그 기록 실패:', logError);
  }
  // -------------------------------------------

    console.log('회원가입 성공: userId =', result.insertId);
    res.status(201).json({ message: '회원가입이 성공적으로 완료되었습니다.', userId: result.insertId });
  } catch (error) {
    console.error('회원가입 처리 중 오류:', error);
    res.status(500).json({ message: '서버 내부 오류가 발생했습니다.' });
  } finally {
    if (connection) connection.release();
  }
});

// 로그인
app.post('/api/login', async (req, res) => {
  console.log('--- /api/login 요청 받음 ---', req.body);
  // ▼▼▼ [추가된 hCaptcha 검증 로직] ▼▼▼
  const token = req.body['h-captcha-response'];
  const secretKey = process.env.HCAPTCHA_SECRET_KEY; // .env 파일의 비밀 키 사용

  if (!secretKey) {
      console.error("HCAPTCHA_SECRET_KEY가 .env 파일에 설정되지 않았습니다.");
      return res.status(500).json({ message: '보안 설정에 오류가 있습니다.' });
  }
  if (!token) {
      return res.status(400).json({ message: '보안 문자 인증이 필요합니다.' });
  }
  try {
      const params = new URLSearchParams();
      params.append('response', token);
      params.append('secret', secretKey);
      const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      params.append('remoteip', userIp);

      const verifyResponse = await fetch('https://api.hcaptcha.com/siteverify', {
        method: 'POST',
        body: params,
    });
    const verifyData = await verifyResponse.json();
    
    if (!verifyData.success) {
        // 캡챠 검증 실패 시, 여기서 즉시 처리를 중단합니다.
        return res.status(400).json({ message: '보안 문자 인증에 실패했습니다.' });
    }
} catch (error) {
    console.error('hCaptcha 검증 API 호출 오류:', error);
    return res.status(500).json({ message: '보안 인증 중 서버 오류가 발생했습니다.' });
}
// ▲▲▲ [hCaptcha 검증 로직 끝] ▲▲▲
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: '아이디와 비밀번호를 모두 입력해주세요.' });
  
  let connection;
  try {
    connection = await dbPool.getConnection();
    // 🚨 SELECT 문에 'role'이 반드시 포함되어야 합니다.
    const [users] = await connection.execute(
      `SELECT id, username, password, name, email, role, profile_image_url FROM ${process.env.DB_NAME}.users WHERE username = ?`,
      [username]
    );
    if (users.length === 0) return res.status(401).json({ message: '아이디 또는 비밀번호가 일치하지 않습니다.' });

    const user = users[0];
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) return res.status(401).json({ message: '아이디 또는 비밀번호가 일치하지 않습니다.' });

    // 🚨 페이로드에 'role'을 포함하여 토큰을 생성합니다.
    const payload = { 
        userId: user.id, 
        username: user.username, 
        name: user.name, 
        email: user.email, 
        role: user.role, // 사용자의 실제 역할을 담아줍니다.
        profile_image_url: user.profile_image_url // 프로필 이미지 URL 추가
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    // 로그 기록
    try {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        await connection.execute(
            `INSERT INTO ${process.env.DB_NAME}.log_records (log_type, username, ip_address) VALUES (?, ?, ?)`,
            ['login_success', username, ip]
        );
    } catch (logError) {
        console.error('로그인 성공 로그 기록 실패:', logError);
    }

    console.log(`로그인 성공: username = ${username}, role = ${user.role}`);
    // 프론트엔드로 사용자 정보(role 포함)를 함께 보내줍니다.
    res.status(200).json({ message: '로그인 성공!', token, user: payload });
  } catch (error) {
    console.error('로그인 처리 중 오류:', error);
    res.status(500).json({ message: '서버 내부 오류가 발생했습니다.' });
  } finally {
    if (connection) connection.release();
  }
});

// // 관리자 로그인 API
// app.post('/api/admin/login', async (req, res) => {
//   console.log('--- /api/admin/login 요청 받음 ---', req.body);
//   const { username, password } = req.body;
//   if (!username || !password) {
//     return res.status(400).json({ message: '아이디와 비밀번호를 모두 입력해주세요.' });
//   }

//   let connection;
//   try {
//     connection = await dbPool.getConnection();
//     // 🚨 중요: DB 조회 시 'role' 컬럼을 반드시 포함합니다.
//     const [users] = await connection.execute(
//       `SELECT id, username, password, name, email, role FROM ${process.env.DB_NAME}.users WHERE username = ?`,
//       [username]
//     );

//     if (users.length === 0) {
//       return res.status(401).json({ message: '아이디 또는 비밀번호가 일치하지 않습니다.' });
//     }

//     const user = users[0];

//     // 🚨🚨 핵심: 사용자의 역할(role)이 'admin'인지 확인합니다.
//     if (user.role !== 'admin') {
//       return res.status(403).json({ message: '관리자 계정이 아닙니다. 접근 권한이 없습니다.' });
//     }

//     const isPasswordMatch = await bcrypt.compare(password, user.password);
//     if (!isPasswordMatch) {
//       return res.status(401).json({ message: '아이디 또는 비밀번호가 일치하지 않습니다.' });
//     }

    // 🚨🚨 핵심: JWT 페이로드(payload)에 'role' 정보를 포함시킵니다.
//     const payload = { 
//       userId: user.id, 
//       username: user.username, 
//       name: user.name, 
//       role: user.role // 토큰 안에 역할 정보를 담아서 발행
//     };
//     const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

//     console.log(`관리자 로그인 성공: username = ${username}`);
//     res.status(200).json({ message: '관리자 로그인 성공!', token, user: payload });

//   } catch (error) {
//     console.error('관리자 로그인 처리 중 오류:', error);
//     res.status(500).json({ message: '서버 내부 오류가 발생했습니다.' });
//   } finally {
//     if (connection) connection.release();
//   }
// });

// --- JWT 인증 미들웨어 ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"
    if (token == null) {
        console.log('인증 토큰 없음 - 요청 거부');
        return res.status(401).json({ message: '인증 토큰이 필요합니다.' });
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, userPayload) => {
        if (err) {
            console.error('JWT 검증 실패:', err.message);
            if (err.name === 'TokenExpiredError') return res.status(403).json({ message: '토큰이 만료되었습니다.' });
            return res.status(403).json({ message: '유효하지 않은 토큰입니다.' });
        }
        req.user = userPayload; // 요청 객체에 디코드된 사용자 정보(페이로드) 저장
        next();
    });
};

// --- JWT 관리자 인증 미들웨어 ---
const requireAdmin = (req, res, next) => {
  // 1. 먼저 기존 토큰 인증 미들웨어를 통과시킨다.
  authenticateToken(req, res, () => {
      // 2. 인증이 성공하면 req.user에 사용자 정보가 담긴다.
      //    이제 사용자의 역할(role)을 확인한다.
      if (req.user && req.user.role === 'admin') {
          // 3. 역할이 'admin'이면, 요청을 그대로 통과시킨다.
          next();
      } else {
          // 4. 'admin'이 아니면, 권한 없음(403 Forbidden) 에러를 보낸다.
          console.log(`관리자 권한 거부: 요청자=${req.user ? req.user.username : 'Unknown'}`);
          res.status(403).json({ message: '접근 권한이 없습니다. 관리자만 이용할 수 있습니다.' });
      }
  });
};
// ------------------------

// ===================================================
//               마이페이지/프로필 API
// ===================================================

// 1. 현재 로그인된 사용자 프로필 정보 가져오기
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    console.log(`--- /api/user/profile GET 요청 받음 - 사용자 ID: ${userId} ---`);

    let connection;
    try {
        connection = await dbPool.getConnection();
        // 중요: password 컬럼은 절대 보내지 않습니다.
        const [users] = await connection.execute(
            `SELECT id, username, email, name, birth, profile_image_url, bio, created_at FROM ${process.env.DB_NAME}.users WHERE id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }
        res.status(200).json(users[0]);
    } catch (error) {
        console.error('프로필 정보 조회 오류:', error);
        res.status(500).json({ message: '서버 오류로 프로필 정보를 가져오지 못했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

// 2. 프로필 정보 수정하기 (이름, 자기소개)
app.put('/api/user/profile', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { name, bio } = req.body;
    console.log(`--- /api/user/profile PUT 요청 받음 - 사용자 ID: ${userId} ---`, req.body);

    if (!name) {
        return res.status(400).json({ message: '이름은 필수 항목입니다.' });
    }

    let connection;
    try {
        connection = await dbPool.getConnection();
        await connection.execute(
            `UPDATE ${process.env.DB_NAME}.users SET name = ?, bio = ? WHERE id = ?`,
            [name, bio || null, userId] // bio가 없으면 null로 저장
        );
        res.status(200).json({ message: '프로필이 성공적으로 업데이트되었습니다.' });
    } catch (error) {
        console.error('프로필 업데이트 오류:', error);
        res.status(500).json({ message: '서버 오류로 프로필을 업데이트하지 못했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

// 3. 프로필 이미지 업로드하기 (기존 이미지 삭제 로직 추가됨)
app.post('/api/user/profile/image', authenticateToken, upload.single('profileImage'), async (req, res) => {
  const userId = req.user.userId;
  console.log(`--- /api/user/profile/image POST 요청 받음 - 사용자 ID: ${userId} ---`);

  if (!req.file) {
      return res.status(400).json({ message: '업로드할 파일을 선택해주세요.' });
  }

  const newImageUrl = `/uploads/${req.file.filename}`;
  let connection;
  try {
      connection = await dbPool.getConnection();

      // 1. DB에서 기존 이미지 파일 경로를 먼저 조회합니다.
      const [users] = await connection.execute(
          `SELECT profile_image_url FROM ${process.env.DB_NAME}.users WHERE id = ?`,
          [userId]
      );
      const oldImageUrl = users.length > 0 ? users[0].profile_image_url : null;


      // 2. DB에 새로운 이미지 URL을 업데이트합니다.
      await connection.execute(
          `UPDATE ${process.env.DB_NAME}.users SET profile_image_url = ? WHERE id = ?`,
          [newImageUrl, userId]
      );


      // 3. 만약 기존 이미지 파일이 있었다면, 서버의 uploads 폴더에서 삭제합니다.
      if (oldImageUrl) {
          // oldImageUrl은 '/uploads/파일명' 형태이므로, 실제 파일 시스템 경로를 만듭니다.
          const filename = path.basename(oldImageUrl);
          const filePath = path.join(__dirname, 'uploads', filename);

          // fs.existsSync로 파일 존재 여부를 확인 후 삭제 (더 안전함)
          if (fs.existsSync(filePath)) {
              fs.unlink(filePath, (err) => {
                  if (err) {
                      console.error(`이전 프로필 이미지 파일 삭제 실패: ${filePath}`, err);
                  } else {
                      console.log(`이전 프로필 이미지 파일 삭제 성공: ${filePath}`);
                  }
              });
          }
      }

      res.status(200).json({ message: '프로필 이미지가 성공적으로 업로드되었습니다.', imageUrl: newImageUrl });

  } catch (error) {
      console.error('프로필 이미지 업로드 중 오류:', error);
      // 오류 발생 시, 방금 업로드된 새 파일도 삭제해주는 것이 좋습니다 (롤백).
      if (req.file) {
          const tempFilePath = path.join(__dirname, 'uploads', req.file.filename);
          if (fs.existsSync(tempFilePath)) {
              fs.unlinkSync(tempFilePath);
          }
      }
      res.status(500).json({ message: '서버 오류로 이미지를 업로드하지 못했습니다.' });
  } finally {
      if (connection) connection.release();
  }
});

// 4. 프로필 이미지 삭제하기
app.delete('/api/user/profile/image', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  console.log(`--- /api/user/profile/image DELETE 요청 받음 - 사용자 ID: ${userId} ---`);

  let connection;
  try {
      connection = await dbPool.getConnection();
      
      // 1. DB에서 현재 이미지 파일 경로를 먼저 조회합니다 (파일 삭제를 위해).
      const [users] = await connection.execute(
          `SELECT profile_image_url FROM ${process.env.DB_NAME}.users WHERE id = ?`,
          [userId]
      );

      if (users.length === 0 || !users[0].profile_image_url) {
          // 이미지가 없거나 사용자를 찾을 수 없는 경우
          return res.status(404).json({ message: '삭제할 프로필 이미지가 없습니다.' });
      }
      
      const imageUrl = users[0].profile_image_url; // 예: /uploads/profileImage-167...jpg

      // 2. DB에서 profile_image_url을 NULL로 업데이트합니다.
      await connection.execute(
          `UPDATE ${process.env.DB_NAME}.users SET profile_image_url = NULL WHERE id = ?`,
          [userId]
      );

      // 3. 서버의 uploads 폴더에서 실제 이미지 파일을 삭제합니다.
      if (imageUrl) {
          // imageUrl은 '/uploads/파일명' 형태이므로, 실제 파일 시스템 경로를 만들어야 합니다.
          // path.basename()을 사용해 경로 조작 공격을 방지하고 순수 파일명만 추출합니다.
          const filename = path.basename(imageUrl);
          const filePath = path.join(__dirname, 'uploads', filename);

          fs.unlink(filePath, (err) => {
              if (err) {
                  // 파일이 없거나 다른 이유로 삭제 실패 시 에러를 콘솔에 기록합니다.
                  // 하지만 사용자에게는 이미 DB에서 제거했으므로 성공 응답을 보내도 무방합니다.
                  console.error(`프로필 이미지 파일 삭제 실패: ${filePath}`, err);
              } else {
                  console.log(`프로필 이미지 파일 삭제 성공: ${filePath}`);
              }
          });
      }
      
      res.status(200).json({ message: '프로필 이미지가 성공적으로 삭제되었습니다.' });

  } catch (error) {
      console.error('프로필 이미지 삭제 오류:', error);
      res.status(500).json({ message: '서버 오류로 이미지를 삭제하지 못했습니다.' });
  } finally {
      if (connection) connection.release();
  }
});

// --- 회원탈퇴 API ---
app.delete('/api/user/withdraw', authenticateToken, async (req, res) => {
    const userId = req.user.userId; // authenticateToken 미들웨어에서 설정됨

    if (!userId) {
        // 이 경우는 보통 authenticateToken에서 걸러지지만, 방어적으로 추가
        return res.status(400).json({ message: '잘못된 요청입니다. 사용자 ID를 확인할 수 없습니다.' });
    }
    console.log(`--- /api/user/withdraw 요청 받음 - 사용자 ID: ${userId} ---`);
    let connection;
    try {
        connection = await dbPool.getConnection();
        await connection.beginTransaction();

        // 중요! 사용자와 관련된 다른 데이터(외래 키 제약 등)를 먼저 삭제하거나 처리해야 합니다.
        // 예: DELETE FROM posts WHERE user_id = ?
        // 예: DELETE FROM comments WHERE user_id = ?
        // 이 예제에서는 users 테이블의 레코드만 삭제합니다. 실제 서비스에서는 이 부분을 반드시 고려하세요.

        const sql = `DELETE FROM ${process.env.DB_NAME}.users WHERE id = ?`;
        const [result] = await connection.execute(sql, [userId]);

        if (result.affectedRows === 0) {
            await connection.rollback();
            console.log(`회원탈퇴 실패: DB에서 사용자 찾을 수 없음 - ID: ${userId}`);
            return res.status(404).json({ message: '사용자 정보를 찾을 수 없습니다.' });
        }
        await connection.commit();
        console.log(`회원탈퇴 성공: 사용자 ID = ${userId}`);
        res.status(200).json({ success: true, message: '회원탈퇴가 성공적으로 처리되었습니다.' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('회원탈퇴 처리 중 DB 오류:', error);
        res.status(500).json({ message: '회원탈퇴 처리 중 서버 내부 오류가 발생했습니다.' });
    } finally {
        if (connection) connection.release();
    }
});

// --- 관리자 전용 API ---
// 로그 기록 조회 (관리자만 가능)
app.get('/api/admin/logs', requireAdmin, async (req, res) => {
  // 'requireAdmin' 미들웨어를 통과해야만 이 코드가 실행됩니다.
  console.log(`--- /api/admin/logs 요청 받음 (관리자: ${req.user.username}) ---`);
  let connection;
  try {
    connection = await dbPool.getConnection();
    const [logs] = await connection.execute(
      `SELECT * FROM ${process.env.DB_NAME}.log_records ORDER BY log_time DESC LIMIT 100`
    );
    res.status(200).json(logs);
  } catch (error) {
    console.error('로그 기록 조회 중 오류:', error);
    res.status(500).json({ message: '로그 기록을 불러오는 중 오류가 발생했습니다.' });
  } finally {
    if (connection) connection.release();
  }
});
// --------------------

// --- 서버 시작 ---
app.listen(BACKEND_PORT, () => {
  console.log(`백엔드 API 서버가 http://localhost:${BACKEND_PORT} 에서 실행 중입니다.`);
});