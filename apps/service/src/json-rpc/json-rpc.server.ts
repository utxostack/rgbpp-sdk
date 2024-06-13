import { Injectable, Logger } from '@nestjs/common';
import { HttpAdapterHost, ModuleRef, ModulesContainer } from '@nestjs/core';
import { JSONRPCServer, SimpleJSONRPCMethod } from 'json-rpc-2.0';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { JsonRpcMetadataKey, JsonRpcMethodMetadataKey } from './json-rpc.decorators';
import { JsonRpcConfig } from './json-rpc.module';

class JsonRpcServerError extends Error {
  constructor(message: string) {
    super(message);
  }
}

@Injectable()
export class JsonRpcServer {
  private server: JSONRPCServer;
  private logger = new Logger(JsonRpcServer.name);

  constructor(
    private httpAdapterHost: HttpAdapterHost,
    private modulesContainer: ModulesContainer,
    private moduleRef: ModuleRef,
  ) {
    this.server = new JSONRPCServer();
  }

  private getRegisteredHandlers() {
    const modules = [...this.modulesContainer.values()];
    const wrappers = modules.reduce(
      (providers, module) => providers.concat([...module.providers.values()]),
      [] as InstanceWrapper<unknown>[],
    );

    const rpcHandlers = new Map<string, SimpleJSONRPCMethod<unknown>>();
    wrappers.forEach((wrapper) => {
      const { instance } = wrapper;
      if (!instance) {
        return;
      }
      const metadata = Reflect.getMetadata(JsonRpcMetadataKey, instance.constructor);
      if (!metadata) {
        return;
      }

      const properties = Object.getOwnPropertyNames(Object.getPrototypeOf(instance));
      properties.forEach((methodName) => {
        const methodMetadata = Reflect.getMetadata(JsonRpcMethodMetadataKey, instance[methodName]);
        if (!methodMetadata) {
          return;
        }
        const name = metadata.name
          ? `${metadata.name}.${methodMetadata.name ?? methodName}`
          : methodMetadata.name ?? methodName;
        const handler = (params: unknown) => {
          const instanceRef = this.moduleRef.get(instance.constructor, { strict: false });
          return instanceRef[methodName](params);
        };
        if (rpcHandlers.has(name)) {
          throw new JsonRpcServerError(`Duplicate JSON-RPC method: ${name}`);
        }
        rpcHandlers.set(name, handler);
      });
    });
    return rpcHandlers;
  }

  public async resolve() {
    const handlers = this.getRegisteredHandlers();
    handlers.forEach((handler, name) => {
      this.logger.log(`Registering JSON-RPC method: ${name}`);
      this.server.addMethod(name, handler);
    });
  }

  public async run(config: JsonRpcConfig) {
    this.httpAdapterHost.httpAdapter.post(config.path, async (req, res) => {
      this.logger.debug(`Received JSON-RPC request: ${JSON.stringify(req.body)}`);
      const jsonRpcResponse = await this.server.receive(req.body);
      this.httpAdapterHost.httpAdapter.setHeader(res, 'Content-Type', 'application/json');
      this.httpAdapterHost.httpAdapter.reply(res, jsonRpcResponse);
    });
  }
}
