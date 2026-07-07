# FlowSyncAI

팀 프로젝트 중 소통 부족으로 인해 불필요한 작업을 하게 되는 문제와, 프로젝트가 끝난 후 과거에 처리했던 이슈에 대한 기억이 흐릿해져 이를 다시 떠올리기 어려운 불편함을 해결하기 위해 시작된 프로젝트입니다.


## What is it for?
- AS-IS

팀 프로젝트를 할 때는 초기에 개발 방향을 정하고 역할을 분담하여 개발을 진행합니다.
이러한 계획에 따라 개인은 다른 팀원의 결과물을 미리 예상하며 자신에게 할당된 작업을 진행하게 됩니다.
그러나 소통 부족이나 세부 사항을 미처 파악하지 못하는 등의 이유로 예상과 전혀 다른 작업 결과물을 전달받게 되면,
사전에 진행했던 작업들이 불필요해지는 낭비가 발생합니다.

또한,

팀 프로젝트가 끝난 이후 발생했던 특정 이슈에 대해 팀원들과 나누었던 대화나 대처했던 내용들을 완전히 체득하고자 다시 상기(리마인드)하려 할 때, 기억이 가물가물하여 어려움을 겪을 때가 많습니다.

- TO-BE

해야 할 일이나 발생한 이슈 등을 하나의 "작업" 단위로 생성하고, 해당 작업에 대한 진행 상황을 상세히 남김으로써
다른 팀원들이 전체적인 진행 상황과 개발 방향을 쉽게 파악할 수 있도록 합니다.
또한, 팀원들이 남긴 기록을 바탕으로 AI를 활용하여 앞으로 내가 진행해야 할 일을 추천받을 수 있도록 지원합니다.

더욱이 작업 단위로 꼼꼼하게 기록된 이슈들을 통해 팀원들과 내가 내렸던 과거의 의사 결정 과정을 보다 효과적이고 명확하게 확인할 수 있습니다.

<br/>



## How to start develop?

### Before you start dev
- Groq에서 API를 발급 받아 환경변수에 추가해주셔야합니다. 자세한 사항은 .env.example을 참고바랍니다.

  Groq: https://groq.com  


<br/>

### Run to dev

[Backend]
1. To run :
    ```bash
    
    docker compose up --build

    ```

[Frontend]
1. 최초 1회만 실행합니다.
  
    ```bash
    
    npm install

    ```

2.  To run:
  
    ```bash
    
    npm run dev
    
    ```

<br/>
  
## Main Contributors 
<div> 
  <div style="display: inline-block; text-align: center; margin-right: 15px;">
    <a href="https://github.com/LyleKim" target="_blank">
      <img src="https://github.com/LyleKim.png" width="40" style="border-radius:50%;" alt="LyleKim" />
    </a>
    <div style="font-size: 12px; margin-top: 4px;">LyleKim</div>
  </div>
  <div style="display: inline-block; text-align: center; margin-right: 15px;">
    <div target="_blank">
      <img src="https://images.prismic.io/sacra/Z0Sul68jQArT1Sb7_cursorlogo.png?auto=format,compress" width="40" style="border-radius:50%;" alt="Cursor" />
    </div>
    <div style="font-size: 12px; margin-top: 4px;">Cursor</div>
  </div>
  <div style="display: inline-block; text-align: center; margin-right: 15px;">
    <div target="_blank">
      <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQGB2LXnVjf8bcRSZNhqHg0mHwmjG_5yg-PQH1EFkCSgQ&s=10" width="40" style="border-radius:50%;" alt="Google AI Studio" />
    </div>
    <div style="font-size: 12px; margin-top: 4px;">Google AI Studio</div>
  </div>
  <div style="display: inline-block; text-align: center; margin-right: 15px;">
    <div target="_blank">
      <img src="https://avatars.slack-edge.com/2025-05-14/8891273522918_30c38bf627ac73075db6_512.png" width="40" style="border-radius:50%;" alt="Claude AI" />
    </div>
    <div style="font-size: 12px; margin-top: 4px;">Claude AI</div>
  </div>
</div>
<br/>


<br/>

## What we do
- 김준석(Backend) :  
  앱 설계  
  URL 설계 및 RESTfull API 구성  
  model - form 구성  
  
  
- Google Ai Studio :  
  프론트엔드 ui 생성

- Cursor :  
  API 설계 평가 및 작성  
  에러 구조 파악 및 수정
  
- Claude :  
  Cursor와 교차 검증

<br/>

## Backend Design

- AI 호출 로직 부분(성능 기반 UX 개선)  
  
문제 : 팀원들이 남긴 기록을 바탕으로 AI를 활용하여 앞으로 내가 진행해야 할 일(작업 리스트)을 추천받을 때,  
다양한 이유로 AI 응답이 늦을 경우가 있다.(3~7초)
  
해결1 : 백엔드에서 POST 메서드로 받고, 생성한 AI 응답(작업 리스트)을 바로 프론트로 리턴한다.  
생성된 작업 리스트는 프론트에서 다시 PATCH로 응답을 받을 때 비로소 저장한다.  
해결2 : 기존의 Gemini, ChatGPT, Claude의 API를 사용하는대신 LPU 추론 칩을 기반으로 LLM API를 제공하는 groq사의 API를 사용  

결과 : AI 작업 추천 목록 응답 시간을 단축(2~3초)

<br>

- HTTP 메서드 설계 부분(리소스 부분 업데이트)  
  
문제 : "작업 상세 정보" 지능에서 팀원들이 해당 작업에 관한 "진행 상황"을 기록/등록할 때,  HTTP 메서드를 어떻게 설계할 것인가?

해결 : "작업 상세 정보" 페이지의 경우에 "관련 역할 및 검토 기록", "작업 체크리스트", "작업 프로세스 흐름도" 3가지 정보를 보여준다.  
"관련 역할 및 검토 기록"에 "진행 상황"관련 댓글을 작성하면 댓글이 추가되고,
"작업 프로세스 흐름도"가 "할 일"에서 "진행 중"으로 변경되도록 만들어야한다.  
  
=> POST를 사용해서 "진행 상황"에 대한 댓글을 저장하고,
PATCH를 사용해서 "작업 상세 정보"의 "작업 프로세스 흐름도"와 관련된 정보를 업데이트한다.

첫 댓글로 인해서 "작업 프로세스 흐름도"를 PATCH로 변경하고 나면,
그 다음에 달리는 댓글은 POST로 보내주고 처리해주면 된다.

결과 : 댓글이 추가 되는 부분은 POST로, 상태 데이터가 변경되는 부분은 PATCH로 처리한다.

<br>

- 조건부 폴링 데이터 동기화 (서버,네트워크 비용 최적화)  
  
문제 : SPA(Single Page Application) 구조 특성상,
기본적으로 다른 팀원이 추가한 업무 상황이 실시간으로 공유되지 않는다. 즉 "새로고침" 이전에는 서버의 변경된 데이터가 반영되지 않는다.  
그렇다고 무작정 주기적인 전체 데이터 조회를 돌리면(polling) 서버 및 네트워크 자원 낭비가 심해진다.  

해결 : 프론트엔드에서 3분 주기로 조회(polling)를 진행. 그러나 백엔드에 부하를 주지 않도록 ETag와 최신 수정 시간을 검증하여,  
변경되지 않았을 시에는 304 Not Modified를 반환하도록 처리한다.  

결과 : 기존에는 "새로 고침"이 아니라면 서버와 데이터가 동기화 되지 않았지만,  
이를 polling으로 해결하되 변경 내역을 확인한 후에 서버로부터 데이터를 가져오게 하여 서버의 부하를 줄였다.