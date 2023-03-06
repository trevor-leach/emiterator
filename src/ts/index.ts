import { EventEmitter } from "node:events";
import { TypedEmitter, ListenerSignature, DefaultListener } from "tiny-typed-emitter";
import { type EventMap } from "typed-emitter";
type TypedEventEmitter<Events extends EventMap> = import("typed-emitter").default<Events>;

/**
 * The type yielded on each iteration of the AsyncGenerator.
 * @param event one of the specified data events.
 * @param args  the arguments passed to the `event` listener funtion.
 */
export type Element<L extends ListenerSignature<L>, U extends keyof L> = {
    [U in keyof L]: {event:U, args: Parameters<L[U]>};
}[U];

/**
 * Makes an AsyncGenerator from an EventEmitter.  
 * ```typescript
 * import { createReadStream } from 'node:fs';
 * import { emiterator } from 'emiterator';
 * 
 * let iterator = emiterator(
 *     createReadStream('file.txt', 'utf-8'),
 *     ['data'],
 *     ['end']
 * );
 * 
 * for await (let chunk of iterator) {
 *      // chunk is { event: 'data', args: [string] }
 *      console.log(`Received ${chunk.args[0].length} bytes of data.`);
 * }
 * ```
 * @param emitter The EventEmitter.  If emitter is a TypedEmitter, then the
 *        elements yielded by the AsyncGenerator will typed accordingly.
 * @param dataEvents Events that will be yielded by the AsyncGenerator.
 * @param doneEvents Events that signal the end of iteration.
 * @param throwEvents Events that will cause the iterator to throw.
 *        To handle these events yourself, add them to `dataEvents` instead.
 * @yields Union of objects with string `event` and tuple `args` properties
 *         that map to what would otherwise be emitter's registered listener
 *         functions for doneEvents. I.e. `on(event, (...args)=>{...})`
 */
export async function *emiterator<
    DataEvent  extends keyof L,
    DoneEvent  extends keyof L,
    ThrowEvent extends keyof L,
    L extends ListenerSignature<L> = DefaultListener
> (
    emitter:     TypedEmitter<L> | TypedEventEmitter<L> | EventEmitter,
    dataEvents:  DataEvent[],
    doneEvents:  DoneEvent[],
    throwEvents: ThrowEvent[] = []
): AsyncGenerator<Element<L, DataEvent>, void, undefined> {

    let results: Element<L, DataEvent>[] = [];
    let resolve: (more: boolean) => void;
    let reject: (reason?: any) => void;
    let promise = new Promise<boolean>((...args) => [resolve, reject] = args);

    for (const dataEvent of dataEvents) { //@ts-ignore
        emitter.on(dataEvent, (...args: Parameters<L[typeof dataEvent]>): any => {
            results.push({event: dataEvent, args});
            resolve(true);
            promise = new Promise<boolean>((...args) => [resolve, reject] = args);
        });
    }

    for (const doneEvent of doneEvents) { //@ts-ignore
        emitter.on(doneEvent, (..._args: Parameters<L[typeof doneEvent]>): any => {
            resolve(false);
        });
    }

    for (const throwEvent of throwEvents) { //@ts-ignore
        emitter.on(throwEvent, (...errs: Parameters<L[typeof throwEvent]>): any => {
            const err = null == errs?.[0] ? new Error(String(throwEvent)) : errs[0];
            reject(err);
        });
    }

    while(await promise) {
        yield* results;
        results = [];
    }
}