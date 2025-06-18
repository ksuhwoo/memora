document.addEventListener('DOMContentLoaded', function() {
    const domainInput = document.getElementById('emailDomainInput');
    const domainList = document.getElementById('domainList');
    const listItems = domainList.querySelectorAll('li');

    // 초기값 설정
    domainInput.value = listItems[0].dataset.value;

    // ▼▼▼ [수정] 입력창 클릭 이벤트를 클릭 위치에 따라 다르게 처리 ▼▼▼
    domainInput.addEventListener('click', function(event) {
        event.stopPropagation(); // 이벤트 전파 중단

        // CASE 1: 도메인을 선택한 상태 (읽기 전용)
        // 이 경우, 어디를 클릭하든 목록이 열립니다.
        if (this.readOnly) {
            domainList.classList.toggle('active');
            return;
        }

        // CASE 2: '직접 입력' 모드 (입력 가능 상태)
        // 클릭된 위치를 계산하여 동작을 결정합니다.
        const rect = this.getBoundingClientRect(); // 입력창의 위치와 크기 정보
        const clickX = event.clientX; // 클릭된 가로 좌표
        const arrowZoneWidth = 40; // 화살표 영역으로 간주할 너비 (픽셀)

        // 화살표 영역(오른쪽 끝)을 클릭했는지 확인
        if (clickX > rect.right - arrowZoneWidth) {
            domainList.classList.toggle('active'); // 목록을 열거나 닫음
        } 
        // 텍스트 영역(왼쪽)을 클릭한 경우, 아무것도 하지 않아
        // 브라우저의 기본 동작(커서 활성화)이 일어나도록 둡니다.
    });
    // ▲▲▲ [수정] 여기까지 ▲▲▲

    // 목록 항목 클릭 시 처리
    listItems.forEach(item => {
        item.addEventListener('click', function() {
            const selectedValue = this.dataset.value;
            
            if (selectedValue === 'custom') {
                // '직접 입력' 선택 시
                domainInput.value = '';
                domainInput.placeholder = '도메인 입력';
                domainInput.readOnly = false; // 입력 가능하도록 변경
                domainInput.focus();
            } else {
                // 특정 도메인 선택 시
                domainInput.value = selectedValue;
                domainInput.placeholder = '';
                domainInput.readOnly = true; // 입력 불가능하도록 잠금
            }
            domainList.classList.remove('active'); // 목록 닫기
        });
    });

    // 문서의 다른 곳을 클릭하면 목록 닫기
    document.addEventListener('click', function() {
        if (domainList.classList.contains('active')) {
            domainList.classList.remove('active');
        }
    });
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


// ▼▼▼ 아래는 기존 회원가입, 인증 관련 로직 (변경 없음) ▼▼▼

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
    const sendCodeButton = event.target;
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
            console.log(data.message || "인증 코드가 전송되었습니다.");
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
    // ▼▼▼ [추가된 부분] hCaptcha 응답 토큰 가져오기 ▼▼▼
    const hCaptchaResponse = document.querySelector('[name="h-captcha-response"]').value;
    if (!hCaptchaResponse) {
        alert('Capcha 인증을 진해해주세요.'); // 사용자가 캡챠를 풀지 않았을 때
        return;
    }
    // ▲▲▲ [추가된 부분] 여기까지 ▲▲▲

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