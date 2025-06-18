// auth.js

/**
 * 모든 인증 관련 로직을 이 함수 안에 캡슐화합니다.
 * 이렇게 하면 load-header.js와 같은 다른 스크립트에서
 * 헤더가 완전히 로드된 후, 이 함수를 명시적으로 호출할 수 있습니다.
 */
function initializeAuth() {
    // 1. 필요한 DOM 요소들을 모두 가져옵니다.
    const loginButton = document.getElementById('loginButton');
    const profileContainer = document.getElementById('profileContainer');
    const profileButton = document.getElementById('profileButton');
    const profileDropdown = document.getElementById('profileDropdown');
    const dropdownUserNickname = document.getElementById('dropdownUserNickname');
    const logoutButton = document.getElementById('logoutButton');
    const withdrawLink = document.getElementById('withdrawLink');
    const adminDashboardLink = document.getElementById('adminDashboardLink');
    const defaultProfileIcon = document.getElementById('defaultProfileIcon');
    const userProfileImage = document.getElementById('userProfileImage');

    // 2. localStorage에서 인증 토큰과 사용자 데이터를 가져옵니다.
    const authToken = localStorage.getItem('authToken');
    const userDataString = localStorage.getItem('userData');
    let currentUser = null;

    // 사용자 데이터가 문자열 형태로 있으면 JSON 객체로 파싱합니다.
    if (userDataString) {
        try {
            currentUser = JSON.parse(userDataString);
        } catch (e) {
            console.error("사용자 데이터 파싱 오류:", e);
            // 파싱 오류 시, 잘못된 데이터를 삭제합니다.
            localStorage.removeItem('userData');
            localStorage.removeItem('authToken');
        }
    }

    // 3. 로그인 상태 여부에 따라 UI를 업데이트합니다.
    if (authToken && currentUser) {
        // --- 로그인 상태일 때의 로직 ---
        if (loginButton) loginButton.style.display = 'none';
        if (profileContainer) profileContainer.style.display = 'inline-block';

        // 드롭다운 헤더에 사용자 닉네임 표시
        if (dropdownUserNickname) {
            if (currentUser.username) {
                dropdownUserNickname.textContent = `${currentUser.username}님`;
            } else {
                dropdownUserNickname.textContent = '내 정보';
            }
        }

        // 사용자의 프로필 이미지 URL 유무에 따라 이미지 또는 기본 아이콘을 표시
        if (currentUser.profile_image_url && userProfileImage && defaultProfileIcon) {
            userProfileImage.src = currentUser.profile_image_url;
            userProfileImage.style.display = 'block';
            defaultProfileIcon.style.display = 'none';
        } else if (userProfileImage && defaultProfileIcon) {
            userProfileImage.style.display = 'none';
            defaultProfileIcon.style.display = 'block';
        }

        // 사용자의 역할(role)이 'admin'이면 관리자 메뉴 링크를 표시
        if (currentUser.role === 'admin' && adminDashboardLink) {
            adminDashboardLink.style.display = 'block';
        }

    } else {
        // --- 비로그인 상태일 때의 로직 ---
        if (loginButton) loginButton.style.display = 'inline-block';
        if (profileContainer) profileContainer.style.display = 'none';
    }

    // 4. 헤더의 각 요소에 이벤트 리스너를 등록합니다.

    // 프로필 버튼 클릭 시 드롭다운 메뉴 토글
    if (profileButton && profileDropdown) {
        profileButton.addEventListener('click', (event) => {
            event.stopPropagation(); // 이벤트가 부모 요소로 전파되는 것을 막음
            const isVisible = profileDropdown.style.display === 'block';
            profileDropdown.style.display = isVisible ? 'none' : 'block';
        });
    }

    // 문서의 다른 곳을 클릭하면 열려있는 드롭다운 메뉴 닫기
    document.addEventListener('click', (event) => {
        if (profileDropdown && profileButton &&
            profileDropdown.style.display === 'block' &&
            !profileButton.contains(event.target) &&
            !profileDropdown.contains(event.target)) {
            profileDropdown.style.display = 'none';
        }
    });

    // 로그아웃 버튼 클릭 이벤트
    if (logoutButton) {
        logoutButton.addEventListener('click', (event) => {
            event.preventDefault();
            // 로컬 스토리지에서 인증 관련 데이터 모두 삭제
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            localStorage.removeItem('rememberedUsername');
            alert('로그아웃 되었습니다.');
            window.location.href = '/login'; // 로그인 페이지로 이동
        });
    }

    // 회원탈퇴 링크 클릭 이벤트
    if (withdrawLink) {
        withdrawLink.addEventListener('click', async (event) => {
            event.preventDefault();

            if (confirm("정말로 회원탈퇴 하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
                const storedAuthToken = localStorage.getItem('authToken');
                if (!storedAuthToken) {
                    alert('오류: 로그인되어 있지 않습니다. 다시 로그인 후 시도해주세요.');
                    window.location.href = '/login';
                    return;
                }

                try {
                    // 회원탈퇴 API 호출
                    const response = await fetch('/api/user/withdraw', {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${storedAuthToken}`,
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        alert(data.message || '회원탈퇴가 성공적으로 완료되었습니다.');
                        // 탈퇴 성공 시, 로그아웃 처리와 동일하게 로컬 스토리지 클리어 및 리디렉션
                        localStorage.removeItem('authToken');
                        localStorage.removeItem('userData');
                        localStorage.removeItem('rememberedUsername');
                        window.location.href = '/'; // 메인 페이지로 리디렉션
                    } else {
                        let errorMessage = '회원탈퇴 처리 중 오류가 발생했습니다.';
                        try {
                            const errorData = await response.json();
                            errorMessage = errorData.message || `오류 (${response.status}): ${response.statusText}`;
                        } catch (e) {
                            errorMessage = `서버 응답 오류 (${response.status}): ${response.statusText}`;
                        }
                        alert(errorMessage);
                    }
                } catch (error) {
                    console.error('회원탈퇴 API 호출 중 네트워크 오류:', error);
                    alert('회원탈퇴 요청 중 네트워크 오류가 발생했습니다. 서버가 실행중인지 확인해주세요.');
                }
            }
        });
    }
} // initializeAuth 함수 끝


/**
 * 이 스크립트가 <script> 태그로 HTML에 직접 포함되는 구형 방식을 지원하기 위한 코드입니다.
 * 만약 페이지 로딩 시점에 이 스크립트가 이미 있다면, DOMContentLoaded 이벤트를 기다려
 * initializeAuth 함수를 실행합니다.
 * load-header.js를 사용하는 새로운 방식에서는 이 코드가 직접 실행되기보다는,
 * load-header.js가 스크립트 로드 후 initializeAuth()를 명시적으로 호출합니다.
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAuth);
}