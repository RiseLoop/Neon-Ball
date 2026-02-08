import React, { useEffect, useState } from 'react';

interface AICommentatorProps {
  comment: string;
}

const AICommentator: React.FC<AICommentatorProps> = ({ comment }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  // Typewriter effect
  useEffect(() => {
    let index = 0;
    setDisplayedText('');
    const interval = setInterval(() => {
      if (index < comment.length) {
        setDisplayedText((prev) => prev + comment.charAt(index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [comment]);

  return (
    <div className="w-full max-w-2xl mt-4 p-4 bg-black/50 border border-green-500/50 rounded-md backdrop-blur-sm min-h-[80px]">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-xs text-green-500 font-bold tracking-widest">SYSTEM_AI // GEMINI_CORE</span>
      </div>
      <p className="text-green-400 font-mono text-sm md:text-base leading-relaxed">
        {displayedText}
        <span className="animate-blink inline-block w-2 h-4 bg-green-500 ml-1 align-middle"></span>
      </p>
    </div>
  );
};

export default AICommentator;