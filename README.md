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
npm install @doeixd/create-virtualized-list-solid
```

## Basic Usage

```jsx
import { createVirtualizedList } from '@doeixd/create-virtualized-list-solid';
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

## Why is this hepful?

### Root and Container Elements

In a virtualized list, two key elements are required:

1. **Root Element**: This is the scrollable viewport. It determines the visible area of the list.
2. **Container Element**: This is a tall element that provides the full scrollable height/width of the list.

Manually setting up these elements with the correct properties can be tedious and error-prone. Our wrapper generates the necessary props for both elements, ensuring:

- Correct sizing and positioning
- Proper event handling for virtualization
- Consistent styling defaults

By using `{...vList.root}` and `{...vList.container}`, you automatically apply all necessary properties without having to manage them yourself.

### The `list.items` Helper

The `list.items` helper is a function that wraps each item in your list, providing:

- Correct positioning within the container
- Access to the virtual item data
- Additional useful properties like `isLast` and `isEven`

This helper simplifies the rendering of each item and provides a consistent interface for working with your list data.

### Before and After Comparison

Here's how the wrapper simplifies your code:

#### Before (using @tanstack/solid-virtual directly):

```jsx
import { createVirtualizer } from '@tanstack/solid-virtual';
import { createSignal, For } from 'solid-js';

const VirtualList = () => {
  const [listItems] = createSignal(Array.from({ length: 10000 }, (_, i) => `Item ${i}`));
  const [parentRef, setParentRef] = createSignal(null);

  const virtualizer = createVirtualizer({
    count: listItems().length,
    getScrollElement: () => parentRef(),
    estimateSize: () => 35,
    overscan: 5,
  });

  return (
    <div 
      ref={setParentRef} 
      style={{
        height: '400px', 
        overflow: 'auto'
      }}
    >
      <div 
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%', 
          position: 'relative'
        }}
      >
        <For each={virtualizer.getVirtualItems()}>
          {(virtualRow) => (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {listItems()[virtualRow.index]}
            </div>
          )}
        </For>
      </div>
    </div>
  );
};
```

#### After (using our wrapper):

```jsx
import { createVirtualizedList } from '@doeixd/solid-virtualized-list-wrapper';
import { For } from 'solid-js';

const VirtualList = () => {
  const listItems = () => Array.from({ length: 10000 }, (_, i) => `Item ${i}`);

  const vList = createVirtualizedList({
    data: listItems,
  });

  return (
    <div {...vList.root}>
      <div {...vList.container}>
        <For each={vList.item}>
          {vList.items((item) => (
            <div {...item.props}>{item.data}</div>
          ))}
        </For>
      </div>
    </div>
  );
};
```

As you can see, the wrapper:

1. Eliminates the need to manually set up the virtualizer
2. Automatically generates necessary props for root and container elements
3. Provides a simpler interface for rendering items
4. Handles positioning and styling of items internally
5. Reduces boilerplate and potential for errors

By abstracting these details, the wrapper allows you to focus on your list content rather than the complexities of virtualization.

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


## Releases

`npm run release -- --release-as minor` for a minor version bump
`npm run release -- --release-as major` for a major version bump
`npm run release -- --prerelease` for a prerelease version