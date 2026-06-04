import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ArticleController } from './article.controller';
import { ArticleService } from './article.service';

describe('ArticleController (e2e)', () => {
  let app: INestApplication;
  let articleService: ArticleService;
  const mockArticleService = {
    findAll: jest.fn(),
    findFeed: jest.fn(),
    findOne: jest.fn(),
    findComments: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    addComment: jest.fn(),
    deleteComment: jest.fn(),
    favorite: jest.fn(),
    unFavorite: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ArticleController],
      providers: [
        {
          provide: ArticleService,
          useValue: mockArticleService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    articleService = moduleFixture.get<ArticleService>(ArticleService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /articles/version', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return 200 and application/json', async () => {
      const res = await request(app.getHttpServer())
        .get('/articles/version')
        .expect(200);
      expect(res.headers['content-type']).toMatch(/json/);
      expect(res.body).toBeDefined();
    });

    it('should return version info with service name', async () => {
      const res = await request(app.getHttpServer())
        .get('/articles/version')
        .expect(200);
      expect(res.body.service).toBe('articles-service');
    });

    it('should return commit from GIT_COMMIT environment variable', async () => {
      process.env.GIT_COMMIT = 'abc123def';
      const res = await request(app.getHttpServer())
        .get('/articles/version')
        .expect(200);
      expect(res.body.commit).toBe('abc123def');
    });

    it('should return "unknown" commit when GIT_COMMIT is not set', async () => {
      delete process.env.GIT_COMMIT;
      const res = await request(app.getHttpServer())
        .get('/articles/version')
        .expect(200);
      expect(res.body.commit).toBe('unknown');
    });

    it('should return a valid ISO 8601 UTC timestamp', async () => {
      const res = await request(app.getHttpServer())
        .get('/articles/version')
        .expect(200);
      const timestamp = res.body.timestamp;
      expect(timestamp).toBeDefined();
      const date = new Date(timestamp);
      expect(date.toISOString()).toBe(timestamp);
      const now = Date.now();
      const diff = Math.abs(now - date.getTime());
      expect(diff).toBeLessThan(5000);
    });
  });
});