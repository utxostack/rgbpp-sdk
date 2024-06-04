import { Inject, Logger, Module, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common';
import { JsonRpcServer } from './json-rpc.server';

export const JSON_RPC_OPTIONS = '__JSON_RPC_OPTIONS__';

export interface JsonRpcConfig {
  path: string;
}

@Module({})
export class JsonRpcModule implements OnModuleInit, OnApplicationBootstrap {
  private logger = new Logger(JsonRpcModule.name);

  constructor(
    @Inject(JSON_RPC_OPTIONS) private config: JsonRpcConfig,
    private jsonRpcServer: JsonRpcServer,
  ) {}

  public static forRoot(config: JsonRpcConfig) {
    return {
      module: JsonRpcModule,
      providers: [
        {
          provide: JSON_RPC_OPTIONS,
          useValue: config,
        },
        JsonRpcServer,
      ],
    };
  }

  public async onModuleInit() {
    this.jsonRpcServer.run(this.config);
    this.logger.log(`JSON-RPC server is running on ${this.config.path}`);
  }

  public async onApplicationBootstrap() {
    await this.jsonRpcServer.resolve();
  }
}

export default JsonRpcModule;
