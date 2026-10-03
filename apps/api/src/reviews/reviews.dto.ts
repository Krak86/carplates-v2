import { createZodDto } from 'nestjs-zod'
import { reviewsResponseSchema } from '@carplates/shared'

export class ReviewsDto extends createZodDto(reviewsResponseSchema) {}
