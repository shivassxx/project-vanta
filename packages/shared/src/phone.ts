/** A message on a character's phone. Private to that character. */
export interface PhoneMessage {
  id: string;
  from: string;
  text: string;
  /** Case clock label, e.g. "08:42". */
  at: string;
}

export const MSG_PHONE = "phone";
/** Server -> IGL only: VANTA's last word on a case. Terse, no explanation. */
export const MSG_VANTA_NOTICE = "vantaNotice";
