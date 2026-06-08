import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ProfileModule } from './profile.module';

describe('ProfileModule (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ProfileModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/ping', () => {
    it('GET /ping should return "pong" with status 200 and content-type text/plain', () => {
      return request(app.getHttpServer())
        .get('/ping')
        .expect(200)
        .expect('Content-Type', /text\/plain/)
        .expect('pong');
    });

    it('GET /ping should ignore query parameters', () => {
      return request(app.getHttpServer())
        .get('/ping?foo=bar')
        .expect(200)
        .expect('pong');
    });

    it('GET /ping/ should return 404', () => {
      return request(app.getHttpServer())
        .get('/ping/')
        .expect(404);
    });

    it('POST /ping should return 404', () => {
      return request(app.getHttpServer())
        .post('/ping')
        .expect(404);
    });

    it('PUT /ping should return 404', () => {
      return request(app.getHttpServer())
        .put('/ping')
        .expect(404);
    });
  });
});