import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Logger } from '@nestjs/common';
import * as request from 'supertest';
import { UserModule } from './user.module';
import { PingController } from './user.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserEntity } from './user.entity';

describe('UserModule', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [UserModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should bootstrap the module without errors', () => {
    expect(app).toBeDefined();
    expect(app.getHttpServer()).toBeDefined();
  });

  it('should have PingController registered', () => {
    const pingController = app.get(PingController);
    expect(pingController).toBeDefined();
    expect(pingController.getPing).toBeDefined();
  });

  describe('GET /ping', () => {
    it('should return 200 with "pong" and Content-Type text/plain', async () => {
      const response = await request(app.getHttpServer())
        .get('/ping')
        .expect(200);

      expect(response.text).toBe('pong');
      expect(response.headers['content-type']).toMatch(/text\/plain/);
    });

    it('should trigger LoggingMiddleware', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await request(app.getHttpServer()).get('/ping').expect(200);

      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });

  describe('POST /ping', () => {
    it('should return 404 because only GET is defined', async () => {
      await request(app.getHttpServer())
        .post('/ping')
        .expect(404);
    });
  });
});