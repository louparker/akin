// Swedish translations — primary locale
// TODO i18n review: have a native speaker review all copy before launch.
// Variable interpolation: {{varName}}

import type { TranslationDict } from './en';

export const sv: TranslationDict = {
  // ── App ─────────────────────────────────────────────────────────────────────
  'app.name': 'Akin',
  'app.tagline': 'En lugnare plats att prata om dejting.',

  // ── Navigation ───────────────────────────────────────────────────────────────
  'nav.tab.read': 'Läs',
  'nav.tab.write': 'Skriv',
  'nav.tab.you': 'Du',

  // ── Auth — Welcome ───────────────────────────────────────────────────────────
  'auth.welcome.headline': 'En lugnare plats\natt prata om\ndejting.',
  'auth.welcome.body':
    'Anonyma samtal med max fyra deltagare. Inga swipes, inga profiler, inga namn.',
  'auth.welcome.cta.signup': 'Skapa konto',
  'auth.welcome.cta.login': 'Jag har redan ett',
  'auth.welcome.tos': 'Genom att fortsätta godkänner du våra {{termsLink}} och {{privacyLink}}.',
  'auth.welcome.tos.terms': 'Villkor',
  'auth.welcome.tos.privacy': 'Integritetspolicy',

  // ── Auth — Sign Up ───────────────────────────────────────────────────────────
  'auth.signup.title': 'Skapa konto',
  'auth.signup.subtitle':
    'E-postadressen är privat. Används bara för inloggning och återställning av konto.',
  'auth.signup.email.label': 'E-post',
  'auth.signup.email.placeholder': 'din@epost.se',
  'auth.signup.password.label': 'Lösenord',
  'auth.signup.password.placeholder': '••••••••',
  'auth.signup.password.hint': 'Minst 8 tecken.',
  'auth.signup.age.label': 'Jag är 18 år eller äldre.',
  'auth.signup.age.description':
    'Akin är för vuxna. Vi kontrollerar inte ID – vi litar på att du bekräftar.',
  'auth.signup.cta': 'Fortsätt',
  'auth.signup.error.email_taken': 'Den e-postadressen är redan registrerad.',
  'auth.signup.error.weak_password': 'Lösenordet måste vara minst 8 tecken.',
  'auth.signup.error.age_required': 'Du måste bekräfta att du är 18 år eller äldre.',
  'auth.signup.error.generic': 'Något gick fel. Försök igen.',

  // ── Auth — Login ─────────────────────────────────────────────────────────────
  'auth.login.title': 'Välkommen tillbaka',
  'auth.login.email.label': 'E-post',
  'auth.login.password.label': 'Lösenord',
  'auth.login.forgot': 'Glömt lösenord',
  'auth.login.cta': 'Logga in',
  'auth.login.error.invalid': 'Fel e-post eller lösenord.',
  'auth.login.error.generic': 'Något gick fel. Försök igen.',

  // ── Auth — Verify Email ──────────────────────────────────────────────────────
  'auth.verify.title': 'Kolla din e-post',
  'auth.verify.body':
    'Vi har skickat en bekräftelselänk till {{email}}. Öppna den för att aktivera ditt konto.',
  'auth.verify.resend': 'Skicka igen',
  'auth.verify.resend.sent': 'Skickat.',
  'auth.verify.spam': 'Kolla skräpposten om den inte dyker upp.',

  // ── Auth — Identifier Reveal ─────────────────────────────────────────────────
  'auth.identifier.eyebrow': 'Det här är du här inne',
  'auth.identifier.body':
    'Alla får ett sådant här. Det förblir detsamma så att folk du pratar med kan känna igen dig. Det går inte att ändra senare och kan inte kopplas till din e-post.',
  'auth.identifier.examples.label': 'Andra du kommer att möta här:',
  'auth.identifier.cta.confirm': 'Det är jag',
  'auth.identifier.cta.retry': 'Prova ett annat',

  // ── Feed ─────────────────────────────────────────────────────────────────────
  'feed.tab.all': 'Alla',
  'feed.tab.categories': 'Kategorier',
  'feed.sort.recent': 'Senaste',
  'feed.sort.comments': 'Flest kommentarer',
  'feed.sort.spice': 'Högst spice',
  'feed.filter.title': 'Sortera & filtrera',
  'feed.filter.sortBy': 'Sortera efter',
  'feed.filter.minSpice': 'Minsta spice',
  'feed.filter.minSpice.any': 'Alla',
  'feed.filter.cta': 'Tillämpa',
  'feed.empty.title': 'Ingen har postat i {{category}} den senaste timmen.',
  'feed.empty.body': 'Prova en annan kategori, eller bli den första ikväll.',
  'feed.empty.cta': 'Starta en',
  'feed.error.title': 'Kunde inte ladda inlägg',
  'feed.error.retry': 'Försök igen',
  'feed.full.badge': '{{n}}/4 · full',
  'feed.participants.badge': '{{n}}/4',

  // ── Categories ───────────────────────────────────────────────────────────────
  'category.vent_space': 'Ventilera',
  'category.all_the_feels': 'Alla känslor',
  'category.advice_needed': 'Behöver råd',
  'category.just_wondering': 'Bara undrar',
  'category.story_time': 'Berättarstund',
  'category.decode_this': 'Tolka det här!',
  'category.aitoo': 'Var jag problemet?',
  'category.hypothetically': 'Hypotetiskt sett…',
  'category.good_vibes': 'Bara bra vibes',
  'category.vent_space.desc': 'Behöver bara lägga någonstans.',
  'category.all_the_feels.desc': 'När känslan är hela inlägget.',
  'category.advice_needed.desc': 'Du frågar. De svarar. Ärligt.',
  'category.just_wondering.desc': 'Frågor som är värda att ställa.',
  'category.story_time.desc': 'Saker som hänt. Berätta.',
  'category.decode_this.desc': 'Vad menade de egentligen.',
  'category.aitoo.desc': 'Var jag problemet. Var ärlig.',
  'category.hypothetically.desc': 'Tankeexperiment. Inget fel svar.',
  'category.good_vibes.desc': 'Små bra saker. På riktigt.',
  'category.open.label': 'öppna',
  'category.detail.filterLabel': 'Kategori',

  // ── Post Detail ───────────────────────────────────────────────────────────────
  'post.spice.label': 'Spicenivå',
  'post.spice.average': '{{avg}} snitt',
  'post.spice.votes': '{{n}} röster',
  'post.replies.label': '{{n}} svar',
  'post.op.badge': 'OP',
  'post.reply.placeholder': 'Svara i den här konversationen…',
  'post.full.lock': 'Den här konversationen är full.',
  'post.full.body':
    'Fyra personer pratar redan. Du kan fortsätta läsa – du kan bara inte gå med i den här. Taket är det som håller den liten.',
  'post.capacity': '{{filled}}/4',
  'post.capacity.full': '{{filled}}/4 · full',

  // ── Spice Vote Sheet ─────────────────────────────────────────────────────────
  'spice.sheet.title': 'Hur spicy var det här?',
  'spice.sheet.body':
    'En röst per inlägg. Hjälper andra att hitta konversationer som matchar deras humör.',
  'spice.1.label': 'Mild',
  'spice.1.desc': 'Tänker bara högt.',
  'spice.2.label': 'Lätt',
  'spice.2.desc': 'Lite egg.',
  'spice.3.label': 'Skarp',
  'spice.3.desc': 'Skär lite.',
  'spice.4.label': 'Het',
  'spice.4.desc': 'Rör vid en nerv.',
  'spice.5.label': 'Brinnande',
  'spice.5.desc': 'Allt är i brand.',

  // ── Active Limit Sheet ────────────────────────────────────────────────────────
  'limit.active.title': 'Du är redan med i tre konversationer.',
  'limit.active.body':
    'Avsluta en för att gå med i en ny. En konversation avslutas av sig själv när den når fyra deltagare.',
  'limit.active.cta': 'Förstått',
  'limit.full.error': 'Den här konversationen är full.',

  // ── DB errors → user-facing copy ─────────────────────────────────────────────
  'error.INSUFFICIENT_PARTICIPANT_SLOTS': 'Den här konversationen är full.',
  'error.USER_ACTIVE_LIMIT_REACHED':
    'Du är redan med i tre konversationer. Avsluta en för att gå med i en ny.',
  'error.CONTENT_FILTER_HIT': 'Ditt inlägg kunde inte skickas. Läs igenom gemenskapens riktlinjer.',
  'error.CONTACT_INFO_NOT_ALLOWED':
    'Kontaktuppgifter som telefonnummer eller e-post är inte tillåtna i inlägg.',
  'error.network': 'Kunde inte ansluta. Kontrollera din uppkoppling och försök igen.',
  'error.generic': 'Något gick fel. Försök igen.',

  // ── Create Post ───────────────────────────────────────────────────────────────
  'create.cancel': 'Avbryt',
  'create.submit': 'Posta',
  'create.category.label': 'Kategori',
  'create.category.placeholder': 'Välj en kategori',
  'create.title.placeholder': 'Vad tänker du på?',
  'create.body.placeholder':
    'Berätta mer. De som går med i konversationen ser allt du skriver här.',
  'create.footer.postingAs': 'Postar som',
  'create.footer.afterPost':
    'Tre andra kan gå med i konversationen. Sedan är den öppen bara för er fyra.',
  'create.charCount.title': 'Titel {{n}} / 150',
  'create.charCount.body': 'Text {{n}} / 2000',
  'create.picker.title': 'Välj en kategori',
  'create.guidelines.title': 'Innan du postar.',
  'create.guidelines.rule1.title': 'Tala för dig själv.',
  'create.guidelines.rule1.body':
    'Förstahandserfarenheter fungerar bäst. Generaliseringar om hela kön eller grupper gör det inte.',
  'create.guidelines.rule2.title': 'Var anonym, på båda håll.',
  'create.guidelines.rule2.body':
    'Dela inte namn, handtag eller något som kan identifiera någon du pratar om.',
  'create.guidelines.rule3.title': 'Håll inte med som en människa.',
  'create.guidelines.rule3.body':
    'Du kan ifrågasätta. Du kan inte vara grym. Taket innebär att den som går med stannar.',
  'create.guidelines.cta': 'Fortsätt',
  'create.guidelines.link': 'Läs alla riktlinjer',

  // ── Profile ───────────────────────────────────────────────────────────────────
  'profile.eyebrow': 'Du är',
  'profile.joined': 'gick med',
  'profile.stats.posts': '{{n}} inlägg',
  'profile.stats.replies': '{{n}} svar',
  'profile.active.title': 'Aktiva konversationer',
  'profile.active.count': '{{n}} / 3',
  'profile.active.hint': 'Avsluta en för att gå med i en ny.',
  'profile.active.empty': 'Du är inte med i några aktiva konversationer ännu.',
  'profile.posts.title': 'Dina inlägg',
  'profile.posts.empty': 'Du har inte postat något ännu.',

  // ── Settings ──────────────────────────────────────────────────────────────────
  'settings.title': 'Inställningar',
  'settings.account.title': 'Konto',
  'settings.account.email': 'E-post',
  'settings.account.changePassword': 'Byt lösenord',
  'settings.account.identifier': 'Identifierare',
  'settings.safety.title': 'Trygghet',
  'settings.safety.blocked': 'Blockerade',
  'settings.safety.notifications': 'Aviseringar',
  'settings.notifications.off': 'Av',
  'settings.legal.title': 'Juridiskt',
  'settings.legal.privacy': 'Integritetspolicy',
  'settings.legal.terms': 'Användarvillkor',
  'settings.legal.guidelines': 'Gemenskapens riktlinjer',
  'settings.support.title': 'Support',
  'settings.support.feedback': 'Skicka feedback',
  'settings.support.version': 'Appversion',
  'settings.logout': 'Logga ut',
  'settings.deleteAccount': 'Radera konto',
  'settings.deleteAccount.confirm.title': 'Radera ditt konto?',
  'settings.deleteAccount.confirm.body':
    'Det tar bort allt – dina inlägg, konversationer och identifierare. Det går inte att ångra.',
  'settings.deleteAccount.confirm.cta': 'Ja, radera mitt konto',
  'settings.deleteAccount.confirm.cancel': 'Behåll mitt konto',

  // ── Blocked users ─────────────────────────────────────────────────────────────
  'blocked.title': 'Blockerade',
  'blocked.explanation':
    'Deras inlägg och svar förblir osynliga för dig. De får inte veta att du blockerat dem.',
  'blocked.unblock': 'Avblockera',
  'blocked.empty': 'Du har inte blockerat någon.',
  'blocked.date': 'Blockerades {{date}}',

  // ── Report Sheet ─────────────────────────────────────────────────────────────
  'report.title.comment': 'Rapportera den här kommentaren',
  'report.title.post': 'Rapportera det här inlägget',
  'report.body':
    'En riktig person läser varje rapport. Vi agerar inte automatiskt. Välj det närmaste skälet.',
  'report.reason.harassment': 'Trakasserier eller utpekande',
  'report.reason.identifying': 'Identifierar någon',
  'report.reason.hate': 'Hat eller skällsord',
  'report.reason.sexual': 'Sexuellt innehåll som involverar minderåriga',
  'report.reason.spam': 'Skräppost eller offtopic',
  'report.reason.other': 'Något annat',
  'report.cta': 'Skicka rapport',
  'report.success': 'Rapport skickad.',

  // ── Common ────────────────────────────────────────────────────────────────────
  'common.you': 'du',
  'common.ago': '{{time}} sedan',
  'common.justNow': 'just nu',
  'common.retry': 'Försök igen',
  'common.back': 'Tillbaka',
  'common.close': 'Stäng',
  'common.loading': 'Laddar…',
} as const;
