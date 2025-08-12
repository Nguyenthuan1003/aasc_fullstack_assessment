import { Test, TestingModule } from '@nestjs/testing';
import { JotformController } from './jotform.controller';

describe('JotformController', () => {
  let controller: JotformController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JotformController],
    }).compile();

    controller = module.get<JotformController>(JotformController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
