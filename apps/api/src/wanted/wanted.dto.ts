import { createZodDto } from 'nestjs-zod'
import { wantedResponseSchema } from '@carplates/shared'

export class WantedResponseDto extends createZodDto(wantedResponseSchema) {}
