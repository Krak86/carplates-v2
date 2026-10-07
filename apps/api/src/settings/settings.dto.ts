import { createZodDto } from 'nestjs-zod'
import { settingsResponseSchema, settingsUpdateRequestSchema } from '@carplates/shared'

export class SettingsDto extends createZodDto(settingsResponseSchema) {}
export class SettingsUpdateDto extends createZodDto(settingsUpdateRequestSchema) {}
