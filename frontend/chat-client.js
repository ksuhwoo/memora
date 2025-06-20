document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chatContainer');
    const chatHeader = document.getElementById('chatHeader');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const messagesList = document.getElementById('chatMessages');

    const authToken = localStorage.getItem('authToken');
    const userData = JSON.parse(localStorage.getItem('userData'));

    if (!authToken || !userData) {
        if(chatContainer) chatContainer.style.display = 'none';
        return;
    }

    const socket = io({ query: { token: authToken } });

    chatHeader.addEventListener('click', () => {
        chatContainer.classList.toggle('chat-closed');
    });

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (chatInput.value) {
            socket.emit('chat message', chatInput.value);
            chatInput.value = '';
        }
    });

    socket.on('chat history', (history) => {
        history.forEach(data => {
            addMessage(data, data.user.userId === userData.userId);
        });
        scrollToBottom();
    });

    socket.on('chat message', (data) => {
        addMessage(data, data.user.userId === userData.userId);
        scrollToBottom();
    });

    // --- 메시지를 그리는 함수 (핵심 수정 부분) ---
    function addMessage(data, isMine) {
        const item = document.createElement('li');
        item.classList.add('chat-message');

        // ▼▼▼ 여기에 아바타 생성 로직을 추가합니다 ▼▼▼
        let avatarHtml = '';
        // 1. 프로필 이미지가 있는 경우
        if (data.user.profile_image_url) {
            avatarHtml = `<img src="${data.user.profile_image_url}" class="chat-avatar image">`;
        }
        // 2. 이미지는 없지만 사용자 이름이 있는 경우 (이니셜 아바타)
        else if (data.user.username) {
            const firstLetter = data.user.username.charAt(0).toUpperCase();
            const bgColor = generateColorFromUsername(data.user.username);
            avatarHtml = `<div class="chat-avatar initials" style="background-color: ${bgColor};">${firstLetter}</div>`;
        }
        
        const userColor = generateColorFromUsername(data.user.username);
        
        // ▼▼▼ 생성된 아바타를 메시지 맨 앞에 추가합니다 ▼▼▼
        item.innerHTML = `
            ${avatarHtml}
            <span class="username" style="color: ${userColor};">${data.user.username}</span>:
            <span class="message-text">${data.message}</span>
        `;
        messagesList.appendChild(item);
    }

    function addSystemMessage(msg) {
        const item = document.createElement('li');
        item.classList.add('system-message');
        item.textContent = msg;
        messagesList.appendChild(item);
    }
    
    function scrollToBottom() {
        messagesList.scrollTop = messagesList.scrollHeight;
    }
});