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
import { publicOpenApiDoc } from './openapi/public-doc.js'

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

  const doc = cleanupOpenApiDoc(
    SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Cars UA API')
        .setDescription('Ukrainian plate + VIN lookup')
        .setVersion('0.1')
        .build()
    )
  )
  if (swaggerEnabled(env)) SwaggerModule.setup('api/docs', app, doc, { jsonDocumentUrl: 'api/docs-json' })
  // The curated subset that `/.well-known/ard.json` points agents at; JSON only, no UI. Always on (unlike Swagger).
  SwaggerModule.setup('.well-known/openapi', app, publicOpenApiDoc(doc), {
    ui: false,
    raw: ['json'],
    jsonDocumentUrl: '.well-known/openapi.json'
  })

  await app.listen({ port: env.PORT, host: '0.0.0.0' })
  new Logger('Bootstrap').log(`API listening on http://localhost:${env.PORT}`)
}

void bootstrap()
