export const balance = {
  RUN_SECONDS: 220,
  chaos: {
    minSpacingSec: 22,
    maxEvents: 5,
    weights: {
      stuck: 1,
      overheat: 1,
      flat: 1,
      rain: 1.2,
      helicopter: 0.7,
      camel: 0.9,
      dogs: 1.1
    },
    cooldownSec: {
      stuck: 40,
      overheat: 45,
      flat: 50,
      rain: 35,
      helicopter: 60,
      camel: 55,
      dogs: 40
    }
  },
  planReward: {
    earlyEssentialsDeadlineSec: 70,
    buffDurationSec: 35,
    buffMaxSpeedMul: 1.08,
    buffTractionMul: 1.1,
    chaosRelaxMul: 0.75
  }
};
