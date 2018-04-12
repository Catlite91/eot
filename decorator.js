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
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const asyncBusboy = require("async-busboy");
const node_cluster_client_1 = require("node-cluster-client");
const container_1 = require("./container");
const constant_1 = require("./constant");
const CURRENT_ENV = process.env.NODE_ENV || 'local';
function _addControllerMetadata(target, controllerMethodMetadata) {
    const controllerMethodMetadataArray = Reflect.getMetadata(constant_1.METADATA.CONTROLLER_METHOD, target) || [];
    controllerMethodMetadataArray.push(controllerMethodMetadata);
    Reflect.defineMetadata(constant_1.METADATA.CONTROLLER_METHOD, controllerMethodMetadataArray, target);
}
function _addControllerParameterMetadata(target, controllerParameterMetadata) {
    // find controller parameter valid metadata
    const controllerParameterValidMetadataArray = Reflect.getMetadata(constant_1.METADATA.CONTROLLER_PARAMETER_VALID, target) || [];
    for (const controllerParameterValidMetadata of controllerParameterValidMetadataArray) {
        if (controllerParameterValidMetadata.index === controllerParameterMetadata.index &&
            controllerParameterValidMetadata.key === controllerParameterMetadata.key) {
            controllerParameterMetadata.valid = controllerParameterValidMetadata.rule;
            break;
        }
    }
    const controllerParameterMetadataArray = Reflect.getMetadata(constant_1.METADATA.CONTROLLER_PARAMETER, target) || [];
    controllerParameterMetadataArray.unshift(controllerParameterMetadata);
    Reflect.defineMetadata(constant_1.METADATA.CONTROLLER_PARAMETER, controllerParameterMetadataArray, target);
}
function _addControllerParameterValidMetadata(target, controllerParameterValidMetadata) {
    // attach to the controller parameter metadata
    const controllerParameterMetadataArray = Reflect.getMetadata(constant_1.METADATA.CONTROLLER_PARAMETER, target) || [];
    for (const controllerParameterMetadata of controllerParameterMetadataArray) {
        if (controllerParameterMetadata.index === controllerParameterValidMetadata.index &&
            controllerParameterValidMetadata.key === controllerParameterValidMetadata.key) {
            controllerParameterMetadata.valid = controllerParameterValidMetadata.rule;
            break;
        }
    }
    const controllerParameterValidMetadataArray = Reflect.getMetadata(constant_1.METADATA.CONTROLLER_PARAMETER_VALID, target) || [];
    controllerParameterValidMetadataArray.unshift(controllerParameterValidMetadata);
    Reflect.defineMetadata(constant_1.METADATA.CONTROLLER_PARAMETER_VALID, controllerParameterValidMetadataArray, target);
}
function _injectOrBind(target, type, option, tagged) {
    if (!option) {
        option = { lazy: false };
    }
    if (typeof target === 'function') {
        return container_1.default.bind(target, type, tagged);
    }
    else {
        const name = target;
        return option.lazy ?
            container_1.default.lazyInject(name, type, tagged) :
            container_1.default.inject(name, type, tagged);
    }
}
function Controller(prefix = '') {
    return function (target) {
        const controllerMetadata = { prefix };
        Reflect.defineMetadata(constant_1.METADATA.CONTROLLER, controllerMetadata, target);
        return _injectOrBind(target, constant_1.COMPONENT.CONTROLLER);
    };
}
exports.Controller = Controller;
function All(path) {
    return function (target, key) {
        _addControllerMetadata(target, { method: 'all', path, key });
    };
}
exports.All = All;
function Get(path) {
    return function (target, key) {
        _addControllerMetadata(target, { method: 'get', path, key });
    };
}
exports.Get = Get;
function Post(path) {
    return function (target, key) {
        _addControllerMetadata(target, { method: 'post', path, key });
    };
}
exports.Post = Post;
function Put(path) {
    return function (target, key) {
        _addControllerMetadata(target, { method: 'put', path, key });
    };
}
exports.Put = Put;
function Service(target, option) {
    return _injectOrBind(target, constant_1.COMPONENT.SERVICE, option);
}
exports.Service = Service;
function Middleware(target, option) {
    const middlewareMetadata = Reflect.getMetadata(constant_1.COMPONENT.MIDDLEWARE, target) || { key: target.name, order: Number.MAX_SAFE_INTEGER };
    Reflect.defineMetadata(constant_1.COMPONENT.MIDDLEWARE, middlewareMetadata, target);
    return _injectOrBind(target, constant_1.COMPONENT.MIDDLEWARE, option);
}
exports.Middleware = Middleware;
function Order(order) {
    return function (target) {
        const middlewareMetadata = { key: target.name, order };
        return Reflect.defineMetadata(constant_1.COMPONENT.MIDDLEWARE, middlewareMetadata, target);
    };
}
exports.Order = Order;
function Module(target, option) {
    return _injectOrBind(target, constant_1.COMPONENT.MODULE, option);
}
exports.Module = Module;
// TODO, 了解下aspect的用法
function Aspect(option) {
    return (target) => {
        return _injectOrBind(target, constant_1.COMPONENT.ASPECT, option);
    };
}
exports.Aspect = Aspect;
function Config(target, option) {
    let configMetadata = { env: CURRENT_ENV };
    if (typeof target === 'function') {
        configMetadata = Reflect.getMetadata(constant_1.METADATA.CONFIG, target) || {};
    }
    // if(configMetadata.env !== CURRENT_ENV) return false
    if (configMetadata.env === CURRENT_ENV) {
        return _injectOrBind(target, constant_1.COMPONENT.CONFIG, option, configMetadata.env);
    }
}
exports.Config = Config;
function ModuleConfig(module, moduleOption) {
    return function (target, option) {
        const configMetadata = Reflect.getMetadata(constant_1.METADATA.CONFIG, target) || {};
        if (configMetadata.env !== CURRENT_ENV) {
            return;
        }
        // inject config
        Config.call(this, target, option);
        // let instance = new module(new target())
        let instance;
        if (moduleOption && moduleOption.cluster) {
            instance = new node_cluster_client_1.default(module).create(new target());
        }
        else {
            instance = new module(new target());
        }
        // bind module instance to container
        container_1.default.bindConstantValue(instance, constant_1.COMPONENT.MODULE, target.name);
    };
}
exports.ModuleConfig = ModuleConfig;
function Profile(env) {
    return function (target) {
        const configMetadata = { env };
        Reflect.defineMetadata(constant_1.METADATA.CONFIG, configMetadata, target);
    };
}
exports.Profile = Profile;
function ResponseBody(target, key, result) {
    const origin = result.value;
    result.value = new Proxy(origin, {
        apply(fn, ctx, args) {
            return __awaiter(this, void 0, void 0, function* () {
                // for koa
                const koa_next = args[args.length - 1];
                const koa_context = args[args.length - 2];
                const koa_context_request = koa_context.request;
                const { files: koa_context_form_request_files = [], fields: koa_context_form_request_fields = {}, } = (typeof koa_context.headers === 'object' && (/multipart\/form-data/.test(koa_context.headers['content-type']) || /application\/x-www-form-urlencoded/.test(koa_context.headers['content-type']))) ? yield asyncBusboy(koa_context.req) : {};
                const koa_context_form_request = Object.assign(koa_context_form_request_fields, koa_context_form_request_files.reduce((result, item) => {
                    if (result[item.fieldname]) {
                        if (Array.isArray(result[item.fieldname])) {
                            result[item.fieldname].push(item);
                        }
                        else {
                            result[item.fieldname] = [result[item.fieldname]];
                            result[item.fieldname].push(item);
                        }
                    }
                    else {
                        result[item.fieldname] = item;
                    }
                    return result;
                }, {}));
                const invalidParameters = [];
                const _args = args.map(item => {
                    let value;
                    if (item === koa_next || item === koa_context) {
                        return item;
                    }
                    if (!item.type) {
                        value = item.name ? koa_context[item.name] : koa_context;
                    }
                    else if (item.type === 'body') {
                        value = item.name ? koa_context_request[item.type][item.name] : koa_context_request[item.type];
                    }
                    else if (item.type === 'form') {
                        value = item.name ? koa_context_form_request[item.name] : koa_context_form_request;
                    }
                    else {
                        value = item.name ? koa_context[item.type][item.name] : koa_context[item.type];
                    }
                    const option = item.option;
                    if (option) {
                        option.required && !value && invalidParameters.push(item.name);
                    }
                    return value;
                });
                try {
                    if (invalidParameters.length > 0) {
                        throw new Error(`Invalid parameter: ${invalidParameters}`);
                    }
                    koa_context.body = {
                        status: 'ok',
                        data: yield fn.apply(ctx, _args),
                        message: null
                    };
                }
                catch (e) {
                    // console.error(e)
                    koa_context.body = {
                        status: 'error',
                        data: null,
                        message: e.message
                    };
                }
            });
        }
    });
    return result;
}
exports.ResponseBody = ResponseBody;
function RequestHeader(name, option) {
    return function (target, key, index) {
        _addControllerParameterMetadata(target, {
            name,
            index,
            key,
            type: 'header',
            option
        });
    };
}
exports.RequestHeader = RequestHeader;
function Request(name, option) {
    return function (target, key, index) {
        _addControllerParameterMetadata(target, {
            name,
            index,
            key,
            type: null,
            option
        });
    };
}
exports.Request = Request;
function RequestBody(name, option) {
    return function (target, key, index) {
        _addControllerParameterMetadata(target, {
            name,
            index,
            key,
            type: 'body',
            option
        });
    };
}
exports.RequestBody = RequestBody;
function RequestForm(name, option) {
    return function (target, key, index) {
        _addControllerParameterMetadata(target, {
            name,
            index,
            key,
            type: 'form',
            option
        });
    };
}
exports.RequestForm = RequestForm;
function RequestQuery(name, option) {
    return function (target, key, index) {
        _addControllerParameterMetadata(target, {
            name,
            index,
            key,
            type: 'query',
            option
        });
    };
}
exports.RequestQuery = RequestQuery;
function RequestPath(name, option) {
    return function (target, key, index) {
        _addControllerParameterMetadata(target, {
            name,
            index,
            key,
            type: 'params',
            option
        });
    };
}
exports.RequestPath = RequestPath;
function Valid(rule) {
    return function (target, key, index) {
        _addControllerParameterValidMetadata(target, {
            index,
            key,
            rule
        });
        // const controllerParameterMetadataArray: ControllerParameterMetadata[] = Reflect.getMetadata(METADATA.CONTROLLER_PARAMETER, target)
        // console.log(controllerParameterMetadataArray)
        // console.log(valid, key, index)
        // for (let i = 0; i < controllerParameterMetadataArray.length; i++) {
        //   const controllerParameterMetadata: ControllerParameterMetadata = controllerParameterMetadataArray[i]
        //   if (controllerParameterMetadata.key === key && controllerParameterMetadata.index === index) {
        //     console.log(controllerParameterMetadata)
        //     console.log(valid, key, index)
        //     // controllerParameterMetadata.valid = valid
        //     break
        //   }
        // }
    };
}
exports.Valid = Valid;
function Application(target) {
    // console.log(`========== Current env: ${CURRENT_ENV} ==========`)
    let dirname = path.dirname(process.mainModule.filename);
    let root = path.resolve(dirname, 'conf.json');
    while (!fs.existsSync(root)) {
        assert(dirname !== path.sep, `${root} doesn't exist`);
        root = path.resolve(root, '..');
    }
    const application = new target(root);
    process.nextTick(() => {
        const start = Date.now();
        application
            .run()
            .then(() => {
            application.coreLogger.info(`[framework:application] started: ${Date.now() - start}ms`);
        })
            .catch(e => {
            application.coreLogger.error(e);
            process.exit(1);
        });
        // }
    });
}
exports.Application = Application;
