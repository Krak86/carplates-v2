import { createZodDto } from 'nestjs-zod'
import { auctionResponseSchema } from '@carplates/shared'

export class AuctionResponseDto extends createZodDto(auctionResponseSchema) {}
