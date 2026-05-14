export type PostFixture = {
  id: string;
  categoryId: string;
  title: string;
  body: string;
  originalPosterAnonymousIdentifier: string;
  participantCount: number;
  createdAt: string;
};

export type CommentFixture = {
  id: string;
  postId: string;
  body: string;
  userAnonymousIdentifier: string;
  createdAt: string;
};

export type ProfileFixture = {
  userId: string;
  anonymousIdentifier: string;
  activePostCount: number;
};

export const aPost = (overrides: Partial<PostFixture> = {}): PostFixture => ({
  id: 'post_test_1',
  categoryId: 'dating-app-fatigue',
  title: 'Sample post',
  body: 'Sample body',
  originalPosterAnonymousIdentifier: 'CrimsonFox42',
  participantCount: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

export const aComment = (overrides: Partial<CommentFixture> = {}): CommentFixture => ({
  id: 'comment_test_1',
  postId: 'post_test_1',
  body: 'Sample comment',
  userAnonymousIdentifier: 'JadeOwl07',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

export const aProfile = (overrides: Partial<ProfileFixture> = {}): ProfileFixture => ({
  userId: 'user_test_1',
  anonymousIdentifier: 'CrimsonFox42',
  activePostCount: 0,
  ...overrides,
});
