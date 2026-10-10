// docker-compose.yml의 기본 계정과 맞춘 기본값. .env 없이도 바로 실행되게 한다.
export const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://kit:kit@localhost:5432/kit";
