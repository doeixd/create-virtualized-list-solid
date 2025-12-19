import type { Accessor } from "solid-js";

/**
 * Chain multiple callback functions together
 * @internal
 */
function chain<Args extends [] | any[]>(
  callbacks: Array<((...args: Args) => any) | undefined>
): (...args: Args) => void {
  return (...args) => {
    for (const callback of callbacks) {
      callback && callback(...args);
    }
  };
}

/**
 * Merge multiple refs into a single ref callback
 * Simplified from @solid-primitives/refs
 */
export function mergeRefs<T>(
  ...refs: Array<T | ((el: T) => void) | undefined>
): (el: T) => void {
  return chain(refs as Array<((el: T) => void) | undefined>);
}

/**
 * Create an ID generator function
 * Based on @kobalte/utils implementation
 */
export function createGenerateId(baseId: Accessor<string>) {
  return (suffix: string) => `${baseId()}-${suffix}`;
}
