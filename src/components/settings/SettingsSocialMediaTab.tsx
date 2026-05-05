import React, { useCallback, useEffect, useState } from 'react';
import {
  Copy,
  Edit2,
  ExternalLink,
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  Loader2,
  MessageCircle,
  Plus,
  Save,
  Send,
  Share2,
  Trash2,
  Twitter,
  Youtube,
} from 'lucide-react';
import { Card, CardContent } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { getOrCreateCompanySettingsId } from '@/src/lib/branchCompanySettings';
import {
  createCompanySocialMedia,
  deleteCompanySocialMedia,
  fetchSocialForSettings,
  updateCompanySocialMedia,
  type CompanySocialRecord,
} from '@/src/lib/companySocialMediaSettings';
import { SOCIAL_MEDIA_PLATFORMS, type SocialMediaPlatform } from '@/src/lib/socialMediaPlatforms';

function getSocialIcon(platform: string) {
  switch (platform) {
    case 'Facebook':
      return <Facebook className="w-5 h-5" />;
    case 'Instagram':
      return <Instagram className="w-5 h-5" />;
    case 'LinkedIn':
      return <Linkedin className="w-5 h-5" />;
    case 'YouTube':
      return <Youtube className="w-5 h-5" />;
    case 'X (Twitter)':
      return <Twitter className="w-5 h-5" />;
    case 'Website':
      return <Globe className="w-5 h-5" />;
    case 'WhatsApp':
    case 'Viber':
    case 'LINE':
    case 'WeChat':
      return <MessageCircle className="w-5 h-5" />;
    case 'Telegram':
    case 'Discord':
      return <Send className="w-5 h-5" />;
    case 'TikTok':
    case 'Snapchat':
    case 'Threads':
    case 'Pinterest':
    case 'Reddit':
      return <Share2 className="w-5 h-5" />;
    case 'Google Business Profile':
      return <Globe className="w-5 h-5" />;
    default:
      return <Share2 className="w-5 h-5" />;
  }
}

function getSocialColor(platform: string): string {
  switch (platform) {
    case 'Facebook':
      return 'text-blue-600 bg-blue-100';
    case 'Instagram':
      return 'text-pink-600 bg-pink-100';
    case 'LinkedIn':
      return 'text-blue-700 bg-blue-100';
    case 'YouTube':
      return 'text-red-600 bg-red-100';
    case 'X (Twitter)':
      return 'text-slate-800 bg-slate-100';
    case 'TikTok':
      return 'text-gray-900 bg-gray-100';
    case 'WhatsApp':
      return 'text-green-700 bg-green-100';
    case 'Telegram':
      return 'text-sky-600 bg-sky-100';
    case 'Discord':
      return 'text-indigo-600 bg-indigo-100';
    case 'Pinterest':
      return 'text-red-700 bg-red-50';
    case 'Reddit':
      return 'text-orange-600 bg-orange-100';
    case 'Snapchat':
      return 'text-yellow-700 bg-yellow-100';
    case 'Google Business Profile':
      return 'text-blue-600 bg-blue-50';
    case 'LINE':
      return 'text-green-600 bg-green-50';
    case 'WeChat':
      return 'text-green-800 bg-green-100';
    case 'Website':
      return 'text-gray-600 bg-gray-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

type Draft = {
  platform: SocialMediaPlatform | string;
  url: string;
  is_active: boolean;
};

function emptyDraft(): Draft {
  return { platform: 'Facebook', url: '', is_active: true };
}

function recordToDraft(r: CompanySocialRecord): Draft {
  return {
    platform: r.platform as SocialMediaPlatform,
    url: r.url,
    is_active: r.is_active,
  };
}

function draftToInput(d: Draft) {
  return {
    platform: String(d.platform),
    url: d.url.trim(),
    is_active: d.is_active,
  };
}

export type SettingsSocialMediaTabProps = {
  branchId: string | null;
  branchLabel: string;
  addAuditLog: (action: string, entity: string, details: string) => void;
};

export function SettingsSocialMediaTab({ branchId, branchLabel, addAuditLog }: SettingsSocialMediaTabProps) {
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CompanySocialRecord[]>([]);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id?: string; draft: Draft } | null>(null);

  const reload = useCallback(async () => {
    if (!branchId) {
      setSettingsId(null);
      setRows([]);
      setLoadError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const sidRes = await getOrCreateCompanySettingsId(branchId, branchLabel);
    if ('error' in sidRes) {
      setSettingsId(null);
      setRows([]);
      setLoadError(sidRes.error);
      setLoading(false);
      return;
    }
    setSettingsId(sidRes.id);
    const list = await fetchSocialForSettings(sidRes.id);
    setRows(list);
    setLoading(false);
  }, [branchId, branchLabel]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const startAdd = () => setEditing({ draft: emptyDraft() });
  const startEdit = (r: CompanySocialRecord) => setEditing({ id: r.id, draft: recordToDraft(r) });
  const cancelEdit = () => setEditing(null);

  const saveDraft = async () => {
    if (!settingsId || !editing) return;
    const input = draftToInput(editing.draft);
    if (!input.url) {
      window.alert('URL is required.');
      return;
    }
    const key = editing.id ?? 'new';
    setSavingKey(key);
    try {
      if (editing.id) {
        const res = await updateCompanySocialMedia(editing.id, settingsId, input);
        if (!res.ok) {
          window.alert(res.error ?? 'Could not update.');
          return;
        }
        addAuditLog('Settings', 'Social media', `Updated ${input.platform} (${branchLabel})`);
      } else {
        const res = await createCompanySocialMedia(settingsId, input);
        if (!res.ok) {
          window.alert(res.error ?? 'Could not add.');
          return;
        }
        addAuditLog('Settings', 'Social media', `Added ${input.platform} (${branchLabel})`);
      }
      setEditing(null);
      await reload();
    } finally {
      setSavingKey(null);
    }
  };

  const removeRow = async (r: CompanySocialRecord) => {
    if (!settingsId) return;
    if (!window.confirm(`Remove ${r.platform} link?`)) return;
    setSavingKey(`del:${r.id}`);
    try {
      const res = await deleteCompanySocialMedia(r.id, settingsId);
      if (!res.ok) {
        window.alert(res.error ?? 'Could not delete.');
        return;
      }
      addAuditLog('Settings', 'Social media', `Removed ${r.platform} (${branchLabel})`);
      if (editing?.id === r.id) setEditing(null);
      await reload();
    } finally {
      setSavingKey(null);
    }
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy URL:', url);
    }
  };

  if (!branchId) {
    return (
      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        Select a branch in the header to manage social links for that branch.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm">Loading social links…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Social media</h2>
          <p className="text-sm text-gray-600 mt-1">
            External links for <strong>{branchLabel.trim() || 'this branch'}</strong>. Run{' '}
            <code className="text-xs bg-gray-100 px-1 rounded">database/alter_company_social_media.sql</code>{' '}
            if saves fail (missing columns or legacy enum).
          </p>
        </div>
        <Button
          type="button"
          className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
          disabled={!!editing || !settingsId || !!loadError}
          onClick={startAdd}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add platform
        </Button>
      </div>

      {loadError ? (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{loadError}</p>
      ) : null}

      {editing ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">{editing.id ? 'Edit link' : 'New link'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                <select
                  value={editing.draft.platform}
                  onChange={(e) =>
                    setEditing((x) => (x ? { ...x, draft: { ...x.draft, platform: e.target.value } } : x))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  {!(SOCIAL_MEDIA_PLATFORMS as readonly string[]).includes(editing.draft.platform) &&
                  editing.draft.platform.trim() ? (
                    <option value={editing.draft.platform}>{editing.draft.platform} (saved)</option>
                  ) : null}
                  {SOCIAL_MEDIA_PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                <input
                  value={editing.draft.url}
                  onChange={(e) =>
                    setEditing((x) => (x ? { ...x, draft: { ...x.draft, url: e.target.value } } : x))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="https://…"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.draft.is_active}
                    onChange={(e) =>
                      setEditing((x) =>
                        x ? { ...x, draft: { ...x.draft, is_active: e.target.checked } } : x,
                      )
                    }
                    className="rounded border-gray-300"
                  />
                  Show as active
                </label>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-700"
                disabled={!!savingKey}
                onClick={() => void saveDraft()}
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button type="button" variant="outline" disabled={!!savingKey} onClick={cancelEdit}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rows.map((social) => (
          <Card key={social.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-3 rounded-lg shrink-0 ${getSocialColor(social.platform)}`}>
                    {getSocialIcon(social.platform)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{social.platform}</h3>
                  </div>
                </div>
                {social.is_active ? (
                  <Badge className="bg-green-100 text-green-600 shrink-0">Active</Badge>
                ) : (
                  <Badge variant="outline" className="shrink-0">
                    Inactive
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mb-4 min-w-0">
                <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <a
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline truncate"
                >
                  {social.url}
                </a>
                <a
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-gray-400 hover:text-gray-600 shrink-0"
                  aria-label="Open link"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex gap-2 pt-4 border-t flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={!!editing || !!savingKey}
                  onClick={() => startEdit(social)}
                >
                  <Edit2 className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => void copyUrl(social.url)}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy URL
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:bg-red-50"
                  disabled={!!savingKey}
                  onClick={() => void removeRow(social)}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!editing && rows.length === 0 && !loadError ? (
        <p className="text-sm text-gray-500 text-center py-8">No links yet. Add a platform or run the seed SQL.</p>
      ) : null}
    </div>
  );
}
