document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
  
    const user_id = e.target.user_id.value;
    const password = e.target.password.value;
    const confirm_password = e.target.confirm_password.value;
    const name = e.target.name.value;
    const birth = e.target.birth.value;
    const email = document.getElementById('emailLocal').value + '@' + document.getElementById('emailDomain').value;
  
    if (password !== confirm_password) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }
  
    const data = new URLSearchParams({
      user_id,
      password,
      name,
      birth,
      email
    });
  
    const response = await fetch('http://localhost:3000/signup', {
      method: 'POST',
      body: data
    });
  
    const result = await response.text();
    alert(result);
  });

  document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // 폼 기본 동작 막기
  
    const formData = new FormData(e.target);
    const data = new URLSearchParams(formData); // fetch에 넣기 좋은 형태로 변환
  
    try {
      const response = await fetch('/signup', {
        method: 'POST',
        body: data,
      });
  
      const result = await response.text();
      alert(result); // 서버 응답 메시지 표시 (예: 회원가입 성공!)
    } catch (err) {
      console.error('회원가입 요청 실패:', err);
      alert('서버와 통신 중 오류가 발생했습니다.');
    }
  });