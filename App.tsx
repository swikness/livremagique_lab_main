
import React, { useState, useEffect, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { jsPDF } from 'jspdf';
import { AppStep, UserInput, StoryStyle, TargetAudience, StoryPlan, Scene, ExtraAsset } from './types';
import { generateStoryPlan, generateSceneImage, analyzeImage, describeAsset, editSceneImage } from './geminiService';

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
    chooseOptions: "Choisissez vos options (max 10) :",
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
    book1Title: (name: string, gender: string) => `Livre 1 : "10 Raisons pour lesquelles je l'aime (${gender === 'HER' ? 'Elle' : 'Lui'}), ${name || '[Nom]'}"`,
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
    chooseOptions: "Choose your options (max 10):",
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
    book1Title: (name: string, gender: string) => `Book 1: "10 Reasons why I love ${gender === 'HER' ? 'HER' : 'HIM'}, ${name || '[Name]'}"`,
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
    "Tu es mon amour, tout simplement."
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
    "Tu es mon évidence."
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
    "Et pour toutes les années de bonheur qu'il nous reste à vivre."
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
    "Simplement être heureux, ici et maintenant, pour toujours."
  ]
};

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.INPUT);
  const [uiLanguage, setUiLanguage] = useState<'French' | 'English'>('French');
  const [isKeyChecking, setIsKeyChecking] = useState(true);
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

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<'reference' | 'partner' | 'scene'>('reference');
  const [sceneToCropIndex, setSceneToCropIndex] = useState<number | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const t = TRANSLATIONS[uiLanguage];

  useEffect(() => {
    checkKey();
  }, []);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 7000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const checkKey = async () => {
    try {
      const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
      if (!hasKey) {
        await (window as any).aistudio?.openSelectKey();
      }
    } catch (e) {
      console.error("API Key selection failed", e);
    } finally {
      setIsKeyChecking(false);
    }
  };

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
        setErrorMessage(uiLanguage === 'French' ? "Maximum de 10 options." : "Maximum of 10 options.");
        return prev;
      }
      return [...prev, option];
    });
  };

  const handleAddCustomOption = () => {
    if (!customOption.trim()) return;
    if (selectedOptions.length >= 10) {
      setErrorMessage(uiLanguage === 'French' ? "Maximum de 10 options." : "Maximum of 10 options.");
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'reference' | 'partner' = 'reference') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setCropTarget(target);
      setImageToCrop(reader.result as string);
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
        if (scene.imageUrl) scene.history = [scene.imageUrl, ...scene.history].slice(0, 20);
        scene.imageUrl = croppedImage;
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
      setStep(AppStep.PLANNING);
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "Failed to generate story plan.");
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
      const img = await generateSceneImage(scene, userInput.style, userInput.photoBase64, userInput.partnerPhotoBase64);
      scene.imageUrl = img;
      scene.status = 'done';
    } catch (err: any) {
      scene.status = 'error';
      console.error(err);
      setErrorMessage(`Generation failed. Ensure a paid API key is selected.`);
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

  const handleDownloadPDF = async () => {
    if (!storyPlan) return;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [1024, 1024]
    });
    const isRTL = userInput.language === 'Arabic';
    setLoading(true);
    try {
      if (storyPlan.scenes[0].imageUrl) doc.addImage(storyPlan.scenes[0].imageUrl, 'PNG', 0, 0, 1024, 1024);
      for (let i = 1; i <= 15; i++) {
        const scene = storyPlan.scenes[i];
        if (scene.splitImages) {
          const [left, right] = scene.splitImages;
          doc.addPage([1024, 1024]);
          doc.addImage(isRTL ? right : left, 'PNG', 0, 0, 1024, 1024);
          doc.addPage([1024, 1024]);
          doc.addImage(isRTL ? left : right, 'PNG', 0, 0, 1024, 1024);
        } else {
          doc.addPage([1024, 1024]);
          if (scene.imageUrl) doc.addImage(scene.imageUrl, 'PNG', 0, 0, 1024, 1024);
          doc.addPage([1024, 1024]);
        }
      }
      doc.addPage([1024, 1024]);
      if (storyPlan.scenes[16].imageUrl) doc.addImage(storyPlan.scenes[16].imageUrl, 'PNG', 0, 0, 1024, 1024);
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

  if (isKeyChecking) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center glass-morphism p-10 rounded-3xl">
        <i className="fas fa-magic text-amber-400 text-6xl mb-6 animate-pulse"></i>
        <h1 className="text-3xl font-magic text-white">{t.appTitle}</h1>
      </div>
    </div>
  );

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
        <div className="absolute top-0 right-0 flex gap-2">
            <button onClick={() => setUiLanguage('French')} className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${uiLanguage === 'French' ? 'bg-amber-400 border-amber-400 text-slate-950' : 'border-slate-700 text-slate-500'}`}>FR</button>
            <button onClick={() => setUiLanguage('English')} className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${uiLanguage === 'English' ? 'bg-amber-400 border-amber-400 text-slate-950' : 'border-slate-700 text-slate-500'}`}>EN</button>
        </div>
        <h1 className="text-6xl font-magic bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent mb-2">{t.appTitle}</h1>
        <p className="text-slate-400 tracking-widest text-sm uppercase">{t.subtitle}</p>
      </header>

      <div className="glass-morphism rounded-3xl p-6 md:p-10 shadow-2xl overflow-hidden min-h-[600px]">
        <div className="flex justify-center gap-4 mb-12">
          {[AppStep.INPUT, AppStep.PLANNING, AppStep.CREATION].map((s, idx) => (
            <div key={s} className="flex items-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all font-bold ${step === s ? 'border-amber-400 bg-amber-400 text-slate-950 scale-110 shadow-lg shadow-amber-400/20' : 'border-slate-700 text-slate-600'}`}>{idx + 1}</div>
              {idx < 2 && <div className={`w-12 h-px mx-2 ${step === AppStep.PLANNING || step === AppStep.CREATION ? 'bg-amber-400/50' : 'bg-slate-700'}`} />}
            </div>
          ))}
        </div>

        {step === AppStep.INPUT && (
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
                             <span className={`text-[10px] font-bold ${selectedOptions.length === 10 ? 'text-red-400' : 'text-pink-500'}`}>{selectedOptions.length} / 10</span>
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

            <div className="pt-8 border-t border-slate-800">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-amber-100 flex items-center gap-2"><i className="fas fa-users-viewfinder text-amber-400"></i> Extra World Assets</h3>
                <button onClick={addExtra} className="bg-amber-400/10 text-amber-400 border border-amber-400/30 px-5 py-2 rounded-full font-bold text-xs hover:bg-amber-400/20 transition-all">{t.addAssets}</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {userInput.extras.map(ex => (
                  <div key={ex.id} className="bg-slate-800/30 p-4 rounded-2xl border border-slate-700 flex gap-4 relative group hover:border-slate-500 transition-all">
                    <button onClick={() => removeExtra(ex.id)} className="absolute top-2 right-2 text-slate-600 hover:text-red-400"><i className="fas fa-times-circle"></i></button>
                    <div className="w-16 h-16 bg-slate-900 rounded-xl relative overflow-hidden flex-shrink-0 border border-slate-700">
                      {ex.photoBase64 ? <img src={ex.photoBase64} className="w-full h-full object-cover" /> : <div className="flex flex-col items-center justify-center h-full opacity-30"><i className="fas fa-image text-xs"></i></div>}
                      <input type="file" accept="image/*" onChange={(e) => handleExtraUpload(e, ex.id)} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <input value={ex.name} onChange={(e) => updateExtra(ex.id, 'name', e.target.value)} placeholder={t.name} className="w-full text-xs font-bold bg-transparent border-b border-slate-700 outline-none pb-1" />
                      <input value={ex.description} onChange={(e) => updateExtra(ex.id, 'description', e.target.value)} placeholder="Desc" className="w-full text-[9px] text-slate-500 bg-transparent outline-none" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="text-center pt-10">
              <button disabled={loading} onClick={handleGeneratePlan} className="group px-16 py-5 bg-amber-400 text-slate-950 font-bold rounded-full hover:bg-amber-500 transition-all shadow-xl shadow-amber-400/20 text-lg uppercase tracking-widest flex items-center gap-4 mx-auto disabled:opacity-50">
                {loading ? <i className="fas fa-spinner animate-spin"></i> : <><i className="fas fa-magic"></i> {t.generateSynopsis}</>}
              </button>
            </div>
          </div>
        )}

        {step === AppStep.PLANNING && storyPlan && (
          <div className="space-y-8 animate-in slide-in-from-right duration-500">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-xl font-bold text-amber-400 font-magic">{t.synopsisTitle} ({userInput.language})</h3>
               <button onClick={handleCopyAllPrompts} className="bg-amber-400/10 text-amber-400 border border-amber-400/30 px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2">
                  <i className={`fas ${copySuccess ? 'fa-check text-green-400' : 'fa-copy'}`}></i>
                  {copySuccess ? 'Copied!' : t.copyPrompts}
               </button>
            </div>
            <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700 shadow-inner">
              <textarea value={storyPlan.synopsis} onChange={(e) => setStoryPlan({...storyPlan, synopsis: e.target.value})} className="w-full h-40 bg-slate-900/50 p-5 rounded-2xl border border-slate-800 outline-none italic leading-relaxed text-amber-100/90" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {storyPlan.scenes.map((scene, idx) => (
                <div key={idx} className="bg-slate-800/30 p-6 rounded-3xl border border-slate-700 space-y-4 group">
                  <div className="flex justify-between items-center font-bold text-[10px] uppercase tracking-widest">
                    <span className={`px-2 py-1 rounded-md ${scene.type === 'front-cover' || scene.type === 'back-cover' ? 'bg-amber-400 text-slate-950' : 'bg-slate-900 text-amber-500'}`}>{scene.type.replace('-', ' ')}</span>
                    <span className="text-slate-500">{t.page} {idx}</span>
                  </div>
                  <input value={scene.title} onChange={(e) => handleEditScene(idx, 'title', e.target.value)} className="w-full bg-transparent border-b border-slate-800 outline-none font-bold text-lg" />
                  <textarea value={scene.storyText} onChange={(e) => handleEditScene(idx, 'storyText', e.target.value)} className="w-full h-24 bg-slate-900/60 p-3 rounded-xl text-xs text-slate-300 outline-none italic leading-relaxed" />
                  <textarea value={scene.prompt} onChange={(e) => handleEditScene(idx, 'prompt', e.target.value)} className="w-full h-32 bg-amber-400/5 p-3 rounded-xl text-[10px] text-amber-100/70 outline-none border border-amber-400/10" />
                </div>
              ))}
            </div>
            <div className="text-center pt-10 sticky bottom-4 z-50">
              <button onClick={() => setStep(AppStep.CREATION)} className="px-14 py-5 bg-amber-400 text-slate-950 font-bold rounded-full shadow-2xl hover:bg-amber-500 transition-all uppercase tracking-widest">
                {t.confirmPlan}
              </button>
            </div>
          </div>
        )}

        {step === AppStep.CREATION && storyPlan && (
          <div className="space-y-8 animate-in slide-in-from-right duration-500">
            <div className="flex overflow-x-auto gap-3 pb-6 no-scrollbar p-2">
              {storyPlan.scenes.map((scene, idx) => (
                <button key={idx} draggable onDragStart={() => onDragStart(idx)} onDragOver={(e) => onDragOver(e, idx)} onDrop={() => onDrop(idx)} onClick={() => setCurrentSceneIndex(idx)} className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center font-black transition-all border-2 ${currentSceneIndex === idx ? 'bg-amber-400 border-amber-400 text-slate-950 scale-110 shadow-lg' : scene.imageUrl ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                  {idx === 0 ? 'CVR' : idx === storyPlan.scenes.length - 1 ? 'END' : idx}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-slate-800/60 p-7 rounded-3xl border border-slate-700 shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-[10px] uppercase font-black bg-amber-400 text-slate-950 px-2 py-1 rounded-lg">{t.page} {currentSceneIndex}</span>
                    <h2 className="text-xl font-magic text-white leading-tight">{storyPlan.scenes[currentSceneIndex].title}</h2>
                  </div>
                  <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 mb-6 relative">
                    <p className="italic text-sm text-amber-100/80 leading-relaxed">"{storyPlan.scenes[currentSceneIndex].storyText}"</p>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">{t.artStyle} Override</label>
                      <div className="flex gap-2">
                        {[StoryStyle.ANIMATION_3D, StoryStyle.SEMI_REALISTIC, StoryStyle.VECTOR_ART].map(s => (
                          <button key={s} onClick={() => handleOverrideStyle(currentSceneIndex, s)} className={`flex-1 py-2 rounded-xl text-[9px] font-black border-2 ${ (storyPlan.scenes[currentSceneIndex].overrideStyle || userInput.style) === s ? 'bg-amber-400 border-amber-400 text-slate-950' : 'bg-slate-900 border-slate-800 text-slate-500' }`}>{s.split(' ')[0]}</button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Art Engine Prompt</label>
                      <textarea value={storyPlan.scenes[currentSceneIndex].prompt} onChange={(e) => handleEditScene(currentSceneIndex, 'prompt', e.target.value)} className="w-full h-32 bg-slate-950/70 p-4 rounded-2xl border border-slate-800 text-[11px] text-slate-400 outline-none" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">{t.editDetails}</label>
                      <div className="flex gap-2">
                        <textarea value={storyPlan.scenes[currentSceneIndex].editInstruction || ''} onChange={(e) => handleEditScene(currentSceneIndex, 'editInstruction', e.target.value)} className="flex-1 h-16 bg-blue-900/10 p-3 rounded-xl border border-blue-400/20 text-[11px] text-slate-300 outline-none" placeholder="e.g. Change outfits to blue..." />
                        <button disabled={!storyPlan.scenes[currentSceneIndex].imageUrl || storyPlan.scenes[currentSceneIndex].status === 'loading'} onClick={() => handleEditPhoto(currentSceneIndex)} className="bg-blue-600 text-white px-4 rounded-xl hover:bg-blue-500 disabled:opacity-20"><i className="fas fa-wand-sparkles"></i></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <button disabled={storyPlan.scenes[currentSceneIndex].status === 'loading'} onClick={() => handleGenerateScene(currentSceneIndex)} className="bg-amber-400 text-slate-950 font-black py-4 rounded-2xl hover:bg-amber-500 uppercase text-xs tracking-widest">{storyPlan.scenes[currentSceneIndex].status === 'loading' ? <i className="fas fa-spinner animate-spin"></i> : t.regenerate}</button>
                      <button disabled={!storyPlan.scenes[currentSceneIndex].imageUrl} onClick={() => handleAnalyze(currentSceneIndex)} className="bg-slate-700 text-white font-black py-4 rounded-2xl uppercase text-xs tracking-widest">{t.analyze}</button>
                    </div>
                    {storyPlan.scenes[currentSceneIndex].imageUrl && (
                      <div className="flex gap-2">
                        <button onClick={() => openSceneCrop(currentSceneIndex)} className="flex-1 bg-blue-500 text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest">{t.cropSplit}</button>
                        {storyPlan.scenes[currentSceneIndex].splitImages && <button onClick={() => handleUncrop(currentSceneIndex)} className="px-4 bg-slate-700 text-white font-black rounded-2xl"><i className="fas fa-undo"></i></button>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-slate-800/40 p-5 rounded-3xl border border-slate-700">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Portraits Persistence</h4>
                  <div className="flex flex-wrap gap-3">
                    <img src={userInput.photoBase64} className="w-14 h-14 rounded-xl object-cover border-2 border-amber-400" />
                    {userInput.audience === TargetAudience.LOVERS && <img src={userInput.partnerPhotoBase64} className="w-14 h-14 rounded-xl object-cover border-2 border-pink-500" />}
                    {userInput.extras.map(ex => <img key={ex.id} src={ex.photoBase64} className="w-14 h-14 rounded-xl object-cover border-2 border-slate-700 opacity-80" />)}
                  </div>
                </div>
                <button onClick={handleDownloadPDF} disabled={loading} className="w-full bg-green-600 text-white font-black py-5 rounded-3xl hover:bg-green-500 uppercase tracking-widest text-sm shadow-xl shadow-green-600/20">{t.downloadPdf}</button>
              </div>

              <div className="lg:col-span-8 space-y-6">
                <div className={`relative rounded-[2.5rem] overflow-hidden shadow-2xl bg-slate-950 border-8 border-slate-800/50 min-h-[550px] flex flex-col items-center justify-center ${storyPlan.scenes[currentSceneIndex].aspectRatio === '1:1' ? 'max-w-[600px] mx-auto' : 'w-full'}`}>
                  {storyPlan.scenes[currentSceneIndex].splitImages ? (
                    <div className="flex w-full h-full gap-1 p-1 bg-slate-900">
                      <div className="flex-1 aspect-square relative group">
                        <img src={storyPlan.scenes[currentSceneIndex].splitImages![0]} className="w-full h-full object-cover rounded-l-2xl cursor-zoom-in" onClick={() => setFullscreenImage(storyPlan.scenes[currentSceneIndex].splitImages![0])} />
                      </div>
                      <div className="flex-1 aspect-square relative group">
                        <img src={storyPlan.scenes[currentSceneIndex].splitImages![1]} className="w-full h-full object-cover rounded-r-2xl cursor-zoom-in" onClick={() => setFullscreenImage(storyPlan.scenes[currentSceneIndex].splitImages![1])} />
                      </div>
                    </div>
                  ) : storyPlan.scenes[currentSceneIndex].imageUrl ? (
                    <div className="relative w-full h-full group">
                      <img src={storyPlan.scenes[currentSceneIndex].imageUrl} className="w-full h-full object-cover cursor-zoom-in" onClick={() => setFullscreenImage(storyPlan.scenes[currentSceneIndex].imageUrl!)} />
                    </div>
                  ) : (
                    <div className="text-center p-12 opacity-30">
                      <i className="fas fa-paint-brush text-4xl mb-6"></i>
                      <p className="text-lg font-bold">Ready to Illustrate</p>
                    </div>
                  )}
                  {storyPlan.scenes[currentSceneIndex].status === 'loading' && (
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl flex flex-col items-center justify-center p-10 z-20">
                       <i className="fas fa-magic text-amber-400 text-7xl animate-pulse mb-4"></i>
                       <p className="text-amber-400 font-magic text-2xl">{t.generatingArt}</p>
                    </div>
                  )}
                </div>
                
                {storyPlan.scenes[currentSceneIndex].history.length > 0 && (
                  <div className="bg-slate-950/30 p-4 rounded-3xl border border-slate-800/50">
                    <div className="flex items-center justify-between mb-3 px-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.versionHistory} ({storyPlan.scenes[currentSceneIndex].history.length} versions)</span>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar no-scrollbar-md">
                      {storyPlan.scenes[currentSceneIndex].history.map((histUrl, hIdx) => (
                        <div key={hIdx} className="relative group flex-shrink-0">
                          <button 
                            onClick={() => restoreFromHistory(currentSceneIndex, histUrl)} 
                            className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-800 hover:border-amber-400 transition-all block"
                          >
                            <img src={histUrl} className="w-full h-full object-cover" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center bg-slate-800/20 p-4 rounded-3xl border border-slate-800/50">
                  <button disabled={currentSceneIndex === 0} onClick={() => setCurrentSceneIndex(p => p - 1)} className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center hover:bg-slate-700 disabled:opacity-20"><i className="fas fa-chevron-left"></i></button>
                  <div className="flex gap-4">
                    <button onClick={() => handleToggleAspectRatio(currentSceneIndex)} className="bg-slate-800 text-slate-300 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-slate-700">{storyPlan.scenes[currentSceneIndex].aspectRatio} Layout</button>
                  </div>
                  <button disabled={currentSceneIndex === storyPlan.scenes.length - 1} onClick={() => setCurrentSceneIndex(p => p + 1)} className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center hover:bg-slate-700 disabled:opacity-20"><i className="fas fa-chevron-right"></i></button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <footer className="mt-16 text-center text-slate-700 text-[10px] font-black uppercase tracking-[0.3em] pb-10">
         <p>&copy; 2025 {t.appTitle} &bull; CUSTOMIZED ADVENTURES</p>
      </footer>
    </div>
  );
};

export default App;
