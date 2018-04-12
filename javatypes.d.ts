export interface JavaType {
    name: string;
    isPrimitive?: boolean;
    isExtenal?: boolean;
    isEnum?: boolean;
    isArray?: boolean;
    isGeneric?: boolean;
    generics?: JavaType[];
}
export declare class TypeConverter {
    schemas: any;
    constructor();
    loadMeta(pkgs: any[]): void;
    getDTOSchema(className: string): any;
    isDTO(type: string): any;
    makeDto(type: any, entity: any): any;
    makeField(type: any, value: any): any;
    methodParameterTransformerFactory(...types: JavaType[]): (args: any[]) => any[];
}
export declare function overloadMethodFindPredicateFactory(serviceIdentifier: string, methodName: string, args: any[]): (paramTypes: JavaType[]) => boolean;
