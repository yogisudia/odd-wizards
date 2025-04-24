import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/prisma/prisma';

function buildRaffleFilters(searchParams: URLSearchParams) {
    const where: any = {};

    const rafflePriceType = searchParams.get('raffle_price_type');
    const types = searchParams.get('type');

    if (types) {
        const typesSplit = types.split(",");
        where.raffle_price_type = { in: typesSplit };
    } else if (rafflePriceType) {
        where.raffle_price_type = rafflePriceType;
    }

    const raffleStart = searchParams.get('raffle_start');
    if (raffleStart && !isNaN(Date.parse(raffleStart))) {
        where.raffle_start = { gte: new Date(raffleStart) };
    }

    const raffleEnd = searchParams.get('raffle_end');
    if (raffleEnd && !isNaN(Date.parse(raffleEnd))) {
        where.raffle_end = { lte: new Date(raffleEnd) };
    }

    return where;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const limit = Math.max(1, parseInt(searchParams.get('limit') || '10', 10));
        const skip = (page - 1) * limit;

        const where = buildRaffleFilters(searchParams);

        const total = await prisma.trn_raffle.count({ where });

        const raffles = await prisma.trn_raffle.findMany({
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

        const cleanedRaffles = raffles.map((raffle) => ({
            ...raffle,
            rewards: raffle.rewards.map(({ reward_inject_win_address, ...rest }) => rest)
        }));

        return NextResponse.json({
            message: 'Get Raffles successfully',
            data: cleanedRaffles,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        }, { status: 200 });

    } catch (error) {
        console.error('Get Raffles Error:', error);
        return NextResponse.json({
            message: 'Failed to Get Raffles',
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 400 });
    }
}
