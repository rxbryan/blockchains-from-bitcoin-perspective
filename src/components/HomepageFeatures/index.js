import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Link from '@docusaurus/Link';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className="hero hero--primary">
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div style={{display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap'}}>
          <Link
            className="button button--primary button--lg"
            to="/oracle-trust-models/overview">
            Oracle Trust Models
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="/midnight-for-bitcoin-devs/intro">
            Midnight for Bitcoin Devs
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description={siteConfig.tagline}>
      <HomepageHeader />
      <main>
        <div className="container" style={{padding: '3rem 0'}}>
          <div className="row">
            <div className="col col--6">
              <div className="home-card">
                <h2>Oracle Trust Models</h2>
                <p>
                  How trust is constructed in Bitcoin and EVM oracle systems.
                  Covers DLC attestation mechanics, adaptor signatures,
                  BIP-340 nonce commitments, and failure mode analysis across
                  self-contained and oracle-dependent blockchains.
                </p>
                <Link to="/oracle-trust-models/overview">
                  Read the series &rarr;
                </Link>
              </div>
            </div>
            <div className="col col--6">
              <div className="home-card">
                <h2>Midnight for Bitcoin Developers</h2>
                <p>
                  Four articles examining Midnight's architecture through the
                  lens of Bitcoin. The UTXO model, private state, the
                  NIGHT/DUST economic model, and Compact circuits compared
                  to Bitcoin Script.
                </p>
                <Link to="/midnight-for-bitcoin-devs/intro">
                  Read the series &rarr;
                </Link>
              </div>
            </div>
          </div>
          <div style={{marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--ifm-toc-border-color)'}}>
            <p style={{color: 'var(--ifm-color-secondary)', fontSize: '0.9rem', maxWidth: '600px'}}>
              This site examines blockchain systems from the perspective of Bitcoin
              protocol developers. The analysis starts from Bitcoin's design decisions
              and asks what other systems chose differently and why. No advocacy,
              no marketing. Just the tradeoffs.
            </p>
          </div>
        </div>
      </main>
    </Layout>
  );
}