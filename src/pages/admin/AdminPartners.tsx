import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { AdminLayout, logAdminAction } from '../../components/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import {
  Search, Plus, Edit2, Trash2, X, Star, CheckCircle, AlertCircle,
  ChevronLeft, ChevronRight, Eye, EyeOff, Shield,
} from 'lucide-react';

interface LegalPartner {
  id: string;
  name: string;
  firm_name: string;
  city: string;
  specialisation: string[];
  contact_email: string;
  contact_phone: string;
  profile_url: string;
  verified: boolean;
  rating: number;
  review_count: number;
  active: boolean;
  created_at: string;
}

interface DesignPartner {
  id: string;
  name: string;
  firm_name: string;
  city: string;
  style_specialty: string[];
  portfolio_url: string;
  contact_email: string;
  contact_phone: string;
  verified: boolean;
  rating: number;
  review_count: number;
  active: boolean;
  created_at: string;
}

type Partner = LegalPartner | DesignPartner;
type TabType = 'legal' | 'design';

const PAGE_SIZE = 15;

function renderStars(rating: number) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i <= Math.round(rating)
              ? 'fill-gold text-gold'
              : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
}

interface ModalState {
  isOpen: boolean;
  partner: Partner | null;
  isEditing: boolean;
}

function isLegalPartner(partner: Partner): partner is LegalPartner {
  return 'specialisation' in partner;
}

function isDesignPartner(partner: Partner): partner is DesignPartner {
  return 'style_specialty' in partner;
}

export function AdminPartners() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabType>('legal');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    partner: null,
    isEditing: false,
  });

  const getTableName = () => tab === 'legal' ? 'legal_partners' : 'design_partners';
  const getSpecialtyField = () => tab === 'legal' ? 'specialisation' : 'style_specialty';

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from(getTableName())
      .select('*', { count: 'exact' });

    if (search) {
      q = q.or(`name.ilike.%${search}%,firm_name.ilike.%${search}%,city.ilike.%${search}%`);
    }

    q = q.order('created_at', { ascending: false }).range(
      page * PAGE_SIZE,
      page * PAGE_SIZE + PAGE_SIZE - 1
    );

    const { data, count, error: err } = await q;
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    setPartners(data ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, search, tab]);

  useEffect(() => {
    setPage(0);
  }, [tab]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const handleOpenModal = (partner?: Partner) => {
    if (partner) {
      setModal({
        isOpen: true,
        partner: { ...partner },
        isEditing: true,
      });
    } else {
      const newPartner: Partner = tab === 'legal'
        ? {
            id: '',
            name: '',
            firm_name: '',
            city: '',
            specialisation: [],
            contact_email: '',
            contact_phone: '',
            profile_url: '',
            verified: false,
            rating: 0,
            review_count: 0,
            active: true,
            created_at: new Date().toISOString(),
          }
        : {
            id: '',
            name: '',
            firm_name: '',
            city: '',
            style_specialty: [],
            portfolio_url: '',
            contact_email: '',
            contact_phone: '',
            verified: false,
            rating: 0,
            review_count: 0,
            active: true,
            created_at: new Date().toISOString(),
          };

      setModal({
        isOpen: true,
        partner: newPartner,
        isEditing: false,
      });
    }
  };

  const handleCloseModal = () => {
    setModal({
      isOpen: false,
      partner: null,
      isEditing: false,
    });
    setError(null);
  };

  const handleSavePartner = async () => {
    if (!modal.partner) return;

    const partner = modal.partner;
    if (!partner.name || !partner.firm_name || !partner.city || !partner.contact_email) {
      setError('Please fill in all required fields');
      return;
    }

    setActionLoading(partner.id || 'new');

    try {
      const dataToSave = tab === 'legal'
        ? {
            name: partner.name,
            firm_name: partner.firm_name,
            city: partner.city,
            specialisation: (partner as LegalPartner).specialisation,
            contact_email: partner.contact_email,
            contact_phone: partner.contact_phone,
            profile_url: (partner as LegalPartner).profile_url,
            rating: partner.rating,
            review_count: partner.review_count,
            verified: partner.verified,
            active: partner.active,
          }
        : {
            name: partner.name,
            firm_name: partner.firm_name,
            city: partner.city,
            style_specialty: (partner as DesignPartner).style_specialty,
            portfolio_url: (partner as DesignPartner).portfolio_url,
            contact_email: partner.contact_email,
            contact_phone: partner.contact_phone,
            rating: partner.rating,
            review_count: partner.review_count,
            verified: partner.verified,
            active: partner.active,
          };

      if (modal.isEditing && partner.id) {
        const { error: err } = await supabase
          .from(getTableName())
          .update(dataToSave)
          .eq('id', partner.id);

        if (err) {
          setError(err.message);
          setActionLoading(null);
          return;
        }

        await logAdminAction(
          supabase,
          user!.email!,
          `update_${tab}_partner`,
          getTableName(),
          partner.id,
          { name: partner.name }
        );
      } else {
        const { error: err } = await supabase
          .from(getTableName())
          .insert([dataToSave]);

        if (err) {
          setError(err.message);
          setActionLoading(null);
          return;
        }

        await logAdminAction(
          supabase,
          user!.email!,
          `create_${tab}_partner`,
          getTableName(),
          undefined,
          { name: partner.name }
        );
      }

      handleCloseModal();
      await fetchPartners();
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeletePartner = async (id: string) => {
    setActionLoading(id);
    try {
      const { error: err } = await supabase
        .from(getTableName())
        .delete()
        .eq('id', id);

      if (err) {
        setError(err.message);
        setActionLoading(null);
        return;
      }

      await logAdminAction(
        supabase,
        user!.email!,
        `delete_${tab}_partner`,
        getTableName(),
        id
      );

      setConfirmDelete(null);
      await fetchPartners();
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (partner: Partner) => {
    setActionLoading(partner.id);
    try {
      const { error: err } = await supabase
        .from(getTableName())
        .update({ active: !partner.active })
        .eq('id', partner.id);

      if (err) {
        setError(err.message);
        setActionLoading(null);
        return;
      }

      await logAdminAction(
        supabase,
        user!.email!,
        `toggle_${tab}_partner_active`,
        getTableName(),
        partner.id,
        { active: !partner.active }
      );

      await fetchPartners();
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleVerified = async (partner: Partner) => {
    setActionLoading(partner.id);
    try {
      const { error: err } = await supabase
        .from(getTableName())
        .update({ verified: !partner.verified })
        .eq('id', partner.id);

      if (err) {
        setError(err.message);
        setActionLoading(null);
        return;
      }

      await logAdminAction(
        supabase,
        user!.email!,
        `toggle_${tab}_partner_verified`,
        getTableName(),
        partner.id,
        { verified: !partner.verified }
      );

      await fetchPartners();
    } finally {
      setActionLoading(null);
    }
  };

  const stats = {
    total,
    verified: partners.filter(p => p.verified).length,
    active: partners.filter(p => p.active).length,
    avgRating: partners.length > 0
      ? (partners.reduce((sum, p) => sum + p.rating, 0) / partners.length).toFixed(1)
      : '0',
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex gap-2 border-b border-gray-200">
          {['legal', 'design'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t as TabType)}
              className={`px-4 py-3 font-medium text-sm capitalize transition-all border-b-2 ${
                tab === t
                  ? 'border-navy text-navy'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'legal' ? 'Legal Partners' : 'Design Partners'}
            </button>
          ))}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, icon: '📊' },
            { label: 'Verified', value: stats.verified, icon: '✓' },
            { label: 'Active', value: stats.active, icon: '⚡' },
            { label: 'Avg Rating', value: stats.avgRating, icon: '⭐' },
          ].map(stat => (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-gray-100 p-4"
            >
              <p className="text-xs text-gray-500 font-medium uppercase">{stat.label}</p>
              <p className="text-2xl font-display font-bold text-navy mt-1">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search by name, firm, city..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
            />
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-navy text-cream rounded-xl text-sm font-medium hover:bg-navy/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Partner
          </button>
        </div>

        {/* Partners Table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {[
                    'Name',
                    'City',
                    'Rating',
                    'Approved',
                    'Active',
                    'Contact',
                    'Specialties',
                    'Actions',
                  ].map(h => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-display font-semibold text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={8} className="px-4 py-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : partners.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">
                      No partners found
                    </td>
                  </tr>
                ) : (
                  partners.map(p => (
                    <tr
                      key={p.id}
                      className={`hover:bg-gray-50 transition-colors ${!p.active ? 'opacity-50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-navy">{p.name}</div>
                        <div className="text-xs text-gray-400">{p.firm_name}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.city}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {renderStars(p.rating)}
                          <span className="text-xs text-gray-500">
                            ({p.review_count})
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleVerified(p)}
                          disabled={actionLoading === p.id}
                          className="transition-colors"
                          title={p.verified ? 'Verified' : 'Not verified'}
                        >
                          <Shield
                            className={`w-4 h-4 ${
                              p.verified
                                ? 'text-gold fill-gold'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(p)}
                          disabled={actionLoading === p.id}
                          className="transition-colors"
                          title={p.active ? 'Active' : 'Inactive'}
                        >
                          {p.active ? (
                            <Eye className="w-4 h-4 text-gold" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-gray-300" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        <div>{p.contact_email}</div>
                        <div className="text-gray-400">{p.contact_phone}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(tab === 'legal'
                            ? (p as LegalPartner).specialisation
                            : (p as DesignPartner).style_specialty
                          )
                            .slice(0, 2)
                            .map((spec, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-navy/8 text-navy rounded text-xs font-medium"
                              >
                                {spec}
                              </span>
                            ))}
                          {(tab === 'legal'
                            ? (p as LegalPartner).specialisation.length
                            : (p as DesignPartner).style_specialty.length
                          ) > 2 && (
                            <span className="px-2 py-0.5 text-gray-500 text-xs">
                              +
                              {(tab === 'legal'
                                ? (p as LegalPartner).specialisation.length
                                : (p as DesignPartner).style_specialty.length
                              ) - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenModal(p)}
                            title="Edit"
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setConfirmDelete({ id: p.id, name: p.name })
                            }
                            title="Delete"
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > 0 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of{' '}
                {total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium">{page + 1}</span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={(page + 1) * PAGE_SIZE >= total}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modal.isOpen && modal.partner && (
        <PartnerModal
          isOpen={modal.isOpen}
          partner={modal.partner}
          tab={tab}
          isEditing={modal.isEditing}
          onClose={handleCloseModal}
          onSave={handleSavePartner}
          onPartnerChange={partner =>
            setModal(m => ({ ...m, partner }))
          }
          isLoading={!!actionLoading}
          error={error}
        />
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-serif font-bold text-navy text-lg mb-2">
              Delete Partner?
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete <strong>{confirmDelete.name}</strong>?
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleDeletePartner(confirmDelete.id)
                }
                disabled={!!actionLoading}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-display font-semibold disabled:opacity-50 hover:bg-red-700 transition-colors"
              >
                {actionLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

interface PartnerModalProps {
  isOpen: boolean;
  partner: Partner;
  tab: TabType;
  isEditing: boolean;
  onClose: () => void;
  onSave: () => void;
  onPartnerChange: (partner: Partner) => void;
  isLoading: boolean;
  error: string | null;
}

function PartnerModal({
  isOpen,
  partner,
  tab,
  isEditing,
  onClose,
  onSave,
  onPartnerChange,
  isLoading,
  error,
}: PartnerModalProps) {
  const [specialtyInput, setSpecialtyInput] = useState('');

  const handleAddSpecialty = () => {
    if (!specialtyInput.trim()) return;
    const field = tab === 'legal' ? 'specialisation' : 'style_specialty';
    const current = field === 'specialisation'
      ? (partner as LegalPartner).specialisation
      : (partner as DesignPartner).style_specialty;

    if (!current.includes(specialtyInput.trim())) {
      onPartnerChange({
        ...partner,
        [field]: [...current, specialtyInput.trim()],
      });
    }
    setSpecialtyInput('');
  };

  const handleRemoveSpecialty = (index: number) => {
    const field = tab === 'legal' ? 'specialisation' : 'style_specialty';
    const current = field === 'specialisation'
      ? (partner as LegalPartner).specialisation
      : (partner as DesignPartner).style_specialty;

    onPartnerChange({
      ...partner,
      [field]: current.filter((_, i) => i !== index),
    });
  };

  const handleParseCommaSeparated = (value: string) => {
    if (!value.trim()) return;
    const field = tab === 'legal' ? 'specialisation' : 'style_specialty';
    const tags = value
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    onPartnerChange({
      ...partner,
      [field]: tags,
    });
  };

  const specialties = tab === 'legal'
    ? (partner as LegalPartner).specialisation
    : (partner as DesignPartner).style_specialty;

  const urlField = tab === 'legal' ? 'profile_url' : 'portfolio_url';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-serif font-bold text-navy text-lg">
            {isEditing ? 'Edit' : 'Add'} {tab === 'legal' ? 'Legal' : 'Design'}{' '}
            Partner
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Name *
              </label>
              <input
                type="text"
                value={partner.name}
                onChange={e =>
                  onPartnerChange({ ...partner, name: e.target.value })
                }
                placeholder="Full name"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Firm Name *
              </label>
              <input
                type="text"
                value={partner.firm_name}
                onChange={e =>
                  onPartnerChange({ ...partner, firm_name: e.target.value })
                }
                placeholder="Firm or company name"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                City *
              </label>
              <input
                type="text"
                value={partner.city}
                onChange={e =>
                  onPartnerChange({ ...partner, city: e.target.value })
                }
                placeholder="City"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Contact Email *
              </label>
              <input
                type="email"
                value={partner.contact_email}
                onChange={e =>
                  onPartnerChange({
                    ...partner,
                    contact_email: e.target.value,
                  })
                }
                placeholder="email@example.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Contact Phone
              </label>
              <input
                type="tel"
                value={partner.contact_phone}
                onChange={e =>
                  onPartnerChange({
                    ...partner,
                    contact_phone: e.target.value,
                  })
                }
                placeholder="+91 9876543210"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {tab === 'legal' ? 'Profile' : 'Portfolio'} URL
              </label>
              <input
                type="url"
                value={partner[urlField as keyof Partner] || ''}
                onChange={e =>
                  onPartnerChange({
                    ...partner,
                    [urlField]: e.target.value,
                  })
                }
                placeholder="https://example.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Rating (0-5)
              </label>
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={partner.rating}
                onChange={e =>
                  onPartnerChange({
                    ...partner,
                    rating: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Review Count
              </label>
              <input
                type="number"
                min="0"
                value={partner.review_count}
                onChange={e =>
                  onPartnerChange({
                    ...partner,
                    review_count: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              />
            </div>
          </div>

          {/* Specialties/Style */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {tab === 'legal' ? 'Specialisation' : 'Style Specialty'} (comma-separated)
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={specialtyInput}
                onChange={e => setSpecialtyInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSpecialty();
                  } else if (e.key === ',') {
                    e.preventDefault();
                    handleAddSpecialty();
                  }
                }}
                placeholder="Add specialty..."
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
              />
              <button
                type="button"
                onClick={handleAddSpecialty}
                className="px-4 py-2.5 bg-navy text-cream rounded-xl text-sm font-medium hover:bg-navy/90 transition-colors"
              >
                Add
              </button>
            </div>

            {/* Paste comma-separated helper */}
            <div className="mb-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-2">Or paste comma-separated:</p>
              <input
                type="text"
                placeholder="e.g., Corporate Law, IP Law, M&A"
                onBlur={e => {
                  if (e.target.value.includes(',')) {
                    handleParseCommaSeparated(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-navy/20"
              />
            </div>

            {/* Specialty Chips */}
            <div className="flex flex-wrap gap-2">
              {specialties.map((spec, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-1.5 bg-navy/8 text-navy rounded-lg text-sm"
                >
                  <span>{spec}</span>
                  <button
                    onClick={() => handleRemoveSpecialty(i)}
                    className="text-navy/50 hover:text-navy transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Checkboxes */}
          <div className="pt-4 space-y-3 border-t border-gray-100">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={partner.verified}
                onChange={e =>
                  onPartnerChange({ ...partner, verified: e.target.checked })
                }
                className="w-4 h-4 rounded border-gray-300 text-navy focus:ring-navy/20"
              />
              <span className="text-sm font-medium text-gray-700">Verified</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={partner.active}
                onChange={e =>
                  onPartnerChange({ ...partner, active: e.target.checked })
                }
                className="w-4 h-4 rounded border-gray-300 text-navy focus:ring-navy/20"
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-navy text-cream rounded-xl text-sm font-display font-semibold disabled:opacity-50 hover:bg-navy/90 transition-colors"
          >
            {isLoading
              ? 'Saving...'
              : isEditing
                ? 'Update Partner'
                : 'Add Partner'}
          </button>
        </div>
      </div>
    </div>
  );
}
