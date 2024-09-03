# Solid.js Virtualized List Wrapper

A helpful wrapper around `@tanstack/solid-virtual` that simplifies the creation of virtualized lists in Solid.js applications while maintaining full access to the underlying virtualizer's power.

## Features

- Simplifies the setup of virtualized lists
- Automatically generates `root` and `container` props
- Provides extra information for each item (e.g., `isLast`, `isEven`)
- Automatically determines the count based on your data
- Maintains full access to all `@tanstack/solid-virtual` features

## Installation

```bash
npm install create-virtualized-list-solid
```

## Basic Usage

```jsx
import { createVirtualizedList } from 'create-virtualized-list-solid';
import { For } from 'solid-js';

const MyList = () => {
  const items = () => Array.from({ length: 10000 }, (_, i) => `Item ${i + 1}`);

  const virtualList = createVirtualizedList({
    data: items,
  });

  return (
    <div {...virtualList.root}>
      <div {...virtualList.container}>
        <For each={virtualList.item}>
          {virtualList.items((item) => (
            <div {...item.props}>
              {item.data} 
              {item.virtualItem.isLast && ' (Last Item)'}
              {item.virtualItem.isEven && ' (Even Index)'}
            </div>
          ))}
        </For>
      </div>
    </div>
  )
}
```

## API

### `createVirtualizedList(args)`

Creates a virtualized list wrapper.

#### Parameters

`args`: An object that extends `VirtualizerOptions` from `@tanstack/solid-virtual` with additional properties:

- `data`: Function returning an array of items to be rendered
- `itemHeight`: (Optional) Fixed height for items
- `width`: (Optional) Width of the list container
- `height`: (Optional) Height of the list container
- `rootProps`: (Optional) Additional props for the root element
- `containerProps`: (Optional) Additional props for the container element
- `itemProps`: (Optional) Additional props for each item element

All other `VirtualizerOptions` are also accepted and passed through to the underlying virtualizer.

#### Returns

An object with the following properties:

- `root`: Getter function for root element props
- `container`: Getter function for container element props
- `items`: Function to create item wrappers with extra info
- `virtualizer`: The underlying `@tanstack/solid-virtual` instance
- `id`: Unique identifier for the list
- `count`: Getter function for total item count (automatically determined)
- `item`: Getter function for virtual items (alias for `virtualizer.getVirtualItems()`)



## Advanced Usage

You can access all features of `@tanstack/solid-virtual` through the `virtualizer` property:

```jsx
const virtualList = createVirtualizedList({
  data: items,
  // ... other options
})

// Use any @tanstack/solid-virtual method
virtualList.virtualizer.scrollToIndex(50)
```

## TypeScript Support

This wrapper is written in TypeScript and provides full type definitions:

```typescript
interface MyItem {
  id: number;
  name: string;
}

const virtualList = createVirtualizedList<MyItem>({
  data: () => myItems,
  // ... other options
})
```

## Requirements

- Solid.js
- @tanstack/solid-virtual


## Contributing
Contributions are welcome! Feel free to open issues or submit pull requests.

## License

This project is licensed under the MIT License.