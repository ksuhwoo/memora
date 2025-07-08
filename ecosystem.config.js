// ecosystem.config.js

module.exports = {
  apps : [
    {
      name   : "front",
      script : "./front.js", // 프론트엔드 실행 파일
      watch  : false,
      // env_production: {
      //    NODE_ENV: "production",
      //    PORT: 3000
      // }
    },
    {
      name   : "back",
      script : "./back.js", // 백엔드 실행 파일
      watch  : false,
      // env_production: {
      //    NODE_ENV: "production",
      //    PORT: 3001
      // }
    }
  ]
};