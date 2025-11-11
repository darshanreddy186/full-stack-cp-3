import React, { useState, useEffect, useCallback, useRef } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import './StoryCarousel.css'; // We will use the updated CSS

interface Story {
  title: string;
  description: string;
  image: string;
}

// Increased this for a more dramatic 3D effect
const TWEEN_FACTOR = 5.2;

const tweenOpacity = (progress: number) => {
  const SPREAD = 2; // How far to spread the opacity effect
  return 1 - Math.abs(progress * SPREAD);
};

// Added an onClick prop to make cards interactive
export const StoryCarousel: React.FC<{ stories: Story[]; onClick: (index: number) => void; }> = ({ stories, onClick }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'center' },
    // REQUIREMENT: Autoplay stops on hover and resumes on leave
    [Autoplay({ delay: 4000, stopOnInteraction: true, stopOnMouseEnter: true })]
  );
  
  const [tweenValues, setTweenValues] = useState<number[]>([]);
  
  // A ref to prevent rapid-fire scrolling
  const scrollTimeout = useRef<number | null>(null);

  const onScroll = useCallback(() => {
    if (!emblaApi) return;
    
    const engine = emblaApi.internalEngine();
    const scrollProgress = emblaApi.scrollProgress();

    const values = emblaApi.scrollSnapList().map((scrollSnap, index) => {
      let diffToTarget = scrollSnap - scrollProgress;
      const slidesInView = emblaApi.slideNodes().length;

      if (engine.options.loop) {
        if (diffToTarget * -1 > 0.5) diffToTarget = 1 + diffToTarget;
        if (diffToTarget > 0.5) diffToTarget = diffToTarget - 1;
      }
      
      return diffToTarget * (-1 / TWEEN_FACTOR) * slidesInView;
    });
    setTweenValues(values);
  }, [emblaApi, setTweenValues]);

  // REQUIREMENT: Allow mouse wheel scrolling
  const handleWheelScroll = useCallback((event: WheelEvent) => {
    if (!emblaApi) return;
    
    // Prevent the page from scrolling up/down
    event.preventDefault();
    
    // If a scroll is already queued, do nothing
    if (scrollTimeout.current) return;

    if (event.deltaY > 0) {
      emblaApi.scrollNext();
    } else {
      emblaApi.scrollPrev();
    }

    // Set a timeout to prevent another scroll for 100ms
    scrollTimeout.current = window.setTimeout(() => {
      scrollTimeout.current = null;
    }, 100);

  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    
    onScroll();
    emblaApi.on('scroll', onScroll);
    emblaApi.on('reInit', onScroll);

    // Attach the wheel listener
    const viewport = emblaApi.containerNode().parentElement;
    viewport?.addEventListener('wheel', handleWheelScroll);
    
    // Clean up the listener on component unmount
    return () => {
      viewport?.removeEventListener('wheel', handleWheelScroll);
    };

  }, [emblaApi, onScroll, handleWheelScroll]);

  return (
    <div className="embla-wow">
      <div className="embla-wow__viewport" ref={emblaRef}>
        <div className="embla-wow__container">
          {stories.map((story, index) => (
            <div 
              className="embla-wow__slide"
              key={index}
              style={{
                ...(tweenValues.length && { 
                  // Increased rotation for a stronger 3D effect
                  transform: `translateX(${tweenValues[index] * 100}%) rotateY(${tweenValues[index] * 65}deg)`,
                  opacity: tweenOpacity(tweenValues[index] || 0)
                })
              }}
            >
              {/* REQUIREMENT: Card is clickable */}
              <button 
                className="embla-wow__slide__inner"
                onClick={() => onClick(index)}
              >
                <img className="embla-wow__slide__img" src={story.image} alt={story.title} />
                <div className="embla-wow__slide__content">
                  <h3>{story.title}</h3>
                  <p>{story.description}</p>
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};