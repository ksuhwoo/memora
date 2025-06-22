module.exports = {
  apps : [{
    name   : "memora", // ‼️ 여기에 원하는 앱 이름을 적으세요. 이것이 PM2의 이름이 됩니다.
    script : "./back.js" // ‼️ 실제 실행할 파일 경로를 적으세요. (예: ./back.js)
  }]
}
