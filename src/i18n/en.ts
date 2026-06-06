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
  'nav.tab.settings': 'Settings',

  // ── Auth — Welcome ───────────────────────────────────────────────────────────
  'auth.welcome.headline': 'A quieter place\nto talk about\ndating.',
  'auth.welcome.body':
    'Small, anonymous conversations capped at four people. No swiping, no profiles, no names attached.',
  'auth.welcome.cta.signup': 'Make an account',
  'auth.welcome.cta.login': 'I already have one',
  'auth.welcome.tos.prefix': 'By continuing you agree to our ',
  'auth.welcome.tos.conjunction': ' and ',
  'auth.welcome.tos.suffix': '.',
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
  'auth.login.signup': "Don't have an account?",
  'auth.login.error.invalid': 'Incorrect email or password.',
  'auth.login.error.rateLimit': 'Too many attempts. Try again in {{n}} minutes.',
  'auth.login.error.generic': 'Something went wrong. Please try again.',

  // ── Auth — Password Reset ────────────────────────────────────────────────────
  'auth.reset.title': 'Forgot your password?',
  'auth.reset.subtitle': "Enter your email and we'll send you a reset link.",
  'auth.reset.email.label': 'Email',
  'auth.reset.cta': 'Send reset link',
  'auth.reset.sent.title': 'Check your email',
  'auth.reset.sent.body':
    "If we have an account for that email, you'll receive a reset link shortly.",
  'auth.resetConfirm.title': 'Set a new password',
  'auth.resetConfirm.password.label': 'New password',
  'auth.resetConfirm.confirm.label': 'Confirm new password',
  'auth.resetConfirm.cta': 'Save new password',
  'auth.resetConfirm.error.mismatch': 'Passwords do not match.',
  'auth.resetConfirm.error.weak': 'Password must be at least 8 characters.',
  'auth.resetConfirm.error.generic': 'Something went wrong. Please try again.',
  'auth.resetConfirm.success': 'Password updated. You are now signed in.',

  // ── Auth — Signup: confirm password (added by Task 4.2) ──────────────────────
  'auth.signup.confirmPassword.label': 'Confirm password',
  'auth.signup.confirmPassword.placeholder': '••••••••',
  'auth.signup.error.password_mismatch': 'Passwords do not match.',

  // ── Auth — Verify Email ──────────────────────────────────────────────────────
  'auth.verify.title': 'Check your email',
  'auth.verify.body':
    "We've sent a confirmation link to {{email}}. Open it to activate your account.",
  'auth.verify.resend': 'Resend email',
  'auth.verify.resend.sent': 'Sent.',
  'auth.verify.resend.countdown': 'Resend in {{n}}s',
  'auth.verify.spam': "Check your spam folder if it doesn't arrive.",
  'auth.verify.wrongEmail': 'Wrong email?',
  'auth.verify.signOut': 'Use a different email',

  // ── Auth — Identifier Reveal ─────────────────────────────────────────────────
  'auth.identifier.eyebrow': "This is who you'll be here",
  'auth.identifier.body':
    "Everyone gets one of these. It stays the same so people you talk with can recognise you across conversations. It can't be changed later, and it can't be linked back to your email.",
  'auth.identifier.examples.label': "Other people you'll meet here:",
  'auth.identifier.cta.confirm': 'This is me',
  'auth.identifier.cta.retry': 'Try another one',
  'auth.identifier.loading': 'Preparing your name…',
  'auth.identifier.error': "Couldn't prepare your name.",

  // ── Auth — Onboarding ────────────────────────────────────────────────────────
  'auth.onboarding.skip': 'Skip',
  'auth.onboarding.next': 'Next',
  'auth.onboarding.getStarted': 'Get started',
  'auth.onboarding.screen1.title': 'Anonymous, by design',
  'auth.onboarding.screen1.body':
    'Your identifier is how people know you here. No profile photo, no real name, no DMs. Everyone is on equal footing.',
  'auth.onboarding.screen2.title': 'Small conversations',
  'auth.onboarding.screen2.body':
    'Each post has room for 1 poster and 3 replies. Four people maximum. You can be active in 3 conversations at once.',
  'auth.onboarding.screen3.title': '9 categories, no algorithm',
  'auth.onboarding.screen3.body':
    'Browse by what you feel like talking about. The feed shows the most recent posts — nothing is promoted or buried.',

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

  // ── Post / Comment menus ─────────────────────────────────────────────────────
  'post.menu.report': 'Report post',
  'post.menu.block': 'Block user',
  'post.menu.removeParticipant': 'Remove someone from this conversation',
  'comment.menu.report': 'Report comment',
  'block.confirm.title': 'Block this person?',
  'block.confirm.body': "You won't see their posts or comments. They won't know.",
  'block.confirm.cta': 'Block',
  'block.confirm.cancel': 'Cancel',
  'post.send.label': 'Send reply',

  // ── Remove participant (OP-only) ─────────────────────────────────────────────
  'post.removeParticipant.sheet.title': 'Remove someone from this conversation',
  'post.removeParticipant.sheet.warning':
    "They won't be able to see this post or comment again. Their previous replies will show as removed for the rest of you.",
  'post.removeParticipant.pick': 'Remove {{name}}',
  'post.removeParticipant.pickCta': 'Remove',
  'post.removeParticipant.empty': 'No one to remove yet.',
  'post.removeParticipant.confirm.title': 'Remove {{name}}?',
  'post.removeParticipant.confirm.body':
    'This is irreversible. They lose access to the post and to any replies that come after.',
  'post.removeParticipant.confirm.cta': 'Remove {{name}}',
  'post.removeParticipant.error.forbidden': "Only the post's author can remove a participant.",
  'post.comment.removedByOp': '[removed by OP]',
  'post.comment.error.removedFromPost': 'You were removed from this conversation.',

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

  // ── Banned screen ────────────────────────────────────────────────────────────
  'banned.title': 'Your account has been banned.',
  'banned.body':
    'If you believe this is a mistake, contact hi@akin.app. You can export your data or delete your account below.',
  'banned.logout': 'Log out',
  'banned.deleteAccount': 'Delete my account',

  // ── Suspended screen ─────────────────────────────────────────────────────────
  'suspended.title': 'Your account is suspended.',
  'suspended.body': "You can read posts but can't post or comment until the suspension ends.",
  'suspended.countdown': 'Suspended for {{time}} more.',
  'suspended.lifted': 'Your suspension has been lifted.',
  'suspended.logout': 'Log out',

  // ── Account deletion ─────────────────────────────────────────────────────────
  'auth.delete.title': 'Delete your account',
  'auth.delete.step1.title': 'Are you sure?',
  'auth.delete.step1.body':
    'This removes everything — your posts, your conversations, your identifier. Data is fully purged within 30 days. There is no undo.',
  'auth.delete.step2.label': 'Type "delete my account" to continue',
  'auth.delete.step2.placeholder': 'delete my account',
  'auth.delete.step2.phrase': 'delete my account',
  'auth.delete.step2.error': 'Please type the phrase exactly.',
  'auth.delete.step3.label': 'Enter your password to confirm',
  'auth.delete.step3.error': 'Incorrect password.',
  'auth.delete.cta': 'Delete permanently',
  'auth.delete.cancel': 'Keep my account',
  'auth.delete.deleted.title': 'Account deleted.',
  'auth.delete.deleted.body':
    'Your account and data will be fully removed within 30 days. Thank you for trying Akin.',
  'auth.delete.error.generic': 'Something went wrong. Please try again.',

  // ── Error Boundary ────────────────────────────────────────────────────────────
  'error.boundary.title': 'Something went wrong.',
  'error.boundary.body': 'Tap to try again. If it keeps happening, send us feedback.',
  'error.boundary.retry': 'Try again',
  'error.boundary.feedback': 'Send feedback',

  // ── Common ────────────────────────────────────────────────────────────────────
  'common.you': 'you',
  'common.selected': 'Selected',
  'common.ago': '{{time}} ago',
  'common.justNow': 'just now',
  'common.retry': 'Try again',
  'common.back': 'Back',
  'common.close': 'Close',
  'common.ok': 'OK',
  'common.loading': 'Loading…',
  'common.cancel': 'Cancel',

  // ── Profile (You tab) ────────────────────────────────────────────────────────
  'profile.title': 'You',
  'profile.joinedOn': 'Joined {{month}}',
  'profile.tab.myPosts': 'My Posts',
  'profile.tab.myActive': 'My Active',
  'profile.empty.myPosts': 'Nothing posted yet. Your future posts will live here.',
  'profile.empty.myActive': "You're not in any open conversations right now.",

  // ── Settings — additions for 8.2a Settings shell (sections + sign-out confirm) ──
  'settings.section.language': 'Language',
  'settings.section.appearance': 'Appearance',
  'settings.section.notifications': 'Notifications',
  'settings.section.blocked': 'Blocked users',
  'settings.placeholder.comingNext': 'Coming next',
  'settings.signOut.confirm.title': 'Sign out?',
  'settings.signOut.confirm.body':
    'You can sign back in any time with the same email. Your posts and identifier stay put.',
  'settings.signOut.confirm.cta': 'Sign out',
  'create.discardConfirm': 'Discard this draft? Your text will be lost.',
  'create.discard.keep': 'Go Back',
  'create.discard.confirm': 'Yes',
} as const;

// TranslationDict: all keys required, values are strings.
// Used to type-check sv.ts — every key in en.ts must exist in sv.ts.
export type TranslationDict = Record<keyof typeof en, string>;
