document.addEventListener('DOMContentLoaded', function() {
    // ▼▼▼ [추가] 비밀번호 보이기/숨기기 기능 ▼▼▼
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('toggle-password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const toggleConfirmPasswordBtn = document.getElementById('toggle-confirm-password');

    // 비밀번호 토글 기능을 위한 헬퍼 함수
    function setupPasswordToggle(input, button) {
        button.addEventListener('click', () => {
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            button.classList.toggle('fa-eye');
            button.classList.toggle('fa-eye-slash');
        });
    }

    // 각 비밀번호 필드에 기능 적용
    setupPasswordToggle(passwordInput, togglePasswordBtn);
    setupPasswordToggle(confirmPasswordInput, toggleConfirmPasswordBtn);
    // ▲▲▲ [추가] 여기까지 ▲▲▲


    // ▼▼▼ 이메일 드롭다운 로직 (기존과 동일) ▼▼▼
    const domainInput = document.getElementById('emailDomainInput');
    const domainList = document.getElementById('domainList');
    const listItems = domainList.querySelectorAll('li');

    domainInput.value = listItems[0].dataset.value;

    domainInput.addEventListener('click', function(event) {
        event.stopPropagation();
        if (this.readOnly) {
            domainList.classList.toggle('active');
            return;
        }
        const rect = this.getBoundingClientRect();
        const clickX = event.clientX;
        const arrowZoneWidth = 40;
        if (clickX > rect.right - arrowZoneWidth) {
            domainList.classList.toggle('active');
        } 
    });

    listItems.forEach(item => {
        item.addEventListener('click', function() {
            const selectedValue = this.dataset.value;
            if (selectedValue === 'custom') {
                domainInput.value = '';
                domainInput.placeholder = '도메인 입력';
                domainInput.readOnly = false;
                domainInput.focus();
            } else {
                domainInput.value = selectedValue;
                domainInput.placeholder = '';
                domainInput.readOnly = true;
            }
            domainList.classList.remove('active');
        });
    });

    document.addEventListener('click', function() {
        if (domainList.classList.contains('active')) {
            domainList.classList.remove('active');
        }
    });

    // ▼▼▼ 인증 및 회원가입 로직 (기존과 동일) ▼▼▼
    const sendCodeButton = document.getElementById('sendCodeBtn');
    const verifyCodeButton = document.getElementById('verifyCodeBtn');
    sendCodeButton.addEventListener('click', sendCode);
    verifyCodeButton.addEventListener('click', verifyCode);
});


// 이메일 주소를 조합하고 유효성을 검사하는 함수
function getFullEmail() {
    const local = document.getElementById('emailLocal').value;
    const domain = document.getElementById('emailDomainInput').value;
    if (!local || !domain) {
        alert('이메일 주소를 올바르게 입력해주세요.');
        return null;
    }
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    const fullEmail = `${local}@${domain}`;
    if(!emailRegex.test(fullEmail)) {
        alert('유효하지 않은 이메일 형식입니다.');
        return null;
    }
    return fullEmail;
}

let isEmailVerified = false;
let timerInterval = null; 
let timerSeconds = 600;

function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    document.getElementById('timerDisplay').textContent =
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerSeconds = 600;
    updateTimerDisplay();
    document.getElementById('timerDisplay').style.display = 'inline';
    timerInterval = setInterval(() => {
        timerSeconds--;
        updateTimerDisplay();
        if (timerSeconds <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            document.getElementById('timerDisplay').textContent = "시간 만료";
            alert("인증 시간이 만료되었습니다. 코드를 다시 요청해주세요.");
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    const timerDisplayElement = document.getElementById('timerDisplay');
    if (timerDisplayElement) {
        timerDisplayElement.style.display = 'none';
    }
}

async function sendCode() {
    const fullEmail = getFullEmail();
    if (!fullEmail) return;

    const apiUrl = '/api/send-verification-email';
    const sendCodeButton = document.getElementById('sendCodeBtn');
    sendCodeButton.disabled = true;
    sendCodeButton.textContent = '전송 중...';

    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: fullEmail })
        });
        const data = await response.json();
        if (response.ok) {
            alert(data.message || "인증 코드가 전송되었습니다.");
            startTimer();
        } else {
            alert("인증 코드 전송 실패: " + (data.message || "서버 오류"));
            stopTimer();
        }
    } catch (error) {
        console.error('Error sending verification code:', error);
        alert('인증 코드 전송 중 오류가 발생했습니다.');
        stopTimer();
    } finally {
        sendCodeButton.disabled = false;
        sendCodeButton.textContent = '인증코드 전송';
    }
}

async function verifyCode() {
    const fullEmail = getFullEmail();
    if (!fullEmail) return;
    const code = document.getElementById('verificationCode').value;

    if (!code) {
        alert("인증 코드를 입력해주세요.");
        return;
    }

    const apiUrl = '/api/verify-email-code';
    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: fullEmail, code })
        });
        const data = await response.json();
        if (data.success) {
            alert(data.message || "이메일 인증 성공!");
            isEmailVerified = true;
            stopTimer();
            const timerDisplay = document.getElementById('timerDisplay');
            timerDisplay.textContent = "인증 완료";
            timerDisplay.style.color = "green";
            timerDisplay.style.display = 'inline';
        } else {
            alert("이메일 인증 실패: " + (data.message || "코드가 올바르지 않습니다."));
            isEmailVerified = false;
        }
    } catch (error) {
        console.error('Error verifying email code:', error);
        alert('이메일 인증 확인 중 오류가 발생했습니다.');
        isEmailVerified = false;
    }
}

const signupForm = document.getElementById('signupForm');
signupForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    if (!isEmailVerified) {
        alert('이메일 인증을 먼저 완료해주세요.');
        return;
    }
    const hCaptchaResponse = document.querySelector('[name="h-captcha-response"]').value;
    if (!hCaptchaResponse) {
        alert('Capcha 인증을 진해해주세요.');
        return;
    }

    const username = document.getElementById('userId').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const name = document.getElementById('name').value;
    const birth = document.getElementById('birth').value;
    const email = getFullEmail();
    if (!email) return;

    if (password !== confirmPassword) {
        alert('비밀번호가 일치하지 않습니다.');
        return;
    }
    if (!username || !password || !name || !birth) {
        alert('모든 필수 정보를 입력해주세요.');
        return;
    }
    const formData = { username, password, name, birth, email, 'h-captcha-response': hCaptchaResponse };
    const apiUrl = '/api/register';
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        const data = await response.json();
        if (response.ok) {
            alert(data.message || "회원가입이 성공적으로 완료되었습니다.");
            stopTimer();
            window.location.href = '/login';
        } else {
            if (typeof hcaptcha !== 'undefined') {
                hcaptcha.reset();
            }
            alert('회원가입 실패: ' + (data.message || "서버 오류"));
        }
    } catch (error) {
        console.error('회원가입 요청 중 오류 발생:', error);
        alert('회원가입 처리 중 오류가 발생했습니다.');
    }
});

window.addEventListener('beforeunload', () => {
    stopTimer();
});