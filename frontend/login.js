// login.js
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const passwordInput = document.getElementById('password');

        // ▼▼▼ [추가] 비밀번호 보이기/숨기기 기능 추가 ▼▼▼
    const togglePasswordButton = document.getElementById('toggle-password');

    togglePasswordButton.addEventListener('click', () => {
        // input의 type을 확인하여 password이면 text로, text이면 password로 변경
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);

        // 아이콘 모양도 함께 변경 (Font Awesome 클래스 토글)
        togglePasswordButton.classList.toggle('fa-eye');
        togglePasswordButton.classList.toggle('fa-eye-slash');
    });

    // 토스트 알림 함수는 이제 사용하지 않으므로 주석 처리하거나 삭제합니다.
    /*
    function showToast(message, type = 'info', duration = 3000) {
        // ... 이전 토스트 로직 ...
    }
    */

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        // ▼▼▼ [추가] hCaptcha 응답 토큰 가져오기 ▼▼▼
    const hCaptchaResponse = document.querySelector('[name="h-captcha-response"]').value;
    if (!hCaptchaResponse) {
        alert('Capcha 인증을 진행해주세요.'); // 사용자가 캡챠를 풀지 않았을 때
        return;
    }
    // ▲▲▲ [추가] 여기까지 ▲▲▲
    
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const rememberCheck = document.getElementById('remember-check');
    
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
    
        if (!username || !password) {
            alert('아이디와 비밀번호를 모두 입력해주세요.');
            return;
        }
    
        try {
            const response = await fetch('/api/login', { // 통합된 로그인 API 호출
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, 'h-captcha-response': hCaptchaResponse }),
            });
    
            const data = await response.json();
    
            if (response.ok) {
                alert(data.message || '로그인 성공!');
    
                // 토큰과 사용자 정보를 localStorage에 저장
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('userData', JSON.stringify(data.user)); // user 객체에는 role이 포함되어 있습니다.
    
                // "아이디 저장" 처리
                if (rememberCheck.checked) {
                    localStorage.setItem('rememberedUsername', username);
                } else {
                    localStorage.removeItem('rememberedUsername');
                }
    
                window.location.href = '/';
    
            } else {
                if (typeof hcaptcha !== 'undefined') {
                    hcaptcha.reset();
                }
                alert(data.message || '로그인에 실패했습니다. 아이디나 비밀번호를 확인해주세요.');
                passwordInput.value = '';
            }
        } catch (error) {
            console.error('로그인 오류:', error);
            if (typeof hcaptcha !== 'undefined') {
                hcaptcha.reset();
            }
            alert('로그인 중 오류가 발생했습니다. 네트워크 연결을 확인하거나 나중에 다시 시도해주세요.');
        }
    });

    // 이전에 "아이디 저장"을 선택했다면 아이디 필드 채우기
    const rememberedUsername = localStorage.getItem('rememberedUsername');
    if (rememberedUsername) {
        document.getElementById('username').value = rememberedUsername;
        document.getElementById('remember-check').checked = true;
    }
});