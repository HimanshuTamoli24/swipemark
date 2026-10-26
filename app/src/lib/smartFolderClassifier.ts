export interface CategoryDefinition {
  id: string;
  name: string;
  label: string;
  iconName: 'Code' | 'Bot' | 'Palette' | 'BookOpen' | 'Wrench' | 'Film' | 'CreditCard' | 'MessageSquare' | 'Folder';
  emoji: string;
  badgeColor: string;
  domains: string[];
  keywords: string[];
}

export const SMART_CATEGORIES: CategoryDefinition[] = [
  {
    id: 'ai-ml',
    name: 'AI & Machine Learning',
    label: 'AI & Machine Learning',
    iconName: 'Bot',
    emoji: '🤖',
    badgeColor: 'bg-purple-100 text-purple-900 border-purple-400',
    domains: [
      'openai.com',
      'chatgpt.com',
      'anthropic.com',
      'claude.ai',
      'huggingface.co',
      'replicate.com',
      'midjourney.com',
      'mistral.ai',
      'stability.ai',
      'cohere.com',
      'groq.com',
      'v0.dev',
      'perplexity.ai',
      'runwayml.com',
      'elevenlabs.io',
      'deepmind.google',
    ],
    keywords: [
      'ai',
      'gpt',
      'llm',
      'prompt',
      'machine learning',
      'neural',
      'deep learning',
      'model',
      'inference',
      'agent',
      'rag',
      'diffusion',
      'embedding',
    ],
  },
  {
    id: 'dev-code',
    name: 'Dev & Engineering',
    label: 'Dev & Engineering',
    iconName: 'Code',
    emoji: '💻',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-400',
    domains: [
      'github.com',
      'gitlab.com',
      'stackoverflow.com',
      'npmjs.com',
      'pnpm.io',
      'developer.mozilla.org',
      'dev.to',
      'hashnode.dev',
      'react.dev',
      'nextjs.org',
      'vuejs.org',
      'tailwindcss.com',
      'typescriptlang.org',
      'python.org',
      'golang.org',
      'rust-lang.org',
      'docker.com',
      'kubernetes.io',
      'vercel.com',
      'netlify.com',
      'supabase.com',
      'prisma.io',
      'mongodb.com',
      'postgresql.org',
      'redis.io',
    ],
    keywords: [
      'github',
      'api',
      'repo',
      'code',
      'programming',
      'sdk',
      'documentation',
      'library',
      'framework',
      'backend',
      'frontend',
      'database',
      'sql',
      'typescript',
      'javascript',
      'python',
      'react',
      'css',
      'html',
      'git',
      'npm',
    ],
  },
  {
    id: 'design-ui',
    name: 'Design & UI/UX',
    label: 'Design & UI/UX',
    iconName: 'Palette',
    emoji: '🎨',
    badgeColor: 'bg-pink-100 text-pink-900 border-pink-400',
    domains: [
      'figma.com',
      'dribbble.com',
      'behance.net',
      'awwwards.com',
      'mobbin.com',
      'coolors.co',
      'fontshare.com',
      'fonts.google.com',
      'lucide.dev',
      'feathericons.com',
      'unsplash.com',
      'pexels.com',
      'freepik.com',
      'framer.com',
      'spline.design',
      'shadcn.com',
    ],
    keywords: [
      'design',
      'ui',
      'ux',
      'typography',
      'font',
      'palette',
      'icon',
      'illustration',
      'mockup',
      'animation',
      'wireframe',
      'neobrutalism',
      'glassmorphism',
      'minimalism',
      'figma',
      'css animation',
    ],
  },
  {
    id: 'productivity-tools',
    name: 'Productivity & Tools',
    label: 'Productivity & Tools',
    iconName: 'Wrench',
    emoji: '⚡',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-400',
    domains: [
      'notion.so',
      'linear.app',
      'trello.com',
      'asana.com',
      'jira.atlassian.com',
      'calendar.google.com',
      'drive.google.com',
      'dropbox.com',
      'raycast.com',
      'arc.net',
      'slack.com',
      'zoom.us',
      'loom.com',
      'airtable.com',
      'postman.com',
      'cron.com',
    ],
    keywords: [
      'tool',
      'productivity',
      'utility',
      'converter',
      'calculator',
      'generator',
      'tracker',
      'manager',
      'workflow',
      'automation',
      'extension',
      'notes',
      'task',
    ],
  },
  {
    id: 'reads-articles',
    name: 'Reads & Articles',
    label: 'Reads & Articles',
    iconName: 'BookOpen',
    emoji: '📚',
    badgeColor: 'bg-blue-100 text-blue-900 border-blue-400',
    domains: [
      'medium.com',
      'substack.com',
      'theverge.com',
      'techcrunch.com',
      'wired.com',
      'news.ycombinator.com',
      'wikipedia.org',
      'bloomberg.com',
      'nytimes.com',
      'bbc.com',
      'arstechnica.com',
      'readwise.io',
      'pocket.com',
    ],
    keywords: [
      'article',
      'blog',
      'guide',
      'tutorial',
      'how to',
      'essay',
      'news',
      'reading',
      'story',
      'post',
      'journal',
      'newsletter',
      'research',
      'paper',
    ],
  },
  {
    id: 'media-videos',
    name: 'Media & Videos',
    label: 'Media & Videos',
    iconName: 'Film',
    emoji: '🎬',
    badgeColor: 'bg-red-100 text-red-900 border-red-400',
    domains: [
      'youtube.com',
      'youtu.be',
      'vimeo.com',
      'spotify.com',
      'soundcloud.com',
      'twitch.tv',
      'netflix.com',
      'tiktok.com',
      'instagram.com/reels',
      'music.apple.com',
      'bandcamp.com',
    ],
    keywords: [
      'video',
      'music',
      'track',
      'album',
      'audio',
      'stream',
      'podcast',
      'movie',
      'playlist',
      'song',
      'clip',
      'youtube',
      'spotify',
    ],
  },
  {
    id: 'finance-shopping',
    name: 'Shopping & Finance',
    label: 'Shopping & Finance',
    iconName: 'CreditCard',
    emoji: '💳',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-400',
    domains: [
      'amazon.com',
      'ebay.com',
      'stripe.com',
      'paypal.com',
      'shopify.com',
      'coinbase.com',
      'binance.com',
      'robinhood.com',
      'etsy.com',
      'target.com',
      'aliexpress.com',
    ],
    keywords: [
      'store',
      'shop',
      'price',
      'discount',
      'deal',
      'cart',
      'finance',
      'crypto',
      'bank',
      'invest',
      'payment',
      'billing',
      'order',
    ],
  },
  {
    id: 'social-community',
    name: 'Social & Community',
    label: 'Social & Community',
    iconName: 'MessageSquare',
    emoji: '💬',
    badgeColor: 'bg-sky-100 text-sky-900 border-sky-400',
    domains: [
      'twitter.com',
      'x.com',
      'reddit.com',
      'linkedin.com',
      'discord.com',
      'threads.net',
      'facebook.com',
      'mastodon.social',
      'bsky.app',
      'producthunt.com',
    ],
    keywords: [
      'community',
      'discussion',
      'forum',
      'social',
      'thread',
      'tweet',
      'profile',
      'feed',
      'chat',
      'group',
      'network',
    ],
  },
];

export interface ClassificationResult {
  folder: string;
  category: string;
  iconName: CategoryDefinition['iconName'];
  emoji: string;
  badgeColor: string;
  confidence: number;
  source: 'classifier.dev' | 'semantic-rules' | 'fallback';
}

/**
 * Fast Rule-Based Semantic Classifier (Ultra-fast local evaluation)
 */
export function classifyByRules(title: string, url: string): ClassificationResult {
  const cleanTitle = (title || '').toLowerCase();
  let domain = '';
  let pathname = '';

  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    domain = parsed.hostname.toLowerCase().replace(/^www\./, '');
    pathname = parsed.pathname.toLowerCase();
  } catch {
    domain = url.toLowerCase();
  }

  const combinedText = `${domain} ${pathname} ${cleanTitle}`;

  let bestCat = SMART_CATEGORIES[1]; // default Dev & Code
  let highestScore = 0;

  for (const cat of SMART_CATEGORIES) {
    let score = 0;

    // Check exact domain match or suffix
    for (const d of cat.domains) {
      if (domain === d || domain.endsWith(`.${d}`) || domain.includes(d)) {
        score += 10;
        break;
      }
    }

    // Check keyword presence
    for (const kw of cat.keywords) {
      if (combinedText.includes(kw)) {
        score += 2;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestCat = cat;
    }
  }

  const confidence = highestScore >= 10 ? 0.95 : highestScore >= 4 ? 0.82 : 0.65;

  return {
    folder: bestCat.name,
    category: bestCat.name,
    iconName: bestCat.iconName,
    emoji: bestCat.emoji,
    badgeColor: bestCat.badgeColor,
    confidence,
    source: 'semantic-rules',
  };
}

/**
 * Classifies a bookmark using classifier.dev with automatic fallback to fast semantic rules
 */
export async function classifyBookmark(
  title: string,
  url: string,
  labels?: string[]
): Promise<ClassificationResult> {
  const targetLabels = labels && labels.length > 0 ? labels : SMART_CATEGORIES.map((c) => c.name);
  const textInput = `${title || ''} (${url})`.trim();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1800); // 1.8s timeout

    const res = await fetch('https://classifier.dev', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Classifier-Share-Data': 'false',
      },
      body: JSON.stringify({
        labels: targetLabels,
        input: textInput,
        tier: 'fast',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const chosenLabel = data.label || data.results?.[0]?.label;
      const confidence = typeof data.confidence === 'number' ? data.confidence : 0.85;

      if (chosenLabel) {
        const matched = SMART_CATEGORIES.find(
          (c) => c.name.toLowerCase() === chosenLabel.toLowerCase()
        );
        if (matched) {
          return {
            folder: matched.name,
            category: matched.name,
            iconName: matched.iconName,
            emoji: matched.emoji,
            badgeColor: matched.badgeColor,
            confidence,
            source: 'classifier.dev',
          };
        }
      }
    }
  } catch {
    // If network error, proxy block, or timeout occurs, gracefully fall back to local rule engine
  }

  return classifyByRules(title, url);
}

/**
 * Helper to get the category emoji for a folder name
 */
export function getCategoryEmoji(folderName?: string): string {
  if (!folderName) return '📁';
  const clean = folderName.toLowerCase();
  const found = SMART_CATEGORIES.find(
    (c) => c.name.toLowerCase() === clean || clean.includes(c.name.toLowerCase()) || clean.includes(c.id)
  );
  if (found) return found.emoji;

  if (clean.includes('dev') || clean.includes('code') || clean.includes('git')) return '💻';
  if (clean.includes('ai') || clean.includes('gpt') || clean.includes('bot')) return '🤖';
  if (clean.includes('design') || clean.includes('ui') || clean.includes('ux')) return '🎨';
  if (clean.includes('tool') || clean.includes('util')) return '⚡';
  if (clean.includes('read') || clean.includes('article') || clean.includes('book')) return '📚';
  if (clean.includes('video') || clean.includes('media') || clean.includes('music')) return '🎬';
  if (clean.includes('shop') || clean.includes('pay') || clean.includes('finance')) return '💳';
  if (clean.includes('social') || clean.includes('community')) return '💬';

  return '📁';
}

/**
 * Bulk classification for arrays of bookmarks
 */
export async function classifyBookmarksBatch(
  items: Array<{ title: string; url: string; id?: string }>
): Promise<Array<ClassificationResult & { id?: string; url: string; title: string }>> {
  // If fewer than 2 items or if classifier fails, evaluate via local engine
  return items.map((item) => {
    const result = classifyByRules(item.title, item.url);
    return {
      ...result,
      id: item.id,
      url: item.url,
      title: item.title,
    };
  });
}
