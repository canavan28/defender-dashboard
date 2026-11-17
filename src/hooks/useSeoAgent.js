import { useState, useCallback, useMemo } from 'react';
import { createApi } from '../utils/api';

// Turns "API error 502: {"error":"..."}" into just the readable message.
function friendlyError(err) {
  const msg = String(err?.message || err || 'Something went wrong');
  const m = msg.match(/^API error (\d+): ([\s\S]*)$/);
  if (!m) return msg;
  try {
    const body = JSON.parse(m[2]);
    return body.error ? `${body.error} (error ${m[1]})` : msg;
  } catch {
    return msg;
  }
}

export function useSeoAgent(getToken) {
  // Memoized — an api object rebuilt on every render is the same bug class
  // as the runaway re-render loop fixed earlier in App.jsx.
  const api = useMemo(() => createApi(getToken), [getToken]);

  const [conversations, setConversations] = useState([]);  // [{ id, title, createdAt, updatedAt }]
  const [activeId, setActiveId] = useState(null);          // null = new, unsaved conversation
  const [messages, setMessages] = useState([]);            // [{ role, text, tools? }]
  const [loadingList, setLoadingList] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [blStatus, setBlStatus] = useState(null);

  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      setConversations((await api.seoAgent.conversations()) || []);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoadingList(false);
    }
  }, [api]);

  const loadStatus = useCallback(async () => {
    try {
      setBlStatus(await api.seoAgent.brightlocalStatus());
    } catch {
      // Status is a nice-to-have footnote; ignore failures.
    }
  }, [api]);

  const openConversation = useCallback(async (id) => {
    if (sending) return;
    setActiveId(id);
    setMessages([]);
    setError(null);
    setLoadingConversation(true);
    try {
      const conv = await api.seoAgent.conversation(id);
      setMessages(conv.messages || []);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoadingConversation(false);
    }
  }, [api, sending]);

  const newConversation = useCallback(() => {
    if (sending) return;
    setActiveId(null);
    setMessages([]);
    setError(null);
  }, [sending]);

  // Returns true on success, false on failure (so the screen can put the
  // question back in the box instead of losing it).
  const send = useCallback(async (text) => {
    const message = String(text || '').trim();
    if (!message || sending) return false;
    setError(null);
    setSending(true);
    setMessages(prev => [...prev, { role: 'user', text: message }]);
    try {
      const res = await api.seoAgent.chat(message, activeId);
      setActiveId(res.conversation_id);
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: res.reply,
        tools: (res.tool_calls || []).map(t => t.name)
      }]);
      loadConversations();
      return true;
    } catch (err) {
      setMessages(prev => prev.slice(0, -1));
      setError(friendlyError(err));
      return false;
    } finally {
      setSending(false);
    }
  }, [api, activeId, sending, loadConversations]);

  const removeConversation = useCallback(async (id) => {
    try {
      await api.seoAgent.remove(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (id === activeId) {
        setActiveId(null);
        setMessages([]);
      }
    } catch (err) {
      setError(friendlyError(err));
    }
  }, [api, activeId]);

  const clearError = useCallback(() => setError(null), []);

  return {
    conversations, activeId, messages, loadingList, loadingConversation, sending, error, blStatus,
    loadConversations, loadStatus, openConversation, newConversation, send, removeConversation, clearError
  };
}