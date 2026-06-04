import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { VersionController } from './profile.module';

describe('ProfileModule VersionController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [VersionController],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return 200 with service, commit, timestamp', async () => {
    const res = await request(app.getHttpServer()).get('/version');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('service', 'profile-service');
    expect(res.body).toHaveProperty('commit');
    expect(res.body).toHaveProperty('timestamp');
    expect(() => new Date(res.body.timestamp)).not.toThrow();
  });

  it('should respond with Content-Type application/json', async () => {
    const res = await request(app.getHttpServer()).get('/version');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('should return commit from GIT_COMMIT env if set', async () => {
    const original = process.env.GIT_COMMIT;
    process.env.GIT_COMMIT = 'abc123def456';
    try {
      const res = await request(app.getHttpServer()).get('/version');
      expect(res.body.commit).toBe('abc123def456');
    } finally {
      process.env.GIT_COMMIT = original;
    }
  });

  it('should return commit "unknown" if GIT_COMMIT not set', async () => {
    const original = process.env.GIT_COMMIT;
    delete process.env.GIT_COMMIT;
    try {
      const res = await request(app.getHttpServer()).get('/version');
      expect(res.body.commit).toBe('unknown');
    } finally {
      process.env.GIT_COMMIT = original;
    }
  });

  it('should return a recent UTC ISO 8601 timestamp', async () => {
    const res = await request(app.getHttpServer()).get('/version');
    const now = Date.now();
    const ts = new Date(res.body.timestamp);
    expect(ts.toISOString()).toBe(res.body.timestamp);
    expect(ts.getTime()).toBeLessThan(now + 2000);
    expect(ts.getTime()).toBeGreaterThan(now - 5000);
  });
});