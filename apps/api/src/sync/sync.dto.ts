import { createZodDto } from 'nestjs-zod'
import { syncRequestSchema, syncResponseSchema } from '@carplates/shared'

export class SyncRequestDto extends createZodDto(syncRequestSchema) {}
export class SyncResponseDto extends createZodDto(syncResponseSchema) {}
