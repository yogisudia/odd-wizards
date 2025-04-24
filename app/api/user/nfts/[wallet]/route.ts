import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/prisma/prisma';
import { OwnedTokensResponse, Token } from '@/types';
import { fetchStargazeTokens } from '@/lib/utils';

export async function GET(request: NextRequest, { params }: { params: { wallet: string } }) {
    try {
        const { wallet } = params;
        const { searchParams } = request.nextUrl;
        const types = searchParams.get('type');
        const limit = Number(searchParams.get('limit') || 10);
        const page = Number(searchParams.get('page') || 0);

        // Check if user exists
        let user = await prisma.mst_users.findUnique({
            where: {
                user_address: wallet
            }
        });

        if (!user) throw Error("User not found");

        const whereProject: any = {};

        if (types) {
            const typesSplit = types.split(",");
            whereProject.project_symbol = { in: typesSplit };
        } else if (types) {
            whereProject.project_symbol = types;
        }

        const projects = await prisma.mst_project.findMany({ where: whereProject });

        const collections = await prisma.mst_collection.findMany({
            where: { 
                collection_project_id: {
                    in: projects.map(project => project.project_id)
                } 
            },
            include: {
                mst_staker: false
            }
        });

        if (collections.length == 0) throw Error("Collection not found");

        const resp: OwnedTokensResponse = await fetchStargazeTokens({
            owner: wallet,
            collectionAddresses: collections ? collections.map(collection => collection.collection_address).filter((addr): addr is string => addr !== null) : [],
            limit: limit,
            offset: page * limit
        });

        return NextResponse.json(
            {
                message: 'successfully',
                data: resp
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Get User Error:', error);
        return NextResponse.json(
            {
                message: 'Failed',
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 400 }
        );
    }
}