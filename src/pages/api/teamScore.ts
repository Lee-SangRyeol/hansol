import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import TeamScore from '@/models/TeamScore';
import Team from '@/models/Team';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      await connectDB();
      const { name } = req.query;

      if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: 'Team name is required' });
      }

      const scores = await TeamScore.find({ name })
        .select('updateLog score createdAt')
        .sort({ createdAt: -1 });

      return res.status(200).json(scores);
    } catch (error) {
      console.error('Team score history fetch error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    try {
      await connectDB();
      const { name, updateLog, score } = req.body;

      if (!name || !updateLog || score === undefined) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const newScore = await TeamScore.create({
        name,
        updateLog,
        score
      });

      await Team.updateOne(
        { name: name },
        { $inc: { totalScore: score } }
      );

      return res.status(201).json(newScore);
    } catch (error) {
      console.error('Team score update error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}