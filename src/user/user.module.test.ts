import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PingController } from './user.module';

describe('PingController (e2e)', () => {
  let app: INestApplication;

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

  describe('GET /ping', () => {
    it('should return "pong" with HTTP 200 and Content-Type text/plain', async () => {
      const response = await request(app.getHttpServer())
        .get('/ping')
        .expect(200)
        .expect('Content-Type', 'text/plain');
      expect(response.text).toBe('pong');
    });

    it('should return 404 for POST /ping (method not allowed)', async () => {
      await request(app.getHttpServer())
        .post('/ping')
        .expect(404);
    });

    it('should return 404 for GET /ping/ (trailing slash)', async () => {
      await request(app.getHttpServer())
        .get('/ping/')
        .expect(404);
    });
  });
});