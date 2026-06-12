import { ApifyClient } from 'apify-client';

export interface DiscoveryLead {
  name: string;
  website: string | null;
  phone: string | null;
  city: string | null;
  region: string | null;
  sourceUrl: string | null;
  industry: string | null;
}

export async function searchGoogleMaps(niche: string, location: string, limit: number = 30): Promise<DiscoveryLead[]> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    throw new Error('APIFY_API_TOKEN is not configured in environment variables');
  }

  const client = new ApifyClient({ token });

  const input = {
    searchStringsArray: [niche],
    locationQuery: location,
    maxCrawledPlacesPerSearch: limit,
    language: "en",
    searchMatching: "all",
    website: "allPlaces",
    skipClosedPlaces: true,
    scrapePlaceDetailPage: false,
    scrapeTableReservationProvider: false,
    scrapeOrderOnline: false,
    includeWebResults: false,
    scrapeDirectories: false,
    maxQuestions: 0,
    scrapeContacts: false,
    scrapeSocialMediaProfiles: {
        facebooks: false,
        instagrams: false,
        youtubes: false,
        tiktoks: false,
        twitters: false
    },
    maximumLeadsEnrichmentRecords: 0,
    verifyLeadsEnrichmentEmails: false,
    maxReviews: 0,
    maxImages: 0,
    scrapeImageAuthors: false,
  };

  console.log(`[Apify] Searching for ${niche} in ${location}...`);
  const run = await client.actor("nwua9Gu5YrADL7ZDj").call(input);
  
  console.log(`[Apify] Run finished. Fetching dataset ${run.defaultDatasetId}...`);
  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  return items.map((item: any) => ({
    name: item.title || item.name || 'Unknown Business',
    website: item.website || null,
    phone: item.phone || item.phoneUnformatted || null,
    city: item.city || location.split(',')[0].trim() || null,
    region: item.state || null,
    sourceUrl: item.url || null,
    industry: item.categoryName || niche,
  }));
}
