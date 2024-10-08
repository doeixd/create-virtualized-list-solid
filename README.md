# Solid.js Virtualized List Wrapper

A helpful wrapper around `@tanstack/solid-virtual` that simplifies the creation of virtualized lists in Solid.js apps while maintaining full access to the underlying virtualizer.

## Features

- Simplifies the setup of virtualized lists
- Automatically generates `root` and `container` props
- Provides extra information for each item (e.g., `isLast`, `isEven`)
- Automatically determines the count based on your data
- Maintains full access to all `@tanstack/solid-virtual` features
- Includes a higher-level `VirtualizedList` component for simple use cases

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

## VirtualizedList Component

For simple use cases we provide a `VirtualizedList` component

```jsx
import { VirtualizedList } from '@doeixd/create-virtualized-list-solid';

const MyList = () => {
  const items = Array.from({ length: 10000 }, (_, i) => `Item ${i + 1}`);

  return (
    <VirtualizedList
      data={items}
      height={400}
      width={300}
      renderItem={({ item, virtualItem }) => (
        <div style={{ 
          padding: '10px',
          background: virtualItem.isEven ? '#f0f0f0' : 'white'
        }}>
          {item}
          {virtualItem.isLast && ' (Last Item)'}
        </div>
      )}
    />
  );
};
```
The `VirtualizedList` component simplifies the creation of virtualized lists even further, handling all the setup and providing a clean interface for rendering items.

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

### `VirtualizedList<T>(props)`

Creates a simple generic virtualized list component.

#### Props

- `data`: Array of items to be rendered
- `renderItem`: Function to render each item
- `height`: Height number of pixels for the list container
- `width`: Width number of pixels for the list container
- `className`: Optional CSS class for the list container
- `style`: Optional inline styles for the list container

All other props from `VirtualizerOptions` are also accepted and passed through to the underlying virtualizer.



## Advanced Usage

### Accessing the virtualizer
You can access all features of `@tanstack/solid-virtual` through the `virtualizer` property:

```jsx
const virtualList = createVirtualizedList({
  data: items,
  // ... other options
})

// Use any @tanstack/solid-virtual method
virtualList.virtualizer.scrollToIndex(50)
```
### Reactivity

#### Item rendering
In the `virtualList.items` function we allow you to provide a boolean representing whether or not you'd like reactivity inside the callback function for item rendering, allowing you to balance performance and reactivity based on your specific needs.

##### How it works
You can now specify whether each item should track changes and re-render, or use the default untracked behavior for maximum performance.
```tsx
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
          ), true)} {/* Set to true to enable change tracking */}
        </For>
      </div>
    </div>
  )
}
```
By setting the second parameter of `virtualList.items` to true, you enable change tracking for that item. This allows the item to react to changes in its data or properties, at the cost of some performance.

##### When to use change tracking
For items that need to update frequently based on external state
When implementing dynamic content that changes after initial render
For interactive elements within list items

##### When to use untracked rendering (default)
For static content that doesn't change after initial render
When optimizing for maximum performance with large lists
For simple, non-interactive list items

This hybrid approach allows you to fine-tune the balance between performance and reactivity in your virtualized lists.

#### Virtualizer 
The `createVirtualizedList` function is designed to be reactive to changes in its options and data. Here's how reactivity is handled for the virtualizer:

1. **Options Reactivity**: 
   The virtualizer options are wrapped in a `createMemo`, which means they will automatically update if any reactive dependencies change. This includes changes to the `data` function, `count`, or any other option passed to `createVirtualizedList`.

   ```jsx
   const [itemHeight, setItemHeight] = createSignal(50);
   const virtualList = createVirtualizedList({
     data: items,
     estimateSize: () => itemHeight()
   });

   // Later, updating itemHeight will cause the virtualizer to update
   setItemHeight(75);
   ```

2. **Data Changes**:
   If your `data` function is reactive (e.g., it's based on a signal or store), changes to the underlying data will automatically be reflected in the virtualizer.

   ```jsx
   const [items, setItems] = createSignal([...]);
   const virtualList = createVirtualizedList({
     data: items
   });

   // Later, updating items will cause the virtualizer to update
   setItems([...newItems]);
   ```

3. **Manual Updates**:
   In some cases, you might need to manually trigger an update of the virtualizer. You can do this by accessing the underlying virtualizer instance:

   ```jsx
   virtualList.virtualizer.measure();  // Force remeasure all items
   virtualList.virtualizer.getVirtualItems();  // Force recalculation of virtual items
   ```

4. **Resize Handling**:
   The virtualizer automatically handles window resize events. If you're using a custom container and its size changes, you might need to manually notify the virtualizer:

   ```jsx
   window.addEventListener('custom-resize', () => {
     virtualList.virtualizer.measure();
   });
   ```

By leveraging Solid.js's fine-grained reactivity system, `createVirtualizedList` ensures that your virtualized lists stay up-to-date and performant, even as the underlying data or configuration changes. This reactive approach allows you to create dynamic, responsive lists without manually managing updates to the virtualizer.

## TypeScript Support

This wrapper is written in TypeScript and provides type definitions:

```tsx
interface MyItem {
  id: number;
  name: string;
}

const virtualList = createVirtualizedList<MyItem>({
  data: () => myItems,
  // ... other options
})
```

```tsx
interface MyItem {
  id: number;
  name: string;
}

const MyList = () => {
  const items: MyItem[] = [/* ... */];

  return (
    <VirtualizedList<MyItem>
      data={items}
      height={400}
      width={300}
      renderItem={({ item }) => <div>{item.name}</div>}
      determineKey={(item) => item.id}
    />
  );
};
```

## Requirements

- Solid.js
- @tanstack/solid-virtual


## Contributing
Contributions are welcome! Feel free to open issues or submit pull requests.

## License

This project is licensed under the MIT License.

