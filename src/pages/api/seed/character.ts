import { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/mongodb";
import Character from "@/models/Character";

const characterData = [
  {
    name: "다윗",
    description:
      "다윗은 바지가 내려가더라도 주님을 찬양하는 것에 진심이었어요.",
    instructions: ["게임의 승패와 상관없이 항상 찬양을 흥얼거려주세요."],
    image: "/characters/david.png",
    order: 1,
  },
  {
    name: "요셉",
    description:
      "요셉은 형들에 의해 팔려가 노예 생활을 할 때도, 보디발의 아내가 누명을 씌워 감옥살이를 하게 되었을 때도 하나님을 의지했어요.",
    instructions: [
      '게임에서 불리한 상황에 있는 누군가에게(본인 팀원이 아니어도. 상대 팀이더라도) "괜찮아~ 다 잘될 거야."라고 말해주세요.',
    ],
    image: "/characters/joseph.png",
    order: 2,
  },
  {
    name: "모세",
    description:
      "하나님께서 정말 크게 사용하신 모세는 사실 하나님의 부르심에 바로 순종하지 않고, 자신은 하지 못한다고.. 어려 이유들을 대며 부르심을 회피하려고 했었어요.",
    instructions: [
      '게임을 시작할 때, "나보단 00이가 더 잘하는데.."라고 하며 떠넘기려하고, 뭘 하든 핑계를 대며 상황을 회피하려고 해주세요.',
    ],
    image: "/characters/moses.png",
    order: 3,
  },
  {
    name: "삭개오",
    description:
      "삭개오는 키가 작아서 군중 속에 섞이지 못했지만, 예수님을 만나고자 돌 무화과나무에 올라갔습니다.",
    instructions: [
      "게임이 진행되는 동안 맨 뒤에서, 누군가의 뒤에서 까치발을 들고 앞의 상황을 보려고 해보아요.",
      "이건 안 들키는 게 중요하겠죠? 사람들에게 3번 이상 보여줄 필요는 없어요. 위 행동을 하며 진행자와 5번 이상 눈을 마주쳐주세요.",
    ],
    image: "/characters/zacchaeus.png",
    order: 4,
  },
  {
    name: "이삭",
    description:
      "이삭은 우물을 팔 때마다 블레셋 사람들이 뺏었지만, 모두 양보해 주며 다투지 않고 다른 곳으로 옮겨가서 다시 우물을 팠어요.",
    instructions: [
      "모든 상황 속에서 양보하고 져주세요. (우리 팀에게는 양보를 하고, 상대팀에게는 일부러 져주세요)",
    ],
    image: "/characters/isaac.png",
    order: 5,
  },
  {
    name: "야곱",
    description:
      "야곱은 태어날 때부터, 형의 발뒤꿈치를 잡고 나왔어요. 형에서의 축복을 가로채고, 한 여자를 위해 14년을 일 할만큼 승부욕과 집착이 엄청났어요.",
    instructions: [
      "모든 게임에 이기기 위해 적극적으로 참여하고, 라헬을 위해 무엇이든 해주도록 해요.",
      "라헬을 아무것도 안 해요. 야곱만 지령이 두 개에요. 라헬은 당신이 누군지 몰라요. 대신 당신에게는 라헬이 누군지 알려줄게요.",
      "그렇다고 라헬이 누군지 바로 밝히면 당신이 들키는 것도 순식간이겠죠 ^^",
      "야곱은 3번 이상 행동을 하고 3명 이상의 동의를 받지 않아도 괜찮아요. 대신, 두 행동들을 계속 해주세요. 1. 모든 게임에 참여 의사를 밝히며 적극적으로 게임하기. 2. 라헬을 위해 뭐든지 하기. (마지막에 라헬에게 인정받아야 해요.)",
    ],
    image: "/characters/jacob.png",
    order: 6,
    isSpecial: true,
  },
  {
    name: "라헬",
    description:
      "야곱이 정말 사랑한 야곱의 두 번째 아내에요. 야곱이 무려 7년씩 두 번이나 라헬을 얻기 위해 일을 했답니다~?",
    instructions: [
      "라헬은 아무 지령도 없어요. 편하게 레크를 즐기면 돼요^^ 대신 야곱이 지령이 두 개랍니다!",
      "단, 야곱은 당신이 누군지 알아요.",
      "누군가 당신을 위해 무엇이든 해준다면 그 사람이 야곱일 거예요. (야곱의 두번째 지령)",
      "그렇다고 바로 밝히지는 말아요. 그럼 당신이 라헬인 걸 들킬지도 몰라요 ^^",
    ],
    image: "/characters/rachel.png",
    order: 7,
    isSpecial: true,
  },
  {
    name: "베드로",
    description:
      '예수님을 따르던 베드로는 "주님을 절대 부인하지 않겠다"라고 큰소리쳤지만, 결국 세 번이나 부인했어요.',
    instructions: [
      "게임 진행 중 자신 있게 말하다가도, 누군가 물어본다면, '무조건' 자신의 의견을 번복해 주세요.",
      "마지막에 확인할 때 당신이 의견을 번복한 것을 3명 이상이 동의를 해야 해요. 애매하면 여러 번 의견은 번복해 보아요.",
    ],
    image: "/characters/peter.png",
    order: 8,
  },
  {
    name: "사무엘",
    description:
      "사무엘은 사울에게 기름을 부은 이스라엘의 마지막 사사에요. 이스라엘 백성들은 하나님께 왕을 요구했고, 하나님께서는 사무엘을 통해 사울에게 기름부음으로써 응답해 주셨어요. 그런 사무엘은 처음 하나님의 부르심을 받았을 때, 하나님의 음성을 3번이나 알아듣지 못했어요.",
    instructions: [
      "게임이 진행되는 동안 모든 상황에서 알아듣지 못해야 합니다. (사오정처럼 연기하기)",
      "이 행동은 3번만 하는 것이 아니라 계속해야 해요. 마지막에 3명 이상이 아 그래서 계속 못 알아들었구나~라고 동의를 해줘야 해요!",
    ],
    image: "/characters/samuel.png",
    order: 9,
  },
  {
    name: "바울(사울)",
    description:
      "사도 바울은 예수님의 12제자는 아니었지만 사도라고 불린 인물이에요. 바울의 이전 이름은 사울이었다는 것을 아시나요? 사울은 사실 예수님을 믿는 사람들을 핍박하던 사람이랍니다? 사울은 다메섹 도상에서 눈이 멀었다가 다시 보게 되고, 예수님의 말씀을 앞장서서 전하는 사도가 되었답니다.",
    instructions: [
      "게임 도중 계속 눈이 멀어서 잘 안 보이는 연기를 해주세요.",
      "이 행동은 3번만 하는 것이 아니라 계속해야 해요. 마지막에 3명 이상이 아 그래서 계속 안 보이는 연기를 한 거였구나~라고 동의를 해줘야 해요!",
    ],
    image: "/characters/paul.png",
    order: 10,
  },
  {
    name: "사마리아 여인",
    description:
      "우물가의 사마리아 여인은 예수님께서 물을 달라고 하였을 때, 예수님께 물을 주며 영원히 목마르지 않는 생명수를 알게 된 인물입니다.",
    instructions: [
      "항상 물을 들고 있으며, 물을 나눠줘야 해요. (꼭 한 명 이상은 당신이 준 물을 마셔야 해요.)",
      "이 행동은 3번 할 필요 없어요. 마지막에 3명 이상이 아 그래서 물을 계속 들고 있었구나~, 00이가 그 물을 마신 거구나!라고 동의를 해줘야 해요!",
    ],
    image: "/characters/samaritan-woman.png",
    order: 11,
  },
  {
    name: "도마",
    description: "도마는 부활하신 예수님을 의심했어요.",
    instructions: [
      "모든 상황을 의심하는 연기를 해주세요.",
      "이 행동은 3번만 하는 것이 아니라 계속해야 해요. 마지막에 3명 이상이 아 그래서 계속 의심하는 연기를 한 거였구나~라고 동의를 해줘야 해요!",
    ],
    image: "/characters/thomas.png",
    order: 12,
  },
  {
    name: "바나바",
    description:
      "바나바는 믿음과 성령이 충만한 사람으로 칭찬받았으며, '위로의 아들' 혹은 '격려하는 사람'이라는 뜻을 가진 바나바라는 별명으로 불렸습니다.",
    instructions: [
      '이제 당신의 입에서는 "어~ 맞아", "와 너 잘한다~", "그래도 잘했어~"와 같은 위로와 격려, 칭찬의 말들만 나와야 해요!',
    ],
    image: "/characters/barnabas.png",
    order: 13,
  },
  {
    name: "다니엘",
    description:
      "다니엘은 왕의 목숨 위협에도 굴하지 않고, 창가에서 정해진 시간에 무릎을 꿇고 기도를 했습니다.",
    instructions: [
      "이제 당신은 자리에 앉을 때 항상 출입문을 바라보는 방향으로 앉아야 하며, 무릎을 꿇고 앉아야 합니다.",
    ],
    image: "/characters/daniel.png",
    order: 14,
  },
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await connectDB();

    // 기존 캐릭터 데이터 삭제
    await Character.deleteMany({});

    // 새 캐릭터 데이터 생성
    const createdCharacters = await Character.insertMany(characterData);

    console.log(`${createdCharacters.length}개의 캐릭터가 생성되었습니다.`);

    return res.status(200).json({
      success: true,
      message: `${createdCharacters.length}개의 캐릭터가 생성되었습니다.`,
      count: createdCharacters.length,
    });
  } catch (error) {
    console.error("Character seed error:", error);
    return res
      .status(500)
      .json({ error: "캐릭터 데이터 생성 중 오류가 발생했습니다." });
  }
}
