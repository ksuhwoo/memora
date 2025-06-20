/**
 * 사용자 이름(문자열)을 기반으로 고유한 HEX 색상 코드를 생성합니다.
 * @param {string} str - 색상을 생성할 기준 문자열
 * @returns {string} - HEX 색상 코드 (예: '#aabbcc')
 */
function generateColorFromUsername(str) {
    if (!str) return '#CCCCCC'; // 이름이 없으면 기본 회색 반환
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        // 너무 밝거나 어두운 색상을 피하기 위해 색상 범위를 80-200 사이로 조정
        const adjustedValue = 80 + (value % 120);
        color += ('00' + adjustedValue.toString(16)).substr(-2);
    }
    return color;
}

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
    const clearChatHistoryLink = document.getElementById('clearChatHistoryLink'); // [추가]

    // 프로필 상태를 표시할 3가지 요소를 모두 가져옵니다.
    const defaultProfileIcon = document.getElementById('defaultProfileIcon');
    const userProfileImage = document.getElementById('userProfileImage');
    const userInitialsAvatar = document.getElementById('userInitialsAvatar');
    
    // 2. localStorage에서 인증 토큰과 사용자 데이터를 가져옵니다.
    const authToken = localStorage.getItem('authToken');
    const userDataString = localStorage.getItem('userData');
    let currentUser = null;

    if (userDataString) {
        try {
            currentUser = JSON.parse(userDataString);
        } catch (e) {
            console.error("사용자 데이터 파싱 오류:", e);
            localStorage.removeItem('userData');
            localStorage.removeItem('authToken');
        }
    }

    /**
     * 프로필 UI를 업데이트하는 함수
     * @param {object | null} user - 사용자 객체
     */
    function updateProfileUI(user) {
        if (!defaultProfileIcon || !userProfileImage || !userInitialsAvatar) return;

        // 모든 프로필 관련 요소를 일단 숨깁니다.
        defaultProfileIcon.style.display = 'none';
        userProfileImage.style.display = 'none';
        userInitialsAvatar.style.display = 'none';

        if (user && user.profile_image_url) {
            // 프로필 이미지가 있는 경우
            userProfileImage.src = user.profile_image_url;
            userProfileImage.style.display = 'block';

            // 이미지 로딩 실패 시 첫 글자 아바타를 보여줍니다.
            userProfileImage.onerror = () => {
                userProfileImage.style.display = 'none';
                showInitialsAvatar(user.username);
            };
        } else if (user && user.username) {
            // 프로필 이미지는 없지만, 사용자 이름이 있는 경우
            showInitialsAvatar(user.username);
        } else {
            // 아무 정보도 없는 경우 (비로그인 등)
            defaultProfileIcon.style.display = 'block';
        }
    }

    /**
     * 첫 글자 아바타를 표시하는 함수
     * @param {string} username - 사용자 이름
     */
    function showInitialsAvatar(username) {
        if (!username || !userInitialsAvatar) return;
        
        const firstLetter = username.charAt(0).toUpperCase();
        userInitialsAvatar.textContent = firstLetter;
        userInitialsAvatar.style.backgroundColor = generateColorFromUsername(username);
        userInitialsAvatar.style.display = 'flex';
    }

    // 3. 로그인 상태 여부에 따라 UI를 업데이트합니다.
    if (authToken && currentUser) {
        // --- 로그인 상태일 때의 로직 ---
        if (loginButton) loginButton.style.display = 'none';
        if (profileContainer) profileContainer.style.display = 'inline-block';

        if (dropdownUserNickname) {
            dropdownUserNickname.textContent = `${currentUser.username}님`;
        }

        // 프로필 UI 업데이트 로직 호출
        updateProfileUI(currentUser);

        // [변경] 사용자의 역할(role)이 'admin'이면 모든 관리자 메뉴를 표시합니다.
        if (currentUser.role === 'admin') {
            if (adminDashboardLink) adminDashboardLink.style.display = 'block';
            if (clearChatHistoryLink) clearChatHistoryLink.style.display = 'block';
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
            event.stopPropagation();
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
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            localStorage.removeItem('rememberedUsername');
            alert('로그아웃 되었습니다.');
            window.location.href = '/login';
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
                    const response = await fetch('/api/user/withdraw', {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${storedAuthToken}`,
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        alert(data.message || '회원탈퇴가 성공적으로 완료되었습니다.');
                        localStorage.removeItem('authToken');
                        localStorage.removeItem('userData');
                        localStorage.removeItem('rememberedUsername');
                        window.location.href = '/';
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
                    alert('회원탈퇴 요청 중 네트워크 오류가 발생했습니다.');
                }
            }
        });
    }

    // [추가] 채팅 기록 지우기 버튼 이벤트 리스너
    if (clearChatHistoryLink) {
        clearChatHistoryLink.addEventListener('click', async (event) => {
            event.preventDefault();
            
            if (confirm("정말로 모든 채팅 기록을 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
                const storedAuthToken = localStorage.getItem('authToken');
                try {
                    const response = await fetch('/api/admin/chat/history', {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${storedAuthToken}`
                        }
                    });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.message || '삭제에 실패했습니다.');

                    alert(result.message); // "모든 채팅 기록이 성공적으로 삭제되었습니다."
                    profileDropdown.style.display = 'none'; // 메뉴 닫기

                } catch (error) {
                    console.error('채팅 기록 삭제 오류:', error);
                    alert(`오류: ${error.message}`);
                }
            }
        });
    }
}