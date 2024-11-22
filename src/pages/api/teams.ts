import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import Team from '@/models/Team';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      await connectDB();
      
      // 특정 팀 이름으로 조회
      if (req.query.name) {
        const team = await Team.findOne({ name: req.query.name }).lean();

        if (!team) {
          return res.status(404).json({ error: '팀을 찾을 수 없습니다.' });
        }

        // members 배열과 totalScore만 반환
        return res.status(200).json({
          members: (team as any).members,
          totalScore: (team as any).totalScore
        });
      }

      // 모든 팀 조회
      const teams = await Team.find({});
      return res.status(200).json({ teams });
    } catch (error) {
      console.error('Error fetching team data:', error);
      return res.status(500).json({ error: '서버 에러가 발생했습니다.' });
    }
  } 
  
  if (req.method === 'POST') {
    try {
      await connectDB();
      const team = await Team.create(req.body);
      return res.status(201).json({ team });
    } catch (error) {
      return res.status(500).json({ error: '팀 생성 실패' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
} 