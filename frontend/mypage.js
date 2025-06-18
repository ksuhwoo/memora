// frontend/mypage.js

function initializeMyPage() {
    // --- 필수 HTML 요소 가져오기 ---
    const profileImagePreview = document.getElementById('profileImagePreview');
    const profileImageInput = document.getElementById('profileImageInput');
    const changeImageButton = document.getElementById('changeImageButton');
    const deleteImageButton = document.getElementById('deleteImageButton');
    const profileForm = document.getElementById('profileForm');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const nameInput = document.getElementById('name');
    const bioTextarea = document.getElementById('bio');
    
    // 헤더의 요소들은 이 함수가 호출될 시점에는 이미 존재함이 보장됩니다.
    const userProfileImageInHeader = document.getElementById('userProfileImage');
    const defaultProfileIconInHeader = document.getElementById('defaultProfileIcon');

    // 크롭 모달 관련 요소
    const cropModal = document.getElementById('cropModal');
    const imageToCrop = document.getElementById('imageToCrop');
    const saveCropButton = document.getElementById('saveCropButton');
    const cancelCropButton = document.getElementById('cancelCropButton');
    let cropper = null; // Cropper.js 인스턴스를 저장할 변수

    // --- 인증 토큰 확인 ---
    const token = localStorage.getItem('authToken');
    if (!token) {
        alert('로그인이 필요합니다.');
        window.location.href = '/login';
        return;
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
            if (user.profile_image_url) {
                profileImagePreview.src = user.profile_image_url;
            } else {
                profileImagePreview.src = 'default-profile.png';
            }
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
    saveCropButton.addEventListener('click', async () => {
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
                
                if (result.imageUrl) {
                    const newImageUrl = result.imageUrl + `?t=${new Date().getTime()}`;
                    profileImagePreview.src = newImageUrl;
                    
                    const userData = JSON.parse(localStorage.getItem('userData'));
                    if (userData) {
                        userData.profile_image_url = result.imageUrl;
                        localStorage.setItem('userData', JSON.stringify(userData));
                        
                        if (userProfileImageInHeader && defaultProfileIconInHeader) {
                            userProfileImageInHeader.src = newImageUrl;
                            userProfileImageInHeader.style.display = 'block';
                            defaultProfileIconInHeader.style.display = 'none';
                        }
                    }
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
        if (!confirm("정말로 프로필 사진을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
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
            
            profileImagePreview.src = 'default-profile.png';
            
            const userData = JSON.parse(localStorage.getItem('userData'));
            if (userData) {
                userData.profile_image_url = null;
                localStorage.setItem('userData', JSON.stringify(userData));
                
                if (userProfileImageInHeader && defaultProfileIconInHeader) {
                    userProfileImageInHeader.src = "";
                    userProfileImageInHeader.style.display = 'none';
                    defaultProfileIconInHeader.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('이미지 삭제 오류:', error);
            alert(error.message || '이미지 삭제 중 오류가 발생했습니다.');
        }
    });

    // --- 페이지 초기화 ---
    loadUserProfile();
}