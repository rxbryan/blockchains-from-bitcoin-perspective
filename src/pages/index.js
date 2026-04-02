import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Link from '@docusaurus/Link';
import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={styles.heroBanner}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
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
        <div className="container" style={{padding: '2rem 0'}}>
          <div className="row">
            <div className="col col--6">
              <h2>Oracle Trust Models</h2>
              <p>
                A conceptual reference covering how trust is constructed in Bitcoin
                and EVM oracle systems. Topics include DLC attestation mechanics,
                adaptor signatures, BIP-340 nonce commitments, and failure mode
                analysis across self-contained and oracle-dependent blockchains.
              </p>
              <Link to="/oracle-trust-models/overview">Read the series →</Link>
            </div>
            <div className="col col--6">
              <h2>Midnight for Bitcoin Developers</h2>
              <p>
                A four-part series examining Midnight's architecture through the
                lens of Bitcoin. Covers the UTXO model, private state, the
                NIGHT/DUST economic model, and Compact circuits vs Bitcoin Script.
              </p>
              <Link to="/midnight-for-bitcoin-devs/intro">Read the series →</Link>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}