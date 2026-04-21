import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ArrowRight, Menu, X, Play, Shield, Upload, Save, Trash2, Eye, Users, BarChart2, DollarSign, Megaphone, Activity, Heart, MessageCircle, Share2 } from 'lucide-react';
import { db, auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, collection, getDocs, getDoc, setDoc, doc, deleteDoc, type FirebaseUser, query, orderBy, updateDoc, increment, addDoc, where, limit, storage, ref, uploadBytes, getDownloadURL } from './firebase';
import { GoogleGenAI, Type } from '@google/genai';

const SUPER_ADMIN_EMAIL = 'riderezzy@gmail.com';
const normalizeEmail = (email?: string | null) => email?.trim().toLowerCase() || '';
const isSuperAdminEmail = (email?: string | null) => normalizeEmail(email) === SUPER_ADMIN_EMAIL;
const isFirestoreOfflineError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: string }).code === 'unavailable';
const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

// --- TYPES ---
type Page = 'index' | 'archive' | 'manifesto' | 'admin' | 'article' | 'search' | 'business' | 'about' | 'contact' | 'profile' | 'orders';

interface Order {
  id: string;
  userEmail: string;
  storyId: string;
  storyTitle: string;
  status: 'pending' | 'shipped' | 'cancelled';
  createdAt: number;
}

interface Ad {
  id: string;
  partner: string;
  headline: string;
  copy: string;
  image?: string;
  video?: string;
  link: string;
  isActive: boolean;
  type: 'image' | 'video';
  createdAt: number;
  clicks?: number;
}

interface Category {
  id: string;
  name: string;
}

interface Comment {
  id: string;
  storyId: string;
  author: string;
  text: string;
  createdAt: number;
}

interface Story {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  content?: string;
  image?: string;
  video?: string;
  aspect: 'portrait' | 'landscape' | 'square';
  type: 'image' | 'video';
  date: string;
  ownerId?: string;
  createdAt?: number;
  likesCount?: number;
}

// --- MOCK DATA ---
const INITIAL_STORIES: Story[] = [
  {
    id: '01',
    category: 'STREET CULTURE',
    title: 'THE DAKAR RENAISSANCE',
    excerpt: 'How Senegalese youth are reclaiming the streets through a fusion of traditional tailoring and skate culture.',
    content: "The vibrant streets of Dakar have become a laboratory for a new kind of creative expression. Young Senegalese skaters are blending the sharp lines of traditional tailoring with the rugged, functional aesthetics of global skate culture. This isn't just about fashion; it's a movement of reclamation.\n\nIn the Médina, you'll see skaters in deconstructed boubou-inspired jackets performing tricks over makeshift obstacles. This fusion represents a generational shift—a respect for the elders' craft meeting the defiant energy of the youth. We followed the collective 'Dakar Rollers' as they navigated the city's concrete and history.",
    image: 'https://picsum.photos/seed/dakar-skate/800/1200?grayscale',
    aspect: 'portrait',
    type: 'image',
    date: '2026.04.12'
  },
  {
    id: '02',
    category: 'CREATIVE TECH',
    title: 'AFROFUTURISM IN PIXELS',
    excerpt: 'Digital artists in Lagos building new worlds using AI, Web3, and ancient mythologies.',
    content: "Lagos is witnessing a digital explosion. Artists like Olamide Ajayi are using generative AI not just to create art, but to world-build. Their canvases are the expansive, unmapped territories of Afrofuturism.\n\nBy feeding neural networks with patterns from Yoruba cloth and architectural motifs from the Sahelian kingdoms, these creators are imagining a future that is distinctly African. This isn't science fiction imported from the West; it's a home-grown vision of tech-empowered heritage. The decentralized nature of Web3 is also providing these artists with a new economy, bypassing traditional gatekeepers and reaching a global audience directly from their studios in Surulere.",
    image: 'https://picsum.photos/seed/lagos-tech/1200/800?grayscale',
    aspect: 'landscape',
    type: 'image',
    date: '2026.04.10'
  },
  {
    id: 'V1',
    category: 'MOTION DESIGN',
    title: 'KINETIC KINSHASA',
    excerpt: 'A visual exploration of rhythm and movement in the heart of Congo. Captured in 8K.',
    content: "Movement is the language of Kinshasa. In our latest motion study, we capture the polyrhythmic energy of the city. From the synchronized dances of the Sapuer collectives to the chaotic but rhythmic flow of the Matatu buses, every frame tells a story of survival and celebration.\n\nThe film, shot exclusively on 35mm film and scanned to 8K, focuses on the tactile nature of Kinois life. It's a raw, unfiltered look at how rhythm is woven into the very fabric of the metropolis. Watch the full study to experience the bass of the city.",
    video: 'https://assets.mixkit.co/videos/preview/mixkit-dancing-woman-in-a-red-dress-1258-large.mp4',
    aspect: 'portrait',
    type: 'video',
    date: '2026.04.08'
  },
  {
    id: '03',
    category: 'MUSIC',
    title: 'BEYOND AFROBEATS',
    excerpt: 'The underground sounds of Accra that are defying genre categorization.',
    content: "While the world focuses on the mainstream Afrobeats wave, Accra's underground is cooking something entirely different. A blend of highlife-infused electronic music and experimental rap is emerging from the city's coastal hubs.\n\nArtists like Amaarae and the collective La Même Gang were just the beginning. Now, a new crop of producers is experimenting with Ghanaian heritage sounds, stripping them back to their barest elements and rebuilding them for the club. It's a sonic search for identity in a hyper-connected world.",
    image: 'https://picsum.photos/seed/accra-music/800/800?grayscale',
    aspect: 'square',
    type: 'image',
    date: '2026.04.05'
  },
  {
    id: 'V2',
    category: 'STREET FOOD',
    title: 'SMOKE AND SPICE',
    excerpt: 'The nocturnal markets of Marrakech. A sensory journey through the visual smoke.',
    content: "When the sun sets over the Jemaa el-Fnaa, the real Marrakech wakes up. The air becomes thick with the scent of cumin, grilled lamb, and woodsmoke. In this visual essay, we explore the choreography of the night stall owners.\n\nEach stall is an installation; each chef a performer. Using macro-cinematography, we bring you closer to the textures of the food and the faces of the people who keep these ancient traditions alive under the neon lights of the modern city.",
    video: 'https://assets.mixkit.co/videos/preview/mixkit-ink-swirling-in-water-transparent-background-443-large.mp4',
    aspect: 'landscape',
    type: 'video',
    date: '2026.04.01'
  },
  {
    id: '04',
    category: 'FASHION',
    title: 'DECONSTRUCTING HERITAGE',
    excerpt: 'A critical look at how contemporary designers are tearing apart colonial fashion norms.',
    content: "The legacy of colonialism in fashion is being dismantled, stitch by stitch. A new wave of designers across the continent is reclaiming their heritage by deconstructing the forms imposed on them for centuries.\n\nBy using indigenous textiles like Kente, Aso-oke, and Bogolan in structural, avant-garde silhouettes, they are making a political statement. It's about taking up space and redefining what 'premium' looks like from an African perspective. We visited the workshops of three designers in Cape Town who are leading this charge.",
    image: 'https://picsum.photos/seed/heritage-fashion/800/1000?grayscale',
    aspect: 'portrait',
    type: 'image',
    date: '2026.03.28'
  }
];

// --- COMPONENTS ---

const Ticker = () => {
  return (
    <div className="w-full border-b border-brand-black overflow-hidden flex whitespace-nowrap py-2 bg-brand-black text-brand-gray text-xs uppercase tracking-[0.2em] font-medium sticky top-0 z-50">
      <motion.div
        className="flex gap-8 px-4"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ ease: 'linear', duration: 25, repeat: Infinity }}
      >
        <span>IYUUN IS A PREMIUM PAN-AFRICAN VISUAL CULTURE MAGAZINE</span>
        <span className="text-brand-red">///</span>
        <span>DOCUMENTING AUTHENTIC EXPRESSION</span>
        <span className="text-brand-red">///</span>
        <span>FASHION, STREET CULTURE, MUSIC, ART, TECHNOLOGY</span>
        <span className="text-brand-red">///</span>
        <span>IYUUN IS A PREMIUM PAN-AFRICAN VISUAL CULTURE MAGAZINE</span>
        <span className="text-brand-red">///</span>
        <span>DOCUMENTING AUTHENTIC EXPRESSION</span>
        <span className="text-brand-red">///</span>
        <span>FASHION, STREET CULTURE, MUSIC, ART, TECHNOLOGY</span>
        <span className="text-brand-red">///</span>
      </motion.div>
    </div>
  );
};

const NavBar = ({ isMenuOpen, setIsMenuOpen, currentPage, setCurrentPage }: { isMenuOpen: boolean, setIsMenuOpen: (v: boolean) => void, currentPage: Page, setCurrentPage: (p: Page) => void }) => {
  return (
    <nav className="w-full border-b border-brand-black px-4 md:px-8 py-4 flex justify-between items-center relative z-[60] bg-[#F8F8F8]">
      <div className="flex-1 flex items-center gap-6">
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="hover:text-brand-red transition-all duration-300 transform active:scale-95"
          aria-label="Toggle Menu"
        >
          {isMenuOpen ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
        </button>
        <span className="hidden md:block text-[10px] md:text-xs uppercase tracking-[0.3em] font-bold">EDN — 001</span>
      </div>
      
      <div className="flex-1 flex justify-center">
        <h1 
          onClick={() => { setCurrentPage('index'); setIsMenuOpen(false); }}
          className="font-display font-bold text-3xl md:text-4xl tracking-tighter uppercase cursor-pointer hover:text-brand-red transition-colors"
        >
          IYUUN
        </h1>
      </div>
      
      <div className="flex-1 flex justify-end items-center gap-4">
        <button 
          onClick={() => setCurrentPage('archive')}
          className={`hidden md:block text-xs uppercase tracking-widest font-bold hover:text-brand-red transition-colors ${currentPage === 'archive' ? 'text-brand-red underline underline-offset-4' : ''}`}
        >
          Archive
        </button>
        <span className="hidden md:block w-1.5 h-1.5 bg-brand-red rounded-full animate-pulse"></span>
      </div>
    </nav>
  );
};

const MenuOverlay = ({ isOpen, onClose, setCurrentPage, user, handleGoogleLogin, handleLogout, userRole, isAdminMode, setIsAdminMode, orderStatus, requestPrint }: { 
  isOpen: boolean, 
  onClose: () => void, 
  setCurrentPage: (p: Page) => void,
  user: FirebaseUser | null,
  handleGoogleLogin: () => void,
  handleLogout: () => void,
  userRole: 'admin' | 'editor' | 'viewer',
  isAdminMode: boolean,
  setIsAdminMode: (v: boolean) => void,
  orderStatus: 'idle' | 'success' | 'loading',
  requestPrint: (id: string, title: string) => void
}) => {
  const navigate = (p: Page) => {
    setCurrentPage(p);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[55] bg-[#F8F8F8] pt-32 px-4 md:px-8 flex flex-col justify-between overflow-y-auto no-scrollbar"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl mx-auto w-full">
            <div>
              <div className="flex items-center justify-between mb-8 border-b border-gray-200 pb-2">
                <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400">Navigation</p>
                {user ? (
                  <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-brand-red">
                    <button onClick={() => navigate('profile')} className="hover:text-black hover:underline underline-offset-4">{user.displayName || user.email}</button>
                    <span>|</span>
                    <button onClick={handleLogout} className="text-gray-400 hover:text-black">Logout</button>
                  </div>
                ) : (
                  <button 
                    onClick={handleGoogleLogin}
                    className="text-[10px] font-bold uppercase tracking-widest hover:text-brand-red flex items-center gap-2"
                  >
                    Login with Google
                  </button>
                )}
              </div>

              {/* Admin Mode Toggle */}
              {(userRole === 'admin' || userRole === 'editor') && (
                <div className="mb-8 p-4 border border-brand-black flex items-center justify-between bg-white shadow-sm">
                   <div>
                     <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Access Control</p>
                     <p className="text-xs opacity-60">Session Identity: {userRole.toUpperCase()}</p>
                   </div>
                   <button 
                    onClick={() => {
                      setIsAdminMode(!isAdminMode);
                      if (!isAdminMode) {
                        navigate('admin');
                      } else {
                        navigate('index');
                      }
                    }}
                    className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                      isAdminMode 
                        ? 'bg-brand-red text-white ring-2 ring-brand-red ring-offset-2' 
                        : 'bg-brand-black text-white hover:bg-brand-gray/80'
                    }`}
                   >
                     {isAdminMode ? 'Switch to Reader' : 'Switch to Editor Mode'}
                   </button>
                </div>
              )}

              <ul className="space-y-4 font-display text-5xl md:text-7xl font-medium tracking-tighter uppercase">
                {(isAdminMode ? [
                  { name: 'Dashboard', id: 'admin' as Page },
                  { name: 'Reader View', id: 'index' as Page },
                  { name: 'Archives', id: 'archive' as Page },
                ] : [
                  { name: 'Home', id: 'index' as Page },
                  { name: 'Search', id: 'search' as Page },
                  { name: 'Archive', id: 'archive' as Page },
                  { name: 'Manifesto', id: 'manifesto' as Page },
                  { name: 'Partnerships', id: 'business' as Page },
                  { name: 'About', id: 'about' as Page }
                ]).map((item, idx) => (
                  <motion.li 
                    key={item.name}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * idx, duration: 0.5 }}
                    className="hover:text-brand-red hover:translate-x-4 transition-all duration-300 cursor-pointer flex items-center gap-4 group"
                    onClick={() => navigate(item.id)}
                  >
                    <span>{item.name}</span>
                    <ArrowRight className="opacity-0 group-hover:opacity-100 transition-opacity w-10 h-10" />
                  </motion.li>
                ))}
              </ul>
            </div>
            
            <div className="hidden md:flex flex-col justify-between border-l border-gray-200 pl-12">
              <div>
                <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 mb-8 border-b border-gray-200 pb-2">Philosophy</p>
                <p className="text-2xl leading-tight font-light mb-6">
                  Searching for the <span className="font-medium italic">Undiscovered</span>. Documenting the <span className="font-medium italic">Authentic</span>.
                </p>
                <p className="text-gray-500 text-sm leading-relaxed max-w-sm">
                  We are a premium Pan-African lens on global culture. We look where others don't, capturing the spirit of movement before it solidifies into trend.
                </p>
              </div>
              
              <div className="mt-12">
                <div className="bg-brand-black text-white p-8 aspect-square flex flex-col justify-between group cursor-pointer overflow-hidden relative">
                  <div className="absolute inset-0 bg-brand-red translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                  <div className="relative z-10">
                    <p className="text-xs tracking-widest uppercase mb-4 opacity-70">Current Issue</p>
                    <h3 className="text-4xl font-display font-bold leading-none tracking-tighter">THE RADIANT<br/>VOID</h3>
                  </div>
                  <div className="relative z-10 flex justify-between items-end">
                    <span className="text-xs uppercase tracking-widest">No. 01</span>
                    {orderStatus === 'success' ? (
                      <span className="text-[10px] uppercase font-bold text-brand-red animate-pulse">Request Archived</span>
                    ) : (
                      <button 
                        onClick={() => requestPrint('ISSUE-01', 'THE RADIANT VOID')}
                        disabled={orderStatus === 'loading'}
                        className="border border-white px-4 py-2 text-[10px] tracking-widest uppercase hover:bg-white hover:text-brand-black transition-colors"
                      >
                        {orderStatus === 'loading' ? 'Encrypting...' : 'Order Print'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-brand-black py-8 mt-24 flex justify-between uppercase text-[10px] md:text-xs tracking-[0.3em] font-bold">
            <span className="opacity-50">© 2026 IYUUN MAGAZINE</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const ArticleCard = ({ story, idx, onClick }: { story: Story, idx: number, onClick: () => void, key?: React.Key }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.article 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, delay: idx * 0.1 }}
      className={`group cursor-pointer flex flex-col ${story.aspect === 'landscape' ? 'md:col-span-2' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div className="relative overflow-hidden border border-brand-black bg-gray-100 w-full mb-6 group-hover:border-brand-red transition-colors duration-500 shadow-sm">
        <div className={`w-full relative overflow-hidden ${
          story.aspect === 'portrait' ? 'aspect-[3/4.5]' : 
          story.aspect === 'landscape' ? 'aspect-[16/9]' : 'aspect-square'
        }`}>
          {story.type === 'video' ? (
            <div className="absolute inset-0 bg-black">
              <video 
                src={story.video} 
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 opacity-60 group-hover:opacity-100"
                autoPlay 
                muted 
                loop 
                playsInline
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                 <div className="w-16 h-16 rounded-full border border-white flex items-center justify-center backdrop-blur-sm">
                    <Play className="text-white fill-white ml-1" size={24} />
                 </div>
              </div>
            </div>
          ) : (
            <img 
              src={story.image} 
              alt={story.title}
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover filter grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
            />
          )}
          
          <div className="absolute top-6 left-6 bg-white px-3 py-1.5 text-[9px] font-bold tracking-[0.3em] uppercase border border-brand-black shadow-sm z-10">
            {story.type} // {story.id}
          </div>
          
          {story.type === 'video' && (
            <div className="absolute bottom-6 left-6 z-10">
               <span className="text-[10px] text-white font-bold uppercase tracking-widest bg-brand-red px-2 py-0.5">Live View</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex flex-col gap-3 relative pl-6 border-l-2 border-transparent group-hover:border-brand-red transition-colors duration-500">
        <div className="flex justify-between items-center">
          <p className="text-[10px] md:text-xs uppercase tracking-[0.2em] font-bold text-gray-500">{story.category}</p>
          <span className="text-[9px] font-mono opacity-40">{story.date}</span>
        </div>
        <h3 className="font-display text-2xl md:text-4xl font-semibold tracking-tighter uppercase leading-[0.95] group-hover:text-brand-red transition-colors duration-300">
          {story.title}
        </h3>
        <p className="text-sm md:text-base leading-relaxed text-gray-600 mt-2 line-clamp-2 italic font-light">
          "{story.excerpt}"
        </p>
        
        <div className="flex items-center gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 transition-transform">
           <span className="text-[10px] uppercase tracking-widest font-bold">Read Entry</span>
           <ArrowRight size={14} className="text-brand-red" />
        </div>
      </div>
    </motion.article>
  );
};

// --- PAGES ---

const ManifestoPage = () => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="px-4 md:px-8 py-20 bg-brand-black text-white min-h-screen"
    >
      <div className="max-w-4xl mx-auto">
        <h1 className="font-display text-6xl md:text-[10rem] font-bold tracking-tighter uppercase leading-[0.85] mb-20">
          WE ARE <br/>THE <span className="text-brand-red italic">SEARCH</span>.
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
          <div className="space-y-12">
            <section>
              <h4 className="text-xs uppercase tracking-widest text-brand-red mb-6 border-b border-white/20 pb-2">01 — UNTERIORITY</h4>
              <p className="text-2xl font-light leading-snug">
                We reject the curated. We reject the algorithmic. We look for the raw energy that exists before it becomes a "trend."
              </p>
            </section>
            
            <section>
              <h4 className="text-xs uppercase tracking-widest text-brand-red mb-6 border-b border-white/20 pb-2">02 — THE GRID</h4>
              <p className="text-xl font-light leading-relaxed opacity-80">
                Structure is essential. We use the Swiss system to organize the chaos of contemporary African expression. Order serves the art, not the other way around.
              </p>
            </section>
          </div>
          
          <div className="space-y-12">
            <section>
              <h4 className="text-xs uppercase tracking-widest text-brand-red mb-6 border-b border-white/20 pb-2">03 — AUTHENTICITY</h4>
              <p className="text-xl font-light leading-relaxed opacity-80">
                Authenticity isn't a buzzword; it's a documentary practice. We photograph life as it happens, in the streets of Kinshasa, Lagos, and Dakar. No filters, no fake horizons.
              </p>
            </section>
            
            <div className="aspect-square border-2 border-white flex items-center justify-center p-12 text-center group cursor-pointer hover:bg-white hover:text-brand-black transition-all">
              <p className="text-4xl font-display font-bold uppercase tracking-tighter">Join the<br/>Movement</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const ArchivePage = ({ stories, onSelect }: { stories: Story[], onSelect: (s: Story) => void }) => {
  return (
    <div className="px-4 md:px-8 py-20">
      <div className="mb-20">
        <p className="text-xs uppercase tracking-[0.4em] mb-4">Complete Archives</p>
        <h1 className="font-display text-5xl md:text-8xl font-bold tracking-tighter uppercase">Chronicles</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-24">
        {stories.map((story, idx) => (
          <ArticleCard 
            key={story.id} 
            story={story} 
            idx={idx} 
            onClick={() => onSelect(story)}
          />
        ))}
      </div>
    </div>
  );
};

const AdminDashboard = ({ 
  stories, setStories, user, ads, setAds, categories, setCategories, team, setTeam, orderList, setOrderList
}: { 
  stories: Story[], setStories: React.Dispatch<React.SetStateAction<Story[]>>, user: FirebaseUser | null,
  ads: Ad[], setAds: React.Dispatch<React.SetStateAction<Ad[]>>,
  categories: Category[], setCategories: React.Dispatch<React.SetStateAction<Category[]>>,
  team: any[], setTeam: React.Dispatch<React.SetStateAction<any[]>>,
  orderList: Order[], setOrderList: React.Dispatch<React.SetStateAction<Order[]>>
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'stories' | 'ads' | 'team' | 'categories' | 'orders'>('overview');
  const [isNavOpen, setIsNavOpen] = useState(false);

  // Story Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isSubmittingStory, setIsSubmittingStory] = useState(false);
  const [storyErrorMsg, setStoryErrorMsg] = useState('');

  // Category Form State
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);

  // Ad Form State
  const [newAdPartner, setNewAdPartner] = useState('');
  const [newAdHeadline, setNewAdHeadline] = useState('');
  const [newAdCopy, setNewAdCopy] = useState('');
  const [newAdLink, setNewAdLink] = useState('');
  const [newAdImageUrl, setNewAdImageUrl] = useState('');
  const [newAdVideoUrl, setNewAdVideoUrl] = useState('');
  const [adImageFile, setAdImageFile] = useState<File | null>(null);
  const [adVideoFile, setAdVideoFile] = useState<File | null>(null);
  const [isSubmittingAd, setIsSubmittingAd] = useState(false);
  
  // Team Fetch Logic
  const [isFetchingTeam, setIsFetchingTeam] = useState(false);
  const [newEditorEmail, setNewEditorEmail] = useState('');
  const [newEditorRole, setNewEditorRole] = useState('Editor');

  // Orders State
  const [isFetchingOrders, setIsFetchingOrders] = useState(false);

  const isSuperAdmin = isSuperAdminEmail(user?.email);

  useEffect(() => {
    if (activeTab === 'team') {
      fetchTeam();
    }
    if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [activeTab]);

  const fetchTeam = async () => {
    setIsFetchingTeam(true);
    try {
      const q = query(collection(db, 'users'), orderBy('joined', 'desc'));
      const snap = await getDocs(q);
      const members: any[] = [];
      snap.forEach(d => {
        members.push({ id: d.id, ...d.data() });
      });
      setTeam(members);
    } catch(err) {
      console.error(err);
    } finally {
      setIsFetchingTeam(false);
    }
  };

  const fetchOrders = async () => {
    setIsFetchingOrders(true);
    try {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const fetched: Order[] = [];
      snap.forEach(d => fetched.push({ id: d.id, ...d.data() } as Order));
      setOrderList(fetched);
    } catch(err) { console.error(err); }
    finally { setIsFetchingOrders(false); }
  };

  const navTo = (tab: any) => { setActiveTab(tab); setIsNavOpen(false); };

  const addStory = async () => {
    if (!newTitle || !newCategory || !newContent) return;
    setIsSubmittingStory(true);
    setStoryErrorMsg('');
    try {
      const generatedId = `0${stories.length + 1}-${Date.now().toString().slice(-4)}`;
      
      let finalImageUrl = newImageUrl || 'https://picsum.photos/seed/' + generatedId + '/800/800?grayscale';
      let finalVideoUrl = newVideoUrl || undefined;

      // Upload Image if present
      if (imageFile) {
        const imageRef = ref(storage, `stories/${generatedId}/image_${imageFile.name}`);
        await uploadBytes(imageRef, imageFile);
        finalImageUrl = await getDownloadURL(imageRef);
      }

      // Upload Video if present
      if (videoFile) {
        const videoRef = ref(storage, `stories/${generatedId}/video_${videoFile.name}`);
        await uploadBytes(videoRef, videoFile);
        finalVideoUrl = await getDownloadURL(videoRef);
      }

      const newStory: Story = {
        id: generatedId,
        category: newCategory.toUpperCase() || 'UNCATEGORIZED',
        title: newTitle.toUpperCase(),
        excerpt: newContent.slice(0, 100) + '...',
        content: newContent,
        image: finalImageUrl,
        video: finalVideoUrl,
        aspect: 'square',
        type: finalVideoUrl ? 'video' : 'image',
        date: new Date().toLocaleDateString('en-CA').replace(/-/g, '.'),
        ownerId: user?.uid || 'anonymous',
        createdAt: Date.now()
      };
      
      await setDoc(doc(db, 'stories', generatedId), newStory);
      setStories([newStory, ...stories]);
      setNewTitle('');
      setNewCategory('');
      setNewContent('');
      setNewImageUrl('');
      setNewVideoUrl('');
      setImageFile(null);
      setVideoFile(null);
    } catch (error: any) {
      console.error(error);
      setStoryErrorMsg(error.message || 'Operation failed.');
    } finally {
      setIsSubmittingStory(false);
    }
  };

  const removeStory = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'stories', id));
      setStories(stories.filter(item => item.id !== id));
    } catch (error: any) {
       setStoryErrorMsg(error.message || 'Failed to delete');
    }
  };

  const addCategory = async () => {
    if(!newCategoryInput) return;
    setIsSubmittingCategory(true);
    try {
      const generatedId = newCategoryInput.replace(/\s+/g, '-').toLowerCase() + '-' + Date.now().toString().slice(-4);
      const newCat: Category = {
        id: generatedId,
        name: newCategoryInput.toUpperCase(),
      };
      await setDoc(doc(db, 'categories', generatedId), newCat);
      setCategories([...categories, newCat]);
      setNewCategoryInput('');
    } catch(err) {
      console.error(err);
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const removeCategory = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'categories', id));
      setCategories(categories.filter(c => c.id !== id));
    } catch(err) { console.error(err); }
  };

  const addAd = async () => {
    if(!newAdPartner || !newAdHeadline || !newAdCopy || !newAdLink) return;
    setIsSubmittingAd(true);
    try {
      const adId = 'ad-' + Date.now().toString().slice(-6);

      let finalImageUrl = newAdImageUrl || undefined;
      let finalVideoUrl = newAdVideoUrl || undefined;

      if (adImageFile) {
        const adImageRef = ref(storage, `ads/${adId}/image_${adImageFile.name}`);
        await uploadBytes(adImageRef, adImageFile);
        finalImageUrl = await getDownloadURL(adImageRef);
      }

      if (adVideoFile) {
        const adVideoRef = ref(storage, `ads/${adId}/video_${adVideoFile.name}`);
        await uploadBytes(adVideoRef, adVideoFile);
        finalVideoUrl = await getDownloadURL(adVideoRef);
      }

      const newAd: Ad = {
        id: adId,
        partner: newAdPartner.toUpperCase(),
        headline: newAdHeadline.toUpperCase(),
        copy: newAdCopy,
        image: finalImageUrl,
        video: finalVideoUrl,
        link: newAdLink,
        type: finalVideoUrl ? 'video' : 'image',
        isActive: true,
        createdAt: Date.now(),
        clicks: 0
      };
      await setDoc(doc(db, 'ads', adId), newAd);
      setAds([newAd, ...ads]);
      setNewAdPartner('');
      setNewAdHeadline('');
      setNewAdCopy('');
      setNewAdLink('');
      setNewAdImageUrl('');
      setNewAdVideoUrl('');
      setAdImageFile(null);
      setAdVideoFile(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingAd(false);
    }
  };

  const toggleAd = async (ad: Ad) => {
    try {
      const updatedAd = { ...ad, isActive: !ad.isActive };
      await setDoc(doc(db, 'ads', ad.id), updatedAd);
      setAds(ads.map(a => a.id === ad.id ? updatedAd : a));
    } catch(err) {
      console.error(err);
    }
  };

  const updateUserRole = async (memberId: string, newRole: string) => {
    if (!isSuperAdmin) return;
    try {
      await updateDoc(doc(db, 'users', memberId), { role: newRole.toLowerCase() });
      setTeam(team.map(m => m.id === memberId ? { ...m, role: newRole } : m));
    } catch(err) { console.error(err); }
  };

  const banUser = async (memberId: string, currentStatus: string) => {
    if (!isSuperAdmin) return;
    try {
      const newStatus = currentStatus === 'banned' ? 'active' : 'banned';
      await updateDoc(doc(db, 'users', memberId), { status: newStatus });
      setTeam(team.map(m => m.id === memberId ? { ...m, status: newStatus } : m));
    } catch(err) { console.error(err); }
  };

  const removeUser = async (memberId: string) => {
    if (!isSuperAdmin) return;
    try {
      await deleteDoc(doc(db, 'users', memberId));
      setTeam(team.filter(m => m.id !== memberId));
    } catch(err) { console.error(err); }
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    if (!isSuperAdmin) return;
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
      setOrderList(orderList.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch(err) { console.error(err); }
  };

  const addEditor = async () => {
    if(!newEditorEmail || !isSuperAdmin) return;
    // For now we just invite via email by creating a placeholder user record
    const id = `pending-${Date.now()}`;
    const newMember = { 
      email: newEditorEmail, 
      role: newEditorRole.toLowerCase(), 
      joined: new Date().toLocaleDateString('en-CA').replace(/-/g, '.'),
      status: 'active'
    };
    await setDoc(doc(db, 'users', id), newMember);
    setTeam([{ id, ...newMember }, ...team]);
    setNewEditorEmail('');
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-sans flex flex-col md:flex-row border-t border-brand-black/10">
      
      {/* Mobile Nav TopBar */}
      <div className="md:hidden bg-brand-black text-white p-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
           <button onClick={() => setIsNavOpen(!isNavOpen)}><Menu size={24} /></button>
           <Shield size={20} className="text-brand-red" />
           <span className="font-bold text-xs uppercase tracking-widest">Admin OS</span>
        </div>
      </div>

      {/* Internal Dashboard Nav */}
      <AnimatePresence>
        {(isNavOpen || window.innerWidth >= 768) && (
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            className="fixed md:sticky top-0 left-0 w-64 h-full bg-white border-r border-brand-black/5 flex flex-col p-6 gap-8 z-50 overflow-y-auto shrink-0 shadow-xl md:shadow-none"
          >
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-black flex items-center justify-center text-white font-bold">I</div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-tight">Admin Console</h2>
                  <p className="text-[10px] opacity-40 uppercase">v1.2.0-STABLE</p>
                </div>
              </div>
              <button className="md:hidden opacity-40 hover:opacity-100" onClick={() => setIsNavOpen(false)}><X size={20}/></button>
            </div>

            <nav className="space-y-1">
              {[
                { id: 'overview', icon: Activity, label: 'Overview' },
                { id: 'stories', icon: Upload, label: 'Editorials' },
                { id: 'ads', icon: Megaphone, label: 'Ad Campaigns' },
                { id: 'categories', icon: Search, label: 'Taxonomy' },
                { id: 'team', icon: Users, label: 'Manage Team' },
                { id: 'media', icon: Eye, label: 'Media Library' },
                { id: 'orders', icon: Save, label: 'Print Orders' }
              ].map(item => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button 
                    key={item.id}
                    onClick={() => navTo(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest rounded-md transition-all ${
                      active 
                        ? 'bg-brand-black text-white shadow-lg' 
                        : 'text-gray-500 hover:bg-brand-gray/30 hover:text-brand-black'
                    }`}
                  >
                    <Icon size={14} strokeWidth={active ? 2.5 : 2} />
                    {item.label}
                  </button>
                )
              })}
            </nav>

            <div className="mt-auto pt-8 border-t border-brand-black/5">
               <div className="p-4 bg-brand-red/5 rounded-lg border border-brand-red/10">
                 <p className="text-[10px] font-bold text-brand-red uppercase mb-1">System Health</p>
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                   <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Operational</span>
                 </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 p-6 md:p-12 overflow-y-auto no-scrollbar pb-32">
         {activeTab === 'overview' && (
           <div className="max-w-6xl mx-auto space-y-12">
             <div className="flex justify-between items-end">
               <div>
                  <h1 className="text-4xl font-display font-bold uppercase tracking-tighter">Command // Center</h1>
                  <p className="text-sm opacity-50 font-light mt-1 uppercase tracking-widest text-gray-500">Real-time engagement telemetry</p>
               </div>
               <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-bold uppercase text-gray-400">Environment</p>
                  <p className="text-xs font-mono font-bold text-brand-red uppercase">Production Node — AIS-01</p>
               </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Archives', value: stories.length, delta: 'Total Feed', icon: Upload },
                  { label: 'Print Backlog', value: orderList.filter(o => o.status === 'pending').length, delta: `${orderList.length} Total`, icon: Save },
                  { label: 'Cloud Personnel', value: team.length, delta: 'Verified Nodes', icon: Users },
                  { label: 'Network Points', value: categories.length, delta: 'Active Nodes', icon: Activity }
                ].map((stat, i) => (
                  <div key={i} className="bg-white rounded-xl border border-brand-black/5 p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-brand-gray/20 rounded-lg"><stat.icon size={18} className="text-brand-red" /></div>
                      <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest">{stat.delta}</p>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{stat.label}</p>
                    <p className="text-3xl font-display font-bold tracking-tighter">{stat.value}</p>
                  </div>
                ))}
             </div>
             
             <div className="bg-white rounded-2xl border border-brand-black/5 p-8 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                   <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Circulation History</h3>
                   <div className="flex gap-2">
                      {['7D', '30D', '1Y'].map(t => <button key={t} className={`px-3 py-1 text-[10px] font-black rounded-md ${t === '30D' ? 'bg-brand-black text-white' : 'bg-brand-gray/50 text-gray-400'}`}>{t}</button>)}
                   </div>
                </div>
                <div className="flex items-end gap-3 h-48 w-full">
                  {[30, 45, 60, 40, 80, 55, 90, 70, 85, 65, 100, 75, 40, 80, 55, 90, 70, 85, 65, 100].map((h, i) => (
                    <div key={i} className="flex-1 bg-brand-gray/30 rounded-t-sm relative group cursor-pointer overflow-hidden">
                       <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: i * 0.02, duration: 1 }}
                        className="w-full bg-brand-black absolute bottom-0 group-hover:bg-brand-red transition-colors"
                       ></motion.div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-4 text-[10px] font-bold uppercase text-gray-300 tracking-widest">
                   <span>Temporal Node 01</span><span>Live Feed Delta</span>
                </div>
             </div>
           </div>
         )}

         {activeTab === 'stories' && (
           <div className="max-w-5xl mx-auto space-y-12">
              <div className="flex justify-between items-center">
                 <h2 className="text-2xl font-bold uppercase tracking-tighter">Editorial Pipeline</h2>
                 <button className="bg-brand-black text-white px-6 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-brand-red transition-all">New Entry</button>
              </div>

              {storyErrorMsg && <div className="bg-brand-red/10 border border-brand-red text-brand-red p-4 rounded-lg text-[10px] font-bold uppercase tracking-widest">ERROR: {storyErrorMsg}</div>}
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-6">
                   <div className="bg-white p-8 rounded-2xl border border-brand-black/5 shadow-sm space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase opacity-40">Headline</label>
                          <input type="text" placeholder="Title..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-full bg-brand-gray/20 border border-brand-black/5 p-3 rounded-lg outline-none focus:border-brand-red transition-all uppercase font-medium text-sm" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase opacity-40">Taxonomy Category</label>
                          {categories.length > 0 ? (
                            <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full bg-brand-gray/20 border border-brand-black/5 p-3 rounded-lg outline-none focus:border-brand-red transition-all uppercase font-bold text-xs cursor-pointer">
                              <option value="" disabled>SELECT...</option>
                              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                          ) : (
                            <input type="text" placeholder="CATEGORY" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full bg-brand-gray/20 border border-brand-black/5 p-3 rounded-lg outline-none focus:border-brand-red transition-all uppercase font-medium text-sm" />
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase opacity-40">Visual Payload (Image Upload)</label>
                          <div className="relative group">
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={(e) => setImageFile(e.target.files?.[0] || null)} 
                              className="hidden" 
                              id="image-upload"
                            />
                            <label 
                              htmlFor="image-upload" 
                              className="w-full bg-brand-gray/20 border border-brand-black/5 p-3 rounded-lg flex items-center justify-between cursor-pointer group-hover:border-brand-red transition-all"
                            >
                              <span className="text-[10px] uppercase font-bold truncate">
                                {imageFile ? imageFile.name : 'Select Image...'}
                              </span>
                              <Upload size={14} className="opacity-40" />
                            </label>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase opacity-40">Motion Payload (Video Upload)</label>
                          <div className="relative group">
                            <input 
                              type="file" 
                              accept="video/*" 
                              onChange={(e) => setVideoFile(e.target.files?.[0] || null)} 
                              className="hidden" 
                              id="video-upload"
                            />
                            <label 
                              htmlFor="video-upload" 
                              className="w-full bg-brand-gray/20 border border-brand-black/5 p-3 rounded-lg flex items-center justify-between cursor-pointer group-hover:border-brand-red transition-all"
                            >
                              <span className="text-[10px] uppercase font-bold truncate">
                                {videoFile ? videoFile.name : 'Select Video...'}
                              </span>
                              <Upload size={14} className="opacity-40" />
                            </label>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] opacity-40 uppercase">Or provide external URLs if preferred (uploads override URLs)</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input type="url" placeholder="IMAGE URL (OPTIONAL)" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} className="w-full bg-brand-gray/20 border border-brand-black/5 p-3 rounded-lg outline-none text-[10px]" />
                          <input type="url" placeholder="VIDEO URL (OPTIONAL)" value={newVideoUrl} onChange={(e) => setNewVideoUrl(e.target.value)} className="w-full bg-brand-gray/20 border border-brand-black/5 p-3 rounded-lg outline-none text-[10px]" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase opacity-40">Payload Body</label>
                        <textarea placeholder="Text..." value={newContent} onChange={(e) => setNewContent(e.target.value)} className="w-full bg-brand-gray/20 border border-brand-black/5 p-4 rounded-lg outline-none focus:border-brand-red transition-all min-h-[300px] text-sm" />
                      </div>
                      <button onClick={addStory} disabled={!newTitle || !newCategory || !newContent || isSubmittingStory} className="w-full bg-brand-black text-white p-4 rounded-xl hover:bg-brand-red transition-colors flex justify-center gap-2 font-bold uppercase tracking-widest disabled:opacity-30">
                        {isSubmittingStory ? 'Transmitting...' : 'Commit to Global Feed'}
                      </button>
                   </div>
                </div>

                <div className="space-y-6">
                   <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Database Index</h3>
                   <div className="space-y-3">
                      {stories.map(s => (
                        <div key={s.id} className="bg-white p-4 rounded-xl border border-brand-black/5 flex justify-between items-center group shadow-sm hover:border-brand-red transition-colors">
                           <div className="truncate pr-4">
                             <p className="text-[10px] font-bold text-brand-red uppercase tracking-widest">{s.id}</p>
                             <h4 className="text-xs font-bold uppercase truncate">{s.title}</h4>
                           </div>
                           <button onClick={() => removeStory(s.id)} className="text-gray-300 hover:text-brand-red transition-colors"><Trash2 size={16} /></button>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
           </div>
         )}

         {activeTab === 'ads' && (
           <div className="max-w-5xl mx-auto space-y-12">
              <h2 className="text-2xl font-bold uppercase tracking-tighter">Campaign Distribution</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">Market engagement telemetry</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                 <div className="md:col-span-1">
                   <div className="bg-white p-6 rounded-2xl border border-brand-black/5 shadow-sm space-y-4 sticky top-12">
                      <h3 className="text-xs font-bold uppercase tracking-widest mb-4">Launch New Campaign</h3>
                      <input type="text" placeholder="Partner" value={newAdPartner} onChange={(e) => setNewAdPartner(e.target.value)} className="w-full bg-brand-gray/20 border border-brand-black/5 p-3 rounded-lg outline-none uppercase text-[11px]" />
                      <input type="text" placeholder="Campaign Headline" value={newAdHeadline} onChange={(e) => setNewAdHeadline(e.target.value)} className="w-full bg-brand-gray/20 border border-brand-black/5 p-3 rounded-lg outline-none uppercase text-[11px]" />
                       <input type="url" placeholder="Destination Link" value={newAdLink} onChange={(e) => setNewAdLink(e.target.value)} className="w-full bg-brand-gray/20 border border-brand-black/5 p-3 rounded-lg outline-none text-[11px]" />
                       
                       <div className="grid grid-cols-2 gap-2">
                         <div className="space-y-1">
                           <label className="text-[8px] font-bold uppercase opacity-40">Creative (Image)</label>
                           <label className="w-full bg-brand-gray/20 border border-brand-black/5 p-2 rounded-lg flex items-center justify-between cursor-pointer text-[9px] uppercase font-bold overflow-hidden">
                             <span className="truncate">{adImageFile ? adImageFile.name : 'SELECT...'}</span>
                             <input type="file" accept="image/*" onChange={(e) => setAdImageFile(e.target.files?.[0] || null)} className="hidden" />
                             <Upload size={10} />
                           </label>
                         </div>
                         <div className="space-y-1">
                           <label className="text-[8px] font-bold uppercase opacity-40">Creative (Video)</label>
                           <label className="w-full bg-brand-gray/20 border border-brand-black/5 p-2 rounded-lg flex items-center justify-between cursor-pointer text-[9px] uppercase font-bold overflow-hidden">
                             <span className="truncate">{adVideoFile ? adVideoFile.name : 'SELECT...'}</span>
                             <input type="file" accept="video/*" onChange={(e) => setAdVideoFile(e.target.files?.[0] || null)} className="hidden" />
                             <Upload size={10} />
                           </label>
                         </div>
                       </div>
                      <textarea placeholder="Campaign Narrative..." value={newAdCopy} onChange={(e) => setNewAdCopy(e.target.value)} className="w-full bg-brand-gray/20 border border-brand-black/5 p-4 rounded-lg outline-none min-h-[120px] text-[11px]" />
                      <button onClick={addAd} disabled={!newAdPartner || !newAdHeadline || !newAdCopy || isSubmittingAd} className="w-full bg-brand-red text-white p-3 rounded-lg hover:bg-brand-black transition-colors font-bold uppercase tracking-widest text-[10px] disabled:opacity-30">
                        {isSubmittingAd ? 'Transmitting...' : 'Deploy Campaign'}
                      </button>
                   </div>
                 </div>

                 <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {ads.map(ad => (
                      <div key={ad.id} className={`p-6 rounded-2xl border transition-all ${ad.isActive ? 'bg-white border-brand-black shadow-md' : 'bg-gray-100 border-transparent opacity-60'}`}>
                        <div className="flex justify-between items-start mb-4">
                           <span className="text-[10px] font-bold uppercase text-brand-red tracking-widest">{ad.partner}</span>
                           <button onClick={() => toggleAd(ad)} className={`text-[9px] uppercase font-bold px-3 py-1 rounded-full border transition-colors ${ad.isActive ? 'border-brand-black bg-brand-black text-white' : 'border-gray-300 text-gray-500 hover:border-brand-black hover:text-brand-black'}`}>
                             {ad.isActive ? 'Active' : 'Offline'}
                           </button>
                        </div>
                        <h4 className="font-display text-xl font-bold uppercase leading-none mb-4">{ad.headline}</h4>
                        <p className="text-[11px] text-gray-500 leading-relaxed italic line-clamp-3">"{ad.copy}"</p>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
         )}

         {activeTab === 'categories' && (
           <div className="max-w-4xl mx-auto space-y-12">
              <h2 className="text-2xl font-bold uppercase tracking-tighter">Taxonomy // Semantic Index</h2>
              
              <div className="bg-white p-8 rounded-2xl border border-brand-black/5 shadow-sm space-y-6">
                <div className="flex gap-4">
                  <input type="text" placeholder="Global Identifier (e.g. Neo-Lagos)" value={newCategoryInput} onChange={(e) => setNewCategoryInput(e.target.value)} className="w-full bg-brand-gray/20 border border-brand-black/5 p-4 rounded-xl outline-none uppercase font-bold text-sm focus:border-brand-red" />
                  <button onClick={addCategory} disabled={!newCategoryInput || isSubmittingCategory} className="bg-brand-black text-white px-8 rounded-xl uppercase font-bold tracking-widest text-[11px] hover:bg-brand-red transition-all transform active:scale-95 disabled:opacity-30">Add Node</button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-brand-black/5">
                  {categories.map(cat => (
                    <div key={cat.id} className="border border-brand-black/5 bg-brand-gray/10 p-4 rounded-xl flex justify-between items-center group hover:bg-white hover:border-brand-red/30 hover:shadow-sm transition-all animate-in slide-in-from-top-2 duration-300">
                       <span className="font-bold text-[10px] uppercase cursor-default truncate">{cat.name}</span>
                       <button onClick={() => removeCategory(cat.id)} className="text-gray-300 hover:text-brand-red opacity-0 group-hover:opacity-100 transition-all">
                         <X size={14} />
                       </button>
                    </div>
                  ))}
                </div>
              </div>
           </div>
         )}

         {activeTab === 'team' && (
           <div className="max-w-5xl mx-auto space-y-12">
              <div className="flex justify-between items-center">
                 <h2 className="text-2xl font-bold uppercase tracking-tighter">Personnel // Permissions</h2>
                 {isSuperAdmin && <p className="text-[10px] font-bold text-brand-red uppercase animate-pulse">Super Admin Privileges Active</p>}
              </div>
              
              {isSuperAdmin && (
                <div className="bg-white p-8 rounded-2xl border border-brand-black/5 shadow-sm space-y-8">
                   <div className="flex flex-col md:flex-row gap-6 items-end">
                     <div className="flex-1 w-full space-y-1">
                       <label className="text-[10px] font-bold uppercase opacity-30 px-1">Network Identity (Email)</label>
                       <input type="email" placeholder="identity@iyuun.com" value={newEditorEmail} onChange={(e) => setNewEditorEmail(e.target.value)} className="w-full bg-brand-gray/20 border border-brand-black/5 p-3 rounded-lg outline-none text-sm" />
                     </div>
                     <div className="flex-1 w-full space-y-1">
                       <label className="text-[10px] font-bold uppercase opacity-30 px-1">Clearance Level</label>
                       <select value={newEditorRole} onChange={(e) => setNewEditorRole(e.target.value)} className="w-full bg-brand-gray/20 border border-brand-black/5 p-3 rounded-lg outline-none uppercase font-bold text-xs cursor-pointer">
                         <option value="Editor">Editor</option>
                         <option value="Admin">Admin</option>
                       </select>
                     </div>
                     <button onClick={addEditor} disabled={!newEditorEmail} className="w-full md:w-auto bg-brand-black text-white py-3 px-12 rounded-lg hover:bg-brand-red transition-all font-bold uppercase tracking-widest text-xs disabled:opacity-30">
                        Provision
                     </button>
                   </div>
                </div>
              )}

              <div className="bg-white p-8 rounded-2xl border border-brand-black/5 shadow-sm">
                 <div className="overflow-hidden rounded-2xl border border-brand-black/5">
                   <table className="w-full border-collapse bg-white">
                     <thead>
                       <tr className="bg-brand-black text-white text-left text-[10px] uppercase font-bold tracking-[0.2em]"><th className="p-4">Identity</th><th className="p-4 text-center">Clearance</th><th className="p-4 text-center">Status</th><th className="p-4 text-right">Actions</th></tr>
                     </thead>
                     <tbody className="text-xs">
                       {isFetchingTeam ? (
                         <tr><td colSpan={4} className="p-12 text-center text-[10px] uppercase font-mono opacity-40">Connecting to node...</td></tr>
                       ) : team.map(m => (
                         <tr key={m.id} className={`border-b border-brand-black/5 last:border-0 hover:bg-brand-gray/20 transition-colors ${m.status === 'banned' ? 'opacity-40 italic' : ''}`}>
                           <td className="p-4">
                             <p className="font-bold opacity-70">{m.email}</p>
                             <p className="text-[9px] opacity-30 uppercase">Since {m.joined}</p>
                           </td>
                           <td className="p-4 text-center">
                             {isSuperAdmin && m.email !== user?.email ? (
                               <select 
                                 value={m.role} 
                                 onChange={(e) => updateUserRole(m.id, e.target.value)}
                                 className="bg-transparent border border-gray-200 rounded px-2 py-1 text-[9px] font-bold uppercase outline-none focus:border-brand-red"
                               >
                                 <option value="viewer">Viewer</option>
                                 <option value="editor">Editor</option>
                                 <option value="admin">Admin</option>
                               </select>
                             ) : (
                               <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase ${m.role === 'admin' ? 'bg-brand-red text-white' : 'bg-brand-black text-white'}`}>{m.role}</span>
                             )}
                           </td>
                           <td className="p-4 text-center">
                             <span className={`text-[9px] font-bold uppercase ${m.status === 'banned' ? 'text-brand-red' : 'text-green-500'}`}>{m.status || 'active'}</span>
                           </td>
                           <td className="p-4 text-right">
                             {isSuperAdmin && m.email !== user?.email && (
                               <div className="flex justify-end gap-2">
                                 <button 
                                   title={m.status === 'banned' ? "Restore Access" : "Ban User"}
                                   className={`p-1 transition-colors ${m.status === 'banned' ? 'text-green-500 hover:text-green-600' : 'text-gray-300 hover:text-brand-red'}`} 
                                   onClick={() => banUser(m.id, m.status || 'active')}
                                 >
                                   <Shield size={16} />
                                 </button>
                                 <button className="text-gray-300 hover:text-brand-red p-1 transition-colors" onClick={() => removeUser(m.id)}><Trash2 size={16} /></button>
                               </div>
                             )}
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
              </div>
           </div>
         )}

         {activeTab === 'orders' && (
           <div className="max-w-5xl mx-auto space-y-12">
              <h2 className="text-2xl font-bold uppercase tracking-tighter">Fulfillment Queue</h2>
              
              <div className="bg-white p-8 rounded-2xl border border-brand-black/5 shadow-sm">
                <div className="overflow-hidden rounded-2xl border border-brand-black/5">
                  <table className="w-full border-collapse bg-white">
                    <thead>
                      <tr className="bg-brand-black text-white text-left text-[10px] uppercase font-bold tracking-[0.2em]">
                        <th className="p-4">Customer</th>
                        <th className="p-4">Article Target</th>
                        <th className="p-4 text-center">Shipment State</th>
                        <th className="p-4 text-right">Provision</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      {isFetchingOrders ? (
                        <tr><td colSpan={4} className="p-12 text-center text-[10px] uppercase font-mono opacity-40">Fetching Logistics...</td></tr>
                      ) : orderList.length === 0 ? (
                        <tr><td colSpan={4} className="p-12 text-center text-[10px] uppercase font-mono opacity-40">Queue Empty</td></tr>
                      ) : orderList.map(order => (
                        <tr key={order.id} className="border-b border-brand-black/5 last:border-0 hover:bg-brand-gray/20 transition-colors">
                          <td className="p-4">
                            <p className="font-bold opacity-70">{order.userEmail}</p>
                            <p className="text-[9px] opacity-30 uppercase">{new Date(order.createdAt).toLocaleDateString()}</p>
                          </td>
                          <td className="p-4">
                            <p className="font-bold uppercase tracking-tight">{order.storyTitle}</p>
                            <p className="text-[9px] opacity-40 uppercase">ID: {order.storyId}</p>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase ${
                              order.status === 'pending' ? 'bg-yellow-500 text-white' : 
                              order.status === 'shipped' ? 'bg-green-500 text-white' : 'bg-brand-red text-white'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                             {isSuperAdmin && (
                               <div className="flex justify-end gap-2">
                                  <button onClick={() => updateOrderStatus(order.id, 'shipped')} className="p-2 border border-brand-black hover:bg-brand-black hover:text-white transition-colors"><Activity size={12}/></button>
                                  <button onClick={() => updateOrderStatus(order.id, 'cancelled')} className="p-2 border border-brand-black hover:bg-brand-red hover:text-white transition-colors"><Trash2 size={12}/></button>
                               </div>
                             )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
           </div>
         )}

         {activeTab === 'media' && (
            <div className="max-w-6xl mx-auto space-y-12">
               <h2 className="text-2xl font-bold uppercase tracking-tighter">Digital Archive // Storage Explorer</h2>
               
               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                 {stories.filter(s => s.image || s.video).map(story => (
                   <div key={story.id} className="aspect-square bg-white border border-brand-black/5 rounded-lg overflow-hidden group relative shadow-sm hover:border-brand-red transition-all">
                     {story.type === 'video' ? (
                       <video src={story.video} className="w-full h-full object-cover grayscale group-hover:grayscale-0" muted loop onMouseEnter={e => e.currentTarget.play()} onMouseLeave={e => e.currentTarget.pause()} />
                     ) : (
                       <img src={story.image} className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-transform" />
                     )}
                     <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                        <p className="text-[8px] text-white font-bold uppercase truncate">{story.title}</p>
                        <p className="text-[7px] text-brand-red font-bold uppercase">{story.type}</p>
                     </div>
                   </div>
                 ))}
                 
                 {ads.filter(a => a.image || a.video).map(ad => (
                   <div key={ad.id} className="aspect-square bg-white border border-brand-black/5 rounded-lg overflow-hidden group relative shadow-sm hover:border-brand-red transition-all">
                     {ad.type === 'video' ? (
                       <video src={ad.video} className="w-full h-full object-cover grayscale group-hover:grayscale-0" />
                     ) : (
                       <img src={ad.image} className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-transform" />
                     )}
                     <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                        <p className="text-[8px] text-white font-bold uppercase truncate">{ad.partner}</p>
                        <p className="text-[7px] text-brand-red font-bold uppercase">AD UNIT</p>
                     </div>
                   </div>
                 ))}
                 
                 {team.filter(m => m.avatarUrl).map(m => (
                   <div key={m.id} className="aspect-square bg-white border border-brand-black/5 rounded-lg overflow-hidden group relative shadow-sm hover:border-brand-red transition-all">
                     <img src={m.avatarUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-transform" />
                     <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                        <p className="text-[8px] text-white font-bold uppercase truncate">{m.email}</p>
                        <p className="text-[7px] text-brand-red font-bold uppercase">USER AVATAR</p>
                     </div>
                   </div>
                 ))}
               </div>
               
               {stories.length === 0 && ads.length === 0 && (
                 <div className="p-24 border border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center text-center">
                    <Upload size={48} className="opacity-10 mb-4" />
                    <p className="text-[10px] uppercase font-bold tracking-widest opacity-30">No objects detected in cloud storage</p>
                 </div>
               )}
            </div>
          )}
      </div>
    </div>
  );
};

// --- AD UNIT ---
const AdFooter = ({ ads }: { ads: Ad[] }) => {
  const activeAds = ads.filter(a => a.isActive);
  const activeAd = activeAds.length > 0 ? activeAds[0] : null;

  const handleAdClick = async () => {
    if (!activeAd) return;
    try {
      await updateDoc(doc(db, 'ads', activeAd.id), { clicks: increment(1) });
      window.open(activeAd.link, '_blank');
    } catch(e) { 
      console.error(e);
      window.open(activeAd.link || '#', '_blank');
    }
  };

  const partner = activeAd ? activeAd.partner : "NOIRE STUDIO";
  const headline = activeAd ? activeAd.headline : "The Archive Kit 001";
  const copy = activeAd ? activeAd.copy : "Tools for the nomadic documentarian. Sustainable textiles forged in the Rift Valley.";

  return (
    <div className="w-full border-y border-brand-black bg-brand-gray/10 relative overflow-hidden group">
      {activeAd?.image && activeAd.type === 'image' && (
        <div className="absolute inset-0 z-0 opacity-10 group-hover:opacity-20 transition-opacity">
          <img src={activeAd.image} className="w-full h-full object-cover grayscale" alt="Campaign Background" referrerPolicy="no-referrer" />
        </div>
      )}
      {activeAd?.video && activeAd.type === 'video' && (
        <div className="absolute inset-0 z-0 opacity-10 group-hover:opacity-20 transition-opacity">
          <video src={activeAd.video} autoPlay muted loop playsInline className="w-full h-full object-cover grayscale" />
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-20 flex flex-col md:flex-row justify-between items-center gap-12 relative z-10">
        <div className="text-center md:text-left flex-1">
          <div className="flex items-center gap-3 mb-4 justify-center md:justify-start">
             <span className="w-8 h-[1px] bg-brand-red"></span>
             <p className="text-[10px] uppercase tracking-[0.4em] opacity-50 font-black text-brand-red">Curated Residency // {partner}</p>
          </div>
          <h4 className="font-display text-5xl md:text-8xl font-bold tracking-tighter uppercase leading-[0.85] mb-6">{activeAd ? activeAd.headline : headline}</h4>
          <p className="text-lg md:text-xl italic font-light opacity-60 max-w-2xl leading-tight">{activeAd ? activeAd.copy : copy}</p>
        </div>
        <div className="flex flex-col items-center gap-4">
          <button 
            onClick={handleAdClick}
            className="bg-brand-black text-white px-10 py-5 uppercase text-xs tracking-widest font-bold hover:bg-brand-red transition-all transform active:scale-95 flex items-center gap-4 min-w-[240px] justify-center"
          >
            Explore Connection
            <ArrowRight size={16} />
          </button>
          <div className="flex items-center gap-4 text-[9px] uppercase tracking-[0.2em] opacity-40 font-bold">
            <span className="w-1 h-1 rounded-full bg-brand-black"></span>
            ADVERTISEMENT
            <span className="w-1 h-1 rounded-full bg-brand-black"></span>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- NEW PAGES ---

const SearchPage = ({ stories, onSelect }: { stories: Story[], onSelect: (s: Story) => void }) => {
  const [query, setQuery] = useState('');
  
  const filtered = stories.filter(s => 
    !query || 
    s.title.toLowerCase().includes(query.toLowerCase()) || 
    s.category.toLowerCase().includes(query.toLowerCase()) ||
    s.excerpt.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8F8F8] px-4 md:px-8 py-20 flex flex-col">
      <div className="max-w-6xl mx-auto w-full flex-grow">
        <div className="relative mb-16">
          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-brand-red">
            <Search size={48} strokeWidth={1} />
          </span>
          <input 
            type="text" 
            autoFocus
            placeholder="TYPE TO EXPLORE..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-transparent border-b-2 border-brand-black py-8 pl-16 md:pl-20 font-display text-4xl md:text-6xl lg:text-7xl placeholder:text-gray-300 uppercase outline-none focus:border-brand-red transition-colors"
          />
        </div>
        
        {query && (
          <div className="mb-8">
            <p className="text-xs uppercase tracking-widest opacity-50 font-bold mb-8">
              {filtered.length} {filtered.length === 1 ? 'Result' : 'Results'} for "{query}"
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <AnimatePresence>
                {filtered.map((story, idx) => (
                  <ArticleCard key={story.id} story={story} idx={idx} onClick={() => onSelect(story)} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
        
        {!query && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 opacity-60">
            <div>
              <h3 className="text-xs uppercase font-bold tracking-widest border-b border-gray-300 pb-2 mb-6">Trending Tags</h3>
              <div className="flex flex-wrap gap-4">
                {['Lagos', 'Streetwear', 'Documentary', 'Soundscapes', 'Cyber-Africa', 'Textiles'].map(tag => (
                  <button 
                    key={tag}
                    onClick={() => setQuery(tag)}
                    className="text-xs uppercase border border-gray-400 px-4 py-2 hover:bg-brand-black hover:text-white"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs uppercase font-bold tracking-widest border-b border-gray-300 pb-2 mb-6">Recent Additions</h3>
              <ul className="space-y-4">
                {stories.slice(0, 3).map(story => (
                  <li key={story.id}>
                    <button onClick={() => onSelect(story)} className="text-left group hover:text-brand-red transition-colors">
                      <p className="font-bold uppercase text-sm">{story.title}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest">{story.category}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const BusinessPage = () => {
  return (
    <div className="px-4 md:px-8 py-20 bg-white min-h-screen text-brand-black">
      <div className="max-w-6xl mx-auto">
        <p className="text-xs uppercase tracking-[0.4em] mb-4 text-brand-red font-bold">IYUUN Media Group</p>
        <h1 className="font-display text-5xl md:text-8xl font-bold tracking-tighter uppercase mb-12">Business &<br/>Partnerships</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-24">
          <div>
            <p className="text-2xl font-light leading-snug mb-6">
              We don't just document culture. We shape how it interacts with the global market. 
            </p>
            <p className="text-gray-500 mb-8 max-w-md">
              Partner with IYUUN to reach a hyper-engaged audience of founders, creatives, and early adopters across Africa and the diaspora.
            </p>
            <button className="bg-brand-black text-white px-8 py-4 font-bold uppercase tracking-widest text-xs hover:bg-brand-red transition-colors">
              Download Media Kit
            </button>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div className="border-l-2 border-brand-black pl-4">
              <h4 className="text-4xl font-display font-bold">2.5M</h4>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 mt-2">Monthly Impressions</p>
            </div>
            <div className="border-l-2 border-brand-black pl-4">
              <h4 className="text-4xl font-display font-bold">85%</h4>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 mt-2">Gen-Z / Millennial</p>
            </div>
            <div className="border-l-2 border-brand-black pl-4">
              <h4 className="text-4xl font-display font-bold">Top 5</h4>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 mt-2">Lagos, NYC, London, Joburg, Paris</p>
            </div>
            <div className="border-l-2 border-brand-black pl-4">
              <h4 className="text-4xl font-display font-bold">120k</h4>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 mt-2">Newsletter Subs</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-16">
          <h3 className="text-2xl font-display font-bold uppercase tracking-tighter mb-8">Our Offerings</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "High-Impact Display", desc: "Premium ad units seamlessly integrated into our editorial reading experience." },
              { title: "Branded Documentaries", desc: "Short-form video telling your brand's story through our authentic lens." },
              { title: "Experiential", desc: "Physical activations, gallery pop-ups, and zine drops in key global cities." }
            ].map(offer => (
               <div key={offer.title} className="bg-brand-gray/30 p-8 border hover:border-brand-black transition-colors">
                 <h5 className="font-bold uppercase tracking-widest text-sm mb-4">{offer.title}</h5>
                 <p className="text-sm text-gray-600 line-clamp-3">{offer.desc}</p>
               </div>
            ))}
          </div>
        </div>
        
        <div className="mt-24 bg-brand-black text-white p-12 lg:p-24 flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <h3 className="font-display text-4xl uppercase tracking-tighter mb-2">Ready to Grow?</h3>
            <p className="text-gray-400">Let's build a bespoke campaign for your brand.</p>
          </div>
          <button className="whitespace-nowrap border-2 border-white px-8 py-4 font-bold uppercase tracking-widest text-xs hover:bg-white hover:text-brand-black transition-all">
            Contact Strategy Team
          </button>
        </div>
      </div>
    </div>
  );
};

const AboutPage = () => {
  return (
    <div className="bg-brand-black text-white min-h-screen px-4 md:px-8 py-20 font-sans">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-16">
        <div className="flex-1">
          <h1 className="font-display text-5xl md:text-8xl tracking-tighter uppercase font-bold mb-8 text-brand-red">The<br/>Masthead</h1>
          <p className="text-xl md:text-2xl font-light leading-snug mb-12 max-w-lg">
            IYUUN is built by a distributed network of cultural archivers spread across the globe.
          </p>
          
          <div className="space-y-8">
            <div className="border-t border-gray-800 pt-4">
              <p className="text-[10px] uppercase tracking-widest text-brand-red font-bold mb-1">Editor in Chief</p>
              <p className="text-xl uppercase">Amina Diop</p>
            </div>
            <div className="border-t border-gray-800 pt-4">
              <p className="text-[10px] uppercase tracking-widest text-brand-red font-bold mb-1">Creative Director</p>
              <p className="text-xl uppercase">Samuel Kwame</p>
            </div>
            <div className="border-t border-gray-800 pt-4">
              <p className="text-[10px] uppercase tracking-widest text-brand-red font-bold mb-1">Head of Strategy & Growth</p>
              <p className="text-xl uppercase">Ezra N.</p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 md:border-l border-gray-800 md:pl-16">
           <h2 className="text-3xl font-display font-bold uppercase tracking-tighter mb-8 bg-white text-brand-black inline-block px-2 py-1">Careers / Grow With Us</h2>
           <p className="mb-8 text-gray-400 leading-relaxed font-light">
             We are a business that needs to grow. As we expand our physical and digital footprint into new markets, we are actively looking for visionaries who want to document the future of Pan-African culture.
           </p>
           
           <div className="space-y-4 mb-12">
             <div className="bg-[#111] p-6 border border-gray-800 hover:border-brand-red transition-colors group cursor-pointer">
               <div className="flex justify-between items-center mb-2">
                 <h4 className="font-bold uppercase tracking-widest text-sm text-white">Brand Partnerships Lead</h4>
                 <span className="text-[10px] uppercase tracking-widest text-brand-red">London / Remote</span>
               </div>
               <p className="text-xs text-gray-500">Drive our monetization strategy and agency relationships.</p>
             </div>
             <div className="bg-[#111] p-6 border border-gray-800 hover:border-brand-red transition-colors group cursor-pointer">
               <div className="flex justify-between items-center mb-2">
                 <h4 className="font-bold uppercase tracking-widest text-sm text-white">Senior Video Producer</h4>
                 <span className="text-[10px] uppercase tracking-widest text-brand-red">Nairobi</span>
               </div>
               <p className="text-xs text-gray-500">Lead our short-form and documentary video department.</p>
             </div>
           </div>
           
           <button className="flex items-center gap-3 text-xs uppercase font-bold tracking-widest hover:text-brand-red transition-colors">
             <span>View All Openings</span>
             <ArrowRight size={14} />
           </button>
        </div>
      </div>
    </div>
  );
};

const ContactPage = () => {
  const [status, setStatus] = useState<'idle'|'success'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('success');
    setTimeout(() => setStatus('idle'), 4000);
  };

  return (
    <div className="bg-brand-black text-white min-h-screen px-4 md:px-8 py-20 font-sans">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-16 items-start">
        <div className="flex-1">
          <h1 className="font-display text-5xl md:text-8xl tracking-tighter uppercase font-bold mb-8 text-brand-red leading-none">Say<br/>Hello</h1>
          <p className="text-xl md:text-2xl font-light leading-snug mb-16 max-w-sm">
            Transmissions, tips, and inquiries. Drop it into the terminal.
          </p>

          <div className="space-y-12">
            <div className="border-t border-gray-800 pt-6 group cursor-pointer w-fit">
              <p className="text-[10px] uppercase tracking-widest font-bold mb-2 opacity-50 group-hover:text-brand-red transition-colors">General Inquiries</p>
              <a href="mailto:info@iyuun.com" className="text-2xl md:text-3xl uppercase font-display font-medium tracking-tighter hover:text-brand-red transition-colors">info@iyuun.com</a>
            </div>
            <div className="border-t border-gray-800 pt-6 group cursor-pointer w-fit">
              <p className="text-[10px] uppercase tracking-widest font-bold mb-2 opacity-50 group-hover:text-brand-red transition-colors">Press & Media</p>
              <a href="mailto:press@iyuun.com" className="text-2xl md:text-3xl uppercase font-display font-medium tracking-tighter hover:text-brand-red transition-colors">press@iyuun.com</a>
            </div>
          </div>
        </div>

        <div className="flex-1 w-full md:border-l border-gray-800 md:pl-16 mt-16 md:mt-0">
          {status === 'success' ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="border border-brand-red bg-brand-red/10 p-12 text-brand-red uppercase tracking-widest font-bold h-full min-h-[400px] flex flex-col justify-center items-center text-center"
            >
              <p className="text-lg">TRANSMISSION RECEIVED.</p>
              <p className="text-[10px] mt-4 opacity-70">Expect a response within standard orbital cycles.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-widest text-brand-red font-bold">Identity</label>
                <input type="text" required placeholder="NAME / ALIAS" className="w-full bg-transparent border-b border-gray-600 p-3 outline-none focus:border-white transition-colors uppercase text-sm md:text-lg" />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-widest text-brand-red font-bold">Signal (Email)</label>
                <input type="email" required placeholder="EMAIL@DOMAIN.COM" className="w-full bg-transparent border-b border-gray-600 p-3 outline-none focus:border-white transition-colors uppercase text-sm md:text-lg" />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-widest text-brand-red font-bold">Payload</label>
                <textarea required placeholder="MESSAGE" rows={5} className="w-full bg-transparent border-b border-gray-600 p-3 outline-none focus:border-white transition-colors resize-none text-sm md:text-lg" />
              </div>
              <button className="bg-white text-brand-black px-8 py-5 uppercase text-[10px] md:text-xs tracking-widest font-bold hover:bg-brand-red hover:text-white transition-all w-full flex justify-between items-center group">
                Transmit to Base
                <ArrowRight className="group-hover:translate-x-2 transition-transform" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

const ProfilePage = ({ user, setCurrentPage, stories, readingHistory, orderList, onSelectStory }: { 
  user: FirebaseUser, 
  setCurrentPage: (p: Page) => void,
  stories: Story[],
  readingHistory: string[],
  orderList: Order[],
  onSelectStory: (story: Story) => void
}) => {
  const [profile, setProfile] = useState<{name: string, email: string, role: string, isPremium: boolean, editorStatus: string, avatarUrl?: string, bio?: string} | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBio, setNewBio] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const d = snap.data();
          setProfile({
            name: d.name || user.displayName || 'Unknown',
            email: d.email || user.email || '',
            role: d.role || 'viewer',
            isPremium: d.isPremium || false,
            editorStatus: d.editorStatus || 'none',
            avatarUrl: d.avatarUrl,
            bio: d.bio || 'Architect of the new Pan-African visual language.'
          });
          setNewBio(d.bio || 'Architect of the new Pan-African visual language.');
        } else {
          const role = isSuperAdminEmail(user.email) ? 'admin' : 'viewer';
          const initData = {
            name: user.displayName || user.email || 'Unknown',
            email: user.email || '',
            role,
            avatarUrl: role === 'admin' ? '' : undefined,
            bio: 'Architect of the new Pan-African visual language.',
            isPremium: role === 'admin',
            editorStatus: role === 'admin' ? 'approved' : 'none'
          };
          await setDoc(doc(db, 'users', user.uid), initData);
          setProfile(initData);
          setNewBio(initData.bio);
        }
      } catch (err) {
        if (isFirestoreOfflineError(err)) {
          setProfile({
            name: user.displayName || user.email || 'Unknown',
            email: user.email || '',
            role: isSuperAdminEmail(user.email) ? 'admin' : 'viewer',
            isPremium: isSuperAdminEmail(user.email),
            editorStatus: isSuperAdminEmail(user.email) ? 'approved' : 'none',
            bio: 'Profile sync is temporarily offline. Reconnect to refresh your account data.'
          });
          setNewBio('Profile sync is temporarily offline. Reconnect to refresh your account data.');
          return;
        }
        console.error(err);
      }
    };
    fetchProfile();
  }, [user]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) { setEditingName(false); return; }
    try {
      await updateDoc(doc(db, 'users', user.uid), { name: newName.trim() });
      setProfile(p => p ? {...p, name: newName.trim()} : p);
      setEditingName(false);
    } catch(err) { console.error(err); }
  };

  const handleUpdateBio = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'users', user.uid), { bio: newBio.trim() });
      setProfile(p => p ? {...p, bio: newBio.trim()} : p);
      setEditingBio(false);
    } catch(err) { console.error(err); }
  };

  const handleApplyEditor = async () => {
    try {
      await updateDoc(doc(db, 'users', user.uid), { editorStatus: 'pending' });
      setProfile(p => p ? {...p, editorStatus: 'pending'} : p);
    } catch(err) { console.error(err); }
  };

  const handleGetPremium = async () => {
    try {
      await updateDoc(doc(db, 'users', user.uid), { isPremium: true });
      setProfile(p => p ? {...p, isPremium: true} : p);
    } catch(err) { console.error(err); }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const avatarRef = ref(storage, `avatars/${user.uid}/${file.name}`);
      await uploadBytes(avatarRef, file);
      const url = await getDownloadURL(avatarRef);
      await updateDoc(doc(db, 'users', user.uid), { avatarUrl: url });
      setProfile(p => p ? {...p, avatarUrl: url} : p);
    } catch(err) {
      console.error(err);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  if (!profile) return <div className="min-h-screen pt-32 px-8 font-mono text-sm uppercase tracking-widest text-center flex items-center justify-center">Loading Identity Block...</div>;

  return (
    <div className="bg-[#F8F8F8] min-h-screen px-4 md:px-8 py-20 font-sans">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={() => setCurrentPage('index')}
          className="text-[10px] uppercase font-bold tracking-widest flex items-center gap-2 mb-12 hover:text-brand-red transition-colors"
        >
          <ArrowRight className="rotate-180" size={14} /> Global Feed
        </button>

        <h1 className="font-display text-5xl md:text-8xl tracking-tighter uppercase font-bold mb-16 underline decoration-brand-red decoration-4 md:decoration-8 underline-offset-8">User Terminal</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Identity Block */}
          <div className="border border-brand-black p-8 bg-white shadow-[8px_8px_0_rgba(0,0,0,1)] flex flex-col justify-between">
            <div>
              <div className="relative group mb-8 w-24 h-24">
                <div className="w-24 h-24 bg-brand-gray/20 border border-brand-black overflow-hidden flex items-center justify-center">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <Users size={40} className="opacity-20" />
                  )}
                </div>
                <label className="absolute inset-0 bg-brand-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-[10px] uppercase font-bold text-center p-2">
                  {isUploadingAvatar ? '...' : 'Change Identity Patch'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={isUploadingAvatar} />
                </label>
              </div>

              <p className="text-[10px] uppercase tracking-[0.4em] text-brand-red font-bold mb-6 flex items-center gap-2"><Shield size={14}/> Identity Block</p>
              
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] tracking-widest text-gray-400 uppercase font-bold mb-1">Authenticated As</p>
                  <p className="font-mono text-sm truncate opacity-70">{profile.email}</p>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-1">
                    <p className="text-[10px] tracking-widest text-gray-400 uppercase font-bold">Display Name</p>
                    {!editingName && <button onClick={() => {setNewName(profile.name); setEditingName(true);}} className="text-[10px] font-bold uppercase text-brand-red hover:underline">Edit</button>}
                  </div>
                  {editingName ? (
                    <form onSubmit={handleUpdateName} className="flex gap-2">
                      <input 
                        type="text" 
                        value={newName} 
                        onChange={(e) => setNewName(e.target.value)} 
                        autoFocus
                        className="w-full bg-brand-gray/20 border-b-2 border-brand-black outline-none px-2 py-1 font-display uppercase tracking-tight text-xl"
                      />
                      <button type="submit" className="bg-brand-black text-white px-4 py-1 text-[10px] font-bold uppercase">Save</button>
                    </form>
                  ) : (
                    <p className="font-display text-4xl font-bold uppercase tracking-tight">{profile.name}</p>
                  )}
                </div>

                <div>
                   <div className="flex justify-between items-end mb-1">
                    <p className="text-[10px] tracking-widest text-gray-400 uppercase font-bold">Digital Signature (Bio)</p>
                    {!editingBio && <button onClick={() => setEditingBio(true)} className="text-[10px] font-bold uppercase text-brand-red hover:underline">Edit</button>}
                  </div>
                  {editingBio ? (
                    <form onSubmit={handleUpdateBio} className="space-y-2">
                      <textarea 
                        value={newBio} 
                        onChange={(e) => setNewBio(e.target.value)} 
                        autoFocus
                        className="w-full bg-brand-gray/20 border border-brand-black outline-none p-3 font-sans text-xs min-h-[100px]"
                      />
                      <div className="flex gap-2">
                        <button type="submit" className="bg-brand-black text-white px-4 py-1 text-[10px] font-bold uppercase">Update</button>
                        <button type="button" onClick={() => setEditingBio(false)} className="text-gray-400 text-[10px] uppercase font-bold">Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <p className="text-xs font-light leading-relaxed opacity-60 italic">"{profile.bio}"</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-12 flex items-center gap-4">
              <div className={`px-4 py-2 text-[10px] uppercase font-bold tracking-widest border-2 ${profile.role === 'admin' ? 'border-brand-red text-brand-red' : 'border-brand-black'}`}>
                {isSuperAdminEmail(profile.email) ? 'Role: Super Admin' : `Role: ${profile.role}`}
              </div>
              {(profile.isPremium || isSuperAdminEmail(profile.email)) && (
                <div className="px-4 py-2 text-[10px] uppercase font-bold tracking-widest border-2 border-brand-red bg-brand-red text-white flex items-center gap-2">
                  <Activity size={12}/> Premium Active
                </div>
              )}
            </div>
          </div>

          <div className="space-y-12">
            {/* Premium Block */}
            <div className="border border-brand-black p-8 bg-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><DollarSign size={80} strokeWidth={1} /></div>
              <h3 className="font-display text-3xl tracking-tighter uppercase font-bold mb-2">IYUUN Premium</h3>
              <p className="text-sm font-light opacity-80 mb-6 max-w-[80%]">Unlock high-res downloads, exclusive event access, and early archive releases.</p>
              
              {profile.isPremium ? (
                <button disabled className="bg-gray-200 text-gray-500 uppercase text-[10px] tracking-widest font-bold px-6 py-3 w-full cursor-not-allowed">
                  Already Subscribed
                </button>
              ) : (
                <button onClick={handleGetPremium} className="bg-brand-red text-white uppercase text-[10px] tracking-widest font-bold px-6 py-3 w-full hover:bg-brand-black transition-colors flex justify-center items-center gap-2">
                  Subscribe Now — $10/mo
                </button>
              )}
            </div>

            {/* Editor Block */}
            <div className="border border-brand-black p-8 bg-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Upload size={80} strokeWidth={1} /></div>
              <h3 className="font-display text-3xl tracking-tighter uppercase font-bold mb-2">Editor Program</h3>
              <p className="text-sm font-light opacity-80 mb-6 max-w-[80%]">Join our collective of documentarians. Submit articles, photo essays, and visual studies.</p>
              
              {profile.role === 'admin' || profile.role === 'editor' ? (
                <button onClick={() => setCurrentPage('admin')} className="border-2 border-brand-black text-brand-black uppercase text-[10px] tracking-widest font-bold px-6 py-3 w-full hover:bg-brand-black hover:text-white transition-colors">
                  Open Admin Dashboard
                </button>
              ) : profile.editorStatus === 'pending' ? (
                <button disabled className="bg-yellow-100 border border-yellow-800 text-yellow-800 uppercase text-[10px] tracking-widest font-bold px-6 py-3 w-full cursor-not-allowed text-center">
                  Application Under Review
                </button>
              ) : (
                <button onClick={handleApplyEditor} className="border-2 border-brand-black text-brand-black uppercase text-[10px] tracking-widest font-bold px-6 py-3 w-full hover:bg-brand-black hover:text-white transition-colors flex justify-center items-center gap-2">
                  Apply for Editor Access
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-24 pt-16 border-t border-brand-black/5">
          <h3 className="text-[10px] uppercase tracking-[0.5em] font-bold text-gray-400 mb-8 flex items-center gap-2"><Eye size={14}/> Personal Archive // Recently Accessed</h3>
          <div className="flex gap-6 overflow-x-auto no-scrollbar pb-8">
            {readingHistory.length > 0 ? readingHistory.map(id => {
              const story = stories.find(s => s.id === id);
              if (!story) return null;
              return (
                <div 
                  key={id} 
                  onClick={() => onSelectStory(story)}
                  className="min-w-[300px] group cursor-pointer"
                >
                  <div className="aspect-[16/9] bg-brand-gray/20 border border-brand-black/5 overflow-hidden mb-3 relative">
                    <img src={story.image} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" />
                    <div className="absolute top-2 right-2 bg-white px-2 py-1 text-[8px] font-bold uppercase border border-brand-black">{story.category}</div>
                  </div>
                  <h4 className="text-xs font-bold uppercase truncate group-hover:text-brand-red transition-colors">{story.title}</h4>
                  <p className="text-[9px] opacity-40 uppercase tracking-widest mt-1">{story.date}</p>
                </div>
              );
            }) : (
              <div className="w-full py-16 border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-[10px] uppercase font-bold opacity-30 tracking-widest italic text-center">
                Archive currently empty // Explore the feed to populate
              </div>
            )}
          </div>
        </div>

        <div className="mt-20">
          <h3 className="text-[10px] uppercase tracking-[0.5em] font-bold text-gray-400 mb-8 flex items-center gap-2"><Save size={14}/> Signal Distribution // My Print Orders</h3>
          <div className="bg-white border border-brand-black/5 rounded-2xl overflow-hidden shadow-sm">
            {orderList.filter(o => o.userEmail === user.email).length > 0 ? (
               <table className="w-full border-collapse">
                 <thead className="bg-[#111] text-white text-[9px] uppercase font-bold tracking-widest text-left">
                    <tr>
                      <th className="p-5">Target Issue</th>
                      <th className="p-5">Ledger ID</th>
                      <th className="p-5">Status</th>
                      <th className="p-5 text-right">Date</th>
                    </tr>
                 </thead>
                 <tbody className="text-[11px]">
                   {orderList.filter(o => o.userEmail === user.email).map(order => (
                     <tr key={order.id} className="border-b border-brand-black/5 last:border-0 transition-colors hover:bg-brand-gray/20">
                       <td className="p-5 font-bold uppercase text-brand-black">{order.storyTitle}</td>
                       <td className="p-5 font-mono opacity-50">{order.id}</td>
                       <td className="p-5">
                         <span className={`px-3 py-1 rounded text-[9px] font-bold uppercase ${
                           order.status === 'pending' ? 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20' :
                           order.status === 'shipped' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 
                           'bg-brand-red/10 text-brand-red border border-brand-red/20'
                         }`}>{order.status}</span>
                       </td>
                       <td className="p-5 text-right opacity-40 font-bold">{new Date(order.createdAt).toLocaleDateString()}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            ) : (
              <div className="p-20 text-center flex flex-col items-center gap-4">
                 <Save size={32} className="opacity-10" />
                 <p className="text-[10px] uppercase font-bold opacity-30 italic">No distribution requests found in ledger.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('index');
  const [stories, setStories] = useState<Story[]>(INITIAL_STORIES);
  const [ads, setAds] = useState<Ad[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');
  const [emailInput, setEmailInput] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'success'>('idle');
  const [readingHistory, setReadingHistory] = useState<string[]>(() => {
    const local = localStorage.getItem('iyuun_history');
    return local ? JSON.parse(local) : [];
  });
  const [orderStatus, setOrderStatus] = useState<'idle' | 'success' | 'loading'>('idle');
  const [firebaseWarning, setFirebaseWarning] = useState('');
  
  // Team & Orders state at root for dashboard overview
  interface TeamMember {
    id: string;
    email: string;
    role: string;
    joined: string;
    status?: string;
  }
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [orderList, setOrderList] = useState<Order[]>([]);

  const CORE_TAXONOMY = [
    'STREET CULTURE', 'CREATIVE TECH', 'MOTION DESIGN', 'MUSIC', 'STREET FOOD', 'FASHION',
    'LAGOS', 'CAPETOWN', 'DAKAR', 'KINSHASA', 'ZINES', 'AFROBEATS', 'VR'
  ];

  const requestPrint = async (storyId: string, storyTitle: string) => {
    if (!user) {
      handleGoogleLogin();
      return;
    }
    setOrderStatus('loading');
    try {
      await setDoc(doc(db, 'orders', `order-${Date.now()}`), {
        userEmail: user.email,
        storyId,
        storyTitle,
        status: 'pending',
        createdAt: Date.now()
      });
      setOrderStatus('success');
      setTimeout(() => setOrderStatus('idle'), 5000);
    } catch(err) {
      console.error(err);
      setOrderStatus('idle');
    }
  };

  const clickStory = (s: Story) => {
    setSelectedStory(s);
    setReadingHistory(prev => {
      const next = [s.id, ...prev.filter(id => id !== s.id)].slice(0, 5);
      localStorage.setItem('iyuun_history', JSON.stringify(next));
      return next;
    });
    setCurrentPage('article');
  };

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const q = query(collection(db, 'stories'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const fetchedStories: Story[] = [];
        querySnapshot.forEach((doc) => {
          fetchedStories.push(doc.data() as Story);
        });
        if (fetchedStories.length > 0) {
           setStories(fetchedStories);
        } else {
           setStories(INITIAL_STORIES);
        }
      } catch (err) {
        console.error("Error fetching stories:", err);
      }
    };
    fetchStories();

    const fetchAds = async () => {
      try {
        const q = query(collection(db, 'ads'), orderBy('createdAt', 'desc'));
        const docSnap = await getDocs(q);
        const fetchedAds: Ad[] = [];
        docSnap.forEach(d => fetchedAds.push(d.data() as Ad));
        setAds(fetchedAds);
      } catch(err) {
        console.error(err);
      }
    };
    fetchAds();

    const fetchCategories = async () => {
      try {
        const docSnap = await getDocs(collection(db, 'categories'));
        const cats: Category[] = [];
        docSnap.forEach(d => cats.push(d.data() as Category));
        
        if (cats.length === 0) {
          // SEEDING LOGIN
          const seeded: Category[] = [];
          for (const name of CORE_TAXONOMY) {
            const id = name.toLowerCase().replace(/\s+/g, '-');
            const newCat = { id, name };
            await setDoc(doc(db, 'categories', id), newCat);
            seeded.push(newCat);
          }
          setCategories(seeded);
        } else {
          setCategories(cats);
        }
      } catch(err) { console.error(err); }
    };
    fetchCategories();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const snap = await getDoc(userRef);
          
          if (!snap.exists()) {
            let role = isSuperAdminEmail(currentUser.email) ? 'admin' : 'viewer';
            let status = 'active';
            let editorStatus = role === 'admin' ? 'approved' : 'none';
            let isPremium = role === 'admin';

            try {
              // Check if user was provisioned by email
              const q = query(collection(db, 'users'), where('email', '==', currentUser.email), limit(1));
              const inviteSnap = await getDocs(q);

              if (!inviteSnap.empty) {
                const inviteData = inviteSnap.docs[0].data();
                role = inviteData.role || role;
                status = inviteData.status || status;
                editorStatus = inviteData.editorStatus || (role === 'editor' || role === 'admin' ? 'approved' : editorStatus);
                isPremium = Boolean(inviteData.isPremium) || role === 'admin';

                if (inviteSnap.docs[0].id !== currentUser.uid) {
                  await deleteDoc(doc(db, 'users', inviteSnap.docs[0].id));
                }
              }
            } catch (inviteError) {
              console.warn('Invite lookup skipped:', inviteError);
            }

            // New user registration
            await setDoc(userRef, {
              email: currentUser.email,
              name: currentUser.displayName || currentUser.email,
              displayName: currentUser.displayName,
              role: role,
              joined: new Date().toLocaleDateString('en-CA').replace(/-/g, '.'),
              status: status,
              editorStatus,
              isPremium
            });
            setUserRole(role as any);
          } else {
            const data = snap.data();
            // Check if banned
            if (data.status === 'banned') {
              setUserRole('viewer'); // Or a higher state for banned to block all UI
              signOut(auth);
              alert("This identity has been restricted. Please contact central node.");
              return;
            }

            // Enforce super admin for the platform owner account.
            if (isSuperAdminEmail(currentUser.email) && data.role !== 'admin') {
              await updateDoc(userRef, {
                role: 'admin',
                editorStatus: 'approved',
                isPremium: true
              });
              setUserRole('admin');
            } else {
              setUserRole(data.role || 'viewer');
            }
          }
          setFirebaseWarning('');
        } catch (error) {
          console.error('Auth bootstrap error:', error);
          setUserRole(isSuperAdminEmail(currentUser.email) ? 'admin' : 'viewer');
          if (isFirestoreOfflineError(error)) {
            setFirebaseWarning('Firebase is connected to Auth, but Firestore is unavailable right now. Reader pages still work while we reconnect.');
          }
        }
      } else {
        setUserRole('viewer');
        setIsAdminMode(false);
        setFirebaseWarning('');
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (userRole === 'admin' || userRole === 'editor') {
      const fetchDashboardData = async () => {
        try {
          const uQ = query(collection(db, 'users'), orderBy('joined', 'desc'));
          const uSnap = await getDocs(uQ);
          const members: TeamMember[] = [];
          uSnap.forEach(d => members.push({ id: d.id, ...d.data() } as TeamMember));
          setTeam(members);

          const oQ = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
          const oSnap = await getDocs(oQ);
          const orders: Order[] = [];
          oSnap.forEach(d => {
            const data = d.data();
             orders.push({ id: d.id, ...data } as Order);
          });
          setOrderList(orders);
        } catch(e) { console.error("Dashboard Sync Error:", e); }
      };
      fetchDashboardData();
    }
  }, [userRole, stories]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setIsMenuOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentPage('index');
    } catch (e) {
      console.error(e);
    }
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput) {
      try {
        await setDoc(doc(db, 'subscribers', `sub-${Date.now()}`), {
          email: emailInput,
          createdAt: Date.now()
        });
        setNewsletterStatus('success');
        setEmailInput('');
        setTimeout(() => setNewsletterStatus('idle'), 3000);
      } catch(err) { console.error(err); }
    }
  };

  const ArticleDetail = ({ story }: { story: Story }) => {
    const [likes, setLikes] = useState(story.likesCount || 0);
    const [hasLiked, setHasLiked] = useState(() => localStorage.getItem(`iyuun_liked_${story.id}`) === 'true');
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [recs, setRecs] = useState<Story[]>([]);
    const [loadingRecs, setLoadingRecs] = useState(false);

    useEffect(() => {
      const fetchComments = async () => {
        try {
          const q = query(collection(db, 'comments'), where('storyId', '==', story.id), orderBy('createdAt', 'desc'));
          const docSnap = await getDocs(q);
          const loaded: Comment[] = [];
          docSnap.forEach(d => loaded.push({ id: d.id, ...d.data() } as Comment));
          setComments(loaded);
        } catch(e) { console.error("Comments error", e); }
      };
      fetchComments();
    }, [story.id]);

    useEffect(() => {
      const fetchRecs = async () => {
        if (!ai || stories.length <= 1) return;
        setLoadingRecs(true);
        try {
          const safeStories = stories.map(s => ({id: s.id, category: s.category, title: s.title}));
          const prompt = `User reading: ${story.title} (${story.category}). 
History: ${readingHistory.join(', ')}.
Catalog: ${JSON.stringify(safeStories)}.
Return exactly 3 story IDs most relevant to read next (excluding ${story.id}). Output JSON array of strings only.`;
          
          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          });
          const ids: string[] = JSON.parse(response.text.trim());
          setRecs(ids.map(id => stories.find(s => s.id === id)).filter(Boolean) as Story[]);
        } catch (e) {
          console.error("AI Recs Error", e);
        } finally {
          setLoadingRecs(false);
        }
      };
      fetchRecs();
    }, [story.id]);

    const handleLike = async () => {
      if (hasLiked) return;
      setHasLiked(true);
      setLikes(l => l + 1);
      localStorage.setItem(`iyuun_liked_${story.id}`, 'true');
      try {
        await updateDoc(doc(db, 'stories', story.id), { likesCount: increment(1) });
      } catch (e) { console.error(e); }
    };

    const handleShare = async () => {
      if (navigator.share) {
        try { await navigator.share({ title: story.title, url: window.location.href }); } catch(err) {}
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
    };

    const postComment = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!newComment.trim()) return;
      const cData = {
        storyId: story.id,
        author: user ? (user.displayName || user.email || 'Author') : 'Anonymous Archiver',
        text: newComment,
        createdAt: Date.now()
      };
      setNewComment('');
      try {
        const dRef = await addDoc(collection(db, 'comments'), cData);
        setComments([{id: dRef.id, ...cData}, ...comments]);
      } catch(e) { console.error(e); }
    };

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto px-4 md:px-8 py-20"
      >
        <button 
          onClick={() => setCurrentPage('index')}
          className="text-[10px] uppercase font-bold tracking-widest flex items-center gap-2 mb-12 hover:text-brand-red transition-colors"
        >
          <ArrowRight className="rotate-180" size={14} /> Back to Search
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          <div className="lg:col-span-2 space-y-12">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.3em] font-bold text-brand-red">{story.category}</p>
              <h1 className="font-display text-5xl md:text-8xl font-bold tracking-tighter uppercase leading-[0.85]">
                {story.title}
              </h1>
              <div className="flex items-center gap-4 text-xs font-mono opacity-50 flex-wrap">
                <span>Published {story.date}</span>
                <span>•</span>
                <span>Entry No. {story.id}</span>
                <span>•</span>
                <button onClick={handleLike} className={`flex items-center gap-1 ${hasLiked ? 'text-brand-red' : 'hover:text-brand-black transition-colors'}`}>
                  <Heart size={14} className={hasLiked ? "fill-brand-red" : ""} /> {likes}
                </button>
                <span>•</span>
                <button onClick={handleShare} className="flex items-center gap-1 hover:text-brand-black transition-colors">
                  <Share2 size={14} /> Share
                </button>
                <span>•</span>
                {orderStatus === 'success' ? (
                  <span className="text-[10px] font-bold text-brand-red animate-pulse flex items-center gap-1 uppercase tracking-widest">
                    <Shield size={12} /> Logged
                  </span>
                ) : (
                  <button 
                    onClick={() => requestPrint(story.id, story.title)} 
                    disabled={orderStatus === 'loading'}
                    className="flex items-center gap-1 hover:text-brand-black transition-colors disabled:opacity-30 uppercase"
                  >
                    <Save size={14} /> {orderStatus === 'loading' ? 'Encrypting...' : 'Print'}
                  </button>
                )}
              </div>
            </div>

            <div className="border border-brand-black overflow-hidden relative group">
               {story.type === 'video' ? (
                 <video src={story.video} className="w-full grayscale hover:grayscale-0 transition-all duration-700" autoPlay loop muted playsInline />
               ) : (
                 <img src={story.image} alt={story.title} className="w-full grayscale hover:grayscale-0 transition-all duration-700 object-cover" referrerPolicy="no-referrer" />
               )}
            </div>

            <div className="prose prose-xl max-w-none mb-16">
              {story.content?.split('\n\n').map((para, i) => (
                <p key={i} className="text-xl md:text-2xl leading-relaxed font-light text-gray-800 first-letter:text-5xl first-letter:font-display first-letter:mr-2">
                  {para}
                </p>
              ))}
            </div>

            {/* AI Recommendations */}
            <div className="border-t border-brand-black pt-12">
               <h3 className="text-2xl font-display font-bold uppercase tracking-tighter mb-8 flex items-center gap-3">
                 <Search className="text-brand-red" /> Deep Knowledge Engine // Next Readings
               </h3>
               {loadingRecs ? (
                 <p className="font-mono text-xs uppercase tracking-widest text-brand-red animate-pulse">Syncing semantic network...</p>
               ) : recs.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   {recs.map(r => (
                     <div key={r.id} onClick={() => clickStory(r)} className="cursor-pointer group">
                        <div className="aspect-video border border-brand-black bg-brand-gray/30 mb-3 overflow-hidden">
                          <img src={r.image || 'https://picsum.photos/400'} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt=""/>
                        </div>
                        <p className="text-[10px] text-brand-red uppercase tracking-widest font-bold mb-1">{r.category}</p>
                        <h4 className="font-bold uppercase tracking-tight group-hover:text-brand-red transition-colors">{r.title}</h4>
                     </div>
                   ))}
                 </div>
               ) : (
                 <p className="text-xs uppercase tracking-widest opacity-50">No related content found in visual archive.</p>
               )}
            </div>

            {/* Comments Terminal */}
            <div className="border-t border-brand-black pt-12">
               <h3 className="text-2xl font-display font-bold uppercase tracking-tighter mb-8 flex items-center gap-3">
                 <MessageCircle className="text-brand-red" /> Discourse Terminal
               </h3>
               
               <form onSubmit={postComment} className="mb-12">
                 <div className="border border-brand-black p-4 bg-white relative">
                   <textarea 
                     placeholder={user ? "DISCUSS." : "AUTHENTICATION RECOMMENDED. ANONYMOUS COMMITS ALLOWED."}
                     value={newComment}
                     onChange={e => setNewComment(e.target.value)}
                     className="w-full bg-transparent outline-none min-h-[100px] font-mono text-sm resize-none"
                   />
                   <div className="flex justify-between items-center mt-4 pt-4 border-t border-brand-gray">
                     <span className="text-[10px] font-bold uppercase tracking-widest text-brand-red">
                       {user ? `Connected as ${user.email}` : "Unsecured Connection"}
                     </span>
                     <button className="bg-brand-black text-white px-6 py-2 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-red transition-colors">Submit</button>
                   </div>
                 </div>
               </form>

               <div className="space-y-6">
                 {comments.map(c => (
                   <div key={c.id} className="border-l-2 border-brand-black pl-4">
                     <div className="flex items-center gap-3 mb-2">
                       <span className="font-bold text-xs uppercase">{c.author}</span>
                       <span className="text-[10px] opacity-40 font-mono">{new Date(c.createdAt).toLocaleDateString()}</span>
                     </div>
                     <p className="text-sm font-light leading-relaxed">{c.text}</p>
                   </div>
                 ))}
                 {comments.length === 0 && (
                   <div className="text-[10px] font-mono uppercase tracking-widest text-brand-red">No discourse recorded. Awaiting initial commit.</div>
                 )}
               </div>
            </div>

          </div>

          <aside className="space-y-12 h-fit lg:sticky lg:top-32">
            <div className="border-2 border-brand-black p-6 bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)]">
              <p className="text-[10px] uppercase tracking-widest font-bold opacity-30 mb-4">Advertisement</p>
              <div className="aspect-[4/5] bg-brand-gray/30 flex flex-col items-center justify-center p-6 text-center group cursor-pointer overflow-hidden relative">
                 <div className="absolute inset-0 bg-brand-black opacity-0 group-hover:opacity-10 transition-opacity"></div>
                 <h4 className="font-display text-3xl font-bold uppercase tracking-tighter mb-4">The Archive<br/>Kit 001</h4>
                 <p className="text-xs opacity-60 mb-6">Tools for the nomadic documentarian.</p>
                 <button className="border border-brand-black px-6 py-2 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-black hover:text-white transition-colors">Shop Now</button>
              </div>
            </div>
          </aside>
        </div>
      </motion.div>
    );
  };

  const Newsletter = () => (
    <section className="bg-brand-black text-white px-4 md:px-8 py-24 flex flex-col items-center text-center overflow-hidden relative">
      <div className="relative z-10 max-w-2xl">
        <h2 className="font-display text-5xl md:text-7xl font-bold tracking-tighter uppercase mb-6">The Dossier</h2>
        <p className="text-lg opacity-60 mb-12 font-light italic">"A weekly digest of the undiscovered. Direct to your terminal."</p>
        
        {newsletterStatus === 'success' ? (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="border-2 border-brand-red p-8 text-brand-red uppercase tracking-[0.2em] font-bold">
            ARCHIVED: You're now on the list.
          </motion.div>
        ) : (
          <form onSubmit={handleNewsletterSubmit} className="flex flex-col md:flex-row gap-4 w-full">
            <input 
              type="email" 
              required
              placeholder="YOUR@IDENTITY.COM"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="bg-transparent border-2 border-white/20 p-4 md:flex-1 outline-none text-xl font-display uppercase tracking-tight focus:border-brand-red transition-colors"
            />
            <button className="bg-white text-brand-black px-12 py-4 uppercase font-bold tracking-widest text-sm hover:bg-brand-red hover:text-white transition-all transform active:scale-95">
              Subscribe
            </button>
          </form>
        )}
      </div>
      <h3 className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-[15vw] font-display font-black opacity-[0.03] uppercase tracking-tighter whitespace-nowrap pointer-events-none">NEWSLETTER</h3>
    </section>
  );

  // Prevent scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [isMenuOpen]);

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  const renderPage = () => {
    switch (currentPage) {
      case 'manifesto': return <ManifestoPage />;
      case 'search': return (
        <SearchPage 
          stories={stories} 
          onSelect={clickStory} 
        />
      );
      case 'business': return <BusinessPage />;
      case 'about': return <AboutPage />;
      case 'contact': return <ContactPage />;
      case 'archive': return (
        <ArchivePage 
          stories={stories} 
          onSelect={clickStory} 
        />
      );
      case 'admin': 
        if (!user || userRole === 'viewer') return <div className="min-h-screen flex items-center justify-center font-mono uppercase tracking-widest text-[10px]">Access Denied // Admin Clearance Required</div>;
        return (
          <AdminDashboard 
            stories={stories} 
            setStories={setStories} 
            user={user} 
            ads={ads} 
            setAds={setAds} 
            categories={categories} 
            setCategories={setCategories} 
            team={team}
            setTeam={setTeam}
            orderList={orderList}
            setOrderList={setOrderList}
          />
        );
      case 'profile': return user ? (
        <ProfilePage
          user={user}
          setCurrentPage={setCurrentPage}
          stories={stories}
          readingHistory={readingHistory}
          orderList={orderList}
          onSelectStory={clickStory}
        />
      ) : (
        <div className="min-h-screen pt-32 px-8 flex flex-col items-center justify-center font-mono text-center">
           <h2 className="text-2xl font-bold uppercase mb-4">Authentication Required</h2>
           <button onClick={handleGoogleLogin} className="border-2 border-brand-red text-brand-red px-6 py-2 uppercase tracking-widest text-xs font-bold hover:bg-brand-red hover:text-white transition-colors">Login with Google</button>
        </div>
      );
      case 'article': return selectedStory ? <ArticleDetail story={selectedStory} /> : null;
      default: return (
        <>
          <section className="min-h-[70vh] flex flex-col justify-center px-4 md:px-8 py-20 border-b border-brand-black relative">
            <div className="max-w-6xl mx-auto w-full relative z-10">
              <h2 className="text-xs md:text-sm uppercase tracking-[0.3em] mb-6 font-bold text-gray-500">SECTION 01 <span className="mx-2 text-brand-red">—</span> THE SEARCH</h2>
              
              <div className="relative group">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="DISCOVER CULTURE"
                  className="w-full bg-transparent border-b-2 border-brand-black text-4xl md:text-6xl lg:text-9xl font-display font-medium uppercase tracking-tighter py-6 outline-none placeholder:text-gray-200 transition-all focus:border-brand-red"
                />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center pr-4 pointer-events-none">
                  <ArrowRight 
                    className={`${searchQuery ? 'text-brand-red' : 'text-gray-200'} transition-transform duration-500 w-10 h-10 md:w-20 md:h-20 ${searchQuery ? 'scale-100' : 'scale-90'}`} 
                    strokeWidth={1} 
                  />
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 mt-12">
                {['Lagos', 'Capetown', 'Dakar', 'Kinshasa', 'Zines', 'Afrobeats', 'VR'].map(tag => (
                  <button 
                    key={tag}
                    onClick={() => setSearchQuery(tag)}
                    className="text-[10px] md:text-xs uppercase tracking-widest font-bold border-2 border-brand-black px-6 py-3 hover:bg-brand-black hover:text-white transition-all transform active:scale-95"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            
            <h1 className="absolute -bottom-12 -right-12 text-[20vw] leading-none font-display font-bold text-black/[0.02] select-none pointer-events-none uppercase tracking-tighter whitespace-nowrap">
              {searchQuery || 'SEARCH'}
            </h1>
          </section>

          <section className="px-4 md:px-8 py-32 bg-white">
            <div className="flex justify-between items-end mb-24 border-b border-brand-black pb-4">
              <h2 className="font-display text-4xl md:text-7xl tracking-tighter uppercase font-bold">Featured</h2>
              <span className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-50">Selected Works // 2026</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-24">
              <AnimatePresence mode="popLayout">
                {stories
                  .filter(s => !searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.category.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((story, idx) => (
                    <ArticleCard 
                      key={story.id} 
                      story={story} 
                      idx={idx} 
                      onClick={() => clickStory(story)}
                    />
                  ))
                }
              </AnimatePresence>
            </div>
          </section>
          
          <Newsletter />
        </>
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F8] text-brand-black font-sans selection:bg-brand-red selection:text-white">
      <div className="texture-overlay"></div>
      
      <Ticker />
      <NavBar 
        isMenuOpen={isMenuOpen} 
        setIsMenuOpen={setIsMenuOpen} 
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />
      <MenuOverlay 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
        setCurrentPage={setCurrentPage} 
        user={user}
        handleGoogleLogin={handleGoogleLogin}
        handleLogout={handleLogout}
        userRole={userRole} 
        isAdminMode={isAdminMode} 
        setIsAdminMode={setIsAdminMode} 
        orderStatus={orderStatus}
        requestPrint={requestPrint}
      />
      
      {firebaseWarning && (
        <div className="bg-yellow-100 border-b border-yellow-800 text-yellow-900 px-4 md:px-8 py-3 text-[10px] md:text-xs uppercase tracking-widest font-bold">
          {firebaseWarning}
        </div>
      )}

      <main className="relative overflow-x-hidden">
        {renderPage()}
      </main>
      
      {!isAdminMode && currentPage !== 'admin' && <AdFooter ads={ads} />}
      
      <footer className="bg-brand-black text-[#F8F8F8] px-4 md:px-8 py-20 flex flex-col gap-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 border-b border-white/10 pb-20">
          <div className="md:col-span-2">
            <h2 className="font-display text-6xl md:text-9xl tracking-tighter uppercase font-bold mb-6 text-brand-red leading-none">IYUUN</h2>
            <p className="max-w-md text-sm md:text-base opacity-70 leading-relaxed font-light italic">
              "We document the cultural movements of the continent before they are commodified. We are the search. We are the archive."
            </p>
          </div>
          
          <div className="space-y-6">
            <h4 className="text-[10px] uppercase tracking-[0.4em] opacity-40 font-bold">DIRECTORY</h4>
            <div className="flex flex-col gap-4">
              {['Home', 'Search', 'Archive', 'Manifesto', 'Partnerships', 'About'].map(link => (
                <button 
                  key={link} 
                  onClick={() => {
                    const pageMap: Record<string, Page> = { 
                      Home: 'index', 
                      Search: 'search',
                      Archive: 'archive', 
                      Manifesto: 'manifesto',
                      Partnerships: 'business',
                      About: 'about'
                    };
                    if (pageMap[link]) setCurrentPage(pageMap[link]);
                    window.scrollTo(0, 0);
                  }}
                  className="uppercase tracking-widest text-xs font-bold hover:text-brand-red transition-colors text-left"
                >
                  {link}
                </button>
              ))}
            </div>
          </div>
          
          <div className="space-y-6">
            <h4 className="text-[10px] uppercase tracking-[0.4em] opacity-40 font-bold">CONTACT</h4>
            <div className="flex flex-col gap-4">
              {['Instagram', 'Twitter (X)', 'Are.na', 'Say Hello'].map(link => {
                if (link === 'Say Hello') {
                  return (
                    <button 
                      key={link} 
                      onClick={() => { setCurrentPage('contact'); window.scrollTo(0, 0); }}
                      className="uppercase tracking-widest text-xs font-bold hover:text-brand-red transition-colors w-fit text-left"
                    >
                      {link}
                    </button>
                  );
                }
                const urls: Record<string, string> = {
                  'Instagram': 'https://instagram.com',
                  'Twitter (X)': 'https://twitter.com',
                  'Are.na': 'https://are.na'
                };
                return (
                  <a key={link} href={urls[link]} target="_blank" rel="noopener noreferrer" className="uppercase tracking-widest text-xs font-bold hover:text-brand-red transition-colors w-fit">
                    {link}
                  </a>
                );
              })}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between uppercase text-[10px] tracking-[0.4em] font-black italic opacity-30 gap-6">
          <p>FORGED IN THE FUTURE // 2026 // IYUUN CO.</p>
          <div className="flex gap-4">
            <span>TERMS</span>
            <span className="text-brand-red">///</span>
            <span>PRIVACY</span>
            <span className="text-brand-red">///</span>
            <span>AFRICA FIRST</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
