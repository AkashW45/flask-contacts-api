import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Logger } from '@nestjs/common';
import * as request from 'supertest';
import { LoggerMiddleware, PingController, ArticleModule } from './article.module';

describe('ArticleModule', () => {
  let app: INestApplication;

  describe('PingController (e2e)', () => {
    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        controllers: [PingController],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('should return "pong" when ping() is called directly', () => {
      const controller = new PingController();
      expect(controller.ping()).toBe('pong');
    });

    it('GET /ping should return 200 with "pong" and Content-Type text/plain', async () => {
      const response = await request(app.getHttpServer())
        .get('/ping')
        .expect(200)
        .expect('Content-Type', /text\/plain/)
        .expect('pong');
    });

    it('POST /ping should return 404 Not Found', async () => {
      await request(app.getHttpServer())
        .post('/ping')
        .expect(404);
    });
  });

  describe('LoggerMiddleware', () => {
    it('should log the HTTP request after the response finishes', () => {
      const middleware = new LoggerMiddleware();
      const req = {
        method: 'GET',
        path: '/test',
        originalUrl: '/test',
      };
      const res = {
        statusCode: 200,
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'finish') {
            callback();
          }
        }),
      };
      const next = jest.fn();

      const loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
      middleware.use(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));

      const loggedMessage = loggerSpy.mock.calls[0][0];
      expect(loggedMessage).toMatch(/GET/);
      expect(loggedMessage).toMatch(/\/test/);
      expect(loggedMessage).toMatch(/200/);
      expect(loggedMessage).toMatch(/\d+ms/);

      loggerSpy.mockRestore();
    });
  });
});