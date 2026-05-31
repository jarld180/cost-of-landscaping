#!/usr/bin/env node
/**
 * scripts/blog-engine/auto-blog-deploy.mjs
 *
 * Cost of Concrete daily blog generator. Ported from LCC's auto-blog-deploy.js
 * with these adaptations for CoC:
 *   - Writes to Supabase `pages` table via PostgREST (no constants.ts file)
 *   - CoC-flavored prompt and schema graph (Cost of Concrete brand entity)
 *   - No Vercel deploy needed — Nuxt SSR pulls live from DB on next request
 *
 * ENV (read from process.env, set by GitHub Actions or local .env):
 *   ANTHROPIC_API_KEY       — Claude key
 *   SUPABASE_URL            — https://<ref>.supabase.co
 *   SUPABASE_SERVICE_KEY    — service-role key (NUXT_SUPABASE_SECRET_KEY)
 *
 * Optional ENV:
 *   FORCE_TOPIC             — override the topic queue with this exact string
 *   ANTHROPIC_MODEL         — defaults to claude-haiku-4-5-20251001
 *   DRY_RUN                 — "1" to print the post but skip DB insert
 *
 * Flow:
 *   1. Pick next unused topic from topics.json (tracked in used-topics.json)
 *   2. Call Claude with the CoC prompt
 *   3. Build Schema.org graph (Org + Article + Breadcrumbs + Speakable + FAQPage + HowTo)
 *   4. POST to /rest/v1/pages with template='article', parent_id=BLOG_PARENT_ID
 *   5. Commit used-topics.json bump with [skip ci]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPrompt } from './prompt.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BLOG_DIR = __dirname;
const TOPICS_FILE = path.join(BLOG_DIR, 'topics.json');
const USED_FILE = path.join(BLOG_DIR, 'used-topics.json');
const LOG_FILE = path.join(BLOG_DIR, 'auto-blog.log');

// /blog hub page id (from migration 20260422000003_blog_parent_page.sql)
const BLOG_PARENT_ID = '00000000-0000-4000-a000-000000000001';
const SITE_URL = 'https://costofconcrete.com';
const SITE_NAME = 'Cost of Concrete';

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
const DRY_RUN = process.env.DRY_RUN === '1';
const CONTENT_FILE = process.env.CONTENT_FILE || '';

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch {}
}

function requireEnv() {
  const missing = [];
  if (!CONTENT_FILE && !ANTHROPIC_KEY) missing.push('ANTHROPIC_API_KEY (or CONTENT_FILE)');
  if (!DRY_RUN && !SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!DRY_RUN && !SUPABASE_KEY) missing.push('SUPABASE_SERVICE_KEY');
  if (missing.length) {
    throw new Error(`Missing required env: ${missing.join(', ')}`);
  }
}

function pickTopic() {
  if (process.env.FORCE_TOPIC) return process.env.FORCE_TOPIC;
  const topics = JSON.parse(fs.readFileSync(TOPICS_FILE, 'utf8')).priority;
  let used = [];
  if (fs.existsSync(USED_FILE)) {
    used = JSON.parse(fs.readFileSync(USED_FILE, 'utf8'));
  }
  const next = topics.find(t => !used.includes(t));
  if (!next) {
    log('All topics used — resetting cycle');
    fs.writeFileSync(USED_FILE, JSON.stringify([], null, 2));
    return topics[0];
  }
  used.push(next);
  fs.writeFileSync(USED_FILE, JSON.stringify(used, null, 2));
  return next;
}

function titleToSlug(title) {
  return title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

function guessCategory(topic) {
  if (/cost|price|pricing|budget|pay|much|worth/i.test(topic)) return 'Cost Guides';
  if (/how to|guide|steps|install|pour/i.test(topic)) return 'How-To';
  if (/fix|repair|crack|damage|spall|sealer|seal|clean|maintenance/i.test(topic)) return 'Maintenance';
  if (/vs|versus|compare|difference|better/i.test(topic)) return 'Comparisons';
  if (/hire|hiring|contractor|warranty|scam|deposit|quote|inspection/i.test(topic)) return 'Hiring Tips';
  return 'Cost Guides';
}

async function generateBlog(topic) {
  const prompt = buildPrompt(topic);
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 16000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${txt.slice(0, 500)}`);
  }
  const data = await res.json();
  let text = data.content?.[0]?.text?.trim() || '';
  text = text.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '');
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`Failed to parse model JSON: ${e.message} | head: ${text.slice(0, 300)}`);
  }
}

function buildSchemaGraph(post, url) {
  const article = {
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: post.title,
    description: post.excerpt,
    image: post.image && post.image.startsWith('http') ? post.image : `${SITE_URL}/og-default.jpg`,
    datePublished: post.date,
    dateModified: post.date,
    author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    inLanguage: 'en-US',
    ...(post.wordCount ? { wordCount: post.wordCount } : {}),
  };

  const breadcrumbs = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: url },
    ],
  };

  const organization = {
    '@type': 'Organization',
    '@id': `${SITE_URL}#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    description: 'Independent national concrete pricing directory and contractor research.',
  };

  const speakable = {
    '@type': 'WebPage',
    '@id': url,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.quick-answer', '.geo-anchor'],
    },
  };

  const graph = [organization, article, breadcrumbs, speakable];

  if (post.faqs?.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: post.faqs.map(f => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    });
  }

  if (post.howToSteps?.length) {
    graph.push({
      '@type': 'HowTo',
      '@id': `${url}#howto`,
      name: post.title,
      step: post.howToSteps.map((s, i) => ({
        '@type': 'HowToStep',
        position: i + 1,
        name: s.name,
        text: s.text,
      })),
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

async function insertPage(post, slug, schemaGraph) {
  const fullPath = `/blog/${slug}`;
  const url = `${SITE_URL}${fullPath}`;
  const now = new Date().toISOString();
  const row = {
    parent_id: BLOG_PARENT_ID,
    slug,
    full_path: fullPath,
    template: 'article',
    title: post.title,
    description: post.excerpt,
    content: post.content,
    meta_title: post.title,
    meta_keywords: post.metaKeywords || [],
    status: 'published',
    published_at: now,
    canonical_url: fullPath,
    og_image: null,
    metadata: {
      aiGenerated: true,
      generator: 'blog-engine/auto-blog-deploy.mjs',
      model: MODEL,
      category: post.category || guessCategory(post.title),
      wordCount: post.wordCount || null,
      template: {
        showTableOfContents: true,
        showSidebarSearch: false,
      },
      blog: {
        geoAnchor: post.geoAnchor || '',
        faqs: post.faqs || [],
        howToSteps: post.howToSteps || [],
      },
      seo: {
        schema: schemaGraph,
      },
    },
  };

  const endpoint = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/pages`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(row),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Supabase insert ${res.status}: ${txt.slice(0, 600)}`);
  }
  const body = await res.json();
  return { url, full_path: fullPath, id: body?.[0]?.id || null };
}

async function main() {
  log('=== CoC Auto Blog Deploy Starting ===');
  requireEnv();

  let topic;
  let blog;
  if (CONTENT_FILE) {
    const abs = path.isAbsolute(CONTENT_FILE) ? CONTENT_FILE : path.join(process.cwd(), CONTENT_FILE);
    log(`Loading pre-generated article from ${abs}`);
    blog = JSON.parse(fs.readFileSync(abs, 'utf8'));
    topic = blog.title;
    log(`Loaded: "${blog.title}" (~${blog.wordCount || '??'} words, ${blog.faqs?.length || 0} FAQs, ${blog.howToSteps?.length || 0} HowTo steps)`);
  } else {
    topic = pickTopic();
    log(`Topic: "${topic}"`);
    log(`Calling Anthropic (${MODEL})...`);
    blog = await generateBlog(topic);
    log(`Generated: "${blog.title}" (~${blog.wordCount || '??'} words, ${blog.faqs?.length || 0} FAQs, ${blog.howToSteps?.length || 0} HowTo steps)`);
  }

  const today = new Date().toISOString().slice(0, 10);
  const slug = titleToSlug(blog.title);
  const post = {
    title: blog.title,
    excerpt: blog.excerpt,
    category: blog.category || guessCategory(topic),
    metaKeywords: blog.metaKeywords || [],
    date: today,
    content: blog.content,
    geoAnchor: blog.geoAnchor || '',
    faqs: blog.faqs || [],
    howToSteps: blog.howToSteps || [],
    wordCount: blog.wordCount || (blog.content || '').replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length,
  };

  const articleUrl = `${SITE_URL}/blog/${slug}`;
  const schemaGraph = buildSchemaGraph(post, articleUrl);

  if (DRY_RUN) {
    log('DRY_RUN — skipping DB insert');
    console.log(JSON.stringify({
      title: post.title,
      slug,
      wordCount: post.wordCount,
      faqs: post.faqs.length,
      howToSteps: post.howToSteps.length,
      schemaTypes: schemaGraph['@graph'].map(g => g['@type']),
      contentPreview: post.content.slice(0, 800),
    }, null, 2));
    return;
  }

  log('Inserting into pages table...');
  const inserted = await insertPage(post, slug, schemaGraph);
  log(`SUCCESS: ${inserted.url} (id=${inserted.id})`);
}

main().catch(err => {
  log(`FAILED: ${err.stack || err.message}`);
  process.exit(1);
});
