import './instrument.js' // Sentry — must load before anything it instruments

import multipart from '@fastify/multipart'
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
    new FastifyAdapter({
      logger: false,
      bodyLimit: 1_048_576,
      trustProxy: env.TRUST_PROXY,
      // Slow-request (slowloris) guard; the longest legit request is a 4 MB phone-camera upload.
      requestTimeout: 60_000
    })
  )
  app.enableShutdownHooks()
  // Baseline hardening. No CSP/HSTS here: the CSP needs the embed allowlist (YouTube, Sketchfab, Maps, PostHog)
  // and HSTS belongs on the TLS-terminating proxy — see PLAN.md "Deploy-time security checklist".
  app
    .getHttpAdapter()
    .getInstance()
    .addHook('onSend', async (_req, reply) => {
      reply.header('x-content-type-options', 'nosniff')
      reply.header('referrer-policy', 'strict-origin-when-cross-origin')
      reply.header('x-frame-options', 'SAMEORIGIN')
    })
  await app.register(multipart, { limits: { fileSize: 4 * 1024 * 1024, files: 1, fields: 4 } })
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
