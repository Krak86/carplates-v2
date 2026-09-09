import './instrument.js' // Sentry — must load before anything it instruments

import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import type { NestFastifyApplication } from '@nestjs/platform-fastify'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { cleanupOpenApiDoc } from 'nestjs-zod'

import { AppModule } from './app.module.js'
import { loadEnv, swaggerEnabled } from './env.js'

async function bootstrap(): Promise<void> {
  const env = loadEnv()

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false, bodyLimit: 1_048_576 })
  )
  app.enableShutdownHooks()
  app.enableCors({
    origin: env.NODE_ENV === 'production' ? env.PUBLIC_SITE_URL : true,
    credentials: true
  })

  if (swaggerEnabled(env)) {
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Cars UA API')
        .setDescription('Ukrainian plate + VIN lookup')
        .setVersion('0.1')
        .build()
    )
    SwaggerModule.setup('api/docs', app, cleanupOpenApiDoc(doc), { jsonDocumentUrl: 'api/docs-json' })
  }

  await app.listen({ port: env.PORT, host: '0.0.0.0' })
  new Logger('Bootstrap').log(`API listening on http://localhost:${env.PORT}`)
}

void bootstrap()
