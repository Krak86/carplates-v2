import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common'
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common'
import * as Sentry from '@sentry/nestjs'
import type { FastifyReply } from 'fastify'
import type { ApiError } from '@carplates/shared'

/** A numeric 4xx `statusCode` on a non-`HttpException` error, else `undefined` (stays a 500). */
export function fastifyClientStatus(exception: unknown): number | undefined {
  const code = (exception as { statusCode?: unknown } | null)?.statusCode
  return typeof code === 'number' && Number.isInteger(code) && code >= 400 && code < 500 ? code : undefined
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions')

  catch(exception: unknown, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<FastifyReply>()

    const isHttp = exception instanceof HttpException
    // Fastify-level client errors (body parser, 413, unsupported media type) are plain `Error`s carrying a 4xx `statusCode`.
    const clientStatus = isHttp ? undefined : fastifyClientStatus(exception)
    const statusCode = isHttp ? exception.getStatus() : (clientStatus ?? HttpStatus.INTERNAL_SERVER_ERROR)

    let message = 'Internal server error'
    if (clientStatus) {
      message = exception instanceof Error ? exception.message : 'Bad request'
    } else if (isHttp) {
      const body = exception.getResponse()
      if (typeof body === 'string') {
        message = body
      } else {
        const raw = (body as { message?: string | string[] }).message ?? exception.message
        message = Array.isArray(raw) ? raw.join('; ') : raw
      }
    }

    if (statusCode >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception))
      Sentry.captureException(exception)
    }

    const payload: ApiError = { statusCode, error: HttpStatus[statusCode] ?? 'ERROR', message }
    reply.status(statusCode).send(payload)
  }
}
