// quest.js (최종 "대화 속도 조절 및 클릭 종료" 버전)

document.addEventListener('DOMContentLoaded', () => {
    // 세션에서 퀘스트를 이미 봤는지 확인
    if (sessionStorage.getItem('memoraQuestPlayed')) {
        return;
    }

    // --- 전체 화면 UI 동적 생성 ---
    const takeoverScreen = document.createElement('div');
    takeoverScreen.className = 'quest-takeover-screen';
    takeoverScreen.innerHTML = '<div id="dialogueContainer" class="dialogue-container"></div>';
    document.body.prepend(takeoverScreen);

    const dialogueContainer = document.getElementById('dialogueContainer');

    // --- 퀘스트 스크립트 정의 ---
    const script = [
        { speaker: 'NPC', text: 'Here is my plan:' },
        { speaker: 'NPC', text: 'I plan to build a website with a real-time chat and login system.' },
        { speaker: 'Player', text: 'That looks good. Continue!' },
        { speaker: 'NPC', text: 'Would you like to try the [Login] quest?',
          isLastMessage: true // ★★★ 마지막 메시지임을 표시하는 플래그 추가
        }
    ];

    let scriptIndex = 0;

    // 대화를 한 줄씩 "쌓는" 함수
    function showNextLine() {
        if (scriptIndex >= script.length) return;

        const currentLine = script[scriptIndex];

        // 새로운 대화창(말풍선) div 생성
        const dialogueBox = document.createElement('div');
        dialogueBox.className = 'dialogue-box';

        if (currentLine.speaker === 'NPC') {
            dialogueBox.classList.add('npc-box');
            dialogueBox.innerHTML = `
                <img class="character-sprite" src="npc-sprite.png" alt="npc">
                <div class="text-content"><p>${currentLine.text}</p></div>
            `;
        } else { // Player
            dialogueBox.classList.add('player-box');
            dialogueBox.innerHTML = `
                <div class="text-content"><p>${currentLine.text}</p></div>
                <img class="character-sprite" src="player-sprite.png" alt="player">
            `;
        }
        
        dialogueContainer.appendChild(dialogueBox);
        
        setTimeout(() => {
            dialogueBox.classList.add('visible');
        }, 100);

        scriptIndex++;

        // ★★★ 핵심 변경 사항 ★★★
        if (currentLine.isLastMessage) {
            // 마지막 메시지일 경우, 클릭 이벤트를 추가하여 화면을 닫도록 함
            takeoverScreen.addEventListener('click', closeQuestScreen, { once: true });
        } else {
            // 마지막 메시지가 아니면, 설정된 시간 후 다음 대사 표시
            setTimeout(showNextLine, 2500); // <-- 대화 속도를 2.5초로 늘림 (원하는 대로 조절)
        }
    }

    // 퀘스트 화면을 제거하고 원래 페이지를 보여주는 함수
    function closeQuestScreen() {
        takeoverScreen.remove();
        highlightLoginButton();
        sessionStorage.setItem('memoraQuestPlayed', 'true');
    }

    // 원래 페이지의 로그인 버튼을 강조하는 함수 (이전과 동일)
    function highlightLoginButton() {
        setTimeout(() => {
            const loginButton = document.querySelector('#header-placeholder .login-btn');
            if (loginButton) {
                loginButton.classList.add('quest-highlight');
            }
        }, 500);
    }
    
    // 퀘스트 시작
    showNextLine();
});