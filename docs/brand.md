# Akin — Brand & design positioning

> Read this before designing any user-facing screen or writing any user-visible copy. The "What it's definitely NOT" section is non-negotiable.

---

## 1. What the app needs to do

Akin gives single, dating-fatigued adults a private place to talk about dating with strangers from across the dating community — men, women, queer daters, the just-divorced, the never-partnered — who get it. No name attached, no feed of profiles, no spiralling into pile-ons.

The product does this by hosting small, capped, anonymous text discussions in 9 fixed categories, where every conversation has at most 4 people in it. The cap is the point: it forces real exchange between people who'd otherwise never hear each other out — the woman who's exhausted, the man who feels caricatured, the person who's not sure why their last three dates ghosted.

Success means a user opens Akin when something happens — a bad date, a confusing text, a moment of doubt — and finds three voices from the other side of the fence who answer like humans, not like opponents.

---

## 2. Brand-style positioning statement

**For** dating-fatigued adults in Sweden who are tired of swiping but still want to make sense of dating,
**Akin is** an anonymous mobile space for small, honest conversations across the dating community,
**unlike** dating apps (which are about matching), Reddit (which is vast and pile-on prone), or therapy (which is slow and expensive),
**Akin** strips away identity, scale, and noise so people can talk like they actually feel — and hear from people unlike them without the cost of confrontation.

Short version for taglines and the App Store:

> A quieter place to talk about dating.

(The marketing tagline — _"Connect with no names"_ — stays. The positioning above is what the design system is built against.)

---

## 3. What Akin is definitely NOT

This is the most important section because agents and designers default to the patterns of adjacent products unless told not to.

**Akin is NOT:**

- **A dating app.** No swiping, no profile photos, no matching, no "likes." No saturated red or pink. No heart icons.
- **A social network.** No followers, no follower counts, no public profiles, no @mentions, no "discover people" surfaces.
- **A productivity app.** No streaks, no badges, no XP, no levels, no goals, no progress bars. No green checkmarks. No celebratory confetti.
- **A wellness app pretending to be a friend.** No saccharine "you're doing great!" microcopy, no breathing-circle aesthetics, no soft-gradient pastels meant to soothe a panicking user.
- **A forum.** No upvote/downvote arrows, no karma, no thread trees, no nested-reply rabbit holes.
- **A therapy or coaching app.** No expert content, no curated programs, no daily check-ins, no mood logs.
- **A content platform.** No feed algorithm, no recommendations, no "for you," no creator tooling. The categories and chronology are the only sorting.
- **TikTok for dating.** No video. No vertical-scroll-with-overlays. No performance.

If a UI element looks at home in any of those products, it doesn't belong in Akin.

---

## 4. How it should feel to use

Five adjectives, each with a concrete interaction implication so the agent can act on them.

- **Calm.** Animations are short (200–250ms) and soft. No bouncy springs. No motion in the feed unless the user initiated it. The app never _demands_ attention.
- **Warm.** Off-white backgrounds, not pure white. Aubergine and terracotta over saturated brand colours. Serif accents in headlines, not just sans. Microcopy reads like a thoughtful friend, never like a corporate brand or a coach.
- **Restrained.** Generous whitespace. One primary action per screen. No dot-badges, no red counters, no "3 unread" nudges. If you can take something out, take it out.
- **Considered.** Loading states match the shape of real content (skeletons, not spinners). Empty states have a clear next action. Errors say what happened in plain language. Nothing feels random.
- **A little serious.** This is a place for words, not gifs. The visual language signals "what you say here matters" — without becoming clinical or austere. Closer to _Substack_ or _Granta_ than to _Headspace_ or _Calm_.

A useful phrase to keep in mind:

> **"It should feel like a quiet room with good lighting."**

If a design choice goes against that — a bright accent, a punchy CTA, a notification badge — it's the wrong choice.

---

## 5. Who it's really for (emotions + mindset)

The strategy's personas are demographic. What matters for design is the emotional posture the app has to meet. Three states the app must serve well:

### State 1 — "I just need to vent."

Often late at night. The user isn't looking for a solution; they're looking to put something into words and have it land somewhere that isn't their group chat. They want to type, hit send, and feel slightly lighter.

**Design implications.** Writing should be the most prominent thing the app lets you do. The Create Post flow has to feel low-friction and low-stakes — no progress bars, no "are you sure?" gates, no character counters that judge. A user in this state will give up if asked to do too much.

### State 2 — "Is this normal?"

The user has had an experience — a confusing text, a third date that ended weirdly, a pattern they're starting to see — and wants a reality check from people who aren't biased. Especially valuable is hearing from someone _unlike_ them: the other gender, a different age, a different orientation.

**Design implications.** Browsing and reading must feel rewarding even when the user posts nothing. The feed and post detail pages need to look inviting to a lurker. The participant count and spice level are the social signals that tell a lurker "real people from different sides are talking here."

### State 3 — "I want to think out loud, but not on the record."

The user has something thoughtful to say but won't say it on Instagram or Reddit because their name is attached. They want to be challenged honestly, not validated cheaply.

**Design implications.** The anonymous identifier must feel warm, not clinical. The 4-participant limit should feel like an invitation, not a restriction. The absence of upvotes/downvotes is what makes the discussion serious — don't let any equivalent mechanic creep in.

### What unites all three

A baseline emotional posture the design should never violate:

> The user is opening Akin in a moment of mild, private vulnerability. They are not in crisis, but they are not in a good mood either. They want to feel like the app is on their side, without the app trying too hard.

If a screen feels like it's _performing for_ the user — being too cheerful, too clever, too engaging — the design has gone wrong. Akin's job is to be a good listener, not a good entertainer.

---

## 6. The community thread that runs through everything

Worth saying explicitly because it's easy to design for the individual user and forget the community job:

Akin only works if **different kinds of daters end up in the same conversations.** A space where only one demographic vents to itself is a vent app. A space where opposing camps shout at each other is Twitter. The 4-person cap, the anonymity, and the chronological feed exist together to make a third thing possible — small rooms where someone hears from someone they wouldn't otherwise listen to.

The design has to keep that possibility alive. That means:

- **Never visually segment users by perceived gender, age, or any other identity attribute.** No coloured rings on identifiers. No stats. No filters that let users hide voices unlike their own.
- **The same UI for everyone.** No "men's space" or "women's space" or "queer space." The categories are about the _kind of conversation_, not the kind of person.
- **The friction that makes the community work — the cap, the anonymity, the lack of search — is a feature.** Don't sand it down for engagement.

This is the part of the brand that makes Akin worth building. Everything else — the calm aesthetic, the serif accents, the warm palette — supports it.
