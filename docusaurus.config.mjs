// @ts-check
import { themes as prismThemes } from 'prism-react-renderer';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Blockchains from a Bitcoin Perspective',
  tagline: 'Technical analysis of blockchain systems through the lens of Bitcoin',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://rxbryan.github.io',
  baseUrl: '/blockchains-from-bitcoin-perspective/',

  organizationName: 'rxbryan',
  projectName: 'blockchains-from-bitcoin-perspective',
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.js',
          editUrl:
            'https://github.com/rxbryan/blockchains-from-bitcoin-perspective/edit/main/',
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/og-card.png',
      metadata: [
        { name: 'og:type', content: 'website' },
        {
          name: 'og:title',
          content: 'Blockchains from a Bitcoin Perspective',
        },
        {
          name: 'og:description',
          content:
            'Technical analysis of blockchain systems written from the perspective of a Bitcoin protocol developer. Covers oracle trust models, Midnight Network, UTXO mechanics, ZK proofs, and more.',
        },
        {
          name: 'og:url',
          content: 'https://rxbryan.github.io/blockchains-from-bitcoin-perspective/',
        },
        { name: 'twitter:card', content: 'summary_large_image' },
        {
          name: 'twitter:title',
          content: 'Blockchains from a Bitcoin Perspective',
        },
        {
          name: 'twitter:description',
          content:
            'Technical analysis of blockchain systems written from the perspective of a Bitcoin protocol developer.',
        },
        {
          name: 'description',
          content:
            'Technical analysis of blockchain systems — oracle trust models, Midnight Network, and more — written from the perspective of a Bitcoin protocol developer.',
        },
        {
          name: 'keywords',
          content:
            'bitcoin, blockchain, midnight network, oracle, utxo, zero knowledge proofs, compact, bitcoin script, dlc, chainlink',
        },
      ],
      colorMode: {
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'Blockchains from a Bitcoin Perspective',
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'oracleSidebar',
            position: 'left',
            label: 'Oracle Trust Models',
          },
          {
            type: 'docSidebar',
            sidebarId: 'midnightSidebar',
            position: 'left',
            label: 'Midnight for Bitcoin Devs',
          },
          {
            href: 'https://github.com/rxbryan/blockchains-from-bitcoin-perspective',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Oracle Trust Models',
            items: [
              { label: 'Overview', to: '/oracle-trust-models/overview' },
              { label: 'Trust Models', to: '/oracle-trust-models/trust-models' },
              { label: 'Oracles in Bitcoin', to: '/oracle-trust-models/oracles-in-bitcoin' },
              { label: 'Encoding External Events', to: '/oracle-trust-models/encoding-external-events' },
              { label: 'Failure Modes', to: '/oracle-trust-models/failure-modes-and-tradeoffs' },
            ],
          },
          {
            title: 'Midnight for Bitcoin Devs',
            items: [
              { label: 'Introduction', to: '/midnight-for-bitcoin-devs/intro' },
              { label: 'UTXO Model', to: '/midnight-for-bitcoin-devs/utxo-model' },
              { label: 'Private State', to: '/midnight-for-bitcoin-devs/private-state' },
              { label: 'NIGHT/DUST', to: '/midnight-for-bitcoin-devs/night-dust' },
              { label: 'Compact Circuits', to: '/midnight-for-bitcoin-devs/compact-circuits' },
            ],
          },
          {
            title: 'Author',
            items: [
              { label: 'GitHub', href: 'https://github.com/rxbryan' },
              { label: 'Medium', href: 'https://medium.com/@bryanelee62' },
              { label: 'LinkedIn', href: 'https://www.linkedin.com/in/rxbryan' },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Bryan Elee Atonye. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['solidity', 'rust', 'bash', 'typescript'],
      },
    }),
};

export default config;
