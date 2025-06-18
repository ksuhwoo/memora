let express = require("express");
let path = require('path'); // path 모듈을 가져옵니다. 파일 경로를 다룰 때 유용합니다.
let app = express();

// 정적 파일을 제공할 폴더를 설정합니다.
// path.join을 사용하면 OS에 상관없이 올바른 경로 구분자로 경로를 만들어줍니다.
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