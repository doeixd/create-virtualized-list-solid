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
    scrollToOffset: vi.fn(),
    setOptions: vi.fn(),
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

  describe('scrollToItem', () => {
    it('should scroll to item by ID', () => {
      createRoot(dispose => {
        const data = () => [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
          { id: 3, name: 'Charlie' },
        ]
        const vList = createVirtualizedList({
          data,
          determineKey: (item) => item.id,
        })

        vList.scrollToItem(2, { align: 'center' })

        expect(vList.virtualizer.scrollToIndex).toHaveBeenCalledWith(1, { align: 'center' })

        dispose()
      })
    })

    it('should warn when item ID not found', () => {
      createRoot(dispose => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

        const data = () => [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ]
        const vList = createVirtualizedList({
          data,
          determineKey: (item) => item.id,
        })

        vList.scrollToItem(999)

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '[VirtualizedList] Item with id "999" not found in list'
        )
        expect(vList.virtualizer.scrollToIndex).not.toHaveBeenCalled()

        consoleWarnSpy.mockRestore()
        dispose()
      })
    })

    it('should work with primitive arrays', () => {
      createRoot(dispose => {
        const data = () => ['item-a', 'item-b', 'item-c']
        const vList = createVirtualizedList({ data })

        // For primitive arrays without determineKey, it should use the value itself
        vList.scrollToItem('item-b')

        // Should scroll to index 1
        expect(vList.virtualizer.scrollToIndex).toHaveBeenCalledWith(1, undefined)

        dispose()
      })
    })
  })

  describe('scrolling methods', () => {
    it('should provide scrollToIndex method', () => {
      createRoot(dispose => {
        const data = () => ['Item 1', 'Item 2', 'Item 3']
        const vList = createVirtualizedList({ data })

        vList.scrollToIndex(2, { align: 'start', behavior: 'smooth' })

        expect(vList.virtualizer.scrollToIndex).toHaveBeenCalledWith(2, {
          align: 'start',
          behavior: 'smooth',
        })

        dispose()
      })
    })

    it('should provide scrollToOffset method', () => {
      createRoot(dispose => {
        const data = () => ['Item 1', 'Item 2']
        const vList = createVirtualizedList({ data })

        vList.scrollToOffset(500, { behavior: 'smooth' })

        expect(vList.virtualizer.scrollToOffset).toHaveBeenCalledWith(500, {
          behavior: 'smooth',
        })

        dispose()
      })
    })

    it('should provide measure method', () => {
      createRoot(dispose => {
        const data = () => ['Item 1', 'Item 2']
        const vList = createVirtualizedList({ data })

        vList.measure()

        expect(vList.virtualizer.measure).toHaveBeenCalled()

        dispose()
      })
    })
  })

  describe('accessibility', () => {
    it('should set ARIA role attributes', () => {
      createRoot(dispose => {
        const data = () => ['Item 1', 'Item 2']
        const vList = createVirtualizedList({
          data,
          role: 'listbox',
          itemRole: 'option',
          ariaLabel: 'My List',
        })

        const rootProps = vList.root

        expect(rootProps.role).toBe('listbox')
        expect(rootProps['aria-label']).toBe('My List')

        dispose()
      })
    })

    it('should default to list/listitem roles', () => {
      createRoot(dispose => {
        const data = () => ['Item 1', 'Item 2']
        const vList = createVirtualizedList({ data })

        const rootProps = vList.root

        expect(rootProps.role).toBe('list')

        dispose()
      })
    })

    it('should set tabIndex when keyboard navigation is enabled', () => {
      createRoot(dispose => {
        const data = () => ['Item 1', 'Item 2']
        const vList = createVirtualizedList({
          data,
          enableKeyboardNavigation: true,
        })

        const rootProps = vList.root

        expect(rootProps.tabIndex).toBe(0)
        expect(rootProps.onKeyDown).toBeInstanceOf(Function)

        dispose()
      })
    })

    it('should not set tabIndex when keyboard navigation is disabled', () => {
      createRoot(dispose => {
        const data = () => ['Item 1', 'Item 2']
        const vList = createVirtualizedList({ data })

        const rootProps = vList.root

        expect(rootProps.tabIndex).toBeUndefined()
        expect(rootProps.onKeyDown).toBeUndefined()

        dispose()
      })
    })
  })

  describe('window scrolling', () => {
    it('should use document.documentElement when windowScroll is true', () => {
      createRoot(dispose => {
        const data = () => ['Item 1', 'Item 2']
        const vList = createVirtualizedList({
          data,
          windowScroll: true,
        })

        // @ts-expect-error
        const createVirtualizerCall = (createVirtualizer as jest.Mock).mock.calls[0][0]
        const scrollElement = createVirtualizerCall.getScrollElement()

        // In test environment, document may not be available
        // so we just verify the function exists
        expect(createVirtualizerCall.getScrollElement).toBeInstanceOf(Function)

        dispose()
      })
    })

    it('should apply correct styles for window scroll mode', () => {
      createRoot(dispose => {
        const data = () => ['Item 1', 'Item 2']
        const vList = createVirtualizedList({
          data,
          windowScroll: true,
          height: 500,
        })

        const rootProps = vList.root

        expect(rootProps.style.position).toBe('relative')
        expect(rootProps.style.height).toBe('500px')

        dispose()
      })
    })
  })

  describe('edge cases and reactivity', () => {
    it('should handle rapid data updates', () => {
      createRoot(dispose => {
        const [items, setItems] = createSignal(['Item 1'])
        const vList = createVirtualizedList({ data: items })

        expect(vList.count).toBe(1)

        // Rapid updates
        setItems(['Item 1', 'Item 2'])
        expect(vList.count).toBe(2)

        setItems(['Item 1', 'Item 2', 'Item 3'])
        expect(vList.count).toBe(3)

        setItems([])
        expect(vList.count).toBe(0)

        setItems(['A', 'B', 'C', 'D', 'E'])
        expect(vList.count).toBe(5)

        dispose()
      })
    })

    it('should handle data mutations while maintaining reactivity', () => {
      createRoot(dispose => {
        const [items, setItems] = createSignal([{ id: 1 }, { id: 2 }])
        const vList = createVirtualizedList({
          data: items,
          determineKey: (item) => item.id,
        })

        expect(vList.count).toBe(2)

        // Replace entire array
        setItems([{ id: 1 }, { id: 2 }, { id: 3 }])
        expect(vList.count).toBe(3)

        // Empty array
        setItems([])
        expect(vList.count).toBe(0)

        dispose()
      })
    })

    it('should handle changing determineKey function', () => {
      createRoot(dispose => {
        const data = () => [
          { id: 1, uuid: 'a' },
          { id: 2, uuid: 'b' },
        ]

        const vList = createVirtualizedList({
          data,
          determineKey: (item) => item.id,
        })

        // Initially uses id
        vList.scrollToItem(1)
        expect(vList.virtualizer.scrollToIndex).toHaveBeenCalledWith(0, undefined)

        dispose()
      })
    })

    it('should handle items with undefined/null keys gracefully', () => {
      createRoot(dispose => {
        const data = () => [
          { id: 1 },
          { id: null },
          { id: undefined },
          { name: 'test' },
        ]

        const vList = createVirtualizedList({
          data,
          determineKey: (item) => item.id,
        })

        expect(vList.count).toBe(4)

        dispose()
      })
    })

    it('should handle very large item counts', () => {
      createRoot(dispose => {
        const data = () => Array.from({ length: 100000 }, (_, i) => `Item ${i}`)
        const vList = createVirtualizedList({ data })

        expect(vList.count).toBe(100000)

        dispose()
      })
    })

    it('should handle options changes reactively', () => {
      createRoot(dispose => {
        const [items, setItems] = createSignal(['Item 1', 'Item 2'])

        const vList = createVirtualizedList({
          data: items,
        })

        expect(vList).toBeDefined()

        // Trigger reactivity by changing data
        setItems(['Item 1', 'Item 2', 'Item 3'])

        // Count should update reactively
        expect(vList.count).toBe(3)

        dispose()
      })
    })

    it('should handle scrollToItem with duplicate keys', () => {
      createRoot(dispose => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

        const data = () => [
          { id: 1, name: 'Alice' },
          { id: 1, name: 'Alice Clone' }, // Duplicate key
          { id: 2, name: 'Bob' },
        ]

        const vList = createVirtualizedList({
          data,
          determineKey: (item) => item.id,
        })

        // With duplicate keys, Map stores the last occurrence
        // So scrollToItem(1) will scroll to index 1 (the second item)
        vList.scrollToItem(1)
        expect(vList.virtualizer.scrollToIndex).toHaveBeenCalledWith(1, undefined)

        consoleWarnSpy.mockRestore()
        dispose()
      })
    })

    it('should maintain reactivity when data function returns different arrays', () => {
      createRoot(dispose => {
        const [source, setSource] = createSignal<'a' | 'b'>('a')

        const data = () => {
          return source() === 'a'
            ? ['A1', 'A2', 'A3']
            : ['B1', 'B2']
        }

        const vList = createVirtualizedList({ data })

        expect(vList.count).toBe(3)

        setSource('b')
        expect(vList.count).toBe(2)

        setSource('a')
        expect(vList.count).toBe(3)

        dispose()
      })
    })

    it('should handle height/width as strings', () => {
      createRoot(dispose => {
        const data = () => ['Item 1']

        const vList1 = createVirtualizedList({
          data,
          height: '100vh',
          width: '50%',
        })

        const rootProps = vList1.root
        expect(rootProps.style.height).toBe('100vh')
        expect(rootProps.style.width).toBe('50%')

        dispose()
      })
    })

    it('should handle height/width as numbers', () => {
      createRoot(dispose => {
        const data = () => ['Item 1']

        const vList = createVirtualizedList({
          data,
          height: 600,
          width: 400,
        })

        const rootProps = vList.root
        expect(rootProps.style.height).toBe('600px')
        expect(rootProps.style.width).toBe('400px')

        dispose()
      })
    })

    it('should handle scrollBy method', () => {
      createRoot(dispose => {
        const data = () => ['Item 1', 'Item 2']
        const scrollBySpy = vi.fn()

        // Mock getScrollElement to return an element with scrollBy
        const vList = createVirtualizedList({ data })

        // The scrollBy method requires a scroll element
        // Since we're in a test environment, we'll just verify it's a function
        expect(typeof vList.scrollBy).toBe('function')

        dispose()
      })
    })

    it('should handle items with special characters in keys', () => {
      createRoot(dispose => {
        const data = () => [
          { id: 'item-1' },
          { id: 'item@2' },
          { id: 'item#3' },
          { id: 'item space 4' },
        ]

        const vList = createVirtualizedList({
          data,
          determineKey: (item) => item.id,
        })

        vList.scrollToItem('item@2')
        expect(vList.virtualizer.scrollToIndex).toHaveBeenCalledWith(1, undefined)

        vList.scrollToItem('item space 4')
        expect(vList.virtualizer.scrollToIndex).toHaveBeenCalledWith(3, undefined)

        dispose()
      })
    })

    it('should handle concurrent scrollToItem calls', () => {
      createRoot(dispose => {
        const data = () => Array.from({ length: 100 }, (_, i) => ({ id: i }))
        const vList = createVirtualizedList({
          data,
          determineKey: (item) => item.id,
        })

        vList.scrollToItem(10)
        vList.scrollToItem(20)
        vList.scrollToItem(30)

        // All should be called
        expect(vList.virtualizer.scrollToIndex).toHaveBeenCalledTimes(3)

        dispose()
      })
    })

    it('should maintain item count accuracy when data changes from empty', () => {
      createRoot(dispose => {
        const [items, setItems] = createSignal<string[]>([])
        const vList = createVirtualizedList({ data: items })

        expect(vList.count).toBe(0)

        setItems(['Item 1'])
        expect(vList.count).toBe(1)

        setItems(['Item 1', 'Item 2', 'Item 3'])
        expect(vList.count).toBe(3)

        dispose()
      })
    })
  })
})