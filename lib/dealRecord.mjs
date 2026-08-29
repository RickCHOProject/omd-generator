export const DEAL_STATUS = {
  PUBLISHED: 'published',
  TRACKING_ONLY: 'tracking-only'
};

export const createDealSlug = (address, suffix = Math.random().toString(36).substring(2, 6)) => {
  const normalizedAddress = String(address || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30);

  return `${normalizedAddress || 'deal'}-${suffix}`;
};

export const buildPublishedDealRecord = ({ formData, photos, suffix, marketing }) => ({
  slug: createDealSlug(formData?.address, suffix),
  data: {
    ...formData,
    photos: photos || [],
    marketing: {
      textBlastPhotoLink: String(marketing?.textBlastPhotoLink || '').trim(),
      facebookVariantOffset: Number.isInteger(Number(marketing?.facebookVariantOffset))
        ? Number(marketing.facebookVariantOffset)
        : 0
    },
    omdStatus: DEAL_STATUS.PUBLISHED
  }
});

export const buildTrackingOnlyDealRecord = ({ formData, suffix }) => {
  const address = String(formData?.address || '').trim();
  if (!address) throw new Error('Address is required to create a deal number.');

  return {
    slug: `internal-${createDealSlug(address, suffix)}`,
    data: {
      address,
      city: String(formData?.city || '').trim(),
      state: String(formData?.state || '').trim(),
      zip: String(formData?.zip || '').trim(),
      photos: [],
      omdStatus: DEAL_STATUS.TRACKING_ONLY
    }
  };
};

export const isTrackingOnlyDeal = (data) => data?.omdStatus === DEAL_STATUS.TRACKING_ONLY;

export const isArchivedDeal = (data) => data?.audit?.archived === true;

// Existing deals predate the status field and must remain public.
export const isPublicDeal = (data) => Boolean(data) && !isTrackingOnlyDeal(data) && !isArchivedDeal(data);
