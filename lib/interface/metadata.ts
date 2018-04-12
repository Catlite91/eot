/* tslint:disable */
export interface BaseMetadata {
}

export interface ControllerMetadata extends BaseMetadata {
  prefix: string
}

export interface ControllerMethodMetadata extends BaseMetadata {
  method: string
  path: string
  key: string
}

export interface ControllerParameterMetadata extends BaseMetadata {
  name: string
  index: number
  key: string
  type: string
  option?: any
  valid?: any
}

export interface ControllerParameterValidMetadata extends BaseMetadata {
  index: number
  key: string
  rule: any
}

export interface MiddlewareMetadata extends BaseMetadata {
  key: string
  order?: number
}

export interface ConfigMetadata extends BaseMetadata {
  env: string
}
