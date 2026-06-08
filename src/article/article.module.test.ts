import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import { ArticleModule, PingController, LoggerMiddleware } from './article.module';
import { AuthMiddleware } from '../user/auth.middleware';

jest.mock('@nestjs/typeorm', () => ({
  TypeOrmModule: {
    forFeature: jest.fn().mockReturnValue({ module: class Mock {}, providers: [] }),
  },
}));

jest.mock('../user/user.module', () => ({
  UserModule: class MockUserModule {},
}));

jest.mock('./article.service', () => ({
  ArticleService: class MockArticleService {},
}));

describe('ArticleModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ArticleModule],
    }).compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should contain PingController', () => {
    const controller = module.get<PingController>(PingController);
    expect(controller).toBeInstanceOf(PingController);
  });

  it('PingController.ping() should return "pong"', () => {
    const controller = module.get<PingController>(PingController);
    expect(controller.ping()).toBe('pong');
  });

  it('should apply LoggerMiddleware for all routes and AuthMiddleware for specific routes', () => {
    const articleModule = module.get<ArticleModule>(ArticleModule);
    const applyResult = {
      forRoutes: jest.fn().mockReturnThis(),
    };
    const consumerMock = {
      apply: jest.fn().mockReturnValue(applyResult),
    };
    // Enable chaining: after .forRoutes() consumerMock is returned to allow further .apply().
    applyResult.forRoutes.mockReturnValue(consumerMock);

    articleModule.configure(consumerMock);

    // Verify apply called for both middlewares
    expect(consumerMock.apply).toHaveBeenCalledTimes(2);
    expect(consumerMock.apply).toHaveBeenNthCalledWith(1, LoggerMiddleware);
    expect(consumerMock.apply).toHaveBeenNthCalledWith(2, AuthMiddleware);

    // Verify forRoutes calls
    expect(applyResult.forRoutes).toHaveBeenCalledTimes(2);
    expect(applyResult.forRoutes).toHaveBeenNthCalledWith(1, '*');

    const secondCallArgs = applyResult.forRoutes.mock.calls[1];
    // Validate the exact route objects spread in the second forRoutes call
    expect(secondCallArgs).toEqual([
      { path: 'articles/feed', method: RequestMethod.GET },
      { path: 'articles', method: RequestMethod.POST },
      { path: 'articles/:slug', method: RequestMethod.DELETE },
      { path: 'articles/:slug', method: RequestMethod.PUT },
      { path: 'articles/:slug/comments', method: RequestMethod.POST },
      { path: 'articles/:slug/comments/:id', method: RequestMethod.DELETE },
      { path: 'articles/:slug/favorite', method: RequestMethod.POST },
      { path: 'articles/:slug/favorite', method: RequestMethod.DELETE },
    ]);
  });
});