// ============================================================
// i18n — FRAGMENT: Marketing / public website (English)
// ============================================================
// Every user-visible string of the public marketing site
// (header, hero, sections, pricing, blog, about, solutions,
// legal, cookie banner, footer) lives under the `mkt.*`
// prefix. en = source of truth; fr is fully translated; all
// other locales fall back per the standard t() chain
// (dict[locale][key] ?? dict.en[key] ?? key).
//
// Shared chrome keys are REUSED, not redefined:
//   auth.* (login form), theme.*, language.*, common.*
// ============================================================

export const clientMarketingEn: Record<string, string> = {
  // ---- Brand ----
  'mkt.brand.name': 'Sitesmith',
  'mkt.brand.tagline': 'Craft content that ranks.',

  // ---- Header / navigation ----
  'mkt.nav.features': 'Features',
  'mkt.nav.pricing': 'Pricing',
  'mkt.nav.solutions': 'Solutions',
  'mkt.nav.blog': 'Blog',
  'mkt.nav.about': 'About',
  'mkt.nav.login': 'Log in',
  'mkt.nav.getStarted': 'Get started',
  'mkt.nav.menu': 'Menu',
  'mkt.nav.openMenu': 'Open menu',
  'mkt.nav.closeMenu': 'Close menu',
  'mkt.nav.themeToggle': 'Toggle theme',
  'mkt.nav.changeLanguage': 'Change language',
  'mkt.nav.skipToContent': 'Skip to content',

  // ---- Solutions dropdown ----
  'mkt.menu.solutionsTitle': 'Solutions',
  'mkt.menu.solutionsSubtitle': 'Built for teams that publish seriously',
  'mkt.menu.forBloggers': 'For Bloggers',
  'mkt.menu.forBloggersDesc': 'One calm dashboard for writing, media and SEO',
  'mkt.menu.forAgencies': 'For Agencies',
  'mkt.menu.forAgenciesDesc': 'Every client site under one roof',
  'mkt.menu.forPublishers': 'For Publishers',
  'mkt.menu.forPublishersDesc': 'Editorial workflow with roles and review',
  'mkt.menu.forSeoTeams': 'For SEO Teams',
  'mkt.menu.forSeoTeamsDesc': 'A full technical SEO suite per site',
  'mkt.menu.exploreAll': 'Explore all solutions',

  // ---- Hero ----
  'mkt.hero.eyebrow': 'The multi-site content platform',
  'mkt.hero.titleA': 'Run every site you publish',
  'mkt.hero.titleAccent': 'from one calm dashboard.',
  'mkt.hero.subtitle':
    'Sitesmith brings AI-assisted writing, a complete SEO suite, media management, newsletter and automation together — and connects straight to WordPress or any REST CMS.',
  'mkt.hero.ctaPrimary': 'Start for free',
  'mkt.hero.ctaSecondary': 'See how it works',
  'mkt.hero.note': 'Free plan · No credit card required',
  'mkt.hero.demoLabel': 'Live product demo',
  'mkt.hero.demoCaption': 'The real Sitesmith dashboard — Executive view',

  // ---- Product showcase labels ----
  'mkt.showcase.ai': 'AI Content',
  'mkt.showcase.seo': 'SEO',
  'mkt.showcase.automation': 'Automation',
  'mkt.showcase.media': 'Media',
  'mkt.showcase.dashboard': 'Dashboard',
  'mkt.showcase.newsletter': 'Newsletter',

  // ---- Value proposition ----
  'mkt.value.eyebrow': 'Why Sitesmith',
  'mkt.value.title': 'Your content workflow shouldn’t scatter across six tools.',
  'mkt.value.body':
    'Most teams write in one app, check SEO in another, store media somewhere else, and still publish by hand. Sitesmith replaces that patchwork with one platform that connects to the sites you already run.',
  'mkt.value.withoutTitle': 'Without Sitesmith',
  'mkt.value.without1': 'Drafts, media and SEO spread across disconnected tools',
  'mkt.value.without2': 'Manual copy-paste publishing for every article',
  'mkt.value.without3': 'SEO checked after publishing — if at all',
  'mkt.value.without4': 'No repeatable process, no history, no overview',
  'mkt.value.withTitle': 'With Sitesmith',
  'mkt.value.with1': 'Writing, media, SEO and publishing in one place',
  'mkt.value.with2': 'Connect WordPress or any REST CMS and publish directly',
  'mkt.value.with3': 'Audit, schema, redirects and indexing handled per site',
  'mkt.value.with4': 'Automations that run your routine work around the clock',

  // ---- Capabilities (real, verifiable numbers only) ----
  'mkt.stats.title': 'What you get, in numbers',
  'mkt.stats.seoTools': 'SEO tools',
  'mkt.stats.seoToolsDesc': 'Audit, schema, redirects, sitemap, robots, indexing and more',
  'mkt.stats.languages': 'Languages',
  'mkt.stats.languagesDesc': 'Full dashboard localization with English fallback',
  'mkt.stats.sites': 'Sites on Max',
  'mkt.stats.sitesDesc': 'Every site you run, one dashboard',
  'mkt.stats.aiArticles': 'AI articles / month',
  'mkt.stats.aiArticlesDesc': 'On the Pro plan — more on Max',
  'mkt.stats.unlimited': 'Unlimited',

  // ---- Features section ----
  'mkt.features.eyebrow': 'Features',
  'mkt.features.title': 'Everything you publish, one platform.',
  'mkt.features.subtitle': 'Each capability is built in and connected — no plugins to stitch together.',

  'mkt.feat.ai.label': 'AI Content',
  'mkt.feat.ai.title': 'Write with AI that knows your workflow.',
  'mkt.feat.ai.body':
    'Draft complete articles in the built-in editor with AI assistance, reusable prompt templates, and editorial skills for content style and SEO ranking. Bring your own AI provider and keep full control of models and usage.',
  'mkt.feat.ai.point1': 'AI playground, prompts library and job queue',
  'mkt.feat.ai.point2': 'Editorial skills: content style + SEO ranking checks',
  'mkt.feat.ai.point3': 'Bring your own provider — models, keys and usage tracked',
  'mkt.feat.ai.cta': 'Explore AI content',

  'mkt.feat.seo.label': 'SEO',
  'mkt.feat.seo.title': 'Optimize every article before it ships.',
  'mkt.feat.seo.body':
    'A complete technical SEO suite per site: audits, schema markup, redirects, XML sitemaps, robots.txt, canonicals, internal links, broken-link scans and indexing status — with social previews before you publish.',
  'mkt.feat.seo.point1': 'Per-page SEO reports with focus keywords',
  'mkt.feat.seo.point2': 'Sitemap, robots, canonicals and redirect engine',
  'mkt.feat.seo.point3': 'Search Console integration and indexing views',
  'mkt.feat.seo.cta': 'Explore the SEO suite',

  'mkt.feat.automation.label': 'Automation',
  'mkt.feat.automation.title': 'Turn routine publishing into a system.',
  'mkt.feat.automation.body':
    'Build visual automations that trigger on content events — schedule publishing, run SEO checks, send newsletters and notify your team while you sleep. Every run is logged and auditable.',
  'mkt.feat.automation.point1': 'Visual automation builder with triggers and steps',
  'mkt.feat.automation.point2': 'Scheduled publishing and recurring jobs',
  'mkt.feat.automation.point3': 'Run history, logs and error handling built in',
  'mkt.feat.automation.cta': 'Explore automation',

  'mkt.feat.media.label': 'Media',
  'mkt.feat.media.title': 'A real library for your assets.',
  'mkt.feat.media.body':
    'Upload, organize and reuse images across sites with folders, search and per-site scoping. Storage scales with your plan — from 1 GB on Free to 100 GB on Max.',
  'mkt.feat.media.point1': 'Folders, search and multi-site scoping',
  'mkt.feat.media.point2': 'Usage tracked against your plan’s storage',
  'mkt.feat.media.cta': 'Explore media',

  'mkt.feat.engagement.label': 'Newsletter & Comments',
  'mkt.feat.engagement.title': 'Grow the audience you already have.',
  'mkt.feat.engagement.body':
    'Manage subscribers, send campaigns over your own SMTP, and moderate comments with Akismet spam protection — engagement lives next to the content it belongs to.',
  'mkt.feat.engagement.point1': 'Subscriber management and campaign sending',
  'mkt.feat.engagement.point2': 'Comment moderation queue with spam checks',
  'mkt.feat.engagement.cta': 'Explore engagement',

  'mkt.feat.multisite.label': 'Multi-site',
  'mkt.feat.multisite.title': 'Every site, one login.',
  'mkt.feat.multisite.body':
    'Switch between client sites, personal blogs and side projects instantly. Roles, permissions and plan limits apply per site, and platform staff get their own overview of everything.',
  'mkt.feat.multisite.point1': 'Site switcher with per-site data isolation',
  'mkt.feat.multisite.point2': 'Roles and granular page permissions',
  'mkt.feat.multisite.cta': 'Explore multi-site',

  // ---- Workflow ----
  'mkt.workflow.eyebrow': 'How it works',
  'mkt.workflow.title': 'From idea to published in four steps.',
  'mkt.workflow.subtitle': 'Connect once — then everything happens inside Sitesmith.',
  'mkt.workflow.step1.title': 'Connect your website',
  'mkt.workflow.step1.body': 'Link WordPress or any REST CMS with the connection verifier. Sitesmith confirms write access before you publish.',
  'mkt.workflow.step2.title': 'Create and optimize content',
  'mkt.workflow.step2.body': 'Draft with AI assistance, manage media, and run per-page SEO checks with focus keywords and social previews.',
  'mkt.workflow.step3.title': 'Review and schedule',
  'mkt.workflow.step3.body': 'Route drafts through review with roles and permissions, then schedule publishing on your calendar.',
  'mkt.workflow.step4.title': 'Publish and automate',
  'mkt.workflow.step4.body': 'Push to your site directly, trigger automations for newsletters and routine jobs, and track everything from the dashboard.',

  // ---- Platform / integrations ----
  'mkt.platform.eyebrow': 'Open platform',
  'mkt.platform.title': 'Connects to what you already use.',
  'mkt.platform.subtitle': 'Sitesmith talks to your stack through documented APIs — no lock-in, no proprietary plugin.',
  'mkt.platform.wordpress': 'WordPress',
  'mkt.platform.wordpressDesc': 'Native REST API client with connection verification',
  'mkt.platform.cms': 'Any REST CMS',
  'mkt.platform.cmsDesc': 'Standard API adapter with API-key authentication',
  'mkt.platform.stripe': 'Stripe',
  'mkt.platform.stripeDesc': 'Billing and subscription management',
  'mkt.platform.smtp': 'SMTP Email',
  'mkt.platform.smtpDesc': 'Your own mail server for newsletters and notifications',
  'mkt.platform.ai': 'AI Providers',
  'mkt.platform.aiDesc': 'Bring your own keys and models',
  'mkt.platform.akismet': 'Akismet',
  'mkt.platform.akismetDesc': 'Comment spam protection',
  'mkt.platform.webhooks': 'Webhooks',
  'mkt.platform.webhooksDesc': 'Outgoing webhooks for content events',

  // ---- Use cases / solutions ----
  'mkt.usecases.eyebrow': 'Solutions',
  'mkt.usecases.title': 'Built for people who publish.',
  'mkt.usecases.subtitle': 'One platform, shaped around how you work.',
  'mkt.uc.bloggers.title': 'Bloggers',
  'mkt.uc.bloggers.body': 'Write with AI assistance, keep your media tidy and let the SEO suite check every post — then publish straight to WordPress without copy-paste.',
  'mkt.uc.agencies.title': 'Agencies',
  'mkt.uc.agencies.body': 'Every client site in one dashboard with per-site isolation, roles and permissions. Switch contexts instantly and automate the recurring work.',
  'mkt.uc.publishers.title': 'Publishers',
  'mkt.uc.publishers.body': 'An editorial workflow that scales: drafts, review assignments, calendar scheduling and a newsletter to grow each publication.',
  'mkt.uc.seoteams.title': 'SEO Teams',
  'mkt.uc.seoteams.body': 'Fourteen technical SEO tools per site — audits, schema, redirects, internal links, indexing — with per-page reports and search console data.',
  'mkt.uc.contentteams.title': 'Content Teams',
  'mkt.uc.contentteams.body': 'Admins, editors and authors with exactly the permissions they need. Tasks, comments and notifications keep everyone aligned.',
  'mkt.uc.businesses.title': 'Businesses',
  'mkt.uc.businesses.body': 'Run your site alongside the business: automated publishing, backups, user management and billing under one login.',

  // ---- Pricing ----
  'mkt.pricing.eyebrow': 'Pricing',
  'mkt.pricing.title': 'Simple, transparent pricing.',
  'mkt.pricing.subtitle': 'Start free, upgrade when your sites grow. Every plan includes the full editor, SEO basics and media library.',
  'mkt.pricing.monthly': 'Monthly',
  'mkt.pricing.yearly': 'Yearly',
  'mkt.pricing.save': '2 months free',
  'mkt.pricing.perMonth': '/ month',
  'mkt.pricing.perYear': '/ year',
  'mkt.pricing.free': 'Free',
  'mkt.pricing.popular': 'Most popular',
  'mkt.pricing.currentPlan': 'Current plan',
  'mkt.pricing.cta.free': 'Start for free',
  'mkt.pricing.cta': 'Choose {plan}',
  'mkt.pricing.custom': 'Custom',
  'mkt.pricing.sites': 'Sites',
  'mkt.pricing.sitesUnlimited': 'Unlimited sites',
  'mkt.pricing.sitesCount': '{count} sites',
  'mkt.pricing.storage': 'Storage',
  'mkt.pricing.aiArticles': 'AI articles / month',
  'mkt.pricing.aiImages': 'AI images / month',
  'mkt.pricing.editor': 'Full rich-text editor',
  'mkt.pricing.seoBasics': 'SEO suite',
  'mkt.pricing.mediaLibrary': 'Media library',
  'mkt.pricing.newsletter': 'Newsletter & subscribers',
  'mkt.pricing.automation': 'Automation builder',
  'mkt.pricing.backups': 'Automated backups',
  'mkt.pricing.billingNote': 'Prices in Swiss francs (CHF). Manage or cancel your subscription anytime from your dashboard.',
  'mkt.pricing.error': 'Couldn’t load plans. Please try again.',
  'mkt.pricing.retry': 'Retry',
  'mkt.pricing.loading': 'Loading plans…',
  'mkt.pricing.included': 'Included in {plan}',

  // ---- Blog ----
  'mkt.blog.title': 'Blog',
  'mkt.blog.subtitle': 'Notes on content craft, SEO and building Sitesmith.',
  'mkt.blog.featured': 'Featured article',
  'mkt.blog.allPosts': 'All posts',
  'mkt.blog.categories': 'Categories',
  'mkt.blog.all': 'All',
  'mkt.blog.readMore': 'Read article',
  'mkt.blog.readingTime': '{minutes} min read',
  'mkt.blog.backToBlog': 'Back to blog',
  'mkt.blog.by': 'By',
  'mkt.blog.related': 'Related articles',
  'mkt.blog.newsletterTitle': 'Get one thoughtful email a month',
  'mkt.blog.newsletterBody': 'New articles, product notes and honest lessons from running a content platform. No spam — unsubscribe anytime.',
  'mkt.blog.newsletterPlaceholder': 'you@example.com',
  'mkt.blog.newsletterCta': 'Subscribe',
  'mkt.blog.newsletterSuccess': 'Subscribed — welcome aboard.',
  'mkt.blog.newsletterError': 'Subscription failed. Please try again.',
  'mkt.blog.empty': 'No articles published yet.',
  'mkt.blog.loading': 'Loading articles…',
  'mkt.blog.error': 'Couldn’t load articles. Please try again.',
  'mkt.blog.published': 'Published',
  'mkt.blog.updated': 'Updated',
  'mkt.blog.toc': 'On this page',

  // ---- About ----
  'mkt.about.eyebrow': 'About',
  'mkt.about.title': 'We build the tool we publish with.',
  'mkt.about.intro':
    'Sitesmith is an independent product built by a small team that runs multiple content sites and got tired of stitching six tools together for every article.',
  'mkt.about.missionTitle': 'Our mission',
  'mkt.about.missionBody':
    'Give every person who publishes — solo bloggers, agencies, publishers, businesses — one calm, honest platform for the whole content workflow: writing, media, SEO, engagement and automation.',
  'mkt.about.whyTitle': 'Why we built it',
  'mkt.about.whyBody':
    'The tools were all there, but never together. Writing lived in one app, SEO in another, media in a third, publishing by copy-paste. We wanted the workflow itself — so we connected an editor, a full SEO suite, a media library, newsletter and automation into one product that talks to the sites you already run.',
  'mkt.about.howTitle': 'How it works',
  'mkt.about.howBody':
    'Sitesmith is a multi-tenant platform: you connect your sites — WordPress via its REST API or any CMS with a standard REST endpoint — and manage content, media, SEO, comments and newsletters per site from one dashboard. Roles and permissions mirror real editorial teams, and automations handle the routine parts.',
  'mkt.about.principlesTitle': 'Core principles',
  'mkt.about.principle1Title': 'Honest software',
  'mkt.about.principle1Body': 'No fake urgency, no dark patterns, no invented numbers. What the marketing says is what the product does.',
  'mkt.about.principle2Title': 'Your data, your sites',
  'mkt.about.principle2Body': 'Your content lives in your CMS. Sitesmith manages and publishes — it never holds your site hostage.',
  'mkt.about.principle3Title': 'Calm by default',
  'mkt.about.principle3Body': 'A quiet interface, sensible defaults and zero gratuitous animations. The work is the hero, not the UI.',
  'mkt.about.principle4Title': 'Open connections',
  'mkt.about.principle4Body': 'Documented REST integrations, webhooks, and your own SMTP and AI keys. Leave anytime — nothing to export.',
  'mkt.about.capabilitiesTitle': 'Key capabilities',
  'mkt.about.capabilitiesBody': 'Everything below ships in the product today — not on a roadmap slide.',
  'mkt.about.ctaTitle': 'Publish your next site with us.',
  'mkt.about.ctaBody': 'Start on the free plan and grow from there.',

  // ---- Solutions page ----
  'mkt.sol.eyebrow': 'Solutions',
  'mkt.sol.title': 'One platform, every publisher.',
  'mkt.sol.subtitle': 'Sitesmith adapts to how you work — solo or with a team, one site or fifty.',
  'mkt.sol.details': 'See how it fits',

  // ---- Login page ----
  'mkt.login.title': 'Welcome back.',
  'mkt.login.subtitle': 'Sign in to your Sitesmith account.',
  'mkt.login.noAccount': 'New to Sitesmith?',
  'mkt.login.createAccount': 'Create an account',
  'mkt.login.panelTitle': 'One dashboard for every site.',
  'mkt.login.panelBody': 'AI writing, SEO suite, media, newsletter and automation — connected to WordPress or any REST CMS.',

  // ---- Signup / Create Account page ----
  'mkt.signup.title': 'Create your account',
  'mkt.signup.subtitle': 'Start publishing with Karmax',
  // Karmax is the brand this page presents (scoped to signup).
  'mkt.signup.brandName': 'Karmax',
  'mkt.signup.progressLabel': 'Sign-up progress',
  'mkt.signup.stepAccount': 'Create account',
  'mkt.signup.stepPayment': 'Payment',
  'mkt.signup.stepFinish': 'Finish',
  'mkt.signup.googleCta': 'Continue with Google',
  'mkt.signup.orContinueWith': 'Or continue with',
  'mkt.signup.panelTitle': 'Every site you publish, one calm workflow.',
  'mkt.signup.panelBody':
    'Write with AI, optimize for search, and publish to WordPress or any REST CMS — all from a single dashboard built for people who publish.',
  'mkt.signup.cardAiTitle': 'AI Content',
  'mkt.signup.cardAiBody': 'Draft complete articles with AI assistance and reusable prompts.',
  'mkt.signup.cardSeoTitle': 'SEO Suite',
  'mkt.signup.cardSeoBody': 'Audit and optimize every page before it ships.',
  'mkt.signup.cardAutomationTitle': 'Automation',
  'mkt.signup.cardAutomationBody': 'Schedule publishing and routine work that runs itself.',
  'mkt.signup.cardAiHint': 'Continue writing',
  'mkt.signup.cardSeoScore': 'SEO score',
  'mkt.signup.cardSeoKeyword': 'content workflow',
  'mkt.signup.cardAutomationNext': 'Next run · Tue 09:00',
  'mkt.signup.name': 'Full name',
  'mkt.signup.namePlaceholder': 'Your name',
  'mkt.signup.email': 'Email address',
  'mkt.signup.emailPlaceholder': 'you@example.com',
  'mkt.signup.password': 'Password',
  'mkt.signup.passwordPlaceholder': 'Create a password',
  'mkt.signup.confirmPassword': 'Confirm password',
  'mkt.signup.confirmPlaceholder': 'Confirm your password',
  'mkt.signup.reqLength': 'At least 8 characters',
  'mkt.signup.reqUpper': 'One uppercase letter',
  'mkt.signup.reqLower': 'One lowercase letter',
  'mkt.signup.reqNumber': 'One number',
  'mkt.signup.termsPrefix': 'I agree to the',
  'mkt.signup.termsAnd': 'and',
  'mkt.signup.submit': 'Create account',
  'mkt.signup.submitting': 'Creating your account…',
  'mkt.signup.hasAccount': 'Already have an account?',
  'mkt.signup.signIn': 'Sign in',
  'mkt.signup.errName': 'Please enter your name.',
  'mkt.signup.errEmail': 'Please enter a valid email address.',
  'mkt.signup.errPassword': 'Password doesn’t meet the requirements above.',
  'mkt.signup.errMismatch': 'Passwords don’t match.',
  'mkt.signup.errTerms': 'Please accept the Terms of Service and Privacy Policy to continue.',
  'mkt.signup.errEmailExists': 'An account with this email already exists. Try signing in instead.',
  'mkt.signup.errGeneric': 'Couldn’t create your account. Please try again.',
  'mkt.signup.errGoogle':
    'Google sign-in didn’t complete. Please try again, or continue with the form below.',

  // ---- Checkout (payment step of the conversion journey) ----
  'mkt.checkout.title': 'Checkout',
  'mkt.checkout.loading': 'Loading your checkout…',
  'mkt.checkout.planSummary': 'Selected plan',
  'mkt.checkout.changingFrom': 'Changing from {plan}',
  'mkt.checkout.couponLabel': 'Coupon code',
  'mkt.checkout.couponPlaceholder': 'Enter a code',
  'mkt.checkout.applyCoupon': 'Apply',
  'mkt.checkout.removeCoupon': 'Remove',
  'mkt.checkout.couponApplied': 'Code {code} applied',
  'mkt.checkout.couponAtPayment': 'Discount applied at payment',
  'mkt.checkout.couponInvalid': 'This coupon code is not valid for the selected plan.',
  'mkt.checkout.taxNote':
    'Taxes, if applicable, are calculated on the secure payment page. The final amount is confirmed before you pay.',
  'mkt.checkout.payCta': 'Continue to payment',
  'mkt.checkout.paying': 'Redirecting to secure payment…',
  'mkt.checkout.payFailed': 'Payment could not be started.',
  'mkt.checkout.methodCard': 'Card',
  'mkt.checkout.methodApplePay': 'Apple Pay',
  'mkt.checkout.methodGooglePay': 'Google Pay',
  'mkt.checkout.securityNote':
    'Payments are processed securely by Stripe. Karmax never stores your card or payment details.',
  'mkt.checkout.successTitle': 'You’re all set.',
  'mkt.checkout.successBody': 'Your {plan} plan is now active.',
  'mkt.checkout.verifyingTitle': 'Confirming your payment…',
  'mkt.checkout.verifyingBody':
    'We received your payment and are activating your subscription. This usually only takes a few seconds.',
  'mkt.checkout.verifySlow':
    'This is taking longer than expected. Your payment is safe — you can check again or come back later.',
  'mkt.checkout.checkAgain': 'Check again',
  'mkt.checkout.failedTitle': 'Payment not completed',
  'mkt.checkout.failedBody': 'Your payment failed or was cancelled. Your account is safe — nothing was charged.',
  'mkt.checkout.cancelledBody':
    'The payment was cancelled. Your account is safe — you can retry whenever you’re ready.',
  'mkt.checkout.failedNote': 'No paid features were activated.',
  'mkt.checkout.retryPayment': 'Retry payment',
  'mkt.checkout.returnToPlans': 'Return to plans',
  'mkt.checkout.continueDashboard': 'Continue to dashboard',
  'mkt.checkout.alreadyTitle': 'You’re already subscribed',
  'mkt.checkout.alreadyBody': 'Your {plan} plan is already active.',
  'mkt.checkout.internalTitle': 'No checkout needed',
  'mkt.checkout.internalBody': 'Internal accounts have full access without a subscription.',
  'mkt.checkout.missingTitle': 'No plan selected',
  'mkt.checkout.missingBody': 'Choose a plan from the pricing page to continue.',
  'mkt.checkout.signRequired': 'Sign in to continue to checkout.',

  // ---- Final CTA ----
  'mkt.cta.title': 'Ready to publish smarter?',
  'mkt.cta.body': 'Start on the free plan — no credit card, your first three sites included.',
  'mkt.cta.button': 'Start for free',
  'mkt.cta.secondary': 'View pricing',

  // ---- Footer ----
  'mkt.footer.product': 'Product',
  'mkt.footer.features': 'Features',
  'mkt.footer.pricing': 'Pricing',
  'mkt.footer.solutions': 'Solutions',
  'mkt.footer.integrations': 'Integrations',
  'mkt.footer.wordpress': 'WordPress',
  'mkt.footer.restCms': 'Any REST CMS',
  'mkt.footer.stripe': 'Stripe billing',
  'mkt.footer.smtp': 'SMTP email',
  'mkt.footer.aiProviders': 'AI providers',
  'mkt.footer.featureAi': 'AI Content',
  'mkt.footer.featureSeo': 'SEO Suite',
  'mkt.footer.featureAutomation': 'Automation',
  'mkt.footer.featureMedia': 'Media Library',
  'mkt.footer.featureNewsletter': 'Newsletter',
  'mkt.footer.resources': 'Resources',
  'mkt.footer.blog': 'Blog',
  'mkt.footer.about': 'About',
  'mkt.footer.legal': 'Legal',
  'mkt.footer.privacy': 'Privacy Policy',
  'mkt.footer.terms': 'Terms of Service',
  'mkt.footer.cookiePrefs': 'Cookie preferences',
  'mkt.footer.rights': 'All rights reserved.',
  'mkt.footer.language': 'Language',
  'mkt.footer.builtNote': 'Runs on Sitesmith — of course.',

  // ---- Cookie banner ----
  'mkt.cookie.title': 'Your privacy matters',
  'mkt.cookie.body':
    'We use cookies to keep you signed in, remember your language and theme, and — only with your permission — understand how the site is used. No advertising trackers, ever.',
  'mkt.cookie.accept': 'Accept all',
  'mkt.cookie.reject': 'Reject all',
  'mkt.cookie.customize': 'Customize',
  'mkt.cookie.save': 'Save preferences',
  'mkt.cookie.necessary': 'Strictly necessary',
  'mkt.cookie.necessaryDesc': 'Session, language and theme. Always on — the site doesn’t work without them.',
  'mkt.cookie.analytics': 'Analytics',
  'mkt.cookie.analyticsDesc': 'Anonymous usage statistics that help us improve. Off by default.',
  'mkt.cookie.alwaysOn': 'Always on',
  'mkt.cookie.managePrefs': 'You can change your choice anytime via “Cookie preferences” in the footer.',

  // ---- Common marketing states ----
  'mkt.common.backHome': 'Back to home',
  'mkt.common.notFoundTitle': 'Page not found',
  'mkt.common.notFoundBody': 'The page you’re looking for doesn’t exist or has moved.',
  'mkt.common.errorTitle': 'Something went wrong',
  'mkt.common.explore': 'Learn more',
  'mkt.common.arrow': '→',

  // ---- Legal: privacy ----
  'mkt.privacy.title': 'Privacy Policy',
  'mkt.privacy.updated': 'Last updated',
  'mkt.privacy.intro':
    'This policy explains what Sitesmith collects, why, and the choices you have. We keep it short and honest.',
  'mkt.privacy.collectTitle': 'What we collect',
  'mkt.privacy.collectBody':
    'Account data you provide (name, email), the content and media you manage in the product, and technical data such as session cookies needed to keep you signed in. With your consent, anonymous usage statistics.',
  'mkt.privacy.whyTitle': 'Why we collect it',
  'mkt.privacy.whyBody':
    'To operate your account, provide the service, keep the platform secure, and — only if you opt in — understand aggregate usage to improve the product.',
  'mkt.privacy.cookiesTitle': 'Cookies',
  'mkt.privacy.cookiesBody':
    'Strictly necessary cookies (session, language, theme) always work. Analytics cookies load only after you accept them in the cookie banner. You can change your choice anytime via “Cookie preferences” in the footer.',
  'mkt.privacy.thirdTitle': 'Third parties',
  'mkt.privacy.thirdBody':
    'Payments are processed by Stripe. If you connect AI providers, your own SMTP server or Akismet, those services receive the data their integration requires. We do not sell data, and we run no advertising trackers.',
  'mkt.privacy.rightsTitle': 'Your rights',
  'mkt.privacy.rightsBody':
    'You can export or delete your content from the dashboard at any time. Deleting your account removes your user data. Contact us for anything else and we will help.',

  // ---- Legal: terms ----
  'mkt.terms.title': 'Terms of Service',
  'mkt.terms.intro':
    'These terms govern your use of Sitesmith. Plain language, no traps.',
  'mkt.terms.accountTitle': 'Your account',
  'mkt.terms.accountBody':
    'You are responsible for your account credentials and for the content you publish through the platform. Keep your password safe and your API keys private.',
  'mkt.terms.serviceTitle': 'The service',
  'mkt.terms.serviceBody':
    'Sitesmith provides content management, SEO tooling, media storage, newsletter and automation features per your plan. We may improve or change features; material changes will be announced.',
  'mkt.terms.fairUseTitle': 'Fair use',
  'mkt.terms.fairUseBody':
    'Plan limits (sites, storage, AI usage) are enforced for the health of the platform. Use the service lawfully and respect the sites you connect.',
  'mkt.terms.billingTitle': 'Billing',
  'mkt.terms.billingBody':
    'Paid plans are billed monthly or yearly in CHF through Stripe. You can upgrade, downgrade or cancel anytime from your dashboard; cancellations take effect at the end of the billing period.',
  'mkt.terms.liabilityTitle': 'Liability',
  'mkt.terms.liabilityBody':
    'The service is provided “as is”. We work hard on reliability — backups, monitoring, honest uptime — but we are not liable for indirect damages or lost profits.',

    'mkt.plan.free.desc': 'For getting started — your first sites, the full editor and SEO basics.',
  'mkt.plan.plus.desc': 'For growing bloggers — AI writing and more sites on one account.',
  'mkt.plan.pro.desc': 'For serious publishers — full AI capacity, more storage, every site in one place.',
  'mkt.plan.max.desc': 'For agencies and teams — unlimited sites and maximum storage.',
  'mkt.plan.default.desc': 'Everything included in this plan, managed from your dashboard.',
};
