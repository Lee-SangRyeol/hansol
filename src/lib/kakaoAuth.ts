import { signIn } from "next-auth/react";

export async function signInKakaoAppFirst(callbackUrl = "/") {
  return signIn(
    "kakao",
    { callbackUrl },
    {
      throughTalk: "true",
    }
  );
}
