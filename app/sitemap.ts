import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://agencygrowthai.example';
  const lastModified = new Date();

  return [
    { url: baseUrl, lastModified, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/financial-checkup`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/career`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/disclaimers`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
