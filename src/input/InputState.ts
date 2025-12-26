export type InputState = {
  left: boolean;
  right: boolean;
  accel: boolean;
  brake: boolean;
  nitro: boolean;
  honk: boolean;
  pausePressed: boolean; // edge-trigger
};

export function makeInputState(): InputState {
  return {
    left: false,
    right: false,
    accel: false,
    brake: false,
    nitro: false,
    honk: false,
    pausePressed: false
  };
}
