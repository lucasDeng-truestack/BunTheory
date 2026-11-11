import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { getAllowedOrigins, normalizeOrigin } from './common/allowed-origins';
import { NextFunction, Request, Response } from 'express';
import {
  Auth,
  BETTER_AUTH,
  CLIENT_IP_HEADER,
  dynamicImport,
} from './modules/auth/better-auth';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Better Auth must read the raw body, so parsers are added after its handler below.
    bodyParser: false,
  });
  const allowedOrigins = getAllowedOrigins();
  // Behind a reverse proxy, set TRUST_PROXY=1 so rate limits key on the real client IP.
  // TRUST_PROXY=1 (or a hop count). "true" is accepted as 1 so a common typo is not silently ignored.
  const trustProxyRaw = process.env.TRUST_PROXY?.trim().toLowerCase();
  const trustProxyHops = trustProxyRaw === 'true' ? 1 : Number(trustProxyRaw);
  if (trustProxyHops > 0) app.set('trust proxy', trustProxyHops);

  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });
  app.enableCors({
    origin: (origin, callback) => {
      // Allow same-origin or non-browser requests (health checks, server-to-server).
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(normalizeOrigin(origin))) {
        callback(null, true);
        return;
      }

      // Do not pass an Error here: the cors package treats it as a middleware failure,
      // which yields 500 on OPTIONS preflight without Access-Control-Allow-Origin.
      console.warn(`CORS blocked for origin: ${origin}`);
      callback(null, false);
    },
    credentials: true,
    // Better Auth's bearer plugin returns the session token in this header.
    exposedHeaders: ['set-auth-token'],
    // allowedHeaders stays unset: cors reflects Access-Control-Request-Headers, which allows Authorization.
  });

  const { toNodeHandler } = await dynamicImport<typeof import('better-auth/node')>(
    'better-auth/node',
  );
  const express = app.getHttpAdapter().getInstance();
  // Better Auth keys rate limits on CLIENT_IP_HEADER only. Overwrite it with Express's req.ip
  // (which honours TRUST_PROXY) so a client-sent value never survives.
  express.use('/api/auth', (req: Request, _res: Response, next: NextFunction) => {
    if (req.ip) req.headers[CLIENT_IP_HEADER] = req.ip;
    else delete req.headers[CLIENT_IP_HEADER];
    next();
  });
  // Express 4 wildcard. Mounted after CORS and before any body parser.
  express.all('/api/auth/*', toNodeHandler(app.get<Auth>(BETTER_AUTH)));
  // Same parsers (and 100kb default limit) Nest registers when bodyParser is left on.
  app.useBodyParser('json');
  app.useBodyParser('urlencoded', { extended: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  const port = process.env.PORT || 3101;
  await app.listen(port);
  console.log(`🍔 The Bun Theory API running on http://localhost:${port}`);
  console.log(`🌐 CORS allowed origins: ${allowedOrigins.join(', ')}`);
  console.log("🚀 Running on port", port);
}

bootstrap();
