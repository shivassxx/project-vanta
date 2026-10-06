import type { CaseDef } from "@vanta/case-engine";
import { CASE_001_SUBJECT_SIGNAL } from "./case001";

/**
 * SERVER-ONLY. CASE_001 as data. Events come from the server:
 *   igl.designated, time, subject.noticed, subject.arrived {note}, subject.departed {note}, info.shared {itemId},
 *   evidence.found {evidenceId}, conversation.choice {conversation, option}, police.plateLookup, pi.dmvRequest,
 *   photo.taken {subjectInFrame, area}, crime.committed {actor, kind, witnessed}, subject.leftDistrict
 * More effects:
 *   police.notice {characterId, reason, delaySec} -> the police contact that player
 *   npc.die {key} -> a person dies (persistent)
 * Outcomes: subject_fled, case_cold, subject_warned, subject_reported
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
    // A spooked Subject leaves the district. Failure is content: the case closes, the campaign remembers.
    {
      id: "subject_fled",
      on: "subject.leftDistrict",
      do: [{ setFlag: "subjectGone", value: true }, { setOutcome: "subject_fled" }],
    },

    // The park meeting happens on the Subject's schedule whether or not anyone watches.
    {
      id: "park_meeting",
      on: "subject.arrived",
      when: { payload: "note", equals: "park bench, meets someone" },
      do: [{ setFlag: "parkMeetingHappened", value: true }],
    },

    // Crimes: every one is remembered; a witnessed one brings the police to that player.
    { id: "crime_counted", on: "crime.committed", once: false, do: [{ increment: "crimes" }] },
    {
      id: "sedan_break_in",
      on: "crime.committed",
      when: { payload: "kind", equals: "vehicle_break_in" },
      do: [{ setFlag: "sedanBrokenInto", value: true }],
    },
    { id: "dvr_break_in", on: "crime.committed", when: { payload: "kind", equals: "dvr_access" }, do: [{ setFlag: "cafeDvrAccessed", value: true }] },
    {
      id: "crime_witnessed",
      on: "crime.committed",
      once: false,
      when: { payload: "witnessed", equals: true },
      do: [
        { increment: "witnessedCrimes" },
        { effect: { type: "police.notice", payload: { characterId: "$event.actor", reason: "$event.kind", delaySec: 90 } } },
      ],
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
        { startTimer: "gone_cold", afterSec: 600 },
      ],
    },
    { id: "case_cold", on: "timer:gone_cold", when: { stage: "relocated" }, do: [{ setOutcome: "case_cold" }] },
    // Someone cleans up while the team is slow: the man who watched Elena is found dead.
    { id: "watcher_clock", on: "stage:relocated", do: [{ startTimer: "watcher_dies", afterSec: 300 }] },
    {
      id: "watcher_dies",
      on: "timer:watcher_dies",
      do: [{ setFlag: "watcherDead", value: true }, { effect: { type: "npc.die", payload: { key: "witness_smoker" } } }],
    },

    // Interventions. Each closes the case differently; none is labeled correct.
    {
      id: "subject_warned",
      on: "conversation.choice",
      when: { all: [{ payload: "conversation", equals: "subject" }, { payload: "option", equals: "start.warn" }] },
      do: [{ effect: { type: "subject.alert", payload: { level: "leaving" } } }, { setOutcome: "subject_warned" }],
    },
    {
      id: "subject_threatened",
      on: "crime.committed",
      when: { payload: "kind", equals: "threat" },
      do: [{ setFlag: "subjectThreatened", value: true }, { setStage: "spooked" }, { effect: { type: "subject.alert", payload: { level: "spooked" } } }],
    },
    {
      id: "subject_reported",
      on: "police.report",
      do: [{ effect: { type: "subject.alert", payload: { level: "detained" } } }, { setOutcome: "subject_reported" }],
    },
  ],
};
