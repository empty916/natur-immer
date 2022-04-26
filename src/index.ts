import { Action, Middleware, State } from 'natur';
import { castDraft, createDraft, Draft, finishDraft, isDraft, isDraftable } from 'immer';


export const isPromise = <T>(obj: any): obj is Promise<T> => obj && typeof obj.then === 'function'

export const thunkMiddleware: Middleware<any> = ({getState, getMaps, dispatch}) => next => record => {
	if (typeof record.state === 'function') {
		let draftCache: {s: any, ds: any}[] = [];

		const _finishDraft = (s: any) => {
			let _s = s;
			if (Array.isArray(draftCache) && draftCache.length > 1 && _s === undefined) {
				console.error(`natur-immer: you may forgeted returning state`);
				return _s;
			}
			if (Array.isArray(draftCache) && draftCache.length >= 1 && _s !== undefined) {
				draftCache = draftCache.filter(i => i.ds !== _s);
			}
			if (Array.isArray(draftCache) && draftCache.length === 1 && _s === undefined) {
				const item = draftCache.pop()!;
				_s = item.ds;
				if (isDraft(_s)) {
					const ns = finishDraft(_s);
					// 如果没有返回state，但是有获取过state，并且state没有发生改变，那么就返回undefined
					if (ns === item.s) {
						return undefined;
					}
					return ns;
				}
			}
			if (isDraft(_s)) {
				return finishDraft(_s);
			}
			return _s;
		}

		const setState = (s: State) => {
            return next({
                ...record,
                state: _finishDraft(s),
            });
        };
		const _dispatch = (action: string, ...arg: any[]) => {
			if (/^\w+\/\w+$/.test(action)) {
				const moduleName = action.split('/')[0];
				const actionName = action.split('/').slice(1).join('/');
				return dispatch(moduleName, actionName, ...arg);
			}
			return dispatch(record.moduleName, action, ...arg);
		}
        const _getState = () => {
			const s = getState();
            if (isDraftable(s)) {
				const ds = createDraft(s);
				draftCache.push({
					s: s,
					ds: ds,
				});
                return ds;
            } else {
				console.warn(`natur-immer: ${record.moduleName}/${record.actionName} state can not use immer!`);
			}
            return s;
        }
        const ns = record.state({
            getState: _getState,
            setState,
            getMaps,
            dispatch: _dispatch
        });
		if (isPromise<ReturnType<Action>>(ns)) {
			return (ns as Promise<ReturnType<Action>>)
				.then(ns => next({
					...record,
					state: _finishDraft(ns),
				}));
		}
		return next({
			...record,
			state: _finishDraft(ns),
		});
	}
	return next(record);
}