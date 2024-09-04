// @ts-nocheck
import { createSignal, createResource, For, Show } from 'solid-js';
import { createVirtualizedList } from '@doeixd/create-virtualized-list-solid';

interface Post {
  id: number;
  author: string;
  content: string;
  likes: number;
}

// Simulated API call to fetch posts
const fetchPosts = async (page: number, pageSize: number): Promise<Post[]> => {
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
  return Array.from({ length: pageSize }, (_, i) => ({
    id: page * pageSize + i,
    author: `User ${Math.floor(Math.random() * 100)}`,
    content: 'Lorem ipsum '.repeat(Math.floor(Math.random() * 10) + 1),
    likes: Math.floor(Math.random() * 1000),
  }));
};

const InfiniteSocialFeed = () => {
  const [page, setPage] = createSignal(0);
  const pageSize = 20;

  const [posts, { mutate }] = createResource(() => page(), (page) => fetchPosts(page, pageSize));

  const loadMorePosts = () => {
    setPage(prev => prev + 1);
  };

  const allPosts = () => posts.loading ? [] : posts.latest?.flatMap(p => p) || [];

  const virtualList = createVirtualizedList<Post>({
    data: allPosts,
    estimateSize: (index) => {
      // Estimate size based on content length
      const post = allPosts()[index];
      return post ? 80 + post.content.length * 0.5 : 100; // Base height + content length estimate
    },
    overscan: 5,
    getScrollElement: () => document.getElementById('scroll-container'),
  });

  const PostItem = (props: { item: Post, virtualItem: any }) => (
    <div 
      style={{ 
        padding: '10px',
        border: '1px solid #ddd',
        margin: '5px 0',
        'background-color': props.virtualItem.index % 2 === 0 ? '#f9f9f9' : 'white'
      }}
    >
      <h3>{props.item.author}</h3>
      <p>{props.item.content}</p>
      <span>Likes: {props.item.likes}</span>
    </div>
  );

  return (
    <div 
      id="scroll-container"
      style={{ 
        height: '600px', 
        overflow: 'auto',
        border: '1px solid #ccc'
      }}
      onScroll={(e) => {
        const target = e.target as HTMLDivElement;
        if (target.scrollHeight - target.scrollTop === target.clientHeight) {
          loadMorePosts();
        }
      }}
    >
      <div {...virtualList.container}>
        <For each={virtualList.item}>
          {virtualList.items((itemData) => (
            <Show when={itemData.data}>
              <PostItem item={itemData.data} virtualItem={itemData.virtualItem} />
            </Show>
          ))}
        </For>
        <Show when={posts.loading}>
          <div style={{ padding: '20px', 'text-align': 'center' }}>Loading more posts...</div>
        </Show>
      </div>
    </div>
  );
};

export default InfiniteSocialFeed;