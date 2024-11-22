import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import Score from '@/models/Score';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      await connectDB();
      const { name } = req.query;

      if (name && typeof name === 'string') {
        const scores = await Score.find({ name })
          .select('updateLog score createdAt')
          .sort({ createdAt: -1 });
        return res.status(200).json(scores);
      }

      const scores = await Score.find({}).populate('userId', 'name');
      return res.status(200).json({ scores });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: '서버 에러가 발생했습니다.' });
    }
  }

  if (req.method === 'POST') {
    try {
      await connectDB();
      const body = JSON.parse(req.body);
      const score = await Score.create(body);
      return res.status(201).json({ score });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: '점수 생성 실패' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
} 