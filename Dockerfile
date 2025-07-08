# Dockerfile (버전 문제 최종 해결 버전)

FROM node:18-alpine
RUN npm install pm2 -g
WORKDIR /usr/src/app

# ‼️ 여기가 핵심 1: package.json과 함께 'package-lock.json'도 복사합니다!
COPY package*.json ./

# ‼️ 여기가 핵심 2: 'npm install' 대신 'npm ci'를 사용합니다.
# 'ci'는 'Continuous Integration'의 약자로, package-lock.json을 기반으로
# 패키지를 훨씬 더 빠르고 정확하게, 그리고 100% 동일하게 설치합니다.
RUN npm ci

# 나머지 모든 소스 코드를 복사합니다.
COPY . .

CMD [ "pm2-runtime", "start", "ecosystem.config.js" ]