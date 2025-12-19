import { createVirtualizer, VirtualItem, VirtualizerOptions } from "@tanstack/solid-virtual"
import { createUniqueId, mergeProps, createMemo, createSignal, onMount, untrack, createEffect, on, JSX } from "solid-js"
import { mergeRefs, createGenerateId } from "./utils"
import { isServer } from "solid-js/web"

export type Primitive = string | number | boolean | null | undefined
export type ObjectWithKey = { [key: string]: any }

export type KeyFunction<T> = (item: T, index?: number) => string | number


export interface VirtualizedListArgs<T, ScrollElement extends Element = Element, ItemElement extends Element = Element> extends Partial<VirtualizerOptions<ScrollElement, ItemElement>> {
  id?: string
  data: () => T[]
  determineKey?: KeyFunction<T>
  itemHeight?: number
  width?: number | string
  height?: number | string

  // Typed props for better IDE support and type safety
  rootProps?: JSX.HTMLAttributes<HTMLDivElement>
  containerProps?: JSX.HTMLAttributes<HTMLDivElement>
  itemProps?: JSX.HTMLAttributes<HTMLDivElement>

  useIntersectionObserver?: boolean

  // Accessibility props
  ariaLabel?: string
  ariaLabelledBy?: string
  ariaDescribedBy?: string
  role?: 'list' | 'listbox' | 'menu' | 'tree' | 'grid'
  itemRole?: 'listitem' | 'option' | 'menuitem' | 'treeitem' | 'row'
  enableKeyboardNavigation?: boolean

  // Feature extensions
  windowScroll?: boolean
  header?: any
  footer?: any
}

export interface VirtualItemWithExtras extends VirtualItem {
  isLast: boolean
  isEven: boolean
}

export interface ItemArgs<T> {
  data: T
  props: JSX.HTMLAttributes<HTMLDivElement> & {
    'data-list-item': 'true'
    'data-index': number
    key: string | number
  } & Record<string, any>
  virtualItem: VirtualItemWithExtras
}

export interface ItemsOptions {
  track?: boolean
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
 * @property {Accessor<Element | null>} rootRef - Root ref getter
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

  // Create ID-to-index map for efficient scrollToItem lookups
  const itemIdToIndexMap = createMemo(() => {
    const map = new Map<string | number, number>()
    const items = data()

    for (let i = 0; i < items.length; i++) {
      const key = determineKey()(items[i], i)
      map.set(key, i)
    }

    return map
  })

  const horizontal = () => args?.horizontal ?? false

  const [rootElement, setRootElement] = createSignal<Element | null>(null)
  const [autoEstimatedSize, setAutoEstimatedSize] = createSignal<number | null>(null)
  const [firstItemMeasured, setFirstItemMeasured] = createSignal(false)
  const [focusedIndex, setFocusedIndex] = createSignal<number>(-1)
  const [isKeyboardNavigating, setIsKeyboardNavigating] = createSignal(false)

  const getScrollElement = () => {
    if (args.windowScroll) {
      return typeof window !== 'undefined' ? document.documentElement : null
    }

    const element = rootElement()

    // Check if element is connected to DOM before returning
    if (element && !element.isConnected) {
      return null
    }

    return element
  }

  const estimateSize = createMemo(() => {
    if (args?.estimateSize) return args.estimateSize
    if (args.itemHeight) return (index: number) => args.itemHeight || 50

    const autoSize = autoEstimatedSize()
    if (autoSize !== null) return (index: number) => autoSize

    return (index: number) => 50  // Default fallback
  })

  const initialRect = () => {
    return ({
      width:  args.initialRect?.width ?? (typeof args?.width == 'number' ? args.width : undefined ) ?? 600,
      height: args.initialRect?.height ?? (typeof args?.height == 'number' ? args.height : undefined ) ?? 400,
    })
  }

  // IntersectionObserver for lazy measurement
  const intersectionMeasureElement = createMemo(() => {
    if (isServer || !args.useIntersectionObserver) return undefined

    const elementMap = new WeakMap<Element, IntersectionObserver>()

    return (element: Element) => {
      const existingObserver = elementMap.get(element)
      if (existingObserver) existingObserver.disconnect()

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              virtualizer.measureElement(entry.target as Element)
            }
          }
        },
        { root: getScrollElement(), threshold: 0.01 }
      )

      observer.observe(element)
      elementMap.set(element, observer)

      return element.getBoundingClientRect()[horizontal() ? 'width' : 'height']
    }
  })

  const measureElement = createMemo(() => {
    if (isServer) return undefined

    // Use IntersectionObserver if enabled
    if (args.useIntersectionObserver) {
      return intersectionMeasureElement()
    }

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
      get initialRect() {
         return currentArgs?.initialRect ?? initialRect()
      },
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
    const defaultStyle = args.windowScroll
      ? {
          position: 'relative',
          height: (typeof args?.height == 'number') ? `${args.height}px` : (typeof args?.height == 'string') ? args.height : 'auto',
          width:  (typeof args?.width == 'number') ? `${args.width}px` : (typeof args?.width == 'string') ? args.width : '100%',
        }
      : {
          'overflow-y': horizontal() ? 'hidden' : 'auto',
          'overflow-x': horizontal() ? 'auto' : 'hidden',
          position: 'relative',
          height: (typeof args?.height == 'number') ? `${args.height}px` : (typeof args?.height == 'string') ? args.height : '100%',
          width:  (typeof args?.width == 'number') ? `${args.width}px` : (typeof args?.width == 'string') ? args.width : '100%',
        }
    const horizontalAttr = horizontal() ? "" : undefined

    return mergeProps({
      id: id(),
      style: defaultStyle,
      "data-horizontal": horizontalAttr,
      "data-list-id": id(),
      ref: mergeRefs((el: Element) => setRootElement(el), args.rootProps?.ref),
      // ARIA attributes
      role: args.role || 'list',
      'aria-label': args.ariaLabel,
      'aria-labelledby': args.ariaLabelledBy,
      'aria-describedby': args.ariaDescribedBy,
      tabIndex: args.enableKeyboardNavigation ? 0 : undefined,
      // Keyboard navigation
      onKeyDown: args.enableKeyboardNavigation ? handleKeyDown : undefined,
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

  // Keyboard navigation handler
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!args.enableKeyboardNavigation) return

    const currentIndex = focusedIndex()
    const itemCount = count()
    let newIndex = currentIndex

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        newIndex = Math.min(currentIndex + 1, itemCount - 1)
        break
      case 'ArrowUp':
        e.preventDefault()
        newIndex = Math.max(currentIndex - 1, 0)
        break
      case 'Home':
        e.preventDefault()
        newIndex = 0
        break
      case 'End':
        e.preventDefault()
        newIndex = itemCount - 1
        break
      case 'PageDown':
        e.preventDefault()
        // Estimate ~10 items per page
        newIndex = Math.min(currentIndex + 10, itemCount - 1)
        break
      case 'PageUp':
        e.preventDefault()
        newIndex = Math.max(currentIndex - 10, 0)
        break
      default:
        return
    }

    if (newIndex !== currentIndex) {
      setFocusedIndex(newIndex)
      setIsKeyboardNavigating(true)
      virtualizer.scrollToIndex(newIndex, { align: 'auto' } as any)
    }
  }

  // Memoized style creator - only recreates when horizontal changes
  const createItemStyle = createMemo(() => {
    const isHorizontal = horizontal()
    const baseStyle = {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      transform: isHorizontal
        ? 'translateX(var(--item-start))'
        : 'translateY(var(--item-start))',
      width: isHorizontal ? 'var(--item-size)' : '100%',
      height: isHorizontal ? '100%' : 'var(--item-size)',
    }

    return (virtualItem: VirtualItem) => ({
      ...baseStyle,
      '--item-start': `${virtualItem.start}px`,
      '--item-size': `${virtualItem.size}px`,
    })
  })

  const itemWrapper = (
    itemCreator: (args: ItemArgs<T>) => any,
    trackChanges?: boolean | ItemsOptions
  ) =>
    (virtualItem: VirtualItem, virtualItemIndex: () => number) => {
      // Normalize options - support both old boolean and new object format
      const options: ItemsOptions = typeof trackChanges === 'boolean'
        ? { track: trackChanges }
        : (trackChanges || {})

      const shouldTrack = options.track ?? false

      const createItem = createMemo(() => {
        const itemData = data()[virtualItem.index]
        const style = createItemStyle()(virtualItem)

        const key = determineKey()(itemData, virtualItem.index)
        const itemProps = mergeProps({
          style,
          'data-list-item': 'true',
          'data-index': virtualItem.index,
          key,
          ref: mergeRefs(
            (el: Element) => {
              if (el) {
                virtualizer.measureElement(el)

                // Auto-measure first item if no estimateSize provided
                if (
                  !args.estimateSize &&
                  !args.itemHeight &&
                  virtualItem.index === 0 &&
                  !firstItemMeasured()
                ) {
                  const size = el.getBoundingClientRect()[horizontal() ? 'width' : 'height']
                  if (size > 0) {
                    setAutoEstimatedSize(size)
                    setFirstItemMeasured(true)
                    virtualizer.measure()  // Re-measure all items
                  }
                }
              }
            },
            args.itemProps?.ref
          ),
          // ARIA attributes for items
          role: args.itemRole || 'listitem',
          'aria-setsize': count(),
          'aria-posinset': virtualItem.index + 1,
          // Keyboard navigation focus management
          tabIndex: args.enableKeyboardNavigation && focusedIndex() === virtualItem.index ? 0 : -1,
          'aria-selected': args.enableKeyboardNavigation && focusedIndex() === virtualItem.index ? true : undefined,
        }, args?.itemProps ?? {})

        const isLast = virtualItem.index === count() - 1
        const isEven = virtualItem.index % 2 === 0
        const itemArgs: ItemArgs<T> = {
          data: itemData,
          props: itemProps as any,
          virtualItem: {
            ...virtualItem,
            isLast,
            isEven,
          },
        }

        return itemCreator(itemArgs)
      })

      return shouldTrack ? createItem() : untrack(createItem)
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
    },
    rootRef: rootElement,

    // Header/footer accessors
    get header() {
      return args.header
    },
    get footer() {
      return args.footer
    },

    // Convenience methods for common operations
    scrollToIndex: (index: number, options?: {
      align?: 'start' | 'center' | 'end' | 'auto',
      behavior?: 'auto' | 'smooth' | 'instant'
    }) => {
      virtualizer.scrollToIndex(index, options as any)
    },

    scrollToItem: (itemId: string | number, options?: {
      align?: 'start' | 'center' | 'end' | 'auto',
      behavior?: 'auto' | 'smooth' | 'instant'
    }) => {
      const index = itemIdToIndexMap().get(itemId)
      if (index !== undefined) {
        virtualizer.scrollToIndex(index, options as any)
      } else {
        console.warn(`[VirtualizedList] Item with id "${itemId}" not found in list`)
      }
    },

    scrollToOffset: (offset: number, options?: {
      align?: 'start' | 'center' | 'end' | 'auto',
      behavior?: 'auto' | 'smooth' | 'instant'
    }) => {
      virtualizer.scrollToOffset(offset, options as any)
    },

    scrollBy: (delta: number, options?: { behavior?: ScrollBehavior }) => {
      const scrollElement = getScrollElement()
      if (scrollElement) {
        scrollElement.scrollBy({
          [horizontal() ? 'left' : 'top']: delta,
          behavior: options?.behavior,
        })
      }
    },

    measure: () => virtualizer.measure(),
  }
}

export default createVirtualizedList