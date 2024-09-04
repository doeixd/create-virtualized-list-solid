/**
 * @module @doeixd/create-virtualized-list-solid
 * A Solid.js library for creating efficient virtualized lists.
 */

/**
 * Creates a virtualized list with advanced configuration options.
 * 
 * @example
 * ```tsx
 * import { createVirtualizedList } from '@doeixd/create-virtualized-list-solid';
 * import { For } from 'solid-js';
 * 
 * const MyList = () => {
 *   const items = () => Array.from({ length: 10000 }, (_, i) => `Item ${i + 1}`);
 * 
 *   const virtualList = createVirtualizedList({
 *     data: items,
 *     estimateSize: () => 30,
 *     overscan: 5
 *   });
 * 
 *   return (
 *     <div {...virtualList.root}>
 *       <div {...virtualList.container}>
 *         <For each={virtualList.item}>
 *           {virtualList.items((item) => (
 *             <div {...item.props}>{item.data}</div>
 *           ))}
 *         </For>
 *       </div>
 *     </div>
 *   );
 * };
 * ```
 */
export { createVirtualizedList } from './createVirtualizedList';

/**
 * A ready-to-use virtualized list component with a simplified API.
 * 
 * @example
 * ```tsx
 * import { VirtualizedList } from '@doeixd/create-virtualized-list-solid';
 * 
 * const MyList = () => {
 *   const items = Array.from({ length: 10000 }, (_, i) => `Item ${i + 1}`);
 * 
 *   return (
 *     <VirtualizedList
 *       data={items}
 *       height={400}
 *       width={300}
 *       itemHeight={30}
 *       renderItem={({ item, index }) => (
 *         <div>{item}</div>
 *       )}
 *     />
 *   );
 * };
 * ```
 */
export { VirtualizedList } from './VirtualizedList'

import createVirtualizedList from './createVirtualizedList';
import { VirtualizedList } from './VirtualizedList'

/**
 * Default export object containing both the createVirtualizedList function and the VirtualizedList component.
 * 
 * @example
 * ```tsx
 * import VirtualizedListLib from '@doeixd/create-virtualized-list-solid';
 * 
 * // Using createVirtualizedList
 * const MyCustomList = () => {
 *   const items = () => Array.from({ length: 10000 }, (_, i) => `Item ${i + 1}`);
 *   const virtualList = VirtualizedListLib.createVirtualizedList({ data: items });
 *   // ... rest of the component
 * };
 * 
 * // Using VirtualizedList component
 * const MySimpleList = () => {
 *   const items = Array.from({ length: 10000 }, (_, i) => `Item ${i + 1}`);
 *   return (
 *     <VirtualizedListLib.VirtualizedList
 *       data={items}
 *       height={400}
 *       width={300}
 *       renderItem={({ item }) => <div>{item}</div>}
 *     />
 *   );
 * };
 * ```
 */
export default {
  createVirtualizedList,
  VirtualizedList
}