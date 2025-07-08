# Dockerfile

# 1. 알파인 리눅스 기반의 Node.js 18 이미지를 사용합니다.
FROM node:18-alpine

# 2. ‼️ 여기가 핵심 1: 'dos2unix' 라는 유령 퇴치 도구를 컨테이너 안에 설치합니다.
#    apk는 알파인 리눅스의 패키지 매니저입니다. (Ubuntu의 apt와 같음)
RUN apk add --no-cache dos2unix

# 3. 작업 폴더를 지정합니다.
WORKDIR /usr/src/app

# 4. package.json 파일들을 먼저 복사하고, 의존성을 설치합니다.
COPY package*.json ./
RUN npm install --production

# 5. 나머지 모든 소스 코드를 복사합니다.
COPY . .

# 6. ‼️ 여기가 핵심 2: back.js 파일에 대해 '유령 퇴치 의식(변환)'을 거행합니다.
#    이제 이 파일 안의 모든 윈도우 줄바꿈 문자는 완벽하게 제거됩니다.
RUN dos2unix ./back.js

# 7. 실행 명령어를 지정합니다.
ENTRYPOINT [ "node", "./back.js" ]