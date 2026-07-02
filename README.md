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

[BackEnd]
1. 최초 1회만 실시합니다.:
    ```bash
    
    python -m venv .venv 

    pip install -r requirements.txt

    
    python manage.py migrate

    ```


2.  To run:
  
    ```bash
    
    docker compose up --build 
    

    ```

[FrontEnd]
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
<div style="display: inline-block; text-align: center; margin-right: 15px;">
  <a href="https://github.com/LyleKim" target="_blank">
    <img src="https://github.com/LyleKim.png" width="40" style="border-radius:50%;" alt="LyleKim" />
  </a>
  <div style="font-size: 12px; margin-top: 4px;">joonseok Kim(LyleKim)</div>
</div>  

<br/>


<br/>

## What we do
- 김준석(Backend) :  
  앱 설계
  URL 설계 및 RESTfull API 구성
  model - form 구성
  
- Google Ai Studio
  프론트엔드 ui 생성

- Cursor
  API 설계 평가 및 작성

<br/>