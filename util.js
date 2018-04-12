"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable */
class Util {
    static formatValidateParam(param) {
        let result, method, option;
        if (typeof param === 'string') {
            result = this._getResult(param);
            method = result ? param : this._getMethod(param);
        }
        else if (typeof param === 'object') {
            result = this._getResult(param[0]);
            method = result ? param[0] : this._getMethod(param[0]);
            option = param[1];
        }
        return {
            result,
            method,
            option
        };
    }
    static formatSanitizerParam(param) {
        let method, option;
        if (typeof param === 'string') {
            method = param;
        }
        else if (Array.isArray(param)) {
            method = param[0];
            option = param[1];
        }
        return {
            method,
            option
        };
    }
    static _getResult(str) {
        return !str.startsWith('!');
    }
    static _getMethod(str) {
        return str.replace('!', '');
    }
}
exports.default = Util;
function makeDeferred() {
    let resolve, reject;
    const promise = new Promise(function (_resolve, _reject) {
        resolve = _resolve;
        reject = _reject;
    });
    return {
        resolve, reject, promise
    };
}
exports.makeDeferred = makeDeferred;
