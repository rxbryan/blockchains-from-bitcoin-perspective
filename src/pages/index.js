import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Link from '@docusaurus/Link';

const SERIES = [
  {
    title: 'Oracle Trust Models',
    description:
      'How trust is constructed in Bitcoin and EVM oracle systems. Covers DLC attestation mechanics, adaptor signatures, BIP-340 nonce commitments, and failure mode analysis across self-contained and oracle-dependent blockchains.',
    link: '/oracle-trust-models/overview',
  },
  {
    title: 'Midnight for Bitcoin Developers',
    description:
      'Four articles examining Midnight\'s architecture through the lens of Bitcoin. The UTXO model, private state, the NIGHT/DUST economic model, and Compact circuits compared to Bitcoin Script.',
    link: '/midnight-for-bitcoin-devs/intro',
  },
];

function SeriesCard({title, description, link}) {
  return (
    <div className="home-card">
      <h2>{title}</h2>
      <p>{description}</p>
      <Link to={link}>Read the series &rarr;</Link>
    </div>
  );
}

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className="hero hero--primary">
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
      </div>
    </header>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <HomepageHeader />
      <main>
        <div className="container" style={{padding: '3rem 1rem'}}>
          <div className="series-grid">
            {SERIES.map((s) => (
              <SeriesCard key={s.title} {...s} />
            ))}
          </div>
          <div
            style={{
              marginTop: '3rem',
              paddingTop: '2rem',
              borderTop: '1px solid var(--ifm-toc-border-color)',
            }}>
            <p
              style={{
                color: 'var(--ifm-color-secondary)',
                fontSize: '0.9rem',
                maxWidth: '600px',
              }}>
              This site examines blockchain systems from the perspective of
              Bitcoin protocol developers. The analysis starts from Bitcoin's
              design decisions and asks what other systems chose differently and
              why. No advocacy, no marketing. Just the tradeoffs.
            </p>
          </div>
        </div>
      </main>
    </Layout>
  );
}