import { mst_attributes_reward, Prisma } from "@prisma/client";
import calculatePoint, { fetchAllStargazeTokens, getToken, getUserStakedNFTs } from "./utils";
import prisma from '@/prisma/prisma';

export async function updateNftOwner(address: string, collection_address: string) {
    try {
        const collection = await prisma.mst_collection.findFirst({
            where: { collection_address: collection_address },
            include: {
                mst_staker: false
            }
        });

        if (!collection) throw new Error("Collection not found");

        const staker = await prisma.mst_staker.findFirst({
            where: {
                staker_address: address,
                staker_collection_id: collection.collection_id
            }
        });

        if (!staker) throw new Error("Staker not found");

        let allTokens = await fetchAllStargazeTokens({
            owner: address,
            collectionAddress: collection_address
        });

        //cek if exists stake in daodao
        if(collection.collection_staker_daodao){
            const staked_tokenIds = await getUserStakedNFTs(address, collection.collection_staker_daodao);
            const staked_nfts = await Promise.all(staked_tokenIds.map(async (tokenId: string) => {
                const token = await getToken(collection.collection_code ?? "-", tokenId);
                return token;
            }));

            allTokens.push(...staked_nfts);
        }

        const updatedStaker = await prisma.mst_staker.update({
            where: { staker_id: staker.staker_id, staker_collection_id: collection.collection_id },
            data: {
                staker_nft_staked: allTokens.length
            }
        });

        return updatedStaker;

    } catch (error) {
        console.error("Error in updateNftOwner:", error);
        throw error;
    }
}


export async function getTotalPoints(address: string, project_id: number) {

    const project = await prisma.mst_project.findFirst({
        where: {
            project_id: project_id
        },
        include: {
            collections: true
        }
    });

    if (!project) {
        throw Error("Project not found")
    }

    let totalNft = 0;
    let totalPoint = 0;
    let listPoints = [];

    for (let collection of project?.collections) {

        if(!collection.collection_address) continue;

        const staker = await prisma.mst_staker.findFirst({
            where: { staker_address: address, staker_collection_id: collection.collection_id }
        })

        if (!staker) {
            // throw Error("Staker not found");
            continue;
        }

        const attributes_rewards = await prisma.mst_attributes_reward.findMany({
            where: { attr_collection_id: collection.collection_id }
        });

        let allTokens = await fetchAllStargazeTokens({
            owner: address,
            collectionAddress: collection.collection_address,
            filterForSale: 'UNLISTED'
        });

        //cek if exists stake in daodao
        if(collection.collection_staker_daodao){
            const staked_tokenIds = await getUserStakedNFTs(address, collection.collection_staker_daodao);
            const staked_nfts = await Promise.all(staked_tokenIds.map(async (tokenId: string) => {
                const token = await getToken(collection.collection_code ?? "-", tokenId);
                return token;
            }));

            allTokens.push(...staked_nfts);
        }

        let attrreward: mst_attributes_reward[] = [];
        allTokens.forEach((nft) => {
            nft.traits.forEach(trait => {
                const matchingReward = attributes_rewards.find(reward =>
                    reward.attr_key == trait.name &&
                    reward.attr_val == trait.value
                );

                if (matchingReward) {
                    attrreward.push(matchingReward);
                }

                if(!matchingReward){
                    const matchingKeyReward = attributes_rewards.find(reward =>
                        reward.attr_key == trait.name &&
                        (reward.attr_val == undefined || reward.attr_val == null)
                    );

                    if(matchingKeyReward){
                        attrreward.push(matchingKeyReward);
                    }
                }
            });
        });

        attrreward.push(...attributes_rewards.filter(reward => !reward.attr_key && !reward.attr_val));

        console.log("attrreward", attrreward.length);

        const points = attrreward?.reduce((sum, reward) =>
            sum + calculatePoint(reward, staker.staker_lastclaim_date), 0
        );

        totalNft += allTokens.length;
        totalPoint += points;
        listPoints.push({
            staker_id: staker.staker_id,
            nft_staked: allTokens.length,
            points: points
        });
    }

    return {
        totalNft: totalNft,
        point: totalPoint,
        listPoints: listPoints
    };
}

export async function getLeaderboard(project_id: number, staker_address: string | null, page: number, size: number) {
    const leaderboard: any = await prisma.$queryRaw`
    WITH ranked_leaderboard AS (
        SELECT 
            mc.collection_project_id,
            ms.staker_address,
            SUM(ms.staker_nft_staked) AS staker_nft_staked,
            ms.staker_red_flag, -- Jika ada satu saja yang red_flag, maka hasilnya true
            mu.user_image_url,
            SUM(ms.staker_total_points) AS total_points,
            ROW_NUMBER() OVER (
                PARTITION BY mc.collection_project_id
                ORDER BY SUM(ms.staker_total_points) DESC
            ) AS ranking
        FROM mst_staker ms
        LEFT JOIN mst_users mu ON mu.user_address = ms.staker_address
        LEFT JOIN mst_collection mc ON mc.collection_id = ms.staker_collection_id
        WHERE mc.collection_project_id = ${project_id}
        GROUP BY mc.collection_project_id, ms.staker_address, mu.user_image_url, ms.staker_red_flag
    )
    SELECT 
        collection_project_id,
        staker_address,
        staker_nft_staked,
        staker_red_flag,
        user_image_url,
        total_points,
        ranking
    FROM ranked_leaderboard
    WHERE 1=1
    and staker_nft_staked > 0
    ${staker_address ? Prisma.sql`AND staker_address = ${staker_address}` : Prisma.empty}
    ORDER BY total_points DESC, ranking
    LIMIT ${size} OFFSET ${page * size};
`;

    return leaderboard;
}
