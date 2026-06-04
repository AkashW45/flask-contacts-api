import { VersionController } from './article.module';

describe('VersionController', () => {
  let controller: VersionController;

  beforeEach(() => {
    controller = new VersionController();
  });

  afterEach(() => {
    delete process.env.GIT_COMMIT;
  });

  it('should return version info with commit from env', () => {
    process.env.GIT_COMMIT = 'abc123';
    const result = controller.getVersion();

    expect(result).toEqual({
      service: 'article-service',
      commit: 'abc123',
      timestamp: expect.any(String),
    });
    expect(Date.parse(result.timestamp)).not.toBeNaN();
    const now = Date.now();
    const parsed = new Date(result.timestamp).getTime();
    expect(Math.abs(now - parsed)).toBeLessThan(5000);
  });

  it('should fallback to "unknown" if GIT_COMMIT not set', () => {
    delete process.env.GIT_COMMIT;
    const result = controller.getVersion();
    expect(result.commit).toBe('unknown');
    expect(result.service).toBe('article-service');
    expect(typeof result.timestamp).toBe('string');
  });

  it('should return a valid ISO 8601 timestamp ending with Z', () => {
    const result = controller.getVersion();
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});