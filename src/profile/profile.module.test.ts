import { RequestLoggingMiddleware, ProfileModule } from './profile.module';
import { Logger } from '@nestjs/common';
import { MiddlewareConsumer } from '@nestjs/common';

describe('RequestLoggingMiddleware', () => {
  let middleware: RequestLoggingMiddleware;
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;
  let loggerSpy: jest.SpyInstance;

  beforeEach(() => {
    middleware = new RequestLoggingMiddleware();
    mockReq = { method: 'GET', originalUrl: '/test' };
    mockRes = {
      statusCode: 200,
      on: jest.fn(),
    };
    mockNext = jest.fn();
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    loggerSpy.mockRestore();
  });

  it('should call next() immediately', () => {
    middleware.use(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should log request details when response finishes', () => {
    // Simulate that `on` captures the callback
    let finishCallback: () => void;
    mockRes.on.mockImplementation((event: string, cb: () => void) => {
      if (event === 'finish') finishCallback = cb;
    });

    const start = Date.now();
    jest.spyOn(Date, 'now').mockImplementationOnce(() => start);

    middleware.use(mockReq, mockRes, mockNext);

    // Advance time briefly to simulate request processing
    const end = start + 123;
    jest.spyOn(Date, 'now').mockImplementationOnce(() => end);

    // Trigger finish
    finishCallback!();

    expect(loggerSpy).toHaveBeenCalledWith(`GET /test 200 123ms`);
  });

  it('should handle missing statusCode gracefully', () => {
    delete mockRes.statusCode;
    let finishCallback: () => void;
    mockRes.on.mockImplementation((event: string, cb: () => void) => {
      if (event === 'finish') finishCallback = cb;
    });

    middleware.use(mockReq, mockRes, mockNext);

    const durationSpy = jest.spyOn(Date, 'now').mockImplementation(() => 100);
    finishCallback!();

    // Expect log with undefined statusCode
    expect(loggerSpy).toHaveBeenCalledWith(`GET /test undefined 100ms`);
    durationSpy.mockRestore();
  });
});

describe('ProfileModule', () => {
  let module: ProfileModule;
  let mockConsumer: jest.Mocked<MiddlewareConsumer>;

  beforeEach(() => {
    module = new ProfileModule();
    // Mock consumer chain
    mockConsumer = {
      apply: jest.fn().mockReturnThis(),
      forRoutes: jest.fn().mockReturnThis(),
    } as any;
  });

  it('should apply RequestLoggingMiddleware to all routes before AuthMiddleware', () => {
    module.configure(mockConsumer);

    // First apply call should be RequestLoggingMiddleware
    expect(mockConsumer.apply).toHaveBeenNthCalledWith(1, RequestLoggingMiddleware);
    expect(mockConsumer.forRoutes).toHaveBeenNthCalledWith(1, { path: '*', method: 0 }); // RequestMethod.ALL = 0 ?

    // Second apply call should be AuthMiddleware (imported from user module)
    // We check for correct apply and forRoutes args.
    expect(mockConsumer.apply).toHaveBeenNthCalledWith(2, expect.any(Function)); // AuthMiddleware is a class
    expect(mockConsumer.forRoutes).toHaveBeenNthCalledWith(2, { path: 'profiles/:username/follow', method: 0 });
  });
});