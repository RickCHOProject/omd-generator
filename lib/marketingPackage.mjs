import { buildFacebookPost, getFacebookVariantIndex } from './facebookPost.mjs';
import { getPublicDealUrl } from './dealLinks.mjs';
import { buildTextBlast } from './textBlast.mjs';
import { getApprovedPhoneForState } from './contactPhone.mjs';

export const getMarketingSettings = (data) => ({
  textBlastPhotoLink: String(data?.marketing?.textBlastPhotoLink || '').trim(),
  facebookVariantOffset: Number.isInteger(Number(data?.marketing?.facebookVariantOffset))
    ? Number(data.marketing.facebookVariantOffset)
    : 0
});

export const buildMarketingPackage = ({ data, slug, settings = getMarketingSettings(data) }) => {
  const dealUrl = getPublicDealUrl(slug);
  const approvedData = {
    ...data,
    phone: getApprovedPhoneForState(data?.state, data?.phone)
  };
  const normalizedSettings = {
    textBlastPhotoLink: String(settings?.textBlastPhotoLink || '').trim(),
    facebookVariantOffset: Number.isInteger(Number(settings?.facebookVariantOffset))
      ? Number(settings.facebookVariantOffset)
      : 0
  };

  return {
    dealUrl,
    settings: normalizedSettings,
    textBlast: buildTextBlast(approvedData, {
      dealUrl,
      photoLink: normalizedSettings.textBlastPhotoLink
    }),
    facebookPost: buildFacebookPost(approvedData, {
      dealUrl,
      variantIndex: getFacebookVariantIndex(data) + normalizedSettings.facebookVariantOffset
    })
  };
};
