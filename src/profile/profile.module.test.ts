import { LoggerMiddleware, ProfileModule } from './profile.module';
import { RequestMethod, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthMiddleware } from '../user/auth.middleware';

describe('ProfileModule', () => {
  let module: ProfileModule;

  beforeEach(() => {
    module = new ProfileModule();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should configure middleware consumer correctly', () => {
    const consumer: any = {
      apply: jest.fn().mockReturnThis(),
      forRoutes: jest.fn().mockReturnThis(),
    };
    module.configure(consumer);

    expect(consumer.apply).toHaveBeenCalledTimes(2);
    expect(consumer.apply).toHaveBeenNthCalledWith(1, LoggerMiddleware);
    expect(consumer.forRoutes).toHaveBeenNthCalledWith(1, {
      path: '*',
      method: RequestMethod.ALL,
    });
    expect(consumer.apply).toHaveBeenNthCalledWith(2, AuthMiddleware);
    expect(consumer.forRoutes).toHaveBeenNthCalledWith(2, {
      path: 'profiles/:username/follow',
      method: RequestMethod.ALL,
    });
  });
});

describe('LoggerMiddleware', () => {
  let middleware: LoggerMiddleware;
  let mockLog: jest.Mock;
  let request: Partial<Request>;
  let response: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    mockLog = jest.fn();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(mockLog);
    middleware = new LoggerMiddleware();
    request = { method: 'GET', originalUrl: '/test' };
    response = {
      statusCode: 200,
      on: jest.fn(),
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call next()', () => {
    middleware.use(request as Request, response as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it('should not log before response finish', () => {
    middleware.use(request as Request, response as Response, next);
    expect(mockLog).not.toHaveBeenCalled();
  });

  it('should log on response finish with expected format', () => {
    middleware.use(request as Request, response as Response, next);
    const finishCallback = (response.on as jest.Mock).mock.calls[0][1];
    finishCallback();
    expect(mockLog).toHaveBeenCalledWith(
      expect.stringMatching(/GET \/test 200 \d+ms/),
    );
  });

  it('should log correct response time in milliseconds', () => {
    const fakeNow = jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1050);
    try {
      middleware.use(request as Request, response as Response, next);
      const finishCallback = (response.on as jest.Mock).mock.calls[0][1];
      finishCallback();
      expect(mockLog).toHaveBeenCalledWith('GET /test 200 50ms');
    } finally {
      fakeNow.mockRestore();
    }
  });

  it('should handle different status codes', () => {
    response.statusCode = 404;
    middleware.use(request as Request, response as Response, next);
    const finishCallback = (response.on as jest.Mock).mock.calls[0][1];
    finishCallback();
    expect(mockLog).toHaveBeenCalledWith(
      expect.stringContaining('404'),
    );
  });
});