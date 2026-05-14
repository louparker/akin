// Stub types — will be replaced by generated Supabase types in Phase 2.
export interface Post {
  id: string;
  title: string;
  body: string;
  category: string;
  language: 'en' | 'sv';
  authorId: string;
  authorIdentifier: string;
  commentCount: number;
  participantCount: number;
  isFull: boolean;
  totalSpiceScore: number;
  spiceVoteCount: number;
  averageSpiceLevel: number | null;
  status: 'active' | 'removed' | 'locked';
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  body: string;
  authorId: string;
  authorIdentifier: string;
  createdAt: string;
}

export interface Profile {
  id: string;
  anonymousIdentifier: string;
  createdAt: string;
}

export const aPost = (overrides: Partial<Post> = {}): Post => ({
  id: '00000000-0000-0000-0000-000000000001',
  title: 'A vent about a third date',
  body: 'It started fine and then…',
  category: 'vent_space',
  language: 'en',
  authorId: '00000000-0000-0000-0000-0000000000aa',
  authorIdentifier: 'CrimsonFox42',
  commentCount: 0,
  participantCount: 1,
  isFull: false,
  totalSpiceScore: 0,
  spiceVoteCount: 0,
  averageSpiceLevel: null,
  status: 'active',
  createdAt: '2026-04-25T10:00:00Z',
  ...overrides,
});

export const aComment = (overrides: Partial<Comment> = {}): Comment => ({
  id: '00000000-0000-0000-0000-000000000002',
  postId: '00000000-0000-0000-0000-000000000001',
  body: 'I totally get that feeling.',
  authorId: '00000000-0000-0000-0000-0000000000bb',
  authorIdentifier: 'TealBadger7',
  createdAt: '2026-04-25T10:05:00Z',
  ...overrides,
});

export const aProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: '00000000-0000-0000-0000-0000000000aa',
  anonymousIdentifier: 'CrimsonFox42',
  createdAt: '2026-04-20T08:00:00Z',
  ...overrides,
});
