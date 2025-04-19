import { NextRequest, NextResponse } from 'next/server';
import getConfig from '@/config/config';
import { getLeaderboard } from '@/lib/soft-staking-service';
import { addDays } from 'date-fns';
import prisma from '@/prisma/prisma';

const config = getConfig();

export async function POST(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;
        const wallet_address = searchParams.get('wallet_address') || '';
        const project_code = searchParams.get('project_code') || '';

        if (config && !config.owners.includes(wallet_address)) {
            return NextResponse.json(
                {
                    message: 'Unauthorized to snapshoot a challenge',
                    error: 'Wallet address is not authorized to snapshoot a challenge'
                },
                { status: 403 }
            );
        }

        const project = await prisma?.mst_project.findFirst({
            where: {
                project_code: project_code
            }
        });

        if (!project) {
            return NextResponse.json(
                {
                    message: 'Project code not found'
                },
                { status: 400 }
            );
        }

        let rewards = await prisma?.mst_reward.findMany({
            where: {
                reward_project_id: project.project_id
            },
            orderBy: {
                reward_rank: 'asc'
            }
        });

        const snapshoot = await getLeaderboard(project.project_id, null, 0, rewards?.length ?? 0);

        console.log("snapshoot", snapshoot);

        if ((rewards?.length ?? 0) > snapshoot.length) {
            rewards = rewards?.slice(0, snapshoot.length);
          }

        if (rewards && rewards.length > 0) {
            await Promise.all(rewards.map(async (reward, idx) => {

                //add reward to distribusi reward
                await prisma?.trn_distribusi_reward.create({
                    data: {
                        distribusi_project_id: project.project_id,
                        distribusi_reward: `https://www.stargaze.zone/m/${reward.reward_collection}/${reward.reward_token_id}`,
                        distribusi_wallet: snapshoot[idx].staker_address,
                        distribusi_start: new Date(),
                        distribusi_end: addDays(new Date(), 30),
                        distribusi_position: idx + 1,
                        distribusi_type: reward.reward_type
                    },
                });

                //delete reward
                return await prisma?.mst_reward.delete({
                    where: {
                        reward_id: reward.reward_id
                    }
                });
            }));

            //update project challenge to DRAFT
            await prisma?.mst_project.update({
                where: {
                    project_id: project.project_id
                },
                data: {
                    project_chellange_status: 'N'
                }
            });
        }

        return NextResponse.json(
            {
                message: 'Snapshoot successfully'
            },
            { status: 200 }
        );

    } catch (error) {
        console.error('Project Challenge Error:', error);
        return NextResponse.json(
            {
                message: 'Failed to snapshoot challenge',
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}