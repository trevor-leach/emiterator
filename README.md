# emiterator

Turn node's [EventEmitters](https://nodejs.org/api/events.html#class-eventemitter) into [AsyncGenerators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AsyncGenerator).  This allows you to use the `for await...of` loop instead of
writing event listener functions.

For example, to iterate through text stream:

```typescript
import { createReadStream } from 'node:fs';
import { emiterator } from 'emiterator';

let iterator = emiterator(
    createReadStream('file.txt', 'utf-8'),
    ['data'],
    ['end']
);

for await (let chunk of iterator) {
     // chunk is { event: 'data', args: [string] }
     console.log(`Received ${chunk.args[0].length} bytes of data.`);
}
```
###### _Note: this example is unnecessary in practice; Since node 10 a Readable can be iterated directly._
<br/>

The module exports a single [async generator function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function*) named 'emiterator'.
Both ESM and commonJs modules are included, so either `require` or `import` should work:
```javascript
import { emiterator } from 'emiterator'; // ESM
const  { emiterator } = require('emiterator'); // commonJs
```

## Strong TypeScript Support
```typescript
/**
 * Makes an AsyncGenerator from an EventEmitter.
 * Behind the scenes, listeners are registered for each event specified.
 * They are removed when any of the `doneEvents` or `throwEvents` are emitted.
 *
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
export async function *emiterator(
    emitter:     EventEmitter,
    dataEvents:  string[],
    doneEvents:  string[],
    throwEvents: string[] = []
): AsyncGenerator<{event: string, args: any[]}, void, undefined> {...}
```
###### _Note: Simplified typing shown. The typing is much more useful when using a typed emitter interface.  See below._
<br/>

If `emitter` implements one of the types from
[tiny-typed-emitter](https://www.npmjs.com/package/tiny-typed-emitter) or
[typed-emitter](https://www.npmjs.com/package/typed-emitter),
then elements that are yielded each iteration will be typed accordingly:

```typescript
interface ItemCounterEventListeners {
    item:  (s:string) => any
    count: (n:number) => any
    done:  () => any
}
const emitter: TypedEmitter<ItemCounterEventListeners> = getCounter();

const iterator = emiterator(
    emitter,
    ['item', 'count'],
    ['done']
);

for await (let e of iterator) {
    // here, e is {event: 'item', args: [string]} | {event: 'count', args: [number]}
    if ('count' == event) {
        // your IDE should show e.args is a [number] here...
    }
}
```