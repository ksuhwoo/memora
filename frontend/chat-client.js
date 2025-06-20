document.addEventListener('DOMContentLoaded', () => {
    // 1. 필요한 모든 DOM 요소를 가져옵니다.
    const chatContainer = document.getElementById('chatContainer');
    const chatHeader = document.getElementById('chatHeader');
    const messagesList = document.getElementById('chatMessages');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const userProfileModal = document.getElementById('userProfileModal');
    const customContextMenu = document.getElementById('customContextMenu');

    // 2. 인증 정보 및 사용자 데이터를 가져옵니다.
    const authToken = localStorage.getItem('authToken');
    const userData = JSON.parse(localStorage.getItem('userData'));

    // 3. 비로그인 상태면 채팅 기능을 비활성화합니다.
    if (!authToken || !userData) {
        if (chatContainer) chatContainer.style.display = 'none';
        return;
    }

    // 4. Socket.IO 서버에 연결합니다.
    const socket = io({
        query: { token: authToken }
    });

    // 5. UI 이벤트 리스너를 등록합니다.
    chatHeader.addEventListener('click', () => chatContainer.classList.toggle('chat-closed'));

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (chatInput.value.trim()) {
            // [변경] 메시지와 함께 클라이언트에서 생성한 고유 ID를 보냅니다.
            const messageData = {
                message: chatInput.value.trim(),
                clientId: crypto.randomUUID() // 예: "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed"
            };
            socket.emit('chat message', messageData);
            chatInput.value = '';
        }
    });

    messagesList.addEventListener('click', (event) => {
        const target = event.target.closest('.chat-clickable-user');
        if (target) {
            const username = target.dataset.username;
            if (username) {
                showUserProfile(username, event);
            }
        }
    });

    // 관리자 전용 우클릭 이벤트
    messagesList.addEventListener('contextmenu', (event) => {
        if (userData.role !== 'admin') return; // 관리자가 아니면 무시

        const messageElement = event.target.closest('.chat-message');
        if (messageElement && !messageElement.classList.contains('deleted')) {
            event.preventDefault();
            
            const messageId = messageElement.id.split('-')[1];
            customContextMenu.dataset.messageId = messageId;
            
            customContextMenu.style.left = `${event.pageX}px`;
            customContextMenu.style.top = `${event.pageY}px`;
            customContextMenu.classList.add('visible');
        }
    });

    // 우클릭 메뉴의 '채팅 삭제' 버튼 클릭 이벤트
    document.getElementById('deleteChatMessage').addEventListener('click', async () => {
        const messageId = customContextMenu.dataset.messageId;
        if (!messageId) return;

        try {
            const response = await fetch(`/api/admin/chat/${messageId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || '삭제에 실패했습니다.');
            }
        } catch (error) {
            console.error('채팅 삭제 요청 실패:', error);
            alert(`오류: ${error.message}`);
        }
        customContextMenu.classList.remove('visible');
    });

    // 팝업/메뉴 바깥 영역 클릭 시 모두 닫기
    document.addEventListener('click', (event) => {
        if (userProfileModal.classList.contains('visible') && !userProfileModal.contains(event.target) && !event.target.closest('.chat-clickable-user')) {
            userProfileModal.classList.remove('visible');
        }
        if (customContextMenu.classList.contains('visible') && !customContextMenu.contains(event.target)) {
            customContextMenu.classList.remove('visible');
        }
    });

    // 6. Socket.IO 이벤트 리스너를 등록합니다.
    socket.on('chat history', (history) => {
        messagesList.innerHTML = '';
        history.forEach(data => addMessage(data, data.user.userId === userData.userId));
        scrollToBottom();
    });

    socket.on('chat message', (data) => {
        addMessage(data, data.user.userId === userData.userId);
        scrollToBottom();
    });

    socket.on('chat cleared', (msg) => {
        messagesList.innerHTML = '';
        addSystemMessage(msg);
    });

    socket.on('chat message deleted', (data) => {
        const messageElement = document.getElementById(`message-${data.messageId}`);
        if (messageElement) {
            markMessageAsDeleted(messageElement);
        }
    });

    // 7. 화면에 메시지를 그리거나 UI를 제어하는 함수들
    function addMessage(data, isMine) {
        const item = document.createElement('li');
        item.id = `message-${data.id}`;
        item.classList.add('chat-message');

        const messageBody = document.createElement('div');
        messageBody.classList.add('message-body');

        if (data.is_deleted) {
            item.classList.add('deleted');
            messageBody.textContent = '관리자에 의해 삭제된 메시지입니다.';
        } else {
            let avatarHtml = '';
            // 아바타 요소 자체에 clickable 클래스와 data 속성을 직접 부여합니다.
            if (data.user.profile_image_url) {
                avatarHtml = `<img src="${data.user.profile_image_url}" class="chat-avatar image chat-clickable-user" data-username="${data.user.username}">`;
            } else if (data.user.username) {
                const firstLetter = data.user.username.charAt(0).toUpperCase();
                const bgColor = generateColorFromUsername(data.user.username);
                avatarHtml = `<div class="chat-avatar initials chat-clickable-user" data-username="${data.user.username}" style="background-color: ${bgColor};">${firstLetter}</div>`;
            }
            
            const userColor = generateColorFromUsername(data.user.username);
            
            // 불필요한 div 래퍼를 제거하고, 생성된 아바타 HTML을 바로 사용합니다.
            messageBody.innerHTML = `
                ${avatarHtml}
                <span class="username chat-clickable-user" style="color: ${userColor};" data-username="${data.user.username}">${data.user.username}</span>:
                <span class="message-text">${data.message}</span>
            `;
        }
        item.appendChild(messageBody);
        messagesList.appendChild(item);
    }

    function addSystemMessage(msg) {
        const item = document.createElement('li');
        item.classList.add('system-message');
        item.textContent = msg;
        messagesList.appendChild(item);
    }

    function markMessageAsDeleted(element) {
        element.classList.add('deleted');
        const body = element.querySelector('.message-body');
        if (body) {
            body.innerHTML = '관리자에 의해 삭제된 메시지입니다.';
        }
    }

    function scrollToBottom() {
        messagesList.scrollTop = messagesList.scrollHeight;
    }

    async function showUserProfile(username, event) {
        try {
            const response = await fetch(`/api/users/${username}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (!response.ok) throw new Error('프로필을 불러올 수 없습니다.');

            const profile = await response.json();

            const modalAvatar = document.getElementById('modalAvatar');
            modalAvatar.innerHTML = '';
            modalAvatar.style.backgroundColor = '';

            if (profile.profile_image_url) {
                modalAvatar.innerHTML = `<img src="${profile.profile_image_url}" alt="${profile.username}">`;
            } else {
                const firstLetter = profile.username.charAt(0).toUpperCase();
                const bgColor = generateColorFromUsername(profile.username);
                modalAvatar.style.backgroundColor = bgColor;
                modalAvatar.innerHTML = `<span class="initials-text">${firstLetter}</span>`;
            }
            
            document.getElementById('modalUsername').textContent = profile.username;
            document.getElementById('modalBio').textContent = profile.bio || '자기소개가 없습니다.';

            userProfileModal.style.left = (event.pageX + 15) + 'px';
            userProfileModal.style.top = (event.pageY + 15) + 'px';
            userProfileModal.classList.add('visible');

        } catch (error) {
            console.error('프로필 로딩 실패:', error);
        }
    }
});