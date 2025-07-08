# Dockerfile

# 1. 어떤 환경에서 시작할지 지정 (Node.js 18 버전의 가벼운 리눅스)
FROM node:18-alpine

# 2. 앱 코드가 저장될 컨테이너 안의 작업 폴더를 만듭니다.
WORKDIR /usr/src/app

# 3. 먼저 package.json 파일들만 복사하여 의존성을 설치합니다.
#    (나중에 코드만 바뀔 때, 매번 모든 패키지를 다시 설치하는 비효율을 막기 위함)
COPY package*.json ./
RUN npm install --production

# 4. 나머지 모든 앱 코드를 복사합니다.
COPY . .

# 5. 이 컨테이너가 실행될 때 최종적으로 실행할 명령어를 지정합니다.
CMD [ "node", "back.js" ] # ./back.js 가 실행 파일일 경우