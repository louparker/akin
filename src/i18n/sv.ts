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
  'auth.welcome.tos.prefix': 'Genom att fortsätta godkänner du våra ',
  'auth.welcome.tos.conjunction': ' och ',
  'auth.welcome.tos.suffix': '.',
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
  'auth.login.signup': 'Har du inget konto?',
  'auth.login.error.invalid': 'Fel e-post eller lösenord.',
  'auth.login.error.rateLimit': 'För många försök. Försök igen om {{n}} minuter.',
  'auth.login.error.generic': 'Något gick fel. Försök igen.',

  // ── Auth — Password Reset ────────────────────────────────────────────────────
  'auth.reset.title': 'Glömt lösenordet?',
  'auth.reset.subtitle': 'Ange din e-post så skickar vi en återställningslänk.',
  'auth.reset.email.label': 'E-post',
  'auth.reset.cta': 'Skicka återställningslänk',
  'auth.reset.sent.title': 'Kolla din e-post',
  'auth.reset.sent.body':
    'Om vi har ett konto för den e-postadressen skickar vi en återställningslänk inom kort.',
  'auth.resetConfirm.title': 'Välj ett nytt lösenord',
  'auth.resetConfirm.password.label': 'Nytt lösenord',
  'auth.resetConfirm.confirm.label': 'Bekräfta nytt lösenord',
  'auth.resetConfirm.cta': 'Spara nytt lösenord',
  'auth.resetConfirm.error.mismatch': 'Lösenorden matchar inte.',
  'auth.resetConfirm.error.weak': 'Lösenordet måste vara minst 8 tecken.',
  'auth.resetConfirm.error.generic': 'Något gick fel. Försök igen.',
  'auth.resetConfirm.success': 'Lösenord uppdaterat. Du är nu inloggad.',

  // ── Auth — Signup: confirm password (added by Task 4.2) ──────────────────────
  'auth.signup.confirmPassword.label': 'Bekräfta lösenord',
  'auth.signup.confirmPassword.placeholder': '••••••••',
  'auth.signup.error.password_mismatch': 'Lösenorden matchar inte.',

  // ── Auth — Verify Email ──────────────────────────────────────────────────────
  'auth.verify.title': 'Kolla din e-post',
  'auth.verify.body':
    'Vi har skickat en bekräftelselänk till {{email}}. Öppna den för att aktivera ditt konto.',
  'auth.verify.resend': 'Skicka igen',
  'auth.verify.resend.sent': 'Skickat.',
  'auth.verify.resend.countdown': 'Skicka igen om {{n}}s',
  'auth.verify.spam': 'Kolla skräpposten om den inte dyker upp.',
  'auth.verify.wrongEmail': 'Fel e-post?',
  'auth.verify.signOut': 'Använd en annan e-post',

  // ── Auth — Identifier Reveal ─────────────────────────────────────────────────
  'auth.identifier.eyebrow': 'Det här är du här inne',
  'auth.identifier.body':
    'Alla får ett sådant här. Det förblir detsamma så att folk du pratar med kan känna igen dig. Det går inte att ändra senare och kan inte kopplas till din e-post.',
  'auth.identifier.examples.label': 'Andra du kommer att möta här:',
  'auth.identifier.cta.confirm': 'Det är jag',
  'auth.identifier.cta.retry': 'Prova ett annat',
  'auth.identifier.loading': 'Förbereder ditt namn…',
  'auth.identifier.error': 'Kunde inte förbereda ditt namn.',

  // ── Auth — Onboarding ────────────────────────────────────────────────────────
  'auth.onboarding.skip': 'Hoppa över',
  'auth.onboarding.next': 'Nästa',
  'auth.onboarding.getStarted': 'Kom igång',
  'auth.onboarding.screen1.title': 'Anonymt, av design',
  'auth.onboarding.screen1.body':
    'Din identifierare är hur folk känner igen dig här. Ingen profilbild, inget riktigt namn, inga DM. Alla är på samma nivå.',
  'auth.onboarding.screen2.title': 'Små konversationer',
  'auth.onboarding.screen2.body':
    'Varje inlägg har plats för 1 skribent och 3 svar. Fyra personer max. Du kan vara aktiv i 3 konversationer samtidigt.',
  'auth.onboarding.screen3.title': '9 kategorier, ingen algoritm',
  'auth.onboarding.screen3.body':
    'Bläddra efter vad du känner för att prata om. Flödet visar de senaste inläggen – inget lyfts fram eller begravs.',

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

  // ── Post / Comment menus ─────────────────────────────────────────────────────
  'post.menu.report': 'Rapportera inlägg',
  'post.menu.block': 'Blockera användaren',
  'comment.menu.report': 'Rapportera kommentar',
  'block.confirm.title': 'Blockera den här personen?',
  'block.confirm.body': 'Du kommer inte se deras inlägg eller kommentarer. De får inte veta det.',
  'block.confirm.cta': 'Blockera',
  'block.confirm.cancel': 'Avbryt',
  'post.send.label': 'Skicka svar',

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

  // ── Banned screen ────────────────────────────────────────────────────────────
  'banned.title': 'Ditt konto har stängts av permanent.',
  'banned.body':
    'Om du tror att det är ett misstag, kontakta hi@akin.app. Du kan exportera dina uppgifter eller radera ditt konto nedan.',
  'banned.logout': 'Logga ut',
  'banned.deleteAccount': 'Radera mitt konto',

  // ── Suspended screen ─────────────────────────────────────────────────────────
  'suspended.title': 'Ditt konto är tillfälligt avstängt.',
  'suspended.body':
    'Du kan läsa inlägg men inte posta eller kommentera förrän avstängningen upphör.',
  'suspended.countdown': 'Avstängt i {{time}} till.',
  'suspended.lifted': 'Din avstängning har hävts.',
  'suspended.logout': 'Logga ut',

  // ── Account deletion ─────────────────────────────────────────────────────────
  'auth.delete.title': 'Radera ditt konto',
  'auth.delete.step1.title': 'Är du säker?',
  'auth.delete.step1.body':
    'Det här tar bort allt – dina inlägg, konversationer och identifierare. Data raderas helt inom 30 dagar. Det går inte att ångra.',
  'auth.delete.step2.label': 'Skriv "radera mitt konto" för att fortsätta',
  'auth.delete.step2.placeholder': 'radera mitt konto',
  'auth.delete.step2.phrase': 'radera mitt konto',
  'auth.delete.step2.error': 'Ange frasen exakt.',
  'auth.delete.step3.label': 'Ange ditt lösenord för att bekräfta',
  'auth.delete.step3.error': 'Felaktigt lösenord.',
  'auth.delete.cta': 'Radera permanent',
  'auth.delete.cancel': 'Behåll mitt konto',
  'auth.delete.deleted.title': 'Konto raderat.',
  'auth.delete.deleted.body':
    'Ditt konto och dina uppgifter tas bort helt inom 30 dagar. Tack för att du prövade Akin.',
  'auth.delete.error.generic': 'Något gick fel. Försök igen.',

  // ── Error Boundary ────────────────────────────────────────────────────────────
  'error.boundary.title': 'Något gick fel.',
  'error.boundary.body': 'Tryck för att försöka igen. Om det fortsätter, skicka feedback.',
  'error.boundary.retry': 'Försök igen',
  'error.boundary.feedback': 'Skicka feedback',

  // ── Common ────────────────────────────────────────────────────────────────────
  'common.you': 'du',
  'common.ago': '{{time}} sedan',
  'common.justNow': 'just nu',
  'common.retry': 'Försök igen',
  'common.back': 'Tillbaka',
  'common.close': 'Stäng',
  'common.loading': 'Laddar…',
  'common.cancel': 'Avbryt',
  'create.discardConfirm': 'Kasta utkastet? Din text försvinner.',
  'create.discard.keep': 'Gå tillbaka',
  'create.discard.confirm': 'Ja',
} as const;
