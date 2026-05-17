// English translations
// Swedish (sv.ts) is the primary locale; English is the fallback for non-Swedish devices.
// Variable interpolation: {{varName}}

export const en = {
  // ── App ─────────────────────────────────────────────────────────────────────
  'app.name': 'Akin',
  'app.tagline': 'A quieter place to talk about dating.',

  // ── Navigation ───────────────────────────────────────────────────────────────
  'nav.tab.read': 'Read',
  'nav.tab.write': 'Write',
  'nav.tab.you': 'You',

  // ── Auth — Welcome ───────────────────────────────────────────────────────────
  'auth.welcome.headline': 'A quieter place\nto talk about\ndating.',
  'auth.welcome.body':
    'Small, anonymous conversations capped at four people. No swiping, no profiles, no names attached.',
  'auth.welcome.cta.signup': 'Make an account',
  'auth.welcome.cta.login': 'I already have one',
  'auth.welcome.tos': 'By continuing you agree to our {{termsLink}} and {{privacyLink}}.',
  'auth.welcome.tos.terms': 'Terms',
  'auth.welcome.tos.privacy': 'Privacy Policy',

  // ── Auth — Sign Up ───────────────────────────────────────────────────────────
  'auth.signup.title': 'Make an account',
  'auth.signup.subtitle': 'Email is private. Used only for sign-in and account recovery.',
  'auth.signup.email.label': 'Email',
  'auth.signup.email.placeholder': 'your@email.com',
  'auth.signup.password.label': 'Password',
  'auth.signup.password.placeholder': '••••••••',
  'auth.signup.password.hint': 'At least 8 characters.',
  'auth.signup.age.label': 'I am 18 or older.',
  'auth.signup.age.description':
    "Akin is for adults. We don't ask for ID; we trust you to confirm.",
  'auth.signup.cta': 'Continue',
  'auth.signup.error.email_taken': 'That email is already registered.',
  'auth.signup.error.weak_password': 'Password must be at least 8 characters.',
  'auth.signup.error.age_required': 'You must confirm you are 18 or older.',
  'auth.signup.error.generic': 'Something went wrong. Please try again.',

  // ── Auth — Login ─────────────────────────────────────────────────────────────
  'auth.login.title': 'Welcome back',
  'auth.login.email.label': 'Email',
  'auth.login.password.label': 'Password',
  'auth.login.forgot': 'Forgot password',
  'auth.login.cta': 'Sign in',
  'auth.login.error.invalid': 'Incorrect email or password.',
  'auth.login.error.generic': 'Something went wrong. Please try again.',

  // ── Auth — Verify Email ──────────────────────────────────────────────────────
  'auth.verify.title': 'Check your email',
  'auth.verify.body':
    "We've sent a confirmation link to {{email}}. Open it to activate your account.",
  'auth.verify.resend': 'Resend email',
  'auth.verify.resend.sent': 'Sent.',
  'auth.verify.spam': "Check your spam folder if it doesn't arrive.",

  // ── Auth — Identifier Reveal ─────────────────────────────────────────────────
  'auth.identifier.eyebrow': "This is who you'll be here",
  'auth.identifier.body':
    "Everyone gets one of these. It stays the same so people you talk with can recognise you across conversations. It can't be changed later, and it can't be linked back to your email.",
  'auth.identifier.examples.label': "Other people you'll meet here:",
  'auth.identifier.cta.confirm': 'This is me',
  'auth.identifier.cta.retry': 'Try another one',

  // ── Feed ─────────────────────────────────────────────────────────────────────
  'feed.tab.all': 'All',
  'feed.tab.categories': 'Categories',
  'feed.sort.recent': 'Recent',
  'feed.sort.comments': 'Most comments',
  'feed.sort.spice': 'Highest spice',
  'feed.filter.title': 'Sort & filter',
  'feed.filter.sortBy': 'Sort by',
  'feed.filter.minSpice': 'Minimum spice',
  'feed.filter.minSpice.any': 'Any',
  'feed.filter.cta': 'Apply',
  'feed.empty.title': "Nobody's posted in {{category}} in the last hour.",
  'feed.empty.body': 'Try another category, or be the first one tonight.',
  'feed.empty.cta': 'Start one',
  'feed.error.title': 'Could not load posts',
  'feed.error.retry': 'Try again',
  'feed.full.badge': '{{n}}/4 · full',
  'feed.participants.badge': '{{n}}/4',

  // ── Categories ───────────────────────────────────────────────────────────────
  'category.vent_space': 'Vent Space',
  'category.all_the_feels': 'All The Feels',
  'category.advice_needed': 'Advice Needed',
  'category.just_wondering': 'Just Wondering',
  'category.story_time': 'Story Time',
  'category.decode_this': 'Decode This!',
  'category.aitoo': 'AITOO / Reality Check',
  'category.hypothetically': 'Hypothetically Speaking…',
  'category.good_vibes': 'Good Vibes Only',
  'category.vent_space.desc': 'Just need to put it somewhere.',
  'category.all_the_feels.desc': 'For when the feeling is the whole post.',
  'category.advice_needed.desc': 'You ask. They answer. Honestly.',
  'category.just_wondering.desc': 'Low-stakes questions worth asking.',
  'category.story_time.desc': 'Things that happened. Tell us.',
  'category.decode_this.desc': 'What did they actually mean.',
  'category.aitoo.desc': 'Was I the problem. Be honest.',
  'category.hypothetically.desc': 'Thought experiments. No wrong answer.',
  'category.good_vibes.desc': 'Small good things. Real ones.',
  'category.open.label': 'open',
  'category.detail.filterLabel': 'Category',

  // ── Post Detail ───────────────────────────────────────────────────────────────
  'post.spice.label': 'Spice level',
  'post.spice.average': '{{avg}} average',
  'post.spice.votes': '{{n}} votes',
  'post.replies.label': '{{n}} replies',
  'post.op.badge': 'OP',
  'post.reply.placeholder': 'Reply to this conversation…',
  'post.full.lock': 'This conversation is full.',
  'post.full.body':
    'Four people are already talking. You can keep reading — just not joining this one. The cap is what keeps it small.',
  'post.capacity': '{{filled}}/4',
  'post.capacity.full': '{{filled}}/4 · full',

  // ── Spice Vote Sheet ─────────────────────────────────────────────────────────
  'spice.sheet.title': 'How spicy was this?',
  'spice.sheet.body': 'One vote per post. Helps others find conversations that match their mood.',
  'spice.1.label': 'Soft',
  'spice.1.desc': 'Just thinking out loud.',
  'spice.2.label': 'Mild',
  'spice.2.desc': 'Slight edge.',
  'spice.3.label': 'Sharp',
  'spice.3.desc': 'Cuts a little.',
  'spice.4.label': 'Hot',
  'spice.4.desc': 'Nerve-touching.',
  'spice.5.label': 'Scorched',
  'spice.5.desc': 'Whole thing is on fire.',

  // ── Active Limit Sheet ────────────────────────────────────────────────────────
  'limit.active.title': "You're in three conversations already.",
  'limit.active.body':
    'Conclude one to join another. A conversation concludes on its own once it reaches four people.',
  'limit.active.cta': 'Got it',
  'limit.full.error': 'This conversation is full.',

  // ── DB errors → user-facing copy ─────────────────────────────────────────────
  'error.INSUFFICIENT_PARTICIPANT_SLOTS': 'This conversation is full.',
  'error.USER_ACTIVE_LIMIT_REACHED':
    "You're in three conversations already. Conclude one to join another.",
  'error.CONTENT_FILTER_HIT':
    "Your post couldn't be submitted. Please review the community guidelines.",
  'error.CONTACT_INFO_NOT_ALLOWED':
    'Contact details like phone numbers or emails are not allowed in posts.',
  'error.network': "Couldn't connect. Check your connection and try again.",
  'error.generic': 'Something went wrong. Please try again.',

  // ── Create Post ───────────────────────────────────────────────────────────────
  'create.cancel': 'Cancel',
  'create.submit': 'Post',
  'create.category.label': 'Category',
  'create.category.placeholder': 'Pick a category',
  'create.title.placeholder': "What's on your mind?",
  'create.body.placeholder':
    'Tell us more. The people who join this conversation will see everything you write here.',
  'create.footer.postingAs': 'Posting as',
  'create.footer.afterPost':
    'Three other people can join this conversation. After that it stays open for the four of you.',
  'create.charCount.title': 'Title {{n}} / 150',
  'create.charCount.body': 'Body {{n}} / 2000',
  'create.picker.title': 'Pick a category',
  'create.guidelines.title': 'Before you post.',
  'create.guidelines.rule1.title': 'Speak for yourself.',
  'create.guidelines.rule1.body':
    "First-person stories land best. Generalisations about whole genders or groups don't.",
  'create.guidelines.rule2.title': 'Stay anonymous, both ways.',
  'create.guidelines.rule2.body':
    "Don't share names, handles, or anything that could identify someone you're talking about.",
  'create.guidelines.rule3.title': 'Disagree like a human.',
  'create.guidelines.rule3.body':
    "You can push back. You can't be cruel. The cap means whoever joins is sticking around.",
  'create.guidelines.cta': 'Continue',
  'create.guidelines.link': 'Read the full guidelines',

  // ── Profile ───────────────────────────────────────────────────────────────────
  'profile.eyebrow': 'You are',
  'profile.joined': 'joined',
  'profile.stats.posts': '{{n}} posts',
  'profile.stats.replies': '{{n}} replies',
  'profile.active.title': 'Active conversations',
  'profile.active.count': '{{n}} / 3',
  'profile.active.hint': 'Conclude one to join another.',
  'profile.active.empty': "You're not in any active conversations yet.",
  'profile.posts.title': 'Your posts',
  'profile.posts.empty': "You haven't posted anything yet.",

  // ── Settings ──────────────────────────────────────────────────────────────────
  'settings.title': 'Settings',
  'settings.account.title': 'Account',
  'settings.account.email': 'Email',
  'settings.account.changePassword': 'Change password',
  'settings.account.identifier': 'Identifier',
  'settings.safety.title': 'Trust & Safety',
  'settings.safety.blocked': 'Blocked people',
  'settings.safety.notifications': 'Notifications',
  'settings.notifications.off': 'Off',
  'settings.legal.title': 'Legal',
  'settings.legal.privacy': 'Privacy Policy',
  'settings.legal.terms': 'Terms of Service',
  'settings.legal.guidelines': 'Community Guidelines',
  'settings.support.title': 'Support',
  'settings.support.feedback': 'Send feedback',
  'settings.support.version': 'App version',
  'settings.logout': 'Log out',
  'settings.deleteAccount': 'Delete account',
  'settings.deleteAccount.confirm.title': 'Delete your account?',
  'settings.deleteAccount.confirm.body':
    "This removes everything — your posts, your conversations, your identifier. There's no undo.",
  'settings.deleteAccount.confirm.cta': 'Yes, delete my account',
  'settings.deleteAccount.confirm.cancel': 'Keep my account',

  // ── Blocked users ─────────────────────────────────────────────────────────────
  'blocked.title': 'Blocked people',
  'blocked.explanation':
    'Their posts and replies stay invisible to you. They are not told you blocked them.',
  'blocked.unblock': 'Unblock',
  'blocked.empty': "You haven't blocked anyone.",
  'blocked.date': 'Blocked {{date}}',

  // ── Report Sheet ─────────────────────────────────────────────────────────────
  'report.title.comment': 'Report this comment',
  'report.title.post': 'Report this post',
  'report.body': "A real person reads every report. We don't auto-action. Pick the closest reason.",
  'report.reason.harassment': 'Harassment or targeting',
  'report.reason.identifying': 'Identifying someone',
  'report.reason.hate': 'Hate or slurs',
  'report.reason.sexual': 'Sexual content involving minors',
  'report.reason.spam': 'Spam or off-topic',
  'report.reason.other': 'Something else',
  'report.cta': 'Send report',
  'report.success': 'Report sent.',

  // ── Common ────────────────────────────────────────────────────────────────────
  'common.you': 'you',
  'common.ago': '{{time}} ago',
  'common.justNow': 'just now',
  'common.retry': 'Try again',
  'common.back': 'Back',
  'common.close': 'Close',
  'common.loading': 'Loading…',
} as const;

// TranslationDict: all keys required, values are strings.
// Used to type-check sv.ts — every key in en.ts must exist in sv.ts.
export type TranslationDict = Record<keyof typeof en, string>;
