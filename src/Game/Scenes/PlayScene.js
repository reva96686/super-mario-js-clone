/* eslint-disable quote-props */

import ImageLoader from '../../Engine/Loaders/ImageLoader.js';
import Scene from '../../Engine/Scenes/Scene.js';
import SpriteMap from '../../Engine/Graphic/Sprites/SpriteMap.js';
import Vector from '../../Engine/Math/Vector.js';
import Size from '../../Engine/Math/Size.js';
import TileMap from '../../Engine/Tiles/TileMap.js';
import TileMapLoader from '../Loaders/TileMapLoader.js';
import Camera from '../../Engine/Camera/Camera.js';
import Animation from '../../Engine/Graphic/Animations/Animation.js';
import Controller from '../../Engine/Input/Controller.js';
import Mario from '../Entities/Mario/Mario.js';
import TileCollider from '../../Engine/Tiles/TileCollider.js';
import MouseController from '../../Engine/Input/MouseController.js';
import Jump from '../Components/Jump.js';
import Collisions from '../../Engine/Behaviour/Components/Collisions.js';
import Falling from '../Components/Falling.js';
import Turbo from '../Components/Turbo.js';
import AnimationManager from '../../Engine/Graphic/Animations/AnimationManager.js';
import BackgroundLayer from '../Layers/BackgroundLayer.js';
import SkyLayer from '../Layers/SkyLayer.js';
import CollisionsLayer from '../Layers/CollisionsLayer.js';
import DebugLayer from '../Layers/DebugLayer.js';
import Goomba from '../Entities/Goomba/Goomba.js';
import GoombaStompable from '../Entities/Goomba/Components/Stompable.js';
import Walking from '../Components/Walking.js';
import Koopa from '../Entities/Koopa/Koopa.js';
import KoopaBehaviour from '../Entities/Koopa/Components/Behaviour.js';
import Intersection from '../../Engine/Behaviour/Components/Intersection.js';
import Stomp from '../Entities/Mario/Components/Stomp.js';
import Killable from '../Components/Killable.js';
import Respawn from '../Entities/Mario/Components/Respawn.js';
import EntityManager from '../../Engine/Behaviour/EntityManager.js';

export default class PlayScene extends Scene {
  constructor() {
    super();
    this.camera = new Camera(Vector.zero(), new Size(500, 400));
    this.tileCollider = null;
    this.gravity = new Vector(0, game.config.physics.gravity);
    this.animationManager = null;
    this.layers = new Map();
    this.entityManager = new EntityManager();

    // TODO: add friction and gravity processors into one single place
  }

  load() {
    return Promise.all([
      this.loadTiles(),
      this.loadEntities(),
    ])
      .then(() => this.loadDebug());
  }

  loadTiles() {
    // TODO: refactor loading level with JSON specification
    return ImageLoader.load('/resources/sprites/world-sprite.png')
      .then((image) => {
        const sprite = new SpriteMap(image);

        sprite.define('sky', new Vector(48, 361), new Size(16, 16));
        sprite.define('ground', new Vector(0, 0), new Size(16, 16));
        sprite.define('bricks', new Vector(16, 0), new Size(16, 16));

        // TODO: Remove after animation resolved
        sprite.define('chance', new Vector(384, 0), new Size(16, 16));

        sprite.define('chance-1', new Vector(384, 0), new Size(16, 16));
        sprite.define('chance-2', new Vector(400, 0), new Size(16, 16));
        sprite.define('chance-3', new Vector(416, 0), new Size(16, 16));

        // Sprite groups
        sprite.define('pipe-vertical-top-left', new Vector(0, 128), new Size(16, 16));
        sprite.define('pipe-vertical-top-right', new Vector(16, 128), new Size(16, 16));
        sprite.define('pipe-vertical-left', new Vector(0, 144), new Size(16, 16));
        sprite.define('pipe-vertical-right', new Vector(16, 144), new Size(16, 16));

        sprite.define('cloud-1-1', new Vector(0, 320), new Size(16, 16));
        sprite.define('cloud-1-2', new Vector(16, 320), new Size(16, 16));
        sprite.define('cloud-1-3', new Vector(32, 320), new Size(16, 16));
        sprite.define('cloud-2-1', new Vector(0, 336), new Size(16, 16));
        sprite.define('cloud-2-2', new Vector(16, 336), new Size(16, 16));
        sprite.define('cloud-2-3', new Vector(32, 336), new Size(16, 16));

        return sprite;
      })
      .then((sprite) => {
        this.animationManager = new AnimationManager();

        this.animationManager.add('chance', new Animation([
          sprite.get('chance-1'),
          sprite.get('chance-1'),
          sprite.get('chance-2'),
          sprite.get('chance-3'),
          sprite.get('chance-2'),
        ], 8));

        const mapping = {
          // Blocks
          '#': { sprite: 'ground', type: 'image', options: { ground: true } },
          '%': { sprite: 'bricks', type: 'image', options: { ground: true } },
          'O': { sprite: 'chance', type: 'animation', options: { ground: true } },

          // Vertical Pipe
          '╗': { sprite: 'pipe-vertical-top-left', type: 'image', options: { ground: true } },
          '╔': { sprite: 'pipe-vertical-top-right', type: 'image', options: { ground: true } },
          '⎜': { sprite: 'pipe-vertical-left', type: 'image', options: { ground: true } },
          '⎥': { sprite: 'pipe-vertical-right', type: 'image', options: { ground: true } },

          // Structures
          '╭': { sprite: 'cloud-1-1', type: 'image', options: { ground: false, layer: 'background' } },
          '╌': { sprite: 'cloud-1-2', type: 'image', options: { ground: false, layer: 'background' } },
          '╮': { sprite: 'cloud-1-3', type: 'image', options: { ground: false, layer: 'background' } },
          '╰': { sprite: 'cloud-2-1', type: 'image', options: { ground: false, layer: 'background' } },
          '━': { sprite: 'cloud-2-2', type: 'image', options: { ground: false, layer: 'background' } },
          '╯': { sprite: 'cloud-2-3', type: 'image', options: { ground: false, layer: 'background' } },
        };

        const tileSize = new Size(game.config.tiles.size.width, game.config.tiles.size.height);
        const collisionsTileMap = new TileMap(game.config, tileSize);
        const backgroundTileMap = new TileMap(game.config, tileSize);


        this.tileCollider = new TileCollider(collisionsTileMap);

        const debugLayer = new DebugLayer();

        if (game.config.debug.tiles) {
          debugLayer.add(backgroundTileMap);
          debugLayer.add(collisionsTileMap);
        }

        if (game.config.debug.collisions) {
          debugLayer.add(this.tileCollider);
        }

        if (game.config.debug.camera) {
          debugLayer.add(this.camera);
        }

        this.layers.set('sky', new SkyLayer('#64abfa'));
        this.layers.set('background', new BackgroundLayer(backgroundTileMap));
        this.layers.set('collisions', new CollisionsLayer(collisionsTileMap, this.entityManager.getEntities()));
        this.layers.set('debug', debugLayer);

        return (new TileMapLoader(sprite, this.animationManager))
          .setTileMaps(collisionsTileMap, backgroundTileMap)
          .loadLvl('/resources/levels/1-1.lvl', mapping);
      })
      .then(() => {
        // Controller initialization
        const keyBinds = {
          'ArrowLeft': 'left',
          'ArrowUp': 'up',
          'ArrowRight': 'right',
          'ArrowDown': 'down',
          ' ': 'actionA',
        };

        // TODO: fix controller sometimes throws error 'cannot get isPressed of undefined (probably can fixed with promise wait)'
        this.controller = new Controller(keyBinds, game.config);
        this.controller.enableLogging();

        // TODO: refactor
        if (game.config.debug.controller) {
          this.layers.get('debug').add(this.controller);
        }
      });
  }

  loadEntities() {
    // TODO: refactor with entity loader which returns entity factory
    // TODO: example MarioLoader.load().then(factory => factory.create());

    return ImageLoader.load('/resources/sprites/characters-sprite.gif')
      .then((image) => {
        const spriteMap = new SpriteMap(image);

        /**
         * Mario
         */

        // Idle
        spriteMap.define('mario-idle-right', new Vector(275, 44), new Size(16, 16));
        spriteMap.define('mario-idle-left', new Vector(222, 44), new Size(16, 16));

        // Run
        spriteMap.define('mario-move-right-1', new Vector(290, 44), new Size(16, 16));
        spriteMap.define('mario-move-right-2', new Vector(304, 44), new Size(16, 16));
        spriteMap.define('mario-move-right-3', new Vector(320, 44), new Size(16, 16));

        spriteMap.define('mario-move-left-1', new Vector(207, 44), new Size(16, 16));
        spriteMap.define('mario-move-left-2', new Vector(193, 44), new Size(16, 16));
        spriteMap.define('mario-move-left-3', new Vector(177, 44), new Size(16, 16));

        // Break
        spriteMap.define('mario-break-right', new Vector(337, 44), new Size(16, 16));
        spriteMap.define('mario-break-left', new Vector(160, 44), new Size(16, 16));

        // Jump
        spriteMap.define('mario-jump-right', new Vector(355, 44), new Size(16, 16));
        spriteMap.define('mario-jump-left', new Vector(142, 44), new Size(16, 16));

        /**
         *  Goomba
         */
        spriteMap.define('goomba-move-1', new Vector(296, 187), new Size(16, 16));
        spriteMap.define('goomba-move-2', new Vector(315, 187), new Size(16, 16));
        spriteMap.define('goomba-flat', new Vector(277, 187), new Size(16, 16));

        /**
         *  Koopa
         */
        spriteMap.define('koopa-move-right-1', new Vector(296, 206), new Size(16, 24));
        spriteMap.define('koopa-move-right-2', new Vector(315, 206), new Size(16, 24));
        spriteMap.define('koopa-move-left-1', new Vector(201, 206), new Size(16, 24));
        spriteMap.define('koopa-move-left-2', new Vector(182, 206), new Size(16, 24));
        spriteMap.define('koopa-hiding', new Vector(144, 206), new Size(16, 24));
        spriteMap.define('koopa-wake-up', new Vector(163, 206), new Size(16, 24));

        return spriteMap;
      })
      .then((spriteMap) => {
        const animationMap = new Map();

        animationMap.set('moveRight', new Animation([
          spriteMap.get('mario-move-right-1'),
          spriteMap.get('mario-move-right-2'),
          spriteMap.get('mario-move-right-3'),
        ]));

        animationMap.set('moveLeft', new Animation([
          spriteMap.get('mario-move-left-1'),
          spriteMap.get('mario-move-left-2'),
          spriteMap.get('mario-move-left-3'),
        ]));

        animationMap.set('breakLeft', new Animation([
          spriteMap.get('mario-break-left'),
        ]));

        animationMap.set('breakRight', new Animation([
          spriteMap.get('mario-break-right'),
        ]));

        animationMap.set('idleLeft', new Animation([
          spriteMap.get('mario-idle-left'),
        ]));

        animationMap.set('idleRight', new Animation([
          spriteMap.get('mario-idle-right'),
        ]));

        animationMap.set('jumpLeft', new Animation([
          spriteMap.get('mario-jump-left'),
        ]));

        animationMap.set('jumpRight', new Animation([
          spriteMap.get('mario-jump-right'),
        ]));

        const mario = new Mario(this.controller, animationMap);
        mario.size.setWidth(14).setHeight(16);
        mario.position.setX(100).setY(200);

        mario.addComponent(new Jump(mario));
        mario.addComponent(new Falling(mario));
        mario.addComponent(new Turbo(mario));
        mario.addComponent(new Stomp(mario));
        mario.addComponent(new Collisions(mario));
        mario.addComponent(new Intersection(mario));
        mario.addComponent(new Killable(mario));
        mario.addComponent(new Respawn(mario));

        const mouseController = new MouseController(game.view.context);

        // Camera simple mouse scroll
        mouseController.onRightButtonDrag((currentPosition, previousPosition) => {
          this.camera.position.set(
            this.camera.position.minusX(currentPosition.minus(previousPosition)),
          );
        });

        // player mouse control debugger
        mouseController.onLeftClick((position) => {
          mario.velocity.set(Vector.zero());
          mario.position.set(this.camera.position.plus(position));
        });

        this.camera.follow(mario);

        this.entityManager.add(mario);

        return spriteMap;
      })
      .then((spriteMap) => {
        const animations = new Map();

        animations.set('move', new Animation([
          spriteMap.get('goomba-move-1'),
          spriteMap.get('goomba-move-2'),
        ]));

        animations.set('flat', new Animation([
          spriteMap.get('goomba-flat'),
        ]));

        const goomba = new Goomba(animations);
        goomba.size.setWidth(14).setHeight(16);
        goomba.position.setX(400).setY(200);

        goomba.addComponent(new GoombaStompable(goomba));
        goomba.addComponent(new Walking(goomba));
        goomba.addComponent(new Killable(goomba));
        goomba.addComponent(new Collisions(goomba));
        goomba.addComponent(new Intersection(goomba));

        this.entityManager.add(goomba);

        return spriteMap;
      })
      .then((spriteMap) => {
        const animations = new Map();

        animations.set('moveRight', new Animation([
          spriteMap.get('koopa-move-right-1'),
          spriteMap.get('koopa-move-right-2'),
        ]));

        animations.set('moveLeft', new Animation([
          spriteMap.get('koopa-move-left-1'),
          spriteMap.get('koopa-move-left-2'),
        ]));

        animations.set('hiding', new Animation([
          spriteMap.get('koopa-hiding'),
        ]));

        const koopa = new Koopa(animations);
        koopa.size.setWidth(14).setHeight(16);
        koopa.position.setX(350).setY(200);

        koopa.addComponent(new KoopaBehaviour(koopa));
        koopa.addComponent(new Walking(koopa));
        koopa.addComponent(new Killable(koopa));
        koopa.addComponent(new Collisions(koopa));
        koopa.addComponent(new Intersection(koopa));

        this.entityManager.add(koopa);
      });
  }

  loadDebug() {
    // TODO: refactor with debug entities from future implementation of EntityManager
    // this.layers.get('debug').add(this.entities.get('mario'));
    // this.layers.get('debug').add(this.entities.get('goomba'));
    // this.layers.get('debug').add(this.entities.get('koopa'));
  }

  update(deltaTime) {
    this.animationManager.updateAll();

    this.entityManager.getEntities().forEach((entity) => {
      entity.update(deltaTime);

      entity.velocity.set(
        entity.velocity.plus(this.gravity.scale(deltaTime)),
      );

      entity.position.set(
        entity.position.plusX(entity.velocity.scale(deltaTime)),
      );
      this.tileCollider.checkX(entity);

      entity.position.set(
        entity.position.plusY(entity.velocity.scale(deltaTime)),
      );
      this.tileCollider.checkY(entity);
    });

    this.entityManager.checkIntersections();

    this.camera.update();
  }

  render(view) {
    this.layers.forEach(layer => layer.render(view, this.camera));
  }
}
