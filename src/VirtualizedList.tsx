import { Component, JSX, For, createMemo, splitProps } from 'solid-js';
import { createVirtualizedList, VirtualizedListArgs, VirtualItemWithExtras, ObjectWithKey, Primitive } from './createVirtualizedList';
import { mergeProps } from 'solid-js';

/**
 * A function type for rendering individual items in the virtualized list.
 * @template T The type of the data item.
 */
type RenderItemFunction<T> = (props: {
  item: T;
  virtualItem: VirtualItemWithExtras;
}) => JSX.Element;

type VirtualListProps<T> = Omit<VirtualizedListArgs<T>, 'data'>;

/**
 * Props for the VirtualizedList component.
 * @template T The type of the data items in the list.
 */
interface VirtualizedListProps<T> extends Omit<VirtualListProps<T>, 'width' | 'height'> {
  /** The array of data items to be rendered in the list. */
  data: T[];
  /** A function that renders each item in the list. */
  renderItem: RenderItemFunction<T>;
  /** The height of the virtualized list container. */
  height?: number;
  /** The width of the virtualized list container. */
  width?: number;
  /** Optional CSS class name for the list container. */
  className?: string;
  /** Optional inline styles for the list container. */
  style?: JSX.CSSProperties;
}

const defaultProps = {
  estimateSize: () => 50,
  overscan: 5,
};

/**
 * A  virtualized list component for Solid.js applications.
 * This component efficiently renders large lists by only rendering the items currently in view.
 *
 * @template T The type of the data items in the list. Must extend Primitive or ObjectWithKey.
 * @param {VirtualizedListProps<T>} userProps - The props for the virtualized list.
 * @returns {JSX.Element} A JSX element representing the virtualized list.
 *
 * @example
 * // Basic usage with an array of strings
 * <VirtualizedList<string>
 *   data={['Item 1', 'Item 2', 'Item 3']}
 *   renderItem={({ item }) => <div>{item}</div>}
 *   height={400}
 *   width={300}
 * />
 *
 * @example
 * // Usage with an array of objects and custom styling
 * interface User { id: number; name: string; }
 * const users: User[] = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
 *
 * <VirtualizedList<User>
 *   data={users}
 *   renderItem={({ item, virtualItem }) => (
 *     <div style={{ background: virtualItem.isEven ? '#f0f0f0' : 'white' }}>
 *       {item.name}
 *     </div>
 *   )}
 *   height={500}
 *   width="100%"
 *   estimateSize={() => 50}
 *   determineKey={(user) => user.id}
 *   className="user-list"
 *   style={{ border: '1px solid #ccc' }}
 * />
 *
 * @example
 * // Usage with dynamic item heights
 * <VirtualizedList<string>
 *   data={longTexts}
 *   renderItem={({ item }) => <div style={{ padding: '10px' }}>{item}</div>}
 *   estimateSize={(index) => longTexts[index].length > 100 ? 100 : 50}
 *   height={600}
 *   width={400}
 * />
 */
export function VirtualizedList<T extends Primitive | ObjectWithKey>(userProps: VirtualizedListProps<T>): JSX.Element {
  const props = mergeProps(defaultProps, userProps);
  const [local, virtualListProps] = splitProps(props, ['data', 'renderItem', 'height', 'width', 'className', 'style']);

  const virtualList = createMemo(() => createVirtualizedList<T>({
    ...virtualListProps,
    data: () => local.data,
    height: local.height,
    width: local.width,
  }));

  return (
    <div 
      {...virtualList().root} 
      style={mergeProps(
        virtualList().root.style,
        local.style
      )}
      class={local.className}
    >
      <div {...virtualList().container}>
        <For each={virtualList().item}>
          {virtualList().items((itemData) => (
            local.renderItem({
              item: itemData.data,
              virtualItem: itemData.virtualItem,
            })
          ))}
        </For>
      </div>
    </div>
  );
}