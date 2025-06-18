// frontend/load-header.js
document.addEventListener("DOMContentLoaded", function() {
    const headerPlaceholder = document.getElementById("header-placeholder");

    if (headerPlaceholder) {
        fetch('./header.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Header를 불러오는데 실패했습니다.');
                }
                return response.text();
            })
            .then(data => {
                headerPlaceholder.innerHTML = data;

                const script = document.createElement('script');
                script.src = './auth.js';

                // 스크립트 로드가 완료되면 실행할 로직
                script.onload = function() {
                    // 1. 공통 인증 초기화 함수를 항상 실행
                    if (typeof initializeAuth === 'function') {
                        initializeAuth();
                    }

                    // 2. 페이지별 초기화 함수가 있다면 실행 (mypage.js 처럼 헤더와 상호작용이 필요한 경우)
                    if (typeof initializeMyPage === 'function') {
                        initializeMyPage();
                    }
                    
                    // initializeAdminDashboard 호출 코드는 여기서 제거되었습니다.
                };

                document.body.appendChild(script);
            })
            .catch(error => {
                console.error(error);
                headerPlaceholder.innerHTML = "<p>헤더를 로드하는 중 오류가 발생했습니다.</p>";
            });
    }
});