import { BadRequestException, Injectable } from '@nestjs/common'
import type { PipeTransform } from '@nestjs/common'
import type { ZodType } from 'zod'

/**
 * Validate a single route param against a Zod schema. Returns a fresh pipe class
 * per call site so each param gets its own schema.
 */
export function zodParam<T>(schema: ZodType<T>): new () => PipeTransform<unknown, T> {
  @Injectable()
  class ZodParamPipe implements PipeTransform<unknown, T> {
    transform(value: unknown): T {
      const result = schema.safeParse(value)
      if (!result.success) {
        throw new BadRequestException(result.error.issues.map(i => i.message).join('; '))
      }
      return result.data
    }
  }
  return ZodParamPipe
}
