import type { Board, BoardCommand, FoundEvidence, KnownInfo } from "@vanta/shared";
import { useState } from "react";
import { shortId } from "../game/session";

export interface BoardPanelProps {
  board: Board;
  evidence: FoundEvidence[];
  knowledge: KnownInfo[];
  send: (cmd: BoardCommand) => void;
  self?: string;
}

/** Shared case board. Players connect things themselves; nothing here is ever marked true or false. */
export function BoardPanel({ board, evidence, knowledge, send, self }: BoardPanelProps) {
  const [noteTitle, setNoteTitle] = useState("");
  const [noteText, setNoteText] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [label, setLabel] = useState("");
  const pinned = new Set(board.entries.map((e) => e.refId).filter(Boolean));
  const title = (id: string) => board.entries.find((e) => e.id === id)?.title ?? "?";

  return (
    <div className="vt-board">
      <div className="vt-title">CASE BOARD · shared with your team · B to close</div>
      <div className="vt-board-cols">
        <div className="vt-board-main">
          {board.entries.length === 0 && <div className="vt-muted">Nothing pinned yet.</div>}
          <div className="vt-cards">
            {board.entries.map((e) => (
              <div key={e.id} className={`vt-card vt-card-${e.kind}`}>
                <div className="vt-label">
                  {e.kind.toUpperCase()} · {shortId(e.addedBy)}
                  {e.addedBy === self && (
                    <button className="vt-x" onClick={() => send({ type: "removeEntry", entryId: e.id })}>
                      ×
                    </button>
                  )}
                </div>
                <div>{e.title}</div>
                {e.text && <div className="vt-muted vt-small">{e.text}</div>}
              </div>
            ))}
          </div>
          <div className="vt-title" style={{ marginTop: 8 }}>
            LINKS
          </div>
          {board.links.map((l) => (
            <div key={l.id} className="vt-small">
              {title(l.from)} — <i>{l.label || "related"}</i> — {title(l.to)}
              {l.addedBy === self && (
                <button className="vt-x" onClick={() => send({ type: "removeLink", linkId: l.id })}>
                  ×
                </button>
              )}
            </div>
          ))}
          {board.entries.length >= 2 && (
            <div className="vt-form">
              <select value={from} onChange={(e) => setFrom(e.target.value)}>
                <option value="">from…</option>
                {board.entries.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
              <input placeholder="relation" value={label} onChange={(e) => setLabel(e.target.value)} />
              <select value={to} onChange={(e) => setTo(e.target.value)}>
                <option value="">to…</option>
                {board.entries.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
              <button
                disabled={!from || !to || from === to}
                onClick={() => {
                  send({ type: "link", from, to, label });
                  setLabel("");
                }}
              >
                Link
              </button>
            </div>
          )}
        </div>
        <div className="vt-board-side">
          <div className="vt-title">YOURS</div>
          {evidence.length + knowledge.length === 0 && <div className="vt-muted vt-small">You hold nothing yet.</div>}
          {evidence.map((f) => (
            <div key={f.item.id} className="vt-row">
              <div>{f.item.title}</div>
              <div className="vt-muted vt-small">{f.item.description}</div>
              <button disabled={pinned.has(f.item.id)} onClick={() => send({ type: "pinEvidence", evidenceId: f.item.id })}>
                {pinned.has(f.item.id) ? "Pinned" : "Pin to board"}
              </button>
            </div>
          ))}
          {knowledge.map((k) => (
            <div key={k.item.id} className="vt-row">
              <div>{k.item.label}</div>
              <button disabled={pinned.has(k.item.id)} onClick={() => send({ type: "pinInfo", itemId: k.item.id })}>
                {pinned.has(k.item.id) ? "Pinned" : "Pin to board"}
              </button>
            </div>
          ))}
          <div className="vt-title" style={{ marginTop: 8 }}>
            NOTE
          </div>
          <div className="vt-form vt-form-col">
            <input placeholder="title" maxLength={60} value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} />
            <textarea placeholder="text" maxLength={280} rows={3} value={noteText} onChange={(e) => setNoteText(e.target.value)} />
            <button
              disabled={!noteTitle.trim()}
              onClick={() => {
                send({ type: "addNote", title: noteTitle, text: noteText });
                setNoteTitle("");
                setNoteText("");
              }}
            >
              Add note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
