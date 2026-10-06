import { PHOTO_FACES, getProfession } from "@vanta/content";
import { hairHex, skinHex, type FaceLook } from "@vanta/shared";
import type { BoardCommand, CharacterId, KnownInfo, SubjectInfoItem } from "@vanta/shared";
import { useState, useSyncExternalStore } from "react";
import { shortId, type SessionStore, type Teammate } from "../game/session";
import { BoardPanel } from "./BoardPanel";
import "./overlay.css";

export interface OverlayProps {
  store: SessionStore;
  onShare: (itemId: string, to: CharacterId[]) => void;
  onBoard: (cmd: BoardCommand) => void;
  onChoose: (optionId: string) => void;
  onLeaveTalk: () => void;
  onAbility: (id: string) => void;
}

export function Overlay({ store, onShare, onBoard, onChoose, onLeaveTalk, onAbility }: OverlayProps) {
  const view = useSyncExternalStore(store.subscribe, store.get);
  const self = view.profile?.characterId;
  const isIgl = !!self && view.iglCharacterId === self;
  const others = view.teammates.filter((t) => t.characterId !== self);
  const fromVanta = view.knowledge.filter((k) => k.source === "vanta");
  const fromTeam = view.knowledge.filter((k) => k.source === "teammate");

  return (
    <>
      {view.profile && <PrivatePanel professionId={view.profile.professionId} characterId={view.profile.characterId} />}
      <div className="vt-left">
        {view.iglCharacterId && (
          <div className="vt-box vt-muted">{isIgl ? "DESIGNATION: IGL" : `IGL: ${shortId(view.iglCharacterId)}`}</div>
        )}
        {isIgl && fromVanta.length > 0 && <IglPanel items={fromVanta.map((k) => k.item)} teammates={others} onShare={onShare} />}
        {view.phone.length > 0 && (
          <div className="vt-box">
            <div className="vt-title">PHONE</div>
            {view.phone.map((m) => (
              <div key={m.id} className="vt-row">
                <div className="vt-label">
                  {m.at} · {m.from}
                </div>
                <div>{m.text}</div>
              </div>
            ))}
          </div>
        )}
        {view.abilities.length > 0 && (
          <div className="vt-box">
            <div className="vt-title">ACTIONS · private</div>
            {view.abilities.map((a) => (
              <div key={a.id} className="vt-share">
                <button onClick={() => onAbility(a.id)}>{a.label}</button>
              </div>
            ))}
          </div>
        )}
        {view.evidence.length > 0 && (
          <div className="vt-box">
            <div className="vt-title">EVIDENCE</div>
            {view.evidence.map((f) => (
              <div key={f.item.id} className="vt-row">
                <div>{f.item.title}</div>
                {view.photoThumbs[f.item.id] && <img className="vt-thumb" src={view.photoThumbs[f.item.id]} alt="" />}
                <div className="vt-muted vt-small">{f.item.description}</div>
              </div>
            ))}
            <div className="vt-muted vt-small">B: case board</div>
          </div>
        )}
        {fromTeam.length > 0 && (
          <div className="vt-box">
            <div className="vt-title">RECEIVED</div>
            {fromTeam.map((k) => (
              <KnownRow key={k.item.id} info={k} />
            ))}
          </div>
        )}
      </div>
      {view.vantaNotice && <div className="vt-vanta">{view.vantaNotice}</div>}
      {view.dialogue && !view.dialogue.ended && (
        <div className="vt-dialogue">
          <div className="vt-muted vt-small">{view.dialogue.observed}</div>
          <div className="vt-line">“{view.dialogue.line}”</div>
          {view.dialogue.options.map((o, i) => (
            <button key={o.id} onClick={() => onChoose(o.id)}>
              {i + 1}. {o.text}
            </button>
          ))}
          <button className="vt-muted" onClick={onLeaveTalk}>
            [walk away]
          </button>
        </div>
      )}
      {view.boardOpen && <BoardPanel board={view.board} evidence={view.evidence} knowledge={view.knowledge} send={onBoard} self={self} />}
    </>
  );
}

function PrivatePanel({ characterId, professionId }: { characterId: string; professionId: string }) {
  const def = getProfession(professionId);
  return (
    <div className="vt-box vt-private">
      <div>CHARACTER {shortId(characterId)}</div>
      <div>BACKGROUND (private): {def?.name ?? professionId}</div>
      {def && <div className="vt-muted">+ {def.access}</div>}
      {def && <div className="vt-muted">- {def.restriction}</div>}
    </div>
  );
}

function IglPanel({ items, teammates, onShare }: { items: SubjectInfoItem[]; teammates: Teammate[]; onShare: OverlayProps["onShare"] }) {
  return (
    <div className="vt-box">
      <div className="vt-title">SIGNAL · SUBJECT</div>
      <div className="vt-muted vt-small">Choose what each teammate receives. Esc frees the cursor.</div>
      {items.map((item) => (
        <ShareRow key={item.id} item={item} teammates={teammates} onShare={onShare} />
      ))}
    </div>
  );
}

function ShareRow({ item, teammates, onShare }: { item: SubjectInfoItem; teammates: Teammate[]; onShare: OverlayProps["onShare"] }) {
  const [picked, setPicked] = useState<Set<CharacterId>>(new Set());
  const [sentTo, setSentTo] = useState<Set<CharacterId>>(new Set());
  const toggle = (id: CharacterId) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const share = () => {
    onShare(item.id, [...picked]);
    setSentTo((prev) => new Set([...prev, ...picked]));
    setPicked(new Set());
  };
  return (
    <div className="vt-row">
      <ItemValue item={item} />
      <div className="vt-share">
        {teammates.length === 0 && <span className="vt-muted vt-small">no teammates</span>}
        {teammates.map((t) => (
          <label key={t.characterId} className={t.connected ? "" : "vt-muted"}>
            <input type="checkbox" checked={picked.has(t.characterId)} onChange={() => toggle(t.characterId)} />
            {shortId(t.characterId)}
            {sentTo.has(t.characterId) ? " ✓" : ""}
          </label>
        ))}
        <button disabled={picked.size === 0} onClick={share}>
          Share
        </button>
      </div>
    </div>
  );
}

function KnownRow({ info }: { info: KnownInfo }) {
  return (
    <div className="vt-row">
      <ItemValue item={info.item} />
      {info.fromCharacterId && <div className="vt-muted vt-small">from {shortId(info.fromCharacterId)}</div>}
    </div>
  );
}

function ItemValue({ item }: { item: SubjectInfoItem }) {
  if (item.kind === "photo") {
    return (
      <div>
        <div className="vt-label">{item.label}</div>
        <FacePhoto face={PHOTO_FACES[item.value]} />
      </div>
    );
  }
  return (
    <div>
      <div className="vt-label">{item.label}</div>
      <div>{item.value}</div>
    </div>
  );
}

const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;
const FACE_RX: Record<string, number> = { round: 14, oval: 11.5, angular: 12.5 };
const FACE_RY: Record<string, number> = { round: 14, oval: 16, angular: 15 };

/** Face-only portrait drawn from the same traits a player can observe in the world. */
function FacePhoto({ face }: { face: FaceLook | undefined }) {
  if (!face) return <div className="vt-muted vt-small">photo unavailable</div>;
  const rx = FACE_RX[face.faceShape] ?? 12;
  const ry = FACE_RY[face.faceShape] ?? 15;
  return (
    <svg className="vt-photo" viewBox="0 0 60 72" role="img" aria-label="Subject photo">
      <rect width="60" height="72" fill="#2a3036" />
      <path d="M6 72 C8 54 52 54 54 72 Z" fill="#3d454c" />
      <ellipse cx="30" cy="34" rx={rx} ry={ry} fill={hex(skinHex(face.skin))} />
      <path d={`M${30 - rx - 1} 32 C${30 - rx} 10 ${30 + rx} 10 ${30 + rx + 1} 32 C${30 + rx - 3} 22 ${30 - rx + 3} 22 ${30 - rx - 1} 32 Z`} fill={hex(hairHex(face.hair))} />
      <circle cx="25" cy="35" r="1.3" fill="#1b1b1d" />
      <circle cx="35" cy="35" r="1.3" fill="#1b1b1d" />
      <path d="M26 43 Q30 46 34 43" stroke="#1b1b1d" strokeWidth="1" fill="none" />
    </svg>
  );
}
