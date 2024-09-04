import { createVirtualizer, VirtualItem, VirtualizerOptions } from "@tanstack/solid-virtual"
import { createUniqueId, mergeProps, createMemo, createSignal, onMount, untrack, createEffect, on } from "solid-js"
import { mergeRefs, createGenerateId } from "@kobalte/utils"
import { isServer } from "solid-js/web"

export type Primitive = string | number | boolean | null | undefined
export type ObjectWithKey = { [key: string]: any }

export type KeyFunction<T> = (item: T, index?: number) => string | number


export interface VirtualizedListArgs<T, ScrollElement extends Element = Element, ItemElement extends Element = Element> extends Partial<VirtualizerOptions<ScrollElement, ItemElement>> {
  id?: string
  data: () => T[]
  determineKey?: KeyFunction<T>
  itemHeight?: number
  width?: number
  height?: number
  rootProps?: Record<string, any>
  containerProps?: Record<string, any>
  itemProps?: Record<string, any>
}

export interface VirtualItemWithExtras extends VirtualItem {
  isLast: boolean
  isEven: boolean
}

export interface ItemArgs<T> {
  data: T
  props: Record<string, any>
  virtualItem: VirtualItemWithExtras
}

/**
 * Creates a simple virtualized list for solid js
 * 
 * @template T - The type of items in the list. Can be a primitive type or an object with a key.
 * @param {VirtualizedListArgs<T>} args - Configuration options for the virtualized list.
 * @returns {Object} An object containing properties and methods for the virtualized list.
 * 
 * @property {string} id - The unique identifier for the list.
 * @property {Virtualizer<Element, Element>} virtualizer - The underlying virtualizer instance.
 * @property {Record<string, any>} root - Getter for the root element props.
 * @property {number} count - Getter for the total number of items in the list.
 * @property {Record<string, any>} container - Getter for the container element props.
 * @property {(itemCreator: (args: ItemArgs<T>) => any) => (virtualItem: VirtualItem, virtualItemIndex: () => number) => any} items - Function to create wrapper for list items.
 * @property {VirtualItem[]} item - Getter for the array of virtual items.
 * 
 * @example
 * const MyList = () => {
 *   const items = () => ['Item 1', 'Item 2', 'Item 3']
 *   const virtualList = createVirtualizedList({
 *     data: items,
 *     itemHeight: 30,
 *     height: 300,
 *     width: 500,
 *   })
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
 *   )
 * }
 */
export function createVirtualizedList<T extends Primitive | ObjectWithKey>(args: VirtualizedListArgs<T>) {
  const id = () => args.id || createUniqueId()
  const generateId = () => createGenerateId(() => id())

  const data = args.data
  const count = createMemo(() => args?.count ?? data()?.length ?? 0)

  // @ts-expect-error
  const determineKey: () => KeyFunction<T> = createMemo(() => args?.determineKey ?? args?.getItemKey ?? ((item: T, index?: number) => {
    if (typeof item === 'object' && item !== null) {
      return (item as ObjectWithKey)?.id ??
        (item as ObjectWithKey)?.Id ??
        (item as ObjectWithKey)?.ID ??
        (item as ObjectWithKey)?.uuid ??
        (item as ObjectWithKey)?.UUID ??
        (item as ObjectWithKey)?.key ??
        (item as ObjectWithKey)?.sku ??
        index!
    }
    return item as unknown as string | number
  }))

  const horizontal = () => args?.horizontal ?? false

  const [rootElement, setRootElement] = createSignal<Element | null>(null)

  const getScrollElement = () => rootElement()

  const estimateSize = createMemo(() => args?.estimateSize || ((index: number) => args.itemHeight || 50))

  const initialRect = () => ({
    width: args?.width ?? args.initialRect?.width ?? 600,
    height: args?.height ?? args.initialRect?.height ?? 400,
  })

  const measureElement = createMemo(() => {
    if (isServer) return undefined

    if (args.measureElement) return args.measureElement
    if (navigator.userAgent.indexOf('Firefox') === -1) {
      return (element: Element) => {
        return element?.getBoundingClientRect()[horizontal() ? 'width' : 'height']
      }
    }

    return undefined
  })

  const reactiveArgs = createMemo(() => args)

  const options: () => VirtualizerOptions<Element, Element> = createMemo(() => {
    const currentArgs = reactiveArgs()

    return mergeProps({
      get count() {
        return count()
      },
      getScrollElement,
      estimateSize: estimateSize(),
      overscan: currentArgs?.overscan ?? 5,
      horizontal: horizontal(),
      paddingStart: currentArgs?.paddingStart ?? 0,
      paddingEnd: currentArgs?.paddingEnd ?? 10,
      scrollPaddingStart: currentArgs?.scrollPaddingStart ?? 0,
      scrollPaddingEnd: currentArgs?.scrollPaddingEnd ?? 0,
      initialRect: currentArgs?.initialRect ?? initialRect(),
      initialOffset: currentArgs?.initialOffset ?? 0,
      onChange: currentArgs.onChange,
      scrollToFn: currentArgs?.scrollToFn ?? ((offset, { behavior }) => {
        const scrollElement = getScrollElement()
        if (scrollElement) {
          scrollElement.scrollTo({
            [horizontal() ? 'left' : 'top']: offset,
            behavior,
          })
        }
      }),
      observeElementRect: currentArgs?.observeElementRect ?? ((instance, cb) => {
        const scrollElement = getScrollElement()
        if (!scrollElement) return

        const resizeObserver = new ResizeObserver(() => {
          const rect = scrollElement.getBoundingClientRect()
          cb(rect)
        })

        resizeObserver.observe(scrollElement)

        return () => resizeObserver.disconnect()
      }),
      observeElementOffset: currentArgs?.observeElementOffset ?? ((instance, cb) => {
        const scrollElement = getScrollElement()
        if (!scrollElement) return

        const handleScroll = () => {
          const offset = horizontal()
            ? scrollElement.scrollLeft
            : scrollElement.scrollTop
          cb(offset, true)
        }

        scrollElement.addEventListener('scroll', handleScroll, {
          passive: true,
        })

        return () => scrollElement.removeEventListener('scroll', handleScroll)
      }),
      debug: currentArgs?.debug,
      measureElement: measureElement(),
      getItemKey: (index: number) => { return determineKey()(data()[index], index) },
      rangeExtractor: currentArgs?.rangeExtractor,
      scrollMargin: currentArgs?.scrollMargin,
      gap: currentArgs?.gap,
      indexAttribute: currentArgs?.indexAttribute,
      initialMeasurementsCache: currentArgs?.initialMeasurementsCache,
      lanes: currentArgs?.lanes,
      isScrollingResetDelay: currentArgs?.isScrollingResetDelay,
      enabled: currentArgs?.enabled,
      isRtl: currentArgs?.isRtl,
    }, currentArgs)
  }
  )

  const virtualizer = (createVirtualizer(options()))

  createEffect(on(options, () => {
    virtualizer.setOptions(options())
  }, { defer: true }))

  const rootProps = createMemo(() => {
    const defaultStyle = {
      'overflow-y': horizontal() ? 'hidden' : 'auto',
      'overflow-x': horizontal() ? 'auto' : 'hidden',
      position: 'relative',
      height: args?.height ? `${args.height}px` : '400px',
      width: args?.width ? `${args.width}px` : '100%',
    }
    const horizontalAttr = horizontal() ? "" : undefined

    return mergeProps({
      id: id,
      style: defaultStyle,
      "data-horizontal": horizontalAttr,
      "data-list-id": id,
      ref: mergeRefs((el: Element) => setRootElement(el), args.rootProps?.ref),
    }, args.rootProps || {})
  })

  const containerProps = createMemo(() => {
    const containerId = generateId()('list')
    const defaultStyle = {
      position: 'relative',
      height: horizontal() ? '100%' : `${virtualizer.getTotalSize()}px`,
      width: horizontal() ? `${virtualizer.getTotalSize()}px` : '100%',
    }

    return mergeProps({
      style: defaultStyle,
      "data-list-container": containerId,
    }, args.containerProps || {})
  })

  const itemWrapper = (itemCreator: (args: ItemArgs<T>) => any, trackChanges = false) =>
    (virtualItem: VirtualItem, virtualItemIndex: () => number) => {
      const createItem = createMemo(() => {
        const itemData = data()[virtualItem.index]
        const style = {
          position: 'absolute',
          top: horizontal() ? 0 : `${virtualItem.start}px`,
          left: horizontal() ? `${virtualItem.start}px` : 0,
          width: horizontal() ? `${virtualItem.size}px` : '100%',
          height: horizontal() ? '100%' : `${virtualItem.size}px`,
        }

        const key = determineKey()(itemData, virtualItem.index)
        const itemProps = mergeProps({
          style,
          'data-list-item': 'true',
          'data-index': virtualItem.index,
          key,
          ref: mergeRefs((el: Element) => {
            if (el) virtualizer.measureElement(el)
          }, args.itemProps?.ref),
        }, args?.itemProps ?? {})

        const isLast = virtualItem.index === count() - 1
        const isEven = virtualItem.index % 2 === 0
        const itemArgs: ItemArgs<T> = {
          data: itemData,
          props: itemProps,
          virtualItem: {
            ...virtualItem,
            isLast,
            isEven,
          },
        }

        return itemCreator(itemArgs)
      })

      return trackChanges ? createItem() : untrack(createItem)
    }

  return {
    id,
    get virtualizer() {
      return virtualizer
    },
    get root() {
      return rootProps()
    },
    get count() {
      return count()
    },
    get container() {
      return containerProps()
    },
    items: itemWrapper,
    get item() {
      return virtualizer.getVirtualItems()
    }
  }
}

export default createVirtualizedList