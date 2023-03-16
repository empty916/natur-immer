
export type Obj = {[p: string]: any};

export const isObject = <T = Obj>(obj: any): obj is T => typeof obj === 'object' && obj !== null && obj.constructor === Object;

export const isPromise = <T>(obj: any): obj is Promise<T> =>
  obj && typeof obj.then === "function";

export const warning = (string: string) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(string);
  }
}

export interface traverseObjectHandler {
    (
      target: any,
      arg: { key: string | number | undefined; path: (string | number)[]; parent: any },
    ): void;
  }
  
/**
 * 遍历对象或者数组
 * @param json 
 * @param handler 
 */
 export function traverseObject<T extends any | any[]>(json: T, handler: traverseObjectHandler) {
    const loopFn = ({
      target,
      parent,
      key,
      path = [],
    }: {
      target: any;
      key: string | number | undefined;
      parent: any;
      path: (string | number)[];
    }) => {
      handler(target, { key, path, parent });
      if (Array.isArray(target)) {
        target.forEach((i, index) =>
          loopFn({
            target: i,
            parent: target,
            key: index,
            path: [...path, index],
          }),
        );
      } else if (isObject(target)) {
        Object.keys(target).forEach((k) => {
          loopFn({
            target: (target as any)[k],
            parent: target,
            key: k,
            path: [...path, k],
          });
        });
      }
    };
    loopFn({
      target: json,
      parent: undefined,
      key: undefined,
      path: [],
    });
  }