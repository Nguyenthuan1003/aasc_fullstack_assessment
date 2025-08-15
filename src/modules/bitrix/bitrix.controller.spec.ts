import { Test, TestingModule } from '@nestjs/testing';
import { BitrixController } from './bitrix.controller';

describe('BitrixController', () => {
  let controller: BitrixController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BitrixController],
    }).compile();

    controller = module.get<BitrixController>(BitrixController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
