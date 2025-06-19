// frontend/mypage.js

/**
 * 사용자 이름(문자열)을 기반으로 고유한 HEX 색상 코드를 생성합니다.
 * (auth.js와 동일한 함수를 사용하여 일관성을 유지합니다)
 * @param {string} str - 색상을 생성할 기준 문자열
 * @returns {string} - HEX 색상 코드 (예: '#aabbcc')
 */
function generateColorFromUsername(str) {
    if (!str) return '#CCCCCC';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        const adjustedValue = 80 + (value % 120);
        color += ('00' + adjustedValue.toString(16)).substr(-2);
    }
    return color;
}

function initializeMyPage() {
    // --- 필수 HTML 요소 가져오기 ---
    const profileImagePreview = document.getElementById('profileImagePreview');
    const initialsPreview = document.getElementById('initialsPreview');
    const profileImageInput = document.getElementById('profileImageInput');
    const changeImageButton = document.getElementById('changeImageButton');
    const deleteImageButton = document.getElementById('deleteImageButton');
    const profileForm = document.getElementById('profileForm');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const nameInput = document.getElementById('name');
    const bioTextarea = document.getElementById('bio');
    
    // 헤더의 프로필 요소들 (즉시 업데이트를 위함)
    const userProfileImageInHeader = document.getElementById('userProfileImage');
    const defaultProfileIconInHeader = document.getElementById('defaultProfileIcon');
    const userInitialsAvatarInHeader = document.getElementById('userInitialsAvatar');

    // 크롭 모달 관련 요소
    const cropModal = document.getElementById('cropModal');
    const imageToCrop = document.getElementById('imageToCrop');
    const saveCropButton = document.getElementById('saveCropButton');
    const cancelCropButton = document.getElementById('cancelCropButton');
    let cropper = null;

    // --- 인증 토큰 확인 ---
    const token = localStorage.getItem('authToken');
    if (!token) {
        alert('로그인이 필요합니다.');
        window.location.href = '/login';
        return;
    }

    /**
     * 마이페이지의 프로필 미리보기를 업데이트하는 함수
     * @param {string | null} imageUrl - 이미지 URL
     * @param {string} username - 사용자 이름
     */
    function updateMyPagePreview(imageUrl, username) {
        if (!profileImagePreview || !initialsPreview) return;
        
        profileImagePreview.style.display = 'none';
        initialsPreview.style.display = 'none';

        if (imageUrl) {
            profileImagePreview.src = imageUrl;
            profileImagePreview.style.display = 'block';

            profileImagePreview.onerror = () => {
                profileImagePreview.style.display = 'none';
                showMyPageInitials(username);
            };
        } else {
            showMyPageInitials(username);
        }
    }

    /**
     * 마이페이지에서 첫 글자 아바타를 표시하는 함수
     * @param {string} username - 사용자 이름
     */
    function showMyPageInitials(username) {
        if (!username || !initialsPreview) return;
        initialsPreview.textContent = username.charAt(0);
        initialsPreview.style.backgroundColor = generateColorFromUsername(username);
        initialsPreview.style.display = 'flex';
    }

    /**
     * 헤더의 프로필 UI를 즉시 업데이트하는 도우미 함수
     * @param {object | null} user - 사용자 객체
     */
    function updateHeaderProfileImmediately(user) {
        if (!userProfileImageInHeader || !userInitialsAvatarInHeader) return;

        if (defaultProfileIconInHeader) defaultProfileIconInHeader.style.display = 'none';
        userProfileImageInHeader.style.display = 'none';
        userInitialsAvatarInHeader.style.display = 'none';

        if (user && user.profile_image_url) {
            userProfileImageInHeader.src = user.profile_image_url + `?t=${new Date().getTime()}`; // 캐시 방지
            userProfileImageInHeader.style.display = 'block';
            userProfileImageInHeader.onerror = () => {
                userProfileImageInHeader.style.display = 'none';
                showHeaderInitialsImmediately(user.username);
            };
        } else if (user && user.username) {
            showHeaderInitialsImmediately(user.username);
        } else {
            if (defaultProfileIconInHeader) defaultProfileIconInHeader.style.display = 'block';
        }
    }
    
    function showHeaderInitialsImmediately(username) {
        if (!username || !userInitialsAvatarInHeader) return;
        userInitialsAvatarInHeader.textContent = username.charAt(0);
        userInitialsAvatarInHeader.style.backgroundColor = generateColorFromUsername(username);
        userInitialsAvatarInHeader.style.display = 'flex';
    }


    // --- 페이지 로드 시 사용자 프로필 정보 가져오기 ---
    const loadUserProfile = async () => {
        try {
            const response = await fetch('/api/user/profile', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                 if (response.status === 403) {
                     alert('세션이 만료되었습니다. 다시 로그인해주세요.');
                     localStorage.clear();
                     window.location.href = '/login';
                }
                throw new Error('프로필 정보를 불러오는데 실패했습니다.');
            }
            
            const user = await response.json();
            usernameInput.value = user.username;
            emailInput.value = user.email;
            nameInput.value = user.name;
            bioTextarea.value = user.bio || '';
            
            updateMyPagePreview(user.profile_image_url, user.username);
        } catch (error) {
            if (error.message.includes('로그인')) return;
            console.error('프로필 로드 오류:', error);
            alert(error.message);
        }
    };

    // --- 프로필 정보(이름, 자기소개) 저장 이벤트 리스너 ---
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const updatedProfile = { name: nameInput.value, bio: bioTextarea.value };
        try {
            const response = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedProfile)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            alert(result.message);
            const userData = JSON.parse(localStorage.getItem('userData'));
            if (userData) {
                userData.name = nameInput.value;
                userData.bio = bioTextarea.value;
                localStorage.setItem('userData', JSON.stringify(userData));
            }
        } catch (error) {
            console.error('프로필 업데이트 오류:', error);
            alert(error.message || '프로필 업데이트 중 오류가 발생했습니다.');
        }
    });

    // --- 프로필 이미지 변경 버튼 클릭 ---
    changeImageButton.addEventListener('click', () => {
        profileImageInput.click();
    });

    // --- 파일 선택 시 Cropper 모달 초기화 ---
    profileImageInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const reader = new FileReader();
            reader.onload = (event) => {
                imageToCrop.src = event.target.result;
                cropModal.style.display = 'flex';
                if(cropper) cropper.destroy();
                cropper = new Cropper(imageToCrop, {
                    aspectRatio: 1 / 1,
                    viewMode: 1,
                    background: false,
                    autoCropArea: 0.8
                });
            };
            reader.readAsDataURL(files[0]);
        }
        e.target.value = '';
    });
    
    // --- 크롭 모달 '취소' 버튼 ---
    cancelCropButton.addEventListener('click', () => {
        cropModal.style.display = 'none';
        if(cropper) {
            cropper.destroy();
            cropper = null;
        }
    });

    // --- 크롭 모달 '저장' 버튼 (크롭 및 업로드) ---
    saveCropButton.addEventListener('click', () => {
        if (!cropper) return;
        
        const canvas = cropper.getCroppedCanvas({
            width: 320,
            height: 320,
            imageSmoothingQuality: 'high',
        });

        canvas.toBlob(async (blob) => {
            if (!blob) {
                console.error('Canvas to Blob 변환 실패');
                return;
            }
            const formData = new FormData();
            formData.append('profileImage', blob, 'profile.png');
            try {
                const response = await fetch('/api/user/profile/image', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                
                alert(result.message);
                
                const newImageUrl = result.imageUrl;
                updateMyPagePreview(newImageUrl, usernameInput.value);
                
                const userData = JSON.parse(localStorage.getItem('userData'));
                if (userData) {
                    userData.profile_image_url = newImageUrl;
                    localStorage.setItem('userData', JSON.stringify(userData));
                    updateHeaderProfileImmediately(userData);
                }
                
                cancelCropButton.click();
            } catch (error) {
                console.error('이미지 업로드 오류:', error);
                alert(error.message || '이미지 업로드 중 오류가 발생했습니다.');
            }
        }, 'image/png');
    });

    // --- 프로필 이미지 삭제 로직 ---
    deleteImageButton.addEventListener('click', async () => {
        if (!confirm("정말로 프로필 사진을 삭제하시겠습니까?")) {
            return;
        }
        try {
            const response = await fetch('/api/user/profile/image', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            alert(result.message);
            
            updateMyPagePreview(null, usernameInput.value);
            
            const userData = JSON.parse(localStorage.getItem('userData'));
            if (userData) {
                userData.profile_image_url = null;
                localStorage.setItem('userData', JSON.stringify(userData));
                updateHeaderProfileImmediately(userData);
            }
        } catch (error) {
            console.error('이미지 삭제 오류:', error);
            alert(error.message || '이미지 삭제 중 오류가 발생했습니다.');
        }
    });

    // --- 페이지 초기화 ---
    loadUserProfile();
}