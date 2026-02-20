
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { jsPDF } from 'jspdf';
import { AppStep, UserInput, StoryStyle, TargetAudience, StoryPlan, Scene, ExtraAsset, KidsStoryTemplate } from './types';

const LOGO_PATH = '/logo.png';
/** App-only: allowed inner scene counts (default 15). */
const SCENE_COUNT_OPTIONS = [10, 12, 15, 18, 30];
import { generateStoryPlan, generateSceneImage, analyzeImage, describeAsset, editSceneImage, analyzePhotoQuality, validateBookSpread, generateCoverPlan } from './geminiService';
import { buildRamadanStoryPlan, RAMADAN_INNER_SCENES } from './ramadanTemplate';


const THEME_OPTIONS = [
  "Amour", "Amitié", "Courage", "Environnement", "Mystère",
  "Aventure", "Magie", "Espace", "Histoire", "Futuriste",
  "Persévérance", "Humour", "Famille", "Nature", "Animaux",
  "Super-héros", "Pirates", "Chevaliers", "Dinosaures", "Découverte",
  "Partage", "Justice", "Science", "Musique", "Sport", "Voyage",
  "Océan", "Rêves", "Égalité", "Sagesse", "Curiosité"
];

const LANGUAGES = ["French", "Arabic", "English", "Spanish"];

type LoversStoryType = '10_REASONS' | 'LOVE_STORY' | 'BUCKET_LIST' | 'CUSTOM_STORY' | null;
type RecipientType = 'HIM' | 'HER';

const BACKEND_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL) || '';

export interface SheetContext {
  outputFolderId: string;
  spreadsheetId: string;
  rowIndex: number;
  webhookUrl: string;
  webhookSecret: string;
  buyerName: string;
  /** e.g. 'kids_orders' for Ramadan cover flow so webhook updates the correct sheet tab */
  sheetName?: string;
}

const TRANSLATIONS = {
  French: {
    appTitle: "Livre Magique Lab",
    subtitle: "Moteur de Contes Créatifs",
    step1: "Identité",
    step2: "Planification",
    step3: "Création",
    characterIdentity: "Identité des Personnages",
    mainCharacter: "Personnage Principal",
    partnerIdentity: "Identité du Partenaire",
    name: "Nom",
    age: "Âge",
    gender: "Genre",
    male: "Homme",
    female: "Femme",
    other: "Autre",
    uploadPhoto: "Charger Photo",
    storyBlueprint: "Schéma de l'Histoire",
    targetAudience: "Public Cible",
    kids: "Enfants",
    adults: "Adultes",
    lovers: "Amoureux",
    themeDetails: "Thème et Détails",
    offeredTo: "Livre Offert À :",
    toHer: "À ELLE",
    toHim: "À LUI",
    yearsOfLove: "Nombre d'années d'amour",
    ans: "Ans",
    chooseOptions: "Choisissez vos options (max 15) :",
    customOption: "Option Personnalisée",
    placeholderReasons: "Écrivez votre propre raison ici...",
    placeholderStory: "Racontez un souvenir spécial...",
    placeholderBucket: "Quel est votre rêve le plus fou ?...",
    placeholderTheme: "Une aventure magique...",
    artStyle: "Style Artistique",
    language: "Langue du Livre",
    wordsPerPage: "Mots / Page",
    addAssets: "Ajouter des Atouts",
    generateSynopsis: "Générer le Synopsis",
    synopsisTitle: "Synopsis Maître de l'Histoire",
    copyPrompts: "Copier les Prompts",
    confirmPlan: "Confirmer le Plan et Illustrer",
    page: "Page",
    regenerate: "Régénérer",
    analyze: "Analyser",
    cropSplit: "Recadrer & Diviser",
    downloadPdf: "Télécharger PDF (32 Pages)",
    versionHistory: "Historique des Versions",
    restore: "Restaurer",
    editDetails: "Instructions de Retouche",
    generatingArt: "Génération de l'œuvre...",
    book1Title: (name: string, gender: string) => `Livre 1 : "Raisons pour lesquelles je l'aime (${gender === 'HER' ? 'Elle' : 'Lui'}), ${name || '[Nom]'}"`,
    book2Title: (n1: string, n2: string, years: string) => `Livre 2 : "${n1 || '[Lui]'} & ${n2 || '[Elle]'} : ${years} Ans d'Amour"`,
    book3Title: (n1: string, n2: string) => `Livre 3 : "${n1 || '[Lui]'} & ${n2 || '[Elle]'} : Notre Liste de Rêves"`,
    book4Title: "Livre 4 : \"Histoire Personnalisée\"",
    customStoryTitle: "Titre du Livre",
    customStorySynopsis: "Synopsis de l'Histoire",
    customTitlePlaceholder: "Entrez le titre de votre livre...",
    customSynopsisPlaceholder: "Décrivez votre histoire en quelques phrases...",
    storyTypeOptions: "Options Type d'Histoire",
    customInstructions: "Instructions Personnalisées (Optionnel)",
    dataLoadedFromSheet: "Données chargées depuis la sheet. Vérifiez puis cliquez sur Confirmer et générer.",
    confirmAndGenerate: "Confirmer et générer",
    sendToDrive: "Envoyer vers Drive",
    pdfSentToDrive: "PDF envoyé vers Drive. La sheet a été mise à jour.",
    sendConfirm: "Confirmer et envoyer",
    coverSentToDrive: "Couverture envoyée vers Drive. La sheet a été mise à jour (colonne V).",
    dataLoadedFromSheetCover: "Générez la couverture ci-dessous puis cliquez sur Confirmer et envoyer pour enregistrer le lien en colonne V.",
    storyTemplate: "Modèle d'histoire",
    ramadanTitle: (name: string, _gender: string) => `${name || '[Nom]'} et les Valeurs du Ramadan`,
    numberOfScenes: "Nombre de scènes",
    ramadanPagesNote: `${RAMADAN_INNER_SCENES} scènes (histoire fixe)`,
    customStory: "Histoire personnalisée",
  },
  English: {
    appTitle: "Magical Book Lab",
    subtitle: "Creative Storytelling Engine",
    step1: "Identity",
    step2: "Planning",
    step3: "Creation",
    characterIdentity: "Character Identity",
    mainCharacter: "Main Character",
    partnerIdentity: "Partner Identity",
    name: "Name",
    age: "Age",
    gender: "Gender",
    male: "Male",
    female: "Female",
    other: "Other",
    uploadPhoto: "Upload Photo",
    storyBlueprint: "Story Blueprint",
    targetAudience: "Target Audience",
    kids: "Kids",
    adults: "Adults",
    lovers: "Lovers",
    themeDetails: "Theme & Details",
    offeredTo: "Book Offered To:",
    toHer: "FOR HER",
    toHim: "FOR HIM",
    yearsOfLove: "Years of Love",
    ans: "Years",
    chooseOptions: "Choose your options (max 15):",
    customOption: "Custom Option",
    placeholderReasons: "Write your own reason here...",
    placeholderStory: "Tell a special memory...",
    placeholderBucket: "What is your wildest dream?...",
    placeholderTheme: "A magical adventure...",
    artStyle: "Art Style",
    language: "Book Language",
    wordsPerPage: "Words / Page",
    addAssets: "Add Assets",
    generateSynopsis: "Generate Synopsis",
    synopsisTitle: "Story Master Synopsis",
    copyPrompts: "Copy Prompts",
    confirmPlan: "Confirm Plan & Illustrate",
    page: "Page",
    regenerate: "Regenerate",
    analyze: "Analyze",
    cropSplit: "Crop & Split",
    downloadPdf: "Download PDF (32 Pages)",
    versionHistory: "Version History",
    restore: "Restore",
    editDetails: "Edit Instructions",
    generatingArt: "Generating Artwork...",
    book1Title: (name: string, gender: string) => `Book 1: "Reasons why I love ${gender === 'HER' ? 'HER' : 'HIM'}, ${name || '[Name]'}"`,
    book2Title: (n1: string, n2: string, years: string) => `Book 2: "${n1 || '[Him]'} & ${n2 || '[Her]'} : ${years} Years of Love"`,
    book3Title: (n1: string, n2: string) => `Book 3: "${n1 || '[Him]'} & ${n2 || '[Her]'} : Our Bucket List"`,
    book4Title: "Book 4: \"Custom Story\"",
    customStoryTitle: "Book Title",
    customStorySynopsis: "Story Synopsis",
    customTitlePlaceholder: "Enter your book title...",
    customSynopsisPlaceholder: "Describe your story in a few sentences...",
    storyTypeOptions: "Story Type Options",
    customInstructions: "Custom Instructions (Optional)",
    dataLoadedFromSheet: "Data loaded from sheet. Review and click Confirm & Generate.",
    confirmAndGenerate: "Confirm & Generate",
    sendToDrive: "Send to Drive",
    pdfSentToDrive: "PDF sent to Drive. Sheet has been updated.",
    sendConfirm: "Send confirm",
    coverSentToDrive: "Cover sent to Drive. Sheet updated (column V).",
    dataLoadedFromSheetCover: "Generate the cover below then click Send confirm to save the link in column V.",
    storyTemplate: "Story Template",
    ramadanTitle: (name: string, _gender: string) => `${name || '[Name]'} and the Values of Ramadan`,
    numberOfScenes: "Number of scenes",
    ramadanPagesNote: `${RAMADAN_INNER_SCENES} story pages (fixed story)`,
    customStory: "Custom story",
  }
};

const LOVERS_OPTIONS_MAPPING = {
  'HER': [
    "Tu me fais rire plus que n’importe qui.",
    "Tu me soutiens dans tous mes projets, même les plus fous.",
    "Tu sais m’écouter sans jamais me juger.",
    "Tu rends les moments simples incroyables.",
    "Tu es douce et forte à la fois.",
    "Tu me rassures quand je doute.",
    "Tu crois en moi quand j’oublie de le faire.",
    "Tu prends soin de moi sans que je le demande.",
    "Tu me comprends sans mots.",
    "Tu es mon refuge quand tout va mal.",
    "Tu illumines ma vie chaque jour.",
    "Tu me inspires à devenir meilleur.",
    "Tu as un cœur immense.",
    "Tu es belle, à l’intérieur comme à l’extérieur.",
    "Tu sais toujours trouver les bons mots.",
    "Tu fais battre mon cœur un peu plus fort.",
    "Tu me donnes envie de construire l’avenir.",
    "Tu es ma meilleure amie.",
    "Tu me fais sentir aimé et important.",
    "Tu es mon amour, tout simplement.",
    "Ton sourire illumine mes journées les plus sombres.",
    "Avec toi, je me sens capable de tout affronter.",
    "Tu as cette douceur qui m'apaise instantanément.",
    "J'aime la façon dont tu vois le monde.",
    "Tu es la plus belle rencontre de ma vie.",
    "Tu es mon rayon de soleil au quotidien.",
    "J'admire ta force et ton courage.",
    "Tu as un rire qui est contagieux.",
    "Tu me comprends mieux que personne.",
    "Tu es mon inspiration de chaque instant.",
    "J'aime ta spontanéité et ta joie de vivre.",
    "Tu es unique et irremplaçable.",
    "Ta présence me suffit pour être heureux.",
    "Tu as transformé ma vie en un conte de fées.",
    "J'aime la façon dont tu prends soin des autres.",
    "Tu es la personne la plus généreuse que je connaisse.",
    "Chaque moment avec toi est un cadeau."
  ],
  'HIM': [
    "Tu me fais me sentir en sécurité.",
    "Tu es toujours là quand j’ai besoin de toi.",
    "Tu me fais rire sans effort.",
    "Tu me soutiens et me motives chaque jour.",
    "Tu respectes mes rêves et mes choix.",
    "Tu prends soin de moi à ta façon.",
    "Tu sais me rassurer quand je vais mal.",
    "Tu es fort, mais aussi tendre.",
    "Tu me fais me sentir spéciale.",
    "Tu m’acceptes telle que je suis.",
    "Tu es mon meilleur ami.",
    "Tu me donnes confiance en moi.",
    "Tu sais transformer les petits moments en souvenirs.",
    "Tu es patient avec moi.",
    "Tu me regardes comme personne d’autre.",
    "Tu me fais croire en l’amour.",
    "Tu me protèges sans m’étouffer.",
    "Tu me comprends même en silence.",
    "Tu me donnes envie d’avancer.",
    "Tu es mon évidence.",
    "Tu me pousses à toujours donner le meilleur de moi-même.",
    "J'aime ton courage et ta détermination.",
    "Tu es mon roc, ma stabilité dans ce monde fou.",
    "J'adore ton sens de l'humour unique.",
    "Avec toi, tout semble plus facile."
  ],
  'LOVE_STORY': [
    "Le jour où tout a commencé (notre rencontre).",
    "Notre tout premier rendez-vous (et le stress qui allait avec !).",
    "Ce premier baiser qui a tout changé.",
    "Le moment précis où j'ai su que c'était pour toujours.",
    "Notre premier grand voyage ensemble.",
    "Le jour de notre emménagement (et le montage des meubles !).",
    "Le jour de notre mariage / nos fiançailles.",
    "Nos fous rires interminables pour des bêtises.",
    "La façon dont on se réconcilie après une petite dispute.",
    "Nos balades en voiture à chanter à tue-tête.",
    "L'arrivée de notre petit trésor (si applicable).",
    "Toutes les fois où tu m'as soutenu(e) sans juger.",
    "Nos petites traditions rien qu'à nous (café, séries, pizza).",
    "Quand on a adopté notre animal de compagnie.",
    "Nos moments gourmands (on adore manger ensemble !).",
    "Chaque Saint-Valentin passée à tes côtés.",
    "Parce que tu es ma maison, peu importe où l'on est.",
    "Et pour toutes les années de bonheur qu'il nous reste à vivre.",
    "Notre première danse sous la pluie (ou dans le salon !).",
    "Le moment où l'on a réalisé qu'on avait les mêmes rêves.",
    "Cette fois où l'on a regardé les étoiles jusqu'au matin.",
    "Quand tu m'as surpris(e) avec ce cadeau inoubliable.",
    "Notre premier 'Je t'aime' échangé timidement.",
    "La première fois que je t'ai présenté(e) à ma famille.",
    "Une soirée surprise que tu m'as organisée.",
    "Le jour où l'on a surmonté une épreuve ensemble.",
    "Nos fous rires en cuisinant.",
    "Ce moment de calme où juste être ensemble suffisait.",
    "Quand on s'est perdu ensemble lors d'une balade.",
    "La première fois qu'on a fait des projets d'avenir."
  ],

  'BUCKET_LIST': [
    "Faire le tour du monde avec toi, main dans la main.",
    "Construire la maison de nos rêves et y créer notre foyer.",
    "Vieillir ensemble (et devenir deux petits vieux grincheux).",
    "Visiter les Lieux Saints ensemble un jour (Hajj/Omra).",
    "Supporter notre équipe lors de la Coupe du Monde 2030.",
    "Ouvrir notre propre petit commerce ou projet ensemble.",
    "Avoir une grande et heureuse famille.",
    "Partir en road-trip sur un coup de tête, sans GPS.",
    "Manger dans les meilleurs restaurants du monde.",
    "Avoir une maison pleine de vie (et d'animaux !).",
    "Regarder le coucher de soleil sur une île paradisiaque.",
    "Gagner au Loto (ou travailler dur) et tout partager.",
    "Être toujours aussi amoureux et complices dans 50 ans.",
    "Apprendre quelque chose de nouveau ensemble (langue, danse, sport).",
    "S'acheter la voiture de nos rêves.",
    "Écrire notre propre livre d'histoire, jour après jour.",
    "Voir nos enfants grandir et réussir.",
    "Simplement être heureux, ici et maintenant, pour toujours.",
    "Aller voir des aurores boréales en Norvège.",
    "Faire un saut en parachute ensemble (ou pas !).",
    "Apprendre à cuisiner comme des chefs étoilés.",
    "Visiter le Japon au printemps pour les cerisiers.",
    "Avoir un jardin potager et manger nos propres légumes.",
    "Faire une croisière de luxe sans rien faire d'autre que relaxer.",
    "Dormir dans une cabane perchée dans les arbres.",
    "Nager avec des dauphins ou des tortues.",
    "Faire un marathon (ou du moins essayer !) ensemble.",
    "Apprendre une danse de salon pour briller en soirée.",
    "Voir les pyramides d'Égypte de nos propres yeux.",
    "Faire du bénévolat ensemble pour une cause qui nous tient à cœur."
  ]
};

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.INPUT);
  const [uiLanguage, setUiLanguage] = useState<'French' | 'English'>('French');

  const [userInput, setUserInput] = useState<UserInput>({
    name: '',
    age: '',
    gender: 'Male',
    partnerName: '',
    partnerAge: '',
    partnerGender: 'Female',
    audience: TargetAudience.KIDS,
    theme: '',
    selectedThemes: [],
    style: StoryStyle.ANIMATION_3D,
    extras: [],
    language: 'French',
    wordsPerScene: 15,
    sceneCount: 15
  });
  const [loversStoryType, setLoversStoryType] = useState<LoversStoryType>(null);
  const [kidsStoryTemplate, setKidsStoryTemplate] = useState<KidsStoryTemplate | null>(null);
  const [loversOptionsExpanded, setLoversOptionsExpanded] = useState(false);
  const [recipientType, setRecipientType] = useState<RecipientType>('HER');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [customOption, setCustomOption] = useState<string>('');
  const [selectedYearsCount, setSelectedYearsCount] = useState<string>('2');
  const [customStoryTitle, setCustomStoryTitle] = useState<string>('');
  const [customStorySynopsis, setCustomStorySynopsis] = useState<string>('');

  const [storyPlan, setStoryPlan] = useState<StoryPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [ultimateProgress, setUltimateProgress] = useState<number | null>(null);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<'reference' | 'partner' | 'scene'>('reference');
  const [sceneToCropIndex, setSceneToCropIndex] = useState<number | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [selectedScenes, setSelectedScenes] = useState<Set<number>>(new Set());
  const [showPrompts, setShowPrompts] = useState<Record<number, boolean>>({});
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  // Load Logo
  useEffect(() => {
    const loadLogo = async () => {
      try {
        const response = await fetch(LOGO_PATH);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => setLogoBase64(reader.result as string);
        reader.readAsDataURL(blob);
      } catch (e) {
        console.warn("Could not load logo for AI", e);
      }
    };
    loadLogo();
  }, []);

  // Load from-sheet session when URL has ?fromSheet=sessionId (and optionally ?template=ramadan)
  useEffect(() => {
    if (!BACKEND_URL) return;
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const sessionId = params.get('fromSheet');
    if (!sessionId) return;
    const urlTemplate = params.get('template');
    setFromSheetLoading(true);
    setFromSheetError(null);
    fetch(`${BACKEND_URL.replace(/\/$/, '')}/sheet/session/${sessionId}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'Session expired or not found' : `Error ${res.status}`);
        return res.json();
      })
      .then((data: {
        userInput: UserInput & { loversStoryType?: string; customNote?: string };
        theme: string;
        coverBase64: string | null;
        coverOnly?: boolean;
        outputFolderId: string;
        spreadsheetId: string;
        rowIndex: number;
        webhookUrl: string;
        webhookSecret: string;
        buyerName: string;
        sessionType?: string;
        sheetName?: string;
        row?: { prenoms?: string; ages?: string; langues?: string; themes?: string; child1PhotoBase64?: string; child2PhotoBase64?: string; child3PhotoBase64?: string };
      }) => {
        const isRamadan = data.sessionType === 'ramadan' || urlTemplate === 'ramadan';
        if (isRamadan) {
          // Ramadan/kids flow: show Kids + Ramadan template and pre-fill from session (backend already mapped row → userInput)
          setUserInput({
            ...data.userInput,
            theme: data.theme,
            audience: TargetAudience.KIDS,
          });
          setKidsStoryTemplate('RAMADAN');
          setSheetContext({
            outputFolderId: data.outputFolderId,
            spreadsheetId: data.spreadsheetId,
            rowIndex: data.rowIndex,
            webhookUrl: data.webhookUrl || '',
            webhookSecret: data.webhookSecret || '',
            buyerName: data.buyerName || 'Livre',
            sheetName: data.sheetName || 'kids_orders',
          });
        } else {
          setUserInput({ ...data.userInput, theme: data.theme });
          setSheetContext({
            outputFolderId: data.outputFolderId,
            spreadsheetId: data.spreadsheetId,
            rowIndex: data.rowIndex,
            webhookUrl: data.webhookUrl || '',
            webhookSecret: data.webhookSecret || '',
            buyerName: data.buyerName || 'Livre',
          });
          const storyType = data.userInput.loversStoryType
            || (data.theme && data.theme.includes('CUSTOM_STORY') ? 'CUSTOM_STORY' : null)
            || (data.theme && data.theme.includes('LOVE_STORY') ? 'LOVE_STORY' : null)
            || (data.theme && data.theme.includes('BUCKET_LIST') ? 'BUCKET_LIST' : null)
            || '10_REASONS';
          setLoversStoryType(storyType as LoversStoryType);
          setRecipientType((data.userInput.recipient === 'HIM' ? 'HIM' : 'HER') as RecipientType);
          setSelectedYearsCount(data.userInput.yearsCount || '2');
          setSelectedOptions(Array.isArray(data.userInput.selectedThemes) && data.userInput.selectedThemes.length > 0 ? data.userInput.selectedThemes : (storyType === '10_REASONS' ? ['Amour'] : []));
          setCustomStoryTitle(data.userInput.customTitle || '');
          setCustomStorySynopsis(data.userInput.customNote || '');
        }
        setSheetCoverBase64(data.coverBase64 || null);
        setSheetCoverOnlyMode(!!data.coverOnly);
        if (data.coverOnly) setQuickCoverVisible(true);
      })
      .catch((e: Error) => setFromSheetError(e.message || 'Failed to load session'))
      .finally(() => setFromSheetLoading(false));
  }, []);

  // New state for Photo Quality and Control
  const [photoQuality, setPhotoQuality] = useState<{ score: number; feedback: string } | null>(null);
  const [partnerPhotoQuality, setPartnerPhotoQuality] = useState<{ score: number; feedback: string } | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const stopGenerationRef = useRef(false);
  const [isGeneratingScenes, setIsGeneratingScenes] = useState(false);

  // Quick Cover State: single list of all designs this session + selected index (no duplication)
  const [quickCoverVisible, setQuickCoverVisible] = useState(false);
  const [quickCoverScene, setQuickCoverScene] = useState<Scene | null>(null);
  const [quickCoverDesigns, setQuickCoverDesigns] = useState<{ imageUrl: string; title?: string }[]>([]);
  const [selectedCoverIndex, setSelectedCoverIndex] = useState<number>(-1);
  const [quickCoverStyle, setQuickCoverStyle] = useState<StoryStyle>(StoryStyle.ANIMATION_3D);
  const [quickCoverCustomInstructions, setQuickCoverCustomInstructions] = useState<string>('');
  const [quickCoverLoading, setQuickCoverLoading] = useState(false);

  // Sheet-to-app (from-sheet) state
  const [sheetContext, setSheetContext] = useState<SheetContext | null>(null);
  const [sheetCoverBase64, setSheetCoverBase64] = useState<string | null>(null);
  const [sheetCoverOnlyMode, setSheetCoverOnlyMode] = useState(false);
  const [fromSheetLoading, setFromSheetLoading] = useState(false);
  const [fromSheetError, setFromSheetError] = useState<string | null>(null);

  // Sync ref with state
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Quality Bar Component
  const QualityBar = ({ quality }: { quality: { score: number, feedback: string } | null }) => {
    if (!quality) return null;
    const getColor = (s: number) => s >= 80 ? 'bg-green-500' : s >= 50 ? 'bg-yellow-500' : 'bg-red-500';
    return (
      <div className="mt-3 space-y-1 bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
        <div className="flex justify-between items-center text-[9px] font-bold uppercase text-slate-400">
          <span>Photo Quality</span>
          <span className={quality.score >= 80 ? 'text-green-400' : quality.score >= 50 ? 'text-yellow-400' : 'text-red-400'}>{quality.score}%</span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div className={`h-full ${getColor(quality.score)} transition-all duration-1000`} style={{ width: `${quality.score}%` }}></div>
        </div>
        <p className="text-[9px] text-slate-400 leading-tight">{quality.feedback}</p>
      </div>
    );
  };

  const t = TRANSLATIONS[uiLanguage];

  /** CSS font class for story text based on story type – distinctive but readable. */
  const getStoryFontClass = (): string => {
    const isKidsRamadan = userInput.theme?.includes('KIDS_RAMADAN') || userInput.theme?.includes('Ramadan');
    if (userInput.audience === TargetAudience.KIDS || isKidsRamadan) return 'font-story-kids';
    if (userInput.audience === TargetAudience.LOVERS && loversStoryType) {
      switch (loversStoryType) {
        case '10_REASONS': return 'font-story-romantic';
        case 'LOVE_STORY': return 'font-story-classic';
        case 'BUCKET_LIST': return 'font-story-adventure';
        case 'CUSTOM_STORY': return 'font-story-modern';
        default: break;
      }
    }
    return 'font-story-literary';
  };
  const storyFontClass = getStoryFontClass();

  const innerCount = storyPlan != null && storyPlan.scenes.length >= 2 ? storyPlan.scenes.length - 2 : (userInput.sceneCount ?? 15);
  const backCoverIndex = innerCount + 1;

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 7000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);



  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'age') {
      const ageNum = parseInt(value);
      if (!isNaN(ageNum) && ageNum > 18 && userInput.audience !== TargetAudience.LOVERS) {
        setUserInput(prev => ({ ...prev, [name]: value, audience: TargetAudience.ADULTS }));
      } else {
        setUserInput(prev => ({ ...prev, [name]: value }));
      }
    } else if (name === 'wordsPerScene') {
      setUserInput(prev => ({ ...prev, wordsPerScene: parseInt(value) || 0 }));
    } else {
      setUserInput(prev => ({ ...prev, [name]: value }));
    }
  };

  const toggleThemeTag = (tag: string) => {
    setUserInput(prev => {
      const exists = prev.selectedThemes.includes(tag);
      return {
        ...prev,
        selectedThemes: exists
          ? prev.selectedThemes.filter(t => t !== tag)
          : [...prev.selectedThemes, tag]
      };
    });
  };

  const toggleLoversOption = (option: string) => {
    setSelectedOptions(prev => {
      if (prev.includes(option)) {
        return prev.filter(o => o !== option);
      }
      if (prev.length >= 10) {
        setErrorMessage(uiLanguage === 'French' ? "Maximum de 15 options." : "Maximum of 15 options.");
        return prev;
      }
      return [...prev, option];
    });
  };

  const handleAddCustomOption = () => {
    if (!customOption.trim()) return;
    if (selectedOptions.length >= 15) {
      setErrorMessage(uiLanguage === 'French' ? "Maximum de 15 options." : "Maximum of 15 options.");
      return;
    }
    const val = customOption.trim();
    if (!selectedOptions.includes(val)) {
      setSelectedOptions(prev => [...prev, val]);
    }
    setCustomOption('');
  };

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
    return canvas.toDataURL('image/jpeg');
  };

  const autoCropToRatio = async (imageSrc: string, targetRatio: number = 2): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return imageSrc;

    const sourceRatio = image.width / image.height;

    let drawWidth = image.width;
    let drawHeight = image.height;
    let offsetX = 0;
    let offsetY = 0;

    // We want to force fit into targetRatio
    if (sourceRatio > targetRatio) {
      // Source is wider than target: Crop width (sides)
      drawWidth = image.height * targetRatio;
      offsetX = (image.width - drawWidth) / 2;
    } else {
      // Source is taller/squarer than target: Crop height (top/bottom)
      // Example: 16:9 (1.77) to 2:1 (2.0). Source is "taller" relative to the wide target.
      drawHeight = image.width / targetRatio;
      offsetY = (image.height - drawHeight) / 2;
    }

    canvas.width = drawWidth;
    canvas.height = drawHeight;

    ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight, 0, 0, drawWidth, drawHeight);
    return canvas.toDataURL('image/jpeg', 0.95);
  };

  const splitImage = async (imageSrc: string): Promise<[string, string]> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return ['', ''];

    const halfWidth = image.width / 2;
    const height = image.height;

    canvas.width = halfWidth;
    canvas.height = height;

    // Left Half
    ctx.drawImage(image, 0, 0, halfWidth, height, 0, 0, halfWidth, height);
    const left = canvas.toDataURL('image/jpeg');

    // Right Half
    ctx.clearRect(0, 0, halfWidth, height);
    ctx.drawImage(image, halfWidth, 0, halfWidth, height, 0, 0, halfWidth, height);
    const right = canvas.toDataURL('image/jpeg');

    return [left, right];
  };

  const ensureSquareDataUrl = async (dataUrl: string): Promise<string> => {
    const image = await createImage(dataUrl);
    const size = Math.min(image.width, image.height);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;
    const sx = (image.width - size) / 2;
    const sy = (image.height - size) / 2;
    ctx.drawImage(image, sx, sy, size, size, 0, 0, size, size);
    return canvas.toDataURL('image/jpeg', 0.95);
  };

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadImageWithLogo = async (url: string, filename: string, addLogo: boolean = false) => {
    if (!addLogo) {
      downloadImage(url, filename);
      return;
    }
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = await createImage(url);
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Add Logo
      try {
        const logoImg = await createImage(LOGO_PATH);
        // Center bottom, ~20% width of the cover
        const logoWidth = canvas.width * 0.2;
        const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
        const x = (canvas.width - logoWidth) / 2;
        const y = canvas.height - logoHeight - (canvas.height * 0.05); // 5% padding from bottom
        ctx.drawImage(logoImg, x, y, logoWidth, logoHeight);
      } catch (e) {
        console.warn("Logo not found or failed to load", e);
      }

      const dataUrl = canvas.toDataURL('image/png');
      downloadImage(dataUrl, filename);
    } catch (e) {
      console.error("Failed to compose image with logo", e);
      downloadImage(url, filename); // Fallback
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'reference' | 'partner' = 'reference') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setCropTarget(target);
      setImageToCrop(base64);

      // Analyze Quality
      try {
        const quality = await analyzePhotoQuality(base64);
        if (target === 'reference') {
          setPhotoQuality(quality);
        } else {
          setPartnerPhotoQuality(quality);
        }
      } catch (err) {
        console.error("Quality analysis failed", err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExtraUpload = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setUserInput(prev => ({
        ...prev,
        extras: prev.extras.map(ex => ex.id === id ? { ...ex, photoBase64: reader.result as string } : ex)
      }));
    };
    reader.readAsDataURL(file);
  };

  const openSceneCrop = (index: number) => {
    const scene = storyPlan?.scenes[index];
    if (!scene?.imageUrl) return;
    setCropTarget('scene');
    setSceneToCropIndex(index);
    setImageToCrop(scene.imageUrl);
  };

  const saveCrop = async () => {
    if (imageToCrop && croppedAreaPixels) {
      const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels);

      if (cropTarget === 'reference') {
        setUserInput(prev => ({ ...prev, photoBase64: croppedImage }));
      } else if (cropTarget === 'partner') {
        setUserInput(prev => ({ ...prev, partnerPhotoBase64: croppedImage }));
      } else if (cropTarget === 'scene' && sceneToCropIndex !== null && storyPlan) {
        const newScenes = [...storyPlan.scenes];
        const scene = newScenes[sceneToCropIndex];
        if (scene.imageUrl) scene.history = [scene.imageUrl, ...scene.history].slice(0, 20); // Legacy history handling? No, let's use addToHistory
        addToHistory(scene, croppedImage);

        scene.aspectRatio = '2:1';
        const [left, right] = await splitImage(croppedImage);
        scene.splitImages = [left, right];
        setStoryPlan({ ...storyPlan, scenes: newScenes });
        setSceneToCropIndex(null);
      }
      setImageToCrop(null);
    }
  };

  const handleUncrop = (index: number) => {
    if (!storyPlan) return;
    const newScenes = [...storyPlan.scenes];
    const scene = newScenes[index];
    scene.splitImages = undefined;
    scene.aspectRatio = '16:9';
    setStoryPlan({ ...storyPlan, scenes: newScenes });
  };

  const addToHistory = (scene: Scene, newImageUrl: string) => {
    if (!scene.history) scene.history = [];

    // If there is an existing image but history is empty, assume it was the start
    if (scene.imageUrl && scene.history.length === 0) {
      scene.history.push(scene.imageUrl);
    }

    const currentIdx = scene.historyIndex ?? (scene.history.length > 0 ? scene.history.length - 1 : -1);

    // Slice history to current point (remove redo future)
    const validHistory = currentIdx >= 0 ? scene.history.slice(0, currentIdx + 1) : [];

    scene.history = [...validHistory, newImageUrl];
    scene.historyIndex = scene.history.length - 1;
    scene.imageUrl = newImageUrl;
  };

  const handleHistoryUndo = (index: number) => {
    if (!storyPlan) return;
    const newScenes = [...storyPlan.scenes];
    const scene = newScenes[index];

    if (scene.historyIndex !== undefined && scene.historyIndex > 0) {
      scene.historyIndex--;
      scene.imageUrl = scene.history[scene.historyIndex];
      // If we undo a split, we might need to reset splitImages? 
      // For now, let's assume image URL defines state. 
      // TODO: ideally history should store full state objects, but for now we track images.
      // If previous image was 16:9, we should propagate that?
      // Infer aspect ratio from image or history? 
      // For simplicity: We keep current aspectRatio logic unless explicit.
      // But if we go back to a 16:9 image from a 2:1 split, we have valid splitImages sitting there?
      // Let's plain set the image. User can clear split if needed.

      setStoryPlan({ ...storyPlan, scenes: newScenes });
    }
  };

  const handleHistoryRedo = (index: number) => {
    if (!storyPlan) return;
    const newScenes = [...storyPlan.scenes];
    const scene = newScenes[index];

    if (scene.history && scene.historyIndex !== undefined && scene.historyIndex < scene.history.length - 1) {
      scene.historyIndex++;
      scene.imageUrl = scene.history[scene.historyIndex];
      setStoryPlan({ ...storyPlan, scenes: newScenes });
    }
  };

  const handleJumpToHistory = (index: number, historyIdx: number) => {
    if (!storyPlan) return;
    const newScenes = [...storyPlan.scenes];
    const scene = newScenes[index];

    if (scene.history && scene.history[historyIdx]) {
      scene.historyIndex = historyIdx;
      scene.imageUrl = scene.history[historyIdx];
      setStoryPlan({ ...storyPlan, scenes: newScenes });
    }
  };

  const addExtra = () => {
    const newExtra: ExtraAsset = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'character',
      name: '',
      description: ''
    };
    setUserInput(prev => ({ ...prev, extras: [...prev.extras, newExtra] }));
  };

  const removeExtra = (id: string) => {
    setUserInput(prev => ({ ...prev, extras: prev.extras.filter(ex => ex.id !== id) }));
  };

  const updateExtra = (id: string, field: string, value: string) => {
    setUserInput(prev => ({
      ...prev,
      extras: prev.extras.map(ex => ex.id === id ? { ...ex, [field]: value } : ex)
    }));
  };

  const handleGeneratePlan = async () => {
    const missing = [];
    if (!userInput.name.trim()) missing.push(t.name);
    if (!userInput.photoBase64) missing.push(t.uploadPhoto);

    let finalTheme = userInput.theme;
    if (userInput.audience === TargetAudience.LOVERS) {
      if (!userInput.partnerName?.trim()) missing.push(t.partnerIdentity + " " + t.name);
      if (!userInput.partnerPhotoBase64) missing.push(t.partnerIdentity + " Photo");
      if (!loversStoryType) missing.push("Story Type");

      if (loversStoryType === 'CUSTOM_STORY') {
        // Custom story requires title and synopsis
        if (!customStoryTitle.trim()) missing.push(t.customStoryTitle);
        if (!customStorySynopsis.trim()) missing.push(t.customStorySynopsis);
        if (missing.length === 0) {
          finalTheme = `Story Type: CUSTOM_STORY. Book Title: "${customStoryTitle}". Story Synopsis: "${customStorySynopsis}". This is a personalized love story book where the cover and all illustrations must visually represent the title and synopsis provided. The cover should clearly convey the story concept through its visuals.`;
        }
      } else if (selectedOptions.length === 0) {
        missing.push("Selections (min 1)");
      } else {
        const context = loversStoryType === 'LOVE_STORY' ? ` Specifically covering ${selectedYearsCount} years of love.` : '';
        finalTheme = `Story Type: ${loversStoryType}.${context} Recipient: ${recipientType}. Key milestones chosen by user: ${selectedOptions.join(' | ')}`;
      }
    } else if (userInput.audience === TargetAudience.KIDS && kidsStoryTemplate === 'RAMADAN') {
      finalTheme = "Story Type: KIDS_RAMADAN. A heartwarming Ramadan story for a child. Same story structure for every child; only the child's name and gender (he/she) are personalized. The story follows a fixed Ramadan journey: preparing for the month, first iftar, family moments, giving, and celebration. Use the main character's name and correct pronoun throughout the storyText.";
    } else {
      if (!userInput.theme.trim()) missing.push(t.storyBlueprint);
    }

    if (missing.length > 0) {
      setErrorMessage(`Required: ${missing.join(', ')}`);
      return;
    }

    setLoading(true);
    try {
      const payload: UserInput = {
        ...userInput,
        theme: finalTheme,
        kidsStoryTemplate: userInput.audience === TargetAudience.KIDS ? kidsStoryTemplate ?? undefined : undefined,
        sceneCount: userInput.sceneCount ?? 15
      };
      const plan =
        userInput.audience === TargetAudience.KIDS && kidsStoryTemplate === 'RAMADAN'
          ? buildRamadanStoryPlan(payload)
          : await generateStoryPlan(payload);
      setStoryPlan(plan);
      setStep(AppStep.CREATION);
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "Failed to generate story plan.");
    } finally {
      setLoading(false);
    }

  };

  const handleSheetConfirmAndGenerate = async () => {
    if (!sheetContext || !sheetCoverBase64) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const plan = await generateStoryPlan(userInput);
      plan.scenes[0].imageUrl = sheetCoverBase64;
      plan.scenes[0].status = 'done';
      setStoryPlan(plan);
      setStep(AppStep.CREATION);
      setLoading(false);

      // Generate scenes 1 to last (skip 0, cover from sheet)
      setIsGeneratingScenes(true);
      const newScenes = [...plan.scenes];
      const lastSceneIndex = plan.scenes.length - 1;
      for (let i = 1; i <= lastSceneIndex; i++) {
        const scene = newScenes[i];
        const isCover = i === lastSceneIndex;
        try {
          scene.status = 'loading';
          setStoryPlan({ ...plan, scenes: [...newScenes] });
          const rawImage = await generateSceneImage(scene, userInput.style, userInput.photoBase64, userInput.partnerPhotoBase64, isCover ? (logoBase64 || undefined) : undefined);
          scene.imageUrl = rawImage;
          addToHistory(scene, rawImage);
          scene.status = 'done';
          scene.aspectRatio = isCover ? '1:1' : '16:9';
          scene.splitImages = undefined;
        } catch (e) {
          console.error(`Sheet gen scene ${i} error:`, e);
          scene.status = 'error';
        }
        setStoryPlan({ ...plan, scenes: [...newScenes] });
      }
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || 'Failed to generate story plan.');
    } finally {
      setLoading(false);
      setIsGeneratingScenes(false);
    }
  };

  const handleQuickCoverGen = async () => {
    // Validate required fields for all audiences
    const missing = [];
    if (!userInput.name.trim()) missing.push(t.name);
    if (!userInput.photoBase64) missing.push(t.uploadPhoto);

    if (userInput.audience === TargetAudience.LOVERS) {
      if (!userInput.partnerName?.trim()) missing.push(t.partnerIdentity + " " + t.name);
      if (!userInput.partnerPhotoBase64) missing.push(t.partnerIdentity + " Photo");
      if (!loversStoryType) missing.push("Story Type");
      if (loversStoryType === 'CUSTOM_STORY') {
        if (!customStoryTitle.trim()) missing.push(t.customStoryTitle);
        if (!customStorySynopsis.trim()) missing.push(t.customStorySynopsis);
      }
    } else {
      // For Kids/Adults, require a theme (except Ramadan template which has a fixed story)
      const isRamadanKids = userInput.audience === TargetAudience.KIDS && kidsStoryTemplate === 'RAMADAN';
      if (!isRamadanKids && !userInput.theme.trim()) missing.push(t.storyBlueprint);
    }

    if (missing.length > 0) {
      setErrorMessage(`Required: ${missing.join(', ')}`);
      return;
    }

    setQuickCoverLoading(true);
    try {
      const isRamadanKids = userInput.audience === TargetAudience.KIDS && kidsStoryTemplate === 'RAMADAN';
      let coverScene: Scene;

      if (isRamadanKids) {
        // Use the exact Ramadan front cover from the template so Quick Cover aligns with the story
        const ramadanPlan = buildRamadanStoryPlan(userInput);
        coverScene = ramadanPlan.scenes[0];
      } else {
        // Determine effective theme based on audience
        let effectiveTheme = userInput.theme;
        const yearsCount = selectedYearsCount;

        if (userInput.audience === TargetAudience.LOVERS) {
          switch (loversStoryType) {
            case '10_REASONS': effectiveTheme = '10 Reasons to Love You'; break;
            case 'LOVE_STORY': effectiveTheme = 'Our Love Story'; break;
            case 'BUCKET_LIST': effectiveTheme = 'Bucket List'; break;
            case 'CUSTOM_STORY': effectiveTheme = `Custom Story: "${customStoryTitle}". Synopsis: ${customStorySynopsis}. The cover must visually represent this story concept.`; break;
            default: effectiveTheme = '10 Reasons to Love You';
          }
        }

        coverScene = await generateCoverPlan({
          ...userInput,
          theme: effectiveTheme,
          style: quickCoverStyle,
          yearsCount: yearsCount
        }, quickCoverCustomInstructions);
      }

      // Generate Image using same logic as main story
      const img = await generateSceneImage(
        coverScene,
        quickCoverStyle,
        userInput.photoBase64,
        userInput.partnerPhotoBase64,
        logoBase64 // Include logo for consistency with main story
      );

      const newDesign = { imageUrl: img, title: coverScene.title };
      setQuickCoverDesigns(prev => [...prev, newDesign]);
      setSelectedCoverIndex(prev => prev + 1);
      setQuickCoverScene({ ...coverScene, imageUrl: img, status: 'done' });
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e.message || "Quick Cover Failed");
    } finally {
      setQuickCoverLoading(false);
    }
  };

  const handleQuickCoverDownload = () => {
    if (quickCoverScene?.imageUrl) {
      downloadImage(quickCoverScene.imageUrl, `${userInput.name}-QuickCover.png`);
    }
  };

  const handleProcessSceneQueue = async (queueIndices: number[]) => {
    if (!storyPlan) return;
    stopGenerationRef.current = false;
    isPausedRef.current = false;
    setIsPaused(false);
    setIsGeneratingScenes(true);

    let currentScenes = [...storyPlan.scenes];
    // Mark queue as loading
    const updatedScenes = currentScenes.map((scene, idx) => {
      // Only set to loading if not already done, or if forced?
      // For now, only process 'idle' or 'error' or explicit re-runs. 
      // But this function is called by "Generate All" buttons which usually imply doing work.
      if (queueIndices.includes(idx) && scene.status !== 'done') return { ...scene, status: 'loading' };
      return scene;
    });
    setStoryPlan({ ...storyPlan, scenes: updatedScenes as Scene[] });

    for (const i of queueIndices) {
      if (stopGenerationRef.current) break;
      while (isPausedRef.current) {
        if (stopGenerationRef.current) break;
        await new Promise(r => setTimeout(r, 500));
      }

      const scene = updatedScenes[i];
      if (scene.status === 'done') continue;

      try {
        await handleGenerateScene(i);
      } catch (e) {
        console.error(`Queue error at ${i}`, e);
      }
    }
    setIsGeneratingScenes(false);
  };

  const handleGenerateCovers = () => {
    handleProcessSceneQueue([0, 16]);
  };

  const handleGenerateScenes = () => {
    const indices = Array.from({ length: innerCount }, (_, i) => i + 1);
    handleProcessSceneQueue(indices);
  };

  const togglePause = () => {
    setIsPaused(prev => !prev);
  };

  const cancelGeneration = () => {
    stopGenerationRef.current = true;
    setIsPaused(false);
    setIsGeneratingScenes(false);
  };

  // Bulk processing: 16:9 -> 2:1 Crop -> 1:1 Split
  const handleAutoSplitAll = async () => {
    if (!storyPlan) return;
    const newScenes = [...storyPlan.scenes];
    let changed = false;

    // We only Auto-Split inner scenes (1 to innerCount). Covers (0 & backCoverIndex) are 1:1.
    for (let i = 1; i <= innerCount; i++) {
      const scene = newScenes[i];

      // Only process if we have an image and it's not already split
      if (scene.imageUrl && !scene.splitImages) {
        try {
          // 1. Auto-Crop to 2:1 (Center crop)
          // This converts the 16:9 generation into a 2:1 panoramic
          // Note: we're cropping HEIGHT here to make it 2:1
          const croppedPanoromic = await autoCropToRatio(scene.imageUrl, 2);

          // 2. Split into two 1:1 squares
          const [left, right] = await splitImage(croppedPanoromic);

          scene.splitImages = [left, right];
          scene.printRatio = '2:1';
          scene.aspectRatio = '2:1';
          changed = true;
        } catch (e) {
          console.error(`Failed to auto-process scene ${i}`, e);
        }
      }
    }

    if (changed) setStoryPlan({ ...storyPlan, scenes: newScenes });
  };

  const handleAutoSplitSingle = async (index: number) => {
    if (!storyPlan) return;
    const newScenes = [...storyPlan.scenes];
    const scene = newScenes[index];

    if (scene.imageUrl) {
      setLoading(true);
      try {
        const croppedPanoromic = await autoCropToRatio(scene.imageUrl, 2);
        const [left, right] = await splitImage(croppedPanoromic);

        addToHistory(scene, croppedPanoromic);

        scene.splitImages = [left, right];
        scene.aspectRatio = '2:1';
        scene.printRatio = '2:1';
        setStoryPlan({ ...storyPlan, scenes: newScenes });
      } catch (e) {
        console.error(e);
        setErrorMessage("Failed to auto-split this scene.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleMagicEdit = async (index: number, instruction: string) => {
    if (!storyPlan || !instruction.trim()) return;

    const newScenes = [...storyPlan.scenes];
    const scene = newScenes[index];
    scene.status = 'loading';
    setStoryPlan({ ...storyPlan, scenes: newScenes }); // Show loading

    try {
      // Use editSceneImage from geminiService
      const newImage = await editSceneImage(scene, instruction, userInput.photoBase64, userInput.partnerPhotoBase64);
      addToHistory(scene, newImage);
      scene.status = 'done';
      // Keep existing aspect ratio
      setStoryPlan({ ...storyPlan, scenes: newScenes });
    } catch (err: any) {
      console.error(err);
      scene.status = 'error';
      setErrorMessage("Magic Edit failed.");
      setStoryPlan({ ...storyPlan, scenes: newScenes });
    }
  };

  const verifyAndFixScene = async (index: number): Promise<boolean> => {
    if (!storyPlan) return false;
    let currentScenes = [...storyPlan.scenes];
    let scene = currentScenes[index];

    // Only verify if we have an image
    if (!scene.imageUrl) return false;

    // We check the image that will be printed.
    // If split, we check the panoramic before split? Or check 1:1s?
    // validateBookSpread is designed for the panoramic/spread.
    // If we have splitImages, we should check the source panoramic (which is in history or imageUrl?).
    // scene.imageUrl should hold the panoramic/source.

    console.log(`Verifying Scene ${index}...`);
    try {
      // 1. Validate
      const validation = await validateBookSpread(scene.imageUrl);

      if (validation.isValid) {
        console.log(`Scene ${index} is valid.`);
        return true;
      }

      console.warn(`Scene ${index} Invalid: ${validation.reason}. Attempting fix...`);

      // 2. Fix attempt (Max 1 retry for now to be safe)
      const isCover = index === 0 || index === 16;
      const retryPrompt = `${scene.prompt} REPAIR INSTRUCTION: ${validation.retryInstruction}. Ensure text is NOT cut off and faces are visible.`;

      // Temporary object to generate with new prompt
      const tempScene = { ...scene, prompt: retryPrompt };

      const newImage = await generateSceneImage(
        tempScene,
        userInput.style,
        userInput.photoBase64,
        userInput.partnerPhotoBase64,
        isCover ? (logoBase64 || undefined) : undefined
      );

      // 3. Update Scene with fixed image
      scene.imageUrl = newImage;
      addToHistory(scene, newImage);

      // If it's an inner scene (1 to innerCount), we need to re-split it
      if (index >= 1 && index <= innerCount) {
        const croppedPanoromic = await autoCropToRatio(newImage, 2);
        const [left, right] = await splitImage(croppedPanoromic);
        scene.splitImages = [left, right];
        scene.aspectRatio = '2:1';
      }

      currentScenes[index] = scene;
      setStoryPlan({ ...storyPlan, scenes: currentScenes }); // Update UI
      return true;

    } catch (e) {
      console.error(`Fix failed for scene ${index}`, e);
      return false;
    }
  };

  const handleUltimateFlow = async () => {
    if (!storyPlan) return;
    setUltimateProgress(1);

    try {
      // 1. Generate All Images (0 to backCoverIndex)
      // 2. Auto Split Scenes (1 to innerCount)
      // Total operations = 32 roughly

      const totalOps = 32;
      let completedOps = 0;

      // Helper to update progress
      const updateProg = () => {
        completedOps++;
        setUltimateProgress(Math.round((completedOps / totalOps) * 100));
      };

      // Step 1: Generate Images
      const newScenes = [...storyPlan.scenes];
      // We can run these in parallel batches or sequential? 
      // Sequential is safer for rate limits and errors visibility, but slower.
      // Let's do batches of 3.

      for (let i = 0; i < newScenes.length; i += 3) {
        const batch = [i, i + 1, i + 2].filter(idx => idx < newScenes.length);
        await Promise.all(batch.map(async (idx) => {
          const scene = newScenes[idx];
          const isCover = idx === 0 || idx === backCoverIndex;
          try {
            const rawImage = await generateSceneImage(scene, userInput.style, userInput.photoBase64, userInput.partnerPhotoBase64, isCover ? (logoBase64 || undefined) : undefined);
            newScenes[idx].imageUrl = rawImage;
            addToHistory(newScenes[idx], rawImage);
            newScenes[idx].status = 'done';
            newScenes[idx].aspectRatio = isCover ? '1:1' : '16:9';
            newScenes[idx].splitImages = undefined;
          } catch (e) {
            console.error(`Ultimate Gen Error at ${idx}`, e);
            newScenes[idx].status = 'error';
          } finally {
            updateProg();
          }
        }));
        setStoryPlan({ ...storyPlan, scenes: [...newScenes] }); // Update UI periodically
      }

      // Step 2: Auto Split Scenes (1 to innerCount)
      for (let i = 1; i <= innerCount; i++) {
        const scene = newScenes[i];
        if (scene.imageUrl && scene.status === 'done') {
          try {
            const croppedPanoromic = await autoCropToRatio(scene.imageUrl, 2);
            const [left, right] = await splitImage(croppedPanoromic);
            addToHistory(scene, croppedPanoromic);
            scene.splitImages = [left, right];
            scene.aspectRatio = '2:1';
            scene.printRatio = '2:1';
          } catch (e) {
            console.error(`Ultimate Split Error at ${i}`, e);
          }
        }
        updateProg();
      }

      setStoryPlan({ ...storyPlan, scenes: newScenes });

      // Step 3: Auto-Review & Fix (All scenes 0-16)
      // We do this serially to avoid overwhelming and better logging
      for (let i = 0; i <= backCoverIndex; i++) {
        await verifyAndFixScene(i);
        updateProg(); // We can add "Verification" to progress total or just reuse slot
      }

      setUltimateProgress(100);

      // Step 3: Download PDF
      await handleDownloadPDF('PAGES');

    } catch (err) {
      console.error("Ultimate Flow Failed", err);
      setErrorMessage("Ultimate Generation Failed");
    } finally {
      setUltimateProgress(null);
    }
  };

  const handleExportToDrive = () => {
    // Client-side export shortcut
    handleDownloadPDF('PAGES');
  };

  const buildSquarePdfForDrive = async (): Promise<Blob> => {
    if (!storyPlan || storyPlan.scenes.length < innerCount + 2) throw new Error(`Plan must have ${innerCount + 2} scenes`);
    const PAGE = 576;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'px', format: [PAGE, PAGE] });
    const isRTL = userInput.language === 'Arabic';

    const dataUrlToBase64 = (dataUrl: string) => {
      const i = dataUrl.indexOf(',');
      return i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
    };

    const frontCover = storyPlan.scenes[0].imageUrl;
    if (frontCover) {
      const square = await ensureSquareDataUrl(frontCover);
      doc.addImage(dataUrlToBase64(square), 'JPEG', 0, 0, PAGE, PAGE);
    }

    for (let i = 1; i <= innerCount; i++) {
      const scene = storyPlan.scenes[i];
      let leftImg: string | null = null;
      let rightImg: string | null = null;
      if (scene.splitImages && scene.splitImages.length === 2) {
        leftImg = await ensureSquareDataUrl(scene.splitImages[0]);
        rightImg = await ensureSquareDataUrl(scene.splitImages[1]);
      } else if (scene.imageUrl) {
        const cropped = await autoCropToRatio(scene.imageUrl, 2);
        const [left, right] = await splitImage(cropped);
        leftImg = await ensureSquareDataUrl(left);
        rightImg = await ensureSquareDataUrl(right);
      }
      if (leftImg && rightImg) {
        doc.addPage([PAGE, PAGE]);
        if (isRTL) {
          doc.addImage(dataUrlToBase64(rightImg), 'JPEG', 0, 0, PAGE, PAGE);
          doc.addPage([PAGE, PAGE]);
          doc.addImage(dataUrlToBase64(leftImg), 'JPEG', 0, 0, PAGE, PAGE);
        } else {
          doc.addImage(dataUrlToBase64(leftImg), 'JPEG', 0, 0, PAGE, PAGE);
          doc.addPage([PAGE, PAGE]);
          doc.addImage(dataUrlToBase64(rightImg), 'JPEG', 0, 0, PAGE, PAGE);
        }
      }
    }

    doc.addPage([PAGE, PAGE]);
    const backCover = storyPlan.scenes[backCoverIndex].imageUrl;
    if (backCover) {
      const square = await ensureSquareDataUrl(backCover);
      doc.addImage(dataUrlToBase64(square), 'JPEG', 0, 0, PAGE, PAGE);
    }

    return doc.output('blob');
  };

  const handleSendToDrive = async () => {
    if (!sheetContext || !storyPlan) return;
    const unsplit = [];
    for (let i = 1; i <= innerCount; i++) {
      if (!storyPlan.scenes[i].splitImages) unsplit.push(i);
    }
    if (unsplit.length > 0) {
      setErrorMessage(uiLanguage === 'French'
        ? `Divisez toutes les scènes (1-${innerCount}) avant d'envoyer vers Drive.`
        : `Split all scenes (1-${innerCount}) before sending to Drive.`);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const blob = await buildSquarePdfForDrive();
      const form = new FormData();
      form.append('file', blob, `${sheetContext.buyerName || 'Livre'}.pdf`);
      form.append('folderId', sheetContext.outputFolderId);
      form.append('spreadsheetId', sheetContext.spreadsheetId);
      form.append('rowIndex', String(sheetContext.rowIndex));
      form.append('webhookUrl', sheetContext.webhookUrl);
      form.append('webhookSecret', sheetContext.webhookSecret);
      form.append('buyerName', sheetContext.buyerName);
      if (sheetContext.sheetName) form.append('sheetName', sheetContext.sheetName);
      const base = BACKEND_URL.replace(/\/$/, '');
      const res = await fetch(`${base}/uploadPdf`, { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}`);
      }
      setErrorMessage(null);
      alert(t.pdfSentToDrive + (data.pdfUrl ? `\n${data.pdfUrl}` : ''));
    } catch (e: any) {
      setErrorMessage(e.message || 'Send to Drive failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCoverToDrive = async () => {
    if (!sheetContext || !quickCoverScene?.imageUrl) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(quickCoverScene.imageUrl);
      const blob = await res.blob();
      const form = new FormData();
      form.append('file', blob, `${sheetContext.buyerName || 'Couverture'}-cover.png`);
      form.append('folderId', sheetContext.outputFolderId);
      form.append('spreadsheetId', sheetContext.spreadsheetId);
      form.append('rowIndex', String(sheetContext.rowIndex));
      form.append('webhookUrl', sheetContext.webhookUrl);
      form.append('webhookSecret', sheetContext.webhookSecret);
      form.append('buyerName', sheetContext.buyerName);
      if (sheetContext.sheetName) form.append('sheetName', sheetContext.sheetName);
      const base = BACKEND_URL.replace(/\/$/, '');
      const r = await fetch(`${base}/uploadCover`, { method: 'POST', body: form });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(data.error || `Error ${r.status}`);
      }
      setErrorMessage(null);
      alert(t.coverSentToDrive + (data.coverUrl ? `\n${data.coverUrl}` : ''));
    } catch (e: any) {
      setErrorMessage(e.message || 'Send cover failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateScene = async (index: number) => {
    if (!storyPlan) return;
    const newScenes = [...storyPlan.scenes];
    const scene = newScenes[index];
    if (scene.imageUrl) {
      scene.history = [scene.imageUrl, ...scene.history].slice(0, 20);
    }
    scene.status = 'loading';
    setStoryPlan({ ...storyPlan, scenes: newScenes });
    try {
      const isCover = index === 0 || index === 16;

      // For scenes, we generate 16:9 and keeping it.
      // For covers, we generate 1:1.

      let rawImage = await generateSceneImage(scene, userInput.style, userInput.photoBase64, userInput.partnerPhotoBase64, isCover ? (logoBase64 || undefined) : undefined);

      // We do NOT auto-crop scenes anymore. We keep them 16:9.
      // We do NOT validate spreads here (it's done in bulk process or manual review).

      // We do NOT validate spreads here (it's done in bulk process or manual review).

      addToHistory(scene, rawImage);
      scene.status = 'done';
      // Reset aspect ratio to generation native
      scene.aspectRatio = isCover ? '1:1' : '16:9';
      scene.splitImages = undefined; // Reset any previous split if re-generating

    } catch (err: any) {
      scene.status = 'error';
      console.error(err);
      setErrorMessage(`Generation failed: ${err.message || 'Unknown error'}`);
    } finally {
      setStoryPlan({ ...storyPlan, scenes: newScenes });
    }
  };

  const handleRandomizeScene = async (index: number) => {
    if (!storyPlan) return;
    const newScenes = [...storyPlan.scenes];
    const scene = newScenes[index];
    if (scene.imageUrl) {
      scene.history = [scene.imageUrl, ...scene.history].slice(0, 20);
    }
    scene.status = 'loading';
    setStoryPlan({ ...storyPlan, scenes: newScenes });
    try {
      const isCover = index === 0 || index === 16;
      let rawImage = await generateSceneImage(
        scene,
        userInput.style,
        userInput.photoBase64,
        userInput.partnerPhotoBase64,
        isCover ? (logoBase64 || undefined) : undefined,
        true // isRandomize = true
      );

      addToHistory(scene, rawImage);
      scene.status = 'done';
      // Reset aspect ratio to generation native
      scene.aspectRatio = isCover ? '1:1' : '16:9';
      scene.splitImages = undefined;

    } catch (err: any) {
      scene.status = 'error';
      console.error(err);
      setErrorMessage(`Randomize failed: ${err.message || 'Unknown error'}`);
    } finally {
      setStoryPlan({ ...storyPlan, scenes: newScenes });
    }
  };

  const handleEditPhoto = async (index: number) => {
    if (!storyPlan || !storyPlan.scenes[index].editInstruction) return;
    const newScenes = [...storyPlan.scenes];
    const scene = newScenes[index];
    if (scene.imageUrl) {
      scene.history = [scene.imageUrl, ...scene.history].slice(0, 20);
    }
    scene.status = 'loading';
    setStoryPlan({ ...storyPlan, scenes: newScenes });
    try {
      const img = await editSceneImage(scene, scene.editInstruction!, userInput.photoBase64, userInput.partnerPhotoBase64);
      scene.imageUrl = img;
      scene.status = 'done';
      scene.editInstruction = '';
    } catch (err: any) {
      scene.status = 'error';
      console.error(err);
      setErrorMessage(`Edit failed: ${err.message}`);
    } finally {
      setStoryPlan({ ...storyPlan, scenes: newScenes });
    }
  };

  const handleAnalyze = async (index: number) => {
    if (!storyPlan || !storyPlan.scenes[index].imageUrl) return;
    const newScenes = [...storyPlan.scenes];
    const scene = newScenes[index];
    scene.status = 'loading';
    setStoryPlan({ ...storyPlan, scenes: newScenes });
    try {
      const analysis = await analyzeImage(scene.imageUrl!, scene.prompt);
      scene.correctionAnalysis = analysis;
    } catch (err) {
      console.error(err);
      setErrorMessage("Analysis failed.");
    } finally {
      scene.status = 'done';
      setStoryPlan({ ...storyPlan, scenes: newScenes });
    }
  };

  const handleToggleApproved = (index: number) => {
    if (!storyPlan) return;
    const newScenes = [...storyPlan.scenes];
    newScenes[index].approved = !newScenes[index].approved;
    setStoryPlan({ ...storyPlan, scenes: newScenes });
  };

  const handleEditScene = (index: number, field: string, value: string) => {
    if (!storyPlan) return;
    const newScenes = [...storyPlan.scenes];
    (newScenes[index] as any)[field] = value;
    setStoryPlan({ ...storyPlan, scenes: newScenes });
  };

  const handleToggleAspectRatio = (index: number) => {
    if (!storyPlan) return;
    const newScenes = [...storyPlan.scenes];
    const current = newScenes[index].aspectRatio;
    if (current === '1:1') newScenes[index].aspectRatio = '16:9';
    else if (current === '16:9') newScenes[index].aspectRatio = '2:1';
    else newScenes[index].aspectRatio = '1:1';
    setStoryPlan({ ...storyPlan, scenes: newScenes });
  };

  const handleOverrideStyle = (index: number, style: StoryStyle) => {
    if (!storyPlan) return;
    const newScenes = [...storyPlan.scenes];
    newScenes[index].overrideStyle = style;
    setStoryPlan({ ...storyPlan, scenes: newScenes });
  };

  const restoreFromHistory = (sceneIndex: number, historyUrl: string) => {
    if (!storyPlan) return;
    const newScenes = [...storyPlan.scenes];
    const scene = newScenes[sceneIndex];
    const current = scene.imageUrl;
    scene.imageUrl = historyUrl;
    if (current) {
      scene.history = [current, ...scene.history.filter(h => h !== historyUrl)].slice(0, 20);
    } else {
      scene.history = scene.history.filter(h => h !== historyUrl);
    }
    setStoryPlan({ ...storyPlan, scenes: newScenes });
  };

  const handleCopyAllPrompts = () => {
    if (!storyPlan) return;
    const allPrompts = storyPlan.scenes.map((s, i) => `Scene ${i} (${s.type}):\n${s.prompt}\n\n`).join('');
    navigator.clipboard.writeText(allPrompts);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleToggleSelect = (index: number) => {
    setSelectedScenes(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!storyPlan) return;
    if (selectedScenes.size === storyPlan.scenes.length) {
      setSelectedScenes(new Set());
    } else {
      setSelectedScenes(new Set(storyPlan.scenes.map((_, i) => i)));
    }
  };

  const handleDownloadSelected = async () => {
    if (!storyPlan) return;
    for (const index of selectedScenes) {
      const scene = storyPlan.scenes[index];
      if (scene.imageUrl) {
        // If it's cover (0 or 16), use logo
        const addLogo = false;
        await downloadImageWithLogo(scene.imageUrl, `${userInput.name}-Scene-${index}.png`, addLogo);
        // Stagger downloads slightly
        await new Promise(r => setTimeout(r, 200));
      }
    }
  };

  const handleRegenerateSelected = async () => {
    if (!storyPlan) return;
    for (const index of selectedScenes) {
      // Mark as loading/reset? handleGenerateScene handles state update
      await handleGenerateScene(index);
      // Stagger slightly
      await new Promise(r => setTimeout(r, 500));
    }
  };

  const handleTogglePrompt = (index: number) => {
    setShowPrompts(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleDownloadPDF = async (format: 'PAGES' | 'SPREADS' = 'PAGES') => {
    if (!storyPlan) return;
    const isRTL = userInput.language === 'Arabic';
    setLoading(true);
    try {
      // VALIDATION: Check for Front (0), Back (backCoverIndex) and Scenes 1 to innerCount
      const missingScenes = [];
      if (!storyPlan.scenes[0].imageUrl) missingScenes.push("Front Cover");
      for (let i = 1; i <= innerCount; i++) {
        if (!storyPlan.scenes[i].imageUrl) missingScenes.push(`Scene ${i}`);
      }
      if (!storyPlan.scenes[backCoverIndex].imageUrl) missingScenes.push("Back Cover");

      if (missingScenes.length > 0) {
        setErrorMessage(uiLanguage === 'French'
          ? "Impossible de générer le PDF : certaines pages sont manquantes."
          : "Cannot generate PDF: some pages are missing. Please generate all scenes first.");
        setLoading(false);
        return;
      }

      if (format === 'PAGES') {
        // ===== 32-PAGE FORMAT: Individual pages =====
        // Validate that all inner scenes have been split
        const unsplitScenes = [];
        for (let i = 1; i <= innerCount; i++) {
          if (!storyPlan.scenes[i].splitImages) unsplitScenes.push(`Scene ${i}`);
        }
        if (unsplitScenes.length > 0) {
          setErrorMessage(uiLanguage === 'French'
            ? "Impossible de générer le PDF : certaines scènes n'ont pas été divisées. Veuillez diviser toutes les scènes d'abord."
            : "Cannot generate PDF: some scenes have not been split. Please split all scenes first.");
          setLoading(false);
          return;
        }

        // Square pages for individual pages (covers & split halves) — all pages same square size
        const PAGE = 576;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'px', format: [PAGE, PAGE] });

        // Page 1: Front Cover (scene 0) — full square page
        const frontCoverImg = storyPlan.scenes[0].imageUrl!;
        doc.addImage(frontCoverImg, 'JPEG', 0, 0, PAGE, PAGE);

        // Pages 2 to 2+2*innerCount: Scene split images (2 square pages per inner scene)
        for (let i = 1; i <= innerCount; i++) {
          const scene = storyPlan.scenes[i];
          const [leftImg, rightImg] = scene.splitImages!;

          if (isRTL) {
            doc.addPage([PAGE, PAGE]);
            doc.addImage(rightImg, 'JPEG', 0, 0, PAGE, PAGE);
            doc.addPage([PAGE, PAGE]);
            doc.addImage(leftImg, 'JPEG', 0, 0, PAGE, PAGE);
          } else {
            doc.addPage([PAGE, PAGE]);
            doc.addImage(leftImg, 'JPEG', 0, 0, PAGE, PAGE);
            doc.addPage([PAGE, PAGE]);
            doc.addImage(rightImg, 'JPEG', 0, 0, PAGE, PAGE);
          }
        }

        // Last page: Back Cover — full square page
        doc.addPage([PAGE, PAGE]);
        const backCoverImg = storyPlan.scenes[backCoverIndex].imageUrl!;
        doc.addImage(backCoverImg, 'JPEG', 0, 0, PAGE, PAGE);

        doc.save(`${userInput.name}-Magical-Book-32Pages.pdf`);

      } else {
        // ===== 16-PAGE FORMAT: Spreads (original behavior) =====
        const doc = new jsPDF({
          orientation: 'landscape',
          unit: 'px',
          format: [1024, 576]
        });

        // PAGE 1: COVER SPREAD (Back + Front)
        const coverCanvas = document.createElement('canvas');
        coverCanvas.width = 2048;
        coverCanvas.height = 1024;
        const ctx = coverCanvas.getContext('2d');
        if (ctx) {
          const frontImg = await createImage(storyPlan.scenes[0].imageUrl!);
          const backImg = await createImage(storyPlan.scenes[backCoverIndex].imageUrl!);

          if (isRTL) {
            ctx.drawImage(frontImg, 0, 0, 1024, 1024);
            ctx.drawImage(backImg, 1024, 0, 1024, 1024);
          } else {
            ctx.drawImage(backImg, 0, 0, 1024, 1024);
            ctx.drawImage(frontImg, 1024, 0, 1024, 1024);
          }
        }
        const spreadData = coverCanvas.toDataURL('image/jpeg', 0.95);
        doc.addImage(spreadData, 'JPEG', 0, 32, 1024, 512);

        // PAGES 2 to innerCount+1: SCENES 1 to innerCount (16:9)
        for (let i = 1; i <= innerCount; i++) {
          doc.addPage([1024, 576]);
          const scene = storyPlan.scenes[i];
          if (scene.imageUrl) {
            doc.addImage(scene.imageUrl, 'PNG', 0, 0, 1024, 576);
          }
        }

        doc.save(`${userInput.name}-Magical-Book-16Pages.pdf`);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to generate PDF.");
    } finally {
      setLoading(false);
    }
  };

  const onDragStart = (idx: number) => setDraggedIndex(idx);
  const onDragOver = (e: React.DragEvent, idx: number) => e.preventDefault();
  const onDrop = (idx: number) => {
    if (draggedIndex === null || !storyPlan) return;
    const newScenes = [...storyPlan.scenes];
    const item = newScenes.splice(draggedIndex, 1)[0];
    newScenes.splice(idx, 0, item);
    setStoryPlan({ ...storyPlan, scenes: newScenes });
    setDraggedIndex(null);
    setCurrentSceneIndex(idx);
  };

  const yearsCountOptions = Array.from({ length: 60 }, (_, i) => i + 1);

  const getStoryTypeOptions = () => {
    if (!loversStoryType) return [];
    if (loversStoryType === '10_REASONS') {
      return recipientType === 'HER' ? LOVERS_OPTIONS_MAPPING.HER : LOVERS_OPTIONS_MAPPING.HIM;
    }
    return (LOVERS_OPTIONS_MAPPING as any)[loversStoryType] || [];
  };



  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">

      {fullscreenImage && (
        <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4" onClick={() => setFullscreenImage(null)}>
          <img src={fullscreenImage} className="max-w-full max-h-full object-contain cursor-pointer shadow-2xl" />
          <button className="absolute top-8 right-8 text-white text-3xl" onClick={() => setFullscreenImage(null)}><i className="fas fa-times"></i></button>
        </div>
      )}

      {errorMessage && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top">
          <div className="bg-red-500/90 backdrop-blur-md text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-red-400">
            <i className="fas fa-exclamation-triangle"></i>
            <p className="font-bold">{errorMessage}</p>
            <button onClick={() => setErrorMessage(null)} className="ml-4"><i className="fas fa-times"></i></button>
          </div>
        </div>
      )}

      {imageToCrop && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4">
          <div className="w-full max-w-4xl glass-morphism rounded-3xl overflow-hidden border border-amber-400/30">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-amber-400 font-magic uppercase tracking-widest text-sm">
                {cropTarget === 'scene' ? 'Crop Scene' : `Crop ${cropTarget} Face`}
              </h3>
              <button onClick={() => { setImageToCrop(null); setSceneToCropIndex(null); }} className="text-white">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="relative h-[500px] bg-black">
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={cropTarget === 'scene' ? 2 : 1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            <div className="p-6 flex flex-col md:flex-row justify-between items-center bg-slate-900 gap-4">
              <div className="flex-1 w-full flex items-center gap-4">
                <i className="fas fa-search-minus text-slate-500"></i>
                <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-amber-400" />
                <i className="fas fa-search-plus text-slate-500"></i>
              </div>
              <button onClick={saveCrop} className="px-10 py-3 bg-amber-400 text-slate-950 rounded-full font-bold shadow-lg shadow-amber-400/20 uppercase tracking-widest text-sm flex items-center gap-2">
                {cropTarget === 'scene' && <i className="fas fa-columns"></i>}
                {uiLanguage === 'French'
                  ? (cropTarget === 'scene' ? 'Diviser' : 'Appliquer')
                  : (cropTarget === 'scene' ? 'Split' : 'Apply')}
              </button>
            </div>
          </div>
        </div>
      )}



      <header className="mb-10 text-center relative">
        <div className="absolute top-0 left-0 text-slate-600 text-[10px] font-mono bg-slate-900/50 px-2 py-1 rounded">
          v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.23'}
        </div>
        <div className="absolute top-0 right-0 flex gap-2">
          <button onClick={() => setUiLanguage('French')} className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${uiLanguage === 'French' ? 'bg-amber-400 border-amber-400 text-slate-950' : 'border-slate-700 text-slate-500'}`}>FR</button>
          <button onClick={() => setUiLanguage('English')} className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${uiLanguage === 'English' ? 'bg-amber-400 border-amber-400 text-slate-950' : 'border-slate-700 text-slate-500'}`}>EN</button>
        </div>
        <h1 className="text-6xl font-magic bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent mb-2">{t.appTitle}</h1>
        <p className="text-slate-400 tracking-widest text-sm uppercase">{t.subtitle}</p>
      </header>

      <div className="glass-morphism rounded-3xl p-6 md:p-10 shadow-2xl overflow-hidden min-h-[600px]">
        <div className="flex justify-center gap-4 mb-12">
          {[AppStep.INPUT, AppStep.CREATION].map((s, idx) => (
            <div key={s} className="flex items-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all font-bold ${step === s ? 'border-amber-400 bg-amber-400 text-slate-950 scale-110 shadow-lg shadow-amber-400/20' : 'border-slate-700 text-slate-600'}`}>{idx + 1}</div>
              {idx < 1 && <div className={`w-12 h-px mx-2 ${step > AppStep.INPUT ? 'bg-amber-400/50' : 'bg-slate-700'}`} />}
            </div>
          ))}
        </div>

        {(step === AppStep.INPUT || step === AppStep.CREATION) && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {fromSheetLoading && (
              <div className="bg-amber-500/10 border border-amber-400/50 rounded-2xl p-6 text-center">
                <i className="fas fa-spinner animate-spin text-amber-400 text-2xl mb-2"></i>
                <p className="text-amber-200 font-bold uppercase tracking-widest text-sm">Chargement depuis la sheet...</p>
              </div>
            )}
            {fromSheetError && (
              <div className="bg-red-500/10 border border-red-400/50 rounded-2xl p-6 text-center">
                <p className="text-red-300 font-bold">{fromSheetError}</p>
                <p className="text-slate-400 text-sm mt-1">Réouvrez le lien depuis la sheet ou réessayez plus tard.</p>
              </div>
            )}
            {sheetContext && !fromSheetLoading && !fromSheetError && step === AppStep.INPUT && !sheetCoverOnlyMode && (
              <div className="bg-emerald-500/10 border border-emerald-400/50 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-emerald-200 font-bold text-sm flex-1">{t.dataLoadedFromSheet}</p>
                <button disabled={loading} onClick={handleSheetConfirmAndGenerate} className="px-8 py-4 bg-emerald-500 text-white font-black rounded-2xl uppercase text-sm tracking-widest hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50 whitespace-nowrap">
                  {loading || isGeneratingScenes ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-check-double"></i>}
                  {t.confirmAndGenerate}
                </button>
              </div>
            )}
            {sheetContext && sheetCoverOnlyMode && !fromSheetLoading && !fromSheetError && step === AppStep.INPUT && (
              <div className="bg-amber-500/10 border border-amber-400/50 rounded-2xl p-6">
                <p className="text-amber-200 font-bold text-sm">{t.dataLoadedFromSheetCover}</p>
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

              <div className="lg:col-span-6 space-y-8">
                <h3 className="text-xl font-bold text-amber-100 flex items-center gap-2"><i className="fas fa-id-card text-amber-400"></i> {t.characterIdentity}</h3>

                <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700 space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-xs">1</span>
                    <h4 className="font-bold text-amber-400 uppercase text-xs tracking-widest">{t.mainCharacter}</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">{t.name}</label>
                      <input name="name" value={userInput.name} onChange={handleInputChange} className="w-full bg-slate-800/50 p-3 rounded-xl border border-slate-700 focus:border-amber-400 outline-none" placeholder={t.name} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">{t.age}</label>
                      <input name="age" type="number" value={userInput.age} onChange={handleInputChange} className="w-full bg-slate-800/50 p-3 rounded-xl border border-slate-700 focus:border-amber-400 outline-none" placeholder="25" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">{t.gender}</label>
                    <div className="flex gap-2">
                      {[t.male, t.female, t.other].map(g => (
                        <button key={g} onClick={() => setUserInput(p => ({ ...p, gender: g }))} className={`flex-1 p-3 rounded-xl border transition-all font-medium ${userInput.gender === g ? 'border-amber-400 bg-amber-400/10 text-amber-400 shadow-inner' : 'border-slate-700 text-slate-400'}`}>{g}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">{t.uploadPhoto}</label>
                    <div className={`relative border-2 border-dashed p-4 rounded-2xl text-center group transition-all ${userInput.photoBase64 ? 'border-amber-400' : 'border-slate-700'}`}>
                      {userInput.photoBase64 ? (
                        <div className="relative inline-block h-28 w-28">
                          <img src={userInput.photoBase64} className="h-full w-full object-cover rounded-xl" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition-opacity"><i className="fas fa-edit text-white"></i></div>
                        </div>
                      ) : (
                        <div className="py-2">
                          <i className="fas fa-user-plus text-2xl text-slate-700 mb-1"></i>
                          <p className="text-slate-500 text-[10px]">{t.uploadPhoto}</p>
                        </div>
                      )}
                      <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'reference')} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                    {userInput.photoBase64 && <QualityBar quality={photoQuality} />}
                  </div>
                </div>

                {userInput.audience === TargetAudience.LOVERS && (
                  <div className="bg-pink-900/10 p-6 rounded-2xl border border-pink-500/30 space-y-6 animate-in slide-in-from-left duration-300">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-8 h-8 rounded-full bg-pink-500 text-white flex items-center justify-center font-bold text-xs">2</span>
                      <h4 className="font-bold text-pink-400 uppercase text-xs tracking-widest">{t.partnerIdentity}</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">{t.name}</label>
                        <input name="partnerName" value={userInput.partnerName} onChange={handleInputChange} className="w-full bg-slate-800/50 p-3 rounded-xl border border-slate-700 focus:border-pink-400 outline-none" placeholder={t.name} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">{t.age}</label>
                        <input name="partnerAge" type="number" value={userInput.partnerAge} onChange={handleInputChange} className="w-full bg-slate-800/50 p-3 rounded-xl border border-slate-700 focus:border-pink-400 outline-none" placeholder="25" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">{t.gender}</label>
                      <div className="flex gap-2">
                        {[t.male, t.female, t.other].map(g => (
                          <button key={g} onClick={() => setUserInput(p => ({ ...p, partnerGender: g }))} className={`flex-1 p-3 rounded-xl border transition-all font-medium ${userInput.partnerGender === g ? 'border-pink-400 bg-pink-400/10 text-pink-400' : 'border-slate-700 text-slate-400'}`}>{g}</button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">{t.uploadPhoto}</label>
                      <div className={`relative border-2 border-dashed p-4 rounded-2xl text-center group transition-all ${userInput.partnerPhotoBase64 ? 'border-pink-400' : 'border-slate-700'}`}>
                        {userInput.partnerPhotoBase64 ? (
                          <div className="relative inline-block h-28 w-28">
                            <img src={userInput.partnerPhotoBase64} className="h-full w-full object-cover rounded-xl" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition-opacity"><i className="fas fa-edit text-white"></i></div>
                          </div>
                        ) : (
                          <div className="py-2">
                            <i className="fas fa-heart-pulse text-2xl text-slate-700 mb-1"></i>
                            <p className="text-slate-500 text-[10px]">{t.uploadPhoto}</p>
                          </div>
                        )}
                        <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'partner')} className="absolute inset-0 opacity-0 cursor-pointer" />
                      </div>
                      {userInput.partnerPhotoBase64 && <QualityBar quality={partnerPhotoQuality} />}
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-6 space-y-8">
                <h3 className="text-xl font-bold text-amber-100 flex items-center gap-2"><i className="fas fa-pen-nib text-amber-400"></i> {t.storyBlueprint}</h3>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">{t.targetAudience}</label>
                  <div className="flex gap-2">
                    <button onClick={() => setUserInput(p => ({ ...p, audience: TargetAudience.KIDS }))} className={`flex-1 p-3 rounded-xl border transition-all font-bold text-xs uppercase ${userInput.audience === TargetAudience.KIDS ? 'border-amber-400 bg-amber-400/10 text-amber-400' : 'border-slate-700 text-slate-400'}`}>{t.kids}</button>
                    <button onClick={() => setUserInput(p => ({ ...p, audience: TargetAudience.ADULTS }))} className={`flex-1 p-3 rounded-xl border transition-all font-bold text-xs uppercase ${userInput.audience === TargetAudience.ADULTS ? 'border-amber-400 bg-amber-400/10 text-amber-400' : 'border-slate-700 text-slate-400'}`}>{t.adults}</button>
                    <button onClick={() => setUserInput(p => ({ ...p, audience: TargetAudience.LOVERS }))} className={`flex-1 p-3 rounded-xl border transition-all font-bold text-xs uppercase ${userInput.audience === TargetAudience.LOVERS ? 'border-pink-500 bg-pink-500/10 text-pink-500' : 'border-slate-700 text-slate-400'}`}>{t.lovers}</button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">{t.themeDetails}</label>

                  {userInput.audience === TargetAudience.LOVERS ? (
                    <div className="space-y-4 animate-in fade-in duration-300">

                      {/* Title Selection - Always Visible */}
                      <div className="grid grid-cols-1 gap-2">
                        <button
                          onClick={() => { setLoversStoryType('10_REASONS'); setSelectedOptions([]); setCustomOption(''); }}
                          className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${loversStoryType === '10_REASONS' ? 'border-pink-500 bg-pink-500/10 text-pink-400' : 'border-slate-700 text-slate-500'}`}
                        >
                          <i className="fas fa-list-ol"></i>
                          <span className="text-[10px] font-bold uppercase tracking-tight italic">{t.book1Title(userInput.partnerName, recipientType)}</span>
                        </button>
                        <button
                          onClick={() => { setLoversStoryType('LOVE_STORY'); setSelectedOptions([]); setCustomOption(''); }}
                          className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${loversStoryType === 'LOVE_STORY' ? 'border-pink-500 bg-pink-500/10 text-pink-400' : 'border-slate-700 text-slate-500'}`}
                        >
                          <i className="fas fa-heart"></i>
                          <span className="text-[10px] font-bold uppercase tracking-tight italic">{t.book2Title(userInput.name, userInput.partnerName, selectedYearsCount)}</span>
                        </button>
                        <button
                          onClick={() => { setLoversStoryType('BUCKET_LIST'); setSelectedOptions([]); setCustomOption(''); }}
                          className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${loversStoryType === 'BUCKET_LIST' ? 'border-pink-500 bg-pink-500/10 text-pink-400' : 'border-slate-700 text-slate-500'}`}
                        >
                          <i className="fas fa-star"></i>
                          <span className="text-[10px] font-bold uppercase tracking-tight italic">{t.book3Title(userInput.name, userInput.partnerName)}</span>
                        </button>
                        <button
                          onClick={() => { setLoversStoryType('CUSTOM_STORY'); setSelectedOptions([]); setCustomOption(''); }}
                          className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${loversStoryType === 'CUSTOM_STORY' ? 'border-purple-500 bg-purple-500/10 text-purple-400' : 'border-slate-700 text-slate-500'}`}
                        >
                          <i className="fas fa-feather-alt"></i>
                          <span className="text-[10px] font-bold uppercase tracking-tight italic">{t.book4Title}</span>
                        </button>
                      </div>

                      {/* Collapsible Detailed Options - Only shown if a story type is selected */}
                      {loversStoryType && (
                        <div className="space-y-2">
                          {/* Custom Story: Show title and synopsis inputs directly */}
                          {loversStoryType === 'CUSTOM_STORY' ? (
                            <div className="space-y-4 bg-purple-900/10 p-4 rounded-2xl border border-purple-500/30 animate-in slide-in-from-top duration-300">
                              <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-purple-400 ml-1">{t.customStoryTitle}</label>
                                <input
                                  value={customStoryTitle}
                                  onChange={(e) => setCustomStoryTitle(e.target.value)}
                                  className="w-full bg-slate-900/50 p-3 rounded-xl border border-slate-800 focus:border-purple-400 outline-none text-sm font-bold"
                                  placeholder={t.customTitlePlaceholder}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-purple-400 ml-1">{t.customStorySynopsis}</label>
                                <textarea
                                  value={customStorySynopsis}
                                  onChange={(e) => setCustomStorySynopsis(e.target.value)}
                                  className="w-full h-32 bg-slate-900/50 p-3 rounded-xl border border-slate-800 focus:border-purple-400 outline-none text-xs resize-none"
                                  placeholder={t.customSynopsisPlaceholder}
                                />
                              </div>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => setLoversOptionsExpanded(!loversOptionsExpanded)}
                                className="w-full p-3 rounded-xl border border-slate-700 text-slate-400 hover:border-pink-400 hover:text-pink-400 transition-all flex items-center justify-between"
                              >
                                <span className="text-xs font-bold uppercase tracking-widest">{t.storyTypeOptions}</span>
                                <i className={`fas fa-${loversOptionsExpanded ? 'minus' : 'plus'}`}></i>
                              </button>

                              {loversOptionsExpanded && (
                                <div className="space-y-3 animate-in slide-in-from-top duration-300">
                                  <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">{t.offeredTo}</label>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => { setRecipientType('HER'); setSelectedOptions([]); }}
                                        className={`flex-1 py-3 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-2 ${recipientType === 'HER' ? 'bg-pink-500 border-pink-500 text-white shadow-lg' : 'bg-slate-800/50 border-slate-700 text-slate-400'}`}
                                      >
                                        <i className="fas fa-female"></i> {t.toHer}
                                      </button>
                                      <button
                                        onClick={() => { setRecipientType('HIM'); setSelectedOptions([]); }}
                                        className={`flex-1 py-3 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-2 ${recipientType === 'HIM' ? 'bg-blue-500 border-blue-500 text-white shadow-lg' : 'bg-slate-800/50 border-slate-700 text-slate-400'}`}
                                      >
                                        <i className="fas fa-male"></i> {t.toHim}
                                      </button>
                                    </div>
                                  </div>

                                  <div className="space-y-4 bg-slate-800/20 p-4 rounded-2xl border border-slate-700/50">
                                    {loversStoryType === 'LOVE_STORY' && (
                                      <div className="space-y-1 mb-2">
                                        <label className="text-[9px] uppercase font-bold text-slate-500 ml-1">{t.yearsOfLove}</label>
                                        <select
                                          value={selectedYearsCount}
                                          onChange={(e) => setSelectedYearsCount(e.target.value)}
                                          className="w-full bg-slate-900/50 p-3 rounded-xl border border-slate-800 focus:border-pink-400 outline-none text-xs font-bold uppercase"
                                        >
                                          {yearsCountOptions.map(y => <option key={y} value={y} className="bg-slate-900">{y} {t.ans}</option>)}
                                        </select>
                                      </div>
                                    )}

                                    <div className="flex justify-between items-center px-1">
                                      <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                        {t.chooseOptions}
                                      </h5>
                                      <span className={`text-[10px] font-bold ${selectedOptions.length === 15 ? 'text-red-400' : 'text-pink-500'}`}>{selectedOptions.length} / 15</span>
                                    </div>

                                    <div className="grid grid-cols-1 gap-1.5 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                      {selectedOptions.filter(opt => !getStoryTypeOptions().includes(opt)).map((opt, idx) => (
                                        <button
                                          key={`custom-${idx}`}
                                          onClick={() => toggleLoversOption(opt)}
                                          className="text-left p-3 rounded-xl text-xs transition-all border bg-pink-600 border-pink-600 text-white font-bold flex justify-between items-center"
                                        >
                                          <span>{opt}</span>
                                          <i className="fas fa-check-circle"></i>
                                        </button>
                                      ))}
                                      {getStoryTypeOptions().map((opt, idx) => (
                                        <button
                                          key={idx}
                                          onClick={() => toggleLoversOption(opt)}
                                          className={`text-left p-3 rounded-xl text-xs transition-all border flex justify-between items-center ${selectedOptions.includes(opt) ? 'bg-pink-500 border-pink-500 text-white font-bold' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-600'}`}
                                        >
                                          <span>{opt}</span>
                                          {selectedOptions.includes(opt) && <i className="fas fa-check-circle"></i>}
                                        </button>
                                      ))}
                                    </div>

                                    <div className="space-y-1.5 pt-2 border-t border-slate-700/50">
                                      <label className="text-[9px] uppercase font-bold text-slate-500 ml-1">{t.customOption}</label>
                                      <div className="relative">
                                        <input
                                          value={customOption}
                                          onChange={(e) => setCustomOption(e.target.value)}
                                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomOption())}
                                          className="w-full bg-slate-900/50 p-3 pr-12 rounded-xl border border-slate-800 focus:border-pink-400 outline-none text-xs"
                                          placeholder={
                                            loversStoryType === '10_REASONS' ? t.placeholderReasons :
                                              loversStoryType === 'LOVE_STORY' ? t.placeholderStory :
                                                t.placeholderBucket
                                          }
                                        />
                                        <button
                                          onClick={handleAddCustomOption}
                                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-pink-500 text-white rounded-lg flex items-center justify-center hover:bg-pink-600 transition-colors"
                                        >
                                          <i className="fas fa-check"></i>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {userInput.audience === TargetAudience.KIDS && (
                        <div className="space-y-2 mb-4">
                          <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">{t.storyTemplate}</label>
                          <div className="grid grid-cols-1 gap-2">
                            <button
                              onClick={() => setKidsStoryTemplate('RAMADAN')}
                              className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${kidsStoryTemplate === 'RAMADAN' ? 'border-amber-400 bg-amber-400/10 text-amber-400' : 'border-slate-700 text-slate-500'}`}
                            >
                              <i className="fas fa-moon"></i>
                              <span className="text-[10px] font-bold uppercase tracking-tight italic">{t.ramadanTitle(userInput.name, userInput.gender)}</span>
                            </button>
                            <button
                              onClick={() => setKidsStoryTemplate(null)}
                              className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${kidsStoryTemplate === null ? 'border-amber-400 bg-amber-400/10 text-amber-400' : 'border-slate-700 text-slate-500'}`}
                            >
                              <i className="fas fa-feather-alt"></i>
                              <span className="text-[10px] font-bold uppercase tracking-tight">{t.customStory}</span>
                            </button>
                          </div>
                        </div>
                      )}
                      {(userInput.audience !== TargetAudience.KIDS || kidsStoryTemplate === null) && (
                        <>
                          <textarea
                            name="theme"
                            value={userInput.theme}
                            onChange={handleInputChange}
                            className="w-full h-24 bg-slate-800/50 p-4 rounded-xl border border-slate-700 focus:border-amber-400 outline-none"
                            placeholder={t.placeholderTheme}
                          />
                          <div className="flex flex-wrap gap-2 pt-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                            {THEME_OPTIONS.map(theme => (
                              <button
                                key={theme}
                                onClick={() => toggleThemeTag(theme)}
                                className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${userInput.selectedThemes.includes(theme) ? 'bg-amber-400 border-amber-400 text-slate-950' : 'border-slate-700 text-slate-500 hover:border-slate-500'}`}
                              >
                                {theme}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">{t.artStyle}</label>
                  <div className="grid grid-cols-1 gap-2">
                    {[StoryStyle.ANIMATION_3D, StoryStyle.SEMI_REALISTIC, StoryStyle.VECTOR_ART].map(s => (
                      <button key={s} onClick={() => setUserInput(p => ({ ...p, style: s }))} className={`p-3 rounded-xl border text-left flex items-center gap-4 transition-all ${userInput.style === s ? 'border-amber-400 bg-amber-400/10 text-amber-400' : 'border-slate-700 text-slate-500'}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${userInput.style === s ? 'bg-amber-400 text-slate-950' : 'bg-slate-800'}`}>
                          <i className={`fas ${s === StoryStyle.SEMI_REALISTIC ? 'fa-brush' : s === StoryStyle.ANIMATION_3D ? 'fa-wand-sparkles' : 'fa-bezier-curve'}`}></i>
                        </div>
                        <div className="font-bold text-xs uppercase tracking-widest">{s}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">{t.language}</label>
                    <select name="language" value={userInput.language} onChange={handleInputChange} className="w-full bg-slate-800/50 p-3 rounded-xl border border-slate-700 focus:border-amber-400 outline-none text-xs font-bold uppercase">
                      {LANGUAGES.map(lang => <option key={lang} value={lang} className="bg-slate-900">{lang}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">{t.wordsPerPage}</label>
                    <input name="wordsPerScene" type="number" value={userInput.wordsPerScene} onChange={handleInputChange} className="w-full bg-slate-800/50 p-3 rounded-xl border border-slate-700 focus:border-amber-400 outline-none text-xs font-bold" />
                  </div>
                  {!sheetContext && (
                    <div className="space-y-1 col-span-2">
                      <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">{t.numberOfScenes}</label>
                      {userInput.audience === TargetAudience.KIDS && kidsStoryTemplate === 'RAMADAN' ? (
                        <p className="w-full bg-slate-800/50 p-3 rounded-xl border border-slate-700 text-slate-400 text-xs font-bold">
                          {t.ramadanPagesNote}
                        </p>
                      ) : (
                        <select
                          value={userInput.sceneCount ?? 15}
                          onChange={(e) => setUserInput(prev => ({ ...prev, sceneCount: Number(e.target.value) }))}
                          className="w-full bg-slate-800/50 p-3 rounded-xl border border-slate-700 focus:border-amber-400 outline-none text-xs font-bold"
                        >
                          {SCENE_COUNT_OPTIONS.map(n => (
                            <option key={n} value={n} className="bg-slate-900">{n}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="text-center pt-10">
              <button disabled={loading} onClick={handleGeneratePlan} className="group px-16 py-5 bg-amber-400 text-slate-950 font-bold rounded-full hover:bg-amber-500 transition-all shadow-xl shadow-amber-400/20 text-lg uppercase tracking-widest flex items-center gap-4 mx-auto disabled:opacity-50">
                {loading ? <i className="fas fa-spinner animate-spin"></i> : storyPlan ? <><i className="fas fa-sync"></i> Update Changes</> : <><i className="fas fa-magic"></i> {t.generateSynopsis}</>}
              </button>


              {/* Quick Cover Button */}
              <div className="mt-4 flex justify-center">
                <button onClick={() => {
                  setQuickCoverVisible(!quickCoverVisible);
                  setQuickCoverStyle(userInput.style);
                }} className="px-6 py-3 rounded-full border border-slate-700 text-slate-400 hover:text-white hover:border-amber-400 hover:bg-slate-800 transition-all font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                  <i className="fas fa-bolt text-amber-400"></i> Quick Cover Preview
                </button>
              </div>

              {/* Quick Cover Inline Preview */}
              {quickCoverVisible && (
                <div className="mt-6 bg-slate-900/50 rounded-2xl border border-amber-400/30 p-6 space-y-4 animate-in slide-in-from-top duration-300">
                  <h4 className="text-amber-400 font-bold uppercase tracking-widest flex items-center gap-2">
                    <i className="fas fa-bolt"></i> Quick Cover Generator
                  </h4>

                  {/* Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">{t.artStyle}</label>
                      <select
                        value={quickCoverStyle}
                        onChange={(e) => setQuickCoverStyle(e.target.value as StoryStyle)}
                        className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none font-bold text-xs text-white"
                      >
                        {[StoryStyle.ANIMATION_3D, StoryStyle.SEMI_REALISTIC, StoryStyle.VECTOR_ART].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">{t.customInstructions}</label>
                      <input
                        value={quickCoverCustomInstructions}
                        onChange={(e) => setQuickCoverCustomInstructions(e.target.value)}
                        className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 focus:border-amber-400 outline-none text-xs"
                        placeholder="e.g., add mountains in the background"
                      />
                    </div>
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={handleQuickCoverGen}
                    disabled={quickCoverLoading}
                    className="w-full px-6 py-3 bg-amber-400 text-slate-950 rounded-xl font-bold uppercase text-xs hover:bg-amber-500 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {quickCoverLoading ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-magic"></i>}
                    {quickCoverLoading ? 'Generating...' : 'Generate Cover'}
                  </button>

                  {/* All designs this session – one list, click to select which one is shown/sent */}
                  {quickCoverDesigns.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Designs this session</p>
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                        {quickCoverDesigns.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setSelectedCoverIndex(idx);
                              setQuickCoverScene({
                                id: 0,
                                type: 'front-cover',
                                title: item.title || 'Cover',
                                description: 'Front Cover',
                                prompt: '',
                                storyText: '',
                                history: [],
                                status: 'done',
                                aspectRatio: '1:1',
                                generationRatio: '1:1',
                                imageUrl: item.imageUrl
                              });
                            }}
                            className={`shrink-0 w-16 h-16 rounded-xl border-2 overflow-hidden bg-black transition-colors ${idx === selectedCoverIndex ? 'border-amber-400 ring-2 ring-amber-400/50' : 'border-slate-600 hover:border-amber-400'}`}
                          >
                            <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Preview Area */}
                  {(quickCoverScene?.imageUrl || quickCoverLoading) && (
                    <div className="aspect-square bg-black rounded-2xl border border-slate-800 overflow-hidden relative">
                      {quickCoverScene?.imageUrl && !quickCoverLoading ? (
                        <img src={quickCoverScene.imageUrl} className="w-full h-full object-cover" alt="Quick Cover Preview" />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full">
                          <i className="fas fa-spinner animate-spin text-amber-400 text-4xl mb-3"></i>
                          <p className="text-amber-400 font-bold uppercase text-xs tracking-widest">Generating Cover...</p>
                        </div>
                      )}

                      {/* Download / Send confirm Button Overlay */}
                      {quickCoverScene?.imageUrl && !quickCoverLoading && (
                        <div className="absolute inset-x-0 bottom-0 p-4 bg-slate-900/90 backdrop-blur flex flex-wrap justify-between items-center gap-2">
                          <span className="text-[10px] text-white font-bold truncate max-w-[60%]">{quickCoverScene.title}</span>
                          <div className="flex gap-2">
                            {sheetCoverOnlyMode && sheetContext && (
                              <button onClick={handleSendCoverToDrive} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-[10px] uppercase hover:bg-blue-500 disabled:opacity-50 transition-colors flex items-center gap-1">
                                {loading ? <i className="fas fa-spinner animate-spin"></i> : <i className="fab fa-google-drive"></i>}
                                {t.sendConfirm}
                              </button>
                            )}
                            <button onClick={handleQuickCoverDownload} className="bg-white text-slate-900 px-4 py-2 rounded-lg font-bold text-[10px] uppercase hover:bg-slate-200 transition-colors">
                              <i className="fas fa-download mr-1"></i> Download
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {step === AppStep.CREATION && storyPlan && (
          <div className="space-y-8 animate-in slide-in-from-right duration-500">
            {/* Bulk Actions Toolbar */}
            <div className="flex flex-col md:flex-row flex-wrap gap-4 bg-slate-800/80 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 mb-8 items-center justify-between sticky top-4 z-40 shadow-2xl">
              <div className="flex gap-4 items-center">
                {/* Bulk Select Control */}
                <button onClick={handleSelectAll} className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${selectedScenes.size === storyPlan.scenes.length && storyPlan.scenes.length > 0 ? 'bg-amber-400 border-amber-400 text-slate-950' : 'border-slate-600 text-slate-400'}`}>
                  <i className="fas fa-check-double"></i>
                </button>

                {selectedScenes.size > 0 && (
                  <div className="flex gap-2 animate-in slide-in-from-left">
                    <button onClick={handleDownloadSelected} className="bg-slate-700 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase hover:bg-slate-600 transition-colors">
                      <i className="fas fa-download mr-2"></i> ({selectedScenes.size})
                    </button>
                    <button onClick={handleRegenerateSelected} className="bg-slate-700 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase hover:bg-slate-600 transition-colors">
                      <i className="fas fa-sync mr-2"></i> ({selectedScenes.size})
                    </button>
                  </div>
                )}

                <div className="h-8 w-px bg-slate-700 mx-2 hidden md:block"></div>

                {isGeneratingScenes ? (
                  <div className="flex gap-2">
                    <button onClick={togglePause} className={`px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest text-slate-950 shadow-xl transition-all flex items-center gap-3 transform hover:scale-105 active:scale-95 ${isPaused ? 'bg-green-500 hover:bg-green-400' : 'bg-amber-400 hover:bg-amber-500'}`}>
                      <i className={`fas ${isPaused ? 'fa-play' : 'fa-pause'}`}></i>
                      <span>{isPaused ? 'Resume' : 'Pause'}</span>
                    </button>
                    <button onClick={cancelGeneration} className="bg-red-500 text-white px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-600 shadow-xl shadow-red-500/20 transition-all flex items-center gap-3 transform hover:scale-105 active:scale-95">
                      <i className="fas fa-stop"></i>
                      <span>Stop</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={handleGenerateCovers} className="bg-purple-600 text-white px-5 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-purple-500 shadow-xl shadow-purple-600/20 transition-all flex items-center gap-2 transform hover:scale-105 active:scale-95">
                      <i className="fas fa-book-open"></i>
                      <span>Gen Covers</span>
                    </button>
                    <button onClick={handleGenerateScenes} className="bg-amber-400 text-slate-950 px-5 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-amber-500 shadow-xl shadow-amber-400/20 transition-all flex items-center gap-2 transform hover:scale-105 active:scale-95">
                      <i className="fas fa-film"></i>
                      <span>Gen Scenes</span>
                    </button>
                  </div>
                )}

                <div className="h-8 w-px bg-slate-700 mx-2 hidden lg:block"></div>

                {/* Ultimate Button */}
                <button
                  onClick={handleUltimateFlow}
                  disabled={ultimateProgress !== null}
                  className="relative overflow-hidden bg-gradient-to-r from-pink-600 via-purple-600 to-amber-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-purple-600/30 transition-all flex items-center gap-3 transform hover:scale-105 active:scale-95 disabled:opacity-80 disabled:cursor-not-allowed group"
                >
                  {ultimateProgress !== null && (
                    <div className="absolute inset-0 bg-black/20" style={{ width: `${ultimateProgress}%`, transition: 'width 0.5s ease' }}></div>
                  )}
                  <i className={`fas fa-rocket text-lg ${ultimateProgress !== null ? 'animate-bounce' : 'group-hover:animate-pulse'}`}></i>
                  <span className="relative z-10 flex flex-col items-start leading-tight">
                    <span className="text-[12px]">{ultimateProgress !== null ? `${ultimateProgress}%` : 'ULTIMATE GENERATE'}</span>
                    {ultimateProgress === null && <span className="text-[8px] opacity-80">Full Book + PDF</span>}
                  </span>
                </button>

                <div className="h-8 w-px bg-slate-700 mx-2 hidden lg:block"></div>

                <div className="flex gap-2">
                  <button onClick={handleAutoSplitAll} className="bg-blue-600 text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-600/20 transition-all flex items-center gap-2 transform hover:scale-105 active:scale-95">
                    <i className="fas fa-cut"></i>
                    <span>Process All</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="hidden lg:block text-slate-400 text-[10px] font-bold uppercase tracking-widest mr-2">
                  {/* Calculate pages ready: Covers (1 each) + Scenes (2 each if split, else 0) */}
                  {storyPlan.scenes.reduce((acc, s, i) => {
                    if (i === 0 || i === backCoverIndex) return acc + (s.status === 'done' ? 1 : 0);
                    return acc + (s.splitImages ? 2 : 0);
                  }, 0)} / {2 + innerCount * 2} Pages Ready
                </div>
                <div className="h-8 w-px bg-slate-700 hidden lg:block"></div>

                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => handleDownloadPDF('SPREADS')} className="bg-green-600 text-white px-4 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-green-500 shadow-xl shadow-green-600/20 transition-all flex items-center gap-2 transform hover:scale-105 active:scale-95">
                    <i className="fas fa-file-pdf"></i>
                    <span>PDF ({innerCount + 2} Spreads)</span>
                  </button>
                  <button onClick={() => handleDownloadPDF('PAGES')} className="bg-emerald-600 text-white px-4 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 shadow-xl shadow-emerald-600/20 transition-all flex items-center gap-2 transform hover:scale-105 active:scale-95">
                    <i className="fas fa-file-pdf"></i>
                    <span>PDF ({2 + innerCount * 2} Pages)</span>
                  </button>
                  {sheetContext && (
                    <button onClick={handleSendToDrive} disabled={loading} className="bg-blue-600 text-white px-4 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-500 shadow-xl shadow-blue-600/20 transition-all flex items-center gap-2 transform hover:scale-105 active:scale-95 disabled:opacity-50">
                      <i className="fab fa-google-drive"></i>
                      <span>{t.sendToDrive}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Synopsis Panel */}
            {storyPlan.synopsis && (
              <div className="mb-8 bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
                <button
                  onClick={() => setSynopsisExpanded(!synopsisExpanded)}
                  className="w-full p-4 flex justify-between items-center text-left hover:bg-slate-700/30 transition-colors"
                >
                  <span className="text-amber-400 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                    <i className="fas fa-book-open"></i> {t.synopsisTitle}
                  </span>
                  <i className={`fas fa-chevron-${synopsisExpanded ? 'up' : 'down'} text-slate-400 text-xs`}></i>
                </button>
                {synopsisExpanded && (
                  <div className={`px-4 pb-4 text-slate-300 text-sm leading-relaxed ${storyFontClass}`}>
                    {storyPlan.synopsis}
                  </div>
                )}
              </div>
            )}

            {/* Grid of Scenes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
              {storyPlan.scenes.map((scene, idx) => (
                <div key={idx} className={`relative bg-slate-900/50 rounded-3xl border ${scene.approved ? 'border-green-500/50 shadow-green-500/10' : scene.status === 'error' ? 'border-red-500/50' : scene.status === 'done' ? 'border-amber-400/30' : 'border-slate-800'} overflow-hidden group hover:border-amber-400/50 transition-all shadow-lg flex flex-col`}>

                  {/* Header */}
                  <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
                    <div className="flex items-center gap-3">
                      <button onClick={() => handleToggleSelect(idx)} className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedScenes.has(idx) ? 'bg-amber-400 border-amber-400 text-slate-950' : 'border-slate-600 hover:border-slate-400'}`}>
                        {selectedScenes.has(idx) && <i className="fas fa-check text-[10px]"></i>}
                      </button>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded ${scene.status === 'done' ? 'bg-green-500/10 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
                        Page {idx}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-amber-500 uppercase truncate max-w-[120px]">{scene.type}</span>
                  </div>

                  {/* Image Area */}
                  <div className="aspect-square bg-black relative overflow-hidden">
                    {scene.splitImages ? (
                      <div className="flex w-full h-full">
                        <div className="w-1/2 h-full relative cursor-zoom-in border-r border-black/50" onClick={() => setFullscreenImage(scene.splitImages![0])}>
                          <img src={scene.splitImages[0]} className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                        </div>
                        <div className="w-1/2 h-full relative cursor-zoom-in" onClick={() => setFullscreenImage(scene.splitImages![1])}>
                          <img src={scene.splitImages[1]} className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                        </div>
                      </div>
                    ) : scene.imageUrl ? (
                      <img src={scene.imageUrl} className="w-full h-full object-cover cursor-zoom-in hover:scale-105 transition-transform duration-700" onClick={() => setFullscreenImage(scene.imageUrl!)} />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-800">
                        <i className="fas fa-image text-4xl mb-2 opacity-50"></i>
                        <span className="text-[10px] uppercase font-bold text-slate-700">No Image</span>
                      </div>
                    )}

                    {/* Loading Overlay */}
                    {scene.status === 'loading' && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                        <i className="fas fa-spinner animate-spin text-amber-400 text-3xl mb-2"></i>
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Generating...</span>
                      </div>
                    )}

                    {/* Hover Actions */}
                  </div>

                  {/* Content Area */}
                  {/* Content Area */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col">
                    {/* Aspect Ratio Badge & Actions */}
                    <div className="flex gap-2 justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-800 text-slate-400 px-2 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border border-slate-700 flex items-center justify-center">
                          {scene.aspectRatio}
                        </span>
                        {scene.approved && (
                          <span className="bg-green-500 text-slate-950 px-2 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 shadow-lg shadow-green-500/20 animate-in zoom-in">
                            <i className="fas fa-check-circle"></i> Approved
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {/* Approve Box */}
                        <button onClick={() => handleToggleApproved(idx)} className={`p-2 rounded-lg transition-all ${scene.approved ? 'bg-green-500 text-slate-950 shadow-lg shadow-green-500/20' : 'bg-slate-800 text-slate-500 hover:text-green-400 hover:bg-slate-700'}`} title="Mark as Approved">
                          <i className={`fas ${scene.approved ? 'fa-check-circle' : 'fa-check'}`}></i>
                        </button>

                        {/* Download Single */}
                        {scene.imageUrl && (
                          <button onClick={() => downloadImageWithLogo(scene.imageUrl!, `${userInput.name}-Scene-${idx}.png`, false)} className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" title="Download Image">
                            <i className="fas fa-download"></i>
                          </button>
                        )}
                        {/* Uncrop Button (Show only if split) */}
                        {scene.splitImages && (
                          <button onClick={() => handleUncrop(idx)} className="p-2 rounded-lg bg-slate-800 text-pink-400 hover:text-white hover:bg-pink-600 transition-colors" title="Uncrop / Reset View">
                            <i className="fas fa-expand"></i>
                          </button>
                        )}
                        {/* Auto Split Single (Only for inner scenes that are not yet split) */}
                        {scene.imageUrl && idx !== 0 && idx !== backCoverIndex && !scene.splitImages && (
                          <button onClick={() => handleAutoSplitSingle(idx)} className="p-2 rounded-lg bg-slate-800 text-blue-400 hover:text-white hover:bg-blue-600 transition-colors" title="Auto Split (2:1)">
                            <i className="fas fa-cut"></i>
                          </button>
                        )}
                        {/* Regen */}
                        <button onClick={() => handleRandomizeScene(idx)} className="p-2 rounded-lg bg-slate-800 text-purple-400 hover:text-white hover:bg-purple-500 transition-colors" title="Randomize (New Outfit/Bg)">
                          <i className="fas fa-random"></i>
                        </button>
                        <button onClick={() => handleGenerateScene(idx)} className="p-2 rounded-lg bg-slate-800 text-amber-400 hover:text-white hover:bg-amber-500 transition-colors" title="Regenerate Scene">
                          <i className="fas fa-sync-alt"></i>
                        </button>
                      </div>
                    </div>

                    {/* History Navigation */}
                    {scene.imageUrl && (
                      <div className="flex items-center gap-2 mb-2 bg-slate-950/30 p-2 rounded-lg">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleHistoryUndo(idx)}
                            disabled={!scene.historyIndex || scene.historyIndex <= 0}
                            className={`w-6 h-6 rounded flex items-center justify-center ${(!scene.historyIndex || scene.historyIndex <= 0) ? 'text-slate-700' : 'text-slate-300 hover:bg-slate-700'}`}
                          >
                            <i className="fas fa-arrow-left text-[10px]"></i>
                          </button>
                          <button
                            onClick={() => handleHistoryRedo(idx)}
                            disabled={scene.historyIndex === undefined || (scene.history && scene.historyIndex >= scene.history.length - 1)}
                            className={`w-6 h-6 rounded flex items-center justify-center ${(!scene.history || scene.historyIndex === undefined || scene.historyIndex >= scene.history.length - 1) ? 'text-slate-700' : 'text-slate-300 hover:bg-slate-700'}`}
                          >
                            <i className="fas fa-arrow-right text-[10px]"></i>
                          </button>
                        </div>
                        {/* Thumbnails */}
                        <div className="flex-1 flex gap-1 overflow-x-auto custom-scrollbar pb-1">
                          {(scene.history || []).map((hImg, hIdx) => (
                            <button
                              key={hIdx}
                              onClick={() => handleJumpToHistory(idx, hIdx)}
                              className={`shrink-0 w-6 h-6 rounded overflow-hidden border ${hIdx === scene.historyIndex ? 'border-amber-400' : 'border-slate-700 opacity-50 hover:opacity-100'}`}
                            >
                              <img src={hImg} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Magic Edit Input */}
                    {scene.imageUrl && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Describe changes (e.g. 'Make him smile', 'Add sunset')..."
                          className="flex-1 bg-slate-950/50 rounded-lg border border-slate-800 text-[10px] text-slate-300 px-3 py-2 focus:border-purple-500 outline-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleMagicEdit(idx, (e.target as HTMLInputElement).value);
                              (e.target as HTMLInputElement).value = ''; // Clear after send
                            }
                          }}
                        />
                        <button onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          handleMagicEdit(idx, input.value);
                          input.value = '';
                        }} className="bg-purple-600 text-white px-3 rounded-lg hover:bg-purple-500 transition-colors font-bold">
                          <i className="fas fa-magic"></i>
                        </button>
                      </div>
                    )}

                    {/* Story Text (when scene has storyText) */}
                    {scene.storyText && (
                      <div className={`text-xs text-slate-300 leading-relaxed line-clamp-2 ${storyFontClass}`} title={scene.storyText}>
                        {scene.storyText}
                      </div>
                    )}

                    {/* Prompt Toggle */}
                    <div className="flex justify-end">
                      <button onClick={() => handleTogglePrompt(idx)} className="text-[10px] text-slate-600 hover:text-slate-400 flex items-center gap-1">
                        <i className={`fas ${showPrompts[idx] ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                        {showPrompts[idx] ? 'Hide Details' : 'Show Details'}
                      </button>
                    </div>

                    {/* Prompt Textarea */}
                    {showPrompts[idx] && (
                      <div className="relative group/prompt flex-1 animate-in fade-in slide-in-from-top-2">
                        <textarea
                          value={scene.prompt}
                          onChange={(e) => handleEditScene(idx, 'prompt', e.target.value)}
                          className="w-full h-full min-h-[80px] bg-slate-950/50 rounded-xl border border-slate-800 text-[10px] text-slate-400 p-3 focus:border-amber-400 outline-none resize-none transition-all scrollbar-thin"
                          placeholder="Scene Description..."
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center pb-20">
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-slate-500 hover:text-amber-400 transition-colors">
                <i className="fas fa-arrow-up text-2xl animate-bounce"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      <footer className="mt-16 text-center text-slate-700 text-[10px] font-black uppercase tracking-[0.3em] pb-10">
        <p>&copy; 2026 {t.appTitle} &bull; CUSTOMIZED ADVENTURES</p>
      </footer>
    </div >
  );
};

export default App;
