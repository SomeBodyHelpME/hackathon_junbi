# REQ-00 동작 확인용: 브라우저 → Next.js → Fastify → PostgreSQL 연결을 검증한다.

@REQ-00 @smoke
Feature: 개발 환경 동작 확인

  Scenario: 로그인한 사용자와 회의실 목록이 화면에 표시된다
    Given "상은"으로 로그인한다
    When 메인 화면에 접속한다
    Then 로그인한 사용자로 "상은"이 표시된다
    And 회의실 목록에 다음 회의실이 표시된다
      | 이름 |
      | 한라 |
      | 백두 |
      | 지리 |
