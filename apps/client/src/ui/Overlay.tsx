import { getProfession } from "@vanta/content";
import type { CharacterId, KnownInfo, SubjectInfoItem } from "@vanta/shared";
import { useState, useSyncExternalStore } from "react";
import { shortId, type SessionStore, type Teammate } from "../game/session";
import "./overlay.css";

export interface OverlayProps {
  store: SessionStore;
  onShare: (itemId: string, to: CharacterId[]) => void;
}

export function Overlay({ store, onShare }: OverlayProps) {
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
        {fromTeam.length > 0 && (
          <div className="vt-box">
            <div className="vt-title">RECEIVED</div>
            {fromTeam.map((k) => (
              <KnownRow key={k.item.id} info={k} />
            ))}
          </div>
        )}
      </div>
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
        <svg className="vt-photo" viewBox="0 0 60 72" role="img" aria-label="Subject photo placeholder">
          <rect width="60" height="72" fill="#2a3036" />
          <circle cx="30" cy="28" r="12" fill="#58626b" />
          <path d="M8 72 C10 52 50 52 52 72 Z" fill="#58626b" />
        </svg>
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
