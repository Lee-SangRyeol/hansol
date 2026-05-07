export function getAdminPin() {
  return process.env.ADMIN_PAGE_PIN || "7777";
}

export function isValidAdminPin(pin: string | undefined | null) {
  if (!pin) return false;
  return pin === getAdminPin();
}
