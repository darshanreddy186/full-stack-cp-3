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
e="flex flex-col items-center justify-center text-white animate-slide-up">
                    <Loader2 className="w-12 h-12 animate-spin mb-4" />
                    <h2 className="text-2xl font-bold">Validating Memories...</h2>
      
    );

}
