
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { jsPDF } from 'jspdf';
import { AppStep, UserInput, StoryStyle, TargetAudience, StoryPlan, Scene, ExtraAsset } from './types';

const LOGO_PATH = '/logo.png';
import { generateStoryPlan, generateSceneImage, analyzeImage, describeAsset, editSceneImage, analyzePhotoQuality, validateBookSpread } from './geminiService';


const THEME_OPTIONS = [
  "Amour", "Amitié", "Courage", "Environnement", "Mystère",
  "Aventure", "Magie", "Espace", "Histoire", "Futuriste",
  "Persévérance", "Humour", "Famille", "Nature", "Animaux",
  "Super-héros", "Pirates", "Chevaliers", "Dinosaures", "Découverte",
  "Partage", "Justice", "Science", "Musique", "Sport", "Voyage",
  "Océan", "Rêves", "Égalité", "Sagesse", "Curiosité"
];

const LANGUAGES = ["French", "Arabic", "English", "Spanish"];

type LoversStoryType = '10_REASONS' | 'LOVE_STORY' | 'BUCKET_LIST' | null;
type RecipientType = 'HIM' | 'HER';

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
    wordsPerScene: 15
  });
  const [loversStoryType, setLoversStoryType] = useState<LoversStoryType>(null);
  const [recipientType, setRecipientType] = useState<RecipientType>('HER');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [customOption, setCustomOption] = useState<string>('');
  const [selectedYearsCount, setSelectedYearsCount] = useState<string>('2');

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

  // New state for Photo Quality and Control
  const [photoQuality, setPhotoQuality] = useState<{ score: number; feedback: string } | null>(null);
  const [partnerPhotoQuality, setPartnerPhotoQuality] = useState<{ score: number; feedback: string } | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const stopGenerationRef = useRef(false);
  const [isGeneratingScenes, setIsGeneratingScenes] = useState(false);

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

      if (selectedOptions.length === 0) {
        missing.push("Selections (min 1)");
      } else {
        const context = loversStoryType === 'LOVE_STORY' ? ` Specifically covering ${selectedYearsCount} years of love.` : '';
        finalTheme = `Story Type: ${loversStoryType}.${context} Recipient: ${recipientType}. Key milestones chosen by user: ${selectedOptions.join(' | ')}`;
      }
    } else {
      if (!userInput.theme.trim()) missing.push(t.storyBlueprint);
    }

    if (missing.length > 0) {
      setErrorMessage(`Required: ${missing.join(', ')}`);
      return;
    }

    setLoading(true);
    try {
      const plan = await generateStoryPlan({ ...userInput, theme: finalTheme });
      setStoryPlan(plan);
      setStep(AppStep.CREATION);
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "Failed to generate story plan.");
    } finally {
      setLoading(false);
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
    const indices = Array.from({ length: 15 }, (_, i) => i + 1);
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

    // We only Auto-Split scenes 1-15 (The inner pages). 
    // Covers (0 & 16) are 1:1 and don't need splitting.
    for (let i = 1; i <= 15; i++) {
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

  const handleUltimateFlow = async () => {
    if (!storyPlan) return;
    setUltimateProgress(1);

    try {
      // 1. Generate All Images (0 - 16) = 17 steps
      // 2. Auto Split Scenes (1 - 15) = 15 steps
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
          const isCover = idx === 0 || idx === 16;
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

      // Step 2: Auto Split Scenes (1-15)
      for (let i = 1; i <= 15; i++) {
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
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [1024, 1024]
    });
    const isRTL = userInput.language === 'Arabic';
    setLoading(true);
    try {
      // Index 0: Cover with Logo
      if (storyPlan.scenes[0].imageUrl) {
        doc.addImage(storyPlan.scenes[0].imageUrl, 'PNG', 0, 0, 1024, 1024);
      }

      // Scenes 1-15 
      for (let i = 1; i <= 15; i++) {
        const scene = storyPlan.scenes[i];

        if (format === 'SPREADS') {
          // Raw 16:9 Image (or whatever ratio it is)
          if (scene.imageUrl) {
            doc.addPage([1024, 576]); // approx 16:9 landscape
            doc.addImage(scene.imageUrl, 'PNG', 0, 0, 1024, 576);
          } else {
            doc.addPage([1024, 576]);
          }
        } else {
          // PAGES mode (Split 1:1)
          let left, right;

          if (scene.splitImages) {
            [left, right] = scene.splitImages;
          } else if (scene.imageUrl) {
            // Auto-split if not already split
            try {
              const [l, r] = await splitImage(scene.imageUrl);
              left = l;
              right = r;
            } catch (e) {
              console.error("Auto-split failed for PDF", e);
              left = scene.imageUrl; // Fallback
              right = scene.imageUrl;
            }
          }

          if (left && right) {
            doc.addPage([1024, 1024]);
            doc.addImage(isRTL ? right : left, 'PNG', 0, 0, 1024, 1024);
            doc.addPage([1024, 1024]);
            doc.addImage(isRTL ? left : right, 'PNG', 0, 0, 1024, 1024);
          } else {
            // Fallback blank pages if no image
            doc.addPage([1024, 1024]);
            doc.addPage([1024, 1024]);
          }
        }
      }

      // Index 16: Back Cover with Logo
      doc.addPage([1024, 1024]);
      doc.addPage([1024, 1024]);
      if (storyPlan.scenes[16].imageUrl) {
        doc.addImage(storyPlan.scenes[16].imageUrl, 'PNG', 0, 0, 1024, 1024);
      }

      doc.save(`${userInput.name}-Magical-Book.pdf`);
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
              <button onClick={saveCrop} className="px-10 py-3 bg-amber-400 text-slate-950 rounded-full font-bold shadow-lg shadow-amber-400/20 uppercase tracking-widest text-sm">
                {uiLanguage === 'French' ? 'Appliquer' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="mb-10 text-center relative">
        <div className="absolute top-0 left-0 text-slate-600 text-[10px] font-mono bg-slate-900/50 px-2 py-1 rounded">
          v1.0.6
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

                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-500 ml-1">{t.offeredTo}</label>
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
                      </div>

                      {loversStoryType && (
                        <div className="space-y-4 bg-slate-800/20 p-4 rounded-2xl border border-slate-700/50 animate-in slide-in-from-top duration-300">
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
                      )}
                    </div>
                  ) : (
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
                </div>
              </div>
            </div>

            <div className="text-center pt-10">
              <button disabled={loading} onClick={handleGeneratePlan} className="group px-16 py-5 bg-amber-400 text-slate-950 font-bold rounded-full hover:bg-amber-500 transition-all shadow-xl shadow-amber-400/20 text-lg uppercase tracking-widest flex items-center gap-4 mx-auto disabled:opacity-50">
                {loading ? <i className="fas fa-spinner animate-spin"></i> : storyPlan ? <><i className="fas fa-sync"></i> Update Changes</> : <><i className="fas fa-magic"></i> {t.generateSynopsis}</>}
              </button>
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
                    if (i === 0 || i === 16) return acc + (s.status === 'done' ? 1 : 0);
                    return acc + (s.splitImages ? 2 : 0);
                  }, 0)} / 32 Pages Ready
                </div>
                <div className="h-8 w-px bg-slate-700 hidden lg:block"></div>

                <div className="flex gap-2">
                  <button onClick={() => handleDownloadPDF('SPREADS')} className="bg-green-600 text-white px-4 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-green-500 shadow-xl shadow-green-600/20 transition-all flex items-center gap-2 transform hover:scale-105 active:scale-95">
                    <i className="fas fa-file-pdf"></i>
                    <span>PDF (17 Imgs)</span>
                  </button>
                  <button onClick={() => handleDownloadPDF('PAGES')} className="bg-emerald-600 text-white px-4 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 shadow-xl shadow-emerald-600/20 transition-all flex items-center gap-2 transform hover:scale-105 active:scale-95">
                    <i className="fab fa-google-drive"></i>
                    <span>PDF (32 Pages)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Grid of Scenes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
              {storyPlan.scenes.map((scene, idx) => (
                <div key={idx} className={`relative bg-slate-900/50 rounded-3xl border ${scene.status === 'error' ? 'border-red-500/50' : scene.status === 'done' ? 'border-green-500/30' : 'border-slate-800'} overflow-hidden group hover:border-amber-400/50 transition-all shadow-lg flex flex-col`}>

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
                      <span className="bg-slate-800 text-slate-400 px-2 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border border-slate-700 flex items-center justify-center">
                        {scene.aspectRatio}
                      </span>
                      <div className="flex gap-1">
                        {/* Download Single */}
                        {scene.imageUrl && (
                          <button onClick={() => downloadImageWithLogo(scene.imageUrl!, `${userInput.name}-Scene-${idx}.png`, false)} className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" title="Download">
                            <i className="fas fa-download"></i>
                          </button>
                        )}
                        {/* Auto Split Single (Only for Scenes 1-15 that are not yet split) */}
                        {scene.imageUrl && idx !== 0 && idx !== 16 && (
                          <button onClick={() => handleAutoSplitSingle(idx)} className="p-2 rounded-lg bg-slate-800 text-blue-400 hover:text-white hover:bg-blue-600 transition-colors" title="Auto Split (2:1)">
                            <i className="fas fa-cut"></i>
                          </button>
                        )}
                        {/* Regen */}
                        <button onClick={() => handleGenerateScene(idx)} className="p-2 rounded-lg bg-slate-800 text-amber-400 hover:text-white hover:bg-amber-500 transition-colors" title="Regenerate">
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
        <p>&copy; 2025 {t.appTitle} &bull; CUSTOMIZED ADVENTURES</p>
      </footer>
    </div >
  );
};

export default App;
