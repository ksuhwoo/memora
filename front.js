// front.js
const express = require('express');
const path = require('path');
const http = require('http'); // 선택 사항, express 앱만으로도 충분

const app = express();
const FRONTEND_PORT = process.env.FRONTEND_PORT || 3000;

// 'frontend' 폴더를 정적 파일 루트로 지정
// __dirname은 현재 실행 중인 frontend-server.js 파일이 있는 디렉토리의 절대 경로입니다.
app.use(express.static(path.join(__dirname, 'frontend')));

// 모든 경로에 대해 frontend/index.html을 제공 (SPA의 경우)
// 또는 특정 HTML 파일들을 직접 제공할 수 있습니다.
// 여기서는 각 HTML 파일을 명시적으로 제공하는 방식을 사용합니다.
app.get("/", function(req, res){
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});
app.get("/login", function(req, res){
    res.sendFile(path.join(__dirname, 'frontend', 'login.html'));
});
app.get("/signup", function(req, res){
    res.sendFile(path.join(__dirname, 'frontend', 'signup.html'));
});
// ▼▼▼ 마이페이지 라우트 추가 ▼▼▼
app.get("/mypage", function(req, res){
    res.sendFile(path.join(__dirname, 'frontend', 'mypage.html'));
});
// ▲▲▲ 여기까지 추가 ▲▲▲

// app.get("/admin", function(req, res){
//     res.sendFile(path.join(__dirname, 'frontend', 'admin_login.html'));
// });
// app.get("/admin/login", function(req, res){
//     // /admin과 동일하게 로그인 페이지를 보여줍니다.
//     res.sendFile(path.join(__dirname, 'frontend', 'admin_login.html'));
// });
app.get("/admin/dashboard", function(req, res){
    res.sendFile(path.join(__dirname, 'frontend', 'admin_dashboard.html'));
});

// 만약 프론트엔드가 React, Vue, Angular 같은 SPA(Single Page Application)이고
// 클라이언트 사이드 라우팅을 사용한다면, 위 특정 HTML 라우트 대신 아래와 같이 설정합니다.
// 이는 /profile, /dashboard 등 정의되지 않은 모든 GET 요청에 대해 index.html을 반환하여
// 클라이언트 라우터가 해당 경로를 처리하도록 합니다.
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
// });

app.listen(FRONTEND_PORT, () => {
  console.log(`프론트엔드 서버가 http://localhost:${FRONTEND_PORT} 에서 실행 중입니다.`);
  console.log(`프론트엔드 접속 주소: http://localhost:${FRONTEND_PORT}/`);
});