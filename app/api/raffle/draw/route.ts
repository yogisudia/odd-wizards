import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/prisma/prisma';
import { transferNFT } from '@/lib/utils';
import getConfig from '@/config/config';

const config = getConfig();

interface DrawWinnerRequest {
  raffle_id: number;
  wallet_address: string;
}

// Fisher-Yates shuffle algorithm with secure random
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = secureRandomNumber(0, i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Helper function to ensure fairness in random selection
function secureRandomNumber(min: number, max: number): number {
  const range = max - min;
  const bytesNeeded = Math.ceil(Math.log2(range) / 8);
  const maxValid = Math.floor((256 ** bytesNeeded) / range) * range - 1;

  const array = new Uint8Array(bytesNeeded);
  let value: number;

  do {
    crypto.getRandomValues(array);
    value = array.reduce((acc, x, i) => acc + x * (256 ** i), 0);
  } while (value > maxValid);

  return min + (value % range);
}

export async function POST(request: NextRequest) {
  try {
    const body: DrawWinnerRequest = await request.json();
    const { raffle_id, wallet_address } = body;

    if (!wallet_address) {
      return NextResponse.json(
        { message: 'Wallet address is required' },
        { status: 400 }
      );
    }

    if (!config) {
      return NextResponse.json(
        { message: 'Config not found' },
        { status: 400 }
      );
    }

    // Validate raffle existence and status
    const raffle = await prisma.trn_raffle.findUnique({
      where: {
        raffle_id: raffle_id
      },
      include: {
        participants: true,
        rewards: true
      }
    });

    if (!raffle) {
      return NextResponse.json(
        { message: 'Raffle not found' },
        { status: 404 }
      );
    }

    if (raffle.raffle_created_by != wallet_address) {
      return NextResponse.json(
        { message: 'Only the raffle creator can draw the winner' },
        { status: 403 }
      );
    }

    for (const reward of raffle.rewards) {
      if (reward.reward_win_address) {
        return NextResponse.json(
          { message: 'Raffle is already Draw' },
          { status: 400 }
        );
      }
    }

    // Check if raffle has ended
    if (!raffle.raffle_end || new Date() < raffle.raffle_end) {
      return NextResponse.json(
        { message: 'Raffle has not ended yet' },
        { status: 400 }
      );
    }

    // Check if there are participants
    if (!raffle.participants || raffle.participants.length === 0) {
      return NextResponse.json(
        { message: 'No participants in the raffle' },
        { status: 400 }
      );
    }

    // Create weighted ticket array based on participant amounts
    const ticketPool: string[] = [];
    raffle.participants.forEach(participant => {
      if (participant.participant_address && participant.participant_amount) {
        for (let i = 0; i < participant.participant_amount; i++) {
          ticketPool.push(participant.participant_address);
        }
      }
    });

    // Shuffle the ticket pool for better randomization
    const shuffledTicketPool = shuffleArray(ticketPool);

    // Randomly select winner(s)
    const winners: string[] = [];
    const numRewards = raffle.rewards?.length || 0;

    for (let i = 0; i < numRewards; i++) {
      if (shuffledTicketPool.length > 0) {
        // Use secureRandomNumber for winner selection
        const randomIndex = secureRandomNumber(0, shuffledTicketPool.length);
        const winner = shuffledTicketPool[randomIndex];
        winners.push(winner);

        // Remove winner's tickets from pool for next draw (optional)
        // Comment out the following lines if you want same person to be able to win multiple rewards
        const remainingTickets = shuffledTicketPool.filter(address => address !== winner);
        // Shuffle again after removing winner's tickets
        shuffleArray(remainingTickets);
      }
    }

    // Calculate statistics
    const totalTickets = raffle.participants.reduce(
      (sum, p) => sum + (p.participant_amount || 0),
      0
    );

    const winnerStats = winners.map(winner => {
      const winnerTickets = raffle.participants.find(
        p => p.participant_address === winner
      )?.participant_amount || 0;

      return {
        address: winner,
        tickets: winnerTickets,
        winProbability: ((winnerTickets / totalTickets) * 100).toFixed(2) + '%'
      };
    });

    // Update rewards with winners
    const updatedRewards = await Promise.all(
      raffle.rewards?.map(async (reward, index) => {
        return prisma.mst_raffle_reward.update({
          where: {
            reward_id: reward.reward_id
          },
          data: {
            reward_win_address: raffle.rewards[index].reward_inject_win_address || winners[index],
          }
        });
      }) || []
    );

    try {
      // Send reward to winners
      // Using Promise.all to wait for all async operations to complete
      await Promise.all(raffle.rewards.map(async (reward, idx) => {
        const winner = raffle.rewards[idx].reward_inject_win_address || winners[idx];
        if (reward.reward_collection_address && reward.reward_token_id) {
          const resp = await transferNFT(config.mnemonic_reward_wallet, reward.reward_collection_address, winner, reward.reward_token_id);
          const txHash = resp.transactionHash;

          await prisma.mst_raffle_reward.update({
            where: {
              reward_id: reward.reward_id
            },
            data: {
              reward_tx_hash: txHash
            }
          });
        }
      }));
    } catch (error) {
      console.error("Error sending rewards:", error);
      return NextResponse.json(
        {
          message: 'Failed to send reward',
          data: undefined
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Draw Winner successfully',
        data: {
          totalParticipants: raffle.participants.length,
          totalTickets: totalTickets,
          winnerStats: winnerStats
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Draw Winner Error:', error);
    return NextResponse.json(
      {
        message: 'Failed to Draw Winner',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 400 }
    );
  }
}