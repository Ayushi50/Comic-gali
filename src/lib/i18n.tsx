import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Lang } from '../types';
import { load, save } from './storage';

export type UiLang = 'hl' | 'en' | 'hi';
export const UI_LANGS: { id: UiLang; label: string }[] = [
  { id: 'hl', label: 'Hinglish' },
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'हिन्दी' },
];

/** Native names for the ten content languages. */
export const LANG_NAMES: Record<Lang, string> = {
  en: 'English', hi: 'हिन्दी', ta: 'தமிழ்', te: 'తెలుగు', bn: 'বাংলা',
  mr: 'मराठी', gu: 'ગુજરાતી', kn: 'ಕನ್ನಡ', ml: 'മലയാളം', pa: 'ਪੰਜਾਬੀ',
};
/** BCP-47 tags used for speech synthesis and the `lang` attribute. */
export const LANG_TAG: Record<Lang, string> = {
  en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', bn: 'bn-IN', mr: 'mr-IN', gu: 'gu-IN', kn: 'kn-IN', ml: 'ml-IN', pa: 'pa-IN',
};

type Dict = Record<string, string>;
const hl: Dict = {
  'nav.comics': 'Comics', 'nav.kahani': 'Kahaniyan', 'nav.suno': 'Suno', 'nav.library': 'Library', 'nav.submit': 'Apni kahani bhejo',
  'signin': 'Login', 'signout': 'Sign out', 'theme': 'Light ya dark mode badlo', 'dys': 'Dyslexia-friendly font', 'sound': 'Stall ki awaaz',
  'hero.eyebrow': 'Indian comics · Padho aur suno', 'hero.l1': 'Har gali ki', 'hero.l2': 'kahani.',
  'hero.sub': 'Bachpan wali comics aur kahaniyan — padho bhi, suno bhi.', 'cta.read': 'Padhna shuru karo', 'cta.listen': 'Suno',
  'home.today': 'Aaj kya padhein?', 'home.all': 'Poori library →', 'home.padho.sub': 'panna-panna, panel-panel.', 'home.open': 'Reader kholo →',
  'home.kahaniyan': 'Kahaniyan', 'home.soon': 'Jaldi aa rahi hain', 'home.soon.sub': 'Publishers se licence milte hi.',
  'home.quote': '“Bas ek aur comic, phir so jaunga.”', 'home.quote.by': '— hum sab, bachpan mein', 'home.which': 'Aaj kaunsi kahani?',
  'foot.tag': 'Bachpan, phir se.', 'foot.takedown': 'Takedown', 'foot.sources': 'Sources', 'foot.submit': 'Creators',
  'lib.title': 'Library', 'lib.search': 'Comic ya kahani dhoondo', 'f.all': 'Sab', 'f.comics': 'Comics', 'f.kahani': 'Kahaniyan', 'f.audio': 'Sunne layak', 'f.fav': 'Pasand',
  'lib.lang': 'Bhasha', 'lib.genre': 'Genre', 'lib.age': 'Umar', 'lib.rights': 'Rights', 'lib.any': 'Koi bhi', 'lib.none': 'Kuch nahi mila. Doosra filter try karo.',
  'lib.continue': 'JAHAN CHHODA THA', 'lib.continue.go': 'Aage padho', 'lib.soonshelf': 'Jaldi aa rahe hain',
  'read': 'Padho', 'readlisten': 'Padho · Suno', 'soon': 'Jaldi aa raha hai', 'continue': 'Aage padho', 'panel': 'Panel',
  'title.langs': 'Bhashayein', 'title.fav': 'Library mein jodo', 'title.faved': 'Library mein hai', 'title.more': 'Aise aur',
  'title.offline': 'Offline save karo', 'title.offline.done': 'Offline save ho gaya', 'title.credits': 'Credits aur licence',
  'title.author': 'Credit', 'title.license': 'Licence', 'title.source': 'Source', 'title.verified': 'Verify kiya', 'title.publisher': 'Publisher',
  'title.soon.body': 'Yeh title abhi sirf shelf par hai. Hum publisher se licence maang rahe hain — koi copyrighted art ya text yahan nahi hai.',
  'title.notify': 'Aane par batao', 'title.notified': 'Theek hai, yaad rakhenge', 'title.takedown': 'Is title par shikayat?',
  'rd.flip': 'Panna', 'rd.panel': 'Panel', 'rd.scroll': 'Scroll', 'rd.back': 'Wapas', 'rd.dir': 'Padhne ki disha', 'rd.ltr': 'Baayein se daayein', 'rd.rtl': 'Daayein se baayein',
  'rd.prev': 'Pichhla', 'rd.next': 'Agla', 'rd.zoomin': 'Zoom in', 'rd.zoomout': 'Zoom out', 'rd.lang': 'Bhasha', 'rd.page': 'Page',
  'ls.play': 'Play', 'ls.pause': 'Pause', 'ls.speed': 'Raftaar', 'ls.sleep': 'Sleep timer', 'ls.off': 'Band', 'ls.min': 'min', 'ls.drive': 'Driving mode', 'ls.exit': 'Band karo',
  'ls.auto': 'Auto-advance', 'ls.novoice': 'Is browser mein is bhasha ki awaaz nahi mili. Text padh sakte ho; doosre browser ya device par try karo.',
  'ls.asread': 'Comic ki tarah padho →', 'ls.next': 'Aage suno', 'ls.nospeech': 'Is browser mein speech synthesis nahi hai.',
  'si.h': 'Login', 'si.sub': 'Apni library aur bookmarks wapas pao.', 'si.name': 'Naam', 'si.go': 'Start It', 'si.note': 'Abhi account ka backend nahi hai. Aapka naam sirf is device par save hota hai.', 'si.tag': 'Kahaniyan intezaar kar rahi hain.',
  'sub.h': 'Apni kahani bhejo', 'takedown.h': 'Takedown request', 'sources.h': 'Sources aur licence',
  'nf': 'Yeh page nahi mila.', 'loading': 'Khul raha hai…',
  'ls.device': 'Device ki awaaz. Is hisse ki recorded awaaz abhi nahi hai.', 'ls.ai': 'AI awaaz, review baaki — kisi native speaker ne abhi yeh recording check nahi ki.', 'ls.tip': 'Your device only has a basic voice for this language. For a more natural one: in Edge or Chrome pick an “Online (Natural)” voice; on iPhone/Mac install an Enhanced voice in Settings → Accessibility → Spoken Content → Voices; on Android install Google Text-to-speech voice data.', 'ls.review': 'Native speaker ho? Is awaaz ko review karne mein madad karo →', 'si.email': 'Email', 'si.magic': 'Mujhe sign-in link email karo', 'si.google': 'Google se aage badho', 'si.guest': 'Bina sign-in ke aage badho', 'si.sync': 'Sign-in karne par favourites aur padhne ki jagah sab devices par sync hoti hai. Padhne-sunne ke liye account kabhi zaroori nahi.', 'mt.note': '',
};
const en: Dict = {
  ...hl,
  'nav.comics': 'Comics', 'nav.kahani': 'Stories', 'nav.suno': 'Listen', 'nav.library': 'Library', 'nav.submit': 'Submit your work',
  'signin': 'Login', 'signout': 'Sign out', 'theme': 'Switch light or dark mode', 'dys': 'Dyslexia-friendly font', 'sound': 'Stall sound',
  'hero.eyebrow': 'Indian comics · Read and listen', 'hero.l1': 'Every street has', 'hero.l2': 'a story.',
  'hero.sub': 'Childhood comics and stories — to read, and to listen to.', 'cta.read': 'Start reading', 'cta.listen': 'Listen',
  'home.today': 'What shall we read today?', 'home.all': 'Whole library →', 'home.padho.sub': 'page by page, panel by panel.', 'home.open': 'Open the reader →',
  'home.kahaniyan': 'Stories', 'home.soon': 'Coming soon', 'home.soon.sub': 'As soon as publishers grant a licence.',
  'home.quote': '“Just one more comic, then I’ll sleep.”', 'home.quote.by': '— all of us, as children', 'home.which': 'Which story today?',
  'foot.tag': 'Childhood, again.', 'foot.takedown': 'Takedown', 'foot.sources': 'Sources', 'foot.submit': 'Creators',
  'lib.title': 'Library', 'lib.search': 'Search comics and stories', 'f.all': 'All', 'f.comics': 'Comics', 'f.kahani': 'Stories', 'f.audio': 'Listenable', 'f.fav': 'Favourites',
  'lib.lang': 'Language', 'lib.genre': 'Genre', 'lib.age': 'Age', 'lib.rights': 'Rights', 'lib.any': 'Any', 'lib.none': 'Nothing found. Try another filter.',
  'lib.continue': 'WHERE YOU LEFT OFF', 'lib.continue.go': 'Continue reading', 'lib.soonshelf': 'Coming soon',
  'read': 'Read', 'readlisten': 'Read · Listen', 'soon': 'Coming soon', 'continue': 'Continue', 'panel': 'Panel',
  'title.langs': 'Languages', 'title.fav': 'Add to library', 'title.faved': 'In your library', 'title.more': 'More like this',
  'title.offline': 'Save for offline', 'title.offline.done': 'Saved for offline', 'title.credits': 'Credits and licence',
  'title.author': 'Credit', 'title.license': 'Licence', 'title.source': 'Source', 'title.verified': 'Verified on', 'title.publisher': 'Publisher',
  'title.soon.body': 'This title is only a placeholder on the shelf. We are asking the publisher for a licence — no copyrighted art or text is shown here.',
  'title.notify': 'Tell me when it arrives', 'title.notified': 'Noted — we’ll remember', 'title.takedown': 'Concern about this title?',
  'rd.flip': 'Page', 'rd.panel': 'Panel', 'rd.scroll': 'Scroll', 'rd.back': 'Back', 'rd.dir': 'Reading direction', 'rd.ltr': 'Left to right', 'rd.rtl': 'Right to left',
  'rd.prev': 'Previous', 'rd.next': 'Next', 'rd.zoomin': 'Zoom in', 'rd.zoomout': 'Zoom out', 'rd.lang': 'Language', 'rd.page': 'Page',
  'ls.play': 'Play', 'ls.pause': 'Pause', 'ls.speed': 'Speed', 'ls.sleep': 'Sleep timer', 'ls.off': 'Off', 'ls.min': 'min', 'ls.drive': 'Driving mode', 'ls.exit': 'Close',
  'ls.auto': 'Auto-advance', 'ls.novoice': 'No voice for this language was found in this browser. You can still read the text; try another browser or device.',
  'ls.asread': 'Read it as a comic →', 'ls.next': 'Listen next', 'ls.nospeech': 'This browser has no speech synthesis.',
  'si.h': 'Login', 'si.sub': 'Get your library and bookmarks back.', 'si.name': 'Name', 'si.go': 'Start It', 'si.note': 'There is no account backend yet. Your name is saved only on this device.', 'si.tag': 'The stories are waiting.',
  'sub.h': 'Submit your work', 'takedown.h': 'Takedown request', 'sources.h': 'Sources and licences',
  'nf': 'That page does not exist.', 'loading': 'Loading…',
  'ls.device': 'Device voice. Recorded audio is not available for this part.', 'ls.ai': 'AI voice, unreviewed — a native speaker has not yet checked this recording.', 'ls.tip': 'Your device only has a basic voice for this language. For a more natural one: in Edge or Chrome pick an “Online (Natural)” voice; on iPhone/Mac install an Enhanced voice in Settings → Accessibility → Spoken Content → Voices; on Android install Google Text-to-speech voice data.', 'ls.review': 'Native speaker? Help review this voice →', 'si.email': 'Email', 'si.magic': 'Email me a sign-in link', 'si.google': 'Continue with Google', 'si.guest': 'Continue without signing in', 'si.sync': 'Signing in syncs your favourites and reading position across devices. Reading and listening never need an account.', 'mt.note': '',
};
const hi: Dict = {
  ...en,
  'nav.comics': 'कॉमिक्स', 'nav.kahani': 'कहानियाँ', 'nav.suno': 'सुनो', 'nav.library': 'लाइब्रेरी', 'nav.submit': 'अपनी कहानी भेजो',
  'signin': 'लॉगिन', 'theme': 'लाइट या डार्क मोड बदलो', 'dys': 'डिस्लेक्सिया-अनुकूल फ़ॉन्ट', 'sound': 'गली की आवाज़',
  'hero.eyebrow': 'भारतीय कॉमिक्स · पढ़ो और सुनो', 'hero.l1': 'हर गली की', 'hero.l2': 'एक कहानी।',
  'hero.sub': 'बचपन वाली कॉमिक्स और कहानियाँ — पढ़ो भी, सुनो भी।', 'cta.read': 'पढ़ना शुरू करो', 'cta.listen': 'सुनो',
  'home.today': 'आज क्या पढ़ें?', 'home.all': 'पूरी लाइब्रेरी →', 'home.padho.sub': 'पन्ना-पन्ना, पैनल-पैनल।', 'home.open': 'रीडर खोलो →',
  'home.kahaniyan': 'कहानियाँ', 'home.soon': 'जल्द आ रही हैं', 'home.soon.sub': 'प्रकाशकों से लाइसेंस मिलते ही।',
  'home.quote': '“बस एक और कॉमिक, फिर सो जाऊँगा।”', 'home.quote.by': '— हम सब, बचपन में', 'home.which': 'आज कौन-सी कहानी?',
  'foot.tag': 'बचपन, फिर से।', 'foot.takedown': 'टेकडाउन', 'foot.sources': 'स्रोत', 'foot.submit': 'रचनाकार',
  'lib.title': 'लाइब्रेरी', 'lib.search': 'कॉमिक या कहानी ढूँढो', 'f.all': 'सब', 'f.comics': 'कॉमिक्स', 'f.kahani': 'कहानियाँ', 'f.audio': 'सुनने लायक', 'f.fav': 'पसंद',
  'lib.lang': 'भाषा', 'lib.genre': 'विधा', 'lib.age': 'उम्र', 'lib.rights': 'अधिकार', 'lib.any': 'कोई भी', 'lib.none': 'कुछ नहीं मिला। दूसरा फ़िल्टर आज़माओ।',
  'lib.continue': 'जहाँ छोड़ा था', 'lib.continue.go': 'आगे पढ़ो', 'lib.soonshelf': 'जल्द आ रहे हैं',
  'read': 'पढ़ो', 'readlisten': 'पढ़ो · सुनो', 'soon': 'जल्द आ रहा है', 'continue': 'आगे पढ़ो', 'panel': 'पैनल',
  'title.langs': 'भाषाएँ', 'title.fav': 'लाइब्रेरी में जोड़ो', 'title.faved': 'लाइब्रेरी में है', 'title.more': 'ऐसे और',
  'title.offline': 'ऑफ़लाइन सेव करो', 'title.offline.done': 'ऑफ़लाइन सेव हो गया', 'title.credits': 'श्रेय और लाइसेंस',
  'rd.flip': 'पन्ना', 'rd.panel': 'पैनल', 'rd.scroll': 'स्क्रॉल', 'rd.back': 'वापस', 'rd.prev': 'पिछला', 'rd.next': 'अगला', 'rd.lang': 'भाषा',
  'ls.play': 'चलाओ', 'ls.pause': 'रोको', 'ls.speed': 'रफ़्तार', 'ls.sleep': 'स्लीप टाइमर', 'ls.off': 'बंद', 'ls.drive': 'ड्राइविंग मोड', 'ls.exit': 'बंद करो',
  'ls.asread': 'कॉमिक की तरह पढ़ो →', 'ls.next': 'आगे सुनो',
  'si.h': 'लॉगिन', 'si.sub': 'अपनी लाइब्रेरी और बुकमार्क वापस पाओ।', 'si.name': 'नाम', 'si.go': 'शुरू करो', 'si.tag': 'कहानियाँ इंतज़ार कर रही हैं।',
  'nf': 'यह पन्ना नहीं मिला।', 'loading': 'खुल रहा है…',
  'ls.auto': 'अपने-आप आगे बढ़ो', 'ls.min': 'मिनट', 'ls.nospeech': 'इस ब्राउज़र में आवाज़ पढ़ने की सुविधा नहीं है।', 'ls.novoice': 'इस ब्राउज़र में इस भाषा की कोई आवाज़ नहीं मिली। आप पाठ पढ़ सकते हैं; कोई दूसरा ब्राउज़र या डिवाइस आज़माएँ।', 'rd.dir': 'पढ़ने की दिशा', 'rd.ltr': 'बाएँ से दाएँ', 'rd.page': 'पृष्ठ', 'rd.rtl': 'दाएँ से बाएँ', 'rd.zoomin': 'ज़ूम इन', 'rd.zoomout': 'ज़ूम आउट', 'si.note': 'अभी खाता बनाने की सुविधा नहीं है। आपका नाम सिर्फ़ इसी डिवाइस पर सेव होता है।', 'signout': 'साइन आउट', 'sources.h': 'स्रोत और लाइसेंस', 'sub.h': 'अपनी कहानी भेजो', 'takedown.h': 'हटाने का अनुरोध', 'title.author': 'श्रेय', 'title.license': 'लाइसेंस', 'title.notified': 'ठीक है, हम याद रखेंगे', 'title.notify': 'आने पर बताओ', 'title.publisher': 'प्रकाशक', 'title.soon.body': 'यह शीर्षक अभी सिर्फ़ शेल्फ़ पर एक जगह है। हम प्रकाशक से लाइसेंस माँग रहे हैं — यहाँ कोई कॉपीराइट चित्र या पाठ नहीं दिखाया गया है।', 'title.source': 'स्रोत', 'title.takedown': 'इस शीर्षक से कोई शिकायत?', 'title.verified': 'जाँचा गया', 'ls.device': 'डिवाइस की आवाज़। इस हिस्से की रिकॉर्डेड आवाज़ उपलब्ध नहीं है।', 'ls.ai': 'AI आवाज़, समीक्षा बाकी — किसी मातृभाषी ने अभी यह रिकॉर्डिंग नहीं जाँची है।', 'ls.tip': 'आपके डिवाइस में इस भाषा की सिर्फ़ साधारण आवाज़ है। बेहतर आवाज़ के लिए: Edge या Chrome में “Online (Natural)” आवाज़ चुनें; iPhone/Mac में सेटिंग्स → एक्सेसिबिलिटी → Spoken Content → Voices से Enhanced आवाज़ इंस्टॉल करें; Android में Google Text-to-speech की आवाज़ें इंस्टॉल करें।', 'ls.review': 'मातृभाषी हैं? इस आवाज़ की समीक्षा में मदद करें →', 'si.email': 'ईमेल', 'si.magic': 'मुझे साइन-इन लिंक ईमेल करें', 'si.google': 'Google से जारी रखें', 'si.guest': 'बिना साइन-इन के जारी रखें', 'si.sync': 'साइन-इन करने पर आपके पसंदीदा और पढ़ने की जगह सभी डिवाइस पर सिंक होती है। पढ़ने-सुनने के लिए खाता कभी ज़रूरी नहीं।', 'mt.note': 'यह हिन्दी अनुवाद मशीन से किया गया है और किसी मातृभाषी की समीक्षा बाकी है।',
};
const DICTS: Record<UiLang, Dict> = { hl, en, hi };

interface Ctx { ui: UiLang; setUi: (u: UiLang) => void; t: (k: string) => string; pick: (l?: Partial<Record<Lang, string>>) => string }
const I18n = createContext<Ctx>(null as unknown as Ctx);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [ui, setUiState] = useState<UiLang>(() => load<UiLang>('cg:ui', 'hl'));
  const setUi = (u: UiLang) => { setUiState(u); save('cg:ui', u); };
  useEffect(() => { document.documentElement.lang = ui === 'hi' ? 'hi' : ui === 'en' ? 'en' : 'hi-Latn'; }, [ui]);
  const value = useMemo<Ctx>(() => {
    const d = DICTS[ui];
    const t = (k: string) => d[k] ?? en[k] ?? k;
    // pick a localized title/blurb: prefer Hindi for hi/hl UI, else English
    const pick = (l?: Partial<Record<Lang, string>>) => (l ? (ui === 'hi' ? l.hi ?? l.en : l.en ?? l.hi ?? Object.values(l)[0]) ?? '' : '');
    return { ui, setUi, t, pick };
  }, [ui]);
  return <I18n.Provider value={value}>{children}</I18n.Provider>;
}
export const useI18n = () => useContext(I18n);
