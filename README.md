# Gemini 작도 실험실

**Google AI Studio에서 이어서 실행할 수정본입니다.** [AI_STUDIO.md](AI_STUDIO.md)의 가져오기 순서와 요청문을 사용하세요.

- 학생 자연어 → 실제 Gemini API → 구조화 명령 → 수학 검증 → 좌표 기반 SVG 작도
- 그리기 툴바 제거, 학생 설명과 AI 해석의 비교, 단계별 실행, 수정 기록과 근거 저장
- SSS·SAS·ASA, 삼각형 존재 조건, SSA의 서로 합동이 아닌 두 삼각형
- API 키는 서버에서만 관리하며 Google Sites에는 배포 URL을 삽입합니다.

추가 설치 없이 Node 22 이상에서 `npm start`, 검사는 `npm test`로 실행합니다. 로컬 키 설정과 수업·배포 안내는 [사용안내.md](사용안내.md)에 있습니다.

AI Studio 계정 내 앱 생성·실제 Google 호출·배포는 아직 완료하지 않았습니다. 자동 검사는 모의 응답으로 수행합니다.
