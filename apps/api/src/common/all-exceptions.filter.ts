import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common'
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common'
import * as Sentry from '@sentry/nestjs'
import type { FastifyReply } from 'fastify'
import type { ApiError } from '@carplates/shared'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions')

  catch(exception: unknown, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<FastifyReply>()

    const isHttp = exception instanceof HttpException
    const statusCode = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR

    let message = 'Internal server error'
    if (isHttp) {
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
