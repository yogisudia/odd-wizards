import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/prisma/prisma';
import { REWARD_TYPE } from '@/constants';
import { getToken } from '@/lib/utils';
import getConfig from '@/config/config';

const config = getConfig();

// CREATE Collection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      price,
      wallet_address,
      start_date,
      end_date,
      max_ticket,
      type,
      win_address,
      collection_address,
      token_id
    } = body;

    if(config && !config.owners.includes(wallet_address)){
      return NextResponse.json(
        { 
          message: 'Unauthorized to create a raffle', 
          error: 'Wallet address is not authorized to create a raffle' 
        }, 
        { status: 403 }
      );
    }

    const raffle = await prisma.trn_raffle.create({
      data: {
        raffle_price: Number(price),
        raffle_created_by: wallet_address,
        raffle_created_date: new Date(),
        raffle_start: start_date,
        raffle_end: end_date,
        raffle_max_ticket: Number(max_ticket),
        raffle_price_type: type,
      }
    });

    const token = await getToken(collection_address, token_id);

    await prisma.mst_raffle_reward.create({
      data: {
        reward_amount: 1,
        reward_type: REWARD_TYPE.NFT,
        reward_raffle_id: raffle.raffle_id,
        reward_inject_win_address: win_address,
        reward_collection: collection_address,
        reward_collection_address: token.collection.contractAddress,
        reward_token_id: token_id,
        reward_name: token.name,
        reward_token_img: token?.media?.url
      }
    })

    return NextResponse.json(
      { 
        message: 'Raffle created successfully', 
        data: raffle 
      }, 
      { status: 201 }
    );
  } catch (error) {
    console.error('Raffle Creation Error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to create Raffle', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 400 }
    );
  }
}