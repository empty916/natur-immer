import { thunkMiddleware, ImmerThunkParams } from './../src/index';
import { createStore } from 'natur';
import {
    ThunkParams,
    promiseMiddleware,
    fillObjectRestDataMiddleware,
    shallowEqualMiddleware, 
    filterUndefinedMiddleware,
} from 'natur/dist/middlewares';


let id = 1;

const mockFetchTodo = () => new Promise<{name: string; status: number, id: number}[]>(res => res([
    {
        name: 'play game',
        status: 0,
        id: id++,
    },
    {
        name: 'work task1',
        status: 0,
        id: id++,
    }
]));

const mockFetchTodo2 = () => new Promise<
    {
        name: string;
        status: number,
        id: number
    }[]
>(res => setTimeout(() => {
    res([
        {
            name: 'play game',
            status: 0,
            id: id++,
        },
        {
            name: 'work task1',
            status: 0,
            id: id++,
        }
    ])
}, Math.random() * 1500));

const _createStore = () => {
    const state = {
        name: 'tom',
        age: 10,
        deepAge: {
            age: 10,
        },
        todo: [
            {
                name: 'study english',
                status: 0,
                id: 0,
            }
        ]
    };
    type State = typeof state;
    const actions = {
        updateAge: (age: number) => ({setState}: ImmerThunkParams<State>) => {
            return setState(s => {
                s.age = age;
            });;
        },
        updateAgeAsync: (age: number) => ({setState}: ImmerThunkParams<State>) => {
            return setState(async s => {
                await new Promise(res => setTimeout(res, 100));
                s.deepAge.age = age;
            });;
        },
        fetchTodo: () => async ({setState}: ImmerThunkParams<State>) => {
            const res = await mockFetchTodo();
            return setState(s => {
                s.todo.push(...res);
            })
        },
        fetchTodoWithoutReturn: () => async ({setState}: ImmerThunkParams<State>) => {
            const res = await mockFetchTodo();
            setState(s => {
                s.todo.push(...res);
            })
        },
    }
    return createStore({
        user: {
            state,
            actions,
        }
    }, {}, {
        middlewares: [
            thunkMiddleware, // action支持返回函数，并获取最新数据
            promiseMiddleware, // action支持异步操作
            fillObjectRestDataMiddleware, // 增量更新/覆盖更新
            shallowEqualMiddleware, // 新旧state浅层对比优化
            filterUndefinedMiddleware, // 过滤无返回值的action
        ]
    })
}

let store = _createStore();

beforeEach(() => {
    id = 1;
    store = _createStore();
});

test('sync', () => {
    const user = store.getModule('user');
    user.actions.updateAge(1);
    expect(user.state).not.toEqual(store.getModule('user').state);
    expect(store.getModule('user').state.age).toBe(1);

    user.actions.updateAge(2);
    user.actions.updateAge(3);
    user.actions.updateAge(4);

    expect(store.getModule('user').state.age).toBe(4);
});



test('async setState', async () => {
    const user = store.getModule('user');
    await user.actions.updateAgeAsync(11);
    expect(store.getModule('user').state.deepAge).not.toBe(user.state.deepAge);
    expect(store.getModule('user').state.deepAge.age).toBe(11);
});


test('async', async () => {
    const user = store.getModule('user');
    await user.actions.fetchTodo();
    expect(user.state).not.toEqual(store.getModule('user').state);
    expect(store.getModule('user').state.todo[2]).toEqual({
        name: 'work task1',
        status: 0,
        id: 2,
    });

    await user.actions.fetchTodo();
    await user.actions.fetchTodo();
    await user.actions.fetchTodo();
    await user.actions.fetchTodo();
    expect(store.getModule('user').state.todo.at(-1)).toEqual({
        id: id - 1,
        name: 'work task1',
        status: 0,
    });
    expect(store.getModule('user').state.todo.length).toBe(11);
});


test('async paralle', async () => {
    const user = store.getModule('user');
    await user.actions.fetchTodo();
    expect(user.state).not.toEqual(store.getModule('user').state);
    expect(store.getModule('user').state.todo[2]).toEqual({
        name: 'work task1',
        status: 0,
        id: 2
    });
    await Promise.all([
        user.actions.fetchTodo(),
        user.actions.fetchTodo(),
        user.actions.fetchTodo(),
        user.actions.fetchTodo(),
    ]);
    // expect(store.getModule('user').state.todo.at(-1)).toEqual({
    //     id: id - 1,
    //     name: 'work task1',
    //     status: 0,
    // });
    expect(store.getModule('user').state.todo.length).toBe(11);
});

test('return', async () => {
    const user = store.getModule('user');
    const res = await user.actions.fetchTodoWithoutReturn();
    expect(res).toBe(undefined);
});

test('async without return', async () => {
    const user = store.getModule('user');
    await user.actions.fetchTodoWithoutReturn();
    expect(user.state).not.toEqual(store.getModule('user').state);
    expect(store.getModule('user').state.todo[2]).toEqual({
        name: 'work task1',
        status: 0,
        id: 2,
    });

    await user.actions.fetchTodoWithoutReturn();
    await user.actions.fetchTodoWithoutReturn();
    await user.actions.fetchTodoWithoutReturn();
    await user.actions.fetchTodoWithoutReturn();

    expect(store.getModule('user').state.todo.at(-1)).toEqual({
        id: id - 1,
        name: 'work task1',
        status: 0,
    });

    expect(store.getModule('user').state.todo.length).toBe(11);
});

test('async without return in paraller', async () => {
    const user = store.getModule('user');
    await user.actions.fetchTodoWithoutReturn();
    expect(user.state).not.toEqual(store.getModule('user').state);
    expect(store.getModule('user').state.todo[2]).toEqual({
        name: 'work task1',
        status: 0,
        id: 2,
    });

    await Promise.all([
        user.actions.fetchTodoWithoutReturn(),
        user.actions.fetchTodoWithoutReturn(),
        user.actions.fetchTodoWithoutReturn(),
        user.actions.fetchTodoWithoutReturn(),
    ]);

    expect(store.getModule('user').state.todo.length).toBe(11);
    // expect(store.getModule('user').state.todo.at(-1)).toEqual({
    //     id: id - 1,
    //     name: 'work task1',
    //     status: 0,
    // });
});


