# Dockerfile (개선된 버전)

# 1. 어떤 환경에서 시작할지 지정
FROM node:18-alpine

# 2. 작업 폴더 지정
WORKDIR /usr/src/app

# 3. package.json 파일들만 먼저 복사하여 의존성 설치
COPY package*.json ./
RUN npm install --production

# 4. 나머지 모든 앱 코드를 복사
COPY . .

# 5. ‼️ 여기가 핵심 1: back.js 파일에 실행 권한 부여
#    셸이 이 파일을 '실행 가능한 파일'로 명확히 인지하게 만듭니다.
RUN chmod +x ./back.js

# 6. ‼️ 여기가 핵심 2: 컨테이너 실행 명령어
#    셸을 거치지 않는 Exec 형식으로, node 프로그램을 직접 실행하도록 명시합니다.
ENTRYPOINT [ "node", "./back.js" ]