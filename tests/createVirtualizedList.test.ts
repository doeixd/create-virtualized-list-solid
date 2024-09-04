import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRoot, createSignal, createMemo, untrack } from 'solid-js'
import { createVirtualizedList } from '../src/createVirtualizedList'
import { createVirtualizer } from '@tanstack/solid-virtual'

// Mock @tanstack/solid-virtual
vi.mock('@tanstack/solid-virtual', () => ({
  createVirtualizer: vi.fn((options) => ({
    getVirtualItems: vi.fn(() => new Array(options?.count).map((_, i) => {
      return { index: i, start: i * 50, size: 50, key: String(i) }
    })),
    getTotalSize: vi.fn(() => 100),
    measure: vi.fn(),
    scrollToIndex: vi.fn(),
  })),
}))

vi.mock('solid-js', async () => {
  const actual = await vi.importActual('solid-js');
  return {
    ...actual,
    untrack: vi.fn((fn) => fn()),
    createMemo: vi.fn((fn) => {
      const memoFn = () => fn();
      memoFn.___memo = true; // Add a flag to identify memoized functions
      return memoFn;
    }),
  };
});

describe('createVirtualizedList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a virtualized list with correct structure', () => {
    createRoot(dispose => {
      const data = () => ['Item 1', 'Item 2']
      const vList = createVirtualizedList({ data })

      expect(vList).toHaveProperty('id')
      expect(vList).toHaveProperty('virtualizer')
      expect(vList).toHaveProperty('root')
      expect(vList).toHaveProperty('container')
      expect(vList).toHaveProperty('items')
      expect(vList).toHaveProperty('item')
      expect(vList).toHaveProperty('count')

      expect(typeof vList.root).toBe('object')
      expect(typeof vList.container).toBe('object')
      expect(typeof vList.items).toBe('function')
      expect(typeof vList.count).toBe('number')

      dispose()
    })
  })

  it('should handle reactive data updates', () => {
    createRoot(dispose => {
      const [items, setItems] = createSignal(['Item 1', 'Item 2'])
      const vList = createVirtualizedList({ data: items })

      expect(vList.count).toBe(2)

      setItems(['Item 1', 'Item 2', 'Item 3'])
      expect(vList.count).toBe(3)

      dispose()
    })
  })

  it('should pass correct options to createVirtualizer', () => {
    createRoot(dispose => {
      const data = () => ['Item 1', 'Item 2']
      createVirtualizedList({
        data,
        overscan: 5,
        horizontal: true,
        estimateSize: () => 100,
      })

      expect(createVirtualizer).toHaveBeenCalledWith(expect.objectContaining({
        count: 2,
        data: expect.any(Function),
        estimateSize: expect.any(Function),
        getScrollElement: expect.any(Function),
        horizontal: true,
        overscan: 5,
        paddingEnd: 10,
        paddingStart: 0,
      }))

      // Check some specific properties
      // @ts-expect-error
      const callArgs = (createVirtualizer as jest.Mock).mock.calls[0][0]
      expect(callArgs.initialRect).toEqual({ width: 600, height: 400 })
      expect(callArgs.getItemKey).toBeInstanceOf(Function)
      expect(callArgs.measureElement).toBeInstanceOf(Function)

      dispose()
    })
  })

  it('should handle custom key function', () => {
    createRoot(dispose => {
      const data = () => [{ id: 'a' }, { id: 'b' }]
      const determineKey = (item: { id: string }) => item.id
      const vList = createVirtualizedList({ data, determineKey })

      // Call createVirtualizer's getItemKey function
      // @ts-expect-error
      const createVirtualizerCall = (createVirtualizer as jest.Mock).mock.calls[0][0]
      const resultKey = createVirtualizerCall.getItemKey(0)

      expect(resultKey).toBe('a')

      expect(createVirtualizer).toHaveBeenCalledWith(expect.objectContaining({
        getItemKey: expect.any(Function),
      }))

      dispose()
    })
  })


  it('should provide access to underlying virtualizer methods', () => {
    createRoot(dispose => {
      const data = () => ['Item 1', 'Item 2']
      const vList = createVirtualizedList({ data })

      vList.virtualizer.scrollToIndex(1)

      expect(vList.virtualizer.scrollToIndex).toHaveBeenCalledWith(1)

      dispose()
    })
  })

  it('should handle empty data', () => {
    createRoot(dispose => {
      const data = () => []
      const vList = createVirtualizedList({ data })

      expect(vList.count).toBe(0)
      // expect(vList.virtualizer.options.count).toBe(0)
      // console.log(vList.item)
      expect(vList.item).toHaveLength(0)

      dispose()
    })
  })

  it('should apply custom root and container props', () => {
    createRoot(dispose => {
      const data = () => ['Item 1', 'Item 2']
      const rootProps = { className: 'custom-root' }
      const containerProps = { 'data-testid': 'virtual-container' }
      const vList = createVirtualizedList({ data, rootProps, containerProps })

      const rootElement = vList.root
      const containerElement = vList.container

      expect(rootElement.className).toBe('custom-root')
      expect(containerElement['data-testid']).toBe('virtual-container')

      dispose()
    })
  })

  it('should handle change tracking in item rendering', () => {
    createRoot(dispose => {
      const data = () => ['Item 1', 'Item 2']
      const vList = createVirtualizedList({ data })

      const itemCreator = vi.fn(({ data }) => `rendered ${data}`)
      const mockVirtualItem = { index: 0, start: 0, size: 50, key: '0', end: 0, lane: 0 }
      const untrackedItemFn = vList.items(itemCreator, false)
      const trackedItemFn = vList.items(itemCreator, true)

      // These should now be functions
      expect(untrackedItemFn).toBeInstanceOf(Function)
      expect(trackedItemFn).toBeInstanceOf(Function)

      // const untrackedResult = untrackedItemFn(mockVirtualItem, () => 0)
      // const trackedResult = trackedItemFn(mockVirtualItem, () => 0)

      // // These should also be functions due to untrack and createMemo
      // expect(untrackedResult).toBeInstanceOf(Function);
      // expect(trackedResult).toBeInstanceOf(Function);

      // // Call the functions to get the actual results
      // const untrackedValue = untrackedResult()
      // const trackedValue = trackedResult()

      const untrackedValue = untrackedItemFn(mockVirtualItem, () => 0)
      const trackedValue = trackedItemFn(mockVirtualItem, () => 0)

      expect(untrackedValue).toBe('rendered Item 1')
      expect(trackedValue).toBe('rendered Item 1')

      expect(untrack).toHaveBeenCalled()
      expect(createMemo).toHaveBeenCalled()

      // itemCreator should have been called twice
      expect(itemCreator).toHaveBeenCalledTimes(2)

      dispose()
    })
  })
})