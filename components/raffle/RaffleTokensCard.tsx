"use client"
import { cn, formatDecimal } from "@/lib/utils";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel"
import { useEffect, useState } from "react";

export interface TokenInfo {
    project_id: number;
    project_seqn: number;
    project_symbol: string;
    project_symbol_img: string;
    total_nft_staked: number;
    total_points: number;
}

export interface RaffleTokensCardProps {
    data: TokenInfo[],
    tokenType: string | undefined,
    setTokenType: Function
}

const RaffleTokensCard = ({ data, tokenType, setTokenType }: RaffleTokensCardProps) => {
    const [isMobile, setIsMobile] = useState(false);

    // Check if we're on mobile based on screen width
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        return () => {
            window.removeEventListener('resize', checkMobile);
        };
    }, []);

    // Sort data based on project_seqn
    const sortedData = [...data].sort((a, b) => a.project_seqn - b.project_seqn);
    setTokenType(sortedData.length > 0 ? sortedData[0].project_symbol : undefined);

    // Determine number of items to show based on screen size
    const itemsPerView = isMobile ? 1.5 : 3.5;
    
    // Check if we need to center items (2 or fewer on desktop)
    const shouldCenterItems = sortedData.length <= 2 && !isMobile;

    return (
        <div className="w-full max-w-3xl mx-auto px-4">
            {shouldCenterItems ? (
                // Centered layout for 1-2 items on desktop
                <div className="flex justify-center gap-4">
                    {sortedData.map((token, index) => (
                        <div 
                            key={index}
                            onClick={() => { setTokenType(token.project_symbol) }}
                            className={cn("cursor-pointer w-full max-w-xs border-2 border-[#323237] p-3 md:p-4 rounded-2xl text-[#A1A1AA]",
                                tokenType == token.project_symbol ? "bg-[url('/images/About.gif')] bg-cover bg-center" : "bg-[#18181B]"
                            )}
                        >
                            <div className="flex items-center gap-3 md:gap-4 w-full">
                                <div className="flex-shrink-0">
                                    <img
                                        src={token.project_symbol_img ?? "/images/Icon/wzrd.png"}
                                        className="h-8 w-8 md:h-12 md:w-12 object-contain"
                                        alt={`${token.project_symbol} token`}
                                    />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-xs md:text-sm lg:text-base text-white font-medium">
                                        Token
                                    </span>
                                    <p className="text-sm md:text-base lg:text-lg font-bold text-white truncate">
                                        {formatDecimal(token.total_points, 2)} ${token.project_symbol}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                // Carousel layout for 3+ items or on mobile
                <Carousel 
                    className="w-full" 
                    opts={{
                        align: "center",
                        loop: sortedData.length > itemsPerView,
                    }}
                >
                    <CarouselContent className="-ml-2 md:-ml-4">
                        {sortedData.map((token, index) => (
                            <CarouselItem 
                                key={index} 
                                className="pl-2 md:pl-4 basis-4/5 md:basis-1/3"
                            >
                                <div onClick={() => { setTokenType(token.project_symbol) }} className={cn(
                                    "cursor-pointer border-2 border-[#323237] p-3 md:p-4 rounded-2xl text-[#A1A1AA] h-full",
                                    tokenType == token.project_symbol ? "bg-[url('/images/About.gif')] bg-cover bg-center" : "bg-[#18181B]")}>
                                    <div className="flex items-center gap-3 md:gap-4 w-full">
                                        <div className="flex-shrink-0">
                                            <img
                                                src={token.project_symbol_img ?? "/images/Icon/wzrd.png"}
                                                className="h-8 w-8 md:h-12 md:w-12 object-contain"
                                                alt={`${token.project_symbol} token`}
                                            />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs md:text-sm lg:text-base text-white font-medium">
                                                Token
                                            </span>
                                            <p className="text-sm md:text-base lg:text-lg font-bold text-white truncate">
                                                {formatDecimal(token.total_points, 2)} ${token.project_symbol}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    {sortedData.length > itemsPerView && (
                        <>
                            <CarouselPrevious className="hidden md:!flex -left-4 md:-left-6" />
                            <CarouselNext className="hidden md:!flex -right-4 md:-right-6" />
                        </>
                    )}
                </Carousel>
            )}
        </div>
    );
};

export default RaffleTokensCard;