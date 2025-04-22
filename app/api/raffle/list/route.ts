import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/prisma/prisma';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const type = searchParams.get('type') as string;
        const skip = (page - 1) * limit;

        // Build filter conditions
        const where: any = {};
        
        if (searchParams.has('raffle_price_type')) {
            where.raffle_price_type = searchParams.get('raffle_price_type');
        }

        if (searchParams.has('raffle_start')) {
            where.raffle_start = {
                gte: new Date(searchParams.get('raffle_start')!)
            };
        }

        if (searchParams.has('raffle_end')) {
            where.raffle_end = {
                lte: new Date(searchParams.get('raffle_end')!)
            };
        }

        if(type){
            where.raffle_price_type = type;
        }

        // Get total count for pagination
        const total = await prisma.trn_raffle.count({ where });

        // Get raffles with relations
        let raffles = await prisma.trn_raffle.findMany({
            where,
            include: {
                rewards: true,
                participants: true
            },
            skip,
            take: limit,
            orderBy: {
                raffle_id: 'desc'
            }
        });

        return NextResponse.json(
            {
                message: 'Get Raffles successfully',
                data: raffles.map((raffle) => {
                    const modifiedRewards = raffle.rewards.map((reward) => {
                        const { reward_inject_win_address, ...rest } = reward;
                        return rest;
                    });
                    return { ...raffle, rewards: modifiedRewards };
                }),
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Get Raffles Error:', error);
        return NextResponse.json(
            {
                message: 'Failed to Get Raffles',
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 400 }
        );
    }
}