import Config from '../../Engine/Config/Config.js';

const config = new Config({
  fps: 60,
  width: 640,
  height: 480,
  tiles: {
    size: {
      width: 16,
      height: 16,
    },
  },
  physics: {
    gravity: 600,
  },
  player: {
    maxSpeed: 80,
    acceleration: 80,
    turboMaxSpeed: 120,
    turboAcceleration: 120,
  },
  components: {
    jump: {
      power: 150,
      graceTime: 0.4,
      speedBoost: 0.3,
    },
  },
  debug: {
    fps: true,
    memory: true,
    tiles: true,
    collisions: true,
    camera: true,
    hitbox: true,
    coordinates: true,
    controller: true,
  },
});

export default config;
