import { isPublicDeal } from '../../../lib/dealRecord.mjs';

const SUPABASE_URL = 'https://wqvfsynpxfwacesvjlmd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L0SuigrNUZpsWC66KSVCOA_EuypYe5i';

const formatPrice = (value) => value ? Number(value).toLocaleString('en-US') : null;

async function getDeal(slug) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/deals?slug=eq.${encodeURIComponent(slug)}&select=data`,
      {
        cache: 'no-store',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    if (!response.ok) return null;
    const rows = await response.json();
    const deal = rows?.[0]?.data || null;
    return isPublicDeal(deal) ? deal : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const deal = await getDeal(slug);
  const canonical = `https://deals.offmarketdaily.com/d/${encodeURIComponent(slug)}`;

  if (!deal) {
    return {
      title: 'Off-Market Investment Property | Off Market Daily',
      description: 'Review this off-market investment opportunity from Off Market Daily.',
      alternates: { canonical },
    };
  }

  const location = [deal.city, deal.state].filter(Boolean).join(', ');
  const askingPrice = formatPrice(deal.askingPrice);
  const title = `${deal.address}${location ? ` — ${location}` : ''} | Off Market Daily`;
  const descriptionParts = [
    askingPrice ? `Off-market investment opportunity offered at $${askingPrice}.` : 'Off-market investment opportunity.',
    deal.beds ? `${deal.beds} beds` : null,
    deal.baths ? `${deal.baths} baths` : null,
    deal.sqft ? `${formatPrice(deal.sqft)} sq ft` : null,
  ].filter(Boolean);
  const description = descriptionParts.join(' · ');
  const image = deal.photos?.[0]?.url;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      url: canonical,
      siteName: 'Off Market Daily',
      title,
      description,
      images: image ? [{ url: image, alt: deal.address || 'Off-market property' }] : [],
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : [],
    },
  };
}

export default function DealLayout({ children }) {
  return children;
}
