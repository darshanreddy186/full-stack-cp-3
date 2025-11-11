import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase'; // Make sure this path is correct
import { ArrowLeft, Play, Pause, LoaderCircle, Headphones, Clock } from 'lucide-react';

// --- Type Definition for a single story ---
interface StoryDetailData {
    id: string;
    title: string;
    full_story: string;
    imagelink: string;
    audiolink: string;
    category: string;
    readTime: string;
}

// --- Helper Function ---
const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds === 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};


export function StoryDetail() {
    const { storyId } = useParams<{ storyId: string }>();
    const navigate = useNavigate();
    
    const [story, setStory] = useState<StoryDetailData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Audio Player State
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);
    const progressBarRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchStory = async () => {
            if (!storyId) {
                setError("Story ID is missing.");
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('static_motivations')
                    .select('*')
                    .eq('id', storyId)
                    .single();

                if (error) throw error;
                setStory(data);
            } catch (err: any) {
                setError("Failed to fetch the story.");
                console.error("Error fetching story:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStory();
    }, [storyId]);
    
    // --- Audio Player Logic ---
    const togglePlayPause = () => {
        if (!audioRef.current) return;
        if (isPlaying) audioRef.current.pause();
        else audioRef.current.play();
        setIsPlaying(!isPlaying);
    };

    const onTimeUpdate = () => {
        if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
    };

    const onLoadedMetadata = () => {
        if (audioRef.current) setDuration(audioRef.current.duration);
    };
    
    const onProgressChange = () => {
        if (audioRef.current && progressBarRef.current) {
            audioRef.current.currentTime = Number(progressBarRef.current.value);
        }
    };
    
    useEffect(() => {
        if(progressBarRef.current) {
            progressBarRef.current.value = String(currentTime);
        }
    }, [currentTime]);


    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <LoaderCircle className="w-12 h-12 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (error || !story) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
                <h2 className="text-2xl font-bold text-red-600">Story Not Found</h2>
                <p className="text-gray-600 mt-2">{error || "The story you are looking for does not exist."}</p>
                <button onClick={() => navigate('/')} className="mt-6 flex items-center gap-2 px-6 py-3 bg-indigo-500 text-white rounded-full font-semibold shadow-lg hover:scale-105 transition-transform">
                    <ArrowLeft className="w-5 h-5"/>
                    Go Back Home
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
            <header className="fixed top-0 left-0 right-0 z-50 p-4 bg-white/80 backdrop-blur-sm border-b border-gray-200/80">
                <div className="max-w-4xl mx-auto">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium">
                        <ArrowLeft className="w-5 h-5" />
                        Back
                    </button>
                </div>
            </header>

            <main className="pt-24 pb-12">
                <div className="max-w-4xl mx-auto px-4">
                    <article>
                        <div className="mb-8">
                            <div className="flex items-center justify-between text-indigo-600 font-semibold mb-2">
                                <span>{story.category}</span>
                                <span className="flex items-center gap-1.5 text-sm">
                                    <Clock className="w-4 h-4"/>
                                    {story.readTime}
                                </span>
                            </div>
                            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mt-2">{story.title}</h1>
                        </div>

                        <div className="relative rounded-2xl overflow-hidden shadow-2xl mb-12">
                            <img src={story.imagelink} alt={story.title} className="w-full h-96 object-cover" />
                             <div className="absolute inset-0 bg-black/20"></div>
                        </div>

                        {story.audiolink && (
                            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl p-6 mb-12 border border-gray-100">
                                <div className="flex items-center gap-4 mb-4">
                                    <Headphones className="w-8 h-8 text-indigo-500 flex-shrink-0"/>
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-800">Listen to this story</h3>
                                        <p className="text-sm text-gray-500">Audio version available</p>
                                    </div>
                                </div>
                                <audio 
                                    ref={audioRef}
                                    src={story.audiolink}
                                    onTimeUpdate={onTimeUpdate}
                                    onLoadedMetadata={onLoadedMetadata}
                                    onEnded={() => setIsPlaying(false)}
                                    preload="metadata"
                                />
                                <div className="flex items-center gap-4 bg-gray-100 p-2 rounded-lg">
                                    <button onClick={togglePlayPause} className="p-2 text-gray-700 hover:text-indigo-600">
                                        {isPlaying ? <Pause className="w-6 h-6"/> : <Play className="w-6 h-6"/>}
                                    </button>
                                    <span className="text-sm w-10 text-center font-mono text-gray-600">{formatTime(currentTime)}</span>
                                    <input ref={progressBarRef} type="range" defaultValue="0" max={duration || 0} onChange={onProgressChange} className="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                    <span className="text-sm w-10 text-center font-mono text-gray-600">{formatTime(duration)}</span>
                                </div>
                            </div>
                        )}

                        <div className="prose prose-lg max-w-none text-gray-800 leading-relaxed space-y-6">
                            {story.full_story.split('\n').map((paragraph, index) => (
                                paragraph.trim() && <p key={index}>{paragraph}</p>
                            ))}
                        </div>
                    </article>
                </div>
            </main>
        </div>
    );
}