import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PingController } from './article.module';

describe('PingController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [PingController],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /ping should return 200, text/plain content-type, and body pong', async () => {
    const response = await request(app.getHttpServer())
      .get('/ping')
      .expect(200);
    expect(response.headers['content-type']).toMatch(/text\/plain/);
    expect(response.text).toBe('pong');
  });

  it('POST /ping should return 404', async () => {
    await request(app.getHttpServer())
      .post('/ping')
      .expect(404);
  });

  it('GET / should return 404', async () => {
    await request(app.getHttpServer())
      .get('/')
      .expect(404);
  });
});