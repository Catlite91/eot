/* tslint:disable */
export default class Util {
  public static formatValidateParam(param: string | object): {
    result: boolean
    method: string
    option?: any
  } {
    let result, method, option

    if (typeof param === 'string') {
      result = this._getResult(param)
      method = result ? param : this._getMethod(param)
    } else if (typeof param === 'object') {
      result = this._getResult(param[0])
      method = result ? param[0] : this._getMethod(param[0])
      option = param[1]
    }
    return {
      result,
      method,
      option
    }
  }

  public static formatSanitizerParam(param: string | object): {
    method: string
    option?: any
  } {
    let method, option

    if (typeof param === 'string') {
      method = param
    } else if (Array.isArray(param)) {
      method = param[0]
      option = param[1]
    }
    return {
      method,
      option
    }
  }

  private static _getResult(str: string): boolean {
    return !str.startsWith('!')
  }

  private static _getMethod(str: string): string {
    return str.replace('!', '')
  }
}


export function makeDeferred() {
  let resolve, reject
  const promise = new Promise(function(_resolve, _reject) {
    resolve = _resolve
    reject = _reject
  })
  return {
    resolve, reject, promise
  }
}
