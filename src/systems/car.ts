import Phaser from 'phaser';

export type Car = {
  chassis: Phaser.Physics.Matter.Image;
  wheels: Phaser.Physics.Matter.Image[];
  drive: (dir: number) => void;
  getSpeed: () => number;
  getX: () => number;
  getY: () => number;
  getTilt: () => number;
};

export function createCar(scene: Phaser.Scene, x: number, y: number): Car {
  createCarTextures(scene);

  const chassisWidth = 140;
  const chassisHeight = 34;
  const wheelRadius = 26;
  const wheelBase = 60;
  const suspensionLength = 40;

  const matterLib = (Phaser.Physics.Matter as any).Matter as any;

  const chassis = scene.matter.add.image(x, y, 'car-body', undefined, {
    label: 'car-chassis'
  });
  const chassisBody = matterLib.Bodies.rectangle(x, y, chassisWidth, chassisHeight, { chamfer: { radius: 8 } });
  chassis.setExistingBody(chassisBody);
  chassis.setFriction(0.9).setFrictionAir(0.02).setDensity(0.0016);

  const wheelOpts = { friction: 1, frictionStatic: 1, frictionAir: 0.001, density: 0.0012, restitution: 0.05 };
  const wheelRear = scene.matter.add.image(x - wheelBase, y + 20, 'car-wheel', undefined, {
    ...wheelOpts,
    label: 'car-wheel'
  });
  wheelRear.setCircle(wheelRadius);

  const wheelFront = scene.matter.add.image(x + wheelBase, y + 20, 'car-wheel', undefined, {
    ...wheelOpts,
    label: 'car-wheel'
  });
  wheelFront.setCircle(wheelRadius);

  scene.matter.add.constraint(chassis.body as MatterJS.BodyType, wheelRear.body as MatterJS.BodyType, suspensionLength, 0.32, {
    pointA: { x: -wheelBase, y: 10 },
    pointB: { x: 0, y: 0 }
  });
  scene.matter.add.constraint(chassis.body as MatterJS.BodyType, wheelRear.body as MatterJS.BodyType, suspensionLength, 0.15, {
    pointA: { x: -wheelBase, y: -10 },
    pointB: { x: 0, y: 0 }
  });
  scene.matter.add.constraint(chassis.body as MatterJS.BodyType, wheelFront.body as MatterJS.BodyType, suspensionLength, 0.32, {
    pointA: { x: wheelBase, y: 10 },
    pointB: { x: 0, y: 0 }
  });
  scene.matter.add.constraint(chassis.body as MatterJS.BodyType, wheelFront.body as MatterJS.BodyType, suspensionLength, 0.15, {
    pointA: { x: wheelBase, y: -10 },
    pointB: { x: 0, y: 0 }
  });

  const maxAngularSpeed = 0.55;
  const torque = 0.0018;

  const drive = (dir: number) => {
    const currentSpeed = getSpeed();
    const dampen = currentSpeed > 28 ? 0.4 : 1;
    const deltaTorque = torque * dir * dampen;
    [wheelRear, wheelFront].forEach((wheel) => {
      if (!wheel.body) return;
      const angular = (wheel.body as MatterJS.BodyType).angularVelocity + deltaTorque;
      const limited = Phaser.Math.Clamp(angular, -maxAngularSpeed, maxAngularSpeed);
      matterLib.Body.setAngularVelocity(wheel.body as MatterJS.BodyType, limited);
    });
  };

  const getSpeed = () => {
    const vel = (chassis.body as MatterJS.BodyType).velocity;
    return Math.hypot(vel.x, vel.y) * 60; // convert to pixels/sec-ish
  };

  const getTilt = () => chassis.rotation;

  return {
    chassis,
    wheels: [wheelRear, wheelFront],
    drive,
    getSpeed,
    getX: () => chassis.x,
    getY: () => chassis.y,
    getTilt
  };
}

function createCarTextures(scene: Phaser.Scene) {
  if (scene.textures.exists('car-body')) return;
  const g = scene.add.graphics();
  g.fillStyle(0x3454d1, 1);
  g.fillRoundedRect(0, 0, 140, 34, 8);
  g.lineStyle(3, 0x0c1a4d, 0.9);
  g.strokeRoundedRect(0, 0, 140, 34, 8);
  g.fillStyle(0x0c1a4d, 0.9);
  g.fillRoundedRect(16, 4, 50, 18, 6);
  g.generateTexture('car-body', 140, 34);
  g.clear();

  g.fillStyle(0x222222, 1);
  g.fillCircle(30, 30, 30);
  g.lineStyle(4, 0xf1faee, 1);
  g.strokeCircle(30, 30, 30);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(30, 30, 10);
  g.generateTexture('car-wheel', 60, 60);
  g.destroy();
}
