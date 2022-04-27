import { Action, Middleware, State } from "natur";
import {
  castDraft,
  createDraft,
  Draft,
  finishDraft,
  isDraft,
  isDraftable,
  enablePatches,
  Patch,
  applyPatches,
  original,
} from "immer";

enablePatches();

export const isPromise = <T>(obj: any): obj is Promise<T> =>
  obj && typeof obj.then === "function";

export const thunkMiddleware: Middleware<any> =
  ({ getState, getMaps, dispatch }) =>
  (next) =>
  (record) => {
    if (typeof record.state === "function") {
      let draftCache: Draft<any>[] = [];

      const applyPatchesToState = <T extends any = any>(
        draftList: Draft<T>[]
      ) => {
        let patches: Patch[][] = [];
        draftList
          .filter((i) => isDraft(i))
          .forEach((i) => finishDraft(i, (p) => patches.push(p)));
        const nowState = getState();
        const finalState = patches.reduce(
          (res, patch) => applyPatches(res, patch),
          nowState
        );
        return finalState;
      };

      const _finishDraft = (s: any) => {
        let _s = s;
        if (draftCache.length >= 1 && _s === undefined) {
          return applyPatchesToState(draftCache);
        }
        // this is setState case, possibly
        if (draftCache.length >= 1 && _s !== undefined) {
          draftCache = draftCache.filter((i) => i !== _s);
        }
        if (isDraft(_s)) {
          return applyPatchesToState([_s]);
        } else if (!!_s && draftCache.length) {
          applyPatchesToState(draftCache);
          return _s;
        }
        return _s;
      };

      const setState = (s: State) => {
        return next({
          ...record,
          state: _finishDraft(s),
        });
      };
      const _dispatch = (action: string, ...arg: any[]) => {
        if (/^\w+\/\w+$/.test(action)) {
          const moduleName = action.split("/")[0];
          const actionName = action.split("/").slice(1).join("/");
          return dispatch(moduleName, actionName, ...arg);
        }
        return dispatch(record.moduleName, action, ...arg);
      };
      const _getState = () => {
        const s = getState();
        if (isDraftable(s)) {
          const ds = createDraft(s);
          draftCache.push(ds);
          return ds;
        } else {
          console.warn(
            `natur-immer: ${record.moduleName}/${record.actionName} state can not use immer!`
          );
        }
        return s;
      };
      const ns = record.state({
        getState: _getState,
        setState,
        getMaps,
        dispatch: _dispatch,
      });
      if (isPromise<ReturnType<Action>>(ns)) {
        return (ns as Promise<ReturnType<Action>>).then((ns) => {
		  const res = _finishDraft(ns);
          if (ns === undefined && res === getState()) {
            next({
              ...record,
              state: res,
            });
            return;
          }
          return next({
            ...record,
            state: res,
          });
        });
      }
      const res = _finishDraft(ns);
      if (ns === undefined && res === getState()) {
        next({
          ...record,
          state: res,
        });
        return;
      }
      return next({
        ...record,
        state: res,
      });
    }
    return next(record);
  };
