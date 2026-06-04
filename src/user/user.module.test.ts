import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PingController } from './user.module';

describe('PingController', () => {
  describe('unit', () => {
    it('should return "pong"', () => {
      const controller = new PingController();
      expect(controller.getPing()).toBe('pong');
    });
  });

  describe('integration', () => {
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

    it('GET /ping returns 200 and "pong" with text/plain', async () => {
      const response = await request(app.getHttpServer())
        .get('/ping')
        .expect(200);
      expect(response.text).toBe('pong');
      expect(response.headers['content-type']).toMatch(/text\/plain/);
    });

    it('POST /ping returns 404', async () => {
      await request(app.getHttpServer())
        .post('/ping')
        .expect(404);
    });

    it('GET /ping/ (trailing slash) returns 404', async () => {
      await request(app.getHttpServer())
        .get('/ping/')
        .expect(404);
    });
  });
});