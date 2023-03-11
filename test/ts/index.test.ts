import { emiterator } from '@src/index.js';
import { EventEmitter } from 'node:events';
import { nextTick } from 'node:process';
import { TypedEmitter } from 'tiny-typed-emitter';
import { type EventMap } from "typed-emitter";
type TypedEventEmitter<Events extends EventMap> = import("typed-emitter").default<Events>;

interface MyEventSigs extends EventMap {
    string: (s:string) => any
    number: (n:number) => any
    strnum: (s:string, n:number) => any
    error:  (e?: Error) => any
    done: () => any
};

describe('emiterator', () => {

    describe('error', () => {

        test('data', async () => {
            const emitter = new TypedEmitter<MyEventSigs>();
            const error = new Error('test error. please ignore.');
            const actual: any[][] = [];
            nextTick(()=> {
                emitter.emit('string', 'foo');
                emitter.emit('number', 1337);
                emitter.emit('error', error);
                emitter.emit('done');
            });

            const iterator = emiterator(
                emitter,
                ['string', 'error'],
                ['done']
            );

            for await (let e of iterator) {
                actual.push(e.args);
            }

            expect(actual).toEqual([['foo'], [error]]);
            expect(emitter.listenerCount('string')).toBe(0);
            expect(emitter.listenerCount('error')).toBe(0);
            expect(emitter.listenerCount('done')).toBe(0);
        });

        test('throws', async () => {
            const emitter = new TypedEmitter<MyEventSigs>();
            const error = new Error('test error. please ignore.');
            const actual: any[][] = [];
            nextTick(()=> {
                emitter.emit('number', 1337);
                emitter.emit('string', 'foo');
                emitter.emit('error', error);
                emitter.emit('done');
            });

            const iterator = emiterator(
                emitter,
                ['number'],
                ['done'],
                ['error']
            );

            await expect(async () => {
                for await (let e of iterator) {
                    actual.push(e.args);
                }
            }).rejects.toThrow(error)

            expect(actual).toEqual([[1337]]);
            expect(emitter.listenerCount('number')).toBe(0);
            expect(emitter.listenerCount('error')).toBe(0);
            expect(emitter.listenerCount('done')).toBe(0);
        });

        test('throws_nothing', async () => {
            const emitter = new TypedEmitter<MyEventSigs>();
            const actual: any[][] = [];
            nextTick(()=> {
                emitter.emit('number', 1337);
                emitter.emit('string', 'foo');
                emitter.emit('error');
                emitter.emit('done');
            });

            const iterator = emiterator(
                emitter,
                ['number'],
                ['done'],
                ['error']
            );

            await expect(async () => {
                for await (let e of iterator) {
                    actual.push(e.args);
                }
            }).rejects.toThrow('error')

            expect(actual).toEqual([[1337]]);
            expect(emitter.listenerCount('number')).toBe(0);
            expect(emitter.listenerCount('error')).toBe(0);
            expect(emitter.listenerCount('done')).toBe(0);
        });
    });

    test('EventEmitter', async () => {
        const emitter = new EventEmitter();
        nextTick(()=> {
            emitter.emit('string', 'foo');
            emitter.emit('number', 1337);
            emitter.emit('done');
        });

        const actual: any[][] = [];

        const iterator = emiterator(
            emitter,
            ['string', 'number'],
            ['done']
        );

        for await (let e of iterator) {
            actual.push(e.args);

            if (e.event == 'string') {
                let a = e.args;
            }
        }

        expect(actual).toEqual([['foo'], [1337]]);
        expect(emitter.listenerCount('number')).toBe(0);
        expect(emitter.listenerCount('string')).toBe(0);
        expect(emitter.listenerCount('done')).toBe(0);
    });

    test('TypedEmitter', async () => {
        const emitter = new TypedEmitter<MyEventSigs>();

        nextTick(()=> {
            emitter.emit('string', 'foo');
            emitter.emit('number', 1337);
            emitter.emit('strnum', 'bar', 42);
            emitter.emit('done');
        });

        const actual: any[][] = [];
        let actualNum = NaN;
        emitter.on('number', n => actualNum = n);

        const iterator = emiterator(
            emitter,
            ['string', 'strnum'],
            ['done']
        );

        for await (let e of iterator) {
            actual.push(e.args);

            if (e.event == 'string') {
                let a = e.args[0];
            }
        }

        expect(actualNum).toBe(1337);
        expect(actual).toEqual([['foo'],['bar', 42]]);
        expect(emitter.listenerCount('number')).toBe(1);
        expect(emitter.listenerCount('string')).toBe(0);
        expect(emitter.listenerCount('strnum')).toBe(0);
        expect(emitter.listenerCount('done')).toBe(0);
    });

    test('TypedEventEmitter', async () => {
        const emitter = new EventEmitter() as TypedEventEmitter<MyEventSigs>;

        nextTick(()=> {
            emitter.emit('string', 'foo');
            emitter.emit('number', 1337);
            emitter.emit('strnum', 'bar', 42);
            emitter.emit('done');
        });

        const actual: any[][] = [];

        const iterator = emiterator(
            emitter,
            ['string', 'strnum'],
            ['done']
        );

        for await (let e of iterator) {
            actual.push(e.args);

            if (e.event == 'strnum') {
                let a = e.args;
            }
        }

        expect(actual).toEqual([['foo'],['bar', 42]]);
        expect(emitter.listenerCount('string')).toBe(0);
        expect(emitter.listenerCount('strnum')).toBe(0);
        expect(emitter.listenerCount('done')).toBe(0);
    });
});