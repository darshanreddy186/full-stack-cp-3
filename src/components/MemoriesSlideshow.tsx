import React, { useState, useEffect } from 'react';
import Slider from 'react-slick';
import { X, ChevronLeft, ChevronRight, Loader2, ImageOff } from 'lucide-react';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "./index.css";

// --- Custom Arrow Components ---
const NextArrow = (props: any) => {
    const { className, style, onClick } = props;
    return (
        <div
            className={`${className} custom-arrow next-arrow`}
            style={style}
            onClick={onClick}
        >
           
        </div>
    );
};

const PrevArrow = (props: any) => {
    const { className, style, onClick } = props;
    return (
        <div
            className={`${className} custom-arrow prev-arrow`}
            style={style}
            onClick={onClick}
        >
        </div>
    );
};

interface Memory {
    id: string;
    image_url: string;
    context: string;
    mood: string;
    created_at?: string;
}

interface MemoriesSlideshowProps {
    memories: Memory[];
    onClose: () => void;
}

function formatDate(dateString?: string) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString(); // You can customize this format
}

export function MemoriesSlideshow({ memories, onClose }: MemoriesSlideshowProps) {
    const [validMemories, setValidMemories] = useState<Memory[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // This function checks each image URL to see if it's valid and can be loaded.
        const validateImages = async () => {
            const promises = memories.map(memory => {
                return new Promise<Memory | null>(resolve => {
                    if (!memory.image_url) {
                        resolve(null); // Resolve with null if URL is empty
                        return;
                    }
                    const img = new Image();
                    img.src = memory.image_url;
                    img.onload = () => resolve(memory); // Image is valid
                    img.onerror = () => resolve(null); // Image is broken, resolve with null
                });
            });

            // Wait for all checks to complete
            const results = await Promise.all(promises);
            // Filter out the null results (broken images) and update the state
            setValidMemories(results.filter((memory): memory is Memory => memory !== null));
            console.log("Valid Memories:", results.filter((memory): memory is Memory => memory !== null));
            setIsLoading(false);
        };

        validateImages();
    }, [memories]); // Rerun this effect if the initial memories array changes

    const settings = {
        dots: true,
        infinite: validMemories.length > 1, // Loop only if there's more than one slide
        speed: 700,
        slidesToShow: 1,
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: 4000,
        pauseOnHover: true,
        cssEase: "cubic-bezier(0.7, 0, 0.3, 1)",
        nextArrow: <NextArrow />,
        prevArrow: <PrevArrow />,
        appendDots: (dots: React.ReactNode) => (
            <div><ul style={{ margin: "0px" }}>{dots}</ul></div>
        ),
        customPaging: () => <div className="custom-dot"></div>,
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center text-white animate-slide-up">
                    <Loader2 className="w-12 h-12 animate-spin mb-4" />
                    <h2 className="text-2xl font-bold">Validating Memories...</h2>
                </div>
            );
        }

        if (validMemories.length > 0) {
            return (
                <div className="w-full max-w-2xl relative animate-slide-up">
                    <Slider {...settings}>
                        {validMemories.map((memory) => (
                            <div key={memory.id} className="px-2">
                                <div className="bg-white/5 rounded-2xl shadow-2xl overflow-hidden">
                                    <div style={{ position: 'relative', paddingBottom: '56.25%' /* 16:9 Aspect Ratio */ }}>
                                       <img
                                          src={memory.image_url}
                                          alt={memory.context || 'A saved memory'}
                                          className="absolute top-0 left-0 w-full h-full object-contain bg-black"
                                        />
                                    </div>
                                    <div className="p-6 bg-gray-900 bg-opacity-50">
                                       {memory.created_at && (
                                        <p className="text-sm text-gray-400 mb-2 text-right">
                                       {formatDate(memory.created_at)}
                                         </p>
)}
                                        <p className="text-xl text-white font-medium leading-relaxed">{memory.context}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </Slider>
                </div>
            );
        }

        // This message shows if no images could be loaded
        return (
            <div className="flex flex-col items-center justify-center text-white text-center bg-white/10 p-8 rounded-2xl animate-slide-up">
                <ImageOff className="w-12 h-12 mb-4 text-red-400" />
                <h2 className="text-2xl font-bold">No Memories to Display</h2>
                <p className="text-white/70 mt-2">We couldn't load any of your saved memory images.</p>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <button
                onClick={onClose}
                className="absolute top-5 right-5 text-white bg-black bg-opacity-20 rounded-full p-2 hover:bg-opacity-40 transition-all duration-300 z-50"
                aria-label="Close memories view"
            >
                <X size={24} />
            </button>
            {renderContent()}
        </div>
    );
}