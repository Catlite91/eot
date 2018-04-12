"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable */
const path = require("path");
const Koa = require("koa");
const Router = require("koa-router");
const _ = require("lodash");
const bodyParser = require("koa-bodyparser");
const moment = require("moment");
const container_1 = require("./container");
const eot_core_1 = require("eot-core");
const constant_1 = require("./constant");
// import {
//   init,
//   initProvider
// } from './dubbo'
const winston = require("winston");
const DEFAULT_CONFIG_PATH = path.resolve(__dirname, '.', 'conf.json');
const DEFAULT_CONFIG = require(DEFAULT_CONFIG_PATH);
const CURRENT_ENV = process.env.NODE_ENV || 'local';
class Framework {
    constructor(configFile) {
        this.app = new Koa();
        this.router = new Router();
        this.container = container_1.default;
        const config = Object.assign({}, DEFAULT_CONFIG, require(configFile));
        config.__dirname = path.dirname(configFile);
        this._initCoreLogger();
        this.scanner = new eot_core_1.Scanner(config);
    }
    get port() {
        return container_1.default.get('Framework', constant_1.COMPONENT.CONFIG, CURRENT_ENV)['port'];
    }
    get coreLogger() {
        return this.logger;
    }
    _initCoreLogger() {
        if (this.logger) {
            return;
        }
        const logger = new winston.Logger({
            level: 'silly',
            transports: [
                new winston.transports.Console({
                    colorize: true,
                    prettyPrint: true,
                    timestamp: () => moment().format("YYYY-MM-DD HH:mm:ss,SSS")
                })
            ]
        });
        this.logger = logger;
        container_1.default.bindConstantValue(this.logger, constant_1.METADATA.LOGGER, constant_1.METADATA.LOGGER);
    }
    beforeStart() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    afterStart() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    applyRouter() {
        return __awaiter(this, void 0, void 0, function* () {
            const controllers = this.container.getAll(constant_1.COMPONENT.CONTROLLER);
            controllers.forEach(controller => {
                const controllerMetadata = Reflect.getMetadata(constant_1.METADATA.CONTROLLER, controller.constructor);
                const methodMetadataArray = Reflect.getMetadata(constant_1.METADATA.CONTROLLER_METHOD, controller);
                const parameterMetadataArray = Reflect.getMetadata(constant_1.METADATA.CONTROLLER_PARAMETER, controller);
                const { prefix } = controllerMetadata;
                methodMetadataArray.forEach(methodMetadata => {
                    const { method, path: path2, key } = methodMetadata;
                    const args = _.filter(parameterMetadataArray, item => item.key === key);
                    const route = path.resolve(`/${prefix}/${path2}`);
                    this.router[method](route, controller[key].bind(controller, ...args));
                });
            });
            this.app
                .use(bodyParser())
                .use(this.router.routes())
                .use(this.router.allowedMethods());
        });
    }
    // order? 如何知道自己应该是什么顺序, 可以利用toposort
    applyMiddleware() {
        return __awaiter(this, void 0, void 0, function* () {
            const middlewares = this.container.getAll(constant_1.COMPONENT.MIDDLEWARE) || [];
            const applyMiddlewares = middlewares.sort((a, b) => {
                const _a = Reflect.getMetadata(constant_1.COMPONENT.MIDDLEWARE, a.constructor);
                const _b = Reflect.getMetadata(constant_1.COMPONENT.MIDDLEWARE, b.constructor);
                return _a.order > _b.order ? 1 : -1;
            });
            for (const middleware of applyMiddlewares) {
                yield middleware['init'].apply(middleware);
                this.app.use(middleware['doFilter'].bind(middleware));
            }
        });
    }
    applyDubboPovider() {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.info('[framework:dubbo] start init dubbo');
            const start = Date.now();
            // await init()
            this.logger.info(`[framework:dubbo] init dubbo ${Date.now() - start}ms`);
            // await initProvider()
            this.logger.info('[framework:dubbo] init dubbo succesfully');
        });
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.beforeStart();
            // await this.applyDubboPovider()
            yield this.applyMiddleware();
            yield this.applyRouter();
            yield this.app.listen(this.port);
            yield this.afterStart();
        });
    }
}
exports.default = Framework;
