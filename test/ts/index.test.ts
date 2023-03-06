import { emiterator } from '@src/index.js';
import { EventEmitter } from 'node:events';
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
            setImmediate(()=> {
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
        });

        test('throws', async () => {
            const emitter = new TypedEmitter<MyEventSigs>();
            const error = new Error('test error. please ignore.');
            const actual: any[][] = [];
            setImmediate(()=> {
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
        });

        test('throws_nothing', async () => {
            const emitter = new TypedEmitter<MyEventSigs>();
            const actual: any[][] = [];
            setImmediate(()=> {
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
        });
    });

    test('EventEmitter', async () => {
        const emitter = new EventEmitter();
        setImmediate(()=> {
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
    });

    test('TypedEmitter', async () => {
        const emitter = new TypedEmitter<MyEventSigs>();
        
        setImmediate(()=> {
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

            if (e.event == 'string') {
                let a = e.args;
            }
        }

        expect(actual).toEqual([['foo'],['bar', 42]]);
    });

    test('TypedEventEmitter', async () => {
        const emitter = new EventEmitter() as TypedEventEmitter<MyEventSigs>;
        
        setImmediate(()=> {
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
    });
});