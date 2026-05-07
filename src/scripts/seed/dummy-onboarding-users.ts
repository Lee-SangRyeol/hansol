/**
 * 실제 로그인 계정(형빈)을 제외한 19명: 온보딩 완료 더미 유저를 upsert 합니다.
 * snsId: dummy-koram-onboarding-{이름}
 *
 * 실행: npm run seed:dummy-onboarding
 */
import mongoose from "mongoose";
import { connectDB } from "../../lib/mongodb";
import User from "../../models/User";
import { CLOSE_FRIEND_OPTIONS } from "../../constants/closeFriendOptions";

const EXCLUDE_FROM_DUMMY = "형빈";

const POOL = new Set<string>([...CLOSE_FRIEND_OPTIONS]);

type Row = {
  name: string;
  prayerTopic: string;
  closeFriends: [string, string, string];
  tmi: string;
  bibleVerse: string;
};

/** 선호 순서는 배열 인덱스 순. 형빈(실유저)은 많은 행의 선호에 포함되고 일부 행에서는 빼두었습니다. */
const DUMMY_ONBOARDING: Row[] = [
  {
    name: "원정",
    prayerTopic: "가족과 동역자 건강",
    closeFriends: ["형빈", "은빈", "유미"],
    tmi: "편스토랑 디저트 리필에 손 많이 돼서 디저트는 다 내가 책임져야 하는 줄 알았던 날",
    bibleVerse: "시편 23편",
  },
  {
    name: "은빈",
    prayerTopic: "수험 준비와 불안 극복",
    closeFriends: ["유미", "형빈", "소연"],
    tmi: "라면에 계란만 넣었다가 국물이 하얘져서 깜짝 놀라고 맛은 맛있었음",
    bibleVerse: "빌립보서 4:6-7",
  },
  {
    name: "유미",
    prayerTopic: "새 교제와 지혜",
    closeFriends: ["서영", "원정", "형빈"],
    tmi: "지하철 문 닫히는 소리에 뛰어들었더니 신발 하나만 들고 탄 적 있음",
    bibleVerse: "잠언 3:5-6",
  },
  {
    name: "소연",
    prayerTopic: "직장 적응",
    closeFriends: ["형빈", "서영", "원태"],
    tmi: "회의 중에 무음풀린 줄 알고 헛기침 레전드 각 나옴",
    bibleVerse: "로마서 8:28",
  },
  {
    name: "서영",
    prayerTopic: "부모님 안부",
    closeFriends: ["원태", "소연", "형빈"],
    tmi: "산책하다 들개한테 따라와서 우리 반려견 줄인 줄 착각함",
    bibleVerse: "이사야 41:10",
  },
  {
    name: "원태",
    prayerTopic: "작은 교회 공동체 일",
    closeFriends: ["성호", "형빈", "하은"],
    tmi: "택배 문 앞두고 간 줄 알았는데 본인이 문 앞에 앉아 있던 일",
    bibleVerse: "시편 46:10",
  },
  {
    name: "하은",
    prayerTopic: "여행 무사 귀환",
    closeFriends: ["지인", "원정", "형빈"],
    tmi: "비행기 이륙 후 이어폰 줄이 옆 사람 팔 걸린 채 발견",
    bibleVerse: "요한복음 14:27",
  },
  {
    name: "지인",
    prayerTopic: "형제와 화해",
    closeFriends: ["준태", "하은", "형빈"],
    tmi: "단톡에 ‘내일 회식 빠집니다’ 적었는데 잘못된 단톡이었던 날",
    bibleVerse: "마태복음 5:23-24",
  },
  {
    name: "성호",
    prayerTopic: "운동 부상 회복",
    closeFriends: ["련아", "희원", "형빈"],
    tmi: "헬스장에서 무게 헷갈려서 빈바만 들고 세트 시작한 순간",
    bibleVerse: "고린도전서 9:24-27",
  },
  {
    name: "준태",
    prayerTopic: "취업 면접",
    closeFriends: ["희원", "민수", "형빈"],
    tmi: "화상면접인데 상의만 셔츠 하의는 잠옷바지였던 전설",
    bibleVerse: "야고보서 1:5",
  },
  {
    name: "련아",
    prayerTopic: "새로 이사한 동네 정착",
    closeFriends: ["가현", "수현", "형빈"],
    tmi: "이웃한테 인사하려다 마스크 쓴 나를 못 알아보고 지나감",
    bibleVerse: "시편 121편",
  },
  {
    name: "희원",
    prayerTopic: "친구 건강 회복",
    closeFriends: ["도영", "충현", "형빈"],
    tmi: "카페에서 노트북 충전기 가져왔는데 콘센트 멀어서 스쿼트 연습함",
    bibleVerse: "베드로전서 5:7",
  },
  {
    name: "민수",
    prayerTopic: "시간 관리",
    closeFriends: ["재인", "소현", "형빈"],
    tmi: "알람 5개 맞춰놓고 전부 스누즈만 누른 하루",
    bibleVerse: "에베소서 5:15-16",
  },
  {
    name: "도영",
    prayerTopic: "찬양 팀 헌신",
    closeFriends: ["소현", "재인", "형빈"],
    tmi: "리허설 날 목소리가 아재톤으로 나와서 레코딩 들으면 레전드",
    bibleVerse: "시편 96:1-2",
  },
  {
    name: "충현",
    prayerTopic: "군종 면회 일정",
    closeFriends: ["수현", "가현", "형빈"],
    tmi: "편지 쓸 때 ‘건강해’만 열 줄 썼다가 다 지우고 과자 이야기로 채운 날",
    bibleVerse: "신명기 31:8",
  },
  {
    name: "가현",
    prayerTopic: "심방 준비",
    closeFriends: ["소현", "수현", "형빈"],
    tmi: "지도 앱 따라가는데 같은 건물을 두 바퀴 돈 뒤에야 현관 찾음",
    bibleVerse: "히브리서 10:24-25",
  },
  {
    name: "재인",
    prayerTopic: "적성에 맞는 진로 확인",
    closeFriends: ["민수", "도영", "성호"],
    tmi: "형빈 없이 세 명만 고른 줄 알았는데 다들 서로 헷갈리게 픽한 날이라 연락 오백 통",
    bibleVerse: "잠언 16:3",
  },
  {
    name: "수현",
    prayerTopic: "예배 깊이 묵상",
    closeFriends: ["준태", "련아", "원정"],
    tmi: "찬송가 페이지만 보고 시작했다가 초반부터 박 무너진 적 있음",
    bibleVerse: "시편 42:1",
  },
  {
    name: "소현",
    prayerTopic: "친교 모임 진행 도움",
    closeFriends: ["은빈", "유미", "서영"],
    tmi: "아이스크림 세 개 사왔는데 다 녹아서 빨대 금지 레벨이었음",
    bibleVerse: "골로새서 3:14",
  },
];

function validateRows(rows: Row[]) {
  const expectedCount = CLOSE_FRIEND_OPTIONS.length - 1;
  if (rows.length !== expectedCount) {
    throw new Error(`더미 명단은 ${expectedCount}명이어야 합니다. 현재 ${rows.length}명`);
  }

  const namesInPool = new Set(CLOSE_FRIEND_OPTIONS as unknown as string[]);
  if (!namesInPool.has(EXCLUDE_FROM_DUMMY)) {
    throw new Error(`옵션 풀에 '${EXCLUDE_FROM_DUMMY}'가 없습니다.`);
  }

  for (const row of rows) {
    if (row.name === EXCLUDE_FROM_DUMMY) {
      throw new Error(`더미에 '${EXCLUDE_FROM_DUMMY}'를 넣을 수 없습니다.`);
    }
    if (!namesInPool.has(row.name)) {
      throw new Error(`알 수 없는 이름: ${row.name}`);
    }
    const [a, b, c] = row.closeFriends;
    if (new Set([a, b, c]).size !== 3) {
      throw new Error(`${row.name}: 짱칭 3명은 중복 없어야 합니다.`);
    }
    for (const pick of row.closeFriends) {
      if (!POOL.has(pick)) {
        throw new Error(`${row.name}: '${pick}' 는 풀에 없습니다.`);
      }
    }
    if (row.closeFriends.includes(row.name)) {
      throw new Error(`${row.name}: 본인을 선호 목록에 넣을 수 없습니다.`);
    }
  }

  const rowNames = new Set(rows.map((r) => r.name));
  for (const n of CLOSE_FRIEND_OPTIONS as unknown as string[]) {
    if (n === EXCLUDE_FROM_DUMMY) continue;
    if (!rowNames.has(n)) {
      throw new Error(`더미 명단에 '${n}'이 빠져 있습니다.`);
    }
  }
}

async function main() {
  validateRows(DUMMY_ONBOARDING);

  await connectDB();
  let upserted = 0;

  for (const row of DUMMY_ONBOARDING) {
    const snsId = `dummy-koram-onboarding-${row.name}`;
    const result = await User.findOneAndUpdate(
      { snsId },
      {
        $set: {
          snsId,
          name: row.name,
          role: "user",
          team: "",
          score: 0,
          character: "",
          onboardingCompleted: true,
          prayerTopic: row.prayerTopic,
          closeFriends: [...row.closeFriends],
          tmi: row.tmi,
          bibleVerse: row.bibleVerse,
        },
        $unset: { friendId: 1, partnerUserId: 1 },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (result) upserted += 1;
  }

  console.log(
    `'${EXCLUDE_FROM_DUMMY}' 제외 ${upserted}명 온보딩 더미 upsert 완료. 각 snsId는 dummy-koram-onboarding-{이름} 입니다.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
