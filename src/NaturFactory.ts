import { ITP } from './middlewares';
import { Maps, NaturBaseFactory, State } from 'natur';

export class NaturFactory extends NaturBaseFactory {
	/**
	 * build a actions creator
	 * @param state state of module
	 * @param maps maps of module(optional)
	 * @returns return a actions creator
	 */
	static actionsCreator<S extends State, M extends Maps = Maps>(state: S, maps?: M) {
		function createActions<
			A extends Record<
				string,
				| ((...args: any[]) => (p: ITP<S, M extends Maps ? M : Maps>) => Partial<S> | void | Promise<Partial<S> | void>)
				| ((...args: any[]) => Partial<S> | void | Promise<Partial<S> | void>)
			>,
		>(actions: A) {
			return actions;
		}
		return createActions;
	}
}
