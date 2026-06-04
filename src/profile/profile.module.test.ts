import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PingController } from './profile.module';

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

  it('GET /ping should return pong as plain text with status 200', () => {
    return request(app.getHttpServer())
      .get('/ping')
      .expect(200)
      .expect('Content-Type', /text\/plain/)
      .expect('pong');
  });

  it('POST /ping should return 404 (method not allowed)', () => {
    return request(app.getHttpServer())
      .post('/ping')
      .expect(404);
  });

  it('GET /nonexistent should return 404', () => {
    return request(app.getHttpServer())
      .get('/nonexistent')
      .expect(404);
  });
});