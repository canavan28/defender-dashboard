import { useEffect, useRef, useState } from 'react';
import { useSeoAgent } from '../hooks/useSeoAgent';
import { Markdown } from '../components/Markdown';

// SEO Assistant: chat with Claude about infotank.com's SEO. Claude pulls
// live data from Google Analytics, Search Console, the website, WordPress
// and PageSpeed, plus a weekly BrightLocal snapshot (local rankings and
// reviews). Read-only: it recommends, people make the changes.

const TOOL_LABELS = {
  search_console_query: 'Search Console',
  ga4_report: 'Google Analytics',
  read_site_page: 'Read page',
  list_site_content: 'WordPress',
  pagespeed_check: 'PageSpeed',
  brightlocal_rankings: 'BrightLocal rankings',
  brightlocal_reviews: 'BrightLocal reviews',
  web_search: 'Web search'
};

const STARTER_QUESTIONS = [
  'Why aren\u2019t we getting more clicks from Google this month?',
  'How are our local map rankings doing, and what should we fix first?',
  'Look at our homepage and tell me what\u2019s missing for SEO.',
  'When did we last post a blog, and what should we write about next?'
];

function toolSummary(tools = []) {
  const counts = {};
  tools.forEach(t => {
    const label = TOOL_LABELS[t] || t;
    counts[label] = (counts[label] || 0) + 1;
  });
  return Object.entries(counts).map(([label, n]) => (n > 1 ? `${label} \u00d7${n}` : label)).join(' \u00b7 ');
}

function shortDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function daysAgo(iso) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export function SeoAssistant({ getToken }) {
  const {
    conversations, activeId, messages, loadingList, loadingConversation, sending, error, blStatus,
    loadConversations, loadStatus, openConversation, newConversation, send, removeConversation, clearError
  } = useSeoAgent(getToken);

  const [draft, setDraft] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    loadConversations();
    loadStatus();
  }, [loadConversations, loadStatus]);

  // Elapsed-seconds counter while the agent works.
  useEffect(() => {
    if (!sending) { setElapsed(0); return undefined; }
    const started = Date.now();
    const t = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(t);
  }, [sending]);

  // Keep the newest message in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const submit = async (text) => {
    const question = String(text ?? draft).trim();
    if (!question || sending) return;
    setDraft('');
    const ok = await send(question);
    if (!ok) setDraft(question);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleDelete = (e, conv) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${conv.title}"? This can't be undone.`)) removeConversation(conv.id);
  };

  const syncedDays = daysAgo(blStatus?.lastSyncAt);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
        <div>
          <div className="it-section-title">SEO Assistant</div>
          <div className="it-section-sub">
            Ask about infotank.com · live Google Analytics, Search Console, website and PageSpeed
            {syncedDays != null && ` · local rankings and reviews synced ${syncedDays === 0 ? 'today' : `${syncedDays} day${syncedDays === 1 ? '' : 's'} ago`}`}
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16,
        height: 'calc(100vh - 230px)', minHeight: 520
      }}>
        {/* Conversation list */}
        <div className="it-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <button
            onClick={newConversation}
            disabled={sending}
            className="it-btn primary"
            style={{ justifyContent: 'center', marginBottom: 10 }}
          >
            + New conversation
          </button>
          <div className="it-eyebrow" style={{ padding: '4px 6px 6px' }}>Your conversations</div>
          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {loadingList && conversations.length === 0 && (
              <p className="it-mono" style={{ fontSize: 12, color: 'var(--ink4)', padding: 6 }}>Loading…</p>
            )}
            {!loadingList && conversations.length === 0 && (
              <p className="it-mono" style={{ fontSize: 12, color: 'var(--ink4)', padding: 6 }}>None yet.</p>
            )}
            {conversations.map(c => {
              const active = c.id === activeId;
              return (
                <div
                  key={c.id}
                  onClick={() => openConversation(c.id)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 6,
                    padding: '8px 8px', borderRadius: 7, cursor: sending ? 'default' : 'pointer',
                    background: active ? 'var(--blue-soft)' : 'transparent'
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, color: active ? 'var(--blue)' : 'var(--ink)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                      {c.title}
                    </div>
                    <div className="it-mono" style={{ fontSize: 10.5, color: 'var(--ink4)', marginTop: 1 }}>
                      {shortDate(c.updatedAt)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, c)}
                    title="Delete conversation"
                    className="it-btn danger-ghost sm"
                    style={{ padding: '2px 6px' }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat */}
        <div className="it-card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            {loadingConversation && (
              <p className="it-mono" style={{ fontSize: 12, color: 'var(--ink4)' }}>Loading conversation…</p>
            )}

            {!loadingConversation && messages.length === 0 && !sending && (
              <div style={{ maxWidth: 560, margin: '40px auto 0', textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                  What do you want to know about our SEO?
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 18 }}>
                  Answers take 20–60 seconds while it pulls real data. It can look, but never changes anything.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {STARTER_QUESTIONS.map(q => (
                    <button
                      key={q}
                      onClick={() => submit(q)}
                      className="it-btn"
                      style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              m.role === 'user' ? (
                <div key={i} style={{ display: 'flex', justifyContent: 'flex-end', margin: '0 0 16px' }}>
                  <div style={{
                    maxWidth: '75%', background: 'var(--blue-soft)', border: '1px solid #d6e2fb',
                    borderRadius: 10, padding: '9px 13px', fontSize: 13.5, color: 'var(--ink)',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {m.text}
                  </div>
                </div>
              ) : (
                <div key={i} style={{ margin: '0 0 22px', maxWidth: 820 }}>
                  <Markdown text={m.text || '(No answer was produced.)'} />
                  {m.tools?.length > 0 && (
                    <div className="it-mono" style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 2 }}>
                      Checked: {toolSummary(m.tools)}
                    </div>
                  )}
                </div>
              )
            ))}

            {sending && (
              <div style={{ maxWidth: 420, margin: '4px 0 16px' }}>
                <div className="it-mono it-pulse" style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 8 }}>
                  Pulling data and thinking… {elapsed}s
                </div>
                <div className="it-progress" />
              </div>
            )}
          </div>

          {error && (
            <div style={{
              margin: '0 16px 10px', background: 'var(--red-soft)', border: '1px solid #fecaca',
              borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', gap: 12
            }}>
              <span className="it-mono" style={{ fontSize: 12, color: 'var(--red)' }}>{error}</span>
              <button onClick={clearError} className="it-btn ghost sm">Dismiss</button>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border)', padding: 12, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={sending ? 'Working on your last question…' : 'Ask a question (Enter to send, Shift+Enter for a new line)'}
              disabled={sending}
              rows={2}
              style={{
                flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-strong)',
                fontSize: 13.5, fontFamily: 'inherit', resize: 'none', lineHeight: 1.45,
                background: sending ? 'var(--slate-soft)' : 'white'
              }}
            />
            <button
              onClick={() => submit()}
              disabled={sending || !draft.trim()}
              className="it-btn primary"
            >
              {sending ? 'Working…' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}