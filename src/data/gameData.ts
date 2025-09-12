export interface GameCategory {
  id: string;
  name: string;
  items: string[];
}

export interface GameData {
  id: string;
  name: string;
  categories: GameCategory[];
}

export const gameData: GameData[] = [
  {
    id: "body-language",
    name: "몸으로 말해요",
    categories: [
      {
        id: "proverb-a",
        name: "속담 A",
        items: [
          "티끌 모아 태산",
          "등잔 밑이 어둡다",
          "옷이 날개다",
          "백문이 불여일견",
          "우물 안 개구리",
          "가재는 게 편이라",
          "밑 빠진 독에 물 붓기",
          "산 넘어 산",
          "배보다 배꼽이 크다",
          "고생 끝에 낙이 온다",
          "열 길 물속은 알아도 한 길 사람 속은 모른다",
          "구슬이 서 말이라도 꿰어야 보배다",
        ],
      },
      {
        id: "proverb-b",
        name: "속담 B",
        items: [
          "누워서 침 뱉기",
          "사공이 많으면 배가 산으로 간다",
          "원숭이도 나무에서 떨어진다",
          "가는 말이 고와야 오는 말이 곱다",
          "발 없는 말이 천 리 간다",
          "첫술에 배부르랴",
          "가는 날이 장날",
          "되로 주고 말로 받는다",
          "믿는 도끼에 발등 찍힌다",
          "세 살 버릇 여든까지 간다",
          "빈 수레가 요란하다",
          "돌다리도 두들겨 보고 건너라",
        ],
      },
      {
        id: "animal-a",
        name: "동물 A",
        items: [
          "개",
          "고양이",
          "소",
          "말",
          "닭",
          "돼지",
          "토끼",
          "양",
          "염소",
          "오리",
          "비둘기",
          "햄스터",
        ],
      },
      {
        id: "animal-b",
        name: "동물 B",
        items: [
          "사자",
          "호랑이",
          "코끼리",
          "기린",
          "악어",
          "캥거루",
          "판다",
          "돌고래",
          "상어",
          "늑대",
          "코뿔소",
          "치타",
        ],
      },
      {
        id: "job-a",
        name: "직업 A",
        items: [
          "선생님",
          "의사",
          "간호사",
          "경찰관",
          "소방관",
          "요리사",
          "배달원",
          "택시 기사",
          "점원(판매원)",
          "미용사(헤어 디자이너)",
          "청소부",
          "바리스타",
        ],
      },
      {
        id: "job-b",
        name: "직업 B",
        items: [
          "변호사",
          "엔지니어",
          "프로그래머",
          "기자",
          "건축가",
          "파일럿",
          "우주비행사",
          "농부",
          "음악가(연주자)",
          "사진사(사진작가)",
          "무용수",
          "목수",
        ],
      },
    ],
  },
  {
    id: "movie-guess",
    name: "영화 맞추기",
    categories: [
      {
        id: "movie-posters",
        name: "영화 포스터",
        items: [
          "movie1.png",
          "movie2.png",
          "movie3.png",
          "movie4.png",
          "movie5.png",
          "movie6.png",
        ],
      },
    ],
  },
  {
    id: "team-selection",
    name: "팀 지목",
    categories: [
      {
        id: "teams",
        name: "팀 목록",
        items: ["팀 A", "팀 B", "팀 C"],
      },
    ],
  },
];
