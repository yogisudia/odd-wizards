import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/prisma/prisma';
import { getToken, getUserStakedNFTs } from '@/lib/utils';

export async function GET(request: NextRequest) {
    try {

        const collectionAddress = "the777s";
        const daoAddress = "stars1euzpv4n74ytfpqhhs4wajmt38e39pj2nxn5ykv2nh0wyz6avxwnqqh97dv";
        const address = "stars130tcpz6l0j9f382prlj67r29jmr25cgpacmd7r";

        const staked_nfts = await getUserStakedNFTs(address, daoAddress);
        const data = await Promise.all(staked_nfts.map(async (tokenId: string) => {
            const token = await getToken(collectionAddress, tokenId);
            return token;
        }));
        
        return NextResponse.json(
            {
                message: 'Get points successfully',
                data: data
            },
            { status: 200 }
        );
        
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json(
            {
                message: 'Failed',
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 400 }
        );
    }
}