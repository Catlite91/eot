/* tslint:disable */
import * as fs from 'fs'
import * as path from 'path'
import * as assert from 'assert'
import * as cluster from 'cluster'
import * as asyncBusboy from 'async-busboy'
import { IFramework } from './framework'
import ClusterClient from 'node-cluster-client'

// import * as Validator from 'validator'
import Util from './util'

import container from './container'
import {
  COMPONENT,
  METADATA,
  CLUSTER,
} from './constant'

import {
  ControllerMetadata,
  ControllerMethodMetadata,
  ControllerParameterMetadata,
  ControllerParameterValidMetadata,
  MiddlewareMetadata,
  ConfigMetadata
} from './interface/metadata'
import { Aspect } from './interface/component'
import { appendFile } from 'fs';

export type FrameworkMethodDecorator = (target: any, key: string, result?: any) => any
export type FrameworkClassDecorator = (target: any) => any

const CURRENT_ENV = process.env.NODE_ENV || 'local'

function _addControllerMetadata(target: any, controllerMethodMetadata: ControllerMethodMetadata) {
  const controllerMethodMetadataArray: Array<ControllerMethodMetadata> = Reflect.getMetadata(METADATA.CONTROLLER_METHOD, target) || []
  controllerMethodMetadataArray.push(controllerMethodMetadata)
  Reflect.defineMetadata(METADATA.CONTROLLER_METHOD, controllerMethodMetadataArray, target)
}

function _addControllerParameterMetadata(target: any, controllerParameterMetadata: ControllerParameterMetadata) {
  // find controller parameter valid metadata
  const controllerParameterValidMetadataArray: Array<ControllerParameterValidMetadata> = Reflect.getMetadata(METADATA.CONTROLLER_PARAMETER_VALID, target) || []
  for (const controllerParameterValidMetadata of controllerParameterValidMetadataArray) {
    if (controllerParameterValidMetadata.index === controllerParameterMetadata.index &&
      controllerParameterValidMetadata.key === controllerParameterMetadata.key) {
      controllerParameterMetadata.valid = controllerParameterValidMetadata.rule
      break
    }
  }
  const controllerParameterMetadataArray: Array<ControllerParameterMetadata> = Reflect.getMetadata(METADATA.CONTROLLER_PARAMETER, target) || []
  controllerParameterMetadataArray.unshift(controllerParameterMetadata)
  Reflect.defineMetadata(METADATA.CONTROLLER_PARAMETER, controllerParameterMetadataArray, target)
}

function _addControllerParameterValidMetadata(target: any, controllerParameterValidMetadata: ControllerParameterValidMetadata) {
  // attach to the controller parameter metadata
  const controllerParameterMetadataArray: Array<ControllerParameterMetadata> = Reflect.getMetadata(METADATA.CONTROLLER_PARAMETER, target) || []
  for (const controllerParameterMetadata of controllerParameterMetadataArray) {
    if (controllerParameterMetadata.index === controllerParameterValidMetadata.index &&
      controllerParameterValidMetadata.key === controllerParameterValidMetadata.key) {
      controllerParameterMetadata.valid = controllerParameterValidMetadata.rule
      break
    }
  }
  const controllerParameterValidMetadataArray: Array<ControllerParameterValidMetadata> = Reflect.getMetadata(METADATA.CONTROLLER_PARAMETER_VALID, target) || []
  controllerParameterValidMetadataArray.unshift(controllerParameterValidMetadata)
  Reflect.defineMetadata(METADATA.CONTROLLER_PARAMETER_VALID, controllerParameterValidMetadataArray, target)
}

function _injectOrBind(target: any, type: string | symbol, option?: any, tagged?: any): FrameworkClassDecorator | any {
  if (!option) { option = { lazy: false } }
  if (typeof target === 'function') {
    return container.bind(target, type, tagged)
  } else {
    const name = target
    return option.lazy ?
      container.lazyInject(name, type, tagged) :
      container.inject(name, type, tagged)
  }
}

export function Controller(prefix: string = ''): FrameworkClassDecorator {
  return function (target: any): any {
    const controllerMetadata: ControllerMetadata = { prefix }
    Reflect.defineMetadata(METADATA.CONTROLLER, controllerMetadata, target)
    return _injectOrBind(target, COMPONENT.CONTROLLER)
  }
}

export function All(path: string): FrameworkMethodDecorator {
  return function (target: any, key: string) {
    _addControllerMetadata(target, { method: 'all', path, key })
  }
}

export function Get(path: string): FrameworkMethodDecorator {
  return function (target: any, key: string) {
    _addControllerMetadata(target, { method: 'get', path, key })
  }
}

export function Post(path: string): FrameworkMethodDecorator {
  return function (target: any, key: string) {
    _addControllerMetadata(target, { method: 'post', path, key })
  }
}

export function Put(path: string): FrameworkMethodDecorator {
  return function (target: any, key: string) {
    _addControllerMetadata(target, { method: 'put', path, key })
  }
}

export function Service(target: any, option?: any): any {
  return _injectOrBind(target, COMPONENT.SERVICE, option)
}

export function Middleware(target: any, option?: any) {
  const middlewareMetadata: MiddlewareMetadata = Reflect.getMetadata(COMPONENT.MIDDLEWARE, target) || { key: target.name, order: Number.MAX_SAFE_INTEGER }
  Reflect.defineMetadata(COMPONENT.MIDDLEWARE, middlewareMetadata, target)
  return _injectOrBind(target, COMPONENT.MIDDLEWARE, option)
}

export function Order(order: number) {
  return function (target: any) {
    const middlewareMetadata: MiddlewareMetadata = { key: target.name, order }
    return Reflect.defineMetadata(COMPONENT.MIDDLEWARE, middlewareMetadata, target)
  }
}

export function Module(target: any, option?: any): any {
  return _injectOrBind(target, COMPONENT.MODULE, option)
}

// TODO, 了解下aspect的用法
export function Aspect(option?: any): FrameworkClassDecorator {
  return (target: any): any => {
    return _injectOrBind(target, COMPONENT.ASPECT, option)
  }
}

export function Config(target: any, option?: any): any {
  let configMetadata: ConfigMetadata = { env: CURRENT_ENV }

  if (typeof target === 'function') {
    configMetadata = Reflect.getMetadata(METADATA.CONFIG, target) || {}
  }

  // if(configMetadata.env !== CURRENT_ENV) return false
  if (configMetadata.env === CURRENT_ENV) {
    return _injectOrBind(target, COMPONENT.CONFIG, option, configMetadata.env)
  }
}

export function ModuleConfig(module: any, moduleOption?: any) {
  return function (target: any, option?: any) {
    const configMetadata = Reflect.getMetadata(METADATA.CONFIG, target) || {}
    if (configMetadata.env !== CURRENT_ENV) { return }
    // inject config
    Config.call(this, target, option)
    // let instance = new module(new target())
    let instance
    if (moduleOption && moduleOption.cluster) {
      instance = new ClusterClient(module).create(new target())
    } else {
      instance = new module(new target())
    }
    // bind module instance to container
    container.bindConstantValue(instance, COMPONENT.MODULE, target.name)
  }
}

export function Profile(env: string): FrameworkClassDecorator {
  return function (target: any) {
    const configMetadata: ConfigMetadata = { env }
    Reflect.defineMetadata(METADATA.CONFIG, configMetadata, target)
  }
}

export function ResponseBody(target: any, key: string, result: any): any {
  const origin = result.value
  result.value = new Proxy(origin, {
    async apply(fn, ctx, args) {
      // for koa
      const koa_next = args[args.length - 1]
      const koa_context = args[args.length - 2]
      const koa_context_request = koa_context.request
      const {
        files: koa_context_form_request_files = [],
        fields: koa_context_form_request_fields = {},
      } = (typeof koa_context.headers === 'object' && (/multipart\/form-data/.test(koa_context.headers['content-type']) || /application\/x-www-form-urlencoded/.test(koa_context.headers['content-type']))) ? await asyncBusboy(koa_context.req) : {}
      const koa_context_form_request = Object.assign(
        koa_context_form_request_fields,
        koa_context_form_request_files.reduce((result, item) => {
          if (result[item.fieldname]) {
            if (Array.isArray(result[item.fieldname])) {
              result[item.fieldname].push(item)
            } else {
              result[item.fieldname] = [result[item.fieldname]]
              result[item.fieldname].push(item)
            }
          } else {
            result[item.fieldname] = item
          }
          return result
        }, {}))
      const invalidParameters = []
      const _args = args.map(item => {
        let value
        if (item === koa_next || item === koa_context) { return item }
        if (!item.type) {
          value = item.name ? koa_context[item.name] : koa_context
        } else if (item.type === 'body') {
          value = item.name ? koa_context_request[item.type][item.name] : koa_context_request[item.type]
        } else if (item.type === 'form') {
          value = item.name ? koa_context_form_request[item.name] : koa_context_form_request
        } else {
          value = item.name ? koa_context[item.type][item.name] : koa_context[item.type]
        }
        const option = item.option
        if (option) {
          option.required && !value && invalidParameters.push(item.name)
        }
        return value
      })
      try {
        if (invalidParameters.length > 0) {
          throw new Error(`Invalid parameter: ${invalidParameters}`)
        }
        koa_context.body = {
          status: 'ok',
          data: await fn.apply(ctx, _args),
          message: null
        }
      } catch (e) {
        // console.error(e)
        koa_context.body = {
          status: 'error',
          data: null,
          message: e.message
        }
      }
    }
  })
  return result
}

export function RequestHeader(name: string, option?: any) {
  return function (target: any, key: string, index: number) {
    _addControllerParameterMetadata(target, {
      name,
      index,
      key,
      type: 'header',
      option
    })
  }
}

export function Request(name: string, option?: any) {
  return function (target: any, key: string, index: number) {
    _addControllerParameterMetadata(target, {
      name,
      index,
      key,
      type: null,
      option
    })
  }
}

export function RequestBody(name: string, option?: any) {
  return function (target: any, key: string, index: number) {
    _addControllerParameterMetadata(target, {
      name,
      index,
      key,
      type: 'body',
      option
    })
  }
}

export function RequestForm(name: string, option?: any) {
  return function (target: any, key: string, index: number) {
    _addControllerParameterMetadata(target, {
      name,
      index,
      key,
      type: 'form',
      option
    })
  }
}

export function RequestQuery(name: string, option?: any) {
  return function (target: any, key: string, index: number) {
    _addControllerParameterMetadata(target, {
      name,
      index,
      key,
      type: 'query',
      option
    })
  }
}

export function RequestPath(name: string, option?: any) {
  return function (target: any, key: string, index: number) {
    _addControllerParameterMetadata(target, {
      name,
      index,
      key,
      type: 'params',
      option
    })
  }
}

export function Valid(rule: any) {
  return function (target: any, key: string, index: number) {
    _addControllerParameterValidMetadata(target, {
      index,
      key,
      rule
    })
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
  }
}

export function Application(target: IFramework) {
  // console.log(`========== Current env: ${CURRENT_ENV} ==========`)
  let dirname: string = path.dirname(process.mainModule.filename)
  let root = path.resolve(dirname, 'conf.json')
  while (!fs.existsSync(root)) {
    assert(dirname !== path.sep, `${root} doesn't exist`)
    root = path.resolve(root, '..')
  }
  const application = new target(root)
  process.nextTick(() => {
    const start = Date.now()
    application
      .run()
      .then(() => {
        application.coreLogger.info(`[framework:application] started: ${Date.now() - start}ms`)
      })
      .catch(e => {
        application.coreLogger.error(e)
        process.exit(1)
      })
    // }
  })
}
