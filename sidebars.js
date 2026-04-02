// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  oracleSidebar: [
    {
      type: 'category',
      label: 'Oracle Trust Models',
      collapsible: false,
      items: [
        'oracle-trust-models/overview',
        {
          type: 'category',
          label: 'Trust and Correctness',
          collapsible: false,
          items: [
            'oracle-trust-models/trust-models',
            'oracle-trust-models/oracles_in_bitcoin',
          ],
        },
        {
          type: 'category',
          label: 'Mechanics and Failure',
          collapsible: false,
          items: [
            'oracle-trust-models/encoding_external_events_in_bitcoin',
            'oracle-trust-models/failure_modes_and_tradeoffs',
          ],
        },
      ],
    },
  ],

  midnightSidebar: [
    {
      type: 'category',
      label: 'Midnight for Bitcoin Developers',
      collapsible: false,
      items: [
        'midnight-for-bitcoin-devs/intro',
        'midnight-for-bitcoin-devs/utxo-model',
        'midnight-for-bitcoin-devs/private-state',
        'midnight-for-bitcoin-devs/night-dust',
        'midnight-for-bitcoin-devs/compact-circuits',
      ],
    },
  ],
};

export default sidebars;