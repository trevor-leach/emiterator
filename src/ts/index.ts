import { EventEmitter } from "node:events";
import { TypedEmitter, ListenerSignature, DefaultListener } from "tiny-typed-emitter";
import { type EventMap } from "typed-emitter";
type TypedEventEmitter<Events extends EventMap> = import("typed-emitter").default<Events>;

/**
 * The type yielded on each iteration of the AsyncGenerator.
 * @template L Mapping of event names to associated listener signatures.
 * @template U The subset of event names for which elements will be yielded
 *             during iteration.
 * @example
 * ```typescript
 * {
 *      event: 'data',           // Event name
 *      args:  ['Hello, World!'] // Values passed to listener
 * }
 * ```
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
 * Behind the scenes, listeners are registered for each event specified.
 * They are removed when any of the `doneEvents` or `throwEvents` are emitted.
 *
 * @template L Mapping of event names to associated listener signatures.
 *             Defaults to `{ [k: string]: (...args: any[]) => any; }`
 * @template DataEvent The names of events that will be iterated over.
 * @template DoneEvent The names of the events that signal iteration is done.
 *           E.g. 'end' | 'finish'
 * @template ThrowEvent The names of events that signal an error. E.g. 'error'.
 *
 * @param emitter The EventEmitter.  If emitter is a TypedEmitter, then the
 *        elements yielded by the AsyncGenerator will typed accordingly.
 * @param dataEvents Events that will be yielded by the AsyncGenerator.
 * @param doneEvents Events that signal the end of iteration.
 * @param throwEvents Events that will cause the iterator to throw.
 *        To handle these events yourself, add them to `dataEvents` instead.
 * @returns An AsyncGenerator that yields objects with string `event` and tuple
 *        `args` properties that map to what would otherwise be emitter's
 *         dataEvents and associated listener function arguments.
 *         I.e. `on(event, (...args)=>{...})`
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
    let reject:  (reason?: any)  => void;
    let promise = new Promise<boolean>((...args) => [resolve, reject] = args);
    const listeners: Map<keyof L, DefaultListener[string][]> = new Map();

    const addListener = (event: keyof L, listener: DefaultListener[string]) => { //@ts-ignore
        emitter.on(event, listener);
        let eventListeners = listeners.get(event);
        if (null == eventListeners) {
            eventListeners = [];
            listeners.set(event, eventListeners);
        }
        eventListeners.push(listener);
    };

    const removeListeners = () => listeners.forEach((eventListeners, event) =>
        eventListeners.forEach(eventListener => //@ts-ignore
            emitter.removeListener(event, eventListener)));

    for (const dataEvent of dataEvents) {
        addListener(dataEvent, (...args: Parameters<L[typeof dataEvent]>): any => {
            results.push({event: dataEvent, args});
            resolve(true);
            promise = new Promise<boolean>((...args) => [resolve, reject] = args);
        });
    }

    for (const doneEvent of doneEvents) {
        addListener(doneEvent, (..._args: Parameters<L[typeof doneEvent]>): any => {
            removeListeners();
            resolve(false);
        });
    }

    for (const throwEvent of throwEvents) {
        addListener(throwEvent, (...errs: Parameters<L[typeof throwEvent]>): any => {
            removeListeners();
            const err = null == errs?.[0] ? new Error(String(throwEvent)) : errs[0];
            reject(err);
        });
    }

    while(await promise) {
        yield* results;
        results = [];
    }
}