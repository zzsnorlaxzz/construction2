# Google AI Studio에서 시작하기

이 수정본은 실제 Gemini 자연어 해석 서버, 수학 검증 엔진, 학생 화면을 포함합니다. API 키를 직접 HTML에 입력하는 방식이 아닙니다. **아직 AI Studio 계정에 앱을 생성하거나 배포하지 않았습니다.**

## 가져오기

1. [AI Studio Build](https://aistudio.google.com/apps)를 엽니다.
2. 프롬프트 입력 칸의 **+ → Import from GitHub**로 `zzsnorlaxzz/construction2`를 가져옵니다.
3. 수정 코드가 있는 브랜치 `codex/gemini-construction-lab`을 선택할 수 있으면 선택합니다. 기본 브랜치만 가져올 수 있는 경우 GitHub의 수정 요청을 먼저 병합하고 가져옵니다. 원래 HTML만 가져왔다면 이 문서에 나오는 `engine.mjs` 등의 수정 파일이 있는지 확인하세요.
4. 아래 요청문을 AI Studio에 붙여넣고 실행합니다. 기존 파일을 이용해 AI Studio 실행 환경에 맞게 연결하도록 하는 요청입니다.

## AI Studio에 넣을 요청문

```text
가져온 저장소의 작도 실험실을 Google AI Studio의 풀스택 앱으로 실행해 줘.

기존 index.html, style.css, app.mjs의 한국어 화면과 engine.mjs의 수학 검증 기능, gemini.mjs의 자연어 번역 지침을 보존해 줘. 정해진 예제 그림을 재생하거나 정규식으로 문장을 알아듣는 방식으로 바꾸면 안 돼. React로 감싸는 것은 가능하지만 검증 엔진을 다시 만들어 정확성을 잃지 마.

1. 이 환경의 Node 서버 실행 방식, 포트와 프리뷰 프록시에 맞춰 package.json과 server.mjs를 연결해 줘. 화면과 /api/status, /api/interpret가 같은 출처에서 동작해야 해.
2. Gemini API를 실제 사용하도록 AI Studio의 서버용 GEMINI_API_KEY 자동 설정을 활성화해 줘. 키를 브라우저 코드나 .env 파일에 써서 저장하지 마. Secrets에서만 관리해 줘. 사용 가능한 구조화 응답 지원 Gemini Flash 모델을 선택하고 GEMINI_MODEL로 관리해 줘.
3. 요청은 gemini.mjs에서만 하고, engine.mjs의 PLAN_SCHEMA와 validatePlan을 사용해 줘. 현재 구현은 공식 Interactions REST API의 system_instruction, input, response_format, store:false와 steps[].content[] 텍스트 응답 형식을 사용해. 다른 공식 API/SDK를 사용할 경우 스키마·실제 응답 추출을 함께 맞추고 테스트도 고쳐 줘.
4. AI는 학생이 명시한 작도 동작만 번역해야 해. 중심·반지름·순서가 틀려도 정답으로 바꾸지 마. 생략한 측정·각 옮기기를 보충하지 마. 불명확하면 확인 질문을 해. 각 명령에는 학생 원문을 정확히 인용한 source가 있어야 해.
5. 해석 명령을 먼저 보여 주고 학생이 확인 후 실행하도록 유지해 줘. 실행과 수학 검증은 engine.mjs가 담당해야 해.
6. 수업 접속 코드 CLASSROOM_CODE를 서버용 Secret으로 설정하는 흐름을 마련해 줘. 공개 배포 전에 교사가 정하고 학생에게 별도로 알려 주도록 해. API 키와 수업 코드는 별개야.
7. AI Studio 프리뷰의 Origin과 frame ancestor를 확인해 필요한 도메인만 허용해 줘. Google Sites에 배포 주소를 삽입할 수 있는 설정도 유지해 줘. 모든 도메인을 무조건 허용하지 마.
8. npm test를 실행해 줘. 실제 Gemini를 호출하여 아래 두 표현이 같은 의미로 해석되는지도 검증하고, 실제 호출 여부와 모델을 알려 줘.
   - 직선 l을 긋는다. 그 위에 점 P를 잡는다. 컴퍼스로 AB 길이를 잰다. P 중심 반지름 AB인 원 k를 그리고 l과의 오른쪽 교점을 Q로 정한다. P와 Q를 잇는다.
   - 선 l 하나 그어 줘. 거기에 P를 찍고 컴퍼스로 AB만큼 벌려 줘. P에 침을 놓고 그 폭으로 원 k를 그려. 선과 원이 만나는 오른쪽 점을 Q라고 하고 P에서 Q까지 이어 줘.
9. 반지름을 1cm로 바꾸면 실제 그림과 판정이 달라져야 해. 교점이 둘인데 선택을 안 하면 질문해야 해. M,N을 만들기 전에 MN을 재면 멈춰야 해. API가 실패하면 가짜 성공 결과를 표시하지 마.
10. 학생의 최초 설명·수정 기록·AI 해석·최종 근거 저장과 내려받기를 유지해 줘. 그리기 툴바와 정답 자동 실행은 추가하지 마.

완료 후 프리뷰에서 실제로 작동하는지 확인해 주고, 학생용 배포는 내가 Deploy를 누르기 전까지 실행하지 마.
```

## 확인하고 배포하기

- 화면에 'Gemini 연결 설정됨'이 표시되는지만으로 성공을 판단하지 말고 실제 문장을 분석하고 작도까지 실행합니다.
- 교사가 설정한 수업 코드로 접속해 첫 번째 선분 과제부터 확인합니다.
- AI Studio의 Deploy에서 Cloud Run 배포 흐름을 진행하면 공개 앱 주소를 받을 수 있습니다. 계정의 프로젝트·결제·권한 설정이 필요할 수 있습니다.
- 그 주소를 Google Sites의 ‘삽입 → URL’에 넣습니다. 코드 파일이나 API 키를 Sites에 직접 붙여넣지 않습니다.
- 학생은 교사의 서버 연결을 사용합니다. 학생마다 API 키를 받을 필요는 없습니다. 모델 사용량은 교사 측 프로젝트에 적용됩니다.

공식 근거: [Build의 GitHub 가져오기·배포](https://ai.google.dev/gemini-api/docs/aistudio-build-mode), [서버용 키 자동 설정](https://ai.google.dev/gemini-api/docs/aistudio-fullstack).
