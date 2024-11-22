import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Team from '@/models/Team';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDB();
    const { userName } = req.body;

    let targetTeam;

    // 특정 사용자는 지정된 팀에 배정
    if (userName === '양재혁') {
      targetTeam = await Team.findOne({ name: '한울팀' });
    } else if (userName === '강경필') {
      targetTeam = await Team.findOne({ name: '병현팀' });
    } else {
      // 각 팀의 현재 상태 확인
      const hanulTeam = await Team.findOne({ name: '한울팀' });
      const byunghyunTeam = await Team.findOne({ name: '병현팀' });

      // 한울팀에 양재혁이 없고 멤버가 3명이면 마지막 자리 예약
      const isHanulReserved = !hanulTeam?.members.includes('양재혁') && 
                             hanulTeam?.members.length === 3;
      
      // 병현팀에 강경필이 없고 멤버가 3명이면 마지막 자리 예약
      const isByunghyunReserved = !byunghyunTeam?.members.includes('강경필') && 
                                 byunghyunTeam?.members.length === 3;

      // 배정 가능한 팀 찾기 (예약된 자리 고려)
      const teams = await Team.find({
        name: { $in: ['한울팀', '예선팀', '병현팀'] },
        $and: [
          // 기본 조건: 4명 미만
          { $expr: { $lt: [{ $size: "$members" }, 4] } },
          // 예약된 자리 제외
          {
            $or: [
              { name: '예선팀' },
              {
                name: '한울팀',
                $expr: { $lt: [{ $size: "$members" }, { $cond: [isHanulReserved, 3, 4] }] }
              },
              {
                name: '병현팀',
                $expr: { $lt: [{ $size: "$members" }, { $cond: [isByunghyunReserved, 3, 4] }] }
              }
            ]
          }
        ]
      });

      if (teams.length === 0) {
        return res.status(400).json({ error: '현재 배정 가능한 팀이 없습니다.' });
      }

      targetTeam = teams[Math.floor(Math.random() * teams.length)];
    }

    if (!targetTeam) {
      return res.status(400).json({ error: '배정할 수 있는 팀이 없습니다.' });
    }

    // 유저 업데이트
    await User.findOneAndUpdate(
      { name: userName },
      { team: targetTeam.name }
    );

    // 팀 업데이트
    await Team.findOneAndUpdate(
      { name: targetTeam.name },
      { $push: { members: userName } }
    );

    return res.status(200).json({ 
      success: true,
      team: targetTeam.name 
    });
  } catch (error) {
    console.error('Error joining team:', error);
    return res.status(500).json({ error: '팀 배정 중 오류가 발생했습니다.' });
  }
} 