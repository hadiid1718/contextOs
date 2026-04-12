import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Bot, Circle, History, Pause, Play, RefreshCcw, Search, Sparkles, Zap } from 'lucide-react';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Card from '../components/Card';
import GraphDetailPanel from '../components/graph/GraphDetailPanel';
import useOrg from '../hooks/useOrg';
import graphService from '../services/graphService';
import queryService from '../services/queryService';

const HISTORY_STORAGE_PREFIX = 'stackmind:query-history';

const formatShortDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
};

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const normalizeQueryError = (error) => {
  if (!error) return 'Unable to run the AI query right now.';
  const status = error?.response?.status || error?.status;
  if (error?.name === 'AbortError') return 'The query stream was stopped.';
  if (error?.response?.data?.message) return error.response.data.message;
  if (status === 401) return 'Your session expired. Please sign in again to continue querying.';
  if (status === 403) return 'You do not have access to query this organisation context.';
  if (status === 503) return 'The AI query module is temporarily disabled.';
  if (status === 429) return 'Monthly AI query limit reached. Upgrade to continue.';
  if (error?.details?.reason) return error.details.reason;
  if (error?.message) return error.message;
  return 'Unable to run the AI query right now.';
};

const TypingDots = () => (
  <span className="inline-flex items-center gap-1">
    {[0, 1, 2].map((index) => (
      <span
        key={index}
        className="h-2 w-2 rounded-full bg-brand animate-bounce"
        style={{ animationDelay: `${index * 120}ms` }}
        aria-hidden="true"
      />
    ))}
  </span>
);

const getStorageKey = (orgId) => `${HISTORY_STORAGE_PREFIX}:${orgId || 'global'}`;

const loadHistory = (orgId) => {
  try {
    const raw = localStorage.getItem(getStorageKey(orgId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveHistory = (orgId, items) => {
  localStorage.setItem(getStorageKey(orgId), JSON.stringify(items.slice(0, 12)));
};

const buildHistoryEntry = (turn) => ({
  id: turn.id,
  question: turn.question,
  answer: turn.answer,
  citations: turn.citations || [],
  graph_context: turn.graph_context || [],
  cached: Boolean(turn.cached),
  chunks_used: turn.chunks_used || 0,
  createdAt: turn.createdAt || new Date().toISOString(),
  latency_ms: turn.latency_ms ?? null,
});

const hashKey = (entry) => normalizeText(entry.question);

const Query = () => {
  const { organisations, currentOrg, setActiveOrg } = useOrg();
  const activatedOrgRef = useRef(null);
  const [question, setQuestion] = useState('');
  const [historyItems, setHistoryItems] = useState([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState(null);
  const [selectedGraphNodeId, setSelectedGraphNodeId] = useState(null);
  const [turn, setTurn] = useState(null);
  const [queryError, setQueryError] = useState('');
  const abortRef = useRef(null);
  const activeRunIdRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const activateContext = async () => {
      if (!currentOrg?.org_id) {
        activatedOrgRef.current = null;
        return;
      }

      if (activatedOrgRef.current === currentOrg.org_id) {
        return;
      }

      const activated = await setActiveOrg(currentOrg);
      if (mounted && activated) {
        activatedOrgRef.current = currentOrg.org_id;
      }
    };

    void activateContext();

    return () => {
      mounted = false;
    };
  }, [currentOrg, setActiveOrg]);

  useEffect(() => {
    if (!currentOrg?.org_id) {
      setHistoryItems([]);
      setSelectedHistoryId(null);
      return;
    }

    setHistoryItems(loadHistory(currentOrg.org_id));
  }, [currentOrg?.org_id]);

  const activeOrgLabel = useMemo(() => {
    if (currentOrg?.name) return currentOrg.name;
    if (organisations[0]?.name) return organisations[0].name;
    return 'No active organisation';
  }, [currentOrg, organisations]);

  const activeTurn = turn;
  const citations = activeTurn?.citations || [];
  const graphContext = activeTurn?.graph_context || [];
  const isStreaming = activeTurn?.status === 'connecting' || activeTurn?.status === 'streaming';
  const isRestored = activeTurn?.status === 'restored';
  const canSubmit = Boolean(normalizeText(question)) && !isStreaming;

  const selectedGraphNodeQuery = useQuery({
    queryKey: ['query', 'graph-node', selectedGraphNodeId || 'none'],
    queryFn: () => graphService.getNode(selectedGraphNodeId),
    enabled: Boolean(selectedGraphNodeId),
    refetchOnWindowFocus: false,
  });

  const selectedGraphChainQuery = useQuery({
    queryKey: ['query', 'graph-chain', selectedGraphNodeId || 'none'],
    queryFn: () => graphService.getCausalChain({ nodeId: selectedGraphNodeId, maxHops: 4 }),
    enabled: Boolean(selectedGraphNodeId),
    refetchOnWindowFocus: false,
  });

  const selectedGraphNode = selectedGraphNodeQuery.data?.data || selectedGraphNodeQuery.data || null;
  const selectedGraphChain = selectedGraphChainQuery.data?.data || selectedGraphChainQuery.data || null;
  const nodeMap = useMemo(() => {
    const map = new Map();
    (Array.isArray(selectedGraphChain?.nodes) ? selectedGraphChain.nodes : []).forEach((node) => {
      if (node?._id) map.set(node._id, node);
    });
    if (selectedGraphNode?._id) {
      map.set(selectedGraphNode._id, selectedGraphNode);
    }
    return map;
  }, [selectedGraphChain?.nodes, selectedGraphNode]);

  const relatedEdges = useMemo(() => {
    const edges = Array.isArray(selectedGraphChain?.edges) ? selectedGraphChain.edges : [];
    if (!selectedGraphNodeId) return edges;
    return edges.filter((edge) => edge.from_id === selectedGraphNodeId || edge.to_id === selectedGraphNodeId);
  }, [selectedGraphChain?.edges, selectedGraphNodeId]);

  const createOrUpdateHistory = (entry) => {
    if (!currentOrg?.org_id) return;

    const nextEntry = buildHistoryEntry(entry);
    const nextItems = [nextEntry, ...historyItems.filter((item) => hashKey(item) !== hashKey(nextEntry))];
    setHistoryItems(nextItems);
    saveHistory(currentOrg.org_id, nextItems);
  };

  const stopStream = () => {
    abortRef.current?.abort();
  };

  const resetActiveTurn = () => {
    setTurn(null);
    setQueryError('');
    setSelectedHistoryId(null);
    setSelectedGraphNodeId(null);
  };

  const restoreHistory = (entry) => {
    setSelectedHistoryId(entry.id);
    setQuestion(entry.question || '');
    setSelectedGraphNodeId(null);
    setQueryError('');
    setTurn({
      ...entry,
      status: 'restored',
    });
  };

  const clearHistory = () => {
    setHistoryItems([]);
    if (currentOrg?.org_id) {
      localStorage.removeItem(getStorageKey(currentOrg.org_id));
    }
  };

  const runQuery = async () => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || !currentOrg?.org_id || isStreaming) return;

    const runId = `query-${Date.now()}`;
    const controller = new AbortController();
    abortRef.current = controller;
    activeRunIdRef.current = runId;
    setQueryError('');
    setSelectedHistoryId(null);
    setSelectedGraphNodeId(null);
    setTurn({
      id: runId,
      question: trimmedQuestion,
      answer: '',
      citations: [],
      graph_context: [],
      cached: false,
      chunks_used: 0,
      status: 'connecting',
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      latency_ms: null,
    });

    try {
      const result = await queryService.run({
        orgId: currentOrg.org_id,
        question: trimmedQuestion,
        signal: controller.signal,
        onMeta: (meta) => {
          if (activeRunIdRef.current !== runId) return;
          setTurn((prev) => {
            if (!prev || prev.id !== runId) return prev;
            return {
              ...prev,
              status: 'streaming',
              cached: Boolean(meta?.cached),
              citations: Array.isArray(meta?.citations) ? meta.citations : prev.citations,
              graph_context: Array.isArray(meta?.graph_context) ? meta.graph_context : prev.graph_context,
              chunks_used: meta?.chunks_used ?? prev.chunks_used,
              latency_ms: meta?.latency_ms ?? prev.latency_ms,
            };
          });
        },
        onToken: (segment) => {
          if (activeRunIdRef.current !== runId) return;
          setTurn((prev) => {
            if (!prev || prev.id !== runId) return prev;
            return {
              ...prev,
              status: 'streaming',
              answer: `${prev.answer || ''}${segment}`,
            };
          });
        },
      });

      if (activeRunIdRef.current !== runId) return;

      setTurn((prev) => {
        if (!prev || prev.id !== runId) return prev;

        const finalTurn = {
          ...prev,
          status: 'done',
          answer: result?.answer || prev.answer,
          citations: result?.meta?.citations || prev.citations,
          graph_context: result?.meta?.graph_context || prev.graph_context,
          cached: Boolean(result?.meta?.cached ?? prev.cached),
          chunks_used: result?.meta?.chunks_used ?? prev.chunks_used,
          latency_ms: result?.meta?.latency_ms ?? prev.latency_ms,
          finishedAt: new Date().toISOString(),
        };

        createOrUpdateHistory(finalTurn);
        return finalTurn;
      });
    } catch (error) {
      if (controller.signal.aborted) {
        setTurn((prev) => (prev && prev.id === runId ? { ...prev, status: 'stopped' } : prev));
        return;
      }

      const friendly = normalizeQueryError(error);
      setQueryError(friendly);
      setTurn((prev) => (prev && prev.id === runId ? { ...prev, status: 'error', error: friendly } : prev));
    } finally {
      if (activeRunIdRef.current === runId) {
        abortRef.current = null;
      }
    }
  };

  const handleComposerKeyDown = (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      void runQuery();
    }
  };

  const handleSelectCitation = (citation) => {
    if (!citation?.node_id) return;
    setSelectedGraphNodeId(citation.node_id);
  };

  const historyCount = historyItems.length;
  const answerPreview = activeTurn?.answer?.trim() || '';
  const statusTone = activeTurn?.cached ? 'success' : isStreaming ? 'warning' : activeTurn?.status === 'error' ? 'error' : 'neutral';
  const activeStatusLabel = activeTurn?.cached ? 'Redis hit' : activeTurn?.status === 'restored' ? 'History' : activeTurn?.status === 'done' ? 'Completed' : isStreaming ? 'Streaming' : 'Idle';

  return (
    <div className="space-y-6">
      <Card
        title="Query"
        description="Full-page AI chat with SSE streaming, query history, source preview, and graph-linked citations."
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm text-text2">
              Active organisation: <span className="font-medium text-text">{activeOrgLabel}</span>
            </p>
            <p className="text-xs text-text3">
              Press <span className="font-medium text-text">CMD + Enter</span> to send. Use the stop button to cancel a live stream.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="success">
              <span className="inline-flex items-center gap-1">
                <Zap size={12} />
                SSE streaming
              </span>
            </Badge>
            <Badge tone={statusTone}>{activeStatusLabel}</Badge>
            <Badge tone="neutral">{historyCount} saved queries</Badge>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {[
            { label: 'Live tokens', value: activeTurn?.status === 'streaming' ? 'On' : 'Ready' },
            { label: 'Context preview', value: graphContext.length > 0 ? `${graphContext.length} sources` : 'Waiting' },
            { label: 'Cache state', value: activeTurn?.cached ? 'Redis hit' : 'Fresh run' },
            { label: 'Citations', value: citations.length > 0 ? `${citations.length} linked sources` : 'None yet' },
          ].map((metric) => (
            <div key={metric.label} className="rounded-xl border border-border bg-bg3 p-4">
              <p className="text-xs uppercase tracking-wide text-text3">{metric.label}</p>
              <p className="mt-2 text-sm font-semibold text-text">{metric.value}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)] xl:overflow-y-auto">
          <Card
            title="Query history"
            description="Past prompts load instantly from local cache. Redis hits are shown on the saved result cards."
          >
            <div className="space-y-2">
              <Button type="button" variant="secondary" onClick={clearHistory}>
                <History size={16} className="mr-2" />
                Clear local history
              </Button>
              <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                {historyItems.length === 0 ? (
                  <div className="rounded-xl border border-border bg-bg3 p-4 text-sm text-text3">
                    Your past queries will appear here after the first AI response.
                  </div>
                ) : (
                  historyItems.map((entry) => {
                    const active = selectedHistoryId === entry.id;
                    return (
                      <button
                        type="button"
                        key={entry.id}
                        onClick={() => restoreHistory(entry)}
                        className={`w-full rounded-xl border p-4 text-left transition ${
                          active ? 'border-brand/50 bg-brand/10' : 'border-border bg-bg3 hover:border-border-strong'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-text">{entry.question}</p>
                            <p className="mt-1 text-xs text-text3">{formatShortDate(entry.createdAt)}</p>
                          </div>
                          {entry.cached ? <Badge tone="success">Redis hit</Badge> : <Badge tone="neutral">Saved</Badge>}
                        </div>
                        <p className="mt-2 line-clamp-3 text-xs text-text2">{entry.answer || 'Answer restored instantly.'}</p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </Card>

          <Card title="Query shortcuts" description="Quick starters to keep the interaction feeling fast and modern.">
            <div className="space-y-2">
              {[
                'What changed in the last sprint?',
                'Summarize the latest incident response decisions.',
                'Which tickets are blocking the launch?',
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setQuestion(prompt)}
                  className="w-full rounded-xl border border-border bg-bg3 px-3 py-3 text-left text-sm text-text2 transition hover:border-border-strong hover:text-text"
                >
                  <span className="mr-2 inline-flex text-brand"><Sparkles size={14} /></span>
                  {prompt}
                </button>
              ))}
            </div>
          </Card>
        </aside>

        <main className="space-y-6">
          <Card
            title="Conversation"
            description="The answer streams word-by-word. Sources are revealed early so you can inspect the retrieval context before the response finishes."
          >
            <div className="space-y-5">
              {queryError ? (
                <div className="rounded-xl border border-error/20 bg-error/10 p-4 text-sm text-error">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">{queryError}</p>
                      <p className="mt-1 text-xs text-error/80">
                        You can retry the request, stop a live stream, or pick a previous query from the history rail.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="rounded-2xl border border-border bg-bg3/60 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-text3">Current question</p>
                    <p className="mt-1 text-base font-semibold text-text">{activeTurn?.question || 'Ask Stackmind anything about your organisation context.'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeTurn?.cached ? <Badge tone="success">Redis hit</Badge> : null}
                    {isRestored ? <Badge tone="neutral">History loaded</Badge> : null}
                    {isStreaming ? <Badge tone="warning">Live stream</Badge> : null}
                  </div>
                </div>

                <div className="mt-5 min-h-[180px] rounded-2xl border border-border bg-bg2 p-5">
                  {activeTurn ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-text3">
                          <Bot size={14} />
                          Assistant response
                        </div>
                        <div className="flex items-center gap-2 text-xs text-text3">
                          {activeTurn.status === 'connecting' || (isStreaming && !answerPreview) ? (
                            <>
                              <TypingDots />
                              <span>Thinking</span>
                            </>
                          ) : null}
                          {activeTurn.status === 'streaming' && answerPreview ? <span className="inline-flex items-center gap-1"><Circle size={8} className="fill-success text-success" />Streaming</span> : null}
                        </div>
                      </div>

                      <div className="prose prose-invert max-w-none whitespace-pre-wrap text-sm leading-7 text-text2">
                        {answerPreview || (isStreaming ? ' ' : 'Your answer will appear here.')}
                        {isStreaming ? <span className="ml-1 inline-block animate-pulse text-brand">▍</span> : null}
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full flex-col items-start justify-center gap-3 text-text3">
                      <div className="rounded-full border border-border bg-bg3 px-3 py-1 text-xs uppercase tracking-wide text-text3">
                        Ready to query
                      </div>
                      <p className="max-w-2xl text-sm">
                        Try a question about decisions, commits, tickets, messages, or docs. The assistant will stream a response and reveal linked sources below.
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" onClick={() => void runQuery()} disabled={!canSubmit}>
                    {isStreaming ? (
                      <>
                        <Pause size={16} className="mr-2" />
                        Streaming
                      </>
                    ) : (
                      <>
                        <Play size={16} className="mr-2" />
                        Send
                      </>
                    )}
                  </Button>
                  <Button type="button" variant="secondary" onClick={stopStream} disabled={!isStreaming}>
                    <RefreshCcw size={16} className="mr-2" />
                    Stop stream
                  </Button>
                  <Button type="button" variant="ghost" onClick={resetActiveTurn}>
                    Clear
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-bg3/60 p-4">
                <label className="block">
                  <span className="text-xs uppercase tracking-wide text-text3">Prompt</span>
                  <textarea
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    onKeyDown={handleComposerKeyDown}
                    placeholder="Ask a question about your graph, decisions, incidents, or retrieved context..."
                    className="mt-2 min-h-[140px] w-full rounded-2xl border border-border bg-bg2 px-4 py-3 text-sm text-text outline-none transition placeholder:text-text3 focus:border-border-strong"
                  />
                </label>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-text3">
                  <span>Send with CMD + Enter</span>
                  <span>{normalizeText(question).length} characters</span>
                </div>
              </div>
            </div>
          </Card>

          <Card
            title="Sources used"
            description="Expandable context preview of the top vector chunks and graph context used to generate this response."
          >
            <details open={Boolean(activeTurn)} className="group">
              <summary className="cursor-pointer list-none rounded-xl border border-border bg-bg3 px-4 py-3 text-sm font-medium text-text transition hover:border-border-strong">
                <span className="inline-flex items-center gap-2">
                  <Search size={14} />
                  Sources used
                </span>
                <span className="ml-2 text-xs text-text3">
                  {citations.length > 0 ? `${Math.min(10, citations.length)} retrieval chunks` : 'Waiting for the first metadata event'}
                </span>
              </summary>

              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-border bg-bg2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-text">Top vector chunks</p>
                    {activeTurn?.cached ? <Badge tone="success">Redis hit</Badge> : null}
                  </div>
                  {citations.length === 0 ? (
                    <p className="mt-3 text-sm text-text3">
                      Retrieval sources will appear here as soon as the backend emits the metadata event.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {citations.slice(0, 10).map((citation) => (
                        <div key={citation.id} className="rounded-xl border border-border bg-bg3 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-text">{citation.source || 'Unknown source'}</p>
                              <p className="text-xs text-text3">{citation.node_id || 'No graph node id'} · {citation.id}</p>
                            </div>
                            <Badge tone="neutral">{typeof citation.score === 'number' ? `${Math.round(citation.score * 100)}%` : 'n/a'}</Badge>
                          </div>
                          <p className="mt-2 text-sm text-text2">{citation.snippet}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-border bg-bg2 p-4">
                  <p className="text-sm font-semibold text-text">Graph context</p>
                  {graphContext.length === 0 ? (
                    <p className="mt-3 text-sm text-text3">Graph context appears here when the backend links causal nodes to the retrieved chunks.</p>
                  ) : (
                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {graphContext.slice(0, 10).map((item, index) => (
                        <div key={`${item.root_id || index}`} className="rounded-xl border border-border bg-bg3 p-3 text-sm text-text2">
                          <p className="text-xs uppercase tracking-wide text-text3">Root {index + 1}</p>
                          <p className="mt-1 font-medium text-text">{item.root_id || 'n/a'}</p>
                          <p className="mt-1 text-xs text-text3">{item.root_type || 'unknown'} · {item.node_count || 0} nodes · {item.edge_count || 0} edges</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </details>
          </Card>

          <Card
            title="Citation cards"
            description="Linked sources appear below the answer. Tap one to open its graph node drawer."
          >
            <div className="flex gap-3 overflow-x-auto pb-2">
              {citations.length === 0 ? (
                <div className="rounded-xl border border-border bg-bg3 px-4 py-3 text-sm text-text3">
                  Citations will appear here after the answer starts streaming.
                </div>
              ) : (
                citations.map((citation) => (
                  <button
                    key={`${citation.id}-${citation.node_id || 'none'}`}
                    type="button"
                    disabled={!citation.node_id}
                    onClick={() => handleSelectCitation(citation)}
                    className={`min-w-[220px] rounded-2xl border p-4 text-left transition ${
                      citation.node_id ? 'border-border bg-bg3 hover:border-border-strong' : 'border-border bg-bg3/60 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-text">{citation.source || 'Source'}</p>
                      <Badge tone="neutral">{citation.id}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-text3">{citation.node_id || 'No linked graph node'}</p>
                    <p className="mt-3 line-clamp-4 text-sm text-text2">{citation.snippet}</p>
                  </button>
                ))
              )}
            </div>
          </Card>

          {selectedGraphNodeId ? (
            <GraphDetailPanel
              node={selectedGraphNode}
              relatedEdges={relatedEdges}
              nodeMap={nodeMap}
              onClose={() => setSelectedGraphNodeId(null)}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
};

export default Query;

