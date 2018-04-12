"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const java = require('js-to-java');
class TypeConverter {
    constructor() {
        this.schemas = {};
    }
    loadMeta(pkgs) {
        pkgs.forEach((schemas) => {
            if (!schemas) {
                return;
            }
            schemas.forEach((klass) => {
                if (!klass || !klass.fields) {
                    return;
                }
                const schema = {};
                klass.fields.forEach((f) => {
                    schema[f.name] = f.type;
                });
                this.schemas[klass.fullName] = schema;
            });
        });
    }
    getDTOSchema(className) {
        return this.schemas[className];
    }
    isDTO(type) {
        return type.endsWith('DTO') || this.getDTOSchema(type);
    }
    makeDto(type, entity) {
        const schema = this.getDTOSchema(type.name);
        if (!schema) {
            return entity;
        }
        if (!entity) {
            return null;
        }
        const result = {};
        Object.keys(entity).forEach(key => {
            result[key] = schema[key]
                ? this.makeField(schema[key], entity[key])
                : entity[key];
        });
        return result;
    }
    makeField(type, value) {
        if (value && value.$class !== undefined && value.$ !== undefined) {
            return value;
        }
        if (type.isArray) {
            return this.isDTO(type.name)
                ? java.array(type.name, (value || []).map((v) => this.makeDto(type, v)))
                : java.array(type.name, value);
        }
        if (type.isGeneric) {
            if (type.generics.length > 1) {
                console.warn(`i can't resolve this multiple generic: ${type.name}`);
                return java(type.name, value);
            }
            const generic = type.generics[0];
            const isDTO = this.isDTO(generic.name);
            const field = Array.isArray(value)
                ? java(type.name, value.map(v => isDTO
                    ? java(generic.name, this.makeDto(generic, v))
                    : java(generic.name, v)))
                : java(type.name, value);
            // java(type.name, isDTO ? java(generic.name, this.makeDto(generic, value)) : java(generic.name, value))
            return field;
        }
        return this.isDTO(type.name)
            ? java(type.name, this.makeDto(type, value))
            : java(type.name, value);
    }
    methodParameterTransformerFactory(...types) {
        return (args) => args.map((v, i) => this.makeField(types[i], v));
    }
}
exports.TypeConverter = TypeConverter;
function overloadMethodFindPredicateFactory(serviceIdentifier, methodName, args) {
    switch (`${serviceIdentifier}.${methodName}`) {
        // 特殊情况无法判断参数类别，例如int和long等
        // case 'com.dianwoba.optimus.coupon.provider.user.UserCouponQueryProvider.getAllUserCouponPage':
        //   return function (paramTypes: JavaType[]): boolean {
        //     if (Array.isArray(args[2]) !== paramTypes[2].isArray) return false;
        //     return true;
        //   };
        default:
            return function (paramTypes) {
                // fix me
                for (let i = 0; i < paramTypes.length; i++) {
                    if (
                    /* Array */
                    Array.isArray(args[i]) !== paramTypes[i].isArray ||
                        /* others */
                        false) {
                        return false;
                    }
                }
                return true;
            };
    }
}
exports.overloadMethodFindPredicateFactory = overloadMethodFindPredicateFactory;
