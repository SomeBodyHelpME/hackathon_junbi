import type { FastifyError, FastifyInstance } from "fastify";
import { ZodError, type ZodType, type z } from "zod";
import type { ErrorResponse } from "@kit/contracts";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function errorBody(code: string, message: string): ErrorResponse {
  return { error: { code, message } };
}

// 요청 데이터를 contracts 스키마로 검증한다. 실패하면 ZodError → 400.
export function parse<S extends ZodType>(schema: S, data: unknown): z.infer<S> {
  return schema.parse(data);
}

// 모든 오류를 { error: { code, message } } 형식으로 변환한다.
export function registerErrorHandlers(app: FastifyInstance) {
  app.setErrorHandler((err: FastifyError | Error, req, reply) => {
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send(errorBody(err.code, err.message));
    }
    if (err instanceof ZodError) {
      const message = err.issues[0]?.message ?? "입력값이 올바르지 않습니다";
      return reply.status(400).send(errorBody("VALIDATION_ERROR", message));
    }
    // Fastify 자체 오류(잘못된 JSON 등)는 4xx 상태를 유지한다.
    const status = "statusCode" in err && err.statusCode ? err.statusCode : 500;
    if (status < 500) {
      return reply.status(status).send(errorBody("BAD_REQUEST", err.message));
    }
    req.log.error(err);
    return reply.status(500).send(errorBody("INTERNAL_ERROR", "서버 오류가 발생했습니다"));
  });

  app.setNotFoundHandler((_req, reply) => {
    reply.status(404).send(errorBody("NOT_FOUND", "요청한 리소스를 찾을 수 없습니다"));
  });
}
