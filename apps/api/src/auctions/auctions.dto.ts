import { createZodDto } from 'nestjs-zod'
import { auctionListResponseSchema, auctionResponseSchema, auctionStatsResponseSchema } from '@carplates/shared'

export class AuctionResponseDto extends createZodDto(auctionResponseSchema) {}
export class AuctionListResponseDto extends createZodDto(auctionListResponseSchema) {}
export class AuctionStatsResponseDto extends createZodDto(auctionStatsResponseSchema) {}
