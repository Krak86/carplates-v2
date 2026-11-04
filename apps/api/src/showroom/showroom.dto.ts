import { createZodDto } from 'nestjs-zod'
import { showroomDetailSchema, showroomListSchema } from '@carplates/shared'

export class ShowroomListDto extends createZodDto(showroomListSchema) {}
export class ShowroomDetailDto extends createZodDto(showroomDetailSchema) {}
