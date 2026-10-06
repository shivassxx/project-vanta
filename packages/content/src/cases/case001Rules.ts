import type { CaseDef } from "@vanta/case-engine";
import { CASE_001_SUBJECT_SIGNAL } from "./case001";

/**
 * SERVER-ONLY. CASE_001 as data. Events come from the server:
 *   igl.designated, time, subject.noticed, subject.arrived {note}, subject.departed {note}, info.shared {itemId},
 *   evidence.found {evidenceId}, conversation.choice {conversation, option}, police.plateLookup, pi.dmvRequest,
 *   photo.taken {subjectInFrame, area}
 * Effects go to the server:
 *   vanta.deliver {items}  -> VANTA sends items to the IGL
 *   subject.alert {level}  -> Subject behavior changes (acted on in M8)
 *   case.outcome           -> emitted by the engine
 */
export const CASE_001_RULES: CaseDef = {
  id: "case_001",
  initialStage: "dormant",
  rules: [
    { id: "designation_starts_case", on: "igl.designated", do: [{ startTimer: "first_signal", afterSec: 4 }] },
    {
      id: "first_signal",
      on: "timer:first_signal",
      do: [
        { effect: { type: "vanta.deliver", payload: { items: CASE_001_SUBJECT_SIGNAL.map((i) => i.id) } } },
        { setStage: "locate" },
        { startTimer: "too_slow", afterSec: 900 },
      ],
    },
    { id: "team_shares_info", on: "info.shared", once: false, do: [{ increment: "itemsShared" }] },

    // Surveillance pressure: one notice makes the Subject wary, a second one spooks them.
    { id: "noticed_count", on: "subject.noticed", once: false, do: [{ increment: "timesNoticed" }] },
    {
      id: "subject_wary",
      on: "subject.noticed",
      when: { all: [{ counter: "timesNoticed", eq: 1 }, { stage: "locate" }] },
      do: [{ setStage: "wary" }, { effect: { type: "subject.alert", payload: { level: "wary" } } }],
    },
    {
      id: "subject_spooked",
      on: "subject.noticed",
      when: { counter: "timesNoticed", gte: 2 },
      do: [{ setStage: "spooked" }, { cancelTimer: "too_slow" }, { effect: { type: "subject.alert", payload: { level: "spooked" } } }],
    },

    // The park meeting happens on the Subject's schedule whether or not anyone watches.
    {
      id: "park_meeting",
      on: "subject.arrived",
      when: { payload: "note", equals: "park bench, meets someone" },
      do: [{ setFlag: "parkMeetingHappened", value: true }],
    },

    // Vehicle: how the team learned who owns the sedan leaves different traces.
    {
      id: "sedan_break_in",
      on: "conversation.choice",
      when: { any: [{ payload: "option", equals: "start.force" }, { payload: "option", equals: "window.force" }] },
      do: [{ setFlag: "sedanBrokenInto", value: true }, { increment: "crimes" }],
    },
    {
      id: "dvr_break_in",
      on: "conversation.choice",
      when: { all: [{ payload: "conversation", equals: "dvr_cafe" }, { any: [{ payload: "option", equals: "start.break" }, { payload: "option", equals: "start.port" }] }] },
      do: [{ setFlag: "cafeDvrAccessed", value: true }, { increment: "crimes" }],
    },
    {
      id: "cctv_by_request",
      on: "conversation.choice",
      when: { all: [{ payload: "conversation", equals: "barista" }, { payload: "option", equals: "start.cctv" }] },
      do: [{ setFlag: "baristaShowedCctv", value: true }],
    },
    // Photographing the Subject at the park bench documents the meeting.
    {
      id: "park_photo",
      on: "photo.taken",
      when: { all: [{ payload: "subjectInFrame", equals: true }, { payload: "area", equals: "by the park bench" }] },
      do: [{ setFlag: "parkMeetingPhotographed", value: true }],
    },
    { id: "plate_lookup_logged", on: "police.plateLookup", do: [{ setFlag: "policeLookupLogged", value: true }] },
    { id: "dmv_request", on: "pi.dmvRequest", do: [{ setFlag: "dmvRequestFiled", value: true }] },

    // Consequence for excessive delay: the Subject relocates and VANTA only knows roughly where.
    {
      id: "too_slow",
      on: "timer:too_slow",
      when: { stageIn: ["locate", "wary"] },
      do: [
        { setFlag: "subjectRelocated", value: true },
        { setStage: "relocated" },
        { effect: { type: "vanta.deliver", payload: { items: ["case001.subject.locationUpdate"] } } },
      ],
    },
  ],
};
