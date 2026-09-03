import React, { useState, useMemo, useEffect } from 'react';
import {
  BrainCircuit,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Key,
  RefreshCw,
  Copy,
  Check,
  Code2,
  Database,
  Lock,
} from 'lucide-react';
import { BenchmarkRunRecord } from '../types/benchmark';
import {
  generateTrainingDatasets,
  generateHuggingFaceReadme,
  generateDatasetInfoJson,
  generateTrainingScript,
} from '../utils/hfDatasetExporter';

interface DatasetExporterViewProps {
  runs: BenchmarkRunRecord[];
  onOpenTokens?: () => void;
}

export const DatasetExporterView: React.FC<DatasetExporterViewProps> = ({ runs }) => {
  const targetRepo = 'GlimmaryKarl/DualBlind';

  // Hugging Face Write Token State (from localStorage or prompt modal)
  const [token, setToken] = useState<string>(() => {
    try {
      return localStorage.getItem('dualblind_hf_token') || '';
    } catch {
      return '';
    }
  });

  const [hasServerToken, setHasServerToken] = useState<boolean>(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState<boolean>(false);
  const [modalTokenInput, setModalTokenInput] = useState<string>('');

  // Push status
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishProgress, setPublishProgress] = useState<string | null>(null);
  const [publishSuccessUrl, setPublishSuccessUrl] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Check if server already has HF_TOKEN configured
  useEffect(() => {
    fetch('/api/huggingface/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.hasServerToken) {
          setHasServerToken(true);
        }
      })
      .catch(() => {});
  }, []);

  // Generate training datasets with strict 100% verification
  const { sftRecords, dpoRecords, stats } = useMemo(() => {
    return generateTrainingDatasets(runs, {
      targetRepo,
      requireStrict100Percent: true,
    });
  }, [runs]);

  // Robust UTF-8 to Base64 encoder for browser environments (supporting all Unicode characters)
  const encodeUtf8ToBase64 = (str: string): string => {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Direct client-to-Hugging Face Hub commit (bypasses serverless body size limits)
  const commitDirectToHf = async (
    authToken: string,
    repo: string,
    summary: string,
    files: Array<{ path: string; content: string }>
  ) => {
    const operations = files.map((f) => ({
      key: 'file',
      value: {
        path: f.path,
        content: encodeUtf8ToBase64(f.content),
        encoding: 'base64',
      },
      operation: 'addOrUpdate',
    }));

    const res = await fetch(`https://huggingface.co/api/datasets/${repo}/commit/main`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary,
        operations,
      }),
    });

    if (!res.ok) {
      let errMsg = `Hugging Face returned HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        errMsg = errJson.error || errJson.message || JSON.stringify(errJson);
      } catch {
        const text = await res.text().catch(() => '');
        if (text) errMsg = text;
      }
      throw new Error(errMsg);
    }

    return await res.json().catch(() => ({}));
  };

  // Commit via server proxy (for when server has HF_TOKEN environment variable configured)
  const commitViaServer = async (
    authToken: string | undefined,
    repo: string,
    summary: string,
    files: Array<{ path: string; content: string }>
  ) => {
    const res = await fetch('/api/huggingface/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: authToken || undefined,
        repoName: repo,
        isPrivate: false,
        summary,
        operations: files,
      }),
    });

    if (!res.ok) {
      let errMsg = `Server returned HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        errMsg = errJson.error || errJson.message || JSON.stringify(errJson);
      } catch {
        const text = await res.text().catch(() => '');
        if (text) {
          if (text.includes('Request Entity') || res.status === 413) {
            errMsg = 'Request payload exceeded server proxy limit (413). Please provide your Hugging Face write token directly.';
          } else {
            errMsg = text;
          }
        }
      }
      throw new Error(errMsg);
    }

    const data = await res.json().catch(() => ({ success: true }));
    if (data && data.success === false) {
      throw new Error(data.error || 'Server publishing failed');
    }
    return data;
  };

  // Execute Push to Hugging Face
  const executePush = async (authToken?: string) => {
    const activeToken = (authToken !== undefined ? authToken : token).trim();

    // If neither server has a token nor client has a stored token, open prompt modal
    if (!hasServerToken && !activeToken) {
      setModalTokenInput(token);
      setIsTokenModalOpen(true);
      return;
    }

    setIsPublishing(true);
    setPublishError(null);
    setPublishSuccessUrl(null);
    setPublishProgress('Validating 100% ground-truth verified records...');

    try {
      if (sftRecords.length === 0) {
        throw new Error('No 100% verified ground-truth runs found to export. Strict Quality Gate requires accuracy = 100%.');
      }

      // Prepare training records
      const sftJsonl = sftRecords.map((r) => JSON.stringify(r)).join('\n');
      const dpoJsonl = dpoRecords.map((r) => JSON.stringify(r)).join('\n');
      const readme = generateHuggingFaceReadme(targetRepo, stats, sftRecords.length, dpoRecords.length);
      const datasetInfo = generateDatasetInfoJson(targetRepo, sftRecords.length, dpoRecords.length);
      const trainScript = generateTrainingScript(targetRepo);

      const metadataOps = [
        { path: 'README.md', content: readme },
        { path: 'dataset_info.json', content: datasetInfo },
        { path: 'scripts/train_unsloth.py', content: trainScript },
      ];

      // Strategy: When client has active token, push directly to Hugging Face Hub (CORS supported, 25MB limit)
      if (activeToken) {
        setPublishProgress('Checking repository on Hugging Face Hub...');
        try {
          await fetch('https://huggingface.co/api/repos/create', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${activeToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: targetRepo.includes('/') ? targetRepo.split('/')[1] : targetRepo,
              type: 'dataset',
              private: false,
            }),
          });
        } catch (e) {
          console.warn('Hugging Face repo initialization notice:', e);
        }

        setPublishProgress('Step 1/3: Committing metadata, dataset cards & training scripts...');
        await commitDirectToHf(
          activeToken,
          targetRepo,
          `Initialize ${targetRepo} dataset documentation and training scripts`,
          metadataOps
        );

        setPublishProgress(`Step 2/3: Committing SFT reasoning traces (${sftRecords.length} records)...`);
        await commitDirectToHf(
          activeToken,
          targetRepo,
          `Upload 100% verified SFT reasoning traces (${sftRecords.length} records)`,
          [{ path: 'data/sft_reasoning_train.jsonl', content: sftJsonl }]
        );

        setPublishProgress(`Step 3/3: Committing DPO preference pairs (${dpoRecords.length} pairs)...`);
        await commitDirectToHf(
          activeToken,
          targetRepo,
          `Upload 100% verified DPO preference pairs (${dpoRecords.length} pairs)`,
          [{ path: 'data/dpo_preferences_train.jsonl', content: dpoJsonl }]
        );
      } else {
        // Fallback: Commit sequentially through server endpoints
        setPublishProgress('Step 1/3: Uploading metadata & training scripts via server...');
        await commitViaServer(
          undefined,
          targetRepo,
          `Initialize ${targetRepo} documentation`,
          metadataOps
        );

        setPublishProgress(`Step 2/3: Uploading SFT reasoning traces (${sftRecords.length} records)...`);
        await commitViaServer(
          undefined,
          targetRepo,
          `Upload SFT reasoning traces (${sftRecords.length} records)`,
          [{ path: 'data/sft_reasoning_train.jsonl', content: sftJsonl }]
        );

        setPublishProgress(`Step 3/3: Uploading DPO preference pairs (${dpoRecords.length} pairs)...`);
        await commitViaServer(
          undefined,
          targetRepo,
          `Upload DPO preference pairs (${dpoRecords.length} pairs)`,
          [{ path: 'data/dpo_preferences_train.jsonl', content: dpoJsonl }]
        );
      }

      setPublishSuccessUrl(`https://huggingface.co/datasets/${targetRepo}`);
      setPublishProgress('Done! Verified datasets successfully published to Hugging Face.');
    } catch (err: any) {
      const msg = err?.message || 'Network error communicating with Hugging Face Hub.';
      setPublishError(msg);
      if (
        msg.includes('401') ||
        msg.includes('403') ||
        msg.includes('unauthorized') ||
        msg.includes('Token') ||
        msg.includes('Invalid') ||
        msg.includes('permission')
      ) {
        setIsTokenModalOpen(true);
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSaveModalTokenAndPush = () => {
    const trimmed = modalTokenInput.trim();
    if (trimmed) {
      setToken(trimmed);
      try {
        localStorage.setItem('dualblind_hf_token', trimmed);
      } catch {}
    }
    setIsTokenModalOpen(false);
    executePush(trimmed);
  };

  const pythonSnippet = `# Load DualBlind 100% verified reasoning dataset directly from Hugging Face:
from datasets import load_dataset

# Load SFT reasoning traces
sft_dataset = load_dataset("${targetRepo}", data_files="data/sft_reasoning_train.jsonl")
print(f"Loaded {len(sft_dataset['train'])} verified reasoning traces")

# Load DPO preference pairs
dpo_dataset = load_dataset("${targetRepo}", data_files="data/dpo_preferences_train.jsonl")
print(f"Loaded {len(dpo_dataset['train'])} DPO preference pairs")`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(pythonSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Data Pipeline Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-2xs">
                <BrainCircuit className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Data pipeline
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Training Data Pipeline
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              Synthesizes double-blind arena benchmark consensus into Supervised Fine-Tuning (SFT) reasoning traces and Direct Preference Optimization (DPO) preference pairs for <strong>{targetRepo}</strong>.
            </p>
          </div>

          {/* Quick Push Action */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={() => executePush()}
              disabled={isPublishing || runs.length === 0}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white hover:bg-indigo-500 cursor-pointer shadow-sm transition-all disabled:opacity-50"
            >
              {isPublishing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>{publishProgress || `Pushing to ${targetRepo}...`}</span>
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4" />
                  <span>Push Data</span>
                </>
              )}
            </button>

            {!hasServerToken && (
              <button
                onClick={() => {
                  setModalTokenInput(token);
                  setIsTokenModalOpen(true);
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                title="Configure Hugging Face Access Token"
              >
                <Key className="h-3.5 w-3.5 text-slate-500" />
                <span>{token ? 'Token Saved' : 'Set Token'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Pipeline Overview Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Arena Runs
            </div>
            <div className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
              {stats.totalRuns}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Evaluated benchmark trials
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/50 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
            <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
              SFT Reasoning Traces
            </div>
            <div className="mt-1 text-2xl font-black text-indigo-950 dark:text-indigo-200">
              {stats.sftSamples}
            </div>
            <div className="text-[11px] text-indigo-600/80 dark:text-indigo-300/80 mt-0.5">
              Verified ground-truth proofs
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              DPO Preference Pairs
            </div>
            <div className="mt-1 text-2xl font-black text-amber-950 dark:text-amber-200">
              {stats.dpoPairs}
            </div>
            <div className="text-[11px] text-amber-600/80 dark:text-amber-300/80 mt-0.5">
              Chosen vs refuted logic
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Target Repository
            </div>
            <div className="mt-1 text-base font-mono font-bold text-slate-900 dark:text-white truncate">
              {targetRepo}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Hugging Face Dataset
            </div>
          </div>
        </div>

        {/* In-Flight Progress Banner */}
        {isPublishing && publishProgress && (
          <div className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50/80 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 flex items-center gap-3 text-xs">
            <RefreshCw className="h-4 w-4 animate-spin text-indigo-600 shrink-0" />
            <div className="space-y-0.5">
              <span className="font-bold text-slate-900 dark:text-white">Pushing Dataset to Hugging Face Hub:</span>
              <p className="text-slate-600 dark:text-slate-300 font-mono text-[11px]">{publishProgress}</p>
            </div>
          </div>
        )}

        {/* Success Banner */}
        {publishSuccessUrl && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-5 dark:border-emerald-800 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 space-y-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <h4 className="font-bold text-sm">Data Successfully Pushed to Hugging Face!</h4>
            </div>
            <p className="text-xs text-emerald-800 dark:text-emerald-300">
              Training data records have been committed to <strong>{targetRepo}</strong>.
            </p>
            <div className="pt-1">
              <a
                href={publishSuccessUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-xs transition-all"
              >
                <span>View on Hugging Face Hub</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* Error Notice */}
        {publishError && (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 flex items-start gap-2.5 text-xs">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Push Notice:</strong>
              <span>{publishError}</span>
            </div>
          </div>
        )}
      </div>

      {/* Dataset Access & Integration Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Code2 className="h-3.5 w-3.5" />
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Dataset Access & Fine-Tuning
            </h3>
          </div>

          <button
            onClick={handleCopyCode}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer self-start sm:self-auto"
          >
            {copiedCode ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-600">Copied Python Code</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Python Snippet</span>
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          The dataset is formatted for PyTorch, Unsloth, Hugging Face TRL, and Axolotl. You can load both the SFT reasoning traces and DPO preference sets directly in Python:
        </p>

        <div className="relative rounded-2xl bg-slate-950 p-4 font-mono text-xs text-slate-200 overflow-x-auto border border-slate-800">
          <pre className="leading-relaxed">{pythonSnippet}</pre>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Database className="h-4 w-4 text-indigo-500" />
            <span>Direct HF URL: <a href={`https://huggingface.co/datasets/${targetRepo}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline dark:text-indigo-400 font-mono">huggingface.co/datasets/{targetRepo}</a></span>
          </div>
          <div className="text-[11px]">
            Compatible with Unsloth, Llama-Factory, HuggingFace TRL, and Axolotl
          </div>
        </div>
      </div>

      {/* Hugging Face Token Modal */}
      {isTokenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <Key className="h-3.5 w-3.5" />
                </span>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Hugging Face Write Token
                </h4>
              </div>
              <button
                onClick={() => setIsTokenModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Hugging Face requires write authorization to commit dataset files to <strong>{targetRepo}</strong>. Enter your token once, and it will be saved locally for seamless 1-click pushes.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Access Token (write permissions)
              </label>
              <input
                type="password"
                value={modalTokenInput}
                onChange={(e) => setModalTokenInput(e.target.value)}
                placeholder="hf_..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
                <span>Stored in browser local storage</span>
                <a
                  href="https://huggingface.co/settings/tokens"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 hover:underline dark:text-indigo-400 inline-flex items-center gap-0.5"
                >
                  <span>Get Free Token</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsTokenModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveModalTokenAndPush}
                disabled={!modalTokenInput.trim()}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-500 cursor-pointer disabled:opacity-50 transition-all"
              >
                Save & Push Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
