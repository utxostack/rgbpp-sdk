import { Injectable, Logger } from '@nestjs/common';
import { HttpAdapterHost, ModulesContainer } from '@nestjs/core';
import { JSONRPCServer, SimpleJSONRPCMethod } from 'json-rpc-2.0';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { JsonRpcMetadataKey, JsonRpcMethodMetadataKey } from './json-rpc.decorators';
import { JsonRpcConfig } from './json-rpc.module';

@Injectable()
export class JsonRpcServer {
  private server: JSONRPCServer;
  private logger = new Logger(JsonRpcServer.name);

  constructor(
    private httpAdapterHost: HttpAdapterHost,
    private modulesContainer: ModulesContainer,
  ) {
    this.server = new JSONRPCServer();

    const handlers = this.getRegisteredHandlers();
    handlers.forEach((handler, name) => {
      this.logger.log(`Registering JSON-RPC method: ${name}`);
      this.server.addMethod(name, handler);
    });
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

      const methodNames = Object.getOwnPropertyNames(Object.getPrototypeOf(instance));
      methodNames.forEach((methodName) => {
        const methodMetadata = Reflect.getMetadata(JsonRpcMethodMetadataKey, instance[methodName]);
        if (!methodMetadata) {
          return;
        }
        const name = `${metadata.name}.${methodMetadata.name ?? methodName}`;
        const handler = instance[methodName].bind(instance);
        rpcHandlers.set(name, handler);
      });
    });
    return rpcHandlers;
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
