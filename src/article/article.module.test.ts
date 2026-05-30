import { LoggerMiddleware, ArticleModule } from './article.module';
import { AuthMiddleware } from '../user/auth.middleware';
import { MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

describe('LoggerMiddleware', () => {
  let loggerMiddleware: LoggerMiddleware;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-01-01T00:00:00.000Z'));
    jest.spyOn(console, 'log').mockImplementation(() => {});
    loggerMiddleware = new LoggerMiddleware();
    mockRes = {
      on: jest.fn(),
      statusCode: 200,
    };
    mockReq = {
      method: 'GET',
      originalUrl: '/test',
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  function triggerFinish(res: Partial<Response>) {
    const finishHandler = (res.on as jest.Mock).mock.calls.find(
      (call: string[]) => call[0] === 'finish'
    )?.[1];
    if (finishHandler) finishHandler();
  }

  it('should log request with timestamp, method, path, status and duration on finish', () => {
    loggerMiddleware.use(mockReq as Request, mockRes as Response, next);

    expect(next).toHaveBeenCalled();
    expect(console.log).not.toHaveBeenCalled();

    jest.advanceTimersByTime(500);
    triggerFinish(mockRes);

    expect(console.log).toHaveBeenCalledWith(
      '2023-01-01T00:00:00.000Z GET /test 200 500ms'
    );
  });

  it('should not log before response finishes', () => {
    loggerMiddleware.use(mockReq as Request, mockRes as Response, next);
    expect(console.log).not.toHaveBeenCalled();
  });

  it('should log error response status codes', () => {
    mockRes.statusCode = 500;
    loggerMiddleware.use(mockReq as Request, mockRes as Response, next);

    jest.advanceTimersByTime(200);
    triggerFinish(mockRes);

    expect(console.log).toHaveBeenCalledWith(
      '2023-01-01T00:00:00.000Z GET /test 500 200ms'
    );
  });

  it('should measure exact response time', () => {
    loggerMiddleware.use(mockReq as Request, mockRes as Response, next);
    jest.advanceTimersByTime(777);
    triggerFinish(mockRes);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('777ms')
    );
  });
});

describe('ArticleModule', () => {
  let articleModule: ArticleModule;
  let mockConsumer: Partial<MiddlewareConsumer>;

  beforeEach(() => {
    articleModule = new ArticleModule();
    const consumer = {
      apply: jest.fn().mockReturnThis(),
      forRoutes: jest.fn().mockReturnThis(),
    };
    mockConsumer = consumer;
  });

  it('should apply LoggerMiddleware for all routes', () => {
    articleModule.configure(mockConsumer as MiddlewareConsumer);
    expect(mockConsumer.apply).toHaveBeenNthCalledWith(1, LoggerMiddleware);
    expect(mockConsumer.forRoutes).toHaveBeenNthCalledWith(1, '*');
  });

  it('should apply AuthMiddleware for specific routes', () => {
    articleModule.configure(mockConsumer as MiddlewareConsumer);
    expect(mockConsumer.apply).toHaveBeenNthCalledWith(2, AuthMiddleware);
    expect(mockConsumer.forRoutes).toHaveBeenNthCalledWith(2, 
      { path: 'articles/feed', method: RequestMethod.GET },
      { path: 'articles', method: RequestMethod.POST },
      { path: 'articles/:slug', method: RequestMethod.DELETE },
      { path: 'articles/:slug', method: RequestMethod.PUT },
      { path: 'articles/:slug/comments', method: RequestMethod.POST },
      { path: 'articles/:slug/comments/:id', method: RequestMethod.DELETE },
      { path: 'articles/:slug/favorite', method: RequestMethod.POST },
      { path: 'articles/:slug/favorite', method: RequestMethod.DELETE },
    );
  });
});